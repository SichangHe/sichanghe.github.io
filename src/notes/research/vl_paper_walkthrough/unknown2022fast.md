# Fast and Reliable Formal Verification of Smart Contracts with the Move Prover
(authored by agents unless marked 🧑)
Tag: `unknown2022fast`, [paper](https://doi.org/10.1007/978-3-030-99524-9_10)
## system and evidence

The Move Prover (MVP) verifies Move smart contracts with preconditions, postconditions, abort conditions, data-structure invariants, and global-memory invariants. Move was designed together with MVP, and its borrow semantics are similar to Rust. The Diem framework contains about 8,800 lines of Move and 6,500 lines of specifications, including comments; MVP verifies it in a few minutes and runs continuously with unit and integration tests (section 1, p. 2). The authors identify three implementation techniques: “an alias-free memory model based on Move’s semantics,” “fine-grained invariant checking,” and “monomorphization” (section 1, p. 2).

The prover pipeline merges code and specifications, transforms a Move bytecode representation, emits Boogie, and sends formulas to Z3 or CVC5 (section 3, p. 6). The paper’s performance evidence compares old LibraAccount and new DiemAccount versions: 1,975 lines, 72 functions, 10 invariants, 113 conditions, and 9.899 seconds versus 2,554 lines, 64 functions, 32 invariants, 171 conditions, and 7.340 seconds (section 4, p. 14). The newer version verifies all functions, including functions disabled in the old prover; the authors report roughly 20% faster verification despite three times as many invariants and 50% more function conditions. Similar improvements occurred in the remaining 40 Diem modules, and roughly half a dozen timeouts were resolved. These are comparisons between the named modules and versions, not a universal speed guarantee.

## technique: eliminate references using borrow semantics

Use this when an ownership discipline guarantees that aliases cannot observe conflicting mutations. Move permits exactly one mutable reference or any number of immutable references to a location, and stack-reference lifetimes cannot outlive the location. Global-memory borrows are constrained by `acquires` annotations. These guarantees “effectively permit the elimination of references from a Move program, eliminating need to reason about aliasing” (section 3.1, p. 6).

For immutable references, replace a reference with its value: the paper’s `select_f(s: &S): &T { &s.f }` becomes `select_f(s: S): T { s.f }` (section 3.1, p. 7). For mutable references, translate each borrow into a read-update-write cycle. Copy the location value, apply functional updates, then write the final value back when the last reference goes out of scope. The paper transforms `increment(x: &mut u64)` into `increment(x: u64): u64 { x + 1 }`, and transforms field updates into record updates (section 3.1, p. 7).

Dynamic origins require tracking both value and source location. MVP introduces internal `Mut<T>` values, operations such as `Mvp::mklocal`, `Mvp::mkglobal`, `Mvp::field`, `Mvp::get`, and `Mvp::set`, and predicates such as `Mvp::is_local` and `Mvp::is_field`. An interprocedural borrow graph records parent/child references and guides insertion of these operations when a borrow ends (sections 3.1, pp. 7–9).

Inference: Verus’s Rust ownership and borrowing already rule out many aliases, so a Verus proof can expose value-level specifications for safe references and use ghost state to record an origin when an API permits dynamic projection. Inference: this technique does not justify erasing raw-pointer aliases or unsafe code without proving the corresponding ownership invariant. The paper expects applicability to safe Rust but says additional work is needed for references aggregated in structs (section 4, p. 16).

## technique: inject global invariants at the smallest relevant updates

Use this when a persistent shared state must satisfy invariants across transactions and open modules. MVP checks an invariant after every instruction unless the developer explicitly suspends it. The paper says this “has performance advantages, because, unless suspended, invariants are only proven when an instruction is executed that could invalidate them” (section 3.2, p. 9). Fine-grained checks also make invariants available to discharge later abort conditions.

There are two invariant kinds. Inductive invariants must hold for global memory at all times; their proof has a genesis base case and an induction step over updates. Update invariants relate a pre-state to the current state and require a state snapshot before the update. Both may be suspended inside a module and checked at the caller, but public entry points cannot suspend them because invariants are assumed at entry and required at exit (section 3.2, pp. 9–10).

Injection is demand-driven. For each function, inject an invariant assumption when the function’s accessed memory overlaps the invariant’s accessed memory. Inject an assertion after a step if the step modifies overlapping memory or calls a function that suspends the invariant; for update invariants, save a snapshot before the update (section 3.2, p. 11). Generic invariants are selected by unifying the function’s and invariant’s parameterized memory types.

Inference: in Verus, represent persistent state with a state-machine or ghost map, put safety facts in the transition invariant, and assert only the transitions whose footprints can affect that fact. Verus’s state-machine proof style is the closest supported construct; do not write a fictitious `invariant(...)` call. Inference: when a transition temporarily violates a relationship while updating multiple fields, encapsulate the intermediate state inside one proof step or use a ghost snapshot and prove the before/after relation with a lemma.

## technique: monomorphize generic code for solver-friendly formulas

Use specialization when generic values and type-indexed memory cause SMT encodings to carry a universal tagged domain. MVP specializes generic functions, structures, and specifications for relevant type instantiations. The goal is that the specialized program verifies iff the generic program verifies in a first-class-type encoding, while the specialized representation gives the SMT solver a multi-sorted domain (section 3.3, p. 12).

The algorithm first skolemizes remaining type parameters with a fresh arbitrary type, then computes instantiations induced by overlaps between modified and accessed memories. It extends partial instantiations by unifying them with one another, and skolemizes parameters still unassigned. If a generic type indexes global memory, full type erasure is impossible: the algorithm adds concrete instantiations such as `f_u64` when a generic `f<T>` can collide with `f<u64>` in a `move_to` operation (sections 3.3, pp. 12–13). The authors give direct- and indirect-interaction arguments for why these instantiations cover relevant overlaps, while noting that a full formal proof is outstanding (section 3.3, p. 13).

Inference: Verus already specializes Rust generics during compilation, but a verification-aware specialization pass could reduce solver domains and expose type-specific invariants. The paper’s coverage argument is not a Verus theorem; it assumes type-indexed memory and Move’s access model. Any VL implementation should measure whether specialization preserves all public instantiations and should mark the coverage proof as an assumption until discharged.

## technique: use contracts and diagnostics as a developer workflow

Move specifications support bounded and unbounded quantifiers, but quantifiers can make verification undecidable and cause timeouts. MVP treats omitted specifications for nonrecursive functions as inlining at callers (section 2, p. 4). When a transfer example omitted an implicit abort condition, MVP reported the missing `aborts_if` clause, source location, call context, and an SMT-generated execution trace (section 2, p. 5). The developers repaired global-invariant violations by adding assertions for the required limits.

Inference: in Verus, use `requires` and `ensures` for stable interfaces, write explicit abort/error postconditions when Rust returns `Result`, and preserve counterexample-driven tests alongside proofs. Use `assert` and `proof fn` lemmas to expose solver facts; do not call proof functions at runtime. Omitted contracts may be convenient, but inlining can enlarge caller obligations and hide the intended module boundary.

## limits, trust, and threat to VL

MVP’s quantifiers, memory model, transformations, Boogie translation, SMT solver, Move compiler, and specification language remain trusted infrastructure. The paper reports that quantifier instantiation was a major timeout source and that simplification reduced intermediate terms; monomorphization removed type tags and changed an n-dimensional memory array into separate one-dimensional arrays (section 4, pp. 14–15). The authors explicitly state that MVP is for higher assurance, not bug hunting, and that writing high-quality specifications remains difficult (section 4, p. 16).

Inference: the threat to agent-written verified Rust is moderate at the alias and generic-encoding layer but high at specification completeness. Rust’s ownership can make alias elimination easier, yet agents still need to state global invariants, dynamic alias assumptions, and generic instantiation coverage. VL should reuse MVP’s footprint-based invariant injection, ownership-shaped value updates, and specialization-aware proof organization. VL should not redo the already demonstrated engineering result that continuous verification can run in integration tests; it should test whether Verus proofs remain stable under dependency, generic, and invariant changes. The Diem numbers show feasibility for this codebase and these models, not a denominator for all smart-contract software.

## techniques for the catalog

- borrow-based reference elimination — convert ownership-safe references into value updates so the solver avoids aliasing
- dynamic mutation tracking — represent runtime reference origins with tagged mutation values and a borrow graph
- fine-grained global invariant injection — assume and assert invariants only at memory footprints that can affect them
- suspended invariant checking — defer temporary invariant violations to a caller that can establish the invariant at the boundary
- inductive and update invariants — prove one-state properties by induction and two-state properties from a saved pre-state
- generic invariant unification — specialize invariant instances when parameterized accessed and modified memories unify
- verification monomorphization — generate relevant concrete generic instances to obtain multi-sorted solver formulas
- continuous contract diagnostics — run fully automatic proofs in unit/integration workflows and report traces for missing conditions
Checked 2026-10-13: audit record unknown2022fast; paper-study comparison complete; gate executed; experiments not rerun
