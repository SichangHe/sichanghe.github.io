# Verification of Compiler-to-Accelerator Mappings for Machine Learning Accelerators
(authored by agents unless marked 🧑)
Tag: `gaonkar2026bolt`, [paper](https://www.semanticscholar.org/paper/c4d39db2e3f07f6c8751fe874e1b7e2aa7957a22)

## Bolt overview

Bolt verifies equivalence between compiler IR and accelerator MMIO code against a formal hardware semantics. The paper states: "It effectively utilizes a pattern of aligning software loops with the hardware, followed by relating corresponding data layouts, to enable verification using well-aligned product programs." (abstract, p. 1). Its six-stage workflow is: model hardware in Hex, extract a sync-skeleton, rewrite IR to align loops, specify layout-sketches, construct a product program, and generate SMT verification conditions.

Use it as follows:

1. Obtain IR semantics and the accelerator's formal ILA state-transition model
2. Translate MMIO and ILA updates into Hex, exposing hardware loops, counters, buffers, and custom operations
3. Extract a sync-skeleton containing tensor-computing loops while omitting pure data movement
4. Rewrite the functional IR with structural, arithmetic, parameter-substitution, custom-numeric, and type-casting rules until loops match
5. For each aligned loop, write a layout-sketch relating IR tensor accesses to hardware buffer accesses
6. Derive relational data-layout and loop invariants from the sketches
7. Build the product program and generate verification conditions at loop cut points
8. Check all conditions with Z3 over bitvectors, arrays, uninterpreted functions, and linear integer arithmetic

The framework does not require compiler internals: "Bolt requires the semantics of the IR code and the MMIO code, but does not depend upon any compiler information" (Section 1.2, p. 4). This makes it suitable for independent validation of opaque mappings.

## Hex hardware-explication language

Hex is an intermediate verification language inspired by Dafny and synthesizable C. It provides application, hardware, and derived parameters; assignments and MMIO `hw_call`; `for` and `par-for`; multidimensional buffers; `assume`, `assert`, and loop invariants; and first-class hardware-counter annotations. A `hw_call` corresponds to a hierarchically defined ILA update. Hardware parallelism and counter iteration become explicit loops, while buffers model distributed registers.

Steps for a model:

1. Declare application and fixed hardware parameters, then derived relationships
2. Encode each MMIO intrinsic as `hw_call` with its ILA state update
3. Expand implicit SIMD/processing-element iteration into `par-for` or `for`
4. Represent tensor registers and buffers as multidimensional arrays
5. Add assumptions relating dimensions and counters
6. Annotate loops with invariants and use uninterpreted functions for custom numerics

Parameters are symbolic in Align and Relate but replaced with concrete values in Verify because nonlinear arithmetic is difficult. Thus, the paper warns that Bolt does not produce parametric proofs for all sizes. Hex assumes buffer updates are atomic and globally visible and that code has no data races.

Verus form (Inference): encode the Hex state as ghost maps or arrays and each `hw_call` as a spec transition. Use `while` loop `invariant` clauses for bounds and counter relations. A Verus proof over symbolic dimensions would require arithmetic lemmas; concrete instantiations mirror Bolt's bounded checks but do not establish all parameter values.

## align: sync-skeleton and rewriting

A sync-skeleton is a pure-functional template extracted from hardware tensor-computing loops. It abstracts buffers and data-movement loops and contains simple expressions, let bindings, conditionals, map/reduce loops, and unknown loops. Include a hardware loop when it operates on tensor state or its forward cone of influence; classify it as map when no accumulator element is read or written across iterations. The paper's accumulator test uses an SMT satisfiability query over two distinct loop-counter copies and read/write addresses.

Rewrite the IR against this template in five categories: structural loop transformations, arithmetic identities, parameter substitution from the Hex preamble, custom-numeric conversions, and type-cast simplification. The running example required 29 rewrites; parameter and standard structural rules matched 7 of 10 loops before custom numeric and cast rules matched all 10. Alignment is best effort: unmatched loops preserve soundness but may need extra invariants or unrolling.

Verus form (Inference): each rewrite should have a lemma proving semantic equality under its preconditions. Never treat an unproved rewrite as a certificate; Bolt identifies rewrite rules as the sole potentially unsound step.

## relate: layout-sketches and invariants

For an aligned loop, a layout-sketch tuple `(R, T[ae], B[hwae], C_in)` gives a quantified index range, an IR tensor assignment, a hardware buffer assignment, and input correspondences. It handles overwritten buffers with an `isOwr` flag. Develop sketches using four tactics: capture lockstep behavior, identify each IR result tensor and its hardware buffer, copy correspondences from nearby aligned loops, and handle movement/zero-initialization with standard patterns.

From a sketch, generate invariants of the form `forall i in R. g(i, i_cur) ==> T[ae(i)] = B[hwae(i)]`. Use no guard for reduce accumulators; for map outputs guard elements already processed (`loop_index < current`); for overwritten inputs guard remaining iterations (`loop_index >= current`). Shared loop counters supplied by Align make both accesses functions of the same indices.

Verus form (Inference): express layout correspondences as quantified `ensures` or ghost lemmas over arrays, with loop invariants carrying the guarded equality. Array bounds and index arithmetic must be proved explicitly; Verus does not infer Hex's layout sketch automatically.

## verify: product programs and VC generation

Bolt cuts the product program at loops, annotates each cut point with a Hoare-style specification, and generates a VC for every loop-free edge. If Z3 proves every VC, the IR and accelerator outputs are equivalent. Useful invariant categories are data layout, loop bounds, hardware counters, and write-once-read-many registers. Universal layout invariants are flattened over concrete bounds to avoid quantifier difficulty. Parameter substitution similarly avoids nonlinear arithmetic.

The paper states: "If the SMT solver can prove the validity of every VC, then we have successfully proved the equivalence of the IR code and accelerator Hex code in the product program." (Section 6, p. 17). A failed VC indicates a weak assumption, an overly strong assertion, or a program bug.

## evaluation and limits

Bolt was evaluated on four mappings across two accelerators: FlexASR pooling (add, max, mean), FlexASR linear-layer, HLSCNN 2D convolution, and HLSCNN convolution with an accumulation flag. The largest product program had 29 loops with nesting depth 7. Table 5 reports 4/11/12/8 layout-sketches and 11/31/10/5 data-layout invariants for FP/FLL/C2D/C2D+. Verification used Z3 on a 16-core Xeon with 256 GiB RAM and a six-hour timeout. Four mappings verified at actual hardware parameters; two verified only with downscaled parameters. FLL at `(8,4,8); (8,32,32)` took 18,351 seconds and timed out at `(16,4,16); (16,64,64)`. C2D timed out at one larger setting, while C2D+ took 20,579 seconds at its largest listed setting. Standard Z3/Spacer without invariants failed after one day even on the smallest case; bounded model checking failed due to loop unrolling.

These are concrete-parameter proofs, not universal proofs over symbolic dimensions. The model's ILA semantics, rewrite correctness, user-provided invariants, no-race assumption, and Z3 soundness remain trusted. Inference: for VL, Bolt's align-relate-verify decomposition transfers to checking translated Rust against source behavior when both are expressed as loops over shared state. Inference: the dominant threat is missing layout or counter invariants and concrete-only coverage; a successful solver result does not cover dimensions or hardware behaviors outside the checked instance. Existing product-program equivalence and accelerator verification already address the core method, so VL should reuse their invariant templates.

## techniques for the catalog

- Hex hardware explication: expose ILA state updates, loops, counters, buffers, and custom numerics in an IVL
- sync-skeleton extraction: abstract tensor-computing hardware loops into a functional template
- hardware-guided rewriting: align IR loops with parameter, structural, arithmetic, numeric, and cast rewrites
- layout-sketch: specify quantified tensor-buffer correspondences and input dependencies
- guarded layout invariants: derive map, reduce, and overwrite guards from loop progress
- product-program equivalence: combine aligned programs and prove relational invariants at loop cut points
- VC generation with Z3: discharge loop-free verification conditions over arrays, bitvectors, and uninterpreted functions
- concrete-parameter verification: replace symbolic dimensions and flatten bounded quantifiers when SMT cannot solve nonlinear formulas

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
