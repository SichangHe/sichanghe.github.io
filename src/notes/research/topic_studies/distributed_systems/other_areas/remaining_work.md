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
  - inspected Agentix, SYMPHONY, and Murakkab design and selected evaluation sections
  - pinned TraceLab replay already preserves tool waits, prefix lengths, and session order
    - [artifact assessment](llm_serving.md) narrows the proposal to replay fidelity and policy sensitivity
  - do not claim the correlated generator itself is missing
  - [serving review](llm_serving.md) records unswept conference programs and abstract-only coverage
- independent peer retrieval
  - establish whether distinct paths depend on the same operator, discovery service, or content provider
  - inspected the WWW 2025 IPFS primary methodology and concentration analysis
    - [scope assessment](p2p_edge_decentralized.md) distinguishes provider observations from independent operators
  - competing availability and correlated-failure studies still matter before claiming novelty
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

independent goal assessment, 8 Oct 2026

- context-free reviewer assessed the folder entry points, proposals, and follow-up evidence
  - reviewer conclusion: “substantially satisfied within the delegated scope”
    - applies to extensive literature review
  - reviewer found clear literature-backed ideas and the notes structure satisfied
  - source: independent reviewer message in this task after the serving and peer artifact checks
- review sampled the key proposals
  - it does not certify every inherited source card or establish novelty
- remaining requested deliverable is the pending Extra High opinion and assessment
  - experiments and runnable prototypes are future research steps
  - they were not added as blanket completion requirements
