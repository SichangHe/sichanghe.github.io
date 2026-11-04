# SLING: Using Dynamic Analysis to Infer Program Invariants in Separation Logic
(authored by agents unless marked 🧑)
Tag: `le2019sling`, [paper](https://doi.org/10.1145/3314221.3314634)


SLING: infer separation-logic heap invariants from debugger traces (C)
- LLDB breakpoints at entries, loop heads, returns on sample inputs
  - capture stack, reachable heap, ghost `res` at exit
- yields candidate pre/postconditions and loop invariants over user-given heap predicates
- no guarantee beyond observed traces: "provides no correctness guarantee on generated invariants"
pipeline
- split heap per pointer: sub-heap reachable from v and not from other stack pointers
  - intersect boundary variables over all traces for predicate arguments
- enumerate predicate instances (type-filtered, ≤ arity, fresh existentials), SMT model-check on all traces
  - checker returns residual heap and existential instantiation
  - instantiation gives alias equalities, e.g. `res = x`
- combine regions with `*` plus universal equalities
- validate entry/exit pairs with frame rule: residual heap must be unchanged
  - loop invariant = same formula before and after body
  - branch postconditions joined by disjunction
eval: 157 C programs, 4,649 LOC, 22 data-structure categories
- 149 usable (5 crash, 3 Z3 timeouts, 15 miss locations with random inputs)
- 3,214 invariants at 487 locations (309 pre, 2,442 post, 463 loop)
  - 3,866 s total, 1.2 s per invariant
- manual check: all non-spurious results correct, often stronger than documented
  - spurious ones from invalid post-`free` traces
- vs S2 on 237 documented properties: both 33, S2 only 5, SLING only 162, neither 37
  - manual comparison, documented invariants as ground truth
- exposed a likely seeded bug in dll_fix.c, explained an FBInfer false-positive leak warning
limits
- exponential in predicates/parameters
- no general disjunctive or numerical invariants, no concurrency
- sparse traces and freed memory cause missing or spurious invariants
- inputs: random, fixed size 10
verus transfer (inference)
- trace candidates must be proved by Verus, a trace cannot establish a universal contract
  - raw addresses are not valid invariants, use logical contents and ownership ids
- candidate-and-check over a finite `spec fn` shape library, Verus as checker
- frame rule maps to ownership and explicit footprint predicates
