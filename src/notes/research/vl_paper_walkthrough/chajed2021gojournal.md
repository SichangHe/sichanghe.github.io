# GoJournal: a verified, concurrent, crash-safe journaling system
(authored by agents unless marked 🧑)
Tag: `chajed2021gojournal`, [paper](https://www.usenix.org/conference/osdi21/presentation/chajed)

gojournal: go journaling package verified in coq with perennial 2.0 + iris, goose translates go
- goal: app proofs reason sequentially though journal is concurrent and crashes
- ops delay writes to commit time, so crash reasoning is needed only at commit
- locking is not automatic, clients use the verified lockmap
lifting
- spec keeps durable on-disk view and per-op private in-memory view
  - lifting moves durable object ownership into the op view as a logical no-op
  - owned objects cannot be touched by others so sequential reasoning works
crash-aware locks + crash framing
- each lock has invariant I and crash invariant Ic
  - holder must keep Ic at every step of the critical section
- crash framing: private in-memory code proves a plain crash-free Hoare triple, Ic is framed away
atomic commit spec
- success gives new durable state, too-large failure gives old, crash gives old or new
- spec: {Qop * is_op * durable_pred(Pd)} Commit {ok ? Qd : Pd} {Pd or Qd}
layered write-ahead log
- logical list of multiwrites with positions memStart, diskEnd, nextDiskEnd, memEnd
- exports multiwrite list + durable lower bound, hides internals
- crash discards an arbitrary suffix at or beyond diskEnd
- logically atomic specs: lower layer takes callback {P} noop {Q} run at its commit point
- sub-block objects: concurrent reads ok if all recent writes to the block agree on the owned object
evidence
- gojournal 1,345 lines Go, 25,797 lines Coq (19x); simplenfs 462 Go, 3,749 proof (8x)
  - only 44 of 462 simplenfs lines need explicit crash reasoning
- gonfs >=90% of ext4 NFS throughput on nvme/ramdisk; <20% on slow SSD largefile without unstable writes
- proof found an absorption race that unit tests missed, fixed with nextDiskEnd
trusted
- 4KB atomic disk writes, goose model, gonfs unverified concurrency control
verus porting (inference, not shown by paper)
- ghost durable/private views, exclusive ownership, explicit crash model needed
