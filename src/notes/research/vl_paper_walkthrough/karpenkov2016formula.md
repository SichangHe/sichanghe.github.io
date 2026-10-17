# Formula Slicing: Inductive Invariants from Preconditions
(authored by agents unless marked 🧑)
Tag: `karpenkov2016formula`, [paper](http://arxiv.org/abs/1609.09288v2)

## scope and result
Formula slicing finds loop invariants by weakening a precondition until it is inductive. The abstract says: “Given a precondition of the loop, obtained from the preceding program fragment, we weaken it until it becomes inductive.” (abstract, p. 1). The paper also states: “A sound labelled ART where all nodes are either fully expanded or covered represents an inductive invariant.” (section 5, p. 10) Counterexamples from an SMT solver select which lemmas to remove; an abstract reachability tree (ART) applies the method to nested and non-reducible control-flow automata (CFA).

## technique 1: counterexample-driven weakening
Use this when a candidate formula is stronger than the loop can preserve. Put the formula in relaxed conjunctive normal form (RCNF), where each lemma can be independently removed. Annotate every lemma `li` with a selector disjunction `si ∨ li`; assuming `si` removes that lemma without rebuilding the formula (section 3, p. 6).

Algorithm 1 steps are: initialize selectors and an SMT query `φannotated ∧ τ ∧ ¬φ'annotated`; assume all selectors false; while the query is satisfiable, obtain model `M`; for each lemma, select removal if `M` falsifies its primed form or it is irrelevant to satisfiability; repeat; return the original formula with selected lemmas replaced by true (section 3, pp. 6–8). The paper states: “The solver will either report that the constraint is unsatisfiable, in which case φ is inductive, or provide a counterexample-to-induction represented by a model M(X ∪ X 0 )” (section 3, p. 6).

Inference: In Verus, encode the surviving lemmas as loop `invariant` clauses and rerun verification after each removal. Verus does not expose selector assumptions, so candidate filtering is an external script; every retained clause still needs Verus initiation and consecution proofs. A Verus invariant is written as a declaration, not as a call.

Evidence: the paper says “As shown in related literature [4], Alg. 1 terminates with the strongest possible weakening within the linear number of SMT calls with respect to kφannotated k.” (section 3, p. 6). The optimality proof is cited from Flanagan et al. [4], not given in this paper. Inference: this guarantee concerns the finite selector search, not whole-program termination.

## technique 2: abstract postconditions from weakenings
Use this to compute a postcondition of an input state under a transition while staying in the lattice of weakenings. Given `ψ`, transition `τ`, and candidate `φ`, test `ψ ∧ τ ∧ ¬φ'annotated`; adapt Algorithm 1 by adding `ψ` and replacing the inductiveness query with this postcondition query (section 3.1, p. 6). The found result is the strongest postcondition in that weakening domain (section 3.1, p. 6).

Inference: In Verus, use a ghost transition relation and prove a postcondition lemma for each edge. Candidate weakening can suggest which conjuncts belong in a loop invariant, but Verus's `ensures` must state the actual post-state relation and cannot quantify over an SMT selector state.

## technique 3: formula slicing over an ART
Use this for nested loops and arbitrary CFA structure. An ART node stores a CFA location, an abstract domain element, and a backpointer. Start with `(n0, >, ∅)`. Expand leaves, compute successors, and mark nodes covered when one abstract element entails another (section 5, pp. 9–11).

Algorithm 3's transfer steps are: find a sibling, an ancestor reached by backpointers at the same CFA node (in the implementation, the sibling is defined by callstack, CFA node and loopstack); if found, compute the abstract postcondition of the current element under the edge `τ` in the weakenings of the sibling (Sec. 3.1), which the text says acts as widening; otherwise convert the current element conjoined with `τ` to RCNF; return the successor node. Algorithm 2 repeatedly expands every unexpanded and uncovered leaf and checks coverage by entailment (section 5, pp. 10–11).

The nested-loop example of Fig. 3 drops `y = 0` from the inner-loop candidate after a counterexample to induction (`y` is incremented), drops `x = 0` and `y = 0` from the outer candidate on the identity edge `τ4`, and then drops `x = 1` from the inner candidate on `τ2`, leaving `{p = 1 ∨ p = 2, s ⇒ p = 1, c = 100}` for the inner loop. The paper then says: “Finally, the iteration converges, as all further postconditions are already covered by existing invariant candidates. Observe that the computed invariant is sufficient for proving the asserted property.” (section 5.1, pp. 12–13). As printed, the outer-candidate step lists `y = 0` as kept although the text says it was dropped; I did not resolve this.

Inference: In Verus, the ART corresponds to ghost proof states indexed by program location and call/loop context. Coverage is an implication lemma between invariant predicates. Rust control flow remains executable; ART nodes and backpointers are proof metadata generated outside the program.

Limit: the ART can cause exponential state-space growth because one CFA location can have many ART nodes; the authors write that with a good iteration order (stabilizing inner components first), “this problem does not occur in practice” (section 5, p. 11).

## technique 4: engineering optimizations and evaluation
The Slicer implementation, integrated in CPAchecker, uses Z3 for weakening and its qe-light tactic for best-effort quantifier elimination, with three optimizations: discard candidate lemmas generated during RCNF conversion that contain no live variables; for a self-loop edge `(N, τ, N)` (non-nested loop), annotate and weaken the candidates on both sides and cache that the result is inductive under `τ`; and remove CFA nodes with no path to an error state (section 6, p. 13). Slicer reports `true` if the found invariant separates the initial state from the error property, and `unknown` otherwise (section 6, p. 13). A syntactic weakening variant, which keeps lemmas not syntactically modified by the transition, avoids SMT queries and is “faster and less precise” (section 6.1, p. 13).

The evaluation uses 2,120 SV-COMP Device Drivers tasks: 1,857 are correct and the remainder have counterexamples. Runs used an Intel Xeon E5-2650, 8 GB RAM, 2 cores, and a 600-second CPU limit per program (section 7, p. 14). Formula slicing is over-approximating and therefore is compared on safety proofs, not counterexample discovery. The paper reports that formula slicing verifies 22 programs predicate analysis cannot, while predicate analysis produces the most correct proofs (section 7, p. 14). Table 1 (p. 15) lists proofs, timeouts and memory outs: Slicer-CEX 1253, 475, 0; Slicer-Syntactic 1166, 407, 0; Predicate Analysis 1301, 657, 0; PAGAI 1214, 3 incorrect proofs, 409 timeouts, 240 memory outs (the table's columns are proofs, incorrect, timeouts, memory outs, so PAGAI's 3 is the incorrect count).

## trust, assumptions, and product risk
The paper defines RCNF as a conjunction of quantifier-free formulas and, for existentially bound variables left by large block encoding, drops any lemma that still contains one after best-effort elimination, which over-approximates (section 4, p. 9). Its proof obligation is inductiveness and ART coverage (section 5, p. 10).

## techniques for the catalog
- selector-based weakening: annotate lemmas with Boolean selectors and remove those falsified by SMT counterexamples
- abstract postcondition weakening: compute strongest postconditions within a lattice of formula weakenings
- ART formula slicing: propagate and cover weakened candidates over CFA nodes until a fixpoint
- invariant-engineering optimizations: use live-variable filtering, caching, CFA reduction, and syntactic weakening
