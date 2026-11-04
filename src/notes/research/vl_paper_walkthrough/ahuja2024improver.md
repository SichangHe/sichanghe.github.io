# ImProver: Agent-Based Automated Proof Optimization
(authored by agents unless marked 🧑)
Tag: `ahuja2024improver`, [paper](http://arxiv.org/abs/2410.04753v2)

improver = gpt-4o agent that rewrites a correct Lean proof to optimize a chosen metric
- evaluated on Mathematics in Lean, Compfiles, Mathlib, MiniF2F
- aggregate length: improvement 20.96 vs 3.7 for plain gpt-4o, improved accuracy 35.44% vs 8.31%
  - plain accuracy 100% is meaningless since returning the input counts as correct
  - report improved accuracy, not accuracy
  - "566%/423%/778%" claims are score ratios, not percentage gains
explicit metrics
- length = tactic count, declarativity = typed `have` / tactics, mixed, completion = error count
- metrics can be gamed: unused `have` inflates declarativity, human examples counter it
- selection is correctness first, then metric delta
- verus idea: proof-block size, lemma count
  - fix contract and executable code, never reward dead ghost facts
chain-of-states prompting
- insert the symbolic proof state as a comment before each tactic, from Lean InfoTree
- MIL declarativity ablation: improvement 16.69 with vs 9.23 without, improved accuracy 46.88% vs 28.12%
- verus needs a machine-readable per-step obligation trace, untested
output format and sampling
- string list output best, syntax guidance does not help optimization
- best-of-n plus refinement nested, total m*n calls
  - chosen config: 5-step refinement, each best-of-3, with retrieval
  - final: improvement 34.88, improved accuracy 54.55%
  - picked by factorial testing over 8,640+ combos on small subsets, not exhaustive
retrieval
- mmr over proof-optimization examples, mathlib docs, TPiL handbook
- 10 examples best, retrieval can also distract
proof optimization as theorem proving
- empty input proof makes the agent a prover
- MIL pass@15 39.13% vs 21.73%, MiniF2F-test pass@8 16.39% vs 9.02% for gpt-4o
limits
- high cost, proprietary llms
- harder mathlib proofs improve less
- lean checks correctness but metric and spec adequacy are unaudited
- verus adds ownership, solver instability, perf/panic changes that contract does not capture
