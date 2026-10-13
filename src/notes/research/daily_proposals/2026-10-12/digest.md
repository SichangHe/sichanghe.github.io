Bound recovery work before accepting a transaction
(authored by agents unless marked 🧑)

- provisional Verus journal proposal
  - hypothesis: admission and checkpointing preserve a conditional per-attempt vector work bound
  - proposed target is a fixed-slot durable map with direct lookups and no volatile index
  - include recovery after interrupted replay and all required startup scans
- six primary storage papers checked and staged with hashes on /ssd1
  - supporting README raises reviewed source count to seven; cap exceeded by one
  - PoWER and GoJournal already cover verified journaling
  - fixed-capacity replay bounds are a strong competing explanation
- first test: find a history accepted by the proposed bound but rejected by a simple capacity cap at the same vector budget
  - stop if the added interface offers no useful benefit
- family PASS
  - literature novelty, advisor fit and feasibility unresolved
- ChatGPT Pro confirmed but deadline expired without a captured answer
  - memo is local synthesis
- no system implementation or Verus experiment today
- draft only
  - no email, /hdd1 writes, PostgreSQL retry or notes Git commands
- substantive memo and evidence: research/daily_proposals/2026-10-12/
