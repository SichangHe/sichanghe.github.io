# Programming with permissions in Mezzo
(authored by agents unless marked 🧑)

Tag: `pottier2013programming`, [paper](https://doi.org/10.1145/2500365.2500598)

## scope and contribution

Mezzo is a functional and imperative ML-lineage language whose permission discipline tracks both data shape and ownership. The paper's central claim is that a permission can express the current state of a mutable object, alias and non-alias facts, and the extent of owned data. The abstract says, “Mezzo is equipped with a novel static discipline of duplicable and affine permissions, which controls aliasing and ownership.” (Abstract, p. 1.) The abstract says the discipline “rules out certain mistakes, including representation exposure and data races, and enables new idioms, such as gradual initialization, memory re-use, and (type)state changes.” (Abstract, p. 1.) The introduction adds that data-race freedom is guaranteed only for a concurrent extension of Mezzo, not for the language as formalized (Section 1, p. 2).

A permission is a static artifact. An atomic permission `x @ t` grants the right to use variable `x` at type `t`; conjunction `P1 * P2` combines permissions, separating mutable locations while requiring agreement for immutable locations. Function types carry preconditions and postconditions, so calls transfer permissions in the same judgment that checks functional behavior. The paper states, “Permissions do not exist at runtime: they are purely an artefact of the type system.” (Section 2.2, p. 3.)

## technique: state and ownership in one permission

when to use

Use this when an object's legal operations depend on its state, when aliases must be controlled, or when an API transfers ownership. A nominal permission such as `xs @ list a` describes an immutable list and its reachable elements; a structural permission such as `dst @ MCons {head : a; tail : ()}` describes an unfinished mutable cell. Singleton types such as `=hd` record equality without claiming ownership of the pointed-to object.

how the paper does it

1. Declare algebraic data types. `data list a = Nil | Cons {head : a; tail : list a}` is immutable; `mutable data mlist a = MNil | MCons {head : a; tail : list a}` permits field and tag updates (Section 2.1, p. 2).
2. Give every function an explicit type with argument and result permissions. `appendAux` consumes an unfinished cell and two lists and returns the cell as an immutable list (Figure 1, p. 2).
3. Match on a value to refine its permission. Matching `xs` changes `xs @ list a` into either `xs @ Nil` or `xs @ Cons {head : a; tail : list a}` (Section 2.2, p. 3).
4. Decompose a structural permission when field values are needed. The rule introduces fresh names and produces `xs @ Cons {head = hd; tail = tl} * hd @ a * tl @ list a` (Section 2.2, p. 3; Section 4.2, p. 5; Figure 6, p. 7).
5. Allocate an unfinished mutable cell, write its tail, and freeze it with a tag update. In Figure 1, `dst.tail <- ...` followed by `tag of dst <- Cons` turns the cell into an immutable list node (Section 2.1, pp. 2–3).
6. Apply the recursive function. The call consumes the permissions named by its precondition and returns its postcondition; the caller folds `dst @ Cons {head : a; tail : list a}` into `dst @ list a` (Section 2.3, p. 4).

The tail-recursive proof avoids list-segment predicates. The recursive function type is the loop invariant: after the call, the caller performs the logical step of folding the returned cell. The paper says, “In short, the code is tail-recursive, but the manner in which one reasons about it is recursive.” (Section 2.3, p. 4.)

what transfers to Verus

Inference: model the state transition with a Rust enum and a ghost state predicate, then expose a function contract with `requires` and `ensures`. A Verus proof function can establish that an exclusive mutable reference changes from an unfinished-state predicate to a list predicate; an executable function can perform the field writes. Use `&mut` or a unique owning value for the exclusive cell, and use `old(...)` in `ensures` only when relating pre-state values. Verus does not infer Mezzo's implicit permission flow or its algebraic permission-subsumption rules, so the state predicate, framing facts, and recursive `decreases` argument must be written explicitly. This is an inference from the paper's permission rules to Verus, not a claim about Mezzo.

evidence and limits

The append example is a worked typing derivation, not a benchmark. The paper reports a machine-checked proof of type safety (Section 10, p. 12) and a prototype type checker (Section 1, p. 2), but it does not give a percentage success rate or a denominator for programs checked. The soundness statement is conditional: well-typed programs do not go wrong, except that a dynamic `abandon` check can fail. The paper also notes that its formalization lacks parameterized algebraic data types and mode constraints in Core Mezzo, although the surface language discusses them (footnote on p. 2).

## technique: duplicable, exclusive, and affine modes

when to use

Use modes to decide whether a permission can be shared, must be unique, or may simply be discarded. Immutable descriptions are duplicable and represent stable shared knowledge. Mutable descriptions are exclusive and represent unique read-write ownership. Permissions that are neither are affine: they cannot be duplicated but may be dropped.

how the paper does it

1. Classify permissions by the mode of their type. `xs @ list int` is duplicable; `xs @ MCons {...}` is exclusive; `xs @ list (ref int)` is neither: the paper says it “must not be duplicated” because that “would violate the ‘unique owner’ property of the list elements”, and it is not exclusive because the list cell is an immutable object, so it is merely affine (Section 4.1, p. 5).
2. Permit `DUPLICATE` only for duplicable permissions. The paper describes a duplicable permission as shared knowledge that “must never be invalidated” (Section 4.1, p. 5; Figure 6, p. 7).
3. Require exclusivity for writes and tag updates. `WRITE` changes the field type, and `WRITE TAG` can change the constructor only when the block is exclusive (Section 5.1, pp. 6–7).
4. Use affine weakening to discard a permission that is no longer needed. The paper states, “Every permission is affine. One can implicitly drop a permission that one does not need.” (Section 4.1, p. 5; rule WEAKEN, Figure 6, p. 7.)

what transfers to Verus

Inference: represent exclusive mode with a unique `&mut` borrow or a ghost token carried in `Tracked<T>`, and represent duplicable facts with `spec fn` predicates that do not contain mutable ownership. A Verus `requires` clause can demand the token; `ensures` can return the updated token and state predicate. Verus's borrow checker enforces Rust aliasing, but it does not automatically classify arbitrary predicates as duplicable or exclusive in Mezzo's sense. This is an inference.

evidence and limits

The mode analysis is defined as a fixed-point computation because algebraic data types are recursive (Section 4.1, p. 5). The paper omits the full predicates for “duplicable” and “exclusive” from the conference text and points to an extended version, so a reimplementation needs that missing definition. It also says programmer assertions that a type variable is duplicable or exclusive are not treated in the paper (footnote 3, p. 5).

## technique: permission subsumption and framing

when to use

Use subsumption to expose fields, forget names, fold a structural state back to a nominal type, or preserve unrelated permissions across a call. Use framing when a function touches only part of the heap.

how the paper does it

1. Apply `DECOMPOSE BLOCK` (Figure 6, p. 7) left-to-right to replace a field type with a fresh singleton name and a separate permission for that value.
2. Apply `EXISTS INTRO` to hide the fresh name when it should not escape.
3. Apply `FOLD` to turn a constructor-shaped permission into its nominal algebraic type. In the other direction, `UNFOLD` applies only when the algebraic data type has a single branch (a record type); for a `match`, the rule `LET DATA UNFOLD` (Figure 5, p. 7) refines the nominal permission instead (Figure 6, p. 7; Section 5.2, p. 8).
4. Apply `FRAME` to preserve a permission `P2` while an expression consumes `P1` and returns a result `(t | P2)` (Figure 4, p. 7).
5. Use `SUB` as the consequence rule, which the paper calls “analogous to Hoare’s rule of consequence” and which relies on permission subsumption and on subtyping (Section 5.1, p. 7; Section 5.2, p. 8).

The judgment `K; P |- e : t` consumes a pre-permission and produces a post-type, analogous to a Hoare or separation-logic triple. Function application consumes the callee precondition and returns the postcondition; this makes ownership transfer explicit in the static derivation. The paper says the judgment “is inductively defined in Figures 4 and 5.” (Section 5.1, p. 6.)

what transfers to Verus

Inference: write explicit `requires` and `ensures` clauses and prove frame facts with lemmas that leave untouched fields unchanged. Use `assert` and `assert forall` for equality facts corresponding to singleton permissions. Verus has no direct `FOLD` or `DECOMPOSE BLOCK` permission judgment; datatype invariants and `reveal`/predicate unfolding supply the analogous logical steps. This is an inference.

evidence and limits

The type checker is deliberately incomplete: the paper says its implementation is “not complete with respect to the type assignment rules” (Section 5.3, p. 8). It greedily introduces names and uses a persistent union-find structure for equalities, but the paper gives no completeness theorem or performance denominator.

## technique: adoption and abandon for dynamic sharing

when to use

Use adoption and abandon when mutable objects have arbitrary sharing that the static forest-shaped ownership regime cannot express. A bag owns a group of linked cells; cells are dynamically attached to and detached from the bag.

how the paper does it

1. Declare the adopter with an `adopts` clause. Figure 8 (p. 9, line 7) declares `data mutable bag a ... adopts cell a`; Section 7.2 (p. 10) requires that the adopter and adoptee types be exclusive.
2. Allocate a cell and give it to the bag with `give c to b`. This consumes `c @ cell a` while retaining `c @ dynamic`; at runtime it writes `b` into the cell's adopter field (Figure 8, line 15, p. 9; Section 7.2, p. 10).
3. To retrieve a cell, execute `take c from b`. This checks that the adopter field contains `b`, clears it, and makes the permission `c @ cell a` appear (Section 7.2, p. 10).
4. Use the restored cell permission to read or update the cell, then give it back if the data structure still owns it. The bag's `insert` and `retrieve` examples show the transfer in Figure 8 (pp. 9–10).

The dynamic type is intentionally weak: it is duplicable and records only that the value is a pointer and permits reading its adopter field. The paper states, “If this check fails, the execution of the program is aborted.” (Section 7.2, p. 10.) The paper also notes that `c @ dynamic` is duplicable and that it “guarantees that c is a pointer to a memory block and grants read access to the field c.adopter” (Section 7.2, p. 10).

what transfers to Verus

Inference: encode the adopter relation as an explicit ghost map from cell identifiers to adopter identifiers, and make `give` and `take` proof functions that update the map under a unique token. An executable `take` must check the relation or return an error; Verus can prove that a successful branch restores the cell invariant. A panic-free API should model failure as `Result`, because Verus cannot make a dynamic check impossible without a precondition proving the adopter relation. This is an inference.

evidence and limits

The paper's formal soundness proof includes adoption and abandon, but not nesting, locks, or concurrency. Adoption is therefore the only sharing mechanism among these three whose soundness is included in the stated Core Mezzo proof. Its runtime failure is an explicit trusted boundary for a caller that does not establish the adopter relation.

## technique: nesting and locks as alternatives

Nesting stores a permission inside an exclusive object without a runtime operation. A `focus` operation temporarily recovers the nested permission and a `defocus` operation puts it back; while focused, the outer object permission is unavailable. This is static and cannot fail, but the paper says the soundness proof has not been extended for it (Section 8.1, p. 11).

Locks put a permission `P` behind a duplicable `lock P` value. `new` creates the lock; `acquire` produces `P`; `release` consumes it. The lock invariant may be broken inside the critical section and must be restored before release (Section 8.2, p. 11). The paper notes, “The “invariant” P can in fact be broken within the critical section, provided it is restored when one reaches the end of the section.” (Section 8.2, p. 11.)

what transfers to Verus

Inference: Verus state machines or `atomic_with_ghost` can represent a lock invariant and ownership transfer, with an invariant opened only inside an atomic operation. A `Tracked` token can stand for `P`; the executable lock controls mutual exclusion, while proof code re-establishes the invariant. This is an inference, and the exact API depends on the concurrent representation.

## implementation, proof boundary, and product implications

The paper reports a prototype type checker and says “Several small libraries, totaling a few thousand lines of code, have been written” (Section 1, p. 2), including lists, mutable lists, doubly linked lists, binary search trees, hash tables, resizable arrays, FIFO queues, persistent arrays, suspensions, memoization, and graph search; the paper does not say which libraries are verified by the checker. It gives no denominator for how many library programs were checked, no runtime benchmark, and no comparative proof-effort measurement.

The formal result is a syntactic subject-reduction and progress argument for Core Mezzo. The paper states, “The proof is syntactic.” (Section 1, p. 2.) Inference: the trusted base includes the formalized Core Mezzo semantics and proof, the implementation's translation and checker, the runtime for dynamic adoption checks, and (for nesting and locks) axiomatized library interfaces, whose soundness extension the paper has not done for nesting and has only begun for locks (Sections 8.1 and 8.2, p. 11). The paper's conclusion says, “Mezzo is type-safe: well-typed programs cannot go wrong (but an abandon operation can fail).” (Section 10, p. 12.)

Inference: for VeruLaw, the transferable design is a verified ownership protocol library: encode state predicates and ownership tokens once, expose small Rust APIs with `requires`/`ensures`, and make state-changing operations consume and return tokens. The threat to an agent-written verified-Rust product is medium: Rust's ownership already prevents many aliasing errors, but unsafe interior mutability, dynamic sharing, and API protocols still need explicit invariants. Mezzo's dynamic abandon failure and its incomplete checker show that a proof can leave runtime checks, unsupported language features, or trusted library axioms outside the guarantee. Existing Verus work on linear ghost types and state-machine invariants covers parts of this design; VL should not redo a generic ownership-token encoding without measuring a concrete gap.

Inference: the strongest product risk is specification mismatch. Mezzo proves the permission discipline's stated safety theorem, not that a bag's API meets an unstated functional requirement, and it does not quantify engineering cost. A VeruLaw deployment should therefore record each contract's intended protocol, the trusted runtime or foreign-code boundary, and tests for dynamic failure paths.

## techniques for the catalog

- permission-as-state-and-ownership — combine data shape, alias facts, state, and owned extent in `x @ t` permissions and function pre/postconditions
- mode analysis — classify permissions as duplicable, exclusive, or affine to control sharing, mutation, and dropping
- permission subsumption — decompose fields, introduce singleton equalities, frame untouched permissions, and fold structural states
- tail-recursive ownership proof — use a recursive function contract as the loop invariant for destination-passing list construction
- adoption and abandon — dynamically attach exclusive objects to an adopter and recover them with a checked `take`
- nesting — store permissions statically inside an exclusive object and focus/defocus them without runtime checks
- lock invariant — mediate access to a permission through `new`, `acquire`, and `release` while restoring the invariant
- syntactic soundness proof — establish subject reduction and progress for Core Mezzo, with explicit boundaries for dynamic checks and axiomatized extensions

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Thus, a function can be shared without restriction and can be invoked as many times as desired, provided of course that one is able to satisfy its precondition."): read all 12 pages of the arXiv text and checked the quotations, section and figure references, page numbers (via per-page text extraction of the PDF), the technique steps, and the soundness, library and checker claims; changed the quotation for the typing judgment, the lock-invariant quotation (paper has quote marks around "invariant"), the capitalisation of the libraries quotation, the section numbers for adoption and abandon (7.2, not 7.1), the Figure 6 page (7, not 8), the explanation of why `list (ref int)` is affine, the UNFOLD description, the SUB reference, the data-race claim, and marked the trusted-base list as Inference; did not check the Verus, VeruLaw and product-risk Inference paragraphs against outside sources, the extended version [28], or the Mezzo implementation.
