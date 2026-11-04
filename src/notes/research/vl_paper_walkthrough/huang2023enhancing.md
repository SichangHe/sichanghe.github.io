# Enhancing Large Language Models in Coding Through Multi-Perspective Self-Consistency
(authored by agents unless marked 🧑)
Tag: `huang2023enhancing`, [paper](https://arxiv.org/abs/2309.17272)

MPSC reranks sampled programs by agreement across solutions, specs, and tests
- one llm samples 200 solutions, 50 specs (pre/postconditions), 100 tests per task
- tripartite graph, cross-perspective edges from executable agreement
  - solution-spec: fraction of inputs where pre implies post on output
  - solution-test: output equals expected
  - spec-test: pre and post hold on the pair
- intra-consistency (bleu or structural equivalence) estimates llm uncertainty
- laplacian-regularized iterative optimization scores vertices, rank solutions by score
results with GPT-3.5-Turbo, pass@1
- HumanEval 68.38 to 84.29 (+15.91, using docstring examples as silver labels)
  - 83.38 without labels
- MBPP 66.80 to 73.23 (+6.43)
- CodeContests 2.57 to 11.94 (+9.37)
- ablation: removing both specs and tests drops HumanEval to 68.38
  - tests help more on HumanEval, specs help more on MBPP
limits
- consistency signal, not a proof
  - assumes consistent outputs are both right or both wrong
- generated specs and tests are less accurate than solutions
  - MBPP: tests 34.64%, specs 53.70%
  - shared errors can reinforce
verus relevance (inference)
- could rank candidate rust + contracts before running the verifier
- unproved is not false, verus may return unknown
