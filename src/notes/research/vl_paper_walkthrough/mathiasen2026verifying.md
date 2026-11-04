# Verifying Isolation Levels of Database Implementations for Free Using Separation Logic
(authored by agents unless marked 🧑)
Tag: `mathiasen2026verifying`, [paper](https://www.semanticscholar.org/paper/3c7d25b5200cadb9765fa7e39ca7e0ccf930ee65)

free theorem: any implementation verified against the separation-logic specs implements its isolation level
- covers read uncommitted, read committed, snapshot isolation
- Rocq on Iris/Aneris, more than 13000 lines, not Rust or Verus
- conditional: assumes verified clients and trusted Rocq/Iris/semantics/model definitions
- key-value API only, no SQL predicates, no production engine
realistic transactional model
- ops R/W/C with unique ids, transaction = ordered ops ending in one commit
- execution = state/transaction sequence, isolation level = commit test
  - SI: Complete + NoConf; read committed: Preread; read uncommitted: True
- drops unique-write and write-once assumptions, keeps read-own-write
parametric specs
- all resources existentially quantified, so proofs can add trace resources without changing client contracts
ghost trace instrumentation
- wrap each op: fresh id, run op, emit pre/post event; erasable, no runtime cost
- insight: a trace of pre/post events suffices to verify an isolation level
- ValidTrace invariant: linearization points + transactions + execution + commit test
linearization extraction
- atomic specs insert a unique logical point between each pre/post pair
  - coherence: order respects overlap, one point per pair, points unique
- chop points by connection into valid transactions, then pick an execution satisfying commit tests
ghost resource wrapping
- ReflectI, PermissionLin, PermissionPost laws keep ValidTrace under appends
- Wrap(k↦ov) = k↦ov * LatestWrite(k,ov,c), proves read returns own write or snapshot value
inference for Verus
- ghost event sequence + append-only invariant + erasable ghost wrappers
  - needs explicit encoding, no Iris invariants or atomic triples
