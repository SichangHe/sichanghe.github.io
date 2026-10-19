# AgentModernize: Preserving Business Logic in Legacy Modernization with Multi-Agent LLMs and Behavioral Specification Graphs
(authored by agents unless marked 🧑)
Tag: `ahmed2026agentmodernize`, [paper](https://arxiv.org/abs/2605.17535)

## core claim and evidence

AgentModernize treats modernization as behavioral preservation. Its four agents extract rules, encode them in a Behavioral Specification Graph (BSG), generate modern code, and validate behavior. The paper states: “The key intermediate artifact, a Behavioral Specification Graph (BSG), forces extracted business logic to be explicit and inspectable before any code is generated.” (abstract, p. 1). It does not claim formal equivalence: “We do not claim formal guarantees” (related work, p. 3).

The evaluation uses eight synthetic, hand-authored COBOL/PL-SQL scenarios, seven telecom and one banking, with three trials per scenario and deterministic pytest tests (§IV-B–E, pp. 5–6). With GPT-4o-mini, full AgentModernize reports 23.0% mean BER over eight scenarios and BSG extraction 92.3% recall and 90.2% precision (abstract; Tables III and VII, pp. 6, 8). Inference: these are test-based behavioral proxies, not proofs of equivalence.

## technique 1: extract explicit and implicit rules into a traceable inventory

What it is. Agent 1, the Legacy Analyzer, parses source, configuration, schemas, and optional documentation. It extracts explicit rules from guards and comments and implicit rules from defaults, exception handlers, and cross-module dependencies, tagging each rule explicit/implicit with source location, effects, and confidence (§III-B–C, pp. 3–4). The output is a JSON Business Rule Inventory (BRI). The paper specifies: “Each extracted rule is tagged with its category (explicit or implicit) and a confidence score in the Business Rule Inventory.” (§III-C, p. 3).

When to use it. Inference: use this before translation when behavior is undocumented or distributed through control flow. The paper's motivating failure is a suspended-account exemption silently dropped by a syntactically correct translation (introduction, p. 1).

How to do it. (1) Form the artifact bundle `L = {S, C, D, N}` (source, configuration, database schemas, optional natural-language documentation) (§III-B, p. 3). (2) Structural parsing identifies entry points, module boundaries, data flows, dependencies, PERFORM/CALL hierarchies, I/O, and database interactions (§III-C, p. 3). (3) Rule extraction records conditionals, validation, formulas, state transitions, and exception patterns (§III-C, p. 3). (4) Constraint discovery records type/range restrictions, referential integrity, temporal ordering, and domain invariants (§III-C, p. 4). (5) Annotate every rule with description, file and line range, inputs, output effects, and high/medium/low confidence (§III-C, pp. 3–4).

Verus form. Inference: represent each extracted business rule as a Rust spec predicate, with source identifiers retained in comments or a manifest. Put assumptions in `requires`; express post-behavior with `ensures`; preserve explicit and implicit rules as separate predicates so reviewers can audit both. A Verus proof would assume these predicates correctly describe legacy behavior; reviewing the inventory is a separate check.

Evidence and limits. Table VII reports mean recall 92.3% over eight scenarios and precision 90.2%; these are means of per-scenario scores, with 12–15 gold rules per scenario (Table VII, p. 8). S5 has the lowest recall, 76.9%, missing three SLA-threshold rules; S1 has 100% recall but 48.0% precision because of extra rules (Table VII, p. 8). Matching was manual by one primary annotator; a second annotator spot-checked S1, S5, and S8, and kappa was not reported (§V-E, p. 7; §VII, p. 9).

## technique 2: encode a Behavioral Specification Graph

What it is. The BSG is a directed acyclic graph `G = (V, E, Pre, Post, Inv)` (§III-D, p. 4). Nodes are operations annotated with typed inputs/outputs, rule IDs, preconditions, postconditions, and error behavior. Edges have exactly one of sequence, conditional, parallel, or error labels, while global invariants apply throughout the workflow (§III-D, p. 4). The definition says: “V is a set of operation nodes, each representing a discrete business operation” (§III-D, p. 4).

When to use it. Inference: use the BSG as an inspectable trust boundary between noisy extraction and code generation. It exposes implicit rules before generation and keeps control flow on edges and data flow on nodes (§III-D, p. 4).

How to do it. (1) Represent discrete business operations as nodes and associate each node with a set of BRI rule IDs (§III-D, p. 4). (2) Add preconditions, postconditions, typed inputs/outputs, rule IDs, and error behavior (§III-D, p. 4). (3) Connect nodes with sequence, conditional, parallel, or error edges; use a guard for conditional edges and exception behavior for error edges (§III-D, p. 4). (4) Add global invariants, such as `order_total == sum(line_items)` (Listing 1, p. 4). (5) Inspect the graph before code generation; in S1 it makes the suspended-account disconnect exemption explicit (Listing 1, p. 4).

Verus form. Inference: encode each node as a Rust function contract, edge guards as `requires`, and global invariants as `invariant` clauses on loops or state-machine transitions. Use Verus state-machine constructs where orchestration is concurrent; the BSG's JSON/graph representation itself is a project artifact, not a Verus primitive.

Evidence and limits. The BSG captures 92.3% of gold rules at 90.2% precision (Table VII, p. 8), but the paper says downstream code generation is the bottleneck because BER is only 23.0% (§VI-A, p. 8). Inference: a correct intermediate specification does not ensure a correct implementation.

## technique 3: contract-directed transformation

What it is. Agent 3 generates Python/FastAPI services from the BSG under four principles: operation-to-endpoint mapping, contract preservation, data-model derivation, and flow preservation (§III-E, p. 4). The paper says: “Pre/postconditions from the BSG are translated into input validation, output assertions, and error handling in the generated code.” (§III-E, p. 4). Edge labels select orchestration patterns.

How to do it. (1) Map each BSG operation to a function or endpoint (§III-E, p. 4). (2) Translate pre/postconditions into validation, assertions, and error handling (§III-E, p. 4). (3) Combine typed inputs/outputs into data models (§III-E, p. 4). (4) Generate straight-line, guarded, async/gather, or catch-handler control flow from edge labels (§III-D–E, p. 4). (5) Emit endpoint documentation mapping code back to BSG nodes (§III-E, p. 4).

Verus form. Inference: generate Rust functions whose `requires`/`ensures` mirror each BSG node and whose call structure follows graph edges. Replace Python runtime assertions with Verus contracts; retain executable error handling. A contract can be too weak, so the BSG and rule inventory still require review.

Evidence and limits. Full AgentModernize's mean BER is 23.0% over eight scenarios and three trials per scenario (Table III, p. 6). The ablation reports 23.8% for AM without feedback, versus 12.4% SP-LLM and 4.5% CoT-LLM (Table VI, p. 7). The conclusion says “BSG-guided generation (23.9%)” (p. 9), matching Table III’s no-feedback mean of 23.9%. Table VI and the abstract instead report 23.8% without feedback; the paper does not resolve that discrepancy. Five cells report 0% BER because generated code was non-executable (prose output or Pydantic incompatibility) (§VII, p. 9).

## technique 4: generate BSG-based tests and differential traces

What it is. Agent 4 validates each BSG node with contract tests, boundary tests, and differential trace analysis (§III-F, pp. 4–5). It emits a Behavioral Equivalence Report (also abbreviated BER) with per-node PASS/FAIL/PARTIAL, rates, failing cases, root causes, and remediation. Its trace comparison uses “actual outputs against expected BSG-specified outputs” (§III-F, p. 5).

How to do it. (1) Generate tests for preconditions, postconditions, and invariants (§III-F, p. 4). (2) Add boundary cases for minima/maxima, empty and null inputs, and type limits (§III-F, p. 4). (3) Construct end-to-end traces from BSG expectations and compare outputs of the modernized service (§III-F, p. 5). (4) Feed failing tests and expected behavior back to Agent 3 for targeted correction (§III-F, p. 5). (5) Stop after a configurable maximum number of iterations, default three (§III-A and §III-F, pp. 3, 5).

Evaluation method. Tests are generated from the gold specification and each method's own API surface, withheld from the pipeline, and run deterministically by pytest (§IV-C, pp. 5–6). BER is `passing tests / total tests`; BRPS is `preserved rules / total rules` (§IV-C, pp. 5–6). Table IV states: “Each gold-standard rule is exercised by exactly one test, so numerically BRPS equals BER on a per-scenario basis” (p. 7). However, Tables I/IV list 12 gold rules for S2 and 14 for S3, while Table V lists 11 and 10 tests, respectively (pp. 5, 7). Inference: the claimed one-test-per-rule mapping is internally inconsistent; these tables do not establish coverage of every listed gold rule.

Verus form. Inference: replace generated test oracles with Verus postconditions for properties that can be expressed symbolically, and retain boundary/differential tests for environmental behavior and APIs. A successful Verus proof would establish the encoded properties under its assumptions; tests could still expose specification gaps and integration failures.

Evidence and limits. Feedback helps S4 (0 to 25.0%), S6 (0 to 53.3%), and S7 (0 to 43.6%) but regresses S2 (75.8% to 12.1%) and S8 (28.9% to 0.0%) (Table III, p. 6; §VI-B, p. 8). S3 is 0.0% for all four GPT-4o-mini configurations. The authors explain: “generated code implements individual validators but fails to wire multi-step orchestration” (§V-F, p. 8). Inference: retaining the best tested iteration and rerunning regression tests could reduce these regressions. The paper proposes retaining the best iteration; it does not implement that policy (§VI-B, p. 8).

## what is proved, trusted, and relevant to VL

Nothing in the paper is a formal proof of equivalence; the authors explicitly disclaim formal guarantees (§II-D, p. 3). Trusted elements include synthetic scenario design, single-annotator gold rules, LLM-generated tests, the test-generation prompt, and the assumption that tested paths represent behavior. The benchmark has eight scenarios and three trials per scenario. The authors state: “Of 32 scenario-method cells, 20 yield σ = 0.0; the largest σ is 48.1 (AM-NoFB on S5).” (§VI-D, p. 9). However, Table III’s caption lists only nine cells with nonzero standard deviation, implying 23 zero cells. Inference: the reported zero-variance count is internally inconsistent.

Model sensitivity limits the result: “For both GPT-4o and codex, SP-LLM alone outperforms AM (19.6% vs. 15.3% and 16.0% vs. 7.8%).” (§V-H, p. 8). The paper also states: “A missing baseline is “LLM + feedback without BSG”” (§VI-E, p. 9). Inference: the evaluation does not isolate the BSG’s contribution from decomposition and feedback.

Inference: VL can adopt the BSG's trust boundary, source-traceable rule inventory, contract-directed generation, and targeted regression loop. The result does not measure Verus or agent-written Rust, so it does not establish a competitive threat magnitude. Inference: VL should evaluate source-traceable specifications and independent checks for its own workloads.

## techniques for the catalog

- business rule inventory — extract explicit and implicit rules with source locations, effects, categories, and confidence
- behavioral specification graph — represent operations, typed data, pre/postconditions, invariants, and labeled control-flow edges
- contract-directed transformation — generate endpoints, data models, validation, and orchestration from BSG contracts
- BSG-derived validation — test contracts and boundaries, compare differential traces, and report per-node causes
- targeted feedback loop — send failed cases to the transformer for a configurable maximum number of correction iterations, default three; retaining the best iteration is proposed future work
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The feedback loop is not universally beneficial: on S2, feedback degrades BER from 75.8% (no feedback) to 12.1%, and on S8 from 28.9% to 0.0%."): checked all paper text, study quotations, numbers, section/page references, technique steps, tag and arXiv identifier; corrected page references, operation-to-rule mapping, the no-feedback discrepancy, validation scope and feedback policy; flagged inconsistent rule/test and zero-variance counts and removed the unsupported competitive threat rating; did not reproduce experiments, inspect unavailable artifacts, or validate the proposed Verus adaptations.
