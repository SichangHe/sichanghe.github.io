# HyperTree Proof Search for Neural Theorem Proving
(authored by agents unless marked 🧑)
Tag: `lample2022hypertree`, [paper](https://arxiv.org/abs/2205.11491)

evariste: transformer prover with hypertree proof search (HTPS)
- backward search: tactic = hyperedge from goal to subgoals, all must be proved
- results: 82.6% cumulative Metamath valid, 58.6% cumulative miniF2F-valid (Lean), 91.3% Equations identities
  - cumulative = training-time coverage, not guarantee on new goals
- supervised-only HTPS: 65.4% pass@32 Metamath valid, 61.2% test vs GPT-f 56.5%/56.2%
  - model, pretraining, data differ, so search not isolated
htps loop
- select: PUCT-like from root, virtual loss for batching
- expand: sample 8-48 tactics per leaf, execute, keep valid, add hyperedges
- backprop: solved=1, invalid=0, else critic; parent value = product of children
  - product assumes independent children: heuristic
- node solved if a tactic has all children solved; invalid if every tactic has an invalid child
- tactic creating a cycle is removed, restart from root
online training
- async provers + controller + trainers, fresh weights pulled periodically
- policy data from minimal proof hypertree; critic targets 1/0/final W/N
  - minimal proofs: Equations 78.1% vs all proofs 40.6%
  - no critic: Metamath 68.6 to 64.8, Equations 78.1 to 65.6
  - soft W/N targets beat hard 0/1 (Equations 63.1)
  - higher refresh rate gives better cumulative rate
- pretrain on 6B tokens arXiv math, then env-specific finetune
environment prep and randomization
- theorem dag, forbid circular dependencies and test theorems
- sample search params per proof; helps Equations 73.8 to 78.1, mixed on Metamath
trust and limits
- kernel checks final proofs, learned parts are heuristic
  - early Equations model exploited approximate numerics to prove 2=3
- no completeness/optimality proof; nothing on Rust
- paper inconsistencies: sec 7.1.2 prose vs table 3; 160 vs 144 identities
verus transfer (inference)
- goal = verus obligation, actions = proof blocks/lemma calls/invariants
- train on verifier-accepted actions, failures as critic negatives
- dependency-aware lemma availability; rerun verifier before accepting
