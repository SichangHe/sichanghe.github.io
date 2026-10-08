what actually breaks in distributed systems: bug and outage studies
(authored by agents unless marked 🧑)

the problem

- first identify which failures a bug finder should prevent
- failure studies label bug tickets and postmortems by cause and ask which tests could have caught them
- agent inference from the selected studies: error handling, configuration, control-plane races, and feedback loops deserve testing alongside consensus
    - the selected studies do not establish their prevalence across all distributed systems

how it works

- pick a corpus
    - bug trackers (JIRA of Cassandra, HBase, HDFS, ZooKeeper...)
    - public postmortems and status pages
    - provider internal incident databases (Microsoft, cloud LLM providers)
- label each failure by trigger, root cause, symptom, fix
- count, then derive rules
    - e.g. "3 nodes are enough to reproduce almost everything"
- often build a small tool from the rules and report bugs it finds
    - Aspirator, NEAT, OmegaGen, CSnake

papers and systems

classic bug tracker studies

- [Simple Testing Can Prevent Most Critical Failures](https://www.usenix.org/conference/osdi14/technical-sessions/presentation/yuan), Yuan et al., OSDI 2014
    - [primary PDF](https://www.usenix.org/system/files/conference/osdi14/osdi14-paper-yuan.pdf), abstract and introduction inspected
    - 198 sampled user-reported failures in Cassandra, HBase, HDFS, MapReduce, and Redis
        - authors manually reproduced 73
        - 48 sampled cases were classified as catastrophic
    - "almost all failures require only 3 or fewer nodes to reproduce"
    - authors argue that simple error-handling tests could prevent most catastrophic failures in their corpus
    - abstract's Aspirator estimate: "Over 30%"
        - fraction of catastrophic failures the authors judge preventable by fixing its identified patterns
        - not a measured prevention rate in a deployment
    - authors report 143 bugs and bad practices confirmed or fixed across nine systems
    - I think this is still the single most useful paper for deciding where to aim a bug finder
- [An Analysis of Network-Partitioning Failures in Cloud Systems](https://www.usenix.org/conference/osdi18/presentation/alquraan), Alquraan et al., OSDI 2018
    - [primary PDF](https://www.usenix.org/system/files/osdi18-alquraan.pdf), abstract and introduction inspected
    - studies 136 reported failures across 25 systems
        - authors manually reproduced 24
    - authors report most "can be triggered by isolating a single node, and are deterministic"
    - introduces the NEAT partition injector
        - found and reported 32 failures across seven tested systems
    - introduction reports 21% persisted after the partition healed
        - fraction of the selected corpus, not a deployment-wide failure rate
- [Fail-Slow at Scale](https://www.usenix.org/conference/fast18/presentation/gunawi), Gunawi et al., FAST 2018
    - institutional reports of hardware that got slow instead of dying
    - "faults convert from one form to another, the cascading root causes and impacts can be long"
- [Understanding, Detecting and Localizing Partial Failures in Large System Software](https://www.usenix.org/conference/nsdi20/presentation/lou), Lou, Huang, Smith, NSDI 2020
    - studies partial failures: one module dead while its process remains alive
    - "these failures are caused by a variety of defects that require the unique conditions of the production environment to be triggered"
    - OmegaGen generates watchdogs

metastable failures

- [Metastable Failures in Distributed Systems](https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s11-bronson.pdf), Bronson et al., HotOS 2021
    - metastable = system stays broken after the trigger goes away, e.g. retry storm keeps the overload alive
    - "A systematic approach for building systems that are robust against unknown metastable failures remains an open problem"
- [Metastable Failures in the Wild](https://www.usenix.org/conference/osdi22/presentation/huang-lexiang), Huang et al., OSDI 2022
    - studies public incident reports of persistent failures across organizations
    - exact corpus and outage-share counts omitted pending primary source access
- [CSnake: Detecting Self-Sustaining Cascading Failure via Causal Stitching of Fault Propagations](https://arxiv.org/abs/2509.26529), EuroSys 2026
    - stitches many single fault injections into a chain to find loops
    - authors report 15 discovered bugs in five systems
    - current abstract reports five confirmed and two fixed
- [Characterizing Metastable Faults and Failures](https://arxiv.org/abs/2606.00942), Farahbakhsh, Lu, Alvisi, Haeberlen, van Renesse, arXiv 2026 (submitted to SOSP 2026 per arXiv)
    - gives a model of when stabilizing components combine into an unstable whole
    - "Metastable failures arise when scheduling decisions let these destabilizing interactions gain the upper hand over the individual components' stabilizing tendencies"
    - scope: three case studies; the abstract's claim of a general methodology needs validation on other systems
    - agent inference: model both scheduling and component interactions when studying recovery

deployment and configuration evidence

- [upgrades, configuration, and cross-system failures](deployment_and_configuration.md)
    - studies, testing tools, source limitations, and operational compatibility rules

classic studies verified on 7 Oct 2026, filling the earlier gaps

- [What Bugs Live in the Cloud?](https://ucare.cs.uchicago.edu/pdf/socc14-cbs.pdf), Gunawi et al., SoCC 2014
    - 21,399 issues from Hadoop MapReduce, HDFS, HBase, Cassandra, ZooKeeper, Flume over 2011 to 2014; 3,655 "vital" ones labeled by hand
    - "software bugs: logic-specific (29%), error handling (18%), optimization (15%), configuration (14%), data race (12%), hang (4%), space (4%) and load (4%)"
    - "we still find 13% of the issues are caused by hardware failures"
    - their conclusion on priorities: "cloud systems favor availability over correctness"
- [TaxDC: A Taxonomy of Non-Deterministic Concurrency Bugs in Datacenter Distributed Systems](https://ucare.cs.uchicago.edu/pdf/asplos16-TaxDC.pdf), Leesatapornwongsa, Lukman, Lu, Gunawi, ASPLOS 2016
    - 104 distributed concurrency bugs from Cassandra, HBase, MapReduce, ZooKeeper
    - "63% of DC bugs surface in the presence of hardware faults such as machine crashes (and reboots), network delay and partition (timeouts), and disk errors"
    - "More than 60% of DC bugs are triggered by a single untimely message delivery"
    - "47% of DC bugs lead to silent failures"
    - why it matters for testing: one message reorder plus one fault is enough for most of them, which is the design point of every fuzzer in [fuzzing](fuzzing.md)
- [What bugs cause production cloud incidents?](https://www.microsoft.com/en-us/research/?p=610323), Liu, Lu, Musuvathi, Nath, Padhye, HotOS 2019
    - 112 Azure incidents caused by software bugs, March to September 2018; numbers below are from [Adrian Colyer's summary](https://blog.acolyer.org/2019/06/21/what-bugs-cause-cloud-production-incidents/) since the Microsoft PDF link was dead
    - data-format bugs 21%, fault-related bugs 31%, timing bugs 13%, constant-value bugs 7%; 56% of incidents were resolved by mitigation rather than a code fix
    - the summary notes these are the bugs that survived CHESS, PCT, TLA+, fault injection, and fuzzing at Microsoft
- [Gray Failure: The Achilles' Heel of Cloud-Scale Systems](https://www.microsoft.com/en-us/research/wp-content/uploads/2017/06/paper-1.pdf), Huang et al., HotOS 2017
    - a component is broken for some observers and fine for others, so the failure detector says healthy and recovery never starts; I opened the PDF but my extractor could not pull a clean quote
- [Understanding Real-World Timeout Problems in Cloud Server Systems](https://conferences.computer.org/IC2E/2018/pdf/ic2e18_slides_tingdai.pdf), Dai, He, Gu, Lu, IC2E 2018
    - 156 timeout bugs from 11 Apache projects; search snippets say about 80% are misused timeout values or missing timeout checks; I saw only slides and snippets
    - the follow-on detector line is TScope and TFix, and in 2024 [Chronos](https://hit.globalimpact.cn/en/publications/chronos-finding-timeout-bugs-in-practical-distributed-systems-by-/) (IEEE S&P 2024, Chen et al.) fuzzes with injected delays: "Chronos has detected 27 timeout bugs in these real-world applications, which have been repaired by the corresponding maintainers"
- [How to Fight Production Incidents? An Empirical Study on a Large-scale Cloud Service](https://www.microsoft.com/en-us/research/?p=881646), Ghosh et al., SoCC 2022, best paper
    - "we carefully study hundreds of recent high severity incidents and their postmortems in a large cloud based service used by hundreds of millions of users"
    - looks at detection, root-causing, and mitigation stages together, not just root cause
- [Cores that don't count](https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s01-hochschild.pdf), Hochschild et al. (Google), HotOS 2021
    - "we observe on the order of a few mercurial cores per several thousand machines – similar to the rate reported by Facebook"
    - "we are accustomed to thinking of processors as fail-stop"; pairs with the Meta paper below
- [Smart Casual Verification of the Confidential Consortium Framework](https://arxiv.org/abs/2406.17455), Howard, Kuppe, Ashton, Chamayou, Crooks, NSDI 2025
    - not a bug study, but the best recent evidence of what spec-to-code checking catches in a real Raft variant: "find six subtle bugs in the design and implementation before they could impact production", with trace validation in CI
- [An Empirical Study on Kubernetes Operator Bugs](https://2024.issta.org/details/issta-2024-papers/139/An-Empirical-Study-on-Kubernetes-Operator-Bugs), Xu, Gao, Wei, ISSTA 2024
    - 210 bugs from 36 operators; the Go control-plane counterpart of the Hadoop era studies
- [Configuration Defects in Kubernetes](https://arxiv.org/abs/2512.05062), Zhang, Paul, d'Amorim, Rahman, arXiv 2025
    - "We study 719 defects that we extract from 2,260 Kubernetes configuration scripts"; their linter "revealed 26 previously-unknown defects"
- [Leveraging LLMs for Structured Information Extraction and Analysis from Cloud Incident Reports](https://arxiv.org/abs/2603.16818), Chu et al., ICPE Companion 2026
    - "we collect more than 3,000 incident reports from 3 leading cloud service providers (AWS, AZURE, and GCP), and manually annotate these collected samples"; LLM extraction accuracy "75%--95% depending on the dataset"
    - inference: this is the dataset to start from if we want a 2026 postmortem study without reading 3,000 reports by hand
- Raft implementation bugs: I found no dedicated empirical study; the closest evidence is ModelFuzz's 13 new etcd-raft and RedisRaft bugs in [fuzzing](fuzzing.md), the LeaseGuard paper's claim that "most Raft systems implement them incorrectly or not at all" for leases ([arXiv 2512.15659](https://arxiv.org/abs/2512.15659)), and Jepsen's etcd analyses
- Rust distributed systems bug studies: none found; the Go concurrency study (Tu et al., ASPLOS 2019, 171 bugs in Docker, Kubernetes, etcd, gRPC, CockroachDB, BoltDB) is the nearest, see [Rust tools](rust_tools.md)

specific bug classes

- [If At First You Don't Succeed, Try, Try, Again...? Insights and LLM-informed Tooling for Detecting Retry Bugs in Software Systems](https://knowledge.uchicago.edu/record/14028), Stoica et al., SOSP 2024
    - study of real retry bugs, then static and dynamic detectors
    - per the search abstract, "the ad-hoc nature of retry implementation in software systems poses challenges for traditional program analysis but can be well handled by Large Language Models"
    - also repurposes existing unit tests plus fault injection
    - the UChicago record's PDF link returned an HTML page, not the paper, so I still have no bug counts; the tool is called Wasabi and combines fault injection, static analysis, and an LLM (per the [Chameleon Cloud write-up](https://blog.chameleoncloud.org/posts/if-at-first-you-dont-succeed-try-try-again-insights-and-llm-informed-tooling-for-detecting-retry-bugs-in-software-systems/))

hardware silent data corruption

- [Silent Data Corruptions at Scale](https://arxiv.org/abs/2102.11245), Dixit et al. (Meta), arXiv 2021
    - CPUs computing wrong answers without raising any error, seen over hundreds of thousands of machines
    - these errors "are not captured by error reporting mechanisms within a Central Processing Unit (CPU) and hence are not traceable at the hardware level"
    - relevance: your verified code is only as correct as the core running it

2024 to 2026: AI and LLM systems

- [An Empirical Characterization of Outages and Incidents in Public Services for Large Language Models](https://arxiv.org/abs/2501.12469), Chu, Talluri, Lu, Iosup, ICPE 2025
    - status page data from 8 public LLM services (OpenAI, Anthropic, Character.AI)
    - "Failures in OpenAI's ChatGPT take longer to resolve but occur less frequently than those in Anthropic's Claude"
- [An Empirical Study of Production Incidents in Generative AI Cloud Services](https://arxiv.org/abs/2504.08865), Yan et al. (Microsoft, UIUC, ...), arXiv 2025
    - internal incidents of Azure style GenAI services
    - "Failures are inevitable in cloud-based GenAI services, resulting in user dissatisfaction and significant monetary losses"
- [Enhancing reliability in AI inference services: An empirical study on real production incidents](https://arxiv.org/abs/2511.07424), Ranganathan, Zhang, Wu, arXiv 2025
    - 156 high severity incidents from one LLM inference provider
    - "~60% inference engine failures, within that category ~40% timeouts"
    - abstract: "~74% auto-detected; ~28% required hotfix"
    - remaining mitigations include routing, node rebalancing, and capacity changes
    - the abstract does not quantify how many mitigations were manual
- [A Comprehensive Study of Bugs in Modern Distributed Deep Learning Systems](https://arxiv.org/abs/2512.20345), Ma et al., arXiv 2025
    - 849 issues from DeepSpeed, Megatron-LM, Colossal-AI
    - "45.1% of bug symptoms are unique to distributed frameworks"

public postmortems, 2024 to 2025

- agent inference: these selected reports suggest testing the contract between a producer and its consumers
    - selection was illustrative, not a representative outage sample

- [CrowdStrike Channel File 291 RCA](https://www.crowdstrike.com/wp-content/uploads/2024/08/Channel-File-291-Incident-Root-Cause-Analysis-08.06.2024.pdf), July 2024
    - RCA: "A runtime array bounds check was missing for Content Interpreter input fields on Channel File 291"
    - authors also report missing compile-time validation of the template's field count
- [Google Cloud Service Control incident](https://status.cloud.google.com/incidents/ow5i3PPK96RduMcb1SsW), June 12 2025
    - report: "This policy data contained unintended blank fields"
    - authors connect these fields to a null-pointer crash loop in Service Control
    - textbook Yuan et al. 2014: untested error path
- [AWS DynamoDB us-east-1 summary](https://aws.amazon.com/message/101925/), October 2025
    - AWS reports a "latent race condition in the DynamoDB DNS management system"
    - a slow DNS Enactor applied an old plan over a new one, cleanup then deleted it
    - this one is a classic interleaving bug a TLA+ model or a deterministic simulator could catch; good teaching example for you
- [Azure Front Door PIR YKYN-BWZ](https://azure.status.microsoft/en-us/status/history/?trackingId=YKYN-BWZ), October 29 2025
    - report: "across two different control plane build versions"
    - Microsoft attributes incompatible configuration metadata to a specific sequence of customer changes
    - mixed version bug, the same class as upgrade failure studies
- [Cloudflare November 18 2025 outage](https://blog.cloudflare.com/18-november-2025-outage/)
    - report: "output multiple entries into a 'feature file'"
    - Cloudflare attributes this output to changed database permissions
    - the doubled file blew a hardcoded 200 feature limit and the proxy panicked

what is used in industry

- facts from the sources above
    - AWS, Google, Microsoft, Cloudflare, CrowdStrike all publish root cause reports with remediation lists
    - remediations include validation, staged rollout, kill switches, and additional tests
        - CrowdStrike lists compile time field validation and runtime bounds checks
    - Meta runs fleet wide SDC detection per the 2021 paper
- my inference
    - these reports cannot establish adoption rates for research tools

known gaps and open problems

- Bronson et al. leave systematic prevention of unknown metastable failures open
- Lou et al. connect partial failures to unusual production conditions
    - agent inference: offline tests need workloads and faults representative of those conditions
- for partitions, "the number of test cases that one must consider is extremely large" (Alquraan et al. 2018, via abstract)
- LLM serving: Ranganathan et al. identify "further automation opportunities"
- evidence gap in this review: language-specific failure comparisons and studies of verified deployments
    - Go systems are already covered by the [NSDI 2025 slow-fault study](https://web.eecs.umich.edu/~ryanph/paper/xinda-nsdi25-preprint.pdf)
    - Table 1 includes etcd and CockroachDB
    - no claim that a Rust or verified-system study does not exist

research we could do

all proposals below are agent opinions; novelty is unverified

- config/data as the failure input
    - motivation: several selected reports involve inputs that a consumer mishandled
    - closest work: [ctests, cDep, ConfigX, and the EuroSys 2023 cross-system interaction study](deployment_and_configuration.md)
    - novelty question: can contract generation improve on configuration testing and ordinary property tests?
    - first experiment
        - identify public faulty and fixed implementations with comparable producer–consumer mistakes
        - derive a requirement from documentation before generating malformed inputs
        - compare existing configuration tests with generated contract checks
        - proprietary postmortems can suggest cases but do not provide their production code
        - a synthetic reconstruction tests plausibility, not reproduction of that exact outage
- verified Rust vs postmortem bug classes
    - question: which outage causes are excluded by a particular proof and its stated assumptions?
    - first experiment: select one existing verified system and label 50 relevant incidents against its actual specification
    - outcomes: excluded behavior, permitted behavior, environment assumption violation, unrelated subsystem, insufficient evidence
    - avoid a "typical Verus spec" category
        - Verus is a verifier; the author's specification determines what is proved
- TLA+ model of the AWS DNS Enactor race
    - teaching pilot: explain whether the published ordering can produce the reported outcome
    - closest: Huang et al. 2022 reproduce metastable failures as apps, not specs
    - first experiment: model plan application and cleanup from the report and check the proposed race
        - a reconstructed model does not establish the production code's exact behavior
        - producing a model alone is not an established research contribution
- an updated bug study on Rust/Go distributed systems (TiKV, etcd, CockroachDB, Garage)
    - closest: Yuan 2014 and Lou 2020
        - Yuan also studies Redis; its population is not exclusively Java
    - first experiment: sample 150 closed bugs, reuse Yuan's labels, see if the "error handling" share drops under Result types
- LLM agents as retry and error path testers
    - closest: Stoica et al. SOSP 2024 used LLMs for retry bugs
    - first experiment: give an agent the Yuan 2014 three rules and a repo, measure confirmed bugs per dollar vs Aspirator

how to make the proposed studies credible

- distinguish a fault from a bug and an outage
    - fault: injected or naturally occurring bad event
    - bug: code or design violates an intended requirement
    - outage: service users lose the promised behavior
    - an injected fault causing downtime is not automatically a bug
        - compare against the system's stated tolerance and service contract
- public postmortems have selection and disclosure limits
    - agent assessment: severe, publishable incidents are easier to observe
    - counts from selected reports do not estimate provider-wide incident rates
- status pages measure reported service symptoms
    - agent assessment: they cannot by themselves identify hidden root causes or user-level availability
    - use the LLM status-page study for reported recovery patterns, not language or architecture comparisons
- compare languages without attributing every difference to types
    - sample bug reports with explicit inclusion dates and severity rules
    - stratify by subsystem, code age, workload, and reporting practice
    - two independent labels per incident; publish disagreements and inclusion decisions
    - use a Rust/Go comparison as descriptive evidence first
        - causal claims need matched examples or controlled implementations
- recovery experiments must remove the trigger
    - report workload, admitted load, queues, retry rates, and time to recovery
    - test whether the same workload succeeds from a clean initial state
    - hypothesis: feedback-aware injection exposes persistent failures missed by crash-only tests
    - baseline: the same fault budget with random timing and no feedback
    - reject the hypothesis if improved yield vanishes across repeated seeds and workloads

additional verified primary source

- [Gray Failure: The Achilles' Heel of Cloud-Scale Systems](https://www.microsoft.com/en-us/research/wp-content/uploads/2017/06/paper-1.pdf), Huang et al., HotOS 2017
    - abstract: "applications are afflicted"
        - failure detectors can still see apparent health
    - example: a heartbeat can remain responsive while request handling is stuck
    - authors advocate reconciling different components' observations of failure
    - agent inference: pair injected faults with checks from both the client and the health detector
    - limitation: experience paper, not a representative statistical incident census

verification status, 2026-10-07 UTC

- this pass directly checked current arXiv abstracts for the AI studies, CSnake, and the 2026 metastability paper
- directly read the Gray Failure PDF and the NSDI 2025 slow-fault paper's introduction and system table
- upgrade/configuration extension directly read author-hosted PDFs
    - SoCC 2016 cloud outage study
    - SOSP 2021 upgrade study, NSDI 2026 UpFuzz, Spex, ConfValley, PCheck, ctests, cDep, Violet, ConfigX, Ctest4J
    - EuroSys 2023 cross-system interaction study and ICSE 2025 cloud-emulator study
    - inspected abstracts, introductions, and relevant limitations passages
- directly checked official Kubernetes and etcd compatibility guides
- directly checked AWS's October 2025 report
    - AWS remediation: "building an additional test suite"
    - this contradicts treating its response as process changes alone
- USENIX pages and PDFs returned HTTP 403 in this pass
    - older summaries remain inherited source notes, not independently reverified full-paper results
    - later direct conference-PDF URLs succeeded for Yuan 2014 and Alquraan 2018
- web search returned HTTP 404
    - direct HTTP reads succeeded for the sources named above
    - remaining reading is not evidence of absence

remaining reading

- CREB (crash recovery bugs, FSE 2018) and "Why Does the Cloud Stop Computing?" are covered in [bug class detectors](bug_class_detectors.md) and [deployment](deployment_and_configuration.md)
- the retry study's bug counts, and the HotOS 2019 paper's own text, still need the PDFs
- [runtime checking](runtime_checking_and_invariants.md) contains TaxDC and other concurrency-study leads
- publication pages that returned access errors still need alternative primary copies
