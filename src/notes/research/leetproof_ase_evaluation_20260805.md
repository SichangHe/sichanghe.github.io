# LeetProof: why it plausibly fits ASE, and the evaluation bar for VL

## scope and bottom line

This is a follow-up to
[`leetproof_20260804.md`](./leetproof_20260804.md). It does not replace that
paper study. It answers a narrower question: what is technically distinctive,
what plausibly makes the work suitable for ASE under ASE's published criteria,
and how VL should turn its evaluation from a strong written standard into a
systematic executed study.

The conclusion is bounded. No public source reveals the reviewers' private
reasoning, so this note does not claim why the paper was accepted. The best
evidence-backed venue-fit inference is that LeetProof is more than a generic LLM
proof loop. Its publishable unit is the integration of a foundational
Lean/Velvet substrate, a deliberate allocation of testing, SMT, and interactive
proof to different stages, and new property-based-testing infrastructure for
generated specifications, programs, and loop invariants. The paper then
triangulates that system contribution across specification quality, whole-system
synthesis, residual-proof closure, and a second model. [LP-TECH] [LP-EVAL]
[ASE-RESEARCH]

The evaluation is good enough to make a coherent systems contribution credible,
but not good enough to establish every causal explanation in the paper. In
particular, there is no component ablation; the statistically significant test
pools development and evaluation tasks; the held-out direction is promising but
not conventionally significant; natural-language intent remains empirically
judged; the benchmark is narrow; and the public archive is inspectable rather
than demonstrated here as a fully reproducible, ASE-evaluated artifact.
[LP-RQ2] [LP-SPLIT] [LP-INTENT] [LP-VALIDITY] [ART-AUDIT] [ASE-ARTIFACT]

For VL, the main problem is not an absence of evaluation ideas. The current VL
standard already asks for paired arms, leakage controls, blinded semantic
scoring, repeated seeds, uncertainty, project holdouts, and realistic repository
surfaces. The gap is execution: current evidence is a mixture of small paired
pilots and heterogeneous bounded case studies, not one frozen, adequately scaled,
held-out E0-versus-E1 study. [VL-STANDARD] [VL-CLI-PLAN] [VL-CAPABILITY]
[VL-CURRENT-EVAL] [VL-PAIR-EVAL] [VL-REAL-USAGE] [VL-PORTFOLIO]

The recommendation preserves the human's decision: keep improving one CLI on a
development partition, then freeze it and evaluate only two publication arms,
`E0_NO_CLI` and `E1_CLI`. Dataset partitions and repeated seeds are not extra
arms. There should be no third standing treatment.

## what is technically distinctive

### the inherited pieces

LeetProof does not invent Lean, Plausible, SMT tactics, interactive proving,
Aristotle, agent repair loops, or staged synthesis. Velvet and Loom provide the
foundational imperative verifier. Existing work already generated verified code,
specifications, invariants, or proofs in individual verifier ecosystems.
[LP-TECH] [LP-RELATED]

This matters because the broad claim “LLMs plus a verifier can iteratively repair
proofs” would not explain the paper's contribution.

### the integrated method

LeetProof gives each stage a different cheapest useful oracle while keeping the
final result in one Lean trust chain:

1. The specification stage type-checks a generated Lean specification, applies
   an LLM judge, and uses randomized tests to reject overly strong or weak
   contracts before code generation.
2. The program and invariant stage executes Velvet programs, tests invariants at
   loop entry and after each iteration, and combines counterexamples with
   residual verification conditions for repair.
3. The proof stage tries automated tactics and SMT first, then sends only
   residual Lean theorems to interactive proof agents or Aristotle.
4. The testing checks may admit propositions while searching for
   counterexamples, but those admissions are outside the final code-to-spec proof
   certificate.

The technical idea is therefore mode-aware decomposition inside a foundational,
executable verifier, not a prompt recipe. [LP-TECH] [LP-TRUST]

### the new infrastructure

The paper contributes concrete Lean tooling rather than only orchestration:

- a bound-extraction heuristic for existential variables, with Lean tactics used
  to prove that the inferred enumeration bound is sound;
- type-directed mutations of Booleans, numbers, pairs, arrays, lists, and strings
  to search for unintended accepted outputs;
- a meta-programmed transformation that instruments Velvet loop invariants at
  entry and after each iteration and checks the postcondition at exit.

Those mechanisms operationalize specification and invariant testing in a form
that can return compact counterexamples to an agent. [LP-INFRA]

### the narrow novelty claim that survives scrutiny

The strongest defensible novelty claim is:

> LeetProof operationalizes online property-based filtering, SMT-backed
> verification, and interactive Lean proof as stage-specific modes in one
> foundational end-to-end vericoding pipeline, supported by new testing
> infrastructure.

The weaker claim is that every individual component is new. The paper does not
support that.

## plausible ASE venue fit

ASE's category-specific criteria for Technical Research papers are Significance,
Novelty, and Soundness. Verifiability and Presentation additionally apply to
both submission categories. The call also asks authors to state impact and
assumptions, position novelty against related work, and support research
questions with appropriate methods. The official program lists LeetProof's
paper, *Certified Program Synthesis with a Multi-modal Verifier*, as a Research
Paper. [ASE-RESEARCH]

Against those published criteria, the plausible fit is:

| Published criterion | Demonstrated strength | Important boundary |
| --- | --- | --- |
| Significance | Generated-specification quality is a real bottleneck; LeetProof found defects in two established suites and offers a cost-aware way to reject bad candidates early. [LP-RQ1] | The demonstrated domain is standalone deterministic algorithm problems, not production repositories. [LP-VALIDITY] |
| Novelty | The contribution is the foundational mode-aware composition plus Lean PBT infrastructure, not generic agent iteration. [LP-TECH] [LP-INFRA] | The paper does not isolate which component is necessary, and its “first” framing is an author claim. [LP-ABLATION] |
| Soundness | Four explicit research questions connect specification quality, composite system utility, residual proof closure, and model sensitivity. [LP-EVAL] | RQ2's causal explanation is under-identified, and its pooled significance includes development tasks. [LP-RQ2] [LP-SPLIT] |
| Verifiability, an additional cross-category criterion | The paper links a DOI-backed archive with source, prompts, generated artifacts, benchmark instances, and result summaries. [ART-AUDIT] | This audit did not reproduce model calls, cost, or Aristotle behavior; the archive lacks some evidence needed for repeatability. [ART-AUDIT] [ASE-ARTIFACT] |

The paper is therefore plausibly ASE-suitable because it presents a coherent
method, enabling infrastructure, and a multi-part empirical case. Evaluation is
part of that package, but evaluation alone is not the contribution.

## LeetProof claim-to-evidence audit

| Claim or research question | Evidence actually supplied | What the evidence supports | What remains unresolved |
| --- | --- | --- | --- |
| RQ1: generated specification accuracy | 188 usable VERINA items; 150 formally equivalent; the remainder manually categorized when equivalence was not proved; PBT caught two of seven generated-spec errors after the LLM judge. [LP-RQ1] | Strong evidence that the pipeline often matches or defensibly differs from this reference suite, and that PBT adds some detection value. | The reported 183 of 188 combines formal equivalence with author judgment. Three incorrect specs escaped because generated tests shared the bad constraint. No blinded independent intent adjudication. [LP-INTENT] |
| Benchmark-defect finding | PBT found 13 VERINA and 18 CLEVER issues; Aristotle-assisted inspection raises the total VERINA count to 16. Author acknowledgments are described. [LP-RQ1] | Useful external validation that specification benchmarks themselves need auditing. | This is not an ablation showing how much online PBT improves end-to-end synthesis success. |
| RQ2: composite pipeline versus direct Lean | Same GPT-5.2 backend and generated specs; paired tasks; a five-dollar LLM API cap for code and proof; 28 of 50 versus 17 of 50; exact McNemar test reported. [LP-RQ2] | The released terminal outcomes favor the complete Velvet pipeline over this direct-Lean baseline under that API cap. | Representation, prompts, invariant workflow, PBT, SMT, and proof routing all change together. Specification generation and local PBT/SMT compute are excluded or unreported. Reproducing the 17 direct-Lean wins requires treating one `possible-env-issue` label as complete. There is no stage ablation, and repeat/seed variance is unreported. [LP-ABLATION] [ART-AUDIT] |
| Paper-designated evaluation split | Fifteen development tasks are separated from 35 tasks designated as evaluation; counts are 23 versus 16. [LP-SPLIT] | Directional evidence beyond the tasks acknowledged as informing development. | No immutable pre-run freeze, sampling seed, or selection transcript is released. Local reconstruction gives 11 Velvet-only versus 4 Lean-only and exact two-sided p = 0.118469; the paper's p = 0.0192 pools all 50. [ART-AUDIT] |
| RQ3: residual obligations | Aristotle closes all 18 partial Velvet results; the paper reports 23 of 30 for direct Lean. [LP-EVAL] | Many failures at the fixed API cap reflect proof-search limits rather than incorrect code-to-spec artifacts. | Extra effort lies outside the headline cap and depends on an external prover. Paper Table 2 gives eventual discordance 7 versus 1, p = 0.0703. Released JSON gives 6 versus 1, p = 0.125, because it labels 24 rather than 23 Lean residuals as closed. An authoritative derivation is missing. [ART-AUDIT] |
| RQ4: model robustness | One random 25-task Opus subset gives 10 versus 7. [LP-EVAL] | The ordering is directionally consistent across two backends. | The full paired subset is 5 versus 2 discordant wins, p = 0.453125. Six subset tasks are development items; on the 19 evaluation items the counts are 8 versus 7, with discordant wins 3 versus 2 and exact p = 1.0. There are no repeated seeds or uncertainty intervals. [ART-AUDIT] |
| Whole-pipeline cost claim | The paper argues that cheap PBT/SMT filtering reduces cost before interactive proof. [LP-EVAL] | The architecture provides a plausible cost-saving mechanism. | The release lacks a complete token, call, wall-time, local-compute, and per-stage cost ledger or budget-response curve. It does not establish an “orders of magnitude” end-to-end reduction. [ART-AUDIT] |
| Reproducibility | DOI archive includes code, prompts, benchmark, generated programs, spec-equivalence directories, and aggregate result JSON. [ART-AUDIT] | Independent inspection and count reconstruction are possible. | No full per-attempt transcripts, seed manifest, or complete cost ledger; fresh execution requires provider credentials, downloaded assets, and Aristotle. [ART-AUDIT] |

## evaluation strengths worth copying

LeetProof does several things VL should retain:

- It states separate research questions rather than treating one aggregate pass
  rate as evidence for every claim.
- It compares paired outcomes on the same problems and uses an exact paired test.
- It distinguishes development and evaluation subsets in the paper, even though
  it later pools them for its significance claim.
- It holds model and code-and-proof budget constant across the primary arms.
- It tests a second model rather than assuming model independence.
- It evaluates specification quality separately from final proof completion.
- It publishes a DOI-backed archive with task-level outcomes rather than only a
  table in the paper.
- It includes a threats-to-validity section that acknowledges benchmark scope,
  development use, fixed-budget sensitivity, tool dependence, and the intent gap.

## methodological dangers VL should avoid

### composite-system attribution without ablation

The primary comparison changes language representation, invariant generation,
testing, SMT use, prompts, and proof routing at once. It supports a whole-system
claim, not the sentence that any one stage caused the gain. VL should either make
a whole-CLI claim or collect mechanism evidence that connects specific CLI
interactions to later behavior. It should not retrofit causal credit from an
E0-versus-E1 outcome alone.

### development-set leakage into confirmatory inference

The 15 development tasks informed the pipeline. Reporting them is useful, but
pooling them into the only significant test weakens the confirmatory claim. VL
must tune the CLI only on development projects and compute its headline estimate
on held-out project families after the CLI and analysis plan freeze.

### correlated semantic oracles

The same generation process emits specifications and examples, so they can share
the same misunderstanding. VL should build evaluator-held semantic references
from repository-authored tests, docs, callers, issue history, and independent
expert annotations. Agent-generated tests may be diagnostic evidence, but not the
sole semantic oracle.

The risk is especially important for RQ2 through RQ4: the separate VERINA study
does not independently validate the generated specifications for the 50 synthesis
tasks. On those tasks the pipeline promotes its generated specifications after
correlated LLM-generated examples and falsification checks, then proves programs
against those specifications.

### public-problem contamination and selector coupling

The paper rejects older public suites in part because of contamination risk, yet
its new synthesis benchmark still consists of public LeetCode problems. It gives
no temporal cutoff, contamination probe, selection transcript, family-level
deduplication, or released sampling seed. Claude Opus selected the 35 evaluation
tasks and was later one of the evaluated backends. This does not prove leakage,
but it prevents a strong leakage-control claim.

### unreported stochastic variance

The paper and archive do not report the repeat count or seed variance. The
release provides one terminal outcome per task and condition, which cannot
characterize model variance. VL should repeat a prespecified subset across seeds
and at least one second model, then report the distribution rather than the best
run.

Equal dollar caps are also incomplete controls. The artifact does not preserve
stage-level tokens, calls, wall time, or local PBT/SMT compute. Equal API dollars
therefore do not demonstrate equal inference opportunities or an end-to-end cost
advantage, and the paper does not report a budget-response curve.

### verifier success as a proxy for intent

Both projects recognize this risk. VL's strongest opportunity is to make the
separation operational: semantic adequacy must be scored before verifier feedback,
and verifier compatibility must be reported as a different outcome.

### inspectable versus reproducible artifacts

LeetProof's archive is valuable, but a top-conference-style VL artifact should
also preserve a runnable container, a reduced smoke reproduction, exact prompts,
seeds, model/provider identifiers, per-attempt cost, transcripts, scorer packets,
and a claim-to-file map. ASE's artifact guidance explicitly asks authors to state
which claims the artifact does and does not support. [ASE-ARTIFACT]

## comparison with the current VL evidence

The VL side below uses only the closed evidence set frozen on 2026-08-05. Each
VL cell identifies whether it is a current capability, bounded experimental
evidence, or aspirational/evaluation design.

| Dimension | LeetProof | VL written standard | VL executed evidence | Required conversion |
| --- | --- | --- | --- | --- |
| Research questions | Four explicit questions cover spec accuracy, composite utility, residual closure, and model robustness. [LP-EVAL] | One central causal question plus separate quality, efficiency, process, and robustness subclaims. [VL-STANDARD] **Classification: current required but unexecuted evaluation design.** | Existing results are recorded as task-, lane-, or portfolio-specific outcomes, not one preregistered RQ family. [VL-CAPABILITY] [VL-REAL-USAGE] [VL-PORTFOLIO] **Classification: bounded observational or secondary evidence.** | Freeze one primary semantic-quality RQ and separate secondary cost, robustness, and mechanism RQs before launch. |
| Primary baseline | Direct Lean, same model/specs and code-plus-proof dollar cap. [LP-RQ2] | Same task and snapshot: `E0_NO_CLI` versus `E1_CLI`. [VL-CLI-PLAN] **Classification: current evaluation design.** | Later nominal treatment arms made zero CLI calls; an exposed run lacked a clean matched control; the same-task makeup had one fresh subject per condition and no detectable material improvement. [VL-CURRENT-EVAL] **Classification: bounded experimental evidence without a causal estimate.** | Keep only E0 and E1; scale the paired design, measure exposure as secondary compliance, and freeze the CLI before confirmatory runs. |
| Ablation and mechanism | No component ablation; one composite system versus a different synthesis representation. [LP-ABLATION] | The general standard lists optional ablations and requires trajectory coding. [VL-STANDARD] **Classification: current required but unexecuted evaluation design.** | A legacy `vlh` helper comparison preserved helper transcripts but lacked matching no-helper session transcripts; it is not a clean current Midas Lex E0/E1 trial and cannot identify a mechanism. [VL-PAIR-EVAL] **Classification: bounded legacy evidence.** | Do not add a third arm. Use within-arm stage telemetry and blinded trajectory codes to test mechanisms; keep causal product claims at whole-CLI level. |
| Benchmark population | Fifty deterministic, simple-type LeetCode tasks; 15 development and 35 evaluation; no hard tasks. [LP-SPLIT] | The written paper-level planning floor is 100 private opportunities across six projects and multiple task families; it is not itself a power calculation. [VL-STANDARD] **Classification: current required but unexecuted evaluation design.** | Strongest canonical claims remain focused proof and named-target specification work; autonomous repository discovery and full project generation are not established. [VL-CAPABILITY] **Classification: canonical current capability boundary.** | Build a project-family-stratified, repository-realistic benchmark, then set the final scale by simulation rather than treating the 100-opportunity/six-project floor as powered evidence. |
| Leakage controls | Public-suite contamination is discussed; the new LeetCode set still consists of public problems, and no contamination probe or release-date audit is reported. [LP-SPLIT] | Hidden targets, sibling isolation, frozen provenance, same-project guidance exclusion, and a cross-project holdout are required. [VL-STANDARD] **Classification: current required but unexecuted evaluation design.** | Historical target-shaped tasks are deprecated, but a machine audit found that the live corpus exposes only generic provenance, while project-mined entries have unknown source commits and blocked curation. [VL-STANDARD] [VL-PROVENANCE] **Classification: canonical policy plus a bounded execution audit.** | Partition by repository family before tuning and require a machine-checked worker-retrievable lineage/leakage report for the frozen E1 corpus. |
| Verified property and semantic oracle | Final Lean certificate proves code against the generated spec; RQ1 uses reference equivalence plus author judgment for unresolved cases. [LP-RQ1] [LP-INTENT] | Semantic adequacy, harmful proposals, and useful-opportunity recall are primary; verifier compatibility is separate. [VL-STANDARD] **Classification: current required but unexecuted evaluation design.** | Canonical capability notes warn that verifier green cannot compensate for a weak contract. [VL-CAPABILITY] **Classification: canonical current policy and capability boundary.** | Freeze evaluator-held semantic references and score them blind before revealing verifier results. |
| Statistical treatment | Exact McNemar test for pooled paired binary outcomes; no confidence intervals or reported seed variance. [LP-RQ2] [ART-AUDIT] | Paired effects, uncertainty intervals, repeatability, and explicit exploratory-versus-powered labels are required. [VL-STANDARD] **Classification: current required but unexecuted evaluation design.** | Durable analyses cover tiny zero-uptake, unmatched, legacy-helper/two-task, or one-subject-per-condition comparisons; they do not supply an inferential CLI-effect estimate. [VL-CURRENT-EVAL] [VL-PAIR-EVAL] **Classification: exploratory evidence only.** | Predeclare one opportunity-level ITT estimand, model the family/project/task/seed hierarchy, power by simulation, report uncertainty and heterogeneity, and reserve McNemar for a secondary one-pair-per-task binary endpoint. |
| Failure analysis | Outcome categories and a representative Lean-favored case are reported; the artifact has task-level labels. [LP-EVAL] [ART-AUDIT] | Transcript-level coding requires discovery points, wrong branches, recovery triggers, guidance effects, and detours. [VL-STANDARD] **Classification: current required but unexecuted evaluation design.** | Some helper trajectories were analyzed, but no-helper full transcripts were missing in the legacy `vlh` evaluator packet. [VL-PAIR-EVAL] **Classification: bounded legacy evidence.** | Require identical transcript preservation in both arms and a preregistered failure taxonomy scored blind. |
| Artifact reproducibility | DOI archive supports static count reconstruction, but fresh model/prover/cost reproduction was not done. [ART-AUDIT] | Each run should preserve prompts, source and guidance hashes, manifests, transcript, command logs, freeze artifact, labels, and adjudication. [VL-CLI-PLAN] [VL-OPS] **Classification: current required but unexecuted evaluation design.** | The legacy `vlh` evaluator cited structured manifests, but all four referenced artifact directories were absent at this freeze. A later Midas Lex analysis still has the root Codex rollout, while its cited arm-level raw transcript and result files are absent. [VL-PAIR-EVAL] [VL-CURRENT-EVAL] **Classification: bounded evidence with retention failure.** | Put the complete study in immutable archival storage, validate a reduced reproduction, and fail closure when any referenced artifact is not durable. |
| Claims-to-evidence alignment | Strong for “this composite beat this baseline at this budget”; weaker for “staging caused the gain.” [LP-ABLATION] | The standard rejects inference from helper use, verifier green, report clarity, or named-hole success alone. [VL-STANDARD] **Classification: current required but unexecuted evaluation design.** | Current capability and portfolio documents use bounded language around production/model seams. [VL-CAPABILITY] [VL-PORTFOLIO] **Classification: bounded claim discipline in a canonical summary and historical secondary index.** | Preserve that caution and make every paper claim point to an RQ, metric, scorer, analysis, and immutable artifact. |
| Threats to validity | Paper discusses scale, development use, budget, model evolution, dependencies, and intent. [LP-VALIDITY] | VL design covers leakage, scorer isolation, variance, and semantic/verifier separation. [VL-STANDARD] **Classification: current required but unexecuted evaluation design.** | Current portfolio is heterogeneous and explicitly non-causal; current project-generation claim remains bounded. [VL-PORTFOLIO] [VL-PROJECT] **Classification: historical bounded secondary index plus canonical capability boundary.** | Publish a threat ledger covering selection, contamination, stochasticity, evaluator disagreement, tool drift, missingness, and production correspondence. |

## the central VL diagnosis

VL's evaluation design is not ad hoc on paper. It is already more careful than
LeetProof on several points: realistic repository surfaces, same-project leakage,
arm-blinded semantic scoring, uncertainty, repeated seeds, cross-project holdout,
and separation of semantic adequacy from verifier success.

The executed evidence remains ad hoc as a body:

- The canonical capability summary supports focused proof and named-target
  specification work, not repository-wide discovery or whole-project generation.
- In a later nominal E0/E1 study, neither treatment subject called the CLI. At
  most this is an extremely underpowered intention-to-offer observation; it
  cannot identify a per-protocol or CLI-content effect and supplies no useful
  causal estimate.
- A true-CLI P2 trajectory used the tool, but mostly through forced rituals,
  never invoked `next-stage`, and lacked a clean matched control. It is rich
  case-study evidence, not a causal comparison.
- The latest bounded same-task makeup had one subject per condition. Both passed;
  the CLI subject used eight calls, more wall time and Verus calls, and fewer
  uncached input tokens. The evidence correctly concludes that neither condition
  was clearly better.
- A legacy two-task/four-arm `vlh` helper series had binary success in both helper
  and nominal no-helper arms, whose mandatory preflight still exposed `vlh help`.
  It is not a clean current Midas Lex E0/E1 trial. The binary result shows no
  success/failure advantage, while incomplete transcript parity and semantic
  comparability prevent a causal quality or efficiency estimate.
- The four structured artifact directories cited by that evaluator are no longer
  present at their recorded paths as of the freeze, so the result is not currently
  reproducible from those references.
- A later P2 analysis preserves a 16.5-megabyte root rollout and careful token
  accounting, but the arm-level raw transcript and result artifacts cited by the
  analysis are no longer present at their recorded paths.
- The six-lane real-project index and bug-finding portfolio contain valuable
  bounded findings and no-defect records, but they are observational,
  heterogeneous, and explicitly not controlled CLI-effect studies.
  [VL-REAL-USAGE] [VL-PORTFOLIO]

The work needed is therefore protocol execution and evidence durability, not
another evaluation manifesto.

## proposed VL protocol: two arms, one evolving CLI

### phase zero: name the contribution and claims

Before benchmark preparation, freeze a claim ledger:

- primary product claim: access to the frozen Midas Lex CLI improves semantic
  quality on realistic Verus repository tasks at a fixed budget;
- secondary resource claim: at the same fixed budget, E1 changes semantic
  quality and unconditional wall time, tokens, dollars, repository reads,
  verifier calls, and failed branches;
- secondary cost-effectiveness claim: censored time and cost to first adequate
  proposal improve under a prespecified joint analysis, without conditioning on
  a treatment-affected quality outcome;
- robustness claim: the direction persists across projects and selected repeat
  seeds or models;
- mechanism claim: specific guidance interactions precede auditable avoidance or
  recovery events.

Only the first claim should be confirmatory unless the sample is powered for the
others.

### phase one: develop without spending the test set

Keep improving the single CLI on a development partition containing projects and
task families that will never enter the confirmatory estimate. Use fast semantic
smoke tests, synthetic edge cases, and regression suites here. These are product
release gates, not publication arms and not publication evidence.

Maintain a guidance-lineage ledger. Any source derived from a confirmatory
project, private target, sibling arm, or prior answer excludes that project from
the confirmatory set.

### phase two: freeze the study

Freeze before the first confirmatory run:

- CLI binary, guidance corpus, source provenance, and hashes;
- model and reasoning settings;
- task snapshots and worker-visible/forbidden manifests;
- prompts, budgets, stop and retry rules;
- independent clean sessions, cache isolation, provider window, randomized or
  counterbalanced arm order, and seed schedule;
- RQs, primary outcome, scoring rubric, adjudication procedure, and analysis
  code;
- artifact schema and missing-data policy.

If any CLI binary or corpus hash changes after the freeze, that release needs a
fresh unspent holdout. Do not pool its outcomes with the earlier release.

The only arms are:

- `E0_NO_CLI`: same agent, snapshot, prompt, model, and budget, with no CLI or
  guidance exposure;
- `E1_CLI`: identical except for access to the frozen CLI.

### phase three: benchmark and holdout

Use the existing written bar as a planning floor, not as a power calculation:

- pilot: at least 30 privately scored opportunities across at least three
  projects, explicitly exploratory and intended to debug the harness;
- paper study: at least 100 privately scored opportunities across at least six
  projects, multiple project families, and multiple task families;
- split by project family, not random rows from the same repository;
- hold out multiple entire project families on which no guidance was tuned;
- include positive opportunities and plausible sites that should be left
  untouched, so precision and harmful-proposal rates are measurable;
- keep target identities and oracle text private until proposals freeze.

The development, confirmatory, and optional replication partitions all use the
same two arms. They are dataset partitions, not a third treatment.

Before collecting confirmatory outcomes, simulate power under plausible ranges
of baseline adequacy, E0/E1 discordance, task and project correlation, scorer
error, and attrition. Set the final task, project, family, and seed counts from a
smallest meaningful effect and safety-harm margin. A three-project pilot cannot
reliably estimate between-project variance; use conservative sensitivity ranges
or external evidence and label the pilot exploratory.

### phase four: scoring

Score in this order:

1. Freeze the candidate proposal and full trajectory.
2. Have two arm-blinded evaluators independently score semantic adequacy,
   opportunity recall, proposal precision, unsupported or harmful proposals, and
   abstention quality.
3. Adjudicate disagreements under a rule written before labels are opened; report
   agreement and unresolved uncertainty.
4. Only then reveal verifier compatibility and proof-handoff outcomes.
5. Separately score production correspondence: whether the proved model is
   linked to the executable path, tested against it, or merely analogous.

A proposal is semantically adequate only when it is intent-equivalent to the
hidden reference or is a directionally valid refinement justified by
worker-visible repository evidence. Added preconditions may not narrow intended
inputs. A stronger postcondition is adequate only when intended behavior
requires or supports it. Invented determinism, tie-breaking, or output constraints
are failures even if the verifier accepts them.

### phase five: statistics

- Define the hierarchy before data collection: project family, project, task,
  useful opportunity, seed, and arm. A task-seed-arm is one run; opportunities
  within a task and repeated seeds are not independent observations.
- Use one primary estimand: the intention-to-treat difference between E1 and E0
  in the probability that a preregistered useful opportunity is recovered with a
  semantically adequate proposal, averaged under prespecified equal weighting of
  held-out project families, projects within families, and tasks within projects.
- Keep whole-submission harmful or unsupported proposal rate as a separate
  safety guardrail, not part of the primary endpoint.
- Report raw paired counts, absolute differences, risk ratios where meaningful,
  and confidence or credible intervals.
- Preselect a project-cluster-aware hierarchical or randomization analysis and
  validate its coverage in the power simulation. An exact McNemar test is only a
  secondary analysis for a separately preregistered endpoint with one independent
  binary pair per task; it is not the primary opportunity-level analysis.
- Report held-out results separately and make them the headline estimate.
- Report project-level heterogeneity; do not let one easy project dominate a
  pooled percentage.
- Repeat a prespecified subset across seeds and a second model. Report variance
  and all attempts, not the best result.
- Treat pilots, development runs, and post-hoc analyses as exploratory.

### phase six: mechanism and failure analysis

Use the same E0 and E1 runs. Do not create a third arm. Code trajectories for:

- first correct site and behavior account;
- first weak, unsupported, or wrong proposal;
- first irreversible wrong branch;
- recovery trigger;
- CLI interaction that caused, confirmed, was ignored by, or worsened a choice;
- verifier feedback timing;
- repeated failure category;
- time, commands, tokens, and dollars to first adequate proposal.

Mechanism claims require a repeated temporal pattern, not the fact that the agent
called the CLI.

### phase seven: artifact

Archive a self-contained container or VM, a reduced run that finishes in a day,
and the full-run instructions. Preserve task snapshots, exact prompts, hashes,
seeds, per-attempt transcripts, model/provider versions, cost ledgers, scorer
packets, adjudication, analysis code, raw outcomes, and a claim-to-artifact map.
The artifact README must state which claims can and cannot be reproduced.

## concrete handoff to the VL hierarchy

The current manager should assign one evaluation owner or sub-supervisor. That
owner should prepare and review the packet below without launching subjects or
changing the CLI. The next bounded review is:

> Convert the already approved `guidance_evaluation_research_standard.md` and
> `cli_vs_no_cli_evaluation_plan.md` into one immutable executable protocol
> packet for a 30-opportunity pilot, while preserving only `E0_NO_CLI` and
> `E1_CLI`. The packet must include a project-family development/holdout split,
> guidance-lineage exclusions, one primary estimand and sampling hierarchy, a
> two-evaluator blinded rubric, adjudication, simulation-based power planning,
> project-cluster-aware paired analysis, seed repeats, transcript parity, a
> failure taxonomy, and an archival artifact manifest.
> Review the packet—not experiment outcomes—against every field before any arm
> launch.

Required packet outputs:

- `CLAIM_AND_RQ_MAP.md`
- `BENCHMARK_AND_LEAKAGE_LEDGER.md`
- `E0_E1_PROTOCOL.md`
- `BLINDED_SCORING_RUBRIC.md`
- `STATISTICAL_ANALYSIS_PLAN.md`
- `FAILURE_AND_TRAJECTORY_CODEBOOK.md`
- `ARTIFACT_AND_REPRODUCTION_MANIFEST.md`
- `PACKET_REVIEW_CHECKLIST.md`

Acceptance gate for that review:

- no third arm or mutable treatment;
- no development project in the headline test;
- no sample-size claim based only on the 30-opportunity or 100-opportunity floor;
- no verifier result used as a semantic label;
- no same-agent examples as the sole semantic oracle;
- no unregistered exclusions or retries;
- no missing transcript/cost/hash field;
- no claim lacking an RQ, metric, scorer, analysis, and artifact pointer;
- no packet completion until two fresh reviewers independently pass it;
- no experiment launch without a later, fresh explicit human approval.

## source map

### LeetProof paper

- ID: `LP-TECH`
  - authoritative accepted full text:
    <https://verse-lab.org/papers/leetproof-ase26.pdf>
  - publication record: ASE 2026 proceedings version, 13 pages, event dated
    2026-10-12 through 2026-10-16, DOI
    <https://doi.org/10.1145/3832783.3837559>; retrieved 2026-08-05 PDT
  - local PDF:
    [paper](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026.pdf>)
  - local extraction:
    [Markdown](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026.md>)
  - sections: 1 through 3 and 8
  - claim supported: foundational mode-aware architecture and related-work
    positioning
  - exact quote fragment: “multi-modal verifier”
  - PDF sha256:
    `f3702b4d98a5f92f28a3f303102433b37e9aaeae16bd245df65481f03df1f664`
- ID: `LP-INFRA`
  - same primary paper, section 4
  - claim supported: bounded existential handling, output mutation, invariant
    instrumentation
  - exact quote fragment: “meta-programmed harness”
- ID: `LP-TRUST`
  - same primary paper, sections 2.2, 3.1, and 3.3
  - claim supported: Lean-checked code-to-spec certificate and heuristic-test
    boundary
  - exact quote fragment: “machine-checkable proof”
- ID: `LP-RQ1`
  - same primary paper, sections 5.1 and 5.2
  - claim supported: specification-equivalence categories, PBT catches, and
    benchmark defects
  - exact quote fragment: “183/188, 97.4%”
- ID: `LP-RQ2`
  - same primary paper, section 6.2
  - claim supported: paired composite-versus-direct-Lean setup, counts, budget,
    and pooled exact test
  - exact quote fragment: “23/35 vs. 16/35”
- ID: `LP-SPLIT`
  - same primary paper, sections 6.1 and 7
  - claim supported: benchmark construction and development/evaluation boundary
  - exact quote fragment: “15 problems during development”
- ID: `LP-INTENT`
  - same primary paper, sections 5.1 and 7
  - claim supported: unresolved natural-language-to-formal-intent link
  - exact quote fragment: “no established method”
- ID: `LP-EVAL`
  - same primary paper, sections 5 and 6
  - claim supported: RQ structure, residual-proof study, and second-model study
  - exact quote fragment: “RQ4”
- ID: `LP-VALIDITY`
  - same primary paper, section 7
  - claim supported: authors' stated limitations
  - exact quote fragment: “do not cover all software classes”
- ID: `LP-RELATED`
  - same primary paper, section 8
  - claim supported: inherited techniques and claimed distinction
  - exact quote fragment: “single verification mode”
- ID: `LP-ABLATION`
  - audit inference from sections 6.2 and 8
  - evidence: the treatment is the full Velvet pipeline and the baseline is
    direct Lean; no component-removal result is reported
  - uncertainty: absence was checked in the paper and archive inventory, not in
    private author experiments

### LeetProof artifact

- ID: `ART-AUDIT`
  - authoritative landing: <https://zenodo.org/records/19624966>
  - DOI: <https://doi.org/10.5281/zenodo.19624966>
  - primary archive/date: paper-referenced `v2`; record created 2026-04-17 and
    modified 2026-08-02; Zenodo metadata has no explicit version field
  - local audit:
    [official artifact audit](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026/official-artifact-audit.md>)
  - audit sha256:
    `45eb2b35c1b0cb5703e11de846b0b7d90ccacae11f3da7748f4d967e93f8810a`
  - local archive: `official-artifact-v2-zenodo-19624966.zip` in the same
    collection directory
  - archive sha256:
    `e4ffa6b7f4556cbffbadeb3674ede4b7f1048ee961a7daf4c07fb81b33255a04`
  - claim supported: released contents, reconstructed paired counts, held-out
    exact test, reproduction boundary
  - exact README quote fragments: “all the results”; “one LLM provider API key”
  - audit boundary: static inspection and count reconstruction only; no fresh
    model or Aristotle execution

### official ASE sources

- local source map:
  [ASE criteria snapshot](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026/ase-2026-official-criteria-source-map.md>)
- source-map sha256:
  `f2a012a14f340fc1532e3fca422e8a88e66adb3352f2799ed6bbdcbacbc90ec7`
- ID: `ASE-RESEARCH`
  - authoritative landing:
    <https://conf.researchr.org/track/ase-2026/ase-2026-research-track>
  - retrieved: 2026-08-05 PDT
  - claim supported: venue scope; the Technical Research criteria Significance,
    Novelty, and Soundness; the additional cross-category Verifiability and
    Presentation criteria; the data-availability rule; and official Research
    Paper listing
  - exact quote fragments: “Significance”; “Novelty”; “Soundness”;
    “Verifiability”; “Presentation”; “rigorous application of appropriate
    research methods”
- ID: `ASE-ARTIFACT`
  - authoritative landing:
    <https://conf.researchr.org/track/ase-2026/ase-2026-artifact-evaluation>
  - retrieved: 2026-08-05 PDT
  - claim supported: artifact documentation, reduced-run, container/VM,
    archival DOI, and review expectations
  - exact quote fragments: “container or a virtual machine image”; “DOI”;
    “three reviews”; “one day or less”
  - uncertainty: the 2026 artifact process was still ongoing on the retrieval
    date; no artifact badge or evaluation outcome is inferred for LeetProof

### frozen VL evidence set

- freeze time: 2026-08-05 PDT
- repository commit:
  `026cbb0a5763d5c4ef577deacbb42c68a58c13b1`
- ID: `VL-CAPABILITY`
  - source:
    [current capability summary](</ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md>)
  - sha256:
    `609be32f7b363ca6ae57fbfc3ba5634ad6538569a1b443be9d6b188094de3480`
  - exact quote fragments: “focused proof work”; “not yet establish autonomous
    repository-wide specification discovery”
  - classification: verified current capability boundary
- ID: `VL-STANDARD`
  - source:
    [guidance evaluation research standard](</ssd1/sichangheagent/VeruLaw/docs/roadmap/guidance_evaluation_research_standard.md>)
  - sha256:
    `51c03110e3a300b7da498a3df7a2e388eebf9569e84172c95d3b6db896727886`
  - exact quote fragments: “arm-blinded scoring”; “effect sizes with uncertainty
    intervals”; “100 or more”
  - classification: current evaluation design, not completed capability evidence
- ID: `VL-CLI-PLAN`
  - source:
    [CLI versus no-CLI plan](</ssd1/sichangheagent/VeruLaw/docs/roadmap/cli_vs_no_cli_evaluation_plan.md>)
  - sha256:
    `4183ab6849bd00c5628c09970d2c56d69ddd5f4545b67c633b42075b773c5de0`
  - exact quote fragments: “E0_NO_CLI”; “E1_CLI”; “A single paired run is a
    pilot”
  - classification: current evaluation design
- ID: `VL-OPS`
  - source:
    [experiment operating rules](</ssd1/sichangheagent/VeruLaw/docs/experiments/operating_rules.md>)
  - sha256:
    `62fd088e3bf3fb98f0635b38094e84ad9e82ed3931b124511ec8e827f01b2245`
  - exact quote fragments: “Missing evidence downgrades the claim”; “causal claim
    must name the comparison”
  - classification: current operational policy
- ID: `VL-PAIR-EVAL`
  - durable research evidence:
    [report](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026/vl-four-arm-evaluator-report-20260701.md>)
  - final report sha256:
    `fa3b6c4a6ea0523b272cc9654b7a80a28a7c3dee85a199803cd6295e26eba154`
  - archive-wrapper sha256:
    `761399e6b8f678c6f52c6717e5d5872fc96fa01c5af08c45325873aa8e0fd544`
  - exact quote fragments: “both arms succeeded”; “not a decisive success/failure
    difference”; “no full worker-session transcript exports for the no-CLI arms”
  - classification: bounded legacy two-task/four-arm `vlh` evidence, not a clean
    current Midas Lex E0/E1 study
  - retention audit on 2026-08-05: the four artifact directories named by the
    evaluator were absent at their recorded paths; the evaluator report remains
- ID: `VL-CURRENT-EVAL`
  - durable interpretation:
    [experiment interpretation](</ssd1/sichangheagent/work_logs/docs/vl-experiment-lessons/experiment-interpretation.md>)
  - token and trajectory analysis:
    [token report](</ssd1/sichangheagent/work_logs/artifacts/hvl_cli_push_11754_analyses/token/REPORT.md>)
  - interpretation sha256:
    `5e9ae4a8605c3d8b60abad7a439b51d3e6c468cd63d9085a69f45b7d7f1ca8da`
  - token-report sha256:
    `78486001cf29f03fae4c82111a7a3ed89aeb12757e71e8064c38a3a33f0fcc3c`
  - exact quote fragments: “exactly zero CLI calls”; “no clean matched control”;
    “One subject per condition”
  - classification: bounded experimental and trajectory evidence; no valid
    causal CLI-effect estimate
  - retention audit on 2026-08-05: the root Codex rollout still exists at the
    token report's recorded path with sha256
    `00a272800fb6592175b46b3e4dff18a20b47ccc4a3fbbbbc1fa675f0fa865cc2`;
    the cited arm-level `evidence/raw-transcript.jsonl` and result files were
    absent
- ID: `VL-REAL-USAGE`
  - source:
    [six-lane real-project evidence](</ssd1/sichangheagent/VeruLaw/docs/midas-lex/real_project_usage_evidence_20260722.md>)
  - sha256:
    `82ddece93edbf7455349516dc7fd0dae9052585952b300bf4091f3a118a8a7d0`
  - exact quote fragments: “citation index”; “not a controlled comparison”
  - classification: bounded observational evidence across six completed lanes,
    not a causal CLI-effect study
- ID: `VL-PROVENANCE`
  - source:
    [guidance-corpus provenance audit](</ssd1/sichangheagent/work_logs/artifacts/hvl_cli_push_11754_analyses/corpus/REPORT.md>)
  - sha256:
    `63a03fea02a213a2242debfb5900c5bc5e11b7190ccb996ada0488504ab9c041`
  - exact quote fragments: “source_commit: unknown”; “curation_status: blocked”;
    “generic_guidance”
  - classification: bounded machine audit of the worker-retrievable corpus and
    source-lineage execution gap
- ID: `VL-PORTFOLIO`
  - source:
    [completed bug-finding results](</ssd1/sichangheagent/VeruLaw/docs/experiments/midas_bugfinding_results_20260724.md>)
  - sha256:
    `9673255da88cfad8961b692923bb15c6fc8a6d2fff52fef7c36bec9ee9e60ffc`
  - exact quote fragments: “private historical portfolio index”; “bounded
    no-defect”
  - classification: historical bounded secondary index, not a controlled causal
    CLI comparison
- ID: `VL-PROJECT`
  - source:
    [project-generation ability evidence](</ssd1/sichangheagent/VeruLaw/docs/abilities/project_generation.md>)
  - sha256:
    `8d5d3a00072f8f87c6533cbab5c8db868b9fac4b1b13e9af7e6d34debc436c06`
  - exact quote fragment: “did not establish end-to-end generation”
  - classification: verified current capability boundary

### lifecycle records excluded from research evidence

The following task files establish routing and provenance only. No technical or
empirical claim in this note relies on them:

- [legacy four-arm evaluator task](</ssd1/sichangheagent/work_logs/vl_series_eval_9104.md>)
  - sha256:
    `f7a4b58955d2b8623c2085c9ef139a87ab767e223e97281fe27bad92ed5f5517`
- [nominal-treatment evaluator task](</ssd1/sichangheagent/work_logs/vl_evalrun_11375.md>)
  - sha256:
    `2ec66557ec591b5af5049d68e04077dc9d357f4db4444b1453b08a4adb57cac6`

## review record

- round one used three independent adversarial reviews: technical and venue fit,
  evaluation and statistics, and VL design versus execution. They challenged
  the venue inference, pooled significance, RQ3 paper/archive discrepancy,
  leakage, cost boundary, lack of ablation, statistical unit, power rationale,
  legacy `vlh` classification, evidence retention, and routing authority.
- round two gave each reviewer the integrated findings and asked for
  cross-review. Material corrections were to distinguish ASE's category-specific
  and cross-category criteria; separate lifecycle task records from durable
  research evidence; add the real-project and corpus-provenance sources; define
  the opportunity-level estimand and data hierarchy; treat 30 and 100 as planning
  floors; isolate sessions and releases; and require current-manager routing plus
  fresh human launch approval.
- those corrections are incorporated in this note, the concise handoff, the ASE
  source map, and the human memo draft.
- final independent review status: PASS on 2026-08-05. A fresh reviewer checked
  the corrected detailed note, concise VL handoff, paper and artifact audit,
  official ASE source map, archived VL evaluator report, source linkage,
  two-arm protocol, routing boundary, and listenable human memo. The reviewer
  repeated the gate after the memo was compressed and again returned PASS.
