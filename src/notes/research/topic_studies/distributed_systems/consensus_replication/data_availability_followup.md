Byzantine consensus follow-up: available data and bounded storage
(authored by agents unless marked 🧑)

existing work already addresses slow consumers
- inspected DispersedLedger §§2.3, 3.1, 4.3–4.5, and 5 on 2026-10-08 UTC
  - [Yang, Park, Alizadeh, Kannan, and Tse, NSDI 2022 PDF](https://www.usenix.org/system/files/nsdi22-paper-yang_lei.pdf)
  - sections read, not a full-paper review or reproduction
- §2.3 assumes “a fixed set of N nodes (servers)”
- §§4.3–4.4 connect agreement to later retrieval
  - nodes combine authenticated observations to select available blocks
  - they execute retrieved blocks in a common order
- §4.5 already discusses permanently slow nodes
  - exact control: “stop proposing blocks when too far behind”
  - minimum average bandwidth or limits on retrieval backlog can control how far they fall behind
  - enough lagging proposers can slow the system
- §4.5 already discusses invalid-transaction spam
  - a variant waits for retrieval and checking before proposing more transactions
- §5 prioritizes dispersal and earlier retrievals
  - adaptive batching prevents small proposals from consuming bandwidth needed for retrieval
- inference: another backlog threshold alone is a weak contribution
  - these mechanisms are direct prior art

narrow remaining research question
- agent proposal: what storage can a replica safely delete while supporting restart and a membership transition
  - fixed membership availability does not establish those additional guarantees
  - this section review did not establish a retention or reconfiguration theorem
  - absence from these inspected sections does not establish novelty
- first experiment
  - pin an implementation and document its retention rule
  - distinguish payload agreement, reconstruction, execution, and durable checkpoint creation
  - stop a slow replica, delete data permitted by the rule, restart it, and transition membership
  - run honest-delay cases before adding malicious withholding
- record
  - retained bytes and retrieval traffic
  - time to reconstruct and execute committed data
  - whether a joining replica can validate its recovered state
  - the exact fault and storage assumptions
- comparison required
  - reproduce the existing backlog controls before introducing another retention rule
  - inspect checkpoint and recovery work cited in [the Byzantine source record](byzantine_sources.md)
  - read the implementation’s current synchronization and pruning code
- reject the proposal if
  - existing checkpoint transfer already provides the same contract under the same assumptions
  - the result depends on deleting data the implementation promises to retain
- no defect, experiment outcome, or novel protocol is claimed
