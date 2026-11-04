# VeriStruct: AI-assisted Automated Verification of Data-Structure Modules in Verus
(authored by agents unless marked 🧑)
Tag: `sun2026veristruct`, [paper](https://doi.org/10.1007/978-3-032-22749-2_6)

module-level verus synthesis from rust code + unit tests
- generates `View`, type invariants, specs, proof blocks
- planner decides which components needed, then dedicated modules generate each
- verus diagnostics drive repair (m=5 rounds)
- 11 modules / 129 functions: 10 modules solved, 128/129 (99.2%) functions; Node 11/12
  - baseline (iterative whole-annotation prompt, 13 calls): 4/11 modules, 52 functions
  - cost e.g. Bitmap 13 calls / 12.2 min, RingBuffer 12 / 4.2 min
- needs user-supplied comprehensive unit tests
- reason for Node failure not given
`View` maps concrete fields to logical `Seq`/`Set`/`Map`
- hides layout + index arithmetic
- RingBuffer view: `(content, capacity)`, wrapped slices concatenated
- llm view may differ from human ground truth
type invariants via `#[verifier::type_invariant]`
- `closed spec fn inv(&self) -> bool`
- invoke `use_type_invariant(&self)` in proofs
repair modules classify verus errors, apply targeted patches
- classes: parser, type, arithmetic, pre/post, invariant, missing element, mode, old-self, assertion, decreases, redundant invariant
- fixes e.g. `by(nonlinear_arith)`, bounds asserts, `old(self)`, imports
- prompts embed syntax guidelines
  - no ablation isolates syntax guidance or repair
trust (inference)
- verus + smt trusted, llm not
- residual risk: vacuous specs, incomplete tests
