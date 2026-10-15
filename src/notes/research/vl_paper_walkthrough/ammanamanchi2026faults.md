# Faults in Our Formal Benchmarking: Dataset Defects and Evaluation Failures in Lean Theorem Proving
(authored by agents unless marked 🧑)
Tag: `ammanamanchi2026faults`, [paper](https://arxiv.org/abs/2606.29493)

## central boundary

This paper audits five Lean theorem-proving benchmarks and their forks. Its premise is that a checked proof establishes only the formal statement that Lean received. The abstract states: “the kernel only checks that a proof establishes a formal statement; it does not verify that the statement faithfully encodes the intended informal problem, nor that evaluation harnesses are robust to trivial or adversarial solutions.” (Abstract, p. 1.) The authors found 4,833 static-checker findings, including 398 with machine-checkable certificates, across about 10,000 problems (Abstract, p. 1; Table 4, p. 6). These are signals across forks and are not deduplicated benchmark error rates.

The pipeline has five stages: informal problem, formalization, model/prover, Lean kernel, and reported metric (What Formal Benchmarking Certifies, pp. 2–3). The kernel is a narrow trust boundary: it certifies that a proof artifact establishes the Lean statement, but not source correctness, translation fidelity, or harness reporting. The taxonomy therefore separates fidelity issues, evaluation loopholes, and maintenance decay (p. 3).

## technique: a fault taxonomy tied to repairs

Use the taxonomy before choosing a checker. Specification errors omit hypotheses, constraints, or subgoals and can make a theorem weaker; formalization errors mis-translate the intended statement; domain and definition mismatches use the wrong type or library concept; Lean-encoding hazards include natural subtraction truncation and division by zero; evaluation failures include axiom injection, `native_decide`, unsafe tactics, and frontend bugs; maintenance failures include version drift and fork proliferation (Table 2, p. 4).

How to apply it.

1. Preserve the informal source and check whether it is true, well-posed, and unambiguous (Step 1, p. 2).
2. Compare every requirement with the Lean statement, including hypotheses and secondary requests such as equality cases; classify omission as a specification defect (Section 3.1, pp. 3–4).
3. Check domains, quantifiers, definitions, coercions, and totalized arithmetic; classify a wrong translation separately from a missing requirement (Table 2, p. 4).
4. Audit the proof environment and harness for axioms, `sorry`, `native_decide`, unsafe tactics, and version-specific bypasses (Section 3.2, pp. 4–5).
5. Record Lean/mathlib versions, fork lineage, and corrected snapshots so maintenance drift is visible (Section 3.3, p. 5).
6. Match the repair to the category: add omitted content, correct encoding, tighten the harness, or pin and maintain dependencies (Section 3, p. 3).

The paper's examples show why the distinction matters. A ProofNet exercise omitted finite-dimensionality, making the Lean theorem weaker than the source (Figure 2, p. 3). A miniF2F problem omitted “determine when equality occurs” (Figure 3, p. 3). An incorrect ProverBench Pell equation swapped variables in its claimed general solution, which no encoding change can repair (Section 3.3, p. 5).

Verus form. Inference: apply the same taxonomy to VL specifications before proving Rust. Treat a missing `requires` condition as a specification defect, an incorrect `ensures` translation as a formalization defect, and an unmodeled dependency or `external_body` assumption as a trust-boundary item. Verus proofs establish their written contracts; they do not establish that contracts capture product intent. Keep source requirements beside the Verus spec and require a review artifact linking each requirement to a predicate.

## technique: deterministic static checkers with semantic guard proving

The authors implement Lean 4 metaprograms that traverse elaborated expressions. Their method combines syntactic pattern matching with semantic guard proving: a potential hazard is reported only when the required guard cannot be proven. The paper says: “Our approach combines syntactic pattern matching with semantic guard proving: when a potentially problematic pattern is detected, we attempt to discharge the necessary guard condition using tactics like omega, assumption, and simp.” (Section 4.1, p. 6.)

Apply it as follows.

1. Parse and elaborate Lean source to an expression tree (Appendix F, p. 24).
2. Traverse subexpressions and match checker patterns: counterexamples, vacuity, axioms, division/modulo/inverse, natural subtraction, analytic functions, unused binders, and zero-indexed ranges (Table 9, p. 23).
3. For each arithmetic occurrence, construct the needed guard: divisor nonzero, `b ≤ a` for `a - b` on `Nat`, or a domain condition such as `0 ≤ x` for `sqrt` (Appendix F, pp. 23–24).
4. Try `assumption`, `simp`, and `omega` in that order; report the occurrence only when the guard proof fails (Appendix F, p. 24).
5. Emit the expression and location, whether a guard was found, how it was proven, and a suggested fix (Appendix F, p. 24).
6. Treat counterexamples, vacuous hypotheses, and user axioms as soundness findings. For example, the vacuity checker tries to prove `¬H` for an implication `H → C`; a successful proof means the theorem is trivially true (Appendix F, p. 23).

The corpus audit reported 4,833 findings and 398 proven findings, but the category columns need not sum to totals because one statement may trigger several checkers and smaller categories are omitted (Table 4 caption, p. 6). On 55 labeled guard warnings, Gemini 3.0 Flash achieved 83.3% accuracy, 0.89 precision, and 0.86 recall at $0.09; GPT-5.2 achieved 81.8%, 0.92, and 0.83 at $0.18 (Table 5, p. 6). These denominators are the 55 manually labeled examples, not all benchmark findings.

Verus form. Inference: implement analogous checks as a source-to-source linter for Verus. Look for arithmetic on bounded integers, missing nonzero assumptions, unconstrained sequence indexes, empty quantification domains, and trusted declarations. Use a deterministic proof attempt or a bounded counterexample generator to discharge guards, then report the exact expression and suggested contract repair. The checker should not treat a successful Verus proof as evidence of specification fidelity.

## technique: high-recall LLM semantic audit after static screening

Static checks cannot decide whether a formal statement captures informal intent. The paper uses a second stage: provide an LLM the natural-language statement, Lean statement, one error-category definition, and three few-shot examples; request a structured classification and explanation (Section 4.2 and Appendix H, pp. 6, 27). The recommended workflow is: “(1) run static checkers to flag syntactic hazards cheaply and deterministically, then (2) apply LLM-based semantic review as a high-recall screen for problems that require semantic judgment.” (Section 4.2, p. 7.) Human review remains final adjudication.

The evaluation used 92 problems × six categories = 552 classifications. Sonnet 4.5 with thinking had recall 0.82, precision 0.30, F1 0.42, and 68.1% accuracy at $13.71; GPT-5.2 with thinking had recall 0.91, precision 0.24, F1 0.37, and 54.6% accuracy at $6.86 (Table 6, p. 6). On 55 guard-warning examples, GPT-5.2 filtering reduced ProverBench findings from 427 to 277 (35.1%), while manual verification preserved all known true positives (Appendix G, Tables 10–12, pp. 25–26). The low precision and per-category F1, especially formalization-error F1 of 0.18 for Sonnet and 0.15 for GPT-5.2 with reasoning (Table 7, p. 6), show that this is triage, not proof.

Verus form. Inference: use an LLM only to prioritize likely requirement/specification mismatches in VL, with the source requirement, Verus contract, and category definition in the prompt. Require a deterministic checker or human to confirm every finding. Never convert the LLM's “valid” answer into a proof obligation discharge or allow it to edit a contract without a separately reviewed diff.

## technique: release hardening and score audit

The paper proposes four concrete release controls. Use `proof wanted` instead of `sorry`: the former exposes a theorem signature for type checking without adding an axiom usable by later proofs (Lessons Learned, p. 8). Set `autoImplicit false` so undeclared variables fail at formalization time rather than silently becoming implicit parameters (p. 8). Ban user axioms in dataset files and run basic arithmetic/domain checkers (p. 8). Pin Lean/mathlib versions and document fork lineage (pp. 5, 8). These controls target different faults and cannot substitute for one another.

To measure impact, the authors selected 20 mechanically proven issues, manually corrected them, and evaluated provers on original and corrected statements (Section 4.3, p. 7). Defects can inflate scores when a weakened formalization is easier, or deflate scores when an incorrect statement is impossible; the opposing effects can coexist and partially cancel, so headline pass rates remain unreliable without item-level quality data (p. 7). Inference: VL evaluations should publish per-item contract audits, rejected specifications, exact tool versions, and denominator changes after correction.

## what is proved, trusted, and left open

The Lean kernel gives certainty about a proof of a given formal statement. It does not certify the natural-language source, the translation, the allowed tactic policy, the environment's absence of axioms, or the reported metric (Section 2, p. 3). Static checkers are deterministic but incomplete; LLM audits reason about semantics but are expensive, nondeterministic, and require human verification. The authors explicitly do not claim a complete human-verified enumeration of all defects (Limitations, p. 9). Inference: for agent-written verified Rust, the greatest product threat is a valid proof of an unintended or weakened contract, followed by trusted external bodies and harness loopholes. The paper's workflow should therefore be reused before optimizing proof generation.

## techniques for the catalog

- fault taxonomy — classify source, specification, encoding, evaluation, and maintenance failures so each receives the matching repair
- semantic-guard static checking — detect arithmetic and soundness hazards, then prove required guards with deterministic tactics
- high-recall semantic audit — use LLM classification only after static screening and send findings to human adjudication
- release hardening — use `proof wanted`, disable auto-implicit, ban user axioms, pin versions, and audit score denominators
Checked 2026-10-15 against paper ammanamanchi2026faults: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
