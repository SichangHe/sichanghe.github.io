distributed storage and databases
(authored by agents unless marked 🧑)

start here

- recommendation: begin with existing artifacts and a falsification experiment
  - choose a research direction only after checking its closest prior work
  - the priorities below are agent opinions
- first candidate: test the boundary between a transaction protocol and its storage engine during recovery
  - [transactions and regions](transactions_regions.md) supplies the MongoDB 2025 comparison
  - [verification boundaries](verification_boundaries.md) supplies the proof-assumption angle
  - proposed contribution: explain which executable integration tests a formal contract can provide
  - stop if MongoDB's existing model-generated tests already do the same thing
- second candidate: regional data movement under conflicting transactions
  - compare PolyBase's row reassignment with Bonspiel's geographic concurrency control
  - measure movement cost and slow responses during shifting demand before inventing a policy
  - stop if the combined policy adds no benefit at equal load and guarantees
- third candidate: garbage collection and recovery in object-backed storage
  - [stores and recovery](stores_recovery.md) examines versioned data, deletion, repair, and durability
  - select one concrete race between publishing a new version and reclaiming the old version
  - stop if the selected design already states and enforces the needed invariant
- fourth candidate: recoverable table snapshots during regional failover
  - [tables on object stores](object_backed_tables.md) distinguishes individual copied objects from a complete table version
  - compare existing catalog recovery and replication barriers before proposing a new mechanism
- agent storage is another branch of this study
  - [LLMs and storage](llm_and_storage.md) is the predecessor's broad survey
  - its strongest candidate requires an independent correctness test of a released implementation
  - treat its unverified paper and artifact claims as leads rather than established facts
  - see its audit for corrections and limits

deeper second-pass studies, 7 Oct 2026

- each adds to the first-pass files below and ends with ranked research candidates
    - no ChatGPT opinion obtained: ChatGPT was signed out
    - [combined shortlist and remaining work](research_shortlist.md) reconciles these studies with the earlier candidates
- [distributed transactions](transactions.md)
    - ≈55 sources, 14 read in full
- [consistency guarantees](consistency_guarantees.md)
    - ≈45 sources, mostly abstracts and introductions
    - 8 Oct follow-up inspected VeriStrong and Isolde definitions, arguments, and implementation descriptions
- [key-value stores and storage engines](key_value_stores.md)
    - ≈75 sources, none read end to end
- [verified storage](verified_storage.md)
    - ≈25 sources, 2 read in full
- [data that spans regions](multi_region_data.md)
    - partial: ≈40 sources, cut short by the Claude usage limit
    - 8 Oct follow-up inspected SkyStore, Macaron, Skyplane, and Akkio mechanisms
    - a complete 2022–2026 conference sweep remains undone
- partial: a follow-up on object-table recovery, generated file systems, and checkpoint-dependent deletion
    - [tables on object stores](object_backed_tables.md) adds existing retention mechanisms to the recovery baseline
    - [stores and recovery](stores_recovery.md) adds SquirrelFS, SysSpec, and Lakestream comparisons
    - a full conference sweep remains undone

reading map

- [transactions and data across regions](transactions_regions.md)
  - isolation, commit protocols, deterministic ordering, clocks, geographic placement
  - 18 primary papers spanning foundations and 2023–2025 additions
- [key-value, file, and object stores](stores_recovery.md)
  - architecture, redundancy, repair, crash recovery, object-backed databases
  - foundational papers and recent FAST work
- [storage correctness across client, server, and disk](verification_boundaries.md)
  - RIFL, IronFleet, Perennial, GoJournal, DaisyNFS, Grove, PoWER, PILOT
  - distinguishes the proof's contract from deployment assumptions
- [tables built on object stores](object_backed_tables.md)
  - Delta Lake, Iceberg, S3 consistency and asynchronous regional replication
  - snapshot publication, retry records, retention, and recoverable destination versions
- [LLMs and storage systems](llm_and_storage.md)
  - agent branches and transactions, generated storage code, model-state storage
  - inherited work with a separate follow-up audit
- related slices
  - [consensus and replication](../consensus_replication/index.md)
  - [finding distributed bugs](../finding_bugs/index.md)
  - [other distributed systems areas](../other_areas/index.md)
  - boundaries were assigned by agents
    - relevant overlap is retained

what these notes establish

- primary evidence identifies close comparisons and narrows plausible questions
- experiments are proposals
  - no performance, correctness, or proof result was produced here
- a paper's measured result belongs to its workload and assumptions
- “not found in this review” does not mean “nobody has done it”
- detailed notes separate quoted evidence, interpretation, and proposed work

coverage and limitations

- added transaction, regional, storage/recovery, and verification literature beyond the inherited LLM survey
- inspected primary PDFs and proceedings
  - individual notes record their read depth and search scope
  - search failures prevented an exhaustive search through October 2026
- the requested Opus low and Fable medium workers were unavailable in this session's agent interface
  - used the available inherited model for parallel literature workers and review
- ChatGPT Extra High consultation was attempted through the requested command-line helper
  - initial attempt selected Extra High but failed before submission
  - retry successfully verified Extra High and submitted the prompt
  - the helper then returned account_ui_retry_required with no assistant answer
  - no ChatGPT opinion is attributed to these notes
  - recommendations were instead checked by independent context-free reviewers
- unresolved
  - full citation-chain search for each shortlisted direction
  - artifact buildability and reproducibility
  - novelty and practical benefit of each proposed combination

review outcome

- independent review corrected definitions, baseline assumptions, and metric interpretation
  - RIFL client reliability is now explicit
  - MongoDB's existing checkpoint and rollback extensions are baseline work
  - DBA-Bench Safe Pass measures safe task completion
  - SpecFS artifact availability is separate from buildability
- process lesson: keep failure promises beside each proposed test
  - this prevents testing an excluded failure as if it violated a guarantee

recommended next step

- reproduce one MongoDB storage-contract test
  - the artifact README documents test generation and a separate WiredTiger build
  - buildability remains untested
  - compare its existing action model with the specific recovery sequence we want to study
  - if a meaningful omission remains, write the smallest additional executable test
  - otherwise move to regional-placement measurements

follow-up review, 8 Oct 2026

- reviewed the five second-pass studies and the combined shortlist against the original research goal
- material corrections applied
  - separated promised guarantees from tests that deliberately break assumptions
  - allowed an inconclusive result from a sound incomplete history checker
  - qualified Rust memory-safety and unsupported absence-of-prior-work claims
  - corrected links to the systems verification study
  - required a compatible fault injector before scheduling persistent-memory tests
- review assessment
  - literature breadth supports a broad reading map
  - full-paper reading, artifact checks, and novelty assessment remain incomplete
  - publication does not complete every proposed research study
- source of assessment
  - independent reviewer record: /tmp/cx_storage_review.md
  - original human goal: “do extensive literature review of each one!”
  - original human presentation requirement: “Results should be in a neat doc tree in my notes”
- validation
  - local links in the owned folder resolved
  - HTML-only mdbook validation passed
    - the new shortlist rendered with its navigation entry
  - full local build failed because Lua was unavailable
    - exact renderer error: “/usr/bin/env: ‘lua’: No such file or directory”
- concrete blockers
  - search tool returned HTTP 404
    - direct retrieval of known primary documents remained possible
  - temporary ChatGPT retry returned picker_effort_not_verified
  - the support-provided saved route then returned picker_deadline selecting gpt-6.1-sol
    - no assistant answer was obtained
    - a later saved-route retry submitted successfully
    - the answer remains pending
- remaining scope
  - see [combined shortlist](research_shortlist.md) for incomplete literature and experiment prerequisites
  - no artifact experiment or new verification result was produced

follow-up validation

- a second independent reviewer checked nine primary sources
  - the new mechanism descriptions and quoted passages matched their sources
  - clarified persistent-memory emulation and Macaron-TTL
  - review record: `/tmp/cx_storage_followup_review.md`
- the four named regional-paper holes are closed
  - this is evidence of progress rather than completion of all citation chains
- full review and Extra High consultation remain incomplete
