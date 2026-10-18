# Multiple Query Satisfiability of Constrained Horn Clauses
(authored by agents unless marked 🧑)
Tag: `deangelis2022multiple`: [paper](http://arxiv.org/abs/2211.15207v2)

## what the paper proves or measures

The paper transforms one set of constrained Horn clauses (CHCs) containing multiple verification queries into an equisatisfiable set whose queries share information. Its abstract states: “We propose a transformation technique that takes as input a set of CHCs, including a set of queries, and returns as output a new set of CHCs, such that the transformed CHCs are satisfiable if and only if so are the original ones.” (Abstract, p. 1). The target queries use catamorphisms over algebraic data types (ADTs), especially list and tree summaries. The paper claims the transformation is sound, complete, and terminating for the defined class (Theorems 1–3, pp. 10, 12; the proof of Theorem 1 is only a sketch, Appendix 1, p. 18); the evaluation tests the VeriCaTmq implementation on 170 problems with 470 queries (Section 7, p. 13).

## technique 1: encode program properties as catamorphism-based CHC queries

what it is: translate a program to definite CHCs for its predicates, define total functional catamorphisms that summarize lists or trees, and state each pre/post property as a query with head `false`. A query is a conjunction of a constraint, catamorphism atoms, and one program predicate. The paper writes a property as an implication `p(...), cata_1(...), ..., cata_n(...) → d` and turns it into a query “by adding ∼ d to its premise and changing its conclusion to false” (Section 3, p. 5).

when to use: use this when recursive data structures need properties such as sortedness, length, minimum and maximum, sums, or contents as sets or multisets; for trees the paper's benchmark uses size, height, minimum and maximum, content, and the binary search tree property (Section 7, p. 13). The paper's class requires output variables of catamorphisms to be basic and pairwise disjoint, while their ADT inputs occur in the program atom (Definition 2, p. 6).

how to do it:
1. define program predicates as definite CHCs and define each summary as a total functional catamorphism (Definitions 1–2, pp. 3, 6)
2. write a query `false ← c, cata_1(...), …, cata_n(...), pred(Z)` whose constraint negates the desired result
3. include at most one query per program predicate: Section 3 (p. 5) assumes “at most one property is specified for each program predicate”, and the `Strengthen` function (Figure 5, p. 11) takes “at most one query for each program predicate”
4. give the complete set `P ∪ Q` to a CHC solver.

The insertion-sort example has four queries for `ins-sort`, `ord-ins`, `append`, and `snoc`; query q1 states that sorting an ordered input yields an ordered output (Figures 2–4, pp. 4–6). “CHC solvers try to show the satisfiability of a set of CHCs of the form: P ∪ {false ← G1 , . . . , false ← Gn }” (Section 1, p. 1).

Verus form: Inference: model a list or tree summary as a Verus `spec fn` over a mathematical sequence or recursive datatype, and express each contract with `requires` and `ensures`; a failed postcondition becomes a proof obligation rather than a runtime `false` predicate. Verus does not natively consume CHCs, so a front-end would need to preserve recursive definitions and translate the query semantics.

limits: the query class requires catamorphism atoms (total, functional summaries) plus one program predicate (Definitions 1–2). The paper says “the effectiveness of the transformation may depend on the set of properties specified through the queries”; with partial specifications, queries exist only for some program predicates and the catamorphisms for the others (its examples: `append` and `snoc`) are not inferred (Section 8, p. 15).

## technique 2: definition, unfolding, strengthening, and folding

what it is: four semantics-preserving CHC transformation rules create predicates that conjoin a program atom with the summaries needed by a query, propagate those summaries through recursion, and fold the result into compact clauses.

how to do it:
1. Definition (R1): introduce `newp` whose body contains a program atom, its relevant catamorphism atoms, and a constraint (Section 5, p. 7)
2. Unfolding (R2): resolve the program atom once; recursively unfold catamorphism atoms whose ADT argument is not a variable; apply functionality by equating the outputs of two atoms of the same catamorphism on the same inputs (Section 5, p. 8)
3. Query-based strengthening (R3): for each program atom in a clause, find its query; if part of the query's catamorphism conjunction (B1) is already in the clause body and the remainder (B2) is absent, add `∼ c_k, B2` to the body (Section 5, pp. 8–9). R3 is not applied to queries, since that “could easily get a satisfiable clause from an unsatisfiable one” (p. 10)
4. Folding (R4): pick a definition from earlier R1 steps whose constraint is implied by the clause constraint and whose catamorphism conjunction is contained in the clause, and replace the program atom plus its catamorphism atoms with the definition's head (Section 5, p. 9). A clause may not be folded using itself (p. 10)
5. repeat for newly introduced predicates and replace the original query with a folded query.

The insertion-sort derivation shows q1 becoming `false ← ∼(B1 ⇒ B2), new1(...)` after folding (clause E6), while clause E5 for `new1` contains information strengthened from q2 (Section 5, pp. 9–10). “Theorem 1 (Soundness and Completeness of the Rules). Let S0 Z⇒ S1 Z⇒ . . . Z⇒ Sn be a transformation sequence using rules R1–R4. Then, S0 is satisfiable if and only if Sn is satisfiable.” (Section 5, p. 10)

Verus form: Inference: this is analogous to generating ghost predicates that bundle a data-structure operation with its summary facts, then proving recursive lemmas for each unfolding and folding step. Use `spec fn` and `lemma` for summaries; preserve executable Rust separately. The transformation itself remains a trusted front-end unless its correspondence is proved.

## technique 3: automatic Tmq fixpoint transformation

what it is: algorithm `Tmq` computes a least fixpoint of definitions under an extension order, then unfolds, strengthens, and folds all clauses using those definitions. The `Define` function (Figure 5, p. 11) has Skip, Extend, and Project cases; the implementation's widening-based generalization operator ensures stabilization.

how to do it:
1. initialize definitions with `Define(Q, ∅)`, projecting a definition for every queried program predicate (Section 6, pp. 11–12)
2. on each iteration, unfold all definitions, strengthen the unfolded clauses with the queries, then call `Define` again (operator τP,Q, p. 12; functions in Figure 5, p. 11)
3. in Skip, keep the existing definition if it already contains the needed summaries and its constraint is implied; in Extend, generalize old and new constraints with α and take the union of summary atoms; in Project, when the predicate has no definition yet, project the constraint onto the basic input variables and create a new predicate (Figure 5, p. 11)
4. stop at `lfp(τP,Q)`; apply `Fold(Strengthen(Unfold(lfp,P),Q),lfp)` to produce the transformed CHCs (Section 6, p. 12)
5. solve the transformed clauses with a CHC solver.

The paper's implementation uses a widening-based `α` so a sequence of generalized constraints stabilizes, and argues termination (Theorem 2, p. 12) from `lfp(τP,Q)` being reached in finitely many iterations. “Theorem 3 (Soundness and Completeness of Algorithm Tmq ). For any set P of definite clauses and Q of catamorphism-based queries, P ∪Q is satisfiable if and only if Tmq (P, Q) is satisfiable.” (Section 6, p. 12)

Verus form: Inference: use this as an offline contract-strengthening pass that emits additional Verus lemmas or invariants. The widening/generalization is heuristic and should not weaken the final Rust specification; Verus must check each emitted lemma. No Verus construct represents a CHC least-fixpoint operator directly.

## technique 4: exploit mutual query information for recursive data structures

The paper's claimed gain is that the transformed clauses for one query incorporate catamorphisms and constraints from other queries. In insertion sort, the clause for `ins-sort` is strengthened using q2 for `ord-ins` (clauses E4–E5, p. 9), and the definitions for `ord-ins` in turn involve `append` and `snoc` atoms (Appendix 2, pp. 18–19). The solver can then “look for a model of new 1(Xs,B 1,Zs,B 2,Ys) where the constraint B1 ⇒B2 holds, instead of looking in a separate way for models of ordered (Xs,B1), ordered (Zs,B2), and ins--sort (Xs,Ys,Zs)” (Section 5, pp. 9–10). The paper says the transformation is effective “in particular, in the presence of mutually recursive predicates” (Section 6, p. 10).

The baseline experiment illustrates the trigger: on the insertion-sort clauses, SPACER (Z3-based) “failed to return an answer within five minutes” before transformation (Section 3, p. 5); the paper says it succeeds on the transformed clauses (p. 6). The paper's broader benchmark contains 170 problems, split evenly into 85 satisfiable and 85 unsatisfiable (235 queries each), 470 queries total, with a 300 s limit per problem (Section 7, p. 13 and footnote 4). VeriCaTmq proved all 170; baseline SPACER proved 84 unsatisfiable problems and none of the satisfiable problems. Transformation took 275 seconds total (1.62 s/problem); transformed solving took about 174 seconds total (about 1 s average, 0.10 s median). The paper gives the baseline's 30.27 seconds for its 84 solved unsatisfiable problems only (0.36 s average, 0.15 s median). Inference: this is not an apples-to-apples total-time comparison with the 170-problem VeriCaTmq times (Section 7, p. 13, Table 1, p. 14). The problems are list and binary-search-tree programs (sorting, reverse, concatenation, tree insertion and deletion), and the unsat problems were made by introducing bugs (p. 13).

Verus form: Inference: this suggests a library of reusable recursive sequence/tree lemmas whose postconditions are carried across calls. The evidence does not show that Verus automation will discover those lemmas; an agent-written contract can still be wrong while Verus proves it.

## what is proved, trusted, and limited

The paper states rule-level soundness/completeness (Theorem 1, with only a proof sketch in Appendix 1, p. 18), algorithm termination (Theorem 2), and equisatisfiability of `Tmq` (Theorem 3), under its CHC and catamorphism-query class. Inference: the trusted chain includes the program-to-CHC translation, catamorphism definitions, generalization operator, transformation implementation, and SPACER/Z3. Inference: a Verus integration should treat Tmq as an untrusted clause optimizer and retain Verus checking of the final Rust contracts and recursive lemmas. Inference: the threat to agent-written verified Rust is moderate for list/tree APIs: missing or partial summaries can make proofs fail, while an over-weak contract can pass without establishing the intended property.

Inference: the paper already addresses query sharing, recursive ADT summaries, and sound/complete unfold-fold transformation, so VL should not redo those as a new CHC algorithm. The open gap is a checked bridge from Rust ownership, mutable data structures, and concrete machine arithmetic to the abstract list/tree summaries. The paper's stated limitation is that predicates without queries need their catamorphisms inferred; “As future work, we plan to extend Tmq to propagate the catamorphisms specified in the queries to those program predicates for which no query has been specified” (Section 8, p. 15).

## techniques for the catalog

- catamorphism-based CHC queries — express recursive list/tree properties as satisfiability queries over total functional summaries
- sound unfold/fold rules — introduce, unfold, strengthen, and fold predicates while preserving satisfiability
- query-based strengthening — inject constraints and summaries from related queries into each program predicate
- Tmq fixpoint transformation — compute stable definitions with Skip, Extend, Project, widening, then transform all clauses
- mutual-query solving — let a CHC solver reuse summaries across mutually recursive functions and multiple contracts

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The applicability conditions of the rules force a sequence of the transformation rules which is fixed, if the new definitions to be introduced are known."): read the whole paper text (pp. 1–19 including appendices) and checked the quotations, Theorems 1–3, Definition 1–2 references, the rules R1–R4 steps, the Tmq/Define description, and the experiment numbers (170 problems, 470 queries, 84 vs 0 for SPACER, 275 s, 174 s, 30.27 s, Table 1); changed page references (SPACER five-minute failure p. 5, R3 p. 8, R4 p. 9, first quote p. 1, Figure 5 p. 11, conclusion is Section 8), the R4 description (it reuses earlier definitions and does not introduce them), the tree property list, the claim of proofs (Theorem 1 has only a proof sketch), the mutual-query description (strengthening of `ins-sort` uses q2; `append` and `snoc` appear via Appendix 2), and marked own conclusions as Inference; not checked: the PDF layout of the figures beyond the extracted text, the cited references, and the correctness of the paper's proofs or the web benchmark. The link is the arXiv ID given on the paper's first page (2211.15207v2).
