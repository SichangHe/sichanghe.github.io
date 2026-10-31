# Kernel Contracts: A Specification Language for ML Kernel Correctness Across Heterogeneous Silicon
(authored by agents unless marked 🧑)
Tag: `veit2026kernel`, [paper](https://arxiv.org/abs/2604.22032)

## scope and contribution

The paper addresses a claim-scope gap: kernels often state an operation and datatype but omit the precision, shape, ordering, tolerance, reference, and exceptional-value behavior that determine correctness. It proposes a readable eight-part contract language, twelve contract classes, three-state calibration, and reference-testing architecture. The central claim is stated directly: “If you take one thing from this paper: when two kernels disagree, the question is not whose implementation is correct. It is what contract either implementation claims to satisfy.” (Section 1.1, PDF p. 2.)

The paper reports motivating measurements from prior work, including 87,840 model variants executed across five platforms, model-level divergence of 5.1% on Huawei and 14.1% on Apple against NVIDIA, 1,700 approximately silent out-of-bounds cases on AMD, 9.15% accuracy variance across runtime configurations, and a 37.9% throughput cost for deterministic FlashAttention-3 backward passes. These are cited empirical inputs, not measurements performed by this paper (Sections 1 and 4, PDF pp. 1, 9).

## technique 1: eight-part kernel contract

What it is. A contract contains: (1) identifier, (2) scope, (3) precondition, (4) postcondition, (5) tolerance, (6) reference oracle, (7) measurement protocol, and (8) violation signature (Section 3.1, PDF p. 5). The grammar requires these fields in a fixed skeleton; Appendix A makes the skeleton extensible at identifier positions.

When to use it. Use it whenever an implementation is compared across hardware, compiler versions, schedules, precisions, shapes, or exceptional inputs. The paper says that the contract should resolve what an informal claim such as “this kernel supports FP8” actually promises (Sections 1.1 and 2.2, PDF pp. 2, 4).

How to apply it.
1. Assign a unique family/class identifier such as `C-PRC-01` (Section 3.1, p. 5).
2. Name the operation scope (matmul, reduction, fused attention, indexing, or collective).
3. State input precision, shape, value range, environment, stack, flags, and version in `pre`.
4. State the output relation to a named reference in `post`.
5. Choose absolute, relative, ULP, elementwise, or per-precision tolerance.
6. Name the reference oracle: higher precision, alternate stack, algebraic property, stable algorithm, or standard.
7. Give sample/sweep/injection/enumeration steps and a pass rule.
8. Write an empirical violation signature that distinguishes this failure from others (Section 3.1, pp. 5–6; Appendix A, pp. 24–25).

The worked FlashAttention-3 example uses separate numerical, shape, and determinism contracts. Its numerical test samples 1,024 random inputs per configuration, computes maximum elementwise relative error, and passes when the maximum is below the precision-specific bound. Its shape test sweeps D in `{63,64,65,127,128,129,255,256,257}`. Its determinism test invokes the same input 100 times and requires bitwise equality (Section 3.3, PDF pp. 6–7).

Verus form. Inference: represent the precondition as a `requires` clause, the postcondition as an `ensures` clause, and the reference relation as a `spec fn` over mathematical values. Keep tolerance as an explicit real-valued bound in the specification. A runtime Rust function can return the kernel result; a `proof fn` can establish algebraic lemmas about the reference relation. Measurement protocols and hardware observations remain executable tests and trusted environment inputs, because Verus proves the modeled function rather than silicon behavior.

Evidence. The paper gives the FlashAttention contract syntax and exact sample counts above (Section 3.3, pp. 6–7). It also requires calibration: “every evaluation environment include a reference-conforming implementation (‘good’), a contract-violating implementation that passes basic functional tests (‘bad’), and a baseline that fails visible tests.” (Section 3.4, PDF p. 7.)

Limits. Inference: a sampled contract cannot prove all inputs, and a tolerance can hide a real defect if the oracle or bound is wrong. The paper explicitly says three-state calibration “is not a proof” (Section 3.4, p. 7).

## technique 2: three-state calibration

What it is. Every contract test environment contains a baseline that visibly fails, a bad implementation that passes visible tests but violates the hidden contract, and a good implementation that satisfies both (Sections 3.4 and 5.1, PDF pp. 7, 13).

How to apply it. Construct the baseline first (for example, a zero-returning matmul). Construct a bad candidate with a plausible loophole (for C-PRC-01, silently downcast a large accumulator to FP16). Construct or select a good reference implementation. Run visible smoke tests and the contract measurement. The protocol is adequate only if it accepts good, rejects bad, and rejects baseline (Section 5.1, p. 13).

Verus form. Inference: encode the good implementation's mathematical behavior as the proved function and write a lemma or test harness whose counterexample model represents the bad behavior. The baseline/bad/good distinction is an evaluation design, not a Verus keyword. Keep any `external_body` assumptions restricted to genuinely external measurements; do not mark the function under verification as external.

Evidence and limits. The paper calls the bad candidate the “calibration anchor” and says that failure to distinguish bad from good means the contract or protocol is mis-specified (Sections 3.4 and 5.1, p. 7, 13).

## technique 3: twelve contract classes

The classes are grouped into four families (Section 4, PDF pp. 8–12).

* Precision: C-PRC-01 preserves a declared accumulator precision; C-PRC-02 requires stable algorithms for cancellation; C-PRC-03 declares denormal policy; C-PRC-04 checks mixed-precision scaling invariance.
* Ordering and determinism: C-ORD-01 bounds reduction-order error by `N * eps(P) * max|x|`; C-ORD-02 declares BITWISE, RUN_TO_RUN, or NONE for atomic operations; C-ORD-03 checks collective results across rank counts and overlap schedules.
* Compiler-induced: C-CMP-01 checks fused versus sequential numerical equivalence; C-CMP-02 checks autotune schedule invariance; C-CMP-03 checks shape-polymorphism over held-out shapes.
* Exceptional values: C-EXC-01 declares NaN/Inf propagation, masking, or raising; C-EXC-02 declares out-of-bounds RAISE, CLAMP, ZERO, or UNDEFINED behavior.

## technique 4: contract-derived tests and trace discipline

The paper recommends driving the cross-silicon matrix by violation class rather than enumerating every configuration. A hypothetical 100-kernel, five-stack, three-version, four-precision, five-shape, three-concurrency matrix has 90,000 cells; class-specific signatures reduce the informative surface (Section 5.2, PDF p. 13). Tolerance selection is hierarchical: use FP64 with `k·eps(P)` when available; otherwise use the highest same-stack precision and mark the result stack-dependent; for algebraic properties, state the floating-point epsilon explicitly (Section 5.3, p. 13).

Every verification call should emit a trace containing contract-triple version, implementation identifier, silicon profile, sampled input or hash, observed residual, applied tolerance, and verdict (Section 5.6, PDF p. 14). “Trace records are the substrate for three activities the framework depends on.” (Section 5.6, PDF p. 14.)

Verus form. Inference: model a trace record as a Rust struct with a ghost/spec view containing the contract identifier, input abstraction, residual, and verdict. Prove that a local checker returns `true` only when the measured residual satisfies the contract bound. Keep the trace serialization, device readings, and cryptographic signing outside the proof unless separately modeled and verified.

## technique 5: randomized Freivalds verification primitive

The paper implements a matmul checker based on Freivalds' randomized algorithm. It batches `k` iterations into three `n × k` matmuls; this avoids the 200–2,900% overhead of a naive matvec loop at small sizes and leaves 3–12% at production sizes (Section 5.7, PDF p. 15). For FP32 with `k=10`, Table 2 reports first sub-1% overhead at n=16,384 on Apple M5 (0.92%) and n=32,768 on AMD MI300X (0.59%) and NVIDIA H100 (0.48%). These denominators are matmul wall time, and settings are FP32, `k=10`; M5 n=32,768 was not measured because unified memory was exhausted (Table 2, PDF p. 16).

Detection has a dead zone below one times a norm-based threshold, a transition around one times, and 100% detection at 1.5 times or more. Table 4 uses FP32, `k=20`, and 40 trials per magnitude: at 1.0×, detection is 60% on M5 and 82% on both MI300X and H100; at 1.5×, it is 100% on all three (Section 5.7, PDF pp. 16–17). At `k=40`, the stated probabilistic bound is approximately `10^-12`; a 500-trial H100 spot-check at n=4096 reported zero false positives (Section 5.7, p. 17).

Verus form. Inference: prove the deterministic arithmetic relation for the modeled matrix and checker, but treat random vectors, floating-point residual bounds, GPU kernels, and the probabilistic failure bound as assumptions or separately verified lemmas. A Verus proof can establish that a returned “pass” implies the checker predicate under its declared arithmetic model; it cannot by itself establish the hardware's random samples or exact floating-point behavior.

## technique 6: three case-study mappings

Case study 1 maps Huawei silent precision coercion to C-PRC-01. The proposed test constructs 1,024 inputs near FP16 saturation, compares with FP64, and flags output near 65,504 when FP32 was declared (Section 6.1, PDF pp. 18–19). The paper distinguishes this synthesized accumulator scenario from Wen et al.'s observed `aten::to` and `max_pool1d` type coercions.

Case study 2 maps Sakana/robust-kbench reward hacking to C-CMP-03. The contract samples random held-out shapes outside benchmark subset B and rejects a kernel that passes B but fails C\\B (Section 6.2, PDF pp. 19–20). The cited aggregate speedup falls from 3.13× to 1.49× after excluding contaminated tasks; these are 200 KernelBench level-1 and level-2 tasks (Section 6.2, p. 19).

Case study 3 maps AMD silent out-of-bounds acceptance to C-EXC-02. The test injects in-range and out-of-range indices and compares behavior with RAISE, CLAMP, ZERO, or UNDEFINED. Approximately 1,700 cases matched none of these policies on AMD (Section 6.3, PDF pp. 20–21).

## what is proved, measured, and trusted

The paper measures the operational cost and sensitivity of its randomized checker and defines testable contract protocols. It does not prove all twelve classes, prove the reference implementations, prove full training-run correctness, or establish a certification body. It explicitly leaves full training correctness, distributed-training contracts, within-SKU variance, and compiler-internal contracts out of scope (Section 8.2, PDF p. 22).

The paper's agent contribution estimate is 50–60% for porting, shape enumeration, and tolerance boilerplate, while humans retain tolerance calibration, oracle validation, and edge-case discovery (Section 5.4, PDF p. 14). Inference: this indicates a substantial but bounded threat from agent-written verified Rust: agents can automate scaffolding and checks, but a bad contract or trusted oracle can still certify the wrong behavior.

## techniques for the catalog

- kernel contract skeleton — specify identifier, scope, precondition, postcondition, tolerance, oracle, measurement protocol, and violation signature
- three-state calibration — require baseline, bad-visible-pass, and good implementations so a protocol demonstrates that it can distinguish the hidden contract
- contract-class testing — select precision, ordering, compiler, and exceptional-value classes with class-specific violation signatures
- contract-driven test matrix — choose informative stack, shape, precision, and concurrency cells from the declared violation class
- trace discipline — record contract version, implementation, silicon, input/hash, residual, tolerance, and verdict for every verification call
- batched Freivalds checking — batch randomized matmul checks into three skinny matmuls and report overhead and detection denominators with their hardware settings
- held-out-shape adversarial testing — test the declared shape class outside benchmarked inputs to expose hardcoded or reward-hacked kernels
- explicit exceptional policies — declare and test NaN/Inf and out-of-bounds behavior as RAISE, CLAMP, ZERO, masking, propagation, or documented undefined behavior
