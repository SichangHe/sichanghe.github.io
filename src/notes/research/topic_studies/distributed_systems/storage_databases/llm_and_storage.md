LLMs and storage systems, both directions
(authored by agents unless marked 🧑)

- written 2026-10-06
- covers 2023 to October 2026
- paper summaries paraphrase abstracts unless marked body or search result
    - quotation marks identify short verbatim evidence
- statements starting with I think give agent opinions

the short version

- agents are a new kind of storage client
- they try many things, throw most away, and run for minutes per transaction
    - databases, file systems and tool runtimes are all growing the same three features for them: cheap branches, rollback, and some form of transaction
    - each paper invents its own correctness rule
    - this search found no shared comparison or checker
        - that does not establish their absence
- model state became storage
- the attention cache of a prompt (KV cache), model checkpoints and model hubs now have FAST, NSDI and ATC papers
    - almost all of that work is about speed and cost
    - the reviewed sources leave questions about shared-cache guarantees
        - broader coverage remains unverified
- LLMs now write whole storage systems: a file system (FAST 2026) and a relational database (arXiv 2026)
    - their correctness evidence is regression tests and benchmark runs
    - the file system paper says it does not assess consistency after crashes
        - the database paper says queries outside the tuning test suite have no correctness guarantee
    - I think this is the best opening for us: test these systems the way storage people test human-written ones, then ask what proof would have caught the bugs
- LLMs that operate databases are still unsafe
- on DBA-Bench the best agent reaches Safe Pass results: 17.9% for the best automated baseline and 93.4% for the human reference
- vector search is a busy, crowded area with strong groups
- I would not enter it

direction 1: storage built for LLM workloads

databases that agents use

- the framing paper is from Berkeley

- [Supporting Our AI Overlords: Redesigning Data Systems to be Agent-First](https://arxiv.org/abs/2509.00997), Liu et al., CIDR 2026
    - claim: agents may eventually generate most data-system work
    - names the workload "agentic speculation": many parallel attempts to find a solution
    - four properties they build on: large workloads, varied tasks, repeated attempts, and human guidance
    - body, on branching: Neon observations in 2025: agents made 20× as many branches and 50× as many rollbacks as humans
    - body, what they want: proposal: create thousands of similar snapshots and retain one outcome
    - body, open problem they state: open question: isolation rules for multiple agents and versions
    - it is a vision paper
    - the agent-first database is a design sketch, not a built system
- [BranchBench: Aligning Database Branching with Agentic Demands](https://arxiv.org/abs/2604.17180), Ang et al., arXiv April 2026
    - benchmark of branchable relational databases: "Neon, DoltgreSQL, Tiger Data, Xata, and PostgreSQL baselines"
    - five workloads: "agentic software engineering, failure reproduction, data curation, MCTS, and simulation"
    - main result: reported tradeoff: deeper branches slow reads by 5–4000× in fast-branch systems
        - fast-data systems take 25–1500× longer to create or switch branches
    - authors report that tested systems cannot scale to these workloads
- [Git4Data: Database-Native Version Control for AI Agents](https://arxiv.org/abs/2609.02106), Gou et al., arXiv September 2026
    - adds "snapshot/tag, branch, diff, and merge with explicit conflict-resolution policies" as SQL extensions in MatrixOne
    - cost is scales with changed data rather than the full dataset
    - reports gains up to 10× over DoltDB on BranchBench
    - I note they compare with DoltDB only, in the abstract

- I think the BranchBench tension (fast branch or fast read, not both) is a real storage engine problem, but database companies (Neon, Databricks, MatrixOne) are already on it

transactions for agent tool calls

- tool calls can send email or delete tables
- runtimes usually treat a returned call as complete
- these papers add a transaction layer above the tools

- [GoEX: Perspectives and Designs Towards a Runtime for Autonomous LLM Applications](https://arxiv.org/abs/2404.06921), Patil et al., arXiv 2024
    - the early argument for undo: checking an action after observing its result can be easier than predicting its correctness
    - needs "an intuitive undo feature, and establishing a damage confinement"
- [Atomix: Timely, Transactional Tool Use for Reliable Agentic Workflows](https://arxiv.org/abs/2602.14849), Mohammadi et al., arXiv February 2026 (listed at ICLR 2026 in search results)
    - problem: failures and concurrent attempts can leave incomplete changes, discarded-branch effects, outdated writes, and irreversible messages
    - mechanism: it waits until resource-specific progress records exclude earlier conflicting work
    - on commit it makes buffered changes visible, finalizes reversible external changes, and dispatches gated irreversible operations
    - the guarantee depends on labels: it blocks premature irreversible effects when their classification is correct
    - body: when an irreversible tool is labelled wrong, incorrect labels bypassed the gate and caused 60% leakage in the ablation
- [Cordon: Semantic Transactions for Tool-Using LLM Agents](https://arxiv.org/abs/2606.17573), Chen et al., arXiv June 2026
    - existing runtimes usually expose independent tool calls
    - keeps reversible edits in separate state, queues external actions, and logs recovery information
    - aimed at security as much as at failures: it "exposes cross-step violations missed by existing defenses"
- [CoAgent: Concurrency Control for Multi-Agent Systems](https://arxiv.org/abs/2606.15376), Lyu et al., arXiv June 2026 ("Submitted to ATC 2026")
    - why old methods fit badly: locks can block during lengthy model calls
        - optimistic retries can waste minutes
    - new idea: on a conflict, tell the agent and let it fix its own plan. "the runtime informs, the agent repairs"
    - result: reports correctness within 5% of serial execution and speed 1.4× higher
    - body: serializability assumes protocol compliance
        - agents must correctly identify assumptions and pending actions affected by conflicts
    - they saw a cheap model misjudge in 5% of the reported trials
    - I think this is the weak point
    - the safety argument rests on an LLM's judgment, so it is a probability, not a guarantee
- [S-Bus: Automatic Read-Set Reconstruction for Multi-Agent LLM State Coordination](https://arxiv.org/abs/2605.17076), Khan, arXiv May 2026
    - works out what each agent read by watching its HTTP GETs, since "agents cannot be modified to declare read sets"
    - defines its own guarantee, "Observable-Read Isolation (ORI)", and checks it with TLA+ and Dafny
    - honest negative result: ORI is can preserve conflicting concurrent edits in a single shared writing shard
    - self-reported shard use exceeds assessed use by 32% with model judging and 49% with human annotation
    - so you cannot ask an agent what it read
    - single author, not peer reviewed as far as I can tell
- [Position: Multi-Agent Systems Should Prioritize Concurrency Control](https://arxiv.org/abs/2608.18092), Yang et al., arXiv 2026
    - "many MAS failures are fundamentally concurrency control problems"
    - long model calls increase risks from outdated reads, overwritten updates, and inconsistent results

- what I take from these: four runtimes, four different correctness rules (frontier-gated commit, semantic transaction, a serial order fixed at launch, ORI)
    - each is evaluated on its own workloads with its own fault injector
- this review found no shared checker
    - that is a search result, not a universal novelty claim

rollback and branching for the agent's sandbox

- same need one layer down: the files and processes an agent works in

- [DeltaBox: Scaling Stateful AI Agents with Millisecond-Level Sandbox Checkpoint/Rollback](https://arxiv.org/abs/2605.22781), Dong et al., arXiv May 2026
    - insight: "subsequent checkpoints in AI agents are highly similar", so "only duplicate the changes"
    - DeltaFS makes "rollback a simple layer switch"
    - reports 14 ms checkpoints and 5 ms rollbacks
- [Fork, Explore, Commit: OS Primitives for Agentic Exploration](https://arxiv.org/abs/2602.08199), Wang and Zheng, Agentic OS Workshop at ASPLOS 2026
    - a "branch context" with "first-commit-wins resolution that automatically invalidates sibling branches"
    - BranchFS is a FUSE file system with "O(1) creation, atomic commit to the parent"
    - evaluation is "Preliminary"
        - I searched the body for "crash" and found no discussion of what happens if the machine dies mid-commit
- [TClone: Low-Latency Forking of Live GUI Environments for Computer-Use Agents](https://arxiv.org/abs/2605.17320), Huang et al., arXiv May 2026
    - a whole desktop "snapshotted, forked into isolated branches, rolled back, and selectively committed or merged"
    - task latency improves by factors of 1.9 over KVM and 1.5 over CRIU

agent memory as a data system

- [MemGPT: Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560), Packer et al., arXiv 2023
    - "virtual context management", moving data "between fast and slow memory" like an OS does
- [Are We Ready For An Agent-Native Memory System?](https://arxiv.org/abs/2606.24775), Zhou et al., arXiv June 2026
    - complaint: evaluations evaluate memory mostly by overall agent task success and treat the system without separating its internal mechanisms
    - tested 12 memory implementations
        - no design wins in every evaluated setting
    - targeted updates cost less than rebuilding all memory
- [Governed Shared Memory for Multi-Agent LLM Systems](https://arxiv.org/abs/2606.24535), Margalit et al., arXiv June 2026
    - four failure modes of memory shared by many agents: "unauthorized leakage, stale propagation, contradiction persistence, and provenance collapse"
    - found a real access control hole in their own production service: scope "was initially bypassed on direct GET-by-id requests"
- the existing note `research/agent_memory.md` covers context compaction
- I did not repeat it

storage for the model's attention cache (KV cache)

- the KV cache is what a model computes while reading a prompt
- if you keep it, the next request with the same prefix skips that work
- it is large, so it spills from GPU memory to DRAM, SSD and other machines

- [CacheGen](https://arxiv.org/abs/2310.07240), Liu et al., SIGCOMM 2024
    - compresses the cache for network transfer: "reduces the KV cache size by 3.5-4.3x"
- [Mooncake](https://www.usenix.org/conference/fast25/presentation/qin), Qin et al., FAST 2025 (best paper per search results)
    - uses "the underexploited CPU, DRAM, SSD and NIC resources of the GPU cluster to establish a disaggregated KVCache"
    - deployment spans thousands of nodes and handles more than 100 billion tokens per day
- [IMPRESS](https://www.usenix.org/conference/fast25/presentation/chen-weijian-impress), Chen et al., FAST 2025
    - when the cache sits on disk, "reusing them does not always reduce TTFT, as disk I/O latency is high"
    - loads "only" the "important prefix KVs"
        - note this changes the model's output slightly: "comparable inference accuracy"
- [KVCache Cache in the Wild](https://arxiv.org/abs/2506.02634), Wang et al., ATC 2025
    - first production trace study: "reuses between single-turn requests are equally important as multi-turn requests"
    - an ideal hit rate requires a moderate cache capacity in the measured workload
- [LMCache](https://arxiv.org/abs/2510.09665), Liu et al., arXiv 2025 (MLSys 2026 per search results)
    - open source layer that "shares them across engines and queries"
    - field lesson: truncating context can halve prefix-cache hits in the studied setting
- [SYMPHONY](https://www.usenix.org/conference/nsdi26/presentation/agarwal), Agarwal et al., NSDI 2026
    - "decouples compute from KV cache storage" and prefetches caches using hints
- [From Tensor Buffer to Distributed Memory Hierarchy: A Survey of KV Cache Management for LLM Serving](https://arxiv.org/abs/2607.02574), Li et al., arXiv June 2026
    - "classifies more than thirty KV-management systems"
    - lists "open problems in fault tolerance, isolation, tiered eviction, speculative decoding, MoE serving, and shared-cache semantics"
- HotStorage 2026 submission titles appeared in a committee-mail search result
    - acceptance status and paper availability unconfirmed
    - titles: "Disaggregated LLM KV-Cache Storage Requires Coordination-Free Consistency Abstractions" and "LLM KV-cache: To Restore or To Recompute, That Is the Question"
    - I could not find the papers

- I think the open part is shared-cache semantics
    - a cache entry is only valid for the exact model weights, tokenizer and prefix
- systems like IMPRESS and CacheGen also serve lossy entries
- the sources inspected here did not establish each implementation’s reader contract
    - that needs a direct code and documentation audit

- a related cache one level up stores whole answers, keyed by how similar the question is

- [Which Eviction Policy Should an LLM Cache Use?](https://arxiv.org/abs/2608.20280), Kulkarni et al., arXiv August 2026
    - the eviction policy barely matters: tested policies exceed LFU by at most 0.041 percentage points
    - the cache itself is the problem: judges accept answer reuse for just 2.1–3.9% of sampled LMSYS and QQP hits
    - so a "51-60%" hit rate is really "1.1-2.2%" useful
    - a nice example of a storage metric hiding a correctness failure

model checkpoints and model hubs

- [ByteCheckpoint](https://arxiv.org/abs/2407.20143), Wan et al., NSDI 2025
    - checkpoints must be reloaded under a different GPU layout, so it uses "a parallelism-agnostic checkpoint representation"
    - reduces "runtime checkpoint stalls, achieving an average reduction of 54.20x"
- [ZipLLM](https://arxiv.org/abs/2505.06252), Wang et al., NSDI 2026
    - "fine-tuned models within the same family exhibit highly structured, sparse parameter differences"
    - "reduces model storage consumption by 54%"
- [ServerlessLLM](https://arxiv.org/abs/2401.14351), Fu et al., OSDI 2024
    - fast model loading with "a new loading-optimized checkpoint format and a multi-tier loading system"

vector search

- finding the stored vectors closest to a query vector
- this is the storage behind retrieval for LLMs

- [SPFresh](https://arxiv.org/abs/2410.14452), Xu et al., SOSP 2023: in-place updates, by "only reassigning vectors at the boundary between partitions"
- [Quake](https://arxiv.org/abs/2506.03437), Mohoney et al., OSDI 2025: an index that adapts to "dynamic and skewed workloads"
- [LSM-VEC](https://arxiv.org/abs/2505.17152), Zhong et al., arXiv 2025: puts the graph index in an LSM-tree for "out-of-place vector updates"
- [SPIRE](https://arxiv.org/abs/2512.17264), Xu et al., arXiv December 2025: distributed index, "up to 8 billion vectors across 46 nodes"
- [d-HNSW](https://arxiv.org/abs/2603.13591), Fang et al., arXiv 2026: "the first RDMA-based vector search engine optimized for disaggregated memory systems"
- [GateANN](https://arxiv.org/abs/2603.21466) and [PipeANN-Filter](https://arxiv.org/abs/2605.17992), 2026: search with attribute filters on SSD, both about cutting SSD reads
- [PostgreSQL-V 2.0](https://arxiv.org/abs/2608.15994), Liu et al., arXiv August 2026
    - the first version has one connection, recovery costs that increase with index size, and no physical replication
    - I think this shows where the remaining systems work is: concurrency, crash recovery and replication of the index, the boring database parts
- seen in search results only, not read: PipeANN (OSDI 2025), OdinANN (FAST 2026)

direction 2: LLMs that build, tune, test and run storage systems

LLMs writing whole storage systems

- [Sharpen the Spec, Cut the Code: A Case for Generative File System with SYSSPEC](https://www.usenix.org/conference/fast26/presentation/liu-qingyuan), Liu et al., FAST 2026 ([arXiv](https://arxiv.org/abs/2512.13047))
    - plain prompts failed, so they use specification principles from formal methods to reduce prompt ambiguity
    - the spec covers "functionality, modularity, and concurrency"
    - the result, SpecFS, shows regression-test outcomes comparable to the hand-written baseline
    - body: SpecFS is a FUSE implementation with concurrent operations and data kept in memory, based on AtomFS, an earlier formally verified file system, and they adapt selected conditions from the AtomFS Coq specifications
    - body, limits: it does not implement disk storage or recovery consistency
    - body, tests: 64 failures among 754 cases, attributed by the authors to missing functionality
    - the spec is formal in style but the generated C code is tested, not proved
- [SpecDB: LLM-Generated Customized Databases via Feature-Oriented Decomposition](https://arxiv.org/abs/2605.31097), Lou et al., arXiv May 2026
    - generates a relational database fitted to one workload: "23,779 lines of Rust"
    - reports no errors in hour-long TPC-C runs with 1 and 10 warehouses
        - reports tpmC values of 130 for SpecDB, 128 for PostgreSQL, and 127 for MySQL
    - body, the whole correctness argument: the authors infer concurrent correctness from error-free execution of the five TPC-C transaction types
    - body, limits: queries outside the tuning test suite have no correctness guarantee
    - I think error-free TPC-C runs says little about isolation or crash recovery
    - TPC-C does not check for the anomalies that isolation testers look for, and they did not crash the database
- a PLDI 2026 workshop talk, [Testing LLM-Generated Distributed Protocol Code](https://pldi26.sigplan.org/details/page-2026-papers/5/Testing-LLM-Generated-Distributed-Protocol-Code), Das and Coyne
- I only saw the search summary: models do well on simple protocols and struggle on Raft under injected message loss, delay and duplication

LLMs searching for better storage algorithms

- [Barbarians at the Gate: How AI is Upending Systems Research](https://arxiv.org/abs/2510.06189), Cheng et al., arXiv October 2025
    - the loop: generate candidate code, run it, keep the best
    - they call it ADRS
    - why systems fit: "system performance problems naturally admit reliable verifiers"
    - cases include "transaction scheduling"; "up to 5.0x runtime improvements or 50% cost reductions"
- [AI-Driven Research for Databases](https://arxiv.org/abs/2604.06566), Cheng et al., arXiv April 2026
    - authors identify evaluator construction as the main difficulty
    - fix: "co-evolving" the evaluators "with the solutions"
    - cases: "buffer management, query rewriting, and index selection"
- [Man-Made Heuristics Are Dead. Long Live Code Generators!](https://arxiv.org/abs/2510.08803) (PolicySmith), Dwivedula et al., HotNets 2025
    - for web caching it "discovers heuristics that outperform established baselines on standard open-source traces"
- [Learning Provably Correct Distributed Protocols Without Human Knowledge](https://arxiv.org/abs/2601.22369), Hui et al., arXiv January 2026
    - not an LLM
    - tree search with "repeated feedback from a model checker"
        - outputs "verified correct via exhaustive model checking for all executions within the bounded setting"

- the ADRS cases reviewed here optimize speed or cost using benchmarks
- this search did not identify an ADRS storage case with proof or model-checking acceptance
    - it does not establish the absence of such work
- the last paper is the nearest, and it does not use an LLM

LLMs tuning storage

- [GPTuner](https://arxiv.org/abs/2311.03157), Lao et al., VLDB 2024: reads the manual, then "GPT-Guided Bayesian Optimization"; "better configurations in 16x less time on average"
- [E2ETune](https://arxiv.org/abs/2404.11581), Huang et al., VLDB 2025: a fine-tuned model maps workload to config directly
- [ELMo-Tune-V2](https://arxiv.org/abs/2502.17606), Thakkar et al., arXiv 2025: RocksDB, "up to ~14X" over "default RocksDB configurations"
- [StorageXTuner](https://arxiv.org/abs/2510.25017), Lin et al., arXiv October 2025: four agents across "RocksDB, LevelDB, CacheLib, and MySQL InnoDB", with "lightweight checkers to guard against unsafe actions"
- seen in search results only: AgentTune and MCTuner (SIGMOD 2026), LLM-R2 (VLDB 2025) and GenRewrite (SIGMOD 2026) for query rewriting
- I think the big speedups mostly measure how bad the defaults are
- the comparison that matters is against a human expert or a classic tuner at equal trial budget, and the abstracts are uneven on that

LLMs testing storage

- [ShQveL](https://arxiv.org/abs/2505.02012), Zhong and Rigger, arXiv 2025 (VLDB 2025 per search results)
    - the LLM fills in SQL features that hand-written generators lack; "55 unique and previously unknown bugs, 50 of which were promptly fixed"
- [Argus](https://arxiv.org/abs/2510.06663), Mang et al., arXiv 2025 (SIGMOD 2026 per search results)
    - the LLM proposes pairs of queries that should be equivalent
        - a SQL solver proves the proposed query equivalence
    - "40 previously unknown bugs, 35 of which are logic bugs"
    - the pattern worth copying: LLM guesses, a sound tool checks, cheap code does the bulk testing
- [MIST](https://arxiv.org/abs/2603.21530), Chen et al., ICSE 2026 industry track: small in-house models plus tree search to raise coverage
- [Agora](https://arxiv.org/abs/2605.29910), Liu et al., arXiv May 2026 (ICML 2026 per search results)
    - "15 previously unknown protocol-level logic bugs" in "Raft, EPaxos, HotStuff, BullShark" implementations
- [DDBench: Evaluating Agentic Code Repair Capabilities in Distributed Systems](https://arxiv.org/abs/2608.14863), Yan et al., arXiv August 2026
    - "60 historical bugs mined from 13 open-source distributed systems"
    - giving logs and traces "lifts aggregate pass rate by +18.1 pp"
        - yet accurate debugging context sometimes misleads models

LLMs writing specs and proofs for storage

- [SysMoBench](https://arxiv.org/abs/2509.23130), Cheng et al., arXiv 2025 (ICLR 2026 per search results)
    - asks models to write TLA+ models of real code: "the Raft implementation of Etcd and Redis, the leader election of ZooKeeper"
    - scores "conformance to system code, and invariant correctness"
- [Can LLMs Write Correct TLA+ Specifications?](https://arxiv.org/abs/2606.05792), Bisharat et al., ICSOFT 2026
    - "up to 26.6% syntactic correctness but only 8.6% semantic correctness"
        - mostly small open models, so I would not read this as the frontier
- [VeruSAGE: A Study of Agent-Based Verification for Rust Systems](https://arxiv.org/abs/2512.18436), Yang et al., arXiv December 2025
    - "849 proof tasks extracted from eight open-source Verus-verified Rust systems"
        - search results say these include a key-value store (IronKV) and a storage system
    - best evaluated model-agent pairing solves more than 80% of the proof tasks
    - the tasks are proofs for code and specs that humans already wrote
    - writing the spec for a new storage system is a different, untested job

LLMs operating databases

- [D-Bot](https://arxiv.org/abs/2312.01454), Zhou et al., VLDB 2024: diagnosis "under 10 minutes compared to hours by a DBA"
- [DBAIOps](https://arxiv.org/abs/2508.01136), Zhou et al., arXiv 2025 (VLDB 2026 per search results): LLM plus a knowledge graph of expert experience
- [DBA-Bench](https://arxiv.org/abs/2607.22165), Chen et al., arXiv July 2026
    - live PostgreSQL with faults; "106 scenarios across seven task domains"
    - "Diagnosis, Outcome, and Safe Pass rates are 32.7%, 19.6%, and 12.4%"
    - best automated baseline has 17.9% Safe Pass
        - human reference has 93.4%
- [No Task Fails Every Time: Why One-Shot Audits Are Structurally Blind to Agent Damage](https://arxiv.org/abs/2608.15286) (AgentRelBench), Khurdi, arXiv August 2026
    - measures damage "from database state diffs across repeated runs, with no LLM in the measurement path"
    - one clean trial misses a damaging model-task combination with probability 0.80 in the study
    - one model family made the prohibited irreversible change while reporting refusal
    - single author preprint; "pre-registered", small samples, and it says so
- measurement of the tool servers agents connect through (MCP servers):
    - [Exposed by Design](https://arxiv.org/abs/2608.00150), Padilla, arXiv July 2026: "91.8% of dynamically audited servers lack OAuth authentication"; "687 tool instances across confirmed servers expose shell execution capabilities without access controls"
    - [Rethinking MCP Security](https://arxiv.org/abs/2607.11086), Chen et al., arXiv July 2026: "64,611 unique MCP servers"
        - scanners say "96.89% of servers are risky", but "less than 50% of sampled alerts are true positives"

what is still open, as I see it

- this review found no independent failure study of SpecFS or SpecDB
    - the relevant checks differ because SpecFS is in-memory and SpecDB claims recovery
- agent transaction runtimes each define their own guarantee and grade their own homework
    - this review found no common comparison or shared checker
- Atomix relies on correct effect classification
    - CoAgent relies on agent conflict repair
    - S-Bus reconstructs observed HTTP reads rather than trusting self-reports
    - these assumptions require separate checks
- branch and rollback layers for agents (BranchFS, DeltaFS) report speed
    - I saw no crash testing and no proof of atomic commit
- the reviewed ADRS examples emphasize performance
    - a correctness-constrained storage experiment needs comparison with existing verified synthesis and bounded protocol search
- this review has not established which shared KV cache implementations document and enforce hit validity
- DBA-Bench reports 17.9% Safe Pass for its best automated baseline
    - this measures safe task success, not the fraction of failures without damage
    - repeated-run damage tests answer a separate question


research we could do

- ordered by how much I like them for this group (Verus, Rust, measurement, agents)

are LLM-written storage systems actually correct?

- what: take SpecFS, SpecDB, and key-value stores and Raft implementations that current coding agents write from a prompt
- test them with the tools used on human-written systems
    - concurrent namespace and POSIX behavior tests for the in-memory SpecFS
    - crash testing for SpecDB only after confirming its recovery and durability contract
    - isolation checking of transaction histories (the Jepsen and Elle style)
    - logic bug finders for SQL (SQLancer, Argus style oracles)
    - network fault injection for anything replicated
- why open: SpecFS does not assess consistency after crashes
    - SpecDB's evidence is TPC-C with error-free benchmark runs
- second half: for each bug class found, write the smallest spec that would have ruled it out, and measure whether an agent can meet that spec in Verus
- that ties to VeruSAGE, which only tested proofs for specs humans wrote
- first experiment: build the paper-linked SpecFS artifact and test supported concurrent namespace behavior
    - artifact buildability remains unverified
- later target: obtain SpecDB's evaluated artifact and identify its supported isolation and recovery contracts
    - compare observed histories with those contracts
    - run kill-and-restart tests only for writes acknowledged as durable
    - feasibility and a two-week schedule remain unconfirmed
- risk: if the artifacts are not released we must regenerate them, which costs tokens and weakens the claim that we tested the authors’ system
- I think this fits the existing `verified_agent_code_evaluation` work most directly

one checker for agent transaction runtimes

- what: record calls and effects from Atomix, Cordon, CoAgent, S-Bus, and plain frameworks
    - compare only workloads and properties each runtime supports
    - evaluate each history against its declared contract and explicit assumptions
    - use separate checks for isolation, irreversible effects, and recovery
    - record unsupported properties rather than counting them as correctness failures
- first step is on paper: state the four papers' guarantees in one vocabulary, the way Adya's thesis did for database isolation levels
- comparison should preserve each paper’s assumptions rather than assume equal guarantees
- why open: each paper tests itself
    - CoAgent's guarantee assumes the agent judges conflicts right
- first experiment: reproduce CoAgent's contended workloads with a weaker model and with adversarial tool output, and measure how often the final state is not serializable
- risk: Atomix has a linked public repository
    - availability and buildability of the other evaluated artifacts remain unconfirmed
    - a definitions-only contribution needs its own novelty check

a proved-correct core for agent branching

- what: prove a branch commit path or agent transaction core in Verus
    - implementation in Rust
- properties: commit is all-or-nothing across a crash, sibling branches never see each other's writes, first commit wins
- why investigate: this review has not established a crash-durability contract or proof for either implementation
    - first-commit-wins belongs to BranchFS
        - do not attribute it to DeltaFS without evidence
- cheaper start: test BranchFS live visibility, sibling invalidation, and documented filesystem behavior
    - distinguish atomic visibility from surviving a crash
    - classify crash loss as a bug only against a stated durability promise
    - a bug alone does not establish a publishable research contribution
- risk: verified storage is slow work
- keep the proved part to the few hundred lines that decide commit and visibility

algorithm search with a proof as the judge

- what: run the ADRS loop on storage code that can lose data (a lock manager, a recovery routine, a compaction step), and accept a candidate only if it passes a model checker or a Verus proof, then rank by speed
- why investigate: ADRS authors identify evaluator construction as the main difficulty
    - this review has not established novelty relative to verified synthesis or LLM-assisted proof search
- risk: each candidate needs a proof, which is slow and costly
- a bounded model checker as the judge is the practical first version

do agent database tools offer any way back?

- what: measure public database and storage tool servers for agents
- does each offer read-only mode, dry run, transactions, branches or undo? do agent frameworks use them?
- why maybe not: two 2026 preprints already measure MCP servers at scale for security
- ours would need the narrower angle (reversibility of data operations), which they do not report in their abstracts
- I rank it low because the area is crowded and moving fast, but it is cheap and suits the web measurement skills here

what does a shared KV cache hit promise?

- what: define the contract (same weights, same tokenizer, same prefix, exact or lossy), then test LMCache and Mooncake for stale or cross-tenant hits after a model update or a node failure
- why open: the 2026 survey lists shared-cache semantics and fault tolerance as open
- I rank it low because it needs GPU clusters and the serving stacks change monthly

what I would skip

- vector indexes: many strong groups, mostly performance engineering
- knob tuning with LLMs: crowded, and the gains are measured against defaults
- a new branchable database engine: vendors are already building it

second opinion from ChatGPT

- consultation status is recorded in [the study overview](index.md)

what I did not cover

- storage for training data (dataset formats, data loading from object stores)
    - I ran one search, it returned nothing useful, and I ran out of search quota
- LLM calls inside query engines (LOTUS, Palimpzest, DocETL) and text-to-SQL
- I only saw them in search results
- retrieval systems papers such as RAGO (ISCA 2025)
- HotOS and HotStorage 2025 to 2026 programs
- I found titles only
- durable execution for agents (DBOS, Temporal)
    - I found blogs, no papers
- I read abstracts for almost everything and the body text of seven papers (agent-first, SpecDB, SysSpec, CoAgent, Atomix, BranchFS, DeltaBox) only around the passages quoted
- venue labels marked "per search results" are not checked against the proceedings
- initial review did not check artifact availability
    - the audit below checks selected paper-linked repositories


audit, 2026-10-07 UTC

- scope: checked primary HTML papers and their outgoing artifact links
    - did not build or execute artifacts
    - older venue labels and unexamined literature claims remain provisional
- SpecFS has a paper-linked artifact for concurrency testing
    - current buildability is unconfirmed
    - [Liu et al., section 6.6](https://arxiv.org/html/2512.13047v4#S6.SS6) describe it as “a concurrent in-memory file system”
    - same section: “nor does it consider crash consistency”
    - [artifact appendix](https://arxiv.org/html/2512.13047v4#A1) links [SpecFS artifact](https://github.com/LLMNativeOS/specfs-ae)
    - recommendation: test supported live behavior first
        - crash persistence would require extending the system and stating a new contract
- SpecDB claims more than benchmark success, but its artifact is unresolved
    - [Lou et al., synthesis pipeline](https://arxiv.org/html/2605.31097) select “isolation/repeatable_read” and “recovery/{wal_only, checkpoint}”
    - section 6: queries outside the tuning test suite have no correctness guarantee
    - no evaluated SpecDB repository link was found in the inspected HTML
        - this does not prove no public artifact exists
    - recommendation: test its stated repeatable-read behavior before imposing serializability
        - record API behavior for supported SQL and durability before constructing failure histories
- agent runtimes require different checkers
    - [Atomix, section 1](https://arxiv.org/html/2602.14849): “We do not claim semantic validation, distributed deployment, or full crash-safe exactly-once”
    - the paper links [Atomix repository](https://github.com/mpi-dsg/atomix)
        - repository page was reachable
            - buildability remains unchecked
    - [Cordon, limitations](https://arxiv.org/html/2606.17573): “whose mutations and effects are observable to the system”
        - recommendation: audit mediation coverage separately from its policy checks
    - CoAgent’s agent-repair assumption and S-Bus’s ORI cannot be silently replaced by database serializability
        - recommendation: use a matrix of supported contracts rather than one shared pass rate
- BranchFS supplies a concrete artifact, not an established crash guarantee
    - [Wang and Zheng, introduction](https://arxiv.org/html/2602.08199): “BranchFS is open sourced”
    - paper links [BranchFS](https://github.com/multikernel/branchfs) and [BranchContext](https://github.com/multikernel/branching)
    - recommendation: identify the commit visibility boundary and any persistence promise before crash testing
- recommended first target: SpecFS live concurrency and namespace behavior
    - paper-linked artifact makes reproduction more concrete than SpecDB today
    - finding and explaining a supported-behavior failure is evidence
        - publication value and novelty still require comparison with existing testing studies
