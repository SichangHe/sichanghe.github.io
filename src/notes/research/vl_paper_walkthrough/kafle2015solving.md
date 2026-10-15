# Solving non-linear Horn clauses using a linear solver
(authored by agents unless marked 🧑)
Tag: `kafle2015solving`, [paper](http://arxiv.org/abs/1511.06668v1)

## problem and result

Kafle presents an incremental solver for constrained Horn clauses (CHCs) whose only backend is a linear Horn-clause solver. A CHC has a constrained head and zero or more predicate atoms in its body. It is non-linear when the body contains more than one atom. The paper's key observation is that derivation trees have a measurable non-linearity: “The dimension of a tree is a measure of its non-linearity” (abstract, p. 1). Instead of solving the full non-linear set at once, the method under-approximates derivations by a maximum tree dimension, solves that transformed linear problem, and checks whether the result is already a model of the original clauses.

The method is a decision procedure only when it returns a model. The introduction reports, “The program transformation allows one to use a linear solver and solution from a previous iteration can be reused in the latter one” (Section 1, p. 2). If every successive linear problem is unsolved or resources run out, the algorithm returns `unknown`; it does not prove that the original CHCs are unsatisfiable in that case. The paper's soundness proposition says: “If Algorithm 1 returns a solution S for a set of clauses P then P is solved and S is in fact a solution of P” (Section 3, p. 5). This is a conditional, model-producing result, not completeness.

## technique: measure derivation-tree dimension

A labeled derivation tree `t=c(t1,...,tk)` has dimension zero for a leaf. For an internal node, the dimension is the maximum child dimension when exactly one child attains the maximum; if two or more children tie for the maximum, the dimension is one greater than that maximum (Definition 3, p. 3). A list-shaped derivation therefore has dimension zero, while a complete binary tree's dimension grows with its height. The Fibonacci CHC in Figure 1 has two recursive calls and produces branching derivations.

When to use it. Use this measure when a verifier can solve linear clauses but struggles with multiple predicate atoms in one body. The method is useful when low-dimension derivations are sufficient to discover an inductive invariant. It is an under-approximation: excluding high-dimension trees can miss behavior, so a solution at dimension `k` must be checked against the original clauses.

How to apply it. (1) Represent each predicate `H` with indexed predicates `H≤d` (dimension at most `d`) and `H=d` (dimension exactly `d`) for `d` from zero through `k`. (2) For a linear source clause, create an exact-zero head for a constraint-only clause and exact-`d` heads for clauses with one body atom. (3) For a non-linear clause, distribute the dimension budget: either choose one child at exact `d` and all others at most `d`, or choose two children at exact `d−1` and the rest at most `d−2` when defined. (4) Add epsilon clauses `H≤d ← H=e` for every `e≤d`. Definition 4 gives these three transformation families (Section 2, pp. 3–4).

The resulting `P≤0` is linear by construction. For the Fibonacci example, Figure 3 contains `fib(0)` and `false(0)` linear clauses plus epsilon clauses linking `fib[0]` and `false[0]` to their exact-zero versions (p. 4).

Verus form. Inference: use the dimension as a ghost/specification index on a recursive proof relation, for example a `spec fn` describing derivations with a natural-number budget. A `proof fn` can establish that a dimension-zero relation is linear and that a candidate invariant is preserved. Verus does not execute a CHC solver or automatically synthesize predicate interpretations; this technique belongs in a verifier backend or a proof-generation front end. Rust `requires`/`ensures` can expose the resulting invariant to code proofs, but the indexed predicates themselves are mathematical ghost objects.

## technique: iterate a linear solver and inductiveness check

Algorithm 1 (`SOLVE`) starts at `k=0` (Section 3, p. 6). It generates `P≤k` with `KDIM`, calls `SOLVE_LINEAR`, and returns `unknown` if the oracle cannot solve the linear set. For a returned solution `Sk`, `INDUCTIVE(Sk,P)` removes predicate indices and checks whether the resulting constrained facts satisfy every original clause. If yes, `SOLVE` returns the solution. If no, it generates `P≤k+1`, linearizes it using the previous solution, increments `k`, and repeats.

The linear oracle is assumed sound: a returned solution satisfies the transformed set, and an `unsolvable` result means the transformed set has no solution (Section 3, p. 4). The implementation used abstract interpretation over convex polyhedra; it produces an over-approximation of a minimal model as constrained facts. A solution is accepted when no constrained fact for `false` is present. The paper notes that removing indices may produce a disjunctive result even when the linear solver itself is non-disjunctive, because the transformation supplies the disjunction (Section 3, p. 4).

How to apply it. (1) Run the linear oracle on `P≤0`. (2) Normalize its indexed facts back to original predicate names. (3) Check every original CHC under those facts. (4) If the check fails, use the facts as substitutions in `P≤1` and simplify constraints. (5) Repeat until the normalized solution is inductive or the oracle cannot solve the next problem. The paper's Fibonacci run obtains a non-inductive zero-dimension solution because clause `c2` is not satisfied. After linearization and a two-dimension solve, the listed facts for `fib(0)`, `fib(1)`, and `fib(2)` become inductive (Sections 3, pp. 4–5).

Verus form. Inference: treat each returned constrained fact as a candidate `spec fn` invariant and prove the inductiveness check with `proof fn` lemmas and `assert` statements. The transformation's linearization is a trusted preprocessing step unless reimplemented and verified; Verus can check the final invariant against a Rust transition relation, but it does not validate a polyhedral solver's internal algorithm. Keep any unproved candidate as an explicit assumption at a boundary rather than claiming the Rust implementation is verified.

## technique: linearize the next dimension with the previous model

`LINEARIZE(P,S)` replaces every predicate atom `p(X)` in `P` with the constraint body `C(X)` from a solution fact `p(X) ← C(X)`. Lemma 1 states that if `S` solves an at-most-`k` program and `P` is at-most `k+1`, this replacement returns a linear clause set (Section 3, p. 5). In the Fibonacci excerpt, the `fib[0](E,F)` atom in the recursive clause is replaced by its zero-dimension constraints, leaving one `fib(1)` atom and therefore a linear clause.

This reuse is the efficiency mechanism: facts learned at one dimension become constraints that simplify the next dimension, while the solver remains linear at every call. It is sound only after the final candidate is checked against the original non-linear clauses. Inference: a Verus implementation could model each substitution as a proof-preserving rewrite lemma over a CHC AST, but the paper does not provide such a Rust encoding or a verified transformation.

## evidence from the benchmark table

The authors implemented `LHornSolver` and ran nine non-linear CHC verification problems from the SV-Benchmarks `RECUR/LIA/Eldarica` repository (Section 4, p. 5). Table 1 reports `safe` for all 9/9 problems. Times are 4,000 ms for `addition`, 2,000 ms for `bfprt`, `binarysearch`, `countZero`, `identity`, `merge`, and `fib`, and 1,000 ms for `palindrome` and `revlen`; the table's average is 2,000 ms. The dimension at which a solution became inductive was `k=1` for 7 of 9 programs and `k=2` for `bfprt` and `fib` (denominator 9 programs). These are exploratory runs, not a comparison study: the paper says QARMC solved all 9 and “much faster.” Hardware, solver settings, and repeated-run variance are not reported.

The experiment therefore supports feasibility on this nine-problem set, not scalability or superiority. The paper explicitly says its aim is not a systematic comparison. It also does not report unsolved instances, memory use, or sensitivity to higher dimensions beyond this table.

## proof boundary and product impact

The formal result is soundness of returned models, relying on the sound linear oracle, correct dimension transformation, and correct inductiveness check. The implementation, parser, constraint simplifier, polyhedral abstract interpreter, and benchmark encodings remain trusted engineering components. A model of CHCs proves the encoded clauses; it does not by itself prove that a Rust program was translated faithfully into those clauses.

Inference: for a Verus-based product, this method threatens mainly at the translation and assumption boundary. A solver-generated invariant can help automate `requires`/`ensures` or loop-invariant discovery, but a false translation, unsound external predicate fact, or omitted Rust ownership condition can make the result irrelevant to executable code. Verus can check the final Rust proof obligations, so the safest integration is to use dimension-bounded CHC solving to propose lemmas and then require Verus to prove them. Existing Horn solvers and tree-dimension transformations already cover the generic backend idea; VL should not redo that theory. New work should measure translation fidelity, proof repair effort, and how often generated invariants survive actual Verus checking.

## techniques for the catalog

- tree-dimension under-approximation — split CHC predicates by derivation-tree dimension so each bounded problem is linear
- incremental linear solving — solve dimensions from zero upward with a sound linear Horn oracle
- inductive-model check — remove dimension indices and test each candidate against the original non-linear clauses
- model-guided linearization — substitute previous constrained facts into the next dimension to keep its clauses linear
- bounded Horn verification — stop with a sound model, or report unknown when resources or the linear oracle fail

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
