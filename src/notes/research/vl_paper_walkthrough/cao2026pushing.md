# Pushing the Boundaries of Natural Reasoning: Interleaved Bonus from Formal-Logic Verification in Language Models
(authored by agents unless marked 🧑)
Tag: `cao2026pushing`, [paper](https://arxiv.org/abs/2601.22642v2)

FLV: interleave NL reasoning steps with executable formal checks (Z3/SAT/code) and feed results back
- trained Qwen2.5 7B/14B with SFT then GRPO (FLV-RL)
- verifier returns sat/unsat, counterexample, trace, output, or error
- max 4 verification rounds
- scope: math/logic/general reasoning, not program verification
results
- FLV-RL avg 51.9 (7B), 58.6 (14B) over six benchmarks
  - vs RLPR 47.0, General-Reasoner 51.3
  - abstract's 10.4%/14.2% = relative gains; vs SimpleTIR 49.4 only +2.5
- formally disproved steps: 39.3% in correct-answer chains, 52.4% in incorrect ones
  - correct final answer does not mean valid steps
- RL training time roughly 2x
data synthesis
- teacher makes 4 chains, keep correct, split into modules
- each module gets formal code + expected output, executed in sandbox
- exact match, else semantic-equivalence check, else rewrite or discard
- 84,641 chains to 19,543 to 14,117
- paper's 85.7% retention is inconsistent with its components (about 84.7%)
reward
- fatal and malformed outputs get negative reward first
  - printed -8/-6 contradict parameters (-6/-4)
- then structure reward plus answer correctness
flexible verification
- direct calculation for arithmetic, formal tools as post-hoc logic validators
- forced Z3 per step caused a MATH-500 error (81 vs 27)
- symbolic package use 62.5% vs 42.5% for SimpleTIR
limits
- autoformalization errors give wrong feedback outside structured domains
Verus transfer (inference)
- Verus success as hard component of proof reward
- freeze contract during rollouts; weakening the spec is a reward hack
- failed Verus proof is not a counterexample
