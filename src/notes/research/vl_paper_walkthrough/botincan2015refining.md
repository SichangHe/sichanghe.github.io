# Refining Existential Properties in Separation Logic Analyses
(authored by agents unless marked 🧑)
Tag: `botincan2015refining`, [paper](http://arxiv.org/abs/1504.08309v1)

## problem and contribution

Botinčan, Dodds, and Magill address separation-logic analyses that lose data facts when they collapse a heap into a finite abstract domain. Their target is existential properties such as “list contains value x”. To ensure termination, the analysis abstracts symbolic heaps by a function with a finite codomain, but this abstraction may erase exactly the witness needed to prove safety. The paper proposes a CEGAR-like forward/backward refinement process, parameterized by a multiset of values or addresses. Its abstract says: “Our method works backwards from an error, identifying necessary information lost by abstraction, and refining the forward analysis to avoid the error.” (p. 1).

The running program builds a linked list, inserts an arbitrary `x`, extends the list, and searches for `x`. A conventional list abstraction turns `node(r,r',x) * node(r',nil,d')` into `list(r,nil)`, forgetting length and data; when the list is unfolded later, the analysis obtains `node(r,nil,x')`, which is too weak to show that `x = x'`, so the path where `res` is not set to 1 appears feasible and the assertion cannot be proved (pp. 3–4). The proposed domain uses `list(·,·,S)`, where a multiset `S` records lower bounds on selected values. Refinement adds symbols to `S`, protecting those existential facts from abstraction (pp. 4, 11).

Inference: VL can use this as a model for repairing a failed Verus proof by identifying the value or address fact erased by a coarse representation and adding it to a ghost-state invariant. The paper is about separation logic and coreStar, not Rust or Verus; the Verus mappings below are therefore explicitly inferences.

## analysis model: symbolic heaps and finite abstraction

A symbolic heap is a pure formula conjoined with a spatial formula; separating conjunction `*` requires disjoint heap portions (p. 4). Commands have separation-logic specifications `{P} c {Q}` (p. 5). Forward transfer uses frame inference: given a current heap and a command precondition, it finds a frame left untouched by the command, and the result is the postcondition joined with the frame; if no frame exists the result is `>` (p. 5). The abstract domain is the join-semilattice of disjunctive symbolic heaps plus `>`, representing error; this domain is infinite (“Since our abstract domain is infinite”, p. 6). Termination comes from the abstraction function `abs`, whose codomain `CSH` is a finite subset of symbolic heaps. `abs` must be inflationary, i.e. it “soundly over-approximates symbolic heaps with respect to `⊢`”: it replaces a heap with a logically weaker one (p. 6).

Forward analysis propagates abstract states through a control-flow graph, joins them at nodes, and computes an inflationary fixpoint. An abstract reachability tree (ART) stores `(control-point, symbolic-heap)` nodes. If no ART node at the next depth remains, the computed map is an inductive invariant not containing `>` (Algorithm 1, pp. 6–7).

Inference: A Verus analogue is a finite ghost summary of a heap or collection, with a `spec fn` abstraction from concrete `Seq` or map state to a summary and lemmas proving sound over-approximation. The executable Rust can retain the full structure while proof code reasons about the summary. Verus's `requires`, `ensures`, loop invariants, and `assert` clauses can encode command contracts and inductiveness, but Verus does not provide this CEGAR algorithm automatically.

## technique 1: diagnose a failed abstract proof by abduction

Use this when forward analysis reaches `>` or cannot prove an assertion. The paper defines abduction as finding a missing assumption `∆A` such that `∆1 * ∆A ⊢ ∆2`; frame inference instead finds a remainder `∆F` such that `∆1 ⊢ ∆2 * ∆F` (p. 5). Backward transfer uses a command specification `{P} c {Q}` and a target state `∆`: it chooses `∆A` with `Q * ∆A ⊢ ∆`, then returns `P * ∆A` as a sufficient predecessor (p. 5).

Steps from Algorithm 2 (listing p. 8, explanation pp. 8–9):
1. Start at the terminal error node and identify the preceding command's precondition `P`.
2. Solve `∆k−1 * [∆A] ⊢ P * true` to find resources or pure facts that would make the command safe (line 6; text p. 9).
3. Set the strengthened state to `∆'k−1 = ∆k−1 * ∆A`.
4. Push that state backward through prior commands with the abductive transfer `JcK←`.
5. Stop at the first path position where the forward state entails the backward sufficient state; the mismatch identifies where abstraction lost precision (line 13; pp. 8–9).
6. If no such point is found, Refine “reports a (still possibly spurious) error” (line 18; p. 9).

In the list example, abduction discovers that remembering a node containing `x` is necessary; the refinement then adds `x` to the multiset (pp. 4, 10).

Inference: A Verus proof repair can introduce a ghost predicate describing the missing witness, then prove a lemma that the predicate is sufficient for the failing postcondition. The analogue of abduction is a manually or mechanically generated `requires` fact, followed by backward reasoning through helper lemmas. Verus does not support separation `*` directly; ownership and disjoint slices must be represented with explicit predicates and index or pointer relations.

## technique 2: refine a parameterized multiset abstraction

Use this when existential facts matter; the paper says “We cannot remove abstraction entirely” (p. 4). The family of abstractions `absS` is indexed by a multiset `S`; if `S ⊆ S'`, then `absS'` is more precise (p. 6). The algorithm starts at `S = ∅`; after a spurious failure, it adds symbols selected from the forward/backward mismatch and recomputes the affected ART subtree (Algorithms 1–2, pp. 6–9).

For linked lists with value refinement, `list(x,y,S)` means a nonempty segment ending at `y` with at least the multiplicity of each selected value in `S`. The final abstraction rule replaces each `list(e,f,S)` by `list(e,f,prT(S,Π))`, where `prT` “extracts the maximal subset of S such that no element appears more frequently than it does in T (modulo given pure assumptions Π)” (p. 12). The paper proves finiteness, soundness, and monotonicity of this domain (Lemmas 1–3, p. 12).

Steps: choose a finite parameter family; define recursive predicates carrying the multiset; abstract by rewriting to a bounded projection; on failure, add selected symbols; delete and recompute the ART subtree below the refinement point (pp. 6, 9, 11–12).

Inference: In Verus, the multiset can be a ghost `Seq` or finite map of values to lower bounds. A loop invariant can assert that each selected value appears at least the recorded count. Refinement means strengthening the invariant with one additional value or address and re-running proof search. The executable data structure need not change, but every operation contract must preserve the strengthened ghost fact.

## technique 3: select symbols from forward/backward differences

`SelectSymbols` receives forward and backward symbolic-heap paths after a point where the forward state entails the backward state. The implementation compares syntactic structures, builds congruence classes of common terms, traverses equality trees, and selects variables whose equalities strengthen the forward state without inconsistency (pp. 9–10). In the running example, it detects `d = x` and selects `x`; adding `x` protects `list(·,·,{x})` from abstraction (p. 10).

Steps: preserve substitutions while proving entailment; identify common terms and congruence classes; enumerate equalities in the backward state; test whether adding each equality is consistent and strengthens the forward state; add the corresponding program variables or constants to the multiset (pp. 9–10).

Inference: For VL, a practical version could inspect a failed Verus obligation's model and compare the facts present in a successful specification lemma, then suggest a ghost variable or quantified invariant. This is a design idea, not an algorithm evaluated by the paper. Verus's solver models are not guaranteed to expose a unique missing fact, so suggestions need human review.

## technique 4: address refinement and sorted-list refinement

The value domain is not limited to values. Address refinement protects particular node addresses in a list, which is needed when proving removal of a node at address `x`; the standard list abstraction may forget that node exists (p. 12). The `SHrls` family adds addresses to a finite multiset and prevents abstraction from folding protected nodes: each rewrite rule applies only if the node's address is not among the addresses in `T` (pp. 12, 17–18).

The sorted-list family `SHsls` carries an interval `[α,β)` and a multiset of selected values while preserving sortedness. Splitting a sorted segment intersects the multiset with the corresponding value intervals, and abstraction maintains the interval invariant (pp. 12, 18–19). In the FreeRTOS list benchmarks, remembering the sentinel value suffices for Property 4 (row 15, `SHmls`), while Property 5 needs sortedness tracking (row 16, `SHsls`) (pp. 13–14).

Inference: A Verus address refinement corresponds to a ghost set of stable node identities or indices, with invariants tying each identity to a live location. Sorted-value refinement corresponds to a `Seq` sortedness predicate plus lower-bound counts for selected values. Rust moves and pointer invalidation make identity modeling a substantial additional proof obligation; the paper assumes separation-logic locations and does not address Rust ownership.

## experimental evidence

The prototype is implemented in coreStar and evaluates three domains on Redis-derived Set, Multiset, and Map benchmarks, Azureus ByteBufferPool properties, and FreeRTOS list properties (p. 13). Table 1 reports 16 rows. The eleven Redis-based rows (1–11) use `SHmls`; rows 12–14 (ByteBufferPool) use `SHrls`; row 15 uses `SHmls` and row 16 uses `SHsls` (FreeRTOS). Verified rows are marked `X`; `>` means an error and `∞` means nontermination (table caption, p. 13).

The table's denominators are rows, not random trials. For example, benchmark 1 verifies with `|T|=1`, one refinement, 83 ART states, and 162 prover queries; benchmark 9 verifies with `|T|=2`, two refinements, 219 ART states, and 458 queries. ByteBufferPool Property 3 verifies with six final parameters (two minimally sufficient), four refinements, 316 ART states, and 511 queries. FreeRTOS Property 5 verifies with six parameters, five refinements, 425 ART states, and 971 queries (Table 1, p. 13). The paper gives no aggregate success percentage; counting the table entries yields 14 `X`, one `∞` (row 4), and one `>` (row 5), but that count is an inference from the table rather than a reported percentage.

The paper explicitly documents limits. Universal property benchmark 4 loops forever because it keeps adding `x` to `T`; benchmark 5 fails to find an inductive invariant because of ordering, and the sorted-list domain also loops forever (p. 14). The conclusion says that “without further assumptions Algorithm 1 might diverge, or fail to recognize a spurious counter-example as infeasible”, and the authors “are skeptical that our current heuristic satisfies” the condition that symbol selection rules out the counter-example (p. 14). Completeness is conditional on exact forward transfer, precise backward transfer, and a selector that eventually chooses symbols sufficient to eliminate the counterexample (Appendix A, pp. 16–17).

## proof boundary and implications for VL

Theorem 1 proves that termination without an error yields an inductive invariant (p. 9). The conclusion states: “We have presented a CEGAR-like abstraction refinement scheme for separation logic analyses, aimed at refining existential properties of programs, in which we want to track some elements of a data structure more precisely than others.” (p. 14). Theorem 2 gives relative progress under assumptions (a)–(c), and Theorem 3 gives relative completeness when a finite sufficient multiset exists and the selector eventually chooses it (Appendix A, pp. 16–17). The implementation's backward search uses a polynomial heuristic rather than complete exponential abduction; the paper says it may miss solutions (p. 17). The running example's overview concludes: “This suffices to prove the program correct.” (p. 4).

Inference: Trust therefore includes command specifications, the separation-logic prover (the paper says “We assume a sound theorem prover”, p. 5), abstraction soundness, and the heuristic's assumptions.

Inference: The threat to agent-written verified Rust is concentrated in erased existential state: a proof may preserve shape or memory safety while losing the fact that a sentinel, key, or permission-bearing object still exists. VL should expose such facts as explicit ghost predicates and use counterexample-guided strengthening rather than indiscriminately making every invariant concrete. Existing Verus notes already cover ownership, loop invariants, and solver-backed lemmas; VL need not redo separation-logic abstraction. The useful new catalog entry is a disciplined workflow for finding and protecting the one value, address, or order fact required by a failing proof.

## techniques for the catalog

- abduction diagnosis: compute a missing precondition backward from an abstract error to expose the fact needed for safe execution
- multiset-parametric abstraction: refine a finite heap abstraction by adding selected values or addresses while preserving soundness and termination conditions
- forward/backward mismatch selection: compare sufficient backward states with forward states and select equalities whose symbols were erased
- ART recomputation: delete the subtree below a refinement point and recompute it under the stronger abstraction
- value-refined list domain: preserve lower bounds for selected list values while abstracting other data
- address-refined list domain: protect selected heap locations from list folding
- sorted-list refinement: combine interval sortedness with selected-value multiplicities
- conditional progress/completeness: require exact forward transfer, precise backward transfer, and a sufficient selector for termination guarantees
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Intuitively, because these equalities are mentioned in the calculated sufficient resource, they will likely be significant for program correctness."): read the whole paper (pp. 1-19 including appendices) and checked every quotation, page reference, Table 1 number (rows 1, 9, 14, 16 and the 14 X / 1 infinity / 1 error count), the Algorithm 2 steps, the SelectSymbols description, and the domain definitions; changed page references (frame inference/abduction p. 5, running-example text pp. 3-4, SelectSymbols pp. 9-10, Fig. 5 p. 18), the description of the abstract domain (infinite; `abs` has finite codomain), the `prT` description, the garbled Table 1 domain sentence, the FreeRTOS domain attribution, the step-6 wording, the page of the "This suffices" quote (p. 4), and marked trust conclusion as Inference; link kept from the paper text (arXiv 1504.08309v1); did not check the Verus/VL-related Inference paragraphs against anything outside the paper, did not check the claim about existing Verus notes, did not recheck Lemma proofs or the references list.
