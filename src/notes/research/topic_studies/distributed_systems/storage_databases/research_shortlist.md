combined storage research shortlist
(authored by agents unless marked 🧑)

recommendation, 8 Oct 2026

- start with one executable baseline before choosing a large proof project
  - this ranking is an agent recommendation
  - the studies disagree because they rank different goals
    - [transactions](transactions.md) emphasizes verified distributed transactions
    - [consistency guarantees](consistency_guarantees.md) emphasizes executable history checkers
    - [key-value stores](key_value_stores.md) emphasizes object-store engines
    - [verified storage](verified_storage.md) emphasizes durability plus isolation
    - [regional data](multi_region_data.md) emphasizes placement and shared failures
  - none establishes novelty or artifact buildability

first: reproduce a storage-contract recovery test

- reuse the [MongoDB comparison](transactions_regions.md) and [proof-boundary study](verification_boundaries.md)
- question: does the existing generated action model omit a specific engine integration sequence?
- first deliverable
  - pin the artifact and WiredTiger revisions
  - generate and execute one existing checkpoint or rollback test
  - document the API promise and the crash points it covers
- only then propose an additional sequence
  - stop if the existing generator covers it
  - report build failures as feasibility evidence
  - do not claim that an excluded failure violates a proof

second: check one object-table recovery baseline

- [tables on object stores](object_backed_tables.md) now includes existing retention mechanisms
- question: do a retained snapshot, complete dependency copy, and delayed catalog publication already meet the chosen recovery target?
- first deliverable
  - a local two-store copy-delay experiment for one pinned table format
  - independently check every dependency of the recovered snapshot
  - report recovered-version age and retained bytes together
- include Databricks incremental deep clone as a product comparison
  - its documentation explicitly describes disaster recovery
  - it is not assumed available in the local open-source baseline
- stop if the existing mechanisms meet the target
  - a new record must improve cost or freshness at the same guarantee
  - a shallow clone is not the complete-copy baseline

third: prove one history-checking rule

- use the [checker candidate](consistency_guarantees.md)
- question: can an executable Rust checker prove that one reported anomaly violates a stated history definition?
- first deliverable
  - one workload with explicit write identities
  - one anomaly rule and a soundness proof
    - soundness means every reported violation is real under the stated input assumptions
  - compare outputs with an existing checker on its released histories
- defer arbitrary operations, unknown write identities, and multiple isolation levels
  - they add separate specification and inference problems
- stop if the contribution is only rewriting an existing proven executable checker
  - the present search does not establish that none exists

larger projects to defer until reconnaissance succeeds

- crash-safe strictly serializable Rust store
  - combines the durability and transaction branches
  - begin with one durable transaction and its recovery rule
  - do not treat vMVCC and PoWER as interchangeable specifications
    - their memory, disk, and transaction assumptions need an explicit composition argument
  - proof-line ratios across different languages and properties do not establish reduced effort
- fenced object-store manifest library
  - begin with writer takeover and one manifest swap
  - pin conditional-write and failed-request semantics before proving code
  - include garbage collection only after the first contract is executable
- cross-service isolation or Rust-engine durability audit
  - check one released artifact and its promised failure model first
  - failures outside a promise are robustness observations
    - they do not refute the promised isolation or durability guarantee
- regional placement and residency measurements
  - finish the interrupted citation search before asserting an unmeasured gap
  - marker traffic can establish observed exposure
    - absence of a marker cannot establish that no copy, encrypted record, or derived value left a region
- shared-dependency outage corpus
  - define selection and labeling rules before estimating prevalence
  - the existing hand-picked reports support examples
    - they do not establish what usually causes regional outages

remaining work

- incomplete literature
  - file and object stores beyond the table-format follow-up
  - catalog disaster recovery and transactionally consistent backup
  - 2022–2026 regional placement and edge stores
  - theory and implementation proofs for existing history checkers
- missing experiments
  - artifact builds, reproduced tests, performance, proof composition
  - these notes contain proposals rather than results
- consultation
  - earlier ChatGPT attempts produced no opinion
  - the 8 Oct retry failed with picker_effort_not_verified
    - no ChatGPT answer was obtained or attributed

reading rule

- follow each linked study for its original quotes and source pointers
- paper counts are reported search coverage
  - they are not counts of full-paper reads or verified claims
- “not found” is a search limit
  - it is not an established absence of prior work
