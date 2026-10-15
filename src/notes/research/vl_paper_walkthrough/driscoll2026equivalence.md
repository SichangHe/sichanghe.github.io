# Equivalence Checking of ML GPU Kernels
(authored by agents unless marked 🧑)
Tag: `driscoll2026equivalence`, [paper](https://doi.org/10.1145/3839470)

Inference: Volta checks whether a reference and optimized GPU kernel produce identical outputs for all valid inputs, while also detecting races and deadlocks. Its formal core is symbolic execution of structured cooperative thread arrays (CTAs), followed by a decision procedure for equality of symbolic expressions. The paper states, “The core of our equivalence checker is symbolic evaluation” (Sec. 1, p. 3).

## technique: restrict inputs to structured-CTAs

Inference: Before checking, require a statically known number of CTAs and threads, fixed tensor tile sizes, statically resolved branch targets, and statically resolved memory addresses for every thread. Compare corresponding CTAs independently; reject kernels that mix work between CTAs or branch on runtime data. The paper says, “To be checked for equivalence, a program must operate on a known number of CTAs and threads per CTA” (Sec. 3.2, p. 7).

Inference: Steps are (1) lower PTX and resolve names and labels, (2) instantiate fixed grid and tensor parameters, (3) check that each thread’s control flow and addresses are static, (4) reject unsupported kernels, and (5) check a reference CTA against its optimized counterpart. Structured-CTA assumptions fit fixed-shape ML workloads; the paper reports that 59.5% of 2,770 programs in one large analysis had control- and data-independent accesses, and 52 of 76 CUDA SDK programs exhibited access invariance (Sec. 3.2, p. 7). Top-k/argsort kernels with data-dependent swaps and atomic cross-CTA reductions fall outside the class.

Inference: In Verus, the corresponding precondition is a static shape and a contract over one tile, with separate proof lemmas for cross-tile independence. This is an inference: Verus does not model CUDA scheduling automatically.

## technique: symbolic execution with race/deadlock checking

Inference: Execute each thread program under a fixed round-robin schedule while carrying symbolic values instead of concrete tensor values. Record every shared-memory read/write and the set of threads that may access it. At a barrier, block the thread; release a barrier only when all expected threads reach it. If conflicting accesses are found, report a race; if all threads block and no barrier can release, report deadlock. The paper’s motivating execution says, “For each thread, all shared memory locations that are read or written are recorded” (Sec. 2, p. 5).

Inference: The paper’s formal language has small-step relations for scheduling, synchronization, register operations, and shared-memory reads/writes. Confluence (Lemma 1) means the chosen schedule represents every schedule when no race is reported. The proved guarantees are sound and complete deadlock detection (Theorems 3–4), data-race true positives (Theorem 2), and soundness/completeness of equivalence (Theorems 5–6). In Verus, a sequential Rust model can encode a schedule and ownership map, then prove race-freedom invariants; this is an inference and cannot itself certify GPU hardware behavior.

Inference: Volta’s implementation schedules threads round-robin until barrier or exit, checks releasable barriers, and raises an error for deadlock, race, dynamic branch/index, out-of-bounds access, or non-structured input (Sec. 5, p. 16). It tracks each expression in a bump allocator and eagerly folds constants. The simulator is linear in the maximum N statements per thread, while the decision procedure is superlinear (Sec. 5, p. 16).

## technique: symbolic output equivalence

Inference: Start every input tensor cell with a fresh symbol, execute both kernels symbolically, and obtain an expression for every output element. For each corresponding output, check whether the difference is identically zero. In the softmax example, the naive and online implementations produce different rational expressions that are mathematically equal; Volta proves their equality without requiring bitwise identity (Sec. 2, pp. 5–6).

Inference: The decision procedure canonicalizes rational functions. It represents polynomials as sorted terms and factors, supports exponentials, uninterpreted functions, and normalized `min`/`max`, hash-conses expressions, and tests equality by monomial quotient or cross-multiplication. For expressions that are sums of polynomial times exponentials, Theorem 7 and multivariate Corollary 8 prove decidability by reducing distinct exponent polynomials to coefficient equality; the multivariate reduction uses a random line substitution and Schwartz–Zippel. Nested exponentials are outside the proof of completeness.

Inference: Verus could express a mathematical kernel specification as a `spec fn` over abstract tensors and prove an optimized implementation’s postcondition equals the reference’s postcondition, but it lacks Volta’s PTX symbolic scheduler and canonicalizer. This is an inference.

## technique: soundness and completeness evidence

Inference: The formal proof establishes: if Volta accepts two symbolic outputs as equal and both executions are race/deadlock free, all real-input executions have equal outputs; if symbolic outputs differ, some real input witnesses inequivalence. The paper summarizes the implementation as a “black-box equivalence checker, requiring no information about how an optimized kernel was produced” (Sec. 1, p. 3).

Inference: The Agda proof of confluence is trusted alongside the PTX semantics, canonicalizer, and implementation. The checker models tensor elements as real numbers, so floating-point non-associativity is intentionally outside the semantic claim. The paper explicitly says, “Volta follows this convention as existing optimizers and models tensor elements as reals” (Sec. 3.2, p. 8). Hardware-specific behavior, unsupported PTX operations, asynchronous producer-consumer primitives, and changing CTA counts remain outside scope.

## measured applications and failure finding

Inference: On NVIDIA’s 128-thread reduction tutorial, Red-1 through Red-4 were checked against Red-1 and passed; Red-5 through Red-7 were rejected for races. Table 1’s denominator is seven kernels, each one CTA reducing 128 elements; race cases were stopped before VC generation, with detection times 0.0007–0.0011 seconds. On 64×64 SGEMM tiles with M=N=K=4096, all seven MatMul variants passed against MatMul-1; VC generation took 30.4–45.4 s and solving 89.4–94.0 s (Table 2, seven kernels, configurations stated in its caption).

Inference: For attention, the reference and three FlashAttention variants all passed. Each benchmark is one CTA computing one head with Q=(16,64), K=(512,64), V=(512,64); FA1, FA1-TC, and FA2-TC use 128 threads, and VC solving took 153.8–154.5 s (Table 3). Causal fused versus naive masking passed on four kernels, with 0.05–0.13 s solve times (Table 4). The LLM-generated Conv2D kernel after 13 optimization rounds passed against its reference; the workload is batch 100, 3×224×224 input, 96 11×11 filters, implicit GEMM M=96,N=302,500,K=363, and Volta took 32.0 s to generate VCs and 14.3 s to solve them (Table 5).

Inference: Volta also caught five real race-fix cases from OpenMM and Megatron-LM (Table 8), and its race results matched FaialAA on programs where FaialAA successfully detected races. In one LLM-generated kernel, Volta caught out-of-bounds shared-memory reads that ran without exceptions on Ampere, Hopper, and Blackwell and were not detected by Compute Sanitizer (Sec. 6.2, p. 21). This demonstrates a product-relevant failure mode: empirical tests can pass while a formal memory model rejects the code.

## relation to earlier notes

Inference: Earlier GPU-correctness notes already list Volta as restricted PTX equivalence checking and record its real-number model. This study adds the structured-CTA admission rules, small-step race/deadlock semantics, symbolic canonicalization and decidability proof, and the per-kernel runtime denominators needed to apply the method.

## what remains trusted and threat to VL

Inference: The strongest guarantee is conditional equivalence under structured-CTA, real-number, supported-operation, and static-control assumptions. The PTX-to-model translation and implementation correctness are trusted; the Agda confluence proof covers the formal semantics, not every Rust or CUDA parser bug. The paper reports no aggregate pass denominator beyond the per-table kernel counts, so runtimes should not be interpreted as a benchmark-wide success rate.

Inference: Threat to agent-written verified Rust is medium for tensor kernels and high for GPU-specific concurrency. Volta’s workflow suggests a VL companion checker: lower generated code to an explicit small-step model, detect races before proving functional properties, compare symbolic outputs against a reference, and reject unsupported dynamic behavior. Verus can prove the reference-level algebraic contract, but a separate GPU semantics is required for schedule and barrier guarantees.

## techniques for the catalog

- Inference: structured-CTA admission — reject dynamic shapes, branches, addresses, and cross-CTA responsibility before checking
- Inference: symbolic race/deadlock execution — schedule threads symbolically, track accesses, and use barriers to detect races and stuck states
- Inference: canonical symbolic equivalence — normalize output expressions and decide equality element by element
- Inference: Agda-backed guarantees — prove confluence, race true positives, and equivalence soundness/completeness under explicit assumptions
Checked 2026-10-15 against paper driscoll2026equivalence: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
