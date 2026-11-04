# Storage Systems are Distributed Systems (So Verify Them That Way!)
(authored by agents unless marked 🧑)
Tag: `hance2020storage`, [paper](https://www.usenix.org/conference/osdi20/presentation/hance)

veribetrkv: ironfleet-style refinement for a single-node kv store with async disk (dafny)
- spec: crash may forget data, but not past the most recent completed sync
- model: dictionary spec, program state machine, environment (disk, async io bus) with crashes
  - disk may corrupt data but never produce a valid checksum
- proof: system refines spec; hoare pre/postconditions tie each handler to a state-machine transition
- impl: copy-on-write b-epsilon tree, cache, indirection table, logical journal
  - separate tree and journal proofs, composed by transposition argument
- size: spec 1,210 lines, impl 6,373, proof 44,685
- single-threaded, no liveness
- perf: hdd inserts 24x faster than berkeleydb, 8x slower than rocksdb
trusted
- app spec, io interface, dafny and compiler, c++ toolchain, checksum routine
proof automation discipline
- any check over 20s must be fixed immediately
  - hide definitions with opaque, reveal where needed
  - smt profiler finds over-instantiated definitions
- 98.3% of proof units under 10s, 99.0% under 20s
  - 37 over 20s, 54% involve dynamic frames
linear variables
- linear for non-aliased mutable, shared for borrowed immutable
- type checker rejects dup or discard, no smt needed
- trusted BoxedLinear holds linear values in heap objects
- hash table and search tree: proof lines cut 31-37%
verus relevance (inference)
- ghost abstract map, requires/ensures, proof fns for refinement, explicit crash and async io model
- ownership and tracked resources are candidates, correspondence unproven
