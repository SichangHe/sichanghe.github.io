# AutoMegaKernel: A Statically-Checked Agent Harness for Self-Retargeting Megakernel Synthesis
(authored by agents unless marked 🧑)
Tag: `jaber2026automegakernel`, [paper](https://arxiv.org/abs/2606.09682)

## what the paper builds

Inference: AutoMegaKernel (AMK) is a GPU compiler and runtime that lowers a HuggingFace Llama-family model to one persistent cooperative CUDA kernel. The paper's formal-methods lesson is a frozen validator over a typed schedule intermediate representation (IR): an agent may search schedules and kernel knobs, but a schedule is rejected before launch unless static graph checks establish the specified safety conditions.

> “A validator statically checks the schedule is deadlock-free and race-free before any launch (a set of graph checks over a trusted hand-written base, not a mechanized proof).” (Introduction, p. 2)

Inference: This is evidence for a reject-before-run architecture for agent-written verified Rust, but it is empirical soundness over a trusted checker, not a proof of the checker. The VM, validator, per-architecture backend, reference oracle, and model importer remain trusted or partially trusted.

## schedule IR and execution model

Inference: Lower a model into an SM-level task DAG. Each task has typed input/output buffers, wait pairs `(counter, threshold)`, one output counter, an SM assignment, and scalar parameters. The persistent VM launches one cooperative block per SM; each block walks its queue in global topological order. A task executes `wait → dispatch → signal`. Producers release-fence output stores and increment exactly one monotonic counter; consumers acquire-load counters until statically known thresholds hold. There are no locks or arbitrary signals.

> “Each task, on completion, issues a device-scope release fence ordering all its output-buffer stores, then increments exactly one out_counter by 1: ‘all my outputs are written and visible.’” (Section 4, p. 5)

Inference: The paper's Algorithm 1 is directly actionable: enter with `grid.sync`; for each task, prefetch the next weight tile if configured, test `wait_all`, abort on watchdog flag, dispatch pure block-cooperative compute, signal the output counter with a release fence and atomic increment; finish with a second `grid.sync`. Counters are zeroed before each launch and KV cache persists between launches.

Inference: A Verus analogue would model the schedule as an immutable specification graph and prove that each executable task consumes only declared buffers, while a ghost counter protocol records producer completion. Verus `requires`/`ensures`, `assert`, loop invariants, and a state-machine-style transition relation are plausible forms; this is an inference because the paper uses Python/CUDA static checks, not Verus.

## static safety checks

Inference: Implement `validate()` as a total function returning `ValidationResult` rather than raising. Reject malformed references, bad arity, missing parameters, and ABI capacity overflow (more than eight inputs, four outputs, eight waits, or rank four). Then apply the safety checks in Table 2:

- wait satisfiability: reject threshold below one, no producer, or threshold above producer count
- DAG acyclicity: reject a cycle in the producer-to-consumer graph
- per-SM queue order: reject an edge whose consumer appears before its producer on one SM
- shared-counter all-join: for a multi-producer counter reject every partial threshold `1 < t < #producers`
- transitive happens-before: reject reads whose writers are not ordered predecessors
- KV-cache ordering: reject a reader of a same-pass append without an ordering edge
- output reachability: reject an output buffer that no task produces

> “A counter with more than one producer is a true join, so every wait on it must use threshold = #producers; a partial wait 1 < t < #producers is a first-k-of-N race and is rejected.” (Section 4, p. 6)

Inference: Deadlock-freedom follows from three structural conditions: every threshold is satisfiable; the producer-consumer graph is acyclic; and each SM queue is a linear extension of the DAG, preventing a block from waiting on a later task on itself. Race-freedom follows from all-join thresholds and transitive writer provenance. For each activation or KV read, validation tracks a bitmask of buffers written by transitive predecessors.

Inference: The corresponding Verus design should make invalid schedules unrepresentable where practical (typed IDs and bounded vectors), then retain executable validation at the boundary. A proof function can establish graph invariants over a ghost DAG, while runtime code still rejects malformed external input. The exact bounded-container encoding depends on the available Verus library and is not stated by the paper.

## trusted layers and agent edit surface

Inference: AMK has four layers. Layer 0 is a hand-written, frozen VM and loader; Layer 1 contains ABI-conformant micro-kernels tested against reference operations; Layer 2 imports and lowers HuggingFace models and validates schedules; Layer 3 is a future dynamic-shape/mixture-of-experts layer. Agents edit a structured `ScheduleConfig`, not kernel code: tiling, fusion grouping, SM assignment, prefetch depth, page allocation, threads per block, and shared-memory size. The frozen VM lowers every config deterministically, and the validator gates the result. A new GPU is represented as a `GpuTarget` record rather than a scheduler edit.

> “The Layer-2 agent proposes a structured object, not kernel code.” (Section 4, p. 6)

Inference: This separation transfers directly to VL: let an agent propose typed policy/configuration data, then lower it through a fixed trusted implementation and verify the resulting Rust/Verus artifact. It reduces the agent's ability to bypass synchronization or memory ownership rules, though it does not eliminate bugs in the trusted lowering code.

## correctness and coverage evidence

Inference: The paper evaluates correctness on seven GPUs and reports denominators and settings. The validator dataset has 7,160 schedules: 360 real lowerings, 2,800 single-injection mutants across eight unsafe classes, and 4,000 random DAGs. An independent oracle labels 6,091 unsafe schedules. `validate()` rejects all 6,091, yielding zero false accepts, and accepts all 360 real lowerings; 24 of those are re-run in the reference VM and match eager bit-for-bit. Validation runs at about 5,150 schedules per second on CPU.

> “Across 7,160 adversarial schedules (6,091 unsafe), the validator had zero false-accepts and accepted all 360 real lowerings, 24 of which matched eager bit-for-bit.” (Abstract, p. 1)

Inference: The per-class denominator matters. Oracle-unsafe/rejected counts are cycle 342/342, drop-wait 331/331, KV-before-append 171/171, self-wait 197/197, out-of-bounds counter 350/350, out-of-bounds buffer 350/350, capacity overflow 350/350, and partial-shared 0/0 because the oracle cannot observe the producer identity race; validation nevertheless rejects all 350 partial-shared mutants. The paper calls this stricter behavior a limitation of the dynamic oracle, not a false rejection of real lowerings.

Inference: Generation coverage is 10/10 supported models with zero hand-written CUDA. Three real checkpoints (SmolLM2-135M, SmolLM2-360M, TinyLlama-1.1B) produce token-for-token HuggingFace output; unsupported variants are rejected 3/4, while a Qwen2 hardcoded q/k/v bias passes a config-only check and disagrees with eager (logit error 2.47). This blind spot is a concrete threat to any importer-based verification pipeline.

Inference: On SmolLM2-135M, 187 real next-token predictions give teacher-forced perplexity 14.948473 for both AMK and HuggingFace, absolute gap 2.45×10^-7; a 64-token greedy decode is byte-identical (64/64). The same source retargets sm_80, sm_90, and sm_120: real checkpoint greedy decoding matches eager, while toy/from-config fp32 max absolute errors are 2.98×10^-7 (A100) and 2.38×10^-7 (H100).

## quantitative optimization techniques

Inference: Weight-only quantization is generated by the same path, folding dequantization into GEMV. On a real SmolLM2-135M checkpoint, int8 agrees with fp16 for all 32 greedy tokens; naive int4 agrees for about 22% and is therefore lossy. On the four-layer RTX 5090 model, bf16 is 1537.4 µs/token, int8 1371.2 µs/token (1.12× per-token; 1.18× kernel-only), and int4 1450.6 µs/token (1.06×; 1.10× kernel-only). The int4 blended weight-traffic floor falls 2.42×, not 4×, because tied embeddings, dequant scales, and non-GEMV buffers remain bf16.

Inference: The self-improvement loop is `propose → lower → validate → ReferenceVM correctness gate → CUDA-event measurement → keep/revert`. It searches ScheduleConfig plus GEMV knobs such as columns per warp, tile width, thread count, and `cp.async` depth. Measurements are per-sample interleaved A/B comparisons so clock drift cannot select a cooler candidate. A physical roofline guard rejects impossible latency; it caught a predicted 87.6 µs result below the 695 µs weight/bandwidth floor. On a 622 MB model, one run improves 2514 to 1991 µs (1.25× drift-robust; 12 experiments, six kept), while a cold drift-free campaign reaches 2168 to 1261 µs (1.72× at iteration two).

> “Every trial is gated the same way: lower → validate → correctness vs. the CPU ReferenceVM → a CUDA-event median latency that is never emitted without a correctness PASS.” (Section 5, p. 10)

Inference: This is the most transferable agent-search pattern: never score an optimization candidate until a deterministic semantic oracle passes; compare candidates under interleaved measurement; retain the incumbent on noisy or invalid trials; and enforce a physical lower-bound sanity check.

## performance boundaries and what remains trusted

Inference: The paper reports kernel and whole-decode denominators separately. On RTX 5090, AMK is 3.6× faster than naive per-op eager (1.23 vs 4.44 ms/token) but CUDA-graphed cuBLAS is 1.13× faster (1.08 vs 1.23 ms/token). The optimized bf16 GEMV reaches about 460 GB/s, 63% of measured 731 GB/s peak and 51% of the 896 GB/s vendor specification, versus a cuBLAS ceiling of about 661 GB/s. The int8 W8A16 comparison beats cuBLAS bf16 on inference-class GPUs: L4 1.18–1.33× over 1.3–4B shapes, L40S 1.25–1.27× over 4–6.7B, A10G up to 1.08× at 4B, and RTX 5090 1.19–1.23× over 4L/8L. These are precision-asymmetric comparisons and use random-initialized real Llama shapes for speed; near-lossless quality is measured separately on the real checkpoint.

Inference: AMK trails cuBLAS on training-class A100/H100 because fixed cross-SM synchronization dominates; T4 stays below parity for an occupancy reason. Long-context decode is unmeasured because all timings are batch-one position zero with empty KV. No Nsight hardware counters were available, so utilization is wall-clock plus analytic roofline, not direct DRAM-counter evidence.

Inference: VL should not redo a generic agent-proposes-code/test loop. The paper already supplies a stronger structure: a typed edit surface, frozen lowering/VM, static pre-launch safety gate, independent semantic oracle, drift-robust search, and explicit trusted-boundary disclosures. What VL would still need to establish is Verus-specific proof soundness, Rust ownership integration, and a threat model for external crates and unsafe code.

## techniques for the catalog

- static schedule validator — reject unsatisfiable waits, cycles, self-blocking queues, partial joins, unordered reads, KV hazards, and unreachable outputs before launch
- typed agent edit surface — expose structured configuration and deterministic lowering instead of allowing agents to edit synchronization code
- reference-oracle gate — require semantic equivalence against a CPU reference before measuring or retaining an optimization
- drift-robust autoresearch — use interleaved A/B timing, keep/revert, and a physical roofline guard for noisy unattended optimization
- adversarial validator audit — compare a checker against an independent unsafe oracle, report every class denominator, and retain stricter checks the oracle cannot model
Checked 2026-10-14 against the paper by a Codex agent: audit record jaber2026automegakernel; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
