# Equivalence Checking of ML GPU Kernels
(authored by agents unless marked 🧑)
Tag: `driscoll2026equivalence`, [paper](https://doi.org/10.1145/3839470)

Inference: Volta checks whether a reference and optimized GPU kernel produce identical outputs for all valid inputs, while also detecting races and deadlocks. Its formal core is symbolic execution of structured cooperative thread arrays (CTAs), followed by a decision procedure for equality of symbolic expressions. The paper states, “The core of our equivalence checker is symbolic evaluation” (Sec. 1, p. 3).

## technique: restrict inputs to structured-CTAs

Volta requires a statically known number of CTAs and threads, fixed tensor tile sizes, statically resolved branch targets, and statically resolved memory addresses for every thread. It compares corresponding CTAs independently and does not support optimizations that mix responsibilities between CTAs. Pure arithmetic operators can hide data-dependent control flow, such as a branch implementing `max` (Sec. 4.1, p. 9). The paper says, “To be checked for equivalence, a program must operate on a known number of CTAs and threads per CTA” (Sec. 3.2, p. 7).

The implementation (1) accepts PTX plus grid dimensions, input tensor locations and sizes, and designated output tensors; (2) lowers PTX, resolving names and labels; (3) symbolically executes each kernel, resolving branches and memory accesses as they occur or returning an error; and (4) compares corresponding symbolic outputs. It assumes CTAs behave uniformly and checks only CTA 0 against CTA 0 (Sec. 5, p. 16). Structured-CTA assumptions fit fixed-shape ML workloads; the paper reports that 59.5% of 2,770 programs in one large analysis had control- and data-independent accesses, and 52 of 76 CUDA SDK programs exhibited access invariance (Sec. 3.2, p. 7). Top-k/argsort kernels with data-dependent swaps and atomic cross-CTA reductions fall outside the class.

Inference: A corresponding proof contract for a tensor tile would need fixed shapes and a separate argument that tiles do not interfere.

## technique: symbolic execution with race/deadlock checking

Inference: Execute each thread program under a fixed round-robin schedule while carrying symbolic values instead of concrete tensor values. For each memory address, track readers and the last writer, together with the threads that have not synchronized with each accessor. At a barrier, block the thread; release the barrier when every thread in its synchronization set is at a matching barrier or has returned (Secs. 4.1–4.2, pp. 9–10). The implementation tracks shared and global memory cells (Sec. 5, p. 16). If conflicting accesses are found, report a race; if all threads block and no barrier can release, report deadlock. The paper’s motivating execution says, “For each thread, all shared memory locations that are read or written are recorded” (Sec. 2, p. 5).

Inference: The paper’s formal language has small-step relations for scheduling, synchronization, register operations, and shared-memory reads/writes. Confluence (Lemma 1, p. 11), verified in Agda, ensures checked schedules agree on a terminating result or error, or all deadlock. The proved guarantees include data-race detection (Theorem 1), data-race true positives (Theorem 2), sound and complete deadlock detection (Theorems 3–4), and soundness/completeness of equivalence (Theorems 5–6), under the formal model’s assumptions (pp. 12–14). If unchecked executions both race and deadlock, the checked semantics may detect either error; fixing the initial memory-event context fixes which error is detected (p. 13).

Inference: Volta’s implementation schedules threads round-robin until barrier or exit, checks releasable barriers, and raises an error for deadlock, race, dynamic branch/index, out-of-bounds access, or non-structured input (Sec. 5, p. 16). It tracks each expression in a bump allocator and eagerly folds constants. The simulator is linear in the maximum N statements per thread, while the decision procedure is superlinear (Sec. 5, p. 16).

## technique: symbolic output equivalence

Inference: Start every input tensor cell with a fresh symbol, execute both kernels symbolically, and obtain an expression for every output element. For each corresponding output, check whether the difference is identically zero. In the softmax example, the naive and online implementations produce different rational expressions that are mathematically equal; Volta proves their equality without requiring bitwise identity (Sec. 2, pp. 5–6).

Inference: The decision procedure canonicalizes rational functions. It represents polynomials as sorted terms and factors, supports exponentials, uninterpreted functions, and normalized `min`/`max`, hash-conses expressions, and tests equality by monomial quotient or cross-multiplication. For sums of polynomials multiplied by exponentials of polynomials, Theorem 7 and multivariate Corollary 8 establish that, after absorbing exponent constants into coefficients, distinct exponent polynomials are linearly independent over polynomial coefficients. Identity checking therefore reduces to coefficient equality; the multivariate proof uses a random line substitution and Schwartz–Zippel (Sec. 4.4, pp. 14–15). Nested exponentials and ratios in exponents are outside this completeness proof. The formal decision procedure covers addition, multiplication, and exponentiation; the implementation also normalizes restricted `min`/`max` patterns without case splits (Sec. 4.4, p. 14; Sec. 5, pp. 16–17).

Inference: Applying this method to verified Rust would require a mathematical tensor specification and a proof that the optimized implementation computes the same outputs; GPU concurrency additionally requires an explicit execution model.

## technique: soundness and completeness evidence

Inference: The formal proof establishes: if Volta accepts two symbolic outputs as equal and both executions are race/deadlock free, all real-input executions have equal outputs; if symbolic outputs differ, some real input witnesses inequivalence. The paper summarizes the implementation as a “black-box equivalence checker, requiring no information about how an optimized kernel was produced” (Sec. 1, p. 3).

Inference: Applying the formal guarantees to actual PTX requires trusting that the implementation faithfully implements the paper’s semantics and equality procedure. The checker models tensor elements as real numbers, so floating-point non-associativity is intentionally outside the semantic claim. The paper explicitly says, “Volta follows the same convention as existing optimizers and models tensor elements as reals” (Sec. 3.2, p. 8). Hardware-specific behavior, unsupported PTX operations, asynchronous producer-consumer primitives, and changing CTA counts remain outside scope.

## measured applications and failure finding

Inference: On NVIDIA’s 128-thread reduction tutorial, Red-1 through Red-4 were checked against Red-1 and passed; Red-5 through Red-7 were rejected for races. Table 1 contains seven kernels, each using one CTA of 128 threads; its caption specifies a 128-element reduction for Red-1 through Red-4; race cases were stopped before VC generation, with detection times 0.0007–0.0011 seconds. On 64×64 SGEMM tiles with M=N=K=4096, all seven MatMul variants passed against MatMul-1; VC generation took 30.4–45.4 s and solving 89.4–94.0 s (Table 2, seven kernels, configurations stated in its caption).

Inference: For attention, the reference and three FlashAttention variants all passed. Each benchmark is one CTA computing one head with Q=(16,64), K=(512,64), V=(512,64); FA1, FA1-TC, and FA2-TC use 128 threads, and VC solving took 153.8–154.5 s (Table 3). Causal fused versus naive masking passed on four kernels, with 0.05–0.13 s solve times (Table 4). The LLM-generated Conv2D kernel after 13 optimization rounds passed against its reference; the workload is batch 100, 3×224×224 input, 96 filters of size 11×11, stride 4, padding 2, implicit GEMM M=96,N=302,500,K=363, and Volta took 32.0 s to generate VCs and 14.3 s to solve them (Table 5).

Inference: Volta also caught five real race-fix cases from OpenMM and Megatron-LM (Table 8), and its race results matched FaialAA on programs where FaialAA successfully detected races. During convolution verification, the authors found that out-of-bounds shared-memory reads may evade Compute Sanitizer. Their illustrative 64-thread code reads a 48-element array before checking the thread index; it returned zeros without exceptions on tested Ampere, Hopper, and Blackwell GPUs, while Volta raised exceptions (Sec. 6.2, pp. 20–21). Inference: empirical tests can pass despite invalid memory accesses.

## what remains trusted and threat to VL

Inference: The strongest guarantee is conditional equivalence under structured-CTA, real-number, supported-operation, and static-control assumptions. The PTX-to-model translation and implementation correctness are trusted; the Agda confluence proof covers the formal semantics, not every Rust or CUDA parser bug. The paper reports no aggregate pass denominator beyond the per-table kernel counts, so runtimes should not be interpreted as a benchmark-wide success rate.

Inference: Volta’s workflow suggests a companion checker for generated tensor code: model execution explicitly, detect races while constructing symbolic outputs, compare those outputs against a reference, and reject unsupported dynamic behavior. A proof about reference-level algebra alone would not establish GPU schedule and barrier guarantees.

## techniques for the catalog

- Inference: structured-CTA prerequisite check — require static shapes, branch targets, and addresses; compare corresponding CTAs
- Inference: symbolic race/deadlock execution — schedule threads symbolically, track accesses, and use barriers to detect races and stuck states
- Inference: canonical symbolic equivalence — normalize output expressions and decide equality element by element
- Inference: formal guarantees — verify confluence in Agda; prove race true positives and equivalence soundness/completeness under explicit assumptions
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Threads are scheduled in a round-robin fashion, with each selected thread being run until it blocks at a barrier or exits."): checked the full paper, quotations, numerical results, section/page references, technique steps, and scope; corrected the real-number quotation, execution-time prerequisite checks, barrier return handling, memory-event tracking, completeness limits, reduction workload scope, and Agda coverage; removed unsupported earlier-note comparisons, Verus capability claims, and threat ratings; did not check implementation code, proof artifacts, external sources, or reproduce experiments.
