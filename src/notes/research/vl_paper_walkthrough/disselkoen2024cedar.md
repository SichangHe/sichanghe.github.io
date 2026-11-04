# How We Built Cedar: A Verification-Guided Approach
(authored by agents unless marked 🧑)
Tag: `disselkoen2024cedar`, [paper](https://doi.org/10.1145/3663529.3663854)

verification-guided development (VGD) for the Cedar authorization language, Rust engine
- 3 parts
  - readable executable Lean model as spec, with mechanically proved properties
  - differential random testing (DRT) of Rust against the model
  - property-based testing (PBT) for Rust parts without a model
- result: 4 bugs found while proving the validator, 21 more from DRT and PBT
- division covers 2 risks: model wrong, production Rust diverging from a correct model
proofs on the model
- models: evaluator, authorizer, validator; parsers not modeled
- 7 proved properties
  - forbid trumps permit
  - default deny
  - explicit allow
  - order independence
  - sound slicing
  - validation soundness: accepted policy never gives a type error
  - termination
- model 1,673 lines Lean, proofs 5,714, ratio about 3.4:1
- proofs + model compile in about 3 min
- a termination proof attempt exposed a non-termination bug, soundness attempt exposed 3 more
- custom set/map datatypes, Lean std ones give circular well-foundedness problems
- Verus form (inference): spec fn model + proof fn properties, Lean recursion and collections do not transfer automatically
DRT as model-equivalence evidence
- cargo-fuzz generates requests, entities, policies, run on Lean model and Rust, compare outputs
- agreement is evidence, not proof of equivalence
- generators
  - type-directed ABAC: correlates schema, entities, policies, requests to reach core logic
  - ill-typed-condition variant: valid entity refs, bad condition types, exercises error paths
  - RBAC: many condition-free policies
- audit input distribution
  - 35.5% of when-conditions from the typed generator were boolean literals
  - added an expression generator, literals dropped to 9.7%
- bugs by target: authorizer ABAC 6, RBAC 0, validator parity 4, parser roundtrip 6, formatter roundtrip 2, parser random bytes 0, validation soundness 3
- minimized fuzz corpus kept as CI regression tests
PBT for unmodeled code
- roundtrip on structured policies, random bytes for parser safety, typed policies for validation soundness
- do not present a property test as a Verus proof obligation
limits
- DRT missed a non-termination bug, trigger inputs too improbable
- AST-based generators miss malformed-policy parser bugs, grammar-based mutation is future work
- model, Lean kernel, Rust compiler stay trusted
- full line coverage does not imply effective testing
- data support Cedar's budget only (daily ECS runs, 6 h per target), not universal bug rates
- inference: for agent-written verified Rust, integration boundaries are the risk, VGD makes spec/impl disagreement visible at model-maintenance cost
