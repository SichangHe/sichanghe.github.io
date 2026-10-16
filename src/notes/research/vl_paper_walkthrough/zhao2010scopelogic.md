# Scope Logic with Local Reasoning and Pre/Post-State Properties
(authored by agents unless marked 🧑)
Tag: `zhao2010scopelogic`, [paper](http://arxiv.org/abs/1012.2553v1)

## scope logic and its claims

Zhao and Li extend Hoare logic for pointer programs with explicit memory-unit access, memory-scope functions, pre-state terms, and axioms for pointer, record, array, and allocation behavior. The aim is local reasoning without separation logic's large collection of heap operators. The introduction states: “This paper presents an extension to Hoare logic for verification of pointer programs.” (Section 1, p. 1) It also says, “The concept pre-state terms are introduced in this paper.” (Section 1, p. 2) The central preservation idea is stated as: “The basic idea is that during the program execution, a recursive function is evaluated to the same value as long as no memory unit in its memory scope is modified.” (Abstract, p. 1) Their running binary-search-tree example updates one node while preserving the tree invariant and all assertions whose memory scopes do not overlap the modified cells.

The logic assumes a three-valued partial-function semantics (LPF), no deallocation, and a particular abstract memory-layout model. It proves sound proof rules and demonstrates a binary-search-tree update, Schorre-Waite (appendix), and selection-sort with indirectly specified components. It does not mechanise a compiler, Rust ownership, or a separation between concurrent threads.

## technique 1: pre-state terms

what it is

Write an expression with a left arrow, `←e`, to mean that `e` is evaluated in the state before execution. This allows a postcondition to relate old and new pointer structures or values without introducing a separate ghost variable for every term.

when to use it

Use pre-state terms whenever a postcondition must compare a field, map, or recursive function before and after a command. They are especially useful after pointer updates and in sequential composition, where each command has a different intermediate state.

how to do it

1. Define `←e` only for a term `e` containing no pre-state subterm. Its memory scope is empty because its value is fixed before execution (Definition 1, Section 3.1, p. 3).
2. In a precondition, treat `e` and `←e` as interchangeable using PRE-1 and PRE-2.
3. In a postcondition, write the old recursive value explicitly. The paper's BST specification uses pre-state `Map(root)` to state that the resulting map equals the original map with one key changed (Example 3, Section 2.4, pp. 2–3).
4. For sequential composition, first prove assertions with logical variables, then substitute each variable with a pre-state term using SUBSTITUTION. The paper demonstrates this for `x := x + 1; y := y − z` (Example 8, Section 6.6, pp. 8–9).

Verus form (inference)

Inference: Verus has no paper-defined arrow syntax; use ghost variables or snapshots captured in a `proof fn`, then state `ensures` relating the post-state to those ghosts. For a mutable reference, capture the old value before mutation in ghost state and prove the update relation. This is an inference because the paper is a logic design, not a Verus encoding.

evidence and limits

Pre-state terms preserve exact old values only under the LPF definedness rules. The logic requires preconditions and postconditions used by WHILE-ST and SEQ-ST to contain no pre-state terms; substitution reintroduces them after the structural proof (Section 6.5–6.6, pp. 8–9).

## technique 2: derive memory-scope functions

what it is

For every recursive specification function `f`, define `M(f)` to over-approximate the set of memory units read while evaluating `f`. For a term `e`, `M(e)` is the union of scopes of its subterms and function calls. A pre-state term has empty scope.

when to use it

Use scopes to decide whether a command can affect an assertion. If the command modifies set `E` and `M(ρ) ∩ E = ∅`, then predicate `ρ` is outlying and remains true.

how to do it

1. Define pointer access operators `*`, `&[]`, and `&→n`; `M(*) (x) = {x}`, while address and basic operators have empty scope (Sections 1 and 3.2, pp. 1, 3–4).
2. For a recursive definition `f(x)=e`, derive `M(f)(x)=M(e)` with SCOPE-FUNC. For `NodeSet`, the paper derives a scope containing the `l` and `r` fields recursively (Example 4, pp. 4–5).
3. Compute a formula scope as the union of term scopes, including both sides of equalities and all quantified bodies (Section 3.2, p. 5).
4. Apply the scope axioms `M(p) ↓ ⇒ M(M(p)) ⊆ M(p)` and `M(e) ↓ ⇒ M(M(e)) ⊆ M(e)` (SCOPE-1 and SCOPE-2, p. 5) to show that scope evaluation itself does not read outside the recorded set.

Verus form (inference)

Inference: encode each recursive Rust model predicate as a `spec fn` returning a set of addresses or abstract locations, and prove a lemma that the predicate depends only on that set. Use `requires` that modified locations are disjoint from the scope and `ensures` that the predicate is preserved. Verus's ownership and `Set` specifications can represent the abstraction, but pointer-layout axioms must be replaced with Rust reference validity facts.

evidence and limits

The scope is explicitly an over-approximation, so it may include more memory than a function actually reads. This loses proof precision but preserves soundness. Scope correctness depends on the recursively derived definitions and LPF definedness; no automated complexity or benchmark is reported.

## technique 3: local reasoning by predicate variables

what it is

Use a predicate variable `ρ` plus `Outlying(ρ,E)`, an abbreviation for `ρ ∧ (M(ρ) ∩ E = ∅)`. A local Hoare triple can then be expanded into a global one by substituting any predicate whose scope is disjoint from the command's modification over-approximation.

when to use it

Use this for code that modifies a small, known set of locations inside a large structure, such as updating one BST field while preserving unrelated properties.

how to do it

1. Determine an over-approximation `E` of all modified memory units.
2. Add `Outlying(ρ,E)` to the precondition and `ρ` to the postcondition.
3. Prove the local triple for arbitrary predicate symbol `ρ`.
4. To instantiate it globally, apply Theorem 1. It requires a predicate `r` with `M(r) ∩ E = ∅`, then derives `p ∧ r {s} q ∧ r` from the local triple (Section 4, p. 6).
5. In the BST example, use `E = {&p} ∪ FldD(root)`; the theorem preserves any property outlying that set while the algorithm changes the selected node (Example 5, p. 6).

Verus form (inference)

Inference: write a generic `proof fn` preservation lemma parameterised by a predicate or ghost fact, with a disjointness `requires`. Instantiate it for concrete invariants. Verus does not quantify over arbitrary executable predicates in the same way, so the predicate-variable pattern may require a family of lemmas or a ghost trait specification.

evidence and limits

Theorem 1's proof substitutes `ρ` with `r`, expands `Outlying`, applies PRE-2, and uses the consequence rule (Section 4, p. 6). It is a logical frame principle based on scopes, not a heap-separation theorem; aliasing and layout assumptions remain in the memory axioms.

## technique 4: pointer assignment and allocation rules

what it is

Modify Hoare's assignment axiom so pointer expressions identify memory units and right-hand sides are evaluated on the pre-state. Add an allocation axiom that records the fresh block and initializes pointer fields to `nil`.

how to do it

1. For `*e1 := e2`, require `e1 ≠ nil` and `e2` defined in the pre-state.
2. State `Outlying(ρ,{e1})` and conclude that `ρ` remains true while the new cell equals the old value of `e2`; this is ASSIGN-ST (Section 6.2, p. 7).
3. For `*e1 := alloc(t)`, require a valid destination and conclude that the old destination now points to a fresh block whose pointer fields satisfy `Init`; preserve predicates outlying the destination and new block (ALLOC-ST, Section 6.3, pp. 7–8).
4. Compose assignments with SEQ-ST. The paper's allocation example derives non-nil record fields and initialized `l`/`r` pointers before assigning `k` and `d` (Example 7, p. 8).
5. Use IF-ST, WHILE-ST, CONSEQ, conjunction/disjunction, quantifier, and SUBSTITUTION rules to build larger proofs. WHILE-ST requires the invariant to imply that the guard is defined (Section 6.4–6.6, pp. 8–9).

Verus form (inference)

Inference: Rust references make non-null and allocation validity largely type-checked, while mutable borrowing supplies alias restrictions absent from the paper. Express assignment effects with `ensures`, allocation initialization with a constructor contract, and loop preservation with `invariant`. Recursive tree invariants need `spec fn` predicates and `proof fn` lemmas about child disjointness.

evidence and limits

The paper's running proof uses `isHBST`, `Map`, `Dom`, `NodeSet`, and `FldD` recursively; the conclusion lists the assumed memory properties, including valid non-nil pointers and disjoint-or-contained blocks (Section 10, pp. 9–10). The logic has no deallocation statement, so reclamation and dangling-pointer behavior are outside its model.

## trust boundary and transfer to Verus

The paper proves soundness of its scope, pre-state, pointer, allocation, and Hoare proof rules relative to LPF and its abstract memory axioms, and demonstrates substantial examples including Schorre-Waite in an appendix. It reports no runtime, proof-time, or success-rate denominator. Trusted assumptions include memory-layout axioms, no deallocation, partial-function semantics, and the soundness of recursive-function definitions.

Inference: VL should reuse the idea of generating a conservative read/modify footprint for every recursive invariant and using disjointness lemmas to preserve unrelated facts. Existing scope logic means VL should not reinvent a frame rule for tree and pointer specifications without comparing it to this derivation. Inference: the product threat is alias and footprint mis-specification—an agent may under-approximate a recursive predicate's reads, causing a false preservation argument. Rust's ownership helps, but unsafe code and raw pointers still require explicit footprint lemmas.

## techniques for the catalog

- pre-state terms — use old-state expressions in postconditions and introduce them after structural sequential proofs by substitution
- memory-scope functions — derive recursive read-footprint functions and union them through terms and formulas
- scope-based local reasoning — preserve any predicate whose scope is disjoint from an over-approximation of modified cells
- pointer and allocation rules — require defined non-null targets, model old RHS values, and specify fresh initialized blocks

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
