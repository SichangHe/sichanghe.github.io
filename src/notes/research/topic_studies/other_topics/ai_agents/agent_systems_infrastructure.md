systems infrastructure under AI agents
(authored by agents unless marked 🧑)

short version

- the field moved fast in 2025 and 2026; the systems venues now have real agent papers
  - serving: Parrot (OSDI 2024), Autellix, Continuum, KVFlow (NeurIPS 2025), CacheWise, Leyline
  - sandboxes: DeltaBox and Crab (both 2026 preprints) do millisecond checkpoint and rollback of whole sandboxes
  - workload traces: TraceLab (4,300 Claude Code and Codex sessions) and a GitHub Copilot production study (13M sessions) are now public facts to build on
- 5 things worth knowing
  - fact (TraceLab): in coding agents inputs outnumber outputs 294x and 95.7% of input tokens hit the prefix cache; the serving problem is keeping long-lived KV state alive across tool pauses, not prefill
  - fact (TraceLab): 4% of tool calls last over a minute and take 85% of all tool time; tool latency is heavy tailed, which is what every KV-pinning paper relies on
  - fact (HKUST workload study): in 5 of 10 agent apps non-LLM parts dominate latency and one sandbox session peaks at 28 GB; the GPU is not always the bottleneck
  - fact (Crab): over 75% of agent turns produce no recovery-relevant OS state; naive per-turn checkpoints waste most of their work
  - fact (two independent MCP vs CLI studies): the interface effect is small for newest models and dominated by the scaffold; cost ratios across scaffolds span 0.43x to 29x
- the gap I see most clearly: every rollback and checkpoint paper stops at the sandbox boundary
  - DeltaBox and Crab restore files and processes; neither can undo a git push, an email, or a database write that left the sandbox
  - the Aug 2026 "when can agents safely checkpoint, fork, restore, and merge" paper checks policy on execution records but does not build the runtime
- my best research ideas
  - 1. effect-aware rollback: a sandbox that tracks externally visible effects per branch, and blocks, logs, or compensates them when a branch is discarded; verify the bookkeeping in Rust plus Verus
  - 2. co-scheduling across GPU and sandbox: one scheduler that uses tool latency prediction for both KV eviction and sandbox memory offload, measured on the public traces
  - 3. durable execution semantics for nondeterministic agents: journal replay vs output checkpointing vs OS-level checkpointing under crash injection with non-idempotent tools

what the topic is

- an agent is a loop: model call, tool call, repeat; the "infrastructure" is everything around that loop
  - where the tool runs (sandbox), how to undo it (checkpoint and rollback), how the model calls are served and scheduled, what gets cached, how the tool is exposed (shell vs typed protocol), how a run is observed and replayed, and how a long job survives crashes
- why it is a systems topic
  - the workload shape is new: thousands of dependent calls per job, long contexts, short outputs, pauses of unknown length, and side effects on real systems
  - old abstractions (request-level serving, container snapshots, workflow replay) assume determinism or independence that agents break

what existing work shows

- reading depth: I opened each source's abstract page or blog page through a fetch tool that summarizes; quoted phrases in quotation marks came back from the page, but I did not read full PDFs except Firecracker; re-verify quotes before citing

serving and scheduling of agent workloads

- [Parrot: Efficient Serving of LLM-based Applications with Semantic Variable](https://www.usenix.org/conference/osdi24/presentation/lin-chaofan), Lin, Han, Zhang, Yang, Yang, Chen, Qiu, OSDI 2024, peer reviewed
  - what: app annotates inputs and outputs as "Semantic Variable" so the serving system sees dependencies between requests
  - number (claim): "up to an order-of-magnitude improvement for popular and practical use cases"
  - limit (fact, per a later search summary): assumes a static workflow graph; agent loops are dynamic
- [InferCept: Efficient Intercept Support for Augmented Large Language Model Inference](https://arxiv.org/abs/2402.01869), Abhyankar, He, Srivatsa, Zhang, Zhang, arXiv 2024 (ICML 2024 per my memory, unverified)
  - what: keeps context alive across tool interceptions instead of starting a new request
  - number (fact from abstract): recomputation "accounts for 37-40% of total model forwarding time"; throughput "1.6x-2x"
- [Conveyor: Efficient Tool-aware LLM Serving with Tool Partial Execution](https://arxiv.org/abs/2406.00059), Xu, Kong, Chen, Zhuo, arXiv 2024, preprint
  - what: start running the tool while the model is still decoding its call
  - number (claim): "improve request completion latency by up to 38.8%"
  - limit (inference): needs tool developers to expose partial execution points
- [Autellix: An Efficient Serving Engine for LLM Agents as General Programs](https://arxiv.org/abs/2502.13965), Luo, Shi, Cai, ... Gonzalez, Stoica, arXiv Feb 2025, preprint
  - what: treats the agent program, not the request, as the scheduling unit; preempts and prioritizes calls by the program's cumulative service time
  - key quote: "programs submitted to LLM serving engines experience long cumulative wait times, primarily due to head-of-line blocking at both the individual LLM request and the program"
  - number (claim): "improves throughput of programs by 4-15x at the same latency compared to ... vLLM"
- [Continuum: Efficient and Robust Multi-Turn LLM Agent Scheduling with KV Cache Time-to-Live](https://arxiv.org/abs/2511.02230), Li, He, Mang, ... Gonzalez, Stoica, arXiv Nov 2025, v7 Sep 2026, preprint
  - what: pins the KV cache during a tool call with a time-to-live set from reload cost and queueing delay
  - key quote: "existing inference engines evict finished requests' KV cache if new requests are waiting. This policy breaks for agentic workloads"
  - number (claim): "improves the average job completion times by over 8x" on SWE-Bench, BFCL, OpenHands agents
- [KVFlow: Efficient Prefix Caching for Accelerating LLM-Based Multi-Agent Workflows](https://papers.neurips.cc/paper_files/paper/2025/hash/b7971d31a7d5eb0f1eed2f8f6f368195-Abstract-Conference.html), Pan et al., NeurIPS 2025, peer reviewed
  - what: an "Agent Step Graph" gives each agent a steps-to-execution score that drives eviction and prefetch
  - number (claim): up to 1.83x single workflow, 2.19x many concurrent workflows, vs SGLang radix cache
  - limit (inference): the workflow must be known in advance; coding agents decide the next step at runtime
- [CacheWise: Understanding Workloads and Optimizing KVCache Management for Efficiently Serving LLM Coding Agents](https://arxiv.org/abs/2606.16824), Tiwari, Chugh, Rickert, Peter, Mahajan, Shen, arXiv Jun 2026, preprint
  - what: collected coding-assistant traces; eviction guided by predictions from tool-call metadata; built in vLLM
  - key quote: "coding agent sessions repeatedly reuse large prefixes and create sustained KVCache pressure that conventional LLM serving policies handle poorly"
  - number (claim): evictions down 2-2.6x, session completion time up to 3.5x
- [Leyline: KV Cache Directives for Agentic Inference](https://arxiv.org/abs/2606.01065), Ma, Eitzinger, Koestler, arXiv May 2026, preprint
  - what: agents edit their context (retry, drop, truncate), which breaks append-only prefix caching; Leyline lets the policy declare splices and fixes positions with a RoPE rotation
  - key quote: "Agentic LLMs break this assumption. Their conversations evolve through policy-driven editing"
  - number (claim): replay cache hit +11.2 pp, latency down up to 241 ms, solve rate +14.3 pp on debug-gym from a truncation rule
- [AIOS: LLM Agent Operating System](https://arxiv.org/abs/2403.16971), Mei et al., COLM 2025, peer reviewed
  - what: an "AIOS kernel" with scheduling, context, memory, storage, and access control services behind an SDK
  - number (claim): up to 2.1x faster agent execution
  - limit (inference): the "OS" is a Python layer above the model; it does not isolate anything at the OS level
- [AgentOpt v0.1 Technical Report: Client-Side Optimization for LLM-Based Agent](https://arxiv.org/abs/2604.06296), Hua et al., arXiv Apr 2026, preprint
  - what: picks models and tools per step under an API budget
  - key quote: "at matched accuracy, the cost gap between the best and worst model combinations can reach 13-32x in our experiments"

workload characterization (the facts the serving papers rest on)

- [TraceLab: Characterizing Coding Agent Workloads for LLM Serving](https://syfi.cs.washington.edu/blog/2026-06-25-tracelab/), Zhu, Jacob, Ma, Pan, Wang, Krishnamurthy, Kasikci, UW blog Jun 2026, venue not stated
  - what: public trace of "~4,300 sessions and 55B tokens in total" from Claude Code and Codex use
  - facts: "95.7% of input tokens hit the cache"; "~97.5%" on tool-result continuations, "~84.4%" on new user messages
  - facts: "76% are shell/command executions"; "calls under 1 s are ~61% of all calls but only ~1% of total tool time, while the ~4% of calls lasting over a minute consume ~85% of it"
  - fact: "Every new token is prefilled roughly 5x on average"
  - inference: the 4.3% miss rate matters because every miss re-prefills a long context; that is where Continuum and CacheWise get their gains
- [Agentic Coding in the Wild: Characterizing GitHub Copilot at Production Scale](https://www.microsoft.com/en-us/research/publication/agentic-coding-in-the-wild-characterizing-github-copilot-at-production-scale/), Liu, Qiu, Goiri, Fonseca, Bianchini, Choukse, arXiv Jul 2026, preprint
  - facts: June 2026 traces, 3.2M users, 13M sessions, 761M LLM calls, 95T tokens
  - facts: 90% KV hit within a turn, 55% across turn boundaries; a predictor captures 86-90% of idle time
  - key quote: "sparse user-initiated turns, each unfolding into an autonomous agent loop of LLM calls coupled nearly 1:1 with tool execution"
- [From LLM Inference to Agentic Workloads: Characterization and Implications for Serving Systems](https://arxiv.org/abs/2608.15127), Chang et al. (HKUST), arXiv Aug 2026, preprint
  - what: AgentSysBench, 10 agent apps measured end to end
  - facts: non-LLM components dominate latency in 5 of 10; sandbox memory peaks at 28 GB per session; latencies diverge 32x across components; sessions idle for minutes to hours; a "control-plane tax" from auxiliary LLM calls and schemas
  - numbers (claims): task-aware serving cuts latency 29-40%; state offloading cuts memory 4.6x; caching removes 35.2% of redundant search calls
- [Agentic AI Workload Characteristics](https://arxiv.org/abs/2605.26297), Yuan, Nayak, Kundu, Talati, IISWC 2026, peer reviewed
  - facts: ReAct agents on Gemma and Qwen, 5 benchmarks; with caching, execution is decode-dominated; agents move "from read/explore behavior early in execution to execute/write behavior later"
  - a search summary cited 84.6-99.5% cache hit and 91.0-98.6% decode share; I could not confirm those numbers from the abstract

caching and cost

- [Don't Break the Cache: An Evaluation of Prompt Caching for Long-Horizon Agentic Tasks](https://arxiv.org/abs/2601.06007), Lumer et al., arXiv Jan 2026, preprint
  - what: 500+ agent sessions on DeepResearch Bench across OpenAI, Anthropic, Google caching
  - facts: "prompt caching reduces API costs by 41-80%"; TTFT "13-31%" better; naive full-context caching "can paradoxically increase latency"
  - practical rule (claim): dynamic content last, keep tool results out of the cached prefix
- [Code execution with MCP: Building more efficient agents](https://www.anthropic.com/engineering/code-execution-with-mcp), Anthropic engineering blog, Nov 2025, not peer reviewed
  - claim: loading tool definitions on demand cuts "from 150,000 tokens to 2,000 tokens—a time and cost saving of 98.7%"
  - caveat they state: "Running agent-generated code requires a secure execution environment with appropriate sandboxing, resource limits, and monitoring"
  - inference: this is a vendor example on one scenario, not a measurement across workloads

sandboxes and isolation

- [Firecracker: Lightweight Virtualization for Serverless Applications](https://www.usenix.org/conference/nsdi20/presentation/agache), Agache et al. (AWS), NSDI 2020, peer reviewed; I read the PDF
  - facts: "memory overhead of less than 5MB per container, boots to application code in less than 125ms, and allows creation of up to 150 MicroVMs per second per host"
  - framing quote: "The traditional view is that there is a choice between virtualization with strong security and high overhead, and container technologies with weaker security and minimal overhead"
  - inference: this is the baseline every agent sandbox vendor (E2B, Modal, Sprites) builds on; the agent-specific question is not isolation but state handling
- [Scaling Agentic-RL Sandboxes to the Millions with gVisor at Tencent](https://gvisor.dev/blog/2026/04/23/scaling-agentic-rl-sandboxes-to-the-millions-with-gvisor-at-tencent/), Tan, Liu, Chen, gVisor blog Apr 2026, not peer reviewed
  - fact: "we run millions of gVisor sandboxes daily for Agentic-RL training in production"
  - why gVisor over microVMs (claim): "can run inside regular VMs, making it significantly cheaper", and "more friendly to GPU scenarios"
- [Sandlock: Confining AI Agent Code with Unprivileged Linux Primitives](https://arxiv.org/abs/2605.26298), Wang, Zheng, arXiv May 2026, preprint
  - what: static policy compiled into kernel rules plus a narrow supervisor for runtime decisions; no root, cgroups, images, or namespaces required; "reversible filesystem effects"
  - key quote: "containers and microVMs add privilege, image-management, and startup costs, while ad-hoc process controls and wrappers (e.g. chroot, ulimit) provide weak guarantees"
  - numbers (claim): about 5 ms startup; Redis at bare-metal throughput
- [Quantifying Frontier LLM Capabilities for Container Sandbox Escape](https://arxiv.org/abs/2603.02277), Marchand et al., ICML 2026 per a search listing, arXiv v3 Aug 2026
  - what: SandboxEscapeBench, nested sandboxes, capture the flag style
  - key quote: "when vulnerabilities are added, LLMs are able to identify and exploit them"
- [The Balkanization of Execution-Security Research for AI Coding Agents](https://arxiv.org/abs/2607.05743), Rashidi, arXiv Jul 2026, preprint, systematization of 39 papers
  - gap they name (claim): no shared benchmark comparing isolation architectures; "benign but out-of-scope agent actions occurring at rates up to 17.1%"
  - security proper is a sibling topic; I cite this only for the isolation-benchmark gap

checkpoint, fork, and rollback of agent environments

- [DeltaBox: Scaling Stateful AI Agents with Millisecond-Level Sandbox Checkpoint/Rollback](https://arxiv.org/abs/2605.22781), Dong, ..., Xia, Chen (SJTU), arXiv May 2026, preprint
  - what: snapshot only the delta between consecutive checkpoints of files and process state, for tree search and RL rollouts
  - key quote: "Existing mechanisms duplicate the entire state, causing hundreds of milliseconds to seconds of latency per C/R"
  - numbers (claim): checkpoint 14 ms, rollback 5 ms
  - limit (inference): scope is the sandbox; nothing about effects that already left it
- [Crab: A Semantics-Aware Checkpoint/Restore Runtime for Agent Sandboxes](https://arxiv.org/abs/2604.28138), Wu, Chang, Cao, Gao, Wang (HKUST), arXiv Apr 2026, preprint
  - what: eBPF classifies OS effects per turn, aligns checkpoints to turn boundaries, schedules across co-located sandboxes
  - key quote: "application-level recovery preserves chat history but misses OS-side effects, while full per-turn checkpointing is correct but too expensive under dense co-location"
  - facts/claims: over 75% of turns produce no recovery-relevant state; recovery correctness 8% to 100%; checkpoint traffic down up to 87%; overhead within 1.9%
  - inference: the 8% figure is for application-level recovery alone; it is the best quantitative evidence I found that chat-history checkpoints are not enough
- [When Can Agents Safely Checkpoint, Fork, Restore, and Merge? Exact Checking for Execution Edits](https://arxiv.org/abs/2608.22928), Zheng, Song, Hu, Cheng, Huang, Zhang, arXiv Aug 2026, preprint, 24 pages, Lean proofs
  - what: an algorithm over execution records that decides whether a fork, restore, or merge keeps the task finishable without "unauthorized duplicate tool actions, discarded required results, and conflicting calls"
  - limit (inference): a checker, not a runtime; no performance numbers
  - fit: this is the formal side of my idea 1; the same first author wrote AgentSight and Sandlock
- [Inspect sandboxing documentation](https://inspect.aisi.org.uk/sandboxing.html) and [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence) are already quoted in [recovery.md](recovery.md); I do not repeat them

building runnable environments automatically

- an earlier helper opened 9 sources; its cards are summarized here, and I verified the Repo2Run venue myself
- [Repo2Run: Automated Building Executable Environment for Code Repository at Scale](https://neurips.cc/virtual/2025/poster/116832), Hu, Peng, Wang, Xu, Gao, NeurIPS 2025 spotlight poster, peer reviewed
  - what: an agent builds a Docker image, runs tests, rewrites the Dockerfile from feedback until the tests run
  - numbers (claim): 86.0% on 420 Python repositories, 77.0 points above SWE-agent
  - key quote: "build a large number of executable code repositories, limiting the scalability of existing work based on running tests"
  - limit: Python and Docker only; no cost numbers on the page
- [ExecutionAgent](https://arxiv.org/abs/2412.10133), Bouzenia, Pradel, ISSTA 2025, peer reviewed (helper's card)
  - numbers (claim): 33 of 50 projects, 14 languages, "deviation of only 7.5%" from ground-truth test results, 74 minutes and USD 0.16 per project
  - it is the only source in this sub-area with per-project dollars and minutes
- [SetupBench](https://arxiv.org/abs/2507.09063), Arora, Jang, Zilouchian Moghaddam (Microsoft), arXiv 2025, preprint (helper's card)
  - numbers (claim): 93 instances from a bare Linux box; OpenHands 38.9-57.4% on repository setup; 38-89% of agent actions unnecessary
- [DockSmith](https://arxiv.org/html/2602.00592v1), arXiv Jan 2026, preprint (helper's card)
  - numbers (claim): 30B-A3B model trained on Docker-building trajectories; 39.72% fail-to-pass on Multi-Docker-Eval; downstream +2 to +3 points on SWE-bench and Terminal-Bench
  - limit (fact): "significantly lower" on C, C++, Java, Rust
- [SWE-smith](https://arxiv.org/abs/2504.21798), Yang et al., arXiv 2025 (helper's card)
  - key quote: "companion execution environments also take up several terabytes of storage, severely limiting their scalability and usability"
- [Terminal-Bench 2.0](https://arxiv.org/abs/2601.11868), Merrill and 84 co-authors, arXiv Jan 2026, preprint
  - fact: 89 tasks, each with its own container environment, human solution, and tests; frontier agents below 65%
  - relevance: a ready-made set of per-task environments for a rebuild-drift study
- helper's open points, which I agree with: cost per working environment is almost never reported; success definitions differ per paper; rebuild drift over time is unmeasured

tool interfaces: shell vs structured protocols

- [Executable Code Actions Elicit Better LLM Agents (CodeAct)](https://icml.cc/virtual/2024/poster/33320), Wang et al., ICML 2024, peer reviewed
  - what: Python code as the action space instead of JSON tool calls; 17 models tested
  - number (claim): "up to 20% higher success rate"
  - inference: the strongest peer-reviewed evidence that interface shape changes outcomes; SWE-agent's custom interface (64% relative gain, in the human's handbook note (local source: `../../../handbook.md`; not published in this study)) is the other
- [MCP-AgentBench](https://arxiv.org/abs/2509.09734), Guo et al., arXiv Sep 2025, preprint
  - fact: 33 MCP servers, 188 tools, 600 queries, outcome-based grading
  - limit (inference): measures MCP use, does not compare against a shell
- [MCP vs. CLI: Does an AI Agent's Tool Interface Still Matter?](https://labs.scale.com/blog/mcp-vs-cli), Hou et al., Scale Labs blog, Jul 2026, not peer reviewed
  - what: 50 long tasks, two enterprise environments (113 and 140 tools), "the CLI command is generated from the MCP tool schemas"; Claude Opus 4.6 and 4.8, GPT-5.4 and 5.5
  - facts: Opus 4.6 on the retrieval-heavy environment went 8.5% to 17.7% with CLI; on the precision environment MCP was better (11.8% vs 7.3%); for Opus 4.8 and GPT-5.5 differences "flatten"
  - key quotes: "CLI is not a better tool interface than MCP by default"; "CLI helps mainly by compensating for tool-use errors"; "Don't expose both interfaces and expect the model to choose"
  - fact: CLI runs took 20-40% longer wall clock
- [The Scaffolding Matters More Than the Interface](https://arxiv.org/abs/2608.08654), Alier Forment, Casañ Guerrero, García-Peñalvo, Pereira, arXiv Aug 2026, preprint; data on [Zenodo](https://zenodo.org/doi/10.5281/zenodo.21851991)
  - what: one six-step GitHub task, 7 scaffolds (Claude Code, Codex, qwen-code, Hermes, opencode, pi, Tau), 5 models, MCP arm vs shell arm, repository state read back through the API
  - key quote: "How much an AI coding agent costs to run can depend more on the agent scaffolding that drives it than on the interface through which it reaches its tools"
  - facts: 13 paired MCP-to-CLI cost ratios from 0.43x to 29x; 12.9% of MCP spend bought no completed work vs 2.2% for CLI; failures equally common
  - limit (fact): one task; local models run 3 times, hosted ones fewer
- inference across the three: the human's handbook note already predicted this; interface effects are real but confounded by scaffold, model, and error recovery, and a 2x2 with mutually exclusive action paths is still not done at scale

observability and replay

- [AgentSight: System-Level Observability for AI Agents Using eBPF](https://arxiv.org/abs/2508.02736), Zheng, Hu, Yu, Quinn, PACMI 2025 workshop
  - what: "boundary tracing" from outside the agent: intercept TLS LLM traffic for intent, kernel events for effects, correlate the two
  - key quote: "existing tools observe either an agent's high-level intent (via LLM prompts) or its low-level actions (e.g., system calls), but cannot correlate these two views"
  - number (claim): under 3% overhead; detects injection, loops, multi-agent bottlenecks
- OpenTelemetry GenAI semantic conventions
  - fact (official page): the conventions "have moved to the OpenTelemetry GenAI semantic conventions repository"; secondary blogs in Aug and Sep 2026 say every gen_ai attribute is still "Development" status with no stable release
  - inference: there is no stable standard for agent spans yet; traces from different stacks are not comparable
- [Deterministic Replay for AI Agent Systems (agrepl)](https://arxiv.org/abs/2607.16200), Mudasiru, arXiv Apr 2026, preprint, 9 pages
  - what: MITM proxy records every external call, replays by request key with a noise-aware header diff
  - numbers (claim): "replay fidelity F = 1.0 and a median per-step latency reduction of 98.3%" over 250 instances
- [Chronicle: Cut-Point Replay for Regression Testing of LLM Agents](https://arxiv.org/abs/2609.20625), Chawla, Koul, arXiv Sep 2026, preprint
  - what: record at nondeterministic boundaries; replay some boundaries, run new code live at others, to turn a recorded failure into a CI test
  - key quote: "a failure depends on inference that is not bitwise reproducible, on tools that read changing state, and on a multi-step trajectory that a re-run rarely repeats"
  - numbers (claim): 23 microseconds per boundary crossing; 6 recorded failures; cut-point tests caught every mutant that allowed an unsafe recorded action
  - limit (fact): simulated model boundaries, tiny benchmark

durable execution of long agent jobs

- [Consistency and Correctness in Data-Oriented Workflow Systems](https://vldb.org/cidrdb/2026/consistency-and-correctness-in-data-oriented-workflow-systems.html), Stonebraker, Zhou, Kraft, Li, CIDR 2026, peer reviewed
  - what: proposes AC/DC (atomic, consistent, durable, correct) for whole workflows; prototype supports physical backout and saga compensation
  - key quote: "durable execution guarantees exactly-once execution of workflow steps and ensures that compensations actually run, even in the face of failures"
  - fact: "transactional workflows win under low contention, while sagas deliver higher throughput and avoid aborts under contention or long-running steps"
  - limit (inference): e-commerce workload, deterministic steps; no LLM in the loop
- [Why Kitaru Doesn't Use Journal Replay?](https://www.zenml.io/blog/no-journal-replay), Tahir, ZenML blog, Mar 2026, not peer reviewed
  - claim: journal replay needs code to "produce the exact same sequence of operations on replay as it did originally", but agents "call LLMs that return different responses each time and make tool-use decisions at runtime"
  - their alternative: store each step's actual output; on resume, rerun from the start and return cached outputs
  - inference: this is DBOS's model too; the open question is what happens when a step's side effect committed but its output was never stored, which is exactly the [recovery.md](recovery.md) fault model
- [Verified Detection and Prevention of Concurrency Anomalies in Multi-Agent LLM Systems](https://arxiv.org/abs/2606.17182), Khan, arXiv Jun 2026, preprint, 32 pages
  - what: TLA+ formalization of four anomalies (stale generation, phantom tool, causal cascade, tool-effect reordering); a consistency hierarchy L0 to L4; Rust runtime; 274 Verus obligations
  - facts (claim): reproduces a lost update in ByteDance deer-flow and tool-effect reordering in LangGraph's ToolNode
  - fit: closest existing work to a "verified agent runtime"; single author, unreviewed
- Temporal's idempotency advice is already quoted in [recovery.md](recovery.md)

what is missing

- rollback across the sandbox boundary
  - evidence it is open: DeltaBox and Crab restore files and processes only; Sandlock offers "reversible filesystem effects" but not network effects; the fork/merge checker reasons about records, not a running system
  - the human's [recovery.md](recovery.md) and Crab's 8% recovery correctness for chat-only checkpoints both point at the same hole
- joint scheduling of GPU and sandbox resources
  - evidence: serving papers (Autellix, Continuum, CacheWise) model the sandbox as a pause of unknown length; the HKUST study shows the sandbox itself holds 28 GB and often dominates latency; no paper I found schedules both
- interface studies at scale with controlled action paths
  - evidence: Scale Labs has 50 tasks but is a vendor blog; Alier et al. is peer-reviewable but has one task; neither isolates representation from interface the way the handbook note (local source: `../../../handbook.md`; not published in this study) prescribes
- durable execution under nondeterminism and non-idempotent tools
  - evidence: CIDR 2026 studies deterministic steps; Kitaru is a blog argument; nobody has compared journal replay, output checkpointing, and OS-level checkpointing under the same crash injection
- cost of environments
  - evidence: only ExecutionAgent reports dollars and minutes; SWE-smith says terabytes; rebuild drift unmeasured (helper's finding, which I agree with)
- a stable, comparable trace format
  - evidence: OpenTelemetry GenAI conventions still in development; TraceLab and CacheWise each released their own trace schema

research we can do

- 1. effect-aware rollback for branching agents
  - question: when an agent branch is discarded (tree search, best-of-n, undo), which of its effects are still live outside the sandbox, and can a runtime make discard safe at low cost
  - why open: see above; DeltaBox explicitly targets tree search yet rolls back only sandbox state
  - first experiment: run an existing branching coding agent (best-of-n on SWE-bench-style tasks with a fake remote git, HTTP mock, and local DB) under DeltaBox-style rollback; count effects that escaped per discarded branch; then add an interposition layer (eBPF or seccomp notify, as Crab and Sandlock do) that classifies each outbound effect as blockable, loggable, or compensable
  - convincing result: zero escaped effects at under 10% overhead vs plain rollback, with a small verified core (Rust plus Verus) for the effect ledger; the fork/merge checker's policy can be the spec
  - cost: one engineer-quarter; a few hundred dollars of model calls; no GPU cluster needed
  - scoop risk: the Zheng group (AgentSight, Sandlock, fork/merge checker) is one runtime away from this; HKUST (Crab) could extend eBPF classification outward
- 2. co-scheduling GPU and sandbox
  - question: does a single scheduler that predicts tool latency and decides KV eviction, sandbox memory offload, and prefetch together beat Continuum plus a separate sandbox manager on job completion time per GPU-hour and per GB
  - why open: TraceLab's 4% long calls dominate tool time; Copilot's predictor already captures 86-90% of idle time; HKUST's 4.6x memory saving from offload exists only in isolation
  - first experiment: replay TraceLab and CacheWise traces on vLLM plus a sandbox pool; compare Continuum TTL alone, sandbox offload alone, and a joint policy that shares one latency predictor
  - convincing result: lower JCT at equal GPU and memory, and a clear account of when each resource is the bottleneck
  - cost: needs a few GPUs for a week; the traces are public
  - scoop risk: the Continuum and CacheWise groups (Berkeley, UW, UT Austin) are already in this space
- 3. durable execution semantics for agents
  - question: under crashes at every step boundary, with nondeterministic model calls and non-idempotent tools, which recovery model (journal replay, output checkpoint, OS checkpoint) gives fewest duplicate or lost effects at what developer and runtime cost
  - why open: CIDR 2026 assumes deterministic steps; Kitaru's argument is untested; Crab measures OS state, not external effects
  - first experiment: extend the fault-injection design in [recovery.md](recovery.md); run the same agent under Temporal, DBOS, and a Crab-style checkpoint, with the service logging committed state
  - convincing result: a table of which guarantees each model needs from the tool side, and a negative result would also be useful
  - cost: small; no GPU
  - scoop risk: DBOS Inc. and Temporal both ship agent SDKs and could publish measurements first
- 4. (cheaper, from the helper) rebuild drift and shared layers for agent environments
  - rebuild Terminal-Bench and SWE-bench-Live images at different dates; count test flips; cluster by dependency set and measure storage savings against the "several terabytes" SWE-smith reports
  - scoop risk: the SWE-bench-Live team at Microsoft

ChatGPT's opinion

- pending: the consultation has not happened
  - one attempt at 00:47 Los Angeles time on 7 Oct 2026 failed at once because the ChatGPT account needs the human to sign in; the coordinator then said not to run the tool again
  - the earlier worker's local prompt file is `chatgpt_prompt_agent_systems.txt`
    - lost when the session's scratchpad is cleaned
  - it lists the findings above and ideas 1 to 4 plus a fifth, an interface-invariant MCP vs CLI 2x2, and asks what is done, what to do first, what is missing, and the strongest reviewer objection to each

what I searched

- web search queries: agent serving scheduling tool calls; checkpoint fork rollback sandbox microVM; MCP vs CLI benchmark; durable execution LLM agents replay determinism; observability eBPF record replay; workload characterization trace; sandbox isolation gVisor Firecracker cs.OS; prompt cache hit rate agentic; CacheWise; deterministic record replay; DBOS CIDR; OpenTelemetry GenAI status; secure sandbox microVM evaluation
- sources opened: 36 pages (arXiv abstracts, USENIX, NeurIPS, ICML, CIDR, Zenodo, four blogs), plus the Firecracker PDF, plus the helper's 9 environment-building sources
- not covered
  - full PDFs of any 2026 preprint; all numbers are from abstracts or blog summaries
  - the arXiv API was rate limited, so I did not sweep cs.OS systematically
  - E2B, Modal, Sprites, Daytona vendor docs; GKE sandbox snapshots
  - RL training infrastructure for agents (SkyRL and similar), which overlaps with sandbox scaling
  - agent security proper, memory, evaluation, multi-agent coordination: sibling topics
- local collection: CompileAgent (ACL 2025) is in /hdd1/sichanghe/paper_collection and belongs to environment building; I did not open it
