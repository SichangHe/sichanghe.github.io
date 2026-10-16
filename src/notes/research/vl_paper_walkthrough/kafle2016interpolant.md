# Interpolant Tree Automata and their Application in Horn Clause Verification
(authored by agents unless marked 🧑)
Tag: `kafle2016interpolant`, [paper](http://arxiv.org/abs/1601.06521v2)

## what the paper proves and measures
The paper combines convex-polyhedra abstract interpretation with interpolant tree automata (ITA) in counterexample-guided refinement of constrained Horn clauses (CHCs). Its abstract states: “The role of an interpolant tree automaton is to provide a generalisation of a spurious counterexample during refinement, capturing a possibly infinite set of spurious counterexample traces.” The method is implemented as RAHIT and compared with RAHFT (finite-tree-automata refinement) and TAR (trace abstraction refinement).

The experiment has 68 programs: “A set of 30 programs from SV-COMP’15 repository” and 38 Eldarica-source problems (Sec. 4.1, p. 112). The table reports RAHIT solving 61/68 versus RAHFT 56/68, with average RAHIT time 11.40 seconds and 2.08 iterations versus RAHFT 10.55 seconds and 2.32 iterations (Table 1, p. 114). On the 38-problem comparison, RAHIT solves 33/38 versus TAR 28/38, but the authors warn that the tool chain is “not optimised at all” (Sec. 4.1, p. 112). The timeout is 300 seconds on a 2.3 GHz Intel Core i7 Mac with 8 GB memory (Sec. 4.1, p. 112). The paper reports no Verus experiment.

## technique 1: encode derivations as finite tree automata

What it is. A CHC has the form `φ ∧ p1(X1) ∧ ... ∧ pk(Xk) → p(X)`; each clause gets a function-symbol identifier. The trace FTA has predicate symbols as states, `false` as final state, and transitions `cj(p1,...,pk) → p` for clauses (Definitions 1–2, pp. 104–105). An accepted tree is a derivation trace. An AND-tree labels each node with its atom, clause identifier, and constraint; the conjunction `F(T)` of all node constraints is feasible exactly when the trace is feasible (Definition 3, pp. 106–107). The Fibonacci example's trace `c3(c2(c1,c1))` is infeasible because its conjunction is unsatisfiable (Fig. 2, p. 107).

How to apply it.
1. Translate program procedures and assertions into CHCs.
2. Assign each clause a unique identifier whose arity equals its body-atom count.
3. Build the trace FTA from clause bodies.
4. Select an accepted trace rooted at `false`; expand it to an AND-tree and conjoin constraints.
5. Check `F(T)` with a background solver; feasible means unsafe, infeasible means spurious and eligible for refinement.

Verus form (Inference). A Verus front end could lower a function's control-flow and invariant obligations to CHCs, but this is not a Verus construct. Ghost predicates and `requires`/`ensures` become relation arguments; Verus proofs still need explicit Rust ownership and termination facts.

## technique 2: construct a tree interpolant from an infeasible trace

What it is. For unsatisfiable `φ1 ∧ φ2`, a Craig interpolant `I` satisfies `φ1 → I`, `I ∧ φ2 → false`, and uses only shared variables (Definition 4, p. 107). The tree algorithm labels each leaf `i` with `I(F(Ti),G(Ti))`; an internal node combines its constraint with child interpolants and computes `I(F1,G(Ti))`; the root is `false` (Definition 5, p. 108). In Fig. 3 the resulting labels include `fib(A,B): A≤3`, `fib(A2,B2): A2≤1`, and `true`.

How to apply it.
1. Build the AND-tree for the spurious trace.
2. For every leaf, split its subtree formula from the rest and ask an interpolating solver for a shared-variable interpolant.
3. At each parent, conjoin the node constraint with child interpolants and interpolate against the context outside that subtree.
4. Label the root `false`; retain the mapping from atom occurrence to formula.
5. Check the tree-interpolant property: child interpolants and the node constraint imply the parent label, and variables stay within the subtree/context intersection (Property 1, p. 109).

Verus form (Inference). State each interpolant as a `spec fn` predicate over the shared ghost variables and prove implication lemmas with `proof fn`. Verus does not expose Craig-interpolant extraction, so an external interpolant generator must emit formulas that Verus rechecks.

## technique 3: lift interpolants into an automaton that removes many traces

What it is. The interpolant mapping becomes states of an interpolant automaton `AtI`; transitions are clause applications whose mapped formulas satisfy the clause implication (Definition 8, p. 109). Theorem 1 says the automaton “recognises only infeasible trace-terms of P.” Thus one spurious trace generalizes to a possibly infinite language of spurious traces. If the conjunction of all interpolants for each predicate is a model of `P`, Theorem 2 says the automaton recognizes all infeasible traces (p. 110).

How to apply it.
1. Create one automaton state for each atom occurrence/interpolant label.
2. Keep the root state final and mark it as `false`/error.
3. Add a transition for each clause instance whose interpolant formulas entail the clause head formula.
4. Compute the language difference between the abstract trace automaton and `AtI`; this removes every generalized spurious trace in one refinement.
5. Generate transformed CHCs from the difference automaton and rerun abstract interpretation.

Verus form (Inference). Use a ghost finite-state abstraction and prove that every removed path violates a state predicate. Verus can verify the refinement invariant, but not execute tree-automata language difference without an external algorithm and certificate.

## technique 4: combine convex-polyhedra abstraction with CEGAR

What it is. Abstract interpretation computes an over-approximate model `M` of CHCs using conjunctions of linear equalities and inequalities. The FTA `APM` omits transitions whose clause bodies are unsatisfiable under `M`; if `false` is absent from `M`, the program is safe. Otherwise select a trace, test feasibility, and refine with RAHIT (Sec. 4, pp. 110–112). This is CEGAR: coarse invariants first, then targeted trace elimination.

How to apply it.
1. Compute convex-polyhedral facts for every predicate.
2. Build `APM`, retaining only transitions whose abstract body is satisfiable.
3. If `false` is absent, report safe; otherwise choose an accepted trace.
4. Check the concrete trace. If feasible, report unsafe; if infeasible, construct `AtI`.
5. Replace `APM` by `APM \ AtI`, generate refined clauses, and iterate until safe, unsafe, or resources are exhausted (Fig. 4, pp. 111–112).

Verus form (Inference). A Verus workflow can use ghost linear inequalities as candidate invariants and counterexample-specific lemmas as refinements. It must preserve Rust aliasing and ownership obligations; convex-polyhedron facts alone do not establish heap or concurrency safety.

## evidence, limits, and product threat
The controlled comparison supports a tradeoff: RAHIT solves more tasks and uses fewer iterations, while interpolation costs time and can time out. The paper explicitly says RAHIT times out on `cggmp2005 true-unreach` while RAHFT solves it in five iterations, and attributes this to interpolant generation (Sec. 4.1, p. 113). It also reports a 33/38 versus 28/38 advantage over TAR, but the solvers, integer-versus-real arithmetic, benchmark provenance, and timeout behavior limit generalization. Inference: for agent-written verified Rust, this method threatens workflows that rely on one counterexample or one invariant template; it suggests certificate-producing counterexample generalization, but does not replace Verus's proof checking. Existing CHC/FTA CEGAR work means VL should reuse the architecture and measure Rust-specific translation overhead.

## techniques for the catalog
- trace finite-tree automata — represent CHC derivations as automata and test accepted AND-trees for feasibility
- tree Craig interpolation — label an infeasible derivation tree with shared-variable interpolants bottom-up
- interpolant automaton generalization — turn one interpolant-labeled trace into an automaton recognizing many spurious traces
- polyhedral CEGAR — combine convex-polyhedron invariants, trace feasibility, automata difference, and clause refinement
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
