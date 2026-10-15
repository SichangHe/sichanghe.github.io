# AutoKernel: Autonomous GPU Kernel Optimization via Iterative Agent-Driven Search
(authored by agents unless marked 🧑)
Tag: `jaber2026autokernel`, [paper](https://arxiv.org/abs/2603.21331)

## what is measured
AutoKernel turns kernel tuning into an agent edit–benchmark–keep/revert loop. It profiles a complete PyTorch model, ranks bottlenecks by Amdahl’s law, edits one Triton or CUDA C++ file, runs a fixed correctness harness, and retains only a passing speedup. The paper states, “A five-stage correctness harness, covering smoke tests, shape sweeps across 10+ configurations, numerical stability under adversarial inputs, determinism verification, and edge-case coverage, ensures that every candidate kernel is validated before any speedup is recorded.” (Abstract, p. 1.)

The implementation has 9,200+ Python lines, 18 starter kernels, and a 909-line instruction document (§3, p. 4). Evaluation uses an NVIDIA H100 80GB, FP16, CUDA 12.8, 200 timing iterations per configuration, and a trimmed mean dropping the top and bottom 10% (§7, p. 7). Seven kernel types and 34 configurations all pass correctness with zero failures (§7, p. 7). Reported selected-size gains include RMSNorm 5.29× over eager and 2.83× over torch.compile, softmax 2.82× and 3.44×, and cross-entropy 2.21× and 2.94× respectively (Table 4, p. 7). These denominators are individual H100 FP16 configurations, not end-to-end model speedups.

## technique: profile and prioritize by Amdahl’s law
The profiler records per-kernel GPU time with five warmup and ten profiled iterations, classifies names into nine operation types, detects GPU specifications, and extracts standalone kernels with model-specific shapes, FLOP/byte formulas, and tolerances (§3.1–3.2, p. 4). The orchestrator uses `S = 1 / ((1-f)+f/s)` where `f` is the kernel’s runtime fraction and `s` its speedup (Eq. 1, p. 5).

Steps:
1. Profile the model and classify kernels by operation type.
2. Extract supported kernels and generate primary, half-scale, and double-scale test shapes.
3. Compute Amdahl what-if gains at 1.5×, 2×, 3×, and 5× (§3.2, p. 4).
4. Optimize the highest-impact kernel first; move on after five consecutive reverts, 90% of peak, two hours, or 2× speedup (§3.4, p. 5).

Verus form (Inference): represent profiling facts and optimization-plan thresholds as ghost/spec data. A verified orchestrator can prove that it selects the maximum modeled impact and respects termination criteria, but hardware timing and peak-throughput measurements remain external assumptions. Do not state a performance postcondition as a functional proof unless the benchmark measurement is modeled and trusted.

## technique: five-stage correctness gate
The benchmark rejects a candidate at the first failure, and measures throughput only after all five stages (§4, p. 6):
1. Smoke test: one small forward pass catches compilation, shape, and gross numerical errors.
2. Shape sweep: 8–10 sizes across FP16, BF16, and FP32 catch boundary and dtype bugs; matmul includes tiny, production-like, non-square, and large-reduction shapes (Table 2, p. 6).
3. Stability: adversarial values probe overflow/underflow, extreme dynamic range, and near-zero variance.
4. Determinism: three runs must be bitwise identical, exposing races and nondeterministic atomics.
5. Edge cases: non-power-of-two dimensions such as 1023, 4097, and 1537 exercise masking and tile remainders.

Tolerances are dtype-specific: FP16 `atol=10^-2`, BF16 `2×10^-2`, and FP32 `10^-4` (§4, p. 6). Verus form (Inference): encode a reference-kernel relation as a verified spec function and prove output bounds for modeled shapes; use executable tests for adversarial floating-point behavior and GPU determinism because those hardware properties are outside ordinary Verus arithmetic. A proof over the enumerated shapes is bounded evidence, not universal equivalence for all dimensions.

## technique: single-file iterative search
Algorithm 1 initializes the best kernel and timing, asks the agent to edit it using history and roofline data, commits the result, runs correctness plus performance, keeps it only when `pass` and `t' > 1.01·tbest`, otherwise resets the commit, logs the result, and checks move-on criteria (Algorithm 1, p. 5). Each iteration takes about 90 seconds and an overnight run gives 300–400 experiments (§1, p. 2; §3.3, p. 5). “The agent touches exactly one file.” (§3.3, p. 5.) This invariant makes diffs isolated and reverts clean.

The six-tier playbook orders block-size tuning; memory access; compute fusion and hoisting; advanced split-K/persistent kernels/autotuning; architecture-specific TMA or `cp.async`; and kernel-specific methods such as online softmax and Welford normalization (§3.3, p. 5). Verus form (Inference): verify each candidate against the same kernel contract and keep the best measured result in an external experiment ledger. A Rust proof can establish that a candidate preserves functional semantics under a modeled interface; it cannot prove the agent’s performance improvement or the absence of GPU-specific races without a suitable formal GPU model.

## technique: dual backend and fixed evaluation firewall
Triton provides rapid 1–5 second compilation and block/warp/stage tuning; CUDA C++ exposes WMMA fragments, warp shuffles, vectorized loads, shared-memory layouts, double buffering, and launch bounds (§5, p. 6). Both expose the same `kernel_fn()` interface and run under the same benchmark. The benchmark is never modified by the agent, which the design rationale calls a firewall against evaluator gaming (§10, p. 10). Git commits record kept experiments; rejected commits are reset (§10, p. 10).

Inference: VL can adapt this separation by keeping specifications and verification harnesses outside agent-writable Rust modules. Verus contracts should describe the stable interface, while optimization code is replaceable behind that interface. The fixed harness must include input-shape, panic, resource, and determinism checks relevant to the product, not just a speed metric.

## evidence, assumptions, and failure modes
On H100, AutoKernel beats torch.compile in 12 of the 16 displayed configurations (Table 4, p. 7), but matmul remains below cuBLAS: 278 TFLOPS, 28% of the stated 989.5 TFLOPS peak, at size 4096³ (§7.1, p. 7). Community results are separately reported: vectorsum_v2 B200 latency 44.086 μs versus 44.249 μs for second place (§7.2, p. 8), and a user-reported FP4 H100 Triton result 1.63×–2.15× over CUTLASS across seven shapes (Table 5, p. 8). The latter is community evidence, not the controlled H100 evaluation.

The main experiment covers one GPU model, FP16, seven kernel types, and 34 configurations. The agent inherits the underlying LLM’s limits; software pipelining, custom PTX, multi-CTA cooperation, distributed kernels, and multi-device memory are out of scope (§11, p. 10). “AutoKernel inherits the code generation capabilities of its underlying LLM.” (§11, p. 10.) The correctness oracle is the PyTorch reference implementation (§6, p. 7), so its semantics, tolerances, compiler, hardware, and benchmark code remain trusted.

Inference: threat to VL is high for performance-driven agent edits if the gate checks only sampled examples or permits harness changes. The transferable pattern is a non-agent-writable, fail-closed harness, immutable reference semantics, isolated diffs, and an explicit keep/revert ledger. Verus can strengthen functional and memory-safety contracts, but it does not replace integration tests for compiler, GPU, FFI, timing, or numerical behavior. VL should not redo an agent loop without this fixed-evaluation firewall; a speedup claim without denominator, hardware, shape, and correctness gate is not evidence of product safety.

## techniques for the catalog
- Amdahl prioritization: allocate optimization experiments by each kernel’s fraction of end-to-end runtime
- five-stage correctness gate: require smoke, shape, stability, determinism, and edge-case checks before timing
- single-file keep/revert loop: isolate one edit, benchmark it, retain only a passing threshold improvement
- tiered optimization playbook: order block, memory, compute, advanced, architecture, and kernel-specific transformations
- fixed evaluation firewall: keep benchmark and reference semantics outside agent control
- dual backend interface: expose Triton and CUDA implementations through one tested kernel interface
- experiment provenance: commit, log, and revert every candidate so performance claims are auditable
Checked 2026-10-15 against paper jaber2026autokernel: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
