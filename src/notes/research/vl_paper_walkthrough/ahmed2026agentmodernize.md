# AgentModernize: Preserving Business Logic in Legacy Modernization with Multi-Agent LLMs and Behavioral Specification Graphs
(authored by agents unless marked 🧑)
Tag: `ahmed2026agentmodernize`, [paper](https://arxiv.org/abs/2605.17535)

## core claim and evidence

AgentModernize treats modernization as behavioral preservation. Its four agents extract rules, encode them in a Behavioral Specification Graph (BSG), generate modern code, and validate behavior. The paper states: “The key intermediate artifact, a Behavioral Specification Graph (BSG), forces extracted business logic to be explicit and inspectable before any code is generated.” (abstract, p. 1). It does not claim formal equivalence: “We do not claim formal guarantees” (related work, p. 3).

The evaluation uses eight synthetic, hand-authored COBOL/PL-SQL scenarios, seven telecom and one banking, with three trials per scenario and deterministic pytest tests (evaluation design, pp. 4–5). With GPT-4o-mini, full AgentModernize reports 23.0% mean BER over eight scenarios and BSG extraction 92.3% recall and 90.2% precision (abstract; Tables III and VII, pp. 5–7). Inference: these are test-based behavioral proxies, not proofs of equivalence.

## technique 1: extract explicit and implicit rules into a traceable inventory

What it is. Agent 1, the Legacy Analyzer, parses source, configuration, schemas, and optional documentation. It extracts explicit rules from guards and comments and implicit rules from defaults, exception handlers, and cross-module dependencies, tagging each rule explicit/implicit with source location, effects, and confidence (framework §III-C, p. 3). The output is a JSON Business Rule Inventory (BRI).

When to use it. Use this before translation when behavior is undocumented or distributed through control flow. The paper's motivating failure is a suspended-account exemption silently dropped by a syntactically correct translation (introduction, p. 1).

How to do it. (1) Form the artifact bundle `L = {S, C, D, N}` (source, configuration, database schemas, optional natural-language documentation) (§III-B, p. 3). (2) Structural parsing identifies entry points, module boundaries, data flows, dependencies, PERFORM/CALL hierarchies, I/O, and database interactions (§III-C, p. 3). (3) Rule extraction records conditionals, validation, formulas, state transitions, and exception patterns (§III-C, p. 3). (4) Constraint discovery records type/range restrictions, referential integrity, temporal ordering, and domain invariants (§III-C, p. 3). (5) Annotate every rule with description, file and line range, inputs, output effects, and high/medium/low confidence (§III-C, p. 3).

Verus form. Inference: represent each extracted business rule as a Rust spec predicate, with source identifiers retained in comments or a manifest. Put assumptions in `requires`; express post-behavior with `ensures`; preserve explicit and implicit rules as separate predicates so reviewers can audit both. Verus can prove the generated implementation against these predicates, but extraction correctness remains outside the verifier unless a human or independent checker validates the inventory.

Evidence and limits. Table VII reports mean recall 92.3% over eight scenarios and precision 90.2%; the denominator is the eight-scenario benchmark, with per-scenario gold-rule counts 12–15 (Table VII, p. 7). S5 has the lowest recall, 76.9%, missing three SLA-threshold rules; S1 has 100% recall but 48.0% precision because of extra rules (Table VII, p. 7). Matching was manual by one primary annotator; a second annotator spot-checked S1, S5, and S8, and kappa was not reported (§V-E, p. 7; §VII, p. 8).

## technique 2: encode a Behavioral Specification Graph

What it is. The BSG is a directed acyclic graph `G = (V, E, Pre, Post, Inv)` (§III-D, p. 3). Nodes are operations annotated with typed inputs/outputs, rule IDs, preconditions, postconditions, and error behavior. Edges have exactly one of sequence, conditional, parallel, or error labels, while global invariants apply throughout the workflow (§III-D, pp. 3–4).

When to use it. Use the BSG as an inspectable trust boundary between noisy extraction and code generation. It exposes implicit rules before generation and keeps control flow on edges and data flow on nodes (§III-D, p. 3).

How to do it. (1) Convert each BRI rule into an operation node (§III-D, p. 3). (2) Add preconditions, postconditions, typed inputs/outputs, rule IDs, and error behavior (§III-D, p. 3). (3) Connect nodes with sequence, conditional, parallel, or error edges; use a guard for conditional edges and exception behavior for error edges (§III-D, p. 4). (4) Add global invariants, such as `order_total == sum(line_items)` (Listing 1, p. 4). (5) Inspect the graph before code generation; in S1 it makes the suspended-account disconnect exemption explicit (Listing 1, p. 4).

Verus form. Inference: encode each node as a Rust function contract, edge guards as `requires`, and global invariants as `invariant` clauses on loops or state-machine transitions. Use Verus state-machine constructs where orchestration is concurrent; the BSG's JSON/graph representation itself is a project artifact, not a Verus primitive.

Evidence and limits. The BSG captures 92.3% of gold rules at 90.2% precision (Table VII, p. 7), but the paper says downstream code generation is the bottleneck because BER is only 23.0% (§VI-A, p. 8). Inference: a correct intermediate specification does not ensure a correct implementation.

## technique 3: contract-directed transformation

What it is. Agent 3 generates Python/FastAPI services from the BSG under four principles: operation-to-endpoint mapping, contract preservation, data-model derivation, and flow preservation (§III-E, p. 4). Preconditions become input validation, postconditions become output assertions and error handling, and edge labels select orchestration patterns.

How to do it. (1) Map each BSG operation to a function or endpoint (§III-E, p. 4). (2) Translate pre/postconditions into validation, assertions, and error handling (§III-E, p. 4). (3) Aggregate typed inputs/outputs into data models (§III-E, p. 4). (4) Generate straight-line, guarded, async/gather, or catch-handler control flow from edge labels (§III-D–E, pp. 4–5). (5) Emit endpoint documentation mapping code back to BSG nodes (§III-E, p. 5).

Verus form. Inference: generate Rust functions whose `requires`/`ensures` mirror each BSG node and whose call structure follows graph edges. Replace Python runtime assertions with Verus contracts; retain executable error handling. A contract can be too weak, so the BSG and rule inventory still require review.

Evidence and limits. Full AgentModernize's mean BER is 23.0% over eight scenarios and three trials per scenario (Table III, p. 5). The ablation reports 23.8% for AM without feedback, versus 12.4% SP-LLM and 4.5% CoT-LLM (Table VI, p. 6). The conclusion says “BSG-guided generation (23.9%)” (p. 8), which conflicts with Table III's 23.0%; the paper does not resolve this discrepancy. Five cells report 0% BER because generated code was non-executable (prose output or Pydantic incompatibility) (§VII, p. 8).

## technique 4: generate BSG-based tests and differential traces

What it is. Agent 4 validates each BSG node with contract tests, boundary tests, and differential trace analysis (§III-F, p. 5). It emits a Behavioral Equivalence Report (BER) with per-node PASS/FAIL/PARTIAL, rates, failing cases, root causes, and remediation.

How to do it. (1) Generate tests for preconditions, postconditions, and invariants (§III-F, p. 5). (2) Add boundary cases for minima/maxima, empty and null inputs, and type limits (§III-F, p. 5). (3) Construct end-to-end traces from BSG expectations and compare outputs of the modernized service (§III-F, p. 5). (4) Feed failing tests and expected behavior back to Agent 3 for targeted correction (§III-F, p. 5). (5) Stop after a configurable maximum of three iterations (§III-A and §III-F, pp. 3, 5).

Evaluation method. Tests are generated from the gold specification and each method's own API surface, withheld from the pipeline, and run deterministically by pytest (§IV-C, p. 5). BER is `passing tests / total tests`; BRPS is `preserved rules / total rules` (§IV-C, p. 5). Because each gold rule receives exactly one test, per-scenario BRPS equals BER numerically, although the tables measure different views (Table IV, p. 6).

Verus form. Inference: replace generated test oracles with Verus postconditions for properties that can be expressed symbolically, and retain boundary/differential tests for environmental behavior and APIs. Verus proofs cover the specified paths; tests still expose specification gaps, integration behavior, and unsupported external code.

Evidence and limits. Feedback helps S4 (0 to 25.0%), S6 (0 to 53.3%), and S7 (0 to 43.6%) but regresses S2 (75.8% to 12.1%) and S8 (28.9% to 0.0%) (Table III, p. 5; §VI-B, p. 8). S3 is 0.0% for every method, showing multi-step wiring failure. Inference: feedback must retain the best verified iteration and rerun regression tests rather than always accepting the latest patch.

## what is proved, trusted, and relevant to VL

Nothing in the paper is a formal proof of equivalence; the authors explicitly disclaim formal guarantees (§II-D, p. 3). Trusted elements include synthetic scenario design, single-annotator gold rules, LLM-generated tests, the test-generation prompt, and the assumption that tested paths represent behavior. The benchmark has eight scenarios, three trials per scenario, and 32 scenario-method cells; 20 have zero standard deviation and the largest reported standard deviation is 48.1 (§VI-D, p. 8).

Inference: VL can adopt the BSG's trust boundary, source-traceable rule inventory, contract-directed generation, and targeted regression loop. Its product threat is moderate to high for agent-written verified Rust: the paper shows that an explicit behavioral contract and tests catch regressions that compile-and-run translation misses, while a green test score remains far from full behavioral equivalence. The result does not measure Verus or agent-written Rust, so threat magnitude is an inference. What VL should not redo is a syntax-only translation pipeline without an inspectable specification and independent checks.

## techniques for the catalog

- business rule inventory — extract explicit and implicit rules with source locations, effects, categories, and confidence
- behavioral specification graph — represent operations, typed data, pre/postconditions, invariants, and labeled control-flow edges
- contract-directed transformation — generate endpoints, data models, validation, and orchestration from BSG contracts
- BSG-derived validation — test contracts and boundaries, compare differential traces, and report per-node causes
- targeted feedback loop — send failed cases to the transformer for at most three correction iterations while checking regressions
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
