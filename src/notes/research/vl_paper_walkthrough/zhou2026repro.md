# RePro: Proof-Verified Benchmark Rewriting for Reliable Evaluation of LLM Mathematical Problem Solving
(authored by agents unless marked 🧑)
Tag: `zhou2026repro`, [paper](http://arxiv.org/abs/2609.00062v1)

## purpose and claim

RePro rewrites benchmark questions to reduce memorization and contamination, then retains only rewrites whose formal statements and answers pass a Lean verification pipeline. The abstract states: “Only instances whose reference answers have a formally verified proof are retained, ensuring that the released benchmarks contain only problems with formally verified answers.” (Abstract, p. 1.) The system targets GSM8K and MATH and uses an LLM rewriter, a feasibility screen, a Lean formalizer, a Lean-oriented automated theorem prover (ATP), Lean kernel checking, and proof-grounded answer extraction.

The paper describes the intermediate semantic gate precisely: “The semantic check performs an LLM-assisted conservative alignment screen between the rewritten natural-language problem and the Lean formal statement.” (Section 3.3, p. 4.)

For VL, the relevant pattern is verifier-gated generation: an agent can propose a Rust specification or benchmark instance, but acceptance is determined by a pinned checker and an explicit target-alignment test. Inference: RePro does not verify natural-language-to-Rust equivalence, so a Verus adaptation must preserve a separate semantic review boundary.

## technique: progressive verification pipeline

What it is. RePro has three substantive stages. Feasibility screening removes ill-defined, contradictory, ambiguous, unrealistic, or infeasible rewrites. Executable formalization converts a surviving question into Lean code, first checking syntax and then using a conservative semantic-alignment screen. Proof-level verification asks an ATP to generate a Lean proof and keeps only instances accepted by the Lean kernel. A final answer-alignment step ensures that the verified proof supports the quantity requested by the rewritten question (Sections 3.1–3.4, pp. 3–5).

How to apply it.

1. Ask an LLM to rewrite while preserving mathematical structure, solution logic, difficulty, and answer type; forbid it from solving the new problem (Section 3.2, p. 3; Appendix A, pp. 13–14).
2. Screen for missing information, ambiguity, contradictory premises, unrealistic constraints, and infeasibility (Section 3.2, p. 4).
3. Formalize the rewrite in the target checker and reject invalid syntax (Section 3.3, p. 4).
4. Compare the natural-language rewrite and formal statement for constants, units, conditions, logical structure, object type, and target quantity; query the checker three times at temperature zero and accept only three `Consistent` judgments (Section 3.3, p. 4; Appendix C).
5. Generate candidate proofs with an ATP and retain only proofs that pass Lean kernel checking (Section 3.4, p. 4).
6. Extract candidate answers only from literal spans already present in the verified proof; reject post-proof computation, normalization, simplification, or inference (Appendix D, pp. 16–17).
7. Check that the extracted span is the final target quantity and discard intermediate or wrong-target values (Appendix D, p. 17).

Verus form. Inference: use the same stages for agent-written Rust: rewrite or synthesize a task, screen its prose, compile the candidate in Verus, use a conservative prose-to-contract check, verify the original contract with Verus, and accept only if a result is copied from a verified postcondition or proof fact. Inference: a Verus proof function and `ensures` clause can play the final checker role, but no construct validates that the prose requirement was translated correctly; this remains a semantic-review stage.

Evidence and limits. RePro explicitly says the semantic screen “should not be interpreted as formal verification of natural-language-to-Lean equivalence” (Section 3.3, p. 4). The strongest guarantee is therefore only for the accepted Lean statement and its proof. Inference: this distinction is essential for VL product claims.

## technique: preserve answer traceability by literal extraction

What it is. After proof verification, RePro forbids a second reasoning process. The extractor may copy only a literal span in the Lean proof. If the proof contains `x = 17`, it may return 17; if it contains `2 + 3`, it may not compute and return 5. For multiple targets, it returns all matching spans without reordering or reformatting (Appendix D, p. 16).

When to use it. Use literal extraction when a verified artifact contains intermediate values, witnesses, or multiple possible outputs and a postprocessor could otherwise silently solve a different problem.

Verus form. Inference: require the reported Rust result to be a value appearing in a verified `ensures` fact or a named proof lemma, and record the source span or declaration. A postprocessor may not evaluate a new expression, simplify an invariant, or infer a value from unrelated proof facts. Inference: this protects the evidence chain from verifier output to product result, but it may reduce coverage for specifications whose final result is implicit.

## technique: define reliability as three separate criteria

What it is. RePro evaluates well-definedness, feasibility, and answer correctness separately. Well-definedness requires sufficient, unambiguous information and a specified target. Feasibility requires a valid solution under real-world or task-specific constraints. Answer correctness requires a verified proof and target match (Section 4, pp. 5–6). For N generated instances and criterion c, the rate is Nc/N (Section 4, p. 5).

How to apply it. Report each denominator and criterion independently; do not collapse an invalid question and an incorrect answer into one score. Keep full generated candidates as well as the retained subset so rejection effects are visible.

Verus form. Inference: report contract completeness, executable feasibility, and proof correctness separately. A function with an inconsistent precondition may verify vacuously; a complete contract can still describe the wrong behavior; and a correct proof can still fail operational requirements. These should be distinct metrics.

## technique: rejection sampling with explicit coverage accounting

What it is. RePro repeatedly samples source problems and runs the full pipeline until approximately 200 verified instances per subset are available (Appendix E, pp. 17–18). This produces a nearly uniform retained set but changes the source difficulty distribution. Retention is 88.3% for GSM8K and 92.2%, 75.8%, 73.9%, 57.1%, and 33.7% for MATH LV1–LV5 (Appendix E, p. 18).

How to apply it. Record every candidate, failure stage, and retry count; report both the generated distribution and retained distribution; and disclose that difficult cases are filtered more often. RePro uses pass@k for ATP attempts and defaults to pass@3 because gains diminish after the second attempt (Section 6.2.3, p. 8).

Verus form. Inference: a VL benchmark should preserve rejected Rust tasks and classify whether failure came from parsing, compilation, contract mismatch, solver timeout, or missing library support. Report coverage by task difficulty and pass@k, rather than claiming that a high verified rate generalizes to all tasks.

## evidence: reliability and model sensitivity

On full GSM8K and MATH datasets, RePro reports 100% well-definedness, feasibility, and correctness for retained instances; generation rates are 88.31% for GSM8K and 59.16% for MATH (Table 1, p. 6). The comparison methods' MATH correctness rates are 79.99% for Auto-Dataset, 81.15% for ITD, and 87.36% for VarBench; GSM8K rates are 87.10%, 89.11%, and 95.14%, respectively (Section 6.1, p. 7). On the RePro-success subset, baselines remain imperfect: GSM8K correctness is 80.65%, 81.05%, and 96.77%, while MATH is 86.88%, 87.66%, and 89.23% for the same methods (Section 6.1, p. 7). The denominator is the relevant full or RePro-success subset; the paper reports percentages rather than raw counts in these tables.

The pipeline's coverage falls with difficulty. The paper reports ATP pass@32 rates on miniF2F of 68.0% for DeepSeek-Prover-V2-7B, 63.1% for Kimina-Prover-Preview-Distill-7B, and 84.6% for Goedel-Prover-V2-8B (Section 6.2.1, p. 7). On harder benchmarks, it reports 0% RePro generation success on a preliminary 30-problem AIME 2025 sample and pass@32 rates of 3.35–7.05% on FIMO and 0.31–1.53% on DeepSeek-ProverBench (Appendix E, pp. 17–18). These figures show an ATP coverage bottleneck, not a failure of Lean checking.

Proof-verified rewriting changes model scores. Qwen2-1.5B drops 21.1, 12.0, and 10.5 percentage points on MATH LV1–LV3, while Llama-3.2-3B drops on all levels with a maximum 15.1-point drop (Section 6.4, p. 9). The paper interprets this as sensitivity to reformulation and possible memorization, but it also reports improvements for some models when rewrites clarify conditions. Inference: the paired original/rewrite comparison is a useful diagnostic, not a pure measure of reasoning because surface and difficulty can change.

## what is proved, measured, and trusted

Lean proves the formalized statement and reference answer; the LLM screens and rewrites, but does not provide the correctness guarantee. The natural-language-to-Lean screen, answer extraction, and target matching are conservative auxiliary checks. The trusted base includes Lean's kernel, the formal statement, ATP-generated proof accepted by Lean, and the source benchmark's interpretation. Inference: a Verus version would additionally trust Verus, its solver, Rust compilation, imported specifications, and the semantic mapping from prose to Rust.

The paper does not establish that all mathematically equivalent rewrites are equally difficult or contamination-free. It acknowledges that stronger ATPs improve coverage and that Lean formalization excludes tasks that cannot be expressed reasonably in Lean (Limitations, p. 9). Inference: the same coverage and expressiveness limits apply to a Verus product.

## what VL should not redo and threat assessment

RePro already supplies the verifier-gated rewrite pipeline, three-part reliability metrics, literal proof-grounded answer extraction, rejection-sampling accounting, and pass@k coverage analysis. VL should reuse these patterns and focus on Rust/Verus-specific contracts, ownership, dependencies, and maintenance.

Inference: the threat to a product of agent-written verified Rust is high if the product reports only proof-pass rates or performs unconstrained postprocessing. A formally checked function may satisfy a vacuous or mis-translated contract. The threat is lower if prose-to-contract alignment is conservative, outputs are copied from verified postconditions, failed candidates remain in the dataset, and coverage is reported by task difficulty and verifier resources. RePro's own limitation makes this clear: semantic alignment is a filter, not formal equivalence.

## techniques for the catalog

- progressive verifier pipeline — screen rewrites, formalize, prove with an ATP, kernel-check, then align the target answer
- literal proof extraction — copy final answers only from verbatim spans in a verified proof and forbid new computation
- three reliability criteria — measure well-definedness, feasibility, and answer correctness with separate denominators
- rejection sampling audit — retain verified candidates while reporting failures, retention rates, and changed difficulty distribution
- pass@k coverage — vary ATP attempts, report diminishing returns, and expose verifier capability limits
- paired rewrite evaluation — compare original and proof-verified rewrites to diagnose memorization and reformulation sensitivity
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
