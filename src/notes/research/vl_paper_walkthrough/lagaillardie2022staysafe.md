# Stay Safe under Panic: Affine Rust Programming with Multiparty Session Types
(authored by agents unless marked 🧑)
Tag: `lagaillardie2022staysafe`, [paper](http://arxiv.org/abs/2204.13464v1)

## scope and guarantees
The paper embeds affine multiparty session types (AMPST) in Rust through the MultiCrusty library. It targets communication safety when channels or processes fail, are cancelled, or panic. The abstract says AMPST “ensures cancellation termination of multiple, independently running components and guarantees that communication will not get stuck due to error or abrupt termination.” (Abstract, p. 1). The calculus and implementation prove session fidelity, deadlock-freedom, liveness, and cancellation termination; they do not prove arbitrary application data invariants.

The design combines global protocols (top-down Scribble) or local binary session types checked for compatibility (bottom-up k-MC). The authors identify the practical problem: MPST assumes a session runs to completion, while Rust channels are affine and may be dropped. Their key implementation claim is that “multiparty communication safety can be realised by the native Rust type system (without external validation tools).” (Introduction, p. 2). Fair scheduling is an explicit theoretical assumption (Section 4.3, pp. 20–21).

## technique: affine meshed channels
An affine meshed channel is a typed struct containing one binary channel per pair of roles plus a role stack. Session types specify which binary channel may be used next. The macro `gen_mpst!(MeshedChannelsThree, A, C, S)` generates the struct and communication primitives at compile time (Section 2, pp. 4–6). A type such as `Send<T, Recv<U, End>>` states the current action and continuation; a `MeshedChannels` value is consumed and a new continuation value is returned (Section 4.2, pp. 16–20).

How to use it:
1. Specify a global Scribble protocol, or write local binary types for each role (Sections 2 and 4.3, pp. 3–5, 20–21).
2. Invoke `gen_mpst!` with the role names to generate a meshed-channel data type and generic send/receive/choice operations (Section 2, p. 5).
3. Declare each endpoint function with its session type, e.g. `fn endpoint_api(s: AInit<i32>) -> R`, and consume `s` at each communication step (Figure 2, pp. 5–7).
4. Use choice macros (`choose_*`, `offer_mpst!`) to transmit a branch label and continue with the branch-specific meshed type (Section 2, pp. 6–7).
5. Close with `close()` after the protocol's `End` state; the type prevents further actions.

Verus form (Inference): model each endpoint as a Rust struct carrying a ghost protocol-state token. Each operation consumes the old token and returns a token for the continuation; `requires` checks the current state and `ensures` establishes the next state and message effect. A ghost state machine can track channel ownership and role stacks. Verus can prove these contracts for a fixed API, but it will not derive global-protocol projection or duality automatically. The paper's affine type discipline relies on Rust's move checker, which remains outside a Verus functional proof.

Evidence: Theorem 3.18 establishes session fidelity; the implementation checks dual binary types statically (Sections 3 and 4.3, pp. 9–12, 20). The paper's proof is a type-safety theorem for the calculus and generated API, not an empirical bug rate.

## technique: explicit and implicit cancellation
Cancellation handles three cases: user computation errors, communication failures such as timeouts, and premature dropping of a channel. A `Result<T,E>` wraps communication. The `?` operator propagates an `Err`; `attempt! { … } catch(e) { … }` catches errors across several actions (Section 4.4, pp. 21–22). Explicit `cancel(s)` broadcasts cancellation over all binary channels in the meshed channel. Implicit cancellation occurs when `recv`/`send` observes a cancelled peer or when the affine channel is dropped.

Apply it as follows:
1. Return `Result` from every communication primitive; on an `Err`, either call `cancel(s)` or let `?` return it (Section 4.4, p. 21).
2. For a multi-action failure region, wrap actions in `attempt!` and handle the catch branch; the macro expands to a `try`/`catch`-like control flow (Section 4.4, pp. 21–22).
3. Implement `Drop` for the meshed channel so an out-of-scope value calls `cancel`; this covers panic and forgotten explicit cancellation (Section 4.4, p. 22).
4. On cancellation, close every binary channel in the session. A later receive sees an error and recursively cancels its remaining in-scope channels (Section 4.4, pp. 22–23).
5. Ignore duplicate cancellation; the calculus models it by idempotent structural congruence (Section 4.4, p. 22).

The authors summarize the safety boundary: “once a cancellation happens, all processes in the same session terminate with an error.” (Section 2, p. 8). The implementation covers even an incorrectly implemented role whose channel is dropped prematurely (Section 2, pp. 7–8).

Verus form (Inference): use a Verus state machine whose state includes an `active`/`cancelled` flag and a set of channel endpoints. A transition lemma can prove cancellation is idempotent and that no `send`/`recv` transition is enabled after cancellation. Rust `Drop` itself is executable infrastructure; the proof must specify the library's destructor behavior or wrap channels in a verified API. Panic unwinding, scheduler fairness, and crossbeam behavior are assumptions unless separately modeled.

## technique: protocol compatibility and bounded model checking
Top-down use starts with Scribble, generates local types, and then implements endpoints. Bottom-up use writes local types and invokes k-MC after a macro rewrites them to communicating finite-state machines. k-MC checks progress and eventual reception for executions with at most `k` messages per channel (Section 4.3, pp. 20–21). The authors restrict default execution to 1-MC systems, matching well-formed global protocols, but permit larger bounds as an explicit choice.

Steps:
1. Generate or write all local binary types.
2. Check pairwise duality in the MultiCrusty library; a mismatch rejects the program at compile time (Section 4.3, p. 20).
3. If using bottom-up types, run k-MC on the CFSM translation and inspect progress/eventual-reception results for the selected bound (Section 4.3, p. 21).
4. Implement role functions with generated continuation types; type errors identify protocol deviations before execution.

Verus form (Inference): encode each CFSM state and channel queue as ghost state, then prove transition preservation and a bounded progress lemma. k-MC can find counterexamples but is not an unbounded Verus proof; a product should report the bound and fairness assumptions explicitly.

## evidence, measurements, and limits
The formal results are Theorems 3.18 (session fidelity), 3.20 (deadlock-freedom), 3.21 (liveness), and 3.27 (cancellation termination), proved for AMPST's multiparty π-calculus (Introduction summary, p. 3; Section 3, pp. 9–15). Performance experiments compare MultiCrusty MPST, AMPST with cancellation, binary channels, and untyped crossbeam channels. Hardware was AMD Opteron 6282 SE, 32 cores/64 threads, 128 GB RAM, Ubuntu 20.04; each benchmark ran 10,000 times and reports average time with a 95% confidence interval (Section 5.1, pp. 23–24). The paper reports negligible overhead versus crossbeam and up to a two-fold runtime improvement over binary sessions in highly synchronized protocols (Section 5, p. 23); the denominator is the selected microbenchmark runs, not all Rust programs. Use cases include OAuth, SMTP, circuit breaker, and distributed logging (Sections 5.2 and C).

Trusted or assumed: Rust's compiler and destructor semantics, crossbeam channels, generated macro expansion, fair scheduling, and the correctness of the Scribble/k-MC toolchain. Inference: threat to agent-written verified Rust is high for concurrent protocol misuse and cancellation if the agent bypasses the API, but lower when all communication is typed through MultiCrusty-like wrappers. The paper already provides a mature protocol-typing and cancellation design; VL should not rebuild generic MPST theory. It can reuse affine endpoint APIs and add Verus proofs for application-specific data properties, scheduler assumptions, and foreign-channel contracts.

## techniques for the catalog

- affine meshed channels: store typed binary channels and consume endpoint values to enforce the next legal multiparty action
- typed cancellation propagation: combine `Result`, `?`, catch macros, explicit `cancel`, and `Drop` to terminate every session participant
- top-down/bottom-up protocol checking: generate local types from Scribble or check local CFSMs with k-MC compatibility and progress bounds
- cancellation termination proof: model errors and drops in an affine π-calculus and prove that all processes in a cancelled session terminate

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
