# FormalRTL: Verified RTL Synthesis at Scale
(authored by agents unless marked 🧑)
Tag: `li2026formalrtl`, [paper](https://arxiv.org/abs/2603.08738)

## What is verified

FormalRTL is a multi-agent workflow for generating register-transfer-level (RTL) hardware from a C/C++ software reference model plus a design specification. The reference model is treated as an executable golden specification. The pipeline uses Clang static analysis to partition the C model, an initializing agent to generate RTL and a C-to-RTL verification harness, and a debugging agent that repairs code from formal-equivalence feedback. The formal check is hw-cbmc, which compares the C and RTL models under identical inputs. “By tightly coupling planning, synthesis, and formal equivalence checking, FormalRTL achieves scalable and reliable hardware code generation that addresses the critical challenges faced by LLM-based synthesis in industrial contexts.” (abstract, p. 1)

The paper evaluates 16-bit IEEE-754 floating-point operators derived from Berkeley SoftFloat and manually modeled 8-bit Hifloat8 addition and multiplication. A test run is one generation/debugging attempt; the paper uses 20 runs when defining initial success rate (ISR), sets a debugging limit of 20 iterations, and counts a failed run as 40 adjusted iterations. Table 1 reports 22 module cases, including modules with dependent RTL lengths above 1,000 lines. Final success rate (FSR) is the percentage of runs that pass equivalence within the limit. The authors report 100% FSR for most leaf modules and 95%, 85%, or 70–80% for several larger or sequential modules (Table 1, §4.3). These are run-level rates; they are not a proof that arbitrary industrial RTL will verify.

## technique 1: static-analysis planning and bottom-up decomposition

When to use it: use this method when a reference implementation has a function dependency graph and a monolithic RTL prompt would exceed the model or checker budget. FormalRTL is explicitly aimed at datapath-heavy modules and defers complex control logic (§3.4).

Steps in the paper:

1. Run Clang on the C reference and obtain the abstract syntax tree (AST) and function dependencies (§3.1).
2. Partition the top-level function into subfunctions, bundling each function with required macros, enum types, constants, and other dependencies (§3.1).
3. Refactor the overall design specification into one targeted specification per C subfunction (§3.1).
4. Process submodules in topological dependency order. For each submodule, provide its C reference, targeted specification, and previously verified dependent RTL modules (§3.1, Fig. 2).
5. Verify each generated submodule before using it as context for a dependent module; then build and verify the top module (§3.1).

The paper gives the reason for the decomposition: “This partitioning strategy offers three key benefits. First, by explicitly leveraging the functional hierarchy of the C reference model, our planning is more reliable than planning based on the specification alone.” (§3.1, p. 3) It also says that limiting EC to each submodule keeps checking manageable and reduces debugging burden for top modules. In the planning ablation, the specification-only baseline treats the C model as unstructured text and does not use its static-analysis structure (§4.4). On the largest listed design, f16_add (1,130 RTL lines including dependencies), the baseline has 0% success while the reference-code planning pipeline maintains 95% FSR in the plotted comparison (Fig. 4, §4.4; four designs, one fixed iteration budget per design).

Verus form (Inference): model each Rust component as a verified module with `requires` and `ensures`, and expose only verified dependent functions to later modules. A dependency DAG can determine verification order, but Verus does not parse C ASTs or perform hardware C-to-RTL equivalence. The proof analogue is bottom-up functional refinement: prove a leaf function's contract, then use that contract as an assumption when proving its caller. The assumption is sound only if the dependent function's implementation and contract are both in the verified build.

## technique 2: reference-anchored initialization and temporal harnesses

When to use it: use a software reference plus an explicit timing specification when generated hardware may be sequential or pipelined. The initializing agent produces both RTL and the harness, so the harness is generated together with the implementation rather than added as an afterthought (§3.2).

Steps in the paper:

1. Give the initializing agent a submodule's C reference and targeted specification (§3.2).
2. Generate an RTL file and a verification harness that assumes identical inputs and asserts output equivalence between C and RTL (§3.2).
3. Inspect the specification for sequential logic. If present, determine the exact number of clock cycles until the hardware produces its final result (§3.2).
4. Encode that timeframe in the harness to activate transactional equivalence checking and to constrain pipeline depth (§3.2).
5. Run hw-cbmc on the harness before the module is admitted as a verified dependency (§3.2–§3.3).

“The harness establishes the verification environment for the RTL and C codes by assuming identical inputs and asserting output equivalence.” (§3.2, p. 4) The sequential Hifloat8 cases show why the timing step matters: Table 1 labels separate sequential runs, with FSR 70% for `hifloat8_add (sequential)` and 80% for `hifloat8_mul (sequential)`, over the same 20-run experiment denominator used for ISR. The paper says sequential logic is harder because the agent must identify sequential requirements and use transactional EC (§4.3).

Verus form (Inference): encode the C/reference behavior as a Rust specification function or a model value, then state a postcondition relating the executable function's output to that model. For stateful code, represent clock steps as explicit state transitions and use a loop invariant over the cycle counter and pipeline state. Verus has no hardware clock or transactional EC primitive, so the timing relation must be made explicit in Rust state and proved with `invariant` clauses inside loops and `ensures` on transition functions.

## technique 3: counterexample-guided debugging with focused feedback

When to use it: use this loop after a syntax or equivalence failure when a raw pass/fail bit would leave an LLM unable to locate the defect. FormalRTL's debugging agent uses two preprocessors before asking the model for a patch (§3.3).

Steps in the paper:

1. If the EC tool reports a syntax error, run a bug locator to identify the file and line, then extract surrounding code lines (§3.3).
2. If EC reports inequivalence, run a counterexample simplifier that keeps the problematic function and mismatching signals (§3.3).
3. Give the focused error context to the LLM and ask it to generate a location and patch (§3.3, Fig. 3).
4. Apply the patch to the original file and rerun the same harness (§3.3).
5. Stop on equivalence or after 20 iterations; count a failed run as (2I_{limit}=40) adjusted iterations when computing (I_{avg}) (§4.2).

The paper states, “Counterexample-guided debugging is significantly more efficient than binary ‘pass/fail’ feedback.” (§3.3, p. 4) Figure 3 shows a syntax locator around line 56 and a simplified Hifloat8 counterexample with mismatched `z_c` and status values. In the `normalize` ablation (Table 2, §4.5), the complete agent averages 6.40 iterations and reaches 95% FSR. Removing the bug locator gives 14.15 iterations and 80% FSR; removing the counterexample simplifier gives 9.55 and 90%; removing counterexample-guided debugging gives 21.30 and 55%. The denominator is the same set of `normalize` runs, and FSR means runs fixed within 20 iterations.

Verus form (Inference): use verifier diagnostics as a repair loop. A failed Verus verification condition can be reduced to the function, postcondition, or invariant that failed, then supplied to a code-repair model. Unlike hw-cbmc's concrete input counterexample, Verus often exposes a symbolic assertion obligation; the repair loop should preserve the original contract and rerun the verifier after each patch. Never let the repair agent weaken or delete `requires`, `ensures`, or loop invariants merely to make the check pass.

## technique 4: formal-equivalence metrics and fair planning comparisons

FormalRTL reports separate metrics that expose where a pipeline fails. ISR is first-attempt EC success, (N_{pass}/N_{total}\times100\%), with (N_{total}=20) in the experiments (§4.2). FSR is success within the 20-iteration limit. (I_{avg}) sums adjusted iteration counts, assigning 40 to a failed run, and (I_{total}) sums (I_{avg}) for a top module and all dependencies (§4.2–§4.3). For the planning ablation, each baseline monolithic task receives an iteration limit close to the summed (I_{total}) of the decomposed pipeline, with limits 5, 25, 25, and 30 for the four designs (§4.4). This avoids giving the baseline an unbounded repair budget.

The paper also compares quality of result (QoR) after Yosys synthesis with Nangate45 and OpenROAD placement/routing. For `hifloat8_mul`, FormalRTL has area 1015 μm² and delay 3.29 ns, versus engineer designs at 743 μm² and 1.78 ns; for `f16_mul`, FormalRTL has 1629 μm² and 3.54 ns, versus 1343 μm² and 2.50 ns (Table 3, §4.6). Thus formal equivalence establishes functional agreement with the C model, not PPA optimality. “The LLM-generated RTL typically trails manual designs” (§4.6, p. 7)

Verus form (Inference): report first-pass verification, repaired-pass verification, proof/verification time, and failed-run penalties separately. For a Rust product, add independent tests for performance or resource bounds because a functional `ensures` clause does not imply latency, memory, or throughput goals. Preserve the denominator and timeout in every report; a 95% rate over 20 runs is not evidence of all-input correctness unless the verifier itself proves the property universally.

## techniques for the catalog

- static-analysis decomposition: use an AST dependency graph to partition a large implementation and verify leaves before parents
- reference-anchored harness generation: generate implementation and an equivalence harness from the same software reference
- temporal equivalence checking: encode clock latency explicitly when verifying sequential or pipelined behavior
- counterexample-guided repair: localize syntax errors and simplify mismatching signals before asking an LLM for a patch
- denominator-aware metrics: report first-pass success, bounded repair success, adjusted iterations, and QoR separately
