# Formula Slicing: Inductive Invariants from Preconditions
(authored by agents unless marked 🧑)
Tag: `karpenkov2016formula`, [paper](http://arxiv.org/abs/1609.09288v2)

## scope and result
Formula slicing finds loop invariants by weakening a precondition until it is inductive. The abstract says: “Given a precondition of the loop, obtained from the preceding program fragment, we weaken it until it becomes inductive.” (abstract, p. 1). The paper also states: “A sound labelled ART where all nodes are either fully expanded or covered represents an inductive invariant.” (section 5, p. 10) Counterexamples from an SMT solver select which lemmas to remove; an abstract reachability tree (ART) applies the method to nested and non-reducible control-flow automata (CFA).

## technique 1: counterexample-driven weakening
Use this when a candidate formula is stronger than the loop can preserve. Put the formula in relaxed conjunctive normal form (RCNF), where each lemma can be independently removed. Annotate every lemma `li` with a selector disjunction `si ∨ li`; assuming `si` removes that lemma without rebuilding the formula (section 3, p. 6).

Algorithm 1 steps are: initialize selectors and an SMT query `φannotated ∧ τ ∧ ¬φ'annotated`; assume all selectors false; while the query is satisfiable, obtain model `M`; for each lemma, select removal if `M` falsifies its primed form or it is irrelevant to satisfiability; repeat; return the original formula with selected lemmas replaced by true (section 3, pp. 6–8). The paper states: “The solver will either report that the constraint is unsatisfiable, in which case φ is inductive, or provide a counterexample-to-induction represented by a model M(X ∪ X 0 )” (section 3, p. 6).

Inference: In Verus, encode the surviving lemmas as loop `invariant` clauses and rerun verification after each removal. Verus does not expose selector assumptions, so candidate filtering is an external script; every retained clause still needs Verus initiation and consecution proofs. A Verus invariant is written as a declaration, not as a call.

Evidence: the paper claims termination with the strongest weakening in a linear number of SMT calls relative to the annotated formula size (section 3, p. 6). This guarantee concerns the finite selector search, not whole-program termination.

## technique 2: abstract postconditions from weakenings
Use this to compute a postcondition of an input state under a transition while staying in the lattice of weakenings. Given `ψ`, transition `τ`, and candidate `φ`, test `ψ ∧ τ ∧ ¬φ'annotated`; adapt Algorithm 1 by adding `ψ` and replacing the inductiveness query with this postcondition query (section 3.1, p. 6). The found result is the strongest postcondition in that weakening domain (section 3.1, p. 6).

Inference: In Verus, use a ghost transition relation and prove a postcondition lemma for each edge. Candidate weakening can suggest which conjuncts belong in a loop invariant, but Verus's `ensures` must state the actual post-state relation and cannot quantify over an SMT selector state.

## technique 3: formula slicing over an ART
Use this for nested loops and arbitrary CFA structure. An ART node stores a CFA location, an abstract domain element, and a backpointer. Start with `(n0, >, ∅)`. Expand leaves, compute successors, and mark nodes covered when one abstract element entails another (section 5, pp. 9–11).

Algorithm 3's transfer steps are: find a sibling at the same CFA node; if found, compute an abstract postcondition by weakening the sibling under the incoming edge; otherwise convert the current candidate conjoined with the edge relation to RCNF; return the successor node. Algorithm 2 repeatedly expands every unexpanded and uncovered leaf and checks coverage by entailment (section 5, pp. 10–11).

The nested-loop example shows the method dropping `y = 0` after a counterexample increments `y`, then dropping `x = 1` on another edge; iteration converges to `{p = 1 ∨ p = 2, s ⇒ p = 1, c = 100}`, which proves the assertion (section 5.1, pp. 12–13).

Inference: In Verus, the ART corresponds to ghost proof states indexed by program location and call/loop context. Coverage is an implication lemma between invariant predicates. Rust control flow remains executable; ART nodes and backpointers are proof metadata generated outside the program.

Limit: the ART can cause exponential state-space growth because one CFA location can have many ART nodes; the authors report that stabilizing inner components first usually avoids this in practice (section 5, p. 11).

## technique 4: engineering optimizations and evaluation
The Slicer implementation uses Z3 for weakening, best-effort quantifier elimination, and three optimizations: discard candidate lemmas without live variables, cache non-nested-loop weakenings, and remove CFA nodes with no path to an error state (section 6, pp. 13–14). A syntactic weakening variant avoids SMT calls but is less precise (section 6.1, p. 14).

The evaluation uses 2,120 SV-COMP Device Drivers tasks: 1,857 are correct and the remainder have counterexamples. Runs used an Intel Xeon E5-2650, 8 GB RAM, 2 cores, and a 600-second CPU limit per program (section 7, p. 14). Formula slicing is over-approximating and therefore is compared on safety proofs, not counterexample discovery. The paper reports that formula slicing verifies 22 programs predicate analysis cannot, while predicate analysis produces the most correct proofs (section 7, p. 14).

Inference: For VL, these denominators and limits indicate a candidate-invariant generator rather than a complete verifier. A Verus pipeline should report both generated candidates and independently checked proofs; it should not treat an `unknown` result as safety.

## trust, assumptions, and product risk
The method assumes quantifier-free formulas can be represented in RCNF and that SMT models are sound for the chosen theory. Its proof obligation is inductiveness and ART coverage; trusted components include Z3, formula conversion, CFA extraction, and Slicer. Inference: agent-written Rust gains a practical invariant-synthesis aid, but unsound translation of Rust ownership, integer overflow, or heap state into the CFA can invalidate candidates. VL should reuse counterexample-guided weakening and retain Verus as the final checker.

## techniques for the catalog
- selector-based weakening: annotate lemmas with Boolean selectors and remove those falsified by SMT counterexamples
- abstract postcondition weakening: compute strongest postconditions within a lattice of formula weakenings
- ART formula slicing: propagate and cover weakened candidates over CFA nodes until a fixpoint
- invariant-engineering optimizations: use live-variable filtering, caching, CFA reduction, and syntactic weakening
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
