# Spec2Vision: Contract-Guided Delivery of AI-Generated Computer Vision Pipelines
(authored by agents unless marked 🧑)
Tag: `jabour2026spec2vision`, [artifact repository named in the paper](https://github.com/annony-ml-llm/Spec2Vision.git) (the paper text gives no DOI or arXiv id of its own; GeCoIn 2026 workshop at IJCAI-ECAI 2026; the earlier DOI 10.1145/3105906 is the paper's reference [17], Monperrus's survey on automatic software repair, not this paper)

## what the paper establishes

Spec2Vision studies whether an explicit computer-vision task contract can survive staged generation, deterministic screening, testing, and bounded repair. It evaluates 17 tasks, 10 executable conditions, and five repeats per task-condition cell: 850 primary runs. The abstract reports: “The benchmark evaluates 17 CV tasks, 10 executable conditions, and 5 repeats per task-condition cell, for 850 primary runs.” (abstract, p. 1). The same model path (provider=gemma, model=gemma-4-26B-A4B-it) and the same downstream evaluator are used across conditions; the authors treat the model as “a fixed generation substrate rather than a model-ranking target” (section 3, p. 4).

The primary Spec2Vision condition reaches 81/85 evaluator-test passes and 81/85 strict-delivery successes. Removing compatibility scaffolding gives 58/85, structural repair 55/85, and generator preflight 39/85 evaluator-test passes (Table 3, p. 6). The lightweight baseline is core-runnable in 85/85 but reaches 17/85 evaluator-test passes and 6/85 strict delivery (Table 3, p. 6). These are fractions of the 85 runs per condition, not percentages of all 850 runs. The paper's central distinction is explicit: “The central result is that runnable generated code is not the same as delivered CV pipeline behavior.” (section 7, p. 8).

## technique: carry a structured contract through staged generation

what it is and when to use it

Convert a task specification into an operational contract and carry it through planning, generation, checks, testing, and repair. The paper's stated design choice is to treat the specification as “an operational contract that remains visible through context assembly, architect-to-generator handoff, deterministic preflight checks, testing, and bounded repair” (section 1, p. 1). Use it when a generated bundle must satisfy files, interfaces, outputs, metrics, and dataset-layout assumptions, rather than merely import or dry-run.

how to do it

1. start with a structured CV task specification; the paper's contract covers expected data interfaces, outputs, and metrics, and the tasks encode dataset and directory assumptions (section 3, p. 3)
2. have an architect produce a natural-language architecture plan, a JSON module graph, a YAML per-module interface contract, and a compiled JSON generator contract mapping modules to canonical files (section 3, p. 3)
3. pass those artifacts to the generator, which is expected to produce those canonical files (section 3, p. 3; Table 2, p. 4)
4. persist context and prompt manifests, contract artifacts, role traces, generated artifacts, diagnostic reports, and run-outcome snapshots in a run bundle (Figure 1, p. 3)
5. evaluate delivered files, runtime behavior, outputs, and metrics with a downstream evaluator that does not inspect Spec2Vision-internal artifacts (section 3 and Table 1, p. 4)

The paper gives a lane-detection example: the contract requires structured lane polylines and lane-specific precision, recall, F1, and latency reporting; the lightweight baseline stayed dry-run runnable in all five repeats but fell back to generic outputs or metrics, while the corresponding Spec2Vision runs passed all five evaluator tests (section 3, p. 5).

Verus form

Inference: encode the contract as Rust structs and enums with `spec fn` predicates for required files, interfaces, output shapes, and metric fields. Use `requires` on generation and validation boundaries, `ensures` for a delivered bundle satisfying the contract, and proof functions for structural lemmas. The LLM-generated files and CV model quality remain external inputs; Verus can prove the checker and transformations only if their semantics are modeled.

evidence, limits, and assumptions

The evaluator inspects delivered files, runtime behavior, outputs, and metrics, while excluding architect plans, role traces, context manifests, and critic artifacts (Table 1, p. 4). The authors also note it is “not an external third-party benchmark” and “may appear favorable to a contract-carrying system” (section 6, p. 7). This supports comparison but means the benchmark measures task-contract preservation, not scientific CV quality.

## technique: deterministic generator preflight

what it is and when to use it

Run deterministic checks on the generated bundle before downstream testing. The paper's preflight checks syntax, imports, undeclared dependencies, the required runtime entry point, and dry-run execution, plus lightweight heuristics for dry-run evidence and model-task drift (section 3, p. 3). Inference: use it to catch structural failures while repair is still local.

how to do it

1. check syntax and imports of the generated bundle (section 3, p. 3)
2. check for undeclared dependencies and the required runtime entry point (section 3, p. 3)
3. run the dry-run execution, with lightweight heuristics for dry-run evidence and for model-task drift; the paper does not say more about how these heuristics work (section 3, p. 3)
4. if fatal structural findings remain, the generator may attempt targeted structural repair, bounded to two passes (section 3, p. 3); the paper's Figure 1 shows preflight and repair as a local control path before validation (p. 3)
5. persist diagnostics in the run bundle so failures can be audited (Figure 1 and section 3, p. 3)

Verus form

Inference: write the preflight checker as executable Rust and specify a `valid_bundle` predicate. Proofs can show that a checker result implies required files and declared dependencies meet the predicate; `requires`/`ensures` can connect checker output to later stages. Syntax parsers, import resolution, filesystem behavior, and Python/CV runtime semantics need trusted specifications or separate verification.

evidence and limits

Without generator preflight, 82/85 primary runs remained core-runnable but only 39/85 passed evaluator tests; across the primary evaluation and two comparable reruns the evaluator range was 35–40/85 (Table 3, p. 6). This denominator is 85 runs per condition. Table 4 (p. 6) assigns 39 of its 46 strict-delivery non-successes to placeholder/mock substitution; the authors say removing preflight “shifts many failures to late placeholder/mock and data issues” (section 4, p. 6). The result is strong within the benchmark but may depend on the particular checks and task specification language (Inference). Inference: preflight is a practical complement to formal proof because it rejects interface and environment failures that a Rust proof about one helper function cannot see.

## technique: bounded structural repair

what it is and when to use it

When preflight leaves fatal structural findings, the generator may attempt targeted structural repair; the loop is bounded to two passes, after which “the run either proceeds with the repaired bundle or is recorded as failed” (section 3, p. 3). Inference: the bound prevents open-ended agent retries and makes the repair budget auditable.

how to do it

1. trigger repair only when fatal structural findings remain after preflight (section 3, p. 3)
2. make targeted structural edits, by the generator (section 3, p. 3); the paper does not say what inputs the repair step receives
3. stop after two passes (Figure 1: “max 2 passes”, p. 3)
4. then either proceed with the repaired bundle or record the run as failed (section 3, p. 3)

Verus form

Inference: represent repair state with a counter and prove an invariant that the counter is at most two. A transition function can `requires` a valid diagnostic and `ensures` either a contract-preserving repaired bundle or an unchanged failure state. Proof of contract preservation requires a model of the repaired artifacts; the LLM's edit itself is not trusted merely because the counter is bounded.

evidence and limits

Removing structural repair drops evaluator-test passes to 55/85 in the primary evaluation and 55–59/85 across the evaluation wave and reruns (Table 3, p. 6). The failure taxonomy assigns 30 of 30 non-successes to integration/interface failure in this condition (Table 4, p. 6), with counts over strict-delivery non-success runs in the named primary experiment. The paper says the taxonomy assigns one dominant class per non-success run, so it is descriptive rather than exhaustive causal attribution (section 6, p. 8). The authors call structural repair “the cleanest principal contrast” (section 5, p. 7).

## technique: compatibility scaffolding and role separation

what it is and when to use it

The paper names compatibility scaffolding as one of the mechanisms of the primary system (Table 2, p. 4; Figure 1 shows a “No compatibility scaffold” ablation) but, in the text read, does not describe what the scaffold contains. Role separation means an architect plans interfaces and a generator materializes the project (section 3, p. 3). Inference: use these mechanisms when contracts span heterogeneous outputs, metrics, and data layouts; the paper does not state this use case for the scaffold.

how to do it

1. normalize the specification and build layered context (Table 2, p. 4; Figure 1, p. 3)
2. let the architect produce handoff artifacts and the generator consume them (section 3, p. 3)
3. keep the compatibility scaffold in the pipeline; its internals are not specified in the paper text (Table 2, p. 4)
4. compare with a collapsed full-context single-agent control to test whether context alone substitutes for staged roles; the control reuses the layered context construction but collapses synthesis into one agent (Table 2, p. 5; section 4, p. 5)

Evidence: removing compatibility scaffolding yields 58/85 evaluator-test passes (57–59/85 across evaluations), versus 81/85 for primary; the full-context single-agent control reaches 18/85 (Table 3, p. 6). The no-history condition reaches 83/85 and no-architect-guidance 78/85, so those small effects are treated descriptively rather than as strong mechanism evidence (section 4, pp. 5–6). The authors say compatibility scaffolding “contributes more moderately” than repair and preflight (section 5, p. 7). Inference: role separation is a hypothesis supported here by the large collapsed-control gap, not a universal theorem about multi-agent systems; the paper itself says the result is “bounded evidence rather than causal proof” (section 5, p. 7).

Verus form

## what is proved, trusted, and unresolved

Spec2Vision contains no formal proof of generated CV correctness. It measures evaluator outcomes under one model configuration, 17 fixed tasks, five repeats, two comparable reruns, and one specification-grounded evaluator. The paper states that “the benchmark still measures preservation of the provided task contract rather than independent CV model quality” (section 6, p. 7).

## techniques for the catalog

- contract-carrying staged generation: persist task requirements as handoff artifacts (plan, module graph, interface contract, generator contract) through planning, generation, checking, testing, and repair
- deterministic generator preflight: check syntax, imports, dependencies, entry points, dry-run evidence, and task drift before downstream tests
- bounded structural repair: allow at most two targeted repair passes, then proceed with the repaired bundle or record failure
- staged versus collapsed evaluation: compare explicit role handoffs with a full-context single agent under the same task grid and evaluator
