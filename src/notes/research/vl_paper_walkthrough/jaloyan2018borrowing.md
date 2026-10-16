# Borrowing Safe Pointers from Rust in SPARK
(authored by agents unless marked 🧑)
Tag: `jaloyan2018borrowing`, [paper](http://arxiv.org/abs/1805.05576v1)

## scope and result

Jaloyan, Moy, and Paskevich adapt Rust-inspired permissions to pointers in SPARK, an Ada subset for safety-critical software. The abstract says: “Our solution uses a permission-based static alias analysis method inspired by Rust’s borrow-checker and affine types, and enforces the Concurrent Read, Exclusive Write policy.” (§abstract, p.1) The analysis is static and runs after type checking; it tracks read/write ownership of every path through records and pointer dereferences. The paper formalizes a miniature language µSPARK, proves the alias rules sound, implements them in GNAT, and compares the result with Rust.

Inference: the main VL lesson is to make alias safety a flow analysis that simplifies later SMT proofs, rather than encode every separation fact as a user annotation.

## technique: path permissions and CREW

What it is. Every well-typed path at every sequence point receives one of four permissions: `RW`, `R`, `W`, or `NO`, ordered as a diamond `RW > R|W > NO` (§2.2, pp.8–9). `R` allows reads and propagates to extensions; `W` allows writes but cannot cross a pointer dereference; `RW` grants full ownership and propagates through all extensions (§2, pp.3–4). A path is deep when a pointer can be reached from it; otherwise it is shallow (§2.2, p.7).

The safety property is CREW: if two distinct paths resolve to the same address and one has write permission, the other must have `NO`. The paper states: “The main result about the soundness of our approach is as follows: A terminating evaluation of a well-typed alias-safe µSPARK program respects the CREW condition at every sequence point.” (§2.3, p.13)

When to use it. Use the lattice for mutable records, pointer fields, procedure parameters, and allocation. It distinguishes harmless read sharing from potentially harmful write sharing without requiring pointer inequalities in specifications (§1, pp.1–2).

How to apply it (paper procedure).
1. Enumerate valid paths from variables through record fields and `.all` dereferences (§2, p.3).
2. Initialize formal parameters: `in` gets `R`, `in out` gets `RW`, `out` gets `W` followed by allocation-style restrictions; locals start uninitialized (§2.2, p.12).
3. Process each statement with permission transformers, producing a new policy; merge branches by the most restrictive permission and require loops not to lose permissions across an iteration (§2.2, pp.11–12).
4. At procedure exit require every `in out` and `out` parameter to have `RW` (§2.2, p.12).

Verus form. Inference: represent ownership with ghost tokens or predicates over a mathematical memory view, and state disjointness in `requires`. Use `requires`/`ensures` to transfer ownership across calls and lemma proofs to show that mutable paths do not overlap. Verus has no built-in permission lattice matching this paper, so a library encoding would be needed; Rust's compiler borrow checking remains separate from Verus proofs.

## technique: move, cut, block, drop, and lift transformers

What it is. Assignment is treated as ownership transfer. For a shallow value, the right side needs `R`; for a deep value, the right side must have sole `RW`, its reachable ownership is cut, and permissions are blocked on prefixes. The paper defines `move` as “if e has a deep path p, then … check RW # cut # block” and for an address expression as “check RW # fresh NO # drop” (Definition 6, p.10).

When to use it. Use these transformers whenever an assignment copies a pointer or stores an address. They prevent an old path from retaining write access to memory newly owned by the left side and prevent cycles such as assigning an ancestor into its descendant (§2.2, pp.10–11).

How to apply it (paper procedure).
1. `check π` verifies a path has permission at least π without changing the policy (Definition 1, p.9).
2. `cut` gives a deep path and near deep extensions `W`, keeps near shallow permissions, and gives far extensions `NO` (Definition 3, p.10).
3. `block` propagates loss of read permission to prefixes; `drop` propagates loss of both permissions up to the first pointer and read loss afterwards (Definitions 4–5, p.10).
4. For `p := e`, apply `move` to e, then `fresh RW` and `lift` to p (Fig. 3, p.9). `lift` propagates `RW` to prefixes once all child paths are owned (Definition 7, p.11).

Example. For `P := Q.all.Next`, `check RW` on Q's deep path succeeds, `cut` gives `Q.all.Next` write permission and `Q.all.Next.all` no permission, and `block` removes read permission from Q and Q.all while retaining safe writes (§2.2, pp.10–11).

Verus form. Inference: model a move as ghost-state update in a proof function, then expose the resulting owned view to the executable code. Use `assert` and lemmas to establish that aliases are no longer readable/writable. The transformer sequence itself is a paper-specific static analysis and cannot be written as a runtime Verus `proof fn`.

## technique: allocation, calls, branches, and loops

Allocation `p := new τ` checks `W`, gives fresh `W` to p, then cuts `p.all`; uninitialized pointer fields receive `NO` (§2.2, pp.9, 11). Calls use `observe` for `in` expressions (freezing writes on deep paths), `borrow` for `in out`/`out` arguments (setting paths and comparable prefixes/extensions to `NO`), and `fresh RW`/`lift` when ownership returns (§2.2, pp.11–12). The call rule therefore prevents passing the same path as both `in` and `in out`, because `observe` removes the `RW` required later by `borrow` (§2.2, p.12).

Branches merge the two resulting policies by pointwise minimum permission. A loop is accepted only if every permission after one iteration is at least as strong as at entry; this rejects the paper's P2 example after `A := B` weakens B and B.all (§2, pp.4–5; §2.2, p.11).

Verus form. Inference: encode call preconditions as ownership predicates and prove postconditions that restore the caller's token. For loops, use `invariant` clauses (the Verus statement form, not a function call) to preserve disjointness and initializedness; `old(...)` in postconditions can relate pre-state values where needed. Verus does not infer branch-policy joins, so write the invariant explicitly.

## soundness, implementation, and evidence

The paper proves policy consistency preservation (Lemma 1) and CREW soundness (Theorem 1) by induction over the big-step semantics (§2.3, p.13). The implementation is 3,700 Ada lines in GNAT and uses lazy permission trees to represent infinitely branching recursive types (§3, p.13). It was run on 17,041 GNAT regression tests, 2,087 SPARK regression tests, and 20 dedicated Rust-inspired tests; the SPARK suite detected 30 regressions, mostly unsupported object-oriented features (§3, p.14). These denominators are test counts, not formal coverage claims.

What remains trusted includes the Ada type checker, the alias-analysis implementation, the formal verification tools that prove non-nullness, and the model of terminating µSPARK execution. The paper explicitly excludes diverging executions from its semantics and leaves coinductive soundness for future work (§2.1, p.7; §5, p.17). Full SPARK arrays, functions, parameter passing, and loop forms require implementation extensions beyond the formal µSPARK rules (§3, p.14).

The authors identify concrete expressiveness limits: SPARK borrows last only for a procedure call, cannot traverse a linked structure using only read permission without reconstruction, and cannot implement cycling structures without workarounds (§4.1, pp.14–16). Rust has more precise lifetimes; SPARK's separate lifetime pass is less expressive (§4.1, p.15). Inference: a VL product that emits verified Rust still faces aliasing risk when it uses `unsafe`, reference counting, interior mutability, or FFI, because Verus contracts do not replace Rust's runtime and compiler ownership assumptions automatically.

## what VL should reuse and avoid redoing

Inference: reuse the paper's permission vocabulary, explicit transfer points, branch/loop policy joins, and CREW proof obligation as a front-end check for generated Rust. A Verus integration should emit ownership predicates and loop invariants only after a static path analysis identifies moves and borrows. VL should not redo a complete Rust borrow checker; Rust already checks safe code. The useful gap is connecting ownership events (including wrappers and FFI boundaries) to Verus `requires`, `ensures`, and lemmas, and measuring unsupported cases rather than assuming all Rust aliasing is covered.

## techniques for the catalog

- permission lattice — track `RW`, `R`, `W`, and `NO` for every pointer path to enforce exclusive writes
- CREW soundness — prove that aliased paths cannot include a writable path and another readable/writable path
- ownership-transformer assignment — use `move`, `cut`, `block`, `drop`, and `lift` to transfer deep pointer ownership
- borrow and observe calls — freeze read-only arguments and temporarily revoke caller ownership for mutable arguments
- policy joins — merge branches by minimum permission and require loops to preserve entry permissions
- lazy permission trees — represent infinitely many recursive paths on demand in an implementation
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
