# Determinizing Crash Behavior with a Verified Snapshot-Consistent Flash Translation Layer
(authored by agents unless marked 🧑)
Tag: `chang2020determinizing`, [paper](https://www.usenix.org/conference/osdi20/presentation/chang)

scftl: flash translation layer whose flush makes a disk snapshot, so crash recovery is deterministic
- spec state `(volatile, stable, wcnt)`: two sector arrays + write counter since last flush
  - write updates volatile, flush copies volatile to stable, recovery copies stable to volatile
  - crashed flush leaves stable either unchanged or equal to volatile
  - recovery returns the state right before the last successful flush
- fs commits a transaction within one epoch with 1 flush, no journal
  - xv6 group commit changes <30 lines, 3-30x faster than xv6 logging on conventional FTLs
  - weaker durability: only syscalls before the last fsync persist
- random writes: within 5% of async at interval 2048, >14x sync
  - interval 1: half of async, quarter of sync
implementation tricks
- l2p recovery: committed delta pages + occasional full shadow checkpoints
  - crash at any of the 5 checkpoint stages recovers the same l2p via visibility rules
- two-phase gc: relocate first, erase only after flush
  - else rollback to the stable l2p could expose erased data
  - epoch bounds `W+KN<=KS`, `U<=P-1-ceil((W+KN)/S)` guarantee space; must be rechecked per config
proof method
- c implementation verified vs the spec with Agda + Rosette/Serval + Z3
  - 950 lines c, 652 lines Agda, 3946 lines Rosette, ~6 person-months
  - forward simulation: abstraction relation `AR` (normal) and `CR` (crash), invariants `RI`/`CI`
  - per-operation obligations: result relates to a legal abstract successor, invariant preserved
- solver-scaling techniques
  - ghost arrays replace existential witnesses
  - invariants grouped into checkpoint/gc/other, proved separately
  - split nondeterministic crashed-flush into 1 query per outcome
    - monolithic proof failed after days
  - one disk size at a time: 4640 s for 8 GB, 6302 s for 256 GB
gaps
- 3 conditions only checked by a verified runtime validator
  - l2p one-to-one after recovery, space after recovery, space after flush
- obligations massaged by hand for the smt solver, gap bridged on paper
- stress test: ~10k simulated crashes, all recovered
  - checker compared only the first few bytes of each sector
verus takeaway (inference)
- closest template for a systems proof: `spec fn` abstraction + invariants, `requires`/`ensures` per op, crash as weaker relation
- split big invariants into named predicates, 1 lemma per crash outcome
