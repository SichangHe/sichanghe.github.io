# VL handoff: turn the existing E0/E1 standard into an executable study

## decision

Do not add a third arm and do not rewrite the research standard from scratch.
Keep improving one Midas Lex CLI on development projects. When a release is
ready for evaluation, freeze it and compare only:

- `E0_NO_CLI`
- `E1_CLI`

The design documents are already systematic. The missing contribution is a
sealed, executable protocol and a sufficiently large held-out run.

Detailed paper and source audit:
[`leetproof_ase_evaluation_20260805.md`](./leetproof_ase_evaluation_20260805.md).

## why this is the LeetProof lesson

LeetProof plausibly fits ASE because it combines a distinctive technical system
with an evaluation organized around explicit research questions. Its useful
evaluation practices are paired same-budget comparison, a development/evaluation
split, separate specification and proof questions, a second model, task-level
outcomes, an exact paired test, and a DOI archive.

Do not copy its weak points: no component ablation, pooled significance that
includes development tasks, public-problem leakage risk, unreported repeat and
seed variance, correlated generated specifications and tests, no independent
semantic labels for the 50 synthesis tasks, incomplete cost accounting, and an
archive that was inspectable but not freshly reproduced in this audit. The
release exposes one terminal outcome per condition, which does not establish how
many underlying attempts occurred.

## current VL diagnosis

The current VL standard already requires realistic repository surfaces, same
task/model/budget controls, frozen guidance provenance, cross-project holdout,
arm-blinded semantic scoring, independent adjudication, uncertainty, repeated
seeds, and trajectory analysis.

Executed evidence does not yet meet that standard:

- nominal treatment subjects in one tiny paired study made zero CLI calls, so it
  is at most an underpowered intention-to-offer observation and cannot identify
  a CLI-use or CLI-content mechanism;
- a deep true-CLI trajectory had no clean matched control;
- the latest same-task comparison had one subject per condition and no detectable
  material improvement;
- a legacy two-task/four-arm `vlh` helper comparison had binary success in both
  helper and nominal no-helper arms, whose required preflight still exposed
  `vlh help`; it is not a clean current Midas Lex E0/E1 trial;
- current real-project and bug-finding results are valuable bounded case studies,
  not a sampled causal efficacy study;
- some past result artifacts referenced by evaluator reports are no longer
  present at their recorded paths.

The defensible current claim remains that VL has useful focused-proof and
named-target-specification evidence. A causal CLI-effect claim is not yet
supported.

## exact next owner and scope

Route this packet through the current manager. Following
`docs/experiments/supervisor_operating_boundary.md`, the manager should assign one
evaluation owner or sub-supervisor to prepare and review the confirmatory protocol
packet. The packet owner must not launch subjects or change the CLI during this
task.

The review scope is exactly:

1. One claim/RQ/estimand table.
2. A sampling frame and project-family development/holdout split.
3. A smallest meaningful effect, safety-harm margin, exclusions, stopping rule,
   missing-run rule, and simulation-based power analysis over plausible
   discordance, clustering, scorer error, and attrition.
4. An exact E0/E1 prompt and environment diff proving CLI access is the only
   intended treatment difference.
5. One frozen CLI binary, corpus, and profile, plus a machine-checked report that
   proves worker-retrievable source lineage and project-family leakage exclusions;
   a manifest file alone is insufficient.
6. A private semantic reference ledger and arm-blinded dual-scorer packet.
7. A family/project/task/opportunity/seed hierarchy, one primary
   opportunity-level estimand, and a paired project-cluster-aware analysis plan
   with uncertainty intervals.
8. Equal transcript, command, cost, and artifact capture in both arms.
9. A failure/trajectory codebook for mechanism analysis from the same two arms.
10. An immutable artifact schema and a dry run that rebuilds tables from sealed
    logs.

Before the full pilot packet is approved, dry-review three representative tasks
across at least two projects:

- one task with a useful specification opportunity;
- one no-change or abstention task;
- one weak-but-verifier-green semantic trap.

This is a packet review, not an extra experiment arm.

## required packet files

- `CLAIM_AND_RQ_MAP.md`
- `BENCHMARK_AND_LEAKAGE_LEDGER.md`
- `E0_E1_PROTOCOL.md`
- `BLINDED_SCORING_RUBRIC.md`
- `STATISTICAL_ANALYSIS_PLAN.md`
- `FAILURE_AND_TRAJECTORY_CODEBOOK.md`
- `ARTIFACT_AND_REPRODUCTION_MANIFEST.md`
- `PACKET_REVIEW_CHECKLIST.md`

## minimum protocol

### RQ1: primary semantic outcome

Does access to frozen E1 improve semantically adequate useful-opportunity recall
over E0 at fixed source, model, and budget?

The primary estimand is the intention-to-treat difference in the probability
that a preregistered useful opportunity is recovered with an adequate proposal,
averaged under prespecified equal weighting across held-out project families,
projects within families, and tasks within projects. A proposal is adequate only
if it is intent-equivalent to the hidden reference or a directionally valid
refinement justified by worker-visible repository evidence. It may not narrow
intended inputs or invent determinism, tie-breaking, or output constraints.
Postcondition strengthening is adequate only when intended behavior requires or
supports it. Use whole-submission harmful/unsupported rate as a separate safety
guardrail. Report verifier compatibility separately.

### RQ2: efficiency

At the same fixed budget, what is the paired effect on semantic quality and on
unconditional wall time, tokens, dollar cost, repository reads, verifier calls,
and failed branches? Separately report censored time and cost to first adequate
proposal under a preregistered joint analysis. Do not condition an efficiency
claim on post-treatment semantic quality.

### RQ3: robustness and mechanism

Does the direction persist across projects and selected repeat seeds or models?
Which CLI interactions repeatedly precede avoided or recovered failure classes?
This is secondary unless separately powered.

### sample and split

- exploratory harness pilot: a planning floor of 30 privately scored
  opportunities in at least three projects;
- paper-level study: a planning floor of 100 opportunities in at least six
  projects, multiple project families, and multiple task families;
- split by project family, not random rows from the same repository;
- retain multiple never-tuned project-family holdouts;
- include positive opportunities, no-change sites, and weak-spec traps;
- tune the CLI only on development projects;
- never pool development rows into the confirmatory headline estimate.

Development, confirmatory, and replication sets are partitions. Each uses the
same E0/E1 design; none is a third arm.

Neither planning floor establishes power. Before confirmatory collection,
simulate the required numbers of families, projects, tasks, opportunities, and
seeds from a smallest meaningful effect and safety-harm margin across plausible
baseline rates, E0/E1 discordance, task/project correlation, scorer error, and
attrition. A three-project pilot is for harness debugging and cannot reliably
estimate between-project variance.

### treatment integrity

Use intention-to-treat as primary: availability of the frozen CLI is the
treatment. Record CLI calls and advice-to-action links as compliance and
mechanism evidence. Do not force repeated ceremonial CLI calls. Per-protocol
analysis is secondary only.

Run arms in independent clean sessions with cache isolation and randomized or
counterbalanced order inside a bounded provider window. Freeze prompts, budgets,
model settings, seeds, task snapshots, and retry rules. Any CLI binary or corpus
hash change requires a fresh unspent holdout; do not pool releases.

### semantic scoring

Freeze proposals before verifier feedback. Remove arm markers. Have two qualified
scorers independently label every hidden reference opportunity and every
submitted proposal. Report agreement and adjudication. Use evaluator-held
repository evidence, adversarial incorrect implementations, mutations, and
metamorphic checks; agent-generated examples may supplement but cannot define the
oracle.

### analysis

- define the hierarchy: project family, project, task, useful opportunity, seed,
  and arm; a task-seed-arm is one run, and its opportunities are correlated;
- predeclare the opportunity-level ITT estimand above as the primary endpoint;
- pair by task and seed, weight families/projects/tasks as specified, and account
  for project clustering;
- report raw counts, absolute paired effects, and 95 percent intervals;
- preselect a hierarchical or cluster-aware randomization analysis and validate
  its coverage in the power simulation;
- use an exact McNemar test only for a separately preregistered secondary outcome
  with one independent binary pair per task;
- predeclare timeout, environment-failure, retry, exclusion, and multiple-testing
  rules;
- repeat a prespecified subset across seeds and a second model;
- report every attempt, not the best run.

### artifact

Archive a container or VM, a reduced reproduction, exact prompts and hashes,
source snapshots, CLI/corpus/profile identity, seeds, model/provider versions,
per-attempt transcripts, commands, verifier output, cost, scorer packets,
adjudication, raw outcomes, analysis scripts, and a claim-to-file map. Closure
must fail if a referenced artifact is absent.

## packet PASS gate

Two fresh independent reviewers should return PASS only if all are true:

- exactly two arms and an immutable E1;
- no development project contributes to the confirmatory estimate;
- no target or same-project guidance leakage;
- one primary semantic estimand, explicit hierarchy and weighting, and a
  simulation-justified sample/power plan rather than reliance on planning floors;
- semantic labels are independent of verifier success;
- two blinded scorers and registered adjudication;
- identical non-treatment conditions and retention in both arms;
- registered seed, timeout, retry, missingness, and exclusion rules;
- every claim maps to an RQ, metric, scorer, analysis, and durable artifact;
- a dry run can regenerate the planned tables from the sealed ledger.

Packet PASS is necessary but not launch authority. After PASS, the packet owner
reports to the manager and human. Only after a fresh explicit human approval may
the manager dispatch the 30-opportunity exploratory pilot. Use that pilot's
observations only as one input to a conservative sensitivity analysis; do not
assume three projects estimate between-project variance reliably. Do not use its
tasks to continue tuning and then count them as held-out evidence.
