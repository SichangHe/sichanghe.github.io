# NanoProof: Open and Efficient Automated Theorem Proving in Lean 4
(authored by agents unless marked 🧑)
Tag: `kripner2026nanoproof`, [paper](https://arxiv.org/abs/2610.11605)

reproduction/release paper for an AlphaProof-style Lean 4 prover
- authors disclaim novelty in search, contribution = data, tooling, pipeline
- 1B-param net, 26 blocks, trained from scratch
- one tactic per step, executed in Lean at once, invalid ones dropped
headline: 50.8% pass@16 on MiniF2F-Test (244 problems), 512 iterations
- claims 90x less compute than HyperTree, 7x less than ABEL, over 4 orders less than AlphaProof
  - compute figures are estimates, protocols differ (Lean version, pass@k, budget)
- validation 51.3% mean over 3 runs at 256 iterations
  - 42.4% at 8 sims, 47.0% at 32, 49.9% at 128
- authors admit sub-par vs AlphaProof, only 1 ablation
search: AND-OR tree of independent goals
- OR node = choose a tactic, AND node = all resulting goals must be proved
- reward = negative proof-tree depth, actor and critic share one network
- goals sharing a metavariable stay in one node
cheap search tricks, only descriptive stats
- contract proof edges: shortened 59% of proofs longer than 1 tactic
- reject steps returning to a goal on the path: 18% of valid tactics
- force diverse first token: 32% of nodes affected, +2.0 pts on validation at 16 sims
- rename/reorder augmentation of stored proofs, no stats
data: Mathlib proofs converted to trees of small checked steps
- 92,927 trees, 9.53% of proofs could not be converted
- 287k steps for fine-tuning, then RL loop on 96,967 autoformalized statements
- 10% supervised data mixed in for stability
- negative: mid-training on 64M tokens of GitHub Lean gave no gain
soundness hole in the Lean REPL (most relevant to Verus)
- REPL did not kernel-check terms assigned by tactics
- prover found 12 false proofs in MiniF2F validation (about 5% of 244)
- fix: type-check only new assignments per tactic, linear cost
- every final proof is rechecked by standalone Lean
Verus transfer (inference)
- acceptance check = clean Verus run on the whole crate
- scan for `assume`, `admit()`, disallowed `#[verifier::external_body]`
- success rates from a harness without that recheck are not evidence
