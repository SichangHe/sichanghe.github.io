# BWoS: Formally Verified Block-based Work Stealing for Parallel Processing
(authored by agents unless marked 🧑)
Tag: `wang2023bwos`, [paper](https://www.usenix.org/conference/osdi23/presentation/wang-jiawei)

bwos: bounded work-stealing queue split into blocks with independent metadata
- owner put/get and thieves steal synchronize only at block boundaries
- lifo and fifo variants
- per-block b_pos, f_pos, s_pos, s_cnt, each packing index + round in one 64-bit atomic
- block advance: get uses takeover, put uses grant
  - takeover: atomic exchange of s_pos with margin; f_pos set to old thief position
  - fifo reuse next block only if its consumer and thieves are at round x-1
probabilistic victim selection
- accept sampled queue with estimated prob S/C by sampling a random block
- optional numa-aware candidate selection
- policy independent of queue correctness
verification by bounded client + weak-memory model checking
- client: 2 blocks of capacity 2, 1 owner, 2 thieves, puts/gets sized to force wraparound
  - final drain; assert sum of put values (powers of 2) = sum of gets and steals
- genmc explores all executions under imm and rc11
  - checks memory safety, race freedom, each element read once, loop termination
  - cannot check per-operation properties
- vsync optimizes barriers
  - lifo: 2 acq, 2 rel, 14 relaxed; fifo: 3 acq, 3 rel, 16 relaxed
  - relaxing any barrier gives counterexample
  - extra thief: passes after 3 days, ~200m executions
- found early lifo bug: thief and owner both reset s_pos; fix delegates reset to owner
- cost: 62 min (lifo), 53 min (fifo) vs 16 min for abp
limits
- finite-size model; no theorem for arbitrary thread counts
- bounded queue; stealing fails when items < block size
perf (microbenchmark, not proof strength)
- 10% stolen: lifo 12.59x over abp; fifo 1.64x-30.1x over bbq, eigenq, tokio, go, kotlin
verus transfer (inference)
- ghost sequence + block invariant for abstract queue
- memory order stays separate obligation (genmc/vsync)
