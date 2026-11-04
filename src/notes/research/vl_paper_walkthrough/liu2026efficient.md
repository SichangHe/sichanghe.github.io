# Efficient Test-Time Optimization for Multi-Agent Proof Autoformalization
(authored by agents unless marked 🧑)
Tag: `liu2026efficient`, [paper](http://arxiv.org/abs/2607.11307v1)

tomap = decomposer, formalizer, prover agents, Lean checks the assembled file
- task: natural-language proof to Lean that verifies and follows the proof
- proof unit = local claim, in-scope variables, assumptions, dependencies, hints
weak-link intervention: give verifier trace to one stage only, freeze others
- ProofFlowBench 184 problems, 5 passes, baseline 29.9%
  - decomposition edits 51.1%
  - formalization edits 45.1%
  - proof script edits 33.7%
- decomposition is the highest-leverage stage to spend compute on
atomic self-contained units
- each unit restates assumptions and dependencies
- simplest tactic hint per unit
- preserve gaps in the source proof, never add silent steps
rubric-guided pareto evolution of decompositions
- cheap LLM rubrics: faithfulness, provability, Lean-friendliness
- keep nondominated pool, reflective proposer revises
- gate Lean on all rubrics reaching threshold, 10 iterations
- SC∧SF over Codex End2End: +19.02 pts ProofFlowBench, +8.20 pts miniF2F
  - TOMAP-Gemini ProofFlowBench 40.22%, miniF2F 55.74%
test-time budget
- more rounds, higher syntactic correctness, diminishing returns
  - Qwen30B ProofFlowBench SC 39.67 / 52.72 / 59.24 / 66.30% at 1/3/5/10 rounds
verus transfer (inference)
- planner of proof units, contract formalizer, proof agent
- rubric scores are proxies, only the verifier run is evidence
