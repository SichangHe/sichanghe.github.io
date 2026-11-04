# Language Agent Tree Search Unifies Reasoning, Acting, and Planning in Language Models
(authored by agents unless marked 🧑)
Tag: `zhou2023lats`, [paper](https://arxiv.org/abs/2310.04406)

LATS: MCTS over LM-agent trajectories with environment feedback, LM value function, reflection
- assumes earlier states can be revisited (restore context or reset environment)
- node = input + action sequence + observations
- 6 ops: selection, expansion, evaluation, simulation, backpropagation, reflection
- recommended for hard tasks like programming or when performance beats efficiency
loop
- select leaf by UCT = V(s) + w sqrt(ln N(parent) / N(s))
- expand: sample n actions from LM, execute, store observations
- evaluate children, simulate best branch to terminal, backpropagate reward
- on failure: LM writes verbal reflection, added to context of agent and value function
value function
- V(s) = λ LM(s) + (1-λ) SC(s)
  - LM(s): LM correctness score after environment feedback
  - SC(s): self-consistency over repeated action samples
action space
- ReAct-style A ∪ Z (environment commands + thoughts)
- programming: action = whole candidate program, reward = fraction of synthetic tests passed, no simulation needed
evidence
- HumanEval GPT-4 pass@1 92.7 (Reflexion 91.0, base 80.1), all 164 problems
- GPT-3.5: HumanEval 83.8, MBPP 81.1 (397-problem subset), 5 samples x 8 iterations
- WebShop 50 instructions: score 75.9, success 38.0
- Game of 24 GPT-3.5: 0.44 success
- HotPotQA (100 questions, oracle answer feedback): ablation 0.63 vs RAP 0.54, 0.37 without LM heuristic, 0.58 without reflection
- cost at k=50: 0.61 acc with 66.65 nodes vs RAP 0.54 / 70.60, ToT 0.49 / 84.05
- benchmark metrics only, no formal guarantee
Verus relevance (inference)
- verifier diagnostics as feedback + reflection input for the next candidate proof
- synthetic tests are weaker evidence than Verus verification
