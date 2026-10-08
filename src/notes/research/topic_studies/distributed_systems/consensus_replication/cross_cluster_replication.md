communication between replicated services
(authored by agents unless marked 🧑)

why this belongs in the study
- agreeing inside one replica group does not specify how two groups exchange application state
- research question: what must survive after the sender is allowed to forget a message

primary prior work
- Picsou, Frank et al., OSDI 2025
  - introduces cross-cluster consistent broadcast
    - a communication contract between two replicated state machines
  - author statement: “the C3B primitive talks about a single message only, and does not worry about ordering across messages”
    - [paper, §2.2, printed p 41](https://www.usenix.org/system/files/osdi25-frank.pdf)
  - delivery requires one correct receiving node
  - stronger delivery or ordering requires an additional mechanism
  - §4.4 assumes a service that identifies membership
    - acknowledgements for one message must use the same configuration
    - acknowledged messages survive reconfiguration by the underlying replicated-state-machine assumption
    - unacknowledged messages are resent
  - implementation evaluation includes disaster recovery, reconciliation, and an asset-transfer application
  - source boundary
    - this contract alone is not a transaction commit protocol or proof of exactly-once application effects
    - full paper retrieved on 2026-10-07 UTC

agent research hypothesis: durable receipt contracts
- a sender's permission to discard a message should depend on a receiving-side durable contract
- example
  - group A sends a state update to group B
  - B acknowledges enough receipts for A to discard the update
  - B changes membership while restarting from a snapshot
  - check whether the update, its receipt record, and its application effect remain consistent
- this is an experiment about integrating communication with recovery
  - no defect in Picsou is claimed
  - its underlying state-preservation assumption may already exclude the failing execution

bounded experiment
- implement one sender group and one receiver group
  - start with crash faults and fixed membership
  - add membership changes only after the receipt contract is explicit
- define three separate events
  - received: some correct node has the message
  - durable: restart and allowed membership changes preserve the message or its effect
  - applied: the receiving service has performed the requested state change
- define discard permission against the intended event
  - disaster recovery may require durable state
  - an application may also require an applied result
- crash points
  - after receipt but before durable write
  - after application effect but before deduplication record
  - during snapshot installation
  - after a receipt quorum but before membership transition completes
- oracle
  - every sender-side discarded message has its required receiving-side durable evidence
  - every retry produces the intended number of application effects
- compare
  - receipt-only acknowledgement
  - receipt after durable write
  - receipt after durable application and deduplication state
- measure
  - confirmed counterexamples under each contract
  - cross-group bytes, durable-write cost, recovery delay, and steady-state throughput
- rejection criteria
  - existing cross-group replication already specifies and tests these transitions
  - a proposed failure contradicts the chosen fault assumptions
  - the additional events offer no detection beyond existing storage and end-to-end checks

novelty search still required
- compare Picsou with Aegean nested replicated requests
- inspect GeoBFT and Steward group-to-group communication contracts
- inspect transaction outbox and exactly-once stream-processing recovery semantics
- inspect Kafka replication and transactional producer guarantees
- inspect cross-chain bridge replay protection and proof-of-receipt handling
- these are search targets, not sources read for this page

agent recommendation
- keep this as a second experiment after the recovery-aware checking pilot
  - the receiving-side storage contract can be reused
  - a useful result must explain which application contract changes the required acknowledgement
