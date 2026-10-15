# IaC-Guard-V: A Verification Framework for LLM-Generated Infrastructure-as-Code Repairs
(authored by agents unless marked 🧑)
Tag: `chauhan2026iacguardv`, [paper](http://arxiv.org/abs/2609.28488v1)

## framework and verification gates

IaC-Guard-V evaluates an LLM patch to Terraform or Kubernetes configuration with three binary gates and one informational metric. Given original artifact `A`, scanner finding `v`, and repair `A' = f(A,v)`, a verified fix passes syntactic validity (V1), target-issue resolution (V2), and regression safety (V3). Patch minimality (V4) is measured but does not decide the verdict. The paper states, “Patch minimality (V4 ) is measured but does not gate the verdict, as there is no universally accepted threshold for acceptable patch size” (Section 3.1, p. 2).

The gate definition is deliberately strict: “A verified fix requires zero regressions” (Section 3.1, p. 2). The authors also caution that “verification-guided iterative repair requires multiple LLM invocations, increasing cost and latency” (Section 6.4, p. 4).

Steps from the paper.

1. Run Checkov on the original artifact and record all failed rule IDs as the baseline (Section 4.3, p. 3).
2. Ask an LLM to repair the artifact using plain or structured prompting (Section 3.3, p. 2).
3. Parse the repaired artifact with the target parser; Checkov structured output counts as syntactic validity V1 (Section 3.1, p. 2).
4. Re-run Checkov and require the triggering rule ID to be absent for V2 (Section 3.1, p. 2).
5. Compare repaired failed-rule IDs against the baseline; any new rule is a regression and fails V3 (Section 3.1, p. 2).
6. Compute a unified diff and report changed lines divided by original lines as V4 (Section 3.1 and 3.4, pp. 2–3).

The verified-fix rate is `|{i: V1(A'i) ∧ V2(A'i,vi) ∧ V3(Ai,A'i)}| / N`, where `N` is the number of benchmark items (Section 3.2, p. 2). This excludes plausible or merely parseable repairs.

Inference: For Verus, V1 can be Rust/Verus parsing and compilation, V2 can be proof of the reported target contract, and V3 can be a regression suite of pre-existing proofs and tests. A failed Verus proof should be fed back with the exact obligation and diagnostics. This is an inferred adaptation; the paper evaluates IaC scanners, not Verus.

## technique: verification-guided iterative repair

The verify-loop starts with the structured prompt, runs the gates, and sends the original artifact, failed patch, gate results, and Checkov output back to the model. It permits two retries (three attempts total), chosen after preliminary diminishing-returns observations (Section 3.3, p. 2). The paper describes this as feedback that lets the model self-correct.

Steps from the paper.

1. Generate an initial patch with structured context: rule ID, description, violation class, resource, and line range (Section 3.3, p. 2).
2. Extract the artifact from JSON, with regex fallback if JSON parsing fails (Section 3.3, p. 2).
3. Run V1–V4 and put passed/failed gates plus scanner output in a retry prompt (Sections 3.3–3.4, pp. 2–3).
4. Generate a revised patch and repeat, at most two retries (Section 3.3, p. 2).
5. Record every attempt, token count, latency, and gate result (Section 5.3, p. 3).

Evidence: on Terraform (50 items per cell), Opus verify-loop reaches 92% VFR (95% bootstrap CI 84–98%), Sonnet 68% (54–80%), and Maverick 70% (56–82%), versus 32–50% for single-shot methods (Table III, p. 3). The denominators are 50 Terraform artifacts for each model/method. On Kubernetes (20 items per cell), Opus and Sonnet reach 100% for all methods; Maverick rises from 45% plain to 100% verify-loop (Table VI, p. 4). Most fixes occur by attempt two; a third adds only two percentage points on average (Section 6.5, p. 5).

The paper reports a failure mode: three of 50 Sonnet Terraform items (6%) pass plain prompting but fail after retry feedback because the model overcorrects. Inference: VL should retain the best verified patch across attempts rather than blindly accepting the final attempt.

## technique: benchmark and statistical protocol

The benchmark has 70 artifacts: 50 Terraform and 20 Kubernetes, each mapped to a unique Checkov rule and spanning eight violation classes (Tables II and 5.3, pp. 3). Three models (Claude Opus 4.6, Claude Sonnet 4.6, Llama 4 Maverick 17B) and three strategies produce `70 × 3 × 3 = 630` runs; temperature is zero, output limit 4,096 tokens, and Checkov is version 3.2.517 (Sections 5.1–5.3, p. 3).

The analysis reports 95% bootstrap intervals from 1,000 fixed-seed resamples, Cochran's Q, and six pre-specified McNemar exact comparisons with Bonferroni α = 0.0083 and Cliff's delta (Section 5.4, p. 3). The paper notes that five of six comparisons meet corrected significance; Sonnet verify-loop versus plain has p = 0.008 and misses the strict 0.0083 threshold while passing Holm-Bonferroni (Section 8, p. 6).

Patch minimality shows a correctness/size tradeoff. Terraform median diff ratios (changed/original lines) are 0.067–0.086 for structured prompts, 0.108–0.152 for verify-loop, and 0.162–0.478 for plain, by model (Table VIII, p. 5). V4 remains informational, so a huge but verified rewrite passes.

Inference: A Verus benchmark should stratify by defect type, keep fixed denominators for artifact, attempt, proof, and regression metrics, and report confidence intervals when comparing agents. The IaC paper's protocol is directly reusable as an evaluation pattern, while Checkov-specific gates must be replaced by Verus proof and regression checks.

## what works, what remains trusted, and threat to VL

The framework proves only scanner-defined properties. Checkov is the sole scanner; two multi-resource cases yield false-negative V2 results, and one graph rule is unresolved by every model (Section 8, p. 6). The benchmark comes from Checkov's test suite, not production repositories, and the study uses one prompt template per strategy and one model version set (Section 8, pp. 6–7). Structured prompting is worse than plain on Terraform (32–42% versus 44–50% VFR) but improves Maverick on Kubernetes from 45% to 95% (Sections 6.1 and 8, pp. 3, 6).

The trusted base includes Checkov parser/scanner behavior, baseline selection, patch extraction, prompt construction, and the LLM itself. Inference: for Verus, the corresponding risk is treating compiler success or a single proof obligation as sufficient while missing regressions in other contracts, changed APIs, or unsafe escape hatches. A mandatory V1–V3 gate and explicit regression baseline would materially reduce that threat. The paper recommends CI/CD integration and multi-scanner consensus as future work (Section 7, p. 6).

## techniques for the catalog

- three-gate verified-fix rate — require syntax, target resolution, and zero regressions, with explicit denominator `N`
- verification-guided repair loop — feed failed-gate diagnostics back to the LLM for at most two retries
- baseline-difference regression check — compare repaired scanner findings against the original set and reject new IDs
- patch minimality metric — report changed lines/original lines without conflating size with correctness
- reproducible repair evaluation — fix model settings, benchmark strata, retry count, seed, and statistical tests

Checked 2026-10-14 against the paper by a Codex agent: checked quotations, framework gates, repair-loop steps, benchmark composition, metrics, tables, statistics, and limitations; corrected nothing; did not independently verify external references or reproduce experiments.
