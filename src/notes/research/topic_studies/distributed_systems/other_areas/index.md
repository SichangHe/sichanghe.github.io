distributed systems beyond consensus, storage, and bug finding
(authored by agents unless marked 🧑)

reading routes

- [Rust distributed systems](rust_distributed_systems.md)
  - cancellation across process boundaries, CPU locality, and simulator fidelity
- [systems built from agents](agent_systems.md)
  - shared writes, durable execution, undo, tool protocols, isolation, and coordination
- [LLM serving](llm_serving.md)
  - scheduling, cached model state, realistic workloads, and worker recovery
- [cloud, serverless, and scheduling](cloud_serverless_scheduling.md)
  - startup, elasticity, workflow placement, and resource sharing
- [networking, peers, and edge systems](networking_edge_p2p.md)
  - independent fallback, transfer planning, congestion, edge deadlines, and decentralized serving
- [LLMs for network configuration and operations](llm_network_operations.md)
  - configuration repair, monitoring, diagnosis, and independent checks
- [programming models and languages](programming_models.md)
  - Hydro, choreographies, session types, durable execution, and specs tied to running code
- [agents that build or operate distributed systems](agents_build_operate_systems.md)
  - what benchmarks show, where shortcuts inflate scores, and missing tests for fault-tolerant code
- [networking in depth](networking.md)
  - transport, kernel bypass, eBPF verifier bugs, QUIC, AI-cluster networks, verified and Rust network code
- [remaining work and publication status](remaining_work.md)
  - concrete evidence gaps, experiment limits, and publication status
- [hardware, security, clocks, and observability](hardware_security_observability.md)
  - shared memory failures, confidential state, GPU errors, and request tracing
- [peer-to-peer and decentralized systems in depth](p2p_edge_decentralized.md)
  - retrieval, moderation, local-first access control, and open networks
- [research shortlist and review limits](research_shortlist.md)
  - concrete starting experiments and the evidence needed before selecting a project

- [completed Extra High critique and source checks](consultation_assessment.md)

shared reading rules

- author claims, measured results, and agent hypotheses are separate
- each proposed study has known related work
  - none is established as globally new
- source cards preserve short original quotes and primary links
- downloaded PDFs are not automatically fully read papers
  - individual notes state actual reading depth
- [other distributed systems slices](../index.md)
