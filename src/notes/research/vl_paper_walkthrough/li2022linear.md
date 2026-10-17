# Linear Types for Large-Scale Systems Verification
(authored by agents unless marked 🧑)
Tag: `li2022linear`, [paper](https://doi.org/10.1145/3527313)

## result

Li et al. combine a linear type system with Dafny's SMT verification. Linear types enforce non-duplication and non-discard of owned values, removing common-case alias reasoning from SMT formulas; SMT remains available for aliasing and logical properties that need it. The paper formalizes the core of the type system, proves the formal language sound (type preservation, weakest-precondition preservation, progress, region agreement preservation), and proves a type-checking algorithm sound and complete (Sections 2.6–2.7, pp. 16–18). The evaluation converts the verified VeriBetrKV storage system incrementally: 91% of its implementation layer uses linear reasoning and 9% remains nonlinear. The authors report 28% fewer proof lines and 30% shorter verification time for that implementation-layer comparison (Abstract, Sections 2–3, pp. 1–3, 18–21).

The paper states: “By separating memory reasoning from verification conditions, linear types reduce the SMT solving time.” (Abstract, p. 1). It also states: “The resulting system uses linear types for 91% of the code and SMT-based heap reasoning for the remaining 9%.” (Abstract, p. 1). Section 2.1 states: “Linear Dafny extends the standard Dafny language with a linear type system.” (Section 2.1, p. 3). Inference: these results concern Dafny and VeriBetrKV's implementation layer, not Rust or all verified systems.

## technique: linear values with shared and ordinary usages

What it is. Linear Dafny adds `linear` and `shared` usages to Dafny's ordinary and ghost variables. A linear value cannot be duplicated or discarded; a shared value can be duplicated only during a temporary borrow and cannot escape that borrow. Ordinary values may alias freely. Linear data can be updated in place while still receiving value-style mathematical reasoning. The right side of Figure 1 (p. 4) illustrates `linear` sequences and a temporary shared call, where `M4` takes two `shared` sequences (line breaks as in the figure):

```dafny
method M5(linear l1:seq<int>,
          linear l2:seq<int>)
  returns(linear l3:seq<int>,
          linear l4:seq<int>,
          x:int)
  requires |l1| >= 10 && |l2| >= 10
{
  // temporarily borrow l1 as shared:
  x := M4(l1, l1);
  // l1 is linear again here:
  l3 := seq_set(l1, 5, 100); // in place
  l4 := seq_set(l2, 5, 200); // in place
  assert l3[5] == 100;
}
```

How to apply it. Mark data that has one owner as linear. Pass or return it linearly, consuming the input and producing the output. Use a shared parameter only for read-only temporary access; ensure no shared reference is returned beyond the borrow. Use `inout` when a method updates a linear value in place. For a recursive list, define a linear tail and traverse through a shared iterator; the paper's `GetLength` invariant is `n + Length(iter) == Length(list)` (Section 2.1, pp. 3–6).

Verus form. Inference: Rust ownership, `Box<T>`, `&T`, and `&mut T` provide the executable linear/shared discipline. Verus then states functional facts with `requires`, `ensures`, `invariant`, and recursive `spec fn` views. Shared borrows must not escape Rust's lifetime; Verus does not use Dafny's `linear` keyword. A proof-only fact belongs in a `proof fn` or `assert`, not in executable code.

## technique: regions for nonlinear data inside linear interfaces

What it is. A region is a first-class pair of a region name and region data, a private small heap. Linear operations consume and return the region, while shared reads borrow it. References are valid when allocated in that region; a per-region `modifies` predicate records which fields may change. This hides private heap updates behind a linear interface instead of propagating a global Dafny `modifies` clause through every caller (Section 2.4, pp. 11–14).

The paper's cyclic example allocates two objects, stores each reference in the other, updates one field with `write`, then reads both integer fields to obtain 300. The region is passed to each `alloc`, `read`, and `write` with `@`; allocation and writes consume the old region and produce an updated one, while `free_region` consumes it completely. `fresh_ref` proves distinct allocation locations and `valid_ref` proves that a reference belongs to the region (Section 2.4, pp. 12–14).

How to apply it. Allocate a private region; allocate objects into it; pass the region explicitly to reads and writes; constrain writes with a per-region modification predicate; expose an abstract type and `wf` predicate that hides the region and internal references; require and ensure `wf` at the public method boundary. The paper's `method m(linear inout a:t)` has `requires wf(a)` and `ensures wf(a)` without a global heap modification clause.

Verus form. Inference: model a private region as an owned state object (often a `Vec` or map) wrapped in a Rust struct. Keep references as indices or handles validated by a `wf` `spec fn`; pass `&mut self` for writes and `&self` for reads. Encode freshness, validity, and permitted updates in `requires`/`ensures` and loop invariants. This is a Verus adaptation; Verus does not have Dafny's region primitive or `modifies` clause.

## technique: linear data inside nonlinear data

What it is. Regions also allow nonlinear containers to hold linear values. Reading a linear field from a shared region demotes that field to shared, while swapping a linear field requires the region to be linear. The type rules ensure a region cannot be viewed as linear and shared simultaneously. `Take` and `Give` operations store `Maybe<T>` in the field, and whether it is `Some` or `None` is a ghost property: SMT proves that a `Some` value is present before extracting it, avoiding runtime `RefCell` checks and panics (Section 2.5, pp. 14–15).

How to apply it. Read a linear field only while the containing region is shared. Mutate or swap it only after obtaining the linear region. Represent temporarily absent fields as `Maybe<T>`; prove `Some` before extraction, then restore the field with `Give`. Keep shared references from escaping their scope.

Verus form. Inference: represent the container as an owned struct whose invariant distinguishes present and temporarily extracted values. Use a ghost boolean or option view and prove presence before moving the value out. Mutable access uses `&mut`; immutable reads use `&`; the Rust borrow checker prevents simultaneous mutable and shared views. This can avoid runtime checks, but the exact representation and invariant are design choices beyond the paper.

## technique: automatic borrow and consumption inference

What it is. The type checker lazily infers environment splits and borrowing. It checks the first subexpression with all available linear variables, records which variables it consumes and borrows, and assigns the remainder to later subexpressions. It carries an expected mode, `borrow` or `consume`, into each expression. For sequential composition, consumed sets must be disjoint, and `e1` may borrow variables that `e2` later consumes (Section 2.6, pp. 15–16).

How to apply it. Track, for every expression, the sets `borrows(B)` and `consumes(C)`. For `e1; e2`, check both under the same environment, `e1` with mode `borrow` and `e2` with the incoming mode; require `u1 ≠ linear`, `C1 ∩ C2 = ∅` and `C1 ∩ B2 = ∅`, then compute borrows as `(B1 \ C2) ∪ B2` and consumes as `C1 ∪ C2`. Choose `consume` for `e1` in `free_region(e1)` and `borrow` for `e0` in a field selection `e0.i`. The programmer's usage annotation in a `let` supplies the otherwise ambiguous expected mode.

Verus form. Inference: Rust performs this ownership and lifetime inference before Verus proof checking. The proof layer should state the resulting data relation, rather than reimplementing borrow checking with ghost formulas. Verus code must use actual Rust borrow syntax and supported specification constructs.

## technique: incremental migration and model removal

What it is. The conversion process has two stages: linearize unaliased data types and remove heap proof code; then remove high-fidelity functional models whose logical work is now handled directly by SMT over linear values. The authors converted module by module while the complete system continued to type-check and verify (Section 3.3, pp. 19–20).

How to apply it. Start with unaliased structures; replace dynamic-frame invariants with linear annotations; keep nonlinear structures and regions where aliasing is necessary; merge a functional model only where the merge is noninvasive to the proof structure, moving its correctness proofs into the implementation. Maintain a passing build after each module. Keep the high-level refinement hierarchy unchanged when it manipulates only functional values.

Evidence. VeriBetrKV contains 44K lines of code and proof in total, about 24K at implementation level, and generates 31K lines of C++ (Section 3.1, p. 18). In the implementation-layer comparison, the hybrid system is 91% linearized and 9% nonlinear; proof text falls 28% overall, with an 18% reduction in linearized code whose models stayed and a 56% reduction in the subset where high-fidelity models were also merged; models were merged for only 27% of the implementation (Sections 3.3–3.4, pp. 19–21). Verification time falls 30% overall; among 69 methods taking over five seconds in the dynamic-frame version, half take about half their former time and 90% are at least as fast (Section 3.5, pp. 21–22). The denominator for the latter percentages is those 69 slow methods, not all 353 measured methods; the other 284 verify within 5 seconds in the dynamic-frame version and show no significant difference.

## evidence, limits, and trust

The paper proves soundness of the formal model and soundness and completeness of its type-checking algorithm (proofs in supplemental materials; the paper does not say they are machine-checked), but the storage evaluation is a single Dafny system. The 28% headline is a proxy based on proof-line count; the conclusion calls the same overall reduction 27%, so the paper itself is inconsistent by one percentage point. The authors state that the converted artifact inherits a dynamic-frame proof structure and therefore underestimates a from-scratch benefit. The 30% timing result includes type-checking and SMT-solving time and compares nearly identical implementations. Eight methods become slower; three increase by 10–30 seconds because proofs were inlined (Section 3.5, pp. 21–22).

The language cannot return mutable references from methods or store shared references in datatypes. Because mutable references cannot be returned, the cache conversion adds pass-through methods; because shared references cannot be stored, successor-query iterators copy node data. The paper says adding lifetime variables and reasoning could remove the pass-through methods, reduce the cache module by 55% (242 lines of code), and avoid that copying (Section 3.7, pp. 24–25). Reference-based heap objects remain ordinary; regions are a verification abstraction and have no runtime effect in the described library (Sections 2.1 and 2.4). Inference (the paper does not discuss its trusted base): the trusted base includes Dafny/Boogie translation, Z3, the implementation compiler/runtime, and the specifications themselves.

## techniques for the catalog

- linear ownership plus SMT — use non-duplication to remove common alias obligations while retaining SMT for exceptional sharing
- region encapsulation — hide private nonlinear heaps behind a linear region interface and local validity/modification facts
- mixed linear/nonlinear storage — read linear fields through shared regions and mutate them through linear regions without runtime checks
- inferred borrowing — infer borrow and consume sets lazily from expression use instead of requiring explicit borrow annotations
- incremental conversion — migrate verified systems module by module while preserving a continuously verified build
