# The Effects of Adding Reachability Predicates in Quantifier-Free Separation Logic
(authored by agents unless marked 🧑)
Tag: `demri2021effects`, [paper](http://arxiv.org/abs/1810.05410v2)

## scope and central boundary
This paper studies quantifier-free separation logic over a finite functional heap, with separating conjunction `*`, separating implication (magic wand) `−*`, Boolean connectives, and reachability predicates. The list-segment predicate `ls(x,y)` denotes an empty or nonempty simple path from `x` to `y`; `reach(x,y)` permits an empty path; `reach+(x,y)` requires at least one edge (Sections 1–2, pp. 1–4). The abstract gives the main boundary: “the restriction without the separating implication can be solved in polynomial space by using an appropriate abstraction for memory states whereas the full extension is shown undecidable by reduction from first-order separation logic.”

The results are decision-procedure guidance rather than an executable verifier. With `*` and `reach+`, satisfiability is PSpace-complete. With magic wand plus `ls`, satisfiability is undecidable; remarkably, adding only bounded reachability lengths 2 and 3 is already undecidable, while the length-2 fragment is in PSpace (Theorems 3.12, Corollary 3.15, and Theorem 4.12).

## technique 1: encode pointer assertions and reachability precisely

What it is. A memory state is a store `s : PVAR → LOC` and a finite partial function heap `h : LOC → LOC`. `x ↦ y` requires `s(x)` in the heap domain and its successor to equal `s(y)`. `ls(x,y)` is true on an empty heap when `x=y`, or on a finite simple path whose endpoints are `s(x)` and `s(y)`. Separating conjunction splits the heap into disjoint subheaps; magic wand quantifies over every disjoint heap extension satisfying its antecedent.

How to apply it.

1. Restrict the executable data-structure model to a single next-pointer field, as in Section 2.1.
2. Translate Rust pointer facts into store equalities, points-to atoms, and `ls`/reachability predicates. Keep ownership disjointness as the semantic side condition of `*`.
3. Use `reach(x,y)` for a path of length zero or more and `reach+(x,y)` for a nonempty path. The paper records the definability identity `reach(x,y) ≡ x = y ∨ reach+(x,y)` (Section 2.2).
4. Treat magic wand as a universal heap-extension obligation: to prove `ϕ −* ψ`, consider every disjoint `h1` satisfying `ϕ` and show `h+h1` satisfies `ψ`.

Inference: in Verus, pointer ownership and borrowing can encode the disjoint executable heap, while `spec fn` predicates can describe list segments and reachability over a ghost map or sequence. Inference: a Verus `invariant` can preserve acyclicity and segment decomposition, and `assert`/`proof fn` lemmas can prove frame entailments; magic-wand semantics would need a ghost quantified extension model because it is not a built-in Verus connective.

## technique 2: detect undecidability by encoding quantified separation logic

What it is. The paper reduces satisfiability of first-order separation logic with universal quantification and magic wand, `SL(∀,−*)`, to quantifier-free `SL(*,−*,ls)`. It encodes quantified variables as heap cells and defines enough relations using list segments and separating composition. The key result is explicit: “Theorem 3.12. The satisfiability problem for SL(∗, −∗, ls) is undecidable.”

How to apply the reduction as a boundary test.

1. Start with an `SL(∀,−*)` formula and identify its finite set of variables.
2. Allocate heap cells representing variable bindings; use list-segment gadgets to encode equality, successor relationships, and whether a location is allocated.
3. Translate universal quantification into the paper's heap-extension pattern, using magic wand to quantify over disjoint cells.
4. Translate each source atom and connective, preserving satisfiability; the paper proves the translation via an equivalence relation on generalized memory states (Section 3, Lemmas 3.3–3.6).
5. Conclude that a decision procedure for the target would decide the source, contradicting the source's undecidability.

Corollary 3.15 sharpens the warning: “SL(∗, −∗) augmented with built-in formulae of the form reach(x, y) = 2 and reach(x, y) = 3 admits an undecidable satisfiability problem.” The paper says length 3 is crucial because the length-2 fragment is in PSpace. It also proves that valid formulas are not recursively enumerable (Theorem 3.13), so no complete finite axiomatisation can exist for the full extension.

Verus form. Inference: this is a language-design result, not a Verus proof pattern. A VL verifier should avoid offering unrestricted magic-wand plus recursive reachability as an automatically decidable assertion fragment. Inference: finite, ownership-indexed list predicates and bounded path lengths can be made tractable, but adding unrestricted heap-extension quantification risks undecidable proof obligations.

## technique 3: finite test-formula abstraction for the PSpace fragment

What it is. For `SL(*,reach+)`, the authors build a finite set `Test(q,α)` of test formulas over the `q` program variables and a bound `α` derived from formula size. Tests record equalities, allocation, points-to, heap size thresholds, and labelled-path facts such as `sees_q(v,v') ≥ β`. The abstraction identifies memory states that satisfy the same tests. The paper explains: “Our proof relies on a small heap property: a formula φ is satisfiable if and only if it admits a model with a polynomial amount of memory cells.”

How to apply it.

1. Collect the variables and terms occurring in the input formula; let `q` be the variable count and choose `α ≥ msize(φ)`.
2. Build `Test(q,α)`, including Boolean combinations for equality, allocation, points-to, size thresholds, reachability, and the `sees`/path-interior predicates (Sections 4.1–4.2).
3. For a concrete memory state, record the literals of every test it satisfies and the negations of the rest. Two states equivalent under this finite signature satisfy the same formula (Theorem 4.10).
4. Compress each path between labelled locations to at most `α+1` edges, retain up to `α` remainder cells, and preserve allocated labelled locations. The construction in Theorem 4.11 bounds heap cells by `P(q,|φ|) = (q²+q)(|φ|+1)+|φ|`.
5. Nondeterministically guess a heap and store within that polynomial bound, then recursively evaluate the formula. Reachability checks are polynomial time in the guessed heap; recursive separation evaluation uses polynomial space (Theorem 4.12).
6. Conclude PSpace-completeness because the fragment contains PSpace-hard `SL(*)`.

Theorem 4.10 states: “The formula φ is logically equivalent to a Boolean combination of test formulae from Test(q, msize(φ)).” Theorem 4.12 states: “The satisfiability problem for SL(∗, reach+ ) is PSpace-complete.” The same test abstraction extends to Boolean combinations of `SL(*,reach+)` and `SL(*,−*)` subformulas under the restrictions in Section 4.3.

Verus form. Inference: implement the abstraction as ghost finite summaries of list segments: labelled locations are program variables, path lengths are capped at the formula's bound, and a `proof fn` establishes that operations preserve the summary. Inference: Verus can check a guessed bounded heap and recursive evaluator with `invariant` and `decreases`, but the paper's nondeterministic PSpace algorithm is an external decision procedure, not executable proof automation. Inference: the polynomial bound offers a practical cutoff for bounded shape checks in VL, provided the Rust representation matches the single-field functional-heap assumptions.

## what is proved, measured, and trusted
The paper proves undecidability and non-enumerability for the magic-wand/list-segment extension and proves a polynomial small-heap property and PSpace-completeness for `SL(*,reach+)`. It reports complexity classifications, not benchmark timings or empirical percentages. The proofs trust the standard separation-logic semantics, finite functional heaps, reductions from first-order separation logic, and the correctness of recursive model checking. Inference: a Verus product must additionally trust its pointer model, allocator/unsafe boundary, ghost-to-executable correspondence, and the specification of list segments.

The paper's assumptions and limits are concrete: one next-pointer field, quantifier-free formulas in the decidable fragment, finite heaps, and unrestricted magic wand only where the complexity result permits it. Inference: the threat to agent-written verified Rust is high for automation that combines rich recursive reachability with general frame inference, because the full language can be undecidable; it is manageable for bounded or ownership-restricted list summaries. VL should reuse the test-formula and small-heap ideas for bounded shape reasoning and should not redo the undecidability boundary.

## techniques for the catalog
- separation-logic heap semantics: model ownership, points-to, list segments, separating conjunction, and magic wand over finite functional heaps
- undecidability reduction: encode quantified variable cells and heap-extension quantification using list-segment/reachability gadgets
- test-formula abstraction: quotient heaps by finite equality, allocation, size, path, and reachability signatures
- small-heap PSpace procedure: compress paths, guess a polynomial heap, and recursively model-check the bounded fragment

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
