# Minotaur: A SIMD-Oriented Synthesizing Superoptimizer
(authored by agents unless marked 🧑)
Tag: `liu2024minotaur`, [paper](https://www.semanticscholar.org/paper/9677f38e09707007a6bd81a13c5f45ad6ed2f397)

## system and formal guarantee
Minotaur synthesizes SIMD-aware rewrites for LLVM IR and validates them with Alive2. Its core correctness argument is compositional: decompose a function F into residual R and cut C, synthesize C′ that refines C, then compose F′=R∘C′. The paper states, “Since refinement is compositional, it follows that F′ refines F” (section 2.3, p. 6). Alive2 is sound for loop-free LLVM functions, so Minotaur extracts loop-free cuts and never synthesizes loops (section 2.3).

The authors report, “Every optimization discovered by Minotaur has been formally verified by Alive2” (section 5.1, p. 14). Inference: this is directly relevant to VL’s principle of generating an implementation and mechanically proving refinement, but LLVM/Alive2 semantics are not Verus semantics. A Verus version would need Rust contracts and proof lemmas for the same decomposition.

## technique 1: depth-bounded cut extraction
What it is: isolate a loop-free, dependency-complete fragment around an instruction while replacing unsupported or out-of-bound dependencies with fresh inputs (Algorithm 1, section 2.4, pp. 6–7).

How to apply:
1. Select a target instruction I and depth bound B; restrict allowed basic blocks to I’s innermost loop or to non-loop blocks (Algorithm 1, steps 1–5).
2. Run a worklist depth-first traversal. Mark visited instructions; put nodes beyond B, unsupported, or outside allowed blocks into Unknown (steps 9–26).
3. Harvest operands recursively. For loads, follow MemorySSA MemoryDef/MemoryPhi chains and push influencing stored values; for conditional branches, harvest the branch condition (steps 27–39 and section 2.4).
4. Clone F, delete non-harvested instructions, remove back-edges, turn Unknown values into function arguments, and return I’s value (steps 40–48).

Verus form: Inference: define a Rust function whose inputs are the harvested values and whose `ensures` contract states the cut result. Use a ghost abstraction for memory dependencies and prove that the residual function composes with the cut. Verus does not provide LLVM MemorySSA; memory influence must be encoded as explicit slices, maps, or invariants.

Limits: irregular loops are abandoned; unsupported calls, globals, and unrecognized operations become unconstrained inputs, so the cut’s proof depends on the residual context preserving their relationship.

## technique 2: formalize and test SIMD intrinsic semantics
Alive2 initially lacked target-specific vector intrinsics. Minotaur adds semantics for 165 SSE, AVX, AVX2, and AVX-512 intrinsics (section 3.2, p. 9). Each intrinsic is represented by parameterized semantics to reuse code. The authors validate these semantics with randomized differential testing: “Each iteration of our tester randomly chooses constant inputs to a single vector intrinsic” (section 3.3, p. 9), executes LLVM JIT, translates to Alive2 IR, and asks whether the IR refines the concrete JIT result.

How to apply:
1. Generate random concrete lane inputs for one intrinsic.
2. Build a tiny LLVM function invoking that intrinsic.
3. Evaluate it with LLVM JIT.
4. Translate the same function to the verifier IR and check refinement.
5. Treat any mismatch as a semantics bug; fix and rerun.

Evidence: testing found 11 semantic edge-case bugs and three malformed SMT queries; after fixing all 14, extensive testing found no additional defects (section 3.3). This is testing evidence, not a proof that the implementation has no remaining bugs.

Verus form: Inference: write executable Rust reference and optimized functions, then prove equality with Verus `ensures`; use `assert`/lemmas for lane arithmetic. Differential testing remains useful for finding specification mistakes, but Verus proofs provide the final contract check.

## technique 3: partially symbolic synthesis with refinement filtering
Minotaur balances search and solver work by enumerating instruction skeletons while leaving literal constants symbolic (section 4.1). Algorithm 4 has three phases:
1. Populate an instruction pool from SSA inputs, symbolic constants, and holes (Algorithm 4, lines 3–13).
2. Recursively fill holes until complete, discarding candidates over the instruction limit or whose TargetTransformInfo cost is no lower than the cut (lines 15–30).
3. Sort candidates by cost and ask Alive2 for refinement. For symbolic constants, solve an exists-forall query: there exists constant values such that the candidate refines the cut for all input values (lines 32–41 and section 4.2).

Only a refinement-checked candidate cheaper than the original is applied. Inference: in Verus, candidate generation could produce Rust expressions with symbolic constants, while each candidate is accepted only after a `proof fn` establishes the same `ensures` contract as the original. Verus does not synthesize arbitrary Rust expressions or solve exists-forall constant constraints automatically, so a separate enumerator is required.

## technique 4: choose search depth empirically and cache rewrites
Minotaur evaluated depth B from 0–7 over 2,386 C functions containing 123,062 LLVM instructions, invoking extraction 123,062 times per B; Z3 queries had a one-minute timeout and each cut up to five minutes (section 5.2, p. 15). Optimizations peaked at B=6 but solver timeouts increased, so the production setting was B=4. Inference: this is an engineering tuning method—measure unique cuts, successful rewrites, and compile time, then choose a point near the optimum.

Rewrites are stored in Redis and reused across compilations (section 4.4). A warm cache made compilation only 3% slower than baseline clang, while cold-cache runs were much slower (section 5.4, p. 16).

## evidence, trusted components, and VL threat
Every discovered optimization was formally verified by Alive2, and applications plus SPEC drivers were run to detect miscompilation (section 5.1). Results depend on target and denominator: GMP mean speedup was 7.3% on Intel Cascade Lake and 6.5% on AMD Zen 3; SPEC CPU 2017 mean speedup was 1.5% Intel and 1.2% AMD (section 5.4). libYUV Intel had 2,312 speedups, 72 unchanged, and 148 slowdowns, overall 2.2%; AMD had 2,259 speedups, 85 unchanged, and 188 slowdowns, overall 2.9% (section 5.4). Minotaur cannot process assembly and optimizes rewrites independently, so interactions can make code slower.

Trusted elements include Alive2, Z3, added intrinsic semantics, cut extraction, rewrite application, and the original LLVM specification. Inference: the product threat to agent-written verified Rust is analogous—trusted specifications or solver models can validate the wrong behavior, and local optimizations may harm global performance. VL should reuse translation validation and differential testing ideas, while keeping Verus contracts as the acceptance boundary.

## techniques for the catalog
- depth-bounded cut extraction — isolate loop-free dependency fragments and abstract unsupported values
- intrinsic differential validation — compare random concrete execution with verifier refinement
- symbolic synthesis with refinement — enumerate typed skeletons, solve constants, and check universal refinement
- empirical depth and caching — tune extraction bounds from cut/timeout data and persist verified rewrites

Checked 2026-10-15 against the paper by a Codex agent for minotaur_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
