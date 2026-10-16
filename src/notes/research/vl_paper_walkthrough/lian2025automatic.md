# Automatic Linear Resource Bound Analysis for Rust via Prophecy Potentials
(authored by agents unless marked 🧑)
Tag: `lian2025automatic`, [paper](https://doi.org/10.1145/3720492)

## problem and result
RaRust is a type-based automatic amortized resource analysis for Rust programs that already pass Rust borrow checking. Its resource model attaches linear potentials to values and infers function-level bounds. The paper states: “This article presents RaRust, a type-based linear resource-bound analysis for well-typed Rust programs.” (§1, PDF p.1). The analysis handles shared and mutable borrows, reborrows, nested borrows, user data types, loops, and recursion. It proves a soundness theorem against Resource-Aware Borrow Calculus (RABC), a Rust-MIR-like calculus with explicit `tick` costs.

The input assumption is material: “RaRust works directly on well-borrowed and well-typed Rust programs.” (§3, PDF p.6). Rust's compiler supplies borrow/lifetime correctness; RaRust reasons about resource consumption on top of that guarantee.

## technique 1: shared-potential splitting for shared borrows

What it is. A list type `list(α)` assigns α potential per list element. A shared borrow can be duplicated only by splitting potential, preserving the total. The paper's exact rule is: “we can replace a typing context x : list(α) with x1 : list(α1), x2 : list(α2) such that α = α1 + α2.” (§3.1, PDF p.7).

When to use it. Use this for several live shared reborrows or repeated calls that consume resources through an immutable reference. Rust's borrow checker allows multiple shared borrows but forbids mutation while they are live.

How to do it.
1. Give the incoming reference a resource annotation, for example `l: &list(4)` (§3.1, PDF p.7).
2. At each shared reborrow, split the annotation into the amount needed by the call and a remainder context; the paper says “one becomes the type of the shared (re)borrow, and the other is put back into the remainder context” (§3.1, PDF p.7).
3. Continue with the remainder for later statements. In `iter_twice`, the first call uses `&list(2)` and leaves `&list(2)`; the second uses `&list(2)` and leaves `&list(0)` (§3.1, Fig. 2a, PDF p.7).
4. Add the called function's required extra potential. The resulting signature is `iter_twice : fn(l : &list(4)) → ()|2` (§3.1, PDF p.7).

Verus form. Inference: Verus has no RaRust resource-type inference. Encode the resource as a ghost/spec measure, such as a recursive `spec fn list_potential`, and state an `ensures` bound relating an input measure, output measure, and a ghost cost counter. A proof function can establish that splitting two ghost shares preserves the sum. Rust shared-borrow exclusivity remains supplied by Rust/Verus typing; the potential arithmetic and function contract are additional proofs.

Evidence and limits. The paper gives the concrete `iter_twice` derivation above, but does not report a separate accuracy denominator for this example. Shared-potential annotations are safe only while the referent is not mutated; the paper explains that a mutable borrow cannot coexist with a shared borrow, so the shared lifetime must end before mutation (§3.1, PDF p.8). Precision can be lost when control-flow paths merge (technique 3).

## technique 2: prophecy potentials for mutable borrows

What it is. Mutable borrows can change the resource shape before they end, so RaRust stores both the current and expected final potential: `&mut(τc, τp)`. The paper says: “we now represent the type of mutable reference as &mut(τ1, τ2), where τ1 denotes the current potential function and τ2 denotes the prophecy potential function” (§3.2, PDF p.9).

When to use it. Use this whenever a mutable reference may mutate its referent and later return it to the owner, including creating/dropping mutable borrows and compositional calls.

How to do it.
1. On creating `x = &mut l`, choose a fresh prophecy annotation q and initialize `x` as `&mut(list(p), list(q))`, where p is the current annotation (§3.2, PDF p.9).
2. Analyze mutations and calls by changing only the current component. After `update`, the type is `&mut(list(p′), list(q))`; the prophecy remains unchanged (§3.2, PDF p.9).
3. At the explicit lifetime end (`drop(x)` generated from Rust lifetime constraints), emit the inequality `p′ ≥ q` (§3.2, PDF p.9).
4. If the owner is used after the drop, resume with `list(q)`. This connects the borrow's future resource promise to the owner's next type (§3.2, PDF p.9).

The running `update` example starts with `&mut list(2)`, mutates a singleton list to `&mut list(4)`, then performs two more `iter` calls; the derived bound is `update : fn(l : &mut list(2)) → ()|7` (§3.2, PDF p.8).

Verus form. Inference: represent current and promised potentials as ghost values in a borrow wrapper or tracked permission. A Verus executable function can carry a `requires` bound on the input measure and an `ensures` bound on the output measure plus cost; a proof function establishes that mutation preserves the prophecy inequality. Verus does not infer linear coefficients automatically, so coefficients and loop invariants must be supplied or generated externally. The Rust borrow checker still enforces that only one mutable borrow is live.

Evidence and limits. The soundness argument relies on the drop inequality and the borrow lifetime discipline; it does not claim that a prophecy annotation is automatically tight. The discussion explicitly motivates prophecy potentials because recording final values would be too heavy for AARA (§3.2, PDF p.9).

## technique 3: lattice merge for control-flow aliasing

What it is. When a mutable reborrow may come from either of two locations, the analysis merges resource types conservatively. It defines subtyping and a lattice; at a merge, current potential uses a minimum and prophecy potential uses a maximum. For Fig. 2d, the merged type is `&mut(list(min(p1,p2)), list(max(q1,q2)))` (§3.3, PDF p.10).

When to use it. Use it at control-flow joins where static analysis cannot know which branch's location is aliased. Rust's borrow checker removes simultaneous alias-and-mutation cases, leaving control-flow aliasing as the problem (§3.3, PDF p.10).

How to do it.
1. Type each branch's reborrow as `&mut(list(pi), list(qi))` (§3.3, PDF p.10).
2. At the join, choose `min(p1,p2)` for current potential so the merged type never claims more than either branch.
3. Choose `max(q1,q2)` for prophecy potential so either branch's final requirement is met.
4. Preserve branch obligations `p1 ≥ q1` and `p2 ≥ q2` (§3.3, PDF p.10).

Verus form. Inference: encode branch-specific ghost states and prove a join lemma that establishes the minimum/maximum bounds. A `match` or `if` proof must establish both branch postconditions before the common postcondition; no pointer-location set needs to be exposed in a public contract if the ghost state abstracts it.

Evidence and limits. The paper states: “RaRust’s current mechanism of handling aliasing compromises the precision of the resource analysis, mostly due to weak updates.” (§3.3, PDF p.10) It calls the loss unavoidable for Fig. 2d. Strong references are suggested as future work, so this technique is sound but potentially imprecise.

## technique 4: RABC semantics and soundness proof

RABC reuses a structured Rust borrow calculus with explicit `tick(δ)` statements. Its only operational resource use is `tick`; `drop` has zero cost (§4.2, PDF p.13). Rich types add `list(α)`, shared `&s(τ)`, and mutable `&m(τc,τp)` annotations (Figs. 7–8, PDF p.13). The type checker generates linear constraints; a linear-programming solver instantiates annotations (§5.5, PDF pp.17–18).

The central theorem is: “If V ⊢ s δV ⊣ V′ and Γ ⊢ s ↪δΓ ⊣ Γ′, then Φ(V′ : Γ′) − Φ(V : Γ) + δV ≤ δΓ.” (Theorem 6.5, PDF p.19). Potential is non-negative and monotone under subtyping (Lemma 6.1, PDF p.19). This proves inferred bounds cover dynamic resource consumption under the calculus; it does not prove Rust compiler correctness or that the chosen `tick` model matches wall-clock cost.

## implementation and measured evidence

The prototype pipeline is concrete: Charon extracts typed IR and explicit drops; RaRust topologically orders strongly connected components; it creates fresh linear variables and constraints; type-checking generates constraints; CoinCbc solves them (§7.1, PDF p.20). The evaluation used benchmark cases in five feature groups (Table 2, PDF pp.21–22), including shared/mutable borrows, loops, recursion, reborrows, nested borrows, user-defined and mutually recursive data types. The paper reports 0.15 s compilation and 0.3 s analysis on a 2.20 GHz Intel Core i9-13900HX with WSL 2.3.24.0/Ubuntu 22.04.3 (§7.2, PDF p.22). Bounds were manually checked; Flux encoded 17 listed cases for an independent check (§7.2, PDF p.22). These are demonstrations, not a statistical accuracy estimate, and tightness is not guaranteed (the paper names `min` and `max` as non-tight).

## trusted, missing, and VL implications

Proved: soundness of the resource type system with respect to RABC; non-negative potential; conservative borrow and alias handling. Measured: successful inference on 21 linear-complexity examples and the stated runtimes. Trusted: Rust borrow checking, Charon's translation, the linear solver, the correspondence between `tick` annotations and the desired resource metric, and the implementation outside the formal calculus. The calculus excludes loops for presentation although the implementation supports them (§4.1, PDF p.11).

Inference: VL could reuse prophecy-style ghost postconditions to make mutable resource accounting compositional, but Verus proofs would require explicit contracts and invariants rather than RaRust's automatic LP inference. Inference: this is a medium threat to agent-written verified Rust if VL promises performance/resource bounds without a cost model; it is low threat to functional memory-safety proofs because RaRust assumes Rust already passed borrow checking. Existing VL work should not redo basic borrow exclusivity or amortized list examples; the reusable gap is integrating solver-inferred resource bounds with Verus contracts and validating a cost model on production code.

## techniques for the catalog

- shared-potential splitting — split a shared borrow's annotation into call and remainder potentials whose sum is conserved
- prophecy potentials — track current and future potential for a mutable borrow and require current ≥ prophecy at drop
- lattice merge for aliasing — merge branch types with minimum current and maximum prophecy potentials
- RABC plus LP inference — model Rust-like execution with explicit ticks, generate linear constraints, and solve annotations automatically
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
