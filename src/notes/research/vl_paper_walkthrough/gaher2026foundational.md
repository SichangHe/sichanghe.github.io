# Bringing Foundational Verification to Real-World Rust Code
(authored by agents unless marked 🧑)
Tag: `gaher2026foundational`, [paper](https://doi.org/10.1145/3839484)

extends RefinedRust: annotated Rust to foundational (machine-checked) Rocq proofs, incl. unsafe pointer code
- prior prototype lacked traits, closures, iterators; this adds them
- case study: parts of ACE security monitor page allocator
- modular: per-function pre/postconditions over mathematical values, verified functions compose
- also checks no UB or panic, incl. integer overflow
refined contracts + loop invariants
- postcondition via `rr::returns`, loop invariant via `rr::inv`
- `for` loops get a `Hist` variable = list of elements emitted so far
- verus analogue: `requires`/`ensures`/`invariant` over processed prefix, `spec fn` for math result
  - `Hist` is RefinedRust-specific, must be written explicitly in verus
trait specs as logical attributes
- e.g. `Ord` gets order relation + transitivity/reflexivity/antisymmetry, `Min` gets minimal element
- every impl must satisfy the base spec, may give stronger instance spec if it implies base
- guarantee only holds if clients are also verified with RefinedRust
- std `Ord` contract is informal, unsafe code may not rely on it
relational iterator specs
- `Inv` = iterator state invariant, `Next s1 e s2` = state transition emitting optional element
- `Next` is an Iris prop so it can carry ownership
- `rr::observe` exposes updated value of mutable reference
higher-order `map` with separation-logic invariants
- client picks `MapInv` strong enough to establish closure precondition and be restored after the call
- non-duplicable ownership emitted by closure goes to consumer, persistent parts may restore `MapInv`
- verus does not support iterator combinators (paper §7), so `map`-style encodings need hand-written adapters
unsafe page allocation by ownership splitting
- page token = exclusive ownership of a memory region, not tracked by Rust types
- `init` is unsafe, exclusivity is a caller precondition
- `Page::divide`: split token ownership manually before the iterator chain, then specify closure and map invariant
- verus analogue: tracked permissions over disjoint ranges, prove partition
limits
- one list example, no aggregate success rate for contracts
- proof only shows written spec holds, not that spec is the real requirement
- Rocq scripts and Iris ownership algebra do not transfer to verus
