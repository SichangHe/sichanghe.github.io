cloud resource management: serverless, fast scaling, fine-grained scheduling
(authored by agents unless marked 🧑)

source scope

- original review retained, with targeted primary-source checks on 7 Oct 2026
- performance numbers below are author reports under their evaluation conditions
- checked abstracts establish claims, not independent replication
- items marked unverified need a primary-source check before citation
- research ideas are agent recommendations, with novelty limits stated below

the problem in one paragraph

- providers share machines among customers with changing demand
    - reserving each customer’s peak wastes capacity
    - allocating on demand can make requests wait
- the mechanisms below reduce allocation delay
    - sandbox startup
    - orchestration and autoscaling
    - live CPU and memory resizing
- agent inference: fast mechanisms do not settle end-to-end behavior
    - compatibility, interference, failures, and recovery remain separate questions

words used below

- sandbox: the isolated box one customer's code runs in
    - container, lightweight virtual machine (microVM), or WebAssembly
- cold start: a request arrives and no sandbox is ready, so one must be created first
- warm start: a ready sandbox takes the request
- horizontal scaling: add more sandboxes
- vertical scaling: give one running sandbox more cores or memory
- snapshot: saved memory of an initialized sandbox, restored later to skip startup work
- control plane: the software that decides how many sandboxes run and where
- tail latency: the slowest few percent of requests
- oversubscription: selling more resources than the machine has, betting customers do not peak together
- durable execution: the platform saves a workflow’s progress so that it resumes recorded progress after a crash
    - steps may replay if their completion record was not saved
    - duplicate external effects require separate handling
- metastable failure: an overload that keeps itself going after its cause is gone

what the human already has

- talk note "Towards Microsecond-Scale vm Core Provisioning Agility on Serverless Platforms", Yibo Yan, NSL meeting
    - in [the reading notes](../../../../reading_notes/index.md)
    - now on arXiv as HyperFlux, see below
    - correction: HyperFlux names its guest operating system FluxOS
    - the overall system and its guest component have different names
- talk note "Granula Resource Demand Heterogeneity", Coulson Liang
    - the HotOS 2025 talk on Hiresperf, see below
- paper collection: almost nothing on this topic
    - "Serverless Runtime - Database Co-Design With Asynchronous I-O", EdgeSys 2024
    - "Cluster-Based Scalable Network Services", SOSP 1997
    - "VeriSMo: A Verified Security Module for Confidential VMs", OSDI 2024
    - "Difference Engine: Harnessing Memory Redundancy in Virtual Machines"
    - the rest is datacenter networking

literature: cold start

- some prototypes approach warm-start latency on their tested functions
    - comparison depends on language initialization, storage, networking, and the isolation boundary

- [Firecracker](https://www.usenix.org/conference/nsdi20/presentation/agache), NSDI 2020, AWS
    - the lightweight virtual machine monitor under Lambda; written in Rust
    - why it exists: "public infrastructure providers, who need both strong security and minimal overhead"
    - author report: millions of production workloads and trillions of monthly requests
- [Serverless in the Wild](https://www.usenix.org/conference/atc20/presentation/shahrad), ATC 2020, Azure
    - production Azure trace used as an evaluation workload in serverless research
    - "most functions are invoked very infrequently, but there is an 8-order-of-magnitude range of invocation frequencies"
    - consequence: keeping every function warm is hopeless, so cold starts must be cheap
- [Serverless Cold Starts and Where to Find Them](https://arxiv.org/abs/2410.06145), EuroSys 2025, Huawei
    - "a month-long trace of 85 billion user requests and 11.9 million cold starts from Huawei's serverless cloud platform"
    - [full primary methods, §§2 and 4](https://arxiv.org/html/2410.06145)
    - request and pod records cover five regions and 20 clusters over 31 days
        - not every function in those regions is included
        - function metadata covers one region
    - timestamps use milliseconds; recorded execution and cold-start durations use microseconds
    - component times distinguish pod selection or creation, code download/extraction, dependency loading, and networking/routing/scheduling
        - existing pod pools have popular runtimes and libraries preinstalled
        - default keep-alive is one minute, renewed on each request
    - Figure 11 plots hourly mean component times
        - these are not per-request tail percentiles or universal maximum delays
        - region and hourly workload composition affect the observed bottleneck
    - implication: preserve event-level distributions and separate pool selection from creation in comparisons
    - read-depth limit: selected full dataset, lifecycle, and component methods inspected
        - raw trace not independently analyzed
- [How Does It Function?](https://arxiv.org/pdf/2312.10127), SoCC 2023, Huawei; selected full §§2–5
    - authors: "over 7 months with over 1.4 trillion function invocations combined"
    - private: 200 internal functions, 141 observed days within 234 calendar days
        - second-resolution arrival counts and mean delays
        - minute-resolution resource measures and instance counts
    - public: 5019 functions, one availability zone, 26 consecutive days
        - released arrivals have minute resolution
        - cold-start, package-size, and language data withheld
    - pod-averaged utilization/delays cannot recover individual-request tails
    - platform delay includes scheduling and networking
        - correlations with instance allocation do not identify causal bottlenecks or cache behavior
    - forecasting selects ten functions with highest median request counts
        - private 38 training days in separated chunks, then seven validation and seven test days
        - public 20/3/3 days
    - inference: aggregate replay and forecasting need rare-function and within-bin burst controls
    - selected full characterization/forecasting methods read; artifact not executed
- [Fork in the Road (AFaaS)](https://www.usenix.org/conference/osdi25/presentation/chai-xiaohu), OSDI 2025, Ant Group and Tsinghua
    - authors: "control path latency" and "resource contention latency"
    - user-code initialization is the third source
    - authors report 18 months in production
    - [full primary methods, §§2, 4–6 and 8](https://www.usenix.org/system/files/osdi25-chai-xiaohu.pdf)
        - latency starts when a node receives a scaling request and ends with the function's response
            - earlier scheduler waiting is outside this boundary
        - replaces local runtime communication, pools setup resources, and clones progressively specialized initialized parents
            - unlike disk restoration, a suitable parent remains in memory
        - controlled tests use FunctionBench/SeBS functions on one 24-core server
            - compares progressively optimized Catalyzer variants, Kata cloning a prepared VM, and gVisor starting from scratch
            - these baselines do not begin with identical reusable state
        - production comparison covers eight Node.js functions over one day
            - CataOnly runs separately on matching hardware with mocked peer-service responses
            - not a randomized comparison across all production functions
        - limitations include runtime-specific integration and duplicated random state after cloning
            - random state must be reinitialized to preserve instance uniqueness
            - extreme concurrency still causes contention
    - read-depth limit: selected full methods read; traces and security not independently tested
- [Spice: Rethinking Process Snapshots for Near-Warm Serverless Cold Starts](https://www.usenix.org/conference/osdi26/presentation/holmes), OSDI 2026, MIT
    - "these limitations stem from a lack of OS support for snapshot restoration"
    - author report: restore and execution add 0.6–18 ms over warm invocation
    - compared systems add 3.6–1197 ms in those experiments
    - [full primary methods, §§2–5 and 7](https://www.usenix.org/system/files/osdi26-holmes.pdf)
        - reported invocation latency includes restoration and function execution
            - excludes container/isolation setup and platform orchestration
            - differs from AFaaS's local startup boundary and customer network latency
        - compares tuned CRIU, FaaSnap, and REAP from a cold host page cache
            - warm comparison retains state with cold CPU caches
        - FunctionBench plus Java/Node.js ports run on one server
            - mixed-load test scales Azure trace durations and maps them to benchmark functions
            - not original traced applications
        - pauses threads at a safe point and profiles later page accesses before preparing snapshots
        - unchanged files must remain available at restoration
            - prototype uses static paths; production needs content identity
        - process metadata restoration uses Junction's library operating system
            - unmodified application binaries run inside its sandbox
            - native-Linux metadata restoration and VM integration remain work
    - read-depth limit: selected methods/evaluation read; artifact and security not independently tested
- [Dandelion](https://arxiv.org/abs/2505.01603), SOSP 2025, ETH Zurich
    - drops the guest operating system: user code is pure computation, the platform does all input and output
    - sandboxes "cold start in hundreds of microseconds"
    - author reports: two to three orders less variability and 96% less committed memory
    - comparison is against Firecracker in the evaluated applications
    - cost: you must rewrite the application as a graph of pure functions
- [Fast end-to-end cloud application cold-start with initscripts](https://arxiv.org/abs/2608.07358), arXiv Aug 2026, MIT
    - the developer hands the platform a script of initialization work, so it runs while the platform still downloads the binary
    - [full primary methods, §§4–6](https://arxiv.org/html/2608.07358)
    - authors: “the costs of binary download and container creation are included”
    - start latency runs from spawning an instance until it begins handling its first request
        - excludes completion of that request
        - cold means the first application run on that machine
    - fetches initialization state while binaries and isolation are prepared
        - modified RPC client libraries return the prefetched results
        - library compatibility and result naming are part of deployment work
    - compares applications with and without initscripts on the same sigmaOS platform
        - eight 16-vCPU AWS machines for application experiments
        - separate bare-metal machine for snapshot-system comparison
    - reports average 1.67× start speedup for ServerlessBench functions fetching S3 inputs and weights
        - functions without that external fetching do not improve
    - unmodified memcached still reconstructs its data structures
        - compatibility copying through the filesystem costs about 85 ms
    - implication: compare first-request completion, transfer copies, and initialization work as well as start time
    - read-depth limit: selected full implementation and evaluation inspected
        - no artifact execution or generalized benefit claim
- [Sabre](https://www.usenix.org/system/files/osdi24-lazarev_1.pdf), OSDI 2024; selected full §§3–5
    - authors: "hardware-accelerated (de)compression"
    - Intel IAA losslessly compresses Firecracker snapshots
        - restoration overlaps decompression and disk reads
        - contiguous copying or scattered placement depends on page sparsity
        - buffer pools trade memory density for restoration speed
    - tested Sapphire Rapids, DDR5, 550-MB/s storage; end-to-end evaluation uses one IAA engine
    - dirty-page snapshots and working sets recorded during first invocation evaluated
    - vSwarm, FunctionBench, and SeBS workloads include changed DNA inputs and image sizes
        - synthetic Python-list illustrates an upper bound
    - working-set prefetching improves 25–55%; corresponding cold-start improvement reaches 20%
        - restoration speed is not first-request completion speed
    - held-out workloads, P99 estimates, and concurrent accelerator contention unspecified in selected methods
    - snapshot creation is outside the restoration path but retains deployment cost
    - inference: measure page coverage, accelerator occupancy, storage bandwidth, and request completion separately
    - selected full methods/evaluation read; artifact not executed
- [TrEnv-X](https://arxiv.org/pdf/2509.09525), March 2026 v2; selected full §§3–5/8–9
    - offline snapshots form deduplicated remote read-only templates
        - restoration copies metadata; CXL mappings and RDMA faults use copy-on-write
    - reuse kills processes and purges filesystem changes; network state persists
        - authors: “we need fallback to create absolutely clean network environment from scratch as usual”
        - fallback applies to network customization or stricter security
    - ten Python/Node functions on dual-32-core Xeon, experimental CXL, and Soft-RoCE
        - synthetic and Azure/Huawei patterns; restoration baselines enhanced with pooling and remote snapshots
        - up to 7× P99 end-to-end Azure improvement versus REAP+
    - six agents replay recorded LLM outputs and timing; 200 instances share 20 cores
        - startup improves 35–49% versus E2B; lazy faults follow startup
        - shared-browser P99 end-to-end improvement: 2–58%
        - peak-memory improvement: 10–61% versus E2B, up to 48% versus E2B+
    - cost model uses memory×duration, not measured energy or deployment expense
    - selected methods read; implementation, SLO guarantees, and snapshot-creation costs unvalidated
    - source CXL latency unit appears inconsistent; unresolved
- [Restoring Uniqueness in MicroVM Snapshots](https://arxiv.org/abs/2102.12892), 2021, AWS
    - snapshots can clone random state unless restoration supplies fresh state
    - authors: "restoring the uniqueness of the VMs"
    - examples include identifiers, secrets, and nonces
    - [full paper](https://arxiv.org/pdf/2102.12892), §§3–4: reseeding alone is insufficient if requests resume before reset hooks finish
    - proposed interfaces notify guests of a new instance generation or clear marked memory pages
    - experiment requirement: gate external connections and writes until required reset hooks complete
- older work I know but did not reopen: REAP and vHive (ASPLOS 2021), Catalyzer (ASPLOS 2020), FaaSnap (EuroSys 2022), Mitosis remote fork (OSDI 2023; checked below), SEUSS, SOCK

literature: control plane and autoscaling

- orchestration can dominate startup after sandbox creation becomes cheap

- [Dirigent](https://arxiv.org/abs/2404.16393), SOSP 2024, ETH Zurich
    - authors identify "the latency to schedule functions" as potentially much larger than sandbox startup
    - cause: Kubernetes writes state to its store on every scale step
    - clean rewrite; author reports 2500 sandboxes per second, 1250× Knative under its comparison
- [KubeDirect](https://arxiv.org/abs/2601.19160), NSDI 2026, Peking University
    - keeps Kubernetes, but lets controllers message each other and skip the central store
    - ephemeral controller state requires coordinated recovery
    - its recovery design and TLA+ model are covered below
    - "reduces serving latency by 26.7x over Knative"
- [The High Cost of Keeping Warm](https://arxiv.org/abs/2509.03104), arXiv 2025
    - rebuilt the scaling behavior of AWS Lambda and Google Cloud Run in an open system
    - creating and destroying instances burns "10-40% of the CPU cycles spent on request handling"
    - allocated memory exceeds used memory by "2-10 times"
- [Jiagu](https://arxiv.org/pdf/2403.00433), ATC 2024; selected full §§4–7
    - authors: "decoupling prediction and scheduling"
    - authors: “we simulate how Jiagu can optimize the cold start”
    - cached capacity tables support placement; misses require inference and later asynchronous updates
    - scaling stops routing before eviction, retaining instances for reactivation or migration
    - OpenFaaS prototype: 24 homogeneous Xeon machines, six benchmark functions, four Huawei-derived pattern sets
        - compares Kubernetes, reimplemented Gsight/Owl, and scaling-stage ablation
    - 81.0–93.7% scheduling-cost reduction versus Gsight
    - 57.4–69.3% cold-start reductions combine measured scheduling with simulated initialization
        - these are not deployed end-to-end request-latency measurements
    - new-function prediction errors converge after approximately 5–30 measurements
        - this does not establish temporal-shift robustness
    - inference: update work moves off placement's critical path rather than disappearing
        - include profiling, retraining, migration, and stale-table costs
    - selected full methods/results read; artifact not executed
- [Coach](https://arxiv.org/abs/2501.11179), ASPLOS 2025, Microsoft Azure
    - introduces CoachVMs with guaranteed and oversubscribed resource portions
    - pairs workloads whose resource peaks occur at different times
    - "Coach enables platforms to host up to ~26% more VMs with minimal performance degradation"
    - [full paper](https://arxiv.org/pdf/2501.11179), §§3–4: the capacity result comes from trace-driven simulation using a production scheduler
        - separate real-server experiments measure workload performance
        - does not establish a deployed fleet-wide 26% gain
    - characterization emphasizes VMs lasting over one day
    - monitoring every 20 seconds predicts demand over the next five minutes
        - inference: short agent bursts require separate measurements
        - compare burst duration with monitoring delay before reusing the predictor
    - the abstract singles out memory as the hard resource to take back
- [Harvest VMs](https://www.usenix.org/system/files/osdi20-paper-ambati.pdf), OSDI 2020, Azure; selected full §§4–7
    - authors: "grows and shrinks according to the amount of unallocated resources"
    - survival and available-core predictions support service objectives
        - population predictions rather than individual guarantees
    - fixed virtual-core count receives changing physical CPU allocations
        - regular VMs taking the minimum allocation trigger eviction
        - harvests unallocated CPU rather than reclaiming allocated idle CPU or memory
    - production-arrival simulation: 25 clusters, 14 regions, 45 training days and 45 evaluation days
        - ten-minute allocation-state resolution
    - separate real Hadoop deployments adapt task admission and give shrinking workers a 30-second grace period
        - masters remain on regular VMs; remote storage and replicas support recovery
    - 91% useful-core cost reduction versus one-core regular VMs assumes half-price additional evictable cores and includes recovery cost
        - average saving versus standard evictable VMs: 42%
        - not a universal cloud-bill reduction
    - inference: agent bursts need separate latency, checkpoint, retry, and external-effect tests
    - selected full simulation/deployment methods read; current pricing and artifact unchecked

literature: fine-grained scheduling

- move cores as demand changes instead of reserving each tenant’s peak

- [Shenango](https://www.usenix.org/system/files/nsdi19-ousterhout.pdf), NSDI 2019; selected full §§4–7
    - authors: "every 5 µs"
    - a dedicated IOKernel core coordinates allocation and packets
    - five-microsecond congestion polling is not core-transfer completion or request latency
    - guaranteed cores are not oversubscribed; critical sections can defer preemption
        - malicious refusal mitigation remains unimplemented
    - principal comparison budgets eight physical cores and sixteen hyperthreads
        - IOKernel consumes two hyperthreads; competing systems differ in networking capabilities
    - Poisson TCP arrivals, memcached, synthetic tasks, and background swaptions
        - sudden-load experiment uses synthetic one-microsecond work rather than production arrivals
    - measures median and 99.9th-percentile response latency alongside foreground/background throughput
    - selected full methods/evaluation read; runtime and isolation not independently verified
- [Caladan](https://www.usenix.org/conference/osdi20/presentation/fried), OSDI 2020, MIT
    - "fast core allocation instead of resource partitioning"
    - author-reported tail latency under shifting demand: 580 ms to 52 μs
    - limit: tenants are processes on one Linux host, not isolated virtual machines
- [Concord](https://dslab.epfl.ch/pubs/concord.pdf), SOSP 2023; selected full §§3–6
    - authors: "closely approximating" strict preemption and a single queue
    - authors: “developers must modify their code”
    - compiler checks shared signals; workers yield at checks rather than precise interrupt points
    - central queue and bounded local queues; idle dispatcher executes requests
    - external calls and annotated locks defer preemption
        - protected sections can raise tails; source and LLVM-compatible compilation required
    - principal evaluation: two connected Xeon machines, 14 workers, Poisson arrivals
        - synthetic tasks and memory-resident LevelDB, matched tail-slowdown targets
    - 83% greater throughput for one high-dispersion LevelDB workload with two-microsecond quantum
        - not a universal latency improvement; lighter-load tails can worsen
    - separate instrumentation averages about 1.04% overhead
        - quantum variation is empirical, not a worst-case bound
    - inference: test deferred sections, dispatcher saturation, and changing task mixtures
    - selected full design/evaluation read; artifact and production deployment unverified
- [Efficient Scheduling Policies for Microsecond-Scale Tasks](https://www.usenix.org/system/files/nsdi22-paper-mcclure_2.pdf), NSDI 2022; selected full §§3–6
    - authors: "static core allocations often outperform reallocation with small tasks"
    - inference: faster reallocation alone does not establish a better policy
    - static-allocation comparison assumes average load is “constant and known a priori”
        - changing means and longer tasks alter the result
    - simulation defaults: 32 cores, one-microsecond exponential tasks, Poisson arrivals, 50% mean load
        - models 100-nanosecond communication and five-microsecond allocation
        - excludes preemption, allocation-related cache effects, and statistics-reporting cost
    - Caladan implementation revokes cores between tasks
        - polling interval does not guarantee reclaim latency
    - real tests use memcached, Poisson UDP arrivals, and background swaptions on 32 hyperthreads
        - compares allocation policies on the same runtime, not whole Shenango/Caladan systems
    - similar median/P99 latency with higher background throughput
    - selected full model/implementation/evaluation read; production arrivals and independent execution unchecked
- [HyperFlux](https://arxiv.org/abs/2608.12633), arXiv Aug 2026, Yibo Yan and Seo Jin Park, USC
    - brings Caladan-speed core moves to hardware-isolated virtual machines
    - avoids guest vCPU hot-plug by changing physical backing of existing vCPU threads
    - author-reported core movement: 13 μs, including forced reclaim
    - author-reported footprint: 3.2 MB; cold boot: 1.37 ms
    - cores only; memory is not elastic here
- [Quicksand](https://www.usenix.org/conference/nsdi25/presentation/ruan), NSDI 2025, MIT, Brown, USC, VMware
    - splits an application into pieces that each use mostly one resource, then moves the pieces between machines in milliseconds
    - "resource proclets, granular units that each primarily consume resources of one type"
    - cost: the application must be written against Quicksand's data structures
- [Granny](https://www.usenix.org/conference/nsdi25/presentation/segarra), NSDI 2025, Imperial
    - same goal for OpenMP and MPI programs, using WebAssembly units that snapshot and migrate
    - "reduces the makespan for OpenMP workloads by up to 60% and the fragmentation for MPI workloads by up to 25%"
- [Granular Resource Demand Heterogeneity (Hiresperf)](https://sigops.org/s/conferences/hotos/2025/slides/slides102.pdf), HotOS 2025, Liang, Govindan, Park, USC
    - one request needs different hardware at different moments
        - slide example: a search request's two phases use 117 vs 218 bytes per microsecond of memory bandwidth
    - Hiresperf profiles each invocation's resource usage at 10 µs resolution
        - authors report 7–15% overhead or lower
    - the authors' own to-do list: "Batched Processing", "QoS with High Utilization", "Function as a service"
    - authors call for a "Proactive Approach", contrasting Caladan's reactive allocation

literature: the new workload, AI agent sandboxes

- AI code execution adds persistent sessions, idle intervals, and checkpointing
    - agent behavior belongs to the AI agents group
    - this page covers the execution platform

- [AWS Lambda MicroVMs](https://aws.amazon.com/blogs/compute/announcing-lambda-microvms-serverless-compute-environments-with-vm-level-isolation-and-near-instant-startup/), AWS blog, 10 Jul 2026
    - snapshots as a product: "MicroVMs are launched from MicroVM images, which are pre-initialized Firecracker snapshots"
    - aimed at "AI coding assistants and agents"
    - [official guide](https://docs.aws.amazon.com/lambda/latest/dg/lambda-microvms-guide.html): “vertically scale to 4x of configured baseline”
        - advertised capability, not independently measured scaling latency or availability
    - [official pricing](https://aws.amazon.com/lambda/pricing/): “You pay for baseline compute resources while your MicroVM is running”
        - additional consumed memory and CPU billed for active duration, per second
        - snapshot storage, reads, writes, and data transfer add costs
        - scaling description includes “up to 8GB / 4vCPU”
            - this may describe four times the default rather than a universal maximum
            - its second example scales an 8-GB baseline to 32 GB
            - effective maximum remains unchecked against service limits
    - read-depth limit: official announcement, guide, and pricing passages checked on 7 October 2026
        - no API execution, deployment, billing verification, or latency measurement
- [AgentCgroup](https://arxiv.org/html/2602.09345v3), submitted February 2026, revised July 2026, §§3 and 5–6
    - authors: “Image pull time is excluded from all reported initialization measurements”
    - 111 GLM tasks and 33 Haiku tasks, with the latter drawn from the former set
        - 144 executions do not mean 144 distinct tasks
        - one 24-core, 128-GB machine; initially unlimited Podman containers
    - resource characterization samples CPU and memory once per second
        - tool time includes dispatch, subprocess execution, and collecting the result
        - initialization includes image-layer ID remapping and agent startup
    - 55–60% lifecycle share combines initialization with tool execution
        - useful computation is included, not just avoidable OS overhead
    - maximum reported memory ratio is 4060 MB peak divided by 264 MB execution average
        - 15.4× belongs to one extreme task, not the typical task
        - one-second samples do not establish sub-millisecond burst timing
    - controller evaluation replays three memory traces at 50× speed on a different 16-GB machine
        - compares priority enforcement with no isolation under induced memory pressure
        - not a complete end-to-end coding-task or production-concurrency evaluation
    - tool-call hints and per-tool cgroups already overlap a proposed hint-driven memory-lending controller
    - read-depth limit: selected full characterization, controller design, and preliminary evaluation inspected
        - prototype not executed; hint accuracy and total usable-memory latency remain unverified
- [DeltaBox](https://arxiv.org/abs/2605.22781), arXiv May 2026, Shanghai Jiao Tong
    - agents checkpoint often and "subsequent checkpoints in AI agents are highly similar", so save only the difference
    - [full paper](https://arxiv.org/pdf/2605.22781), §§4–6: earlier abstract latency figures differ from the inspected evaluation
    - Table 2 reports weighted checkpoint call-to-return latency 10.83 ms
        - excludes asynchronous dump completion
        - restore takes 1.86 ms with a retained process template, 9.29 ms after eviction
        - experiment requirement: measure when the recovery point becomes usable and crash before asynchronous work finishes
    - filesystem layers and process checkpoints form a consistent pair
        - pauses the agent while saving state
        - moves model-network requests outside the checkpointed process
        - external network effects cannot be rolled back
    - evaluation replays 24 SWE-bench trajectories on 4-vCPU, 8-GB VMs
        - baselines include a self-hosted E2B implementation, not the hosted product
        - raw fork measurements omit the complete checkpoint machinery
- [Crab](https://arxiv.org/pdf/2604.28138), Apr 2026, §§4–7
    - saves different amounts of state according to each agent turn’s effects
    - schedules checkpoint work across tenants and overlaps it with model requests
    - §7.2 crash-recovery evaluation injects one randomly positioned crash per run
        - separate preemption experiments inject 1–5 preemptions per task
        - 100 tasks per configuration selected for success without failures
        - tests recovered task results or final patches, not arbitrary external effects
    - inference: replaying an outstanding remote command may repeat an external effect
        - test this hypothesis with a service that records every operation
- [SpecBox](https://arxiv.org/pdf/2607.23933), Jul 2026 preprint; selected full §§3–5
    - starts the sandbox while the model is still writing the tool call
    - "cuts P99 end-to-end latency by up to 2.9× relative to the on-demand sandbox baseline"
    - keyword/semantic routing and transition counts predict environment preparation
        - preparation does not execute side-effecting tool calls
        - authors: “unused warmups are discarded”
        - cancellation and cleanup timing unmeasured in selected sections
    - one 16-core Docker host uses Qwen3.5-Max cloud API
    - 200 generated trajectories from 32 MCP servers use actual execution, then stepwise replay
        - reported trajectory-length distributions need reconciliation
    - at 20 QPS, session P99 is 88.7 versus 257.2 seconds
        - session completion, not sandbox startup
        - replay does not measure independently evolving live-agent trajectories
    - local CPU/memory measured; provider GPU use, token equality, and total cost unestablished
    - shared transfer trusts host access controls; malicious agents/infrastructure excluded
    - semantic cache reports 84.8% bypass ratio and validation fallback
        - validated hits can skip sandbox setup; others return to normal execution
        - this is not correct-result precision
        - similarity does not prove equivalent results
    - selected full methods read; implementation and artifacts unverified
- [Agentic AI Workload Characterization](https://arxiv.org/abs/2605.26297), arXiv May 2026
    - agents move "from read/explore behavior early in execution to execute/write behavior later"
- [Aries](https://arxiv.org/pdf/2607.29069), Jul 2026 preprint; selected full §§3–4
    - experimentation framework, not a microVM fork mechanism
    - authors: "tool sandboxes alternate between long idle periods and short resource bursts"
    - framework separates task, harness, model, and sandbox choices with correlated telemetry
    - commercial evidence: one eight-hour day, ten model-serving instances, minute samples from 100 sandboxes
        - synchronized private step timing unavailable
    - controlled experiments: 20 tasks each from three benchmarks, chosen for 50% OpenClaw success, five repetitions
        - selection limits transfer to all agent workloads
    - tool-resource experiments use DeepSeek V4 Flash API and second-resolution sampling
    - commercial samples combine harness and tool costs; controlled telemetry separates them
    - AWS-pricing replay uses recorded tool timelines and varied keepalive
        - cost multipliers are analytical results, not deployed billing
        - possible 3× saving is an ideal-system proposal, not a tested controller
    - selected full methods read; artifact, synchronization, and privacy not independently verified
- forkd and mitos
    - earlier search leads remain unverified
    - do not confuse mitos with the RDMA-based Mitosis paper
- [Mitosis](https://www.usenix.org/conference/osdi23/presentation/wei-rdma), OSDI 2023; abstract checked
    - authors: "fast remote fork"
    - Linux containers share previously initialized state through RDMA reads

literature: staying correct when things fail

- scaling-specific failures and durable execution
    - general distributed verification belongs to the distributed systems group

- [Metastable Failures in the Wild](https://www.usenix.org/conference/osdi22/presentation/huang-lexiang), OSDI 2022
    - "at least 4 out of 15 major outages in the last decade at Amazon Web Services were caused by metastable failures"
- [Formal Analysis of Metastable Failures in Software Systems](https://arxiv.org/abs/2510.03551), arXiv 2025, Alvaro, Isaacs, Majumdar and others
    - models request and response servers as Markov chains
    - [full paper](https://arxiv.org/pdf/2510.03551), §§3–4: models bounded queues, worker pools, retries, timeouts, and dropped requests
    - continuous-time Markov chains approximate service and queue timing
        - averages service rates across request types
        - simulation retains details that the mathematical approximation discards
    - §6.3 varies arrival and processing rates to study recovery
    - experiment requirement: compare predicted recovery against simulation and measured histories before using the approximation as a safety bound
- [Characterizing Metastable Faults and Failures](https://arxiv.org/abs/2606.00942), arXiv 2026, Cornell and Penn
    - [full paper](https://arxiv.org/pdf/2606.00942), §7 already models a capacity-management feedback loop
    - authors: "wakeup commands take longer to execute than sleep commands"
    - overload delays heartbeats, causing a manager to remove workers before replacement workers start
        - oscillation persists after the initial disturbance ends
        - network loss is unnecessary in the example
    - model uses 40 workers and abstracts overload as a function of active worker count
        - omits the external load balancer
        - assumptions include eventual execution of component actions
    - proposed repair delays worker removal until replacement capacity is ready
- [Mutiny!](https://arxiv.org/abs/2404.11169), DSN 2024
    - corrupts one value in the Kubernetes store and watches
    - "service under/overprovisioning (24%)" of injections
- [Quantifying Autoscaler Vulnerabilities](https://arxiv.org/abs/2601.04659), arXiv 2026
    - simulation only; "horizontal autoscaling exhibits greater susceptibility to transient anomalies, particularly near threshold boundaries"
- [Anvil](https://www.usenix.org/conference/osdi24/presentation/sun-xudong), OSDI 2024
    - Kubernetes controllers written in Rust and proved in Verus to always reach the desired state
    - authors: "reconciliation is fundamentally not a safety property"
    - proves eventual progress under its stated assumptions
    - covers controllers for ZooKeeper, RabbitMQ, FluentBit; not the scheduler or the autoscaler
- [AWS Nitro Isolation Engine](https://www.amazon.science/blog/ec2s-formally-verified-isolation-engine-provides-mathematical-assurance-of-virtual-machine-isolation), announced 2025; production account checked
    - authors: "guest memory allocations are always scrubbed before reuse"
    - Isabelle/HOL proves properties of the isolation component
    - scheduling and allocation policy remain outside that component
- [Distributed Speculative Execution](https://www.usenix.org/conference/osdi26/presentation/li-tianyu), OSDI 2026, MIT and Microsoft
    - durable execution "usually forces frequent and synchronous persistence, resulting in significant latency overheads"
    - the runtime skips the saves and repairs state after a failure, hidden from the developer
- [Consistency and Correctness in Data-Oriented Workflow Systems](https://www.vldb.org/cidrdb/papers/2026/p9-stonebraker.pdf), CIDR 2026, Stonebraker, Zhou, Kraft, Li
    - "Although many developers can write and test a saga, few get it right when the server crashes"
    - "durability alone is not sufficient"
- [Beldi](https://www.usenix.org/conference/osdi20/presentation/zhang-haoran), OSDI 2020; abstract checked
    - authors: "fault-tolerant and transactional stateful serverless functions"
- [Netherite](https://www.microsoft.com/en-us/research/publication/netherite-efficient-execution-of-serverless-workflows/), VLDB 2022; abstract checked
    - authors: "workflow steps to group commit, even if causally dependent"
- Boki, Temporal, and Cloudflare Durable Objects
    - retained background leads, not reopened here
- [Peeking Behind the Curtains of Serverless Platforms](https://www.usenix.org/conference/atc18/presentation/wang-liang), ATC 2018
    - the last big study from the customer's side that I found
    - "launching more than 50,000 function instances across these three services"
    - found "that Google had bugs that allow customers to use resources for free"

what I conclude from the literature

- several mechanisms are fast in evaluated prototypes
    - the results do not imply that startup or scheduling is solved
    - the NSDI 2022 policy study above shows why mechanism speed can mislead
- faster designs change where correctness obligations sit
    - KubeDirect supplies recovery protocols and a TLA+ model
    - HyperFlux relies on host-controlled parking and a guest resume protocol
    - snapshots require restoration of unique state
    - agent recommendation: audit those boundaries rather than presume lost safety
- memory elasticity already has substantial prior work
    - see the checked papers added below
    - a new project needs a workload or guarantee they do not cover
- independent platform measurement exists
    - [Deno’s 2024 Lambda benchmark](https://github.com/denoland/serverless-coldstart-benchmarks) provides "Configuration, benchmarking scripts, and raw data"
    - a runtime vendor’s benchmark has a narrower scope and possible commercial bias
    - a broad 2026 sandbox study is a candidate, not an established empty field
- application compatibility remains a tradeoff
    - Dandelion, Quicksand, and Granny expose different programming constraints
    - compare their supported interfaces before judging deployment effort

research we could do

- ordering is an agent recommendation
- absence from this review is not evidence of novelty
- prioritize a small reproduction before choosing a full project

1. prove the core hand-off of an elastic virtual machine layer

- what: take HyperFlux's protocol for moving a core between virtual machines and prove it in Verus
    - no core ever runs two virtual machines
    - a guest whose core is taken by force loses no work and never sees a torn state
    - a bursting high-priority guest gets a core within a stated bound
- why it could work
    - the paper exposes a six-state vCPU protocol suitable for an explicit specification
    - hypothesis: interrupted handoffs can expose ordering errors that the current tests do not exercise
    - Nitro and VeriSMo establish close verification precedents
    - novelty would lie in the specific handoff and implementation guarantees, not cloud isolation verification itself
- risk
    - correction: HyperFlux §4.10 says "Hyperflux is implemented in Rust"
    - Rust implementation does not remove the trusted KVM, Linux, interrupt, and hardware assumptions
    - first reproduce the implementation and specify which interruption points the proof covers
    - bounded allocation progress requires stated scheduling and capacity assumptions
    - preserving guest work requires an honest, compatible guest substrate
    - malicious guest isolation and correct guest continuation are separate properties
- overlap: formal verification group for the Verus side

2. check the gap between a fast control plane’s model and its implementation

- correction: KubeDirect already models end-to-end correctness
    - §4.4: "we use TLA+ to verify the end-to-end properties of Kubedirect"
    - source: [KubeDirect full paper](https://arxiv.org/html/2601.19160v1)
    - its liveness assumption requires repeated sufficiently long connected intervals
- what: obtain the model, reproduce its checks, then test implementation traces against its transitions
    - delayed old messages, controller replacement, overlapping deletion and creation, external updates
    - evaluate how long surplus or missing sandboxes persist after recovery
- closest existing work
    - KubeDirect’s own model covers convergence
    - Dirigent §4.2 and §5.4 cover recovery design and failure experiments
    - Anvil covers verified reconciliation implementations
- possible contribution
    - a demonstrated model/implementation mismatch or a checked connection between them
    - a second model alone offers little differentiation
- stop condition: the released model and existing tests already cover the proposed fault cases
- overlap: distributed systems and formal verification groups

3. overloads that autoscaling causes itself

- what: cold start delay causes timeouts, timeouts cause retries, retries cause more cold starts. Find when this loop sustains itself, on Knative and on the open Lambda-like system from "The High Cost of Keeping Warm", and on scale-to-zero databases
- why
    - the Markov chain paper §6.3 already studies recovery by changing processing rates
    - authors: "a recovery policy can throttle the arrival rate or increase the processing rate"
    - the June 2026 paper already combines delayed provisioning and heartbeat-driven capacity loss
    - agent recommendation: reproduce that case before studying a real Knative or database controller
    - candidate distinction remains unestablished
        - measure interactions among retries, cold starts, and memory reclamation in the implementation
        - compare measured recovery boundaries with both published models
        - test whether a guard requiring ready replacement capacity prevents the observed failure
    - the general retry feedback mechanism is established prior work
    - the 2026 autoscaler fault study is simulation only
    - fits "robust ... websites and databases" directly
- stop condition: the implementation only reproduces an existing model without exposing a mismatch or a useful new control rule

4. measure serverless and sandbox platforms from the customer's side, 2026 edition

- what: rerun the 2018 "Peeking Behind the Curtains" questions on today's products: Lambda, Lambda MicroVMs, Cloud Run, Cloudflare Workers, E2B, Modal, Fly, plus Neon and Aurora scale to zero
    - cold start, resume from snapshot, how fast vertical scaling reacts, billed versus used, are clones from one snapshot really different
- why
    - you do measurement; this needs careful method more than a new system
    - billing and snapshot semantics are measurable questions
    - prior audits of each product must be checked before claiming a new finding
    - gives a public dataset the academic systems lack for agent sandboxes
- risk: reads as "just a benchmark" unless a finding surprises; the snapshot clone check (idea 6) could be that finding

5. cold starts that real website visitors see

- what: crawl to find websites served by serverless hosts (response headers give Vercel, Netlify, Cloudflare, Lambda URLs away), then visit each gently after different idle gaps and measure the extra delay
- why
    - joins your web measurement work with this topic
    - candidate distinction: user-visible delays across independently hosted websites
    - provider attribution from headers can be incomplete or misleading
    - independent benchmarks already exist, as noted above
    - answers a plain question: how many sites make the first visitor after a quiet hour wait, and how long
- risk
    - separating cold start from cache miss and network noise needs a careful design
    - keep the request rate tiny; check with the web measurement group's ethics notes

6. clones that should differ but do not

- what: restore one snapshot twice, run both, and report state that is equal but should be unique (random numbers, identifiers, session keys, timestamps, open connections). Survey popular images and language runtimes
- why
    - AWS’s snapshot uniqueness paper is direct prior work
    - candidate distinction: current runtime/image combinations and documented reset hooks
    - check the race between hook completion and the first external operation
    - define expected identity separately for a clone and a rollback within one logical instance
    - a duplicated key or nonce is a security bug, so findings are reportable
- risk: Linux and the big runtimes may have fixed most cases already (the virtual machine generation ID work); then the result is a short negative paper

7. check or prove durable workflow code

- what, two sizes
    - a tester that crashes a workflow at every step and replays it, reporting steps that ran twice or differently (Temporal, DBOS, Restate, Durable Functions)
    - a small durable execution library in Rust proved in Verus: given steps that are safe to repeat, the workflow's effect equals one clean run
- why: CIDR 2026 says "few get it right when the server crashes"; speculative execution (OSDI 2026) makes the runtime harder to trust
- risk: deterministic simulation testing companies and the vendors' own replay tests cover part of the first; I could not check how much
- newer local-state competitors: DeltaBox and Crab
    - compare filesystem/process consistency with external-effect recovery
    - crash during open-file updates, child-process work, pending I/O, and failed checkpoints
    - successful final-task recovery alone does not establish that remote effects occurred once
- overlap: distributed systems group

8. fast memory lending between agent sandboxes

- what: the memory twin of HyperFlux, driven by hints of what tool the agent is about to run
- closest work: AgentCgroup, Pond, RamRyder, Memoryless, and Squeezy
    - a claim that nobody has built elastic memory would be false
    - candidate distinction: tool-call hints plus a measured bound on safe reclaim latency
- risk: pure systems building, far from your strengths, and SJTU and Tsinghua move fast here. I would only do it as a partner to the lab

9. place functions by their measured per-call demand

- what: the "Function as a service" direction on the Hiresperf slides
- risk: it is the Hiresperf authors' own next step. Offer to help, do not compete

additional checked memory work

- [Pond](https://www.microsoft.com/en-us/research/publication/pond-cxl-based-memory-pooling-systems-for-cloud-platforms/), ASPLOS 2023
    - authors: "pooling across 8-16 sockets is enough to achieve most of the benefits"
    - CXL permits load/store access to pooled memory
    - evaluate agent memory lending against pooling, not just static reservations
- [RamRyder](https://www.usenix.org/conference/osdi26/presentation/zhou-yanbo), OSDI 2026
    - authors: "allocate memory bandwidth and capacity (mostly) independently"
    - separates resource quantities often bundled together
- [Memoryless](https://arxiv.org/abs/2609.26476), preprint Sep 2026
    - authors: "memory locality as a serverless control-plane primitive"
    - varies local/remote memory mix when placing functions
    - abstract checked; latest preprint needs full evaluation scrutiny
- [Squeezy](https://arxiv.org/abs/2411.12893)
    - [full paper](https://arxiv.org/pdf/2411.12893), §§4–6, revised Dec 2025, EuroSys 2026
    - authors: "sub-second reclamation of multiple GiBs of memory"
    - partitions a shared VM’s memory by function instance, with a separate shared-runtime partition
        - returns an instance’s partition after that instance terminates
        - does not establish arbitrary reclamation from a live persistent agent
    - Linux 6.6.30 implementation excludes ordinary allocations from these partitions
    - reclaiming 2 GiB takes 127 ms in its controlled test, versus 2.5 s for virtio-mem
        - eliminates guest-page migration and defers zeroing to the host
        - this does not eliminate sanitization
    - §6.2.1 replays four Azure invocation traces under abundant memory
    - §6.2.2 uses four functions and synthetic trace-like load on one host under scarce memory
        - comparison implements HarvestVM-style optimizations rather than running the unavailable original prototype
    - experiment requirement: distinguish instance termination from live-memory lending and include host zeroing under contention
- [Puffer](https://doi.org/10.1109/TPDS.2025.3628202)
    - [author-posted full text](https://www.researchgate.net/publication/397225891_Puffer_A_Serverless_Platform_based_on_Vertical_Memory_Scaling), §§IV–VI, IEEE TPDS Jan 2026
        - publisher access unavailable; inspected the paper text, not a secondary summary
    - reserves memory blocks for each function and returns them at completion
    - prepopulates page mappings or populates them lazily according to workload sensitivity
    - controlled resize of 512 MB takes under 1 ms
        - separate page-population tests take 46–251 ms for 512 MB–3 GB
        - resizing a reservation is not the same as making all memory usable
    - tests eight Python functions on a fixed-NUMA machine with swap disabled
        - additional synthetic workload draws memory and runtime from distributions rather than replaying production traces
    - linked artifacts were unavailable when checked
    - closest competitor for memory lending; compare total usable-memory latency and live-agent reclamation

cross-review and related coverage

- [cross-topic ChatGPT review](chatgpt_review.md)
- [energy, edge platforms, isolation, and cluster scheduling](cloud_isolation_and_energy.md)
- GPU sharing and model serving belong to systems for machine learning
- consensus, storage, databases, and durable workflow verification belong to distributed systems
- Hydro and Service Weaver belong to the distributed systems group

remaining evidence limits

- Spice and AFaaS full methods now separate restoration latency from local platform startup and qualify benchmark/production comparisons
- Huawei component measurements, initscript start-time accounting, and AgentCgroup peak and replay definitions now checked in selected full primary methods
- Lambda MicroVM scaling and billing descriptions now checked against official documentation
    - pricing parenthetical and larger example do not establish a universal resource maximum
- older cold-start papers and forkd/mitos remain leads
- novelty checks are targeted, not exhaustive
- no platform measurements or proofs were independently reproduced
