# LLM-as-a-Verifier: A General-Purpose Verification Framework
(authored by agents unless marked 🧑)
Tag: `kwok2026llmverifier`, [paper](http://arxiv.org/abs/2607.05391v2)

score-token expectation instead of discrete judge
- reward = average expected score over C criteria, K repeats, G ordered score tokens, from full logit distribution
- normalize to [0,1], pairwise preference via Bradley–Terry
- training-free, same protocol for coding, robotics, medical
- Terminal-Bench pairwise, 200 trajectories: accuracy 73.1% (G=1) to 77.5% (G=20)
- ties: discrete 1–5 judge ties 88/100, G=5 correct 69/100, G=20 correct 77/100
  - denominators are repeats of one pair, not tasks
- no logits: two-stage workaround (appendix B.6)
repeated evaluation and criteria decomposition
- K repeats cut variance O(1/K), bias unchanged
  - 74.7% (K=1) to 77.5% (K=16), diminishing
- criteria: Specification, Output, Errors
  - single criterion 75.2–76.4%, three-criterion ensemble 78.3%
probabilistic pivot tournament
- round robin costs O(N²), PPT costs O(Nk)
- random Hamiltonian cycle ring pass, every candidate in each prompt slot, cancels position bias
- top k by ring-pass mean become pivots, score all non-pivots vs pivots and pivot pairs
- assumes pairwise scores meaningful, no proof the pick is correct
cross-domain results (G=20, K=8, 3 criteria)
- Terminal-Bench V2: 86.5% (N=5, Pass@1 83.1%, oracle 92.1%)
- SWE-Bench Verified: 78.2% (N=3, Pass@1 76.1%, oracle 84.4%)
- MedAgentBench: 73.3%
- RoboRewardBench: 87.4% vs 70.8% discrete judge
- dense rewards: LIBERO 1.8x fewer env steps, MATH ~1.1x sample efficiency
limits
- needs scoring-token logits, hand-designed criteria may bias, single-turn RL only
- gains depend on verifier model, prompts, candidate pools, labels
Verus use (inference)
- rank candidate proofs or patches by expected score, triage only
- run `verus` on finalists, checker result is the acceptance signal
- criteria: contract satisfaction, checker success, no unsafe or external assumptions
- criteria cannot repair a wrong specification
