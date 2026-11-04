# Verified Code Transpilation with LLMs
(authored by agents unless marked 🧑)
Tag: `bhatia2024verified`, [paper](https://arxiv.org/abs/2406.03003)

llmlift: verified lifting with an llm as the search engine
- pipeline: search, verify, codegen
  - search: llm writes a program summary (PS) in an IR of target operators
  - verify: prover checks PS equals the source for all states
  - codegen: pattern-rewrite the verified PS into concrete DSL syntax
- source program is the spec, so a wrong source or operator definition is proved consistently
python as the semantic IR
- each target operator is a python function in the prompt
  - avoids hallucinated DSL functions
  - python is well represented in llm training data
- parser rejects candidates using operators outside the vocabulary
- verus analogue: small `spec fn` operator set over `Seq` / `Map`, executable rust only after proof
prompting
- PS zero-shot, invariant one-shot
- invariant template: `Inv ≜ f(i) ∧ e(Tlang)`
  - f(i) bounds the loop index, e is built from target operators over the first i elements
two-phase generation beats joint generation
- generate PS first, then invariants conditioned on that PS
- tensor benchmarks: joint 20/23, two-phase 23/23, same query budget
  - single benchmark, not a general proof
- if no invariant verifies, the PS is assumed wrong
  - assumption only, failure to find an invariant is not refutation
- budget: 50 queries for PS, 10 per PS for invariants
results with gpt-4 at temperature 0.7
- Spark: 44/45 vs MetaLift 40/45
- Domino: 10/10 both
- TACO: 60/60 vs C2TACO 57/60
- tensor: 23/23 both, 95.89s vs Tenspiler 115.14s
  - Tenspiler without its optimizations: 5/23
- baselines needed over ~1,000 lines of search-space or heuristic code
limits
- functional DSL tasks only
  - not aliasing, unsafe, concurrency, or intent-to-spec discovery
- verus adds termination (`decreases`) and effect modeling
