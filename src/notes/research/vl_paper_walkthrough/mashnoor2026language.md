# From Language to Logic: Bridging LLMs & Formal Representations for RTL Assertion Generation
(authored by agents unless marked 🧑)
Tag: `mashnoor2026language`, [paper](https://doi.org/10.1109/vts69484.2026.11563398)

## what ProofLoop verifies

ProofLoop generates SystemVerilog Assertions (SVA) from a natural-language specification for a register-transfer-level (RTL) design. It combines an AST-indexed retrieval database, JasperGold structural queries, a ReAct tool-calling agent, and a JasperGold solver loop. The abstract states: “This paper presents ProofLoop, a tool-augmented ReAct agent that generates SVA from natural-language specifications using a solver-in-the-loop approach.” (abstract, p. 1) Its output is accepted only after JasperGold parses and formally analyzes the assertion; proven or undetermined assertions receive a separate vacuity check.

The paper evaluates 192 FVEval Design2SVA designs: 96 pipeline and 96 FSM designs (Sec. IV-A, p. 3). The primary Qwen3.5-35B pipeline reaches 93.7% syntax correctness and 82.0% functionality, where syntax means no JasperGold compilation errors and functionality is the ratio of proven to total assertions (abstract; Sec. IV-A). Inference: these percentages are assertion-level aggregates over the benchmark's generated assertions; the paper does not state the total assertion denominator in the table, so they are not 192-design pass rates.

## technique: AST indexing and retrieval-grounded context

What it is. The RTL is parsed with `pyslang` into a verifiable AST and decomposed into four semantic chunk types: module interfaces, always blocks, instances, and continuous assignments. Each chunk is embedded and stored in a per-design vector database. The paper says, “This modular decomposition ensures that the LLM context window is populated only with the most relevant design fragments rather than the entire RTL.” (Sec. III-B, p. 2)

When to use it. Use this when designs exceed an LLM context window or when signal names, module hierarchy, and clock/reset behavior must be grounded in actual RTL.

How to apply it.
1. Parse the complete SystemVerilog design into an AST with a compiler parser (Algorithm 1, lines 1–3, p. 3).
2. Split nodes into module-interface, always-block, instance, and assign chunks (Sec. III-B, p. 2).
3. Embed each chunk and store vectors in a design-specific database (Sec. III-B).
4. Expose retrieval calls for semantic search, module ports/parameters, hierarchy traversal, parameter resolution, and signal-specific always-block lookup (Sec. III-C, p. 2).
5. Return only retrieved chunks and authoritative structural observations to the agent's context.

Verus form. Inference: for Verus, index Rust modules, function signatures, trait implementations, `requires`/`ensures`, loop invariants, and call graphs into a retrieval store. Query the verifier or compiler for ownership and type facts before asking an LLM to write a proof. This is an orchestration layer; it does not change Verus's trusted checker or replace source-level specifications.

Evidence. The ablation on a 36-design subset reports full pipeline 93.7% syntax and 82.0% functionality, versus 90.9/70.9 with RAG removed. The denominator is 36 designs, but the paper does not give the number of assertions per configuration (Table III, p. 3). Removing all tools yields 70.3/36.1, described as the baseline configuration.

Limits. Retrieval quality depends on parser coverage and embeddings. Inference: a retrieved fragment can still be semantically insufficient or stale if generated RTL changes after indexing; rebuilding the index must be part of a sound workflow.

## technique: ReAct structural context gathering

Phase A uses an interleaved Thought–Action–Observation loop for up to six rounds. Retrieval tools provide lightweight database access; JasperGold structural tools provide fan-in/fan-out cones and flip-flop properties including clock domains, reset behavior, and data-input connections (Sec. III-C, p. 2). The agent decides which queries to issue based on the specification, so simple cases stop early while complex multi-module cases gather more context.

Steps from Algorithm 1 (p. 3):
1. Start the conversation with a system prompt, natural-language specification, and initial design context.
2. For each of up to six rounds, ask the LLM for a message with tool calls.
3. Stop if there are no tool calls; otherwise execute every retrieval or structural call and append its observation.
4. Use the resulting conversation as the input for assertion generation.

Verus form. Inference: use the same loop to query Rust module hierarchy, function bodies, inferred types, verifier diagnostics, and relevant proof lemmas. Keep tool observations in the prompt but require the final candidate to be compiled by Verus. ReAct reasoning is not evidence of correctness; it chooses context only.

The paper reports one case in which Phase A issued 22 tool calls across six rounds for a six-module FSM, querying all five execution-unit interfaces and retrieving reset and clocking behavior (Sec. IV-G, p. 4). This is a case-study count, not an average or a benchmark denominator.

## technique: solver-in-the-loop assertion repair

Phase B generates an SVA candidate, embeds it in the RTL, and submits it to JasperGold for bounded formal verification. The solver classifies results as proven, falsified, or undetermined. For proven or undetermined results, ProofLoop runs a vacuity check so an assertion is not accepted merely because its antecedent is unreachable. For a falsified result, error messages and counterexample traces are sent back to the agent, which performs localized edits rather than regenerating from scratch (Algorithm 1, lines 16–25, p. 3). The paper lists edits for signal references, clock/reset alignment, temporal operators, and antecedent/consequent structure (Sec. III-D, pp. 3–4).

How to apply it.
1. Generate SVA from the gathered context.
2. Run JasperGold for at most three verification rounds (Algorithm 1, line 16).
3. If status is proven or undetermined, run vacuity analysis and stop.
4. Otherwise parse the failure or counterexample and ask the LLM to fix the candidate.
5. Resubmit the localized repair; stop after three rounds even if it remains unresolved.

Verus form. Inference: replace JasperGold with `verus` compilation and verification. Feed failed postconditions, type errors, invariant failures, and counterexamples into a bounded repair loop. A Verus candidate should be accepted only when the verifier proves the intended postcondition; a vacuity analogue is a proof that the precondition is satisfiable and the function is actually exercised in tests or a model. Verus does not provide JasperGold's hardware temporal semantics, so this is an orchestration analogy, not a direct translation.

Evidence. The paper's case study starts with invalid array-slice SVA, receives a JasperGold compilation error, expands the slice into individual comparisons, and proves five assertions with zero falsified properties in the second round (Sec. IV-G, p. 4). The paper reports: “59.3% of syntax failures are corrected through solver feedback.” It also reports that only 20 of 101 initially falsified specifications fully recover (Sec. IV-F, p. 4); the denominators are explicitly 101 initially falsified specifications and the subset of 20 recoveries.

Limits. The paper observes that syntax repair is easier than temporal-logic repair. A solver's `undetermined` result is not a proof, which is why the vacuity check is separate. Inference: a Verus diagnostic loop can improve proof scripts but cannot detect a wrong property whose statement is itself too weak.

## empirical results and arithmetic checks

Table II compares direct prompting and the pipeline for Qwen3.5-35B and Mistral-Small-24B across the same 192-design benchmark. Qwen baseline/pipeline syntax is 78.3/93.7 and functionality 43.2/82.0; proven counts are 445/790 and falsified counts 246/260. Mistral baseline/pipeline syntax is 65.8/85.5 and functionality 31.1/53.3; proven counts are 249/419 and falsified counts 200/724 (Table II, p. 3). The table does not state whether counts use the same number of generated assertions in every cell, so percentages should not be recomputed from the proven/falsified columns.

Table III is the 36-design ablation noted above: removing RAG gives 90.9/70.9, removing the verification loop 82.9/64.7, removing structural analysis 80.0/58.4, and removing all tools 70.3/36.1 for syntax/functionality (Table III, p. 3). The reported relative deltas are −13.5%, −21.1%, −28.8%, and −56.0%; these are the paper's deltas relative to the full pipeline, not absolute percentage-point differences.

For the five-trial Design2SVA comparison, Qwen3.5-35B obtains `Func@1` 0.412 on pipeline designs and 0.860 on FSM designs, and `Func@5` 0.896 and 0.958 respectively (Table IV, p. 4). The table compares against prior models but does not repeat the per-category design denominator; the setup says each design has five independent trials (Sec. IV-E, p. 4). The conclusion reports a combined pass@1 of 0.636; that aggregate is not directly derivable from the two displayed Qwen category values without category weighting, so it should be treated as the paper's reported metric.

## techniques for the catalog

- AST-indexed retrieval: parse RTL into semantic chunks and retrieve only design fragments relevant to an assertion
- structural tool queries: obtain authoritative hierarchy, fan-in/fan-out, clock, reset, and register facts from the formal tool
- ReAct context gathering: let the agent choose retrieval and structural calls for up to a bounded number of rounds
- solver-in-the-loop repair: submit generated assertions to the solver and apply localized fixes from errors or counterexamples
- vacuity checking: test proven or undetermined assertions for unreachable antecedents before accepting them
- ablation accounting: measure retrieval, structural analysis, and verification feedback separately on a fixed design subset
