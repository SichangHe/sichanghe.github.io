# AI as a Compiler: Compiling Triton kernels without the Triton compiler
(authored by agents unless marked 🧑)
Tag: `costa2026compiler`, [paper](https://arxiv.org/abs/2609.36800v1)

## compilation contract and search loop
Costa et al. replace Triton's conventional lowering backend with an LLM that emits PTX, while a controlled harness assembles, executes, profiles, and numerically checks candidates, with optional symbolic verification. The fixed contract contains compile-time specialization values, launch configuration and ABI, and target GPU architecture (§3.1, p.4). A PTX candidate must expose the required entry point and satisfy numerical equivalence for every legal input, with a tolerance for floating-point differences. The paper states, “AI lowering must preserve this contract while replacing the conventional optimizing and lowering backend with model-generated PTX.” (§3.1, p.4).

The operational method is TCEnv (Triton Compiler Environment) plus TAIC (Triton AI Compiler):

1. freeze the Triton kernel, dimensions/strides/constexpr values, launch grid, threads per block, ABI, and target architecture (§3.1)
2. use TCEnv to expose the specialized kernel, metadata, and interface-preserving PTX template to TAIC; TCEnv supplies execution infrastructure (§3.2, pp.4–5)
3. ask TAIC's LLM for an initial PTX body (§3.3, p.5)
4. assemble and sanitize the PTX; run numerical differential tests stressing overflow, underflow, cancellation, and precision loss (§§3.2–3.3, pp.5–6)
5. benchmark latency and collect selected Nsight Compute metrics
6. have TAIC diagnose a bottleneck and plan local instruction edits or global changes to thread mapping, data movement, or synchronization
7. let independent subagents implement candidate patches; evaluate every patch under the same contract
8. retain only candidates that assemble, pass safety and correctness prerequisite checks, and improve the measured objective; feed the best candidate and measurements into the next round (§3.3)
9. stop when the search budget is exhausted and return the best eligible PTX

The authors formalize the valid set as PTX programs satisfying target compilation, safety, ABI equality, and input-output equivalence; performance optimization is then latency minimization over that set (§3.1). TCEnv autotunes the conventional reference before comparison to avoid a weak baseline. The paper summarizes the division: “TAIC therefore receives a high-level kernel representation and produces a semantically equivalent low-level one, as defined in the previous section; Figure 2 illustrates this path alongside the standard compilation passes.” (§3.2, p.5).

## formal verification in the loop
Symbolic verification is optional. Volta, a symbolic PTX verifier, can prove equivalence to the Triton reference after abstracting floating-point operations as real arithmetic. If Volta is active during search, a candidate must pass both numerical checking and Volta equivalence; unsupported instructions are reported to TAIC for revision (§4.5, p.9). To handle modern GPUs, the authors extend Volta with mathematical immediates, additional instructions (`tanh`, `ldmatrix.trans`), asynchronous copies, asynchronous Tensor Core instructions and operand movement (`tcgen05`, `wgmma`, `ldmatrix`), broader barriers, shuffle reductions, and packed formats. They explicitly caution, “We do not claim our extensions to be sound or complete.” (Appendix B, p.14).

The extension models asynchronous operations as in-flight between initiation and an appropriate barrier and reports hazards when movement overlaps synchronous or asynchronous operations. For shuffle-reduction patterns in which threads concurrently write the same value to the same address, the checker establishes equality of values while checking the race (Appendix B, p.14). Inference: extending a verifier requires modeling new instruction effects and hazards; for concurrent same-value writes, an equality check can distinguish the harmless pattern described here.

Three construct classes remain unsupported: atomics, input-dependent control flow, and bit-level value manipulation (§4.5, p.9). Volta's real-arithmetic abstraction cannot prove bit-pattern tricks for floating-point min/max; atomics require all possible interleavings; and input-dependent branches fall outside its structured-CTA execution model. Inference: unsupported constructs must not be presented as verified.

## evidence and denominators
The main evaluation uses GPT-6 Astra on L40S (sm 89), H100 (sm 90a), and B200 (sm 100a), with PTX ISA 8.7. For four B200 workloads repeated five times under independent samples, the best validated speedups over the same autotuned Triton baseline are: convolution FP8 2.229× best (mean ± SD 2.004 ± 0.197), matrix multiplication FP16 1.032× (mean 1.023 ± 0.012), SwiGLU FP16 1.002× (mean 1.000 ± 0.001), and FlashAttention forward FP16 1.366× (mean 1.236 ± 0.106) (Table 1, p.8). The configured API budgets are $15 for the first, second, and fourth kernels and $1 for SwiGLU; an in-flight request may finish above the configured budget.

On ten recent open-source kernels, best numerically validated B200 speedups include BitDelta 3.34×, batched BitDelta 2.51×, FlashSinkhorn 1.55×, FlashAttention 1.37×, and SageAttention 1.41×, while Dion is 0.97× and Lion 1.00× (§4.4, p.8; Fig. 5, p.9). These are best candidates under the stated $15 budget, not averages across runs.

The authors report that extended Volta can verify the unrestricted TAIC output for every common-suite kernel except reduction sum and softmax, plus six of ten recent kernels: FlashAttention, Forgetting Attention, SageAttention, Lion, and both Mamba-2 primitives (§4.5, p.9). These checks rely on extensions whose soundness is not established. Separately, Table 2 compares searches using original Volta with numerical validation on B200 FP16: ReLU 1.00× provably versus 1.00× numerically; GEMV 1.15× versus 1.15×; GEMM 0.24× versus 1.03×; FlashAttention 0.78× versus 1.37×; convolution 0.77× versus 1.35×. The lower numbers in the original-Volta column show that restricting the search to its supported instruction set can sacrifice performance.

## Verus form and product implications
Inference: the same architecture maps to Verus as a contract-preserving synthesis loop. Encode the Rust function's input/output relation in `requires` and `ensures`, represent the abstract algorithm with `spec fn`s, and use `proof fn` lemmas and loop `invariant` declarations for safety and refinement. Generate candidate Rust bodies or optimization patches, run Verus, and accept only code that verifies and passes executable differential tests. The paper's PTX ABI and Volta semantics need a Rust-specific model; they cannot be pasted into Verus.

## what is trusted and what remains open
The performance results measure candidate PTX under fixed specializations, architectures, and search budgets; numerical tests cover sampled inputs. Volta checks equality under a real-arithmetic abstraction. Its supported fragment excludes atomics, input-dependent control flow, and bit-level value manipulation. Appendix B's extensions are described but their formalization is future work. Inference: the reported checks and measurements depend on the reference, PTX assembler and CUDA driver, hardware, verifier implementation, and benchmark protocol. AI lowering is also expensive: elementwise candidates generally cost below $1.50, while convolution and GEMM cost roughly $5–$12 (§4.2, p.8). The conclusion states, “Although generation can be orders of magnitude more expensive than millisecond-scale Triton compilation, this cost is incurred once and can be amortized over repeated kernel execution.” (§5, p.10).

## techniques for the catalog
- fixed compilation contract — hold specialization, ABI, launch, and target architecture constant while searching implementations
- verifier-backed candidate loop — assemble, sanitize, test, benchmark, profile, optionally verify symbolically, and retain candidates passing checks that improve the objective
- symbolic ISA extension — add instruction semantics, asynchronous hazards, barriers, and equivalence checks to extend a verifier
- unsupported-feature feedback — report unmodeled constructs to the generator and revise, rather than silently accepting them
