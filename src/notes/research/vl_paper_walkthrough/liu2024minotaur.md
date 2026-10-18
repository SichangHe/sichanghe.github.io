# Minotaur: A SIMD-Oriented Synthesizing Superoptimizer
(authored by agents unless marked 🧑)
Tag: `liu2024minotaur`, [paper](https://arxiv.org/abs/2306.00229)

## system and formal guarantee
Minotaur synthesizes SIMD-aware rewrites for LLVM IR and validates them with Alive2. Its core correctness argument is compositional: decompose a function F into residual R and cut C, synthesize C′ that refines C, then compose F′=R∘C′. The paper states, “Since refinement is compositional, it follows that F′ refines F” (section 2.3, p. 5). The paper says Alive2 “is intended to be a sound refinement checker” for LLVM functions without loops, so Minotaur ensures the cut C is loop-free, and C′ is then loop-free because Minotaur never synthesizes a loop (section 2.3).

The authors report, “Every optimization discovered by Minotaur has been formally verified by Alive2” (section 5.1, p. 14). Inference: this is directly relevant to VL’s principle of generating an implementation and mechanically proving refinement, but LLVM/Alive2 semantics are not Verus semantics. A Verus version would need Rust contracts and proof lemmas for the same decomposition.

## technique 1: depth-bounded cut extraction
What it is: isolate a loop-free, dependency-complete fragment around an instruction while replacing unsupported or out-of-bound dependencies with fresh inputs (Algorithm 1, section 2.4, pp. 5–7).

How to apply:
1. Select a target instruction I and depth bound B; restrict allowed basic blocks to I’s innermost loop or to non-loop blocks (Algorithm 1, steps 1–5).
2. Run a worklist depth-first traversal. Mark visited instructions; put nodes beyond B, unsupported, or outside allowed blocks into Unknown (steps 9–26).
3. Harvest operands recursively. For loads, follow MemorySSA MemoryDef/MemoryPhi chains and push influencing stored values; for conditional branches, harvest the branch condition (steps 27–39 and section 2.4).
4. Add every terminator instruction of F to Harvested (step 40). Clone F, delete non-harvested instructions, remove back-edges, turn Unknown values into function arguments, and return I’s value (steps 43–48).

Verus form: Inference: define a Rust function whose inputs are the harvested values and whose `ensures` contract states the cut result. Use a ghost abstraction for memory dependencies and prove that the residual function composes with the cut. Verus does not provide LLVM MemorySSA; memory influence must be encoded as explicit slices, maps, or invariants.

Limits: irregular loops are abandoned; non-intrinsic calls, operations on global variables, and operations not recognized by Alive2 are marked unsupported and become free inputs (section 2.4). Inference: since free inputs stand for arbitrary values, the refinement still holds, but optimizations that depend on relationships between those values cannot be found.

## technique 2: formalize and test SIMD intrinsic semantics
Alive2 initially lacked target-specific vector intrinsics. Minotaur adds semantics for 165 SSE, AVX, AVX2, and AVX-512 intrinsics (section 3.2, p. 8). The implementation is parameterized by vector width, element size, and presence of masking so that variants share code; the semantics take 660 lines of C++ (section 3.2, pp. 8–9). The authors validate these semantics with randomized differential testing: “Each iteration of our tester randomly chooses constant inputs to a single vector intrinsic” (section 3.3, p. 9), executes LLVM JIT, translates to Alive2 IR, and asks whether the IR refines the concrete JIT result.

How to apply:
1. Generate random concrete lane inputs for one intrinsic.
2. Build a tiny LLVM function invoking that intrinsic.
3. Evaluate it with LLVM JIT.
4. Translate the same function to the verifier IR and check refinement.
5. Treat any mismatch as a semantics bug; fix and rerun.

Evidence: the tester found 11 cases where the semantics produced an incorrect result (usually an edge case) and three cases where Minotaur generated SMT queries that failed to typecheck; after fixing these 14 bugs, extensive testing found no additional defects (section 3.3). This is testing evidence, not a proof that the implementation has no remaining bugs.

Verus form: Inference: write executable Rust reference and optimized functions, then prove equality with Verus `ensures`; use `assert`/lemmas for lane arithmetic. Differential testing remains useful for finding specification mistakes, but Verus proofs provide the final contract check.

## technique 3: partially symbolic synthesis with refinement filtering
Minotaur balances search and solver work by enumerating instruction skeletons while leaving literal constants symbolic (section 4.1). Algorithm 4 has three phases:
1. Populate an instruction pool from SSA inputs, symbolic constants, and holes (Algorithm 4, lines 2–13).
2. Recursively fill holes until complete, discarding candidates over the instruction limit or whose TargetTransformInfo cost is no lower than the cut (lines 15–30).
3. Sort candidates by cost and ask Alive2 for refinement. For symbolic constants, solve an exists-forall query: there exists constant values such that the candidate refines the cut for all input values (lines 32–47 and section 4.2). The paper sorts candidates by LLVM TargetTransformInfo cost so that likely-beneficial rewrites are tested before the time limit.

Only a refinement-checked candidate is applied, and only if its LLVM-MCA uOp estimate is lower than the original cut’s and than any other refinement’s (section 4.3). Inference: in Verus, candidate generation could produce Rust expressions with symbolic constants, while each candidate is accepted only after a `proof fn` establishes the same `ensures` contract as the original. Verus does not synthesize arbitrary Rust expressions or solve exists-forall constant constraints automatically, so a separate enumerator is required.

## technique 4: choose search depth empirically and cache rewrites
Minotaur evaluated depth B from 0–7 over 2,386 C functions containing 123,062 LLVM instructions, invoking extraction 123,062 times per B; Z3 queries had a one-minute timeout and each cut up to five minutes (section 5.2, p. 14). The number of synthesized optimizations peaked at B=6 and then decreased because larger cuts caused many solver timeouts; the authors chose B=4 because it “gets close to the maximum observed number of optimizations without requiring exorbitant compile times” (section 5.2, p. 15). Inference: this is an engineering tuning method—measure unique cuts, successful rewrites, and compile time, then choose a point near the optimum.

Rewrites are stored in Redis and reused across compilations (section 4.4, p. 13). With a warm cache Minotaur is “only 3% slower than baseline clang” (section 5.4, p. 16); with a cold cache it “can be hundreds of times slower than clang -O3” (section 1, p. 3).

## evidence, trusted components, and VL threat
Every discovered optimization was formally verified by Alive2, and applications plus SPEC drivers were run to detect miscompilation (section 5.1). Results depend on the target processor: GMP mean speedup was 7.3% on Intel Cascade Lake and 6.5% on AMD Zen 3 (section 5.4, p. 16); SPEC CPU 2017 mean speedup was 1.5% Intel and 1.2% AMD (section 5.4, p. 17). libYUV Intel had 2,312 speedups, 72 unchanged, and 148 slowdowns, overall 2.2%; AMD had 2,259 speedups, 85 unchanged, and 188 slowdowns, overall 2.9% (section 5.4, p. 16). Minotaur cannot process assembly, and it “looks at optimizations in isolation; it does not attempt to model interactions between optimizations,” which the paper gives as the reason it can make code slower.

The paper names where bugs might remain: “the instruction semantics that we have added to Alive2, in our cut extractor, in our rewrite mechanism, in Alive2, or in Z3” (section 5.1, p. 14). Inference: the original LLVM function is also the specification and is trusted. Inference: the product threat to agent-written verified Rust is analogous—trusted specifications or solver models can validate the wrong behavior, and local optimizations may harm global performance. VL should reuse translation validation and differential testing ideas, while keeping Verus contracts as the acceptance boundary.

## techniques for the catalog
- depth-bounded cut extraction — isolate loop-free dependency fragments and abstract unsupported values
- intrinsic differential validation — compare random concrete execution with verifier refinement
- symbolic synthesis with refinement — enumerate instruction skeletons (Minotaur takes an untyped, low-level view of values), solve constants, and check universal refinement
- empirical depth and caching — tune extraction bounds from cut/timeout data and persist verified rewrites

Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "This choice was driven by empirical data: after extensive experimentation, we determined that, for our purposes, uOps are a better performance predictor than cycles."): read all of the paper text and compared every quotation, number, section, page and algorithm line reference in the study; changed page numbers (section 2.3 is p. 5, 165 intrinsics p. 8, section 5.2 setup p. 14), the Algorithm 1 and 4 line ranges, the loop-free/Alive2 soundness wording, the bug-count wording, the B=4 rationale, the cost-selection rule, and the trusted-components sentence (the paper lists five places bugs might remain, not the original LLVM specification), and removed "typed skeletons" and "denominator"; replaced the Semantic Scholar link with the arXiv link taken from the paper text (arXiv:2306.00229); did not check the Verus-side inferences against Verus, the figures or Table 2, or the cited related work.
