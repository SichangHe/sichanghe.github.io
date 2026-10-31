# Securing Verified IO Programs Against Unverified Code in F*
(authored by agents unless marked 🧑)
Tag: `andrici2024securing`, [paper](https://arxiv.org/abs/2303.01350v3)

## secure compilation problem
SCIO★ protects a statically verified F★ program when linked with an untrusted input-output context. “We introduce SCIO★, a formally secure compilation framework for statically verified programs performing input-output (IO).” (abstract, page 1). The source interface has refinement types and pre/postconditions over IO traces; the target context has a weak interface without refinements, preconditions, or concrete postconditions. Its type remains parametric in an abstract policy specification (section 2.4, pages 8–9). Traditional extraction erases specifications while assuming linked code preserves them. The authors explain: “This is unsound and thus provides no global guarantees after compilation and linking.” (section 1, page 2).

## technique: higher-order contracts at boundaries
The compiler converts assumptions about unverified code into checks when control enters verified code. The paper describes wrappers: “The SCIO★ compiler wraps the program in new functions with weaker types and adds dynamic checks before each function call and after each function return crossing the boundary between program and context.” Its contribution list clarifies that SCIO★ “performs no dynamic checks when the program performs IO or when it passes control to the context.” (section 1, page 3).

Steps: provide executable checks and proofs that they imply the required specifications; use `import` to convert intermediate values into strong values and `export` in the reverse direction; import a context function by exporting its arguments, calling it, importing its result, and enforcing its postcondition; export a verified callback by importing its argument and enforcing its precondition before calling it. These operations recurse through higher-order types (sections 2.5–2.6 and 4, pages 9–10 and 15–18). The intermediate interface retains the access policy specification. Failed checks return `Contract_failure`; importing a function requires a proof that its postcondition also permits this error under the enforced policy (section 4.3, page 18).

Inference: in Verus, place executable checks in wrappers before unverified inputs reach verified functions. A `requires` clause alone does not enforce a condition on an unverified caller. Specify the error path explicitly; a failed check does not establish the original postcondition automatically. This is a proposed adaptation, not an implementation evaluated in the paper.

## technique: reference monitor for IO
A monitor records information about prior IO and checks every context IO operation before execution. “The monitor uses this information to enforce an access control policy by performing a dynamic check before each IO operation of the context (e.g., preventing access to a file descriptor associated with a password file or network socket).” (section 1, page 3). Checking a postcondition after return could discover a password leak only after damage. The linker supplies a secure IO library that consults monitor state, rejects forbidden operations, and returns `Contract_failure` without adding an IO event (section 2.7, pages 10–12).

Steps: choose runtime state and a relation saying which traces it represents; implement policy checks over that state and prove that success implies the trace specification; supply the context only secure IO operations; check before execution; update state for executed operations. The policy constrains context operations, while its specification also covers verified callbacks (section 2.7, page 11). Full runtime traces are optional: “Program traces are never materialized: they only appear in specifications.” (section 5.1, page 19). The web server stores context-opened descriptors, whether the current request was answered, and descriptors written to (section 5.3, page 20). Section 8, page 27 also gives an example storing the full trace.

Inference: in Verus, relate a ghost `Seq<Event>` to concrete monitor state and implement runtime policy tests inside the IO wrapper. Prove that the wrapper records executed operations and returns an error for rejected ones. An enforcement mechanism must also prevent unverified code from bypassing this wrapper; a ghost capability alone cannot constrain arbitrary external code.

## MIO effect and secure-compilation proof
MIO represents computations with a free monad, trace specifications with a predicate-transformer monad, and connects them with a monad morphism (section 3, pages 12–15). A flag restricts operations; contexts are polymorphic in that flag, preventing direct IO or monitor-state access (section 2.4, page 9). `get_mstate` lets contracts inspect state. Effectful checks capture state before a call and inspect it afterward while preserving flag polymorphism (sections 4.2 and 5.2, pages 16 and 20).

“We prove in F★ that SCIO★ soundly enforces a global trace property for the compiled verified program linked with the untrusted context.” (abstract, page 1). Theorem 6.1 preserves the verified program's postcondition when it has initial control (page 23). In the dual setting, Theorem 6.3 guarantees the policy specification for the whole program (page 25). RrHP, Theorem 6.2, requires that every target context have one source context matching its behavior for every source program (page 24). The proof unfolds compilation, back-translation, and linking into syntactically equal terms (page 25). Recoverable check failures can reveal information; source contexts receive effectful checks so the theorem permits the same information flow on both sides (page 24).

Inference: a Verus adaptation would need to establish the corresponding source/target context relationship; proving a wrapper's local postcondition alone would not establish RrHP.

## techniques for the catalog
- higher-order boundary contracts: compile wrappers that dynamically enforce refinement, precondition, and postcondition assumptions
- reference monitoring: check every untrusted IO operation against a trace-based policy before execution
- monitored effect discipline: restrict access to IO and monitor state with indexed effects or capabilities
- secure compilation proof: establish trace safety and relational preservation for verified code linked with hostile contexts
