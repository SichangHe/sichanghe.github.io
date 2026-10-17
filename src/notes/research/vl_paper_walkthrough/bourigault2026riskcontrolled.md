# Risk-Controlled Lean-as-Judge for Natural-Language Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `bourigault2026riskcontrolled`, [paper](http://arxiv.org/abs/2605.28365v1)

## problem and central finding
The paper treats Lean output as partial evidence for selecting an answer generated in natural language. It says: “A verified proof gives strong positive evidence for the formal statement, but any stage can fail for reasons unrelated to the truth of the original informal answer.” (Section 2, p. 2). The introduction says a failed proof “may also reflect an ill-typed formalization, missing library context, or a proof-search timeout” rather than an incorrect answer (Section 1, p. 1). The authors emphasize: “Missing formal evidence is not evidence of mathematical falsehood.” (Section 6, p. 6). Their COVCAL selector accepts a formal answer only when a predeclared threshold rule on coverage diagnostics fires, and the rule is chosen so that a finite-sample selective-risk certificate holds; otherwise it abstains (Sections 1 and 5).

On a filtered MATH-500 subset of 378 problems, the pipeline samples 32 candidate solutions, normalizes them into answer classes, formalizes the top four, and records `proved`, `typechecked`, `timeout`, `illtyped`, or `unformalized` statuses (Section 7, p. 6; the status set is Eq. 3, p. 3). The key result is a coverage cliff: the highest-weight proved class is correct 96% of the time when proved coverage is at least 0.75, but 20% when it is below 0.25 (Table 2, p. 7). This is an empirical result for this dataset and pipeline.

## technique 1: answer-class partial-observation model
What it is: aggregate equivalent candidate strings into classes and compute typed coverage, proved coverage, unresolved-rival mass, and formal margin over class weights.

When to use it: use it when multiple sampled answers may be equivalent and when non-proof is ambiguous rather than a negative label.

Steps from the paper:
1. Extract each candidate’s final answer and normalize it by algebraic simplification, exact string normalization, or formal equivalence checks when available (Section 3, p. 3).
2. Sum candidate weights within each class, with weights summing to one (Eq. 2, p. 3).
3. Attempt one or more Lean artifacts per candidate; record the best status in the five-status set (Section 3, p. 3).
4. Set class indicators `P_c` (some candidate in the class has status proved) and `T_c` (some candidate has status proved, typechecked, or timeout; timeout counts because proof search runs only after elaboration) (Eqs. 4–5, p. 3).
5. Compute typed coverage as the weight of classes with `T_c`, proved coverage as the weight with `P_c`, and choose the highest-weight proved class (Definitions 1–2 and Eq. 11, pp. 3–4).
6. Compute unresolved rival mass as the largest weight among classes other than the winner that are not proved (zero if none), and margin as winner weight minus rival mass, with margin −∞ if no class is proved (Definition 3, p. 4). Reject formal selection by default if two inequivalent classes are both proved (Section 4, p. 4).

Verus form: Inference: the same model can wrap agent-written Verus functions. Define answer classes over candidate specifications or claimed outputs, run Verus, and distinguish verified, elaborated/typechecked, timeout, ill-typed, and unverified. Inference: a Verus proof establishes the formal contract; it does not show that the contract matches the product requirement. Class normalization and unresolved-rival handling remain product code, not Verus constructs.

Evidence and limits: Table 2 uses 378 items; 283 have proved coverage below 0.25 with proof rate 0.035 and winner accuracy 0.20, while 85 have coverage at least 0.75 with proof rate 1.000 and winner accuracy 0.96 (Table 2, p. 7). The caption defines winner accuracy as the accuracy of the highest-weight proved class among problems with a proof, so the denominator is the proved problems in the bin, not the displayed count. Inference: since the table gives 0.035 × 283 ≈ 10 proved problems in the lowest bin, the 20% rests on about 10 problems. These bins show association, not a causal guarantee.

## technique 2: finite-sample risk-controlled thresholding
What it is: choose cutoffs for typed coverage, proved coverage, and margin from a finite grid, then certify selective error with a one-sided Clopper–Pearson bound.

When to use it: use it when acceptance may abstain and calibration examples are exchangeable with deployment examples.

Steps from the paper:
1. Fix a finite threshold grid and freeze candidate generation, normalization, formalization, proof search, and diagnostics before calibration (Section 5, p. 4; Section 6, p. 5; Appendix B).
2. For a threshold tuple τ, accept only when typed coverage, proved coverage, and margin are each at least their cutoffs, a formal winner exists, and there is no conflict (Eq. 12, p. 4).
3. In the Bonferroni regime, search all grid cells on calibration data and select the cell with the most accepted calibration examples whose Clopper–Pearson upper bound, at level δ divided by the number of grid cells, is at most target risk ε (Eq. 13, p. 4).
4. In dev-then-cal, choose a threshold only on an independent development split (the paper’s example: the highest-coverage grid cell whose empirical dev error is at most ε; Appendix B uses the most dev accepts among cells with dev error at most ε), then test that single threshold once on calibration using a bound at level δ with no grid correction (Eq. 14, p. 4).
5. Return reject-all if no threshold is feasible; the certificate applies only to accepted formal predictions, not unresolved or fallback outputs (Section 6, p. 5).

Verus form: Inference: calibrate acceptance rules on a held-out corpus of Verus-checked candidate contracts. The acceptance predicate can require verification status, coverage of candidate mass, and a margin between verified and unresolved alternatives. The statistical bound is external Rust/Python tooling; Verus can check individual contracts but does not prove exchangeability or the Clopper–Pearson calculation. Keep calibration and deployment distributions explicit in the product specification.

Evidence and limits: the main run has development/calibration/test sizes 76/151/151, ε=0.15, δ=0.05, and a 125-cell grid (Section 7, p. 6; grid size in Section 6, p. 5, and Table 3, p. 8). With the Qwen2.5-Coder-7B autoformalizer, Bonferroni certifies on 0 of 20 bootstrap partitions and dev-then-cal on 12 of 20; where dev-then-cal certifies, COVCAL accepts 0.209 of test items with accuracy 0.932 on the accepted set, while the held-out diagnostic upper bound is 0.192, above ε (Table 1, p. 6; K=20 partitions). The 0/20 and 12/20 denominators are bootstrap partitions, not problems.

## technique 3: formalizer coverage and faithfulness audit
What it is: measure whether the autoformalizer covers enough answer mass, and manually inspect whether proved statements actually express the original problem.

When to use it: use it before trusting a verifier-based judge or training signal; proof existence alone can be misleading.

Steps from the paper:
1. Hold generation fixed and swap autoformalizers to vary formalization coverage (Section 8.3, pp. 7–8).
2. Count problems with at least one proved class and report winner accuracy by coverage and margin bins (Table 2 and Section 8.1, p. 7).
3. Audit proved artifacts by automated categories (genuine, structural, trivial, spurious), then manually audit a stratified sample of 45 for faithfulness (Section 8.2, p. 7).
4. Treat missing or unresolved formal evidence as unresolved, not false; abstain or use a fallback whose risk is not covered by the formal certificate (Sections 4–6, pp. 4–5).

Verus form: Inference: audit generated Verus contracts against the natural-language requirement, separating true-and-relevant specifications from true side facts, tautologies, and malformed statements. Keep the audit denominator and sampling procedure in reports. Inference: a Verus success rate without specification faithfulness is insufficient evidence for VL.

Evidence and limits: the 7B formalizer proves at least one class for 28% of problems; a manual audit of 45 stratified examples, reweighted by population frequency, finds only about 43% of proved statements faithful, despite 73.6% of the 314 proved artifacts being classified automatically as non-trivial and correct; in the audit, genuine proofs were faithful 6/6 and structural statements 0/6 (Section 8.2, p. 7). Goedel-Prover-V2-8B raises proved coverage from 28% to 79% and makes Bonferroni feasible on 17/20 partitions (dev-then-cal 20/20), each accepting about 48% of test items at 0.98 accepted accuracy; the 32B version reaches 64% coverage and Bonferroni 13/20 (Section 8.3, pp. 7–8; Table 3, p. 8). The manual audit uses one annotator and small strata, so its percentages are diagnostic, not benchmark-grade estimates.

## trusted boundary, failures, and VL impact
The paper says “A kernel-checked proof certifies the generated statement, not that the statement faithfully captures the informal problem” (Limitations, p. 9). Inference: the selector, answer normalization, formalizer, proof search, calibration code, and reference-answer labels are therefore trusted inputs or external assumptions. The paper states: “Faithful verification is thus rarer than proof success suggests.” (Section 8.2, p. 7). It also requires exchangeability, and dev-then-cal additionally requires independent development and calibration splits; the paper says distribution shift between calibration and deployment also voids the bound (Limitations, p. 9).

Inference: for agent-written verified Rust, the practical threat is overtrust in passing Verus contracts or in failed verification as a rejection signal. COVCAL’s abstention and faithfulness audit are directly useful guardrails, but the paper does not verify executable Rust, contracts, or product requirements. VL should not redo the paper’s generic claim that Lean proof success is useful; it should adapt the coverage, unresolved-rival, and audit ideas to Verus-specific artifacts and measure them on real tasks.

## techniques for the catalog
- answer-class coverage diagnostics — normalize equivalent outputs and compute typed/proved coverage, unresolved rival mass, and formal margin
- Bonferroni selective certificate — select a threshold grid cell with a multiple-comparison-corrected Clopper–Pearson risk bound
- dev-then-cal certificate — choose a threshold on development data and certify it once on independent calibration data
- formalization faithfulness audit — inspect whether verified statements express the original task and report denominators separately from proof success
- abstention on unresolved evidence — treat missing proofs as unknown and accept only when coverage and margin thresholds are certified
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The autoformalizer, not the certificate machinery, thus governs whether risk-controlled formal selection is possible, though the faithfulness caveat of Sec. 8.2 still applies"): read the whole paper text including appendices and checked every quotation, number (Tables 1-3, Table 2 bins, 28%/43%/73.6%/314/45, 79%/64%, 17/20, 13/20, 12/20, 0/20, 76/151/151, 125 cells), equation and section references, and the technique steps; changed page numbers (they were off by one to two pages against the PDF), the description of failed-formalization causes, the Bonferroni and dev-then-cal selection wording, the Table 2 denominator note, and marked the trusted-boundary list and one Verus sentence as Inference; did not check the PDF figures or cited works, and did not rerun any experiment. Link kept from the fetch record (arXiv 2605.28365v1, matches the paper header).
