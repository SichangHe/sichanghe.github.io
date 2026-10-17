# Zoo: A Framework for the Verification of Concurrent OCaml 5 Programs using Separation Logic
(authored by agents unless marked 🧑)
Tag: `allain2026zoo`, [paper](https://doi.org/10.1145/3776701)

Zoo is a Rocq-embedded framework for verifying fine-grained concurrent OCaml 5 programs with Iris separation logic. Its practical move is to define ZooLang, a deliberately limited language that preserves the representation details needed by lock-free code, and to translate OCaml into that language with `ocaml2zoo`. The paper states: “We present Zoo, a framework for verifying fine-grained concurrent OCaml 5 algorithms.” (Abstract, article p. 1.) The framework assumes a sequentially consistent memory model, not OCaml 5's relaxed memory model; Section 14 (article p. 25) says “our semantics does not capture all observable behaviors and therefore our correctness results are compromised.” (Introduction, article p. 3.) Inference: VL can reuse the architecture of a faithful source embedding plus a foundational proof logic, but must model Rust/Verus ownership and Rust's memory model rather than copying OCaml's physical-equality rules.

## technique: faithful source-to-proof translation

Use when a proof assistant's convenient core language does not faithfully express the implementation language. The paper's steps are:

1. restrict the source to a fragment containing tuples, variants, records, atomic record fields, unboxed types, and top-level mutually recursive functions (Section 2.1, article p. 4)
2. run `ocaml2zoo` on OCaml compiler annotation files; it can process whole dune projects and dependencies (Section 2.1, article p. 4)
3. emit a deep ZooLang embedding inside Rocq, keeping source structure readable (Introduction and Section 2.1, article pp. 2, 4)
4. state specifications in Iris and prove them against the ZooLang operational semantics (Section 2.3, article pp. 5–7)

ZooLang includes mutable records, references, pattern matching, CAS/Xchg/FAA, domains, and prophecy constructs (Section 2.2, article pp. 4–5). The authors explain why representation fidelity matters: “Performance-conscious experts care about these representation choices, and we care about faithfully modeling their programs.” (Section 2.2, article p. 5.)

Verus form (Inference): translate Rust into a Verus-friendly intermediate representation only when a source feature cannot be expressed directly; preserve source locations and ownership identities; state the translation relation as a refinement theorem. Rust's typed algebraic data types and borrow checking make many Zoo encodings unnecessary, while Verus does not provide a deep embedding of Rust semantics automatically. A custom translator and its semantic preservation proof would remain trusted unless separately verified.

## technique: logically atomic specifications for lock-free operations

Use when an operation's abstract effect occurs at a future or hidden linearization point. For the Treiber stack, Zoo specifies `push` with a stack invariant and an abstract sequence model. The paper says: “The atomic pre- and post-conditions specify the linearization point of the operation: during the execution of stack_push, the abstract state of the stack held by stack_model is atomically updated from vs to v :: vs when v is atomically pushed at the top of the stack.” (Section 2.3, article p. 7.) The paper shows only the specification: a stack invariant `stack_inv`, an abstract model `stack_model`, and an atomic precondition and postcondition (Section 2.3, article pp. 6–7); it does not show the proof steps or invariant. This specification holds only because the Treiber stack uses a generative list type, so a successful CAS implies the current list equals the model (Section 5.3, article p. 13). Inference: the proof must show that the CAS loop preserves the invariant and performs the abstract update exactly once.

Verus form (Inference): model the abstract stack with a Verus state machine and a transition for push/pop; use tracked tokens for the invariant and a proof loop invariant for each CAS retry. A Verus `ensures` clause can state the returned abstract effect, but Iris logically atomic triples and proof-mode notation do not carry over. The relevant evidence is mechanized proof, not a runtime percentage; the paper reports stacks, queues, and bags but no total attempted/verified denominator.

## technique: concurrency primitives and prophecy variables

Zoo maps OCaml atomic references and atomic record fields to built-in Zoo operations. Under its sequentially consistent model, `Atomic.get`/`set` become plain load/store, while exchange, CAS, and fetch-and-add map to `Xchg`, `CAS`, and `FAA` (Section 3.3, article p. 8). Prophecy variables are exposed as `Proph` and `Resolve` to reason about future-dependent linearization points (Section 3.4, article p. 8). Inference: Verus state machines and tracked ghost state can represent abstract outcomes and retry protocols; a prophecy variable requires a ghost prediction plus a proof that the later observation resolves it. The paper's sequential consistency assumption is a hard boundary: Rust/Verus code using atomics must account for its actual ordering and architecture.

## technique: extend the language when verification exposes semantic gaps

The authors added atomic record fields to OCaml because atomic references were inadequate for idiomatic lock-free structures; the extension was merged in May 2025 and first released in OCaml 5.4 (Introduction, article p. 2; Section 4.1, article pp. 9–10). They also added generative immutable constructors to control physical identity and prevent compiler sharing/unsharing; these exist only in an experimental compiler branch and are not yet integrated into OCaml (Sections 5.3–5.4, article pp. 13–15; Section 14, article p. 25). The paper's rule is: “A rule of thumb would be to use it for all non-constant constructors involved in Atomic.compare_and_set operations.” (Section 5.5, article p. 16.)

The physical-equality method is:

1. distinguish immediate integers, mutable blocks, generative immutable blocks with identities, and non-generative immutable blocks (Section 5.5, article pp. 15–16)
2. specify definite equality for locations/identities and only possibility (`≈`) for ordinary immutable blocks (Section 5.5, article p. 16)
3. annotate constructors used by CAS with `[generative]`, giving them logical identifiers (Sections 5.3–5.5, article pp. 13–16)
4. use the identity invariant to prove that a failed CAS observed a different state, as in `Rcfd.close` (Section 5.4, article pp. 14–15)

Verus form (Inference): Rust allocation identity and pointer equality should be modeled with explicit ghost IDs only where an unsafe algorithm depends on identity. Safe Rust's ownership often eliminates the need for this extension, but `AtomicPtr` algorithms still need an invariant relating pointer identity to abstract nodes. For Eio's `Rcfd.close`, the paper says that because of possible unsharing “the program as it is written has a bug” (Section 5.4, article p. 15); the Introduction calls it “a potential bug in existing OCaml programs” (article p. 4). Inference: compiler representation assumptions can invalidate a proof even when source code is unchanged.

## technique: structural equality with owned footprints

Use when equality traverses arbitrary graphs and may diverge. Structural equality is not part of ZooLang's semantics but is implemented with low-level primitives (Section 6, article p. 16). Its specification requires “the (partial) ownership of a memory footprint corresponding to the union of the two compared graphs”; if it terminates, it decides whether the graphs are bisimilar modulo representation conflicts (Section 6, article p. 16). For abstract values without mutable or generative constructors, the paper proves a simpler variant in which structural equality coincides with physical equality (Section 6, article p. 16). Inference: Verus can express a terminating recursive equality with a `decreases` clause and a ghost footprint predicate; the footprint must grant read permission to every traversed node. No Verus or quantitative result is given in the paper.

## technique: modular resource algebras for concurrent protocols

The `Rcfd` case study models a file descriptor with a monotonic logical state: open, closing/users, and closing/no-users (Section 9, article pp. 17–19). `make` stores the full fractional predicate Ψ 1 in the invariant, `use` hands out fractions of Ψ, and `close` or `remove` flags the state as closing exactly once. The physical close happens once, by the thread that wins the second compare-and-set after the reference count reaches zero (Section 9, article p. 18). Originally there were four logical states; three suffice (Section 9, article p. 18). Both `Open` and `Closing` are generative constructors, to prevent unsharing and sharing respectively (Section 9, article p. 19). The simplified specification shown covers four operations (`make`, `use`, `close`, `remove`) and the full specification supports two ownership regimes (Section 9, article pp. 17–18). Inference: encode this in Verus as a state machine with an invariant token, a user-count ghost value, and transitions that enforce monotonicity. The file descriptor, callback, and OS close operation remain external trusted resources unless their contracts are proved.

## technique: explicit chains and external linearization points

For Michael–Scott queues, Zoo introduces the notion of explicit chain, which “allows decoupling the chain structure formed by the nodes and the content of the nodes”; its ownership is controlled by a discardable fraction (Section 10.2, article p. 20). Atomic record fields let the queue avoid the extra pointer indirection that earlier HeapLang encodings used, but then outdated nodes must be cleared so their values can be garbage-collected (Section 10.2, article pp. 19–20). The `is_empty` operation has an external linearization point: when the sentinel read is outdated because other operations filled and emptied the queue, `is_empty` is linearized at the first push that filled the queue (Section 10.2, article p. 20). The invariant transfers the Iris atomic-update resource from `is_empty` to `push` and vice versa (Section 10.2, article p. 20).

Verus form (Inference): represent the chain with a ghost sequence of node IDs and prove each CAS preserves reachability and ownership; represent an external linearization point with a state-machine transition credited to the operation that first makes the queue nonempty. Verus has no Iris atomic-update notation, so the accounting must be an explicit ghost transition. Inference: the technique is relevant to agent-written verified Rust queues.

## technique: split functional and memory-safety invariants

The Dynarray case study separates a strong sequential model from a weak invariant preserved under arbitrary interference. The paper states: “Functional correctness relies on a strong invariant, which may not be preserved under concurrent usage.” (Section 11.1, article p. 22.) The weak invariant says the backing array remains well-typed and the size is nonnegative; it proves memory safety even when the strong size-capacity relation is temporarily false (Section 11.1, article pp. 21–23). Steps are to prove the strong model under unique ownership, prove weak semantic typing under every concurrent operation, and combine them when synchronization provides unique ownership (Section 11.1, article pp. 22–23).

Verus form (Inference): use a state-machine invariant for memory validity that is stable under interference, plus a stronger ghost model available under exclusive ownership. Rust's bounds checks and borrows cover part of this pattern, but unsafe indexing or raw buffers still need the weak invariant. The paper verified a representative fragment, not every Dynarray operation.

## what is proved, measured, and trusted

Zoo mechanizes the ZooLang semantics and Iris program logic in Rocq and verifies selected libraries; the paper does not claim that the `ocaml2zoo` translator is verified. It verifies a subset of the standard library, an Eio file-descriptor component, and a large subset of Saturn; a skip list and hash table remain unverified (Introduction, article p. 3). The paper gives no single denominator for all code or proof obligations, and the Iris invariants of the Saturn structures are not shown for space (Section 10, article p. 19). The memory model is sequentially consistent even though OCaml 5 is relaxed; the standard compiler and runtime are not verified (Introduction, article p. 3). A few functions from the Domain and Random modules are axiomatized (footnote 17, Section 7, article p. 17). Inference: the main threat to VL is unsound assumptions about representation, atomics, and unsafe code, rather than the absence of a concurrency logic. Existing work means VL should not redo generic CAS-stack or queue invariants without addressing Rust-specific APIs, relaxed memory, or proof maintenance.

## techniques for the catalog

- - faithful source embedding — translate a practical language fragment into a deep proof-assistant embedding while preserving representation details
- - logically atomic contracts — specify a lock-free operation's abstract effect at its linearization point
- - prophecy variables — predict future observations to verify future-dependent linearization points
- - generative identity control — constrain sharing and unsharing so physical equality is a usable proof fact
- - owned-footprint equality — require traversal permissions and specify terminating structural comparison over graphs
- - resource-algebra protocols — model monotonic states, fractional users, and one-time physical effects
- - explicit-chain invariants — separate linked structure from node contents and support garbage-collection erasure
- - external linearization accounting — transfer the atomic-update resource when one operation's result depends on another
- - split safety invariants — prove weak memory safety under interference and strong functional correctness under ownership
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Thomas Leonard, the author of Rcfd, suggested verifying it to make sure the informal concurrent protocol he described in the OCaml interface was correct."): read the whole paper text and checked every quotation, section and page reference, the technique steps, and the tag, author, year and DOI link (https://doi.org/10.1145/3776701, from the paper). Changed: the memory-model claim now cites Section 14; the Treiber-stack proof steps were removed because the paper shows only the specification, and the generative-list caveat was added; the atomic-field citation was corrected to Section 4.1 and the generative-constructor status (experimental branch only) was added; the Rcfd bug wording now quotes the paper; the structural-equality, Rcfd-state and Michael-Scott explicit-chain/is_empty descriptions were corrected to the paper; the claim that the translation is mechanized, an unsupported phrase about garbage-collection erasure and the Section 9 axiom footnote were fixed; unsupported statements are now marked "Inference:". Not checked: the Rocq development, the linked repositories, and whether the Verus-form inferences are sound.
