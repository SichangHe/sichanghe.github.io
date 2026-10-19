# Scylla: Translating an Applicative Subset of C to Safe Rust
(authored by agents unless marked 🧑)
Tag: `fromherz2026scylla`, [paper](https://doi.org/10.1145/3798229)

## scope and result
The paper presents Scylla, a compiler from a structured, applicative subset of C to safe Rust. Its workflow asks the programmer to refactor C until it fits Mini-C, then emits Rust using slices, splitting, inferred mutability, and ownership-aware pointer representations. The paper states: “We instead advocate for a different approach, where the programmer iterates on the original C, gradually making the code more structured until it becomes eligible for compilation to safe Rust.” (abstract, p.1)

Inference: this is a translation and memory-safety technique rather than a functional-correctness verifier. The authors explicitly state in the conclusion: “While the various steps of our translation are formalized with pen-and-paper, and our case studies empirically show that codebases translated by Scylla pass functional tests, we currently do not have any formal guarantees about the correctness of the translation.” (conclusion, p.24) Inference: a Verus user would still need to specify and prove functional behavior; the paper does not evaluate Verus integration.

## technique: typed Mini-C normalization
Inference: use this normalization before Rust generation when implicit C conversions would obscure the intended types. Scylla obtains Clang's typed AST and translates it to Mini-C, an expression language with fixed-width integers, explicit casts, boolean conditions, typed array indices, pointers, and explicit sequencing.

Steps from the paper:
1. Parse the compilation unit with Clang and obtain its typed AST (Sec. 2.2, p.3).
2. Replace typedefs with definitions and translate C types to Mini-C types (Sec. 2.2, p.5).
3. Materialize implicit conversions: compare synthesized and expected types, insert a cast when they differ, and apply integer promotions and the usual arithmetic conversions (Sec. 2.3, p.5; Fig. 3, p.6).
4. Reject or rewrite constructs outside the subset: unstructured goto, integer-to-pointer representation tricks, bitfields, and untagged unions (introduction, p.2).
5. Assume behavior independent of C data-model widths; detect the architecture's data model at configure time to map types such as unsigned int to uint32_t (Sec. 2.3, p.5).

The paper's formal rule is: “if the synthesized (bottom-up) type differs from the expected (top-down) type, a cast is inserted (ConvertNeq), otherwise, the expression remains as-is (ConvertEq).” (Sec. 2.3, p.5)

Inference: a possible Verus adaptation would retain explicit integer types and casts, then add `spec fn` models and `ensures` clauses for functional behavior. Range and overflow obligations would need separate proofs; this adaptation is not demonstrated in the paper.

Evidence and limits: the implementation uses about 7,200 lines of OCaml and all case studies compiled and passed manually ported tests (Sec. 4.1, p.16). The method assumes portable C and structured control flow; it does not formally establish semantic equivalence.

## technique: annotated ADT and tuple reconstruction
Scylla uses annotations to identify tagged unions and structs that should become tuples. Tuple structural typing avoids sharing mutability requirements across unrelated uses (Sec. 2.4, pp.6–7; Sec. 3.3, p.15).

Steps:
1. Require tags from 0 to N matching the order of union cases, and mark the tagged-union struct with `__attribute__((annotate("scylla_adt")))` (Fig. 4, p.7).
2. Check that a constructor's integer tag agrees with the selected union field; translate the payload and emit a Mini-C variant constructor (Sec. 2.4, p.7).
3. Track tag values with flow-sensitive equations. For `if (x.tag == i) { ... x.casei ... }` or an equivalent switch, emit a Mini-C pattern match and bind the payload; reject a case access inconsistent with the current tag (Sec. 2.4, p.7).
4. Annotate ordinary structs for tuple reconstruction when structural, rather than nominal, typing is needed; translate fields to tuple projections (Sec. 2.4, p.7).

The paper says: “We store and propagate the state of tagged union 𝑥, and translate all occurrences of x.casei to the constructor payload 𝑣 inside the branch (line 7, right); accesses to different union cases are considered invalid and the translation errors out.” (Sec. 2.4, p.7)

Inference: a Verus adaptation could retain enums, matches, and tuples, then prove payload properties within each case. The paper supplies no Verus encoding or validation.

Evidence: EverParse CBOR-DET required 19 added annotation lines; tagged unions became Rust ADTs and additional types became tuples (Sec. 4.2.5, p.20). The assumption is that tags are in range and correspond to union-case order.

## technique: ownership-directed pointer representation
The representation distinguishes borrowed data from owned allocations in Rust (Sec. 3.1, p.8). Scylla maps ordinary pointers to slice borrows and uses a fixed-point analysis plus annotations to identify owned allocations.

Steps:
1. Default every C pointer to a Rust slice borrow `&[T]` (later refined to `&mut [T]`), regardless of whether C points to one element or many (Sec. 3.1, p.8).
2. Use a limited heuristic: a function `T *create()` without references to globals must return a fresh allocation, so translate it to `fn create() -> Box<T>`; manual annotations can also request boxes (Sec. 3.1, p.8).
3. Recurse through structs and variants with a fixed point to decide whether each pointer field is a `Box` or a lifetime-parameterized borrow (Sec. 3.1, p.8).
4. Insert type-directed array/slice/box coercions. For slice-to-box and array-to-box conversions, remove the original variable from the output environment so later use is rejected (Fig. 6 and Sec. 3.1, pp.8–9).

Inference: functional specifications for the translated code must account for the ownership conversions and source-use restrictions. Whether a particular generated slice or box operation is supported by Verus needs a separate check.

The paper's concrete warning is: “These copies cannot be avoided, as in our translation scheme, it might truly be the case that what initially started as a stack allocation needs to be promoted to a heap allocation.” (Sec. 3.1, p.8)

## technique: split trees for pointer arithmetic
Split trees turn C pointer offsets into safe Rust slice operations. Scylla assumes the intended chunks are disjoint; statically distinguishable overlap produces a compilation error, while other overlap can cause a runtime bounds panic (Sec. 3.2, pp.12–13).

Steps:
1. Initialize each pointer's split tree as a leaf with no base and empty path (Fig. 8, p.11).
2. For `let x = base + index`, binary-search the base tree for the offset, add a split node, record `Base(x)` and its path, locate the in-scope parent slice, compute any right-side offset, and emit `split_at` or `split_at_mut` (Fig. 8, p.11).
3. For a later pointer use, find the nearest in-scope variable whose recorded base/path makes the required slice accessible, and select its tuple component. When splitting a right subslice, adjust the split offset because its indices restart at zero (Fig. 8, pp.11–12; Fig. 9, p.12).
4. Reset a tree when the base is used as a non-pointer-arithmetic expression; a programmer can insert `(void)base` as a source-level lifetime/reset hint, which the compiler optimizes away (Sec. 3.2, p.12).
5. Compare symbolic offsets with the deterministic solver. If comparison fails, issue a warning, rewrite the C expression if possible, and finally use the monotonic-left-to-right heuristic (Sec. 3.2, p.12).

The paper describes its representation: “each C pointer maps to a (possibly singleton) split tree, which evolves in a flow-dependent fashion.” (Sec. 3.2, p.10) Its example translates `abcd + 0`, `+16`, `+8`, `+24` into successive `split_at_mut` calls (Fig. 7, p.10).

Inference: a Verus adaptation would need bounds and slice-length obligations to rule out the runtime panics described here. The paper does not show a proof model for split trees or a Verus implementation.

Limits: “If there is true aliasing, i.e., the C program contains both a[8] and b[0] in our earlier example, the translated Rust code will perform an out-of-bounds array access.” (Sec. 3.2, p.12) The symbolic solver is explicitly incomplete.

## technique: backward mutability inference
After Rust generation, the analysis adds `mut` qualifiers required for memory updates. Inference: adding qualifiers alone cannot repair arbitrary borrowing errors.

Steps:
1. Start every borrow immutable and define sets V (variables that must be mutable) and R (variables that must have mutable-borrow types) (Sec. 3.3, p.13).
2. Analyze a `let` continuation first. If its variable belongs to R, analyze the initializer in mutable-borrow mode; if it belongs to V, make the binding `let mut` (Fig. 10, p.14).
3. For a slice update, analyze the left side in `mut` mode and the index/value in `imm` mode; propagate the resulting sets (Fig. 10, p.14).
4. At calls, inspect each callee parameter type, analyze arguments under the required mutability, union their sets, and, when the result must be a mutable borrow, update the callee return type (Sec. 3.3, pp.14–15).
5. Update parameter types from each analyzed body and iterate mutually recursive function equations to a least fixed point. The paper argues termination because qualifiers are only added, with iterations bounded by the total number of function parameters; the implementation uses an optimized fixed-point library (Sec. 3.3, pp.13–15).

The paper states: “Applying this analysis to the output of our translation yields a Rust program that has been annotated with the minimum amount of mut qualifiers in variables, types, and function parameters, in order to type-check.” (Sec. 3.3, p.13)

Inference: inferred signatures could supply the executable borrowing interface for a later Verus proof. Adding `mut` does not establish the functional invariants or postconditions that proof would require.

## technique: automatic trait derivation
Traverse generated struct and enum definitions to derive `Copy` when every field implements it; a fixed-point computation handles recursive type dependencies. A mutable borrow or `Box` prevents `Copy`, while immutable borrows and basic types permit it. Scylla also derives `PartialEq` and `Clone` when possible; `Clone` is required for `Copy` (Sec. 3.4, pp.15–16). Inference: deriving these traits does not prove functional specifications for a later Verus adaptation.

## techniques for the catalog
- typed Mini-C normalization — translate Clang C ASTs into fixed-width, explicitly converted expression language before Rust generation
- annotated union and tuple reconstruction — turn tagged unions into checked variants and selected structs into structurally typed tuples
- ownership-directed pointer lowering — map pointers to slices by default and infer `Box` ownership with a fixed point
- split-tree pointer arithmetic — compile disjoint C offsets into deterministic `split_at`/`split_at_mut` chains
- backward mutability inference — propagate update requirements from uses to Rust bindings and function signatures
- trait derivation — resolve recursive `Copy` dependencies with a fixed point; also derive `Clone` and `PartialEq` when possible
