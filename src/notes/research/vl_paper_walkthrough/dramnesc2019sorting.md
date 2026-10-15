# Proof-Based Synthesis of Sorting Algorithms Using Multisets in Theorema
(authored by agents unless marked 🧑)
Tag: `dramnesc2019sorting`, [paper](http://arxiv.org/abs/1909.01747v1)

## scope and result
The paper presents proof-based synthesis in Theorema. Its input is a specification, not a program: a list input condition and a sorted/permutation output condition. A proof of an existential synthesis conjecture supplies witnesses; the witnesses are extracted as conditional rewrite rules. The authors state: “first one proves automatically a synthesis conjecture which is based on the specification (input and output conditions) of the desired function, then the algorithm is extracted automatically from the proof, in form of conditional rewrite rules” (Introduction, p. 76). The case study synthesizes min-sort, quick-sort, insert-sort, merge-sort, and auxiliary `insert`, `split`, and `merge` functions (Introduction, p. 76).

Inference: this is a useful VL design pattern when a verified Rust function can be specified as a relation and its recursive clauses can be recovered from proof witnesses. It is synthesis from a proof search tree, rather than translation of an existing Rust implementation.

## technique 1: multiset specification and noetherian induction

What it is. Represent a list's contents by a finite multiset `M[U]`; sortedness is recursive; correctness requires both `M[output] = M[input]` and `IsSorted[output]`. The paper defines `M[hi] = 0/` and `M[a ` U] = {{a}} ⊎ M[U]`, then defines sortedness by `IsSorted[a ` U] ⇔ (a ≤ U ∧ IsSorted[U])` (Section 2.1, pp. 77–78). The induction order is strict inclusion of corresponding multisets: “we use the Noetherian ordering induced by the strict inclusion of the corresponding multisets” (Introduction, p. 77).

When and steps. Use this for recursive list functions whose recursive argument is strictly smaller in content.
1. Define the input and output predicates and the multiset/list facts (Section 2.1).
2. Form `∀X. I[X] ⇒ ∃Y. O[X,Y]` (Conjecture 1, Section 2.1, p. 78).
3. Skolemize the universal input, introduce an existential metavariable for the output, and split the input with the cover set `{hi, a ` U}` (ST-1, Section 2.2.2, pp. 79–80).
4. On the nonempty branch, add the induction hypothesis for a strictly smaller tail and rewrite the multiset equation (ST-2; splitting proof, Section 4, pp. 85–86).
5. Solve the output metavariable; the resulting witness becomes the right side of a rewrite rule (ST-1, p. 80).

Verus form. Inference: model a list as `Seq<int>` (or a Rust list datatype), define a ghost multiset specification, and state `ensures` for permutation and sortedness. Use a loop `invariant` or recursive `decreases` clause for the well-founded measure. A `proof fn` can establish the multiset decomposition and recursive lemma. The paper's Theorema multiset order and automatic Skolem witnesses do not carry over automatically; Verus requires explicit lemmas and executable Rust clauses.

Evidence and limits. The paper gives complete proof traces for `min`/`Trim` and `split`, and reports four sorting algorithms, but gives no runtime or success-rate denominator. The ordering assumes a total order and finite lists; the paper notes empty-list exceptions to antisymmetry/transitivity (footnote 3, p. 77). The approach can select a nonterminating branch if the chosen recursive call is not smaller: the merge discussion gives this warning: “The corresponding algorithm would have Merge[a ` U,V ] = Merge[Insert[a,U ],V ] as the second clause, which is an infinite loop.” (Section 5, p. 89)

## technique 2: domain-specific inference rules

What it is. The prover augments ordinary logical rules with multiset/list rules. IR-1 forwards a ground atomic fact into a universal assumption; IR-2 rewrites a goal using an assumption; IR-3 reduces composite arguments; IR-4 solves a multiset metavariable by matching; IR-5 expands a composite multiset; IR-6 compresses it; IR-7 uses list equivalence induced by equal multisets; IR-8 splits two element constants into `a ≤ b` and `b < a` (Section 2.2.1, pp. 78–79). The paper's exact descriptions include: “IR-5: Expand multiset” and “IR-6: Compress multiset” (p. 79).

When and steps. Apply IR-5 before induction when a constructor hides the tail multiset; apply IR-6 after an induction/cascade call has produced a function term; use IR-8 whenever two element constants must be ordered; use IR-4 after the equation determines the witness. The split proof follows this sequence: expand `M[b ` U]`, rewrite with the induction hypothesis, branch with IR-8, split the equation, then solve metavariables (Section 4.2, pp. 86–87).

Verus form. Inference: encode these as `proof fn` lemmas about `Seq` and a ghost `Multiset`, then invoke them with `assert`/`assert ... by`; use `if a <= b { ... } else { ... }` for IR-8. Verus has no Theorema inference-rule engine, so rule scheduling is an agent or tactic layer outside the verifier.

Evidence and limits. The rules are demonstrated in the numbered proofs, but no independent benchmark count is reported. They depend on trusted definitions of multiset equality, list equivalence, and the element order.

## technique 3: cover sets, cascading, and split-goal synthesis

What it is. ST-1 creates proof branches from a cover set and extracts patterns/witnesses. ST-3 (“cascading”) creates a new synthesis conjecture when an auxiliary function is needed; ST-4 pairs multisets; ST-5 splits a list around a pivot; ST-6 splits a multiset equation into two equations (Sections 2.2.2, pp. 79–82). In the `min` proof, cascading generates `minA` and `TrimA`; in merge, cascading generates `Insert` (Sections 4.1 and 5, pp. 85–89).

When and steps. Start with the target conjecture; choose a cover term; when the goal contains an unproved operation, create its own existential conjecture; prove that auxiliary conjecture by the same cover/induction process; substitute its witness back; finally emit rewrite rules. The paper's merge proof uses induction on the tail, pairs the head singleton with the recursive multiset, cascades to `Insert`, and solves the output metavariable (Section 5, pp. 88–89).

Verus form. Inference: use separate `proof fn` lemmas for each auxiliary contract, then call those lemmas from the parent proof. A Rust implementation must be written or generated explicitly; Verus does not extract executable code from a proof witness.

## proof boundary and VL relevance
The proof establishes relational correctness of the synthesized rewrite algorithms under the stated order and multiset axioms. Theorema kernel, its inference strategies, definitions, and extraction mechanism remain trusted. No asymptotic measurements or failed-proof totals are given. Existing list-sorting synthesis in Theorema and Isabelle is prior work; VL should reuse the specification-plus-witness idea rather than redo a generic sorting case study. Inference: the direct product threat is low for runtime code but medium for an agent that must invent verified recursive structure: proof-guided decomposition could reduce hallucinated algorithms, while missing termination measures and auxiliary lemmas remain failure points.

## techniques for the catalog
- multiset/noetherian synthesis — specify permutation and sortedness with multisets and use strict multiset decrease for recursive proof synthesis
- domain-specific inference — expand/compress multisets, split order cases, rewrite equivalent lists, and solve witness equations
- cover-set extraction — turn cover branches and existential witnesses into conditional rewrite clauses
- cascading auxiliaries — synthesize `min`, `trim`, `split`, `insert`, and `merge` as subordinate conjectures when the main proof needs them
- split-goal merge — decompose a multiset union into independently solvable equations before reconstructing a sorted output

Checked 2026-10-15 against the paper by a Codex agent for proof_based_synthesis_of_sorting_algorit_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
