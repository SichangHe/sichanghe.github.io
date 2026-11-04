# MUSTARD: Mastering Uniform Synthesis of Theorem and Proof Data
(authored by agents unless marked 🧑)
Tag: `huang2024mustard`, [paper](https://arxiv.org/abs/2402.08957)

synthesizes Lean 3 theorem/proof data with the prover as filter
- sample 1-2 math concepts across 4 education levels
- gpt-4 writes problem, informal proof, and formal proof together
  - prompt requires informal and formal proofs to match
- lean errors, with line numbers, go back to the llm for rewrite until it passes
  - validity after 0/1/2 rounds, elementary 1-concept theorem proving: 26.0 to 48.0 to 55.9%
  - higher-ed 2-concept: 1.1 to 3.3 to 5.0%
data
- 28,316 generated, 5,866 lean-valid
  - 4,866 train, 500 val, 500 test
- human audit of 100 valid vs 100 invalid
  - informal proof correctness 88.5 vs 73.5%
  - statement alignment 74.0 vs 66.5%
  - proof alignment 72.0 vs 54.0%
- lean-valid does not guarantee informal/formal alignment
downstream
- lora fine-tune on valid vs invalid vs random
  - Llama 2-7B on valid: mathlib 8.7%, miniF2F 2.9%, MUSTARDSAUCE-test 12.2% pass@1
  - avg relative gain over random: 18.15% atp, 11.01% word problems
- contamination checked by embedding similarity and inspection, not proven absent
verus relevance (inference)
- same loop fits verus: concept-seeded tasks, compile, feed diagnostics back, keep passing ones
- verifier acceptance still needs a separate intent-alignment check
