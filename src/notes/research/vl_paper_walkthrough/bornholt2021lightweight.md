# Using Lightweight Formal Methods to Validate a Key-Value Storage Node in Amazon S3
(authored by agents unless marked 🧑)
Tag: `bornholt2021lightweight`, [paper](https://doi.org/10.1145/3477132.3483540)

shardstore (Rust KV node in S3, 40k+ LOC) validated lightweight, not fully verified
- goal: automation, usability, keep correctness as code and spec evolve
- split correctness into properties, one automated checker each
  - sequential + crash behavior: property-based testing
  - concurrency: stateless model checking
  - ub: Miri; deserializer panic-freedom: Crux
- prevented 16 issues from reaching production
  - 5 functional, 5 crash-consistency, 6 concurrency
- evidence is bug finding, not proof: "could not find a bug" ≠ correct
executable reference models as specs
- simple Rust model per component, same interface (index = hash table, not LSM tree)
- ~1% of implementation code
- also serve as unit-test mocks
  - feature changes force model updates or the build breaks
- chose Rust over Alloy/Promela/P for maintainability, at the cost of expressiveness and built-in checkers
- equivalence = same key-value mapping
- Verus analog (inference): model as `spec fn`/ghost state, refinement via `requires`/`ensures`
  - proof covers all executions; executable model is only a test oracle
property-based conformance
- generate op sequences (API ops + background ops like reclaim, clean reboot)
- run model and impl in lockstep, compare outputs, check invariants
- bias args only with quantitative evidence
  - Gets on earlier-Put keys, sizes near page size
- tens of millions of sequences before every deploy
- minimization: bug #9 shrank from 61 ops (9 crashes, 226 KiB) to 6 ops (1 crash, 2 B)
  - needs determinism; order op enum by complexity
- failure injection: `FailDiskOnce`; a Get may fail but never return wrong data
crash consistency
- mutating ops return a `Dependency` pollable for persistence
- persistence: persisted dependency ⇒ readable after crash unless superseded
- forward progress: after clean shutdown all dependencies persistent
- `DirtyReboot(RebootType)` picks per-component flush; per-component flush ops interleaved
- block-level crash-state enumeration found no extra bugs, much slower
- issue #10: UUID spills onto page 2, crash, magic-byte collision on reclaim loses a chunk
  - found and minimized automatically
concurrency
- Rust rules out data races, not atomicity violations
- Loom: sound exhaustive checking, small primitives
- Shuttle (authors'): randomized, large harnesses (>1M atomic steps)
- issue #14: compaction preempted before metadata update, reclamation drops chunk, dangling pointer
  - fix: lock target extents until metadata points to them
- diagnosis stays manual
- concurrent crashing executions not checked
- Verus analog (inference): state-machine specs for the protocol; Loom/Shuttle complement
specialized checks
- Miri for UB (extended to threads/locks, upstreamed)
- Crux proves deserializers panic-free for inputs up to a bound; fuzz beyond it
cost and limits
- artifacts 8,872 lines = ~12% of 72,460 total, ~20% of impl (paper says 12% and 13% in different places)
- 2 FM experts for 9 months + a third for 3 months
- 18% of harness lines last edited by non-FM engineers
- one miss: cache-miss bug caught in review because tests used a huge cache
- not covered: S3 protocol parsing, routing, business logic, some control-plane ops, availability, performance
