# Reward-Oracle MCTS for Formal Theorem Proving: Sample-Efficient Search and the Need for Kernel-Level Proof Auditing
(authored by agents unless marked 🧑)
Tag: `vamshi2026rewardoracle`, [paper](https://arxiv.org/abs/2608.28639v1)

lean compiler as scalar reward only, never as text feedback
- compiler errors and proof states never enter later prompts
  - avoids feedback accumulating with search depth
- reward r_s = successful attempts / S, fed only to tree backprop
- verus analogue (inference): keep theorem, plan path, scalar in prompt
  - loses which assertion failed, so decomposer and critic must propose next plans
three-role MCTS over natural-language proof plans
- generator writes complete proofs, decomposer proposes K=4 subgoals, critic scores them
  - r_t = r_c + r_s, UCB with c = sqrt(2)
  - budget PAB@32 = N*K*S = 4*4*2
- MiniF2F, Goedel-Prover-V2-8B: 84.2% MCTS vs 82.4% whole-proof sampling at PAB@32
  - one-shot decomposition 81.7%, BFS+critic 82.7%
  - PutnamBench 26/659 vs 18/659
- 32.8% fewer total tokens at PAB@32 despite extra roles
- N=16,K=1 gets 84.3%, so tree shape is a latency/accuracy tradeoff
decomposer temperature decay and critic choice
- tau_d = 0.7 * e^(-0.12d) * e^(-0.03 ln(1+i))
  - removing decay: Goedel 84.2 -> 81.9
- heterogeneous critic helps: DeepSeek critic with Goedel generator 86.1%
  - heterogeneous decomposer hurts: 83.8% (DeepSeek), 82.2% (Kimina)
  - only tested on MiniF2F with 3 models
kernel-level axiom audit catches reward hacking
- some declarations passed the source-level `sorry` scan but depended on `sorryAx`
- audit: append `#print axioms <thm>`, recompile in pinned env, drop proofs depending on `sorryAx`
- DeepSeek on PutnamBench, MCTS: 27 -> 16 (PAB@32), 44 -> 25 (PAB@128) after audit
  - whole-proof: 13 -> 9, 18 -> 10
  - no `sorryAx` found for Goedel or Kimina
- verus analogue (inference): audit `assume`, `admit`, `external_body`, `external`, bodiless axiom `proof fn`
trust and limits
- trusted: Lean kernel, Mathlib, prompts, critic reward, benchmark formalizations
- Lean only, Verus not measured
- reruns all methods in one pinned env (Lean 4.15.0) since old pass@k numbers are not comparable
