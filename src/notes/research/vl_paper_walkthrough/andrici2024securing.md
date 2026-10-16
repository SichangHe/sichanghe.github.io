# Securing Verified IO Programs Against Unverified Code in F*
(authored by agents unless marked 🧑)
Tag: `andrici2024securing`, [paper](https://doi.org/10.1145/3632916)

## secure compilation problem
SCIO★ protects a statically verified F★ program when linked with an untrusted input-output context. “We introduce SCIO★, a formally secure compilation framework for statically verified programs performing input-output (IO).” (abstract, page 1). The source interface has refinement types and pre/postconditions over past IO traces; the target context has only a weak interface. The danger is that compilation traditionally assumes linked code preserves the verified program's assumptions. The authors explain: “This is unsound and thus provides no global guarantees after compilation and linking.” (section 1, page 2).

## technique: higher-order contracts at boundaries
Use this when verified code crosses a boundary to code whose types and contracts are unavailable. The compiler wraps boundary functions, checks refinement-typed arguments and results, and checks preconditions before calls and postconditions after returns. The paper says: “The SCIO★ compiler wraps the program in new functions with weaker types and adds dynamic checks before each function call and after each function return crossing the boundary between program and context.” (section 1, page 3).

Steps: identify each source boundary contract; compile a wrapper with a weak target type; insert argument/result refinement checks; evaluate preconditions before calling the other side; inspect return values and postconditions; consult monitor state for trace-dependent conditions. Higher-order callbacks require the same wrapping recursively. Contracts enforce assumptions that cannot be checked solely at an IO primitive, such as requiring a callback argument to be an open descriptor.

Verus form (Inference): expose trusted Rust components through wrapper functions with `requires` and `ensures`; check value predicates at every call and return. For callbacks, carry the contract as a trait specification or ghost predicate. Verus proves the wrapper checks, but a dynamic check that fails must return an error or abort; it cannot silently preserve the postcondition.

## technique: reference monitor for IO
A monitor records the trace and checks every context IO operation before execution. “The monitor uses this information to enforce an access control policy by performing a dynamic check before each IO operation of the context.” (section 1, page 3). This timing matters: checking a postcondition after return could discover a password leak only after damage. The linker forces context code to use a secure IO library whose operations consult monitor state, reject forbidden events, and leave rejected events out of the trace.

Steps: maintain monitor state containing prior events; define an access policy over that trace; replace raw context IO with secure-library calls; perform the policy check before each read, write, file, or network operation; append allowed events; reject forbidden operations. Higher-order contracts and the monitor share state so a contract can require facts about earlier events.

Verus form (Inference): represent the trace as a ghost `Seq<Event>` and secure IO as a verified wrapper with `requires policy(trace, op)` and `ensures trace` extended only for allowed events. Keep the concrete OS call behind a trusted boundary and prove that all reachable context IO goes through the wrapper. This protects temporal properties that ordinary local ownership proofs do not express.

## MIO effect and secure-compilation proof
SCIO★ models computations with a monitored-IO effect (MIO), including `get_mstate`, and uses flag-based effect polymorphism to restrict which computations can access IO or monitor state (section 1, page 4). The authors verify the contracts, monitor library, their composition, and the whole compiler/linker. “We prove in F★ that SCIO★ soundly enforces a global trace property for the compiled program linked with the untrusted context.” (abstract, page 1). They also machine-check Robust Relational Hyperproperty Preservation (RrHP), stronger than full abstraction, using shallow embeddings and an inversion law between compilation and back-translation (section 1, pages 4–5).

Verus form (Inference): encode effect permissions with separate modules and ghost capabilities; expose monitor state only to verified wrappers. Prove a simulation between source traces and linked target traces, then prove the global safety invariant. RrHP itself is a relational theorem requiring paired executions and is substantially beyond a single-function postcondition.

## evidence, assumptions, and VL impact
The main case study is a statically verified web server linked with adversarial and benign request handlers (section 1, page 4). The paper reports machine-checked F★ proofs, but gives no defect-detection denominator or performance benchmark comparable to a corpus. Trusted elements include F★, the shallow language embeddings, the OCaml execution path, and assumptions about the secure IO primitives and environment. Inference: agent-written verified Rust remains vulnerable at FFI, plugin, filesystem, and network boundaries even when internal proofs pass. VL should generate wrappers, trace-aware policies, and explicit trusted-boundary contracts; existing SCIO★ already establishes the contract-plus-monitor pattern, so VL should not redo its secure-compilation theory.

## techniques for the catalog
- higher-order boundary contracts: compile wrappers that dynamically enforce refinement, precondition, and postcondition assumptions
- reference monitoring: check every untrusted IO operation against a trace-based policy before execution
- monitored effect discipline: restrict access to IO and monitor state with indexed effects or capabilities
- secure compilation proof: establish trace safety and relational preservation for verified code linked with hostile contexts
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
