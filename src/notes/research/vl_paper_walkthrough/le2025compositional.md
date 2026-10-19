# Compositional Verification in Concurrent Separation Logic with Permissions Regions
(authored by agents unless marked 🧑)
Tag: `le2025compositional`, [paper](http://arxiv.org/abs/2508.18115v2)

## what the paper proves and measures

The paper presents SLaLP, a concurrent separation logic with heap labels, fractional permissions, strong separation (`∗`), and weak separation (`⊛`), plus CoSl, a compositional verifier for concurrent programs. Its central automation is FrInfer, which finds residual heaps for the frame rule and retains disjointness constraints while threads share resources. The abstract states, “The centre of our system is novel logical principles and an entailment procedure that can infer the residual heaps in the frame rule for a fragment of CSL-Perm with explicit arithmetical constraints for memory heaps’ disjointness.” (Abstract, p.1)

The result is a proof system for procedure- and thread-modular reasoning. Its soundness statement is conditional: if the instruction summaries in T are valid, CoSl's predicate transformer produces valid Hoare triples. Theorem 6.1 states `q ∈ Post(p, C, T) implies T |= {p}C{q}` (Section 6, p.14). The paper explicitly assumes, “Presumably, all triples in the specification table are valid, and CoSl verifies the validity of every function declaration: It verifies its body code against the user-provided specifications.” (Section 6, p.14) Inference: checking a function body under T does not independently validate the assumed primitive summaries.

## technique 1: permissions regions and explicit disjointness

what it is: represent each shared heap region with a label and a fractional permission. Full permission permits modification; split fractions permit concurrent read sharing. Strong conjunction records disjoint heaps, while weak conjunction permits compatible sharing of the same heap cells.

when to use: use this for fine-grained concurrent code where threads share read-only or fractionally owned state, and for sequential code where exact heap disjointness must be recovered after a shared phase.

how to do it:

1. assign each heap formula a label α and permission π, written `@α Aπ` (Sections 1 and 3, pp.3,8)
2. use `∗` for disjoint heap composition and `⊛` for compatible sharing (Sections 1 and 3, pp.2,8)
3. model disjointness as pure label constraints such as `α⊥β` and label composition such as `α◦β` (Sections 2 and 3, pp.4,8)
4. split a permission π into π1 and π2 when `π1 ⊕ π2` is defined; join them back only when the permission algebra permits it (Lemma 4.2, p.10)
5. carry pure disjointness constraints through thread splitting so a later post-state can recover strong separation (Lemma 4.1, p.9)

The paper explains, “In this paper, we propose new logical principles to retain the heaps’ disjointness.” (Section 2, p.4) Its example equates `@α A ∗ @β B` with `@α A ⊛ @β B ∧ α⊥β`. It also gives permission laws as entailments: a shared heap with permission `π1 ⊕ π2` entails two weakly separated copies, and those copies entail the joined permission (Lemma 4.2, p.10).

Verus form: Inference: a possible adaptation would represent labels and fractional permissions in ghost state, describe regions with specification predicates, and prove split/join lemmas. This paper does not implement or validate such a Verus encoding.

limits: Section 3 defines an abstract permission algebra (p.7); the implementation instantiates it with positive rational fractions at most 1, addition defined only up to 1, and multiplication (Section 6, p.15). Inference: an adaptation to Verus would need to justify how its ghost regions correspond to the program's memory accesses.

## technique 2: distribution and `ws-norm` recovery

what it is: distribute strong and weak separating conjunctions while retaining pure disjointness, then normalize weak formulas back to strong formulas when the saved constraints justify it. This supports entering concurrent code with split resources and exiting with a precise disjoint post-state.

when to use: use it at concurrency boundaries, after joining thread summaries, and after unfolding inductive predicates whose nested permissions need normalization.

how to do it:

1. before splitting threads, apply the `⊛/∗` distribution rule to replace strong composition with weak composition plus disjointness constraints (Section 4, p.9)
2. preserve constraints such as `(α◦β)⊥(γ◦ξ)` in the pure part (Lemma 4.1, p.9)
3. after threads join, apply `∗/⊛` when the constraints establish disjointness (Section 4, p.9)
4. apply permission split/join to matching regions (Lemma 4.2, p.10)
5. run `ws-norm(A)` exhaustively: combine matching weak regions with `⊛ Join`, and restore strong conjunction where a disjointness constraint applies (Section 4, p.10)
6. after unfolding, use `inward` on the entailment's left side; use `inward*` on its right side, where it applies only the strong-separation permission equivalence `∗π` for soundness (Section 4, p.10)

The paper defines two `ws-norm` cases, including `ws-norm((Aπ1 ∗ B) ⊛ (Aπ2 ∗ C)) = Aπ1⊕π2 ∗ (B ⊛ C)` and restoration of `(@α A ⊛ @β B) ∧ α⊥β` to `@α A ∗ @β B` (Section 4, p.10). In the illustrative `foo` call, CoSl finds a frame, applies the weak frame rule, normalizes the post-state, and recovers the original strong heap before a final entailment (Section 2, pp.4–5).

Verus form: Inference: a possible encoding would represent weak and strong composition with ghost predicates and prove normalization lemmas from explicit disjointness hypotheses. The paper's `ws-norm` procedure would require a separate implementation or proof in that encoding.

evidence and assumptions: Lemmas 4.1 and 4.2 have proofs in Appendices B and C (pp.23–26). Their semantics uses stacks, heaps with permissions, and label valuations (Section 3, p.8; Appendix A, p.23). Inference: these proofs alone do not establish correspondence with a concrete Rust memory model.

## technique 3: FrInfer residual-frame entailment search

what it is: given antecedent heap formula A and goal G, search for a collection of frame assertions F such that `A |= G ⊛ F`. F contains the residual heap plus instantiations for existential and logical variables. FrInfer is a proof-search forest over matching and distribution rules.

when to use: use it before a function call, load, or thread split to infer resources not consumed by the callee or goal. It automates frame discovery for CoSl's compositional reasoning.

how to do it:

1. start with the entailment `A |= G` as an ongoing root (Section 5.1, p.13)
2. if `G` is `emp ∧ true`, finish with frame `{A}` (Section 5.1, p.11)
3. try Hypothesis for each atomic pure goal; then try rule `π` when both sides have the required common permission; then try matching rules M, M∗, M 7→, and M∗ 7→ (Section 5.1, pp.11–13)
4. if G is a weak conjunction, try `Split ⊛`, then `⊛/∗`; if G is strong, try `Join ⊛`, then `∗/⊛` (Section 5.1, p.13)
5. try LU, then RU if LU fails, then other rules; each applied rule creates leaves for its premises, but RU first clones a new tree (Section 5.1, p.13)
6. stop when a tree has only done leaves and collect its disjunctive frames; return unknown if no tree remains (Section 5.1, p.13)
7. use `ws-norm` on the resulting state where weak-to-strong recovery applies (Sections 4 and 6, pp.10,15)

Theorem 5.1 states `F ∈ Eval(A, G) implies A |= G ⊛ F` for all A and G (p.11). In the paper's first example, FrInfer returns the residual `y` cell and constraints `α⊥β`, `γ = α`, and `w = y`; in the fractional variant it keeps the unused quarter permission at `x` and the unchanged half permission at `y` (Section 2, pp.4–5).

Verus form: Inference: an external tool could attempt frame search from a caller's state and a callee's contract, then emit proof obligations for the unused resources and the resulting postcondition. The paper supplies no such Verus integration.

limits: Unknown is a valid FrInfer outcome; it does not prove entailment false. Inference: proof-forest branching and inductive unfolding may limit scalability; the paper supplies no large-scale measurements. The rule set in Figure 2 simplifies points-to predicates with two fields; the paper says extensions are straightforward but does not evaluate every extension (Section 5, p.12).

## technique 4: CoSl predicate-transformer compositional verification

what it is: compute post-states bottom-up with `Post(p,C,T)` for the supported commands. FrInfer supplies frames for heap loads, instruction summaries, and parallel calls; other transformer rules handle allocation, assignment, sequencing, and conditionals directly. Verify each function against its user-provided pre/post summary.

when to use: use this when code is decomposed into procedures and fork/join threads with summaries. It supports procedure-modular and thread-modular checking instead of reanalyzing every call path globally.

how to do it:

1. supply a specification table T of valid Hoare triples for primitive instructions and function declarations (Section 6, p.14)
2. calculate `Post` for each command; `skip` returns the pre-state, assignment introduces an existential old value, and conditionals analyze both guarded branches (Figure 4, p.15)
3. for loads, calls, and instruction summaries, invoke FrInfer to find an unused frame and apply `ws-norm` (Figure 4, p.15)
4. for sequential composition, feed each post-state into the next command; for parallel calls, combine their summaries with weak conjunction and infer a frame (Figure 4, p.15)
5. check every resulting post-state against the declared function postcondition by entailment (Section 6, pp.14–15)
6. fail verification if a post-state does not entail its postcondition; check frame-rule side conditions and return an error if these checks fail or frame inference returns unknown (Section 6, pp.15–16)

CoSl's theorem gives conditional soundness over T. The implementation is OCaml with Z3 for arithmetic, and it adds equivalence classes of variables to help match aliases such as `x = y = z` when applying points-to rules (Section 7, p.16). The evaluation has 10 concurrent programs, 29–128 lines of code, 8–24 lines of specification, 2–6 procedures, and 8–32 frame queries per program (Table 1, p.17). On a four-core, 8 GB machine, “CoSl verified every program successfully within one minute.” (Section 7, p.17) This is 10/10 programs, not a per-query success fraction.

Verus form: Inference: an adaptation could express the state transitions as function contracts and ghost proofs. It would need justified primitive summaries and a model for parallel composition. Whether Verus can discharge the resulting obligations is not evaluated here.

## trusted boundary, gaps, and product threat

The paper proves distribution lemmas and states soundness theorems for FrInfer and CoSl. The appendices prove the distribution and normalization principles; they do not contain full proofs of Theorems 5.1 and 6.1. Section 7 reports successful verification of 10 selected programs and a runtime upper bound. Inference: trusting a deployed verifier also requires confidence in the assumed summaries, predicate definitions, permission model, and OCaml/Z3 implementation. A VL adaptation would additionally need to connect its ghost regions to the Rust program's actual memory behavior.

The paper's method targets fine-grained heap sharing and does not supply a Rust memory model, scheduler proof, or unsafe-code soundness argument. It reports no denominator beyond 10 programs for the headline success claim, and “within one minute” is an upper bound rather than a per-program time table. Inference: agent-written verified Rust remains threatened by incorrect contracts, missing interference specifications, and abstraction gaps even when every generated Verus proof checks. Inference: CoSl's residual-frame search and permission composition provide candidate techniques for VL, but their applicability to Verus requires separate testing.

Inference: the evaluation's 10/10 success statement is a program-level count, while the table's 8–32 query counts are workload sizes; no arithmetic conversion from queries to success rate is justified.

## techniques for the catalog

- permission-region separation — model shared heaps with labels, fractional permissions, weak sharing, and strong disjointness
- disjointness-preserving distribution — split and rejoin weak/strong conjunctions while retaining pure heap-separation constraints
- residual-frame inference — search entailment proof forests to infer unused heap resources and variable instantiations
- predicate-transformer concurrency — compute procedure/thread post-states compositionally and check each against its contract
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For fork, CoSl uses FrInfer to find the frames between the current program state and the pre-condition of proc."): checked the complete paper, including appendices, against the study’s quotations, numerical results, references, and technique steps; corrected page references, permission-model scope, search order, unfolding restrictions, the residual permission at y, and soundness-proof claims; removed unsupported Verus assertions and marked proposed adaptations as inferences; did not rerun CoSl, independently validate the proofs, or test a Verus implementation.
