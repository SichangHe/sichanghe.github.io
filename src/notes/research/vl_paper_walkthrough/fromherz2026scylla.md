# Scylla: Translating an Applicative Subset of C to Safe Rust
(authored by agents unless marked 🧑)
Tag: `fromherz2026scylla`, [paper](http://arxiv.org/abs/2412.15042v2)

## scope and result
The paper presents Scylla, a compiler from a structured, applicative subset of C to safe Rust. Its workflow asks the programmer to refactor C until it fits Mini-C, then emits Rust using slices, splitting, inferred mutability, and ownership-aware pointer representations. The paper states: “We instead advocate for a different approach, where the programmer iterates on the original C, gradually making the code more structured until it becomes eligible for compilation to safe Rust.” (abstract, p.1)

Inference: this is a translation and memory-safety technique rather than a functional-correctness verifier. The authors explicitly state in the conclusion: “While the various steps of our translation are formalized with pen-and-paper, and our case studies empirically show that codebases translated by Scylla pass functional tests, we currently do not have any formal guarantees about the correctness of the translation.” (conclusion, p.24) A Verus user should therefore treat Scylla output as safe Rust input whose functional specification still needs to be proved.

## technique: typed Mini-C normalization
Use this before generating Rust whenever C's implicit behavior would make direct translation ambiguous. Scylla obtains Clang's typed AST and translates it to Mini-C, an expression language with fixed-width integers, explicit casts, boolean conditions, typed array indices, pointers, and explicit sequencing.

Steps from the paper:
1. Parse the compilation unit with Clang and obtain its typed AST (Sec. 2.2, p.3).
2. Replace typedefs with definitions and translate C types to Mini-C types (Sec. 2.2, p.5).
3. Materialize implicit conversions: compare synthesized and expected types, insert a cast when they differ, and apply the C usual-arithmetic-promotion algorithm (Sec. 2.3, pp.5–6).
4. Reject or rewrite constructs outside the subset: unstructured goto, integer-to-pointer representation tricks, bitfields, and untagged unions (introduction, p.2).
5. Require portable fixed-width behavior; configure the target data model so, for example, unsigned int maps to uint32_t (Sec. 2.3, p.5).

The paper's formal rule is: “if the synthesized (bottom-up) type differs from the expected (top-down) type, a cast is inserted (ConvertNeq), otherwise, the expression remains as-is (ConvertEq).” (Sec. 2.3, p.5)

Verus form (Inference): preserve the normalized Rust types and explicit casts, then add `spec fn` models and `ensures` clauses for the C function's behavior. Mini-C's fixed-width arithmetic maps to Verus integer types plus range lemmas; the normalization itself does not prove those lemmas.

Evidence and limits: the implementation uses about 7,200 lines of OCaml and all case studies compiled and passed manually ported tests (Sec. 4.1, p.16). The method assumes portable C and structured control flow; it does not formally establish semantic equivalence.

## technique: annotated ADT and tuple reconstruction
Use annotations when a C struct encodes a tagged union or when tuple structural typing will make Rust borrowing possible.

Steps:
1. Mark a tagged-union struct with `__attribute__((annotate("scylla_adt")))` (Fig. 4, p.7).
2. Check that a constructor's integer tag agrees with the selected union field; translate the payload and emit a Mini-C variant constructor (Sec. 2.4, p.7).
3. Track tag values with flow-sensitive equations. For `if (x.tag == i) { ... x.casei ... }` or an equivalent switch, emit a Rust-style pattern match and bind the payload; reject a case access inconsistent with the current tag (Sec. 2.4, p.7).
4. Annotate ordinary structs for tuple reconstruction when structural, rather than nominal, typing is needed; translate fields to tuple projections (Sec. 2.4, p.7).

The paper says: “We store and propagate the state of tagged union x, and translate all occurrences of x.casei to the constructor payload v inside the branch (line 7, right); accesses to different union cases are considered invalid and the translation errors out.” (Sec. 2.4, p.7)

Verus form (Inference): represent the variant as a Rust `enum`, use `match`, and state branch-specific facts with `requires` or `assert` before proving payload properties. Tuple reconstruction carries over directly as tuples; the annotation and flow equations are Scylla-specific.

Evidence: EverParse CBOR-DET required 19 added annotation lines; tagged unions became Rust ADTs and additional types became tuples (Sec. 4.2.5, p.20). The assumption is that tags are in range and correspond to union-case order.

## technique: ownership-directed pointer representation
Use this when C pointers may refer to stack data, borrowed data, or fresh heap allocations. Scylla maps ordinary pointers to slice borrows and uses a fixed-point analysis plus annotations to identify owned allocations.

Steps:
1. Default every C pointer to a Rust slice borrow `&[T]` (later refined to `&mut [T]`), regardless of whether C points to one element or many (Sec. 3.1, p.8).
2. Recognize a function that allocates fresh storage and has no global references; translate its return pointer to `Box<T>` (Sec. 3.1, p.8).
3. Recurse through structs and variants with a fixed point to decide whether each pointer field is a `Box` or a lifetime-parameterized borrow (Sec. 3.1, p.8).
4. Insert type-directed array/slice/box coercions. If conversion would copy a value, remove the original variable from the output environment so later use is rejected (Fig. 6 and Sec. 3.1, pp.8–9).

Verus form (Inference): use `&[T]`, `&mut [T]`, and `Box<T>` in executable Rust, then specify ownership-sensitive behavior with `requires`/`ensures`; Verus proof code cannot make a C aliasing pattern valid after Rust rejects it. `Box::new` copying an array must be reflected in the specification.

The paper's concrete warning is: “These copies cannot be avoided, as in our translation scheme, it might truly be the case that what initially started as a stack allocation needs to be promoted to a heap allocation.” (Sec. 3.1, p.9)

## technique: split trees for pointer arithmetic
Use this for disjoint C pointer offsets that must become safe Rust slice operations. The input must have non-overlapping chunks; true aliasing is rejected or can panic at runtime.

Steps:
1. Initialize each pointer's split tree as a leaf with no base and empty path (Fig. 8, p.11).
2. For `let x = base + index`, binary-search the base tree for the offset, add a split node, record `Base(x)` and its path, locate the in-scope parent slice, compute any right-side offset, and emit `split_at` or `split_at_mut` (Fig. 8, p.11).
3. For a later pointer variable, look up its recorded base/path and select the corresponding slice component; subtract ancestor offsets when the local slice index restarts at zero (Secs. 3.2, pp.10–12).
4. Reset a tree when the base is used as a non-pointer-arithmetic expression; Scylla recognizes `(void)base` as a source-level lifetime/reset hint and optimizes it away (Sec. 3.2, p.12).
5. Compare symbolic offsets with the deterministic solver. If comparison fails, issue a warning, rewrite the C expression if possible, and finally use the monotonic-left-to-right heuristic (Sec. 3.2, p.12).

The paper defines the key invariant: “each C pointer maps to a (possibly singleton) split tree, which evolves in a flow-dependent fashion.” (Sec. 3.2, p.11) Its example translates `abcd + 0`, `+16`, `+8`, `+24` into successive `split_at_mut` calls (Fig. 7, p.10).

Verus form (Inference): retain the generated slices and prove index bounds and disjointness with slice-length facts and `assert`/`requires`. Verus does not provide Scylla's split-tree analysis; implementing an equivalent proof-side model would be new infrastructure.

Limits: “If there is true aliasing, i.e., the C program contains both a[8] and b[0] in our earlier example, the translated Rust code will perform an out-of-bounds array access.” (Sec. 3.2, p.12) The symbolic solver is explicitly incomplete.

## technique: backward mutability inference
Use this after Rust generation to add the minimum `mut` qualifiers required by the borrow checker.

Steps:
1. Start every borrow immutable and define sets V (variables that must be mutable) and R (variables that must have mutable-borrow types) (Sec. 3.3, p.13).
2. Analyze the expression body backward: translate the continuation first, then use its V/R requirements to choose whether each `let` binding is mutable (Fig. 10 and p.14).
3. For a slice update, analyze the left side in `mut` mode and the index/value in `imm` mode; propagate the resulting sets (Fig. 10, p.14).
4. At calls, inspect each callee parameter type, analyze arguments under the required mutability, union their sets, and update function signatures (Sec. 3.3, pp.14–15).
5. Iterate mutually recursive function equations to a fixed point; only additions of `mut` occur, so iterations are bounded by the number of parameters (Sec. 3.3, p.15).

The paper states: “Applying this analysis to the output of our translation yields a Rust program that has been annotated with the minimum amount of mut qualifiers in variables, types, and function parameters, in order to type-check.” (Sec. 3.3, p.13)

Verus form (Inference): use the inferred Rust signatures unchanged, then add Verus specifications. A mutable executable borrow is not a Verus proof mutable state; proofs still require explicit invariants and lemmas.

## technique: automatic trait derivation
Use a fixed-point traversal of generated structs and enums to derive `Copy`, `Clone`, and `PartialEq` only when every field supports the trait (Sec. 3.4, pp.15–16). A mutable borrow or `Box` prevents `Copy`; immutable borrows and basic types permit it. In Verus, derived traits affect executable ergonomics but do not establish semantic properties.

## evidence, trust, and product threat
The evaluation used five codebases: SymCrypt, FrodoKEM, HACL★, bzip2, and EverParse. Compilation used Clang and rustc on macOS 15.5, ARM M3 Max, 96 GB RAM, `-O2`/release opt-level 2, and LTO for both languages (Sec. 4.2, p.17). The normalized table reports, for example, Rust/C ratios of 0.97–1.01 for three FrodoKEM operations, 0.77 for HACL★ ECDH-P256, 1.08 for bzip2 compression, and 0.65–1.22 for CBOR variants (Table 1, p.17). These are performance ratios, not proof rates.

The translation found alignment and strict-aliasing undefined behavior in FrodoKEM and bzip2 (Secs. 4.2.2 and 4.2.4, pp.18–20). HACL★ retained its existing formal guarantees by changing Low★ and proofs; the reported 35,879 source/Low★ lines had 1,296 insertions and 318 deletions (4.5%) (Sec. 4.2.3, p.19). CBOR had 4.1% of its code affected by default-value additions, plus 19 annotation lines (Sec. 4.2.5, p.20). The bzip2 result translated only compression, 2,969 C lines (34% of source), and had 8% overhead while using a hybrid FFI build (Sec. 4.2.4, p.20).

Trusted components are Clang parsing, Scylla's unproved compiler and analyses, rustc's type and borrow checks, the original tests, and (for HACL★/EverParse) their existing proof toolchains. Inference: a VeruLaw product that adopts Scylla gains a practical safe-Rust migration path and useful UB discovery, but still faces threat from translation bugs, unsupported C idioms, incomplete offset reasoning, and the absence of semantic-equivalence proofs. Existing work already covers C-to-safe-Rust restructuring, split-tree pointer lowering, and mutability inference; VL should reuse these ideas rather than re-invent source translation.

## techniques for the catalog
- typed Mini-C normalization — translate Clang C ASTs into fixed-width, explicitly converted expression language before Rust generation
- annotated union and tuple reconstruction — turn tagged unions into checked variants and selected structs into structurally typed tuples
- ownership-directed pointer lowering — map pointers to slices by default and infer `Box` ownership with a fixed point
- split-tree pointer arithmetic — compile disjoint C offsets into deterministic `split_at`/`split_at_mut` chains
- backward mutability inference — propagate update requirements from uses to Rust bindings and function signatures
- trait fixed-point derivation — derive `Copy`, `Clone`, and `PartialEq` only when recursive field constraints permit
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
