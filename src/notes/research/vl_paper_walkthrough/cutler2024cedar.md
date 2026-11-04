# Cedar: A New Language for Expressive, Fast, Safe, and Analyzable Authorization
(authored by agents unless marked 🧑)
Tag: `cutler2024cedar`, [paper](https://arxiv.org/abs/2403.04651v2)

verified-by-design authorization language, Rust engine + Lean model
- policies: permit/forbid, principal/action/resource scope, conditions
- deny by default, forbid beats permit, deterministic and terminating
- division of roles: Rust engine, Lean spec+proofs, validator, SMT compiler, tests
lean proofs
- validation soundness, forbid trumps permit, default deny, explicit allow, sound slicing
  - validation soundness assumes conforming request/entity store with defined entity refs
  - validation does not show a policy grants intended permissions
- symbolic encoding sound + complete proved on paper, lean proof of full encoder underway
schema-directed validation
- typecheck each policy per action environment
- capabilities guard optional attributes, singleton True/False types prune erroring branches
sound policy slicing
- index policies by principal/resource scope, evaluate only matching ones
  - proved excluded policies cannot match
  - speed mixed: ~18% faster on github, ~94% slower on gdrive
symbolic compilation to SMT
- finds equivalence/subsumption counterexamples across all schema-conforming inputs
  - ground constraints for entity hierarchy, avoid quantifiers
- tens of ms per query, e.g. github 27.1 + 33.8 ms (encode + solve)
model-to-Rust differential testing
- random policies/stores/requests through compiled lean model and Rust, plus parser/printer fuzzing, in CI
  - found ~2 dozen bugs, keeps spec and proofs in sync
- sampled tests, not universal correctness
perf: 28.7-35.2x faster than OpenFGA, 42.8-80.8x faster than Rego
- excludes storage, parsing, init, HTTP
verus takeaway (inference)
- executable reference needed as fuzz oracle, `spec fn` cannot serve
- lean typing/metatheory must be reimplemented explicitly, not carried over
