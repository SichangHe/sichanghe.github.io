# MA-ProofBench: A Two-Tiered Evaluation of LLMs for Theorem Proving in Mathematical Analysis
(authored by agents unless marked 🧑)
Tag: `pu2026maproofbench`, [paper](http://arxiv.org/abs/2606.13782v2)

## purpose and result
The paper introduces MA-ProofBench, a benchmark for Lean 4 theorem proving in mathematical analysis. It contains 200 formalized theorems: 100 undergraduate Level I and 100 Ph.D.-qualifying Level II, spanning six core topics and 27 subcategories. The abstract says, “The benchmark contains 200 formalized theorems covering 6 core topics and 27 subcategories, including measure and integration theory, complex analysis, and functional analysis.” (Abstract, p. 1)

The benchmark is evidence about proof-generation difficulty, not a verifier or a new proof calculus. GPT-5.5 (xhigh) reaches 16% Pass@8 on Level I and 5% on Level II; the table reports these percentages over 100 problems per level (Table 2, p. 6). The paper defines Pass@k over N problems and candidate proofs, with open-source models sampled at n=32 and proprietary models at n=8 (Experimental Setting, §4.1, p. 5). Thus the headline Pass@8 numbers are not percentages of individual prompts that always succeed: they estimate the chance that at least one of up to eight samples succeeds for each problem.

## technique 1: human-led formalization and review
What it is: a controlled translation pipeline that turns informal analysis exercises into checked Lean statements while keeping statement quality under human control. The paper’s four stages are problem collection, formalization, independent expert review, and difficulty grading (§3.2, pp. 4–5).

How to apply it:
1. Collect and clean a large candidate pool; remove inaccurate, ambiguous, incomplete, or duplicate problems. The authors start from about 500 and select 200 (§3.2).
2. Have experts draft each Lean 4 statement with `sorry` as a temporary proof hole. Iterate “formalize–feedback–refine” using Lean compiler errors to repair type mismatches, unknown identifiers, and missing imports (§3.2).
3. Consult LLMs for unfamiliar Mathlib APIs, then cross-check suggestions against official Mathlib documentation; the final statement decision remains human (§3.2).
4. Give each statement to three independent experts for reverse translation from Lean to mathematics. Accept only when at least two vote in favor; otherwise return to formalization (§3.2).
5. Grade difficulty using mathematical and formalization complexity and assign Level I or II (§3.2).

Evidence: the paper states, “Each reviewer was required to ‘reverse-translate’ the Lean 4 code back into its intended mathematical statement, ensuring that no implicit assumption was dropped and no condition was inadvertently weakened.” (§3.2, p. 4). This procedure directly addresses the trusted boundary between an informal requirement and its formal encoding.

Verus form (Inference): apply the same pipeline to Rust/Verus specifications: write the executable function and `requires`/`ensures` contract, compile iteratively to repair diagnostics, consult the Verus library, and have independent reviewers translate the contract back into the intended behavior. Verus proofs use `requires`, `ensures`, loop invariants, and proof functions; Lean imports and `sorry` do not carry over. Human review of the contract remains trusted.

## technique 2: compiler-gated proof sampling
What it is: evaluate generated proofs by compiling them in a fixed Lean/Mathlib environment and rejecting any proof that leaves holes or changes the theorem statement. The success criteria are compiler success, no `sorry`, all prerequisites included, and an unaltered theorem statement (§4.1).

How to apply it:
1. Fix Mathlib 4.28.0 and Kimina Lean Server as the compilation backend (§4.1).
2. For each problem, sample candidate proofs with the stated model and temperature 1.0, maximum output 32k tokens (§4.1).
3. Compile every candidate; accept only error-free proofs with no `sorry` and all required definitions/imports (§4.1).
4. Compute Pass@1, Pass@8, and (where 32 samples exist) Pass@32 using the paper’s estimator (§4.1 and Table 2).

A successful case shows the expected proof shape. For a periodic differentiable function, the generated Lean proof establishes continuity and differentiability on the interval, obtains `exists_deriv_eq_slope`, rewrites the endpoint equality from periodicity, and concludes derivative zero (Appendix B.1, pp. 13–14). For a unitary operator, another proof constructs a `unitary` element, invokes `unitary.spectrum_subset_circle`, and rewrites metric-sphere membership to a norm equation (Appendix B.1, p. 14).

Verus form (Inference): generate Rust proof candidates and run `verus` on each. Accept only candidates that satisfy the unchanged function contract without `assume`, `admit`, or `external_body` in the verified path. Report pass rates with the exact number of benchmark functions and samples. Verus’s executable Rust remains after erasure; Lean imports and Mathlib theorem names must be replaced with Verus library lemmas and Rust data types.

## technique 3: failure taxonomy for repair
What it is: classify failed proof attempts by inspecting compiler output and generated code. The paper identifies Mathlib hallucinations and incomplete proofs as dominant failure modes (Abstract; §5.1). The failed harmonic-function example invents `InnerProductSpace.HarmonicOn` and then uses `sorry`; the paper explains that the identifier is nonexistent and that the proof cannot resolve neighborhood logic (Appendix B.2, pp. 15–16). Another failed signed-measure proof equates a total-variation measure value of type `ENNReal` with an absolute value of type `R`, a type error (Appendix B.2).

How to apply it:
1. Preserve the compiler diagnostic and candidate source.
2. Label unknown identifiers/API hallucinations separately from type mismatches and unfinished subgoals.
3. For API hallucinations, search the actual library and replace the fabricated name only after checking its type and hypotheses.
4. For type failures, expose inferred types and insert conversions or reformulate the lemma; do not mask the error with a hole.
5. Count each category over the same denominator of attempted proofs and report the model, level, and sampling setting.

Verus form (Inference): use verifier diagnostics to distinguish missing lemma, failed trigger/type inference, ownership/borrow mismatch, and an unproved postcondition. Search only constructs documented in the Verus library; repair specifications or proof lemmas rather than weakening `ensures`. This taxonomy is useful because a generated Rust proof can compile while still relying on an unintended trusted escape hatch, so the harness must reject those constructs explicitly.

## what is proved, trusted, and limited
The benchmark proves only that accepted Lean terms compile under Mathlib 4.28.0 and satisfy the stated theorem. It measures model success rates under the sampled prompts. It does not prove that the formal statement faithfully captures the original exercise beyond the review process, nor that results transfer to Verus, Rust, other Mathlib versions, or unsampled models. The authors explicitly conclude, “Both general-purpose reasoning models and formal theorem provers struggle with MA-ProofBench, with Mathlib hallucinations and incomplete proofs as the main bottlenecks.” (Conclusion, p. 8)

Inference: for VeruLaw, the strongest threat is workflow-level: an LLM can produce plausible but uncompilable or semantically misformalized specifications, especially for analysis-heavy obligations. The measured 16%/5% results are not a direct product-security probability because the benchmark is mathematics, uses Lean, and has 100 problems per level. VL should reuse the human reverse-translation review, fixed compiler gate, and explicit failure taxonomy instead of assuming generated Rust proofs are reliable.

## techniques for the catalog
- human-led formalization and reverse-translation review: clean problems, iterate with compiler feedback, and require independent reviewers to validate Lean statements
- compiler-gated proof sampling: compile sampled candidates in a fixed environment and reject errors, holes, missing prerequisites, or changed statements
- verifier failure taxonomy: classify API hallucinations, type errors, and incomplete proofs from diagnostics and count them by model and denominator

Checked 2026-10-15 against the paper by a Codex agent for ma_proofbench_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
