# Towards verifying unsafe Rust programs against Rust’s pointer-aliasing restrictions
(authored by agents unless marked 🧑)
Tag: `tas2026verifying`, [paper](https://arxiv.org/abs/2603.28326v1)

Audit: audited 2026-10-13 against the paper; checked the quotations, page and section references, rules, the Listing 1 description and the technique steps; changed the abstract reference of the first quotation (it is from Sec. 1), the Listing 1 description, one wrong Verus clause (opens_invariants), technique 5 (the technical report's extended logic was omitted, so features were wrongly presented as unsolved), the hedge on the Verus-is-unsound claim, and marked the trusted base as inference.

## scope and status

Tas and Jacobs present a work-in-progress separation logic for checking that unsafe Rust obeys pointer-aliasing restrictions. It is not a completed verifier: the paper defines a toy language λPA and proof rules, then lists missing features and planned implementation in VeriFast. Its value for VL is foundational. Verus can prove functional properties while an unsafe block may still violate Rust's aliasing model; this logic identifies resources and proof obligations that a Rust verifier must preserve. Claims about translating it to Verus below are my inference.

The paper states: “we present our work in progress towards the first program logic capable of modularly verifying that Rust programs using unsafe blocks are compliant with the pointer-aliasing rules.” (Sec. 1, p. 1)

## technique 1: reduce unsafe Rust to λPA with provenance

what it is and when to use it

Model only the aliasing core rather than all Rust syntax. λPA has values (integers or pointers), `new`, `free`, dereference, mutable/shared borrow, write, sequencing, and let binding. Each pointer retains an address and a provenance class: owning, mutable-reference, or shared-reference. Use this reduction when proving aliasing safety of low-level operations; it makes pointer permissions explicit without requiring a full Rust semantics.

how to apply it

1. Translate allocation to `new(v)`, deallocation to `free(p)`, and `&mut x as *mut T` to `&mut *x`.
2. Keep provenance separate from address: pointers to the same cell can have different permissions.
3. Translate sequencing `e1; e2` as a let binding.
4. Prove the translated program with the logic's axiomatic rules.
5. Treat unsupported Rust constructs as an explicit modeling gap, not as proved safe.

The paper says: “a pointer x points to the same memory as a borrow like &x or &mut x, but each would have a different provenance, since it consists, among other information, of the mutability permisions of the pointer.” (Sec. 2, p. 2)

Verus form (inference)

Define ghost tokens or tracked resources carrying allocation identity and borrow provenance, and use `tracked` fields to distinguish owner, mutable borrow, and shared borrow. Keep raw-pointer addresses abstract; expose unsafe operations through proof functions with preconditions describing provenance. Verus's ordinary Rust type checker will not enforce these raw-pointer obligations, so the proof layer must do so explicitly. The λPA grammar itself does not carry over.

Evidence and limits

The worked translation is a five-line program where `x` is allocated, `y` mutably borrowed, `y` written, `x` written, and then `y` written again after the borrow should have ended. The final write is marked UB (Listing 1, p. 2). There is no implementation, benchmark, or soundness theorem in this paper; planned validation is future work.

## technique 2: fractional separation resources

what it is and when to use it

Assertions describe fractional heaps. A resource `p ↦ v` records a points-to fact with fraction q in (0,1]; separating conjunction `P * Q` splits heap resources; `emp` is empty. Full ownership is required to write or free. Fractional ownership permits several read-only aliases. Use this to make aliasing and mutation permissions mechanically visible.

how to apply it

1. Represent a heap as a map from resources to fractions in [0,1].
2. Allocate with `{ emp } new(v) { r. r ↦ v * r ∈ OwningPointers }`.
3. Consume the full points-to resource for a write: `{ p ↦ v_old } *p := v { p ↦ v }`.
4. Free only with full owner resource: `{ p ↦ v } free(p) { emp }`.
5. Compose independent facts with `*`; use frame rules to preserve unrelated resources.
6. Use `H-exists` and `let` rules to propagate returned resources through local bindings.

The paper says: “Above definitions and proof rules introduce a fairly straightforward separation logic with a fractional heap.” (Sec. 3, p. 3)

Verus form (inference)

Encode fractions as ghost permission states or linear tokens rather than arithmetic fractions in executable memory. `tracked` values can transfer exclusive permission; shared borrows can expose read-only views. Verus's ownership system supplies some of this discipline for safe references, but raw pointers and aliasing provenance need explicit ghost state. A direct fractional heap model may be easier in a ghost map plus lemmas than in ordinary Rust references.

Evidence and limits

The rules are axiomatic and illustrative; no mechanized metatheory or measured case study is reported. Fraction q is later relevant to reference ending: the authors note a possible mismatch between a literal Rust rule and their fractional transfer rule.

## technique 3: mutable-borrow and reference-ending rule

what it is and when to use it

A mutable borrow consumes the lender's full points-to permission and creates a full points-to permission for the borrower plus a reference-ending resource. That resource is a view shift allowing ownership to return only when the borrow ends. Use this to prevent writes through the lender while `&mut` is live and to model reactivation after a borrow's lifetime.

how to apply it

1. Start with `{ p ↦ v }`.
2. Apply `mutable-borrow`: `{ p ↦ v } &mut *p { r. r ↦ v * r ⇑ p }`.
3. Use the borrower resource to write through `r`; the lender cannot write because its resource was transferred.
4. At the end, apply `reference-end`: `p' ↦ v * p' ⇑ p ⇛ p ↦ v` (with matching fractions).
5. Continue with the lender and eventually free it.

The paper says: “Creating a mutable reference in our language requires the full points-to resource of the lending reference, and produces a full points-to resource to the same memory for the borrowing pointer.” (Sec. 3.1, p. 3)

Verus form (inference)

Use a ghost borrow token tied to a unique raw allocation. The mutable-borrow proof function consumes the owner's token and returns a borrower token plus an end token. A `Drop`-like or explicit end proof must reconstitute owner permission before later writes. Rust's lexical borrow checker already handles safe references; this layer is for raw-pointer casts and unsafe lifetime extensions.

Evidence and limits

The paper quotes the Rust Reference's mutable rule: “&mut T must point to memory that is not read or written by any pointer not derived from the reference and that no other reference points to while they are live.” (Sec. 3.1, p. 4). The authors note that fractional q ≠ 1 in `reference-end` may conflict with a literal reading, though Tree Borrows might permit it. This is an unresolved assumption, not a proved resolution.

## technique 4: shared-borrow fractions and freezing

what it is and when to use it

A shared borrow splits ownership into read-only fractional permissions for lender and borrower. Multiple shared references can coexist, but no party has full permission to write while they live. Use it to prove read sharing and prohibit mutation through `&T`; interior mutability (`UnsafeCell`) is not yet in this paper's logic (footnote 4, p. 4).

how to apply it

1. Start with full or partial `p ↦ v`.
2. Apply `shared-borrow` to produce lender and borrower fractions plus a reference-ending resource.
3. Repeat to create multiple shared aliases, splitting fractions.
4. Read through any alias using the read rule.
5. Apply view shifts to end aliases and recombine fractions before writing or freeing.

The paper says: “Given that shared-borrow only gives partial ownership to the lending pointer, and offers no way to acquire full ownership, it can never be possible to apply write using this pointer, and thus mutation is not possible while the shared reference is live.” (Sec. 3.2, p. 4)

Verus form (inference)

Represent shared aliases as read-only tracked capabilities, with an invariant that their fractions sum to at most one and no write proof can consume them. For `UnsafeCell`, do not freeze the cell's interior; encode an explicit interior-mutability invariant. Ordinary `&T` proofs can rely on Rust's safe type system, while raw shared pointers require these ghost obligations.

Evidence and limits

The current logic freezes only the memory directly behind a shared reference. It does not recursively freeze reachable pointers, so `&&mut T` can be used to recover a mutable reference and write. The paper quotes the stronger rule: “Moreover, the bytes pointed to by a shared reference, including transitively through other references (both shared and mutable) and Boxes, are immutable; transitivity includes those references stored in fields of compound types.” (Sec. 4, p. 6). Recursive freezing is future work and may be relaxed by Tree Borrows.

## technique 5: modular extensions and explicit trust boundary

The conclusion says an extended version in a technical report [13] additionally supports two-phase borrowing, functions, interior mutability and Boxes, and leaves structs and recursive freezing as future work; this paper describes the extensions only in prose, without rules. Function calls require reborrowing mutable arguments on entry and hiding reference-ending resources during the call. `UnsafeCell` must preserve full points-to resources so mutation through shared pointers is possible. `Box<T>` behaves like `&'static mut T` for aliasing, except a Box argument need not remain live for the whole call. Structs are needed for abstraction and modular client verification. The authors plan a VeriFast implementation, real-world examples, and a soundness proof against a Rust model such as Tree Borrows.

The paper states: “Lastly, we plan to validate the logic extensively, by implementing it in the VeriFast tool for separation-logic-based modular formal verification of Rust programs and proving compliance of some real world Rust programs; and by proving soundness of the logic with respect to some formal model of Rust’s aliasing rules like Tree Borrows.” (Sec. 4, p. 6)

What is proved or measured

The paper provides proof rules and hand proof outlines for allocation, mutation, mutable/shared references, and ending references. It proves or measures no implementation result, benchmark count, success rate, or soundness theorem. Inference: the trusted base includes the chosen interpretation of Rust's aliasing rules, the fractional-resource semantics, all axioms, and any future VeriFast encoding. The authors say: “As far as we are aware, existing approaches for modularly verifying unsafe Rust code, such as RefinedRust [4], Verus [9], and Gillian-Rust [1], ignore these rules and are therefore unsound.” (Sec. 4.1, p. 6). That is a hedged claim by the authors, not an independent assessment here.

Threat to VL (inference)

The threat is direct and high for agent-written unsafe Rust: a Verus proof can establish functional contracts while missing aliasing UB. VL should treat raw-pointer provenance, mutable-borrow exclusivity, shared freezing, `UnsafeCell`, Box, function-call lifetimes, and recursive reachability as separate proof obligations. Safe Rust code gets compiler enforcement, but unsafe wrappers need ghost permissions and a model aligned with whichever aliasing semantics Rust standardizes.

## techniques for the catalog

- provenance-aware λPA reduction — model address and ownership provenance separately before proving unsafe operations
- fractional separation heap — represent exclusive and shared permissions as splittable points-to resources
- mutable-borrow transfer — consume lender ownership, grant borrower ownership, and return it through a reference-ending view shift
- shared-borrow freezing — split read-only fractions so no shared alias can write while live
- modular call boundary — reborrow mutable arguments and hide ending resources for the call duration
- interior-mutability exception — preserve writable resources behind `UnsafeCell` while keeping ordinary shared memory immutable
