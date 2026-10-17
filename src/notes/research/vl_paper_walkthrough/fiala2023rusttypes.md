# Leveraging Rust Types for Program Synthesis
(authored by agents unless marked 🧑)
Tag: `fiala2023rusttypes`, [paper](https://doi.org/10.1145/3591278)

## central idea

RusSOL synthesizes safe Rust from a type signature and functional annotations. The abstract states that "the Rust type system reduces the search space for synthesis, which improves performance." (abstract, p. 1). It introduces Synthetic Ownership Logic (SOL), "a variant of Separation Logic that is targeted to program synthesis of well-typed Rust programs from type signatures and functional specifications" (section 1, p. 3). "In this work, we present the first approach to automatically synthesizing correct-by-construction programs in safe Rust." (abstract, p. 1).

Inference: this is directly relevant to VeruLaw because it treats ownership as proof-search information. RusSOL generates code; Verus verifies code supplied by an author or agent. The paper does not show that RusSOL-generated programs satisfy Verus specifications, and it states that SOL's soundness is not proved against a formal Rust semantics (section 4.2, p. 20).

## technique: let types provide most of the specification

Inference: use this when a function's Rust type rules already constrain ownership, construction, and aliasing. The paper's `singleton(elem: T) -> List<T>` example has no functional annotation: no value of type `T` can be constructed "out of thin air", `elem` cannot be duplicated, and "there are only two possible well-typed solutions—returning an empty or a singleton list" (section 2.1, p. 4). The synthesizer avoids the empty-list solution because it would drop the owned argument `elem` (section 2.1, p. 4).

For `borrow`, the annotation `#[ensures(self.data.is_some() == result.is_ok())]` states only whether the result is `Ok` or `Err`; which `&T` reference to return is left unspecified. The paper states that "the only way to obtain a value of type &T is by pattern matching on &self.data", so the partial postcondition, together with the type signature and Rust's type rules, suffices to synthesize the intended implementation (section 1, p. 2).

Inference: a Verus specification can similarly let Rust ownership carry memory-safety facts while `ensures` states only functional behavior. Verus still requires a proof for the chosen implementation; it does not synthesize a body from a type and postcondition. The inference is a design analogy.

## technique: express preconditions with pure functions

Inference: use a pure helper when a function is meaningful only under a data-structure predicate. For `peek(&self) -> &T`, the paper defines a `#[pure]` executable `len`, annotates `#[requires(self.len() > 0)]`, and RusSOL synthesizes a match whose `Nil` branch is `unreachable!()` and whose `Cons` branch returns `elem` (section 2.1, Fig. 3, p. 5). "RusSOL performs a syntactic check that pure functions do not perform any assignments or calls to non-pure functions." (section 2.1, p. 5).

Inference: in Verus, use a `spec fn` for a mathematical length or predicate, a `requires` clause on the executable function, and a proof that the impossible branch cannot occur. A `spec fn` is non-executable in Verus, so the paper's executable pure helper and Verus's specification function are not interchangeable; this mapping is an inference.

## technique: strengthen postconditions against vacuous implementations

Inference: use a postcondition that distinguishes the intended data transformation, not merely a weak property that many implementations satisfy. An initial `push` postcondition requiring only `(^self).len() == (*self).len() + 1` yields a program that inserts at the end of the list (section 2.1, pp. 5–6). The paper strengthens it so that the list referenced by `self` must be non-empty and its `next` field must point to a list structurally equal (`===`) to the original value of `self`; RusSOL then synthesizes `std::mem::replace` followed by reconstruction (section 2.1, Fig. 4, p. 6). The library specification is shown as `#[extern_spec] #[ensures (result === *dest && ^dest === src)]` on `fn std::mem::replace<T>(dest: &mut T, src: T) -> T;` (section 2.1, p. 6).

Inference: in Verus, write an `ensures` clause over the pre-state using `old(...)` where supported by the Verus language, and use a ghost/spec model to express structural equality. The paper's `^self` and `*self` notation is RusSOL syntax (following Creusot); it must not be copied into Verus. External library specifications remain trusted unless verified or modeled.

## technique: relate re-borrowed references at expiry

Inference: use a final-state relation when a function returns a reference whose caller can mutate the referent after the function returns. Without a postcondition, RusSOL returns `self` for `last_mut` (section 2.1, p. 6). A weak postcondition `(*result).len() == 0` lets the synthesizer assign `List::Nil` to `*self` and return `self`. The stronger condition `(^self).len() == (*self).len() + (^result).len()` relates the original list, the final list, and the list reachable through the returned reference; it leads to recursive traversal to the `Nil` node (section 2.1, p. 7).

The paper explains that here `^self` refers to the point when the caller is done using the returned reference, not immediately after the call; "This specification prevents the synthesizer from modifying the length of the list inside last_mut", and "the caller can use result only to grow the original list" (section 2.1, p. 7). In SOL, the final snapshot of a reference is a prophecy variable, "whose value is initially unknown"; it is resolved when the reference is dropped, by the rule DropRef (section 2.2, p. 10).

Inference: Verus can model a returned mutable reference with a state-machine or ghost token and prove permitted post-call mutations, but it has no RusSOL prophecy-variable synthesis rule. A Verus proof would use ownership, `ensures`, and explicit ghost state; the exact expiry semantics require a separate model.

## technique: translate Rust ownership into SOL heaps

SOL represents a synthesis goal as `{P} _ {Q}`, a pair of symbolic heaps for the pre- and postcondition, with pure formulas constraining snapshots (section 2.2, pp. 7–9). A binding `x : T` is syntactic sugar for a predicate that describes the heap layout of an object of type `T`; bindings are joined by separating conjunction (section 2.2, p. 7). Data constructors and destructors become rules that create values or pattern-match them. `Drop` de-allocates an owned binding, `Rename` emits a move assignment to rename a variable, `Unreachable` closes a branch whose pure formula is inconsistent, and `Constr`/`Destr` are rule schemas instantiated for each data type (sections 2.2–3.3, pp. 8–15).

Snapshots augment heap bindings with the discriminant, field snapshots, and the values of pure functions defined on the type. Preconditions become pure formulas on pre-state snapshots; postconditions constrain result or final-reference snapshots (section 2.2, pp. 9–11). For references, SOL stores current and final snapshots, lifetimes, and blocking sets. Re-borrowing from a mutable reference blocks the original binding; immutable references hold partial permissions; `DropRef` resolves the prophecy when the reference is dropped; `Write` moves an owned value into a mutable reference; and `CopyOut` copies a primitive value out of a reference (sections 2.2–3.3 and Fig. 14, pp. 10–16).

Inference: Verus's closest constructs are executable Rust ownership, ghost state, `spec fn` snapshots, `requires`/`ensures`, loop `invariant`, and `proof fn` lemmas. Verus does not expose SOL heaps or `drop!` proof-search commands. The mapping is conceptual and should not be presented as a Verus implementation.

## technique: bidirectional symbolic execution and gadgets

Inference: use bidirectional search when either the precondition or postcondition gives stronger guidance. SOL derives a program one statement at a time, propagating symbolic heaps forward from the precondition or backward from the postcondition. For `singleton`, backward constructor steps produce the required `Box<List>` and `List` values, while in the empty-list derivation a forward `Drop` step consumes `elem` (section 2.2, Fig. 5, p. 8). The paper calls this "“bidirectional” symbolic execution" (section 2.2, p. 8).

For automation, RusSOL uses gadgets, "admissible rules that fuse small axioms and structural rules" such as frame, consequence, and sequential composition (section 3.4, pp. 16–17). Search proceeds in phases: forward gadgets first decompose or leverage the precondition (e.g., `Destr`, `DestrBorrow`, `CopyOut`); backward gadgets then decompose the postcondition (`Constr`, `ReBorrow`) or match its reference bindings with the precondition (`DropRef`, `ConstrBorrow`, `Write`); finally `Drop`, `Rename`, and `Primitive` bridge the two heaps (section 3.4, p. 17). A branch closes when both symbolic heaps are empty and the pure precondition implies the pure postcondition, checked by an SMT solver (section 3.4, p. 17).

Inference: this suggests a Verus proof-search tool that chooses between generating ghost facts from preconditions and working backward from an `ensures` obligation. Verus itself checks supplied proof code; its solver context and `assert`/lemma structure are not SOL gadgets.

## technique: enforce borrowing with blocking and prophecy

Inference: use lifetime-indexed blocking to prevent an owned value from being used while a borrow is live. SOL represents `let y = &mut x` by adding a lifetime to `x`'s blocking set and a reference binding for `y`; a blocked binding is not used by any statement (section 2.2, p. 10). In `ReBorrow`, for a mutable `x` the re-borrow may be mutable or immutable and `x` gets blocked; for an immutable `x` the re-borrow must be immutable and no blocking is required, since both references hold partial permissions to the same referent (section 3.3, p. 16).

Inference: Verus's linear ghost types and ownership discipline can encode similar permission transfer, but the paper's blocking-set and prophecy rules are specific to SOL and are not Verus syntax. Any Verus implementation must use constructs documented for Verus rather than `invariant(...)` calls, `modifies`, or executable `proof fn` calls.

## technique: best-first phased proof search

Inference: use this when the rule space is large. RusSOL uses best-first backtracking search over an and-or search tree whose nodes are synthesis goals; at each step it expands the lowest-cost leaf by all applicable gadgets, where "The cost of a node is a heuristic function of the size of P and Q." (section 3.4, p. 17). The search is split into the forward, backward, and bridging phases described above, and terminates when it finds a full derivation where all branches are closed (section 3.4, p. 17). The implementation reuses SuSLik's best-first search algorithm mostly unchanged (section 4, p. 17).

Inference: this is a concrete algorithmic option for an agent that proposes Verus proof steps: prioritize the smallest outstanding obligation, keep phase-specific candidate lemmas, and backtrack on verifier failure. The paper provides no evidence that this policy is optimal for Verus.

## evidence, trust, and limitations

The annotated benchmarks contain 117 tasks, of which 115 are solved; of the two failures, one is unsolvable without unsafe code and the other "is caused by RusSOL's inability to synthesize a pure arithmetic expression" (section 4.2, p. 18). Mean synthesis time is 1.8 s; derivations contain up to a maximum of 103 rule applications (rose tree copy); final Rust programs are 5.4 lines long on average (section 4.2, p. 18; Table 1, p. 19). The 100-Crates suite has 2,671 signatures: 1,036/1,036 primitive-return tasks and 1,328/1,635 non-primitive tasks solved (Table 1, p. 19; section 4.2, p. 20). The paper reports: "On average annotations are 27% more concise than the synthesized code", measured in AST nodes; for the SuSLik benchmarks its Code/Spec ratio is "172% higher on average" than SuSLik's (section 4.2, pp. 19–20).

The authors manually checked that all 115 solved annotated programs match the user intent or the original implementation (section 4.2, p. 18), ran the synthesized annotated programs through the Rust compiler and a supported subset through Creusot, and "neither tool uncovered any errors" (section 4.2, p. 20); the 100-Crates solutions were type-checked by the Rust compiler with no errors (section 4.2, p. 20). However, "Proving soundness of the SOL rules themselves would require an established formal semantics for safe Rust that captures both the borrowing rules and functional properties." (section 4.2, p. 20). Thus the stated evidence is empirical type-checking and independent verification, not a metatheoretic soundness proof.

Inference: trusted components include the Rust compiler, Creusot, SOL's unproved correspondence to Rust, library specifications such as `replace`, the SMT solver, benchmark selection, and manual intent judgments. RusSOL lacks traits, arbitrary conditionals (no branch abduction), non-trivial arithmetic synthesis, and unsafe-code generation (section 4.3, p. 21), and its programs have no loops (section 3.1, p. 14). For agent-written verified Rust, the threat is high when a weak specification admits a behaviorally wrong but well-typed program, when unsafe wrappers are trusted, or when unsupported traits and conditionals occur. VL should not redo type-guided synthesis as a generic proposal; it should reuse the paper's lessons about partial specifications and measure Verus-specific proof and contract adequacy.

## techniques for the catalog

- type-guided synthesis — use Rust constructors, ownership, parametricity, and lifetimes to prune implementations before functional reasoning
- pure-function contracts — express preconditions and data predicates through side-effect-free helper functions
- specification strengthening — relate pre-state, final-state, and structural snapshots to exclude vacuous implementations
- synthetic ownership logic — derive safe Rust with separation-logic heaps, constructors, destructors, snapshots, and SMT-checked pure formulas
- borrowing synthesis — enforce lifetime blocking, partial permissions, re-borrowing, prophecy variables, and reference expiry
- bidirectional gadgets — fuse proof rules and search forward from preconditions or backward from postconditions
- phased best-first search — expand lowest-cost goals in forward, backward, and bridging phases with backtracking
- independent evidence — report task denominators, synthesis times, compiler/Creusot checks, intent review, and unsupported features
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Inside an assertion, program variables appear only on the left of a binding, whereas logical variables can appear in snapshots and pure formulas."): read the whole paper text and checked every quotation, number, section and page reference, and technique step against it; changed the abstract quote's capitalization, replaced the SOL description with the paper's own wording, corrected page references (singleton, borrow, peek, push, bidirectional execution, search phases, evaluation), replaced the paraphrased prophecy-variable quote (math symbols) with a shorter exact quote, corrected the last_mut, second-failure, and manual-check descriptions, added the no-loops citation, and marked agent advice as Inference; did not check the Verus-specific statements in the Inference paragraphs, the supplementary material, or the artifact.
