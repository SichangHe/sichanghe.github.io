# Reasoning about Weak Isolation Levels in Separation Logic
(authored by agents unless marked 🧑)
Tag: `mathiasen2025reasoning`, [paper](https://doi.org/10.1145/3747515)

formalizes read uncommitted, read committed, snapshot isolation (SI) in Iris separation logic
- all mechanized in Rocq on Iris/Aneris, not Rust or Verus
- verifies an MVCC key-value store (OCaml → AnerisLang) against the SI spec
  - more than 5000 lines of proof
  - single node, in-memory, no predicate reads, no crash resilience
- proves SI ⇒ read committed ⇒ read uncommitted
  - ~800 lines per implication, via authoritative/fragment set resources
modular per-operation specs
- contracts for init, start, read, write, commit over local + global points-to resources
  - local = transaction view, global = store state
- SI: global resources are histories, start snapshots them, commit checks write conflicts
  - commit succeeds iff each written key's current history equals its start history
  - failed commit returns conflict evidence, leaves global state unchanged
- persistent Seen(k,V) resource: observed value/history can't vanish
  - exclusion: observed history is a prefix of the current history
client proofs as regression specs
- bad-history clients proved via invariants opened around atomic ops
  - exclude dirty read, read skew, non-repeatable read
  - write skew proved to commit under SI (not serializable)
MVCC proof layering
- client proxy and server handlers verified separately, shared history/time model
  - Cut predicate: read prefix and model snapshot are both cuts of the history, so equal
inference for Verus
- patterns transfer as design only: ghost seqs for histories, old() for snapshots
  - Verus has no separating conjunction or resource algebra
