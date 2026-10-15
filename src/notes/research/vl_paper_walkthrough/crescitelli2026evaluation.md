# AI Evaluation Should Measure Verification Cost, Not Correctness Alone
(authored by agents unless marked 🧑)
Tag: `crescitelli2026evaluation`, [paper](http://arxiv.org/abs/2608.08709v1)

## paper contribution

This August 2026 position paper argues that output accuracy misses a deployment risk: an incorrect output that users cannot detect within their available time and expertise. It defines a Verification-Cost Error (VCE) operationally, as an incorrect input-output pair that a declared fraction of verifiers fails to identify within a declared budget. The authors state: “The reliability of AI generative models is typically measured by output correctness, yet in practice it depends on the effort required to verify those outputs” (abstract, p. 1). They explicitly present verification cost as a conceptual instrument, not a finished universal metric.

The method separates ground truth (GT), verifier behavior, and deployment constraints. A fixed model configuration produces outputs; verifiers inspect them under a budget B, confidence threshold τ, and protocol; the resulting verification trace (VT) records verdicts, times, counterexamples, and confidence. A VCE is an incorrect pair for which at least q of the verifier population fail to establish correctness within B. The paper's six-step protocol is designed for human verification and says automated validation needs an adaptation outside its operationalization (section 5, pp. 7–8).

## technique: verification-aware benchmarking

### definitions and setup

Choose a cost unit u (human-minutes, FLOPs, or USD), a verifier population V, a budget B, a stopping confidence τ, a VCE threshold q, a verifier count m, an interval method and confidence level α, tools, interface, and dataset. The paper warns that verification cost is relational: “verification cost is not an intrinsic property of a model: it is a property of a model output evaluated according to a specific measurement specification” (section 5, p. 8). Ground truth is an acceptance relation A over inputs and outputs, allowing several valid programs for one specification.

The operational VCE condition is: the pair is incorrect and at least q of the verifier population fail to establish that within B (section 5, p. 9). For a finite sample, pre-register the estimator and decision rule. The paper recommends three outcomes—confirmed VCE, not VCE, and inconclusive—using lower and upper confidence bounds, because three verifiers yield only proportions 0, 1/3, 2/3, and 1. With q = 1/2 and two-sided 95% binomial intervals, three failures out of three still have a lower bound near 0.29, so the result is inconclusive; six failures out of six give a lower bound about 0.54. These are the paper's illustrative calculations, not an experiment.

### six protocol steps

1. Ground truth and dataset. Construct or select a standardized dataset and fixed reference annotations before model evaluation. GT is shared by all models for comparability; it is not assumed to make verification easy (section 6, Step 1, p. 12).

2. model execution and verification trace. Run each fixed model snapshot, decoding configuration, and system prompt. For every output, record verifier verdict, time-to-verdict, counterexamples, and self-reported confidence in VT. The paper emphasizes: “The VT is not a ground truth: it is a measurement over verifier behavior, distinct from but complementary to GT” (section 6, Step 2, p. 12).

3. stopping rule and budget. Stop when confidence reaches τ (typically 0.9), B is exhausted, or the verifier declares the output unverifiable. Record four mutually exclusive outcomes: correct verdict within budget, incorrect verdict within budget, budget exhaustion without verdict, and declared unverifiable (section 6, Step 3, pp. 12–13). Do not impute the unobserved time needed for a correct verdict after an early wrong decision or budget exhaustion.

4. verifier control. Include a baseline on held-out known-correct outputs, inter-rater agreement across N ≥ 3 verifiers per output, and experience metadata for stratification. Register recruitment and sampling; if the panel is not representative, limit claims to the observed panel. Report agreement, verdict accuracy against GT, and premature high-confidence closures separately. Agreement is not a correctness gate: a shared heuristic can produce confident agreement on a wrong answer (section 6, Step 4, pp. 13–14).

5. stratified reporting. Separate GT-correct from GT-incorrect outputs because confirmation and refutation have different effort profiles. For incorrect outputs report correct-refutation probability within B and observed budget consumption; report correct-verdict time only among episodes that reached a correct verdict (section 6, Step 5, p. 14).

6. model-level reporting. Aggregate VT into observed budget consumption E[D]/B, probability of a correct verdict within B, confirmed VCE rate, inconclusive rate, and the classification envelope. Keep the dataset, budget, tools, interface, verifier population, and protocol fixed when comparing models. The paper calls these comparative indicators, not universal scalar metrics (section 6, Step 6, pp. 14–15).

### Verus form

Inference: apply the protocol to VeruLaw by treating each agent-produced Rust/Verus output as a model output and the Verus checker plus human reviewer as the verification apparatus. Ground truth can be an acceptance relation consisting of executable tests plus an independently checked specification. Record the Verus version, Rust subset, solver configuration, timeout, proof result, counterexample or failed obligation, and human repair minutes. A machine-checked `ensures` result is a correct-verdict event only for the declared contract; it does not establish that the contract captures the deployment requirement. Inference: encode protocol metadata in a separate evaluation harness rather than in proof code; use Verus `requires`, `ensures`, loop `invariant`, and `decreases` in the artifact, and preserve executable tests for behavior outside the model. Automated verification is not the human protocol in the paper, so any fully automated adaptation must state its changed verifier population and cost unit.

## evidence, trust, and limitations

The paper's method is proposed, not empirically validated: “We leave concrete instantiations and empirical evaluation to future work” (section 6, p. 16). Its numerical examples (three versus six verifiers, q = 1/2, confidence bounds) are specification illustrations. Table 1 is explicitly illustrative; it gives no benchmark denominator. The protocol's maximum instrumentation effort is mnB verifier-cost units for m verifiers and n outputs, plus baseline overhead (section 6, p. 16). This is a budget bound, not a measured cost saving.

What stays trusted includes GT or acceptance relation, verifier sampling, interface and tools, the model configuration, and the correctness of any automated checker. The protocol does not solve specification error, an unrepresentative verifier panel, changing models or verifier expertise, or the distinction between observed burden and latent cost. The authors state that budget exhaustion reveals only that no correct verdict was reached within B; it does not reveal how much longer correctness would have taken (section 5, pp. 10–11).

Inference: the threat to a product of agent-written verified Rust is high if a system reports proof pass rate while hiding reviewer effort, wrong high-confidence proofs, inconclusive cases, or contract mismatch. VCE-style reporting would expose whether a generated proof is cheap to validate in the deployment context. The paper does not show that Verus proofs lower human verification cost; it supplies a measurement design for testing that claim. VL should not redo the paper's conceptual distinction between correctness and verification burden. It should instantiate the protocol on real Rust repositories, disclose denominators and failed cases, and test whether machine-checkable certificates move outputs from a high-burden to a low-burden regime.

## techniques for the catalog

- verification-cost error: classify an incorrect output by the fraction of verifiers unable to establish its error within a declared budget
- fixed measurement specification: compare systems only with the same cost unit, verifier population, budget, threshold, tools, interface, and dataset
- ground-truth separation: keep reference correctness independent from the verification trace measuring human behavior
- bounded stopping rule: terminate on confidence, budget exhaustion, or unverifiability and report all four outcomes
- verifier controls: use a known-correct baseline, at least three verifiers, experience metadata, and agreement alongside accuracy
- stratified burden reporting: separate correct and incorrect outputs and report observed effort with correct-refutation success
- three-state classification: report confirmed, rejected, and inconclusive VCEs with the finite-sample interval rule
- model-level indicators: aggregate success probability, budget consumption, confirmed rate, inconclusive rate, and their envelope under a fixed protocol
Checked 2026-10-15 against paper crescitelli2026evaluation: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
