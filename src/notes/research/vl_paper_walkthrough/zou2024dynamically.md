# Using Dynamically Layered Definite Releases for Verifying the RefFS File System
(authored by agents unless marked 🧑)
Tag: `zou2024dynamically`, [paper](https://www.usenix.org/conference/osdi24/presentation/zou)

RefFS + MoLi: concurrent in-memory fs with mechanized safety + termination proof (OSDI 24)
- MoLi is a Coq framework; termination assumes fair scheduler + sequentially consistent hardware
- 33.7K-line Coq proof for RefFS
- protocol-level proof of Linux VFS directory locking exposed a deadlock flaw, confirmed and fixed
  - flaw: inode pointer order not transitive with parent-child order (commit 28ecee)
  - found when dynamic layering could not be defined
- trusted: abstraction of RefFS/VFS/FUSE, C compiler, glibc lock + allocator
- no crash, interrupt, exception handling; MoLi soundness proved on paper only
- xfstests found no bugs
definite release: eventual state transition from ownership to release
- ticket lock example: (owner = t.i) ; (owner = t.i + 1)
- spinning thread relies on holder's release; holder guarantees it
- naive version is circular; LiLi forbids a releasing thread from waiting, breaks nested locks
- blocked-loop WHILE rule needs 4 conditions
  - blocked: a holder enables the awaited action
  - dependency: layer of own enabled actions stays below the awaited one
  - metric decreases when awaited action fires
  - metric non-increase
- metric: 0 if lock available else 1 for RefFS locks; t.i - cur.owner for ticket lock
hierarchical layering for nested locks
- layer = path distance from root; a release may only wait on a higher layer
- needs invariant that each inode has one parent
- each lock statement proved independently, proof reused everywhere
- proof cost: <0.4K LOC per lock statement vs 3K for LiLi
dynamic layering for rename
- ghost TDep = None or (inum1, inum2), set only while rename_mutex is held
- dynamic layer = longest waits-for path
- argued new edge never points child to ancestor, so no cycle
non-atomic ops verified via atomic abstract ops
- e.g. mkdir path traversal grouped as atomic abstract operation
Verus takeaway (inference)
- make progress obligations explicit: ghost lock ownership, dependencies, well-founded measure
- layer as spec fn, ordering lemmas, loops with decreases
- no direct Verus equivalent of MoLi rules or fair-scheduler assumption
