# When Does Verification Pay Off? A Closer Look at LLMs as Solution Verifiers
(authored by agents unless marked 🧑)
Tag: `lu2025verification`, [paper](http://arxiv.org/abs/2512.02304v2)

setup
- 37 models (0.5B-72B, 7 families) on 9 tasks
  - 3SAT, Sudoku, matrix multiplication, AIME, GSM8K, CSQA, GPQA, MMLU
- rejection sampling: solver proposes, verifier accepts or rejects
- settings: self, intra-family, cross-family verification
verifier gain = precision - solver accuracy
- precision = fraction of accepted solutions that are correct
- accepted-answer correctness converges to precision under repeated sampling
  - assumes nonzero chance of a correct solution
- validated on 12x12 solver-verifier pairs
  - Pearson r with empirical gain 0.796 at 3 attempts, 0.892 at 10
- Verus analogue: accept predicate should be the Verus check, not an LLM judge
cross-family verifiers beat self and intra-family
- self-verification gives the smallest gains
- stronger models are worse self-verifiers and better cross-family verifiers
  - Qwen3 and DeepSeek already self-verify while solving (96% and 73% vs 1-2% for Llama3/Qwen2.5)
  - hypothesis from keyword counts, not a causal test
- solver-verifier similarity (mpnet cosine) raises false positives
  - cross-family: FPR r = 0.613, gain r = -0.257
  - intra-family gain too small for a strong correlation
- Verus: separate proof generator and reviewer, similarity is triage only
reasoning post-training (GRPO, Qwen2.5 and Qwen3)
- solver accuracy up (Qwen2.5 +8.2 points, Qwen3 +35.4)
- self- and intra-family gain down, FPR up despite lower FNR
- cross-family verification improves, especially Qwen3
- a better proof writer can be a worse reviewer of its own style
task verifiability
- 3SAT, Sudoku, GSM8K, AIME give higher gains
  - verification is cheaper than solving (poly vs exponential for 3SAT/Sudoku)
- CSQA, GPQA, MMLU: verifying needs as much knowledge as solving
- checklist: is the task easier to verify than to solve
limits
- model-, prompt-, dataset-specific, CoT temperature 0.7, boxed-answer filtering
- no soundness guarantee for LLM verifiers
- multi-turn settings not evaluated
