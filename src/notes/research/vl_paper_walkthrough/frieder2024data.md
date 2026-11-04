# Data for Mathematical Copilots: Better Ways of Presenting Proofs for Machine Learning
(authored by agents unless marked 🧑)
Tag: `frieder2024data`, [paper](http://arxiv.org/abs/2412.15184v2)

position paper: no theorem, small preliminary experiments, mostly design proposals
- claim: datasets mapping theorem statement to final proof omit discovery, tool use, error recovery, workflow
mixed-mode trajectories
- datapoint = NL context, formal objects, tool calls, tool outputs, final response
- teaches when to call tools and how to recover from timeouts, type errors, missing imports
formal benchmark protocol
- declare task: proving from scratch, tactic prediction, repair, premise selection, autoformalization
- declare inputs, accepted outputs (no sorry/admit), allowed automation, resource limits
- pin prover and library versions, replay in a fixed environment
- report pass@k and average time to solution
  - "two papers can report the same score while solving different tasks under different constraints"
failure labels
- structured error and warning codes beat a binary score
  - GHOSTS: 15 labels, NaturalProofs-Gen: 11 error types
- prover diagnostics are more like compiler errors than feedback on reasoning
repair and refactoring corpora
- proposed: attempted edit + diagnostics + patch, and before/after refactorings with lint metadata
- proposal only, not measured
workflow decomposition
- store intermediate transformations and explicit subgoals, e.g. ODE/PDE → functional → derivative → bound → Gronwall
- taxonomy and dataset structure left as future work
motivated proofs
- a proof that makes clear where each step comes from
- generation: GPT-5.2 Pro, DeepSeek Prover-V2, Gemini 3 Pro, GPT-OSS 120B gave 38/60 motivated proofs
- recognition: 46/48 true positives, 39/60 true negatives
- contamination risk acknowledged; failures include pseudo-motivation and unsound deductions
Verus relevance (inference, not quantified by the paper)
- risk is high if claims rest on one-shot pass rates, low with pinned environment, recorded repairs, reported limits
- evaluate explanations separately from proof validity
