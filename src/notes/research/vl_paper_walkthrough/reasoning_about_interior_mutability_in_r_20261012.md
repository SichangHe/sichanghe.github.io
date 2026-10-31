# Reasoning about Interior Mutability in Rust using Library-Defined Capabilities
(authored by agents unless marked 🧑)
Tag: `poli2024reasoning`, [paper](https://arxiv.org/abs/2405.08372)

## scope and prior coverage

This study covers Poli, Denis, Müller, and Summers, “Reasoning about Interior Mutability in Rust using Library-Defined Capabilities,” arXiv:2405.08372v1 (14 May 2024). The PDF and its extracted text were read through the appendices and references (PDF pages 1–25). The research notes contain a shortlist entry for this paper, but no earlier full walkthrough was found under its title. The result below records the paper’s method in enough detail to reproduce its examples and marks Verus adaptations as inference.

The paper addresses a precise gap: Rust’s types describe ordinary ownership, but safe libraries implemented with `UnsafeCell` can mutate through shared references. A verifier that treats such state as arbitrarily mutable rejects valid clients; a verifier that assumes ordinary type framing is sound only by accident. The authors’ answer is Mendel, which gives library authors trusted annotations for properties that Rust’s type system cannot express, then derives framing and non-aliasing facts from those annotations.

## technique 1: implicit capabilities on library APIs

What it is. An implicit capability is a library-defined fact about a memory location, attached to a type or method with `#[capable(...)]`. Core capabilities (`readRef`, `writeRef`) correspond to shared and mutable Rust references. Fine-grained capabilities (`read`, `write`, `immutable`, `unique`, `local`) describe weaker read/write, stable value, exclusive ownership, and thread-local guarantees. Deny capabilities (`noReadRef`, `noWriteRef`) state that no corresponding Rust reference exists. A capability may be conditional on a runtime expression. The paper states: “We identify a novel notion of implicit capabilities, which are properties of library types that express guarantees provided by the library design rather than Rust’s types.” (Section 1, PDF p. 2)

When to use it. Use this for a safe client of an interiorly mutable API when ordinary borrow information omits a library guarantee: `Cell` is thread-local, `RefCell` guards aliases dynamically, `Arc` is stable when its strong count is one, and locks protect data while held. Keep the unsafe library implementation outside the client proof; the annotation is a trusted abstraction boundary.

How to apply it.

1. Identify each unstable location: the content of a cell, a borrow flag, a lock flag, or a reference counter.
2. Expose a stable specification place for each location, often through an existing address method (`as_ptr`) or a ghost method (`strong_ptr`, `data_ptr`).
3. Attach capabilities to the receiver type. For example, the Cell API uses `#[capable(&self => local(self.as_ptr()))]`, while mutable access uses `writeRef(self.as_ptr())`.
4. Add contracts for functional behavior (`get` returns the dereferenced cell location; `set` stores its argument).
5. During client verification, derive implications, structural facts, and incompatibilities from capabilities that remain alive at each statement.

The motivating client is `before = c.get(); c.set(before + 1); after = c.get(); assert!(before + 1 == after)`. The paper explains: “Because c is of type &Cell<i32>, Mendel can use the local capability to conclude that only the code of cell_client can modify the cell’s value while the function executes and, thus, that the value of after is exactly the one provided to set.” (Section 3.1, PDF p. 4)

Verus form (inference). Model each unstable location as a ghost `PPtr` or an abstract identity and carry a permission/invariant token in a spec type. A library contract can expose a `view` function and `ensures` clauses for `get` and `set`; a `local` fact can be represented by a thread-local invariant or a ghost token that excludes interference. Verus’s linear ghost values enforce token use, but conditional capabilities and address-indexed implications would need explicit predicates and proof lemmas. Existing client signatures can remain unchanged only if the library wrapper supplies these ghost facts; Mendel’s ability to add annotations without changing signatures is not automatic in Verus.

Evidence. Mendel automatically proves the Cell assertion with no client annotation (Section 3.1, p. 4). In the evaluation, `cell.rs` has 102 lines, 5 contract lines, and 30 expected assertions, with mean verification time 8.8 ± 0.2 seconds over 10 runs (Table 2, PDF p. 20). This is evidence for the client proof, not for the soundness of the unsafe Cell implementation: “the annotations on the library are trusted and provided by the tool developers.” (Section 3.1, PDF p. 4)

Limits. The technique cannot discover whether a library annotation is true. It is intentionally modular: “Verifying the libraries is orthogonal and requires different techniques to handle their unsafe code.” (Section 1, PDF p. 2) A wrong capability can make a client proof unsound. The paper gives no formal soundness proof of Mendel itself, only semantic intuitions and proof obligations (Section 6, p. 14).

## technique 2: implication, structural, incompatibility, and framing rules

What it is. Capabilities are manipulated by three rule families. Structural rules move a capability from a reference or product to a field or pointee (`writeRef(p) ⊢ writeRef(p.f)`, `writeRef(p) ⊢ writeRef(*p)`). Implication rules weaken a capability (`writeRef ⊢ readRef ⊢ immutable ⊢ read`). Incompatibilities derive non-aliasing: incompatible capabilities for the same address must originate from different roots. `read` and `write` are deliberately compatible, since a Cell can permit both.

How to apply it. At each program point, collect capabilities held by live values. Apply structural rules to reach the library’s modeled address, implication rules to obtain the required weaker fact, and incompatibility rules to prove addresses differ. For framing, carry capabilities across a statement: `immutable(p)` frames `p` across any statement; `unique(p)` frames `p` when `p` is absent from that statement; `local(p)` plus `noWriteRef(p)` frames an assignment or a pure call. The paper summarizes the key invariant: “We say a capability is held across a statement if it is available both before and after a statement.” (Section 4.2, PDF p. 8)

Example. In the `RefCell` client, a live `Ref` gives `readRef(a)` and then `readRef(a.as_ptr())`, which implies immutability across `use_refcell(x)`. A live `RefMut` gives `writeRef(y)` and hence `unique(y.as_ptr())`; incompatibility with the read capability proves `x.as_ptr() != y.deref()` (Sections 3.2 and 5.0.2, PDF pp. 5, 11–12).

Verus form (inference). Encode each implication as a `lemma` over an abstract permission predicate, and each incompatibility as a disjointness lemma over root identities. Keep permissions in linear ghost variables so weakening consumes or transfers a token. Frame conditions become `ensures` that a memory view is unchanged. Verus borrow checking can supply roots for ordinary references, but library-defined addresses and conditional capabilities require explicit ghost identities.

Evidence and limits. `refcell.rs` has 25 expected assertions, zero incompleteness assertions, six contract lines, and 13.5 ± 0.8 seconds average (Table 2, p. 20). The proof intentionally omits borrow-flag details in the simplified example; a complete panic-freedom proof must establish that `borrow` is not called while mutably borrowed (Section 5.0.2, p. 11). Thus the capability derivation proves the shown value and aliasing assertions, not every possible panic property.

## technique 3: conditional capabilities for runtime states

What it is. `capable(type if e ⇒ c)` grants `c` only while expression `e` holds. This captures APIs whose guarantee depends on a counter or lock state. Arc is annotated with `local(Arc::strong_ptr(self))` when `Arc::strong_count(self) == 1`.

How to apply it. Test the state, enter a branch, and let the verifier add the conditional capability to that branch’s context. In the then branch of Figure 4, count one means no other thread can change the count, `x` and `y` cannot alias, and `Arc::into_inner(x)` succeeds. In the else branch, the earlier test does not remain stable: another thread can drop a clone before a later assertion. The paper says: “However, if our test determined that the count was not 1, none of these assertions hold: the reference count could have been decremented by another thread to 1 after the test, and x could alias y.” (Section 3.3, PDF p. 6)

Verus form (inference). Represent the branch fact as a ghost invariant token guarded by `strong_count == 1`; prove an `ensures` clause for operations that consume or preserve the token. A concurrent model needs an atomic counter invariant and a rule that a token prevents interfering drops. A plain `if` plus an integer equality is insufficient because Verus must know what other threads may change between program points.

Evidence. `arc.rs` contains 27 expected assertions and no incompleteness assertions, with 10.0 ± 0.7 seconds over 10 runs (Table 2, p. 20). The evaluation assumes the weak reference count is always zero for Arc, explicitly limiting the model (Section 8.1.1, p. 20). The method therefore demonstrates conditional reasoning under a simplified library state, not full Arc semantics.

## technique 4: purity classes and postconditions

What it is. Mendel distinguishes three purity levels by the footprint a function may observe: `#[pure]` depends on reachable values but not interior-mutable contents; `#[pure_memory]` may also depend on reachable addresses; `#[pure_unstable]` may depend on any memory, including `UnsafeCell`. All pure functions are deterministic, side-effect free, and terminating. A pure-unstable function cannot frame anything by purity alone, so a postcondition must identify its result.

How to apply it. Mark `Vec::len` pure, `Cell::as_ptr` pure-memory, and `Cell::get` pure-unstable. Add `ensures(result ==== deref(self.as_ptr()))` to `get` and `ensures(deref(self.as_ptr()) ==== value)` to `set`; `====` compares values and addresses. Syntactically check purity: copy-type parameters, calls only to permitted purity levels, assignments only to locals, and termination. The paper states: “Methods declared #[pure_unstable] (such as Cell::get) may depend on any memory value, including the content of types with interior mutability.” (Section 4.3, PDF p. 9)

Verus form (inference). Use `spec fn` views for pure-value functions, ghost pointer identities for pure-memory functions, and explicit `ensures` for unstable reads. Verus’s executable/spec separation can enforce that specifications do not mutate, but the three footprint classes and syntactic purity checker would need library conventions or custom macros. Address-sensitive equality requires an abstract pointer identity rather than ordinary value equality.

Evidence. Cell’s contracts are eight lines across four capability specifications in Table 1 (PDF p. 19); `cell.rs` proves all 30 expected assertions in 8.8 ± 0.2 seconds (Table 2, p. 20). The guarantee depends on the capability, not the purity marker alone: the paper’s Cell case correctly refuses to prove equality across an unknown mutating call, while it proves pointer/address stability (Section 5.0.1, p. 10–11).

## technique 5: validating library capabilities by conversion-method rewriting

What it is. Rather than prove unsafe raw-pointer behavior directly, the authors validate a `readRef` capability by rewriting a client to keep a shared reference alive. In Figure 11, `a.deref()` is assigned to `tmp`, `unknown(x)` runs while `tmp: &i32` is alive, and `drop(tmp)` restores the original lifetime. If `deref` is a pure, total conversion method with no synchronization, the rewrite is observationally equivalent. Rust’s rule that mutating a shared reference’s target while it is alive is UB then implies the target did not change.

How to apply it. Identify public safe methods that convert between types and satisfy four conditions: no side effects, termination, no panic, and no synchronization primitive. Confirm the source and documentation manually. Check that the converted reference remains live across the unknown call. Treat the resulting capability as justified only under the library’s soundness and conversion-method assumptions. The authors write: “Concretely performing in a tool the rewriting is not necessary in order to derive, e.g., the immutability properties of a readRef capability across unknown(x) in the example. Instead, it is sufficient to identify that the rewriting is possible.” (Section 6.4, PDF p. 16)

Verus form (inference). State the conversion method’s `ensures` as a borrowed view whose lifetime spans the call, and prove a lemma that an alive shared borrow implies the view is unchanged. Unsafe library proofs remain outside the client. Verus can express the borrow lifetime, but identifying conversion methods and proving their no-synchronization property still requires library review or a separate soundness proof.

Limits. Identifying conversion methods is manual and depends on source and documentation. The paper lists `get_mut`, `Deref::deref`, and `DerefMut::deref_mut` as examples (Section 6.4, p. 16). The argument assumes `unknown` is sound and that the rewrite is observationally equivalent; it is not a mechanized proof of every unsafe implementation.

## technique 6: first-order encoding with versions, roots, and axioms

What it is. Mendel translates Rust and capabilities to a first-order fragment of Viper. Each control-flow point has a memory version; statements constrain successive versions. Memory is represented by typed total functions `M_T(address, version)`. Thread interference is modeled as no-op transitions that preserve only locations protected by capabilities. Type snapshots record values and addresses reachable without following raw pointers or entering `UnsafeCell`; value snapshots abstract addresses for pure-value functions.

How to apply it. (1) Build memory and value snapshots for each type. (2) Assign root places from borrow-checker information; distinct roots denote disjoint safe-memory regions. (3) Encode each capability as a Boolean function of root, address, and memory version. (4) Add implication and structural axioms. (5) Add non-aliasing axioms requiring distinct roots for incompatible capabilities. (6) Add capability-annotation axioms, guarded by runtime conditions. (7) For an immutable capability across versions, assert `M_T(a,w1) = M_T(a,w2)`. The paper specifies: “In our encoding, we model memory disjointness by introducing for all capabilities a new parameter that we call root place.” (Section 7.3, PDF p. 18)

Verus form (inference). Verus already generates first-order verification conditions and tracks borrow roots, so a practical translation would encode capability predicates and memory views as ghost maps plus axioms/lemmas. Versioned snapshots correspond to pre/post views in `requires` and `ensures`; concurrency still needs explicit invariants. Care is needed: unrestricted axioms can make proofs unsound, so Verus library contracts should be tied to proved or trusted invariants.

Evidence. The implementation reuses Prusti parsing and borrow-checker components but omits closures, traits, loops, quantifiers, and iterators, which require engineering (Section 8, p. 19). Table 1 reports annotation size for 20 library/type rows: for example, RefCell uses 127 LOC, 6 functions in the Imp. column, 1 in the Pure column, 10 ghost functions, 8 capability specifications, and 52 contract lines; Arc uses 51 LOC, 2 Imp., 3 Pure, 1 ghost, 6 capabilities, and 18 contract lines (Table 1, p. 19). Verification times range from 4.8 to 34.6 seconds across 12 clients, each averaged over 10 runs (Table 2, p. 20). These denominators matter: there are 12 client rows and 10 timing runs per row, not a claim about all Rust programs.

## what is proved, what remains trusted, and contradictions

Proved or measured by the paper: Mendel discharges the expected client assertions for Cell, Rc, Mutex, RefCell, UnsafeCell, Box, and Verus-style examples; Arc<RwLock<Vec<i32>>> has 29 expected and 2 incomplete assertions; AtomicI32 has 9 expected and 2 incomplete assertions (Table 2, p. 20). The evaluation measures annotation effort and wall-clock verification, not a formal theorem that the annotations match all standard-library executions.

Trusted or assumed: library capability annotations, method contracts, ghost methods, the Viper/Boogie backend, Rust compiler borrow information, and the soundness of unsafe libraries. Mendel itself has no completed formal soundness proof: “Although a formal proof of soundness does not accompany Mendel, we present the intuitions justifying its underlying reasoning (and soundness) in this section.” (Section 6, PDF p. 14) The Arc model assumes weak count zero; the imported Mutex-with-invariant model assumes no poisoning; Verus-style pointer clients must respect declared preconditions (Section 8.1.1, p. 20).

The paper reports no arithmetic contradiction in its tables. A substantive limitation is explicit: two evaluation cases are incomplete for Arc (non-one count, and one count with weak count zero while immutably shared) and AtomicI32 when borrowed by local references (Section 8.2, PDF p. 22). The headline claim of “zero client-side annotations in many” is consistent with Table 2, where arc.rs, atomic.rs, mutex.rs, rc.rs, box.rs, mutex_inv.rs, and verus_cell.rs have zero contract lines, while other clients need contracts.

## techniques for the catalog

- library-defined implicit capabilities: annotate interiorly mutable APIs with conditional or unconditional facts such as local, immutable, unique, and deny-reference properties, then derive client framing and aliasing
- capability implication and framing: propagate capabilities through fields and pointees, weaken them, use incompatibility for non-aliasing, and carry immutable or unique facts across statements
- conditional capabilities: guard a capability with a runtime predicate such as `Arc::strong_count(self) == 1` so proofs follow the state actually established by a branch
- purity footprints: classify methods as pure, pure-memory, or pure-unstable and add postconditions for unstable reads to control framing
- conversion-method validation: justify shared-reference immutability by an observationally equivalent rewrite that keeps a converted reference alive across an unknown call
- first-order capability encoding: model versioned memory, root places, snapshots, and capability axioms in Viper/Boogie for automated verification

Audited 2026-10-12 against the paper: checked Table 1 and Table 2 figures, section and page references, the Section 6.4 conversion-method steps, the incompleteness cases and the assumptions in Section 8.1.1. Changed: Table 1 row count 15 to 20; RefCell and Arc function columns corrected (Imp., Pure, Ghost were misread); unsafecell.rs removed from the zero-contract clients (it has 7 contract lines). Not checked: PDF page numbers of the quotations beyond the section numbers.
