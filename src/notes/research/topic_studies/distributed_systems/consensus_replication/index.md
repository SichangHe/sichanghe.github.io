consensus and replication research study
(authored by agents unless marked 🧑)

start here
- agent recommendation: study recovery when snapshots and membership changes overlap
  - test whether a crash during snapshot installation or voter changes restores the right data and voters
  - a snapshot saves application state; a membership change replaces the machines allowed to vote
  - smallest proposed experiment: one pinned implementation and crashes between storage operations
  - check committed results, restored application state, active voters, and duplicate requests together
  - no proposed topic has established novelty
- strongest comparison to read first
  - CCF and Ellsberg for connecting protocol models to running implementations
  - Grove for proofs combining recovery, leases, and membership changes
  - XLL for shared logging and crash recovery
  - IronSpec for checking whether specifications express the intended guarantees
  - sources and qualifications in the linked studies
- [merged research shortlist](research_shortlist.md)
  - experiment choices, closest comparisons, and remaining evidence gaps

reading tree
- [crash consensus and recovery](crash_replication.md)
  - protocols, voting quorums, membership changes, snapshots, and shared logs
  - [source ledger](crash_sources.md)
- [agreement despite malicious machines](byzantine_consensus.md)
  - leaders, dissemination graphs, asynchronous agreement, early transaction results, and proactive recovery
  - [source ledger](byzantine_sources.md)
  - [data availability, backlog controls, and retention follow-up](data_availability_followup.md)
  - [Byzantine testing, restart, and voter-change follow-up](byzantine_testing_followup.md)
  - [protocol performance assumptions and checked models](bft_protocols.md)
- [blockchains and validators](blockchain_validators.md)
  - fork choice, finality, execution, signing history, and client diversity
  - [source ledger](validator_sources.md)
- [verification boundaries](verification_boundaries.md)
  - which guarantees proofs and runtime checks cover
  - three experiments about persistence, membership, and adversary assumptions
- [communication between replicated groups](cross_cluster_replication.md)
  - receipt, durability, application effects, and recovery
- [convergent replication](convergent_replication.md)
  - when copies can merge updates without ordering each one first
  - deletion records and retired replicas
- extended reviews
  - [crash-tolerant consensus and real recovery failures](crash_tolerant_consensus.md)
    - library interfaces, leases, client retries, and selected 2025–2026 work
  - [verification and testing of consensus code](verifying_and_testing_consensus_code.md)
    - proofs, checking recorded executions against models, simulation, and LLM assistance
  - [validator software and incidents](validator_software_and_failures.md)
    - Agave, Ethereum clients, execution determinism, and historical failure replay
- [coverage and consultation record](review_record.md)
  - reading limits, search failures, and independent review

proposed sequence
- inspect one implementation's recovery and membership tests
  - choose a target only after confirming the needed storage events are observable
- reproduce one known failure or documented corner case
  - pin source, dependencies, storage contract, and schedule
- compare network-only traces with storage-aware traces
  - measure new coverage, false alarms, and instrumentation cost
- decide the contribution from evidence
  - a concrete defect and fix
  - a missing contract with a proof or checked model
  - a resource-cost result under an explicit adversary budget
  - a useful negative result
- move to malicious replicas or cross-group delivery after the first contract works
  - do not infer either guarantee from crash-only tests

relation to existing work in these notes
- [Agave verification sizing](../../../agave_verification_scope.md)
  - existing pilot boundaries remain distinct from these distributed-system proposals
  - no consensus effort estimate is inferred from the sanitizer estimates
- sibling studies cover distributed bug finding, storage and databases, and other distributed-system areas
  - all files created by this worker stay in this folder

status
- selected studies written on 2026-10-07 UTC
- extended reviews integrated on 2026-10-08 UTC
- the interrupted additional protocol draft was absent
  - a new bounded follow-up now covers Angelfish and the Pipes author tutorial
  - selected full proofs and artifacts remain unread
- notes pushed to the repository on 2026-10-08 UTC
  - website navigation and deployment remain to be confirmed
- recent primary sources include work published or updated in 2026
- literature breadth does not establish completeness
- paper performance results are author reports
  - none independently reproduced in this study
- proposals remain hypotheses
  - no experiment or implementation defect is claimed
