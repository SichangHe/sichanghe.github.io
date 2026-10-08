desktop indexing and service recovery
(authored by agents unless marked 🧑)

starting point: workarounds are not diagnoses
- [macOS note](../../../../macos/index.md)
  - “stop `mds_store` going crazy: disable Spotlight indexing”
  - “restart audio control, useful when audio is not working:”
  - authorship undeclared; this study is an agent extension
- disabling indexing or restarting a service does not identify contention, corruption, excessive scanning, or a driver fault
- question: can foreground work remain responsive while search stays correct and reasonably fresh?
  - freshness means recent changes appear in search within a stated delay
- related [driver recovery](driver_fault_containment.md) distinguishes kernel survival from application continuity

background work: idle prediction already exists
- Golding et al., [Idleness is not sloth, USENIX 1995](https://chrysaetos.org/papers/idleness.pdf), selected full §§3–5
  - authors: “The intrusiveness of an idleness detector measures how much extra load the detector itself imposes”
  - starts and stops background tasks using predicted idle intervals
  - evaluates useful work, wrong predictions, overlapping foreground operations, and delay separately
  - disk simulation uses calibrated models and week-long subsets of real I/O traces
  - moving-average and backoff predictors trade utilization against interference
  - historical disk simulation does not measure modern indexing, battery use, or human tasks
  - inference: measure predictor cost and foreground disruption rather than CPU idleness alone

deferred cleanup: permissions require separate checks
- Büttcher and Clarke, [full-text filesystem search security, FAST 2005](https://www.usenix.org/legacy/events/fast05/tech/full_papers/buettcher/buettcher_html/index.html), selected full §§5–7
  - authors: “Updates to the actual index data, which are very expensive, may be delayed and applied in batches”
  - restricts each query to accessible file regions before computing ranking statistics
  - deletion removes the file's accessible region immediately while index rewriting waits
  - filtering only final results can reveal inaccessible-file term statistics through ranking
  - performance comparison: 528155 documents as individual files, 100 BM25 queries
    - BM25 is a text-ranking formula
  - addresses access-consistent results rather than arbitrary edit freshness or lost filesystem events
  - historical Spotlight discussion is conjecture, not a verified current vulnerability
  - inference: content lag and permission/deletion correctness need separate tests

targeted restart: state boundaries matter
- Candea et al., [Microreboot, OSDI 2004](https://www.usenix.org/legacy/events/osdi04/tech/full_papers/candea/candea_html/index.html), selected full §§3–7
  - authors: “microrebooting one component may leave that state inconsistent”
  - restarts individual JBoss application components
    - transactions roll back; session state lives in separate stores
  - injected deadlocks, infinite loops, leaks, exceptions, and corrupted state
    - escalates recovery when smaller restarts fail
  - component recovery averages 411–601 milliseconds over ten trials with 500 concurrent clients
  - external resources and nonatomic shared state can survive inconsistently
  - corrupted persistent state needs repair rather than restart alone
  - application-server prototype is not evidence about current macOS audio or indexing services

possible experiment: bounded index lag without foreground stalls
- compare disabled indexing, default policy, fixed low priority, idle threshold, and adaptive idle prediction
- replay matched file creation, edits, renames, deletion, and permission changes
  - include bursty build trees and large binary files
  - distinguish cold initial indexing from incremental updates
- measure foreground P95/P99 delay, CPU/I/O/memory, energy, and index lag
  - P95/P99 are delays exceeded by 5%/1% of measured operations
  - count missing, stale, and unauthorized results separately
- hold dataset, cache state, storage, and power mode fixed
- useful null: ordinary low-priority indexing meets the chosen delay and correctness requirements
  - then document sufficient settings instead of designing another scheduler
- idle prediction and deferred cleanup are established priors
  - novelty depends on a concrete current failure and a closer prior search

possible experiment: when does service restart restore correct state?
- inject documented recoverable faults in an isolated test environment
- compare targeted restart, full restart, and index repair/rebuilding
  - preserve known files and expected search results
- measure time to usable service, recurring failure, lost updates, and persistent corruption
- current macOS causes and implementation boundaries remain unverified

reading limits
- selected primary methods read; artifacts and faults not reproduced
- no current mds_store/coreaudiod causal performance study recovered here
- modern event loss, rename races, and cross-volume freshness need closer review
- no novelty, universal recovery, or present-day security claim established
