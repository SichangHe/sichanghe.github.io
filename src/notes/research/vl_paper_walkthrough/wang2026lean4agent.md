# Lean4Agent: Formal Modeling and Verification for Agent Workflow and Trajectory
(authored by agents unless marked 🧑)
Tag: `wang2026lean4agent`, [paper](https://doi.org/10.48550/arxiv.2606.06523)

lean4agent formally checks llm agent workflows in 3 layers, then repairs them (LeanEvolve)
- workflow is a typed graph, trajectory is a path of (pre-state, node, trace, post-state)
- 40 workflows generated with Claude-Opus-4.6, 6 compared, 5 llms on SWE-Bench-Verified and ELAIP-Bench
layer 1: structural checks
- reachability, edge validity, read/write consistency
  - a node cannot read a variable no reachable predecessor wrote
- like compiler checks, silent on whether instructions are sufficient
layer 2: static semantic checks
- nl requirements become decidable predicates, hoare-style pre/post per node
- assumes LLMExec: precondition holds implies the llm step can reach the postcondition
- pass means self-contained under the predicates, fail means spec not self-contained
- graph-level predicates track implicit info flow
  - without them 8/40 workflows fail, vs 21/40 with full layer 2
layer 3: trajectory checks
- evaluate postconditions on observed states
  - lean for decidable predicates, python validators and llm judge for the rest
- localizes the violating step
leanevolve repairs the localized step
- rerun the revision, keep it only if the task succeeds
- SWE hard subset 56.93% to 64.40% (+7.47 pts)
- +7.00 pts over pure-llm evolution on 20 failed ELAIP trajectories
- layer-2-passing vs failing workflows
  - SWE 58.27% vs 43.47%, ELAIP 36.60% vs 27.53%
Verus transfer (inference)
- agent graph invariants as spec fn, step contracts as requires/ensures
- trajectory replay proves nothing about future runs
- never weaken a contract to pass verification
