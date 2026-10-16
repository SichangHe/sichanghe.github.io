# Bi-Abduction for Shapes with Ordered Data
(authored by agents unless marked 🧑)
Tag: `curry2020biabduction`, [paper](http://arxiv.org/abs/2006.10439v1)

## scope and result
The paper presents a one-stage bi-abductive procedure combining separation-logic shape reasoning with ordering constraints. Given an entailment `A * ?M ⊢ C * ?F`, it infers an anti-frame `?M` (missing state) and frame `?F` (unchanged extra state) using an Unfold-and-Match search. The three phases are unfolding/normalization, matching/subtraction, and inference. The system supports singly linked lists, sorted lists, binary trees, and binary search trees; it proves soundness and termination and implements a prototype by modifying Cyclist. Evaluation covers 313 entailments: 296 basic-list examples (174 valid, 122 invalid) and 17 sorted-list examples, plus 14 hand-created tree entailments (sec. 10, PDF pp. 15–21).

## technique: bi-abductive specification inference
What: solve `∆ * ?M |= ∆' * ?F`, where `?M` is the anti-frame needed by the pre-state and `?F` is the frame preserved in the post-state. This supports compositional procedure analysis with low user annotation.

When: use when analyzing a heap-manipulating procedure whose precondition is unknown or incomplete, especially when shape and ordering properties must be inferred together.

How:
1. Start with an empty or currently known symbolic heap and the next program operation.
2. Form an entailment whose consequent describes the memory needed by that operation. For `insertSorted`, the first query is `emp * [?M] ⊢ ∃N,K. y↦[N,K] * [?F]` (sec. 4, PDF p. 6).
3. Run the three-phase search. Add missing predicates to the anti-frame, carry untouched predicates into the frame, and repeat normalization after each inference.
4. On a procedure call, use its summary as the consequent; compose the inferred frame with the callee’s postcondition and propagate the anti-frame backward.
5. Join branch results into the inferred pre/post specification, rejecting unsatisfiable or trivial solutions.

Verus form: Inference: represent ownership predicates with Verus ghost state or a separation-logic layer over references, and treat `?M` as inferred `requires` facts and `?F` as facts preserved in `ensures`. Verus does not provide native separating conjunction or automatic anti-frame inference, so this procedure would generate candidate contracts and ghost lemmas that Verus then checks.

Evidence and limits: The paper states that bi-abduction’s purpose is compositional analysis and that its system is proven sound and terminating (sec. 1, PDF p. 2). Infer-style shape-only systems already existed; this paper’s novelty is one-stage shape plus ordering. The procedure can return multiple solutions and uses ranking/side conditions to avoid false or trivial preconditions.

Quote: “Given two formulas in separation logic, A and C, bi-abduction aims to identify some non-trivial terms ?M and ?F such that the entailment A ∗ [?M ] ⊢ C ∗ [?F ] is satisfied.” (sec. 1, PDF p. 2)

## technique: normalization to a precise symbolic heap
What: transform an entailment into a normal form where each spatial predicate has a unique heap interpretation, explicit non-nullness and non-aliasing constraints, explicit ordering bounds, and satisfiable pure constraints.

How:
1. Apply EXCLUDE-MIDDLE to split each inductive predicate into base and recursive cases, adding the corresponding equality/disequality (sec. 5, PDF pp. 9–10).
2. Apply NODE-EX to add `E ≠ null` for a guarded non-empty predicate.
3. Apply NODES-EX to add disequalities between roots of disjoint spatial predicates.
4. Apply LIDENT= to remove redundant equalities and apply base rules (`LS-LBASE`, `SLS-LBASE`, `TREE-LBASE`, `STREE-LBASE`) to substitute empty predicates.
5. Use an SMT solver such as Z3 to check satisfiability, ensuring the resulting formula meets all six normal-form conditions (Definition 1, PDF p. 9).

The sorted-list example explicitly derives non-null and non-aliasing facts, then makes `k ≤ l` explicit before matching (sec. 4.2, PDF pp. 7–8). Normalization removes ambiguity: the paper says that for a normal-form formula, each spatial predicate corresponds to one unique sub-heap.

Verus form: Inference: normalization facts map to ghost ownership and `requires` equalities/disequalities. Use Verus `assert` and arithmetic lemmas to derive non-null and ordering constraints before manipulating references. The heap partition guarantee is an inference layer; Verus reference permissions must establish the corresponding disjointness.

Evidence and limits: The paper identifies normalization as essential to matching because a predicate then has one unique candidate on the other side (sec. 4.1, PDF p. 7). A satisfiability check is required; inconsistent branches are discarded.

Quote: “Transforming the bi-abduction problem into it’s normalised form is a key stage of our technique.” (sec. 5, PDF p. 10)

## technique: unfold-and-match subtraction
What: repeatedly unfold matching inductive predicates, subtract identical or overlapping heap fragments, and preserve pure constraints until both heaps are empty or inference is required.

How:
1. Apply `EMP`/`IDENT` when the antecedent and consequent are empty or identical.
2. Use `RIDENT=`, `HYPOTHESIS`, and `*-INTRODUCTION` to eliminate pure or spatial formulas that entail one another (sec. 6, PDF pp. 10–12).
3. Apply base rules to remove empty list/tree predicates while retaining endpoint equalities.
4. Apply `REC` rules to unfold and subtract overlapping list, sorted-list, tree, or search-tree predicates; use `REC(Node)` when a concrete points-to node overlaps an inductive predicate.
5. Use `GENERALIZE` to forget ordering when a sorted structure must match an unordered structure, e.g. `sls` to `ls` or `stree` to `tree`.
6. If no rule applies, proceed to anti-frame/frame inference.

In the worked sorted-list entailment, matching `x↦[y,j]` against the consequent `sls` unfolds one node, then matching identical `sls(y,k,l,z)` removes both sides; the residual point-to and pure constraints are passed to inference (sec. 4.2, PDF pp. 7–9).

Verus form: Inference: each subtraction step corresponds to a lemma that consumes a ghost representation of one list/tree segment and returns the residual segment. Encode inductive structure with recursive `spec fn` predicates and prove unfolding lemmas; use `ensures` to preserve sortedness and ownership. `GENERALIZE` requires a lemma that an ordered structure implies the same unordered shape.

Evidence and limits: The system’s subtraction rules are sound by structural entailments such as `ls(E1,E2) * ls(E2,E3) ⇒ ls(E1,E3)` and the analogous sorted-list rule (sec. 8, PDF p. 14). Generalization deliberately loses ordering information and therefore may weaken inferred postconditions.

Quote: “At it’s core, this second phase of the search is aimed at identifying and resolving equivalent and overlapping segments of the entailment, aiming to reduce both sides of the entailment to emp.” (sec. 6, PDF p. 10)

## technique: integrated ordering inference
What: infer pure inequalities while matching sorted lists and binary search trees, rather than running a separate arithmetic phase. Rules `INF-SLS` and `SLS-REC*` expose ordering constraints needed to preserve sortedness.

How:
1. When an SLS node is unfolded, make its lower/upper bounds explicit and add the required relation between the new node value and the residual segment (sec. 7, PDF pp. 12–13).
2. Apply `INF-SLS` to infer a points-to node and a constraint such as `V1 ≤ V'` when the antecedent’s sorted segment must overlap the consequent.
3. Carry the ordering relation into the symbolic state or consequent; discharge it with `INF-PURE` or an SMT solver.
4. For `stree`, apply the analogous `INF-STREE` rule with left-root-right inequalities.
5. Reject unsatisfiable inferred constraints and continue the three-phase loop.

Verus form: Inference: express sortedness as a recursive `spec fn` over a ghost sequence/tree and add the inferred inequalities to `requires`/`ensures`. Prove each insertion or merge step preserves the ordering invariant with arithmetic lemmas. The inference engine proposes inequalities; Verus checks them.

Evidence and limits: The paper’s sorted-list benchmarks require implicit ordering constraints and report successful solutions for all 17 cases; times range from 16 ms to 570 ms and validation percentages from 32% to 70% (Table 4, PDF p. 20). The prototype’s numerical treatment is general and simplistic; trivial inequalities such as `100 ≤ 200` remain in outputs (sec. 10.2, PDF p. 20).

Quote: “By completely integrating the pure constraints into the abduction and entailment rules, we have developed a system in which the complex pure properties are identified during the shape analysis.” (sec. 7, PDF p. 13)

## technique: anti-frame/frame inference and controlled search
What: when matching cannot finish, infer missing or extra spatial/pure fragments using `INF-MISSING`, `INF-EXTRA`, `INF-7→`, `INF-LS`, `INF-SLS`, `INF-TREE`, and `INF-STREE`, then restart normalization and matching.

How:
1. For unmatched points-to terms, use `INF-7→` to unify field values and add the equality to the anti-frame.
2. For an unmatched list or sorted-list segment, use `INF-LS`/`INF-SLS` to unfold it, infer required endpoint/order constraints, and subtract the resulting node.
3. For trees, use the analogous tree rules and add child predicates/points-to facts.
4. Use `INF-MISSING` to add a missing predicate to `?M`; use `INF-EXTRA` to move an unneeded predicate to `?F`.
5. Require the candidate fragments to remain satisfiable, then loop back to normalization.

The implementation restricts rule application to avoid blowups: existential renaming is used only when it enables subtraction; `HYPOTHESIS` and `*-INTRO` eliminate singular matches; EXCLUDE-MIDDLE splits only spatial predicate cases (sec. 9, PDF pp. 15–16).

Verus form: Inference: generated anti-frames become candidate `requires`; frames become preserved ghost resources in `ensures`. Rule restrictions correspond to search heuristics and do not change the logical proof obligations; every candidate must still be proved as a Verus entailment lemma.

Evidence and limits: The prototype is based on Cyclist and uses a 30-second limit per benchmark on an Intel i7-7700 with 8 GB RAM (sec. 10, PDF p. 16). In the 296 basic-list benchmarks, larger Clones/Bolognesa entailments time out increasingly; 34 of 54 Bolognesa timeouts occur during validation, not proof construction (sec. 10.1.4, PDF p. 19). Pointer-alias cases such as `smallfoot-vc37` remain unsolved.

Quote: “The greater precision of the earlier rules is therefore preferred.” (sec. 9, PDF p. 16)

## evidence, trust, and product relevance
The paper proves soundness (Theorem 1) and termination (Theorem 2). Termination uses a lexicographic entailment size: bounded predicate and equality counts plus formula length; every rule decreases this measure (sec. 8, PDF p. 14). The measured prototype evidence is benchmark throughput, time, and validation percentages, with denominators above. The paper does not claim completeness for arbitrary inductive predicates, numerical theories, or alias patterns; it lists limited numerical handling and brittle predicate-specific rules as limitations (sec. 9, PDF p. 16).

Inference: a Verus adaptation would require a ghost separation-logic model, recursive shape predicates, and a contract generator that translates anti-frames/frames into `requires`/`ensures`; Verus itself would remain the final proof checker. Inference: the method poses moderate threat to agent-written verified Rust in pointer-heavy code because it can synthesize missing ownership and ordering contracts, but unsupported aliasing, arithmetic, and scalability leave substantial residual risk. VL should reuse the three-phase architecture, normal-form facts, and integrated ordering lemmas rather than redo them as research ideas.

## techniques for the catalog
- bi-abductive contract inference — infer missing anti-frames and preserved frames from separation-logic entailments
- normal-form heap analysis — make nullness, non-aliasing, base cases, and ordering explicit before matching
- unfold-and-match subtraction — unfold inductive predicates and subtract overlapping heap segments
- integrated ordering inference — infer sorted-list and search-tree inequalities during shape matching
- controlled anti-frame/frame search — apply specialized inference rules with satisfiability and search restrictions
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
