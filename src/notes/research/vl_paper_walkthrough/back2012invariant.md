# An Exercise in Invariant-based Programming with Interactive and Automatic Theorem Prover Support
(authored by agents unless marked 🧑)
Tag: `back2012invariant`, [paper](https://doi.org/10.4204/EPTCS.79.2)

Socos: diagram-based invariant-based programming (IBP), invariants written before code
- VCs from weakest preconditions, discharged by PVS and Yices
- diagram correct iff transitions consistent, intermediate situations live, loops terminate
  - consistency: P_X ⇒ wp(S, P_Y) per transition
  - liveness: postcondition reachable, no miracles
  - termination: well-founded function per strongly connected component
- check consistency incrementally after each added transition; liveness/termination can be deferred
background theories drive automation
- prove reusable lemmas once (perm_len, perm_trs, swap_perm, ...), disable auto-rewrite of perm/swap so Yices treats them as uninterpreted
  - authors: about half the time for a new domain goes to background theories
- applying lemmas to individual transitions was fully automatic
heapsort case study
- BUILD_HEAP and TEAR_HEAP loops with heap/partitioned/sorted invariants, siftdown with variant n-k
- failure exposed a corner-case bug: n = r(k), only left child in range
  - guard n < r(k) fixes consistency but breaks liveness; fix is n ≤ r(k) plus a swap branch
  - "easily missed even with extensive testing"
- automation gap in TEAR_HEAP closed with 2 assertions and 2 background lemmas
proof escape hatches
- interactive PVS proof, `assert` to isolate, helper lemma, or `assume` (gives consistency, loses liveness)
- too many helper lemmas can hit SMT time/memory limits
limits
- single algorithm, no timings or benchmark; scaling unshown
Verus takeaways (inference)
- invariant design is the bottleneck for agent-written code; SMT only closes routine arithmetic after it exists
- prefer proved lemmas/assertions over `assume`/`external_body`, they enlarge the trusted base
