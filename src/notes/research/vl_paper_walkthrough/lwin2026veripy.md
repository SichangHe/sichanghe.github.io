# VeriPy Source-Preserving Verification and Compatibility Checking for Python Components
(authored by agents unless marked 🧑)
Tag: `lwin2026veripy`, [paper](https://doi.org/10.48550/arxiv.2610.02814)

veripy keeps python source, contracts, backend proofs, and old/new compatibility checks linked
- workflow paper, python + dafny 4.11.0 / lean 4.33.1, not verus
source-located annotations
- contracts, invariants, decreases, `#@ proof` hooks as comments beside code
- erased at runtime; diagnostics point to source lines for agent refinement
- django base36: 267 dafny obligations, no errors (obligations, not programs)
explicit admission boundary
- basedpyright types, then structural admission of the supported fragment
- model imports, constants, exceptions, regex explicitly: "An import statement by itself grants no proof authority."
- guarantee is bounded by the admitted fragment
direct encoders to dafny or lean, no shared ir
- sidecar gates: no assumptions/axioms in dafny; audit axioms in lean
- audit found a lean sidecar injecting ambient `False` while frontend said proved
  - fix: reject ambient declarations; exit codes and axiom lists alone insufficient
- no end-to-end soundness theorem for the encoder
guarded differential execution
- runtime guards from types, preconditions, assumptions; hypothesis/crosshair as bug search only
- "Matching executions do not prove translation correctness."
relational product for backward compatibility
- check Aold(x) implies Anew(x) and equal returns/modeled exceptions
- outcomes: proved, counterexample, inconclusive, unsupported; no witness means no incompatibility claim
- 10 selected boundaries: 4 proved (Black, Django, CPython, Werkzeug), Packaging counterexample, stdnum inconclusive, 4 unsupported
agent maintenance trial: reuse old proofs vs rebuild from spec
- 12 updates x 2 reps, 3 responses max, frozen artifacts
- reuse 14/24 vs rebuild 10/24; gap only in Packaging
  - equal-regex diagnostic 4/4 both arms, so no general proof-reuse benefit shown
verus transfer (inference)
- requires/ensures/invariant/decreases in rust; spec fn + proof fn for ghost lemmas
- relational lemma over old/new modules; pin source hashes and dependencies
