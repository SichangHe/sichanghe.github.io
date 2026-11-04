# Verifying vMVCC, a high-performance transaction library using multi-version concurrency control
(authored by agents unless marked 🧑)
Tag: `chang2023vmvcc`, [paper](https://www.usenix.org/conference/osdi23/presentation/chang)

vMVCC: go in-memory kv transaction library with a coq proof of strict serializability
- first mvcc transaction library with a machine-checked correctness proof
- 827 lines go, 11117 lines coq (~13 proof lines per impl line)
  - Perennial extended with Iris prophecy support
- limits: in-memory only (no durability), no range scans, assumes hardware timestamps are monotonic across cores
core difficulty: linearization point (timestamp generation) is before the transaction body runs
- prophecy variable: predicted future-action list of reads and commits with symbolic write maps
  - apply predicted updates at the linearization point only if conflict-free, else treat as abort
  - abort = commit with empty write set
  - invariants: linear view is a prefix of the speculative view, speculative last value = logical value
  - reason over symbolic families of predictions, not concrete timestamps
- ghost slots prove strict timestamp monotonicity
  - register a ghost callback at slot `t'`, invoke callbacks as RDTSC advances
  - other threads may run the callback (unsolicited helping), justified by Iris later credits
- gc through a monotonic safe timestamp `ts_safe`
  - weaken the abstraction below it, require later accesses `t >= ts_safe`, then delete old versions
bug found by verification
- `tidmin` initialized to `MAX_U64` lets a new transaction get an id below the gc timestamp
  - fix: generate the safe timestamp within each site
  - scanning only active ids is insufficient, future allocation must be bounded too
- also a missing wait loop and `>` vs `>=` errors
application interface: logically atomic `Run`
- body proved sequentially with exclusive resources
  - spec swaps abstract map `m` satisfying `P` for `m'` satisfying `Q`, abort preserves `m`
  - `P`,`Q` pure, cannot encode other ownership
verus takeaway (inference)
- no verus adaptation in the paper
- would need sound prophecy rules and a concurrent logically-atomic spec
  - recording a predicted future in ghost data and checking later does not justify the early logical update
