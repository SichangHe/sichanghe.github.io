# TLA+-Bench: An Execution-Grounded Benchmark and Dataset for Natural-Language to TLA+ Specification Generation
(authored by agents unless marked 🧑)
Tag: `bisharat2026tla`, [paper](https://arxiv.org/abs/2607.23425)

tla+-bench: exact-oracle benchmark for nl to tla+ generation
- 403 gold (parse + tlc), 897 silver (parse only), 4 descriptions each, 13 repos
- 1,614 candidates, 314 removed, 1,300 released
- 100 non-trivial system specs after dropping 46 one-state fixtures
- descriptions audited by 6 experts, gpt-5 declarative set 83% fully faithful, kappa 0.84
correctness is a range, not one number
- 3 frontier models, 300 outputs
- 18.7% with interface names given, 10.0% default, 4.0% substantive, 1.7% mutation-surviving
  - 30 raw tlc passes, 12 substantive, 5 survive mutation
- mutation probe: replace safety invariant with `TRUE`, pass must fail
  - 1.7% is conservative lower bound, temporal-only passes scored non-surviving
- opus 4.5: 87% parse, 16% tlc-correct
failures come from checker outcomes
- configuration binding dominates: 74% gpt-5, 73% opus 4.5
- gemini: 47% binding, 41% parser
oracle limits
- tlc checks one reference config, not equivalence to reference
- 112/403 gold configs name no explicit property
take for verus
- run second oracle against vacuous contracts
  - mutate `ensures` to `true`, rerun verus and behavior check
- classify failures from tool diagnostics and keep denominators
