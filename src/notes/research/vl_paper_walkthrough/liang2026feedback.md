# Auditing and Decomposing Feedback-Driven Evolution in LLM Test Generation under the Oracle Problem
(authored by agents unless marked 🧑)
Tag: `liang2026feedback`, [paper](https://arxiv.org/abs/2608.19626)

## what is proved or measured

The paper measures whether execution feedback really improves LLM-generated tests when the expected output is obtained from one accepted program. It studies artifact-level evolution: candidate mutation and later prompts conditioned on prior detected faults. It does not claim parameter-level self-improvement. The abstract states, “Execution feedback can make LLM test generation appear self-verifying even when generated inputs or outputs are invalid.” (Abstract, p. 1)

The unit of inference is a task, not an individual test or execution. The cohorts contain 142 development tasks, 114 external tasks and 138 qualification-amended held-out tasks; the external cohort has three accepted and 20 faulty programs per task, while E16-B has 18 faults with 9/9 folds (Table 1, p. 4). Two model conditions are a Qwen2.5-Coder-7B Instruct checkpoint merged with a fixed warm start (49 records, 33 tasks) and Qwen3.5-9B with thinking disabled. Generation uses temperature 0.7, top-p 0.8, top-k 20, repetition penalty 1.1, a 1,024-token completion limit and a 4,096-token context (Section 3.1, p. 4).

## technique 1: separate three oracle-validity questions

what it is: the paper distinguishes (a) a direct model oracle, meaning agreement of the model's own expected output with the accepted-program panel on panel-admissible inputs (a post-generation diagnostic that never affects selection), (b) a single-reference output used for selection, and (c) a multi-implementation audit after selection. The abstract reports, “A single reference inflates the apparent evolutionary gain by 9.46–14.85 percentage points; after audit, equal-budget independent resampling is 6.01–18.83 points better.” (Abstract, p. 1)

Inference: when to use: use this decomposition whenever a generated test is rewarded using execution. It prevents a reference program's behavior from being treated as semantic truth before testing whether the input is in-domain and whether independent accepted implementations agree.

how to do it:
1. For each generated pair `(x, y_m)`, run every available accepted implementation; retain a panel-admissible input only when all complete and agree on `y_A(x)` (Section 2.2, p. 3)
2. For the operational single-reference path, select `r_q` by a source hash before generation, run it on `x`, and use its output `y_r` for candidate selection (Section 2.2, p. 3)
3. Freeze the selected archive before running the remaining accepted implementations (Section 3.2, p. 5)
4. Remove an entry without replacement if any auditor fails or disagrees; report the audited score on the same frozen archive (Section 3.2, p. 5)

evidence: on panel-admissible inputs, model-proposed outputs match the accepted panel at task-level rates of 44.16% for Qwen2.5 (138 of 142 development tasks have at least one admissible input) and 58.90% for Qwen3.5 (137 tasks); external rates are 27.79% (112 of 114 tasks) and 50.12% (93 tasks) (Table 4, p. 7). The paper says fully panel-confirmed suites occur in "only 2.53% and 5.07% of external calls" (Section 4.1, p. 7; Table 4 column "Panel-confirmed suite (%)"). The introduction states, “Tasks, not individual tests or executions, are the unit of inference.” (Introduction, p. 2)

Inference: the same split applies to Verus proof agents. Treat an LLM-suggested invariant or lemma as a candidate, run the unchanged Rust program through Verus, and distinguish verifier acceptance from semantic adequacy of the specification. In Verus, write executable functions with `requires` and `ensures`, use loop `invariant` declarations for preservation, and keep proof-only reasoning in `proof fn`; do not treat an LLM-produced contract as trusted merely because it verifies.

## technique 2: equal-budget cross-fitting and audit-aware scoring

what it is: the design compares one-shot generation, deterministic mutation, and independent resampling at the same candidate-slot budget while using disjoint fault folds for selection and evaluation. The paper defines audited gain inflation as the apparent single-reference gain minus the accepted-panel gain (Equation 3, Section 2.3, p. 3).

how to do it:
1. Keep at most three parsed tests for one-shot; add six deterministic mutations for Evolve, or make two independent calls for Matched, giving nine candidate slots in each of those variants; every selected archive still contains at most three tests (Table 3 and Section 3.2, p. 5)
2. Select against one search fold and evaluate held-out kill on the other; swap the roles in the second direction (Section 3.2, p. 5)
3. Average seeds within each task before bootstrap inference (Section 3.2, p. 5)
4. Compute single-reference and audited held-out constrained kill on the identical frozen archive, then compare Evolve with Matched (Sections 2.3 and 3.2, pp. 3, 5)

Evidence: apparent Evolve-over-One-shot gains are 10.58 and 13.38 percentage points for the two development models and 11.58 and 12.57 externally; audited gains are −0.02, −1.47, 2.12 and 2.18 points. Inflation is therefore 10.60, 14.85, 9.46 and 10.39 points, with every 95% interval strictly above zero (Table 5, p. 7). Matched independent resampling exceeds Evolve by 18.83 and 9.72 points on development and 10.91 and 6.01 externally; all four intervals are strictly below zero for Evolve minus Matched (Table 6, p. 8).

Inference: a Verus repair benchmark should similarly separate the proof obligations used to choose a candidate from held-out obligations and compare mutation against independent samples at equal verifier-call or candidate budgets. A passing proof on the search subset is not evidence of general correctness on the held-out subset.

## technique 3: placebo for aligned feedback

what it is: the paper tests whether behavior-aligned feedback adds value beyond an iterative prompt, history and coarse progress. Real feedback maps each input to search-fold faults it detects. The placebo preserves template, rounds, history size, detected-set cardinality and the multiset of the two largest per-input kill counts, but randomly reassigns the input–fault mapping (Section 3.3, p. 5). The abstract reports, “Real–Placebo contrasts are +0.13 and −0.50 points.” (Abstract, p. 1)

how to do it:
1. Share the first call, then give two later rounds bounded prior inputs and opaque search-fault identifiers (Section 3.3, p. 5)
2. For placebo, retain the same history and density statistics but randomize the correspondence between inputs and fault identifiers (Section 3.3, p. 5)
3. Compare audited Real–Placebo, not only each intervention against plain resampling (Equation 4, p. 3)
4. Interpret zero-crossing intervals as no detected benefit, not equivalence (Section 3.5, p. 6)

Evidence: on external tasks, Real–Placebo is +0.13 points [−1.56,+1.80] for Qwen2.5 and −0.50 [−2.13,+1.08] for Qwen3.5 (Table 9, p. 10). On E16-B, contrasts are +1.99 [+0.08,+3.88] and +0.28 [−1.41,+2.03]; both decisions are inconclusive under the frozen ±2-point rule (Table 10, p. 10): the first interval fails the superiority threshold and the second misses the equivalence boundary by 0.03 points (Section 4.6, p. 10). The paper states the external placebo is post hoc and the held-out cohort was qualification-amended, so RQ6 gives "diagnostic boundary evidence, not a pristine confirmation" (Abstract, p. 1). Post-hoc reference-valid matching changes them to −0.30 [−0.90,+0.30] and +0.78 [−0.62,+2.19] (Table 11, p. 10).

Inference: for Verus, a placebo repair loop can keep error-message counts, history length and iteration count while shuffling which diagnostic is linked to which candidate. This tests whether targeted diagnostics help beyond extra prompting; it does not replace an independent Verus check.

## technique 4: blinded semantic audit of disconfirmed candidates

what it is: two software-engineering doctoral reviewers inspect a stratified sample of 300 panel-disconfirmed inputs while blinded to method, program behavior, fault detections and panel outcome. Each chooses valid, out-of-domain, malformed, ambiguous or insufficient information and derives an expected output for valid cases (Section 3.4, p. 6).

how to do it:
1. Sample 150 development and 150 external cases using locked strata (Section 3.4, p. 6)
2. Give reviewers only the statement, public examples and candidate input; conceal generation and execution metadata (Section 3.4, p. 6)
3. Report exact agreement, Cohen's kappa and design-weighted estimates with 10,000 within-stratum bootstraps (Section 3.4, p. 6)
4. Reserve disagreements and jointly valid cases for consensus or a third reviewer, without folding that targeted packet into population estimates (Sections 3.4 and 4.5, pp. 6, 9)

Evidence: the reviewers agree on the five-class label for 275/300 (91.67%, κ=.823), and on valid versus other for 293/300 (97.67%, κ=.825). The design-weighted estimate is 94.41% jointly invalid [91.85,96.51] and 3.60% jointly valid [2.23,5.14] (Table 8, p. 9). The paper notes that exceptions preclude treating panel disagreement as semantic truth (Section 4.5, p. 9).

Inference: an analogous Verus audit should have a human inspect whether a verified contract states the intended safety property, separately from whether the SMT proof succeeds. This is review evidence about specification meaning, not a substitute for the verifier.

## trusted boundary, contradictions and scope

The paper uses 20,000-resample paired task-level bootstraps and 95% intervals; external prerequisite checks were frozen: inflation must have a positive lower bound and audited Evolve–Matched must have an upper bound no greater than +2 points (Section 3.5, p. 6). It reports SHA-256 locks for artifacts and bubblewrap limits for external execution (Section 3.5, p. 6). The trusted semantic contract remains outside the accepted-program panel, and accepted implementations may share defects (Section 2.2, p. 3). Inference: Verus's checked proof is the mechanical boundary, while the intended specification, generated annotations and any LLM diagnosis remain assumptions requiring review.

## techniques for the catalog

- three-level oracle audit — separate direct model output, single-reference execution, and multi-implementation agreement before crediting a test
- cross-fitted equal-budget evaluation — use disjoint selection/evaluation faults and compare mutation with independent resampling at equal candidate slots
- density-matched placebo — preserve iterative scaffolding and coarse progress while randomizing behavior-specific feedback links
- blinded semantic audit — review panel-disconfirmed candidates independently of execution metadata and report weighted uncertainty
