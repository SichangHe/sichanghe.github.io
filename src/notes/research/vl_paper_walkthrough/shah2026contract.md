# A Contract-Grade Verifier for LLM-Generated GPU Kernels, and a Native Blackwell Backward for the Gated-Linear-Recurrence Family
(authored by agents unless marked 🧑)
Tag: `shah2026contract`, [paper](https://arxiv.org/abs/2608.12700)
## purpose and central result

The paper replaces one loose random-input `allclose` test with twelve adversarial contracts for GPU kernels. Its abstract states: “We build the instrument that checks correctness properly: a contract-grade verifier of twelve adversarial gates, each a property a correct kernel must satisfy.” (abstract, PDF page 1). The verifier audits 2,638 machine-generated kernels already accepted by a public harness. It reports 1,043 of 2,638, or 39.5%, failing a tolerance-free gate, and 1,639 of 2,638, or 62.1%, carrying at least one violation (section 3.2, PDF pages 5–6). These denominators are the accepted-only corpus after the paper’s speedup, floating-input, and artifact filters.

## technique 1: twelve contract gates

Use this when a kernel’s correctness claim must cover values, shapes, precision, determinism, exceptional values, and hardware resources. The gates are listed in Table 1 (PDF page 4): CMP-01 checks ordinary and adversarial values; CMP-02 gradients; CMP-03 shapes; ORD-01 reduction-order error against a derived bound; ORD-02 byte-for-byte repeatability and aliasing; ORD-03 a bad-summation-order input; PRC-01 fp32/fp16/bf16 behavior; PRC-02 preservation of an fp32 accumulator when fed fp16; EXC-01 NaN and signed-infinity propagation; EXC-02 subnormal flush-to-zero behavior; RES-01 device placement; and RES-02 register, shared-memory, and TMEM limits.

The procedure is: define a slow high-precision reference; seed draws deterministically; run each applicable gate with its stated shape, precision, or exceptional input; compare by exact masks/bytes for tolerance-free properties and by derived floating-point bounds elsewhere; mark reference-unrunnable cases not-applicable; and record each gate’s verdict and reason. The paper emphasizes the contract rather than a single threshold: “Some gates need no tolerance at all and compare by exact mask or byte equality; the rest use tolerances derived from a floating-point error model.” (section 1, PDF page 2). It also says, “The verifier therefore asks twelve questions, each an adversarial contract graded against a slow reference (Table 1).” (section 3.1, PDF page 4).

Verus form (inference): represent the reference contract as `ensures` clauses on a Rust wrapper and make each gate a proof function over ghost inputs. Use `old` for pre-state values, `assert` for exact mask and byte facts, and loop `invariant` clauses for reductions and shape traversal. Device and TMEM checks require trusted specifications of the GPU API; Verus cannot infer hardware limits from ordinary Rust.

Evidence: the paper’s red team contains nineteen deliberately broken kernels and a test that the verifier rejects every broken kernel while clearing the correct reference (section 3.1, PDF page 4). The audit’s largest failure class is EXC-01: 868 of the 1,043 tolerance-free failures silently replace a NaN or infinity with an ordinary value (section 3.2, PDF page 6). The authors caution that EXC-01 intentionally probes behavior a kernel author may not support; the PyTorch replacement contract defines the expected propagation (section 3.2, PDF page 5).

## technique 2: derived tolerances and four defenses

Use this when approximate numerical comparisons are unavoidable but a fixed tolerance could hide errors. ORD-01 derives an absolute tolerance from reduction length and machine epsilon, approximately `4 sqrt(epsilon N) * scale` (section 3.1, PDF page 4). Calibration injects known perturbations into correct operators, locates the pass/fail boundary, and checks that the threshold lies between correct-kernel noise and wrong-kernel error. The paper reports clean separation for every band gate, with a thin 1.2× margin for deliberately relaxed ORD-03 (section 3.3, PDF page 7).

The authors defend the checker four ways: a 7/7 positive control, threshold calibration, 98.5% agreement with KernelBench’s own correctness code over 1,030 pairs, and a stratified hand audit of 31 disputed cases (section 3.3, PDF pages 7–8). The 98.5% denominator is the sampled pairs where both checks ran, not all 2,638 kernels. The hand audit labels 16 cases outright broken, 8 tolerance-dependent, and 7 out of scope (section 3.3, PDF page 8).

Verus form (inference): prove the floating-point error bound as a reusable lemma under explicit assumptions about operation order and rounding, then use it in a contract for the reduction. Exact exceptional-value behavior should be specified with ghost masks and sign predicates; do not weaken it to approximate equality. The calibration experiment remains external evidence, not a Verus proof.

## technique 3: differential audit and reproducibility slices

Use this when measuring whether a benchmark’s accepted outputs satisfy a stronger contract. Re-run the benchmark’s own check and the contract verifier over the same accepted rows, then form a 2x2 contingency table. Here KernelBench’s paper-era test accepts 2,472 of 2,638 (93.7%); 1,487 (56.4% of 2,638) pass KernelBench but fail the verifier, including 958 tolerance-free failures, while only 14 (0.5%) fail KernelBench but pass the verifier (section 3.4, PDF page 8). A hardened fp32 tolerance of 10^-4 still leaves 1,263 kernels passing KernelBench and failing this verifier (section 3.4, PDF page 8). The paper concludes: “The standard test certifies nearly 1,500 broken kernels as correct.” (section 3.4, PDF page 8).

The paper repeats the audit on a 300-kernel sample under torch 2.11, with 245 rows surviving the same filters, and obtains 68.6% violations; a second native CUDA corpus yields 43 of 213, or 20.2%, after excluding precision-dominated failures (section 3.5, PDF page 9). These are separate denominators and environments. They show robustness of the observed gap, not universal failure rates.

Verus form (inference): make each benchmark input, shape, and expected result an explicit test vector; prove the kernel wrapper against the same contract; and retain per-case verdicts as evidence. A passing proof still depends on the reference specification and trusted GPU implementation.

## technique 4: oracle-backed native backward

The paper also implements a native Blackwell `tcgen05` backward for the gated-linear-recurrence family. The general recurrence covers five model families; a double-precision oracle supplies the independent reference, and the same twelve-gate battery checks the native kernel (section 4.5, PDF page 11). Five family members train through one backward, and the abstract reports error of 3.3 × 10^-3 against the fp64 oracle plus bit-for-bit determinism (abstract, PDF page 1). This is a case study in positive controls: the verifier is tested on a kernel whose correctness is established independently.

Verus form (inference): specify the recurrence transition and backward equations as mathematical `spec fn`s, prove each scan and triangular-inverse step against the oracle equations, and wrap `unsafe` tensor-memory operations with contracts for allocation and release. Hardware lifecycle assumptions remain trusted unless separately modeled.

## what is proved, what remains trusted, and threat to VL

The verifier establishes that tested executions satisfy its twelve contracts. It does not prove all inputs, all shapes, compiler correctness, GPU hardware correctness, or that the PyTorch reference is the intended specification. Its audit also depends on fixed seeds, applicability rules, and artifact filters. Inference: for VeruLaw, the main product threat is high whenever agent-written Rust is accepted by narrow tests that omit exceptional values, aliasing, determinism, shape changes, or precision. The reusable lesson is a contract battery with exact checks, derived numerical bounds, independent positive controls, and per-row evidence. Existing VL work should not redo the general observation that `allclose` is weak; it should adapt the gate pattern to Rust memory safety, panic behavior, resource bounds, and external-library contracts.

## techniques for the catalog

- adversarial contract battery: test values, shapes, gradients, precision, ordering, determinism, exceptional values, device placement, and resource limits
- tolerance-free gates: compare masks or bytes exactly for non-finite propagation, repeatability, and aliasing
- derived numerical bounds: derive reduction tolerances from epsilon, length, and scale rather than a universal threshold
- positive-control validation: require broken-kernel rejection and independently correct-kernel acceptance before auditing a corpus
- differential benchmark audit: join the benchmark verdict with the stronger verifier in a 2x2 table and preserve denominators
- oracle-backed systems verification: establish an independent high-precision oracle and run the same contract battery on native code
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
