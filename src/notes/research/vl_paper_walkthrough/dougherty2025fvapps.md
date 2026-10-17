# Proving the Coding Interview: A Benchmark for Formally Verified Code Generation
(authored by agents unless marked 🧑)
Tag: `dougherty2025fvapps`, [paper](https://doi.org/10.1109/llm4code66737.2025.00014)

## benchmark design

FVAPPS turns ordinary programming interview problems into a benchmark that requires both an implementation and proofs. It starts from APPS Python problems, converts a selected solution and its tests into Lean 4, and replaces proof bodies with `sorry`. A sample contains a `def` for the function and one or more theorem statements about it. The model must fill every `sorry`. The paper calls this “a benchmark of 4715 samples for writing programs and proving their correctness” (Abstract, p. 72). The 4,715 count is the set that generated valid theorems (the paper's Unguarded set); 1,083 samples survive all five pipeline stages (the Guarded and Plausible set, Section II.C, p. 74).

The sample shown in Figure 2 has `solve_elections` followed by nonnegativity, upper-bound, zero-vote, and concrete zero-vote theorems. This separates executable synthesis from explicit correctness properties. The source problems are not themselves trusted specifications: the authors caution that “it is nontheless [sic] possible that particular theorems are not applicable or vacuous in some form” (Section V, p. 77). Thus the benchmark measures ability to prove its supplied statements, not whether those statements express the product requirement.

## technique 1: staged benchmark curation

Use staged filtering when creating a verified-code benchmark from ordinary programming tasks:

1. preprocess APPS examples, aggregate unit tests and solutions into one file, select one solution, and normalize the function definition and architecture (Section II.B, p. 73)
2. ask an LLM to generate property-based Python tests; run them with pytest and write the test file only when pytest returns an empty standard error and exit code zero (Section II.B, p. 73)
3. ask an LLM to convert the property tests into unproven Lean theorem statements (`sorry`) and typecheck them with the `lean` executable so the statements are well-formed (Section II.B, p. 74)
4. turn the unit-test assertions into inline Lean unit tests, translate the Python solutions into Lean `def`s, and require the guard messages to “pass” (Section II.B, p. 74)
5. use Lean’s Plausible property-based testing framework to filter theorem statements that are not “plausible” given the solutions that pass the unit tests; this stage has no LLM call (Section II.B, p. 74)

The paper allows at most 5 LLM attempts per sample in stages one through three and at most ten in stage four (Section II.B, p. 73).

The resulting assurance buckets are Unguarded (4,715, ending at stage 3), Guarded (2,089, passing stage 4), and Guarded and Plausible (1,083, passing all five stages). The paper says the last set is “solvable and well-stated to the highest possible probability short of a full proof” (Section II.C, p. 74). The paper also notes that the definitions in the Guarded and Guarded and Plausible sets are somehow “easy” in that current language models can provide definitions (p. 75); claude-3-5-sonnet-20241022 solved them with the scaffold. Inference: Plausible tests are not deductive proofs and can miss a wrong or vacuous theorem. The paper itself says manual spot-checking found no systematic failures but vacuous theorems remain possible (Section V, p. 77).

Inference: a Verus benchmark builder can retain source tests, add Rust tests, compile candidate contracts, and use Verus proof checking as the final benchmark oracle. Property-based tests can be generated with Rust tooling, but their outputs remain a filter rather than a specification proof.

## technique 2: verifier-scaffolded agent loop

Use a loop that treats the compiler or prover as the supervisor. The paper’s generic loop sends the model’s candidate to an executable, captures standard error, standard output, and exit code, and appends that feedback to the next prompt. For Lean generation, the authors extract the model’s code block into `Basic.lean`, run it in a custom environment with pinned libraries using `lake build`, and send the complete input/output plus return code back to the model (the “Scaffolding Loop (Agent)” subsection, p. 75, which sits after Section II.C and before Section III). They explicitly changed from solving all theorems at once to solving the definition first and then appending each theorem independently.

The paper’s direct statement is: “The full standard input and output alongside returncode are sent back to the model with the instruction to address the issues” (p. 75, same subsection). Its iteration table counts attempts only for successful samples. The Pytest stage averages 0.846 iterations and the Lean stage 1.188, with the zero position being the initialization prompt (Section II.C and Table I, p. 74).

Inference: a Verus loop would write each candidate Rust module to a fixed crate, run `verus`, capture diagnostics, and return those diagnostics without treating model text as evidence. Solve executable definitions before proofs, then append one contract or proof obligation at a time. Use pinned Verus and dependency versions so a changed library does not alter the measured task. This is an inference.

## technique 3: prompt for environment and proof context

When a prover API changes rapidly, include the exact environment and examples in the system prompt. FVAPPS reports higher success from three details: explicit problem and goal formulation, Lean 4 environment differences from pretraining, and multiple theorem-and-solution examples (the “Prompt Details” subsection, p. 75, attributed to “key insights by Victor Taelin”). The paper reports “significantly higher success rates” but gives no numbers for this. Inference: this reduces obsolete API assumptions.

Inference: for Verus, include the tool version, supported Rust subset, imports, expected module layout, and short examples using only constructs available in the project’s Verus reference. Do not ask for a runtime call to proof-only code. The paper does not discuss Rust or Verus.

## evidence and limits

The preliminary baseline sampled 101 FVAPPS problems (Section III; the abstract says 100) and used Claude 3.5 Sonnet and Gemini 1.5 Pro. Table II (p. 76) lists “Successes” of 60 for Sonnet and 43 for Gemini out of 101 (Unguarded 41 and 28 of 69, Guarded 12 and 11 of 18, Guarded and Plausible 7 and 4 of 14) without defining a success. The text of Section III.D says 43 Sonnet samples and 23 Gemini samples had at least one theorem completed, so Table II’s counts do not match theorem-level success. In the detailed theorem count, Sonnet completed 121/406 attempted theorems (30%) and Gemini 74/406 (18.5%) (Section III.D, p. 76). The denominators differ: Table II counts samples, while 406 counts attempted theorems. Both models ran at most 25 loops for definitions and 50 for each theorem. Sonnet completed all but seven definitions; Gemini completed 71 definitions. Roughly 20% of each model’s eventually successful theorems completed in zero or one iteration (Section III.D, p. 76).

A human spent ten hours on one sample’s definition and one theorem, completed the function (which needed termination proofs for two recursors), and did not get through any of the proofs; a problem they hit was stack overflow when trying to unfold the recursors (Section III.B, p. 75). The paper concludes “we don’t think a full human baseline is a feasible option.” On that sample (Section III.C, p. 75), both the human and Sonnet implemented the definition and succeeded on no nontrivial proofs; Sonnet attempted the second theorem for 100 loops and diverged. These are one-sample comparisons, not general human-versus-model claims.

Inference: the benchmark proves only that Lean accepts a generated definition and theorem proof under Lean 4.12.0 and the pinned Mathlib commit. It trusts the Lean kernel, Mathlib, the theorem statements, the conversion pipeline, and the quality filters. It does not prove that the theorems cover the intended behavior. A key failure mode is proof-amenable structure: the authors report that Sonnet solved many problems via imperative programming with the identity monad (`Id.run do`), which “fails to capture inductive structure that lends itself to proofs” (Section III.E, p. 76).

## techniques for the catalog

- staged curation — filter ordinary programming tasks through tests, typed theorem formation, and property plausibility before proof benchmarking
- prover-scaffold loop — run each model candidate in a pinned environment and feed complete diagnostics back for bounded repair
- incremental obligations — solve the executable definition, then append and prove one theorem or contract at a time
- environment prompting — state exact tool APIs, versions, goals, and working examples in the model context
