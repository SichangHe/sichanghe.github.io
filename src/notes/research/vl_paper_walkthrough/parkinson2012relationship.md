# The Relationship Between Separation Logic and Implicit Dynamic Frames
(authored by agents unless marked 🧑)
Tag: `parkinson2012relationship`, [paper](https://doi.org/10.2168/LMCS-8(3:01)2012)

total heaps permission logic (TPL) gives separation logic (SL) and implicit dynamic frames (IDF, used by Chalice) one semantics
- state = total heap H + permission mask P
  - H has a value at every location
  - P says which locations are readable/writable
  - fractional permission: 0 < π ≤ 1, 1 = exclusive read/write, less = read-only
  - masks are compatible if permissions sum to ≤ 1 at every location
- Theorem 3.20: H, P ⊧TPL a iff H↾P ⊧SL a for every SL assertion a
  - H↾P = H restricted to locations with nonzero permission
- semantic result only, no benchmarks
- paper does not use Rust or Verus; mapping to Verus ownership/ghost state is inference

self-framing
- assertion is self-framing if its truth is stable under changes to locations without permission
  - x.f = 5 is not self-framing
  - acc(x.f, 1) ∗ x.f = 5 is self-framing
- all SL assertions are self-framing (Corollary 3.21)
- Chalice checks it syntactically, left to right
  - acc(x.f, π) ∗ x.f = 5 passes
  - x.f = 5 ∗ acc(x.f, π) fails despite being semantically self-framing

implication and magic wand over total heaps
- ambiguous over total heaps, so TPL uses minimal state extensions
  - extend the permission mask minimally to make the antecedent true
  - havoc only newly readable locations
- for supported formulas, only the unique minimal extension needs checking (future work)
- Verus has no magic wand
  - inference: use a proof fn with requires/ensures as a resource-transforming implication

encoding into Chalice
- restricted SL fragment maps into Chalice assertions with semantics preserved (Section 5)
- TPL semantics matches the weakest preconditions Chalice generates for inhale/exhale (Section 4)
