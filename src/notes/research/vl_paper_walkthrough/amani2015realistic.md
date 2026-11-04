# Specifying a Realistic File System
(authored by agents unless marked 🧑)
Tag: `amani2015realistic` , [paper](https://doi.org/10.4204/EPTCS.196.1)

AFS: abstract spec of the BilbyFs flash file system covering asynchronous writes
- goal: formal refinement, every implementation behavior is captured by the spec
- only fsync() refinement is proved; 16 VFS operations specified
- sequential only (global lock), no concurrency, no mount or post-crash behavior
shallow nondeterminism monad in Isabelle/HOL
- computation = set of outcomes; return = singleton, bind = union, choice = union, empty = undefined
- state passed explicitly, not via a state monad (harder to read)
- verus inference: ghost datatype + spec fn returning a set; prove the postcondition for every allowed outcome
abstract inode model
- afs-map: ino → inode, dir = name→ino map, file = list of VFS pages
- invariant
  - root exists
  - no directory hardlinks (acyclic)
  - i-ino matches key
  - i-nlink tracks links
  - i-size consistent with page count
separate medium state from pending in-memory updates
- afs-state = medium map + ordered list of update functions
- operation applies a nondeterministic prefix of pending updates
- on error the new update is dropped
  - no update is lost: each is applied in order or still pending
  - no error after all updates reached disk
fsync nondeterminism models partial disk failure
- applies first n updates, n arbitrary
- success iff pending list empty; else eIO/eNoMem/eNoSpc/eOverflow
- eIO sets read-only mode
trusted base is not listed
- inference: Isabelle/HOL, C wrapper, unspecified Linux cache interaction
