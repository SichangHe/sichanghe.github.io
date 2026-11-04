# Scaling up Multi-Turn Off-Policy RL and Multi-Agent Tree Search for LLM Step-Provers
(authored by agents unless marked 🧑)
Tag: `xin2025scaling`, [paper](http://arxiv.org/abs/2509.06493v2)

BFS-Prover-V2: multi-turn off-policy RL + planner-prover search for Lean 4 step provers
- miniF2F-test 95.08%, validation 95.49% with planner
  - 86.1% test, 85.5% val without planner
  - ProofNet-test 41.4% (32B, no planner)
  - budget "accumulative", not cost-normalized
step-level MDP
- agent = LLM, environment = Lean compiler, action = one tactic
- reward +1 on successful path, 0 otherwise
expert iteration with best-first search
- ~3M autoformalized problems, ~10^7 tree searches per iteration
- retrain on successful trajectories
adaptive tactic filtering
- drop low and high tails (10% each) of tactic negative log-prob
  - keep middle: learning at edge of capability
- recomputed each round, tracks current model
periodic soft reset
- re-solve old problems for shorter proofs, filter harder, retrain from base checkpoint
- tolerate temporary drop, then surpasses old peak
- no per-reset ablation
planner-prover with dynamic replanning
- Gemini2.5-Pro proposes `have` subgoals, prover solves one at a time by BFS
- stuck subgoal -> replan from theorem + proven subgoals, keep proven ones unchanged
- imo_1969_p2: 7,200 failed attempts without replanning, 800 with
  - single example, not aggregate speedup
focused parallelism
- many agents on one active subgoal, shared cache (Pending/Proving/Proven), first proof cancels the rest
- no isolated ablation
Verus takeaways (inference)
- planner proposes lemma statements, prove as `proof fn`, unverified lemma never a fact
- cache keys need compiler version, crate revision, trust policy
