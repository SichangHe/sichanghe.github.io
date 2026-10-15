# A Verifier-Guided Explainable Reasoning Framework with Gold-Anchored QLoRA, Task-Aware Mixture-of-Experts, and Group-Relative RLVR
(authored by agents unless marked 🧑)
Tag: `vo2026verifier`, [paper](https://arxiv.org/abs/2609.05221)

## result and scope

This paper combines gold-anchored QLoRA, task-level routing to symbolic experts, verifier-guided self-revision, and group-relative RLVR for educational logic and physics questions. Its system separates three measurements: P1 final-answer correctness, P2 evidence or unit consistency, and P3 reasoning depth/explainability. The authors report 438 held-out examples: RLVR changes P1 from 56.62% calibrated SFT to 55.94%, P2 from 77.70% to 75.33%, and P3 from 50.68% to 72.20%. “These results indicate that RLVR primarily strengthens explicit reasoning structure, while symbolic verification complements the neural policy by improving answer reliability at the system level.” (Abstract, p. 1). The result is a measurement of one Qwen2.5-3B-Instruct system on EXACT data, not a proof that explanations are valid.

## seven-stage pipeline

“Our MoE is a task-level routing mechanism, not a Transformer-internal sparse MoE architecture [11], [12].” (Section II.A, p. 2).

The framework stages are: (1) gold-anchored canonicalization; (2) field-weighted QLoRA SFT and calibration; (3) task-aware routing; (4) symbolic verification; (5) self-revision and candidate ranking; (6) P1/P2/P3 group-relative RLVR; and (7) gold-free self-consistency with optional physics verification (Section II.A, p. 2). The data contain 2,162 examples split group-safely into 1,724 training and 438 validation examples: 808 logic and 1,354 physics. Shared logic premise blocks, duplicate physics questions, and identical model inputs remain in one partition. Retrieval is disabled.

### gold-anchored QLoRA

Each example contains question, authoritative answer, and metadata. Teacher-generated supervision may be repaired, but the authoritative answer is locked: `yT=Repair(x,a*)`, `a_aligned=a*`. The aligned target includes answer, units, premises, explanation, and a compact trace. Completion-only SFT masks prompt tokens and assigns larger weights to answer, unit, and premise fields: `L_SFT=Σ w_t m_t ℓ_t / max(1,Σ w_t m_t)`. Training uses 4-bit NF4 QLoRA on Qwen2.5-3B-Instruct, rank 32, α=64, dropout .05; three SFT epochs at 5×10^-5 and one calibration epoch at 2×10^-5.

Inference: a Verus analogue can represent canonical answers and field schemas as Rust types and prove parser and normalization invariants. It cannot prove that a teacher repair preserves an authoritative answer unless the repair function is specified and verified. Gold labels, tokenization, and neural optimization remain trusted.

### task-aware symbolic routing

A lightweight router computes `p(e|x)=softmax(W_r h(x)+b_r)` and chooses Logic or Physics by argmax. This is external routing, not a transformer sparse-MoE. Logic examples go to an FOL/Z3 verifier; physics examples go to a formula/unit-aware solver. The router must be evaluated as a classifier: wrong routing bypasses the relevant checker.

Inference: Verus can prove that a router returns one of a finite expert tags and that each tag invokes the corresponding contract. It cannot establish that embedding `h(x)` semantically identifies task type without a verified feature model.

## logic expert: FOL/Z3 entailment

Natural-language premises are converted to first-order logic. A candidate claim `c` is entailed exactly when `P |= c ⇔ UNSAT(P ∧ ¬c)`; contradiction is checked with `UNSAT(P ∧ c)`. Multiple-choice options are compared by symbolic support (Section II.C, p. 3). The procedure is: parse premises and claim; encode them in FOL; ask Z3 whether premises plus negated claim are unsatisfiable; accept entailment on UNSAT; separately test contradiction; return support information for ranking or revision.

Inference: a Verus implementation can prove finite parser and state invariants, but Z3’s soundness, FOL encoding, quantifier handling, and natural-language translation are external trusted components. A proof that a Rust wrapper calls Z3 does not prove the claim itself unless solver results are independently checked.

## physics expert: formula and unit consistency

The physics verifier extracts variables and units, retrieves a supported relation set E, solves `z_SOL=Solve(E,V,U)`, and normalizes `a_SOL=NormalizeUnit(z_SOL)`. It checks formula applicability, numerical consistency, and units while the LLM remains the reasoning model (Section II.C, p. 3). At inference, it runs only on supported rules and a confidence threshold `c_verifier≥.98`; otherwise it abstains.

The ablation gives denominators. The verifier intervenes on 43 of 274 physics validation queries (15.69%), corrects 26 SFT and 27 RLVR errors, and introduces two regressions for each policy. Relative to five-generation self-consistency, physics P1 rises 8.76 points for SFT and 9.12 for RLVR (Section III.C, pp. 5–6). Representation matters: RLVR physics P1 is 49.74% for plain numeric answers and 6.25% for scientific notation, while unit P2 remains 89.23% (Table V, p. 6).

Inference: encode dimensions, unit conversion, and supported equations as `spec fn`s, with `requires` for domain and nonzero denominators and `ensures` for normalized outputs. Exact arithmetic and floating-point normalization must be distinguished. The empirical confidence cutoff is not a formal proof of correctness.

## verifier-guided self-revision and reward

Verifier feedback identifies unsupported premises, wrong formulas, unit inconsistencies, and answer–explanation conflicts. A candidate is revised by `ỹ_k=Revise(y_k,F_verifier(y_k))`; candidates are compared using verifier-derived quality signals (Section II.D, p. 3). The final RLVR reward is `R=.50R_exact+.20R_dense+.15R_P2+.10R_P3+.05R_fmt`. P3 is `min(1,N_CoT/4)`, a reasoning-depth proxy. For each question, sample K=3 responses, compute group mean and standard deviation, and use `A_i,k=(R_i,k−μ_i)/(σ_i+ε)`. Groups with negligible reward variance are skipped. The clipped group-relative loss uses ε=.2 and a reference-policy regularizer `L_ref=(ℓ̄_θ−ℓ̄_ref)^2`.

The paper reports that 57 of 240 rollout groups (23.75%) had zero reward variance and were skipped, leaving 183 informative groups and 30 optimizer updates. Inference: this makes reward identifiability a product risk; if all candidates receive the same checker score, RLVR supplies no preference signal. In Verus, reward arithmetic and group normalization can be verified for bounded arrays, but neural log probabilities, sampling, and optimization remain outside proof.

## gold-free self-consistency

At held-out inference, generate one greedy and four sampled responses (`T=.35`, top-p=.90). Cluster the five by task-aware answer equivalence, select the largest cluster, break equal-size ties in favor of the greedy response, then use a gold-free structural score for remaining ties. For supported physics questions, the question-only verifier may override only when confidence is at least .98; otherwise it abstains (Section II.F, p. 4). This separates model-only self-consistency from symbolic correction.

Table IV shows SFT P1 50.46% greedy, 51.14% after self-consistency, and 56.62% with physics verification. RLVR is 48.86%, 50.23%, and 55.94% respectively. The denominator is all 438 held-out examples; only the physics subset (274) receives the optional verifier. Self-consistency is a variance reducer, not a correctness proof.

## evidence, contradictions, and trust

“The current RLVR objective improves reasoning depth more strongly than answer accuracy, and longer outputs can introduce premise, unit, or formatting inconsistencies.” (Conclusion, p. 7).

The paper’s headline claims are internally qualified. RLVR improves P3 by 21.52 points but lowers P1 .68 and P2 2.37; format falls from 98.17% to 94.52%, and Strict from 41.44% to 40.14% (Table II, p. 5). The authors explicitly explain that longer traces can add unsupported premises or schema errors. Physics dominates the validation set (274/438), so micro-averaged P2 is not directly comparable to logic premise F1. The seven-example Logic Uncertain subset is too small for strong conclusions.

Trusted components are the authoritative answer set, QLoRA implementation, router, natural-language-to-FOL conversion, Z3, physics relation library, unit normalization, reward implementation, and the EXACT labels. The paper itself warns that contextual prior-work numbers are not directly comparable across models and benchmarks.

Inference: threat to a verified-Rust product is moderate to high at the verifier boundary. The architecture is useful: keep a neural proposal separate from a deterministic checker, measure answer correctness, evidence consistency, and explanation depth separately, and let high-confidence symbolic checks make selective corrections. But a proof of the checker does not prove the natural-language translation, task routing, or completeness of the relation library. For VL, use Verus to verify state transitions, parser normalization, unit algebra, and candidate-ranking invariants; retain solver soundness and specification adequacy as explicit trust assumptions.

Inference: the product should not optimize P3 alone. This paper’s own held-out numbers show that deeper explanations can coincide with lower answer and format correctness. A Verus gate should require the generated implementation to compile and satisfy its contract, while explanation quality remains a separate diagnostic.

## techniques for the catalog

- gold-anchored canonicalization — repair teacher traces while locking authoritative answers, units, and premises
- field-weighted QLoRA — mask prompt tokens and weight answer/evidence/unit fields more heavily during completion-only SFT
- task-aware external routing — dispatch logic and physics questions to specialized symbolic verifiers
- FOL/Z3 entailment — accept a claim when premises plus its negation are UNSAT and test contradiction analogously
- formula and unit verification — solve supported equations, normalize units, and intervene only above a calibrated confidence threshold
- verifier-guided self-revision — feed unsupported premises, formula errors, and unit conflicts back into candidate revision
- P1/P2/P3 group-relative RLVR — combine exact, dense, consistency, depth, and format rewards and normalize advantages within response groups
- gold-free self-consistency — cluster one greedy plus sampled answers by equivalence and apply selective symbolic correction
- separate correctness diagnostics — report answer, evidence/unit consistency, reasoning depth, format, and strict validity independently
Checked 2026-10-14 against the paper by a Codex agent: audit record vo2026verifier; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
