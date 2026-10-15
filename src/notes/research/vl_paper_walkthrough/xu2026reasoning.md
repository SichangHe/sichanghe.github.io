# Reasoning without Gold Standards: A Proxy-Judge Theory of Autoformalization
(authored by agents unless marked 🧑)
Tag: `xu2026reasoning`, [paper](http://arxiv.org/abs/2606.09449v1)

## scope and result

The paper proposes a reference-free evaluator for autoformalization. Instead of comparing a generated artifact with one gold formalization, it checks a vector of local properties and uses the failed coordinate to choose a repair. “We introduce a reference-free proxy-judge framework for AF that replaces gold-standard matching with a vector of per-axis property checks.” (Abstract, p. 1)

The framework targets formalization of mathematics and natural-language inference. It separates global kernel checks, module-local checks, and cross-domain alignment to the informal source. Its theory assumes bounded judge noise and a contraction condition, then derives geometric convergence to a noise-dependent plateau. Inference: for VeruLaw, this provides a design for judging generated Rust/Verus contracts when no manually authored specification exists, but the theorem applies only if the property axes are sufficient and the drift assumption is credible.

## technique: represent a candidate as modules and audit axes

### what it is and when to use it

A generated formal object `P̂` is a set of modules `M1 … MK`, each containing declarations and explicit statements. Judges inspect eight axes grouped into three scopes. Global axes check full elaboration and document structure. Module axes check syntax, types, binding integrity, and grounding. Cross-domain axes check that explicit statements align with the informal source and cover its claims. The paper defines module checks including “ξbnd(M): the inferential links inside M wire its local premises and conclusions through structurally complete steps and preserve variable bindings.” (Section 3.1, p. 3)

Use this decomposition when a single scalar score cannot say what to repair. Each axis has audit units, such as modules, statements, or source claims. A module fails an axis if any internal unit fails, while whole-object axes have one unit (Appendix A.1, pp. 10–11).

### how to apply it

1. split the candidate into coherent modules with explicit declarations and references to context Γ (Section 3, p. 3)
2. define global checks for prover completion and document validity (Section 3.1, p. 3)
3. define module checks for syntax, type consistency, binding integrity, and grounding (Section 3.1, p. 3)
4. define source-alignment and coverage checks against the natural-language input and facts Γ (Section 3.1, p. 4)
5. aggregate binary audit-unit results into an axis score ξk(P̂), using the axis’s audit-unit count Nk(P̂) (Appendix A.1, pp. 10–11)

Inference: for VL, useful axes include Rust parsing, Verus verification, ownership and binding integrity, invariant framing, contract-to-requirement alignment, and coverage of stated safety requirements. The axis list must be adapted to Verus; the paper does not define Rust checks.

## technique: reflective refinement localizes repairs

### what it is and when to use it

The controller repeats four steps: propose a candidate, measure the verdict vector, localize the strongest violation to a target subcomponent, and repair only that target. “The loop is constraint-directed, with update axes drawn from the finite constraint families.” (Section 3.2, p. 4)

### how to apply it

1. propose `P̂i = Πθi(nl, Γ)` from the informal statement and context (Section 3.2, p. 4)
2. compute ξ(P̂i), the per-axis verdict vector (Section 3.2, p. 4)
3. select target `ti` responsible for the strongest violation (Section 3.2, p. 4)
4. update parameters and repropose `P̂i+1 = Refine(P̂i, ξ(P̂i))` (Section 3.2, p. 5)
5. return the latest prover-accepted iterate and roll back if a repair changes a kernel-verifiable axis from accepted to rejected (Section 3.1, p. 4)

Inference: a Verus agent should repair a failed invariant or contract clause while preserving already verified clauses, then rerun the verifier. Rollback is necessary because an LLM judge can recommend a semantic change that breaks compilation or proof validity.

### evidence and limits

The method’s convergence claim is conditional. Assumption 2 states that expected gap satisfies `E[gᵢ₊₁ | P̂ᵢ] ≤ (1−λ)gᵢ + bη`, where η is the per-audit-unit misclassification rate (Section 4.2, p. 5). Theorem 1 gives `lim sup E[gᵢ] ≤ bη/λ`; reducing judge noise lowers the plateau, but the paper does not prove that a real LLM refinement operator obeys the contraction assumption.

## technique: majority voting reduces judge noise

The paper models repeated independent judge calls on one audit unit. With T calls and per-call error η, majority vote has `ηeff ≤ exp(−2T(1/2−η)^2)` (Lemma 1, p. 5). Substituting ηeff into the plateau gives an asymptotic gap proportional to ηeff/λ. Apply it by running the same local judge several times, taking the majority verdict, and using that verdict for localization and repair.

Inference: VL can majority-vote semantic checks of a `requires` or `ensures` clause, but calls are not truly independent when the same model, prompt, and context are reused. The bound is therefore a planning model, not evidence of a guaranteed error rate.

## technique: prover-grounded return policy

The framework distinguishes LLM-judged semantic axes from kernel-decided axes. A repair may fix a semantic issue while breaking syntax, type, or proof validity. The return policy always keeps the latest iterate accepted by the prover and rolls back when a kernel axis regresses (Section 3.1, p. 4). In a Verus implementation, “prover accepted” means the exact generated Rust and Verus proof pass the configured verifier; semantic review cannot override that result.

## technique: proxy score and audit sufficiency

For candidate quality, the paper defines a latent property vector q and observable judge vector ξ. With nonnegative weights summing to one, intrinsic quality is `μ⋆(P̂)=⟨w,q(P̂)⟩` and proxy quality is `μ̂(P̂)=⟨w,ξ(P̂)⟩` (Section 4.1, p. 5). Assumption 1 says q=1 implies every prover-decidable check passes and every cross-domain axis aligns with the source. This is audit sufficiency, not full semantic correctness.

The paper is explicit about that boundary: “Our notion of correctness is audit-sufficient rather than fully semantic.” (Limitations, p. 9) Inference: a VL proxy score should be described as evidence over named checks. It should never be reported as proof that the natural-language requirement is complete or that the implementation matches an unstated requirement.

Lemma 2 bounds one-step proxy error by judge noise plus a finite-sample term, `η + sqrt(log(2m/δ)/(2Nmin))`, with Nmin the smallest active audit-unit count (Appendix A.1, p. 10). Whole-object axes have one unit, so their concentration bound can be vacuous; repeated judging is the relevant mitigation. This denominator and scope matter when interpreting scores.

## technique: per-axis feedback beats a scalar verdict when there is headroom

The paper compares its vector feedback with a single end-to-end scalar score while holding the loop fixed. On ProofNet, per-axis feedback exceeds scalar by 8.2–8.4 percentage points; on e-SNLI, by 17–18 points; on miniF2F the 1.4–1.6 point difference is within seed variance, and ProntoQA is saturated at 100% (Table 5, p. 8). The paper concludes that the split tracks baseline headroom rather than benchmark family.

Apply it by keeping a separate verdict and repair target for each failure mode. Inference: a Verus system should distinguish parse errors, failed proof obligations, ownership violations, contract weakening, and missing requirement coverage. Combining them into one score loses the location needed to choose a repair.

## empirical evidence and denominators

The evaluation uses seven formalization backbones on four datasets: miniF2F and ProofNet in Lean 4, and e-SNLI and ProntoQA in Isabelle/HOL (Section 5.1, p. 6). Each setting uses three random seeds; Table 2 reports mean ± standard deviation. Refinement improves most settings. For frontier backbones, average gains reach 19% on ProofNet and 16% on e-SNLI; the paper compares matched prompts, models, judges, and splits, so these are within-study gains rather than cross-paper absolute rates (Section 5.2, pp. 6–7).

On ProofNet, judge capacity changes final pass rate from 65.9±5.3% for Llama-3.3-70B to 69.2±1.4% for GPT-5.4-mini and 66.5±2.0% for GPT-5.4 (Table 3, p. 7). The dataset effect is much larger than this judge spread. Local versus global judge context is statistically tied on ProofNet, 66.1±3.1% versus 65.9±0.6%, and both reach 100% on ProntoQA (Table 4, p. 8).

The proxy trajectory follows the external oracle qualitatively, but the paper reports a scale mismatch: on Qwen-3.5-9B ProntoQA, proxy score rises while the oracle remains flat because the proxy accepts surface-level repairs that do not change the dataset label (Section 5.3, p. 8). This is evidence against treating proxy improvement as semantic improvement without calibration.

## trusted scope, limitations, and threat to VL

The theorem trusts Assumption 1’s audit sufficiency and Assumption 2’s bounded contractive drift. The judge-error model assumes bounded per-unit noise and the majority bound assumes independent calls. The empirical oracle is itself benchmark-specific: a GPT-5.4 judge compares Lean candidates with gold references, while an Isabelle ATP checks e-SNLI and ProntoQA labels (Section 5.3, p. 7). The paper’s four-dataset slice does not establish dataset-independent generality; the limitations explicitly say generalization beyond these datasets remains future work (Limitations, p. 9).

Inference: the direct threat to VeruLaw is false confidence from a high proxy score. An agent-written verified Rust contract can pass every named axis while omitting an unmodeled failure mode. The mitigation is to make the audit catalog explicit, keep prover acceptance separate from semantic judgment, calibrate judges on human-reviewed examples, and report denominators and judge noise.

Inference: VL should reuse per-axis checks, localized repair, rollback on prover regression, and calibration against an external oracle where available. It should not claim the paper’s convergence theorem without measuring whether Verus repair actually contracts the unresolved obligation set.

## techniques for the catalog

- audit-axis vectors: score global, module, and source-alignment properties separately
- reflective localization: route each failed axis to a matching repair target and preserve passing axes
- prover-grounded rollback: keep the latest kernel-accepted candidate when semantic repairs regress proof checks
- majority judge reduction: repeat local checks to reduce bounded independent judge noise
- audit-sufficient proxy: treat a weighted property score as evidence over named checks, not full semantic correctness
- per-axis feedback: use decomposed verdicts when scalar feedback cannot identify the repair
- drift convergence model: bound expected unresolved gap by contraction plus judge-noise residual

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
