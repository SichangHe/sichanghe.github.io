# IaC-Guard-V: A Verification Framework for LLM-Generated Infrastructure-as-Code Repairs
(authored by agents unless marked 🧑)
Tag: `chauhan2026iacguardv`, [paper](https://arxiv.org/abs/2609.28488v1)

## framework and verification prerequisites

IaC-Guard-V evaluates an LLM patch to Terraform or Kubernetes configuration with three binary prerequisite checks and one informational metric. Given original artifact `A`, scanner finding `v`, and repair `A' = f(A,v)`, a verified fix passes syntactic validity (V1), target-issue resolution (V2), and regression safety (V3). Patch minimality (V4) is measured but does not decide the verdict (Section 3.1, pp. 3–4). The paper states, “A verified fix requires zero regressions.” It treats patch size separately: “We report minimality statistics to characterize repair precision.” (Section 3.1, p. 4.)

Steps from the paper.

1. Run Checkov on the original artifact and record all failed rule IDs as the baseline (Section 4.3, p. 5).
2. Ask an LLM to repair the artifact using plain or structured prompting. Plain prompting gives no specific rule or resource; structured prompting supplies rule metadata and requests JSON (Section 3.3, p. 4).
3. Extract the repaired artifact. For V1, use Checkov’s built-in parser; successful scanning with structured output counts as syntactic validity (Sections 3.1 and 3.3, pp. 3–4).
4. Re-run Checkov and require the triggering rule ID to be absent from failed checks for V2. This check operates at file level (Section 3.1, p. 3).
5. Compare repaired failed-rule IDs against the baseline; any new rule ID is a regression and fails V3. This comparison does not distinguish resources (Section 3.1, pp. 3–4).
6. Compute a unified diff and report changed lines divided by original lines as V4 (Section 3.4, p. 5).

The verified-fix rate is `|{i: V1(A'i) ∧ V2(A'i,vi) ∧ V3(Ai,A'i)}| / N`, where `N` is the number of benchmark items (Section 3.2, Equation 2, p. 4).

Inference: For Verus, V1 could be parsing and compilation, V2 proof of the reported target contract, and V3 a regression suite of pre-existing proofs and tests. Failed proof obligations and diagnostics could provide repair feedback. The paper evaluates IaC scanners, not Verus.

## technique: verification-guided iterative repair

The verify-loop starts with the structured prompt. After failed verification, its retry prompt includes the original artifact, failed attempt, prerequisite-check results, and Checkov output. The paper specifies, “We allow up to two retries (three total attempts), chosen based on preliminary experiments showing diminishing returns beyond the second retry (confirmed in Section VI-E).” (Section 3.3, p. 4.) That internal cross-reference is the paper’s wording; convergence appears in Section 6.6, p. 8.

Steps from the paper.

1. Generate an initial patch with structured context: rule ID, description, violation class, resource, and line range (Section 3.3, p. 4).
2. Parse JSON and extract `fixed_artifact`; if JSON parsing fails, fall back to regex extraction of the JSON object (Section 3.3, p. 4).
3. Evaluate V1–V4. If verification fails, include the failed attempt, original artifact, check results, and scanner output in a retry prompt (Sections 3.3–3.4, pp. 4–5).
4. Generate a revised patch, allowing at most two retries (Section 3.3, p. 4).
5. Record per-attempt verification results, token counts, and latency (Sections 3.4 and 5.3, p. 5).

Evidence: Table III (p. 6) reports Terraform VFR on 50 items per model/method: Opus verify-loop 92% (95% bootstrap CI 84–98%), Sonnet 68% (54–80%), and Maverick 70% (56–82%), versus 32–50% across single-shot methods. Table VI (p. 7) reports Kubernetes results on 20 items per cell: Opus and Sonnet reach 100% for all methods; Maverick rises from 45% plain to 95% structured and 100% verify-loop. The paper states, “Most fixes occur in attempts 1–2” (Figure 4 caption, p. 8). Section 7 clarifies, “Our convergence analysis shows that most verify-loop fixes occur on attempts 1–2, with a third attempt adding only 2 percentage points on average.” (p. 9.)

The paper reports, “Three Terraform items are fixed by Sonnet’s plain prompting but not by its verify-loop.” It attributes this to overcorrection after failed first attempts (Section 6.6, p. 8). Inference: A VL repair system could keep independently verified alternatives when comparing repair strategies. This result does not show an earlier verified patch being discarded within the paper’s loop.

## technique: benchmark and statistical protocol

The benchmark contains 70 Checkov test-suite artifacts: 50 Terraform and 20 Kubernetes, each mapped to a unique rule, across eight violation classes (Section 4 and Table II, p. 5). The paper explains the sampling purpose: “one item per unique rule, with deliberate over-sampling of minority violation classes” (Section 4.1, p. 5). Three models (Claude Opus 4.6, Claude Sonnet 4.6, Llama 4 Maverick 17B) and three strategies produce `70 × 3 × 3 = 630` runs. Temperature is zero, output limit 4,096 tokens, and Checkov is version 3.2.517 (Sections 5.1–5.3, p. 5). Section 5.1 identifies “three LLMs spanning two model families”; this differs from the abstract’s claim of three families.

The paper states, “We report 95% bootstrap confidence intervals (1,000 resamples with fixed seed) for all verified-fix rates.” It uses Cochran’s Q and six pre-specified McNemar exact comparisons on Terraform, with Bonferroni α = 0.05/6 = 0.0083 and Cliff’s delta. Kubernetes comparisons are descriptive (Section 5.4, p. 6). Section 8 says, “Five of six pre-specified comparisons are significant at the corrected threshold (α = 0.0083); the sixth (Sonnet verify-loop vs. plain, p = 0.008) narrowly misses the strict Bonferroni threshold but is significant under the less conservative Holm-Bonferroni correction.” (p. 10.) Inference: This statement is numerically inconsistent as printed, since 0.008 is below 0.05/6. The unrounded p-value is not given, so the claimed exception cannot be resolved from the paper.

Table VIII (p. 8) gives Terraform median diff ratios (changed/original lines): structured 0.067–0.086, verify-loop 0.108–0.152, and plain 0.162–0.478 across models. Inference: The table shows smaller median patches under verify-loop than plain for all three models, contrary to Section 6.5’s statement that “verify-loop patches are slightly larger than plain patches for Claude models”. V4 remains informational, so large patches can still pass verification.

Inference: A Verus benchmark could stratify by defect type, distinguish artifacts from attempts, and report confidence intervals. The evaluation pattern transfers; the Checkov-specific checks would need proof and regression checks appropriate to Verus.

## limitations and relevance to VL

Checkov is the sole scanner. The paper reports, “Two benchmark items (BM-0276, BM-0449) produce false negatives in V2 because Checkov reports the target rule as failed due to other resources in the same file, not the repaired resource.” A graph-based rule in BM-0040 is unresolved by every model (Section 8, p. 9). The benchmark comes from Checkov’s test suite rather than production repositories, and evaluation uses one prompt template per strategy and the model versions evaluated in April 2026 (Section 8, pp. 9–10). Inference: Acceptance establishes the defined Checkov checks, not deployment correctness or preservation of infrastructure intent.

Structured prompting underperforms plain on Terraform (32–42% versus 44–50% VFR, Table III, p. 6) but improves Maverick on Kubernetes from 45% to 95% (Table VI, p. 7). The broad claim of 100% syntactic validity in the abstract does not hold across both technologies: Maverick structured Kubernetes has V1 = 95% (Table VI).

Inference: For Verus, treating compilation or one proof obligation as sufficient could miss regressions in other contracts, changed APIs, or unsafe escape hatches. Explicit proof and regression prerequisites would address that risk, subject to the completeness of the specifications and checks. The paper proposes extending verification beyond Checkov: “Our framework currently relies on a single scanner (Checkov); extending to multi-scanner consensus verification is a natural next step that could further improve regression detection and reduce harness-specific false negatives.” (Section 7, p. 9.) Human evaluation of repair intent preservation remains future work (Section 8, p. 10).

## techniques for the catalog

- verified-fix rate — require syntax, target resolution, and zero new failed rule IDs, with explicit denominator `N`
- verification-guided repair loop — feed failed-check diagnostics back to the LLM for at most two retries
- baseline-difference regression check — compare repaired scanner findings against the original set and reject new IDs
- patch minimality metric — report changed lines/original lines separately from the acceptance decision
- stratified repair evaluation — select distinct scanner rules, fix settings, and report paired comparisons and confidence intervals

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The confidence intervals for verify-loop do not overlap with those of structured prompting for any model."): checked all study claims, quotations, numbers, section and PDF page references, and technique steps; corrected page references, convergence location, prerequisite terminology, extraction details, unsupported trust claims, and overbroad syntax claims; identified the paper’s statistical and patch-size inconsistencies; did not reproduce experiments, inspect the replication package, or verify cited works independently.
