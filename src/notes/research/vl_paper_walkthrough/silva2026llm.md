# An LLM-Based Assistance System for Intuitive and Flexible Capability-Based Planning
(authored by agents unless marked 🧑)
Tag: `silva2026llm`, [paper](https://arxiv.org/abs/2605.28666)

## scope and result
The paper adds a language-model assistance layer to a capability-based SMT planner for industrial automation. Its division of responsibility is explicit: “Formal planning correctness remains with the symbolic planner, while the LLM layer handles natural-language access and flexible knowledge model adaptation under explicit Human-in-the-Loop (HitL) approval.” (Abstract, p. 1) The method has four components: Capability Grounding, Symbolic Planning, Result Interpretation, and Planning Adaptation (Abstract and §III-A, pp. 1, 4). It is evaluated on 23 scenarios: 10 knowledge queries, four satisfiable plans, four unsatisfiable plans, and five adaptive plans; SAT, UNSAT, and adaptive cases are repeated five times (§V-A, p. 6).

## technique: route a fixed, auditable workflow to specialist agents
Use this when natural-language requests can mean knowledge lookup, planning, or a runtime failure, and when model changes require explicit approval. The paper first identifies four process types—intent classification, knowledge retrieval, planning/explanation, and constraint analysis/adaptation—and assigns six specialists (§III-B, pp. 4–5). Apply the workflow as follows:

1. The Router Agent classifies the request as a knowledge query, planning request, or runtime-failure report (§III-B, p. 5)
2. The Knowledge Retrieval Agent queries the capability graph; for planning, the user confirms the required capability before solving (§III-B, pp. 5–6)
3. The Capability Mapper connects formal constraints or reported changes to required and provided capabilities (§III-B, p. 5)
4. The Planning Agent invokes the existing SMT planner and translates a plan or UNSAT result (§III-B, p. 5)
5. The Analyze and Adaptation Agent derives a concrete model update from an UNSAT set or runtime change (§III-B, pp. 5–6)
6. The user approves the update, then the Repair Agent executes it and replanning starts (§III-B, p. 6)

The control choice is a routed graph rather than unconstrained delegation: “A central Router Agent classifies the user intent and delegates to the appropriate specialist, while HitL checkpoints are placed at fixed, well-known positions in the workflow.” (§III-B, p. 4) LangGraph encodes nodes and conditional edges; a shared state carries intermediate results (§IV, p. 6).

Inference: in Verus, the Router can select a proof-retrieval, compile, counterexample, or repair path, but only a deterministic Verus invocation should decide whether Rust satisfies `requires` and `ensures`. A shared state may hold source, diagnostics, and candidate proofs; it must not be treated as a proof fact.

## technique: keep symbolic solving as the correctness gate
Use this when LLM output proposes formulas, explanations, or repairs but hard constraints must remain authoritative. The capability ontology is transformed into SMT, and the solver returns either a plan or a minimal unsatisfiable constraint set (§II-B and §III-A, pp. 3–4). The LLM does not replace this check; it grounds requests, explains solver output, and proposes graph edits. The paper states that pure LLM planning “cannot be relied upon to satisfy hard logical and physical constraints consistently” (§II-C, p. 3).

Inference: a VL implementation should generate or edit Verus code/specifications with an LLM, run Verus, and accept only code that verifies. Explanations and repair suggestions remain untrusted text. A successful Verus run proves the stated contracts under Verus's assumptions, not that the natural-language goal was modeled correctly.

## technique: turn UNSAT into an approved adaptation loop
Use this when a valid plan may become possible after changing capabilities or constraints. The paper's four steps are: analyze the UNSAT set or reported change; derive a targeted knowledge-graph proposal; present it for HitL approval; apply the approved update and retry planning (§III-C, p. 6). The loop ends at a satisfiable plan or an unresolvable conflict. Runtime failures first identify affected provided capabilities, then remove or update them with confirmation (§III-C, p. 6).

The method's worked example reports two conflicts: “the required output product depth of 2 mm is outside the acceptable range of 5 mm to 10 mm for the drilling module” and a station-ID mismatch (§V-B, p. 7). One repair aligned depth to 5 mm and station ID to 3. In two of five repetitions, however, the system aligned a transport target to start station 3 instead of reachable end station 7, dropping the transport step while remaining formally consistent (§V-B, p. 7).

Inference: Verus can represent each proposed adaptation as an edit to a spec predicate, model, or `requires` clause, then rerun verification. The HitL checkpoint is a process control; Verus itself cannot determine whether changing a requirement preserves the intended product behavior.

## evidence, trust, and limits
Table I counts success only when every criterion is fully satisfied across all repetitions (§V-B, p. 7): knowledge query 9/10 (one omitted parameter-range justification), SAT 4/4, UNSAT 3/4, and adaptive planning 5/5. The 3/4 UNSAT result includes the reproducibility error above. No hallucinations were observed in 10 knowledge queries, but this is one laboratory modular-production model and qualitative criteria, not a statistical reliability guarantee (§V-A–B, pp. 6–7). The implementation uses GPT-4o mini for agents, GPT-4o for analysis, temperature zero, JSON schemas, GraphDB/SPARQL, and an external SMT planner (§IV, p. 6). Trusted elements include the SMT solver, ontology, graph update code, and user approvals; the LLM, prompts, and chain-of-thought are not correctness proofs. The paper notes a single use case and user-triggered runtime reports as limitations (§VI, p. 8).

Inference: the threat to agent-written verified Rust is moderate. The architecture can reduce proof-context and diagnosis friction, but an incorrect repair can weaken specifications or omit intended behavior while still verifying. VL should log every generated edit, require review of contract changes, and preserve the verifier as the acceptance gate.

## techniques for the catalog
- routed specialist workflow — classify intent and dispatch fixed graph branches with explicit approval checkpoints
- symbolic back-end gate — let the SMT/verifier, not the LLM, decide constraint satisfaction
- UNSAT adaptation cycle — analyze conflicts, propose a targeted model edit, obtain approval, apply, and retry
- shared-state traceability — pass machine-readable intermediate results among narrowly scoped agents
Checked 2026-10-15 against paper silva2026llm: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
