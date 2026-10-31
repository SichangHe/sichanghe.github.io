# RefinedRust: A Type System for High-Assurance Verification of Rust Programs
(authored by agents unless marked 🧑)
Tag: `gaher2024refinedrust`, [paper](https://doi.org/10.1145/3656422)

## scope and result

RefinedRust is a foundational, semi-automated type system for functional-correctness verification of safe and unsafe Rust. Its central engineering move is to attach mathematical refinements and ownership information to Rust types, model the resulting judgments as Iris separation-logic predicates, and emit Coq proofs checked by Coq. The paper states the motivation directly: “We propose ReﬁnedRust, a reﬁnement type system—proven sound in the Coq proof assistant—with the goal of establishing foundational semi-automated functional correctness veriﬁcation of both safe and unsafe Rust code.” (abstract, p. 1). The prototype translates compiler MIR plus user annotations into Radium, checks the refined type system using Lithium proof search in Coq, and verifies a simplified Rustonomicon `Vec` implementation.

The evaluated code covers the `Vec` operations `new`, `push`, `pop`, `get_unchecked`, `get`, `get_mut_unchecked`, `get_mut`, and `len`, plus internal accessor functions, `RawVec` with its `new` and `grow` functions, and shims for pointer manipulation and allocation (section 6, p. 19). The `Vec` and `RawVec` APIs are 120 lines of Rust (functions of 3 to 20 lines) plus 76 lines of annotations; the generated Radium code is roughly 1,200 lines of Coq, and the MIR input to the frontend is 900 lines (section 6, p. 19). Verifying the whole `Vec` API takes about 6 minutes wall time and 22 minutes CPU time on an Apple M1 Max (section 6, p. 19). The authors report about 80 lines of manually proved Coq theory for the representation invariant; for `Vec::pop` the type system makes roughly 3,000 automatic ownership steps and generates 100 pure Coq side conditions, all but five solved automatically, the rest needing about 20 lines of manual Coq (section 6, p. 20).

## technique: refinement specifications at Rust boundaries

What it is. Every RefinedRust type is refined by a mathematical value. Attributes `params`, `args`, `requires`, `returns`, and `ensures` connect Rust values to mathematical variables and state preconditions, results, and side effects. For `box_add_42`, Figure 1 gives `#[rr::params("x" : "Z")]`, `#[rr::args("#x")]`, `#[rr::requires("x + 42 ∈ i32")]`, and `#[rr::returns("#(x + 42)")]` (Figure 1 and section 2.1, p. 5). The precondition excludes `i32` overflow, which would panic; the paper says the precondition is needed because RefinedRust also verifies that no panics occur (section 2.1, p. 5).

How to apply it.

1. Introduce mathematical variables with `params`; `x` has the unbounded integer type `Z` (section 2.1, p. 5).
2. Link each argument to a variable with `args`. The `#` marks a known (not borrowed) mathematical value in the `bor` wrapper explained in section 2.3 (section 2.1, p. 5; section 2.3, p. 7).
3. State call conditions in `requires`; the example requires `x + 42 ∈ i32` (section 2.1, p. 5).
4. State the returned mathematical value with `returns`; the example returns `x + 42` (section 2.1, p. 5).
5. Let the type checker prove the body, including absence of panics (section 2.1, p. 5).

Verus form. Inference: the same boundary in Verus would normally use a `requires` clause over mathematical `int`, an `ensures` clause for the returned value, and an explicit range precondition. Verus function specifications are written in Rust syntax rather than `rr::` attributes, and Verus has no counterpart of RefinedRust's Coq/Iris type assignments or `#`/`bor` notation. Inference: a direct shape is `fn box_add_42(mut r: Box<i32>) -> (out: Box<i32>) requires ... ensures ...`, with the Box model supplied by the Verus library.

Evidence and limits. The paper's concrete evidence is the `Vec` case study and the line counts and timings above (section 6, pp. 19–20). Inference: the refinement system relies on the stated preconditions; it does not make an overflowing operation safe. The authors call the prototype's automation “fairly basic compared to that of previous non-foundational Rust veriﬁcation tools” (introduction, p. 2).

## technique: borrow names for mutable-reference effects

What it is. A mutable reference is refined by a pair `(x, γ)`: `x` is its current mathematical value and `γ` is a borrow name, inspired by RustHorn's prophecy variables, used to communicate the final value back to the lender. The paper explains: “The mathematical value of a mutable reference &mut T is a pair (x,𝛾 ) , where x is the current mathematical value of type T and the borrow name 𝛾 is used to communicate the ﬁnal value of the reference.” (section 2.2, p. 6).

How to apply it.

1. On creation of `&mut z`, give the reference the value `(1, γ)` for a fresh `γ` when `z` equals 1, and change the value of `z` to the placeholder `∗γ` (section 2.2, p. 6).
2. Specify the mutating function with `args("(#x, γ)")` and a postcondition that is the separation-logic resolution `Res γ (x + 42)`, marked `#iris` (Figure 2, p. 5; section 2.2, p. 6).
3. Verify the body; `*r += 42` updates the reference's current value (Figure 2, p. 5).
4. After the call, use `Res γ (x + 42)` to resolve the value of `z` from `∗γ` to 43, which proves the caller's `assert!(z == 43)` (section 2.2, p. 6).

Verus form. Inference: Verus can express the caller-to-callee relation with a mutable reference and an `ensures` clause, but its specification language does not expose RefinedRust's `gname`, `Res`, or Iris resolution objects. Inference: a Verus implementation keeps the post-state in the referenced value and proves the caller assertion after the call. The borrow-name mechanism itself has no direct Verus construct.

Evidence and limits. The paper's example proves the post-call assertion through the resolution mechanism (section 2.2, p. 6). The introduction explains why mutable references are hard: once a borrow expires, “the original owner will want to use that data again at its original type”, so Rust's mutable references “do not allow strong updates” (introduction, p. 3).

## technique: reborrow specifications with placeholders

What it is. `Vec::get_mut` returns a mutable reference into a vector while Rust's borrow checker keeps the vector inaccessible until that reference's lifetime ends. The specification uses a fresh element borrow name `γ_i` and the placeholder `*γ_i`: the vector's element is replaced by the eventual value written through the returned reference. Figure 3 specifies `returns("if i < length xs then Some (xs !!! i, 𝛾 i) else None")` and `ensures(#iris "if i < length xs then Res 𝛾 (<[i:=*𝛾 i]>xs) else Res 𝛾 xs")` (Figure 3, p. 7; section 2.3, pp. 6–7).

How to apply it.

1. Refine the input `&mut Vec<T>` by a list `xs` of `bor` values and a borrow name `γ`; refine the index by an integer `i` (Figure 3, p. 7; section 2.3, p. 6).
2. Declare a fresh `γ_i` for the element reference with `exists` (Figure 3, p. 7).
3. For an in-bounds index, return `Some` of `(xs !!! i, γ_i)`; otherwise return `None` (Figure 3, p. 7).
4. In the postcondition, give `Res γ xs` when out of bounds; otherwise give `Res γ (<[i:=*γ_i]>xs)`, replacing element `i` by the placeholder (section 2.3, pp. 6–7).
5. In the client, `bor τ` values are either `#x` (known) or `∗γ` (borrowed). After the call the client has `Res 𝛾 [#100; *𝛾 i; #300]`; when the lifetime of `xr` ends it obtains `Res 𝛾 i 42`, and RefinedRust combines these to update `x` to `[#100; #42; #300]` (section 2.3, p. 7).

Verus form. Inference: Verus could describe the vector with a ghost sequence, but the paper states that “Verus currently cannot verify reborrowing functions that return a mutable reference like the function Vec::get_unchecked_mut we verify in §3.” (section 7, p. 21). Inference: a Verus port therefore needs a different API shape (for example, a set-at-index method) or newer Verus support; this study did not check current Verus.

Evidence and limits. The paper's client builds `vec![100, 200, 300]`, asserts `*xr == 200`, writes 42, and then asserts `*x.get_mut(1).unwrap() == 42` (Figure 3, p. 7). Inference: this is a specification technique; it does not by itself verify the unsafe implementation underneath.

## technique: representation invariants for unsafe pointer APIs

What it is. RefinedRust gives an unsafe API a mathematical representation invariant and checks that every interface operation preserves it. For `RawVec`, the invariant bounds the capacity and holds permission to free the buffer, but not ownership of the buffer itself. For `Vec`, existential variables `c`, `b`, and `els` describe capacity, buffer location, and buffer elements. The paper states: “In ReﬁnedRust we can verify safety and functional correctness of APIs that use raw pointers. We do this by equipping the API with a representation invariant that speciﬁes the internal (pointer) structure in mathematics, and proving that each function that is part of the API interface preserves the invariant.” (section 3, p. 8).

How to apply it.

1. Give the structure a mathematical type with `refined_by`; `RawVec` uses `(b, c)` of type `loc * Z`, `Vec` uses a list `xs` (Figure 4, p. 9).
2. Map concrete fields to mathematical values with `field`; `ptr` maps to `b`, `cap` to `c`, `buf` to `(b, c)`, and `len` to `length xs` (Figure 4, p. 9).
3. For `RawVec`, state `{size_of T} * c ≤ max_int isize` and the ownership `#own "freeable b (c * {size_of T})"` (Figure 4, p. 9; section 3.1, p. 8).
4. For `Vec`, quantify `c`, `b`, and `els`; assign `b` the type `array_t (maybe_init {T}) c` with value `els`; require the first `length xs` entries to equal `#(Some (xs !!! i))`, the entries from `length xs` up to `c` to be `#None`, and `length xs ≤ c` (Figure 4, p. 9; section 3.1, p. 9).
5. In each operation, unfold the invariant to reach fields and raw memory, and re-establish it before ownership returns to the caller (section 3.2, pp. 9–11).

Verus form. Inference: Verus can encode the sequence and capacity as ghost state with `requires`/`ensures` on operations. The paper says Verus's unsafe support uses dedicated Rust types that encode ownership, so “Verus cannot verify the Vec implementation that is written with raw pointers directly.” (section 7, p. 21). Inference: a Verus port must rewrite the raw-pointer code over Verus's permission-carrying pointer abstractions, which the paper notes must be trusted (section 7, p. 21).

Evidence and limits. The evaluation verifies the listed `Vec` and `RawVec` operations, including allocation shims (section 6, p. 19). Figure 4 is simplified to non-zero-sized `T`, but the actual verification handles the zero-sized case (section 3.1, p. 8). The verified code is not the standard-library implementation: it uses the global allocator, implements `get` and `get_mut` directly on `Vec`, and wraps the platform-specific allocation APIs (section 6, p. 19). Inference: the result demonstrates the core pointer reasoning, not full standard-library coverage.

## technique: unfold, yoink, borrow, and restore an invariant

What it is. `get_unchecked_mut` is the paper's detailed proof of an unsafe reborrow. Starting with `&'a mut Vec<T>`, RefinedRust unfolds the vector invariant by extracting it from under the mutable reference into a `yoinked` type, offsets the raw pointer, borrows the element for a new lifetime `'b`, marks that array part `blocked'b`, extends `'b` to `'a`, and re-assembles the `Vec` invariant from parts still behind `blocked'a`. The paper says: “The key operation of get_unchecked_mut is the borrow of the element referenced by the produced pointer p (line 14).” (section 3.2, p. 11).

How to apply it.

1. Require `i < length xs`, take `xs`, `γ`, `i` as parameters, and declare a fresh `γ_i` with `exists` (Figure 5, p. 10).
2. Unfold `Vec` below the mutable reference to obtain `c`, `b`, `els`, the array ownership, and the element relation. Because the `Vec` is only owned below a mutable reference, record the extraction as `&'a mut (yoinked(Vec<T>; struct [RawVec<T>; int usize]))`; the original type `Vec<T>` must be put back before `'a` ends (section 3.2, pp. 10–11; Figure 5, p. 10).
3. Compute `p = self.buf.ptr().add(idx)`. Proving this in bounds uses the pure invariants and the precondition; `p` gets a `raw_ptr` type (Figure 5, p. 10; section 3.2, p. 11).
4. Create `ret = &'b mut *p` for a new lifetime `'b ⊑ 'a`. The array becomes `blocked'b` with element `i` set to `#(Some(∗γ_i))`, and `ret` has value `(xs !!! i, γ_i)` (Figure 5, p. 10; section 3.2, p. 11).
5. Return `ret`, extending `'b` to `'a` to match `&'a mut T` (section 3.2, p. 11).
6. Show that when `'a` ends the `yoinked` ownership can be turned back into `Vec<T>`, using parts still behind `blocked'a`; then let `self` go out of scope, which generates `Res γ (xs[i := ∗γ_i])`, the required `ensures` clause (section 3.2, p. 11; Figure 5, p. 10).

Verus form. Inference: per the paper's own statement quoted above, Verus (as of the paper) cannot verify this reborrowing function (section 7, p. 21). Inference: `yoinked`, `blocked`, lifetime ordering, and delayed invariant restoration are RefinedRust-specific; a Verus design would avoid returning `&mut T` into the buffer or trust an unverified helper.

Evidence and limits. Figure 5 shows the intermediate type states (p. 10) and section 3.2 explains the restoration obligation (pp. 9–11). The function is safe only under `i < length xs`; at the call site in `get_mut` the unsafe block makes this the programmer's responsibility in Rust, and RefinedRust checks it with its theory solver (section 2.4, pp. 7–8). The soundness proof needed a new kind of borrow, “pinned borrows”, in the lifetime logic to allow `blocked` below mutable references (section 5.4, p. 18). RefinedRust does not support concurrency, recursive types, traits, closures, or unsized types (introduction, p. 4).

## technique: Radium and layout-parametric semantics

What it is. Radium is a formalized operational semantics of a subset of MIR, based on RefinedC's Caesium, with byte-level values, layout-parameterized loads and stores, bounded integers, in-bounds checks on pointer offsets, and lifetime instructions `startlft`/`endlft`. Verification is quantified (in Coq) over an abstract layout algorithm so generic Rust code can be checked without committing to one field order or padding. The paper says: “All our veriﬁcation results are proven for an arbitrary instance of this layout algorithm.” (section 4.1, p. 12).

How to apply it.

1. Run the frontend, a `rustc` plugin, after MIR generation and successful borrow checking; it maps MIR to Radium and adds lifetime hints from the Polonius borrow checker (section 6, p. 19).
2. Represent values as lists of memory bytes (integer bytes, pointer fragments, or poison) in a heap map from locations to bytes; parameterize loads and stores by size and alignment, and check pointer offsets and integer overflow (section 4, p. 12).
3. Have the frontend generate a syntactic type `SynType` for every Rust type, and define a partial `LayoutAlg` mapping it to a concrete layout; for structs, enums, and unions, it is parameterized by a subroutine returning an arbitrary valid layout (section 4.1, pp. 12–13).
4. Prove results for an arbitrary layout algorithm, then instantiate with concrete layouts for a closed program (section 4.1, pp. 12–13; Theorem 5.1, p. 18).

Verus form. Inference: Verus verifies Rust source and does not expose MIR byte semantics or a layout-algorithm quantifier. Inference: a Verus project needing layout independence would abstract offsets and sizes in ghost specifications; unsafe casts and byte-level validity would need library axioms or verified wrappers.

Evidence and limits. Radium is in the trusted computing base, along with the frontend, the top-level safety statement, and the Coq kernel and infrastructure; the frontend's lifetime annotations are only hints and need not be trusted (section 6, p. 19). The paper lists unmodeled Rust details: some struct/enum layout details such as niche optimizations, some validity invariants, pointer-integer casts, and the aliasing model (introduction, p. 4). Inference: foundational proof checking does not remove semantic-model assumptions.

## soundness, trust, and product implications

The soundness theorem is adequacy: if the type system, instantiated with a layout algorithm that can lay out all types used, verifies a “main” function at type `() -> ()`, it executes without undefined behavior or panic (Theorem 5.1, section 5.4, p. 18). By compositionality, a functional postcondition can be checked by a closed program that panics if it fails (section 5.4, pp. 18–19). The formalization is around 21k lines of specification and 14k lines of proof (section 5.4, p. 18). Coq checks the generated proofs, so the type system, lifetime logic, and their Iris implementation need not be trusted; the trusted base is Radium, the frontend, the top-level safety statement, and Coq's kernel and infrastructure (section 6, p. 19).

The paper's comparison (Table 1, section 7, p. 20) says “ReﬁnedRust is the ﬁrst tool that supports automated and foundational functional correctness proofs for unsafe Rust code against a detailed memory model.” and “most existing automated veriﬁcation tools do not support reasoning about unsafe code and do not provide foundational proofs.” (section 7, p. 20). On Verus specifically, it says Verus is “more mature and supports a larger subset of safe Rust than ReﬁnedRust” but its proofs “are not foundational” (section 7, p. 21).

## techniques for the catalog

- refinement boundary specifications — connect Rust arguments and results to mathematical values with preconditions, postconditions, and overflow obligations
- borrow-name effect tracking — represent a mutable reference by its current value and a name resolved back into the lender at lifetime end
- reborrow placeholders — describe a vector after an element borrow with a list update containing the borrowed value placeholder
- unsafe representation invariants — specify pointer locations, capacities, initialized elements, and ownership, then preserve the invariant across each API operation
- yoinked and blocked ownership — temporarily extract an invariant below a mutable reference, block borrowed memory, and restore ownership after the lifetime ends
- layout-parametric semantics — prove byte-level safety for an arbitrary valid layout algorithm and instantiate it for concrete closed programs
- foundational Coq checking — generate separation-logic proofs and check them in Coq while trusting only the operational model, translation, top-level theorem, and proof kernel
