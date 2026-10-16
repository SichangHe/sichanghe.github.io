# Decomposition by tree dimension in Horn clause verification
(authored by agents unless marked 🧑)
Tag: `kafle2015dimension`, [paper](http://arxiv.org/abs/1512.03862v1)

## problem and result

The paper decomposes nonlinear constrained Horn clause (CHC) proofs by the tree dimension of derivations. Dimension measures branching: a list has dimension zero, while a complete binary tree's dimension equals its height. The abstract says: "A given set of Horn clauses P can be transformed into a new set of clauses P≤k , whose derivation trees are the subset of P’s derivation trees with dimension at most k." (Abstract, p. 1). The complementary program `P>k` represents derivations of dimension at least `k+1`. Proving both pieces proves the original program, and the pieces can run in parallel.

## technique 1: at-most/at-least dimension decomposition

What it is. For each predicate `H`, split it into `H≤d` and `H=d` for dimensions up to `k`. Linear clauses propagate dimension directly. For a nonlinear clause with `r` body atoms, the construction creates clauses in which one child has dimension `d−1` and the others have at most `d`, or two children have dimension `d−1` and the remaining children at most `d−2` (Definition 2, pp. 2–3). Epsilon clauses accumulate exact dimensions into at-most predicates. The at-least program retains original clauses and adds link clauses from `H≥0` to `H`, so it accepts derivations above the cutoff (Definition 3, p. 4).

How to apply it. (1) Translate the program to CHCs with an integrity predicate such as `false`. (2) Choose `k=0,1,...`. (3) Generate `P≤k` using the linear, nonlinear, and epsilon rules. (4) Ask an existing sound CHC solver whether `P≤k` is safe. (5) Generate `P>k` and ask the solver. (6) If the first result is unknown, return unknown; if the second is unknown, increase `k`; return safe or unsafe as soon as a decisive result is obtained (Algorithm 1, §3, pp. 4–5). The paper's Fibonacci example uses clauses `fib(A,A)` for the base case and two recursive calls for the nonlinear case (Fig. 1, p. 2); its `Fib≤0` contains only linearized base derivations (Fig. 3, p. 3).

Evidence and proof obligation. The decomposition lemma states: "For all k, program P is safe if and only if both P≤k and P>k are safe." (Lemma 1, §3, p. 5). The algorithm is sound: a safe return means the original has a model, and an unsafe return means a feasible derivation of `false` exists (Proposition 1, §3, p. 5). The method is under-approximate for each dimension fragment, so safety of both fragments is what establishes safety of the whole program.

Verus form. Inference: represent a recursive Rust computation as a ghost derivation tree and define a `spec fn` for its dimension. Generate separate proof obligations for trees with `dim ≤ k` and the residual `dim > k`; use `assert` and `proof fn` lemmas to combine their safety results. Verus does not manipulate CHC predicates or invoke an external CHC oracle automatically, so the transformation would be a preprocessor or proof-generation service. The executable Rust code can remain unchanged if the generated specifications faithfully model it.

## technique 2: finite tree automata difference

What it is. A trace finite tree automaton (FTA) has predicate symbols as states, clause identifiers as ranked constructors, and transitions `c(p1,...,pn) → p` for each CHC. Its language is isomorphic to successful and unsuccessful derivation trees (§4.1, pp. 5–6). To construct `P>k` without copying the original clauses, first eliminate epsilon clauses from `P≤k` by unfolding them, inherit each originating clause's identifier, build FTAs for `P` and `P≤k`, determinize their union, and remove states accepting a `P≤k` derivation. The resulting FTA difference accepts exactly trees of dimension greater than `k` (§4.2, pp. 6–9).

How to apply it. (1) Give each source clause a unique ranked identifier whose arity equals its body-atom count. (2) Unfold every `H≤d ← H=d` epsilon clause into copies of the underlying linear or nonlinear clauses. (3) Assign each unfolded clause the identifier of its source clause. (4) Build the trace FTA for the original and at-most programs. (5) Form the language difference by standardizing predicate names, taking the union, determinizing, and deleting states containing an accepting state of the at-most FTA. (6) Convert the resulting transitions back to CHCs using the inverse identifier map (§4.2, pp. 6–9). The Fibonacci construction yields `fib_0`, `fib_1`, and a residual `fib` whose derivations have dimension at least one (Fig. 8, p. 9).

Verus form. Inference: a Verus proof generator could use an FTA to partition recursive call trees before emitting lemmas. The FTA and determinization are outside Verus; resulting predicates can become ghost tags or `spec fn` cases. Determinization may be expensive, so a VL implementation should use it only when the residual proof is easier than the original.

## technique 3: dimension instrumentation

What it is. Add a final dimension argument `K` to every predicate. For each original clause, add dimension variables for body calls and a `dimn(K1,...,Kn,K)` relation implementing the tree-dimension recurrence (Definition 9, §5, p. 9). Base clauses use `dim0(K)`; two-child clauses use `dim2`; larger bodies compose `dim2` operations. Existing Horn solvers can then prove bounds by checking an integrity constraint. For McCarthy's 91-function, the paper adds `false :- K > 2, mc91(X,Y,K)` and proves that all successful derivations have dimension at most 2 (Example 4, p. 10). For Fibonacci it proves a bound relating dimension to the input using `false :- fib(A,B,K), 2*K - 1 >= A` (Example 5, p. 10).

How to apply it. (1) Add a dimension argument to every predicate. (2) Add `dim0` for base clauses. (3) Add a relation implementing the dimension recurrence for each nonlinear clause. (4) Add an integrity constraint expressing the desired upper bound, lower bound, or relation to data. (5) Run a CHC solver; a safe result proves the dimension property (§5, pp. 9–11). The paper notes that deciding whether dimension is bounded by a constant is undecidable in general, so this is a verification attempt, not a decision procedure (§5, p. 10).

Verus form. Inference: add a ghost natural `k` to recursive specifications and a `decreases` or ranking argument for the recursive call. Define dimension recurrence as a `spec fn`; prove bounds with `ensures` and `assert` lemmas. Verus's termination checker can establish a decreasing measure but does not automatically synthesize CHC dimension relations. Dimension instrumentation can nevertheless expose a structural measure useful for bounding proof search.

## evidence, trust, and limits

The exploratory evaluation uses 16 nonlinear CHC benchmarks and an abstract-interpretation solver over convex polyhedra with a five-minute timeout. The decomposition solves 14/16 with an average time of 4 seconds over solved problems; QARMC solves all, and an earlier finite-tree-automata refinement solves one additional problem (Table 1, §7, pp. 12–13). Most cases use `k=0`, suggesting that separating linear derivations delays join and widening and improves precision. These are benchmark counts, not a universal speed guarantee. The method trusts the CHC encoding, the SAFE oracle, convex-polyhedra abstract interpretation, FTA determinization, and the assumption that unknown at larger `k` can be treated as unknown as specified in Algorithm 1. The paper itself calls the results preliminary and exploratory.

The authors' conclusion is deliberately limited: "We presented a program transformation approach to Horn clause verification using the notion of tree dimension to decompose the verification problem by separating dimensions." (§8, p. 12). This describes a proof transformation, not a replacement for the underlying solver.

Inference: threat to agent-written verified Rust is low to moderate. Dimension partitioning can organize proofs of recursive, branching data structures and help parallelize residual obligations, but it does not prove that the Rust implementation matches the CHC model. A wrong dimension relation or omitted recursive branch can make a residual proof vacuous. Existing work already contains tree-automata refinement, CHC solving, and dimension instrumentation; VL should reuse these as proof-search infrastructure rather than claim a new decomposition principle.

## techniques for the catalog

- tree-dimension decomposition — split CHC derivations into at-most-k and residual at-least-k fragments and prove both
- FTA language difference — construct the residual derivations by subtracting the at-most fragment's trace automaton
- dimension instrumentation — add a ghost dimension argument and recurrence relations so CHC solvers can prove dimension bounds
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
