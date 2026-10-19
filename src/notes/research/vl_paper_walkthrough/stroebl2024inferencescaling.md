# The Limits of Inference Scaling Through Resampling
(authored by agents unless marked 🧑)
Tag: `stroebl2024inferencescaling`, [paper](https://arxiv.org/abs/2411.17501)

## claim and verifier model
Stroebl, Kapoor, and Narayanan study generating many candidate programs and accepting the first that passes a verifier. Their abstract states: "Resampling cannot decrease this probability, so it imposes an upper bound to the accuracy of resampling-based inference scaling, regardless of compute budget." (Abstract, p. 1.) The paper distinguishes an oracle proof checker, where acceptance guarantees correctness, from imperfect unit tests or LM judges that admit false positives (§2, p. 4).

Inference: this distinction is central to VL. A Verus proof check is intended to be oracle-like for the encoded specification; tests, compilation, or an agent judge are weaker evidence and can accept buggy Rust.

## technique 1: measure verifier generalization gap
what it is and when to use it
Use a stronger hidden test set to estimate how often candidates accepted by a practical verifier are actually correct. The paper uses HumanEval+ and MBPP+, whose comprehensive hidden tests extend the original benchmark tests (§3, p. 5). It asks whether weaker models produce more false positives—solutions passing base tests but failing extended tests (§3, p. 5).

steps
1. Sample at least 200 solutions per task/model on HumanEval+ (1,000 for Command Light) and 50 per task on MBPP+ (§3, p. 5)
2. Filter solutions that pass the original unit tests (§3, p. 5)
3. Run those solutions on the comprehensive hidden suite (§3, p. 5)
4. Count a base-pass/extended-fail solution as a false positive (§3, p. 5)
5. Compare each model’s single-sample accuracy with its accuracy conditional on passing the original tests (§3, pp. 5–6; Figure 3)

The authors assume full-suite passes are correct and state: "These tests are extensive, and we assume that solutions that pass the full set of tests are correct." (§3, p. 5.) They add that if this assumption fails, the measured gaps only grow. They find weaker models have higher false-positive probabilities, consistently across Command, GPT-4o, and Llama-3.1 families (§3, p. 5). If Pstrong(Correct) > Pweak(Correct | Pass Verifier), then no compute budget lets the weaker model match the stronger model's single sample (§3, p. 6).

Verus form (inference)
Inference: run a held-out behavioral test suite against verified Rust artifacts and compare it with the acceptance predicate used in generation. Verus can prove the contract, but if the contract omits an edge case, tests expose a specification gap rather than invalidate the proof. Store denominators, model version, and environment with every acceptance record.

## technique 2: cost-aware optimal resampling
The paper models the negative utility of false positives. It explains: "The cost of bugs (which might result in buggy software being deployed) is not easily comparable to the labor-saving benefit of correct solutions, and this cost-benefit ratio can vary greatly depending on the application." (§4, p. 6.) For each HumanEval task and model, it draws 200 samples. For every K≤200, if a passing solution appears, a true positive receives benefit 1 and a false positive receives a cost of 0, 1, 2, 4, or 8; no pass receives reward 0. The process is repeated 1,000 times with the same samples randomly permuted (§4, p. 6).

steps
1. Choose the verifier and the cost-benefit ratio for an accepted false positive (§4, p. 6)
2. Generate a fixed pool of samples (§4, p. 6)
3. For each K, inspect the first K samples and classify the first verifier pass by an independent comprehensive test (§4, p. 6)
4. Assign +1 for a true positive, negative cost for a false positive, and 0 if no sample passes (§4, p. 6)
5. Randomly permute the fixed pool 1,000 times and average reward by K (§4, p. 6)
6. Choose K at the maximum mean reward, rather than assuming larger K is better (§4, p. 7)

At cost-benefit ratio 4, K≤5 was optimal for all four plotted models; at high enough cost, K=0 (§4, p. 7). False-positive rate rises with K because easy tasks are solved early while harder tasks are more susceptible to false positives (§4, p. 7). The exact optimal K varies: Llama-3.1-70B rises sharply in false positives, while Code Llama and Command rise more gradually (§4, p. 7).

Verus form (inference)
Inference: use a candidate's Verus check as a prerequisite check for the encoded contract, and assign a cost to failures caused by omitted requirements or trusted assumptions. A Rust pipeline can cap attempts or stop when marginal expected repair cost exceeds expected benefit. Verus cannot choose K from proof obligations alone; the estimate requires empirical failure data.

## technique 3: quality audit beyond correctness
The authors test whether false positives are lower quality even when they pass unit tests. On HumanEval they compare readability of candidates passing standard tests with those also passing the comprehensive suite, using four metrics: camelCase adherence, snake_case adherence, line-length compliance, and line-level comments (§5, pp. 8–9; Appendix D, Figure 16, p. 28). The code-length prompt also requests functions shorter than 30 lines and lines shorter than 70 characters (Appendix D.2, Figure 17, p. 29). They report that false positives score lower across all four metrics (Figure 16, p. 28).

Inference: VL should separately measure maintainability, complexity, and style of agent-written verified Rust. A proof establishes the specified behavior, not readability or upgrade safety. A useful audit should retain code quality scores by model and verifier outcome.

## theoretical and practical limits
The paper’s comparison is conditional: if a strong model’s single-sample accuracy exceeds a weak model’s accuracy conditional on passing the verifier, no resampling budget lets the weak model match that strong-model accuracy (§3, pp. 5–6). It warns that standard benchmark evaluation is misleading when the same imperfect tests serve as both verifier and benchmark (§1, p. 3). The authors warn that training-time rejection sampling risks including mislabeled examples (§1, p. 3) and hypothesize that weaker models with imperfect verifiers cannot curate sufficiently good datasets for competitive reasoning models (§6, p. 9). These training implications were not experimentally tested here.

Evidence uses HumanEval+, MBPP+, original unit tests, multiple model families, and fixed sample counts. Limitations include human-generated test suites and unknown behavior of LLM-generated tests (§3, p. 6), task ambiguity (§5, p. 8), model-specific false-positive curves (§4, p. 7), prompt sensitivity, unexamined benchmark contamination, and application-dependent cost-benefit ratios (§6, p. 10). The paper does not measure Verus, Rust, or theorem-prover soundness.

Inference: threat to a product of agent-written verified Rust is high when a weak test suite or LM judge is the acceptance criterion, because resampling preferentially finds test-exploiting programs. It is lower when Verus checks a precise contract and deployment additionally checks the linked implementation and environment. VL should not redo the generic observation that tests can have false positives; this paper provides the cost-aware stopping design and the hidden-suite measurement protocol.

## techniques for the catalog
- verifier generalization audit: compare practical verifier passes with independent hidden tests and report conditional accuracy
- cost-aware resampling: assign explicit negative utility to false positives and optimize the attempt count
- fixed-pool permutation evaluation: reuse the same samples under 1,000 random orders to estimate reward curves by K
- quality audit: compare accepted candidates on four readability metrics beyond functional correctness
- oracle boundary: distinguish proof-checker acceptance from imperfect tests or model judges that can admit false positives

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Additionally, we did not investigate how benchmark contamination affects our findings, as models could be overly optimized for passing the standard test cases."): checked all paper text, study quotations, numbers, section and page references, and technique steps; corrected two quotations, the paper link, readability metrics, and the scope of training claims; clarified limitations and labeled Verus applications as inference; did not reproduce experiments or inspect the released code.
