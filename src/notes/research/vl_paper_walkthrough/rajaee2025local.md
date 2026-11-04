# Local Look-Ahead Guidance via Verifier-in-the-Loop for Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `rajaee2025local`, [paper](http://arxiv.org/abs/2503.09730v2)

LeanListener: fine-tune ReProver (Lean 4 tactic generator) with one-step Lean feedback
- empirical only, Lean still checks all proofs
step reward from change in open goals
- invalid tactic scores 0, else softplus(goals before - goals after)
  - softplus keeps accepted goal-opening tactics above rejected ones
- no rollout to proof end
- fails on theorems needing more than one step
candidate group per state
- walk human proof states, beam-sample 8 tactics, append the human tactic if missing
- Lean checks each candidate separately, 8-9 calls per state
- training follows human states, so deep states still get signal
- cost ~40 A100 GPU-days, >80% waiting on CPU-bound Lean
GRPO on step rewards works, gain is small
- advantage = (r - mean) / std within group, no critic
- Pass@1 random split 53.21 vs 52.76 for ReProver*, net 9 of 1,992 theorems
  - novel premises 41.11 vs 40.86
  - MiniF2F 36.9 vs 37.7 and ProofNet 14.4 vs 15.3, lower than ReProver*
- valid tactics in top 8: 40.77% -> 51.01%
- up to 20% faster at similar solved count
- no variance, single base model
DPO on accept/reject pairs hurts
- every variant proves fewer theorems than the base model
  - offline 31-36 vs 52.76, online ~50-51
- online DPO still raises valid tactics 40.77% -> 44.75%
- authors guess spurious correlation with longer tactics, untested
- online resampling (refresh every 50 iterations) far better than one-shot offline sampling
better step metrics do not imply more proofs
- read Prec.@8, MAP, MRR alongside proof rate
verus ideas, untested
- reward = softplus(errors before - errors after), 0 for parse/type failure
- build training states by removing proof annotations from verified functions
