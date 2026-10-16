# A System to Verify Network Behavior of Known Cryptographic Clients
(authored by agents unless marked 🧑)
Tag: `chi2017cryptographic`, [paper](https://www.usenix.org/conference/nsdi17/technical-sessions/presentation/chi)

## scope
The verifier checks whether messages observed from a client could have been produced by a known client binary, despite unknown inputs and encrypted values. It symbolically executes client code, reconciles path constraints with each network message, and reports a message as legitimate only when a feasible execution remains. The introduction states, “Our central contribution is to show that legitimate cryptographic client behavior can in fact be verified, not against a simplified protocol model but against the client source code.” (Section 1, pp. 177–178).

## technique: concurrent symbolic path exploration
Use symbolic execution when the verifier knows the client program and network trace but not all client inputs. Unknown input, random-number, and time functions return unconstrained symbolic values. At branches on symbols, the verifier forks; at a send, it constrains the symbolic output to the observed message and discards inconsistent paths. The paper says, “When the verifier, in tracing client execution, operates on a value that it does not know (a “symbolic” value), it considers all possibilities for that value (e.g., branching in both directions if a branch statement involves a symbolic variable) and records constraints on those symbolic values implied by the execution path taken.” (Section 1, p. 178).

Steps from sections 3–4: (1) start a node at client entry; (2) execute straight-line instructions; (3) fork at symbolic branches and enqueue child nodes; (4) stop at each network send/receive; (5) reconcile accumulated constraints with the next observed message; (6) continue from a consistent execution prefix; if it cannot explain a later message, backtrack to another prefix. Worker threads explore nodes concurrently; a scheduler prioritizes live nodes (Sections 3–4, pp. 180–181).

Inference: a Verus analogue can define a symbolic trace predicate and prove that an accepted message has a witness input satisfying the client transition relation. Verus does not provide a symbolic executor, so the executor and SMT solver are trusted evidence; Rust code can use `requires`/`ensures` to state trace refinement, while nondeterministic inputs belong in the specification.

## technique: message reconciliation and exact acceptance
At a send point, the verifier compares concrete message bytes with symbolic expressions, adding equalities for fields and rejecting contradictory paths. Acceptance means existence of an execution, not that the verifier reconstructs every secret. This supports stateful protocols because prior messages and server messages constrain later paths. Whole sentence: “Upon an execution path reaching a message send point in the client software, the verifier reconciles the accumulated constraints on that execution path with the next message received from the client.” (Section 1, p. 178).

Inference: in Verus, define `spec fn consistent(trace, msg) -> bool` and prove that each accepted step preserves a path witness. The paper's exactness claim is conditional on its assumptions about prohibitive functions, keys, message order, and a trusted server; it does not prove memory safety.

## technique: multipass execution around prohibitive functions
Symbolically executing AES, hashes, or modular exponentiation with unknown inputs creates huge formulas. The user marks pure, deterministic functions whose output-buffer size depends only on input sizes as prohibitive. On symbolic inputs, the verifier skips the function and creates symbolic outputs; after message reconciliation concretizes inputs, it replays the path and executes the function concretely. Replays continue until no new constraints arise; skipped calls that remain unresolved become explicit assumptions. The paper says, “Once additional passes yield no new information, the verifier outputs any unverified function computations ... as assumptions on which the verification rests.” (Section 5, p. 182).

Steps from sections 5.1–5.3: (1) configure AES, SHA-256, ECDH, or similar calls as prohibitive; (2) execute and save constraints at a message point; (3) reconcile observed bytes; (4) replay from the prior prefix; (5) concretely execute any prohibitive call whose inputs are now concrete; (6) compare new and saved constraints; (7) stop at a fixed point or emit remaining assumptions. In the paper's C example, the first pass learns `iv=0x1234` but leaves `AES(iv)` symbolic; the second computes `s=0x2343` and derives `p=0xBEEF` from `c=p^s` (Figure 3, p. 183).

Inference: a Verus form should isolate each cryptographic primitive behind a specification with a postcondition, then prove replay monotonicity: each pass adds constraints and preserves prior consistency. A primitive left as an assumption must be named in the trusted base; do not mark the function being verified with `external_body`.

## technique: cryptographic protocol handling and assumptions
For TLS, observed outputs include the client Diffie-Hellman parameter, IV, ciphertext, and tag; server-side session keys can be injected. The ephemeral private exponent may never be inferred, so the verifier emits the assumption that some exponent produces the observed public value and key. It therefore does not detect attacks violating that assumption, such as invalid-curve attacks (section 5.4, p. 183). No decryption routine is required for stream/counter modes: replay recovers plaintext once AES inputs become concrete.

Inference: VL should represent key availability and cryptographic assumptions explicitly in contracts. A Verus proof can establish protocol-state invariants conditional on a `requires` clause for key derivation, but cannot claim end-to-end cryptographic soundness without proving the primitive and validating peer inputs.

## technique: deferred constraints and shared version choices
Appendix C (pp. 193–195) adds lazy constraint generators for computations that need a known output to infer an input, such as CBC decryption. Register expressions for a pure function's inputs and outputs. When all designated inputs become concrete, evaluate the function and add the resulting equality to the path constraints. An inverse function can thus constrain the original function's input. These generators can also revisit calls skipped in earlier execution fragments, which the basic multipass procedure does not revisit (Section 5.2, p. 182). The implementation adds solver calls at sends to detect implied concrete values. Inference: verify each registered equality and its relation to the primitive; an arbitrary callback is another trusted component.

Section 7.1 (p. 187) manually combines OpenSSL 1.0.1e and 1.0.1f by guarding differing code with a shared symbolic version value. Once observed behavior determines the version, inconsistent paths disappear. The same version choice persists across branches; the verifier allows one complete version's behavior rather than freely mixing versions. Reported single-worker total costs were within 4% of the matching single-version verifiers, with 32% more symbolic branches and 7% more solver queries. Inference: a Rust specification could represent that version as one immutable ghost choice across the whole trace.

## evidence and limitations
The implementation, a modified KLEE-based symbolic executor, verifies OpenSSL and BoringSSL clients (Section 6, p. 184). The reported workload is 21 concurrent TLS sessions and 3.8 MB of a three-minute Gmail capture. Verification averaged 49 ms per TLS record; 85% completed within 36 ms and 95% within 362 ms (section 6.2, p. 185). With server-to-client application data omitted, median lag was 0.85 s and worst-case lag about 14 s (Figure 5, pp. 185–186). A Heartbleed trace was rejected after 6.9 s and a CVE-2015-0205 trace after 2.4 s (section 6.1, p. 185). These denominators are records in the stated traces, not arbitrary clients or workloads.

Section 3 (pp. 179–180) assumes a trusted server, a single-threaded client, and message order matching client sends/receives. Invalid behavior is only semidecidable in general; a timeout may reject a legitimate client without proving inconsistency. The tested exploit traces exhausted the search space. Section 7.3 (p. 188) also requires known configuration and environment modeling.

The trusted components are the client binary/source correspondence, instrumentation and stubs, symbolic executor, constraint solver, session-key logging, cryptographic assumptions, and network trace. The approach requires a known implementation; it does not verify unknown clients, prove server correctness, or find bugs inside the cryptographic primitive. Inference: a verified Rust monitor could reuse the path-witness and residual-assumption pattern, but soundness still depends on the modeled binary, environment, and cryptographic assumptions.

## what VL should reuse
Reuse path witnesses, constraint reconciliation, multipass fixed-point replay, and explicit residual assumptions. Existing client-verification work already supplies the message-level algorithm; VL should not redo it as an informal monitor. Inference: for Rust, generate a verified state-machine specification from code and use the multipass checker as an external validation layer, while proving safety-critical transition lemmas in Verus.

## techniques for the catalog
- symbolic path exploration: fork unknown branches and retain paths consistent with observed messages
- message reconciliation: constrain send states with concrete network bytes and reject contradictions
- multipass prohibitive execution: skip expensive symbolic primitives, replay after inputs become concrete, and stop at a fixed point
- explicit residual assumptions: report unresolved cryptographic computations instead of silently accepting them
- lazy constraint generation: add exact constraints when selected buffers become concrete, including inverse-function constraints
- shared version choice: explore multiple known versions while preserving one consistent choice across a trace
- concurrent path scheduling: explore candidate executions in parallel to reduce latency
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The concrete execution of AES yields a concrete value for s, which was not previously known."): checked the whole supplied paper including appendices and references against the study, quotations, section/page references, equations, technique steps, metadata and publisher link; corrected misquotations, page references, prefix backtracking and exactness qualifications, added lazy constraints and multi-version verification; retained tag and used the publisher page printed in the paper; experiments, code, symbolic executor and cryptographic assumptions not independently reproduced.
