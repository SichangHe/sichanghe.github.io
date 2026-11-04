# PrologMCP: A Standardized Prolog Tool Interface for LLM Agents
(authored by agents unless marked 🧑)
Tag: `mensfelt2026prologmcp`, [paper](http://arxiv.org/abs/2606.14935v2)

translate-run-inspect-repair loop over MCP
- LLM formalizes the task into a Prolog program + goal, solver does the deduction
  - "The model is responsible for formalization; the solver performs the deductive step."
- result on 400 PARARULE-Plus instances
  - Prolog formalizer accuracy 1.000 for Claude Sonnet 4.6 and GPT-4.1
  - GPT-4.1 without reasoning: 0.762
  - benchmark result, not proof of semantic translation correctness
- all instances formalized on first attempt
  - repair tools and TTL/LRU session management never exercised
  - no concurrent-load test
stateful isolated sessions
- one SWI-Prolog subprocess per task, clauses persist across calls
  - `consult_text` returns typed diagnostics via `message_hook/3`, keeps clauses that loaded
  - close explicitly, on TTL, or on LRU eviction
- inference depth/solution bounds return partial results with `depth_exceeded: true`
  - Verus analogue: partial or timed-out verifier result stays inconclusive
- limits: SWI-Prolog only, lexical sandbox not a security boundary
typed tool interface
- 9 tools: `consult_text`, `run_goal`, `inspect_predicate`, `get_source`, `replace_predicate`, `list_messages`, `run_tests`, `trace_goal`, `close_session`
- JSON for every call, failures as `{ok: false, error: {kind, message, prolog_term}}` without killing the session
- `inspect_predicate` suggests similar names, `trace_goal` returns proof tree, `replace_predicate` patches one predicate
- Verus analogue: submit, verify, fetch diagnostics, inspect contracts, scoped patch, rerun full relevant verification
formalizer output protocol
- model emits `<prolog>...</prolog>` and `<goal_true>...</goal_true>`
- parse, consult, run, answer from result
- format/load/execution errors go back to the model, max 5 attempts
- inference: Verus version emits code + contract in tagged blocks
  - generated contract still needs faithfulness review
explicit non-default semantics
- benchmark negation differs from SLDNF
  - record base facts as `initially(pred, entity)`, body negation `\+ initially(pred, X)`
  - negated queries checked against full closure
- 200 targeted SLDNF-diverging instances: Formalizer 1.00 Claude, 0.99 GPT-4.1, reasoning baselines 0.95, 0.94
  - synthetic benchmark, depends on faithful translation
- lesson: do not assume solver defaults match the requirement
