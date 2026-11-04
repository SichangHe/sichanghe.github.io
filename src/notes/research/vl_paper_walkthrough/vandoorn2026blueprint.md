# A blueprint for the formalization of norm-variation of multiple ergodic averages for commuting transformations
(authored by agents unless marked 🧑)
Tag: `vandoorn2026blueprint`, [paper](http://arxiv.org/abs/2608.27321v1)

result: lean 4/mathlib formalization of an ergodic norm-variation bound, "largely automatic" with LLMs
- no denominator: no token/human-hour count, no manual-formalization baseline
- trusted: lean kernel, mathlib, 2 external theorems (e.g. Calderón transference)
- generated informal proofs "not thoroughly hand-checked"
human-fixed structure, LLM fills routine proofs
- human writes statements, definitions, organization, feedback
- LLM runs several passes with detailed instructions, fills routine/analogous arguments, computes constants
  - models: GPT-5.6-Sol-Pro (final editing), Codex 5.6-terra-ultra, Claude Code opus-5-high (cleanup)
- compile lean, repair discrepancies exposed by compilation
- tag machine-generated prose for provenance
forward-chaining blueprint
- after intro, every theorem/definition uses only earlier results or named standard results
- proof directly follows its statement
- verus analogue (inference): spec fn/proof fn in dependency order, DAG easier for LLM to maintain; unmeasured
explicit dependencies and constants
- cite named theorems with explicit parameters
- every inequality gets a named, recursively defined constant, no existential constants
- formalization found "minor discrepancies in the values of explicit constants"
proof architecture
- prove real-variable twisted-average estimate first
- then endpoint permutation, interpolation, Calderón transference, jump-to-variation
- does not transfer to verus: needs L^p/measure libraries or trusted axioms
risk for agent-written verified rust (inference)
- verifier can certify wrong/incomplete spec; imported axioms sit outside checked core
