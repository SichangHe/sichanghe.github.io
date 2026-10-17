# PrologMCP: A Standardized Prolog Tool Interface for LLM Agents
(authored by agents unless marked 🧑)
Tag: `mensfelt2026prologmcp`, [paper](http://arxiv.org/abs/2606.14935v2)

## result
PrologMCP exposes stateful SWI-Prolog sessions through the Model Context Protocol (MCP). The abstract says: “Symbolic delegation offers a complementary route: a language model translates the problem, while a solver performs the inference.” Section 6 (p. 12) states: “The model is responsible for formalization; the solver performs the deductive step.” An LLM translates a natural-language task into a Prolog program and goal; Prolog performs inference; structured diagnostics let the agent repair the program. The paper describes this as a “translate–run–inspect–repair loop” (Abstract, p. 1). On 400 PARARULE-Plus instances, the Prolog formalizer reached 1.000 accuracy for Claude Sonnet 4.6 and GPT-4.1, while GPT-4.1 without reasoning reached 0.762 (Table 3, p. 7). These are benchmark results, not a proof of semantic translation correctness in general.

## technique 1: stateful, isolated verifier sessions
What it is: keep a Prolog interpreter alive per task, persist clauses across calls, and isolate sessions in subprocesses.

When to use it: use this when an agent needs iterative formalization and repair instead of one-shot solver calls.

Steps from the paper:
1. Call `consult_text(source, dialect)`; allocate a fresh `load_id`, spawn SWI-Prolog, write source to a temporary file, and consult it (Section 3.2, p. 4).
2. If no module declaration exists, prepend a unique module so predicates are disjoint across sessions (p. 4).
3. Capture syntax errors and warnings with `message_hook/3`; return typed diagnostic entries while retaining clauses that loaded successfully (p. 4).
4. Keep the subprocess open. Close explicitly, on TTL expiry, or on LRU eviction (p. 4).
5. Bound inference by solution count and depth; return partial results with `depth_exceeded: true` so the agent can retry (Section 3.3, p. 4).

Verus form: Inference: the analogue is a per-task Verus workspace or verifier process with isolated source and logs, preserving successful proof artifacts between repair attempts. Verus itself verifies Rust modules rather than dynamically consulting clauses; process isolation, TTL, and LRU belong to orchestration code. A timeout or partial verifier result must remain inconclusive.

Evidence and limits: the server has a Python adapter, thread-safe session registry, and Prolog harness. It supports only SWI-Prolog, and its lexical sandbox is not a security boundary (Section 7, p. 12). In the evaluation each instance received its own session, “created by consult_text and closed on completion” (Section 4.3, p. 6). Section 7 (p. 12) says: “Because all instances formalised on the first attempt, only consult_text and run_goal were thoroughly exercised.” Inference: the repair tools and the TTL/LRU session management were therefore not evaluated; the paper reports no concurrent-load test.

## technique 2: structured tool interface and diagnostics
What it is: expose small typed operations instead of a monolithic solver call.

When to use it: use it when agents need to inspect and patch formal state after errors.

Steps from the paper:
1. Expose `consult_text`, `run_goal`, `inspect_predicate`, `get_source`, `replace_predicate`, `list_messages`, `run_tests`, `trace_goal`, and `close_session` (Table 1, p. 5).
2. Return JSON for every call; represent failures as `{ok: false, error: {kind, message, prolog_term}}` without terminating the session (Table 1, p. 5).
3. Let `inspect_predicate` report clauses, arity, type, export status, and clause count, with similar-name suggestions when no exact predicate exists (Table 1, p. 5).
4. Let `get_source` reconstruct module source and `replace_predicate` retract and reload one predicate patch (Table 1, p. 5).
5. Use `trace_goal` to return a proof tree and node count, and `run_tests` to return pass, fail, and blocked tallies (Table 1, p. 5).

Verus form: Inference: expose analogous operations around Verus: submit source, run verification, retrieve diagnostics, inspect contracts, apply a scoped patch, and rerun targeted tests. Verus proof terms are not dynamically replaceable predicates; patching must preserve source control and rerun the complete relevant verification. Structured diagnostics are useful only when the verifier returns enough location and obligation context.

## technique 3: formalizer loop with explicit output protocol
What it is: require the model to emit a program and query in tagged fields, parse them, call the solver, and retry on format, consult, or execution errors.

When to use it: use this for natural-language rule tasks where solver inference is easier and more reliable than free-form reasoning.

Steps from the paper:
1. Give the model the context and yes/no question and instruct it to emit `<prolog>...</prolog>` and `<goal_true>...</goal_true>` fields (Section 4.1, p. 5).
2. Parse both fields. Treat missing or malformed fields as format errors (p. 5).
3. Consult the program, run the goal, and interpret the result as the answer (p. 5).
4. If parsing, loading, or execution fails, return the structured error to the model and retry up to five attempts (Section 4.1, pp. 5–6; Table 2, p. 6).
5. Inference: keep task semantics explicit in the prompt and generated encoding; the paper’s Formalizer prompt (Appendix C.1) does this for negation rather than relying on Prolog’s default.

Verus form: Inference: an agent could emit Rust/Verus code and a target contract in tagged blocks, invoke Verus, feed diagnostics back, and retry. The final artifact must pass Verus without `external_body` on the function under verification; generated contracts require a faithfulness review. A Verus proof checks the supplied specification, not the natural-language claim.

## technique 4: encode non-standard negation explicitly
What it is: translate benchmark body-level negation against initial facts while keeping negated questions over the full derivable closure.

When to use it: use it whenever the task semantics differ from standard SLDNF or another solver default.

Steps from the paper:
1. Record every base fact additionally as `initially(pred, entity)` (Section 4.2, p. 6).
2. Render body negation as `\+ initially(pred, X)` and keep `initially/2` out of the goal (p. 6).
3. Check negated queries against the full closure, stated or derivable: the Formalizer goal omits `initially/2` (e.g. `\+sad(anne).`), and the Standard/Reasoning prompts say to check negated questions against the closure (p. 6; Appendix C).
4. Construct targeted instances where standard SLDNF either disagrees or loops, and evaluate both encodings (Section 5.2, p. 11).

Verus form: Inference: represent the intended operational semantics with explicit ghost state or a `spec fn` distinguishing initial facts from derived closure. Prove that executable updates preserve the separation. Do not assume a solver’s default negation semantics match the product requirement.

Evidence and limits: on 200 targeted SLDNF-diverging instances, Formalizer accuracy is 1.00 for Claude and 0.99 for GPT-4.1, while reasoning baselines reach 0.95 and 0.94 (Table 7, p. 11). The targeted set has 100 depth-4 and 100 depth-5 items, all expected false under PARARULE-Plus. This is a synthetic benchmark and depends on faithful translation.

## evidence, trust, and VL relevance
The 400-instance main sample is stratified by depth, rule type, and domain. Table 3 reports Claude Standard 0.988, Reasoning 1.000, Formalizer 1.000; GPT-4.1 Standard 0.762, o4-mini Reasoning 0.998, Formalizer 1.000 (denominator 400 for every system; p. 5). Formalizer total tokens/runtime are 1,426/5.11 seconds for Claude and 1,189/4.23 seconds for GPT-4.1; o4-mini Reasoning uses 1,548/11.27 seconds (Table 3, p. 7). Table 7’s runtime comparison on the targeted set is 6.2 versus 9.5 seconds for Claude and 3.1 versus 11.9 for GPT/OpenAI (Formalizer versus Reasoning; Table 7, p. 11, and text, p. 12).

The Prolog engine checks inference from the generated program. The LLM translation, benchmark labels, parser, MCP server, SWI-Prolog implementation, sandbox, and semantic equivalence between natural language and generated code remain outside that check. The paper itself concludes that the method shifts burden “from inference to translation” (Section 6, p. 12). Inference: for VL, this is a useful architecture for giving an agent a structured Verus verifier loop, but it is a moderate product threat because a wrong contract can verify cleanly. VL should reuse isolated sessions, typed diagnostics, scoped repair, and explicit semantics; it should not redo a generic MCP interface without measuring contract faithfulness and verifier overhead.

## techniques for the catalog
- isolated verifier session — persist task state in a dedicated process and tear it down on completion or resource policy
- typed diagnostic tools — expose inspect, trace, test, patch, and query operations with structured JSON errors
- translate–run–inspect–repair — require a machine-readable formal artifact, invoke the solver, feed failures back, and retry
- explicit semantic encoding — represent initial facts or other non-default semantics directly instead of trusting solver defaults
- bounded inference loop — surface depth, solution, timeout, and partial-result status so the agent can distinguish failure from inconclusive execution
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "This robustness is structural: the generated program encodes the PARARULE-Plus semantics explicitly, checking body-level negations against the fixed extensional database rather than against the full derivable closure."): read the whole paper text and checked every quotation, number (Tables 1, 2, 3, 7, Section 4.2, 5.2 counts), tool name, workflow step and section reference against it; page numbers are PDF page numbers (the paper prints none), and the old ones were wrong (e.g. Table 3 is on p. 7, not 5; Table 1 on p. 5; Section 7 on p. 12), so I corrected all of them. Changed: attributed the "The model is responsible for formalization" quote to Section 6 (not the abstract) and "from inference to translation" to Section 6 (not Section 5.2); replaced the unsupported claim about concurrent load with the paper's Section 7 statement that only consult_text and run_goal were thoroughly exercised, plus an Inference line; marked technique 3 step 5 as Inference; fixed technique 4 step 3 to match the prompts. Not checked: the Verus analogues (Inference, not from the paper), the cited works, the GitHub code, and PDF figures (only the text layer was read). The paper text has no arXiv id or DOI for itself, so the link is from the fetch record.
