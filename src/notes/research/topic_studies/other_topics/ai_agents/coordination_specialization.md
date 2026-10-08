agent teams, specialization, and dependable execution
(authored by agents unless marked 🧑)

short version

- several agents do not beat one agent for free
  - when the thinking budget is equal, one agent matches or beats a team on question answering
  - on real agent tasks the result swings from large gains to large losses with the task
  - most of a team's gain is that it spends more tokens
- a manager with workers does win on long coding tasks, but nobody has shown it wins per dollar
  - the two papers that show the win both report that the team costs more than one agent
  - two peer agents with no manager do about half as well as one agent doing both jobs
- treating agent teams as a concurrency problem is no longer a new idea
  - since March 2026 at least seven preprints do it, one from a strong systems group, one with Verus proofs
  - the first two proposals in the earlier version of this file are now taken; see "what changed in this revision"
- workers that say "done" when they are not done are common, and a manager that only reads the report does not catch it
  - in one controlled study, hidden wrong results from a worker were never recovered
  - model judges reading the transcript detect false "done" claims barely better than chance
- mixing cheap and strong models works, and the open part is the signal that says "this one needs the strong model"
  - which role needs the strong model depends on the domain
- my best research ideas, in order
  - 1. find the point where delegation starts to pay per dollar on long coding tasks
    - separate three things a team gives you: a fresh context, parallel work, and more tokens
  - 2. an independent stress test for runtimes that let several agents write the same state
    - same contended workloads, injected worker deaths, a checker that reads the history
  - 3. make workers hand back evidence the harness can check, and measure how many false "done" reports a manager then accepts
    - the human's own manager and worker logs are data nobody else has

what the topic is, in plain words

- a specialized agent is an agent built for one domain
  - it gets domain data, a few narrow tools, a checker such as a compiler, a limit on repair rounds, and permission to say "I cannot answer"
- a fixed workflow is ordinary code that calls the model at set steps
  - a free agent picks its own next step each turn
- a team is several model sessions that pass work to each other
  - manager and worker: one session splits the task, hands out parts, and merges results
  - peers: sessions talk to each other with no boss
  - a subagent is a worker with its own fresh context that returns only a summary
- the three questions
  - does the extra structure beat one agent that gets the same money
  - what breaks when agents share work and state
  - where do cheap models suffice and where do we need a strong one
- labels used below
  - fact: stated in the source, and I saw the words
  - claim: the authors' own conclusion
  - inference: mine
- reading depth
  - for every paper below I read the arXiv record and abstract
  - where I cite a section, table, or limit, I read that part of the full text
  - I read no paper cover to cover; see "what I searched"

relationship to the human's notes

- [agent_frontier.md](../../../agent_frontier.md) research mission 7 proposes the equal-budget comparison
  - its words: “compare one agent, independent best-of-n, communicating peers, and a trusted-monitor team under equal token and tool budgets”
  - inference: two 2026 studies now run most of that design; idea 1 below is what they leave open
- specialized_agents.md (local source: `../../../specialized_agents.md`; not published in this study) reads JARVIS as a specialized system, not as proof that roles help
  - its words: “the paper does not isolate a causal benefit from multiple agents versus one controller running the same pipeline”
  - inference: still true of every specialization paper I opened
- the human's manager instructions already encode two findings below
  - “Give workers the smallest task-specific context they need”
  - “The human's instructions MUST remain the absolute source of truth”
  - inference: the first matches the finding that what reaches the worker matters more than how many workers there are; the second guards against the brief losing rules, which [policy_following.md](policy_following.md) studies
- sibling files I do not repeat
  - [policy_following.md](policy_following.md): rules lost when a manager briefs a subagent
  - [recovery.md](recovery.md): what to do after an action whose result is unknown
  - [agent_systems_infrastructure.md](agent_systems_infrastructure.md): runtimes and durable execution

what existing work shows: does a team beat one agent at equal budget

- [Single-Agent LLMs Outperform Multi-Agent Systems on Multi-Hop Reasoning Under Equal Thinking Token Budgets](https://arxiv.org/abs/2604.02460), Tran and Kiela, arXiv preprint, April 2026
  - what it did: gave one agent and five team designs the same number of thinking tokens on two question sets (FRAMES and 4-hop MuSiQue), with three model families
  - fact, abstract: “SAS consistently match or outperform MAS on multi-hop reasoning tasks when reasoning tokens are held constant”
    - SAS is one agent; MAS is a team
  - claim, abstract: a team catches up “when a single agent’s effective context utilization is degraded, or when more compute is expended”
    - in plain words: a team helps when one agent can no longer use its own long context well
  - limit, appendix C: “We focus on text-only multi-hop reasoning; MAS advantages with tools/vision or safety constraints are out of scope.”
  - inference: this is the cleanest equal-budget result, and it says nothing about tool use or long tasks
- [Towards a Science of Scaling Agent Systems](https://arxiv.org/abs/2512.08296), Kim et al., arXiv preprint, v3 April 2026
  - what it did: one agent against four team shapes on six agent benchmarks, 260 configurations
  - fact, section 4.4: “All MAS and SAS configurations were matched for total reasoning-token budget (mean 4,800 tokens per trial)”
  - fact, abstract: “Relative performance change compared to single-agent baseline ranges from +80.8% on decomposable financial reasoning to -70.0% on sequential planning”
  - fact, results: independent workers with no checker “propagate errors to 17.2× baseline”, a central manager “contains to 4.4×”
  - limit, section 5: the two coding benchmarks “use 20-instance subsets”, and bootstrap intervals have “typical widths of ±20 percentage points per cell”
  - limit, section 5: agents share “identical base architectures differing only in scale and role prompts”
  - inference: the direction of the result is believable, the per-cell rankings for coding are not, because ±20 points swallows most differences
- [Stop Overvaluing Multi-Agent Debate](https://arxiv.org/abs/2502.08788), Zhang et al., arXiv position paper, 2025
  - what it did: 5 debate methods, 9 benchmarks, 4 models
  - fact, abstract: “MAD often fail to outperform simple single-agent baselines such as Chain-of-Thought and Self-Consistency, even when consuming significantly more inference-time computation”
    - MAD is debate among agents; Self-Consistency is asking one model several times and taking the majority
  - claim: mixing different models is what helps debate
  - limit: I read only the abstract; the full text did not load
- [Single-agent or Multi-agent Systems? Why Not Both?](https://arxiv.org/abs/2505.18286), Gao et al., arXiv preprint, 2025
  - fact, abstract: “the benefits of MAS over SAS diminish as LLM capabilities improve”
  - what it built: send a request to one agent first and to a team only when needed; reported “accuracy by 1.1-12% while reducing deployment costs by up to 20%”
- [More Agents Is All You Need](https://arxiv.org/abs/2402.05120), Li et al., TMLR per the arXiv record, 2024
  - fact, abstract: “simply via a sampling-and-voting method, the performance of large language models (LLMs) scales with the number of agents instantiated”
  - inference: this is the control every team paper needs, since plain repeated sampling with a vote already gives a gain
- [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), Anthropic engineering post, June 2025, not peer reviewed
  - fact: “token usage by itself explains 80% of the variance” on BrowseComp
  - fact: “multi-agent systems use about 15× more tokens than chats”
  - fact: a strong lead with cheaper subagents “outperformed single-agent Claude Opus 4 by 90.2% on our internal research eval”
  - their own caution: “most coding tasks involve fewer truly parallelizable tasks than research, and LLM agents are not yet great at coordinating and delegating to other agents in real time”
  - limit: internal test, not budget matched, vendor source
- [MultiAgentBench](https://aclanthology.org/2025.acl-long.421/), Zhu et al., ACL 2025, peer reviewed
  - fact, abstract: “graph structure performs the best among coordination protocols in the research scenario”
  - limit: the abstract gives no matched budget; I read only the abstract
- inference across these
  - one agent is the right default when the task fits its context
  - a team's honest advantages are a fresh context for each part and work in parallel
  - any paper that does not compare against "one agent given the same tokens" and "the same model sampled n times" has not shown that coordination helps

what existing work shows: manager and workers on long coding tasks

- [Effective Strategies for Asynchronous Software Engineering Agents](https://arxiv.org/abs/2603.21489), Geng and Neubig, arXiv preprint, v2 July 2026
  - what it did: a manager plans tasks with their dependencies, workers run at the same time in separate git worktrees, results merge behind tests; they call it CAID
  - fact, abstract: “improves accuracy over single-agent baselines by 25.6% absolute on paper reproduction tasks (PaperBench) and 14.7% on Python library development tasks (Commit0)”
  - fact, section 3.5: for one agent, “doubling the iteration limit yields only marginal improvements and, in some cases, even degraded results”
  - limit, section 6: “multi-agent execution consistently incurs higher API cost than single-agent baselines, and wall-clock runtime is not substantially reduced despite parallel execution”
  - inference: the strongest evidence that delegation helps on long coding, and it is matched on iteration count, not on dollars
- [Multi-agent Collaboration with State Management](https://arxiv.org/abs/2605.20563), Liu et al., arXiv preprint, May 2026
  - what it did: STORM sits between agents and a shared workspace, tracks file versions, and rejects a write based on a stale read at the moment of writing
  - fact, abstract: “outperforms the git-worktree-based multi-agent baseline by +18.7 on Commit0-Lite and +1.4 on PaperBench”
  - fact, table 1, Commit0-Lite score with Claude Sonnet 4.6: one agent 66.4, worktree team 63.8, STORM 82.5
    - with Qwen 3.6 Plus: one agent 75.3, worktree team 57.4
    - the same table shows a worse cost number for both teams than for one agent
  - limits, appendix E: “STORM mediates the file_editor tool but not direct filesystem writes through bash”; “Version tracking catches file-level conflicts but not semantic ones.”
  - inference: a plain worktree team can lose to one agent; the win comes from how shared state is handled
- [CooperBench: Why Coding Agents Cannot be Your Teammates Yet](https://arxiv.org/abs/2601.13295), Khatua et al., arXiv preprint, January 2026
  - a page with a similar title on the ICLR 2026 site showed up in search; I did not open it
  - what it did: over 600 tasks; two agents each add a feature to the same repository; the features can clash
  - fact, abstract: “agents achieve on average 30% lower success rates when working together compared to performing both tasks individually”
  - fact, introduction: “GPT-5 and Claude Sonnet 4.5 based agents achieve only 25% with two-agent cooperation on CooperBench, which is around 50% lower than a “Solo” baseline”
  - fact, section 5 headings: “Communication does not lead to better cooperation.” and “Communication reduces merge conflicts.”
  - inference: talking fixes textual clashes and not clashes of meaning; peers with no manager are the bad case
- [Silo-Bench](https://arxiv.org/abs/2603.01045), Zhang et al., ACL 2026 main conference per the arXiv record
  - what it did: 30 algorithm tasks where each agent holds part of the input
  - fact, abstract: “agents often acquire sufficient information but cannot integrate it”
  - inference: the weak step is merging what the workers found, which is the manager's job
- [OrchBench](https://arxiv.org/abs/2607.25656), Ren et al., arXiv preprint, July 2026
  - what it did: scores a manager's plan (who does what, what gets passed on) in a simulator without running workers
  - fact, abstract: simulated scores correlate with real Claude Code runs at “r=0.816” while using “1.3%” of the tokens
  - claim, abstract: “preserving task-critical information is more important than simply increasing the number of agents”
  - limit: the score comes from a simulator's model of information loss, so it cannot find failures the model does not contain
- [CodeDelegator](https://arxiv.org/abs/2601.14914), Fei et al., arXiv preprint, January 2026
  - what it did: a manager that never runs code, and for each part “a new Coder agent is instantiated with a clean context containing only its specification”
  - limit: the abstract gives no number; I read only the abstract
- [Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler), Anthropic engineering post, February 2026, not peer reviewed
  - what it did: 16 agents, no manager, about 2,000 sessions, “just under $20,000”, a 100,000-line compiler
  - fact: an agent “takes a "lock" on a task by writing a text file to current_tasks/”
  - fact: “Merge conflicts are frequent, but Claude is smart enough to figure that out.”
  - fact, when the work became one large task: “Every agent would hit the same bug, fix that bug, and then overwrite each other's changes.”
  - inference: parallel agents work when the test suite splits the work into independent pieces, and stop working when it does not

what existing work shows: shared state and concurrency control

- concurrency control means rules that stop two workers from silently overwriting or using stale copies of the same thing
- [CoAgent: Concurrency Control for Multi-Agent Systems](https://arxiv.org/abs/2606.15376), Lyu et al. (Shanghai Jiao Tong University), arXiv preprint, June 2026, “Submitted to ATC 2026”
  - the problem, abstract: “Locks block long inference intervals; OCC abort-and-retry discards minutes of work on every conflict.”
    - OCC means let everyone proceed and throw away the loser's work on a clash
  - the idea: fix an order among agents at launch, apply writes at once, and when a write affects another agent, tell that agent and let it patch its own plan; the framework undoes and reorders writes with an undo action each tool registers
  - fact, abstract: “On ten contended workloads, CoAgent stays within 5% of serial correctness at a 1.4× speedup”
  - fact, section 2: write partitioning does not fix it; “disjoint write sets address neither of the two relevant ACID properties”
  - limits, section 7
    - one cheap model: “Worker agents use deepseek-v4-flash”
    - hand-made pairs: “We therefore pick five tasks from each suite as the agent-1 workload and hand-construct a matching agent-2 for each”
    - the residual error is the model's: “in five of one hundred trials the notification was delivered but the receiver misjudged its relevance to its own task”
    - the word "crash" does not appear in the paper
- [Position: Multi-Agent Systems Should Prioritize Concurrency Control](https://arxiv.org/abs/2608.18092), Yang et al., arXiv preprint, June 2026
  - claim, abstract: “many MAS failures are fundamentally concurrency control problems”
  - fact, section 3.4.1: it asks for a benchmark, and “A particularly valuable benchmark type would measure agent behavior without explicit concurrency control”
- [Verified Detection and Prevention of Concurrency Anomalies in Multi-Agent Large Language Model Systems](https://arxiv.org/abs/2606.17182), Khan, arXiv preprint, June 2026
  - what it did: wrote four anomalies in TLA+, proved detectors and three Rust runtimes in Verus
  - fact, abstract: “A development of 274 Verus obligations (zero assume, zero admit; trust base: two structural axioms and a mutex correspondence)”
  - fact, abstract: “We reproduce a silent lost update in ByteDance's deer-flow”, and tool effects out of order in LangGraph's ToolNode
  - claim, abstract: “to our knowledge the first machine-checked consistency hierarchy for such runtimes”
  - fact, related work: “the present generation of agent benchmarks does not stress-test inter-agent shared state under contention”
  - limit, section VI: “High-contention cost sweep is synthetic and single-model.”
  - inference: the Verus plus agents overlap with the human's interests is already occupied by one single-author preprint; its model assumes the model's output is replayed deterministically
- [SagaLLM](https://arxiv.org/abs/2503.11951), Chang and Geng, arXiv, 2025; venue not checked
  - what it did: “integrating the Saga transactional pattern with persistent memory, automated compensation, and independent validation agents”
    - a saga is a long job made of steps, each with an undo step
  - limit: evaluated on planning problems, not on a live shared system
- [Stateful Governance for Concurrent Agentic Systems](https://arxiv.org/abs/2608.02764), Peng and Wu, arXiv preprint, August 2026
  - fact, abstract: “We identify stale authorization as the core failure mode and define policy-state serializability”
    - stale authorization: the permission check passed, then the budget or approval changed before the action ran
  - limit: the agent experiment is a “scripted, LLM-free procurement workflow”
- [When AI Agents Commit: Cognitive Serializability Across Data, Evidence, Policy, and Authority](https://arxiv.org/abs/2609.20261), He and Yu, arXiv preprint, 2026
  - fact, abstract: “the prototype prevented all injected anomalies and added 3.22 ms mean commit overhead”
  - limit: I read only the abstract, which is hard to follow
- inference across these
  - the mechanisms exist: version checks at write time, fixed order plus repair, sagas, permission rechecked at commit, proved detectors
  - each paper tests its own mechanism on its own small workload, mostly two agents, one model, hand-made conflicts
  - nobody compares them on one shared workload, and nobody I found injects a worker that dies midway

what existing work shows: how teams fail

- [Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) (MAST), Cemri et al., arXiv v3 October 2025; venue not checked
  - fact, abstract: “1600+ annotated traces collected across 7 popular MAS frameworks”
  - fact, abstract: 14 failure modes in 3 groups, “(i) system design issues, (ii) inter-agent misalignment, and (iii) task verification”, with annotator agreement “kappa = 0.88”
  - limit: the traces come from open frameworks on benchmark tasks; a label names a symptom and does not say what fixes it
  - the appendix has two intervention case studies; I did not read their results
- [MAS-FIRE](https://arxiv.org/abs/2602.19843), Jia et al., arXiv preprint, February 2026
  - what it did: injected 15 fault types into MetaGPT, CAMEL, and Table-Critic by changing prompts, rewriting replies, and rerouting messages
  - fact, abstract: “iterative, closed-loop designs neutralizing over 40% of faults that cause catastrophic collapse in linear workflows”
  - fact, abstract: “stronger foundation models do not uniformly improve robustness”
  - fact, finding 3: “Infrastructure-level defenses provide superior tolerance for Communication Faults.”
  - inference: duplicate and looping messages are best handled by plain code, wrong reasoning by a feedback loop
- [OrchestraBench](https://arxiv.org/abs/2608.05263), Chen et al., arXiv preprint, August 2026, 8 pages
  - fact, abstract: “tool faults recovered fully (1.0), ambiguous delegation recovered partially (0.30), and three latent or semantic modes never recovered (0.0)”
    - a latent fault is a wrong value that raises no error
  - fact, abstract: “Blind retry reproduced latent faults”; “Cascade radius increased with pipeline depth (mean 0.9 to 4.7 across depths 3-7)”
    - cascade radius is how many later steps a fault spoils
  - the authors' own limit: “These results are controlled-chain mechanism probes, not domain-workload claims.”
- [From Confident Closing to Silent Failure](https://arxiv.org/abs/2606.09863), Advani, ICML 2026 workshop paper per the arXiv record
  - what it did: 9,876 tau2-bench and 1,879 AppWorld runs, checking the final "done" claim against the real end state
  - fact, abstract: false success is “45--48% of failures in single-control tau2-bench domains” and “75.8% among AppWorld self-assessing coding-agent trajectories”
  - fact, abstract: for model judges, “no configuration across 5 judges, 5 prompt strategies, and full task specifications exceeds AUROC 0.65 on tau2-bench”
    - AUROC 0.5 is a coin flip
  - limit: single agents, not worker reports to a manager
- [Which Agent Causes Task Failures and When?](https://arxiv.org/abs/2505.00212) (Who&When), Zhang et al., arXiv 2025, marked camera-ready
  - fact, abstract: the best method finds the agent at fault “53.5%” of the time and the step at fault “14.2%”
- [Seeing the Whole Elephant](https://arxiv.org/abs/2604.22708) (TraceElephant), Chen et al., ACL 2026 per the arXiv record
  - fact, abstract: “full traces improve attribution accuracy by up to 76% over a partial-observation counterpart”
  - inference: a manager that sees only the worker's summary is in the partial-observation case
- [Too Polite to Disagree](https://arxiv.org/abs/2604.02668), Kasprova et al., SIGDIAL 2026, peer reviewed
  - what it did: told each agent how prone its peers are to agree with whoever spoke
  - fact, abstract: this “improves final discussion accuracy by an absolute 10.5%”
  - limit: six open models in discussion tasks
- inference across these
  - the failure that costs most is a quiet wrong result passed downstream, since a loud tool error gets fixed
  - retrying, asking a model judge, and reading the summary all fail on it; a check against real state works

what existing work shows: fixed workflows against free agents

- [Agentless](https://arxiv.org/abs/2407.01489), Xia et al., arXiv 2024; venue not checked
  - what it did: three fixed phases (find the place, write the patch, validate) “without letting the LLM decide future actions or operate with complex tools”
  - fact, abstract: “the highest performance (32.00%, 96 correct fixes) and low cost ($0.70) compared with all existing open-source software agents” on SWE-bench Lite at that time
  - limit: 2024 models; I recall free agents leading that benchmark since, but did not check
- [In-Context Prompting Obsoletes Agent Orchestration for Procedural Tasks](https://arxiv.org/abs/2604.27891), Dennis et al., arXiv preprint, 2026
  - what it did: put the whole procedure in the system prompt, against a LangGraph orchestrator that feeds one step at a time, same model
  - fact, abstract: “The orchestrated system fails on 24% of travel, 9% of Zoom, and 17% of insurance conversations, compared to 11.5%, 0.5%, and 5% for the in-context baseline.”
  - limits: scored by a model judge; the discussion says “Our comparison holds the model constant; heterogeneous pipelines are out of scope.” and that the procedures are conversations with no outside state
  - the same group's follow-up, [Compiling Agentic Workflows into LLM Weights](https://arxiv.org/abs/2605.22502), trains the procedure into a small model; I read only its abstract
- [StateFlow](https://arxiv.org/abs/2403.11322), Wu et al., arXiv 2024; venue not checked
  - fact, abstract: “conceptualizes complex task-solving processes as state machines” and reports “13% and 28% higher success rates” than ReAct on InterCode SQL and ALFWorld
  - limit: I read only the abstract
- [AFlow](https://arxiv.org/abs/2410.10762), Zhang et al., arXiv 2024; venue not checked
  - what it did: searches over workflows written as code
  - fact, abstract: “enables smaller models to outperform GPT-4o on specific tasks at 4.55% of its inference cost in dollars”
- [AutoGen](https://arxiv.org/abs/2308.08155), Wu et al., arXiv 2023; venue not checked
  - fact, section A4: on “100 coding tasks” with “equal numbers of safe and unsafe tasks”, a separate safeguard agent “boosts the F-1 score in identifying unsafe code by 8% (with GPT-4) and 35% (with GPT-3.5-turbo)”
  - inference: a separate checker helped on one checking task; not an equal-budget result
- [MetaGPT](https://arxiv.org/abs/2308.00352), Hong et al., arXiv 2023; venue not checked
  - fact, abstract: “encodes Standardized Operating Procedures”; introduction: executable feedback gives “5.4% absolute improvement on MBPP”
  - inference: the gain is tied to running the code, which is a check, not to role names
- inference across these
  - the answer flips with model strength: a fixed pipeline beat free agents with 2024 models, and a strong 2026 model with the whole procedure in its prompt beat a step-by-step orchestrator
  - a workflow still makes sense where a step must be guaranteed, such as a check before an irreversible action; none of these papers test that case with outside state

what existing work shows: agents built for one domain

- [JARVIS](https://arxiv.org/abs/2505.14978), Pasandi et al. (NVIDIA), arXiv preprint, 2025
  - fact, abstract: “a custom compiler for structural verification, rule enforcement, code fixing capabilities, and advanced retrieval mechanisms”
  - numbers, limits, and the full critique are in specialized_agents.md (local source: `../../../specialized_agents.md`; not published in this study)
  - inference: the gain comes from the whole package on private tests; role separation is not isolated
- [AgentAbstain: Do LLM Agents Know When Not to Act?](https://arxiv.org/abs/2607.10059), Liu et al., arXiv preprint, July 2026
  - what it did: 263 pairs of tasks, one where acting is right and a slightly changed one where the agent should stop
  - fact, abstract: “the best agent (Gemini 3.1 Pro) achieves only 59.5% paired accuracy”
  - claim, abstract: “abstention capability is largely independent of general task-solving capability”
  - inference: refusing well does not come free with a stronger model, so a domain agent needs its own stop rule
- [Verify, Repair, Repeat, or Stop?](https://arxiv.org/abs/2607.17641), Wu et al., arXiv preprint, under review, July 2026
  - fact, abstract: with a noisy checker and a noisy repairer, “repair can damage already-correct plans, and reported acceptance keeps rising while true validity falls”
  - fact, abstract: their stop rule “improves final true validity by 60.6 percentage points over fixed five-round repair at an average cost of 0.72 repair rounds” in a GSM8K stress setting
  - limit: a stress setting on arithmetic word problems
  - inference: "bounded repair" needs a reason for the bound; with a sound checker such as a compiler or proof checker, false accepts go away and this problem gets much easier
- [HANDBOOK.md](https://arxiv.org/abs/2607.25398), Panavas et al., COLM 2026 workshop per the arXiv record
  - fact, abstract: “65 agentic tasks”; the best model “passes 36.2% of trials”; agents “perform a required check and then act against its result”
  - studied in depth in handbook.md (local source: `../../../handbook.md`; not published in this study) and [policy_following.md](policy_following.md)

what existing work shows: cheap models for easy parts, strong models for hard parts

- [Specialize Roles, Mix Deployments](https://arxiv.org/abs/2606.20629) (AgentCARD), Jiang et al., arXiv preprint, May 2026
  - what it did: tried different models in the planner, executor, and verifier roles on five benchmarks, with one cost model for hosted and self-run models
  - fact, abstract: mixed teams “improve accuracy by up to 44% over cost-equivalent homogeneous teams, or match the strongest homogeneous team at up to 12× lower per-task cost through hybrid deployment”
  - fact, abstract: “some domains are planner-bottlenecked, while others are executor-bottlenecked”
  - limit, appendix D: “AgentCARD reflects a snapshot”; the comparison is team against team, with no single-agent arm that I saw
- this conflicts with Kim et al. above
  - fact, Kim et al. section 5: 13 mixed configurations on BrowseComp-Plus find “no evidence that model mixing bypasses the capability-saturation threshold”
  - inference: both can hold; mixing saves money without lifting the ceiling the strong model sets
- [SWE-Router](https://arxiv.org/abs/2607.00053), Son et al., ICML 2026 workshop per the arXiv record
  - the idea, abstract: “lets a cheap model run for a few exploratory turns and reads the resulting partial trajectory before deciding whether to continue cheaply or to escalate to an expensive model”
  - claim: the task text alone cannot tell an easy issue from a hard one
  - limit: the abstract gives no number; SWE-bench Verified only
- [AgentRouter](https://arxiv.org/abs/2609.22951), Paul and Nandy, ICML 2026 workshop per the arXiv record
  - fact, abstract: a small classifier picks one of four model tiers for each step and reports “72% cost reduction relative to frontier-only baselines, retaining 97.3% of frontier-only quality”
  - limit: I read only the abstract; trained on steps labelled by the authors
- inference across these
  - mixing models is established and crowded
  - the open part is the escalation signal; today it is a learned guess from the transcript

what changed in this revision

- the earlier version was written without web search; its quotes all check out against the sources
  - AutoGen, MetaGPT, StateFlow, MAST, Kim et al., JARVIS, HANDBOOK.md, and MultiAgentBench quotes are present in the pages I opened
- its three proposals did not survive the search
  - proposal 1, a runtime that stops agents from losing or duplicating work: built by CoAgent, STORM, and CAID, argued by the position paper, and proved in Verus by Khan
  - proposal 2, recheck permission right before the action: this is MasuGate's “stale authorization” and “policy-state serializability”, and Cognitive Serializability covers policy and authority too
  - proposal 3, route by measured failure: AgentCARD, SWE-Router, and AgentRouter cover routing; only the "sound checker as the signal" part stays open
- its claim that Kim et al. “substantially narrows the novelty of a generic equal-compute team study” holds, and Tran and Kiela narrow it further

what is missing

- nobody shows where delegation starts to pay per dollar on long tasks
  - evidence: CAID and STORM report the team costs more; Kim et al. match tokens but run 20 coding tasks with ±20 point intervals; Tran and Kiela match tokens on short questions only and predict a crossover they do not measure on tool tasks
  - nobody separates the three things a team adds: fresh context, parallel work, more tokens
    - the missing arm is one agent that restarts with a fresh context and a handoff note between parts, which has the fresh context and no parallel work
- nobody compares the concurrency runtimes on a shared workload
  - evidence: CoAgent uses ten hand-made two-agent pairs and one model; Khan's contention test is “synthetic and single-model”; the position paper asks for the benchmark; Khan says current benchmarks do not stress shared state
  - worker death in the middle of a write is not tested in any of them, as far as I read
  - clashes of meaning, where both edits are fine alone and wrong together, are named by STORM and CooperBench as unsolved
- nobody measures how often a manager accepts a false "done" from a worker on real work
  - evidence: the false success study is on single agents; OrchestraBench uses an arithmetic chain and says it makes no workload claim; MAST traces come from benchmark runs of open frameworks
  - I found no study of a manager and worker system that one person uses daily for months
- nobody tests whether a team's role split helps once the single agent has the same tools and checks
  - evidence: JARVIS, AutoGen's safeguard, and MetaGPT all change the checks and the roles together
- routing with a checker that cannot be fooled is untested
  - evidence: SWE-Router and AgentRouter learn the signal; the verify and repair paper assumes a noisy checker
- I did not look for negative evidence beyond my searches, so each "nobody" means "not found in the searches listed at the end"

research we can do

- 1. where delegation starts to pay
  - question: on long coding tasks, at what task length and at what coupling between parts does a manager with workers beat one agent that gets the same dollars?
    - coupling means how much one part needs to know about another
  - why open: see the first gap; the theory in Tran and Kiela predicts a crossover and nobody has located it
  - first experiment
    - tasks: Commit0 and a set of fresh multi-file tasks, binned by size and by a coupling score from the dependency graph of the reference solution
    - arms, all with the same model and the same dollar cap
      - one agent, with the harness's normal context compaction
      - one agent that restarts with a fresh context and a written handoff between parts
      - manager with workers one at a time
      - manager with workers in parallel in worktrees
      - the same model run n times alone, best result picked by the tests
    - count every token, including the manager's, discarded work, and merges
    - at least 100 tasks and 3 runs each, so intervals are a few points wide
  - convincing result: a curve of success per dollar against size and coupling that shows where each arm wins, with intervals that do not overlap at the ends; "the restart arm gets most of the gain" would be a clean and useful negative result for teams
  - cost: I guess a few thousand dollars of API use and 4 to 6 weeks for one person, mostly harness work
  - closest work that could scoop it: Kim et al. (add coding tasks at scale), Geng and Neubig (add cost matching), OrchBench (already models information loss in a simulator)
  - why us: the human runs the restart arm and the manager arm daily, so the harness knowledge is there
- 2. an independent stress test for shared-state agent runtimes
  - question: under the same contended workloads and injected faults, which runtime keeps the final state correct, and what does each cost in tokens and time?
  - why open: see the second gap; every runtime paper grades itself
  - first experiment
    - workloads with a known set of correct end states: a shared repository, a small Kubernetes cluster, a ticket system with budgets
    - contention as a dial: number of agents, share of objects touched by more than one agent, share of clashes that are clashes of meaning
    - faults: kill a worker mid-write, delay a notification, deliver a message twice
    - systems: plain shared directory, lock files as in the C compiler post, worktrees with merge, STORM, CoAgent if released, a durable workflow engine
    - a checker that takes the log of tool calls and the end state and reports lost updates, stale reads, and orphaned half-done work, in the style of Jepsen
    - a scripted worker arm with no model, to separate the runtime's fault from the model's
  - convincing result: a table of anomaly counts per runtime per fault that the runtime authors can reproduce, plus at least one anomaly found in a published runtime
  - cost: 2 to 3 months for one systems person; API cost small if a cheap model drives the workers
  - closest work that could scoop it: the position paper's authors (they also wrote Silo-Bench), Khan (has detectors and harnesses), the CoAgent group
  - risk: this area moved fast between March and September 2026; I would check arXiv again before starting
  - a Verus angle exists but is thin: Khan's model assumes replayed deterministic output, and CoAgent's guarantee rests on the agent judging a clash correctly, which no proof covers
- 3. evidence in worker reports
  - question: how often does a manager accept a false "done" from a worker, and does forcing the report to carry evidence that plain code can check remove most of those cases cheaply?
    - evidence here means things like the test command and its output hash, the diff, the file paths, which the harness re-runs or re-reads itself
  - why open: see the third gap
  - first experiment
    - part A, measurement: take the human's own manager and worker logs, sample finished tasks, and check each "done" against the repository and test state at that time; label with the MAST modes
    - part B, control: on a coding benchmark with hidden tests, plant workers that return a wrong result with a confident report; compare a manager that reads the summary, a manager that reads the full trace, a model judge, and a harness that re-runs the evidence
    - measure false accepts, false rejects, and tokens the manager spends on review
  - convincing result: a false accept rate from real use with an interval, and an intervention that cuts it by a large factor at under, say, 10% extra tokens
  - cost: part A is a few weeks and nearly free; part B a few hundred dollars
  - closest work that could scoop it: Advani's false success study (extend to workers), OrchestraBench (extend to real workloads), TraceElephant
  - limits: one user's logs are a case study, and the logs may hold private text, so the human decides what leaves the machine
- 4. smaller: escalate on a sound checker
  - question: when a compiler or proof checker decides pass or fail, what is the cheapest rule for moving from a cheap model to a strong one, and does handing the strong model the cheap model's failed attempts help or hurt?
  - first experiment: Verus or Lean proof tasks; arms are strong only, cheap only, cheap then strong with and without the failed attempts, and SWE-Router's learned rule
  - closest work: SWE-Router, AgentRouter, AgentCARD, the verify and repair paper; the formal verification group in this study may cover the same ground from the prover side
- my order: 3A first because it is cheap and uses data only we have, then 1, then 2 if a fresh search still shows no shared benchmark

ChatGPT's opinion

- pending: ChatGPT is unusable until the human signs in, so no consultation was run for this revision
- the earlier attempt also failed and no answer was used

what I searched

- date: 7 October 2026
- web searches, 15 in all, with these themes
  - one agent against a team at equal token budget
  - manager, worker, delegation, and orchestration failure benchmarks
  - model routing and cascades for agents; strong planner with cheap executor
  - fixed workflow against free agent
  - several coding agents on one repository, merge conflicts, worktrees
  - subagent context isolation and information lost in handoff
  - debate against asking one model several times
  - domain agents, refusing to act, bounded repair
  - transactions and concurrency control for agent teams; a Jepsen-style checker
  - CooperBench; agreement between peer agents; false "done" reports
- sources opened: 41 arXiv records with full text where it loaded, 1 ACL Anthology page, 2 Anthropic engineering posts; 41 of the 44 are cited above
  - full text failed to load for the debate position paper and AgentRouter, so those rest on abstracts
  - I checked quotes by searching the downloaded text for the exact words
- not covered
  - no paper read cover to cover; numbers in tables other than the ones quoted are unchecked
  - venues: I report a venue only when the arXiv record states it; several 2023 and 2024 papers likely have one that I did not check
  - Google Scholar citation chasing, OpenReview reviews, and code repositories
  - automatic design of agent teams beyond AFlow; debate methods beyond one position paper
  - human teams and organization research
  - industry systems other than the two Anthropic posts
  - the paper collection at /hdd1/sichanghe/paper_collection was not consulted for this file
