# Lean-GAP: A Dataset of Formalized Graduate Algebra Problems
(authored by agents unless marked 🧑)
Tag: `lee2026leangap`, [paper](http://arxiv.org/abs/2606.02588v1)

## purpose and result
Lean-GAP formalizes graduate algebra exercises from Dummit and Foote in Lean 4. The corpus has 430 formalized problems out of 1,966 (§2, p. 2). The paper’s central finding is that translating and compiling statements can be largely automated, but checking whether the formal statement means the same thing as the source remains human work: “While the preprocessing and autoformalization stages can be largely automated, we find that verification remains the most subtle and labor-intensive component, requiring careful human oversight.” (Abstract, p. 1)

## technique 1: PDF-to-LaTeX preprocessing
Use this when the source is a scanned mathematical textbook and the downstream formalizer needs machine-readable notation. The paper’s procedure is: render relevant PDF pages as images with `pdftoppm`; crop running titles, page numbers, and other bottom-margin material; send cropped images to Mathpix Convert; use its STEM OCR to obtain initial LaTeX (§3.1, p. 3). LaTeX is chosen because it preserves mathematical notation in a human-readable form (§3.1).

## technique 2: constrained LaTeX-to-Lean autoformalization
Use this when a normalized mathematical statement must become a short theorem declaration. The prompt asks for Lean 4 code, leaves the proof as `by sorry`, forbids extra variables, assumes `import Mathlib`, fixes theorem naming as `DF_{sec}_{subsec}_{exercise_num}`, and requires separate names for subproblems (§3.2, p. 3). The paper says the prompt “enforces consistent naming, avoids unnecessary auxiliary definitions, and ensures compatibility with Mathlib.” (§3.2, p. 3)

Steps:
1. Rewrite an exercise as a self-contained theorem rather than an instruction. Inline notation and hypotheses inherited from surrounding text (§3.3, p. 3–4).
2. Give that rewrite to the constrained LLM prompt.
3. Inference: accept a declaration only as a statement candidate; `sorry` is a placeholder (the paper calls the outputs “theorem statements with sorry placeholders”, §3.2), not evidence of a proof.
4. Edit the candidate when its statement does not exactly correspond to the rewrite (§3.3, step 3, p. 4: the contributor “is responsible for verifying that the final Lean statement is in exact correspondence with the informal rewrite”).

Inference: In Verus, use a typed `spec fn` and `requires`/`ensures` contract around a Rust function, with ghost values for mathematical state where needed. Verus has no Lean `by sorry`; an unfinished proof must stay an explicit proof obligation, and executable code must not rely on a proof function. The paper’s naming and “no extra variables” constraints transfer as interface discipline, but Lean syntax and Mathlib names do not.

## technique 3: two-stage informal–formal correspondence review
Use this whenever elaboration can succeed while semantics are wrong. Every exercise receives two human reviews: a contributor prepares it and an independent maintainer checks semantic correspondence (§3.3, p. 3: “at least two authors, a contributor who prepares it and a maintainer who reviews it”). The workflow is: select an unformalized exercise; write the self-contained informal rewrite; formalize directly or start from an LLM candidate; submit both in a pull request of at most ten exercises; GitHub Actions elaborates every declaration against pinned Lean and Mathlib; the maintainer reviews the pair; resolve disagreements; merge (§3.3, pp. 3–4). The paper states: “Successful elaboration is necessary but not sufficient: a statement can elaborate yet be mathematically vacuous.” (§4.1, p. 5)

Inference: A Verus workflow should likewise require a human to compare the source requirement with the Rust contract after `verus` accepts it. Add semantic review for weakened `requires`, vacuous `ensures`, unconstrained ghost values, and quantifier changes. Compilation is evidence about syntax and the encoded proposition only; it is not evidence that the proposition is the intended requirement.

## technique 4: compiler-grounded retry loop
Use this when a model can repair syntax and type errors from concrete compiler feedback. Six systems were compared: five single-shot baselines and Codex in a loop. Codex (GPT-5 backbone) retries with failed code and Lean’s error message until elaboration succeeds or an iteration budget is exhausted, with no human intervention inside the loop; the paper says that, because of compiler-grounded retries, Codex “is not directly comparable” to the single-shot baselines and is a reference point (§4, pp. 4–5). On all 1,966 exercises, GPT-5 had 867 any-pass (44.1%), Goedel-Formalizer 711 (36.2%), and Codex 1,877 (95.5%); `any_pass` means at least one declaration elaborated, while `all_pass` requires every declaration (§4.1 and Table 1, p. 5). The compiler used Lean 4 v4.29.1 and Mathlib revision 5e932f9 (§4.1, pp. 4–5). The paper reads the gap as “compiler-grounded retries close most of the gap left by single-shot generation” (§4.1, p. 5).

Inference: In Verus, feed verifier diagnostics back into an agent loop, but cap retries and retain every candidate. A passing retry can repair a missing type or lemma while silently changing the contract, so the correspondence review remains mandatory.

## technique 5: suspicious-pattern and semantic checks
Elaboration misses vacuous or wrong mathematics. The authors add eleven suspicious-statement patterns (C1–C11; defined in Appendix A.1, p. 12–13) and an LLM semantic check (§4.1–4.2, pp. 5–6). Claude Opus 4.7 scores each file on mathematical objects, hypotheses, conclusion, structure (quantifiers/connectives), and specificity, returning faithful, partial, unfaithful, or vacuous plus a 0–5 score (§4.2, p. 6). On the 1,989 Codex files, the mean score was 3.56, with 51.2% faithful, 38.4% partial, 5.8% unfaithful, and 4.6% vacuous (Table 3, p. 6; denominator is files judged, which may differ from 1,966 exercises). Human review remains the reference because “The judge is itself an LLM: its absolute scores are not calibrated against expert review.” (§4.2, p. 6)

Inference: For Verus, use static checks for empty or trivially true postconditions, unconstrained variables, and contracts that never mention the returned state. Treat an LLM semantic score as triage, never as proof evidence.

## technique 6: answer-embedded formalization and anti-hacking checks
Some exercises ask for all answers, so a direct theorem can leak the answers into its statement. The paper’s example asks for orders of all elements of Z/12Z. GPT-5’s formalization hard-codes each numerical answer, which tests only verification of a given answer; the authors instead define an `answer` function with placeholders and state `∀ i : ZMod 12, addOrderOf i = answer i` (§5.1.2, p. 7). This still admits a hack: define `answer i := addOrderOf i`, making the theorem `rfl`. They therefore run a Python script checking problem-specific specifications, replace placeholders with submitted answers, and verify the resulting proof (§5.1.2, p. 7).

Inference: In Verus, separate a claimed output from the specification that independently checks it. A postcondition that merely restates the implementation is circular. Use ghost reference computations or independently defined predicates and reject contracts that syntactically mirror the executable result.

## technique 7: AI as a second reader for semantic defects
The paper uses Claude Opus 4.7 and Aristotle to help correct autoformalized statements “or even human-formalized statements that contained errors” (§5.2, p. 8). Opus 4.7 found that a hand-written product-of-inverses statement (Exercise 1.1.15) gave the inverses in the wrong order and suggested reversing the list. Aristotle found the counterexample (n, p) = (1, 3) to a faithful formalization of Exercise 2.3.21: in Lean natural-number subtraction gives 1 − 2 = 0, so the textbook statement needs n ≥ 2 (§5.2, p. 8). This catches errors that syntax checks cannot.

Inference: A Verus agent can independently challenge contracts with counterexamples or boundary values, but any repaired contract needs human acceptance against the source requirement.

## techniques for the catalog
- OCR normalization — render and crop source pages, then obtain notation-preserving LaTeX
- constrained autoformalization — prompt an LLM for a minimal, consistently named theorem statement
- two-stage correspondence review — combine compiler elaboration with independent semantic sign-off
- compiler-grounded retries — repair candidates using concrete verifier errors within a fixed budget
- semantic and anti-vacuity screening — use suspicious patterns, independent judges, and problem-specific checks
- answer anti-hacking — separate answer discovery from proof and reject circular definitions
