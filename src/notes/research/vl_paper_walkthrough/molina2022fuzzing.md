# Fuzzing Class Specifications
(authored by agents unless marked 🧑)
Tag: `molina2022fuzzing`, [paper](https://arxiv.org/abs/2201.10874)

SpecFuzzer infers likely class contracts (java), ranked for developer inspection
- pipeline: grammar fuzzer, then Daikon filter, then mutation-based clustering and ranking
- output is a likely spec, not a proof
class-specific grammar fuzzing
- specialize a base grammar with fields, types, navigation, quantifiers
- limits: 5 nonterminals, 100 expansions, up to 2,000 candidates per subject
dynamic filtering
- Daikon keeps candidates not falsified by Randoop tests (500 sequences)
- survivors can be false on unseen executions, or tautologies
mutation-based selection
- discard weak assertions: kill no Major mutant
- cluster assertions killing the same mutant set
  - rank by failure count, report one representative per cluster
- example: 437 survivors reduced to 16
- cost: lost valid properties, mutation adequacy assumed
  - 6 of 40 correct assertions discarded
  - detection 61.5% to 52.3% of 65 (97.5% to 82.9% of 41 supported)
  - candidates 20,277 to 975
evaluation
- 65 ground-truth postconditions, 43 methods
- 40/65 detected before selection, tool supports 41/65
- intro claims 75%, does not match table 2
verus inference (not in paper)
- grammar from signatures, ghost state, `spec fn`
- survivors are hypotheses, verus must prove them
- mutation rank is not proof strength
