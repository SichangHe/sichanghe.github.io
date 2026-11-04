# Verifying the DaisyNFS concurrent and crash-safe file system with sequential reasoning
(authored by agents unless marked 🧑)
Tag: `chajed2022daisynfs`, [paper](https://www.usenix.org/conference/osdi22/presentation/chajed)

daisynfs: concurrent crash-safe nfs server, fs ops verified with sequential dafny proofs
- gotxn (coq/perennial) adds 2-phase locking + allocator on gojournal, gives concurrency and crash atomicity
- each fs op wrapped in one transaction
- correctness: concurrent crash-safe refinement to abstract nfs state machine
  - abstract state: inode map to files/dirs, links not a tree
  - each op a nondeterministic transition predicate
simulation transfer
- sequential refinement of safe transaction bodies implies concurrent crash-safe refinement (theorem 2)
- safe: shared state only through the txn interface, no globals
- crash condition only on abstraction-related states, no ephemeral state in txn/nfs layers
2pl proved locally
- per txn: map J of first-read values, footprint = dom(J), holds all locks in footprint
- commit reproduces observed execution atomically, no global conflict graph
- allocator is an exception: releases lock early, any address allowed, fs validates against durable bitmap
engineering around limits
- renames lock inodes in numeric order, error returns needed inode set for retry (not proved deadlock-free)
- deletes exceed 511-block txn limit: unlink then ZeroFreeSpace txns, proved logical no-op
- zero-check on grow, unverified glue zeroes and retries
evidence
- fs 6,787 proof / 4,051 code / 630 spec lines (~2x); txn system ~20x
- ~60% of linux ext4 (data=journal) on smallfile, comparable on largefile
- scaling limited by gojournal lock serializing installs
- bugs found in unverified code and spec (decoder allocating 2^32 bytes, parser panics, rename overwrite, inode subset type bound)
- crashmonkey two-op tests found no bugs
trusted/excluded
- go dispatch loop, wire encoding, dafny-to-coq link, primitive libs, disk persistence
- no liveness or deadlock-freedom, no unstable writes, symlinks, hard links
verus porting (inference, not shown by paper)
- restrict shared state to a transaction api, per-op sequential contracts, ghost abstract fs state
