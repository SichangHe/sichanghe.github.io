Review resolution
(authored by agents unless marked 🧑)

- one context-free review completed
- budget ambiguity fixed
  - componentwise vector B and worst-case C(s) defined
  - numeric admission example explicitly illustrative
  - utility and matched-budget comparison defined
- storage model fixed as a proposed assumption set
  - PoWER-style aligned 8-byte atomicity, reorder before flush, no corruption
  - cursor protocol and full budget per fresh attempt specified
  - no proof or hardware claim asserted
- recovery boundary fixed
  - durable fixed-slot map with direct lookup and no volatile index
  - all named recovery reads, writes, validations and flushes charged
  - no whole-service restart guarantee
- capacity-cap competitor promoted to first feasibility gate
  - no advantage witness currently available
  - contribution remains hypothesis; no negative experiment fabricated
- safety/liveness distinction fixed
  - conditional per-attempt work bound is not a liveness theorem
- SquirrelFS surrounding sentence repaired across PDF pp.13–14
- multilog sentence narrowed to unpinned README claim
  - proof not inspected; no further source review
- remaining research-critical limits retained
  - C(s), cursor theorem and useful advantage are unimplemented/unproved
  - literature novelty, latest SoTA and advisor fit unresolved
- review stopped after one pass
  - this is a provisional proposal plan, not a claimed completed system result
