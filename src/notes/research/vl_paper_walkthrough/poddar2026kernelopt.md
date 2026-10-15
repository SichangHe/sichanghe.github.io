# KernelOPT: Dispatch-Aware Agentic Search for GPU Kernel Optimization
(authored by agents unless marked 🧑)
Tag: `poddar2026kernelopt`, [paper](https://arxiv.org/abs/2609.30059)

## contribution and scope

KernelOPT optimizes compiled PyTorch models by preserving cuBLAS/cuDNN dispatch, targeting generated Triton sub-kernels, and verifying the re-stitched model end to end. Its central safety rule is: “When candidates fail verification, the system preserves the compiler baseline.” (Abstract, PDF p. 1.) The system uses five agents, Nsight Compute (NCU) profiling, beam search, and a four-gate cascade. The abstract describes that cascade as “A four-gate verification cascade applies static validation, multi-seed correctness checking, model-level float64-fallback verification, and performance gating (γ=1.03) to filter candidates and verify the re-stitched model end-to-end.”

The benchmark contains 250 KernelBench problems: 100 Level 1, 100 Level 2, and 50 Level 3. On one NVIDIA H200, all-problem geometric-mean speedups over torch.compile are 1.40×, 1.15×, and 1.07× for L1/L2/L3; optimized-only values are 2.54×, 1.84×, and 1.37× over 36, 23, and 11 successful problems (Abstract and Table 1, pp. 1, 8). These denominators matter because 85/250 cases fall back and contribute 1.00× to all-problem means.

Inference: For VL, KernelOPT is a concrete accept-or-reject architecture for agent-written verified Rust or GPU-adjacent code: search may be heuristic, but release requires independent static, functional, model-level, and performance checks.

## technique 1: dispatch-aware decomposition

What it is. Treat a compiled model as Triton-generated kernels plus fixed external-library calls. Detect cuBLAS/cuDNN calls, preserve them, merge adjacent fusible Triton groups, and synthesize standalone Triton kernels only for optimizable groups (Sections 1 and 4.1, pp. 2–3).

How to apply it.
1. Trace with `torch.compile(max_autotune)`.
2. Detect extern kernels and mark them as not requiring Triton replacement.
3. Merge adjacent fusible Triton groups.
4. Generate a standalone kernel from each group’s aten graph.
5. Validate against eager PyTorch with `allclose(rtol=atol=10^-4)` on two seeds, retrying failures before search (Section 4.1, p. 3).

Evidence. Removing dispatch preservation drops L2 optimization success to 0% (Introduction, p. 2). In Table 1, 64/85 fallbacks (75%) are GEMM- or convolution-library dominant; the denominator is all 85 fallbacks (Section 6.3, p. 9).

Verus form. Inference: model the dispatch boundary as a Rust enum or trait whose verified implementation preserves calls to trusted library contracts. Prove each replacement kernel against the same abstract function contract; keep vendor behavior as an explicit external assumption. Verus cannot prove an unmodeled GPU library call.

## technique 2: profiling-guided beam search

The profiler extracts SOL throughput, duration, registers, occupancy, and top NCU rules. A deterministic analyst classifies near-optimal, memory-bound, compute-bound, or underutilized kernels at an 80% SOL threshold. A planner proposes transformations; an executor retries compilation; a summarizer stores structured experience (Section 4.2, PDF pp. 4–5).

Algorithm 1 starts with baseline beam B₀, allocates total plan budget N across active chains, generates candidates, profiles them, and applies `DiverseSelect`: one lowest-latency candidate per chain plus global best candidates (Algorithm 1, p. 4). With T=5, N=4, K=4, B=4, each problem receives 20 LLM-driven candidates (Section 5, p. 6). A meltdown detector forces diversity when recent plans collapse to at most two unique approaches (Section 4.2, p. 4).

The paper discloses a completeness limitation: “final selection tests only the single fastest candidate kfast against Gates 3–4, with no retry over lower-ranked candidates if it fails.” (Section 4.3, PDF p. 5.) Inference: a VL implementation should waterfall through ranked candidates to avoid discarding a correct slower candidate.

Verus form. Inference: represent each candidate as data with a proof-carrying contract result; prove the selector returns only candidates whose gate predicates hold. Search heuristics remain untrusted because Verus verifies the selected result, not the optimality of the search.

## technique 3: four-gate verification cascade

Gate 1 performs dry-run static validation for syntax and crashes. Gate 2 compares each candidate with eager PyTorch over three random seeds using `allclose(10^-3)` (Section 4.4, p. 5). Gate 3 verifies the re-stitched model with strict `10^-4` tolerances. If TF32 makes direct comparison fail, it computes baseline and optimized distances to a float64 reference and accepts error ratio `rho = d_opt/d_ref <= 10`; the denominator is `d_ref`, with a `d_ref >= 10^-8` condition (Section 4.4, p. 5). Gate 4 measures re-stitched wall time with warmup 25 ms and repetition 100 ms, accepting only `tau_M(candidate) <= 1.03 * tau_M(baseline)` (Section 4.4, p. 5).

The paper reports 167 Gate-3 rejections across 46 problems; every logged rejection had rho >= 1,569, 157 times the threshold, but accepted-side rho was not instrumented (Section 4.4, p. 5). Gate 4 catches dispatch and `.contiguous()` overhead that per-kernel timing misses. In 126 multi-kernel problems, 37 (29%) had an individually faster sub-kernel whose gain disappeared after re-stitching; 16 became end-to-end regressions (Section 6.4, p. 9).

Verus form. Inference: encode each gate as a pure predicate over a candidate record and require the release function to `ensures` that a returned candidate satisfies their conjunction. Runtime timing, random seeds, and float64 outputs are measured inputs; the proof establishes fail-closed selection under those inputs.

## technique 4: fallback and experience memory

If no candidate satisfies all gates, return the compiler baseline (Definition 2, p. 3). A bounded FIFO memory of capacity Q=8 stores experience when speedup is at least 1.05 or when inverse speedup is at least 1.20; strategies succeeding below 30% after at least three attempts are marked AVOID (Sections 4.5 and 5, pp. 5–6). These thresholds are planner context, not hard constraints.

Evaluation reports 70 optimized, 95 matched, and 85 fallback outcomes out of 250 (Table 1, p. 8). The matched category includes kernels within the 3% noise margin and cases with no attempted optimization. Inference: VL should preserve a known-good verified implementation whenever a generated candidate fails any required gate, and should record failed strategies without weakening proof obligations.

## what is proved, measured, and trusted

KernelOPT measures speed and correctness on NVIDIA H200 with Claude Sonnet 4.6, fixed search hyperparameters, and approximately 1,100 GPU-hours (Section 5, p. 6). It does not prove global optimality, cross-GPU portability, or correctness beyond sampled seeds and the stated model-level checks. The authors note single-GPU inference scope, elevated NCU permissions, and >100K-context model requirements (Conclusion, p. 9).

Inference: The trusted boundary includes PyTorch eager/float64 references, NCU and timing harnesses, compiler and vendor libraries, the H200 hardware, LLM-generated test inputs, and the Verus/Rust toolchain when adapted to VL. An agent can produce a candidate and test harness, but independent gate predicates and baseline fallback limit release risk. The 29% composition-gap result shows why component-level proofs or benchmarks do not establish whole-model behavior.

## what VL should not redo

Inference: VL should not repeat isolated-kernel acceptance without dispatch-aware re-stitching, multi-seed checking, and a performance gate. KernelOPT already supplies these patterns and quantifies their need. Open gaps include ranked fallback selection, accepted-side rho logging, vendor-library optimization, and cross-hardware benchmarks (Conclusion and Section 4.3, pp. 5, 9).

## techniques for the catalog

- dispatch-aware decomposition — preserve vendor-library calls and optimize only generated sub-kernel groups
- profiling-guided beam search — use NCU bottlenecks, chain-diverse selection, bounded retries, and experience memory
- static and multi-seed gates — reject syntax, crash, and sampled numerical failures before model-level testing
- float64 fallback ratio — compare baseline and candidate errors to a float64 reference with an explicit denominator and threshold
- end-to-end performance gate — accept only re-stitched model time within a 3% margin of baseline
- fail-closed baseline fallback — ship the compiler baseline whenever no candidate passes every gate
- composition-gap testing — re-stitch and test whole models because sub-kernel speedups can regress end-to-end execution
Checked 2026-10-15 against paper poddar2026kernelopt: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
