# Communicating State Transition Systems for Fine-Grained Concurrent Resources
(authored by agents unless marked 🧑)
Tag: `nanevski2014communicating`, [paper](https://www.semanticscholar.org/paper/df0f6416cb99fe25b69c1e14a85c29dad43ef1af)

FCSL: concurrent separation logic with resources as communicating STSs
- logic and mechanized metatheory paper, no benchmark
- sound w.r.t. denotational action-tree model (Theorem 1), shallow Coq embedding
concurroid V = (L, W, τ, E)
- L labels, W valid subjective states, τ internal transitions, E acquire/release external transitions
- state = self PCM + joint heap + other PCM
- internal transitions cannot add or remove pointers, external ones do
subjectivity via PCM
- self and other views, undefined composition rejects impossible ownership
- fork splits self, join recombines
- example: incr(i) || incr(j) yields contribution i + j
entanglement U ⋊ V
- synchronizes opposite acquire/release so heaps move between components
- asymmetric, non-associative in general, exchange law (U ⋊ V) ⋊ W = (U ⋊ W) ⋊ V
injection and hiding
- INJECT frames a command verified under U into U ⋊ V, frame must be stable under V
- HIDE installs a resource locally, appears as private heap
- semantic side condition on Φ (fixed other view) is essential
actions (U, A, σ, μ) tie atomic operations to ghost updates
- user is responsible that σ and μ match the real operation
limits
- no automation for choosing PCMs or stability proofs
- linearizability left as future work
Verus transfer (inference)
- ghost monoid with associativity, commutativity, unit lemmas
- ownership tokens or state machines for entanglement, no direct FCSL construct
