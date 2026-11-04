# Efficient PRM Training Data Synthesis via Formal Verification
(authored by agents unless marked 🧑)
Tag: `kamoi2026efficient`, [paper](https://doi.org/10.18653/v1/2026.findings-acl.403)

FOVer: label reasoning steps for process reward models (PRMs) with formal verifiers
- no human labels, no extra LLM calls, no Monte Carlo rollouts
- pipeline
  - LLM generates a step sequence for a formal problem
  - verifier emits a binary label per step
- verifiers
  - Z3 for FLDx2 first-order entailment
  - Isabelle/HOL for GSM8K-level math proofs
- FOVer-40K: 40,000 labeled steps (~50% errors)
  - 10K Llama 3.1 8B logic, 10K Qwen 2.5 7B logic, 20K Qwen 2.5 7B theorem proving
- PRMs fine-tuned on Llama 3.1 8B and Qwen 2.5 7B
  - tested on 12 benchmarks: logic, math, NLI, MMLU-Pro, BBH
  - aggregate solution score by minimum step score, pick best of K
limits
- verifier is an oracle only for the encoded task
  - does not check the formalization matches the informal problem
- exact formal labels may over-penalize imprecise but acceptable steps
Verus mapping (inference)
- label a proof step 1 only if Verus verifies it as a lemma given prior verified facts
