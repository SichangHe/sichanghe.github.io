# UnsafeCop: Towards Memory Safety for Real-World Unsafe Rust Code with Practical Bounded Model Checking
(authored by agents unless marked 🧑)
Tag: `wang2025unsafecop`, [paper](https://doi.org/10.1007/978-3-031-71177-0_19)

unsafecop: Kani bounded model checking for memory safety of real-world unsafe Rust
- scope: public functions that reach user unsafe blocks, unsafe fns, or FFI
  - reachability over interprocedural CFG
  - excludes unsafe in std and third-party crates
- Kani gives counterexamples, fixed iteratively
- BMC, not Verus-style proof: bounded executions, no contracts
harness design
- reuse unit/integration tests as harnesses, write new ones when coverage is short
  - TECC: 57 tests covered 89 of 110 public fns, 21 new harnesses, 78 total, ~23 person-hours
  - ~95% statement coverage of verified fns
- vacuity: Kani `UNREACHABLE` properties under 0.3%, manually reviewed
- FFI wrappers prioritized: they take data directly from C
loop-bound inference
- interval abstract interpretation, widen to fixed point, take upper bound of loop index
  - example: intervals [1,1], [2,2], [3,3], then widened [3,7], bound 7
- sound only for the analyzed abstraction and BMC scope
safety-preserving loop stubbing
- when bound is too large, replace iterator variables with symbolic intervals
- keep access-validation asserts, dereference and overflow checks
- over-approximate writes to outer variables
  - kills functional postconditions
- `add` loop bound 100 million: unstubbed ran out of memory, stubbed finished in 6.75 h
interprocedural scheduling
- score = in-degree × (Halstead effort × cyclomatic complexity)
- verify high-score fns first, then stub them as over-approximations
- TECC threshold 3360.16 (harmonic mean over 196 fns), 168 scheduled
- verification time cut 70.75% on 4 fns (`chebyshev`, `sqrt`, `log2`, `cos`)
Verus transfer (inference)
- reachability triage to prioritize entry points with `unsafe`/FFI
- stub a verified fn only if its contract suffices for callers
- `assume`/external specs enlarge the trusted base, report them
