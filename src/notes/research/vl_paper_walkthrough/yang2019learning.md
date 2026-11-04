# Learning to Prove Theorems via Interacting with Proof Assistants
(authored by agents unless marked 🧑)
Tag: `yang2019learning`, [paper](https://arxiv.org/abs/1905.09381)

coqgym: dataset + environment for agents issuing Coq tactics
- 70,856 human proofs from 123 projects, 3,061 files
  - split by project, so no test proof comes from a training project
  - 43,844 train / 13,875 val / 13,137 test
- agent gets goals + full environment, emits a tactic, gets new goals
  - proof = tree of goals (nodes) and tactics (edges)
  - built by modifying Coq, serializing with SerAPI
- synthetic short proofs from intermediate goals
  - make a sub-goal a theorem, leftover sub-goals become premises
  - 159,761 / 109,602 / 79,967 / 61,126 proofs of length 1 / 2 / 3 / 4
  - never used for training, so utility untested
astactic: tactic generator
- TreeLSTM encodes goal and premises, GRU decodes tactic AST under a CFG
  - premise args via attention, integer args via 4-way classifier
  - trained on 190K human proof steps
- test: beam search + DFS with backtracking, ≤300 tactics, 10 min per theorem
  - beam width 20 best: 12.2%, 25 drops to 11.7% (authors' guess: trapped in bad branch)
verifier in the loop + portfolio
- astactic alone 12.2%, hammer alone 24.8% (10 min), combined 30.0%
  - hammer alone 17.8% at default 20 s limit
  - combined typically finds a proof within 10 tactics
- generated proofs average 6.0 steps vs 12.5 over test set, long proofs stay hard
caveats
- no confidence intervals or per-project variance
- Verus analogue (inference): proof-state corpus + verifier wrapper returning remaining obligations
