# The Output-Space Hypothesis: Enumerative Equivalence Checking for Tensor Programs
(authored by agents unless marked 🧑)
Tag: `biberstein2026outputspace`, [paper](https://arxiv.org/abs/2609.19611)

output-space hypothesis: tensor bugs are sparse over input values, dense over output locations
- Dirigo checks equivalence of tensor programs (Python/C++/CUDA) with symbolic execution + Z3
- 6,988 AI CUDA Engineer level-2 programs that differential testing marked correct
  - 600 buggy (8.6%), 97.3% found within 2 min
  - 374 found by Execute (safety/model violations), 226 by Check (inequivalence)
  - 3,341 correct at reached locations, 1,175 timeouts, 1,872 unsupported
  - 218 of 226 Check bugs exposed by first sampled location
- bug finder, not a proof
  - reports only replay-confirmed counterexamples: complete, unsound
  - unsat per-location query proves equivalence at that location only, under modeling assumptions
  - needs input-independent control flow and addresses, fixed shapes
quantifier flip
- fix one output location, solve for all inputs symbolically, enumerate locations
  - makes the SMT query tractable
- unknown if fewer than 5 locations checked in budget
- location priority: corners, path-condition coverage, tensor boundaries, random
pipeline: trace, merge, execute, check
- trace: TorchDispatchMode, `at::RecordFunction`, `LD_PRELOAD` CUDA shim
- merge: SSA, trim common prefix/suffix (only prefix trimming enabled)
- execute: Torch ops via lowerings, CUDA via PTX symbolic execution
- check: Z3 per location, backward-substitute SSA equations to shared inputs
  - witness replay on original programs, autodiff to invert through trimmed prefix
cuda modeling
- symbolic tid/bid: one logical thread covers all physical threads
  - split on predicates over tid/bid; median 3 logical threads, p90 15
- shared memory: pending writes committed at `__syncthreads`, SMT overlap check flags races
- warp shuffle: barrier, pick source lane by satisfiable predicate; undefined ⊥ flagged only at observable sinks
- ints as bitvectors, floats as reals
  - approximation axioms (GELU erf/tanh, fast-math) on by default; must be explicit assumptions in Verus
no Verus integration implemented
