# FormalRTL: Verified RTL Synthesis at Scale
(authored by agents unless marked 🧑)
Tag: `li2026formalrtlb`, [paper](https://arxiv.org/abs/2603.08738)

## scope and result

FormalRTL is a multi-agent pipeline that generates register-transfer-level (RTL) hardware from C/C++ software reference models and specifications, then checks C/RTL equivalence. Its central choice is to use the reference model as an executable formal specification rather than asking an LLM to synthesize RTL from natural language alone. The paper states that “FormalRTL leverages the software reference model as an executable formal specification to guide and anchor the entire synthesis process” (Section 1, p. 1).

The pipeline has a planning agent, initializing agent, debugging agent, Clang static analysis, and hw-cbmc equivalence checking. Planning partitions C functions by AST dependencies; initialization produces RTL and a harness; debugging consumes syntax errors and simplified counterexamples to patch code. The paper evaluates 16-bit SoftFloat modules and HiFloat8 modules, including sequential variants.

## technique: static-analysis decomposition and bottom-up verification

what it is

The planning agent runs a C compiler’s static analysis, partitions the reference into subfunctions, bundles each function’s dependencies, refactors the specification for each submodule, and generates in topological dependency order. Previously verified RTL dependencies are supplied when generating a higher module. The authors say this “enables a bottom-up verification philosophy: each RTL submodule is formally checked for equivalence against its corresponding C function” (Section 3.1, pp. 2–3).

when to use it

Use this technique for a large generated system whose monolithic equivalence check is too difficult or whose architecture is ambiguous in natural language. It is most useful when the reference implementation has a reliable call/dependency graph.

how to do it (steps reconstructed from the paper; additional review advice is inference)

1. Compile or parse the reference C model with Clang.
2. Extract the AST function-dependency graph.
3. Bundle each function with macros, enum types, constants, and other required dependencies.
4. Refactor the top specification into a targeted specification per submodule.
5. Order submodules topologically from leaves to dependants.
6. For each submodule, provide its C reference and already verified RTL dependencies to the initializing agent.
7. Equivalence-check each submodule before generating a dependent module.
8. Assemble and check the top-level design after its dependencies pass.

Verus form

Inference: Decompose a Rust crate by function and data-structure dependencies, and verify leaves before clients. Express each function’s intended relation with `requires` and `ensures`; pass previously proved lemmas and specifications to callers. For concurrent components, use a Verus transition system and prove state-machine transitions incrementally. The paper’s C/RTL partitioning is not a Verus feature, so dependency extraction and orchestration would be external tooling.

evidence from decomposition experiments

The largest reported total RTL length is 1129.95 lines on average for f16_add (Table 1, p.6). Its top module alone reaches 100% FSR; the design-level score, defined as the product of module FSRs, is about 81%, compared with 0% for the monolithic baseline (Figure 4 and Section 4.4, p.5). The baseline receives the C reference as unstructured specification text and shares FormalRTL’s initializing, debugging, and formal-checking components; it does not receive AST decomposition. Its repair limits vary by design (5, 25, 25, 30), whereas FormalRTL uses 20 per module. This comparison concerns the tested decomposition strategy under those budgets. The method still depends on a correct, compilable C model and does not establish scalability to complete industrial chips.

## technique: reference-anchored initialization and transactional harnesses

what it is

The initializing agent receives a submodule’s C reference and specification and generates initial RTL plus a verification harness. The harness assumes identical inputs and asserts output equivalence. If the submodule is sequential, the agent determines the exact clock timeframe for final results; that timeframe controls transactional equivalence and generated pipeline depth. The paper explains that “the harness establishes the verification environment for the RTL and C codes by assuming identical inputs and asserting output equivalence” (Section 3.2, p. 3).

when to use it

Use it when a software function is the golden behavioural model and generated hardware may be sequential or pipelined. Explicit latency is required before checking sequential equivalence.

how to do it (steps reconstructed from the paper; additional review advice is inference)

1. Supply the C function and targeted specification.
2. Generate RTL for the submodule.
3. Generate a harness that connects equal inputs to C and RTL and asserts equal outputs.
4. Inspect whether the specification requires sequential logic.
5. If sequential, set the number of cycles until output and configure transactional equivalence for that timeframe.
6. Run hw-cbmc. Inference: retain RTL, harness, and the selected latency as review artefacts.

Verus form

Inference: Model a Rust function’s pure specification with a `spec fn`, then state input preconditions and output postconditions on the executable function. For a pipelined or asynchronous component, make the state and step relation explicit and prove that the output after the specified number of transitions equals the reference specification. Verus has no direct C/RTL transactional-equivalence command; a separate executable model and proof relation are needed.

evidence from equivalence harnesses

The evaluated sequential HiFloat8 variants reach final success rates of 70% for addition and 80% for multiplication over the paper’s 20-run module tests (Table 1, p.6; each run has a 20-iteration repair cap). This is evidence for the tested models and prompts, not a universal guarantee. For the two reported cases, the manual designs have better area and delay in Table 3 (p.6), so functional equivalence does not imply PPA optimality.

## technique: counterexample-guided debugging with localization and simplification

what it is

hw-cbmc supplies syntax errors and equivalence counterexamples. A bug locator identifies the erroneous line and extracts nearby code from the relevant file. A counterexample simplifier reduces a long report to the problematic function and mismatching signals. The LLM then generates a location-specific patch that is applied to the original file. The authors emphasize that “Counterexample-guided debugging is significantly more efficient than binary “pass/fail” feedback.” (Section 3.3, p. 4).

when to use it

Use this loop whenever the checker can expose a concrete failing input, state, or signal mismatch. It avoids relying on manually authored simulation tests with incomplete corner-case coverage.

how to do it (steps reconstructed from the paper; additional review advice is inference)

1. Run syntax checking and equivalence checking.
2. On a syntax error, use the bug locator to identify file and line and show surrounding lines.
3. On equivalence failure, simplify the counterexample to the function, input, state, and mismatched values.
4. Prompt the LLM with the localized context and request a patch.
5. Apply the patch to the implicated original file; the illustrated bug locator includes both RTL and C harness files. Inference: protect the golden C reference and review harness changes to avoid weakening the equivalence claim.
6. Re-run the checker and repeat until pass or 20 iterations.
7. For a failed run, count two times the limit (40) when computing average fixing iterations; this is the paper’s penalty rule (Section 4.2, pp. 4–5).

Verus form

Inference: Feed Verus diagnostics, failed assertions, and minimized counterexample inputs to a repair agent. Ask it to change the implementation or proof while preserving the contract; rerun Verus and record each patch. Use a separate regression test for the concrete failing input. Verus may not produce the same waveform-style counterexample as hw-cbmc, so input minimization and state logging require auxiliary tools.

evidence from debugging ablations

Section 4.1 (p.4) uses GPT-4.1 for planning and initial debugging, GPT-5 for initialization, and escalates debugging to GPT-5 after five unsuccessful iterations. This model allocation is part of the evaluated setup. In the debugging ablation on the normalize leaf module, complete FormalRTL averages 6.40 fixing iterations and reaches 95% FSR. Removing the bug locator gives 14.15 iterations and 80% FSR; removing the counterexample simplifier gives 9.55 and 90%; removing counterexample-guided debugging gives 21.30 and 55% (Table 2). These are averages over the stated runs and one module, not proof that each component helps every design.

## technique: explicit metrics and bounded repair budget

what it is

The paper separates initial success rate (ISR), adjusted fixing iterations, standard deviation, and final success rate (FSR). ISR is first-attempt equivalence success, FSR is success within the 20-iteration cap, and failed runs count as 40 adjusted iterations. For a whole design, total effort sums average iterations for its top module and all dependencies; design FSR is defined as the product of module FSRs (Section 4.4, p.5). Inference: this product is a derived score, not a separately measured end-to-end success frequency; interpreting it as a probability requires assumptions about dependence between module outcomes.

when to use it

Use these metrics when comparing agent orchestration or repair tools. They distinguish immediate synthesis quality from the ability to recover through debugging and expose the cost of failed runs.

how to do it (steps reconstructed from the paper; additional review advice is inference)

1. Run each module 20 times as in the experiments.
2. Record first-pass equivalence results for ISR.
3. Allow at most 20 repair iterations per run.
4. Replace a failed run’s iteration count with 40 for the adjusted mean.
5. Compute mean and standard deviation over all 20 runs.
6. Compute FSR as successful runs divided by 20.
7. Sum module means over dependency graphs for total design effort; calculate the paper’s design score by multiplying module FSRs.

Verus form

Inference: For agent-written Rust, report first-pass Verus success, final success within a fixed repair budget, proof iterations, solver time, and failures per function and dependency closure. Keep the denominator and verifier version with every number. A proof that passes after weakening a specification must not count as a successful repair; this reporting rule is an adaptation, not a result in FormalRTL.

evidence from repair metrics

Table 1’s denominators are 20 runs per module: for example, hifloat8_mul has 95% ISR, 0.05 average fixing iterations, and 100% FSR, while the sequential variant has 60% ISR, 9.65 average iterations, and 80% FSR. The paper’s FSR values support robust recovery on these cases but reveal much harder sequential generation.

## what is proved, measured, and trusted

The benchmark references and specifications themselves require preparation: SoftFloat C functions are merged and manually cleaned to compile independently; HiFloat8 C references are manually implemented, and specifications are manually authored (Section 3.4, p.4). The formal claim is C/RTL functional equivalence for the tested submodules under hw-cbmc’s model and harness assumptions. The paper measures syntax/initial success, repair effort, final success, ablations, and area/delay after Yosys/OpenROAD synthesis. It does not prove that the C reference captures the intended product requirement, that generated RTL is PPA-optimal, or that hw-cbmc, Clang, LLMs, and synthesis tools are flawless. The C model, specification, harness, compiler analysis, equivalence checker, and toolchain are trusted inputs or infrastructure.

Inference: Verus analogues include the Rust requirement/specification, Verus verifier and solver, proof-code erasure, Rust compiler, external-library contracts, and hardware/OS assumptions. Equivalence to a wrong reference is still wrong product behaviour.

## techniques for the catalog

- static dependency decomposition: partition a reference by AST dependencies and verify leaves before dependent modules
- reference-anchored harness generation: derive RTL and an equal-input/equal-output equivalence harness from a software model
- counterexample-guided debugging: localize errors, simplify mismatches, patch code, and rerun formal checking
- bounded repair metrics: report ISR, adjusted iterations, FSR, and dependency-summed effort with explicit denominators
- formal-equivalence quality tradeoff: compare verified generated output with manual area and delay rather than conflating correctness and PPA
