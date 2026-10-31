# Proof-Based Synthesis of Sorting Algorithms Using Multisets in Theorema
(authored by agents unless marked 🧑)
Tag: `dramnesc2019sorting`, [paper](https://doi.org/10.4204/EPTCS.303.6) (DOI from the paper's first page: EPTCS 303, 2019, pp. 76–91)

## scope and result
The paper presents proof-based synthesis in Theorema. Its input is a specification, not a program: an input condition I[X] and an output condition O[X,Y]; for Sort the input condition is trivial and the output condition is permutation plus sortedness (Conjecture 3, Section 3). A proof of an existential synthesis conjecture supplies witnesses; the witnesses are extracted as conditional rewrite rules. The authors state: “first one proves automatically a synthesis conjecture which is based on the specification (input and output conditions) of the desired function, then the algorithm is extracted automatically from the proof, in form of conditional rewrite rules” (Introduction, p. 76). The case study synthesizes min-sort, quick-sort, insert-sort, merge-sort, and auxiliary `insert`, `split`, and `merge` functions (Introduction, p. 76).

## technique 1: multiset specification and noetherian induction

What it is. Represent a list's contents by a finite multiset `M[U]`; sortedness is recursive; correctness requires both `M[output] = M[input]` and `IsSorted[output]`. The paper defines `M[hi] = 0/` and `M[a ` U] = {{a}} ⊎ M[U]`, then defines sortedness by `IsSorted[a ` U] ⇔ (a ≤ U ∧ IsSorted[U])` (Section 2.1, pp. 77–78). The induction order is strict inclusion of corresponding multisets: “we use the Noetherian ordering induced by the strict inclusion of the corresponding multisets” (Introduction, p. 77).

When and steps. Use this for recursive list functions whose recursive argument is strictly smaller in content.
1. Define the input and output predicates and the multiset/list facts (Section 2.1).
2. Form `∀X. I[X] ⇒ ∃Y. O[X,Y]` (Conjecture 1, Section 2.1, p. 78).
3. Skolemize the universal input, introduce an existential metavariable for the output, and split the input with the cover set `{hi, a ` U}` (ST-1, Section 2.2.2, p. 79; Proof 1, Section 3, pp. 81–82).
4. On the nonempty branch, add the induction hypothesis for a strictly smaller tail and rewrite the multiset equation (ST-2, Section 2.2.2, pp. 79–80; splitting proof, Proof 5, Section 4.2, p. 87).
5. Solve the output metavariable; the resulting witness becomes the right side of a rewrite rule (ST-1, p. 79).

Verus form. Inference: model a list as `Seq<int>` (or a Rust list datatype), define a ghost multiset specification, and state `ensures` for permutation and sortedness. Use a loop `invariant` or recursive `decreases` clause for the well-founded measure. A `proof fn` can establish the multiset decomposition and recursive lemma. The paper's Theorema multiset order and automatic Skolem witnesses do not carry over automatically; Verus requires explicit lemmas and executable Rust clauses.

Evidence and limits. The paper gives complete proof traces for `min`/`Trim` and `split`, and reports four sorting algorithms, but gives no runtime or success-rate denominator. The ordering assumes a total order and finite lists; the paper notes empty-list exceptions to antisymmetry/transitivity (footnote 3, p. 77). Induction is only available when the recursive argument is smaller in the multiset order, and the paper shows a branch where it is not: in the merge proof, Insert[a0,U0] is not smaller than the target constant, so the resulting clause would not terminate (Remark, Section 5, p. 89): “The corresponding algorithm would have Merge[a ` U,V ] = Merge[Insert[a,U ],V ] as the second clause, which is an infinite loop.” (Section 5, p. 89)

## technique 2: domain-specific inference rules

What it is. The prover augments ordinary logical rules with multiset/list rules. IR-1 forwards a ground atomic fact into a universal assumption; IR-2 rewrites a goal using an assumption; IR-3 reduces composite arguments; IR-4 solves a multiset metavariable by matching; IR-5 expands a composite multiset; IR-6 compresses it; IR-7 uses list equivalence induced by equal multisets; IR-8 splits two element constants into `a ≤ b` and `b < a` (Section 2.2.1, pp. 78–79). The paper's rule names include “IR-5: Expand multiset” (p. 78) and “IR-6: Compress multiset” (p. 79). The paper lists IR-1, IR-2 and IR-8 as its novel inference rules (Section 2.2, p. 78).

When and steps. The paper says IR-5 is “typically used when the argument contains cover–set constants” (p. 79) and IR-6 is typically applied “when the arguments contain function calls introduced by induction or by cascading” (p. 79); IR-8 applies when the proof contains two Skolem constants for domain elements (p. 79); IR-4 applies when the goal is `M[X*] = M[T]` for a ground `T` (p. 78). The split proof (Proof 5) follows this sequence: expand `M[b0 ` U0]` (IR-5), add the induction hypothesis on `U0` (ST-2) and rewrite, branch with IR-8, split the equation (ST-6), compress with IR-6, then solve the metavariables with IR-4 (Section 4.2, pp. 87).

Verus form. Inference: encode these as `proof fn` lemmas about `Seq` and a ghost `Multiset`, then invoke them with `assert`/`assert ... by`; use `if a <= b { ... } else { ... }` for IR-8. Verus has no Theorema inference-rule engine, so rule scheduling is an agent or tactic layer outside the verifier.

Evidence and limits. The rules are demonstrated in the numbered proofs, but no independent benchmark count is reported. Inference: they depend on trusted definitions of multiset equality, list equivalence, and the element order; the paper does not discuss a trusted base.

## technique 3: cover sets, cascading, and split-goal synthesis

What it is. ST-1 creates proof branches from a cover set and extracts patterns/witnesses. ST-3 (“cascading”) creates a new synthesis conjecture when an auxiliary function is needed; ST-4 pairs multisets; ST-5 splits a list around a pivot; ST-6 splits a multiset equation into two equations (Section 2.2.2, pp. 79–81). In the `min` proof, cascading generates `minA` and `TrimA`; in merge, cascading generates `Insert` (Sections 4.1 and 5, pp. 85–86 and 88–89); in the sort proofs cascading also generates `min`/`Trim`, `Insert`, and `SmEq`/`Bigger` (Section 3, pp. 82–83).

When and steps. Start with the target conjecture; choose a cover term; when the goal contains an unproved operation, create its own existential conjecture; prove that auxiliary conjecture by the same cover/induction process; substitute its witness back; finally emit rewrite rules. The paper's merge proof uses induction on the tail, pairs the head singleton with the recursive multiset, cascades to `Insert`, and solves the output metavariable (Section 5, pp. 88–89).

Verus form. Inference: use separate `proof fn` lemmas for each auxiliary contract, then call those lemmas from the parent proof. A Rust implementation must be written or generated explicitly; Verus does not extract executable code from a proof witness.

## techniques for the catalog
- multiset/noetherian synthesis — specify permutation and sortedness with multisets and use strict multiset decrease for recursive proof synthesis
- domain-specific inference — expand/compress multisets, split order cases, rewrite equivalent lists, and solve witness equations
- cover-set extraction — turn cover branches and existential witnesses into conditional rewrite clauses
- cascading auxiliaries — synthesize `min`, `trim`, `split`, `insert`, and `merge` as subordinate conjectures when the main proof needs them
- split-goal merge — decompose a multiset union into independently solvable equations before reconstructing a sorted output
