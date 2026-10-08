asynchronous MoE serving: StreamEP, buffering, and progress
(authored by agents unless marked 🧑)

takeaway

- recommendation: study buffer reuse and request cancellation before proposing another asynchronous scheduler
    - existing work already covers micro-queues, batching, GPU-initiated transfers, readiness flags, and expert reassignment
    - a useful result would connect a small checked protocol to an actual runtime and its documented operating assumptions
    - this review identifies candidates, not a demonstrated bug or a certified new research direction
- evidence checked on October 8, 2026
    - methods and evaluation sections inspected for AMoE, MegaScale-Infer, FlashMoE, ASAP, CascadeEP, AInfer-PD, and Moebius
    - ZeRO-Prefill reading covers implementation discussion and scope limits
    - StreamEP was checked through its authenticated artifact and selected implementation files
    - its full manuscript remained inaccessible

human interests and source boundary

- 🧑 [the human's StreamEP meeting notes](../../../../reading_notes/index.md) name “StreamEP: Straggler-Tolerant MoE Decoding without Communication Barriers”
    - attributed to Shaoyu Wang at an NSL meeting
    - observations include per-expert micro-queues and “little throughput loss when small portion of network packets drop”
- 🧑 [the human's Async MoE meeting notes](../../../../reading_notes/index.md) attribute the talk to Coulson Liang on behalf of Shaoyu Wang
    - observations include CPU metadata exchange, NCCL rendezvous, NVSHMEM buffers, and “set bit w/ RDMA & busy wait”
- those are meeting observations rather than measurements independently verified here
    - the exact paper corresponding to the Async MoE talk remains uncertain
    - AMoE is close work from the same group
    - Moebius is a separate paper about changing parallel layouts
- [NSL's publication list](https://nsl.usc.edu/publications/) identifies StreamEP as a SOSP 2026 paper
    - [the author-maintained publication page](https://yizhuoliang.github.io/) confirms its title and authors
    - [publisher DOI](https://doi.org/10.1145/3830418.3843869)
    - author and lab routes did not yield a readable manuscript
- [the authors' Zenodo record](https://zenodo.org/records/22100357) explicitly binds software to that paper
    - original description: “StreamEP SOSP '26 Artifact. Paper DOI: 10.1145/3830418.3843869”
    - this establishes artifact identity without treating similarly named repositories as the paper

what must remain ordered

- terminology used below
    - a rank is a participating process
    - KV state holds cached attention keys and values
    - RDMA means remote direct memory access
    - a queue pair contains transport send and receive queues
- a mixture-of-experts model, or MoE, sends each token to a few selected expert networks
    - dispatch sends token inputs to those experts
    - combine collects their outputs and applies the routing weights
- removing a global wait does not remove a token's own dependencies
    - AMoE's receptor states: “Until all inputs are ready, we cannot execute the attention layer”
        - [Wang et al., AMoE v2, §3.2](https://arxiv.org/html/2505.08944v2)
    - unrelated requests may advance while a slow request waits
    - dropping a required expert result changes the computation unless the model explicitly permits it
- asynchronous work has several distinct meanings in this literature
    - overlap communication and computation inside one MoE layer
    - advance independent requests across different layers
    - overlap prompt processing with token generation
    - change the distribution of weights and requests between decode iterations
    - evidence for one mechanism does not establish the others

closest decoding work

- [AMoE, v2](https://arxiv.org/html/2505.08944v2)
    - Wang et al., May 2025
    - separates attention and experts into independently scheduled runtimes
    - places ready tokens in queues for their next layer
    - batches across requests rather than requiring one batch to move together
    - its defragging scheduler predicts where token groups will form
        - picking the largest current queue can scatter work
        - always prioritizing early layers can leave later layers waiting under sustained arrivals
    - implementation uses CPU metadata exchange, dynamically prepared buffers, and NCCL transfers
    - important evaluation limits in §5
        - dummy KV state bypasses prompt processing
        - synthetic routing fits a distribution derived from Dolly
        - the experiment changes grouped-query attention to multi-query attention
        - low-load token latency can be worse than SGLang
    - implication: reproduce its scheduling baselines before claiming that grouping ready tokens is new

- [StreamEP artifact README, pinned revision](https://github.com/MachineLearningSystem/26SOSP-StreamEP-Artifact/blob/f0f7d3da165884192f70fd2c48fbd7c64267b430/README.md)
    - authors describe StreamInfer as implementing StreamEP
    - original qualification: “Currently only work with dummy model weights”
    - executes model operations and transfers while replaying routing profiled from real models
    - the baseline also uses dummy KV state and routing replay
    - reproduction targets throughput/token latency and network interference
        - [throughput setup](https://github.com/MachineLearningSystem/26SOSP-StreamEP-Artifact/blob/f0f7d3da165884192f70fd2c48fbd7c64267b430/experiment_utils/throughput-itl/README.md)
        - [interference setup](https://github.com/MachineLearningSystem/26SOSP-StreamEP-Artifact/blob/f0f7d3da165884192f70fd2c48fbd7c64267b430/experiment_utils/interference-resist/README.md)
    - checked reproduction reduces GPT-OSS-120B to 18 of 36 layers on four nodes with eight L40S GPUs total
    - interpretation: congestion experiments support studying slow communication
        - they do not establish recovery from a failed rank or permanently absent expert output
        - dummy weights support performance replay rather than generated-answer correctness
    - selected [StreamInfer implementation](https://github.com/USC-NSL/StreamInfer/tree/08594f596598b8fb2c838b1d154960ed6a0a442e) files were inspected
        - communication, NIXL channel, token pool, scheduler, and metadata
        - backend inclusion alone does not identify the backend used for every paper experiment
        - no implementation bug is claimed from that partial inspection

communication overlap and batching

- [MegaScale-Infer, arXiv v1](https://arxiv.org/html/2504.02263v1)
    - Zhu et al., April 2025; later SIGCOMM 2025 publication
    - original mechanism: “partitions a request batch into micro-batches”
    - separates prompt processing, decoding, attention, and expert computation
    - ping-pong scheduling overlaps transfers with work on another micro-batch
    - its M2N transport uses registered RDMA buffers and receiver completion checks
    - useful methods in §§4–6
        - choose independent parallel layouts for attention and experts
        - collect expert work from several attention groups
        - overlap depends on relative computation and communication durations
    - evaluation covers large MoE models and heterogeneous NVIDIA hardware
    - inference: throughput overlap does not itself remove one token's expert dependencies
    - this review uses the preprint version rather than assuming the published text is identical

- [FlashMoE, NeurIPS 2025 full paper](https://papers.nips.cc/paper_files/paper/2025/file/918d938bd209e5b56072777366f8a211-Paper-Conference.pdf)
    - persistent GPU kernel overlaps tiled computation with NVSHMEM transfers
    - explicit symmetric memory layout separates source, phase, expert, and tile destinations
    - theorem 3.1: “The symmetric tensor layout L is write-write conflict-free”
    - Appendix C proves distinct valid senders cannot target the same coordinates
    - proof scope matters
        - assumes distinct coordinates map to distinct memory segments
        - addresses concurrent writes to that layout
        - does not establish cancellation, repeated-buffer reuse, or rank-failure recovery
    - evaluation measures one MoE forward layer on eight H100 GPUs
        - FlashMoE uses FP32 while compared implementations use FP16
        - these timings are not a request-level latency guarantee
    - implication: any buffer proof proposal must explain what it adds beyond this existing layout proof

- [ASAP, v1](https://arxiv.org/html/2606.22541v1)
    - Chen et al., June 2026
    - attention and expert devices exchange token payloads through partitioned shared buffers
    - §3.2 sender rule: “if a target flag is already set, the write blocks until the receiver clears the flag”
    - receiver copies a completed group's payload into private memory before returning buffer availability
    - minimum batch sizes and interleaved batches improve expert utilization
    - separate communication streams overlap transfers on expert devices
        - authors avoid that overlap on attention devices after observing memory-system interference
    - dynamic layer execution uses a device-side MoE super kernel to reduce host launch delays
    - evaluation uses DeepSeek-V3.2 and 32 Ascend NPU dies on CloudMatrix384
    - scope: prompt processing on that interconnect
    - implication: readiness flags and sender backpressure are established mechanisms

recent work that narrows the proposals

- [CascadeEP, v1](https://arxiv.org/html/2609.33252v1)
    - September 2026 preprint about uneven attention work during prompt processing
    - starts expert work when an individual attention replica's inputs arrive
    - can fetch expert weights onto an idle helper and reassign unstarted work
    - Appendix C explicitly tracks “output readiness separately from buffer reclamation”
    - uses generation-tagged readiness and validated ownership reassignment
    - retains a common layer boundary before the next attention layer
    - Appendix E's non-increasing layer-time argument has strong assumptions
        - predicted concurrent computation costs are accurate
        - weight fetching does not delay the existing plan
        - the return/combine tail does not increase
    - implication: an unconditional claim that asynchronous reassignment cannot hurt latency would exceed this proof
    - lifecycle proposals must compare with its existing readiness and ownership rules

- [AInfer-PD, v1](https://arxiv.org/html/2609.00993v1)
    - September 2026 preprint about overlapping prompt processing and decoding
    - overlapping attention parallel groups can enqueue collectives in conflicting rank orders
    - a distributed turnstile gives the specified phases a consistent order
    - separate prompt/decode buffers, counters, events, and queue-pair ranges prevent mutable-state collisions
    - retains shared weights and KV state
    - §4 explicitly says it “does not establish deadlock freedom for arbitrary collectives”
    - §5.3 cancellation rule: “an abandoned operation retires its buffer until a quiescent cleanup point”
        - keeps it unavailable until outstanding access has finished
    - §5.2 also prevents cancellation from reusing partially advanced dispatch state
    - implementation pins DeepEP 1.2.1 and SGLang 0.5.15
    - evaluation includes internal model checkpoints and eight- or sixteen-GPU configurations
    - implication: separate communicators alone do not prove that overlapping phases make progress
    - applicability to a different communication schedule requires checking that schedule's dependency graph

- [Moebius, v1](https://arxiv.org/html/2606.26607v1)
    - Wang et al., June 2026
    - switches between expert parallelism and tensor parallelism as request load changes
        - expert parallelism assigns experts to ranks
        - tensor parallelism divides an expert's arithmetic among ranks
    - §3: “The switch runs synchronously across ranks while decode is paused between iterations”
    - migrates request ownership, sampling state, and cached attention values together
    - fixed buffer addresses preserve captured GPU execution graphs
    - transfers must complete before the runtime commits its new mode
    - evaluation uses Qwen3-235B-A22B on eight H200 GPUs with NVLink
        - rollout evaluation fixes output lengths across compared modes
        - that controls performance work but does not show identical generated tokens
    - inference: preserving stored bytes does not ensure bitwise equality when arithmetic grouping changes
    - StreamEP's artifact and Moebius have separate identities and mechanisms

- [ZeRO-Prefill, v1](https://arxiv.org/html/2605.02960v1)
    - May 2026 preprint
    - original scope: “throughput-oriented, batch-driven prefill-only serving”
    - its AsyncEP overlaps gathering expert weights for later layers with current computation
    - moves expert weights rather than using the same activation-routing mechanism as StreamEP
    - inspected implementation discussion and scope limits
        - prompt-processing workload
        - benefit depends on the available computation window and transfer bandwidth
    - use this as a scope check when a proposal says only “asynchronous expert parallelism”
    - full numerical-correctness validation remains necessary for a concrete implementation

versioned communication facts

- [DeepEP 1.2.1 README](https://github.com/deepseek-ai/DeepEP/blob/9af0e0d0e74f3577af1979c9b9e1ac2cad0104ee/README.md)
    - original warning: “The current DeepEP implementation uses queues for communication buffers which save memory but introduce complexity and potential deadlocks”
    - recommends considering fixed buffers sized for maximum capacity
    - its normal path can wait on the CPU for received-token counts
    - its low-latency path exposes completion hooks for overlapping work
    - this is an author warning about that version, not evidence of a bug in a particular deployment
- [DeepEP revision inspected on October 8, 2026](https://github.com/deepseek-ai/DeepEP/blob/93eb6eb238127e96c6d7a4a625a6dad158348509/README.md)
    - original change notice: “NVSHMEM is no longer a dependency”
    - uses NCCL Gin and different APIs
    - a proposal based on NVSHMEM must name its historical implementation or chosen fork
    - benchmarking current DeepEP and implementing against 1.2.1 are different comparisons
- [NVIDIA's NVSHMEM programming model](https://docs.nvidia.com/nvshmem/api/latest/using.html)
    - original definition: “operating system processes” are “referred to as processing elements (PEs)”
    - a processing element, or PE, is a process
    - symmetric allocations provide corresponding memory objects across PEs
    - the meeting note's receiving-buffer description should not redefine PE as a buffer
- [NVIDIA's ordering reference](https://docs.nvidia.com/nvshmem/api/latest/gen/api/ordering.html)
    - original distinction: “guarantees order of delivery, not completion”
        - about `nvshmem_fence`
    - `quiet` establishes completion for the operations in its documented scope
    - CPU and GPU issue paths have distinct ordering requirements
    - ordering one issuing thread's operations does not synchronize unrelated issuing threads
- [NVIDIA's signal reference](https://docs.nvidia.com/nvshmem/api/latest/gen/api/signal.html)
    - original limitation: “there is no implied ordering between the signal update” and “another data transfer”
    - a put-with-signal operation connects payload delivery to its associated notification
    - separate operations still need the documented ordering rules
    - inference: an arbitrary RDMA write followed by setting a bit needs more justification than the bit's atomicity
- [NVIDIA's multiple-communicator guidance](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/communicators.html#using-multiple-nccl-communicators-concurrently)
    - original requirement: “users must ensure the order of host-side launches matches for all devices”
    - NCCL 2.26 introduces an option for implicit ordering based on host launches
    - graph capture and launch order also matter
    - therefore CPU rendezvous in one implementation is not a universal definition of NCCL

inferred obligations for a concrete protocol

- the following are proposed checks rather than confirmed runtime defects
- distinguish each contribution across request, token position, layer, expert, model version, and reuse generation
    - equivalent identities may suffice if the supported schedule cannot confuse them
- accept exactly the selected expert contributions
    - preserve their routing weights
    - define how retries avoid duplicate accumulation
    - cancel the whole affected computation rather than silently omit an expert
- publish readiness only after the payload is visible to the consuming kernel
    - establish the required ordering for the actual transport and issuing threads
- return a buffer slot only after its last read or copy completes
    - sender-source reuse, receiver readiness, and receiver-slot reclamation are different events
    - a cancellation flag alone does not prevent a late remote write into reused memory
- define the numerical contract before judging correctness
    - exact integer toy arithmetic can isolate protocol errors
    - real floating-point outputs need specified tolerances or a bitwise contract
    - arrival-dependent addition order may affect the latter
- prove progress only under explicit assumptions
    - healthy participants and transport, fair scheduling, sufficient capacity, and runnable communication work
    - bounded queues can form a cycle where every participant waits for space held by another
    - a permanently failed expert needs an abort or recovery policy rather than a straggler-only proof
- commit a layout or weight-version change after all required state is coherent
    - include sampling state and KV ownership
    - do not mix expert outputs from different model versions

research candidates and stop conditions

- first candidate: check a small reusable-buffer protocol against its implementation
    - question: can overlapping transfers and cancellation reuse a slot before an old producer or consumer finishes?
    - begin with two senders, two receivers, two slots, and two selected experts
    - enumerate delayed notifications, cancellation, and slot-generation wraparound
    - check ownership, visibility, exactly-once combine, and eventual progress under stated fairness assumptions
    - compare fixed-capacity buffers, credit-controlled queues, and the chosen runtime's actual protocol
        - FlashMoE already proves layout write isolation
        - ASAP already provides flag backpressure
        - CascadeEP already separates readiness and reclamation
        - AInfer-PD already handles cancelled dispatch state and retires abandoned buffers
    - contribution requires a missing supported transition, a smaller checked protocol, or useful implementation correspondence
    - stop if a suspected counterexample only violates the transport API or unsupported failure assumptions
    - a CPU model is feasible without GPUs
        - it cannot validate GPU memory ordering or establish runtime performance

- second candidate: measure latency under unequal expert and network delays
    - question: does throughput remain high while a minority of requests waits too long?
    - compare AMoE's defragging rule, queue-size priority, early-layer priority, and a synchronous baseline
    - vary burst size, routing skew, and delayed links separately
    - report accepted load, goodput, tail token latency, request completion, buffer occupancy, and GPU utilization
        - goodput counts requests meeting the stated latency target
    - use StreamEP's authenticated routing replay for performance replication
    - separately use real weights and a reference computation for output checks
    - distinguish slow delivery, transport retransmission, and a permanently failed participant
    - stop if the existing scheduler meets the stated target without an unexplained pathology
    - do not claim that changing batch policy alone is new

- conditional follow-up: test numerical and state preservation during EP/TP switching
    - start from Moebius's synchronized switch rather than redesigning it
    - compare uninterrupted decoding with switching at matched token positions
    - inspect logits, selected experts, KV values, sampling state, and final outputs
    - fix random seeds and define tolerances before judging divergence
    - requires real model weights and suitable multi-GPU hardware
    - stop if observed differences satisfy the stated numerical contract and state invariants
    - performance gains alone would duplicate an already studied direction

remaining limits

- no StreamEP manuscript-level claim or novelty comparison is complete without its readable full text
- reviewed preprints are versioned evidence rather than proof of publication review or field-wide agreement
- no experiments, GPU kernels, or model-output checks were run for this study
- no claim that corruption, starvation, or deadlock occurs in the inspected deployments
- hardware availability and a reproducible target implementation remain prerequisites for the performance candidates
- new ChatGPT consultation was not attempted while access restoration remained unconfirmed
