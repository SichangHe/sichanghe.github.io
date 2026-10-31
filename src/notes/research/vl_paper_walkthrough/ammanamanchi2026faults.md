# Faults in Our Formal Benchmarking: Dataset Defects and Evaluation Failures in Lean Theorem Proving
(authored by agents unless marked 🧑)
Tag: `ammanamanchi2026faults`, [paper](https://arxiv.org/abs/2606.29493)

## central boundary

This paper audits five Lean theorem-proving benchmarks and their forks. Its premise is that a checked proof establishes only the formal statement that Lean received. The abstract states: “the kernel only checks that a proof establishes a formal statement; it does not verify that the statement faithfully encodes the intended informal problem, nor that evaluation harnesses are robust to trivial or adversarial solutions.” (Abstract, p. 1.) The authors found 4,833 static-checker findings, including 398 with machine-checkable certificates, across about 10,000 problems (Abstract, p. 1; Table 4, p. 7). These are signals across forks and are not deduplicated benchmark error rates.

The pipeline has five stages: informal problem, formalization, model/prover, Lean kernel, and reported metric (What Formal Benchmarking Certifies, pp. 2–3). The kernel is a narrow trust boundary: it certifies that a proof artifact establishes the Lean statement, but not source correctness, translation fidelity, or harness reporting. The taxonomy therefore separates fidelity issues, evaluation loopholes, and maintenance decay (p. 3).

## technique: a fault taxonomy tied to repairs

Use the taxonomy before choosing a checker. Specification errors omit hypotheses, constraints, or subgoals and can make a theorem weaker; formalization errors mis-translate the intended statement; domain and definition mismatches use the wrong type or library concept; Lean-encoding hazards include natural subtraction truncation and division by zero; evaluation failures include axiom injection, `native_decide`, unsafe tactics, and frontend bugs; maintenance failures include version drift and fork proliferation (Table 2, p. 4).

How to apply it.

1. Preserve the informal source and check whether it is true, well-posed, and unambiguous (Step 1, p. 2).
2. Compare every requirement with the Lean statement, including hypotheses and secondary requests such as equality cases; classify omission as a specification defect (Section 3.1, pp. 3–4).
3. Check domains, quantifiers, definitions, coercions, and totalized arithmetic; classify a wrong translation separately from a missing requirement (Table 2, p. 4).
4. Audit the proof environment and harness for axioms, `sorry`, `native_decide`, unsafe tactics, and version-specific bypasses (Section 3.2, p. 4).
5. Record Lean/mathlib versions, fork lineage, and corrected snapshots so maintenance drift is visible (Section 3.3, p. 5).
6. Match the repair to the category: add omitted content, correct encoding, tighten the harness, or pin and maintain dependencies (Section 3, p. 3).

The paper's examples show why the distinction matters. A ProofNet exercise omitted the source’s finite-dimensionality hypothesis (Figure 2, p. 3). A miniF2F problem omitted “determine when equality occurs” (Figure 3, p. 3). An incorrect ProverBench Pell equation swapped variables in its claimed general solution, which no encoding change can repair (Section 3.3, p. 5).

Verus form.

## technique: deterministic static checkers with semantic guard proving

The authors implement Lean 4 metaprograms that traverse elaborated expressions. Their method combines syntactic pattern matching with semantic guard proving: for guard-based checks, a potential hazard is reported when the required guard cannot be proven automatically. The paper says: “Our approach combines syntactic pattern matching with semantic guard proving: when a potentially problematic pattern is detected, we attempt to discharge the necessary guard condition using tactics like omega, assumption, and simp.” (Section 4.1, p. 6.)

Apply it as follows.

1. Parse and elaborate Lean source to an expression tree (Appendix F, p. 24).
2. Traverse subexpressions and match checker patterns, including division/modulo/inverse, natural subtraction, integer division, integer-to-natural conversion, analytic functions, empty domains, unused binders, and zero-indexed ranges; separately check counterexamples, vacuity, and axioms (Table 9 and Appendix F.1–F.4, pp. 23–25).
3. For guard-based arithmetic checks, construct the needed guard: divisor nonzero, `b ≤ a` for `a - b` on `Nat`, or a domain condition such as `0 ≤ x` for `sqrt` (Appendix F, pp. 23–24).
4. Attempt the guard proof; Appendix F.4 lists the implementation sequence as `omega`, `assumption`, and `simp [*]`. Collect guard-based findings when the pattern matches but the proof fails (p. 25). Appendix F’s explanatory list instead orders these tactics as `assumption`, `simp`, and `omega` (p. 23).
5. Emit the expression and location, whether a guard was found, how it was proven, and a suggested fix (Appendix F, p. 23).
6. Treat counterexamples, vacuous hypotheses, and user axioms as soundness findings. For example, the vacuity checker tries to prove `¬H` for an implication `H → C`; a successful proof means the theorem is trivially true (Appendix F.1, p. 24).

Table 4 reports 10,318 problem entries, 4,833 findings, and 398 proven findings; Section 4.1’s prose instead says 399 proven issues (pp. 6–7). The category columns need not sum to totals because one statement may trigger several checkers and smaller categories are omitted (Table 4 caption, p. 7). For the labeled guard-warning evaluation, Table 5 reports that Gemini 3.0 Flash achieved 83.3% accuracy, 0.89 precision, and 0.86 recall at $0.09; GPT-5.2 achieved 81.8%, 0.92, and 0.83 at $0.18 (Table 5, p. 7). The paper describes this evaluation as 55 manually labeled examples, not all benchmark findings (Section 4.1, p. 6; Appendix G.2, p. 25). Inference: its reported percentages should be treated cautiously because Table 10’s counts do not consistently reproduce its metrics; for example, Gemini’s five false negatives among 42 true positives imply recall 37/42, approximately 0.88, rather than 0.86.

Verus form. Inference: implement analogous checks as a source-to-source linter for Verus. Look for arithmetic on bounded integers, missing nonzero assumptions, unconstrained sequence indexes, empty quantification domains, and trusted declarations. Use a deterministic proof attempt or a bounded counterexample generator to discharge guards, then report the exact expression and suggested contract repair. The checker should not treat a successful Verus proof as evidence of specification fidelity.

## technique: high-recall LLM semantic audit after static screening

Static checks cannot decide whether a formal statement captures informal intent. The paper separately evaluates semantic auditing: provide an LLM the natural-language statement, Lean statement, one error-category definition, and three few-shot examples; request a structured classification and explanation (Section 4.2 and Appendix H, pp. 6, 27). The recommended workflow is: “(1) run static checkers to flag syntactic hazards cheaply and deterministically, then (2) apply LLM-based semantic review as a high-recall screen for problems that require semantic judgment.” (Section 4.2, p. 7.) Human review remains final adjudication.

The semantic evaluation used a curated challenge set of 92 problems × six categories = 552 classifications; it was not used to estimate benchmark-level defect prevalence (Section 4.2, p. 6). Sonnet 4.5 with thinking had recall 0.82, precision 0.30, F1 0.42, and 68.1% accuracy at $13.71; GPT-5.2 with thinking had recall 0.91, precision 0.24, F1 0.37, and 54.6% accuracy at $6.86 (Table 6, p. 7). Appendix H, Table 13 (p. 26), instead reports Sonnet recall as 0.87 with the same precision, F1, accuracy, and cost. Separately, the paper evaluates guard-warning filtering on 55 labeled examples, then applies GPT-5.2 filtering to ProverBench’s 325 problems: warnings fall from 427 to 277 (35.1%); the authors report that manual verification preserved all known true positives (Appendix G.2–G.5, pp. 25–26). Table 7 (p. 7) reports formalization-error F1 of 0.18 for Sonnet and 0.15 for GPT-5.2 with reasoning. Inference: these results support using the models for triage with human adjudication.

Verus form.

## technique: release hardening and score audit

The paper proposes these release controls. Use `proof wanted` instead of `sorry`: the former exposes a theorem signature for type checking without adding an axiom usable by later proofs (Lessons Learned, p. 8). Set `autoImplicit false` so undeclared variables fail at formalization time rather than silently becoming implicit parameters (p. 8). Ban user axioms in dataset files and run basic arithmetic/domain checkers (p. 8). Pin Lean/mathlib versions and document fork lineage (pp. 5, 8). The paper also calls for checking every requirement rather than only the main claim (Section 5, p. 8). Inference: these controls address different faults and should be combined.

To measure impact, the authors selected 20 mechanically proven issues, manually corrected them, and evaluated provers on original and corrected statements across four datasets. Both models solved 0/20 original statements; after correction, DeepSeek-Prover-V2-7B solved 3/20 and Kimina-Prover-8B solved 2/20 (Section 4.3, p. 7). Defects can inflate scores when a weakened formalization is easier, or deflate scores when an incorrect statement is impossible; the opposing effects can coexist and partially cancel, so headline pass rates remain unreliable without item-level quality data (p. 7).

## what is proved, trusted, and left open

The Lean kernel gives certainty about a proof of a given formal statement. It does not certify the natural-language source, the translation, the allowed tactic policy, the environment's absence of axioms, or the reported metric (Section 2, p. 3). Static checkers are deterministic but cannot assess mathematical intent; LLM audits require human verification (Section 4, p. 6), and their limitations include cost and nondeterminism (Appendix G.6, p. 26). The authors explicitly do not claim a complete human-verified enumeration of all defects (Limitations, p. 9). Inference: for agent-written verified Rust, this motivates checking contract fidelity, trusted external bodies, and evaluation harnesses alongside proof success; the paper does not rank these risks for Rust.

## techniques for the catalog

- fault taxonomy — classify source, specification, encoding, evaluation, and maintenance failures so each receives the matching repair
- semantic-guard static checking — detect arithmetic and soundness hazards, then prove required guards with deterministic tactics
- high-recall semantic audit — use LLM classification only after static screening and send findings to human adjudication
- release hardening — use `proof wanted`, disable auto-implicit, ban user axioms, pin versions, and audit score denominators
