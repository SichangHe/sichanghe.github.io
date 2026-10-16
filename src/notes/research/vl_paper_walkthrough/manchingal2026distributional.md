# Distributional Energy-Based Models for Uncertainty-Aware Structured LLM Reasoning
(authored by agents unless marked 🧑)
Tag: `manchingal2026distributional`, [paper](http://arxiv.org/abs/2605.18871v1)

## scope and claims

This paper builds a small verifier that selects among LLM-generated structured outputs. Its energy is (E(x,y)=\mu_{quality}(x,y)+\lambda E_{constraint}(x,y)): an ensemble mean learned from candidate pairs plus deterministic penalties for domain constraints. The ensemble standard deviation (\sigma_{quality}) drives regeneration or abstention. The five evaluations are GSM8K, MuSR, TravelPlanner, TACO code, and Knights & Knaves (K&K). The authors state, “The two routes are complementary: structural verification wins when constraints are checkable … while pretraining-scale priors win where they are not.”

Inference: this is a verifier-gating pattern for agent-generated Verus code. It can rank candidate proof/code artifacts and abstain when the learned scorer is uncertain, while deterministic checks reject malformed contracts. It cannot replace Verus's sound proof checker or establish that a specification captures the intended policy.

## technique: decomposed energy with deterministic constraint penalties

What it is: add a learned whole-output quality score to a sum of explicit, deterministic constraint penalties. Each (C_j) returns zero when satisfied and a positive violation amount; weights (w_j) form (E_{constraint}=\sum_j w_jC_j). The learned term ranks general quality; the checker enforces rules exactly and can be changed without retraining.

How to do it (Sections 3.1 and 3.4):

1. Define a parser and one penalty function per domain constraint.
2. Return zero for satisfaction and a normalized positive violation for failure.
3. Choose (\lambda) on a held-out validation split.
4. Score each candidate with the learned mean plus (\lambda E_{constraint}), then choose the minimum.
5. Keep the checker modular so adding a constraint does not alter the learned scorer.

Evidence: “The constraint terms are deterministic: each is a direct computation over the parsed structured output with no learned parameters.” For TravelPlanner, Appendix E.5 defines budget, connectivity, completeness, preferences, and diversity penalties, plus hallucination, structure, and parse dimensions; the primary metric is their mean violation.

Verus form: Inference: parse generated Rust/Verus artifacts, then run deterministic checks for required modules, forbidden unsafe operations, contract presence, and policy-specific invariants before invoking Verus. Encode semantic properties as Verus `requires`, `ensures`, and proof lemmas; use the verifier as the final acceptance oracle. A penalty score can prioritize candidates but cannot prove a postcondition.

Evidence and limits: on TravelPlanner the combined method reaches mean violation 0.046 versus random 0.231, while (E_{quality})-only is 0.058 and (E_{constraint})-only 0.038. The combination is therefore not uniformly best on every numeric component. Constraint authoring is the stated scalability bottleneck; the paper says each domain needs an expert-authored term.

## technique: heterogeneous LoRA ensemble for quality and epistemic uncertainty

What it is: attach (K=5) structurally different low-rank adapters and independent energy heads to one frozen ModernBERT encoder. Each member scores a problem/candidate pair; the mean ranks candidates and the standard deviation estimates disagreement.

How to do it (Section 3.2 and Appendix C):

1. Tokenize `[CLS] problem [SEP] candidate [SEP]` and run a shared frozen bidirectional encoder.
2. Attach adapters with different ranks, scaling, and target attention modules, plus independent MLP heads.
3. Train each member independently on a bagged 80% problem subset.
4. Compute (\mu_{quality}) as the mean of member energies and (\sigma_{quality}) as their standard deviation.
5. Use the mean in the total energy and retain the standard deviation for triage and diagnostics.

Evidence: “The ensemble mean ranks candidates; the standard deviation σquality drives a two-pass inference loop that triggers regeneration with structured feedback under uncertainty or constraint violations, and abstains in the extreme case.” Theorem 3.1 models correlated adapters and concludes that positive correlation imposes a finite accuracy ceiling; lower correlation from structural heterogeneity helps.

Verus form: Inference: an ensemble can rank multiple generated proof candidates, but the Verus verifier must check every accepted candidate. Use disagreement to decide which candidate to compile first or when to request regeneration; do not treat low disagreement as proof soundness. Adapter training and statistical propositions remain outside Verus.

Evidence limits: the uncertainty signal is task-dependent. MuSR has sigma-AUROC 0.44, so high disagreement does not identify errors; TravelPlanner abstaining on 40% raises pass@1 from 28.0% to 36.7%. These denominators are the full benchmark test sets as reported in Appendix F.4, not proof obligations.

## technique: contrastive pair training with leakage control

What it is: train each scorer with Bradley–Terry pairwise loss so correct candidates have lower energy than incorrect candidates. Pairs are split at the problem level and capped per problem so easy examples do not dominate.

How to do it (Section 3.3):

1. Label candidate outputs using task verification (answer matching, execution, or constraints).
2. Form positive/negative pairs for each problem.
3. Train member (k) on its bagged subset with the logistic pairwise loss.
4. Keep the frozen backbone shared but do not share adapter/head parameters.
5. Apply the trained ensemble zero-shot to other tasks only as an experiment; add new deterministic checkers for new constraints.

Evidence: “Contrastive pairs are split at the problem level to prevent data leakage.” The paper reports a 149M-parameter verifier with only about 3% trainable parameters per member.

Verus form: Inference: pair generated proof candidates by verifier outcome, but labels must come from actual Verus verification or trusted semantic tests. Training a ranker is auxiliary; no learned loss can establish a Rust theorem.

## technique: two-pass sigma-triage and abstention

What it is: generate a first pool, score it, and accept only if constraints are satisfied and sigma is low. Otherwise regenerate with structured violation feedback; abstain if the final sigma exceeds a higher threshold.

How to do it (Algorithm 1, Appendix F.5):

1. Sample (N_m) candidates from each frozen generator and pool them.
2. Parse each candidate; parse failures receive infinite constraint energy.
3. Compute all adapter energies, mean, standard deviation, constraints, and total energy.
4. Select the minimum-energy candidate.
5. If (E_{constraint}>0) or sigma exceeds (\theta_\sigma), format violations as feedback and generate (N_2) more candidates.
6. Rescore the union and select its minimum.
7. Abstain when sigma exceeds (\theta_{abstain}); otherwise return the candidate.

Evidence: Algorithm 1 requires “Selected candidate y* or ABSTAIN.” The reported setup uses four generators, eight candidates each ((N=32)), (N_2=8), (\theta_\sigma=0.8), and (\theta_{abstain}=1.5), with thresholds selected on held-out validation data. On a Qwen-only TravelPlanner pool, two-pass raises pass@1 from 74.0% to 80.0% (+6.0 percentage points); on GSM8K it lowers pass@1 by 1.7 points because feedback disrupts memorized answers.

Verus form: Inference: apply the same triage to candidate Rust crates: reject parse/compile failures, regenerate using verifier diagnostics, and abstain when model disagreement is high. Run Verus after every regeneration and require a successful proof before deployment. Thresholds must be calibrated per task; a universal uncertainty cutoff is unsound.

## measurements, contradictions, and trust

Table 1 evaluates 32-candidate pools. Distributional EBM obtains GSM8K 97.0%, MuSR 67.7%, TravelPlanner mean violation 0.046, TACO 88.6%, and K&K 99.9% (699/700). It is strongest non-oracle on TravelPlanner but not best everywhere: LLM-as-Judge reaches 73.5% on MuSR and Claude Opus reaches 100.0% on TACO. The abstract's “reduces constraint violations by 53% relative to Opus 4.6 on TravelPlanner (oracle 0.028, random 0.231)” refers to a different comparison than the table's 0.046 EBM mean violation, so the setting and denominator must remain attached to each number. The paper itself notes that the LLM-as-Judge GSM8K row uses a more lenient candidate pool (random 92.0%, oracle 99.2%) than the main pool (92.7%, 98.5%).

The checker, parser, frozen encoder, labels, candidate generators, and human-authored constraints remain trusted. Appendix E.7 reports the K&K checker's perfect equivalence on all 34,120 candidates checked; this is a checker validation count, not a deployment guarantee. The TACO scorer initially learned a model-format shortcut and required last-layer retraining; this demonstrates that high-confidence learned verification can be wrong for causal reasons.

## techniques for the catalog

- decomposed energy — combine learned whole-output ranking with modular deterministic constraint penalties
- heterogeneous adapter ensemble — use structurally diverse low-rank heads whose mean ranks and disagreement estimates uncertainty
- contrastive verifier training — train pairwise energies on problem-level positive/negative candidates without leakage
- sigma-triage loop — accept low-uncertainty valid candidates, regenerate with structured feedback, and abstain at extreme uncertainty
