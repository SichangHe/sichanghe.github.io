# A fully verified container library
(authored by agents unless marked 🧑)
Tag: `polikarpova2015container`, [paper](https://doi.org/10.1007/s00165-017-0435-1)

## scope and result
The paper reports full functional verification of EiffelBase2, a general-purpose container library, with AutoProof. The abstract states: “We present our experience verifying the full functional correctness of EiffelBase2: a container library offering all the features customary in modern language frameworks, such as external iterators, and hash tables with generic mutable keys and load balancing.” It reports 135 public methods and 8400 lines of code, 1.4 specification lines per code line, and 0.2 seconds per method on average (Abstract, p. 495). The implementation has 46 classes, 378 method implementations, 8440 executable lines and 531 specification/annotation lines as counted in Table 1 (p. 512); the 8400 figure is the rounded abstract number. The paper says the verification goal was full functional correctness, while the tool chain and its Boogie/Z3 encoding remain trusted.

## technique: model-based interface specifications
What it is. Separate a class’s abstract, observable state from its concrete heap representation. A linked list exposes a mathematical sequence model; clients prove behavior against that model and never need the node layout. The paper says, “Each EiffelBase2 class declares its abstract state as a set of model attributes” (Sect. 2.1.1, p. 498) and that ghost model values are stripped by the compiler, so they have no runtime overhead.

When to use it. Use this for reusable libraries whose clients need stable behavioral contracts while implementations vary or use inheritance. Choose a model that is complete for the public methods: a set cannot specify an order-sensitive `first` query, whereas a sequence can.

How to do it. (1) Declare a model attribute with a mathematical model type such as sequence, set, bag, map, or relation (Sect. 2.1.1, p. 498; Sect. 3.1, p. 502). (2) Specify commands by postconditions describing model updates and a frame clause restricting visible abstract state; specify queries as pure functions of the model. The paper gives `extend_back` as appending an argument and says its modify clause makes `sequence` the only observable state changed (p. 498). (3) Connect model to representation with invariant clauses: `sequence_implementation` relates sequence to linked cells, while `cells_first` and `cells_linked` describe traversal from `first_cell` (p. 498). (4) Check completeness and observability against the API; the paper defines these as design checks but says AutoProof did not mechanically implement them (Sect. 3.3, p. 504).

Verus form. Inference: use ghost fields or `spec` state to represent the model, `requires`/`ensures` for command/query contracts, and `invariant` clauses in proof loops or datatype predicates to connect the model to Rust fields. Verus has no Eiffel `modify` keyword; frame facts must be expressed with mutable-reference borrowing and postconditions. Ghost state is erased, but the Rust implementation must update it explicitly or prove a pure relation from concrete state.

Evidence and limits. The interface specifications let clients reason “solely in terms of the model while ignoring implementation details” (p. 498). The completeness/observability encoding was not implemented, and mathematical-model axioms are trusted inputs to Boogie/Z3.

## technique: closed/open invariants and ownership
What it is. Invariants hold only for closed objects. A mutating operation opens an object, changes state, then closes it after re-establishing the invariant. The paper states: “Programs modify objects following a protocol that requires opening an object, changing its state, and then closing it, while providing evidence that the invariant has been restored” (Sect. 2.1.3, p. 499). Ownership then makes the list the gatekeeper for its internal cells (Sect. 2.1.4, p. 500).

How to do it. (1) Put abstract-validity and representation facts in class invariants. (2) Establish ownership, for example `owns_definition` says a linked list owns exactly its cells. (3) Open the owner before modifying a cell; close it only after all invariant clauses hold. AutoProof implicitly opens `Current` at a public command’s start and closes it at the end, so routine bodies need no explicit calls in the common case (p. 499). (4) Require flexibility explicitly when a method must manipulate several objects.

Verus form. Inference: encode ownership through Rust’s `&mut` exclusivity and ghost sets of owned nodes; use `proof fn` routines to open and re-establish predicates around mutations. There is no `wrap`/`unwrap` construct in the allowed Verus notes, so the protocol is represented by preconditions, postconditions, and predicate unfolding.

## technique: collaborative invariants for iterators
An iterator depends on its list but cannot own it when several iterators coexist. The paper introduces subjects and observers: an iterator registers itself with the list, and the list records active observers (Sect. 2.1.6, p. 500). `remove_right` requires all other observers to be open; read-only `item` and `forth` permit multiple closed readers. This statically guarantees safe iterator behavior without Java-style version checks or .NET undefined behavior.

Inference: in Verus, model the subject/observer relation with ghost sets and permissions. A writer operation requires exclusive mutable access to the list and proof that iterator predicates are opened; readers retain shared borrows. Rust’s borrow checker supplies part of the exclusivity, while ghost predicates encode iterator position validity.

## technique: ghost state with implicit updates
AutoProof chooses regular ghost attributes linked to concrete fields by invariants, avoiding automatic model-variable updates that can become unsatisfiable during intermediate states. The paper says, “The downside of AutoProof’s approach is that it requires explicit updates to the ghost state inside method bodies” (Sect. 3.2, p. 503). To reduce repetition it adds an implicit assignment immediately before an object closes when an invariant clause defines a ghost attribute from an expression. This is useful for inherited “legacy” ghost fields.

Inference: Verus proofs should keep executable and ghost state separate, update ghost fields in proof code, and use `ensures` to establish the abstraction relation. Do not use unsupported Eiffel or Verus constructs such as `modifies` or `ensures` on a `spec fn`.

## evidence, trust, and product threat
The measured setup is AutoProof translating Eiffel to Boogie and then Z3 (Sect. 2.2, p. 502). Table 1 reports 378 implementations verified automatically, 8440 executable LOC, 1.4 annotation LOC per executable LOC, and 0.2 seconds average per method (p. 512). The paper also reports roughly seven person-months including tool extensions (p. 510). Trusted elements include the Boogie encoding, 228 MML axioms, SMT solver soundness, and the Eiffel compiler. Inference: these techniques are a high threat to a product that emits verified Rust if it targets container-heavy code: interface models, ownership, and collaborative iterator invariants are reusable patterns, while annotation maintenance and solver trust remain costs. Existing work already covers the core library-verification patterns; VL should reuse them rather than rediscover generic sequence/list specifications.

## techniques for the catalog
- model-based interfaces: expose mathematical ghost models and connect them to concrete representation invariants
- closed/open ownership: mutate owned objects only while open and re-establish invariants before closing
- collaborative iterator invariants: track subjects and observers to permit safe concurrent readers and exclusive writers
- ghost-state abstraction: maintain explicit ghost relations, with optional invariant-driven updates before closure
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
