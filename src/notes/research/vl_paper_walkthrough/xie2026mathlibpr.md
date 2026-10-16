# MathlibPR: Pull Request Merge-Readiness Benchmark for Formal Mathematical Libraries
(authored by agents unless marked 🧑)
Tag: `xie2026mathlibpr`, [paper](https://www.semanticscholar.org/paper/f914e802fdef50d0f6dacb90be18fdc2f00f29c2)

## what the benchmark measures
MathlibPR evaluates whether a system can judge merge readiness after Lean code already builds. The final dataset contains “15,895 labeled build-passing snapshots from 12,063 PRs: 11,409 merge ready snapshots and 4,486 not merge ready snapshots.” Among merged pull requests it includes 3,687 pairs of an earlier build-passing snapshot and the ultimately accepted version (§3.2, p. 4). A not-merge-ready label means the snapshot was not ready at that point, not that the underlying contribution could never be merged.

Inference: this distinction is directly relevant to VeruLaw. A verified Rust proof is evidence of build and specification compliance, but review quality, API fit, readability, and maintenance conventions remain separate judgments. The benchmark's historical labels are a useful supervised signal, not a formal correctness theorem.

## technique 1: construct labels from repository history without build-failure shortcuts

What it is and when to use it. Recover snapshots that pass Lean's build checks, then label them by whether they were accepted into Mathlib. Use this to test reviewer judgment rather than syntax or compilation. The paper says: “Since every example already builds, the benchmark rules out trivial strategies based on syntax errors or compilation failure and focuses on reviewer-like judgment.”

How to apply it. (1) Start with closed Mathlib4 PRs. (2) Retain PRs that change Lean files. (3) Recover build-passing branch states from historical checks. (4) Label accepted master commits merge-ready and earlier or abandoned build-passing states not merge-ready. (5) Deduplicate and package each snapshot with its diff, changed files, PR metadata, and target commit. (6) Construct within-PR pairs where both an earlier state and final accepted state exist (§3.2, pp. 3–4). The resulting denominator is 15,895 snapshots from 12,063 PRs; the pair denominator is 3,687.

Verus form. Inference: build an analogous dataset from Verus repositories by selecting proof-passing commits and labeling accepted versus revised snapshots. Store the verifier version, Rust toolchain, dependencies, specification diff, and review outcome in a manifest. This is an inference; the paper studies Lean and Mathlib rather than Verus.

Limits. The authors state that “The benchmark covers a selective slice of closed PRs.” Not-merge-ready examples require recoverable PR-side build evidence, while merge-ready examples come from accepted master commits, so labels are not an exhaustive or perfect oracle (§7, p. 9).

## technique 2: staged evidence protocol

What it is and when to use it. Evaluate the same review contract with progressively richer evidence, isolating whether diagnostics and intent improve judgments. The paper states: “We evaluate LLM models and agents on M ATHLIB PR under a three-stage protocol that supplies progressively richer evidence for each snapshot.”

How to apply it. (1) Stage 1 supplies the diff, changed-file context, and compact naming, style, and documentation guidance. (2) Stage 2 adds lint, import, declaration-placement, documentation, and API-fit diagnostics. (3) Stage 3 adds the PR title and description as stated intent. (4) Keep the review prompt and output schema fixed across stages. (5) For agents, allow read-only repository inspection while supplying packaged diagnostics only at their designated stage (§4.2, pp. 5–6). Diagnostics are evidence, not labels; the reviewer must decide whether an issue blocks merging.

Verus form. Inference: use stages for agent-written Rust reviews: first code and contracts, then verifier diagnostics and dependency checks, then issue intent and compatibility requirements. Keep the verdict schema fixed so added context is an experimental variable. This is an inference from the benchmark protocol.

## technique 3: structured verdicts and class-balanced metrics

What it is and when to use it. Require a schema-valid JSON review containing a verdict, score, confidence, eight axis assessments, strengths, blockers, and minimal changes. Invalid or missing fields count as invalid outputs. Report separate recall for merge-ready (MR) and not-merge-ready (NMR), balanced accuracy, valid-output rate, and AUROC. The paper defines balanced accuracy as “the mean of the two recalls” and explains that a high recall on one class can hide failure on the other.

How to apply it. (1) Define verdict values merge ready, not merge ready, and uncertain. (2) Define rubric labels good, concern, blocker, and unknown for each axis. (3) Validate every JSON output against the fixed schema. (4) Count uncertain and invalid outputs as errors for class recall. (5) Compute MR Recall, NMR Recall, `(MR Recall + NMR Recall)/2`, valid-output rate, and AUROC from scalar scores (§4.3–4.4, pp. 6–7). Compare denominators explicitly: full-benchmark model runs and the agent runs on a balanced 500 merge-ready/500 not-merge-ready subset are not directly comparable.

## evidence and findings
On the full benchmark, Stage 3 DeepSeek balanced accuracy is 36.0% and Qwen 24.1%; DeepSeek's Stage 3 NMR Recall is 2.3% and Qwen's is 0.0%. On the balanced agent subset, Codex Stage 3 MR Recall is 92.0%, NMR Recall 12.0%, and valid rate 99.9%; Claude Code's valid rate is 56.4%. The paper concludes: “no system reliably distinguishes merge ready from not merge ready snapshots.” The within-PR analysis has 3,687 total pairs, with usable-pair counts varying by model and stage; DeepSeek Stage 3 pairwise accuracy is 51.1% over 3,101 usable pairs (Table 5, p. 8).

Inference: high MR recall with low NMR recall is a dangerous bias for a system reviewing agent-written verified Rust: it accepts most plausible changes while missing subtle merge blockers. Inference: VL should track both recalls and invalid-output rate, never report one aggregate accuracy alone. The paper does not measure Verus proof soundness, compiler correctness, or product risk; those are outside its evidence.

## trusted boundary and what VL should reuse
The benchmark trusts historical maintainer decisions as labels, the build-check records used for snapshot recovery, and the correctness of each model or agent invocation and schema validator. Its limitations include selection bias, nontechnical reasons for abandonment, a temporal cutoff, and the 500/500 agent subset. The authors explicitly say the goal is “not to replace Mathlib reviewers” but to provide an advisory signal audited by humans.

Inference: threat to a product of agent-written verified Rust is high for review automation claims and low for the underlying Verus proof claim. Existing VL should not redo a benchmark of build-pass versus merge-ready Lean snapshots; it should adapt the paired, staged protocol to Verus commits and include specification weakening, dependency upgrades, and unsafe-boundary concerns. The decisive experiment would report MR/NMR recalls and pairwise preference on held-out Verus revisions.

## techniques for the catalog
- history-derived review labels: recover build-passing snapshots and label acceptance from real pull-request trajectories
- staged review evaluation: add code context, diagnostics, then stated intent while holding the review contract fixed
- structured and class-balanced judging: validate JSON reviews and report both class recalls, balanced accuracy, validity, and AUROC

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
