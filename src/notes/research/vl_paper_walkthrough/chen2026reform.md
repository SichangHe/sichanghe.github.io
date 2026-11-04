# ReForm: Reflective Autoformalization with Prospective Bounded Sequence Optimization
(authored by agents unless marked 🧑)
Tag: `chen2026reform`, [paper](http://arxiv.org/abs/2510.24592v3)

goal: formal statement that is semantically faithful, not just compiling
generate-critique-repair loop in one autoregressive sequence
- S_t from question + history, then critique C_t of semantic gaps
  - e.g. "only asserts the inequality, not the existence of the minimizer or its uniqueness"
- stop when critique says faithful
heterogeneous rewards
- task reward 1 iff Lean compiles and LLM judge says consistent
  - judge CriticLean-14B
- auxiliary critique reward 1 iff critique is faithful (Qwen3-235B-A22B)
  - prevents critiques degenerating to trivial/hallucinated
prospective bounded sequence optimization
- backward returns G_t = clip(r_t + gamma G_{t+1}, r_min, r_max)
- per-iteration advantages normalized across trajectories, GRPO
- terminal index G_{T+1}=0 vs T_j+1 inconsistent in paper
data
- 447,508 SFT trajectories, up to 3 rounds
- 2,048 RL problems chosen by pass rate; group size 16
results (LLM-judged semantic consistency)
- ReForm-8B: miniF2F 87.7%, ProofNet 65.6%, PutnamBench 57.3%, AIME2025 46.7%
- ReForm-32B: 91.4%, 70.4%, 62.3%, 66.7%
- ablations: no clipping 8B AIME25 46.7 -> 26.7; no aux reward Putnam 52.1
- human check of 8B: 86.1% miniF2F, 69.4% ProofNet correct
- human-written references themselves wrong: 16.4% miniF2F, 38.5% ProofNet
takeaways for Verus (inference)
- score verifier pass and contract fidelity separately, vacuous postcondition must not earn full reward
- needs own training data and Verus semantic eval
