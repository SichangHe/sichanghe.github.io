# Push-Button Verification of File Systems via Crash Refinement
(authored by agents unless marked 🧑)
Tag: `sigurbjarnarson2016push`, [paper](https://www.usenix.org/conference/osdi16/technical-sessions/presentation/sigurbjarnarson)

Yggdrasil: file system verification with no implementation annotations or manual proofs
- inputs: spec, implementation (Python subset), consistency invariants
  - symbolic execution, Z3 checks the refinement formula, counterexample visualizer, emits C via Cython and FUSE
crash refinement
- every disk state an implementation can produce, incl. crashes and write reordering, must be producible by the spec
  - operation modeled `f(s, x, b)`, b = crash schedule booleans
  - crash-free runs equivalent; recovery idempotent: `∀s, b. r(s, true) = r(r(s, b), true)`
  - idempotence does not guarantee crashes eventually stop
- lock-step equivalence is too strong; omits reordering, crashes, recovery
- Verus form (inference): ghost disk and crash schedule, refinement lemma with ghost witness
  - automatic Python-to-SMT encoding does not carry over
spec = abstract structure + operations + equivalence predicate
- YminLFS: maps dir/name→inode, inode→parent, inode→metadata, a few lines
  - gives functional and crash safety
- split lets many physical layouts implement one logical API, avoids path explosion
consistency invariants
- checked after init, assumed before and proved after each operation
- same predicate generates an fsck that detects damage but cannot repair
layered refinement scales SMT
- Yxv6: async disk, transactional disk, virtual transactional disk, inodes, file system
  - physical device to async disk is Axiom 1; upper layers use lower spec, not implementation
  - separate disks for independent data expose locality
  - packing into one disk proved a refinement (Thm 6); group commit proved refinement (Thm 7)
- Yxv6+sync verifies in under 1 min on 1 core; group_commit 1.6 h on 24 cores (~36 h on 1 core)
validation and orphaning
- black-box bitmap search: verify a checker of the returned index, not the search
  - does not guarantee allocation succeeds when space exists
- unlink moves inode to orphan disk; later reclamation proved a no-op on visible state
counterexample-guided debugging
- Z3 model rendered as source-linked pending writes, synced writes, crash point
  - missing-flush example: superblock points to unsynced inode map
- optimizer greedily removes flushes and re-verifies; untrusted, output must re-verify
evidence
- Ylog found 2 Arrakis bugs: non-idempotent recovery, garbage after crash during recovery
- Yxv6+group_commit passes `fsstress` and SibylFS (except hard links, xattrs)
  - 3–150× faster than FSCQ, within 10× of ext4 default on 5 benchmarks
limits and trusted base
- trusted: spec, verifier, visualizer, compiler, Z3, Python, gcc, FUSE, Linux; disk model assumes atomic single-block writes
- single-threaded, first-order SMT, finite operations only (loops unrolled, no depth bound)
- no exceptions, coroutines, or C-library calls
- 5 invariants for 1,500 implementation lines; no general proof-effort ratio
