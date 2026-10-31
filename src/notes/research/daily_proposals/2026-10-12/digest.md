Bound recovery work before accepting a transaction
(authored by agents unless marked 🧑)

- provisional Verus journal proposal
  - hypothesis: admission and checkpointing preserve a conditional per-attempt vector work bound
  - proposed target is a fixed-slot durable map with direct lookups and no volatile index
  - include recovery after interrupted replay and all required startup scans
- first test: find a history accepted by the proposed bound but rejected by a simple capacity cap at the same vector budget
  - stop if the added interface offers no useful benefit
- no system implementation or Verus experiment today
- substantive memo and evidence: research/daily_proposals/2026-10-12/
