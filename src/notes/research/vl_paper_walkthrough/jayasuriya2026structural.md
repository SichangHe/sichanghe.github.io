# Structural Verification for Reliable EDA Code Generation without Tool-in-the-Loop Debugging
(authored by agents unless marked 🧑)
Tag: `jayasuriya2026structural`, [paper](https://arxiv.org/abs/2604.18834)

## problem and framework

The paper generates OpenROAD programs from natural-language query-action prompts. It models correctness as structural consistency with a design hierarchy, including acquisition paths, type compatibility, and action preconditions (Sec. 3.1, PDF p. 3). The framework’s four stages are graph construction, graph-conditioned retrieval and generation, staged pre-execution verification with diagnosis-driven repair, and multi-step trajectory reflection (Sec. 3.1, p. 3). The authors emphasize: “Unlike execution-driven approaches, all correction occurs prior to tool invocation, requiring a single OpenROAD execution per task.” (Sec. 3.1, p. 3).

Inference: this is a contract-and-diagnostic architecture. It can guide a Verus agent to build explicit state and dependency invariants before compiling or running code, but the paper’s OpenROAD execution check is not a universal proof.

## technique: structural dependency graph

A task is represented as `G=(V,E)`, with typed design objects, intermediate conditions, and actions as nodes, and acquisition/dependency relations as edges (Sec. 3.1, PDF p. 3). A valid program must realize the graph’s acquisition paths and satisfy its constraints. The graph handles linear paths such as Design→Block→Net and branches that converge at an action such as `connect(Port,Net)` (Sec. 3.2, p. 3).

The graph is built by structured LLM extraction, deterministic parsing, and validation against an OpenROAD API schema (Sec. 3.2, p. 3). Nodes are valid, missing-but-real, or hallucinated; edges are checked for parent-child transitions. Violations become structured feedback and the graph is refined until constraints pass (Sec. 3.2, p. 3). The paper calls this step “structural grounding” and says it ensures “that only API-consistent graphs are passed to synthesis” (Sec. 3.2, p. 3).

How to apply it. (1) Extract typed object nodes, conditions, and action nodes from the prompt (Sec. 3.2, p. 3). (2) Add every required parent-child acquisition edge, including implicit intermediate objects (Sec. 3.2, p. 3). (3) Validate node types and edges against the API schema (Sec. 3.2, p. 3). (4) Classify missing or hallucinated nodes and repair the graph. (5) Pass only a constraint-satisfying graph to code generation.

Verus form. Inference: represent the abstract design state as Rust structs or enums and the dependency graph as ghost/specification sequences or relations. Use `requires` for valid object handles and parent-child relationships, `ensures` for state-preserving action results, and proof functions for graph-edge lemmas. A traversal loop should carry an `invariant` stating that every acquired object satisfies the graph relation. The OpenROAD schema and foreign API remain trusted interfaces unless separately modeled.

## technique: graph-conditioned retrieval and synthesis

Retrieval is decomposed into localized queries aligned with graph edges and substructures. Each query retrieves API usage patterns and code fragments relevant to one object transition or action dependency (Sec. 3.3, PDF pp. 3–4; the section starts at the bottom of p. 3). Generation is conditioned on the prompt, graph, and retrieved evidence; the graph restricts code to valid acquisition paths and dependency compositions (Sec. 3.3, p. 4).

How to apply it. (1) For each graph edge, retrieve API evidence specific to that relation (Sec. 3.3, p. 4). The paper also says generation is conditioned on the prompt, the graph, and the retrieved evidence. (2) Generate code against the complete graph and evidence. (3) Preserve intermediate acquisitions rather than collapsing the path into a guessed call. (4) Send the result to staged verification.

Inference: in VL, retrieval should supply Verus library contracts and project-specific state-machine facts keyed by proof obligations. Retrieved text is advice; the verifier must check the generated Rust. A graph node can map to a typed Rust value, while an edge maps to a function contract or lemma.

## technique: four-layer pre-execution verification and diagnosis-driven repair

The pipeline checks progressively deeper properties. Layer 1 checks that the Python is well-formed by AST parsing. Layer 2 checks causal flow: acquisition order, attribute access, and nullable returns. Layer 3 checks API alignment against retrieved APIs, including hallucinated calls and wrong object use. Layer 4 uses an LLM semantic judge for completeness, control flow, and output validity, and runs only after Layers 1–3 pass (Sec. 3.4, PDF p. 4).

Failures generate a structured report with stage, issues, and localized inconsistencies. The controller chooses among regeneration, edge re-retrieval, graph re-extraction, and accept. Repeated ineffective actions trigger a deterministic safeguard and escalation (Sec. 3.4, p. 4). The paper also states that, because all correction happens before the tool call, a larger repair budget does not add tool calls (Sec. 3.4, p. 4). The repair choices are: targeted code repair for L1/L2 or persistent L3 failures; edge retrieval updates for L3; graph revision for repeated L2 failures; and acceptance for minor issues where semantics remains valid (Sec. 3.4, p. 4).

How to apply it. (1) Parse and reject malformed syntax. (2) Check causal acquisition and nullable handling. (3) Check API/type alignment. (4) Run semantic checking only after earlier layers pass. (5) Map each diagnostic to a graph region. (6) Apply the matching localized repair. (7) Detect repair loops and escalate rather than repeating an ineffective action. (8) Invoke OpenROAD once after pre-execution checks.

Verus form. Inference: map Layer 1 to Rust/Verus parsing and type checking, Layer 2 to `requires` and state-transition contracts, Layer 3 to API contract checking, and Layer 4 to a model review that cannot substitute for Verus. Use `assert`, proof functions, and loop `invariant` declarations to discharge graph and state facts. Inference: write `invariant` as a loop declaration, and reserve `external_body` for a deliberately trusted boundary rather than the function under proof. A failed proof should produce an obligation-local diagnostic and trigger repair, while the final acceptance requires Verus success.

## technique: post-verification uncertainty

The authors observe that structural pass is necessary but not sufficient: some verifier-Pass programs still fail OpenROAD because of unsupported APIs or unstable repair trajectories (Sec. 3.5, PDF p. 4). They state: “The verifier enforces structural correctness but produces a binary decision.” (Sec. 3.5, p. 4). They combine code-level, trajectory-level, and coverage uncertainty as `u(x,T)=α1 u_code(x)+α2 u_traj(x)+α3 u_cov(T)`, with weights summing to one (Sec. 3.5, p. 4).

Code uncertainty combines a method-hallucination ratio with counts of invalid imports and unknown enums, checked against valid method, type, and enum sets (Eqs. 1–2, Sec. 3.5.1, p. 4). Trajectory uncertainty combines convergence, stagnation, and repair ineffectiveness (Eqs. 3–4, Sec. 3.5.2, p. 4). Coverage uncertainty is built from the ratio of verified (well-covered) calls to all calls and the unchecked-call ratio, which sum to one (Eqs. 5–7, Sec. 3.5.3, pp. 4–5). The paper gives these formulas but, in the text I read, does not state the values of the weights or the filtering threshold.

How to apply it. (1) Compute the method-hallucination ratio and the invalid-import and unknown-enum counts. (2) Measure whether failure layers improve, whether consecutive repairs stagnate, and whether repairs are ineffective. (3) Measure which calls have verified receiver/type coverage. (4) Combine the signals and filter low-confidence candidates before execution.

Verus form. Inference: use uncertainty only to prioritize or reject proof attempts; it cannot establish a postcondition. Coverage can be represented by a ghost set of obligations and an `ensures` clause requiring every required obligation to be discharged. External API behavior must be modeled with explicit contracts or marked as a trusted assumption.

## evidence

Table 1 reports single-step OpenROAD prompts; the paper does not state the prompt count in the text I read. Inference: the three variants’ 120 total calls at 1.00 calls/task suggest 120 tasks. Static verification passes 50.8% at 19.0 seconds; causal-only passes 79.2% at 27.5 seconds; the full pipeline passes 82.5% at 34.8 seconds, each with exactly 1.00 call/task and 120 total calls (Table 1, PDF p. 5). Tool-in-loop GPT-4.1-mini passes 76.0% at 53.0 seconds and 1.77 calls/task; OpenROAD Agent (Qwen 7B) passes 16.4% at 70.0 seconds and 3.54 calls/task (Table 1, p. 5). Inference: the totals 248 and 496 at 1.77 and 3.54 calls/task imply about 140 tasks for the two baselines, so the denominators may differ between rows; the paper does not say. Table 2 (p. 6) gives different latencies for the same baselines (OpenROAD-Agent 69.5 s, tool-in-loop 37.6 s) and adds GPT-4.1-mini LLM+RAG at 73.0% and LLM only at 48.0%.

The paper says it constructs “a dataset of 100 complex prompts via adversarial self-play” (Sec. 4.1, p. 5); the sentence follows the multi-step description, and Sec. 4.4 describes a multi-step dataset built by round-based adversarial evolution. On the multi-step benchmark, LLM+RAG passes 30.0%, structural per-step verification 70.0%, and per-step verification plus trajectory reflection 84.0%, with latencies 12.2 s, 53.9 s, and about 94.9 s (Table 3, p. 6; Sec. 4.4, p. 7). A multi-step task succeeds only if all subtasks execute successfully (Sec. 4.1, p. 5). The evaluation defines success as: “A task is considered successful if the generated code executes in the OpenROAD Python shell without raising an exception or traceback.” (Sec. 4.1, p. 5). Table 5 reports verifier precision/recall/F1: static 0.508/1.000/0.674, causal 0.807/0.968/0.880, LLM semantic 0.849/1.000/0.918, full staged 0.849/0.909/0.878 (Table 5, PDF p. 8). Table 6’s uncertainty filtering changes overall pass rate 72.0% to 84.0%, false-positive rate 20.0% to 6.7%, and precision 80.0% to 93.3% (Table 6, PDF p. 8; Sec. 4.6, p. 8). The paper does not say in the text I read which benchmark Table 6 uses or how filtering raises the pass rate. The paper’s graph extraction exact match falls to 31% for very complex prompts (26+ words), with node F1 87% and edge F1 69% (Table 4, p. 7).

The conclusion says: “Overall, the results suggest that failures in EDA code generation are fundamentally structural, and that enforcing dependency consistency before execution offers a scalable alternative to execution-driven correction.” (Conclusion, PDF p. 9). What is measured is execution success, latency, tool calls, classifier quality, and filtering precision. Inference: trusted pieces include OpenROAD, API schema, LLM semantic judge, generated benchmark, and the execution environment. The paper does not prove that a graph captures every semantic requirement or that a verifier-Pass program is universally correct.

Inference: threat to agent-written verified Rust is high for specification omission and moderate for proof workflow. VL should reuse explicit dependency graphs, localized diagnostics, staged checks, trajectory safeguards, and uncertainty filtering. It should not redo generic pre-execution structural checking if Verus contracts already encode the same dependencies; it must add a universal proof and specification review.

## techniques for the catalog

- structural dependency graph — represent typed objects, acquisition paths, conditions, and actions as an explicit execution contract
- graph-conditioned retrieval — retrieve API evidence per dependency edge and generate code against the validated graph
- staged verification — check syntax, causal flow, API alignment, then semantics before execution
- diagnosis-driven repair — map failures to graph regions and choose targeted regeneration, retrieval, graph repair, or acceptance
- trajectory safeguard — detect repeated ineffective repairs and escalate to a different strategy
- episode-level reflection — after a first pass over a multi-step task, analyze all subtask outcomes to find upstream root causes and drive a second synthesis pass (Sec. 3.6, p. 5)
- uncertainty filtering — combine code, repair-trajectory, and verification-coverage signals to reject unreliable passes
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Table 1 shows that the proposed framework requires exactly one OpenROAD call per task, compared to 1.77 for tool-in-the-loop correction and 3.54 for OpenROAD Agent."): read the whole paper text and checked every quotation, number, table and equation reference, page number (by PDF page), and technique step against it; changed the wrong page numbers for Eqs. 3–4 (p. 4) and Table 4 (p. 7), corrected the import and enum signals from ratios to counts, rewrote the “structural grounding” quote to the paper’s wording, relabeled the 120-task count and the trusted-pieces list as inference, split the 100-prompt dataset citation to Sec. 4.1, added the multi-step latencies, Table 2 discrepancy and Sec. 3.6 reflection; did not check the cited prior work, the figures (only their captions), or the Verus-form mapping beyond marking it Inference.
