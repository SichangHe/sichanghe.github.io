cloud isolation, energy, edge platforms, and cluster scheduling
(authored by agents unless marked 🧑)

research choices

- agent recommendation: start with a small study of resource isolation across guest/host calls
    - memory isolation already has verified implementations
    - host work charged to the wrong tenant remains a concrete research question
- alternative: test whether carbon scheduling still helps after counting restart and movement costs
    - shifting work to cleaner electricity is established work
    - realistic costs and recovery behavior need a narrower comparison
- cluster correctness is promising only with a precise missing guarantee
    - KubeDirect already has a TLA+ model
    - a second scheduling architecture is not a sufficient contribution
- these are research candidates, not claims of novelty

scope and reading depth

- checked primary sources on 7 Oct 2026
- full PDFs read selectively for Ecovisor, CarbonScaler, CASPER, edge scheduling, and Wasm resource isolation
    - inspected mechanisms, evaluation, assumptions, and stated boundaries
- selected 2026 carbon papers also received full-method and evaluation checks
- selected full methods now also checked for WOW, ESFF edge scheduling, Faasm, and Nightcore
- remaining entries rely on author abstracts, project pages, or official documentation
- numerical improvements are author reports under their experiments
    - no independent reproduction here
- Hydro and Service Weaver belong to the distributed systems group
- [serverless mechanisms and proposed experiments](cloud_serverless_scheduling.md)

words used here

- energy: electricity consumed while doing work
- power: how quickly energy is consumed
- carbon intensity: estimated emissions per unit of electricity
- operational emissions: emissions from running equipment
- embodied emissions: emissions from making and transporting equipment
- average carbon intensity: emissions averaged over the electricity supply
- marginal carbon intensity: estimated emissions caused by one additional unit of demand
- service objective: a target such as a maximum request delay
- edge: computers near users or sensors rather than a central cloud region
- confidential VM: a virtual machine designed to protect its memory even from the host administrator
- attestation: evidence about which software and configuration a machine is running
- software fault isolation: compiler/runtime restrictions that stop code from accessing another sandbox’s memory
- host call: a sandbox request for an operation implemented outside it
- resource isolation: stopping one tenant from consuming another tenant’s allowed resources
- cluster scheduler: software choosing machines for jobs
- placement: deciding where a job runs
- fragmentation: free CPU and memory exist, but in combinations that cannot fit waiting jobs

energy and carbon scheduling

- [Ecovisor: A Virtual Energy System for Carbon-Efficient Applications](https://arxiv.org/abs/2210.04951), Souza and colleagues, ASPLOS 2023
    - problem: a common power policy cannot express every application’s tolerance for delays
    - mechanism: expose electricity, battery storage, and renewable generation through a software interface
    - [full primary manuscript](https://arxiv.org/pdf/2210.04951), §§3–5
    - authors: “instead of a real solar array to enable repeatable experiments”
    - physical prototype combines ARM microservers, LXD containers, programmable power limits, and battery control
        - solar-array emulator replays radiation traces
        - simulated power-source versions also support experiments without specialized equipment
        - a physical energy prototype does not make every evaluation a deployment with real renewable generation
    - per-application battery and solar accounting exposes independent control choices
        - container resource limits approximate power caps
        - hardware-specific controllers enforce aggregate battery limits
    - boundary: assigning energy shares between applications is outside its scope
        - §3 assumes an external policy determines each application’s share
    - implication: application-specific controls already exist
        - a generic proposal to expose carbon information would duplicate prior work
    - reading limit: selected full architecture, implementation, and evaluation-introduction sections inspected
        - later case-study results, control accuracy, and raw traces not independently reproduced
- [CarbonScaler](https://arxiv.org/abs/2302.08681), Hanafy and colleagues, PACM MACS 2023
    - problem: simply pausing a job until electricity becomes cleaner can delay completion
    - mechanism: give a job more servers during cleaner periods and fewer during dirtier periods
    - abstract: "dynamically varies its server allocation"
    - evidence: Kubernetes prototype with machine learning and MPI jobs on a commercial cloud
        - author reports: 51% carbon savings over carbon-agnostic execution
        - savings depend on the comparison policy and workload scaling curve
    - important assumption in the optimality argument, appendix footnote 5
        - "switching cost (scaling up or down) between time slots is negligible"
    - full paper §5.8 measures 20–40 seconds of scaling overhead
        - scheduler does not incorporate that overhead into its decisions
        - configurable profiling takes eight minutes per evaluated workload
    - §5.7 already tests random forecast errors, profile errors, and resource-procurement denial
        - a generic forecast-error experiment is not new
    - CPU/GPU energy counters supply component-level measurements
        - not a complete facility, network, or embodied-emission measurement
    - inference: short functions with expensive initialization may violate that assumption
        - this motivates measurement rather than a claim that CarbonScaler ignored all costs
- [CASPER](https://arxiv.org/abs/2403.14792), Souza and colleagues, IGSC 2023
    - problem: interactive web services cannot defer requests like batch jobs
    - mechanism: choose regions and capacity using carbon estimates and network latency constraints
    - abstract: "while also respecting their Service Level Objectives"
    - author report: up to 70% modeled emission reduction while staying within the selected latency target
        - higher-savings policies have 5–16× greater average latency than the latency-only baseline
        - satisfying a loose target is not the same as unchanged latency
    - evaluation maps Wikimedia traffic and measured network traces onto six cloud regions
        - inspect resource and carbon models separately from request-delay observations
    - boundary: the result depends on available regions, traffic, latency constraints, and carbon estimates
        - the evaluation does not imply arbitrary stateful services can move freely
    - implication: carbon-aware placement for web services is already studied
- [The Green Mirage](https://arxiv.org/abs/2402.03550), Maji and colleagues, e-Energy 2024
    - problem: renewable energy credits and regional electricity estimates can assign different carbon values to the same consumer
    - abstract: "possible overestimation of up to 55.1%"
    - [full paper](https://arxiv.org/pdf/2402.03550), §§4–5, experiment design inspected
    - compares carbon optimization under location-based and market-based attribution
    - simulation of CarbonScaler uses a 24-hour interruptible ResNet18 job and at most eight instances
        - reuses CarbonScaler code and 2022 electricity data
        - savings change when the same schedule is evaluated under a different attribution rule
    - spatial-routing experiment uses a representative implementation because original code and data are proprietary
        - substitutes average intensity for the original marginal intensity
        - these signals answer different accounting questions
    - maximum discrepancy is conditional on assumed renewable contracts
        - not an observed physical emission reduction or increase
    - implication: reported savings require a stated accounting method
        - better accounting numbers do not necessarily establish reduced physical emissions
- [Carbon-Aware Computing for Data Centers with Probabilistic Performance Guarantees](https://arxiv.org/abs/2410.21510)
    - [full paper](https://arxiv.org/pdf/2410.21510), §§III–VII, methods and limits inspected
    - authors: "homogeneous job runtimes of one time step"
    - plans soft capacity limits using uncertain workload distributions, then places discrete jobs
    - limits can instead be enforced as hard placement constraints
        - soft limits permit some capacity violations and unfinished jobs in the finite horizon
    - modeled resources are initially aggregate compute
        - CPU, memory, and disk constraints are suggested extensions
    - simulations assume unfinished jobs fit the next day’s limits
    - statistical guarantee needs the unknown distribution to lie inside the chosen uncertainty set
        - stationary-data bounds can be conservative
        - empirical tuning can give up the stated theoretical guarantee
    - authors: "leveraging both temporal and spatial flexibility"
    - contribution combines advance planning with live placement under uncertain demand
    - implication: robustness to uncertain compute demand and demand-response events is already an active direction
- [Chasing Carbon](https://arxiv.org/abs/2011.02839), Gupta and colleagues, HPCA 2021
    - abstract: "the overall carbon footprint of computer systems continues to grow"
    - discusses manufacturing and operation together
    - implication: a scheduler optimizing electricity alone needs to state that boundary

selected 2026 methods and their limits

- [Contextual Robust Optimization for AI Data Center Scheduling with Statistical Guarantees](https://arxiv.org/pdf/2606.17466), Yang, Weng, and Chen, June 2026 preprint, §§II–VI
    - authors: "Under the exchangeability assumption"
    - chooses compute allocation, renewable use, and battery operation using forecast-error sets
        - exchangeability means calibration and future observations can be treated symmetrically for the stated probability calculation
    - tests three modeled data centers using Alibaba training traces and Azure model-serving traces
    - renewable production is simulated from weather data
        - workload power and latency parameters come from earlier studies
        - carbon intensity comes from the generation mix, not a measured marginal response to the scheduler
    - includes GPU limits, grid limits, battery capacity, charging losses, and facility power overhead
    - compares contextual uncertainty learning with robust and distributionally robust alternatives
        - at 90% confidence, reports 3.78% modeled emission reduction against its noncontextual robust baseline
        - this is not a deployed data-center measurement
    - guarantee concerns sampled uncertainty coverage and modeled constraints
        - a changed workload or weather regime can violate calibration assumptions
        - does not certify that real jobs finish if the power/latency model is wrong
- [Carbon-Aware Compute–Power Scheduling for AI Data Centers with Microgrid Prosumer Operations](https://arxiv.org/pdf/2605.03751), May 2026 preprint, §§II–V
    - authors: "synthetic yet practically motivated"
    - combines job placement, inference routing, cooling, renewable power, battery use, and electricity purchase or sale
    - default simulation: three sites, 24 hourly intervals, six training jobs, three inference classes
    - uses a mixed-integer optimization model
        - chooses some yes/no decisions alongside continuous quantities
        - electricity prices, carbon intensity, cooling coefficients, and storage efficiencies are supplied inputs
    - compares joint control with compute-only, energy-only, no-battery, no-routing, and no-carbon variants
    - no-carbon variant nearly matches the main model in the default case
        - authors say the carbon budget is weakly binding
        - inference: lower modeled emissions than compute-only does not show that the carbon constraint caused the gain
    - solver runtime is measured separately
        - synthetic optimization time is not deployment, migration, or checkpoint time
    - feasibility and accepted work must accompany objective comparisons
        - rejecting work can improve emissions while reducing delivered service
- [Carbon-Aware Mapping and Scheduling for Deadline-Constrained Workflows](https://arxiv.org/pdf/2605.27652), May 2026 preprint, §§2–5
    - authors: "jointly optimize mapping and scheduling"
    - assigns dependent tasks to heterogeneous processors and shifts them across higher green-power windows
    - objective integrates electricity demand exceeding the available green-power budget
        - this is a carbon-cost proxy, not directly measured emissions
        - transformed carbon-intensity samples do not preserve an emissions quantity
        - score completed schedules separately with declared emission factors
    - models communication as additional tasks on processor-pair channels
        - channels for different pairs can operate simultaneously
        - shared switches and network bottlenecks need separate validation
    - simulation uses SPEC-derived active/idle power and speed
        - synthetic workflow weights and communication power
        - carbon signals transformed into available green-power intervals
    - compares with carbon-blind and existing carbon-aware workflow algorithms
    - excludes the tightest deadline setting from the main comparison
        - less slack can remove both scheduling feasibility and savings
    - direct prior work for dependency-aware carbon scheduling
        - proposing to account for task dependencies alone offers little differentiation

what the carbon objective actually establishes

- all numerical emission savings above depend on an accounting model
- location-based accounting assigns electricity a regional generation-mix estimate
- market-based accounting assigns electricity according to contracts and residual supply
    - contracts can change assigned emissions without changing the scheduler’s physical electricity use
- marginal estimates ask how additional demand changes generation
    - more relevant to a claim about a scheduler’s incremental grid effect
    - still a model, not a direct measurement of avoided emissions
- agent recommendation: report these three results separately
    - measured electricity consumed
    - assigned emissions under a declared accounting rule
    - estimated change relative to a specified alternative schedule
- resources and work completion must be comparable
    - equal completed tasks, deadlines, output quality, and peak capacity limits
    - account for idle reservations, deferred backlog, and rejected requests
- include battery charging electricity and losses
    - cleaner discharge does not make earlier charging free of emissions
    - embodied battery and server emissions need a separate boundary
- compare every schedule under the same realized trace
    - forecasts select actions
    - realized signals score actions
    - evaluating with the forecast can reward prediction error rather than cleaner operation

carbon experiment worth attempting

- question: when does repeated suspension or movement erase the benefit of cleaner electricity?
- closest work: CarbonScaler, Ecovisor, CASPER, the probabilistic-capacity paper, and the three 2026 methods above
    - uncertainty, transfer-aware dependencies, and joint compute/power control are already studied
- agent proposal: replay one workload through carbon-aware and latency-only policies
    - measure initialization, checkpoint, restore, transfer, idle, and useful execution energy separately
    - include retries after failures and missed deadlines
    - report electricity use before converting it to emissions
    - compare decisions under average and marginal carbon estimates
    - baselines: immediate execution, energy-only control, fixed capacity with deferral, and a reproduced carbon-aware scheduler
    - include an oracle that knows future values as a labeled upper bound
    - give all policies identical workload, capacity, deadlines, and completed-work requirements
    - run parameter sweeps for state size, startup delay, forecast error, load, and carbon variation
    - measure scheduler electricity and decision time separately from actuation overhead
- distinguishing result
    - a reproducible break-even rule for a particular workload and platform
    - compare measured overhead against prior methods’ modeled overhead before claiming a gap
    - possible contribution: a model predicts savings but an implementation loses them under a documented failure or capacity boundary
    - example: waiting for cleaner electricity helps only if saved running emissions exceed restart and transfer emissions
- assumptions to test
    - workload can legally and technically run in the selected region
    - state transfer, network traffic, and checkpoint storage have measurable costs
    - carbon forecast error is included rather than assuming future values are known
- stop condition
    - reproducing the closest work explains the measured overhead without a new finding
- feasibility limit
    - a public cloud bill does not measure physical electricity
    - start on owned machines with a power meter before estimating provider-wide effects

edge platforms

- [WOW: Pushing Serverless to the Edge with WebAssembly Runtimes, CCGrid 2022](https://faculty.washington.edu/wlloyd/courses/tcss562_f2024/papers/2023/PushingServerlesstotheEdgewithWebAssemblyRuntimes.pdf), §§III–V and limitations
    - authors: "Our Executor is stateless"
    - OpenWhisk integration precompiles Wasm for the target architecture before invocation
        - deployment-time compilation is outside the measured cold-start path
        - code modules can be cached; each request gets a new execution instance
    - compares Rust/Wasm with the same Rust action compiled natively inside Docker
        - uses Docker's black-box protocol rather than compiling Rust during initialization
    - hardware: Raspberry Pi 3B with 1GB RAM and a four-core Xeon server
        - Pi runs standalone lean OpenWhisk
    - CPU workload hashes repeatedly for roughly 100ms of native work
        - simulated I/O uses a 300ms host sleep rather than actual HTTP
        - mixed workloads combine these operations
    - cold start is OpenWhisk waitTime plus initTime
        - forces cold starts using a ten-second deallocation threshold
    - author report: cold-start reduction up to 99.5%
        - bound to those workloads, compilation placement, and concurrency settings
    - does not test network outages, live migration, or stateful host-call recovery
- [Efficient Serverless Function Scheduling at the Network Edge](https://arxiv.org/pdf/2310.16475), Lou and colleagues, 2023 preprint, §§III–V
    - authors: "request execution cannot be interrupted"
    - models one server with a fixed number of concurrent function-instance slots
        - multiple servers are treated as one only when transmission time is negligible
        - no heterogeneous per-function CPU/memory demands or unreliable network path in this model
    - ESFF ranks functions using measured mean execution, startup/eviction costs, and queued request counts
        - replaces idle instances when another function has greater urgency
        - future requests are unknown
    - Python simulation uses the first 600,000 requests from a two-week Azure trace
        - zero-duration records become 1ms
        - default capacity is sixteen slots
        - startup and eviction times are randomly assigned because function code/dependencies are missing
    - compares FaasCache, OpenWhisk V2, and shortest-function-first policies
        - reports average response, slowdown, cold-start cost, and distributions
    - these simulations establish a queue/cache baseline, not an implemented migration or failure-recovery baseline
- [Faasm, ATC 2020](https://www.usenix.org/system/files/atc20-shillaker.pdf), Shillaker and Pietzuch, §§3–6
    - authors: "varying levels of consistency"
    - Wasm memory isolation plus shared state; CPU cgroups and network namespaces/rate limits
    - local shared-memory replicas sit above a global key-value store
        - explicit push/pull controls synchronization
        - strong global consistency requires global locks
        - asynchronous SGD deliberately tolerates stale state
    - Proto-Faaslets snapshot initialized memory and runtime metadata
        - restores snapshots across hosts and resets private execution state after calls
        - this is initialization reuse, not a demonstrated capture of arbitrary live external calls
    - compares with Knative using the same application/state-management code
        - Knative cannot share the local memory tier between functions
        - twenty Xeon hosts, 16GB each, 1Gbps network, Redis in the cluster
        - evaluates training, inference, and dynamic-language execution on the cluster
        - initialization tests use a separate single Xeon E5-2660 machine with 32GB RAM
    - interpretation: gains combine state sharing, placement, and startup mechanisms
        - isolate these factors before attributing improvement to migration
- [Nightcore, ASPLOS 2021](https://www.cs.utexas.edu/~witchel/pubs/jia21asplos-nightcore.pdf), Jia and Witchel, §§3–5 and artifact appendix
    - authors: "Our prototype of Nightcore relies on unmodified Docker"
    - optimizes stateless mid-tier function calls with shared-memory communication and adaptive concurrency
        - container boundaries separate different functions
        - same-function requests share the worker's isolation boundary
    - evaluates three DeathStarBench applications plus HipsterShop
        - ports stateless handlers; Java/C# HipsterShop services are reimplemented in supported languages
        - databases, caches, gateways run separately with enough resources to avoid bottlenecks
    - uses wrk2 for 180-second runs, discarding thirty seconds of warmup
        - compares Docker RPC servers and OpenFaaS
        - worker VM has eight vCPUs and 16GiB memory in single-worker tests
    - cold container provisioning remains unoptimized
        - warm interactive-call results are not cold-start or edge-disconnection results
    - [benchmark artifact](https://github.com/ut-osa/nightcore-benchmarks) provides workload ports and experiment scripts

edge experiment worth attempting

- question: does movement help when intermittent connectivity and queued requests dominate execution time?
- closest work already covers lightweight startup, snapshot initialization, state-aware placement, queue/cache scheduling, and adaptive concurrency
    - agent proposal: test request correctness and useful completed work during disconnections
    - no novelty claim for replacing Docker with Wasm or prioritizing cached functions
- compare stay-local, cloud-only, restart-at-destination, and migration policies
    - include ESFF-style queue/cache decisions with identical arrivals and resource limits
    - include state-aware warm placement and preinitialized snapshots where implementable
    - compare equal memory/CPU capacity rather than equal instance counts alone
- replay identical recorded disruptions and requests
    - vary bandwidth, round-trip delay, outage duration, function state size, and queue imbalance separately
    - include short CPU tasks, real network I/O, and stateful operations
    - validate real I/O independently of a sleep-based surrogate
- account for deployment compilation and artifact transfer separately from warm/cold invocation
    - fix target architecture and supported host interface for initial comparisons
    - count snapshot transfer, reconstruction, stale-cache refresh, and state-store access
    - report end-to-end latency, per-function tails, lost work, retries, duplicate effects, and useful throughput
- declare request semantics before moving execution
    - distinguish restartable pure computation from writes to an external service
    - interrupt before, during, and after a side effect and before response acknowledgement
    - include outstanding host calls and global-lock holders
    - successful snapshot restoration alone does not establish correct external effects
- possible contribution: evidence that a stated recovery policy preserves those semantics under movement
    - useful null: transfer and reconstruction cost erase placement gains
    - useful null: initialization snapshots plus retry provide equal correctness and throughput
    - useful null: a local queue/cache policy eliminates the apparent benefit
- boundary: these are proposed controls, not measured results or established novelty

WebAssembly isolation

- [Swivel](https://www.usenix.org/conference/usenixsecurity21/presentation/narayan), Narayan and colleagues, USENIX Security 2021
    - problem: speculative execution can leak information despite ordinary memory checks
    - abstract: "Spectre attacks can bypass Wasm’s isolation guarantees"
    - compiler/runtime changes harden against these attacks
    - implication: normal sandbox memory safety and protection against speculative leaks are different claims
- [Provably-Safe Multilingual Software Sandboxing using WebAssembly](https://www.usenix.org/conference/usenixsecurity22/presentation/bosamiya), Bosamiya, Lim, and Parno, USENIX Security 2022
    - authors: "machine-checked proofs of safety"
    - explores a verified compiler and a translation into safe Rust
    - proves sandbox confinement with competitive performance
    - implication: proving basic Wasm memory confinement alone is crowded territory
- [Exploring and Exploiting the Resource Isolation Attack Surface of WebAssembly Containers](https://www.usenix.org/conference/usenixsecurity25/presentation/yu-zhaofeng), Yu and colleagues, USENIX Security 2025
    - authors: "attackers can exhaust the host’s resources"
    - identifies resource costs introduced through WASI/WASIX host interfaces
        - those interfaces provide operations such as file and network access
    - full paper inspected for attack mechanisms and mitigation discussion
    - finding: work can consume resources outside the ordinary guest computation
    - implication: memory confinement does not imply fair CPU, memory, or I/O consumption
- [Wasmtime security documentation](https://docs.wasmtime.dev/security.html)
    - maintainers: "what is available through interfaces it has been explicitly linked with"
    - guest access depends on supplied imports
    - runtime memory checks cannot specify what an embedding application should allow
    - checked documentation on 7 Oct 2026

resource-accounting experiment worth attempting

- question: can a tenant escape a resource budget by asking the host to do work?
- closest work: the 2025 Wasm resource-isolation study
    - repeating its attacks alone is not enough
- agent proposal: compare guest CPU accounting with costs of asynchronous host operations
    - cancellation, detached work, network buffers, compilation, and repeated failed requests
    - require a tenant identity to follow work across guest/host transitions
    - measure what remains after the sandbox is canceled
- possible contribution
    - a demonstrated accounting gap in a newer interface
    - or a small checked budget-transfer protocol
- success criteria
    - other tenants retain their stated resource limits
    - cancellation eventually releases charged work
    - overhead is measured against the unchanged runtime
- boundary: no claim of whole-runtime verification
    - prove a stated accounting property under explicit host and scheduler assumptions

confidential computing

- [VeriSMo](https://www.usenix.org/conference/osdi24/presentation/zhou), Zhou and colleagues, OSDI 2024
    - security module for AMD SEV-SNP confidential VMs
    - authors: "the untrusted hypervisor can interrupt VERISMO’s execution and modify the hardware state at any time"
    - verification separates hostile host interference from the module’s own concurrency
    - supports code integrity, measurement, and secrets
    - implication: trusted host assumptions in ordinary microVMs cannot be copied into a confidential VM proof
- [VeriSMo source](https://github.com/microsoft/verismo)
    - maintainers call it a "research prototype"
    - verification works, but the repository warns that current HyperV execution may need ABI updates
    - implication: proof reuse and runnable deployment are separate feasibility checks
- [Ditto: Elastic Confidential VMs with Secure and Dynamic CPU Scaling](https://arxiv.org/abs/2409.15542), Zhao and colleagues, Sep 2024 preprint
    - [full paper](https://arxiv.org/pdf/2409.15542), §§3, 5–6
    - authors: "hypervisor-assisted runtime adjustment of CPU resources"
    - precreated worker vCPUs alternate between dormant and active states
    - threat model excludes denial of service and malicious performance degradation
        - application memory errors and cache attacks remain outside its protection
    - evaluation uses AMD SEV-ES hardware, not SEV-SNP
        - claimed portability to SNP is not measured in that testbed
    - synthetic four-vCPU test finishes in 22, 25, or 27 seconds with sampling intervals of 0.5, 1, or 2 seconds
        - ideal parallel time is 20 seconds
        - separates the handoff mechanism from the delay before deciding to scale
    - security argument is prose, not a machine-checked proof
        - encrypted register state protects guest state across transitions
        - explicit demand signals and timing still disclose information to the host
- [Nitro Isolation Engine](https://www.amazon.science/blog/ec2s-formally-verified-isolation-engine-provides-mathematical-assurance-of-virtual-machine-isolation)
    - AWS describes an isolation component rather than a proof of every hypervisor feature
    - authors: "The Nitro Hypervisor still handles policy"
    - policy includes creation, allocation, migration, and scheduling
    - useful precedent for separating a small proved enforcement mechanism from a larger unproved policy engine
- [HyperFlux full paper](https://arxiv.org/html/2608.12633v1), §4.1 and §4.10
    - ordinary design trusts host components and uses KVM isolation
    - authors: "The full CVM design is a potential future work"
    - candidate overlap: elastic cores with a hostile host
        - a measured 13 μs ordinary-VM handoff does not establish confidential-VM latency or security

confidential elasticity candidate

- question: what must be proved when confidential VM cores are lent and reclaimed?
- closest work: VeriSMo, Nitro, HyperFlux, and Ditto
    - HyperFlux’s related-work table names Ditto as an elastic confidential-VM runtime
    - Ditto already supplies confidential CPU scaling and a security argument
    - broad confidential elasticity is not a new contribution
    - candidate narrower guarantee: precisely bound what demand signals and wakeup timing may reveal
- agent recommendation: first specify ownership of register state, shared demand signals, and resume authorization
    - distinguish confidentiality from availability
    - a hostile host may stop scheduling entirely
- feasible contribution: a small verified handoff boundary with stated hardware assumptions
    - bounded progress requires an additional scheduling assumption
- limit: source and hardware access determine whether this can become an implementation project

cluster scheduling

- [Borg](https://research.google/pubs/large-scale-cluster-management-at-google-with-borg/), Verma and colleagues, EuroSys 2015
    - abstract: "admission control, efficient task-packing, over-commitment, and machine sharing"
    - combines placement with operational machinery and isolation
    - inference: optimizing placement alone misses failures and changing reservations
- [Omega](https://research.google/pubs/omega-flexible-scalable-schedulers-for-large-compute-clusters/), Schwarzkopf and colleagues, EuroSys 2013
    - abstract: "shared state, and lock-free optimistic concurrency control"
    - independent schedulers choose placements against shared cluster state
    - conflicts require detection and retry
    - implication: scheduler concurrency and conflict handling are longstanding questions
- [Sparrow](https://www.istc-cc.cmu.edu/publications/papers/2013/sosp_sparrow.pdf), Ousterhout and colleagues, SOSP 2013
    - authors: "without centralized or logically centralized state"
    - sampling and late binding reduce scheduling delay for short parallel tasks
    - boundary: a scheduler tuned for short tasks need not fit long reservations or stateful workloads
- [KubeDirect](https://arxiv.org/html/2601.19160v1), §4.4
    - authors: "we use TLA+ to verify the end-to-end properties of Kubedirect"
    - direct controller messages use recovery protocols rather than simply discarding consistency
    - implementation ownership rules exclude conflicting external replica updates
    - implication: first reproduce its model and ownership assumptions before proposing verification
- [Memoryless](https://arxiv.org/pdf/2609.26476), Sep 2026 preprint; selected full §§3–5
    - abstract: "jointly selects and places function variants"
    - combines CPU allocation and local/remote memory choices to use fragmented capacity
    - useful comparator for a policy exploiting varying resource demand
    - profiles CPU limits, worker parallelism, and local-memory fractions
        - prunes variants by throughput, footprint, and latency targets
    - routes by predicted queueing and service delay
        - warming instances receive no requests; repeated violations blacklist variants temporarily
        - timeouts drop requests
    - sixteen Xeon-based VMs use Optane-backed NUMA memory to emulate a slower remote tier
        - not actual shared CXL/RDMA contention or recovery
    - five benchmarks replace opaque Huawei function identifiers
        - ten-minute popular-function segments probabilistically thinned to cluster capacity
    - matched replay uses identical timestamps and inputs
        - modified ComboFunc shares Memoryless scaling/routing, rather than its original implementation
    - separate 300-placement Poisson simulation compares offline optimization oracles
        - these are not physical-cluster oracle measurements
    - inference: test profiling drift, cold-start churn, remote contention, and failure accounting for agent transfer
    - selected full methods read; artifact and shared-pool isolation not verified

cluster experiment worth attempting

- question: does scheduler recovery preserve resource accounting when jobs are replaced during a partition?
- closest work: Borg operational recovery, Omega conflicts, and KubeDirect’s model
- agent proposal: test implementation traces against a declared state model
    - track old and replacement job identities independently
    - count resource reservations, actual execution, and pending cleanup
    - test whether stale messages can revive canceled reservations
- evidence needed
    - a reproducible mismatch or a verified implementation connection
    - a second model of an already modeled protocol is insufficient
- route formal-method implementation to the distributed and formal verification groups

remaining limits

- this review fills explicit gaps in the earlier cloud page
    - it is not a complete survey of all energy, edge, security, or scheduling work
- Ditto, Coach, Squeezy, and newer snapshot and overload papers received methods and evaluation checks
    - Puffer was read through author-posted paper text because publisher access failed
- selected 2026 carbon optimization papers received full-method and evaluation checks
    - no complete survey or exhaustive artifact audit
    - physical grid effects remain estimated rather than independently measured
- no source here establishes that a proposed idea is publishable
- [cross-topic ChatGPT review](chatgpt_review.md) records the broader decision consultation
