# SkillSpec: Intent-Masked Specification Reasoning for Agent Skill Correctness
(authored by agents unless marked 🧑)
Tag: `zhang2026skillspec`, [paper](https://arxiv.org/abs/2609.06052) (arXiv id from the paper text; the earlier link 2602.12670 is the SkillsBench paper cited as [5], not this paper)

## problem and claims

SkillSpec treats an agent skill as a heterogeneous artifact: a `SKILL.md` file declares intent, while workflow instructions, inline code, scripts, and resources encode behavior. It adapts Hoare-style preconditions and postconditions to compare declared behavior with implementation behavior. Its central mechanism is an intent mask that creates one full expectation view and four factual views (Self, Neighbors, Lineage, Holistic; Fig. 4 and Fig. 5, p. 6). Candidate discrepancies are then tested in an isolated sandbox.

The paper says: “We formulate skill correctness as conformance between declared intent and encoded behavior.” (Section III-B, p. 4). It also says: “SkillSpec then derives specifications for each graph node” (Section I, p. 2). It reports: “On 515 real-world skills from SkillsBench and widely downloaded repositories, S KILL S PEC identified 763 manually confirmed defects across 239 skills, achieving 61.2% precision.” (abstract, p. 1). Table III (p. 9) reports 763 confirmed defects as 346 workflow and 417 code defects, with precision 55.4% and 67.1%, respectively. Inference: 763 / (625 + 621 validated candidates) = 61.2%, so the abstract's figure appears to be the pooled precision over both defect types; the paper does not state this derivation.

The authors explicitly limit the claim: “SkillSpec does not provide complete formal correctness guarantees.” (Section VI-A, p. 13). Specifications are textual predicates and discrepancy hypotheses; executable probes and manual review provide evidence.

## technique 1: construct a unified workflow/code graph

What it is. SkillSpec normalizes Markdown workflow units and implementation units into one graph with contain and dependency edges, then binds workflow `ref_code` units to code entry points. The graph preserves verbatim excerpts and bidirectional traceability so a finding can be localized from intent to source and back.

How to apply it.

1. Parse every source file with a language router and Tree-sitter grammar, walking its concrete syntax tree to collect definitions, calls, imports, and types (Section IV-A.1 and Algorithm 1, lines 1–10, p. 6).
2. Build symbol tables and resolve calls from local to imported to global scope. Resolve constructors and callables; refine method calls using receiver types and class hierarchy (Algorithm 1, lines 11–30, p. 6). The paper emits a call edge only when the callee maps uniquely to a repository-internal definition; standard-library, third-party and unresolved calls are omitted (Section IV-A.1, p. 5).
3. Use an LLM to decompose `SKILL.md` and repository resources into a typed workflow DAG: structural units (root, stage, context) and operational units (plain, `inline_code`, `ref_code`). Each unit keeps a unique verbatim excerpt; units are connected by contain edges and dependency edges (Section IV-A.2, p. 5).
4. For each `ref_code` unit, form `<step,file,entry>`, resolve the entry against the code graph, and bind directly to a function/definition or conservatively to a synthetic module-level node (Section IV-A.3, p. 6).
5. Define the implementation scope as the call subgraph reachable from the bound code node; retain a bidirectional mapping between workflow and code nodes (Section IV-A.3, p. 6).

The implementation deliberately prunes code definitions shorter than eight source lines from specification extraction while keeping them available as context (Section IV-B.2, pp. 6–7). It supports Python, JavaScript/TypeScript, and Shell in the reported system (Section IV-A.1, p. 5; Section VI, p. 14). Only code definitions reachable from a workflow–code binding are analyzed (p. 6).

Verus form (Inference: this paper is not about Rust or Verus). Represent graph nodes and edges as immutable Rust records. Use `spec fn` predicates for containment, dependency acyclicity, and binding; `ensures` on parsing/linking functions can state that every emitted edge refers to existing nodes and every binding preserves source identifiers. A topological traversal uses a loop `invariant` for processed-node closure. Verus does not parse Markdown or Tree-sitter grammars itself; parser correctness and source-span preservation need contracts or a trusted parser.

Evidence and limits. Summing the Num. column of Table V (p. 10) gives 11,501 workflow-graph nodes across 515 repositories and 7,077 code-function nodes; the table reports 1,502 eligible functions and 417 confirmed code defects. The dataset contains 515 repositories, 4,488 files, 103,005 skill lines, 198,404 code lines, and 635,856 other-resource lines (Table II, p. 8). Name resolution is conservative and can fall back to module-level nodes. Inference: omitting unresolved and third-party calls means the code graph can miss real call relationships.

## technique 2: derive textual Hoare specifications

What it is. For each eligible operational node `N`, SkillSpec extracts an `ExpectSpec` from surrounding declared intent and one `FactSpec_i` from each masked factual view. Each is a textual `{Pre} C {Post}` contract. The expectation view hides the target implementation; factual views expose the target implementation while hiding selected intent context.

The paper defines a defect as a reachable, in-scope deviation whose repair preserves generalization. It assumes the declared `SKILL.md` intent faithfully reflects user intent (Section III, p. 3). In its audiobook example, the expectation requires concatenation and a successful return, while the factual code also deletes every input file and the temporary concat list. The paper calls the deletion an undeclared side effect that violates the inferred postconditions (Figure 3 and Section III-B, p. 4).

How to apply it.

1. For a workflow node (operational nodes only) or a code definition (reachable from a workflow–code binding, at least eight source lines), compute its context by traversing the workflow graph and code graph separately in topological order, inheriting from predecessors and retaining relevant downstream nodes (Section IV-B.2, pp. 6–7).
2. Render visible text and source code into deduplicated inputs with stable node identifiers; require structured precondition/postcondition output and bounded correction for malformed model output (Section IV-B.2, p. 7).
3. Derive `ExpectSpec = E(N,V_FULL)`, where `V_FULL` masks the target node and implementation content so only declared intent supplies the expectation (Section IV-B.1, p. 6).
4. Derive `FactSpec_i = E(N,V_i)` for each factual view, retaining the target code and linked workflow while masking surrounding context according to the view; workflow nodes additionally expose the code branch reached through the binding (Section IV-B.1, p. 7 and Table I, p. 7).
5. First audit ExpectSpec against the source, filling missing constraints and removing unsupported predicates. Then compare each factual contract with the expectation, flagging cases where FactSpec_i strengthens admissible preconditions, weakens guaranteed postconditions, or introduces effects beyond the specified behavior (Section IV-B.3, p. 7).
6. Screen each candidate through reachability, observability, and supporting-evidence checks, filtering discrepancies caused by external factors such as hardware or environment; attribute a defect only within the skill's responsibility boundary and report at most one defect per node (Section IV-B.3, pp. 7–8).

The paper warns that a discrepancy “constitutes a defect hypothesis rather than proof of incorrectness” (Section III-B, p. 4). Natural-language intent may omit permissible implementation details, and runtime orchestration may compensate for local deviations.

Verus form (Inference). For a Rust implementation, translate each textual predicate into `requires` and `ensures` only after a human-defined semantic mapping. Use `spec fn` for artifact state and `proof fn` lemmas to show code meets the contract; use loop `invariant`s for propagated workflow constraints. Verus can check executable behavior against a precise predicate, but it cannot prove that an LLM's textual ExpectSpec captures the user's intent. Treat generated predicates as candidate contracts until reviewed.

## technique 3: intent mask with four factual views

What it is. The mask controls how much declared intent is visible during FactSpec extraction. The four layers are Holistic (skill objective/global constraints), Lineage (ancestors and propagated dependencies), Neighbors (peer operations and callers), and Self (target node). The paper says every factual view includes Self and augments it with a selected subset of the other three layers; Fig. 5 (p. 6) depicts one view per layer. The expectation view excludes Self and all implementation content.

The four factual projections are Self, Neighbors, Lineage, and Holistic. The paper says: “The intent mask acts as a context-projection operator that selectively exposes these layers to the specifications.” (Section IV-B.1, p. 6). The paper's rationale: exposing surrounding intent “may bias factual extraction toward the expected behavior, whereas excessive masking may remove the context needed to interpret the implementation correctly” (p. 6). In the ablation it adds that “Local views preserve concrete behavioral evidence but lack workflow context, whereas holistic views recover governing constraints but risk bias toward declared intent” (RQ4, p. 12).

How to apply it.

1. Precompute workflow and code graph contexts, retaining upstream and relevant downstream nodes (Section IV-B.2, p. 7).
2. For `ExpectSpec`, expose the full surrounding intent while masking the target content.
3. For each `FactSpec_i`, expose the target implementation and linked workflow, then project the layer combination of that view (Fig. 5, p. 6; layer semantics for workflow and code nodes in Table I, p. 7).
4. Extract a FactSpec per view and reason over ExpectSpec and all FactSpecs jointly (Fig. 4, p. 5; Fig. 6, p. 7).
5. Evaluate discrepancies progressively across the complementary views, “distinguishing persistent inconsistencies from view-specific deviations” (Section IV-B.3, p. 7). Inference: persistent discrepancies are the stronger candidates; the paper does not state how view-specific ones are ranked.

Verus form (Inference). Encode visibility as a ghost `View` enum and a pure projection function over graph nodes. Prove that each projection is a subset of the full graph and that Self is always present in factual views. Use `ensures` to retain stable identifiers. This formalizes dataflow discipline, but semantic interpretation of natural language remains outside Verus.

Evidence. Table VIII (p. 12) is an ablation on SkillsBench only (text and script subsets, GPT-5.6-Sol). Multi-view reasoning confirms 261 of 541 candidates (48.2%), against 228–236 confirmed defects for the single views (best rate 45.8%, Lineage); the paper says this is “without increasing the candidate pool”. The intersection of all single views holds 199 defects (76.2% of multi-view confirmed defects) and the union 255 (97.7%). The denominators are candidate sets per configuration, not all repository nodes. The paper observes that plain-text nodes remain a bottleneck and code nodes are more reliable across model families (RQ3, pp. 10–11; abstract, p. 1).

## technique 4: sandbox validation of candidate defects

What it is. Reasoning produces hypotheses. SkillSpec validates each in an isolated OpenCode sandbox with a fresh workspace and agent context. Code candidates receive executable probes; workflow candidates receive realistic trigger instructions and preconditions that exercise the loading chain.

How to apply it.

1. Allocate one warm container per skill but a fresh workspace and context per candidate; restrict validation to the reported target unit (Section IV-C, p. 8).
2. For code candidates, construct the smallest practical probe, execute the original repository logic without modification, and mock external dependencies when possible. Allow at most three validation attempts per candidate, and a 600-second default timeout per sandbox execution (Section IV-C and Section V-A.1, p. 8).
3. For workflow candidates, synthesize a realistic user trigger and artifact precondition, then verify that metadata routing and resource loading reach the alleged violation (Section IV-C, p. 8).
4. Record `validated`, `refuted`, `skipped`, or `failed`, along with trigger instructions, trajectories, and logs (Section IV-C, p. 8).
5. Have two authors independently score each validated defect from 1 (clear non-defect) through 3 (insufficient or ambiguous evidence) to 5 (clear defect). By mean score, treat ≥4 as confirmed, ≤2 as false positives, and 2<score<4 as unsure, kept as a separate outcome (Section V-A.3, pp. 8–9).

The paper states: “Testing provides reproducible runtime evidence as an observable deviation.” (Section VI-A, p. 13). It also states that for skills defined primarily by textual instructions, “constructing robust test cases, realistic trigger scenarios, and oracles remains challenging” (Section VI-A, p. 13).

Verus form (Inference). Reproduce code candidates with a verified Rust harness where possible. Use `requires` for the synthesized precondition and `ensures` for the observed postcondition; a proof function can show the probe reaches the target branch. External APIs, model routing, and sandbox isolation remain trusted unless separately specified. A failed probe is evidence of non-reproduction, not proof that the contract holds.

## evidence, contradictions, and product implications

The evaluation freezes 515 repositories: SkillsTop has 320 repositories (160 text, 160 script) and SkillsBench has 195 (152 text, 43 script) (Table II, p. 8). Table III (p. 9) reports 239 defective skills (46.4%), 625 validated workflow candidates with 346 manually confirmed (55.4% precision), and 621 validated code candidates with 417 confirmed (67.1%). Inference: the abstract's “61.2% precision” equals 763 / 1,246 pooled validated candidates; the paper gives no explicit reconciliation. Across all model backends, OpenCode executed validation for 6,933 candidate defects; 97.9% received conclusive verdicts and the remaining 144 were unresolved, “primarily due to budget timeouts, or task-specific environmental restrictions such as unavailable API credentials or GPUs” (RQ5, p. 12). The main results use GPT-5.6-Sol as the backbone model (RQ1, p. 9). Reported average cost is $2.585 per skill: graph construction $0.404 (15.6%), specification reasoning $1.915 (74.1%), and sandbox validation $0.266 (10.3%) (Table IX, p. 12); the total is $1,331 without discount, and the paper adds that the evaluation completed in 223 minutes with up to 30 repositories processed concurrently (RQ5, p. 12).

The defect taxonomy has 346 workflow and 417 code confirmations. Workflow proportions are requirement error 43.1%, constraint omitted 13.3%, semantic conflict 17.6%, implementation deviation 26.0%; code proportions are 1.7%, 6.7%, 0.0%, and 91.6%, respectively (Table IV, p. 9). These percentages sum to 100% within each column, and each uses the column total as denominator. The paper assigns categories with an LLM-as-a-judge protocol, and notes that 74.0% of workflow defects arise in requirement formulation and constraint propagation (p. 9).

Inference: what stays trusted is substantial: declared intent, graph/parser correctness, LLM extraction, model judgment, sandbox environment and dependencies, manual labels, and the claim that repairs preserve generalization. The paper itself states that SkillSpec adopts Hoare-style specifications “as an intermediate representation rather than a machine-checkable proof system” (Section VI-A, p. 13), and it does not report recall because “exhaustively enumerating all latent defects across real-world repositories is intractable” (Section V-A.3, p. 9).

Inference: for agent-written verified Rust, the closest reusable idea is the separation of expected contracts, implementation-derived facts, and executable validation. The product threat is high if natural-language specifications are treated as proofs: SkillSpec's own results show code precision 67.1%, workflow precision 55.4%, and unresolved validations. VL should not redo generic LLM skill auditing. It can reuse intent masking to detect when a generated Verus contract merely echoes the implementation, then require an independent contract source and a checked Rust/Verus proof. Candidate extraction should remain a triage layer; only Verus proofs and replayable tests should support product claims.

## techniques for the catalog

- unified skill graph — parse workflows and code into linked nodes with stable excerpts, call edges, and bidirectional bindings
- textual Hoare specifications — derive ExpectSpec from declared intent and FactSpec from implementation behavior as pre/post predicates
- intent-masked multi-view reasoning — compare full expectation with Self, Neighbors, Lineage, and Holistic factual projections
- discrepancy triage — classify strengthened preconditions, weakened postconditions, and undeclared effects as hypotheses
- sandbox validation — reproduce code deviations or workflow triggers in isolated contexts with bounded retries and logs
- independent manual confirmation — score validated candidates and report precision with explicit candidate denominators
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Although it behaves more conservatively and surfaces fewer candidates, it achieves a relatively high validation rate at substantially lower cost."): read all of the paper text (abstract through conclusion, tables, figures 3 and 5 viewed, reference list skimmed for the link) and the whole study; checked every quotation, number (Tables II to V, VII to IX, 61.2% = 763/1,246), section and page reference (pages are PDF pages of the 14-page body, 18 with references), and each technique step against Sections III to V. Changed: replaced the wrong link (2602.12670 is the SkillsBench paper, this paper is arXiv 2609.06052); corrected all page numbers (the old ones ran to p. 40); moved the "derives specifications" quote from the abstract to Section I; replaced the claim that 61.2% does not match with the pooled-precision inference; changed reviewers to two authors using mean scores; Table VIII is SkillsBench only and its denominators are candidates, not validated candidates; removed "increasingly local" views, an unsupported dynamic-dispatch claim and unsupported statements on view ranking; added the LLM-built workflow DAG, expectation audit, one-defect-per-node and LLM-judge taxonomy details; marked own conclusions "Inference:". Not checked: the Verus forms (study inferences, not paper claims), the cited external works, the released dataset and code, and the audiobook, security and stock case-study code beyond the text.
