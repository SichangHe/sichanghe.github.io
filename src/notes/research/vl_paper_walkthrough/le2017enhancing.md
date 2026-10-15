# Enhancing Inductive Entailment Proofs in Separation Logic with Lemma Synthesis
(authored by agents unless marked 🧑)
Tag: `le2017enhancing`, [paper](http://arxiv.org/abs/1710.06515v2)

## what the paper proves and measures

Quang Loc Le extends a separation-logic entailment procedure with lemmas that are generated, proved, and reused during proof search. The target fragment has user-defined inductive predicates and Presburger arithmetic; it is generally undecidable, so the procedure trades completeness for expressiveness (Section 1, pp. 2–3). Its semantic target is an entailment with a residual frame: the procedure must establish that the antecedent implies the consequent separated from the inferred leftover heap. The paper’s abstract states, “We first propose a mechanism where lemmas are automatically proven and systematically applied.” (Abstract, p. 1) It contributes both top-down synthesis for a stuck proof and bottom-up exploration of relations among predicates.

The implementation is S, an extension of SLEEK, and S2, its modular-verification integration (Section 7, p. 13). The trusted result is the entailment checker’s proof rules and the Z3 checks it invokes; generated lemmas are admitted only after the same checker proves them. Inference: an analogous Verus design should treat generated helper proofs as search artifacts and rely on Verus’s successful verification of the final Rust/specification pair as the acceptance boundary. The paper does not prove that its heuristics are complete, nor that a verified specification expresses a desired product requirement.

## technique 1: apply reusable and universal-guard lemmas

what it is: a lemma has a rooted heap predicate on each side and may contain an existentially quantified remainder, a universal guard, or unknown predicates. The lemma store L contains user lemmas and lemmas synthesized during the current proof. The [LAPP] rule matches a root predicate in the antecedent, proves the lemma guard and cut, appends the lemma’s right-hand side to the residual antecedent, and continues the entailment (Section 4, pp. 7–8).

when to use: use ordinary application when a previously proved relation matches the current root heap; use a universal-guard lemma when the useful side condition ranges over variables that are existential in the current entailment. The paper identifies this as a way to avoid requiring every instantiation to be supplied by a user.

how to do it:
1. rename free variables in the stored lemma to avoid capture
2. match its rooted points-to or user-defined predicate against a rooted antecedent predicate; matching yields substitutions for fields and the root
3. prove the guard and identify the antecedent cut
4. combine the residue with the lemma’s right side and continue checking the consequent (the three [LAPP] lines, Section 4, p. 7)
5. for a universal guard, symbolically choose relevant substitutions by shape-predicate matching, prove the left entailment, then prove the finitely instantiated guard (the [ENT-LAPP-∀] rule, Section 4, pp. 7–8)

The soundness argument for universal instantiation is explicit: “If ∆ante ⊢L′ ∆conseq is valid then so is ∆ante ⊢L ∆conseq.” (Theorem 1, p. 8) Inference: in Verus, the corresponding reusable artifact is a proved `lemma` or `proof fn` whose `requires` and `ensures` are instantiated at a call site; Verus does not carry over separation-logic heap matching or universal-guard instantiation as a built-in rule, so an agent must encode the relation in specifications and invoke the proof function. Any executable function remains ordinary Rust; proof functions are erased, as described by the Verus reference material.

what works and limits: the rule is sound relative to the paper’s entailment semantics, but the fragment is undecidable and the procedure is not complete (Section 1, pp. 2–3; Section 8, p. 15). The choice of “relevant” instantiations is a search heuristic. It assumes root parameters can be syntactically identified and that the matching/unfolding rules can expose the required heap shape (Section 3, pp. 6–7). The paper’s worked list examples show that the rule can reuse synthesized relations rather than repeatedly unfolding definitions.

## technique 2: dynamically synthesize auxiliary lemmas with cyclic proving

what it is: `lemsyn` turns a difficult entailment into a conjecture containing an unknown pure predicate P (for a universal guard) and/or an unknown spatial predicate U (for a frame). It then proves the conjecture by cyclic proof and solves the resulting relational assumptions with second-order bi-abduction (SOBD) (Section 5.1, pp. 9–11). The paper summarizes the purpose as: “For (i) we automatically discover and prove auxiliary lemmas during an inductive proof.” (Abstract, p. 1)

when to use: invoke it when a consequent shares a root with an inductive antecedent but ordinary unfolding cannot establish the relation, especially when frame inference and induction are needed together. In the motivating `lls1/lls2` example, a frame is unknown and must be learned while proving the obligation (Section 2.1, pp. 4–6).

how to do it:
1. construct a conjecture from `Ra * κa ∧ πa ⊢ Rc * Δr * Δc`; add P when existential LHS variables require a universal guard, and add U when pointer variables differ between LHS and RHS (Section 5.1, p. 9)
2. annotate unknown-predicate parameters with `#`: shared variables and RHS roots are protected from abduction, while remaining pointers may be abduced (Section 5.1, p. 9)
3. prove the conjecture with `lemprove`: unfold a selected user-defined predicate, check every disjunct, and use the conjecture itself as a cyclic induction hypothesis on descendant predicate instances (Section 5.1, pp. 9–10)
4. require a progressing point on every infinite proof path; the paper’s soundness lemma says that if every descendant instance participates in cyclic application, the resulting implications hold (Section 5.1, p. 10)
5. collect relational assumptions from each branch and solve their conjunction with SOBD/fixed-point computation, producing definitions for P and U (Sections 5.1–5.2, pp. 10–12)
6. retain the synthesized lemma in L for later obligations; synthesize a reverse lemma as well, choosing the direction with more case splits to obtain more constraints (Section 5.1, p. 11)

The motivating example gives concrete assumptions `σ1`, `σ2`, and `σ4` and synthesizes a recursive frame predicate U from them (Section 5.2, pp. 11–12). Inference: in Verus, the agent can create a helper `proof fn` with a `requires` clause matching the pre-state and an `ensures` clause expressing the post-state plus frame fact, then prove it by `reveal`/unfolding, `assert`, and recursive calls or induction lemmas. Verus has no paper-defined `#` annotation, SOBD solver, or cyclic entailment rule, so those search steps must be implemented outside Verus and the generated helper must compile and verify.

what works and limits: the paper proves soundness of [R*] and [LSYN] (Lemma 2, p. 12), and gives a conditional soundness result for abduction: if definitions satisfy all relational assumptions, the resulting entailment is valid (Lemma 3, p. 12). This is conditional because the unknown-predicate constraint solver must find satisfying definitions. The search can nest lemma synthesis, and the technique inherits undecidability and heuristic dependence. It also assumes inductive definitions expose a root and that cyclic traces can be recognized.

## technique 3: frame inference by spatial and pure abduction

what it is: the [AU], [AF], [AU-P], and [AF-P] rules infer unknown spatial or pure predicates while matching the known part of a heap. Unknown predicates carry protected (`#`) parameters so that subtraction and unfolding happen before abduction (Section 5, pp. 8–10). The result is a relational constraint such as a known heap plus an unknown downstream heap implying a larger unknown frame.

when to use: use spatial abduction when the consequent contains a heap region not present syntactically in the antecedent, and pure abduction when the heap is empty but a pure condition is missing. This is the paper’s direct solution for frame inference in inductive entailments, where conventional subtraction cannot see a deeply embedded terminal node (Sections 1–2, pp. 3–6).

how to do it:
1. mark all root pointers in an unknown heap predicate with `#` to prevent conflict with unfolding/subtraction
2. apply [AU] or [AF] to introduce a points-to predicate and a downstream unknown predicate, or [AU-P]/[AF-P] for pure constraints (Fig. 2, p. 9)
3. continue entailment checking on the smaller residual goal, using [M], [LU]/[RU], and [XPURE] as needed (Appendix A, pp. 18–20)
4. record each implication as a relational assumption and solve all assumptions jointly for an unknown predicate definition
5. return the solved predicate as the residual frame and reuse it in later proofs

In the append example, the inferred definition is recursive: `U2(root,t′,q,y) ≡ ll(y) ∧ root=t′ ∧ q=null ∨ ∃q1·root↦c1(q1) * U2(q1,t′,q,y)` (Section 2.1, pp. 4–5; Appendix C.2, pp. 23–24). The paper reports that its system “successfully proves validity and infers frame for the entailment.” (Appendix C.2, p. 24) Inference: a Verus encoding would express the frame as a ghost sequence/set or a recursive predicate over owned heap structure, with `ensures` preserving the untouched region. Verus ownership and borrows replace separation-logic `*`; the unknown predicate must be synthesized as a concrete `spec fn`/ghost relation before a Verus proof can use it.

The assumptions are substantial: the procedure’s abduction is sound only when the generated relational assumptions are satisfiable (Lemma 3, p. 12), and the fragment remains undecidable. The paper does not establish completeness or a bound on the size of inferred predicates.

## technique 4: theorem exploration for predicate relations

what it is: whenever a user-defined predicate appears, the system classifies it, generates heap-only conjectures, enriches them with unknown predicates, proves them with `lemprove`, and also tests the reverse direction (Section 6, pp. 13–14). The paper demonstrates equivalence, reverse, split/join, and separating lemmas. Equivalence lemmas match newly inferred predicates to a library predicate; reverse lemmas invert reachable links; join and split normalize segment predicates; separating lemmas expose disjoint parameter regions (Appendix B, pp. 20–22).

how to do it:
1. classify each predicate syntactically (for example, a segment predicate has a root and a leaf segment parameter)
2. generate the class-specific heap conjecture; for equivalence, use a shared root and existential leaf parameters; for join, concatenate two segments; for reverse, swap root/segment links; for separation, split parallel or consequence-separating parameters (Section 6, pp. 13–14; Appendix B, pp. 20–22)
3. add unknown predicates over leaf or internal variables to infer pure constraints or residual heaps
4. prove one direction and attempt its reverse, then store both verified lemmas
5. use the relations to normalize specifications and avoid future induction obligations

For the size-indexed list example, the system infers `P(n,a,b) ≡ n=a+b ∧ n≥b ∧ b≥0` from assumptions R2 and R3, then proves both split and join lemmas (Appendix C.1, pp. 22–23). Inference: Verus can encode these as proved lemmas relating recursive sequence predicates, with arithmetic `ensures` and ghost sequences; the paper’s automatic class classifier and SOBD synthesis would need an external generator. The technique assumes predicate syntax reveals meaningful roots, leaves, and reachable links; arbitrary predicates outside the classes receive no corresponding exploration rule.

## evidence, contradictions, and implications for VL

Table 1 evaluates 27 entailments: 1–19 are shape-only and 20–27 shape-numerical. The 18 cases both tools verify take 8.29 seconds in CyclicSL and 3.14 seconds in S (Table 1 and Section 7, p. 14). The table’s timeout/not-yet-supported marker is 30 seconds (Section 7, p. 14); the denominator for the 18-case comparison is therefore the 18 jointly successful cases, not all 27. The paper reports that S2’s Glib experiment rises from 168 of 208 procedures/loops (81%) without synthesis to 182 of 208 (88%) with synthesis, with 0.38 seconds overhead (Fig. 4 and Section 7, pp. 14–15). The denominator 208 is the sum of the four rows’ procedure-plus-loop counts (52, 51, 40, and 65); the printed percentages are rounded.

The result supports useful automation on these benchmarks, not universal completeness. Inference: VL should reuse the paper’s obligation-aligned helper synthesis, reverse-lemma generation, and frame discovery as candidate generation, but should not redo a generic separation-logic engine inside Verus. The product threat is medium: a wrong inferred specification or frame can make a real bug appear proved, while Verus will only check the supplied contract. Independent specification review and checks against executable behavior remain necessary. What remains trusted includes the Verus verifier/solver pipeline, Rust compiler and erasure, external-library contracts, and the correctness of the product specification; the paper itself does not measure those boundaries.

## techniques for the catalog

- universal-guard lemma application — match a rooted antecedent, instantiate only relevant universal variables, prove the guard, and reuse the verified lemma
- cyclic auxiliary-lemma synthesis — conjecture unknown guard/frame predicates, prove by progressing cyclic traces, and solve branch assumptions
- abduction-based frame inference — infer recursive spatial or pure predicates as relational constraints and return them as residual frames
- theorem exploration — classify predicates and synthesize verified equivalence, reverse, split/join, and separating lemmas
- incremental modular verification — infer shape predicates first, extend them with size constraints, then discharge method obligations compositionally
Checked 2026-10-15 against paper le2017enhancing: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
