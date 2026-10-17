# Towards Fully Automated Medical Imaging Code Generation via Validation-Based Context Engineering
(authored by agents unless marked 🧑)
Tag: `zhao2026automedimg`, [paper](https://doi.org/10.1145/3832783.3834399)

AutoMedImg generates complete medical-imaging pipelines through two phases. Planning uses Dataset Analyser and Architect subagents, with a separate Verification Agent checking their outputs; Coding decomposes a validated design into modules written by parallel Coder subagents and validates each module and the assembled pipeline. Only validated outputs enter shared memory, and high-performing complete pipelines enter a cross-project adaptive knowledge base. The abstract describes the Coding Phase as “a Coding Phase that generates modules in parallel with static checking, execution testing, and assembly validation.” (Abstract, p. 1)

## technique: validation-propagating two-phase workflow

what it is and when to use it

Use this when generated modules depend on dataset-specific assumptions and errors can cascade. The paper places the Verification Agent and Tester Agent in an independent Validation Layer, which it says eliminates self-validation bias. Planning Router invokes Dataset Analyser then Architect; Verification Agent performs dataset semantic checks and architecture contextual and formal checks. Coding Router then allocates multiple Coder subagents in parallel to generate the Dataset, NN, Training, and Inference modules (Sections 3 and 3.1.1, pp. 3–4).

how to do it

1. Give the Planning Router a medical-imaging requirement and invoke Dataset Analyser to produce the required properties `P_DA`: modality, dimensions, spacing, intensity, and case count (Section 3.2.2, p. 5)
2. Run dataset semantic validation; require every property in `P_DA` and consistency, otherwise append diagnostic feedback and re-analyse (Section 3.2.2, p. 5)
3. Let Architect construct a JSON pipeline design from validated analysis, including classes, method signatures, attributes, and inter-module dependencies, as the Coding Router later parses it (Sections 3 and 3.2.3, pp. 3, 5)
4. Check architecture context against dataset conventions and modularity rules, then translate it to CSP# and verify with the PAT model checker (Section 3.2.2, p. 5)
5. Store only passing analysis and architecture in shared memory; Coding Router decomposes the design into module specifications for parallel Coder agents (Sections 3 and 3.2.3, pp. 3, 5–6)
6. Run static and execution validation per module, refine failures with diagnostics, integrate passing modules, and run assembly validation on the complete pipeline (Section 3.2.3, p. 6)

The dataset semantic check is `V_s(o_DA) = pass ⇔ ∀p∈P_DA: p∈o_DA ∧ consistent(o_DA)` (Section 3.2.2, p. 5). The architecture's PAT check covers deadlock-freedom, race-condition absence, and LTL properties such as model initialization eventually leading to training finished; the properties come from manually verified templates that the Verification Agent adapts by regex-based Skill invocation (Section 3.2.2, p. 5). On cross-project reuse the paper says, “A critical limitation of LLM-based code generation is the lack of cross-project continuity” (Section 3.3, p. 6).

Verus form

Inference: Represent each validated Rust stage as a function with `requires` for dataset-shape assumptions and `ensures` for output/interface contracts. Use Verus proof functions and loop `invariant` statements for local correctness, and retain an independent checker or test harness for cross-module behavior. CSP# and PAT do not carry over; the validation-propagation rule does.

## technique: multi-scale code validation

Static checking runs Pylint and Radon before execution. Pylint checks syntax and dependency validity; Radon supplies cyclomatic complexity and maintainability index, with thresholds `τ_CC = τ_MI = 80` (Section 3.2.3, p. 6). Failed checks report locations, dependency conflicts, and API mismatches. Execution validation generates 30–40 Pytest cases per module in three categories: assumption tests for input constraints, functional tests for computation, and integration tests for interface shapes (Section 3.2.3, p. 6). A module propagates only when both static and execution checks pass. Assembly validation repeats static and execution checks after integration to catch interface mismatches that isolated mocks hide (Section 3.2.3, p. 6). The paper says, “Only modules satisfying both static and execution validation propagate to assembly.” (Section 3.2.3, p. 6)

Inference: A Verus implementation should run `cargo verus` for each module's contracts, compile and execute focused tests, then verify the assembled crate with cross-module specifications. Complexity thresholds are project policy, not proof. Generated tests remain useful for behavior outside the formal model.

## technique: adaptive synthesis from validated pipelines

what it is and when to use it

AutoMedImg stores a validated architecture, codebase, project characteristics `ξ`, and performance metrics `ρ` when assembly passes and `ρ ≥ θ`: `K_Ada ← K_Ada ∪ {(o_Arch, code, ξ, ρ)}` (Section 3.3, p. 9). For a new requirement, it retrieves entries whose similarity is at least `τ_sim`, computed by LLM-based semantic matching; modality and task type must match exactly (hard constraints) while dimensionality and architectural requirements are judged by degree of similarity (soft constraints) (Section 3.3, p. 7). It adapts class counts, image sizes, preprocessing, or unlabeled-data logic, and the adapted outputs undergo validation in the main pipeline. The paper says, “Retrieved pipelines serve as reference implementations, providing validated architecture designs and codebases for adaptation.” (Section 3.3, p. 7)

how to do it

1. When assembly validation passes and the performance metric reaches `θ`, append the architecture, codebase, characteristics, and metrics to the knowledge graph via Cognee (Section 3.3, p. 6)
2. For a new project, compare modality and task type first; any hard-constraint mismatch disqualifies the entry regardless of soft similarity (Section 3.3, p. 7)
3. Judge soft constraints (dimensionality, architectural requirements) by degree of similarity and keep entries at or above `τ_sim` (Section 3.3, p. 7)
4. Extract components from the retrieved entry, adapt them to the characteristic differences, and validate the adapted outputs in the main pipeline (Section 3.3, p. 7)
5. Store the new pipeline only if it passes validation and meets `θ`; in the evaluation each dataset could reference only pipelines from previously processed datasets, to avoid leakage (Section 3.3, p. 6)

Verus form

Inference: Store verified Rust modules with their contract summaries, toolchain, dependencies, and proof status. Retrieve only entries with matching safety-critical interfaces, adapt parameters, and rerun Verus proofs; semantic similarity must never substitute for proof checking. Knowledge-graph retrieval and Python MCP tooling are external to Verus.

## techniques for the catalog

- validation-propagating workflow — pass only validated planning and coding artifacts to later agents, with diagnostic retries on failure
- multi-scale validation — combine static checks, execution tests, and post-integration assembly checks at increasing scopes
- formal planning check — translate architecture designs into CSP# and verify safety and liveness properties with PAT
- adaptive validated reuse — retrieve prior pipelines by hard and soft project similarity, adapt them, validate the adapted outputs, and store only pipelines that pass and meet the performance threshold
