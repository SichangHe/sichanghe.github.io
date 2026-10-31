# Count-Based Abstractions for Performance Verification of Contention Points
(authored by agents unless marked 🧑)
Tag: `seyhani2026count`, [paper](https://www.usenix.org/conference/nsdi26/presentation/seyhani)

## problem and result

FPerf models every packet slot of a buffer (C × T sets of variables for capacity C over T timesteps) and scales poorly with realistic buffers. This paper (NSDI 2026) replaces slot-level state with per-class count vectors plus optional ordering windows, and keeps contention-point logic modular behind a backlog-based interface. It states: “We introduce vector of counts and window abstractions as mechanisms to represent buffers and control the cost-precision tradeoff in contention point verification.” The target is sound over-approximation: the model may admit extra behaviors, but “as long as it includes the true behaviors, the abstraction is sound for verification” (§3).

## technique: vector-of-counts buffer

Use when the query and the scheduler's decisions depend only on backlogs and per-class packet counts, not on identities of individual packets (§2.2). For K classes, represent the buffer at time t by `v_t = <v1,...,vK>` with each `vk ∈ N` (§3.1). At enqueue, split the arrival vector `i_t` nondeterministically into enqueued `e_t` and dropped `d_t` vectors with `i_t = e_t + d_t`; the backlog bit `b_t` holds iff `v_(t-1) + e_t > 0`; drops are allowed only when the buffer is backlogged and full (sum equals capacity C). At dequeue, the processing logic picks a count `m_t`; the model chooses a class-count vector `o_t` with sum `m_t` and sets `v_t = v_(t-1) + e_t - o_t`. The paper names these constraints `EnqDropSum`, `Backlog`, `Drop`, and `Deq` (§3.1).

Inference (steps assembled from §2.2, §3.1, §5): choose traffic classes; declare one count vector per timestep; encode capacity and enqueue/drop conservation; expose only `backlogged` (and optionally backlog size) to the processing logic; encode dequeues as nondeterministic class choices constrained by the requested total; state workload and query over count sequences (inputs, outputs, occupancy, drops). A single count per buffer suffices when the query depends only on how many packets leave a buffer and decisions depend only on backlogs (§2.2 strict-priority example); K>1 is needed when the query distinguishes classes, e.g., high- vs low-priority packets.

Inference: In Verus, a ghost sequence of integer vectors can model this abstraction. Prove nonnegativity, capacity, and conservation with `requires`/`ensures` and loop `invariant`; keep nondeterministic choices in proof code rather than executable packet movement.

## technique: windows to bound FIFO reordering

Counts alone permit reorderings a FIFO cannot produce when packets of multiple classes share a buffer; with a single class per buffer this does not matter (§3.2). The paper summarizes the tradeoff: “The count-based abstraction with window constraints provides an effective mechanism to trade off precision for performance.” For window size W, group enqueued and dequeued packets into non-overlapping windows of W packets and require each enqueue window and the corresponding dequeue window to contain equal per-class counts; order inside a window is unconstrained. The model maintains `N = ceil(C/W) + 1` enqueue windows and one dequeue window for capacity C. When the counts in the first enqueue window and the dequeue window match (they need not be full), the dequeue window resets and the enqueue windows shift forward.

The paper's example (§2.2): a round-robin scheduler with one class-A and one class-B input feeds a rate limiter with a 4-packet buffer; without windows the count model admits four consecutive B packets at the rate limiter's output, although its input alternates A and B; with W=4, the first window's counts force the packet dequeued at timestep 8 to be an A. The paper argues for W=C: “Setting W = C relaxes ordering within bursts, where fine-grained ordering is often not semantically meaningful, while preserving ordering across bursts.” W=C needs only two enqueue windows. W=1 reduces to FPerf's representation with exact FIFO order (and FPerf-like cost); larger W reduces variables but weakens precision.

Inference: A Verus proof can define a window queue as ghost `Seq<int>` counts and maintain a cross-window prefix invariant. The executable scheduler need not store packet metadata if the verified property only concerns class counts.

## technique: modular state-machine interface

Separate buffer representation from contention-point logic (§2.3, §4). The authors caution (§3): “Our abstract model is non-deterministic: By reducing the amount of logic used to represent buffers, we represent the contention point behavior more efficiently, but less exactly.” At each timestep, buffers expose backlog bits (optionally backlog sizes); a state machine (`Init`, `Trs`, `Act` over internal state `Q_t` and backlogs `B_t`) decides how many packets move from each input buffer to each output stream. Any buffer model that exposes backlogs and applies dequeue decisions can be swapped in, e.g., FPerf's exact buffers, counts, or counts plus windows. The paper says: “Separating contention point logic from buffer representation through a consistent interface has several advantages” (swapping buffer models, reusing buffer optimizations, deriving logic from Buffy programs). Buffy-style programs were translated manually (§4, §6.3): unroll loops, convert to SSA form, expand `backlogged(i)` into predicates over symbolic backlog variables and `move-p(i, j, k)` into assignments to move variables, and replace lists with per-buffer symbolic variables; `Act` comes from the move assignments, `Trs` from updates to internal state such as `turn`.

For verification (§5), encode the workload P, contention-point behavior CP, and negated query ¬Q in SMT and check `P ∧ CP(I, O) ∧ ¬Q` with Z3: “If unsatisfiable, there are no inputs that satisfy the workload property while violating the query, and thus P implies Q.” UNSAT under the abstraction implies UNSAT under a concrete FIFO model; SAT may be spurious (the paper's rate-limiter example with property granularity of 2 packets below window size 4). Composition directs output streams to downstream input buffers, with classifiers that route traffic by class (§2.1, §6.2).

Inference: In Verus, define a trait-like specification boundary for a buffer with ghost methods for enqueue, dequeue, backlog, and class counts, then prove scheduler lemmas against that boundary. Concrete implementations can refine the same specification.

## evidence and limits

The paper reruns FPerf's search and verifies FPerf's candidate workloads in both models for strict priority, round-robin, FQ-CoDel, and a compositional Loom case (§6). Strict priority, buffers 10 to 500 packets: starting at 100 packets FPerf's time increases significantly, while the abstract model answers in under 200 ms. Round-robin: FPerf rises to about 8 s, the abstract model stays under 350 ms up to 450 packets. FQ-CoDel: FPerf jumps to over 45 s at 400 packets, both abstract encodings stay below 5.5 s through 500; without windows it is on average 1.3 s faster. Loom: at buffer size 30 FPerf's average exceeds 200 s, the abstract model stays around 50 s up to 500 (the introduction instead says over 200 s at 50 packets). Small leaf-spine with K = 12 classes: over 30 minutes at buffer size 10 versus about 1 s for FPerf; routing-aware elimination of unreachable classes per buffer (average 1.09 classes per buffer) brings it to about 1.3 s. For all case-study workloads, SAT/UNSAT answers matched FPerf's. For small buffers (10s of packets) FPerf's spelled-out encoding may be faster.

Limits stated by the paper (§7): no direct per-packet metrics such as individual delay (delay queries are expressed as thresholds on summed backlogs); no PIFO-style priority queues; AQM that relies on per-packet metrics (e.g., CoDel) cannot be directly captured. Encoding size grows with the number of traffic classes. State machines were derived from Buffy programs by hand; automation is future work.

## techniques for the catalog

- vector-of-counts buffer — replace packet slots with per-class counts and conservation constraints
- window ordering — bound FIFO reordering by matching class counts across fixed-size enqueue/dequeue windows
- modular contention model — connect interchangeable buffer abstractions to a backlog-driven state machine
- SMT workload query — prove a performance property by checking `P ∧ CP ∧ ¬Q` for unsatisfiability
- routing-aware class reduction — remove traffic classes that can never reach a buffer before encoding a composed network
