# RustHornBelt: a semantic foundation for functional verification of Rust programs with unsafe code
(authored by agents unless marked 🧑)
Tag: `matsushita2022rusthornbelt`, [paper](https://doi.org/10.1145/3519939.3523704)

## scope and result

RustHornBelt gives a machine-checked semantic foundation for RustHorn-style first-order functional verification when safe APIs hide unsafe implementation. Its central problem is mutable borrows: the borrower changes state, but the original owner must learn the final state when the borrow ends. RustHorn represents that future state with a prophecy. RustHornBelt extends RustBelt's semantic type-soundness model with this functional specification layer and a new separation-logic mechanism, parametric prophecies.

The abstract states: “RustHornBelt employs the approach of semantic typing used in Jung et al.’s RustBelt framework, but it extends RustBelt’s model to reason not only about safety but also functional correctness.” It is a foundation, not an end-user verifier: “it does not constitute an automated verification framework in itself.”

## technique 1: prophecy-based first-order specifications for mutable borrows

What it is. A mutable borrow is represented by a pair: the current value and a prophesied final value. The paper explains: “RustHorn uses prophecies to express mutable borrows in functional style: as a pair of the current value of the object and the final (prophesied) value the object will have when the borrow ends” (§1, p. 842).

When to use it. Use this when translating stateful Rust into first-order logic while avoiding explicit heap/separation-logic state in the client specification. Shared borrows and owned values are straightforward; mutable borrows need the prophecy to communicate the borrow's result back to the lender.

How to apply it (paper method).

1. Treat Rust's aliasing-XOR-mutability (AXM) discipline as the basis for a functional representation (§1, p. 842)
2. At mutable-borrow creation, choose a fresh prophecy for the value at lifetime end (§2.2, pp. 844–845)
3. Represent the mutable reference as the current value paired with that prophecy (§2.2, pp. 844–845)
4. On a write, update the current value but keep the prophesied final value (mutref-write); when the mutable reference is dropped, resolve the prophecy by learning that the final value equals the current value (mutref-bye); when the lifetime ends, the lender gets its object back with that value (endlft) (§2.2, pp. 845–846)
5. For borrow subdivision (e.g. `index_mut`), let the old borrow's prophecy be partially resolved to a value that mentions the new borrow's prophecy, e.g. `v.2 = v.1{i := a'}` (§2.3, p. 846). The paper says the same extension covers nested borrows (§2.1, p. 844)

Verus form. Inference: state the observable relation with `requires`/`ensures` and use `old(...)` for the lender's pre-state; prove the relation with lemmas over the mutable reference's post-state. Inference: Verus source does not expose RustHorn's prophecy variables or Iris ownership tokens, so this is a semantic design analogy, not literal Verus syntax.

## technique 2: parametric prophecies

What it is. Jung et al.'s earlier Iris prophecies require explicit ghost instructions and treat a prophecy name as distinct from the value it resolves to, so they cannot partially resolve one prophecy to a value that mentions other prophecies (§1, p. 843; §5, p. 854). RustHornBelt introduces parametric prophecies embedded in a reader (clairvoyant) monad. The paper says this “alleviates all the above problems with Jung et al.’s prophecies, so long as we embed all our RustHorn-style specs within a reader monad, ensuring that we only make observations about prophecy variables that hold under all possible resolutions of those variables” (§1, p. 843).

How to apply it (paper method).

1. Create a fresh prophecy variable and own its unresolved token (§3.2, p. 849)
2. Represent a possible future as a prophecy assignment mapping variables to values (§3.2, p. 849)
3. Lift observations into a reader/clairvoyant monad so the specification is parametric in assignments (§3.2, p. 849; the updated semantics is in §3.3, p. 850)
4. Resolve a prophecy to a value that may depend on a finite set of other prophecies; the rule consumes and returns fractional tokens for those dependencies, proving they are still unresolved, which rules out paradoxes (§3.2, p. 849)
5. Use the resulting observational equality to connect a borrow's current and final values (§3.2–§3.3, pp. 849–851; mutref-bye proof in §3.4, p. 851)

Verus form. Inference: this can guide a Verus abstraction for APIs that split a mutable borrow (for example, a vector element borrow), but a practical Verus proof should expose the API's functional postcondition and prove it directly rather than introduce an uncheckable prophecy primitive.

## technique 3: semantic type-spec system for unsafe APIs

What it is. RustHornBelt extends a RustBelt type judgment with a predicate transformer describing functional behavior. For an API implementation `R`, the developer chooses a RustHorn-style specification Φ; the semantic model produces verification conditions that must be discharged in Iris. This supports safe APIs whose bodies use raw pointers, unchecked casts, or interior mutability.

How to apply it (paper method).

1. Model the API's type and ownership behavior in the semantic type interpretation (§3.1, p. 848)
2. Choose a first-order functional specification Φ for the API (§1, p. 843)
3. Apply the type-spec judgment to derive the predicate-transformer obligations for the implementation (§3.1, p. 848; §3.3, p. 850)
4. Prove those obligations manually in Iris/Coq; the model then establishes that safe clients observe the specified behavior (§1, p. 843; §3.4, p. 851)
5. Reuse the API specification in a separate RustHorn-style verifier such as Creusot for client programs (§4.2, p. 853)

Verus form. Inference: a Verus analogue is an `external` or trusted API contract plus proofs for each unsafe implementation boundary, followed by client proofs using the contract. Inference: the contract must identify all assumptions about allocation, aliasing, and mutation; Verus does not automatically derive a sound contract for arbitrary unsafe Rust.

## technique 4: defunctionalized invariants for SMT clients

What it is. Higher-order invariants such as the cell contains an even number are difficult for first-order SMT. The paper says such higher-order structure "can’t be directly handled by today’s SMT solvers", so the authors defunctionalize the invariants for Creusot with a ghost type implementing an invariant predicate, then wrap `Cell<T>` with that ghost witness. The paper gives the exact shape: `trait Inv<T>: 'static { #[predicate] fn inv(&self, a: T) -> bool; }` (§4.2, p. 853) and an `Even` implementation whose predicate is `a % 2 == 0` (§4.2, p. 854).

How to apply it (paper method).

1. Define a ghost invariant type `I` and predicate `inv(&self, value)` (§4.2, pp. 853–854)
2. Wrap the concrete cell with the ghost witness `Cell<T,I>` (§4.2, p. 854)
3. Give `get` a postcondition that its result satisfies the invariant and `set` a precondition requiring the invariant; the paper marks these specs `#[trusted]` (§4.2, p. 854)
4. Instantiate the wrapper, for example `Cell<u64, Even>`, and verify client code (the paper says Even-Cell verifies automatically) (§4.2, p. 854)

Verus form. Inference: encode the invariant as a `spec fn` over the value and carry it as a ghost parameter or quantified predicate; use `requires`/`ensures` on `get`/`set` and prove preservation. Inference: use only valid Verus specification constructs; the paper's `#[predicate]` attribute is Creusot syntax, not Verus syntax.

## evidence and limits

The Coq development had about 19k lines, reused about 2k lines of lifetime logic and 3k lines of the untyped calculus, and took two implementors about six months; about 7k lines were added to final proofs (§4.1, p. 852). Figure 1 lists, per API, the number of functions verified, Type LOC (the paper's definition: "LOC of the semantic model and proof for the type(s)"), Code LOC ("LOC of the λRust implementation of the functions") and Proof LOC ("LOC of the verification proof of the type-spec rules"): Vec (9 functions, 147 Type, 59 Code, 459 Proof), SmallVec (9, 209, 75, 619), Cell (8, 102, 20, 188), Mutex/MutexGuard (7, 258, 30, 222), JoinHandle (2, 73, 12, 52), and MaybeUninit (5, 140, 8, 108); the figure has further rows (slices/iterators, Misc) not listed here (paper Figure 1, p. 853). These are code-size counts, not correctness percentages.

The client evaluation used seven benchmarks totaling 407 lines including specifications, Ubuntu 21.04, Intel Core i5-10310U, 16 GiB RAM, Why3 with Z3 4.8.12 or CVC4 1.8.0 (§4.2, p. 853). Figure 2 reports one to 28 VCs per benchmark and average times from 0.03 s (Even-Cell and Even-Mutex, 3 VCs each) to 0.23 s (Go-IterMut, 1 VC); Knights-Tour had 10 VCs and 0.12 s (Figure 2, p. 853). The denominator is generated verification conditions, and the values are averages per VC.

The foundation proves soundness, not completeness: the paper explicitly says the original RustHorn proof also proved completeness, whereas RustHornBelt proves only soundness, and completeness is lost for interior-mutability invariants (§5, p. 854). It does not cover Rc, Arc, RefCell, or RwLock; the paper says this is "largely due to a technical issue related to step-indexing" and leaves it as an open problem (§1, p. 843; §3.5, p. 852). Creusot remains part of the trusted computing base, and the paper notes a formal gap between Creusot's surface Rust/WhyML and RustHornBelt's λRust/predicate-transformer model (§1, p. 843).

## techniques for the catalog

- prophecy representation: encode a mutable borrow as current plus future final value
- parametric prophecies: permit partial prophecy resolution while remaining valid for all assignments
- semantic type-spec judgments: derive and prove functional obligations for safe APIs implemented with unsafe code
- defunctionalized invariants: turn higher-order state invariants into ghost types and first-order predicates for SMT verification
