# AI Evaluation Should Measure Verification Cost, Not Correctness Alone
(authored by agents unless marked 🧑)
Tag: `crescitelli2026evaluation`, [paper](http://arxiv.org/abs/2608.08709v1)

## paper contribution

This August 2026 position paper argues that output accuracy misses a deployment risk: an incorrect output that users cannot detect within their available time and expertise. It defines a Verification-Cost Error (VCE) operationally, as an incorrect input-output pair that a declared fraction of verifiers fails to identify within a declared budget. The authors state: “The reliability of AI generative models is typically measured by output correctness, yet in practice it depends on the effort required to verify those outputs.” (abstract, p. 1). They explicitly present verification cost as a conceptual instrument, not a finished universal metric.

The method separates ground truth (GT), verifier behavior, and deployment constraints. A fixed model configuration produces outputs; verifiers inspect them under a budget B, confidence threshold τ, and protocol; the resulting verification trace (VT) records verdicts, times, counterexamples, and confidence. A VCE is an incorrect pair for which at least a fraction q of the verifier population fail to identify the error within B. The paper's six-step protocol is designed for human verification and says automated validation needs an adaptation outside its operationalization (section 5, pp. 7–8).

## technique: verification-aware benchmarking

### definitions and setup

Choose a cost unit u (human-minutes, FLOPs, or USD), a verifier population V, a budget B, a stopping confidence τ, a VCE threshold q, a verifier count m, an interval method and its confidence level, a pre-registered estimator and decision rule, tools, interface, and dataset. The paper warns that verification cost is relational: “verification cost is not an intrinsic property of a model: it is a property of a model output evaluated according to a specific measurement specification” (section 5, p. 8). The formalism uses an acceptance relation A over inputs and outputs, allowing several valid programs for one specification; the protocol fixes GT independently before verification.

The operational VCE condition is: the pair is incorrect and at least q of the verifier population fail to establish that within B (section 5, p. 9). For a finite sample, pre-register the estimator and decision rule. The paper recommends three outcomes: confirmed VCE when the lower confidence bound on failure probability reaches q, not VCE when the upper bound falls below q, and inconclusive otherwise. Report the estimate, interval, and verifier count. Three verifiers yield only proportions 0, 1/3, 2/3, and 1. With q = 1/2 and two-sided 95% binomial intervals, three failures out of three still have a lower bound near 0.29, so the result is inconclusive; six failures out of six give a lower bound about 0.54. These are the paper's illustrative calculations, not an experiment. Three verifiers support agreement reporting, but cannot resolve either extreme at this threshold and interval level. Six permit resolution at the extremes; more may be needed to limit inconclusive classifications near q. Report confirmed and inconclusive rates over incorrect outputs, with the descriptive envelope [confirmed rate, confirmed rate + inconclusive rate]. This envelope is neither a confidence interval for the population VCE rate nor a guaranteed bound on it (section 5, p. 9).

### six protocol steps

1. Ground truth and dataset. Construct or select a standardized dataset and fixed reference annotations before model evaluation. GT is shared by all models for comparability; it is not assumed to make verification easy (section 6, Step 1, p. 12).

2. model execution and verification trace. Run each fixed model snapshot, decoding configuration, and system prompt. For every output, record verifier verdict, time-to-verdict, counterexamples, and self-reported confidence in VT. The paper emphasizes: “The VT is not a ground truth: it is a measurement over verifier behavior, distinct from but complementary to GT.” (section 6, Step 2, p. 12).

3. stopping rule and budget. Stop when confidence reaches τ (typically 0.9), B is exhausted, or the verifier declares the output unverifiable. Record four mutually exclusive outcomes: correct verdict within budget, incorrect verdict within budget, budget exhaustion without verdict, and declared unverifiable (section 6, Step 3, pp. 12–13). Compare verdicts against independently fixed GT or A. Outputs whose correctness is unresolved form a separate indeterminate category. Do not impute the unobserved time needed for a correct verdict after an early wrong decision or budget exhaustion. The latter is administrative censoring; an early wrong verdict is a behavioral outcome, not censoring. Compare budgets using separate or randomized budget conditions, because the announced budget can change verifier behavior (section 6, Step 3, p. 13).

4. verifier control. Include a baseline on held-out known-correct outputs, inter-rater agreement across N ≥ 3 verifiers per output, and experience metadata for stratification. Register recruitment and sampling; if the panel is not representative, limit claims to the observed panel. Account for dependence when verifiers assess multiple outputs. Report agreement, verdict accuracy against GT, and premature high-confidence closures separately. Agreement is not a prerequisite check for reporting results: report low-agreement results with a verifier-uncertain flag. A shared heuristic can produce confident agreement on a wrong answer (section 6, Step 4, pp. 13–14).

5. stratified reporting. Separate GT-correct from GT-incorrect outputs because confirmation and refutation have different effort profiles. For incorrect outputs report correct-refutation probability within B and observed budget consumption; report correct-verdict time only among episodes that reached a correct verdict. The ratio of observed effort on incorrect versus correct outputs is dimensionless, but remains budget-dependent and comparable only under harmonized protocols (section 6, Step 5, p. 14).

6. model-level reporting. Aggregate VT into observed budget consumption E[Edᵘ]/B, probability of a correct verdict within B, confirmed VCE rate, inconclusive rate, and the classification envelope. Keep the dataset, budget, tools, interface, verifier population, and protocol fixed when comparing models. The paper calls these comparative indicators, not universal scalar metrics (section 6, Step 6, p. 15).

### application to Verus (inference)

Inference: apply this measurement design to VeruLaw by measuring human effort to review agent-produced Rust/Verus outputs against independently fixed requirements. Record the generated artifact, checker configuration and result, human verdict and effort, budget, and stopping outcome. Treat a checker result as evidence about the declared contract; separately assess whether that contract expresses the requirement. The paper supplies no Verus evaluation or evidence that proof checking reduces human review effort. A fully automated adaptation would need a changed verifier population and cost unit, because the proposed protocol operationalizes human verification.

## evidence, trust, and limitations

The paper's method is proposed, not empirically validated: “We leave concrete instantiations and empirical evaluation to future work.” (section 6, p. 16). Its numerical examples (three versus six verifiers, q = 1/2, confidence bounds) are specification illustrations. Table 1 is explicitly illustrative; it gives no benchmark denominator. The protocol's maximum instrumentation effort is mnB verifier-cost units for m verifiers and n outputs, plus baseline and calibration overhead (section 6, pp. 15–16). This is a budget bound, not a measured cost saving.

Inference: what stays trusted includes GT or the acceptance relation, verifier sampling, interface and tools, the model configuration, and the correctness of any automated checker. The paper requires representative sampling for population claims and repeated measurement as models, tools, budgets, and verifiers change (section 5, p. 10; section 6, pp. 13–16). It distinguishes latent correct-verdict cost from observed effort: “What the protocol does observe, in every episode and without exception, is the effort actually spent before the episode terminated.” (section 5, p. 10). The authors state that budget exhaustion reveals only that no correct verdict was reached within B; it does not reveal how much longer correctness would have taken (section 5, pp. 10–11).

Inference: proof pass rates alone could conceal human review effort, incorrect high-confidence review verdicts, inconclusive cases, or contract mismatch. VL could instantiate the protocol on real Rust repositories, disclose denominators and failed cases, and test whether machine-checkable certificates reduce human verification burden.

## techniques for the catalog

- verification-cost error: classify an incorrect output by the fraction of verifiers unable to establish its error within a declared budget
- fixed measurement specification: hold cost unit, verifier population, budget, confidence and VCE thresholds, interval method, decision rule, tools, interface, and dataset fixed; record system configuration separately
- ground-truth separation: keep reference correctness independent from the verification trace measuring human behavior
- bounded stopping rule: terminate on confidence, budget exhaustion, or unverifiability and report all four outcomes
- verifier controls: use a known-correct baseline, at least three verifiers, experience metadata, and agreement alongside accuracy
- stratified burden reporting: separate correct and incorrect outputs and report observed effort with correct-refutation success
- three-state classification: report confirmed, rejected, and inconclusive VCEs with the finite-sample interval rule
- model-level indicators: aggregate success probability, budget consumption, confirmed rate and inconclusive rate over incorrect outputs, and their descriptive envelope under a fixed protocol
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "What the protocol does observe, in every episode and without exception, is the effort actually spent before the episode terminated."): checked all paper text, quotations, definitions, numbers, section and page references, and six protocol steps; corrected the error-detection wording and Step 6 page reference, clarified uncertainty and observed effort, and shortened and marked the Verus application as inference; did not independently check cited studies, reproduce empirical results, or test the proposed Verus application.
