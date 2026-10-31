# Scope Logic with Local Reasoning and Pre/Post-State Properties
(authored by agents unless marked 🧑)
Tag: `zhao2010scopelogic`, [paper](http://arxiv.org/abs/1012.2553v1)

## scope logic and its claims

Zhao and Li extend Hoare logic for pointer programs with explicit memory-unit access, memory-scope functions, pre-state terms, and axioms for pointer, record, array, and allocation behavior. The paper argues that its axioms and proof rules are simpler than those of Separation Logic: for Separation Logic it counts “totally 14 axioms and proof rules”, five special formula classes with 5 axioms, and 11 more axioms for composite types (Sections 1 and 10, pp. 2, 19). The introduction states: “This paper presents an extension to Hoare logic for verification of pointer programs.” (Section 1, p. 2) It also says, “The concept pre-state terms are introduced in this paper.” (Section 1, p. 2) The central preservation idea is stated as: “The basic idea is that during the program execution, a recursive function is evaluated to the same value as long as no memory unit in its memory scope is modified.” (Abstract, p. 1) Their running binary-search-tree example sets field D of the node whose key equals k, and the specification says the tree is still a search tree and its map equals the old map with k mapped to d (Example 3, pp. 5–6).

The logic assumes a three-valued partial-function semantics (LPF) (Section 2.4, p. 5), no deallocation (Section 5.2, p. 11), and an abstract memory-layout model given by axioms (Section 5, pp. 10–11). The paper applies it to a binary-search-tree update (Section 9, Figure 4), the Schorr-Waite algorithm (Appendix A), and selection-sort with an indirectly specified comparison `order` (Appendix B). The paper presents axioms and proof rules and does not contain a soundness proof or a mechanised implementation; its future work lists function calls, function pointers, classes/objects and generics (Section 10, p. 20). It does not treat Rust ownership or concurrency.

## technique 1: pre-state terms

what it is

Write an expression with a left arrow, `←e`, to mean that `e` is evaluated in the state before execution. This allows a postcondition to relate old and new pointer structures or values without introducing a separate ghost variable for every term.

when to use it

Use pre-state terms whenever a postcondition must compare a field, map, or recursive function before and after a command. They are especially useful after pointer updates and in sequential composition, where each command has a different intermediate state.

how to do it

1. Define `←e` only for a term `e` containing no pre-state subterm. Its memory scope is empty because its value is not modified by the execution (Definition 1, Section 3.1, p. 7; Section 3.2, p. 7).
2. In a precondition, treat `e` and `←e` as interchangeable using PRE-1 and PRE-2.
3. In a postcondition, write the old recursive value explicitly. The paper's BST specification uses pre-state `Map(root)` to state that the resulting map equals the original map with one key changed (Example 3, Section 2.4, pp. 5–6).
4. For sequential composition, first prove assertions with logical variables, then substitute each variable with a pre-state term using SUBSTITUTION. SUBSTITUTION (Section 7, p. 15) substitutes `x` with `e` in the precondition and with `←e` in the postcondition, provided the precondition implies `e ↓`. The paper demonstrates this for `x := x + 1; y := y − z` and then a while loop (Example 8, Section 6.6, pp. 14–15).

Verus form (inference)

Inference: Verus has no paper-defined arrow syntax; use ghost variables or snapshots captured in a `proof fn`, then state `ensures` relating the post-state to those ghosts. For a mutable reference, capture the old value before mutation in ghost state and prove the update relation. This is an inference because the paper is a logic design, not a Verus encoding.

evidence and limits

The paper requires the invariant `p` of WHILE-ST and the formulas `p`, `q`, `r` of SEQ-ST to contain no pre-state term (Sections 6.5–6.6, p. 13), so pre-state terms must be introduced after the structural proof by SUBSTITUTION (Example 8, pp. 14–15). Inference: because SUBSTITUTION needs `p ⇒ e ↓`, old-value reasoning is only as good as the proof that `e` is defined in the pre-state.

## technique 2: derive memory-scope functions

what it is

For every recursive specification function `f`, define `M(f)` to over-approximate the set of memory units read while evaluating `f`. For a term `e`, `M(e)` is the union of scopes of its subterms and function calls. A pre-state term has empty scope.

when to use it

Use scopes to decide whether a command can affect an assertion. If the command modifies set `E` and `M(ρ) ∩ E = ∅`, then predicate `ρ` is outlying and remains true.

how to do it

1. Define pointer access operators `*`, `&[]`, and `&→n`; `M(*)(x) = {x}`, while basic operators, `&→n`, `&[ ]`, `&v` and `nil` have empty scope (Sections 2.1 and 3.2, pp. 4, 7).
2. For a recursive definition `f(x)=e`, derive `M(f)(x)=M(e)` with SCOPE-FUNC. For `NodeSet`, the paper derives a scope containing the `l` and `r` fields recursively (Example 4, p. 8).
3. Compute a formula scope as the union of term scopes, with rules for boolean terms, `=`, `==`, `∧`, `¬` and `∀` (Section 3.2, pp. 8–9).
4. Apply the scope axioms `M(p) ↓ ⇒ M(M(p)) ⊆ M(p)` and `M(e) ↓ ⇒ M(M(e)) ⊆ M(e)` (SCOPE-1 and SCOPE-2, p. 9). The paper's reason is that all memory units accessed while evaluating `M(e)` are also accessed while evaluating `e`.

Verus form (inference)

Inference: encode each recursive Rust model predicate as a `spec fn` returning a set of addresses or abstract locations, and prove a lemma that the predicate depends only on that set. Use `requires` that modified locations are disjoint from the scope and `ensures` that the predicate is preserved. Verus's ownership and `Set` specifications can represent the abstraction, but pointer-layout axioms must be replaced with Rust reference validity facts.

evidence and limits

The paper says `M(f)` “computes the set of memory units accessed during the evaluation” of `f` (Section 3.2, p. 7); the appendices use simplified scope functions called over-approximations (Figures 3, 6, 10, pp. 8, 23, 28). The SCOPE axioms are stated as axioms, not proved. No automation, complexity result or benchmark is reported. Inference: a hand-written over-approximation that is too small would make a preservation argument unsound, and one that is too large would make the disjointness premise harder to discharge.

## technique 3: local reasoning by predicate variables

what it is

Use a predicate variable `ρ` plus `Outlying(ρ,E)`, an abbreviation for `ρ ∧ (M(ρ) ∩ E = ∅)`. A local Hoare triple can then be expanded into a global one by substituting any predicate whose scope is disjoint from the command's modification over-approximation.

when to use it

Use this for code that modifies a small, known set of locations inside a large structure, such as updating one BST field while preserving unrelated properties.

how to do it

1. Determine an over-approximation `E` of all modified memory units.
2. Add `Outlying(ρ,E)` to the precondition and `ρ` to the postcondition.
3. Prove the local triple for arbitrary predicate symbol `ρ`.
4. To instantiate it globally, apply Theorem 1. Given the local triple and a second premise `p ∧ r ⇒ (M(r) ∩ E = ∅)` (with `r` having its pre-state terms replaced by their original forms), it derives `p ∧ r {s} q ∧ r` (Theorem 1, Section 4, p. 10; the paper calls an application of it an expanding).
5. In the BST example, specification (1) uses `E = {&p} ∪ FldD(root)` (Example 3, p. 5; the program variable in Figure 1 is `pt`, and Figure 4 uses `MSet = {&pt} ∪ FldD(root)`); Example 5 says any `ρ` irrelevant to that variable and to the field D of every node still holds afterward (p. 10).

Verus form (inference)

Inference: write a generic `proof fn` preservation lemma parameterised by a predicate or ghost fact, with a disjointness `requires`. Instantiate it for concrete invariants. The predicate-variable pattern may need a family of lemmas or a ghost trait specification, depending on what Verus can quantify over; this was not checked.

evidence and limits

Theorem 1's proof substitutes `ρ` with `r`, expands `Outlying`, applies PRE-2, and uses the consequence rule (Section 4, p. 10). Inference: it is a frame principle based on scopes rather than on heap separation; aliasing and layout assumptions remain in the memory axioms (Section 5).

## technique 4: pointer assignment and allocation rules

what it is

Modify Hoare's assignment axiom so pointer expressions identify memory units and right-hand sides are evaluated on the pre-state. Add an allocation axiom that records the fresh block and initializes pointer fields to `nil`.

how to do it

1. For `*e1 := e2`, require `e1 ≠ nil` and `e2` defined in the pre-state.
2. State `Outlying(ρ,{e1})` in the precondition and conclude that `ρ` remains true while the new cell equals the old value of `e2`; this is ASSIGN-ST (Section 6.2, p. 12).
3. For `*e1 := alloc(t)`, require `e1 ≠ nil` and `Outlying(ρ,{e1})`, and conclude that the old `*e1` is non-nil, satisfies `Init` (all pointers in its block are `nil`), and that `Outlying(ρ, Block(*←e1))` holds; the text says the new block was unreachable on the pre-state and that only the cell `e1` and the new block are modified (ALLOC-ST, Section 6.3, pp. 12–13).
4. Compose assignments with SEQ-ST. The paper's allocation example `t := alloc(Node); t → k := k; t → d := d` derives `t ≠ nil`, `t → l = nil`, `t → r = nil`, `t → k = k` and `t → d = d` (Example 7, p. 13).
5. Use IF-ST, WHILE-ST, CONSEQ, conjunction/disjunction, quantifier, and SUBSTITUTION rules to build larger proofs. IF-ST, WHILE-ST and SEQ-ST are in Sections 6.4–6.6 (p. 13) and the others in Section 7 (p. 15). WHILE-ST requires the invariant to imply that the guard is defined.

Verus form (inference)

Inference: Rust references make non-null and allocation validity largely type-checked, while mutable borrowing supplies alias restrictions absent from the paper. Express assignment effects with `ensures`, allocation initialization with a constructor contract, and loop preservation with `invariant`. Recursive tree invariants need `spec fn` predicates and `proof fn` lemmas about child disjointness.

evidence and limits

The paper's running proof uses `isHBST`, `Map`, `Dom`, `NodeSet`, and `FldD` (Figure 2, p. 6) and lists properties of these functions without proving them (Section 9, p. 17). The conclusion lists the memory properties of the model, including that a non-nil pointer refers to a valid memory unit or block and that two blocks are disjoint or nested (Section 10, pp. 17–19). The logic has no deallocation statement (Section 5.2, p. 11). Inference: reclamation and dangling-pointer behavior are therefore outside its model.

## trust boundary and transfer to Verus

The paper gives axioms and proof rules for its scope, pre-state, pointer, allocation, and Hoare rules, but contains no soundness proof or machine-checked development. It demonstrates the BST example (Figure 4), the Schorr-Waite algorithm (Appendix A, which proves the assertions for the sequential statements in lines 7, 9 and 11, Section A.4, p. 23, and gives the framework in Figure 7) and selection-sort (Appendix B). It reports no runtime, proof-time, or success-rate denominator. Assumptions stated in the paper include the memory-layout axioms (Section 5), no deallocation, LPF partial-function semantics, and, for selection-sort, the five conditions on `order` (Section B.1, p. 26). Inference: the stated properties of recursive functions and the SCOPE axioms are also trusted.

## techniques for the catalog

- pre-state terms — use old-state expressions in postconditions and introduce them after structural sequential proofs by substitution
- memory-scope functions — derive recursive read-footprint functions and union them through terms and formulas
- scope-based local reasoning — preserve any predicate whose scope is disjoint from an over-approximation of modified cells
- pointer and allocation rules — require defined non-null targets, model old RHS values, and specify fresh initialized blocks
