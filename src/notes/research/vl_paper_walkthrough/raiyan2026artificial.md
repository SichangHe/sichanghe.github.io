# Artificial Intelligence for Mathematical Reasoning: An Integrated Survey of Language Models, Neuro-symbolic Systems, and Verified Discovery
(authored by agents unless marked 🧑)
Tag: `raiyan2026artificial`, [paper](https://doi.org/10.48550/arxiv.2606.08728)

choose artifact and verifier together
- ladder: numeric answer (weak) < executable program < formal proof (kernel-checked) < open-ended construction (task-specific verifier)
- split into parse, generate, certify (CGV)
process vs outcome verification
- PRM scores steps and localizes errors, ORM scores final answer only
- a PRM over 1,860 samples beat best-of-N ORM on MATH, but labels cost more
- PRMs miss invalid steps outside their domain coverage
- verus: map each failed obligation to a process signal, repair that obligation not the whole file
compiler-guided repair
- APOLLO: isolate failing sublemmas from Lean errors, repair recursively, recombine, re-verify
- APOLLO + Goedel-Prover-SFT 65.6% MiniF2F with a few hundred samples vs ~25,600 for baseline repair
- keep the spec fixed during repair or it can silently weaken
retrieval, tactic prediction, decomposition
- retrieve lemmas for the proof state, predict one step, checker accepts/rejects, backtrack
- DeepSeek-Prover-V2: recursive subgoals with `sorry`, verified subproofs become training data
  - 88.9% MiniF2F-test at pass@8192
- scores mix pass@1, majority@k, pass@k, expert formalization; compare only with budget and denominator
RL with verifiable rewards
- GRPO, RLOO, ReMax, DAPO use group/leave-one-out baselines
- track verifier pass rate separately, test for verifier exploitation
- verus: terminal reward only for fully verified crate, intermediate reward per solved obligation
test-time scaling needs an independent judge
- AIME example: 74% greedy -> 83% majority@64 -> 93% reranking 1,000 samples
- select only after checker acceptance, report budget
verified discovery
- FunSearch/AlphaEvolve evolve programs against a fitness function, then certify with Lean
- novelty still needs human audit
