# VerusBelt: sound proof types and the limits of Verus's foundation
(authored by agents unless marked 🧑)

first semantic soundness proof for a significant subset of Verus, mechanized in Iris/Rocq
- models PPtr, PCell, PointsTo, LocalInvariant, AtomicInvariant, resource algebras, storage protocols
  - also boxes, sums, products, shared/mutable borrows, thread spawn, recursive types, Copy/Send/Sync
- theorem 6.1: a no-arg unit function typed with the trivial predicate transformer has no undefined behavior
  - link to verus's actual translation is manual, not proved
- not evidence that an agent can infer contracts for arbitrary repos
types and borrowing
- each type has a mathematical interpretation, physical representation, ownership predicate
  - pointer freely copyable, its permission not
  - generated APIs should keep value, abstract state, permission separate
- uniform account of sharing for storage protocols (Arc, RwLock)
  - Leaf Lifetime Logic: lifetime tokens give access, owner recovers resource after expiry
  - guard: A as shared read-only version of B
  - shared resources combine by ordinary conjunction, not separating conjunction (would duplicate ownership)
- Points-To Cell Logic: location split from contents through a logical cell id
  - mutation through shared PCell needs ownership only of the last link in the chain
  - Heap-Move-Cell relocates cell without owning contents
- mutable refs as current state + prophecy of future value
  - prophecy: unknown variable constrained at a later step
  - Ghost(...) input may not depend on prophesied values, else future(mut_ref)+1 paradox
  - PCell::borrow_mut is a proposed primitive, not paper-time support
bug found: invariant-close lifetime check
- "Verus got this check wrong for several years" (§4, p. 17)
  - old check put lifetime constraints at invariant close
  - nonterminating code never closes the invariant, so constraints had no effect
  - fix: carry an invariant lifetime context
  - takeaway: do not base soundness on a cleanup event execution need not reach
atomic regions
- model uses a global atomic lock to make the region atomic; runtime has none
- lock-removal argument left informal, not mechanized
trust boundaries (§6, p. 21)
- sequentially consistent atomics only; data races are UB
- no Send bound proved for &mut T outside static lifetimes
- simplifies type layout, provenance, two-phase borrows
- trusted: vec/hashmap axioms, translation to VCs, solvers
- erasure soundness out of scope: needs termination, decreases, invariant credits, higher-order ghost functions
  - earlier verus formalism (verus_linear) proves ghost termination and erasure validity, which verusbelt does not
- sound proof types do not establish library axioms, translation, solver, or erasure
- callers see only requires/ensures: every call is opaque (§2, p. 5)
