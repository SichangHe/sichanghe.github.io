# A Lightweight Formalism for Reference Lifetimes and Borrowing in Rust
(authored by agents unless marked 🧑)
Tag: `pearce2021lightweight`, [paper](https://doi.org/10.1145/3443420)

## result
Pearce presents FR, a small flow-sensitive calculus for Rust lifetimes and borrowing. The abstract says: “we present a lightweight formalism that captures these two phases using a flow-sensitive type system” (abstract, p. 3:1). It supports copy and move semantics, mutable borrowing, reborrowing, partial moves, and lifetimes, and gives a handwritten soundness proof. Theorem 4.12 establishes termination to a value from a valid state with a well-formed typing environment safely describing its store; Corollary 4.14 additionally requires a borrow-safe starting environment to preserve borrowing exclusivity (pp. 3:30–31).

## technique 1: separate ownership, moves, and copies

Inference: use this to reason about which variable may deallocate a value and when a binding becomes unusable. A move transfers responsibility and invalidates the source; a copy creates an independent value only for copyable types (section 2.2).

Steps:

1. Assign each variable a type and allocation lifetime.
2. On a move, remove usability of the source and assign the destination responsibility for the location (sections 2.2 and 3.4).
3. On a copy, require the source type to be copyable and preserve source usability (section 2.2).
4. Keep an undefined type marking the moved portion, retaining its original shape for later assignment checks (section 3.4, pp. 3:23–26). Core partial moves occur through boxes; tuple-element moves are added in section 6.2, pp. 3:43–48, where unmoved elements remain accessible.
5. At scope end, drop locations allocated in that lifetime using the `drop` operation (section 3.2.3, p. 3:17).

Verus form (inference)

Inference: Rust’s ownership checker already enforces these transitions. In Verus, state the semantic property with `requires`/`ensures` on consuming functions and ghost predicates for moved fields; use `spec fn` for copyability and ownership facts. Do not encode ownership with runtime booleans when Rust’s types can enforce it.

Evidence and limits

FR most closely models Rust 1.0 lexical lifetimes and explicitly excludes unsafe code and non-lexical lifetimes (section 3, p. 3:12). The core has no loops; section 4.5.2 explains that the termination theorem would need weakening to cover loops and recursion. The model permits unreachable heap locations, so it gives no memory-leak guarantee (section 4.2, p. 3:29).

## technique 2: flow-sensitive immutable and mutable borrowing

Inference: use this to check aliasing while permitting temporary access. Immutable borrows may coexist; a mutable borrow requires exclusive access. The paper states: “immutable and mutable borrowed references cannot coexist for the same resource” (section 2.3.1, p. 3:7).

Steps:

1. Check that the place being borrowed has a fully defined type. In FR a place (called an lval) is a variable or a path through references; the tuple extension adds element selection.
2. For `&x`, require that the place is not read prohibited: no conflicting mutable borrow may exist. The resulting reference type records the borrowed place; while held in the environment it prohibits writes.
3. For `&mut x`, require mutable access and that the place is not write prohibited: neither a conflicting mutable nor immutable borrow may exist. The resulting reference type records exclusive access.
4. Determine restrictions by scanning reference types in the current typing environment, including references inside boxes. Dropping a reference from that environment removes the restrictions it imposed (sections 3.3–3.4, pp. 3:20–25; T-MutBorrow and T-ImmBorrow).
5. Reject assignment while a location is frozen; the paper’s example produces an assignment error (section 2.3.3, p. 3:9).

Verus form (inference)

Inference: represent the borrowed region with a ghost predicate and prove read-only or exclusive access in `requires`. Use loop `invariant` clauses to carry the predicate across iterations. Verus’s Rust borrow checker handles aliasing; the ghost proof explains data invariants that the compiler cannot express.

Evidence and limits

The model checks mutability of the access path separately from restrictions caused by other references. An immutable reborrow of a mutable reference prevents writes through that reference while permitting reads; the original owner remains inaccessible (section 3.3, p. 3:20).

## technique 3: reborrowing and lifetime ordering

Inference: use reborrowing when passing a mutable reference temporarily. A reborrow `&mut *p` suspends the original borrow, then restores it after the inner lifetime; an immutable reborrow permits reads but not writes (section 2.3.2).

Steps:

1. Introduce a nested lifetime ordered inside the enclosing lifetime.
2. Create the reborrow and mark the original reference unavailable or read-only for that nested interval.
3. Type-check and evaluate the inner block.
4. At block end, expire the reborrow and restore the original reference’s permission (sections 2.3.2 and 3.3–3.4).
5. Reject a reference whose lifetime outlives its referent; this prevents dangling references (section 2.4).

Verus form (inference)

Inference: use Rust references with explicit lifetime parameters where needed; express post-reborrow restoration as an `ensures` clause over a ghost view. Verus does not require manually writing lifetime order proofs for ordinary references, but complex data-structure invariants may need `proof fn` lemmas.

Evidence

The paper models lifetimes as a partial order and gives evaluation rules for blocks, borrows, dereferences, and dropping (section 3). Its typing judgment records both input and output environments, the result type, enclosing lifetime, and a store typing for intermediate reference values (section 3.3, p. 3:19). Section 4 and Appendix 9 supply the soundness argument.

## technique 4: preserve borrow information across branches and expression operands

Section 6 extends the core with conditionals and tuples. A branch can leave a reference pointing to either of two places; a tuple can temporarily hold a borrow before the tuple itself is assigned. Both cases need explicit treatment.

1. For a conditional, type both branches from the environment after the condition. Join their result types and output environments (T-If, section 6.1.2, p. 3:41)
2. Combine possible reference targets conservatively: joining `&x` and `&y` produces a reference to either `x` or `y`, so subsequent checks consider both
3. For tuple operands, type left to right and temporarily bind each operand’s result type to a fresh anonymous variable while typing later operands. Remove these temporary variables afterward (carry typing, Definition 6.9, pp. 3:45–46)
4. Extend paths and conflicts so different tuple elements can be borrowed independently; preserve undefined portions when elements move (section 6.2)

The reason for step 3 is concrete: the paper says it must ensure “(&mut x,&mut x)” is prohibited (section 6.2, p. 3:43). Without carrying the first result type forward, its borrow would be absent while checking the second operand. Section 6.1.3 also shows that joined environments may appear to contain conflicting mutable borrows from different paths; the borrow-safety claim uses a more precise environment for the path actually executed (p. 3:43).

Inference: for VL, preserve temporary ownership facts during verification of compound expressions and check each branch’s semantic postcondition before joining. These rules describe a calculus, not a demonstrated Verus integration.

## technique 5: validate a calculus with generated programs

Section 5 reports a Java implementation with an abstract syntax tree, type/borrow checker, and interpreter. Its structures follow the rules closely to permit manual comparison. The paper reports “model checked our calculus using over 500B input programs” (abstract, p. 3:1).

1. Bound distinct integer literals, variable names, block nesting and block width to obtain finite program spaces (Definition 5.1, p. 3:33)
2. Constrain generation to declared variables, one representative per variable renaming, and a bounded number of blocks. Generate left to right while retaining declaration information (section 5.2.2)
3. Ensure the space contains a minimal program exposing the intended fault, such as a dangling reference that only a lifetime-inclusion check detects (section 5.2.1)
4. Execute accepted and rejected programs; compare static acceptance with runtime faults, including dangling-reference checks at deallocation. Table 1 reports zero accepted programs faulting across the listed spaces; it also counts rejected programs that execute without faults (p. 3:36)
5. Translate programs to Rust and compare acceptance with rustc 1.39.0, edition 2015. Replace box syntax, drop explicit block-lifetime syntax, ignore shadowing, infer copies, and add end-of-block uses to keep relevant borrows active (section 5.3.1)
6. Classify disagreements before treating them as bugs. Tables 2–3 distinguish E0506 cases, dereference coercions, cyclic assignments and other differences, including variable drop order (pp. 3:38–40)

The abstract reports testing against 2B programs; Table 2 separately lists generated spaces and ignored inputs, so that headline does not mean 2B distinct successful compilations. Section 5.3.2 reports an accepted and eventually fixed compiler issue, linked in footnote 18 to Rust issue 63719. The conclusion calls it “previously known”, while the abstract and discussion describe discovery through this work; the paper’s wording is inconsistent.

Inference: VL could use a small executable model to generate targeted compiler or verifier regression cases. A finite experiment checks only the tested bounds and translation; it does not prove correctness of rustc or Verus.

## what is proved, measured, and trusted

Theorem 4.12, Corollary 4.14, and Appendix 9 provide a handwritten argument for the core calculus, with explicit starting-state assumptions. Section 6 gives completed conditional and tuple extensions and a function-extension sketch; section 6.3.3 says work remains on relating caller stores to function typing environments. Section 8 states: “While this does not constitute a full mechanical proof”, model checking supports confidence in the argument (p. 3:61). The experimental check also found bugs in earlier FR formulations, which were corrected (section 5.2.3).

Inference: trust rests on the formal rules, handwritten proofs, implementation correspondence and program-generation/translation logic. Rust’s implementation and Verus are outside the proved calculus.

Inference: for agent-written verified Rust, FR is a precise checklist for lifetime, move, borrow, reborrow, and drop obligations. The threat is model mismatch: code using unsafe, traits, closures, or advanced control flow may satisfy FR-like reasoning while violating assumptions outside the calculus.

## prior work VL should not redo

The paper already supplies a compact ownership/lifetime calculus, flow-sensitive borrow rules, reborrow restoration, and a soundness proof. Inference: VL can use the calculus to explain ownership obligations, and reuse its test-generation and expression-typing ideas when evaluating verifier behavior; its lexical-lifetime model is not an exact account of current Rust.

## techniques for the catalog

- move/copy ownership tracking: invalidate moved bindings and preserve copyable sources
- flow-sensitive borrow checking: freeze writes for immutable borrows and enforce exclusive mutable access
- reborrow lifetime ordering: suspend and restore permissions across nested lifetimes
- drop and dangling prevention: expire lifetime-owned locations and reject outliving references
- branch joins and carry typing: retain alternative reference targets and temporary operand borrows
- bounded model and compiler comparison: enumerate constrained programs and classify static/runtime or compiler disagreements

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "As is the case with bounded model checking, this demonstrates correctness for the specific range of programs examined."): read all 73 pages of the supplied paper text, including Appendix 9 and references, and the whole study; checked quotations, section/page references, typing and reduction rules, theorem assumptions, extensions, experimental counts and translation limits; corrected the nonexistent section 3.5, incorrect borrowing pages and tests, core-versus-tuple scope, and missing empirical and expression-typing techniques; did not execute Java or rustc, inspect the repository or linked issue, mechanically verify the handwritten proofs, or test Verus adaptations.
