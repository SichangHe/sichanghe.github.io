# AI IDEs or Autonomous Agents? Measuring the Impact of Coding Agents on Software Development
(authored by agents unless marked 🧑)
Tag: `agarwal2026autonomous`, [paper](https://doi.org/10.1145/3793302.3793589)

## scope and claims
Agarwal, He, and Vasilescu study repository-level effects of autonomous coding-agent pull requests. The paper asks three questions: velocity, software quality, and whether prior IDE-based AI changes agent effects (section 1, page 1). Its abstract states: “We present a longitudinal causal study of agent adoption in open-source repositories using staggered difference-in-differences with matched controls.” The unit is a repository-month; treatment is observable agent adoption, so estimates are intent-to-treat effects rather than effects of measured usage intensity.

The central measured result is a speed–maintainability trade-off. The abstract reports “static-analysis warnings and cognitive complexity rising by roughly 18% and 39%”. Table 2 gives denominators through matched sample counts: agent-first (AF) has 401 treated plus 606 controls and IDE-first (IF) has 117 treated plus 73 controls (section 3.1, page 3). The table's average post-adoption changes are AF/IF: commits +36.25%/+3.06%; lines added +76.59%/−6.34%; static-analysis warnings +17.73%/+19.00%; code complexity +34.85%/+42.87%. These percentages are exponentiated log-treatment coefficients, not pass rates.

## technique 1: recover treatment and prior exposure from repository history
Use this when adoption time and tool identity are not directly recorded. The paper's procedure is:

1. Start from AIDev v3, which links GitHub repositories to agent-generated pull requests and evidence such as multi-file edits (section 3.1, page 3).
2. Define adoption as the earliest month containing an agent-attributed pull request. To reduce left censoring, parse every pull request from January 2024 through November 2025 even though AIDev begins in December 2024.
3. Assign mutually exclusive labels with a cascading signal order: branch prefixes; PR-author logins; first-commit author names; GitHub actor type; otherwise human. Claude attribution additionally searches descriptions, comments, and reviews for co-authorship patterns.
4. Require at least 10 stars and at least 10 agentic PRs per treated repository.
5. Detect prior IDE use by monthly scans for Copilot, Cursor, or WindSurf configuration artifacts. AF has no traces; IF has IDE activity before its first agent PR.

The paper explains why signal recovery matters: “Correctly recovering the earliest agentic PR is essential because adoption timing determines treatment assignment in our causal design”. Evidence is the resulting 401 AF and 117 IF treated repositories, with matched controls; remaining misclassification is expected to attenuate effects toward zero (section 3.1, page 3).

Inference: In Verus, the analogous safeguard is provenance in every change: record the agent and baseline commit in machine-readable metadata, then require a verified PR to reference that metadata. Rust/Verus cannot prove that GitHub labels are truthful; this remains an external trust boundary. A CI check can enforce that a claimed agent change has a complete audit record, while `assert`/`ensures` prove code properties after attribution.

## technique 2: matched staggered difference-in-differences
Use this when repositories adopt at different times and treatment effects can differ by cohort. The paper first fits propensity scores by logistic regression using repository age, six monthly covariate lags, and cumulative historical covariates. It subsamples at most 10,000 candidate controls per month, reports propensity-model AUC 0.92–0.99, and matches each treated repository to at most three controls with similar propensity and the same primary language (section 3.3, page 3). It then uses Borusyak et al.'s imputation estimator, event studies, repository-clustered standard errors, later adopters and never-adopters as counterfactuals.

The paper's methodological claim is explicit: “We estimate effects using DiD with staggered adoption: later adopters serve as controls for earlier adopters prior to adoption; never-adopters provide additional counterfactuals.” Outcomes are monthly commits, lines added, SonarQube static-analysis warnings and cognitive complexity, duplicate-line density, and comment-line density; covariates include lines of code, age, contributors, stars received, issues, and comments (sections 3.2–3.3, page 3).

Inference: For VL, use the same separation between cohort assignment and proof outcome: stratify benchmarks by first-verifier exposure, match projects on pre-treatment complexity and size, and report event-time effects. Verus can verify metric computations over a fixed dataset, but causal assumptions (conditional independence, no hidden confounder, valid parallel trends) remain statistical assumptions outside the verifier.

## technique 3: quality gates that measure maintainability debt
Use quality metrics alongside throughput because speed can hide structural regressions. The study finds duplicate density small and inconsistent, while complexity and warnings persist. AF's dynamic complexity rises 20.7% at adoption and about 49% by month five; IF is elevated from month −2 through month 6. The authors recommend “complexity-aware review of agent pull requests, routine refactoring, comprehensive automated tests”.

Inference: A VL deployment can turn these into gates: reject a generated Rust change unless Verus verification succeeds and complexity, warning, and test thresholds stay within policy. Verus proves functional contracts and invariants, not SonarQube's cognitive-complexity definition; the metric checker is therefore trusted software and should be versioned and audited.

## what is proved, trusted, and limited
The paper measures repository-level associations under a quasi-experimental design; it does not prove that agents caused every warning, nor does it measure developer-level interaction or usage intensity. It acknowledges isolated significant pre-treatment coefficients and says they are “concerning” limitations, although not pervasive enough to establish a clear parallel-trend violation (section 4, page 4). AF/IF counts and Table 2 percentages use different denominators (repository cohorts versus log-scale effects); percentages should not be read as repository fractions. The paper does not evaluate Verus or formal proofs. Inference: the threat to agent-written verified Rust is high for maintainability and provenance, but functional verification can catch classes of defects that static-analysis-warning counts only proxy.

## techniques for the catalog
- repository provenance recovery: infer agent adoption and prior IDE exposure from ordered branch, author, bot, and configuration signals
- matched staggered DiD: estimate heterogeneous adoption effects after propensity matching and event-study checks
- maintainability quality gate: pair throughput with static warnings, complexity, duplication, and comment-density monitoring
Checked 2026-10-15 against paper agarwal2026autonomous: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
