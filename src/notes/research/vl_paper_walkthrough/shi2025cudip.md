# CuDIP: Enhancing Theorem Proving in LLMs via Curriculum Learning-based Direct Preference Optimization
(authored by agents unless marked 🧑)
Tag: `shi2025cudip`, [paper](https://arxiv.org/abs/2502.18532)

CuDIP = SFT Lean prover, then iterative DPO over proof states ordered easy to hard
- train on Mathlib4, eval on MiniF2F (488: 244 valid/244 test) and ProofNet (360 of 371 translated to Lean 4)
- best (Mathstral prover + Llama-3.1 score generator) Pass@1: 38.5% MiniF2F valid and test, 12.7% ProofNet
- eval: best-first search, 300 s per theorem
- empirical only, no soundness claim
distance curriculum
- state difficulty = number of tactics to finish the proof
- triplets (s_i, t_i, DIF_i) bucketed by equal distance, ascending order
- initial SFT on whole dataset, not in difficulty order
- Verus analogue needs a remaining-proof-distance measure, which paper does not give
fine-grained preference scores
- per state sample k=32 tactics at temp 1.0 from current prover
- score = n_success / n_attempt, 10 MCTS searches after the tactic
  - MCTS 1000 simulations, depth 10, timeout 60 s round 1 then +30 s per round
  - only 2000 states per curriculum set scored by search
- zero score cannot separate bad tactic from continuation missed in budget
learned score generator
- SFT an LM on the search-scored subset, then score remaining states
  - prompt outputs 0 to 1, 10 samples averaged at temp 0.1
- saves search cost, but calibration and robustness not evaluated
- Verus: use only to rank search, still verify the final proof
thresholded pairing
- keep (s, t_w, t_l) only if score gap > Th = 0.5
- DPO: state = prompt, t_w preferred, t_l dispreferred, previous prover as reference
- discards close alternatives, label noise depends on score accuracy
iterative DPO
- per difficulty band: sample, score, pair, DPO to get P_n
- β=0.1, LoRA SFT, lr 2e-5 base and 5e-6 DPO, 3 SFT epochs, 1 DPO epoch
- 4 rounds, MiniF2F valid 36.0, 36.4, 37.7, 38.5
  - ProofNet 11.6, 12.5, 12.7, 12.7
- stopping: until no improvement, held-out rule unspecified
ablations
- curriculum: 35.6/36.4/12.2 without vs 38.5/38.5/12.7 with
  - confounded: ordering and iteration count both differ
- score generator (FGPS): MiniF2F valid 35.2 vs 36.0, test 35.6 vs 36.0, ProofNet 11.6 both
  - no ProofNet gain, no significance test
prompting
- JSON state in, tactic string out, no sorry
- Verus: JSON of Rust/Verus context, compile and verify, ban assume/admit per policy
