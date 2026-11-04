# SquirrelFS: Using the Rust Compiler to Check File-System Crash Consistency
(authored by agents unless marked 🧑)
Tag: `leblanc2024squirrelfs`, [paper](https://arxiv.org/abs/2406.09649)

squirrelfs = persistent-memory file system, 7.5k lines of Rust, crash-consistency ordering checked at compile time via typestate
- guarantee is ordering invariants only, not functional correctness
  - "our typestate-based approach can only check ordering-based invariants"
  - transition bodies unverified: a wrong-address cache-line flush slipped through
  - cannot express "all members of a variable-sized set are in state S"; range typestate is the workaround
- trusted: ordering rules, unsafe/flush code, compiler, x86 persistence semantics, vfs locking
synchronous soft updates (ssu) = rules making ordering checkable
- every syscall durable before return, so fsync is a no-op
- 3 rules
  - never point to an uninitialized structure
  - never reuse a resource before clearing all old pointers
  - never reset an old pointer before setting the new one
- rename atomicity via persistent dst-to-src rename pointer, recovery rolls back or completes
- metadata atomic only, file data not atomic
dual typestate = persistence (Dirty/InFlight/Clean) x operation state, as zero-sized generic params
- transitions consume self and return the new-state object, e.g. flush then fence
- prerequisites are typed params, so out-of-order calls fail to compile
- partial order encoded in signatures, independent updates stay reorderable
- rust ownership/locking gives one owner and one state per resource
alloy model + testing covers what typestate cannot
- each transition ~ 1 alloy next-state predicate, bounded traces (2 ops, 10 objects, 30 steps)
  - found missing rename recovery, wrong dependency rules for . and ..
- syntactic checker: each transition mentions every mutable structure (frame conditions)
- chipmunk fuzzing ~24h found no ordering bugs, but 4 bugs in unchecked code
  - 3 volatile-index rebuild, 1 wrong-address flush
- passes 67 supported xfstests
cost
- ~10s compile with typestate check vs ~11h fscq, 1.8h veribetrkv
- within 10% of fastest on webserver/webproxy, 8% and 13% better on fileserver/varmail
verus takeaways (inference)
- keep typestate phantom params for api-misuse checks, add requires/ensures to verify transition bodies
- flush primitive = trusted boundary, needs explicit persistence-ordering spec
- bounded alloy traces are useful counterexample generation, not unbounded proof
