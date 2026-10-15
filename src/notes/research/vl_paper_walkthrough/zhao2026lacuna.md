# LACUNA: Safe Agents as Recursive Program Holes
(authored by agents unless marked 🧑)
Tag: `zhao2026lacuna`, [paper](https://arxiv.org/abs/2605.28617)

## scope and result

LACUNA puts an LLM-generated program fragment inside a statically typed host program. The primitive is `agent[T](task)`: at runtime the model supplies Scala code, the compiler checks it at the call site against the expected type and available scope, and only accepted code runs. The paper's abstract says, “Each agent action is a typed call agent[T](task) that the LLM fills with code when execution reaches it,” and that rejected code leaves the environment untouched (Abstract, p. 1). This makes recursive agent control flow ordinary host-language code while preserving compile-time shape and capability checks.

Inference: the design maps directly to a Verus agent that emits Rust code plus specifications, compiles with Verus, and executes only an accepted fragment. Type checking alone does not prove functional correctness; the paper explicitly limits its guarantee to shape and authority.

## technique 1: typed runtime holes

What it is. `agent[T](task)` is a typed hole in the live lexical scope. The model may emit a block, local functions, loops, tool calls, or nested agent calls, but the final expression must have type `T`, every name must be in scope, and all host checks must pass (Section 3.1, p. 3). The paper says, “The compiler checks that source statically against T” (Section 3.1, p. 3).

How to do it.
1. Place an `agent[T](task)` call where a value is required; infer `T` from context when possible (Section 3.1, p. 3).
2. At runtime send the task, expected type, enclosing source, and available bindings to the model (Section 3.1, p. 3).
3. Compile the returned Scala snippet as if written at the call site, preserving imports, variables, functions, and capabilities (Sections 3.1 and 6.2, pp. 3, 9).
4. If compilation succeeds, load and evaluate the generated code; if it fails, return compiler diagnostics and retry (Sections 3.4 and 6.4, pp. 4, 9–10).

The example `agent[List[Int]]("filter the prime numbers from xs")` lets the model define a local `isPrime` helper and use `xs`; the expected result type prevents a string, integer, or Boolean result (Section 3.2, p. 4).

Verus form. Inference: generate a Rust expression or function body at a marked call site, then run `cargo verus` with the surrounding module and expected result type. Require an `ensures` clause for semantic postconditions and reject snippets that omit required proof obligations. Use `spec fn` and `proof fn` only in proof context; executable generated code must remain ordinary Rust. Verus does not provide LACUNA's dynamic recompilation primitive, so an integration would need a controlled compile-and-load boundary.

Evidence and limits. The paper reports roughly 400 verifier test cases pairing valid and invalid snippets; invalid names, type mismatches, non-exhaustive matches, and nulls are rejected before execution (Section 7.1, p. 10). A well-typed snippet can still implement the wrong algorithm; the paper states, “Well-typed is not correct” (Limitations, p. 12). Inference: this is a safety gate, not a proof of intended behavior.

## technique 2: atomic rejection and diagnostic retries

What it is. LACUNA compiles the whole generated snippet before running any statement. A later type error therefore prevents earlier side effects. The paper explains, “The typed hole is all-or-nothing by construction” (Section 4.2, p. 5).

How to do it.
1. Generate a complete snippet, including all statements and control flow (Section 3.1, p. 3).
2. Splice it into the enclosing source at the placeholder (Section 6.4, p. 9).
3. Recompile with the same static, effect, and capability checks as hand-written code (Section 6.4, p. 9).
4. On failure, append compiler diagnostics to the original task and retry up to a configured limit (Section 3.4, p. 4).
5. If retries exhaust, throw `EvalCompileException` or return a typed `EvalResult[T]` through `agentSafe` (Section 3.4, p. 4).

Verus form. Inference: compile and verify the entire generated Rust fragment in a temporary crate before committing state. Run it only after Verus accepts all `requires`, `ensures`, and loop `invariant`s. Feed verifier diagnostics back into retries. A transaction or state snapshot is still needed if compilation and execution are separate processes; Verus's proof acceptance alone does not make runtime effects atomic.

Evidence. On BrowseComp-Plus, 8.6% of generations were rejected before execution, average retries were 0.7 per query, and end-to-end compile success was 91.4%; the DeepSeek model reached 27.1% judged accuracy with 34.5% retrieval recall (Table 1, p. 10). The denominators are queries/generations under fixed corpus and retriever settings. On τ²-bench, DeepSeek solved 76.0% of 392 tasks overall, while retail averaged 7.1 regenerations and 77.6% compile success (Table 2, p. 11). These numbers measure acceptance and task outcome, not semantic proof correctness beyond the host compiler's checks.

## technique 3: lexical capabilities and information-flow control

What it is. Scala 3 capture checking makes in-scope capability values the agent's permission set. A generated snippet may invoke an effect only if it holds the corresponding capability, and it cannot return a value that leaks a capability outside its lexical scope. The paper says, “The lexical scope at the hole is therefore the agent’s permission set” (Section 4.3, p. 6).

How to do it.
1. Represent each resource or effect as an ordinary unforgeable capability value, such as an IO handle (Section 4.3, p. 6).
2. Bind only needed capabilities in the hole's lexical scope; compile generated code with capture checking enabled (Section 4.3, p. 6).
3. Reject a result whose function or object type captures a capability that would outlive its scope (Section 4.3, p. 6).
4. Wrap classified data in `Classified[T]` and expose only a pure `map(T→U)` operation, so sensitive values cannot flow to a hosted model or effectful function (Section 4.3, p. 7).
5. For adaptive local processing, call a nested local agent inside the pure map scope; capture checking still prevents network, filesystem, or hosted-model effects (Section 4.3, p. 7).
6. Run Scala safe mode to forbid reflection and raw process execution, the residual ambient-authority escape hatches (Section 4.4, p. 7).

Verus form. Inference: model capabilities as ghost permissions or borrowed references whose lifetimes and use are constrained by Rust's type system; expose only approved tool functions in the generated module. Encode classified data as an abstract wrapper with a proof that its contents cannot enter effectful APIs. Verus can prove data-flow properties when the wrapper and APIs are specified, but Rust unsafe code, FFI, reflection-like dynamic loading, and process execution remain trusted boundaries.

Evidence and limits. In the AgentDojo-derived attack study, LACUNA recorded successful attacker goals in 4/560 Workspace trials, 2/105 Slack trials, and 1/140 Travel trials for Gemini 2.5 Pro, with zero attacks in Banking; for o4-mini-high it recorded 0/144, 0/560, 1/105, and 0/140 respectively (Table 3, p. 12). Utility ranged from 42.86% to 65.97% depending on model and domain. The residual attacks show least-authority scope must be supplied by the developer; the type system does not infer it.

## technique 4: recursion, skills, and ReAct as ordinary control flow

Nested calls let a generated snippet split work, map over collections, and call the model again with richer intermediate context (Section 3.3, p. 4). A ReAct loop is tail recursion: each snippet reads tools and data, then calls `agent[T](task)` again until it returns a final `T` (Section 5.2, p. 8). Skills are typed functions whose bodies may be generated per call; self-improvement can shadow a function with a new same-typed definition in a long-running REPL (Section 5.1, p. 7).

Inference: a Verus implementation can expose recursive proof or execution tasks only with explicit depth and fuel limits. Use `invariant` clauses for loops and termination measures for recursive `proof fn`s. Dynamic self-modifying code should be treated as a new verified artifact requiring a fresh Verus run, not as a trusted update.

The runtime tracks nested-agent depth and enforces a configurable cap; otherwise accidental infinite recursion is indistinguishable from legitimate long-horizon work (Section 3.3, p. 4). The paper notes that recursion depth, fuel, wall-clock, and memory are outside the type system and require external budgets (Limitations, p. 13).

## what is proved, measured, and trusted

Proved by the prototype: host compiler rejection of undefined names, type mismatches, non-exhaustive matches, capability leaks, and malformed snippets before execution, across roughly 400 tests. Measured: BrowseComp-Plus accuracy and retries, τ²-bench solved rates over 392 tasks, and prompt-injection outcomes with explicit attack denominators. Trusted: Scala compiler/type checker and code generation, runtime splicer, safe-mode configuration, capture checker, host program and lexical scope, and any external tools. Unproved: algorithmic correctness, termination, resource bounds, and adequacy of the task specification. Inference: the threat to agent-written verified Rust is reduced for authority and compilation failures, but Verus postconditions are needed to close the semantic gap. The closest reusable VL pattern is typed-hole generation followed by whole-fragment Verus checking, least-authority scope, atomic state application, and diagnostic retries.

## techniques for the catalog

- typed runtime holes — let a model fill code at a call site while the host compiler enforces result type and lexical names
- atomic verifier retry — compile the complete fragment, reject it without effects, and feed diagnostics into bounded retries
- capability-scoped generation — expose only lexical capabilities and prevent capability-bearing results from escaping
- classified information flow — keep sensitive data inside pure wrappers and use local nested agents under the same scope
- recursive typed control flow — express skills, ReAct, sub-agents, and parallel decomposition as typed nested calls with depth caps
Checked 2026-10-15 against paper zhao2026lacuna: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
