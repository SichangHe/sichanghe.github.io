# Verified Learning for Compiler Optimization: An LLM-Guided Architecture with Formal Control
(authored by agents unless marked 🧑)
Tag: `singh2026verified`, [paper](https://doi.org/10.48550/arxiv.2609.27214)

## what the paper does

The paper studies compiler rewrites proposed by a fine-tuned code LLM and accepted only after Alive2 proves LLVM semantic equivalence. Its case study is lazification: changing eager call-by-value evaluation into deferred call-by-need evaluation. The paper states, “Correctness is enforced externally as a runtime control layer rather than learned implicitly.” (Abstract, p.1) The LLM is therefore a proposal generator; the verifier is the acceptance authority. Inference: this separation is a useful product boundary for agent-written verified Rust because model confidence cannot substitute for a checker.

The target decision is conditional. For each LLVM function, the system must decide whether to transform or skip, and if it transforms, emit a lazified function that preserves behavior. The authors write, “At its core, the problem is a conditional transformation task: determining, for each function, whether applying lazification improves performance without violating semantic equivalence.” (Section 3.1, p.4) Profitability remains empirical: equivalence proves behavior preservation, not that the transformation is faster on a target workload.

## technique 1: verified-supervision dataset construction

what it is: use Wyvern, an existing heuristic lazification optimizer, as an oracle that creates input/output LLVM IR pairs. The training corpus includes both profitable and unprofitable Wyvern transformations, so the model learns when to skip as well as when to rewrite.

when to use: use this when a trusted optimizer can generate examples but its handcrafted decision rules do not generalize. It supplies domain-specific demonstrations without asking the LLM to invent compiler semantics from scratch.

how to do it:

1. compile C source files to unoptimized LLVM IR with Clang-14 (Section 3.2, p.4)
2. run Wyvern on each IR function to obtain its corresponding lazified IR (Section 3.2, p.4)
3. retain profitable and unprofitable cases rather than filtering to successes; the paper says this exposes cases where lazification degrades performance (Section 3.2, p.4)
4. fine-tune the decoder-only Meta Compiler LLM on the function-level IR pairs (Sections 3 and 4, pp.4,7)
5. hold out the LLVM test suite for evaluation; no evaluation function is used for model selection or hyperparameter tuning (Section 4, p.7)

The training corpus actually contains eight C libraries and 2,307 functions across 2.04M source LOC, with 615 functions lazified by Wyvern; the held-out LLVM test suite contains over 8,000 C functions and 1.94M LOC (Section 3.4, p.6). Table 1 gives examples: cJSON has 34,886 LOC, 208 functions, and 54 lazifiable functions; libevent has 117,416 LOC, 30 functions, and 3 lazifiable functions. The exact denominator for later benchmark percentages is the benchmark suite; the paper does not state its total count in the text around Table 2.

Verus form: Inference: the analogous Verus workflow would collect Rust functions with trusted baseline proofs or verified reference implementations, pair original and transformed code/specifications, and train a model to emit candidate Rust plus proof annotations. A Verus `spec fn`, `requires`, `ensures`, `assert`, and `proof fn` would describe the contract; the training oracle must not be treated as a proof. Wyvern's LLVM IR pairs do not carry over directly because Verus proves Rust contracts and relies on ownership and SMT-trigger behavior, not LLVM equivalence.

evidence and limits: The paper's evaluation uses LoRA fine-tuning with an 8K-token context, learning rate 1 × 10−5, batch size 2, three epochs, bfloat16, and no weight decay (Section 4, p.7). Inference: supervision inherits Wyvern's heuristic bias; it can teach imitation rather than discover profitable rewrites outside Wyvern's coverage. The paper explicitly limits generalization to C, LLVM IR, and Wyvern and notes supervision bias (Section 7, p.14).

## technique 2: Wyvern profitability oracle and lazification rewrite

what it is: use Wyvern's rule-based analysis to identify conditionally or infrequently used call-by-value parameters, then rewrite those parameters to call-by-need with thunks and memoization. Its verified input/output pairs supervise the LLM; they are examples rather than an assumption that Wyvern's profitability rule is universally optimal.

when to use: use this when a compiler has a deterministic transformation whose semantic preservation is already checked and whose profitability depends on control flow, data dependencies, and use frequency.

how to do it:

1. analyze each unoptimized LLVM function with Wyvern's rule-based profitability model (Section 3.5, p.7)
2. flag parameters accessed conditionally or infrequently as lazifiable (Section 3.5, p.7)
3. insert thunk and memoization logic at use sites to defer computation (Section 3.5, p.7)
4. retain the unoptimized/lazified pair for model supervision, including untransformed cases (Sections 3.4–3.5, pp.6–7)
5. independently check model-produced rewrites with Alive2 before applying them (Section 3.7, p.7)

The paper describes Wyvern as “the verified heuristic oracle used to construct our training corpus.” (Section 3.5, p.7) Verus form: Inference: an analogous Rust oracle would transform a function only under a proved contract-preservation lemma, with ghost state for deferred computations and memoization. Rust ownership and side effects make call-by-need equivalence substantially different from LLVM's modeled semantics; the paper supplies no Verus encoding.

## technique 3: verifier-gated candidate generation

what it is: at inference, feed new unoptimized LLVM IR to the model, then pass every candidate rewrite to Alive2. Apply a rewrite only when Alive2 proves semantic equivalence; otherwise return diagnostics and regenerate.

when to use: use this whenever an LLM emits transformations whose semantic validity must be independent of model behavior. It is the central safety mechanism, and it works even when the model was never trained on verifier feedback.

how to do it:

1. compile a new C program to LLVM IR (Section 3.2, p.4)
2. ask the fine-tuned model to emit a lazified candidate (Section 3.2, p.4)
3. invoke Alive2 to check semantic equivalence between original and candidate IR (Sections 3 and 3.7, pp.4–6)
4. accept and compile only a candidate proved equivalent; on verification or compilation failure, send diagnostic traces back to the model and regenerate (Section 3.2, p.4)
5. repeat until a valid candidate is found or the pipeline's operational limit is reached (the paper reports observed iterations in Section 5.3, p.11, but does not specify a universal retry cap)

The paper summarizes the mechanism as: “Transformations are applied only when the verifier proves preservation of program behavior; otherwise, diagnostic information is returned and regeneration is triggered.” (Section 1, p.2) It also states, “The LLM is trained solely on transformation pairs and does not receive verification feedback during fine-tuning; formal validation is introduced only at inference time.” (Section 1, p.2)

Verus form: Inference: generate a candidate Rust function and proof annotations, run Verus, and retain the candidate only when Verus discharges its `requires`/`ensures` obligations. Feed Verus diagnostics into a new generation attempt. `ensures` belongs on executable functions; specifications can be written with `spec fn`, and proofs with `proof fn`. Alive2's whole-IR equivalence relation has no direct Verus construct, so the Rust contract must state the intended functional relation explicitly. The checker remains the trusted gate; the LLM's translation and diagnosis remain search heuristics.

evidence: Across the held-out benchmarks, about 90% of points are above the LLM/Wyvern runtime equality line and about 10% below it (Section 5.1, p.8). Table 2 reports 9.8% of benchmarks with improved runtime and 10.8% with improved binary size, comparing Wyvern and the fine-tuned LLM; means are 0.1104 s versus 0.2178 s (+97.29%) and 0.01549 MB versus 0.01401 MB (−9.53%), respectively (Table 2, p.9). These percentages use the paper's benchmark suite denominator; the table does not print the total benchmark count.

## technique 4: bounded verifier-feedback repair

what it is: use failed Alive2 or compilation checks as structured feedback to iteratively regenerate IR. This turns verification into a controller that constrains an otherwise open-ended generator.

how to do it:

1. record the failed candidate and its semantic or syntax diagnostic (Section 3.2, p.4)
2. include the diagnostic in the next model prompt (Section 3.2, p.4)
3. rerun compilation and Alive2 on the regenerated candidate (Section 5.3, p.11)
4. stop when the candidate verifies; measure iteration count and validation latency (Section 5.3, p.11)

For the 19 programs that initially failed semantic or compilation checks, 89.5% had syntax errors, 10.5% had both syntax and semantic errors, and none failed solely because of semantics (Section 5.3, p.11). Corrections took 2–9 iterations, mean 5.32 and standard deviation 2.08; no case diverged or oscillated, no manual intervention was needed, and each verification step averaged 2.46 ms (Section 5.3, p.11). The denominator for these percentages is the 19 initially failing programs, and the paper's Figure 5 describes the same set.

Verus form: Inference: repeat Verus checking after inserting its diagnostics into the generation prompt. Rust compiler errors and Verus errors can both be feedback; final acceptance still requires a successful Verus run. The paper's 2.46 ms Alive2 latency and LLVM syntax failures are not measurements of Verus performance.

## what is proved, measured, and trusted

Alive2 proves the accepted LLVM rewrite's semantic equivalence under its modeled semantics. Runtime, binary size, and structural ratios are measurements, not proofs. The authors state, “Alive2 guarantees semantic equivalence but does not capture microarchitectural factors such as caching or branch prediction.” (Section 7, p.14) Inference: Clang, LLVM, Alive2's implementation and specification, and the model/runtime integration are trusted for the stated guarantee; the LLM, Wyvern profitability heuristic, and diagnostic translation are not proof authorities.

Fine-tuning versus the non-finetuned baseline is normalized in Table 3 (p.12): runtime 100.0% to 97.5% (−2.5%) and binary size 100.0% to 90.5% (−9.5%), over the full benchmark suite. The paper additionally says roughly 78% of benchmarks fall below the runtime equality line in Figure 6 (Section 5.4, p.12). Inference: the mean and per-benchmark claims use different summaries and should not be conflated. A product using this architecture faces threat from invalid generated code only at the checker boundary, but faces separate threats from specification mistakes, performance regressions, model denial-of-service through repeated retries, and unsupported hardware effects.

## techniques for the catalog

- verified-supervision pairs — train on trusted optimizer input/output pairs while retaining failures so the model learns when to skip
- Wyvern profitability oracle — derive lazification examples from conditional-use analysis, thunks, and memoization
- verifier-gated generation — accept an LLM transformation only after an independent equivalence or contract checker succeeds
- diagnostic regeneration — feed checker diagnostics into repeated candidate generation until a bounded, verified result is obtained
- conservative transformation policy — use verification outcomes and held-out measurements to detect under-transformation and performance regressions
