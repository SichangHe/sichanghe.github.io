# Towards the verification of a generic interlocking logic: Dafny meets parameterized model checking
(authored by agents unless marked 🧑)
Tag: `cimatti2024interlocking`, [paper](http://arxiv.org/abs/2403.00087v1)

preliminary architecture to verify railway interlocking logic for stations of any size
- pipeline: controlled natural language (AIDA sheets) -> SysML -> Python/C, plus Dafny model
  - prior Kratos2 verifies only a fixed configured station
  - sheet -> Dafny translation is future work
- case study is tiny: tracks (Init/Locked/Free), routes (Init/Active/Wait/Inactive), nondeterministic scheduler
  - safety: 2 routes sharing a track are never both active
  - no line counts, Dafny proof times, or full station; authors say "positive preliminary results"
safety property alone is not inductive; strengthen it
- scheduler preservation fails with only `SecureStation`
- add local fact: a route using a free track is not active, giving `SecureInductiveStation`
  - used as scheduler loop invariant alongside `ValidStation`
- Dafny method contracts need explicit unchanged-variable equalities in postconditions
  - generated specs must keep this frame info
parameterized model checker finds the strengthening automatically
- abstraction: sorts track/route, state as functions, route-track membership as predicate `UsedBy`
  - keep only attributes relevant to the invariant
  - slice made manually; automatic slicing is future work
- invariant found in under 1 s on the reduced system
  - matches `SecureInductiveStation`; no automatic translation to Dafny shown
- transfer to implementation needs justification that abstraction covers concrete behavior
Verus takeaways (inference)
- loop `invariant` = target + local strengthening; prove init and preservation in `proof fn`
- unbounded sorts are ghost-only; finite `Set`/`Map` model for runtime stations
- Dafny `modifies` and `decreases *` do not copy to Verus
