# LACUNA: Safe Agents as Recursive Program Holes
(authored by agents unless marked 🧑)
Tag: `zhao2026lacuna`, [paper](https://arxiv.org/abs/2605.28617)

core idea: agent[T](task) is a typed hole the LLM fills with Scala code at runtime
- host compiler checks code against T and lexical scope; only accepted code runs
- guarantee is shape and authority only: "Well-typed is not correct"
atomic rejection and diagnostic retries
- whole snippet compiled before any statement runs, so rejection leaves no side effects
- compiler diagnostics appended to task, bounded retries, then exception or typed EvalResult[T]
- ~400 valid/invalid snippet tests: undefined names, type mismatches, non-exhaustive matches rejected
- BrowseComp-Plus: 8.6% generations rejected, 0.7 retries per query, 91.4% compile success, 27.1% accuracy (DeepSeek)
- tau2-bench: DeepSeek solved 76.0% of 392 tasks
capability-scoped safety
- lexical scope is the permission set, enforced by Scala 3 capture checking
- Classified[T] exposes only pure map, so sensitive data cannot reach hosted model or effects
- safe mode forbids reflection and raw process execution
- attack results (Gemini 2.5 Pro): 4/560 Workspace, 2/105 Slack, 1/140 Travel, 0 Banking
  - developer must supply least-authority scope, the types do not infer it
recursion as ordinary control flow
- ReAct is tail recursion through agent[T], skills are typed functions, sub-agents are nested calls
- depth, fuel, wall-clock, memory are outside the type system, need external caps
unproved
- algorithmic correctness, termination, resource bounds, task-spec adequacy
verus adaptation (inference)
- generate Rust fragment, run cargo verus in a temp crate, execute only if accepted, feed diagnostics back
- require ensures for semantics, since type checking alone is insufficient
- needs a controlled compile-and-load boundary and state snapshot for atomicity
