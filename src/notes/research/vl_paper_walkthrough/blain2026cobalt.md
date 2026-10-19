# COBALT-TLA: A Neuro-Symbolic Verification Loop for Cross-Chain Bridge Vulnerability Discovery
(authored by agents unless marked 🧑)
Tag: `blain2026cobalt`, [paper](https://arxiv.org/abs/2604.12172)
## problem and contribution

COBALT-TLA targets temporal ordering failures in cross-chain bridges. The paper identifies the recurring failure as a distributed state machine reaching a globally invalid state even though each individual transaction is locally valid. Its abstract reports: “We present COBALT-TLA, a neuro-symbolic verification loop that pairs an LLM with TLC, the TLA+ model checker, in an automated REPL.” (Abstract, p. 1.) The loop asks a language model to propose a bounded TLA+ module and configuration, runs TLC as a deterministic semantic checker, parses the result, and feeds a structured trace or compiler error back to the model.

The claimed security target is architectural behavior: reorgs, stale queues, pre-finality minting, and invalid initialization across chains. Static analyzers and bounded symbolic execution remain useful for intra-contract arithmetic and reentrancy, but the paper says they lack the vocabulary for cross-chain concurrency, consensus, and time (Section I, p. 1). COBALT-TLA operates on protocol descriptions rather than deployed bytecode; KEVM integration is future work (Section V.F, p. 3).

## technique 1: bounded TLA+ generation from a protocol description

What it is. The model receives a natural-language description and emits two artifacts: a `.tla` module containing `Init`, `Next`, state variables, and invariants, and a `.cfg` file configuring TLC. A system prompt constrains every variable to finite ranges `0..MaxN`, requires bounds to be declared as constants, and forbids infinite sets in the module body. The prompt prescribes `MaxTokens = 3`, which may be increased if coverage is insufficient. The paper describes `TypeOK` as “surfacing type violations before invariant violations” (Section III.C, p. 2).

When to use it. Inference: use bounded TLA+ for concurrency and protocol-ordering bugs whose shortest counterexample is expected to fit within a small number of transitions. The paper invokes the small-scope hypothesis: structural errors often appear in small instances, making bounded exploration practical (Section II.A, p. 2). This is not a completeness claim for arbitrary bounds.

How to apply it.

1. Supply a natural-language cross-chain protocol description (Section III.B, p. 2)
2. Ask the LLM for a TLA+ module and TLC configuration in delimited code blocks; the fixed template allows deterministic extraction with regular expressions (Section III.B, p. 2)
3. Declare finite constants and type every variable over finite ranges. Keep `MaxTokens = 3` initially (Section III.C, p. 2)
4. Use `Init` and `Next` to define the state machine, with `TypeOK` and `SafetyInvariant` for checking (Sections II.A and III.B–C, p. 2). The system prompt does not name target-specific actions, variables, or attack vectors (Section V.D, p. 3)
5. Run TLC and inspect the resulting status and shortest trace (Sections III.D–E, p. 2)

The paper emphasizes that the model's safety convention is inverted for vulnerability discovery: “Rather than asking the LLM to prove a system correct, we ask it to model a system whose known flaw will produce a TLC counterexample.” (Section III.B, p. 2.) The paper states: “A SAFE result under this convention signals a modeling error, not protocol correctness” (Section III.B, p. 2).

Verus form. Inference: Encode the protocol state as a Rust ghost state machine and expose transitions as proof or executable functions with `requires` and `ensures`. A finite bound can be a ghost constant, and a Verus invariant can state the bridge peg or finality property. Verus's ordinary contract checking is not a replacement for TLC's breadth-first temporal exploration; a generated TLA+ model could serve as an earlier architectural check before implementing the Rust state machine.

Evidence and limits. All experiments use small constants. The paper reports that violation traces have depth at most 4 and argues that increasing `MaxTokens` increases explored states without changing this depth (Section V.A, p. 3). Inference: that argument concerns three bridge models only; it does not establish that every bridge bug has a short trace. No bound-sweep results are reported. The model abstracts away gas limits, nonces, EVM opcodes, and deployed bytecode (Sections V.B and V.F, p. 3).

## technique 2: TLC as a semantic oracle and subprocess boundary

What it is. Each candidate module and configuration is written into an isolated temporary directory. The engine invokes TLC through `subprocess.run`. The exit code is classified as 0 (`SAFE`), 12 (`VIOLATION`), or another value (`COMPILE_ERROR` or a parse/semantic error). The paper states that TLC's breadth-first search yields a shortest violation trace (Section III.D, p. 2). Inference: short traces can reduce feedback length; shortest length alone does not establish that every run selects an identical trace.

How to apply it.

1. Create a fresh temporary directory for each iteration and write the generated `.tla` and `.cfg` files (Section III.D)
2. Invoke TLC as a child process and capture its raw output and exit status (Section III.D)
3. Map exit code 0 to `SAFE`, 12 to `VIOLATION`, and other failures to a compile or semantic error (Section III.D)
4. Treat a violation trace as a candidate bug and a compile error as a syntax or modeling failure to repair (Sections III.D–E)
5. Retain TLC's shortest violation trace for the feedback step (Section III.D)

The author states the oracle role directly: “TLC acts as a semantic oracle” (Abstract, p. 1). Section V.C (p. 3) states: “LLM outputs are stochastic.” Inference: checker feedback constrains model revisions, but does not make LLM generations reproducible.

Verus form. Inference: A Rust driver can invoke an external model checker in CI and store its status and trace as an artifact, while Verus proves the implementation separately. Verus cannot treat an unverified subprocess result as a proof fact: the trace can guide contract repair, but a final product claim must be discharged by Verus contracts or another trusted proof kernel.

Evidence and limits. TLC runtimes were 0.26–0.30 seconds for all targets in the reported runs, while LLM generations took approximately 17–28 seconds (Section IV.A, p. 3; Table I, p. 4). The paper reports no independent validation of the subprocess wrapper, parser, or TLC installation beyond these experiments. A malformed status classification could therefore mislabel a run unless the wrapper is tested separately (Inference: this follows from the described implementation boundary).

## technique 3: structured error-trace extraction

What it is. Raw TLC output is converted into structured feedback through four parser stages: classify the exit code; segment state blocks using `State \d+:`; extract assignments matching `/\ <identifier> = <value>`; and annotate each state with the bracketed action name. The parser serializes the trace as natural-language instructions to either confirm a real finding or tighten an action guard (Section III.E, p. 2).

How to apply it.

1. Classify the run as `SAFE`, `VIOLATION`, `COMPILE_ERROR`, or `TIMEOUT` (Section III.E)
2. Split output at state-block headers (Section III.E)
3. Extract each variable assignment from the TLC format, including its single-backslash syntax (Section III.E)
4. Capture the action name in each state header (Section III.E)
5. Serialize the ordered states and actions into a compact message for the next model turn (Section III.E)
6. Direct the model to confirm the exploit if the trace is semantically valid, or tighten the action guard if it is a modeling artifact (Section III.E)

The paper notes that the backslash format was “discovered empirically via byte inspection of subprocess output” (Section III.E, p. 2). Inference: a parser expecting two literal backslashes could miss these state assignments.

Verus form. Inference: A Rust parser can deserialize checker output into a typed trace enum and have Verus prove local properties of trace manipulation, such as preserving state order and action labels. The parser's conclusion that a trace is a real exploit remains a human or model judgment unless the trace is connected to a verified protocol semantics.

Evidence and limits. In T3, an initial compilation error was parsed and returned to the model; the next iteration corrected it and produced the exploit trace (Section IV.B, p. 3). The paper reports no precision or recall measurement for trace extraction, so the parser's reliability outside the three models is unknown (Inference: the paper gives success cases but no parser benchmark).

## technique 4: agentic REPL correction loop

What it is. The LLM and TLC alternate turns. The initial assistant response contains the module and configuration. TLC's structured feedback is appended as a user turn, and the model emits a revised specification. The loop stops when TLC reports `SAFE`, a counterexample is labeled `BUG_FOUND`, or the iteration budget is exhausted (Sections III.A and III.F, p. 2).

How to apply it.

1. Start a multi-turn conversation with the protocol description and structural generation prompt (Section III.B)
2. Extract and run the first module/configuration pair (Sections III.B–D)
3. Append TLC feedback as the next user turn (Section III.F)
4. Ask the model to repair syntax, tighten guards, or confirm the trace according to the correction directive (Section III.E)
5. Repeat until `BUG_FOUND`, `SAFE`, or the iteration budget (Section III.A)
6. Preserve the full specification history so later corrections can refer to earlier states (Section III.F)

The introduction claims: “By deterministically parsing TLC’s raw error traces—including compilation failures and invariant violations—and injecting them back into the model’s context, the system forces the LLM to autonomously converge on a valid, tightly bounded TLA+ specification.” (Section I, p. 1.) Inference: the reported convergence is empirical, not a theorem about arbitrary prompts or models.

Verus form. Inference: Apply the same control loop to candidate Verus contracts or proof lemmas: let a compiler/verifier produce diagnostics, feed exact diagnostics back to the model, and require a final clean Verus run. A generated proof should be accepted only when Verus itself checks it; textual agreement with a TLC trace is insufficient. Keep model turns and diagnostics in a reproducible log to detect accidental weakening of a specification.

Evidence and limits. T2 reached `BUG_FOUND` on the first LLM generation. T3 required one or two iterations; the runs needing two began with a compilation error and corrected it on the second attempt (Section IV.B, p. 3). Table I reports T1 with 0 LLM iterations because it uses a human-written ground-truth specification, T2 with 1, and T3 with 1–2. The paper explicitly leaves a five-run statistical analysis of T3's iteration distribution to future evaluation (Section V.C, p. 3), so the reported maximum of two iterations does not establish a success probability for future runs (Inference).

## evidence from the three targets

Table I reports results for three targets: T1 is a Lock-and-Mint reorg/stale-queue model with iteration 0, depth 4, 10 explored states, and 0.27 s TLC time; T2 is Lock-and-Mint with an Optimistic Relay Attack, iteration 1, depth 4, 15 states, 0.30 s; T3 is Nomad-style zero-root initialization, iteration 1–2, depth 3, 8–25 states, and 0.29 s. End-to-end times are 0.27 s, 17.9 s, and 28–49 s respectively (Table I, p. 4). The T3 trace reproduces `ActivateZeroRoot → ExploitProcessWithoutProof` in a minimum of three states, while T2 produces an Optimistic Relay Attack in a four-state trace (Section IV.C, p. 3).

The paper claims external support for model fidelity: “For T3, this abstraction is validated externally: the Nomad exploit was publicly confirmed and our trace reproduces the post-mortem causal chain.” It describes T1 and T2 as “structural properties documented in bridge security literature” (Section V.B, p. 3). All three models abstract away production bytecode (Section V.F, p. 3), and the author states that arithmetic bugs and reentrancy remain better handled by existing tools (Section V.E, p. 3).

## what is proved, measured, and trusted

Checked by TLC: counterexamples to the invariants of the bounded models. The reported targets reach `BUG_FOUND`; no `SAFE` target result appears in Table I (p. 4). Inference: such counterexamples establish reachable model violations, not a proof that the descriptions match deployed contracts, that the bounds cover every relevant state, or that a trace transfers to bytecode.

Measured: TLC runtime, end-to-end runtime, explored-state counts, shortest trace depth, and observed LLM iterations for exactly three bridge targets. Table I (p. 4) contains three targets, with T3 represented as a 1–2 iteration range; the number of repeated runs is not reported. TLC times in the table are at most 0.30 seconds, including T2 at exactly 0.30 seconds. LLM latency dominates T2 and T3; T1 uses no LLM.

Inference: the trusted or assumed components are the protocol abstraction, finite bounds, TLA+/TLC semantics and installation, subprocess wrapper, trace parser, LLM context, and human interpretation of a `BUG_FOUND` trace. The paper's safety-invariant convention also assumes that a `SAFE` result can indicate a modeling mistake when the intended bug is absent from the model (Section III.B, p. 2).

## relevance to Verus and threat to VL

Inference: COBALT-TLA's strongest transferable idea is the separation between hypothesis generation and a deterministic checker. VL could use verifier diagnostics as structured feedback to repair agent-written Rust contracts, but the final trust anchor must remain Verus's checked proof rather than the model's confidence or an external trace.

Inference: the relevant risk for agent-written verified Rust is specification error. A repair loop can fix compiler mistakes quickly, yet it can also tighten guards until a real behavior disappears or weaken an invariant while retaining a `SAFE` result. Possible safeguards are preserving the intended specification, reviewing generated contract changes, replaying bounded counterexamples, and checking the implementation against its stated property with Verus.

Inference: VL should not redo the paper's bounded TLA+ loop as a novel contribution without a distinct Rust/Verus integration and evaluation. The paper already demonstrates the loop on three bridge models and explicitly leaves production-bytecode semantics and statistical reproducibility open.

## techniques for the catalog

- bounded LLM-to-TLA+ synthesis — generate finite `Init`/`Next` models and TLC configurations from protocol descriptions
- TLC semantic-oracle loop — classify subprocess outcomes and use shortest breadth-first traces as deterministic feedback
- structured trace extraction — parse state blocks, variable assignments, and action labels into repair directives
- agentic REPL correction — alternate model generations and checker feedback until a bug, safe result, or budget limit
- small-scope vulnerability search — exploit short counterexamples while recording the finite-bound limitation
- Inference: architecture-to-code boundary — treat model findings as protocol evidence and require a separate proof or semantics link for deployed code
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Each LLM response is appended as an assistant turn and each TLC feedback message as a user turn, preserving the full specification history within the model’s context window."): read the entire four-page paper and study; checked quotations, numbers, section and page references, technique steps, and the arXiv link; corrected references, prompt details, trace syntax, quotation attribution, runtime claims, and the distinction between model counterexamples and implementation proofs; marked extrapolations as Inference; did not run the system, inspect its implementation, or independently validate the bridge exploits or Verus proposals.
