distributed systems built from LLM agents
(authored by agents unless marked 🧑)

short version

- a run of one agent is a long program whose next step is chosen at runtime by a model, and whose steps change the outside world
- many agents on shared state face distributed coordination problems
    - the guarantees depend on their runtime and tools
- the literature connects agent execution to established problems in concurrency, recovery, and isolation
- LogAct states conditional safety and recovery properties; GoEX implements bounded undo
    - a useful next step is to test where those conditions hold on real tools
- recommendation: study the smallest recovery and concurrency guarantees that tools can actually enforce

how i read the field (first principles)

- an agent step is: read context, call model, pick an action, run a tool, append the result
- that makes three things different from ordinary services
    - a model may choose new steps during execution
        - predefined workflows remain possible
    - tools may change files, databases, or remote services
        - some have transactions or inverse operations; others do not
    - each step is slow and costs money, so replaying is expensive
- shared files and stores introduce stale reads, conflicting writes, and uncertain completion
    - incorrect output is an application failure; it does not automatically fit a Byzantine fault model
- so the subtopics below are just the classic topics in new clothes
    - consistency and coordination
    - failure, recovery, exactly-once
    - transactions and undo
    - isolation and access control
    - protocols
    - scheduling and cost
    - measurement

why multi-agent systems fail

the takeaway: the studies identify coordination failures; they do not establish that adding agents always hurts

- MAST, Cemri et al., Berkeley, [arXiv 2503.13657](https://arxiv.org/abs/2503.13657), v3 Oct 2025, NeurIPS 2025
    - §3 describes 1,642 traces and 14 failure labels grouped into design, coordination, and verification failures
    - checked primary text: Cemri et al. §1 report "41% to 86.7% failure rate" across the tested frameworks
    - scope: benchmark task failure, not a production crash rate
    - §3.3 distinguishes human agreement κ=0.88 from automated annotation agreement κ=0.77
        - most of the 1,642 traces were annotated by an LLM, not independently by humans
    - scope: the tested frameworks and benchmarks do not represent all agent applications
- MAS-FIRE, Jia et al., [arXiv 2602.19843](https://arxiv.org/abs/2602.19843), Feb 2026
    - author claim: "stronger foundation models do not uniformly improve robustness"; "neutralizing over 40% of faults"
    - note: their described interventions concern prompts, responses, and routing
        - coverage of crash recovery needs direct comparison with LogAct, not a claim that no prior work exists
- Silo-Bench, Zhang et al., [arXiv 2603.01045](https://arxiv.org/abs/2603.01045), Mar 2026
    - fact: "30 algorithmic tasks across three communication complexity levels, evaluating 54 configurations over 1,620 experiments"
- MAS-BENCH remains an unread lead
    - excluded from evidence because the linked conference page was unavailable
- Towards a Science of Scaling Agent Systems, Kim et al., [arXiv 2512.08296](https://arxiv.org/abs/2512.08296), Dec 2025, v Apr 2026
    - fact: "260 configurations evaluated across six benchmarks and five architectural types"; model fit "R²=0.373"
    - author claim: reported gains differ sharply between financial reasoning and sequential planning
    - inference: whether more agents help is a property of the task's dependency structure, which is the same thing parallel computing has always said
- first-party engineering lead: Anthropic’s [multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
    - reread before using its token-cost comparisons
- proposed question: which coordination mechanism removes which failure class at a fixed token budget
    - novelty remains unestablished

shared state, consistency, coordination

the takeaway: sharing a file or store requires an explicit rule for conflicting updates

- Christopher Meiklejohn, [Multi-Agent Systems Have a Distributed Systems Problem](https://christophermeiklejohn.com/ai/agents/distributed/zabriskie/2026/03/30/multi-agent-systems-have-a-distributed-systems-problem.html), Mar 2026 (blog, ex-Basho, Lasp and Partisan author)
    - anecdote: two Claude Code instances on one codebase, "One created migration 267. The other, running in a different worktree, also created migration 267."
    - his proposed connections include stale reads, recovery, ordering, and merging concurrent updates
        - malicious or arbitrary behavior requires a stated fault model
    - he frames it as open: do fifty years of techniques transfer when the node hallucinates and has a context limit
- S-Bus, Sajjad Khan, [arXiv 2605.17076](https://arxiv.org/abs/2605.17076), May 2026 (single author)
    - idea: an HTTP proxy that watches agents' GETs and reconstructs each agent's read set at commit time, because "agents cannot be modified to declare read sets"
    - author's own caveat: the property "harmful in single-shard collaborative writing"
        - author warns that preserving concurrent material can propagate contradictions
    - research relevance: combines formal checks and measured concurrency control
        - its existence narrows a new proposal; it does not establish an open niche
- Token Coherence, Parakhin, [arXiv 2603.15183](https://arxiv.org/abs/2603.15183), Mar 2026 (single author)
    - claim: broadcast context sharing costs "O(n x S x |D|) in agents, steps, and artifact size"; marking shared copies stale until they are read again brings it to "O((n + W) x |D|)"; TLA+ checked "~2,400 explored states"
    - author reports token savings that vary with write rate
        - inspect the workload parameters before comparing those savings
- Phase-Scheduled MAS, Dubey, [arXiv 2604.17400](https://arxiv.org/abs/2604.17400), Apr 2026 (single author)
    - claim: "mean token reduction of 27.3 percent" from activating agents in phases and giving idle agents compressed context; "scheduling alone accounts for 18-20 percentage points"
- SagaLLM adds per-step compensation and dependency tracking
    - checked source and limits are under transactions, undo, reversibility
- Restate (vendor blog), [why checkpointing is not production grade durable execution](https://www.restate.dev/blog/why-checkpointing-is-not-production-grade-durable-execution), 2026
    - vendor source; verify its comparisons against framework contracts
- proposed measurement: quantify lost writes in parallel coding workloads
    - compare existing worktrees, ownership rules, and database-style concurrency control
    - absence of such measurements in this draft does not establish novelty

durable execution, failure, recovery

the takeaway: recording a decision and recording its external effect are different operations

- LogAct, Balakrishnan et al., [primary text](https://arxiv.org/html/2604.07988v1), Apr 2026
    - mechanism: Driver, Voters, Decider, and Executor communicate through a typed durable log
    - §3.1 defines conditional consistency and safety
        - consistency means recorded intentions match executed effects
        - safety means actions preserve a stated rule
        - the Executor must execute faithfully
        - voters must correctly enforce the chosen invariant
        - concurrent external updates require protection inside the action
    - §3.2 assumes component crashes and a durable, highly available AgentBus
        - drivers replay recorded model outputs
        - duplicate commits must be ignored
        - old drivers must be blocked from making further changes
    - authors' precise boundary: "Executor recovery has to be conservative and aim for at-most-once execution"
        - at-most-once means an action may be skipped rather than blindly repeated
        - it does not promise completion after a crash
    - §3.2 requires blocking an old Executor from external services
        - alternatively, tools must tolerate duplicate calls
    - §4.1 implementations have different failure coverage
        - memory has no durability
        - SQLite covers node reboot, not permanent node loss
        - remote storage supports the stronger design assumption
    - §5.3 demonstrates recovery on a file-checksum task
        - useful evidence for that task, not a general recovery benchmark
    - §1 admits that model-generated recovery cannot guarantee restoration of a clean state
- inference: a log alone cannot decide whether an unacknowledged external action happened
    - example: a payment succeeds; the Executor crashes before recording the result
    - retrying may pay twice; skipping may leave the workflow unfinished
    - a service-provided idempotency key, transactional coupling, or a reliable status query can resolve specific cases
    - deduplication inside the runtime cannot retroactively deduplicate an arbitrary remote effect
- research opportunity: check and enforce tool-specific recovery contracts
    - build on LogAct rather than claim it lacks a crash model
    - distinguish durable intent, at-most-once dispatch, repeated execution, and exactly-once external effect
    - count unresolved outcomes as a result, rather than hide them behind an LLM recovery success score

transactions, undo, reversibility

the takeaway: undo works within a defined boundary; arbitrary shell and remote effects can cross that boundary

- GoEX, Patil et al., [primary text](https://arxiv.org/html/2404.06921v1), Apr 2024
    - checked §5.2: database undo uses an LLM-generated inverse or an uncommitted database transaction
    - checked §5.3: filesystem undo already uses Git or Git LFS
    - authors: "Utilizing the relevant abstractions presented by journaling and log-structured filesystem for undo-semantics is left as future work"
    - §5.3 limits filesystem execution to a chosen repository directory
        - this boundary must be enforced, not merely described to the model
    - §5.2 tests generated inverses on a model-generated small database
        - passing such a test is weaker than proving reversal for the actual database
    - remaining question: improve measured coverage and overhead of bounded undo beyond Git
- Revisable by Design, Zhai, Li, Wang, [arXiv 2604.23283](https://arxiv.org/abs/2604.23283), Apr 2026
    - taxonomy: every action is "Idempotent, Reversible, Compensable, or Irreversible"; "an agent's flexibility is bounded by its reversibility"
    - they use it to let the user interrupt mid-run ("stream paradigm") with "Earliest-Conflict Rollback"
    - theory paper; no measurement of how real tool calls distribute over the four classes
- SagaLLM, Chang and Geng, [primary text](https://arxiv.org/html/2503.11951v1), §3.1–3.2
    - authors pair each step with a compensating transaction
    - proposed requirement: "concurrent workflows should not interfere with each other"
    - caution: a compensating action is a later repair, not isolation or an invisible rollback
        - a cancelled booking may leave a fee or an email already delivered
        - concurrent observers may already have seen the original result
    - the requirement and dependency graph are useful design inputs
        - this draft has not established an implementation proof of serializable execution
- inference: snapshots may reverse writes confined to a private filesystem
    - they do not undo network requests, remote databases, leaked data, process effects, or writes outside the captured mount
    - reverting shared state may erase another agent’s valid changes
    - overlayfs is a layered filesystem, not automatically a durable snapshot or rollback protocol
    - shell-call frequency does not establish reversible-call frequency

runtimes and "agent operating systems"

the takeaway: architecture names do not establish isolation or recovery guarantees

- AIOS, Mei et al., Rutgers, [arXiv 2403.16971](https://arxiv.org/abs/2403.16971), v5 Aug 2025
    - idea: "isolating resources and LLM-specific services from agent applications into an AIOS kernel" with scheduling, context management, memory, storage, and access control
- AgentOS, Liu et al. (incl. Jian Pei), [arXiv 2603.08938](https://arxiv.org/abs/2603.08938), Mar 2026
    - vision paper: replace the GUI desktop with a language portal; frames the OS as "a Knowledge Discovery and Data Mining (KDD) problem"; not a systems paper
- GoEX (above) calls itself a runtime; its real content is the undo and confinement argument
- research question: which resource and isolation guarantees can be enforced beneath the model

sandboxes, isolation, runtime policy

the takeaway: two layers exist, OS isolation (containers, gVisor, microVMs) and tool-call policy (allow or deny each call); this draft has stronger evidence for policy papers than for workload-specific OS isolation measurements

- tool-call policy enforcement
    - Progent, Shi et al. (Dawn Song), [arXiv 2504.11703](https://arxiv.org/abs/2504.11703), 2025, v3 May 2026
        - checked abstract: "symbolic rules over tool names and arguments"
        - mechanism: check each call and test whether a proposed policy update expands allowed actions
    - AgentSpec, Wang, Poskitt, Sun, [arXiv 2503.18666](https://arxiv.org/abs/2503.18666), ICSE 2026
        - a small rule language using "triggers, predicates, and enforcement mechanisms"; claims to stop unsafe code-agent runs in "over 90%" of cases with "millisecond-level" overhead
    - Agent-Sentry, Sequeira et al., [arXiv 2603.22868](https://arxiv.org/abs/2603.22868), Mar 2026
        - learns a bound from past benign runs; "94.3% of successful injections" blocked, "95.1% of benign executions" allowed, "without modifying the agent, its tools, or the LLM"
    - LogAct (above) puts voters in front of the log, same idea at a different layer
    - others surfaced by search but not read: AgentGuardian ([arXiv 2601.10440](https://arxiv.org/pdf/2601.10440)), VIGIL ([arXiv 2606.26524](https://arxiv.org/pdf/2606.26524)), A2AS ([arXiv 2510.13825](https://arxiv.org/pdf/2510.13825)), CaMeL, IsolateGPT
- OS-level isolation
    - no primary workload-specific comparison was verified in this draft
    - excluded the earlier draft’s agent-written sandbox startup numbers
        - hardware, isolation settings, and startup definitions were not established
- how often is anything gated at all
    - MCP applications study, Majeed, Mahmoud, Nadi, [arXiv 2607.25635](https://arxiv.org/abs/2607.25635), Jul 2026: of 1,723 apps on GitHub, "only 37.2% gate tool execution behind a blocking approval step"
- proposed measurement: isolate startup and restore costs by provider and tool type
    - a session sandbox can still support per-call snapshots
    - compare reuse, private snapshots, and fresh isolation using actual tool-duration distributions

protocols: MCP and A2A

the takeaway: protocol security studies motivate checking timeout, retry, and cancellation guarantees

- survey: Yang et al., [A Survey of AI Agent Protocols](https://arxiv.org/abs/2504.16736), 2025
    - classifies "context-oriented versus inter-agent protocols and general-purpose versus domain-specific protocols"; covers MCP, ACP, A2A, ANP
- MCP ecosystem measurement, Guo et al., [arXiv 2509.25292](https://arxiv.org/abs/2509.25292), Sep 2025
    - checked abstract: "8,401 valid projects (8,060 servers and 341 clients)"
    - population: entries collected from six markets over 14 days
- MCP server code study, Hasan et al. (Ahmed Hassan), [arXiv 2506.13538](https://arxiv.org/abs/2506.13538), v5 Apr 2026
    - checked abstract: "1,899 open-source MCP servers"
    - method: combine ordinary static analysis with an MCP-specific scanner
- internet-facing MCP servers, Padilla, [arXiv 2608.00150](https://arxiv.org/abs/2608.00150), Jul 2026 (single author)
    - checked abstract: "dynamically audit 414"
    - author study: multiple July measurement runs and dynamic vulnerability tests
        - authentication absence alone is not proof that every exposed operation is unsafe
- MCP applications (client side), Majeed et al. (above)
    - the application study covers configuration and execution approval
- A2ABreak, Lotfi, Rahman, Karim, Bertino, [arXiv 2609.10871](https://arxiv.org/abs/2609.10871), Sep 2026
    - method: "LLM-assisted extraction of a finite-state machine from the natural-language specification", "37 states and 76 transitions from 929 formalized statements"
- limitation: these listed ecosystem and security studies do not establish complete tool latency or recovery contracts
    - a durable runtime also needs timeout, retry, and repeated-effect behavior

scheduling and cost of agent workloads

the takeaway: serving systems now treat an agent run as a program with dependencies and idle gaps; the live question is what the tool layer should tell the scheduler

- Autellix, Luo et al., Berkeley, [arXiv 2502.13965](https://arxiv.org/abs/2502.13965), Feb 2025
    - checked abstract: "enriching schedulers with program-level context"
    - later accepted as Agentix, NSDI 2026
        - [serving review](llm_serving.md) treats this as one research line
- Continuum, Li et al., Berkeley, [arXiv 2511.02230](https://arxiv.org/abs/2511.02230), Nov 2025, v7 Sep 2026
    - checked abstract: "time-to-live mechanism for KV cache retention"
    - keep cached model state through short tool waits
        - evict after a selected time to avoid indefinite memory occupation
- Ask the Tool, Don't Guess, Liu et al., [arXiv 2609.18849](https://arxiv.org/abs/2609.18849), Sep 2026
    - checked abstract: "tool calls report their progress explicitly while they run"
    - mechanism: expose running-tool progress as an input to cache placement
    - inference: this is a protocol change request to MCP in disguise
- HEXAGENT, Peng et al., [arXiv 2605.16637](https://arxiv.org/abs/2605.16637), May 2026
    - checked abstract: "models each request as an online-revealed DAG"
    - a DAG is a dependency graph without cycles
    - mechanism: estimate remaining workflow time and place calls across unequal GPUs
- AgentOpt, Hua et al. (incl. Kostis Kaffes), [arXiv 2604.06296](https://arxiv.org/abs/2604.06296), Apr 2026
    - client-side: choose model and tools per stage; "13-32x cost gap between best and worst model combinations at matched accuracy"
- HAL, Kapoor et al. (Princeton), [arXiv 2510.11977](https://arxiv.org/abs/2510.11977), ICLR 2026
    - checked abstract: "21,730 agent rollouts across 9 models and 9 benchmarks"
    - authors release evaluation logs
        - benchmark logs are not an unbiased sample of production use

measurement studies of agent workloads

the takeaway: trace studies provide candidate workloads; their release fields must support the proposed measurements

- TraceLab, Zhu et al., UW (Kasikci, Krishnamurthy, Stephanie Wang), [arXiv 2606.30560](https://arxiv.org/abs/2606.30560), [blog](https://syfi.cs.washington.edu/blog/2026-06-25-tracelab/), Jun 2026
    - checked primary abstract: "diverse and heavily-tailed tool calls, and high but imperfect prefix cache hit rates"
    - authors release session traces, collection code, and analysis code
    - latency populations differ by provider and tool type
        - pin the dataset version and inspect its fields before replay
- GitHub Copilot at production scale, Liu et al. (Microsoft, Bianchini, Choukse), [arXiv 2608.00101](https://www.alphaxiv.org/abs/2608.00101), Aug 2026
    - "3.2M users, 13M sessions, 761M LLM calls, and 95T tokens" from June 2026
    - median prompt 68K tokens vs completion 247; authors also characterize user idle time and evaluate idle prediction
- dataset leads: MAST-Data, HAL, and S-Bus
    - check licenses, release fields, and whether complete tool effects are observable
- limitation: serving-oriented traces do not by themselves establish complete observation of cross-session conflicts, tool effects, or recovery failures

research we could do

agent recommendations for a systems group with Rust, Verus, and measurement skills

- novelty is provisional for every proposal
    - compare the closest papers and implementations before choosing a project

- measure then fix lost updates between parallel coding agents
    - why now: concurrent coding creates measurable shared-write risks
        - compare MAST coordination failures and S-Bus shared-state control
    - first study: instrument N agents on one repo (worktrees and no worktrees), record file-level read and write sets per step, count conflicts, lost writes, and duplicate work
        - separate legitimate later edits from overwrites of unseen changes
    - then build: a harness layer that checks file versions before committing writes
        - Git hooks miss many direct filesystem writes
        - leases must block expired writers from making changes
        - record which file versions each agent read
    - measure conflict reduction and added token cost
    - risk: conflicts may be rare in practice, which weakens the case for a new mechanism

- a durable agent runtime with a stated crash model and a verified core
    - why now: LogAct already states conditional guarantees; external tool contracts remain the key dependency
    - design: log every intended action before execution (LogAct), declare tool contracts with checked preconditions
        - idempotence depends on arguments and state
        - compensation may fail and does not imply isolation
        - unknown completion needs an explicit unresolved state
    - verify the log-and-replay core in Verus (it is small: append, ack, replay cursor, dedup by action id). this is the Verus angle the human already works on
    - evaluate by injecting systems faults (kill, delay, duplicate delivery, partition) into real harness runs; compare LogAct’s existing recovery experiments and MAS-FIRE’s intervention coverage

- a Jepsen for agent frameworks
    - why now: MAS-FIRE and Silo-Bench show frameworks fail under semantic faults; systematic cross-framework coverage is not established by this draft
    - method: wrap LangGraph, Claude Agent SDK, OpenAI Agents SDK, AutoGen behind a fault-injecting MCP proxy and a crashing process supervisor; check for duplicate side effects, lost steps, and inconsistent shared state
    - output: a failure taxonomy at the systems level to sit beside MAST's semantic one

- reversibility census of real tool traffic, then cheap undo for shell
    - GoEX already implements filesystem undo
    - measure broader coverage using TraceLab as a candidate dataset
        - command strings alone may omit actual effects; validate labels with instrumented replay
    - then: per-call filesystem snapshots (overlayfs or btrfs) under the shell tool, with external writes blocked or covered by explicit service contracts
        - logging a network request cannot make it compensable
    - measure rollback cost against the actual tool-duration distribution
    - this also gives the "damage confinement" GoEX asked for

- MCP as a distributed protocol: measurement and a formal model
    - why now: four MCP studies, all security or ecosystem; A2ABreak shows LLM-extracted state machines find spec bugs; first inspect the official specification and existing conformance tests for lifecycle guarantees
    - measure: latency, error, timeout, and retry behaviour of popular MCP servers; whether retries are idempotent; whether clients honour cancellation
    - model: TLA+ or Verus model of MCP session lifecycle; check cancellation and resumption under an explicit set of allowed crashes, delays, retries, and hostile messages
    - a spin-off: the "tool reports progress" proposal from Ask the Tool becomes a concrete MCP extension with measured serving gains

- sandbox cost on real agent workloads
    - why now: the draft’s sandbox comparison is unverified; establish reliable baselines first; TraceLab gives the actual call size distribution
    - measure: end-to-end session latency and token cost under per-session, per-call, and snapshot-and-fork isolation, using controlled replay with real model-call timing
        - remove credentials and block public external effects
        - replaying commands without original state may change their behavior
    - design target: measure added isolation cost separately for each provider and tool type
        - compare against pinned TraceLab latency distributions

- coordination mechanism ablation at fixed token budget
    - why now: Scaling Agent Systems says architecture choice swings results from +80.8% to -70.0%; Token Coherence and Phase-Scheduled each cut tokens with one trick; this draft does not establish a comparison of these mechanisms at fixed budget
    - use accessible Silo-Bench-style tasks over a shared key-value store; vary the coordination primitive, not the prompt
    - this overlaps with the human's existing mission 7 in [agent_frontier.md](../../../agent_frontier.md)

coverage and limits

- initial pass: abstracts and selected sections of roughly 35 items
    - bibliographic details and most numerical quotes remain preliminary
- correction pass, 7 Oct 2026 UTC
    - fetched primary HTML directly from arXiv
    - closely read LogAct §1–4 and its stated recovery evaluation
    - checked GoEX §5.2–5.3, SagaLLM §3.1–3.2, and MAST §1 and §3–4
    - did not read all four papers end to end
    - corrected the draft’s claim that LogAct lacks a crash model or guarantee statement
    - corrected the claim that GoEX leaves filesystem undo entirely open
    - removed secondary numerical relays and blanket claims of novelty
- web search tool failed during correction
    - direct primary-source retrieval worked
    - no fresh comprehensive search was possible in that pass
- sources requiring further verification
    - other 2026 preprint metrics and publication status
    - S-Bus proof assumptions and released artifacts
    - official MCP and A2A specifications and conformance tests
    - framework durability contracts and OS sandbox measurements
    - TraceLab release fields needed to reconstruct effects and concurrent writes
- uncovered neighboring topics
    - agent memory as a database
    - agent tracing and deterministic replay
    - decentralized agent discovery and communication
    - joint scheduling of GPU inference and tool sandboxes
- the research list is a set of testable directions, not verified novelty claims
