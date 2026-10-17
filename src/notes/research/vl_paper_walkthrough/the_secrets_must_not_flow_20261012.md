# The Secrets Must Not Flow: Scaling Security Verification to Large Codebases
(authored by agents unless marked 🧑)
Tag: `arquint2026secrets`, [paper](https://doi.org/10.1109/sp63933.2026.00026)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and result

This paper presents Diodon, a sound methodology for proving security properties of a small protocol Core together with a much larger Application. The Core is verified with auto-active refinement proofs; whole-program taint and static analyses show that the Application cannot leak secrets through I/O or violate Core API assumptions. The Verus mappings below are the study's inferences; the paper's evaluation uses Go, Gobra, Tamarin, and Argot.

The central problem is compositionality. Verifying only a protocol module is unsound if surrounding code can log a key, mutate protocol state, or call APIs with invalid permissions. Diodon therefore partitions code at function boundaries and proves that the entire implementation refines a Tamarin model. Its key claim is: “This split allows us to apply powerful semi-automated verification techniques to the security-critical Core, while fully-automatic static analyses scale the verification to the entire codebase.” (abstract, page 1)

## technique: separate protocol model, Core, and Application

what it is and when to use it

Use this when a security protocol is syntactically isolated but embedded in a large codebase. The Core contains all protocol-relevant behavior and exposes an API with an invariant. The Application contains the remainder and is checked by automatic analyses. The split is valid only if all protocol-relevant I/O and secret-dependent behavior are accounted for.

how to do it

1. Model the protocol roles and attacker in Tamarin, using `In`/`Out` facts and multiset rewrite rules.
2. Prove secrecy/agreement properties of the abstract model.
3. Choose a syntactically isolated Core implementing one role; keep it as small as possible while retaining all protocol state and protocol-relevant I/O.
4. Define a separation-logic invariant for Core state and pre/postconditions for every public Core API.
5. Treat Core–Application calls and callbacks as virtual protocol I/O where they represent model interactions.
6. Verify Core refinement and analyze the Application under the API restrictions.

The paper's refinement criterion is trace inclusion: “the program’s I/O behavior is contained in the model’s I/O behavior.” (section 2, page 4)

Verus form (inference)

A Verus Core can expose `spec` invariants and `requires`/`ensures` on Rust functions, with ghost permissions or tokens for protocol I/O. A Tamarin model can remain external; a bridge must state which Rust calls correspond to model events. Rust module privacy and ownership help isolate state, but callbacks, `unsafe`, and shared mutable state still need whole-program checks.

evidence and limits

The methodology requires a natural Core boundary and restricted Core API contracts. It is sound only under assumptions about no undefined behavior, no data races, and sound model/verifier/analysis tools. If taint reaches an Application sink, the partition fails rather than silently accepting an unsafe split.

## technique: I/O independence by whole-program taint analysis

what it is and when to use it

I/O independence proves that protocol-irrelevant I/O cannot depend on protocol secrets. Use it to let the Application perform arbitrary attacker-simulable I/O without adding every log or filesystem operation to the protocol model.

how to do it

1. Mark secret sources: key-generation functions and secret inputs such as pre-shared keys. Propagate taint through derived session keys.
2. Mark sinks: all Application I/O and Core I/O lacking protocol I/O permissions. In Go, Capslock identifies calls that write files/network, alter OS state, make system calls, or execute external programs.
3. Propagate taint through data flow and control flow; disallow branching on tainted data unless an explicit justified override exists.
4. Treat Core–Application virtual inputs/outputs according to the protocol model: a model-permitted payload can be sanitized as non-secret for the subsequent Application send.
5. Reject the codebase if any tainted value reaches a sink.

The authors define the property directly: “We call this important property of an I/O operation I/O independence.” (section 4.1, page 6)

Verus form (inference)

Use a whole-crate taint pass over MIR/LLVM or a source-level effect analysis. Mark key types and secret-producing functions as sources, network/log/filesystem APIs as sinks, and reject secret-dependent arguments or branch conditions. Ghost events can model virtual I/O. A Rust type wrapper can help identify secrets but cannot replace flow-sensitive analysis when secrets are copied or serialized.

evidence and limits

In the SSM Agent case study, taint analysis took 29.0 seconds and found no flows. Deliberately logging Core state containing session keys caused failure. False positives required manual branch annotations and ignoring taint escaping a thread. The analysis relies on correct source/sink specifications and does not by itself prove functional protocol behavior.

## technique: auto-active Core refinement with I/O permissions

what it is and when to use it

Prove the Core's safety and that every protocol-relevant I/O operation is permitted by a model role. I/O separation logic attaches permissions to operations, just as heap permissions protect memory.

how to do it

1. Obtain a role I/O specification from the Tamarin model.
2. Give the Core exactly the permissions needed for a protocol run at initialization; retain them in its invariant.
3. Annotate each protocol-relevant I/O library function with a permission requirement and argument specification.
4. Prove with Gobra that Core functions preserve the invariant, satisfy heap permissions, and consume only available I/O permissions.
5. Model Application interactions as virtual I/O and prove their payloads are permitted.
6. Reject any operation lacking a model permission or violating a precondition.

The paper explains the consequence: “Since we provide exactly the I/O permissions justified by the protocol role’s model to the Core during its initialization, successful verification with Gobra implies that the Core executes at most the protocol-relevant I/O operations permitted by the model.” (section 4.2, page 7)

Verus form (inference)

Represent protocol-event permissions with ghost tokens or linear resources and consume/restore them around network calls. Use `requires`/`ensures` to preserve a protocol-state invariant and ownership of buffers. Verus's linear ghost types are a natural fit, but a custom event library is needed to connect proofs to Tamarin traces.

evidence and limits

For SSM Agent, the Core was 749 LoC, with 3,825 lines of specifications/proof annotations (1,064 I/O-related annotations generated by Tamarin); Gobra proved safety/refinement in 1.17 minutes. The proof used a 12-state Core state machine and axiomatized unsupported serialization/channel operations. Thus the small code fraction still required substantial annotations.

## technique: discharge Application obligations with static ownership analyses

what it is and when to use it

The Core proof assumes callers satisfy preconditions and preserve invariants. Diodon inserts conceptual ghost sets and checks sufficient conditions automatically for the Application instead of proving every Application function interactively.

how to do it

1. Track each thread's local heap set `lhs` and Core-invariant set `ihs`, plus a global heap set `ghs` for objects possibly shared between threads.
2. Require Core API contracts to have a restricted shape: preserve the Core invariant and require full permissions for pointer parameters, returning full permissions for pointer results.
3. At each Core allocation/API call, transfer permissions between `lhs`, `ihs`, and function arguments/results using implicit ghost updates.
4. Use pointer analysis for may-alias sets and reject aliased parameters.
5. Use escape/thread-locality analysis to establish parameter locality and keep Core instances in permitted threads.
6. Use pass-through analysis to ensure Core objects arise only from invariant-establishing constructors.
7. Check that Application memory accesses do not alias Core internal state and that transferred memory permissions are returned correctly.
8. Check callback restrictions: the Application must not re-enter a Core instance during a callback (condition C5, left future work in the SSM case).

The sufficient-condition table includes “C1 Core init”, “C2 No modification”, “C3 Core preservation”, “C4 Core locality”, “C5 Core callback”, “C6 Parameter locality”, “C7 Disjoint parameters”, and “C8 Application access.” (section 4.3, page 9)

Verus form (inference)

Rust ownership discharges some `lhs`/alias obligations statically, while Verus ghost state can represent `ihs` Core invariants and shared permissions. MIR escape analysis can check thread locality and callback re-entry. `unsafe`, interior mutability, FFI, and reflection require conservative rejection or additional analyses.

evidence and limits

Argot's SSM checks took 2.12 minutes for Core assumptions and under 1.5 person-months of adaptation. The prototype had false positives for captured Core pointers and struct escapes; authors rewrote code or manually inspected closures. C5 was not checked automatically. The method assumes Application data-race freedom and defined behavior.

## technique: use virtual I/O at module boundaries

what it is and when to use it

Protocol actions can cross the Core/Application boundary without directly touching a network API. Treat these transfers as virtual input/output, enforce their model permissions, and classify allowed payloads so later Application I/O is not falsely tainted.

how to do it

1. Identify Application-to-Core messages and Core-to-Application callbacks that represent protocol steps.
2. Add virtual I/O permissions for these events to the Core API specification.
3. Prove the Core performs only model-permitted virtual operations with the right payload.
4. When a model permits releasing a payload, mark that value non-secret for the corresponding Application sink analysis.
5. Keep actual network/file operations in the Application subject to ordinary taint checks.

Verus form (inference)

Model callback arguments and input buffers as ghost protocol events. A proof function can establish that a callback payload is permitted and non-secret before calling an Application closure. This separates message justification from the eventual network call.

evidence and limits

The signed DH case study uses inverted I/O: the Application performs actual network operations while the Core only consumes/produces byte arrays. Tamarin model: 177 LoC, verified in 3.2 seconds; Gobra Core: 178 LoC with 1,726 specification lines, verified in 14.2 seconds; all static analyses, including taint, took 9.7 seconds. The authors say this separation handles call stacks where the network send is far from message construction.

## formal guarantees, trust, and assumptions

Diodon's soundness proof has two parts. First, a Dolev–Yao attacker can simulate all secret-independent I/O, so adding such operations preserves model security. Second, implicit ghost annotations and static-analysis side conditions construct a separation-logic proof for the whole codebase from the Core proof. Trusted elements include Tamarin/Gobra/Argot soundness, cryptographic library specifications, I/O capability specifications, and the taint source/sink configuration. The Application remains assumed free of races and undefined behavior; unsafe Go packages, cgo, and reflection are not soundly handled.

The security model is symbolic: cryptographic operations are assumed perfectly secure, and the attacker cannot guess keys or exploit timing/side channels. Model properties are trace-based. Diodon proves secrecy and injective agreement only insofar as all protocol roles refine the model and the assumptions hold.

## case-study numbers and contradictions

SSM Agent is described as “a 100k+ lines of code (LoC) production Go codebase.” The abstract says the Core is “about 1 % of the code” and took less than three person-months to verify. The detailed case gives 749 Core LoC and 3,825 specification/proof lines; Tamarin model effort was under 2 person-months, Gobra under 3, I/O-independence Argot under 0.5, and Core-assumption Argot under 1.5. The abstract's “less than three person months” appears to summarize Core verification rather than the full methodology; the table reports a larger combined effort. These quantities should not be conflated.

Tamarin located and fixed a Mallory-in-the-middle attack in an earlier, unreleased protocol version (the intended recipient's identity was omitted from the signatures), and the Core proof exposed a data race in an earlier, unreleased Core. Injecting a plaintext DH secret made Gobra fail refinement; logging established session keys made taint analysis fail. These negative tests (the study's inference) show that the checks react to concrete violations, but they are not a vulnerability-detection rate over a benchmark corpus.

## relevance and threat to VL

For VL, Diodon suggests verifying a small Rust/Verus security kernel and proving the rest of an agent codebase cannot flow secrets to external effects or violate kernel contracts. This is a major scalability pattern: ownership, alias, escape, and taint analyses can discharge repetitive Application obligations. The threat is a false sense of coverage if the Core boundary, sources/sinks, unsafe code, callbacks, or race assumptions are incomplete. An agent-written verified Rust product could satisfy local Verus contracts while leaking through unmodeled FFI or logging; Diodon makes those assumptions explicit but does not remove them. This threat assessment is my inference.

## what VL should not redo

VL should not attempt to auto-actively prove every line of a large product when a protocol Core can be isolated. It should also avoid treating a Core proof as sufficient without whole-program secret-flow, alias, escape, and callback checks. New work should target Rust-specific analyses and explicit treatment of `unsafe`, FFI, async callbacks, and data races.

## techniques for the catalog

- Core/Application decomposition — isolate a protocol implementation and expose an invariant-bearing API
- I/O independence taint analysis — reject secret-dependent protocol-irrelevant I/O across the whole codebase
- Core refinement with I/O permissions — prove protocol-relevant operations are trace-included in a verified model
- static Application discharge — use alias, escape, pass-through, locality, and memory-access analyses to satisfy Core assumptions
- virtual I/O boundaries — model callbacks and module transfers as protocol events with permissions
- ghost permission instrumentation — track local, invariant, and global shared heaps to compose Core proofs with Application code

Audited 2026-10-12 against the paper: checked quotations and their page references, the C1-C8 condition names, SSM Agent and signed DH numbers (LoC, spec lines, times, person-months, 12-state machine), the technique steps against Sections 2, 4.1-4.4 and 6, and the Verus forms (labelled inference, sound). Changed: removed a first-person leftover drafting sentence; ghs is a global set, not per thread; the bug paragraph now says Tamarin found the Mallory-in-the-middle attack and adds the data race the paper reports; one unmarked inference labelled.
