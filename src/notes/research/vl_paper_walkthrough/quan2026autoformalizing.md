# Autoformalizing Argumentative Material Inferences
(authored by agents unless marked 🧑)
Tag: `quan2026autoformalizing`, [paper](http://arxiv.org/abs/2609.16991v1)


## scope and result

The paper studies how to make an implicit natural-language argument formally checkable when the premise does not state its warrant. Its central claim is: “We address this problem by formulating autoformalization for argumentative material inference as guard completion” (Abstract, PDF p.1). A guard is an explicit assumption, definition, or exception condition that makes a premise-to-claim relation provable. GUARD combines an LLM with Isabelle/HOL and accepts a result only after theorem-prover verification and contrastive premise and claim tests. The paper reports verified-faithful rates (VFR) of 48.58–76.52% on 247 Debatepedia pairs and 53.50–81.00% on 200 ARCT pairs, depending on backbone (Table 1, PDF p.5). These are percentages of the stated fixed sets, not success rates on arbitrary arguments.

Inference: For VL, the useful abstraction is to generate explicit proof context, then prove and attack the proof A Verus implementation would replace Isabelle formulas and Sledgehammer with Rust/Verus specifications and proof functions, but the separation between source claim, generated guards, proof, and adversarial checks transfers conceptually.

## technique 1: strengthened context and guard completion

What it is. Given a premise T and claim C, GUARD constructs a strengthened context Γ↑ = A ∪ Δ ∪ X: assumptions A (enthymematic and normalcy conditions), definitions/term normalizations Δ, and exception conditions X. It then selects G ⊆ Γ↑ sufficient for G ∪ {T} |= C. The paper states: “Starting from the input pair (T, C), we construct an explicit strengthened context Γ↑ = A ∪ ∆ ∪ X” (Stage I, PDF p.3). It also says: “A completion is accepted only when its proof both passes the theorem prover and survives contrastive tests of premise dependence and claim selectivity” (Abstract, PDF p.1).

When to use it. Use guard completion when text supplies a support relation but omits the background rule, definition, or exception needed for a formal proof. Do not treat a fluent explanation as a proof context until each added sentence is explicit and traceable.

How to apply it, following the paper. (1) Start with the premise-claim pair (T,C) (Problem Definition, p.3). (2) Elicit assumptions, definitions, and exceptions into Γ↑ using dedicated harvesters (Stage I, p.3). (3) Translate all candidate sentences jointly so predicates and arities are shared (Appendix B.1, pp.11–12). (4) Select a step-specific guard set G with an LLM critic (Stage II, p.4). (5) Require every selected guard to be traceable and jointly sufficient (PO2), and require dependence on T and every guard (PO4) (Stage II, p.4). (6) Refine context, representations, or guard selection after failed obligations, for at most 10 soft iterations (Stage II, p.4).

Running example. The paper’s premise is “Moderate video-game play may have positive effects on developing minds.” Its context includes “Developing minds are the minds of young people,” a definition of moderate play, a defeasible rule connecting play to cognitive engagement, and an abnormality for minimal or excessive use (Figure 1, PDF p.3). The candidate claim is that video games can have cognitive benefits for young people.

Verus form. Inference: represent the premise and guards as `spec fn` predicates over an explicit argument type; state the target as an `ensures` clause on a `proof fn`; use `requires` for premise and guard facts. Inference: encode exceptions as predicates and prove the guarded implication under `!abnormal`. Verus syntax and proof obligations must follow the project’s supported constructs; Isabelle axioms do not carry over as trusted facts without an explicit Verus assumption.

Evidence and limits. The evaluation uses exactly 247 Debatepedia pairs (19 topics, 13 each) and 200 randomly sampled ARCT pairs (Appendix A.1, PDF p.9). GUARD’s GPT-5.1 VFR is 76.52% on Debatepedia and 81.00% on ARCT, with leak rates 2.07% and 1.82% respectively (Table 1, p.5). Inference: these results show the method can complete many benchmark arguments; they do not show that generated guards are true in the world, because the guards are LLM-produced assumptions.

## technique 2: Neo-Davidsonian translation with admission checks

What it is. Each sentence is parsed, mapped to first-order logic with event variables, then unified over one predicate signature: “The autoformaliser is realised as a three-step composition” (Appendix B.1, PDF p.11). The steps are syntactic parsing π, formalisation F, and joint unification UΣ. Events get separate variables and thematic roles such as Agent and Patient.

How to apply it. (1) Parse subject, verbs, objects, complements, and modifiers (B.1). (2) Map entities to predicates and verbs to event predicates with role relations (B.1). (3) Unify all premise, claim, and guard forms so a concept has one symbol and arity throughout (B.1). (4) Check syntax, variable binding, predicate consistency, semantic coverage, role fidelity, and inference direction (B.3, p.12). (5) Reject or refine malformed theories before proof search. The paper requires the logical form to preserve “modifiers and polarity, together with the logical connectives” (B.3, p.12).

Evidence. Informalisation faithfulness, measured by embedding cosine similarity, ranges from 0.798 (DeepSeek-V3.2 on ARCT) to 0.917 (GPT-5.1 on ARCT), averaged over premise, claim, and guard sentences (Table B.1, p.12). Among 300 randomly sampled forms, syntax errors are 38.8% (Debatepedia) and 39.9% (ARCT), implication errors 19.4% and 16.5%, quantifier errors 28.8% and 29.5%, and variable errors 12.9% and 14.1% (Figure B.1, p.12). Inference: a Verus pipeline should make translation validation a separate gate because a successful proof of a mistranslated predicate proves the wrong property.

Verus form. Inference: use Rust datatypes and `spec fn` relations for entities/events, and explicit quantified specifications where supported. Inference: preserve role arguments in the same order across contracts and lemmas. Verus does not provide Isabelle’s event-logic parser; parsing and semantic translation remain trusted generator code unless separately verified.

## technique 3: guarded defeasible rules

What it is. Exception management converts non-monotonic rules into monotonic formulas using an abnormality predicate (Appendix B.2, PDF p.12). The paper gives the guarded rule formula in that section. For a closed exception list, Ab is equivalent to the disjunction of listed exceptions; for an open list, only exception-to-abnormality implications are asserted, avoiding a false exhaustiveness claim.

How to apply it. (1) State rule body φd and head ψd. (2) Define abnormality Ab from each exception χd,i. (3) Add `¬Ab` to the antecedent. (4) Choose closed versus open exception semantics according to whether the elicited list is exhaustive (B.2). (5) Re-check the resulting theory and refine exceptions when proof feedback identifies a missing condition.

Verus form. Inference: define `spec fn abnormal(k) -> bool`; state the rule as a lemma requiring `!abnormal(k)` and the body, and ensuring the head. Inference: for open exceptions, prove only each listed exception implies abnormality; do not assert the reverse direction. This avoids silently trusting an incomplete exception inventory.

Evidence and limits. Removing exceptions from GPT-5.1 lowers VFR by 2.8 points on Debatepedia (76.52% to 73.68%) and 2.5 points on ARCT (81.00% to 78.50%) (Table 3, PDF p.7). Inference: exceptions had a smaller aggregate effect than assumptions because few accepted proofs needed rebuttals, but omission can still create unsoundly broad rules.

## technique 4: soft obligations and hard Isabelle refinement

What it is. GUARD checks four soft obligations: representation correctness (PO1), support adequacy (PO2), strict support (PO3), and dependence on premise and every guard (PO4) (Stage II, PDF p.4). It then builds an Isabelle theory with guard axioms, premise as an assumption, and claim as the goal. Before proving, it rejects syntax/type errors and contradictory axiom sets by testing whether the guards plus premise prove False (Appendix C.1, PDF p.13).

How to apply it. (1) Run PO1–PO4 and repair the diagnosed item. (2) Construct the Isabelle theory and perform syntax/type admission. (3) Test consistency by attempting `G ∪ {T*} ⊢ False` (C.1). (4) Invoke Sledgehammer directly; if needed, create an Isar proof sketch `T* =⇒ f1 =⇒ … =⇒ fk = C*` and discharge each placeholder with Sledgehammer (C.2, p.13). (5) On failure, return the failing step, goal state, diagnostics, and applied axioms to the hard-refinement LLM (C.3, p.14). (6) Correct representations, add context, or change guard selection, with a 10-iteration hard budget (Appendix A.2, p.10).

Evidence. Removing soft critique drops GPT-5.1 VFR by 40.5 points on Debatepedia (76.52% to 36.03%) and 39.5 on ARCT (81.00% to 41.50%), while leak rises to 24.58% and 21.70% (Table 3, p.7). Inference: feedback-driven diagnosis is a major causal component, not presentation polish.

Verus form. Inference: use `requires`/`ensures`, loop invariants, and proof lemmas; treat verifier diagnostics as refinement input. A Verus proof function must be compile-time proof code and cannot be called as runtime computation. Inference: consistency checks require proving that assumptions do not imply `false`, where the exact encoding depends on the specification domain.

## technique 5: contrastive faithfulness and abstention

What it is. A proof can ignore the premise or prove a stronger claim. GUARD therefore replaces the premise with an empty or counter-premise set (A1) and replaces the claim with a nearby unsupported claim (A2). Acceptance requires every substituted theory to be unprovable (Stage IV, PDF p.4): “A candidate passes the faithfulness check only if none of the substituted theories remains provable.”

How to apply it. (1) Build T′ containing the empty premise and a same-topic counter-premise. (2) Build C′ containing a nearby cross-subtopic claim. (3) Autoformalize probes with the same translation. (4) Re-run theorem proving with unchanged guards. (5) Reject or refine if any probe proves. (6) Label outcomes Verified-Faithful, Reject-Leaky, Abstain-Missing-Guards, or Abstain-Not-Compatible (Stage IV, p.4).

Evidence. On GPT-5.1, GUARD’s Debatepedia solver-pass rate is 78.14% and VFR 76.52%; its leak rate is 2.07%, with 2.07% A1 failures and 0.00% A2 failures (Table 1, p.5). The extended probe finds 63.5–74.3% of unproved instances are missing-guard cases rather than incompatible arguments (Results, p.7); with ten extra hard iterations GPT-5.1 reaches 93.5% Debatepedia and 95.5% ARCT solver-pass rates (p.7). Inference: these extra-budget figures measure proof search under a changed budget, not faithful success rates.

Verus form. Inference: generate alternate `requires` states and alternate postconditions, then require that the original proof does not verify under each probe. This is a test harness around proofs, not a property Verus automatically derives. The harness and probe generation remain trusted unless separately specified.

## what is proved, measured, and trusted

The paper proves individual Isabelle entailments for generated theories and measures solver-pass rate, VFR, leakage, contrastive failures, iteration counts, and translation quality. It does not prove that natural-language guards are true, that the LLM generated all relevant guards, or that benchmark pairs represent production arguments. Isabelle, Sledgehammer, the translation code, LLM outputs, embedding model, and dataset labels remain trusted components of the reported pipeline. Inference: a VL product should record every generated guard as an explicit assumption and preserve the failed contrastive probes as audit evidence.

The paper’s main comparisons are paired on fixed instances and use the same downstream verifier, but it does not establish exhaustive ranking of LLMs (Appendix A.2, PDF p.10). The reported percentage arithmetic is consistent with the stated denominators for the 247 and 200 instance sets; percentages in Table 1 are rounded and solver-pass and VFR are separate rates.

Inference: the product threat from this work is medium. Guard completion could improve agent-written Verus specifications by exposing hidden assumptions and testing premise dependence, but generated guards can encode the desired conclusion. Contrastive checks reduce this leakage, while trusted translation and assumptions remain attack surfaces. VL should not redo a generic LLM theorem-proving loop; it should adapt guard provenance, open-ended exception handling, and contrastive probes to Rust APIs and Verus contracts.

## techniques for the catalog

- guard completion — elicit assumptions, definitions, and exceptions, then select a minimal proof-relevant guard set

- Neo-Davidsonian translation — parse sentences into event-based logic and jointly unify predicates before verification

- defeasible abnormality guards — encode exceptions as abnormality predicates and require their negation for rule use

- soft and hard refinement — diagnose representation, support, strictness, and dependence failures before prover-guided repair

- contrastive faithfulness — replace premises and claims with unsupported alternatives and reject proofs that survive

- consistency admission — reject malformed or contradictory guard theories before proving the target
Checked 2026-10-15 against paper quan2026autoformalizing: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
