# Thrust: A Prophecy-Based Refinement Type System for Rust
(authored by agents unless marked 🧑)
Tag: `ogawa2025thrust`, [paper](https://doi.org/10.1145/3729333)

thrust = automated safe-Rust verifier: refinement types + prophecy variables + CHC solving
- compiler plugin over optimized MIR, Spacer (Z3 4.13.0) as solver
- generates refinement templates, collects subtyping constraints as CHCs
- infers loop invariants, recursive-function summaries, functional postconditions
- optional `requires`/`ensures` annotations as hints to the solver
  - needed e.g. for nonlinear arithmetic (2 annotation lines each)
- proved: soundness of core calculus λCOR, assuming well-borrowedness from the borrow checker
  - completeness not proved; "unsafe" verdicts were manually confirmed

key design ideas
- strong updates from aliasing XOR mutability
  - two `&mut` never alias, so write through the selected one updates precisely
  - Flux cannot do this when the target is chosen dynamically (singleton-typed strong refs)
- prophecy per mutable borrow
  - borrow = ⟨current, prophecy for value at release⟩
  - at release fix prophecy to current value, owner then sees the update
  - reborrows chain prophecies
- logical variables are immutable snapshots
  - refinements mention only implicit and prophecy variables, never mutable program variables
  - cost: many implicit variables, heavier CHC load
- higher-order functions and ADTs
  - refinement types on function parameters, checked by subtyping
  - predicate variable per element type of polymorphic collections
  - λCOR lacks general recursive ADTs and free variables in functions

evidence
- 32-row benchmark (4 categories × 4 programs × safe/unsafe), 180 s limit
  - Thrust correct on all 32
  - RustHorn, Flux, Prusti each give unknown/abort/timeout on some rows
  - RustHorn aborts on all 8 `ho-funs` rows
- small set, not general superiority
- sometimes slower than RustHorn on RustHorn's own benchmarks (stricter MIR interpretation)
- scope: safe Rust only, interior mutability and unsafe code left open

Verus translation (inference)
- refinement = `requires`/`ensures` on exec fn, loop facts as `invariant`
- prophecy = ghost future value, `old(x)` for entry value
- Verus has no CHC inference, workflow is solver-assisted invariant discovery then explicit proof
