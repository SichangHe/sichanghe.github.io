# Learning to Reason in Large Theories without Imitation
(authored by agents unless marked 🧑)
Tag: `bansal2019learning`, [paper](https://arxiv.org/abs/1905.10501)

deep RL premise/tactic selection for HOList (HOL Light) with no human proof traces
- ~10,000 candidate premises per step is the branching bottleneck
- GNN scores tactics and premises; top-k premises per tactic; BFS over applications
- Verus inference: rank lemmas for a failing VC, but Verus must always re-check
RL loop
- provers run in lockstep with training; new proofs join training data
- needs non-empty start: try all training theorems with a random model
- stalls without new proofs, so exploration list `Q` is mixed with exploit list `P`
tf-idf exploration
- goal as query, theorems as documents, cosine similarity
- boolean weighting best: recall@128 0.31 vs 0.21 log vs 0.11 natural
- dropout 0.1 on goal vector diversifies retries
over-approximating premises
- MESON success with 1/2/4/8/16/32 random extra premises: 0.995, 0.986, 0.97, 0.873, 0.53, 0.06
- REWRITE unchanged rates: 0.99 down to 0.731
- Verus inference: Z3 tolerance must be measured separately
greedy pruning
- drop last premise if the step is unchanged, going backward
- dropped premises become hard negatives; exploration premises not learned from
