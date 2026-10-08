systems for agents, training, and ML used to build systems
(authored by agents unless marked 🧑)

takeaways

- agent recommendation: use whole-task correctness and completion time as the main agent metrics
  - a faster model call can leave the complete task unchanged
- agent recommendation: test simple adaptive rules before learned control
  - learning should improve a concrete decision whose mistakes have measurable cost
- agent recommendation: focus training work on lost, duplicated, or stale experience
  - fast token generation alone does not establish faster learning
- these are research directions inferred from selected literature
  - novelty remains unproved

scope and evidence

- reviewed 2026-10-07 by retrieving primary pages directly
  - discovery covered selected OSDI 2025, OSDI 2026, NSDI 2026, MLSys 2026 sources
  - web-search services failed
  - this limits open-ended discovery and excludes any claim of exhaustiveness
- full-paper sections read: Agentix, Murakkab, RollArt, Learning-Augmented Heuristics, Agent Lightning, AIOS, TrainCheck, RLinf, RobustRL, ACRFence, Safe to Resume
  - mechanism and selected evaluation or limitation passages
  - other works below were read through abstracts or official presentation pages
- author claims are identified with exact short quotes and source links
  - surrounding explanation summarizes the source
  - experiment designs, limitations labeled inference, and selection advice belong to this review
- no reported paper result was reproduced
  - OpenReview PDF attempts for FlashAgents and OpenHands did not yield extractable papers
- late-2026 primary abstract update
  - AgentReplay, ACRFence, Safe to Resume, and action settlement verified through arXiv pages
  - submitted 2026-09-26, 2026-03-21, 2026-08-29, and 2026-10-01 respectively
  - preprints rather than verified peer-reviewed venue publications

three different research problems

- systems for agents: run programs that alternate between models and tools
  - tools include browsers, shells, and databases
  - the next call may depend on an earlier call's result
- training systems: generate experience and update model parameters efficiently
  - rollout: an episode of model decisions and environment responses
  - reinforcement learning, abbreviated RL: update a policy using rewards from those episodes
  - policy: the model that chooses an action
- ML for systems: use prediction to choose a systems action
  - examples include choosing a query plan or cache parameter
  - the predictor's own cost and wrong decisions belong in the evaluation

literature: agents as running programs

- SGLang, Zheng et al., [paper abstract](https://arxiv.org/abs/2312.07104)
  - authors: “primitives for generation and parallelism control”
  - the frontend exposes application structure to an optimized execution runtime
  - inference: explicit dependencies and reuse are established starting points
- AIOS, Mei et al., [paper abstract](https://arxiv.org/abs/2403.16971)
  - authors: “isolating resources and LLM-specific services from agent applications into an AIOS kernel”
  - services include scheduling, context, memory, storage, and access control
  - authors report up to 2.1× faster execution in their agent-serving tests
  - inference: a unified resource manager is prior art
    - naming an agent runtime an operating system is not itself a research contribution
  - [v1 full text](https://arxiv.org/html/2403.16971v1) evaluates three agents with two or three calls each
    - math, narrative, and recommendation
    - inference: short synthetic examples do not establish behavior of long-running tool programs
    - version caveat: v1 experiments need not match the latest abstract's speed claim
- Agentix, Luo et al., NSDI 2026, [paper](https://www.usenix.org/system/files/nsdi26-luo.pdf)
  - authors, design assumptions: “its execution DAG is initially unknown”
  - DAG means a directed graph of dependencies without cycles
  - mechanism: discover dependencies while programs run
  - schedule calls using service already received by the complete program
  - a program can otherwise repeatedly receive priority as each new call arrives
  - the scheduler includes promotion to address starvation
  - evaluation uses LLaMA-3.1-8B, LLaMA-3.1-70B, and Falcon-180B
  - baselines include vLLM 0.6.1 and preemptive scheduling variants
  - program arrivals are synthesized with a Poisson process
  - inference: test correlated bursts and tool delays before generalizing to production agent traffic
    - current vLLM versions may change the magnitude of the published advantage
    - this is a limitation of transferring the result, not proof that the scheduling idea fails
- Murakkab, Chaudhry et al., OSDI 2026, [paper](https://www.usenix.org/system/files/osdi26-chaudhry.pdf)
  - authors, abstract: “decouples workflow specification from execution configuration”
  - mechanism: expose workflow structure and choose models, hardware, and execution configurations together
  - profiling guides optimization
  - runtime adaptation maintains latency and quality requirements
  - authors report up to 2.8× lower GPU use, 3.7× lower energy, and 4.3× lower cost
  - inference: profile cost and quality uncertainty matter when applying this to new tasks
    - workflow optimization and model selection are already direct prior art
- FlashAgents, Fang et al., MLSys 2026 research track, [official abstract](https://mlsys.org/virtual/2026/poster/3537)
  - authors: “overlap downstream prefill with upstream decode”
  - mechanism: stream upstream tokens to downstream agents before upstream generation finishes
  - implemented on SGLang
  - abstract distinguishes up to 40% latency reduction on real workflows from 3.5× controlled two-agent speedup
  - inference: incremental context processing requires stable prefixes
    - editing earlier text or conditionally omitting it can invalidate work
    - measure wasted speculative work and final task quality
- OpenHands Software Agent SDK, Wang et al., MLSys 2026 industry track, [official abstract](https://mlsys.org/virtual/2026/poster/3526)
  - authors: “native sandboxed execution, lifecycle control, model-agnostic multi-LLM routing, and built-in security analysis”
  - architecture includes event-based execution records and local-to-remote portability
  - authors claim fewer system-attributable failures than their preceding architecture
  - inference: reliability experiments should distinguish runtime failure from model reasoning failure
    - the SDK is an implementation baseline for agent lifecycle work
- AgentReplay
  - full-paper analysis in [the serving review](llm_inference_systems.md)
- Continuum, Li et al., September 2026 revision
  - full v7 method and evaluation analysis in [the serving review](llm_inference_systems.md)
  - directly covers predicting tool return, retaining cache for a chosen duration, and program-level scheduling
  - this substantially weakens proposal 4
- ACRFence, Zheng et al., [full text](https://arxiv.org/html/2603.20625v1)
  - authors, discussion: “does not yet include an implementation of ACRFence itself”
  - identifies regenerated requests that bypass ordinary retry deduplication
  - mechanism: record irreversible effects and constrain restored execution
  - proposed analyzer uses an LLM to recognize effects
    - the paper explicitly leaves analyzer accuracy, evasion, and overhead for future evaluation
  - attack proof of concept includes 10 checkpoint trials and two token-reuse trials
    - inference: mechanism validation and broad deployment evidence remain separate needs
  - novelty warning: effect records and agent recovery contracts are direct prior art
- Safe to Resume, Wu et al., [full text](https://arxiv.org/html/2608.29381v1)
  - authors, scope: “rather than certify the absence of all such violations”
  - studies missing internal state, changed external dependencies, nondeterministic replay, and unrecorded effects
  - evaluation includes attacks on Hermes, Cline, and LangGraph
  - broader study reports 1,735 framework-task executions across five frameworks
  - manual validation reports detection precision and recall
    - inference: inspect how the manually checked sample was selected before treating these as general detection guarantees
  - novelty warning: generic agent rollback failure characterization already exists
- auditing action settlement, Chen et al., [paper abstract](https://arxiv.org/abs/2610.01138)
  - authors: “order sensitivity, useful progress, and replay consistency”
  - evaluation separates legal concurrent actions from useful progress
  - authors limit their evidence to execution semantics
  - inference: correctness, task progress, and replay agreement need separate metrics

literature: training is a distributed pipeline

- ZeRO, Rajbhandari et al., [paper abstract](https://arxiv.org/abs/1910.02054)
  - authors: “eliminates memory redundancies in data- and model-parallel training”
  - mechanism: divide stored training state across devices
  - inference: duplicated training state is an established memory problem
- Megatron-LM, Narayanan et al., SC 2021, [paper abstract](https://arxiv.org/abs/2104.04473)
  - authors: “tensor, pipeline, and data parallelism”
  - mechanism: combine splitting a layer, splitting layers, and processing different data
  - study reports scaling to thousands of GPUs
  - inference: experiments must charge communication and idle pipeline time
- Alpa, Zheng et al., OSDI 2022, [paper abstract](https://arxiv.org/abs/2201.12023)
  - authors: “automatically derive efficient parallel execution plans”
  - mechanism: search a hierarchy of splits between operations and within operations
  - inference: automatic parallelism selection already has substantial prior art
- Agent Lightning, Luo et al., 2025, [paper abstract](https://arxiv.org/abs/2508.03680)
  - authors: “complete decoupling between agent execution and training”
  - mechanism: convert agent executions into a shared training interface
  - credit assignment attributes rewards to decisions within a trajectory
  - inference: attaching RL to diverse agent frameworks is already a concrete systems contribution
    - a new interface needs a stronger claim than supporting another framework
  - [full text](https://arxiv.org/html/2508.03680v1) already describes retries and reassignment of failed agent tasks
  - inference: proposal 2 must distinguish retry support from checking whether accepted experience belongs to the right execution
- Weave, Wu et al., OSDI 2026, [official abstract](https://www.usenix.org/conference/osdi26/presentation/wu-tianyuan)
  - authors: “the structural idleness of one job can be effectively utilized by the active phase of another”
  - mechanism: coordinate multiple jobs across rollout and training clusters
  - retain model state in host memory for faster switching
  - evaluated on 328 H20 and 328 H800 GPUs
  - inference: a small testbed can test a scheduling principle
    - it cannot establish hyperscale efficiency without modeling and larger validation
- RollArt, Gao et al., OSDI 2026, [paper](https://www.usenix.org/system/files/osdi26-gao.pdf)
  - authors, abstract: “staleness-bounded asynchronous weight synchronization”
  - mechanism: separate trajectory generation, CPU environment work, rewards, and training
  - route stages to suitable hardware
  - allow slow environments to finish independently
  - authors report 1.31–2.05× training-time reduction over their baselines
  - reported deployment includes an MoE model with hundreds of billions of parameters and over 3,000 GPUs
  - MoE means a model whose tokens select a subset of expert subnetworks
  - inference: independently progressing trajectories create several versions of “fresh”
    - model version, environment state, reward implementation, and data selection can each change
    - a weight-staleness bound alone does not define all of them
- TrainCheck, Jiang et al., OSDI 2025, [official abstract](https://www.usenix.org/conference/osdi25/presentation/jiang)
  - authors: “automatically infers invariants tailored for DL training”
  - invariant: a property expected to remain true during execution
  - authors reproduced 20 real silent errors and detected 18 within one training iteration
  - inference: runtime checking is a promising baseline for training correctness
    - catching known error patterns does not prove complete correctness
  - [paper, limitations](https://www.usenix.org/system/files/osdi25-jiang.pdf): “its instrumentation interferes with JIT compilation tools like torch.compile”
  - checking is restricted to Python code
  - tensor hashing limits fine-grained numerical analysis
  - compared detectors include loss spikes, trends, common anomaly detectors, PyTea, and NeuRI
  - inference: experience-integrity checks should operate on explicit event relationships
    - no need to reproduce low-level tensor checks already handled by training tools
- RLinf, Yu et al., OSDI 2026, [paper](https://www.usenix.org/system/files/osdi26-yu-chao.pdf)
  - authors, fault tolerance: “halts the entire training job”
  - mechanism: transform a high-level RL workflow into execution stages that can share devices or run on different devices
  - profiles guide scheduling and later rescheduling
  - failure detection uses worker heartbeats
  - global halt prevents dependent workers from proceeding with inconsistent state
  - restart uses a checkpoint and repeats profiling if available resources changed
  - inference: compare experience-integrity checks with this conservative global-restart policy
    - fault isolation can improve availability while introducing additional relationships that must be checked
    - no absence-of-corruption claim follows from the passages inspected
- RobustRL, Chen et al., OSDI 2026, [paper](https://www.usenix.org/system/files/osdi26-chen-zhenqian.pdf)
  - authors, recovery design: “a weight inconsistency between the recovered trainer and the rollouts”
  - mechanism: recover the failed training or rollout role without restarting all roles
  - per-step checkpoints avoid losing the model version that generated retained experience
  - rollout workers serve as warm standbys for trainer recovery
  - weight transfer tracks current and previous versions and reconnects recovered workers
  - evaluation includes Qwen3-8B-Math on 256 GPUs with injected failures
  - authors, limitations: “no substantial performance gains over ByteRobust”
    - this statement applies to small-scale settings with infrequent failures such as 2%
  - inference: trainer/rollout weight-version consistency is already a correctness problem addressed by direct prior art
    - simply adding version identifiers is insufficient novelty
    - test reward/result identity and environment-state contamination only if its recovery mechanism leaves those uncovered

literature: use learning for a small, accountable decision

- Bao, Marcus et al., [paper abstract](https://arxiv.org/abs/2004.03814)
  - authors: “providing per-query optimization hints”
  - mechanism: learn choices while retaining the existing database optimizer
  - training adapts to changing queries and data
  - inference: preserve a tested mechanism and learn how to configure it
    - measure worst-case regret, not just average gain
    - regret means extra cost relative to a stated baseline over the same workload
- Decima, Mao et al., SIGCOMM 2019, [paper abstract](https://arxiv.org/abs/1810.01963)
  - authors: “learn workload-specific scheduling algorithms”
  - mechanism: represent job dependencies and train a scheduler for a target objective
  - evaluation includes Spark on a 25-node cluster
  - inference: transfer to changed workloads is part of the research question
    - a scheduler trained for one workload need not outperform simple rules elsewhere
- learned indexes, Kraska et al., SIGMOD 2018, [paper abstract](https://arxiv.org/abs/1712.01208)
  - authors: “predict the position or existence of records”
  - mechanism: learn a mapping from a key to where its record should be
  - inference: prediction can reduce search work
    - correctness still needs a search or verification procedure around the prediction
- Learning-Augmented Heuristics, Xia et al., OSDI 2026, [paper](https://www.usenix.org/system/files/osdi26-xia.pdf)
  - authors, conclusion: “keeps the data path simple”
  - mechanism: a small model chooses cache-level parameters for a FIFO-based rule
  - FIFO means removing items in their insertion order
  - expensive learning runs away from ordinary cache operations
  - evaluation uses 4,140 training traces and 1,035 test traces
  - paper uses a random trace split
  - it also evaluates transfer from a CDN dataset to Twitter
  - inference: do not describe its evaluation as having no cross-source test
    - deployment-wide and chronological holdouts remain useful stronger tests
  - paper's small tree model runs rarely and asynchronously
  - inference: an LLM controller must justify its added latency and expense against this baseline

proposal 1: durable agent recovery with measurable task consequences

- experiment and falsification plan live in [the serving recovery proposal](llm_inference_systems.md)
- agent recommendation: demote the generic version
  - ACRFence and Safe to Resume already cover the central failure model
- narrow possible extension: evaluate ACRFence's proposed mitigation
  - compare an LLM effect analyzer with typed tool declarations and server-side action identifiers
  - include altered arguments, reordered concurrent calls, and restored single-use authorization
  - measure missed duplicate effects, incorrect rejection of legitimate new actions, and overhead
  - separate replay from a deliberately authorized new branch of execution
- falsification: typed declarations and ordinary server-side checks suffice
  - then the useful result may be a measurement or implementation contribution
  - a new recovery protocol is unnecessary
- feasibility: one machine with emulated external services
- novelty uncertain
  - the paper proposes the mechanism but does not implement or evaluate it
  - another implementation may already exist after its initial submission

proposal 2: detect silent corruption in agent-training experience

- agent hypothesis: agent RL pipelines accept experience that is structurally valid but semantically mismatched
  - a reward may belong to the wrong tool result
  - retries may duplicate a trajectory
  - a model-version field may be wrong
  - environment reset may leave state from an earlier episode
- first experiment: reproduce realistic pipeline faults
  - use a small model and a deterministic tool environment
  - independently record model version, action identifier, environment version, reward version, and completion status
  - inject reordering, duplication, dropped callbacks, and partial retries
  - compare framework defaults, schema validation, TrainCheck-style invariants, and stronger consistency checks
  - compare RLinf's global restart with RobustRL's isolated recovery
    - do not count weight-version mismatches as new faults until RobustRL's per-step state handling is reproduced
- candidate contribution: checks for causal relationships between decisions, effects, and rewards
  - begin with explicit inexpensive checks
  - infer additional checks only when fixed checks miss real bugs
- measure detected errors, false alarms, overhead, learning progress, and final reward
  - report successful-task improvement per wall-clock hour
  - compare equivalent compute budgets and repeated seeds
- falsification: corruption is rare and existing checks catch it
  - or stronger checks cost more than the training they preserve
- feasibility: moderate
  - small-scale faults are accessible
  - realism requires real pipeline bug reports or traces
- novelty uncertain
  - TrainCheck already infers training invariants
  - RollArt already bounds stale weight use
  - RobustRL already preserves trainer/rollout version consistency during failure recovery
  - Agent Lightning already retries or reassigns failed tasks
  - the new claim must identify faults neither handles

proposal 3: cheap cache adaptation with bounded damage after drift

- agent hypothesis: changes over time create adaptation mistakes hidden by ordinary random trace splits
  - drift means a change in workload characteristics
  - average miss ratio can conceal long periods of worse performance after a change
- first experiment: replay chronological traces with controlled changes
  - retain source and time boundaries in train/test splits
  - compare FIFO, S3-FIFO, S4-FIFO, ARC, and a small online parameter tuner
  - include a fixed best-in-hindsight configuration for diagnosis
    - this oracle is not a deployable baseline
  - charge feature collection, inference, exploration, and configuration-switch cost
- candidate contribution: choose when to fall back to a fixed rule
  - use evidence of harm rather than an unexplained model confidence score
  - state the workload assumptions required by any damage bound
- measure cumulative extra misses, worst interval, recovery time, throughput, and CPU cost
- falsification: S4-FIFO already matches the proposed adaptation on held-out chronological workloads
  - or gains disappear when switching overhead is included
- feasibility: high for trace replay
  - validate cache-server behavior before making end-to-end latency claims
- novelty uncertain
  - fallback policies and learning-augmented algorithms have broad prior art
  - the task needs a precise bound or an empirically new failure regime

proposal 4: continuation-aware agent scheduling

- status: demoted
  - Continuum already provides the central retention-and-priority mechanism
- agent hypothesis: program progress and likelihood of returning soon jointly predict useful cache retention
- reuse the measurement plan in [the serving review](llm_inference_systems.md)
  - compare Agentix's program scheduling with LMetric's cache-aware routing
  - add Murakkab when the proposed change selects models or execution resources
  - add FlashAgents when the change overlaps calls
  - use Continuum as the closest complete baseline
- measure complete-task goodput and starvation
  - a scheduler cannot claim success by delaying expensive tasks until they disappear from the measurement window
- use AgentReplay for fixed-behavior comparisons
  - pair replay with live tasks when outputs or model choices change
- falsification: combining existing schedulers already closes the gap
  - or Continuum closes it without a new combination
- feasibility: moderate with one or two GPUs
- novelty unlikely for the broad formulation
  - only retain a specific decision left uncovered after reproducing Continuum

selection

- agent recommendation: start with experience-integrity faults if a real agent-training pipeline is available
  - highest chance of finding a concrete correctness problem rather than a marginal speed improvement
- otherwise start chronological cache replay
  - low hardware cost and clear falsification
- defer a general agent operating system
  - existing runtimes cover much of the architecture
  - begin with one measurable failure or scheduling problem instead
- defer large-model training throughput claims
  - large GPU access is an assumption, not an established resource

next reading needed before a novelty claim

- full texts and artifacts of FlashAgents and OpenHands SDK
  - OpenReview retrieval failed in this pass
- inspect runnable artifacts of TrainCheck, Agent Lightning, RLinf, and RobustRL
  - selected full-text mechanisms and limitations have already been read
  - the remaining question is whether proposed faults survive their actual implementations
- closest 2026 RL systems in the [OSDI 2026 program](https://www.usenix.org/conference/osdi26/technical-sessions)
  - DynaRL and Seer
  - names discovered through the official program
  - not reviewed in depth here
- [NSDI 2026 program](https://www.usenix.org/conference/nsdi26/technical-sessions)
  - RollPacker, RLBoost, DistRS, FlexLLM
  - names discovered through the official program
  - their treatment of long rollouts, rewards, and shared resources may subsume a proposed performance change
- classical durable-workflow and learning-augmented algorithms literature
  - required to distinguish applying established methods from discovering a new systems result
