# AI as a Compiler: Compiling Triton kernels without the Triton compiler
(authored by agents unless marked 🧑)
Tag: `costa2026compiler`, [paper](https://doi.org/10.1145/2491956.2462176)

## compilation contract and search loop
Costa et al. replace Triton's conventional lowering backend with an LLM that emits PTX, while a controlled harness assembles, executes, profiles, and verifies each candidate. The fixed contract contains compile-time specialization values, launch configuration and ABI, and target GPU architecture (§3.1, p.4). A PTX candidate must expose the required entry point and satisfy numerical equivalence for every legal input, with a tolerance for floating-point differences. The paper states, “AI lowering must preserve this contract while replacing the conventional optimizing and lowering backend with model-generated PTX” (§3.1, p.4).

The operational method is TCE_NV (Triton Compiler Environment) plus TAIC (Triton AI Compiler):

1. freeze the Triton kernel, dimensions/strides/constexpr values, launch grid, ABI, and target architecture (§3.1)
2. provide the kernel and metadata to TCE_NV, which supplies a PTX template and launcher preserving the interface (§3.2, p.4)
3. ask TAIC's LLM for an initial PTX body (§3.3, p.5)
4. assemble and sanitize the PTX; run numerical differential tests stressing overflow, underflow, cancellation, and precision loss (§3.2)
5. benchmark latency and collect selected Nsight Compute metrics
6. have TAIC diagnose a bottleneck and plan local instruction edits or global changes to thread mapping, data movement, or synchronization
7. let independent subagents implement candidate patches; evaluate every patch under the same contract
8. retain only candidates that assemble, pass safety and correctness gates, and improve the measured objective; feed the best candidate and measurements into the next round (§3.3)
9. stop when the search budget is exhausted and return the best eligible PTX

The authors formalize the valid set as PTX programs satisfying target compilation, safety, ABI equality, and input-output equivalence; performance optimization is then latency minimization over that set (§3.1). TCE_NV autotunes the conventional reference before comparison to avoid a weak baseline. The paper summarizes the division: “TAIC therefore receives a high-level kernel representation and produces a semantically equivalent low-level one, as defined in the previous section” (§3.2, p.5).

## formal verification in the loop
Numerical tests are not the only gate. Volta, a symbolic PTX verifier, can prove equivalence to the Triton reference after abstracting floating-point operations as real arithmetic. If Volta is active during search, a candidate must pass both numerical checking and Volta equivalence; unsupported instructions are reported to TAIC for revision (§4.5, p.9). To handle modern GPUs, the authors extend Volta with mathematical immediates, additional instructions (`tanh`, `ldmatrix.trans`), asynchronous copies, asynchronous Tensor Core instructions (`tcgen05`, `wgmma`, `ldmatrix`), broader barriers, shuffle reductions, and packed formats. They explicitly caution, “We do not claim our extensions to be sound or complete” (Appendix B, p.14).

The extension models asynchronous operations as in-flight between initiation and a barrier and reports hazards when movement overlaps synchronous or asynchronous operations. For shuffle reductions, where all threads intentionally write the same value, the checker establishes equality of values while checking the race (Appendix B, p.14). This is a concrete technique for extending a verifier: model the new instruction's state and hazards, then add an equivalence check at the point where the architecture's synchronization semantics matter.

Three construct classes remain unsupported: atomics, input-dependent control flow, and bit-level value manipulation (§4.5, p.9). Volta's real-arithmetic abstraction cannot prove bit-pattern tricks for floating-point min/max; atomics require all possible interleavings; and input-dependent branches fall outside its structured-CTA execution model. These boundaries must be reported as unknown, not treated as verified.

## evidence and denominators
The main evaluation uses GPT-6 Astra on L40S (sm 89), H100 (sm 90a), and B200 (sm 100a), with PTX ISA 8.7. For four B200 workloads repeated five times under independent samples, the best validated speedups over the same autotuned Triton baseline are: convolution FP8 2.229× best (mean 2.004 ± 0.197), matrix multiplication FP16 1.032× (mean 1.023 ± 0.012), SwiGLU FP16 1.002× (mean 1.000 ± 0.001), and FlashAttention forward FP16 1.366× (mean 1.236 ± 0.106) (Table 1, p.8). The configured API budgets are $15 for the first, second, and fourth kernels and $1 for SwiGLU; an in-flight request may finish above the gate.

On ten recent open-source kernels, best numerically validated B200 speedups include BitDelta 3.34×, batched BitDelta 2.51×, FlashSinkhorn 1.55×, FlashAttention 1.37×, and SageAttention 1.41×, while Dion is 0.97× and Lion 1.00× (Fig. 5, p.8). These are best candidates under the stated $15 budget, not averages across runs.

With the extended Volta, every common-suite kernel except reduction sum and softmax, plus six of ten recent kernels, is provably verified (§4.5, p.9). Table 2 reports the performance cost on B200 FP16: ReLU 1.00× provably versus 1.00× numerically; GEMV 1.15× versus 1.15×; GEMM 0.24× versus 1.03×; FlashAttention 0.78× versus 1.37×; convolution 0.77× versus 1.35×. The lower verified numbers show that restricting the search to the original verifier's supported instruction set can sacrifice performance.

## Verus form and product implications
Inference: the same architecture maps to Verus as a contract-preserving synthesis loop. Encode the Rust function's input/output relation in `requires` and `ensures`, represent the abstract algorithm with `spec fn`s, and use `proof fn` lemmas and loop `invariant` declarations for safety and refinement. Generate candidate Rust bodies or optimization patches, run Verus, and accept only code that verifies and passes executable differential tests. The paper's PTX ABI and Volta semantics need a Rust-specific model; they cannot be pasted into Verus.

Inference: the paper's two-check gate is a direct design pattern for VL, but its trust boundary matters. Verus proofs depend on specifications, external-library contracts, solver correctness, erasure, and compiler behavior. Inference: A Verus equivalent of the unsupported-feature response is to reject code that uses an unmodeled unsafe primitive or place it behind an explicitly reviewed external specification; an `external_body` function is an assumption, not a proof of its implementation.

Inference: The threat to a product producing agent-written verified Rust is high for low-level optimizations: the paper shows that richer hardware instructions enlarge the trusted computing base and can reduce provable performance. The paper reports Volta's TCB growth from 42 kLoC to 60 kLoC after extensions (§4.5, p.9), and says every newly modeled instruction adds unsoundness risk. Inference: VL should reuse the contract, candidate-gating, and unsupported-feature feedback loop; it should not claim that numerical testing or an extended checker proves all Rust behavior.

## what is trusted and what remains open
The reported results prove or measure candidate PTX under fixed kernels, inputs, architectures, and budgets. They do not prove unrestricted GPU programs, finite-precision bit-level equivalence, atomics, or input-dependent control flow. Appendix B's extensions are described but their formalization is future work. The conventional Triton compiler and autotuned reference, PTX assembler and CUDA driver, GPU hardware, Volta implementation, and benchmark protocol remain trusted components. AI lowering is also expensive: elementwise candidates generally cost below $1.50, while convolution and GEMM cost roughly $5–$12 (§4.2, p.7); compilation cost is expected to amortize only when kernels execute repeatedly.

## techniques for the catalog
- fixed compilation contract — hold specialization, ABI, launch, and target architecture constant while searching implementations
- verifier-backed candidate loop — assemble, test, profile, verify, and retain only safe correct faster candidates
- symbolic ISA extension — add instruction semantics, asynchronous hazards, barriers, and equivalence checks to extend a verifier
- unsupported-feature feedback — report unmodeled constructs to the generator and revise, rather than silently accepting them
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
