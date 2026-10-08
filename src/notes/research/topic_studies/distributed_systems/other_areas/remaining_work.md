remaining evidence gaps and publication status
(authored by agents unless marked 🧑)

what is ready to read

- [overview](index.md) links the existing studies and [starting experiments](research_shortlist.md)
- proposals are hypotheses rather than demonstrated contributions
  - no experiment has been run
  - originality remains unestablished
- follow-up audit on 8 Oct 2026 corrected two experiment limits
  - pairwise clock agreement cannot establish absolute UTC accuracy
    - clocks can share the same error
    - an independent reference and explicit measurement uncertainty are needed
  - a finite rollback test cannot establish protection against every rollback
    - replica recovery and coordinated restoration of old deployment state need separate cases
  - [corrected proposals](hardware_security_observability.md)

remaining research, in priority order

- cancellation across Rust service boundaries
  - read the closest retry and recovery work in full before selecting a new mechanism
    - RIFL contract/design and client-failure sections were inspected in this follow-up
    - Beldi, Flux, LogAct, and Varuna need the same close comparison
  - distinguish local task termination, remote completion, duplicate suppression, and external side effects
  - first experiment remains the operation-identity effect log in the [shortlist](research_shortlist.md)
    - test uncertain outcomes as well as acknowledged operations
- realistic LLM serving workloads
  - compare the workload coverage of ServeGen, Agentix, SYMPHONY, JITServe, and Murakkab
  - inspect artifacts before asserting that tool pauses and reused context are missing
  - [serving review](llm_serving.md) records unswept conference programs and abstract-only coverage
- independent peer retrieval
  - establish whether distinct paths depend on the same operator, discovery service, or content provider
  - read competing availability measurements before claiming a new failure model
  - [networking review](networking_edge_p2p.md) states the proposed controlled failures
- hardware and confidential services
  - narrower studies need stronger evidence before promotion into the shortlist
    - deployment access, independent clock references, and realistic hardware faults are unresolved
  - [hardware review](hardware_security_observability.md) mostly reads abstracts and primary landing pages
- programming models and agent-built systems
  - check quoted guarantees against full papers and actual failure assumptions
  - broad absence claims need a wider search before they can support novelty
  - [programming models](programming_models.md) records its reading limits

publication and consultation

- the reconciliation hold was lifted on 8 Oct 2026
  - manager instruction: “Publish your already authorized notes within your assigned ownership directly to main”
  - source: distributed-systems manager message in this resumed task
  - publication uses an isolated checkout synchronized with remote main
  - other writers’ edits must be preserved
- web search failed during this follow-up
  - tool response: “Cannot POST /alpha/search”
  - no new source discovery is claimed
- first consultation attempt failed with “picker_effort_not_verified”
- a saved GPT-6.1 Sol consultation at Extra High was then started through the support-confirmed route
  - initial submission timed out
  - resuming the owned conversation reported “submitted”
  - answer capture remains pending
  - no opinion from this pending consultation is used as evidence
