research shortlist: test the failure before inventing a mechanism
(authored by agents unless marked 🧑)

three starting points

- 1. cancellation and retry across a Rust service boundary
  - question: after a caller times out, how can it learn whether its remote update happened?
  - existing work
    - Tokio task lifetimes and cancellation-safe operations
    - request identities and recorded outcomes in idempotent APIs
    - Beldi's transactional functions and Flux's selective logging
    - LogAct's conditional at-most-once executor recovery
    - RIFL's durable remote-operation results and retry metadata
  - agent recommendation: combine these contracts in a small service and test every uncertain boundary
    - the possible contribution is a composable contract or a reusable test method
    - Rust syntax or a new wrapper alone is insufficient
  - first week
    - implement increment and append with stable request identities
    - interrupt before send, after partial send, after application, and before reply
    - retry while another request modifies shared state
    - compare ordinary retries, explicit task ownership, and recorded operation outcomes
  - independent check
    - an independent effect log records each submitted operation identity
    - every identity has at most one applied effect, including uncertain operations
    - acknowledged operations have one recorded effect
    - uncertain outcomes remain explicit until resolved
    - record abandoned tasks separately from duplicate external effects
  - stop or narrow the project if established idempotency and task ownership already solve the observed problem
  - [Rust evidence and design](rust_distributed_systems.md)
  - [retry-correctness literature](cloud_serverless_scheduling.md)
  - [agent recovery and undo literature](agent_systems.md)

- 2. serving workloads that preserve tools, dependent calls, and reused context together
  - question: does preserving those correlations change which existing serving policy works best?
  - existing work
    - ServeGen models production clients and request distributions
    - Agentix schedules whole programs
    - SYMPHONY prefetches cached state using hints
    - JITServe updates uncertain execution estimates
    - Murakkab optimizes exposed workflow structure
    - agent trace studies measure pauses and model-call behavior
  - follow-up artifact evidence
    - TraceLab already preserves session order, arrival, prefix lengths, and tool waits in a closed-loop replay client
    - CacheWise already collects dependent calls and tool metadata for reuse prediction
    - [pinned artifact assessment](llm_serving.md)
  - agent recommendation: assess replay fidelity and policy sensitivity using these existing artifacts
  - first week
    - reuse TraceLab replay and audit which correlations its synthetic prompts and recorded waits preserve
    - replay original timing, shuffled pauses, and independently generated arrivals
    - use the same GPU resources, engine release, and task set
  - independent check
    - completed tasks and task latency
    - wasted model computation and state transfers
    - application correctness scored separately from response deadlines
  - stop if no specific replay simplification changes a meaningful policy conclusion
    - existing correlated replay removes the original generator gap as stated
  - [serving evidence, source cards, and experiments](llm_serving.md)
  - [agent traces and tool-progress work](agent_systems.md)

- 3. independent fallback in accelerated peer-to-peer retrieval
  - question: do different retrieval paths actually survive losing the same operator or discovery service?
  - existing work
    - The Eternal Tussle studies practical IPFS accelerators and fallback
    - Chord provides peer lookup, not proof of available content
    - replication and reconciliation address different failure assumptions
  - agent recommendation: measure dependency groups and deadlines in a controlled deployment
  - first week
    - publish content with known providers and different ages
    - disable gateways, indexers, special routing peers, and correlated operator groups
    - separately delay metadata and remove content providers
  - independent check
    - successful retrieval before deadline
    - bytes and time spent finding a provider
    - operator groups required by each successful path
  - stop or narrow the project if ordinary fallback already preserves useful availability cheaply
  - [networking evidence and experiment details](networking_edge_p2p.md)

next choices if these fail

- shared startup and network slowdowns in serverless workflows
  - reproduce existing launch and configuration policies before optimizing placement
  - ORION already models correlation, cold starts, and prewarming
  - [Caerus, Jolteon, SONIC, AFaaS, and later work](cloud_serverless_scheduling.md)
- formal network models calibrated against host delays and competing flows
  - use model-generated workloads as controlled replay inputs
  - [network performance synthesis and limits](networking_edge_p2p.md)
- request recovery with an explicit client-visible generated-text contract
  - distinguish service availability, request continuation, and identical output
  - [Llumnix, Mooncake, and DistServe](llm_serving.md)
- real-service behavior omitted by Rust simulators
  - compare operation histories across real and simulated interfaces
  - [MadSim, Turmoil, Loom, and Shuttle](rust_distributed_systems.md)

why this order

- agent opinion: start where correctness or useful completion can be checked independently
- begin with a small controlled experiment
  - avoid large infrastructure changes before establishing a repeatable effect
- prefer a negative result that rules out an assumption over an unsupported novelty claim
- project choice remains provisional
  - publication potential, data access, and useful workload frequency are unresolved

review record

- human requested autonomous research decisions
  - quoted instruction: “Agents decide for themselves autonomously and only ask me to clarify the top-level goal instead of bothering me”
  - source: delegated human email, manager_mail/85c5dff58359-2626.txt:10–14
- human requested ChatGPT consultation
  - quoted instruction: “Also consult ChatGPT for opinions after turning it to Extra High”
  - source: same delegated human email
- the shortlist above is agent synthesis of the companion source cards
  - it is not the human's selected research agenda
- no proposed experiment has been run
- no claim of worldwide novelty is established
- first ChatGPT submission verified Extra High but returned no answer
  - helper status: `account_ui_retry_required`
  - a resume attempt also failed
  - a new submission also ended with `account_ui_retry_required`
  - consultation remains incomplete despite verified Extra High selection
  - no ChatGPT opinion is used as research evidence
- independent review checked local links and sampled 2026 primary sources
  - fixes include stale tool-latency claims and an operation-ID effect log for uncertain updates
- follow-up review found the corrected checks sound
  - new network-operation benchmarks have internally inconsistent task/run counts
  - those source inconsistencies are marked before using the benchmarks
- source quotes were audited across visible companion notes
  - kept short passages within 25 words per research source
- workflow proposal narrowed after adding ORION
  - correlation and prewarming are established prior work
- legacy hidden partial drafts remain unlinked
  - they contain preliminary leads rather than the reviewed study
