# COBALT-TLA: A Neuro-Symbolic Verification Loop for Cross-Chain Bridge Vulnerability Discovery
(authored by agents unless marked 🧑)
Tag: `blain2026cobalt`, [paper](https://arxiv.org/abs/2604.12172)
## problem and contribution

COBALT-TLA targets temporal ordering failures in cross-chain bridges. The paper identifies the recurring failure as a distributed state machine reaching a globally invalid state even though each individual transaction is locally valid. Its abstract reports: “We present COBALT-TLA, a neuro-symbolic verification loop that pairs an LLM with TLC, the TLA+ model checker, in an automated REPL.” (Abstract, p. 1.) The loop asks a language model to propose a bounded TLA+ module and configuration, runs TLC as a deterministic semantic checker, parses the result, and feeds a structured trace or compiler error back to the model.

The claimed security target is architectural behavior: reorgs, stale queues, pre-finality minting, and invalid initialization across chains. Static analyzers and bounded symbolic execution remain useful for intra-contract arithmetic and reentrancy, but the paper says they lack the vocabulary for cross-chain concurrency, consensus, and time (Section I, p. 1). COBALT-TLA operates on protocol descriptions rather than deployed bytecode; KEVM integration is future work (Section V.F, p. 5).

## technique 1: bounded TLA+ generation from a protocol description

What it is. The model receives a natural-language description and emits two artifacts: a `.tla` module containing `Init`, `Next`, state variables, and invariants, and a `.cfg` file configuring TLC. A system prompt constrains every variable to finite ranges `0..MaxN`, requires bounds to be declared as constants, and forbids infinite sets in the module body. The default `MaxTokens = 3` is increased only when coverage is insufficient. `TypeOK` catches type violations before the vulnerability invariant runs (Section II.C, p. 2).

When to use it. Use bounded TLA+ for concurrency and protocol-ordering bugs whose shortest counterexample is expected to fit within a small number of transitions. The paper invokes the small-scope hypothesis: structural errors often appear in small instances, making bounded exploration practical (Section II.A, p. 2). This is not a completeness claim for arbitrary bounds.

How to apply it.

1. Describe the bridge's actors, messages, finality assumptions, and state transitions in natural language (Section III.B, p. 2)
2. Ask the LLM for a TLA+ module and TLC configuration in delimited code blocks; the fixed template allows deterministic extraction with regular expressions (Section III.B, p. 2)
3. Declare finite constants and type every variable over finite ranges. Keep `MaxTokens = 3` initially (Section II.C, p. 2)
4. Define `Init`, `Next`, `TypeOK`, and a safety invariant. Include the intended vulnerable action sequence when searching for a known flaw (Sections II.A and III.B)
5. Run TLC and inspect the resulting status and shortest trace (Sections III.D–E, pp. 2–3)

The paper emphasizes that the model's safety convention is inverted for vulnerability discovery: “Rather than asking the LLM to prove a system correct, we ask it to model a system whose known flaw will produce a TLC counterexample.” (Section II.B, p. 2.) Under this convention a `SAFE` result can mean the model omitted the flaw, rather than that the bridge is correct.

Verus form (inference). Encode the protocol state as a Rust ghost state machine and expose transitions as proof or executable functions with `requires` and `ensures`. A finite bound can be a ghost constant, and a Verus invariant can state the bridge peg or finality property. Verus's ordinary contract checking is not a replacement for TLC's breadth-first temporal exploration; a generated TLA+ model could serve as an earlier architectural check before implementing the Rust state machine.

Evidence and limits. All experiments use small constants. The paper reports that violation traces have depth at most 4 and argues that increasing `MaxTokens` increases explored states without changing this depth (Section V.A, p. 5). That observation concerns three bridge models only; it does not establish that every bridge bug has a short trace. The model abstracts away gas limits, nonces, EVM opcodes, and deployed bytecode (Section V.B and V.F, p. 5).

## technique 2: TLC as a semantic oracle and subprocess boundary

What it is. Each candidate module and configuration is written into an isolated temporary directory. The engine invokes TLC through `subprocess.run`. The exit code is classified as 0 (`SAFE`), 12 (`VIOLATION`), or another value (`COMPILE_ERROR` or a parse/semantic error). TLC's breadth-first search returns a shortest counterexample, which makes the feedback compact and reproducible (Section III.D, p. 3).

How to apply it.

1. Create a fresh temporary directory for each iteration and write the generated `.tla` and `.cfg` files (Section III.D)
2. Invoke TLC as a child process and capture its raw output and exit status (Section III.D)
3. Map exit code 0 to `SAFE`, 12 to `VIOLATION`, and other failures to a compile or semantic error (Section III.D)
4. Treat a violation trace as a candidate bug and a compile error as a syntax or modeling failure to repair (Sections III.D–E)
5. Retain TLC's shortest trace for deterministic correction and reporting (Section III.D)

The authors state the oracle role directly: “TLC acts as a semantic oracle.” (Abstract, p. 1.) TLC is deterministic for a fixed model and configuration, but the LLM generation before and after each run is stochastic.

Verus form (inference). A Rust driver can invoke an external model checker in CI and store its status and trace as an artifact, while Verus proves the implementation separately. Verus cannot treat an unverified subprocess result as a proof fact: the trace can guide contract repair, but a final product claim must be discharged by Verus contracts or another trusted proof kernel.

Evidence and limits. TLC runtimes were 0.26–0.30 seconds for all targets in the reported runs, while LLM generations took approximately 17–28 seconds (Section IV.A, p. 4; Table I, p. 5). The paper reports no independent validation of the subprocess wrapper, parser, or TLC installation beyond these experiments. A malformed status classification could therefore mislabel a run unless the wrapper is tested separately (Inference: this follows from the described implementation boundary).

## technique 3: structured error-trace extraction

What it is. Raw TLC output is converted into structured feedback through four parser stages: classify the exit code; segment state blocks using `State \d+:`; extract assignments matching `/\\ <identifier> = <value>`; and annotate each state with the bracketed action name. The parser serializes the trace as natural-language instructions to either confirm a real finding or tighten an action guard (Section III.E, p. 3).

How to apply it.

1. Classify the run as `SAFE`, `VIOLATION`, `COMPILE_ERROR`, or `TIMEOUT` (Section III.E)
2. Split output at state-block headers (Section III.E)
3. Extract each variable assignment from the TLC format, including its single-backslash syntax (Section III.E)
4. Capture the action name in each state header (Section III.E)
5. Serialize the ordered states and actions into a compact message for the next model turn (Section III.E)
6. Direct the model to confirm the exploit if the trace is semantically valid, or tighten the action guard if it is a modeling artifact (Section III.E)

The paper notes that the backslash format was “discovered empirically via byte inspection of subprocess output” (Section III.E, p. 3). This implementation detail matters because a parser expecting a conventional escaped representation would silently lose state assignments.

Verus form (inference). A Rust parser can deserialize checker output into a typed trace enum and have Verus prove local properties of trace manipulation, such as preserving state order and action labels. The parser's conclusion that a trace is a real exploit remains a human or model judgment unless the trace is connected to a verified protocol semantics.

Evidence and limits. In T3, an initial compilation error was parsed and returned to the model; the next iteration corrected it and produced the exploit trace (Section IV.B, p. 4). The paper reports no precision or recall measurement for trace extraction, so the parser's reliability outside the three models is unknown (Inference: the paper gives success cases but no parser benchmark).

## technique 4: agentic REPL correction loop

What it is. The LLM and TLC alternate turns. The initial assistant response contains the module and configuration. TLC's structured feedback is appended as a user turn, and the model emits a revised specification. The loop stops when TLC reports `SAFE`, a counterexample is labeled `BUG_FOUND`, or the iteration budget is exhausted (Section III.A and III.F, pp. 2–3).

How to apply it.

1. Start a multi-turn conversation with the protocol description and structural generation prompt (Section III.B)
2. Extract and run the first module/configuration pair (Sections III.B–D)
3. Append the complete TLC status and structured trace or compiler error as the next user turn (Section III.F)
4. Ask the model to repair syntax, tighten guards, or confirm the trace according to the correction directive (Section III.E)
5. Repeat until `BUG_FOUND`, `SAFE`, or the iteration budget (Section III.A)
6. Preserve the full specification history so later corrections can refer to earlier states (Section III.F)

The abstract claims: “By deterministically parsing TLC’s raw error traces—including compilation failures and invariant violations—and injecting them back into the model’s context, the system forces the LLM to autonomously converge on a valid, tightly bounded TLA+ specification.” (Abstract, p. 1.) The reported convergence is empirical, not a theorem about arbitrary prompts or models.

Verus form (inference). Apply the same control loop to candidate Verus contracts or proof lemmas: let a compiler/verifier produce diagnostics, feed exact diagnostics back to the model, and require a final clean Verus run. A generated proof should be accepted only when Verus itself checks it; textual agreement with a TLC trace is insufficient. Keep model turns and diagnostics in a reproducible log to detect accidental weakening of a specification.

Evidence and limits. T2 reached `BUG_FOUND` on the first LLM generation. T3 required one or two iterations; the runs needing two began with a compilation error and corrected it on the second attempt (Section IV.B, p. 4). Table I reports T1 with 0 LLM iterations because it uses a human-written ground-truth specification, T2 with 1, and T3 with 1–2. The paper explicitly leaves a five-run statistical analysis of T3's iteration distribution to future evaluation (Section V.C, p. 5), so “≤2 on all targets” is a result for the reported runs, not a denominator-wide stochastic guarantee.

## evidence from the three targets

Table I reports three targets and gives the denominator of each result: T1 is a Lock-and-Mint reorg/stale-queue model with iteration 0, depth 4, 10 explored states, and 0.27 s TLC time; T2 is Lock-and-Mint with an Optimistic Relay Attack, iteration 1, depth 4, 15 states, 0.30 s; T3 is Nomad-style zero-root initialization, iteration 1–2, depth 3, 8–25 states, and 0.29 s. End-to-end times are 0.27 s, 17.9 s, and 28–49 s respectively (Table I, p. 5). The T3 trace reproduces `ActivateZeroRoot → ExploitProcessWithoutProof` in a minimum of three states, while T2 produces an Optimistic Relay Attack in a four-state trace (Section IV.C, p. 4).

The reported model fidelity is mixed. The Nomad exploit was publicly confirmed and the trace reproduces the post-mortem causal chain; T1 and T2 represent structural vulnerability patterns described in bridge-security literature (Section IV.B, p. 4). All three models abstract away production bytecode, and the authors state that arithmetic bugs and reentrancy remain better handled by existing tools (Section V.E, p. 5).

## what is proved, measured, and trusted

Proved by TLC for each bounded model: the reported invariant violation or, under the paper's inverted convention, the absence of a violation in the explored finite state space. The paper does not prove that the natural-language protocol description matches deployed contracts, that the finite bound covers all states, or that an exploit trace transfers to EVM bytecode.

Measured: TLC runtime, end-to-end runtime, explored-state counts, shortest trace depth, and observed LLM iterations for exactly three bridge targets. The table's denominator is three targets, with T3 represented as a 1–2 iteration range; there is no multi-run failure-rate denominator. TLC execution is consistently below 0.30 seconds in the table, while LLM latency dominates.

Trusted or assumed: the protocol abstraction, finite bounds, TLA+/TLC semantics and installation, subprocess wrapper, trace parser, LLM context, and human interpretation of a `BUG_FOUND` trace. The paper's safety-invariant convention also assumes that a `SAFE` result can indicate a modeling mistake when the intended bug is absent (Section II.B).

## relevance to Verus and threat to VL

Inference: COBALT-TLA's strongest transferable idea is the separation between hypothesis generation and a deterministic checker. VL could use verifier diagnostics as structured feedback to repair agent-written Rust contracts, but the final trust anchor must remain Verus's checked proof rather than the model's confidence or an external trace.

Inference: the threat to a product of agent-written verified Rust is medium for protocol-level specification errors and lower for ordinary syntax errors. A repair loop can fix compiler mistakes quickly, yet it can also tighten guards until a real behavior disappears or weaken an invariant while retaining a `SAFE` result. Require immutable specifications, diff review of every generated contract, bounded counterexample replay, and a Verus proof of the implementation's stated property.

Inference: VL should not redo the paper's bounded TLA+ loop as a novel contribution without a distinct Rust/Verus integration and evaluation. The paper already demonstrates the loop on three bridge models and explicitly leaves production-bytecode semantics and statistical reproducibility open.

## techniques for the catalog

- bounded LLM-to-TLA+ synthesis — generate finite `Init`/`Next` models and TLC configurations from protocol descriptions
- TLC semantic-oracle loop — classify subprocess outcomes and use shortest breadth-first traces as deterministic feedback
- structured trace extraction — parse state blocks, variable assignments, and action labels into repair directives
- agentic REPL correction — alternate model generations and checker feedback until a bug, safe result, or budget limit
- small-scope vulnerability search — exploit short counterexamples while recording the finite-bound limitation
- architecture-to-code boundary — treat model findings as protocol evidence and require a separate proof or semantics link for deployed code
Checked 2026-10-13: audit record blain2026cobalt; paper-study comparison complete; gate executed; experiments not rerun
