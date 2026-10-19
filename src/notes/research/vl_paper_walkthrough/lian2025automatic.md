# Automatic Linear Resource Bound Analysis for Rust via Prophecy Potentials
(authored by agents unless marked 🧑)
Tag: `lian2025automatic`, [paper](https://arxiv.org/abs/2502.19810)

## problem and result

RaRust is a type-based automatic amortized resource analysis (AARA) for Rust programs that already pass Rust borrow checking. Its resource model attaches linear potentials to values and infers function-level bounds. The abstract states: “This article presents RaRust, a type-based linear resource-bound analysis for well-typed Rust programs.” (PDF p.1). The implementation handles shared and mutable borrows, reborrows, nested borrows, user-defined data types, loops, and recursion (§7.1, PDF pp.20–21). The paper presents a soundness theorem against Resource-Aware Borrow Calculus (RABC), a variant of a calculus based on Rust MIR with explicit `tick` costs (§§4, 6).

The input assumption is material: “RaRust works directly on well-borrowed and well-typed Rust programs.” (§3, PDF p.6). Rust's compiler supplies borrow/lifetime correctness; RaRust reasons about resource consumption using those guarantees. The paper currently uses explicit `tick(q)` annotations as its cost model (§2.2, footnote 2, PDF p.5).

## technique 1: shared-potential splitting for shared borrows

What it is. A list type `list(α)` assigns α potential per list element. Sharing splits that potential, preserving the total. The authors state: “In RaRust, we reuse the sharing mechanism to handle shared borrows and prove it is sound with respect to the safe Rust semantics.” (§3.1, PDF p.7).

When to use it. The paper demonstrates repeated calls through shared reborrows in `iter_twice`. Multiple shared borrows can coexist, while Rust's borrow rules prevent mutation of the borrowed data during their lifetimes (§§2.1, 3.1).

How to do it.
1. Give the incoming reference a resource annotation, for example `l: &list(4)` (§3.1, PDF p.7).
2. At each shared reborrow, split the annotation into the amount needed by the call and the remainder. The paper says: “one becomes the type of the shared (re)borrow, and the other is put back into the remainder context, i.e., the typing context after the statement.” (§3.1, PDF p.7).
3. Continue with the remainder for later statements. In `iter_twice`, the first call uses `&list(2)` and leaves `&list(2)`; the second uses `&list(2)` and leaves `&list(0)` (§3.1, Fig. 2a, PDF p.7).
4. Account for the one unit of additional potential required by each `iter` call. The resulting signature is `iter_twice : fn(l : &list(4)) → ()|2` (§3.1, PDF p.7).

Verus form. Inference: a possible adaptation is to define a ghost potential measure and prove that two shares sum to the original potential. Function contracts would relate input potential, output potential, and an explicit cost counter. This is a proposed encoding, not an implementation evaluated by this paper.

Evidence and limits. The paper derives the `iter_twice` signature and explains why changing the referent while a shared potential remains live would invalidate the accounting (§3.1, PDF pp.7–8). Rust's borrow discipline rules out that mutation. Control-flow merging can lose precision (§3.3).

## technique 2: prophecy potentials for mutable borrows

What it is. A mutable borrow can change the borrowed data before its lifetime ends. RaRust therefore records the current potential type and a prophecy type specifying the expected potential function at lifetime end: `&mut(τc, τp)`. The paper emphasizes: “Note that the prophecy type should remain unchanged.” (§3.2, PDF p.9).

When to use it. The paper uses prophecy potentials for creating, updating, and dropping mutable borrows, allowing function signatures to avoid exposing the caller's borrowed locations (§3.2, PDF pp.8–9).

How to do it.
1. On creating `x = &mut l`, generate a fresh prophecy annotation q and initialize `x` as `&mut(list(p), list(q))`, where p is the current annotation. Write `list(q)` into the owner's typing context (§3.2, PDF p.9; §5.3, PDF p.17).
2. Analyze mutations and calls by changing the current component. In Fig. 2c, after `update`, the type is `&mut(list(p′), list(q))`; the prophecy remains unchanged (§3.2, PDF p.9).
3. At the explicit lifetime end, require `p′ ≥ q`. Explicit drops are generated from Rust lifetime constraints (§3.2, PDF pp.8–9).
4. If the owner is used after the drop, resume with `list(q)` (§3.2, PDF p.9).

The running `update` example first calls `iter`, consuming the input list's two units per element. It then replaces the list with a singleton carrying four units per element and calls `iter` twice more. The derived signature is `update : fn(l : &mut list(2)) → ()|7` (§3.2, PDF p.8).

Verus form. Inference: a possible adaptation is a contract with current and promised potential measures, an explicit cost counter, and a proof that the returned value meets the promised measure. The paper does not implement this Verus encoding.

Evidence and limits. The drop condition compares potential functions rather than predicting the exact final value. The authors explain: “However, prophecy variables usually record the final values, which are too heavy for AARA.” (§3.2, PDF p.9). The mutable borrow's potential is current potential minus prophecy potential (§6.1, Fig. 18, PDF pp.18–19); the drop condition ensures this difference is non-negative.

## technique 3: lattice merge for control-flow aliasing

What it is. When a mutable reborrow may come from either of two locations, RaRust merges resource types conservatively. In Fig. 2d, it merges the current annotations using a minimum and the prophecy annotations using a maximum, producing `&mut(list(min(p1,p2)), list(max(q1,q2)))` (§3.3, PDF p.9).

When to use it. At a control-flow join, different branches may borrow from different locations. The analysis must merge their resource types without crediting both locations for a mutation that affects only one (§3.3, PDF p.9).

How to do it.
1. Type each branch's reborrow as `&mut(list(pi), list(qi))` (§3.3, PDF p.9).
2. Use `min(p1,p2)` for current potential so the merged type claims no more than either branch provides.
3. Use `max(q1,q2)` for prophecy potential so either branch's final requirement is met.
4. Require `p1 ≥ q1` and `p2 ≥ q2`, since the analysis cannot determine which original location will be changed (§3.3, PDF p.9).

Verus form. Inference: a possible adaptation is to prove each branch's resource postcondition and a common postcondition using these minimum/maximum bounds. This is a proposed proof pattern, not a result demonstrated in Verus.

Evidence and limits. The paper states: “RaRust’s current mechanism of handling aliasing compromises the precision of the resource analysis, mostly due to weak updates.” (§3.3, PDF p.9). The authors call this loss unavoidable for Fig. 2d given insufficient runtime information during type checking, and suggest adapting strong references as future work.

## technique 4: RABC semantics and soundness proof

RABC is a resource-aware variant of Low-Level Borrow Calculus with structured control flow and a structured memory model (§4, PDF p.10). Its only operational resource use is `tick`; `drop` has zero cost (§4.2, Fig. 6, PDF pp.12–13). Rich types add `list(α)`, shared `&s(τ)`, and mutable `&m(τc,τp)` annotations (Figs. 7–8, PDF p.13). The paper states: “The type system then collects linear constraints among those symbolic variables and finally solves them via linear programming solvers.” (§5.5, PDF p.18).

Theorem 6.5 bounds execution cost plus the increase in stored potential by the type system's inferred resource consumption. In transcribed notation: if execution starts in V and ends in V′ with cost δV, and typing starts in Γ and ends in Γ′ with inferred consumption δΓ, then `Φ(V′ : Γ′) − Φ(V : Γ) + δV ≤ δΓ` (PDF p.19). Lemma 6.1 establishes non-negative potential and monotonicity under subtyping for well-formed rich types (PDF p.19). Appendix B supplies the detailed proof. Inference: this theorem concerns the stated calculus and cost model; it does not establish wall-clock bounds or correctness of the Rust compiler and translation.

## implementation and measured evidence

The prototype pipeline is Charon extraction of typed IR with explicit drops; strongly connected component analysis and topological ordering of the call graph; enrichment of signatures with fresh linear variables; type-checking to generate constraints; and solving with a heuristic objective (§7.1, PDF p.20). Within a recursive component, calls use predefined signatures. Calls to previously analyzed components clone signatures and constraints, allowing annotations to vary with arguments (§5.5, PDF p.18). The implementation uses CoinCbc for the demonstration (§7.1, PDF p.20).

Table 2 contains 26 benchmark cases in five feature groups (PDF p.21). Examples include `sum_rec` and `sum_loop`, each with bound `1 + 6|l|`; `rev2`, with `8 + 18|l|`; and `dup2`, with `2 + 33|l|`. Here `|l|` counts list elements; tree sizes count `Node` constructors, not depth (§7.2, PDF p.22). The authors state: “Due to the linear limitation, we select those examples with linear complexity.” (§7.2, PDF p.21).

The paper reports: “The compiling of the benchmarks was done in 0.15s and the analysis was done in 0.3s.” (§7.2, PDF p.21). The machine was a laptop with a 2.20 GHz Intel Core i9-13900HX and WSL 2.3.24.0/Ubuntu 22.04.3 LTS. The authors report manual checking and say: “We encode some cases with the derived bounds in Flux [Lehmann et al. 2023] to check that the derived bounds are correct.” (§7.2, PDF p.22). They list 17 Flux cases. They also state that some bounds, including `min` and `max`, are not tight. Inference: these selected examples demonstrate supported features, rather than establish an accuracy rate over arbitrary Rust programs.

## trusted, missing, and VL implications

The paper presents soundness for the RABC type system and reports successful inference on the selected benchmarks. RABC includes integer lists and recursive top-level functions; loops are excluded from the calculus for presentation, while the implementation supports `while true`, `break`, and `continue` (§4, footnote 3, PDF p.10; §7.1, PDF p.21). The paper's limitations include unsafe code, generic types, closures, trait objects, and non-linear bounds (§1, PDF p.3; §8, PDF pp.23–24). Proposed resource-annotated APIs for `Cell`, `Vec`, and `Rc` are future extensions, not implemented support (§8).

Inference: applying the result to Rust execution requires trusting Rust borrow checking, Charon's translation, the solver, and the implementation's correspondence to the formal calculus. Applying it to a particular resource also requires justifying that resource's `tick` model. VL could investigate translating inferred potential annotations into explicit Verus contracts for mutable resource accounting. This paper does not evaluate that integration or establish a threat level for VL.

## techniques for the catalog

- shared-potential splitting — split a shared borrow's annotation into borrowed and remainder potentials whose sum is conserved
- prophecy potentials — track current and future potential for a mutable borrow and require current ≥ prophecy at drop
- lattice merge for aliasing — merge branch types with minimum current and maximum prophecy potentials, retaining branch drop conditions
- RABC plus LP inference — model Rust-like execution with explicit ticks, generate linear constraints, and solve annotations automatically

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The type system creates symbolic variables to denote unknown annotations in rich types and signatures."): checked the entire paper text, study quotations, numbers, page and section references, technique steps, implementation, evaluation, and limitations; corrected quotations and page references, changed the benchmark count from 21 to 26, replaced the paper link with the paper's arXiv identifier, and marked proposed Verus/VL adaptations as inferences while removing unsupported claims; did not rerun the artifact or independently validate the proofs, implementation, or Verus adaptations.
