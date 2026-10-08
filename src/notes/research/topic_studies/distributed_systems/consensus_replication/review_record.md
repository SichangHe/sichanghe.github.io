coverage and review record
(authored by agents unless marked 🧑)

scope completed
- six connected literature studies
  - crash consensus and recovery
  - malicious-machine consensus
  - blockchains and validator operation
  - verification boundaries
  - communication between replicated groups
  - convergent replication
- paper records separate inspected full text, inspected sections, and abstract-only leads
- sources span foundational work through selected 2026 publications and updated manuscripts
- proposals include hypotheses, experiments, comparison systems, measurements, and rejection criteria
- every novelty claim remains unestablished
- no experimental performance, defect, or deployment result is claimed

retrieval and search
- checked on 2026-10-07 UTC
- web search service failed
  - tool returned HTTP 404 with “Cannot POST /alpha/search”
- fallback: direct HTTPS requests to author pages, conference programs, repositories, arXiv, and ePrint
- recent official programs inspected
  - [OSDI 2024](https://www.usenix.org/conference/osdi24/technical-sessions)
  - [NSDI 2025](https://www.usenix.org/conference/nsdi25/technical-sessions)
  - [OSDI 2025](https://www.usenix.org/conference/osdi25/technical-sessions)
  - [NSDI 2026](https://www.usenix.org/conference/nsdi26/technical-sessions)
- the program inspection is a search method
  - it does not establish complete coverage of all conferences or preprints
- external-link check
  - 65 distinct linked URLs checked before this record was added
  - 64 returned HTTP 200
  - the AsiaCCS denial-of-service study's publisher page returned HTTP 403
    - its source record states the access limit
  - a successful response does not verify every quoted claim
- local-link and authorship checks run separately
- downloaded working copies were used for section and quote inspection
  - durable bibliographic pointers are in the notes
  - temporary downloads are not repository artifacts

independent review
- a context-free reviewer checked the study files
  - source sampling used retrieved primary texts
  - review covered technical claims, source scope, novelty language, and relative links
- corrected findings
  - distinguish validator signing identity from the host running its software
  - compare recovery state at matched heights after reconciliation
    - allow documented intermediate offsets
    - preserve delayed validator-set activation
  - measure confirmation separately from finality
    - finality comparisons require a supported protocol composition
  - clarify real-time ordering in linearizability
  - state leader and persistent-state conditions in quorum examples
  - distinguish transferred snapshots from local durable voting state
- follow-up review found no further critical technical issue
- limits
  - no independent reproduction of paper results
  - no exhaustive verification of every source claim or external link target
  - reviewer agreement does not establish novelty

ChatGPT consultation
- requested through `pb-chatgpt-prompt-file`
- helper verified selected effort as “Extra High”
- first request produced no assistant answer
  - terminal helper condition: “account_ui_retry_required”
- second request produced no assistant answer
  - terminal helper condition: “terminal_deadline_expired”
  - effort selection was again verified as “Extra High”
- required consultation remains incomplete because the browser service returned no answer
  - independent context-free technical review was completed separately
- no ChatGPT opinion is attributed without a captured answer

agent execution limits
- requested Opus and Fable agent types were unavailable through this session's delegation tool
- topic workers and reviewers used the inherited available model
- all research-note edits by this worker and its delegates stayed in the assigned folder
- the global topic index belongs to the coordinating task
  - the manager receives the local index pointer for integration

remaining before a research commitment
- complete novelty searches around the chosen implementation boundary
- pin target versions and read their current tests and issues
- independently reproduce a baseline failure or documented corner case
- read abstract-only closest prior work fully
- confirm hypotheses against intended storage, timing, and adversary assumptions
- consultation and review are advisory inputs
  - experiment evidence must decide whether a proposal survives

continuation review on 2026-10-08 UTC
- integrated the three extended reviews into the local reading tree
- merged overlapping experiment proposals in [the research shortlist](research_shortlist.md)
- corrected universal incident claims and the blanket Alpenglow model absence claim
- inspected three community Alpenglow repository READMEs
  - no model checks or proofs reproduced
- retried ChatGPT with requested effort “Extra High”
  - helper returned “picker_effort_not_verified”
  - no assistant answer captured; consultation remains incomplete
- additional Byzantine protocol review from the Claude handoff remains absent
- publication authorization confirmed by the coordinating manager
  - only assigned notes may be published
  - other writers’ files must be preserved
  - incorporate current remote history before pushing
- second consultation attempt kept the current model and again requested “Extra High”
  - same “picker_effort_not_verified” failure during preparation
  - both diagnostics show no submitted prompt
  - available helper could not complete the requested consultation
- deepened the DispersedLedger comparison from abstract-only to selected full-text sections
  - existing backlog and spam controls narrow the proposed storage-retention contribution
  - [follow-up and experiment boundary](data_availability_followup.md)
- independent reviewer found remaining contradictory model and approval-date claims
  - corrected model claims throughout the extended verification review
  - removed unverified approval dates and scoped several absence and feasibility claims
  - replaced a CometBFT summary quotation with inspected primary-advisory text
  - the advisory’s internally conflicting patch chronology remains unresolved
- deepened Twins from abstract-only to coverage, injected restart defects, and future-work sections
  - its membership-change testing proposal is direct prior art
- Pipes and BumbleBee full-text retrieval returned HTTP 403
  - both remain abstract-only leads
- independent follow-up review verified the material corrections
  - no new blocking technical finding in those corrections or the DispersedLedger follow-up
  - reading gaps and pending consultation remain explicit
