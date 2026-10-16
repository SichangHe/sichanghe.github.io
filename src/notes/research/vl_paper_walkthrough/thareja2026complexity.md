# Complexity and Scale in AI-Assisted Workflow Management: A Federated Learning Case Study
(authored by agents unless marked 🧑)
Tag: `thareja2026complexity`, [paper](https://arxiv.org/abs/2606.18425)

## method and evidence

This paper's formal-verification-relevant contribution is specification-driven workflow generation. An LLM first creates an independent, reviewable design artifact containing constraints and acceptance criteria; only after approval does it generate Pegasus workflow code, wrappers, containers, and catalogs. The authors state: “The specification remains an independent artifact that can subsequently be used for conformance checking and regeneration.” (abstract, p. 1). This separates intended behavior from one generated implementation and permits checks that do not depend on execution.

The target is a federated-learning workflow with T rounds, K clients, fan-out local training, aggregation, and evaluation. A complete study produced 101 sub-workflows and 2,679 jobs on nine GPUs across four sites. The manually built analogue was estimated at three to four months; the plugin-grounded Claude workflow took two days (Table IV, p. 7). These are reported development estimates, not controlled productivity measurements.

## technique 1: specification as an executable contract boundary

Use when generated workflow code must be reviewed before costly execution. Start from natural-language intent and data description. Generate a structured specification covering datasets, FL design, Pegasus architecture, software and containers, catalogs, execution environment, experiment plan, directory structure, design decisions, dependencies, implementation status, and applied fixes. Divide validation content into (a) constraints that implementation must satisfy, (b) non-constraints where implementation may vary, and (c) expected outcomes such as artifacts, smoke-test settings, metrics, and figures. Have a user approve these statements and orchestration alternatives before code generation. Preserve the document as a living artifact, updating status and fixes after debugging (sections III-A–C, pp. 2–4).

Verus form (Inference): treat the specification as a set of Rust `spec fn` predicates over a workflow manifest: DAG edges, artifact paths, resource bounds, and required outputs. Give generated builder functions `ensures` clauses matching those predicates and use `assert`/proof lemmas to check each edge and path. This can prove a manifest's structural conformance; it cannot prove Pegasus, HTCondor, Docker, or a training script obeys the manifest once outside the verified model.

The paper's strongest operational evidence is regeneration: a fresh session given only the persisted specification recreated a structurally identical workflow (15 top-level jobs, four round sub-workflows, five jobs per round), differing only in filenames explicitly declared free; it satisfied all eleven constraints and reintroduced none of nine recorded defects (section V-B, p. 6). The study does not measure false-positive rate: reviewers were ten sessions of one model, and six of nine defects were covered by stated constraints.

## technique 2: workflow-specific skills as reusable proof context

Package system knowledge into self-contained skills containing instructions, documentation, examples, validation checklists, and templates. Invoke only the skill needed for the current step. The Pegasus plugin has construction skills (`/pegasus-scaffold`, `/pegasus-wrapper`, `/pegasus-dockerfile`), validation/recovery skills (`/pegasus-debug`, `/pegasus-review`), and reuse/support skills (`/pegasus-convert`, `/pegasus-help`, `/kiso`) (section III-B, pp. 2–3). The authors describe this as grounding API usage, staging patterns, and container configuration in repeatable material. The plugin was distilled from 14 real workflows, about 190 prompts over 15 developer-days; that authoring cost is separate from per-workflow effort.

Verus form (Inference): encode each reusable skill as a module exposing verified constructors and lemmas for a narrow invariant, such as unique output namespaces or catalog registration. Keep the proof context explicit and import only required lemmas. This resembles proof libraries, but an LLM skill remains prose and executable templates unless its outputs are compiled and verified.

Evidence across agents: Claude with structured skills generated 22 files, surfaced five design decisions, resolved staging initially, and was production-ready in two days; Codex generated 33 files but needed follow-up prompts; Kimi generated 15 files and never resolved staging. Sessions were 2, 9, and 4 respectively; output tokens were approximately 109K, 237K, and 178K (Tables III–IV, p. 6). These denominators are per-agent sessions in this one case study.

## technique 3: two complementary validation loops

Failure-driven debugging observes runtime traces. During execution, `/pegasus-debug` reads Pegasus, HTCondor, Docker, and filesystem evidence, diagnoses a failure, edits workflow definitions or wrappers, and resubmits affected jobs. The paper's disk-exhaustion example traces worker failure to every round staging a multi-gigabyte container; adding a cache-reuse property fixed it and the sub-workflows completed (section V-D-b, p. 8).

Conformance checking is static and pre-submission. Give reviewers the specification and generated code; require pass/fail/unclear for each stated constraint and a file and line supporting the verdict. Regeneration testing gives the specification alone to a fresh session and compares its rebuilt workflow against fixed criteria. The authors report: “Static checking is therefore most reliable exactly where the runtime is blind.” (section V-D-c, p. 8). Their nine defects split into six with runtime evidence and three silent; the latter included random tensors caused by a directory mismatch, an unused algorithm parameter, and shared output paths. All three were visible in source before submission; the random-tensor defect affected all 1,700 training jobs in the three reported configurations.

Verus form (Inference): represent runtime events and static manifests as ghost state. Prove that a repair preserves declared DAG and path invariants; specify a `requires` precondition for each job's input artifact and an `ensures` postcondition for its output. A proof cannot observe a remote scheduler's actual staging unless those effects are modeled or wrapped by verified adapters.

## technique 4: explicit orchestration alternatives and scale tests

Expose competing designs before implementation. The paper compares an ensemble-manager pattern (lower scheduling overhead and dynamic decisions but a single fault/provenance point) with a sub-workflow pattern (per-round dependencies and fault tolerance with scheduling latency). The user selected sub-workflows because GPU computation dominates. Then vary one FL factor at a time: E1 (K=10,T=50,E=2), E3 (K=5,T=50,E=2), and E4 (K=10,T=10,E=5). Corrected runs reached TCIA accuracies 93.6, 95.3, 94.2% versus centralized 95.8, 95.9, 95.1%; NIH accuracies 66.1, 66.8, 67.6% versus 67.4, 66.7, 66.3% (Table VI, p. 9). E4 reduced wall time from 24.3 to 4.6 hours and model exchanges by five times; jobs were 2,679, 2,179, and 559 respectively (Table VII, p. 9).

Verus form (Inference): encode round/client cardinalities and dependency preservation as arithmetic and sequence invariants. A verified planner can prove each aggregation consumes exactly the preceding round's model and that namespaces are disjoint. Resource availability and measured wall time remain environmental observations.

## trust, assumptions, and threat to VL

The paper proves no theorem about workflow correctness. It reports: “All three produced functional Pegasus workflows but differ in design completeness, interaction effort, and reproducibility.” (section V-B, p. 6). Its evidence is source conformance, regeneration, execution completion, and corrected-run metrics. Trusted elements include the natural-language specification, reviewer judgments, manually formalized defect classification, Pegasus and HTCondor, containers, data paths, model code, and all external services. The conformance reviewers were ten sessions of one model; false-positive rate was not measured. The authors note that only six of nine defects fell under a written constraint, so static checking's reach is bounded.

Inference: for VeruLaw, the transferable pattern is a persistent spec artifact that is independently checked and used to regenerate code, combined with runtime repair. Agent-written verified Rust can make the manifest and local wrappers trustworthy, but remote workflow orchestration, filesystem staging, GPU training, and data correctness remain outside a normal Verus proof unless modeled. The largest product threat is silent divergence between a high-level requirement and generated code that runs successfully; the paper's random-tensor incident is a concrete analogue. VL should adopt explicit acceptance criteria and regeneration tests before treating generated code as verified.

## techniques for the catalog

- specification-driven generation — review constraints and expected outcomes before generating executable workflow artifacts
- skill-grounded construction — package API knowledge, examples, templates, and checklists as reusable per-step skills
- dual validation loop — combine runtime failure repair with static conformance and regeneration checks
- orchestration choice and scale test — surface alternative DAG structures and measure controlled round/client tradeoffs
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
