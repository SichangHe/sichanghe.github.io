# Storage Systems are Distributed Systems (So Verify Them That Way!)
(authored by agents unless marked 🧑)
Tag: `hance2020storage`, [paper](https://www.usenix.org/conference/osdi20/presentation/hance)

## method

VeriBetrKV applies IronFleet's distributed-system verification methodology to a single-node key-value store with an asynchronous disk. All page references below are printed proceedings pages. Its dictionary contract permits recovery to a consistent earlier snapshot, which must include at least the most recent completed sync. Section 3.1.2 states: “In the presence of a crash, VeriBetrKV is allowed to forget data, but no farther back than the most recent sync.” (p. 102). Recovery may retain newer updates; the contract does not require reverting exactly to the last sync.

The proof connects three descriptions: the application dictionary, a program state machine, and an environment containing a disk and I/O bus. The StorageIOSystem composes program and environment transitions and adds crashes. A crash resets the program and preserves acknowledged writes; unacknowledged writes can leave old, new, or corrupted values (§3.1, p. 102). Section 2.1 states: “VeriBetrKV’s interface is an asynchronous I/O bus that reorders but does not duplicate or, except during a crash, drop messages.” (p. 100). Corruption is allowed at any time, subject to a strong assumption: it cannot produce a block with a valid checksum. Invalid checksums cause the current query to abort (§3.1.1, p. 102).

To apply the method, define the application contract and environment assumptions separately. Prove that the composed storage system refines the contract. Then use Floyd-Hoare preconditions and postconditions to show that each implementation handler matches a program-state-machine transition, including its disk interaction. The implementation proof reasons about a trusted disk interface; the system refinement handles disk behavior and crashes (§§3, 6.2.4, pp. 101–102, 107–108).

Inference: a Verus adaptation could represent the abstract map as ghost state, describe operations with `requires` and `ensures`, and use proof functions for refinement lemmas. It would still need an explicit model of crashes and asynchronous I/O. The paper evaluates Dafny, so it does not establish this adaptation's feasibility or automation cost.

## automation discipline

Section 4 makes slow verification an immediate development task: “If a developer observes a > 20s response time, they are expected to stop work and instead resolve the timeout,” (p. 103). The main remedy is to hide definitions with Dafny's `opaque` annotation and explicitly reveal them where needed. An SMT profiler identifies definitions instantiated too often. The measured outcome is 98.3% of proof units verifying under 10 seconds and 99.0% under 20 seconds (§7.1, p. 108). This discipline was imperfect: 37 proofs exceeded 20 seconds, and 54% of those involved dynamic frames (p. 109).

The language extension uses `linear` for non-aliased mutable values and `shared` for temporarily borrowed immutable values. Static type checking rejects duplicating or discarding linear variables without asking the SMT solver. The verifier can reason functionally about linear sequences while the C++ backend updates them in place and uses explicit deallocation. Dynamic frames remain available for aliasing. The trusted `BoxedLinear` class stores linear values in ordinary heap objects; taking a value requires proving that it is present and records its removal, preventing a second take (§§5.1–5.2, pp. 104–105).

The authors converted a hash table and an in-memory search tree from dynamic frames to linear reasoning. Proof lines fell from 1,678 to 1,063 and from 2,220 to 1,531, respectively: a 31–37% reduction, with comparable runtime performance (Table 2, p. 108; §7.2.2, pp. 109–110). Inference: ownership and tracked resources are candidates for a Verus implementation, but their correspondence to these Dafny extensions needs its own justification.

## evidence and boundaries

The implementation combines a copy-on-write Bε tree, a node cache, indirection tables, and a logical journal (§6.1, pp. 105–106). Inserts enter both the tree and an in-memory journal; a sync writes the journal, avoiding a full tree checkpoint for every sync. Checkpoints reclaim journal space. The proof separates the tree and journal systems, uses a generic cache refinement, and then introduces byte-level storage. A transposition argument rearranges the composed systems so tree and journal correctness can be proved separately (§6.2.3, pp. 106–107).

The application-facing specification is 283 lines (§2.1, p. 100); Table 1 reports 1,210 total specification lines, 6,373 implementation lines, and 44,685 proof lines (p. 108). The system is single-threaded, and liveness is outside the proof (§1, p. 100). The abstract reports HDD insertions 24× faster than BerkeleyDB and 8× slower than RocksDB (p. 99); §7.2.1 reports queries about 4× slower than RocksDB (p. 109). The trusted assumptions cover the application specification, environment interface, verification tools, modified Dafny compiler, C++ toolchain, and checksum routine (§§2.1, 3.1.1, pp. 100, 102). Inference: proof success must be interpreted relative to these assumptions; this case study does not establish universal performance or proof-effort guarantees.

## techniques for the catalog

- state-machine refinement — map every concrete storage execution to an allowed abstract dictionary execution
- crash-aware system model — compose program and disk transitions with crashes and state the recovery contract separately
- decisive automation — resolve checks exceeding 20 seconds by controlling definition visibility and profiling solver instantiations
- linear variables plus dynamic frames — check non-aliasing statically and use heap proofs for flexible aliasing
- modular storage refinement — separate tree and journal proofs through cache templates, composition, and transposition
