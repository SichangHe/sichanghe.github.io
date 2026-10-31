# Completeness of Cyclic Proofs for Symbolic Heaps
(authored by agents unless marked 🧑)
Tag: `tatsuta2018cyclic`, [paper](http://arxiv.org/abs/1804.03938v2)

## scope and result
The paper defines CSLIDω, a cyclic proof system for separation-logic symbolic heaps with a general class of inductive definitions, proves soundness and completeness, and gives a terminating validity decision procedure. The abstract states: “This paper proposes a cyclic proof system for symbolic heaps with general form of inductive definitions, and shows its soundness and completeness.” (Abstract, p. 1). It also reports that “The decision procedure is feasible since it is nondeterministic double-exponential time complexity.” (Abstract, p. 1). The object proved is entailment validity, not correctness of an implementation or an executable Rust program.

The input language is first-order separation logic with `emp`, points-to atoms, inductive predicates, pure equality/disequality, and separating conjunction. A definition clause has a root cell and recursively called predicates. Two local restrictions are central: strong connectivity (the set of roots of the recursive calls equals the set of existential variables, written “{zi | i ∈ I} = z⃗”) and decisiveness (all existential variables occur in the root cell's fields). The paper gives list segments, doubly-linked lists, nested lists, and skip lists as examples (Section 2.1, pp. 2–3). It explicitly says that “The strong connectivity implies the bounded treewidth condition.” (Section 2.1, p. 3). This restriction is an assumption of the decision and completeness result.

## technique: make cyclic proof search structurally finite
What it is: use cyclic proofs whose buds can be discharged by a previous, renaming-equivalent judgment, while extending the succedent and rule language enough to preserve validity. The authors identify the core design: “We use unfold-match and split, namely, first unfold inductive predicates on both sides (antecedent and succedent), next remove the same x 7→ ( ) on both sides, then split the entailment by separating conjunction.” (Introduction, p. 1).

How to apply it:
1. Represent each inductive predicate by definition clauses satisfying strong connectivity and decisiveness (Section 2.1, pp. 2–3).
2. Extend formulas with `t ↓` (the term is allocated) and `t ↑` (the term is not allocated), and allow disjunction in the succedent. The paper says: “We will introduce atomic formulas t ↓ and t ↑ which mean t is in the heap and t is not in the heap respectively, and put ↓ or ↑ for each variable in both antecedent and succedent.” (Introduction, pp. 1–2).
3. If a common root is absent, use the factor rule: transform a disjunct that lacks candidate root `x` into `(Q(x) —∗ P(y)) ∗ Q(x)` so both sides expose that root (Introduction, p. 2; Section 5, pp. 7–11).
4. Unfold matching predicates on both sides, add equalities needed for a match, and remove the common points-to atom with the match rule (Introduction, p. 1; Section 10.2, pp. 18–23).
5. Split existential scopes and separating conjunctions. The paper's transformation turns `∃w((P(x,w) ∧ w↓) ∗ Q(y,w))` into `∃w((P(x,w) ∧ w↓) ∗ (Q(y,w) ∧ w⇑))` and then into a separating conjunction of two separately quantified formulas. Here `t ⇑` abbreviates `t ↑ ∧ ¬L(t)`: `t` is neither in the heap nor a leaf (Section 3.1, p. 4). The split is justified by the existential-amalgamation rules (Introduction, p. 2; Section 6, pp. 11–13; Section 10.2, pp. 20–21, 23, and Lemma 10.3, p. 24).
6. Normalize each resulting judgment, eliminate renaming-equivalent disjuncts, and close a repeated judgment as a cyclic bud using the earlier companion judgment (Section 10.2, pp. 18–24).
7. The proof system replaces the usual global trace condition with a local one: “Instead of the global trace condition in ordinary cyclic proof systems [7], CSLIDω requires some (∗ 7→) rule between a bud and its companion.” (Section 4.2, p. 5). Soundness uses that the heap size decreases going up through (∗ 7→) (Section 8, p. 14).

Verus form (Inference): model a symbolic heap as a ghost abstract heap map plus ownership predicates. Use executable Rust only for the data-structure operations; state-machine or ghost state captures allocated roots and separation. Encode the inductive predicate as a recursive `spec fn` and prove unfold/match lemmas as `proof fn`s. A cyclic bud becomes a lemma whose `ensures` is discharged by an earlier induction measure or a well-founded decreases clause. The paper's separation connective and strong wand do not carry over automatically: Verus requires explicit map disjointness and ownership facts, and the solver does not infer the paper's cyclic proof rule.

Evidence: the paper proves soundness of the factor, existential-amalgamation, and `(*)`-split rules in Sections 5–7 (pp. 7–14), then soundness of CSLIDω in Section 8 (pp. 14–15). It proves completeness in Theorem 17.2: “The system CSLIDω is complete. Namely, if a given entailment J is valid, then it is provable in CSLIDω.” (Section 17, p. 36). The cyclic closure is therefore justified by a theorem, not by an empirical timeout.

Limits: unrestricted inductive definitions are undecidable (Introduction, p. 1); the result assumes the paper's local restrictions and finite arities. Inference: translating arbitrary Rust aliasing into this heap model would itself be a substantial trusted modeling step.

## technique: decision algorithm with normal forms and groups
What it is: a nondeterministic search algorithm `Main`/`MainLoop` that explores rule applications while counting a finite set of normal forms up to variable renaming. Groups keep separating-conjunction splits aligned with antecedent heap components. Definition 10.1 defines a group from `Roots + Cells` variables; Definition 10.2 requires a normal form to have one antecedent group, matching roots and cells across each succedent disjunct, definedness/equality conditions, and bounded wand depth (Section 10.1, p. 17).

How to apply it:
1. `Main` case-splits allocation (`↓`/`↑`), equalities and disequalities, and satisfiability, then sends each subgoal to `MainLoop` (Section 10.2, pp. 18, 21–22).
2. `MainLoop` first closes a judgment already in its history `H`; otherwise it factors a common root, branching on candidates when necessary (Section 10.2, pp. 18–23).
3. Unfold, match, remove the common points-to, and check the empty-heap termination case (Section 10.2, pp. 19–24).
4. Split existential scopes and separating conjunctions until one group remains, then normalize by removing fresh-variable and unnecessary-disequality material (Section 10.2, pp. 20–23).
5. Add the normalized judgment to `H` and iterate. A repeated judgment is discharged by substitution and the bud-companion relation (partial-correctness proof, Section 10.3, p. 24).

The loop invariant records that every active judgment is nearly a normal form, has a satisfiable antecedent, and never increases the antecedent's cell variables (Lemma 10.4, p. 25). Finiteness is proved by bounding predicate arities, symbols, variables, disjuncts, and conjunctions; “The set of normal forms with (V0 , d) up to variable renaming is finite.” (Lemma 10.5, p. 25). Consequently every process terminates or fails (Lemma 10.6, p. 26), and Proposition 10.7 gives nondeterministic double-exponential time.

Verus form (Inference): use a ghost `Set`/`Map` of pending goals and a ghost history of normalized goal keys. A recursive proof routine can carry a decreases measure based on the finite normal-form bound; each branch proves preservation of an invariant describing disjoint heap fragments. Rust code would not execute this search unless separately implemented; proof-only search belongs in `proof fn`s or specifications.

Evidence: partial correctness (Lemma 10.3, p. 24) maps each step of `Main`, `MainLoop`, `Factor`, `Unfold`, `Match`, `Split`, and `Normalize` to named inference rules, for example `Unfold` to (Pred L) and (Pred R), and (∗)-Split to rules (∗) and (↑ Elim). Completeness combines local completeness (Lemma 17.1) with termination and soundness to show valid input returns `Yes` and invalid input returns `No` (Lemma 17.1, p. 35; Theorem 17.2, p. 36). No benchmark denominator or implementation runtime is reported; the complexity claim is a proof-theoretic upper bound.

## techniques for the catalog

- cyclic unfold-match-split: expose matching roots, remove common cells, split heap components, and close repeated normalized goals as cyclic buds
- finite normal-form search: enforce group and definedness invariants so only finitely many goal shapes exist up to variable renaming
- factor and strong-wand preparation: introduce a common root into disjuncts that lack it while preserving entailment validity
- completeness by local completeness plus termination: choose locally complete branches, then combine the finite search argument with soundness to decide validity
