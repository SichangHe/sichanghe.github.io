consensus research shortlist and remaining gaps
(authored by agents unless marked 🧑)

start with one recovery contract
- agent recommendation: test whether a Rust consensus library restores the right data and voters after a crash
  - a snapshot saves application state; a membership change replaces the machines allowed to vote
  - combine snapshot installation with a change of voters
  - combine the recovery proposal in [crash replication](crash_replication.md) with [checking recorded executions against a protocol model](verifying_and_testing_consensus_code.md)
  - record saved voting decisions, snapshot contents, active voters, applied commands, and client request identifiers
  - begin with one documented failure or corner case
  - add crashes between storage operations after reproducing the baseline
- success criterion
  - a reproducible defect, a missing storage obligation, or evidence that the added checks improve defect detection at measured cost
- rejection criterion
  - the proposed checks merely repeat existing assertions or cannot distinguish implementation failures from incorrect instrumentation
- comparisons to inspect before claiming novelty
  - CCF and Ellsberg for connecting models to implementation executions
  - Grove for recovery and membership proofs
  - Netrix, SandTable, and model-guided fuzzing for fault schedules and model checks
  - source records and quotes are in [verification boundaries](verification_boundaries.md) and [the extended verification review](verifying_and_testing_consensus_code.md)
- start with one library
  - a comparison across libraries requires matching their storage assumptions and application responsibilities
  - calling every library through the same interface does not make their guarantees identical

other experiments worth keeping
- historical validator defect replay
  - combine panic and termination checks with incident-based test evaluation
  - choose one Agave defect with a primary report and available buggy and fixed revisions
  - reproduce it before extracting a function for proof
  - success: the stated property rejects the buggy revision and accepts the fixed revision under explicit input assumptions
  - rejection: extraction removes the cause or the property excludes the triggering input
  - comparisons: Beacon Chain runtime-error proofs, Firedancer differential testing, and the incident sources in [validator software](validator_software_and_failures.md)
- lease reads with an explicit clock contract
  - combine the Rust lease proposal with recovery and membership obligations
  - first reproduce LeaseGuard’s model and inspect its assumptions
  - compare against a quorum read under the same workload and failure schedule
  - measure stale results, read latency, and failover delay separately
  - rejection: a Rust port adds no general contract or result beyond the existing algorithm
  - sources: [crash-tolerant consensus](crash_tolerant_consensus.md)
- deterministic parallel execution
  - compare a small scheduler’s result against sequential execution
  - begin with bounded thread schedules and a documented historical defect
  - success: a reproducible disagreement or a proof covering the extracted scheduler’s actual assumptions
  - rejection: the model omits the interaction that produced the defect
  - comparisons: Block-STM, Chord, and the execution-client sources in [validator software](validator_software_and_failures.md)
- diversity under shared failures
  - combine incident labeling with replay of defects against client test suites
  - distinguish shared specifications, configuration, libraries, and independently implemented code
  - report which incidents are unresolved or supported only by secondary accounts
  - success: independently supported labels and a reproducible result for a small incident subset
  - rejection: conclusions depend on speculative counterfactuals about what another client would have done
  - sources: [blockchain validators](blockchain_validators.md) and [validator incidents](validator_software_and_failures.md)
- fast paths, agent-maintained models, and malicious-replica resource limits
  - retain as later options in their detailed studies
  - they require a larger baseline or stronger adversary assumptions than the first recovery experiment
  - no ranking here establishes novelty or feasibility

Alpenglow model gap reassessed on 2026-10-08 UTC
- community models exist
  - KetanParmar02’s [repository README](https://github.com/KetanParmar02/alpenglow-verif/blob/main/README.md) claims “Exhaustive checks use TLC for small networks (4-16 nodes)”
    - this is the repository author’s claim
    - the checks and claimed theorem coverage were not reproduced here
  - dotslashapaar’s [repository README](https://github.com/dotslashapaar/alpenglow_tla/blob/main/README.md) describes “Formal verification of Solana's Alpenglow consensus protocol using TLA+ specification language”
    - inspected README sections cover voting, propagation, certificates, timeouts, and leader rotation
    - a list of model components does not establish code conformance
  - Nagaprasadvr’s [repository](https://github.com/Nagaprasadvr/alpenglow-prover) has a README containing only “# alpenglow-prover”
    - this inspection establishes neither completed proofs nor their absence
- next useful question
  - do existing models faithfully encode the intended rules and a pinned implementation’s behavior
  - inspect model files, assumptions, checker configurations, and outputs before proposing another model
  - identify protocol migration separately from ordinary leader rotation
- current evidence
  - repository READMEs retrieved directly through GitHub’s API
  - no model executed and no proof artifact audited
  - the web search tool again failed with “Cannot POST /alpha/search”
  - the earlier blanket absence claim in the verification review is corrected

coverage and publication limits
- three extended reviews are integrated into the [reading tree](index.md)
- the interrupted additional Byzantine draft was absent
  - [new protocol follow-up](bft_protocols.md) covers Angelfish’s model limits and the Pipes author tutorial
  - selected recent proofs remain unread because primary PDFs could not be retrieved
- the [Byzantine data-availability follow-up](data_availability_followup.md) deepens one material abstract-only comparison
  - DispersedLedger already addresses backlog and invalid-transaction spam
  - retention across restart and membership changes needs a separate implementation assessment
- the [Twins follow-up](byzantine_testing_followup.md) identifies direct prior art for restart and voter-change testing
  - additional storage and recovery checks must demonstrate value beyond those existing schedules
- an unreturned ChatGPT request is not consultation evidence
  - outcome recorded in [the review record](review_record.md)
- no experiment, performance result, new defect, or established novelty is claimed
- publication makes the existing evidence accessible
  - it does not settle these research questions
