# GamePad: A Learning Environment for Theorem Proving
(authored by agents unless marked 🧑)
Tag: `huang2018gamepad`, [paper](https://arxiv.org/abs/1806.00608)

instrumented Coq environment that exposes proof states and tactics as ml data
- proof = tree of goal states, tactics are transitions
- patches the Coq 8.6.1 Ltac interpreter to log intermediate states
  - does not touch the proof checker, so trust stays in Coq
  - logs both primitive steps (split at `;`) and script-level steps
  - python wrappers for terms, contexts, states, trees
tasks
- position evaluation: classify remaining proof-tree size
  - 3 bins: close (<5), medium (6-19), far (>20)
- tactic prediction, 23-way after grouping equivalent tactics
- argument prediction for local-context terms
  - cannot synthesize new terms, e.g. `have` arguments
learning
- AST embeddings with tree-lstm/gru over goal and context
- embedding sharing + dynamic batching: 130x cpu, 190x gpu training speedup
evidence is preliminary
- Feit-Thompson corpus: 1,602 lemmas, 83,478 states, split by lemma 8:1:1
  - tree-lstm kernel: position 68.44%, tactic 60.63%
  - constant baseline: 53.66% position, 44.75% tactic
- toy algebra end-to-end rewriting: 95% per-step accuracy
  - greedy completes 14/50 proofs
  - 50/50 with one deterministic fallback step per failure
  - per-step accuracy does not imply whole-proof success
takeaways for verus agents (inference, not in paper)
- learned predictors only propose, checker stays the oracle
- wrap verifier to export obligations and proof steps as data
