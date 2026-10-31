# SecRef*: Securely Sharing Mutable References between Verified and Unverified Code in F*
(authored by agents unless marked 🧑)
Tag: `andrici2025secref`, [paper](https://doi.org/10.1145/3747522)

## scope

SecRef★ is a secure-compilation framework for F★ programs that share dynamically allocated ML-style mutable references with linked unverified code. The paper’s central mechanism is a permanent label for references that may cross the boundary, combined with higher-order contracts for the remaining functional properties. The abstract states: “To ease program verification in this setting, we track which references are shareable with the unverified code, and which ones are not shareable and whose contents are thus guaranteed to be unchanged after calling into unverified code” (Abstract, p. 1). It proves sound interoperability and robust relational hyperproperty preservation (RrHP), then demonstrates a cooperative scheduler.

## technique 1: monotonic labels for dynamically shared references

Dynamic sharing is hard because sharing is transitive and permanent: references reachable through a shared reference become shared, and later writes can expose newly allocated references. The solution overapproximates exact sharing with labels. Fresh references start private; `label_shareable` changes a reference to shareable permanently. The paper says: “Our solution builds on the idea that being shareable is a monotonic property of references, meaning that it can be treated as a logical invariant once it is established” (Introduction, p. 2).

A global heap invariant requires a shareable reference to point only to shareable references (Introduction, p. 3). In the introduction's `safe_prog` example, the program labels `!r` and then `r` shareable before passing `r` to the unverified library, and labels a fresh reference `v` shareable before writing it into `r`; the private `secret` reference stays private, so `assert (!secret == 42)` can be proved even though the library's callback may write every shareable reference (Introduction, pp. 2–3). The autograder of Fig. 1 does the same for a linked list: it labels the list shareable and witnesses that before calling the student homework (Sect. 2.1, p. 4).

Steps (paper): (1) allocate references as private; (2) label a data structure shareable before it crosses the boundary, starting at the ends of reference chains, because `label_shareable` requires every reference the labeled one points to to be shareable already (Sect. 4.3, p. 17); (3) maintain the global invariant that shareable points only to shareable; (4) label a newly allocated value before writing it through a shareable reference; (5) require a witnessed shareability fact when calling unverified code; (6) specify the call footprint as all shareable references (Introduction, p. 3; Sect. 2.1, pp. 4–5). The paper says “the SecRef★ user has to manually track only the label of the root reference of a complex data structure (e.g., the head of a linked list)” (Sect. 2.1, p. 5).

Inference: Verus can represent the boundary with a ghost label map and a `spec fn` stating closure of shareable reachability, then require that map fact at an FFI-like wrapper and ensure private regions are unchanged. Rust ownership prevents some aliasing but does not by itself express all references reachable from this root are shareable; that closure remains a model and proof obligation.

The evidence is a mechanized F★ proof, not a performance study. The threat assumption is explicit: the unverified context cannot forge references, newly allocated unverified references are treated as shareable, and verified code passes only shareable references (Sect. 2.1, p. 5). Inference: violating any assumption makes the footprint guarantee unsound.

## technique 2: stable witness and recall tokens

Monotonic State turns a stable heap predicate into a heap-independent token. `witness` records that a predicate held; `recall` recovers it at a later heap. The paper explains: “witness, allowing one to convert stable heap predicates into heap-independent ones, and (2) recall, allowing one to recover an already witnessed predicate for any future heap” (Sect. 2.1, p. 6). Shareability is stable because labels never revert.

Steps (paper): (1) prove `is_shareable r h` in the current heap; (2) call `witness` to obtain `witnessed (is_shareable r)`; (3) carry that token through state changes; (4) call `recall` at a later heap to re-establish shareability; (5) use the recovered fact in the boundary precondition (Sect. 2.1, p. 6).

Inference: in Verus, a ghost token can be represented by a predicate whose `ensures` states persistence across the state-machine transition; a `proof fn` can establish or consume the token. Verus has no F★ `witness`/`recall` operations as such, so this is a logical pattern rather than a direct API translation.

## technique 3: polymorphic interface for unverified code

SecRef★ represents unverified code as a shallow F★ embedding parameterized by three abstract predicates: a global heap invariant `I`, a predicate `φ` constraining references reachable in the heap, and a heap preorder `≼`. The polymorphic allocation, read, and write operations all require and ensure `I`, evolve the heap according to `≼`, require `φ` of every reference they store, and ensure `φ` of every reference that `alloc` or `read` returns (Fig. 2 and Sect. 2.2, p. 7). The paper states: “The representation uses abstract predicates as well as a version of the reference-manipulating operations that mention only these abstract predicates in their specifications” (Sect. 2.2, p. 6).

This interface lets unverified code sequence operations without nontrivial logical reasoning. A polymorphic linked-list sorter receives abstract `alloc`, `read`, and `write` and combines them freely; its post-condition holds because each conjunct is carried from the operations' contracts or its own pre-condition (Sect. 2.2, pp. 7–8). At linking, SecRef★ instantiates `I` with the labeled-reference invariant, `φ` with `witnessed (is_shareable r)`, and `≼` with a preorder that permits only shareable modifications and preserves labels (Sect. 2.2, p. 8).

Steps (paper): (1) define the abstract invariant, reference predicate, and preorder; (2) give unverified code operations whose contracts mention only those parameters; (3) type the unverified code against these contracts, which needs only carrying the abstract predicates from post-conditions to pre-conditions; (4) instantiate the parameters at the verified/unverified link; (5) obtain the concrete intermediate interface; (6) add higher-order contracts for stronger value properties (Sect. 2.2, pp. 6–8; Fig. 3, p. 8).

Inference: a Verus wrapper can use an abstract `spec fn` for the allowed state transition and a Rust trait or function contract for external code. The concrete wrapper should preserve the ghost invariant in `ensures`; the paper’s parametric shallow embedding is not a Verus language feature.

## technique 4: higher-order contracts at the boundary

The polymorphic interface guarantees only the universal footprint property. It cannot establish that a returned list is sorted, acyclic, or value-preserving, because unverified code can arbitrarily manipulate shareable data. SecRef★ converts these stronger refinements into stateful higher-order contracts. The paper says: “export takes existing specs and converts them into dynamic checks … while import adds dynamic checks to have more specs” (Sect. 2.3, p. 9).

`export` checks preconditions and argument refinements when verified values enter unverified code. `import` checks strengthened postconditions and result refinements when control returns; the two functions are dual and support higher-order functions (Sect. 2.3, p. 9). The checks are verified not to modify the heap and are inferred from type classes where possible; if inference fails, the user supplies a check and proves that it implies the specification (Sect. 2.3, p. 9). Post-conditions that relate the heap before and after a call, such as `same_values`, use a stateful contract that reads the heap before the call and checks the result after it returns (Sect. 5.2, p. 20).

Steps (paper): (1) keep the footprint property static; (2) identify refinements that concern shareable values; (3) compile a boundary wrapper with `import`/`export`; (4) run dynamic checks on arguments, callbacks, and results; (5) prove that each check implies the required refinement; (6) rely on the contracts only reading the heap (Sect. 2.3, p. 9; Sect. 5.2, pp. 18–20). Inference: in Verus, this corresponds to an executable Rust wrapper plus a `requires`/`ensures` contract and explicit runtime validation before asserting a postcondition. A Verus `proof fn` cannot perform the runtime check; executable code must do it, and the proof function can establish the mathematical implication afterward.

## technique 5: encapsulated references for callbacks

A third label, `encapsulated`, permits private references to be updated indirectly by verified callbacks handed to unverified code. Such references are not shared with the unverified code, but the callbacks that modify them may be called an unknown number of times and stashed for later; only private references can become encapsulated, and they stay encapsulated forever (Sect. 2.4, p. 9). A pseudo-number generator (Fig. 4, p. 10) stores a monotonically increasing counter in an encapsulated reference and returns a callback that increments it.

Steps (paper): (1) allocate a private monotonic reference; (2) label it encapsulated; (3) close it over a callback; (4) give the callback to unverified code; (5) specify that unverified code may modify shareable or encapsulated references while preserving labels; (6) use the reference preorder to prove the counter only increases (Sect. 2.4, pp. 9–10).

Inference: Verus can model the callback’s abstract state machine and prove a monotonic counter transition with `requires`, `ensures`, and a loop `invariant` clause. It must account for arbitrary callback repetition and storage by unverified code; Rust lifetime checks alone do not prove this temporal property.

## technique 6: secure compilation proof by syntactic inversion and RrHP

SecRef★ compiles a verified partial program by wrapping it and inserting higher-order contracts. A target context is back-translated by instantiating the polymorphic interface and adding the same contracts. The syntactic inversion law equates target linking after compilation with source linking after back-translation (Sect. 6.4, pp. 22–23). The paper reports: “We prove that SecRef★ robustly preserves relational hyperproperties” (Sect. 6.4, p. 23).

Steps (paper): (1) define source and target shallow embeddings; (2) compile a partial source program with `safe_import`; (3) back-translate any target context with the corresponding contracts; (4) prove the syntactic inversion equality by unfolding; (5) transfer the source soundness theorem to arbitrary target linking; (6) prove RrHP by choosing the back-translated source context (Fig. 7, p. 21; Sect. 6.4, pp. 22–23). RrHP is also proved when the unverified code has initial control, and for target contexts given as expressions of a deeply embedded λ-calculus (Sect. 6.4, p. 23).

## case study and evidence

The cooperative scheduler represents each thread as a computation tree that either returns or yields a stateful continuation. The scheduler stores a private history/next/inactive counter with a fairness invariant, while a shared integer is exposed to tasks. Its continuation contract allows only shareable or encapsulated references to change (Sect. 7, p. 24). The scheduler’s proof relies on the private counter not being modified by tasks, which preserves the fairness invariant (Sect. 7, p. 24); the fairness of the final history is not stated in the post-condition of `run` (Sect. 7, p. 25). This is a concrete verified use case, but the paper reports no runtime or proof-time measurements; its conclusion says “it would be interesting to do a performance evaluation of the added higher-order contracts” (Sect. 9, p. 27).

The artifact includes “the full implementation of SecRef★, the machine-checked proofs, and examples” (Data Availability Statement, p. 28). The paper's trusted computing base is F★’s type system, the effect mechanism, the axiomatized Ghost effect, and module-system type abstraction (Sect. 6.3, p. 22); the Monotonic State soundness proof also relies on an axiomatic library for witnessed tokens (Sect. 3.3, p. 14). Inference: a user additionally trusts the assumption that unverified code cannot forge references and the specification chosen for unverified code. The paper lists four open problems toward a secure compiler to OCaml: higher-order store for effectful functions, more OCaml effects, end-to-end verified compilation (verified quoting and verified erasure), and Labeled References on top of Separation Logic (Sect. 9, p. 27).

## techniques for the catalog

- monotonic shareability labels: permanently label references and maintain a global reachable-shareability invariant
- witness and recall: turn stable heap facts into persistent tokens usable after arbitrary allowed state changes
- polymorphic unverified interface: abstract the heap invariant, reference predicate, and preorder so unverified code needs trivial reasoning
- higher-order stateful contracts: compile refinements at a verified/unverified boundary into checks on arguments, callbacks, and results
- encapsulated callback state: permit controlled updates to private callback state while preserving a monotonic preorder
- syntactic inversion: prove compilation plus linking equals back-translation plus source linking
- robust relational hyperproperty preservation: transfer relational behavior guarantees to arbitrary target contexts
