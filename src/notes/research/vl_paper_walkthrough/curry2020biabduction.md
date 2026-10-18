# Bi-Abduction for Shapes with Ordered Data
(authored by agents unless marked 🧑)
Tag: `curry2020biabduction`, [paper](http://arxiv.org/abs/2006.10439v1)

## scope and result
The paper presents a one-stage bi-abductive procedure combining separation-logic shape reasoning with ordering constraints. Given an entailment `A * ?M ⊢ C * ?F`, it infers an anti-frame `?M` (missing state) and frame `?F` (unchanged extra state) using an Unfold-and-Match search. The three phases are unfolding/normalization, matching/subtraction, and inference. The system supports singly linked lists, sorted lists, binary trees, and binary search trees; it gives soundness and termination proof sketches (Theorems 1 and 2, sec. 8) and implements a prototype by modifying Cyclist. Evaluation covers 313 entailments: the text says 296 basic-list examples (174 valid, 122 invalid) and 17 sorted-list examples, plus 14 hand-created tree entailments (sec. 10, PDF pp. 15–21). Inference: the paper's counts disagree with each other, since Table 1 (PDF p. 16) lists 126 valid and 170 invalid basic-list entailments (also 296 in total), and sec. 10.1.2 says the ls group has 3 valid entailments where Table 1 lists 6.

## technique: bi-abductive specification inference
What: solve `∆ * ?M |= ∆' * ?F`, where `?M` is the anti-frame needed by the pre-state and `?F` is the frame preserved in the post-state. This supports compositional procedure analysis with low user annotation.

When: use when analyzing a heap-manipulating procedure whose precondition is unknown or incomplete, especially when shape and ordering properties must be inferred together.

How:
1. Start with an empty or currently known symbolic heap and the next program operation.
2. Form an entailment whose consequent describes the memory needed by that operation. For `insertSorted`, the first query is `emp * [?M] ⊢ ∃N,K. y↦[N,K] * [?F]` (sec. 4, PDF p. 6).
3. Run the three-phase search. Add missing predicates to the anti-frame, carry untouched predicates into the frame, and repeat normalization after each inference.
4. On a procedure call, use the precondition from its summary as the consequent (e.g. `y↦[N,K] * [?M] ⊢ ∃I,J. sls(l,I,J,null) * [?F]` for `findPos`); compose the inferred frame with the callee’s postcondition and propagate the anti-frame backward (sec. 4, PDF p. 6).
5. Join branch results into the inferred pre/post specification: the anti-frame fragments from all branches are collected and propagated back, and the frame is gathered from each branch (sec. 4.2, PDF p. 9). The rule order is meant to forbid trivial or false preconditions (sec. 4.1, PDF p. 7).

Verus form: Inference: represent ownership predicates with Verus ghost state or a separation-logic layer over references, and treat `?M` as inferred `requires` facts and `?F` as facts preserved in `ensures`. Verus does not provide native separating conjunction or automatic anti-frame inference, so this procedure would generate candidate contracts and ghost lemmas that Verus then checks.

Evidence and limits: The paper states that bi-abduction is “a powerful enabler of compositional analysis” and that “the proposed proof system is proven to be sound and terminating” (sec. 1, PDF p. 2); sec. 8 gives only proof sketches. The paper says shape-only systems such as Infer already existed (sec. 2); its claimed novelty is a one-phase procedure for shape plus ordering. The procedure can return a range of valid specifications (sec. 10.2, PDF p. 20); the rule order and the satisfiability side conditions of `INF-PURE`, `INF-MISSING` and `INF-EXTRA` are what keep out trivial or false results (secs. 4.1, 7).

Quote: “Given two formulas in separation logic, A and C, bi-abduction aims to identify some non-trivial terms ?M and ?F such that the entailment A ∗ [?M ] ⊢ C ∗ [?F ] is satisfied.” (sec. 1, PDF p. 2)

## technique: normalization to a precise symbolic heap
What: transform an entailment into a normal form (Definition 1) where each spatial predicate has a unique heap interpretation, with explicit non-emptiness guards, non-nullness and non-aliasing constraints, no equalities or `E≠E` in the pure part, and a satisfiable pure part. The worked example also adds the bound `k ≤ l` of a non-empty `sls` explicitly, to ease later inference.

How:
1. Apply EXCLUDE-MIDDLE to split each inductive predicate into base and recursive cases, adding the corresponding equality/disequality (sec. 5, PDF pp. 9–10).
2. Apply NODE-EX to add `E ≠ null` for a guarded non-empty predicate.
3. Apply NODES-EX to add disequalities between roots of disjoint spatial predicates.
4. Apply LIDENT= to remove redundant equalities and apply base rules (`LS-LBASE`, `SLS-LBASE`, `TREE-LBASE`, `STREE-LBASE`) to substitute empty predicates.
5. The normal form has six conditions (Definition 1, PDF p. 9). The fifth (no `E≠E`) could be checked syntactically; the sixth (satisfiable `Π`) “would be performed using an SMT solver such as Z3” (sec. 5, PDF p. 10).

The sorted-list example explicitly derives non-null and non-aliasing facts, then makes `k ≤ l` explicit before matching (sec. 4.2, PDF pp. 7–8). Normalization removes ambiguity: the paper says that for a normal-form formula, each spatial predicate corresponds to one unique sub-heap.

Verus form: Inference: normalization facts map to ghost ownership and `requires` equalities/disequalities. Use Verus `assert` and arithmetic lemmas to derive non-null and ordering constraints before manipulating references. The heap partition guarantee is an inference layer; Verus reference permissions must establish the corresponding disjointness.

Evidence and limits: The paper identifies normalization as essential to matching because a predicate then has one unique candidate on the other side (sec. 4.1, PDF p. 7). Satisfiability is part of the normal form, and the added constraints let contradictory inferences be detected so that invalid branches do not progress (sec. 4.2, PDF p. 7).

Quote: “Transforming the bi-abduction problem into it’s normalised form is a key stage of our technique.” (sec. 5, PDF p. 10)

## technique: unfold-and-match subtraction
What: repeatedly unfold matching inductive predicates, subtract identical or overlapping heap fragments, and preserve pure constraints until both heaps are empty or inference is required.

How:
1. Apply `EMP` when the antecedent holds only pure constraints and the consequent is empty, and `IDENT` when antecedent and consequent are identical; both end the search (sec. 6, PDF p. 11).
2. Use `RIDENT=`, `HYPOTHESIS`, and `*-INTRODUCTION` to eliminate pure or spatial formulas that entail one another (sec. 6, PDF pp. 10–12).
3. Apply base rules to remove empty list/tree predicates while retaining endpoint equalities.
4. Apply `REC` rules to unfold and subtract overlapping list, sorted-list, tree, or search-tree predicates; use `REC(Node)` when a concrete points-to node overlaps an inductive predicate.
5. Use `GENERALIZE` to forget ordering when a sorted structure must match an unordered structure, e.g. `sls` to `ls` or `stree` to `tree`.
6. If no rule applies, proceed to anti-frame/frame inference.

In the worked sorted-list entailment, matching `x↦[y,j]` against the consequent `sls` unfolds one node, then matching identical `sls(y,k,l,z)` removes both sides; the residual point-to and pure constraints are passed to inference (sec. 4.2, PDF pp. 7–9).

Verus form: Inference: each subtraction step corresponds to a lemma that consumes a ghost representation of one list/tree segment and returns the residual segment. Encode inductive structure with recursive `spec fn` predicates and prove unfolding lemmas; use `ensures` to preserve sortedness and ownership. `GENERALIZE` requires a lemma that an ordered structure implies the same unordered shape.

Evidence and limits: The soundness proof sketch bases the subtraction rules on structural entailments such as `ls(E1,E2) * ls(E2,E3) ⇒ ls(E1,E3)` and the analogous sorted-list rule (sec. 8, PDF p. 14). The `GENERALIZE` rules abstract ordering information away from the sorted structure, “leaving only the spatial information” (sec. 6, PDF p. 12). Inference: this may weaken inferred postconditions.

Quote: “At it’s core, this second phase of the search is aimed at identifying and resolving equivalent and overlapping segments of the entailment, aiming to reduce both sides of the entailment to emp.” (sec. 6, PDF p. 10)

## technique: integrated ordering inference
What: infer pure inequalities while matching sorted lists and binary search trees, rather than running a separate arithmetic phase. Rules `INF-SLS` and `SLS-REC*` expose ordering constraints needed to preserve sortedness.

How:
1. The ordering constraint is implicit in the sorted-list predicate; the rules `SLS-REC*` and `INF-SLS` make it explicit between the sorted list and the other spatial predicates (sec. 7, PDF p. 13).
2. `INF-SLS` (Figure 5) unfolds an antecedent `sls(E1,V1,V2,E2)` against a consequent points-to `E1↦[X,V1]`, and puts `E1≠E2 ∧ V1≤V'` into the anti-frame and the antecedent.
3. For `INF-SLS` the ordering constraint goes into the known symbolic state; for `SLS-REC*` it becomes an extra conjunct of the consequent that must be proved. Its inference “may be performed through INF-PURE afterwards, if needed” (sec. 7, PDF p. 13).
4. For `stree`, apply the analogous `INF-STREE` rule with left-root-right inequalities.
5. Reject unsatisfiable inferred constraints and continue the three-phase loop.

Verus form: Inference: express sortedness as a recursive `spec fn` over a ghost sequence/tree and add the inferred inequalities to `requires`/`ensures`. Prove each insertion or merge step preserves the ordering invariant with arithmetic lemmas. The inference engine proposes inequalities; Verus checks them.

Evidence and limits: The paper says the sorted-list benchmarks need implicit or missing ordering constraints identified, and that the technique solved the examples (all 17 are listed in Table 4); times range from 16 ms to 570 ms and validation percentages from 32% to 70% (Table 4, PDF p. 20). The prototype’s numerical treatment is general and simplistic; trivial inequalities such as `100 ≤ 200` remain in outputs (sec. 10.2, PDF p. 20).

Quote: “By completely integrating the pure constraints into the abduction and entailment rules, we have developed a system in which the complex pure properties are identified during the shape analysis” (sec. 7, PDF p. 14)

## technique: anti-frame/frame inference and controlled search
What: when matching cannot finish, infer missing or extra spatial/pure fragments using `INF-MISSING`, `INF-EXTRA`, `INF-7→`, `INF-LS`, `INF-SLS`, `INF-TREE`, and `INF-STREE`, then restart normalization and matching.

How:
1. For unmatched points-to terms, use `INF-7→` to unify field values and add the equality to the anti-frame.
2. For an unmatched list or sorted-list segment, use `INF-LS`/`INF-SLS` to unfold it, infer required endpoint/order constraints, and subtract the resulting node.
3. For trees, `INF-TREE` and `INF-STREE` unfold a non-null antecedent `tree(X)`/`stree(X,V1,V2)` into a points-to `X↦[E,F]` (or `X↦[E,F,V]`) in the consequent, with the child predicates in the antecedent and, for `stree`, the bounds `V3≤V ∧ V≤V4` in the anti-frame.
4. Use `INF-MISSING` to add a missing predicate to `?M` (and to the antecedent); use `INF-EXTRA` to move an extra antecedent predicate to `?F`. `INF-PURE` ends the search when both sides are pure, moving the antecedent’s pure terms into the frame and the consequent’s into the anti-frame.
5. Require the candidate fragments to remain satisfiable, then loop back to normalization.

The implementation restricts rule application to avoid blowups: existential renaming is used only when it enables subtraction; `HYPOTHESIS` and `*-INTRO` eliminate singular matches; EXCLUDE-MIDDLE splits only spatial predicate cases (sec. 9, PDF p. 15).

Verus form: Inference: generated anti-frames become candidate `requires`; frames become preserved ghost resources in `ensures`. Rule restrictions correspond to search heuristics and do not change the logical proof obligations; every candidate must still be proved as a Verus entailment lemma.

Evidence and limits: The prototype is based on Cyclist and uses a 30-second limit per benchmark on an Intel i7-7700 with 8 GB RAM (sec. 10, PDF p. 16). In the basic-list benchmarks, larger Clones and Bolognesa entailments take much longer, and the tool begins to time out from clones-07 onwards (sec. 10.1.3, PDF p. 18). Of “the 54 timeouts throughout the entire benchmark set”, 20 were in proof construction and 34 in validation (sec. 10.1.4, PDF p. 19). Smallfoot `vc37`, whose alias is over the pointer itself, is beyond the implementation and gets no solution (sec. 10.1.1, PDF p. 17).

Quote: “The greater precision of the earlier rules is therefore preferred.” (sec. 7, PDF p. 14)

## evidence, trust, and product relevance
The paper proves soundness (Theorem 1) and termination (Theorem 2). Termination uses an entailment size defined as a triple (Definition 2): a bound on predicate count minus the consequent’s predicate count, a bound on (dis)equality count minus the antecedent’s, and the formula length; the sketch says every rule reduces the size (sec. 8, PDF p. 14). Inference: the triple is meant to be compared lexicographically. The measured prototype evidence is benchmark throughput, time, and validation percentages, with denominators above. The paper does not claim completeness for arbitrary inductive predicates, numerical theories, or alias patterns; it lists “the very general treatment of numerical values and a brittle approach to the implementation of rules that target specific predicates” as limitations (sec. 9, PDF p. 15).

Inference: a Verus adaptation would require a ghost separation-logic model, recursive shape predicates, and a contract generator that translates anti-frames/frames into `requires`/`ensures`; Verus itself would remain the final proof checker. Inference: the method poses moderate threat to agent-written verified Rust in pointer-heavy code because it can synthesize missing ownership and ordering contracts, but unsupported aliasing, arithmetic, and scalability leave substantial residual risk. VL should reuse the three-phase architecture, normal-form facts, and integrated ordering lemmas rather than redo them as research ideas.

## techniques for the catalog
- bi-abductive contract inference — infer missing anti-frames and preserved frames from separation-logic entailments
- normal-form heap analysis — make nullness, non-aliasing, base cases, and ordering explicit before matching
- unfold-and-match subtraction — unfold inductive predicates and subtract overlapping heap segments
- integrated ordering inference — infer sorted-list and search-tree inequalities during shape matching
- controlled anti-frame/frame search — apply specialized inference rules with satisfiability and search restrictions
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "In our system, a sorted linked list indirectly entails a basic singly-linked list between the same points due to the fact that by our definition, all sorted lists are simple singly-linked lists at the structural level."): read the whole paper text and checked all quotations, numbers, section and page references and technique steps against it; corrected page references (two quotes were on PDF p. 14, not 13 or 16), the Bolognesa-only timeout claim (it is the whole set), the EMP/IDENT, call-summary, INF-SLS and SMT descriptions, and 'proves' to 'proof sketches'; noted that Table 1 disagrees with the text counts; left Verus-form paragraphs and the final assessment as marked Inference. Did not check cited works, the appendix specifications in detail, or the rendered PDF layout beyond the text extraction.
