# Multiple Query Satisfiability of Constrained Horn Clauses
(authored by agents unless marked 🧑)
Tag: `deangelis2022multiple`: [paper](http://arxiv.org/abs/2211.15207v2)

## what the paper proves or measures

The paper transforms one set of constrained Horn clauses (CHCs) containing multiple verification queries into an equisatisfiable set whose queries share information. Its abstract states: “We propose a transformation technique that takes as input a set of CHCs, including a set of queries, and returns as output a new set of CHCs, such that the transformed CHCs are satisfiable if and only if so are the original ones.” (Abstract, p. 1). The target queries use catamorphisms over algebraic data types (ADTs), especially list and tree summaries. The transformation is sound, complete, and terminating for the defined class; the evaluation tests the VeriCaTmq implementation on 170 problems with 470 queries.

## technique 1: encode program properties as catamorphism-based CHC queries

what it is: translate a program to definite CHCs for its predicates, define total functional catamorphisms that summarize lists or trees, and state each pre/post property as a query with head `false`. A query is a conjunction of a constraint, catamorphism atoms, and one program predicate; negating the desired postcondition in the body makes satisfiability equivalent to validity.

when to use: use this when recursive data structures need properties such as sortedness, length, extrema, sums, contents, or tree shape. The paper's class requires output variables of catamorphisms to be basic and pairwise disjoint, while their ADT inputs occur in the program atom (Definition 2, p. 6).

how to do it:
1. define program predicates as definite CHCs and define each summary as a total functional catamorphism (Definitions 1–2, pp. 3, 6)
2. write a query `false ← c, cata_1(...), …, cata_n(...), pred(Z)` whose constraint negates the desired result
3. include at most one query per program predicate for this algorithm (Section 3, p. 5)
4. give the complete set `P ∪ Q` to a CHC solver.

The insertion-sort example has four queries for `ins-sort`, `ord-ins`, `append`, and `snoc`; query q1 states that sorting an ordered input yields an ordered output (Figures 2–4, pp. 4–6). “CHC solvers try to show the satisfiability of a set of CHCs of the form: P ∪ {false ← G1 , . . . , false ← Gn }” (Section 1, p. 2).

Verus form: Inference: model a list or tree summary as a Verus `spec fn` over a mathematical sequence or recursive datatype, and express each contract with `requires` and `ensures`; a failed postcondition becomes a proof obligation rather than a runtime `false` predicate. Verus does not natively consume CHCs, so a front-end would need to preserve recursive definitions and translate the query semantics.

limits: the query class excludes arbitrary ADT predicates and requires total, functional summaries. The paper says effectiveness may depend on which properties are supplied: partial specifications leave dependent predicates without catamorphisms (Conclusion, p. 15).

## technique 2: definition, unfolding, strengthening, and folding

what it is: four semantics-preserving CHC transformation rules create predicates that conjoin a program atom with the summaries needed by a query, propagate those summaries through recursion, and fold the result into compact clauses.

how to do it:
1. Definition (R1): introduce `newp` whose body contains a program atom, its relevant catamorphisms, and constraints (Section 5, pp. 7–8)
2. Unfolding (R2): resolve the program atom once; recursively unfold catamorphism atoms whose ADT argument is not a variable; apply functionality by equating two outputs of the same total catamorphism (Section 5, pp. 8–9)
3. Query-based strengthening (R3): for each program atom, find its query, retain summary atoms already present, and add the missing summaries plus the negated query constraint to the body (Section 5, pp. 9–10)
4. Folding (R4): introduce or reuse a definition whose summary conjunction is contained in the current clause and replace the program atom plus summaries with the new predicate (Section 5, pp. 9–10)
5. repeat for newly introduced predicates and replace the original query with a folded query.

The insertion-sort derivation shows q1 becoming `false ← ¬(B1 ⇒ B2), new1(...)` after folding, while the definition of `new1` contains information strengthened from q2 (Section 5, pp. 10–11). “Theorem 1 (Soundness and Completeness of the Rules). Let S0 Z⇒ S1 Z⇒ . . . Z⇒ Sn be a transformation sequence using rules R1–R4. Then, S0 is satisfiable if and only if Sn is satisfiable.” (Section 5, p. 10)

Verus form: Inference: this is analogous to generating ghost predicates that bundle a data-structure operation with its summary facts, then proving recursive lemmas for each unfolding and folding step. Use `spec fn` and `lemma` for summaries; preserve executable Rust separately. The transformation itself remains a trusted front-end unless its correspondence is proved.

## technique 3: automatic Tmq fixpoint transformation

what it is: algorithm `Tmq` computes a least fixpoint of definitions under an extension order, then unfolds, strengthens, and folds all clauses using those definitions. The `Define` operator has Skip, Extend, and Project cases; widening-based generalization stabilizes constraints.

how to do it:
1. initialize definitions with `Define(Q, ∅)`, projecting a definition for every queried program predicate (Section 6, pp. 11–12)
2. on each iteration, unfold all definitions, strengthen the unfolded clauses with all applicable queries, then call `Define` again (Figure 5, p. 12)
3. in Skip, reuse a definition whose summaries subsume the current ones and whose constraint is implied; in Extend, generalize old and new constraints and union summary atoms; in Project, project constraints onto basic input variables and create a new predicate (Figure 5, pp. 11–12)
4. stop at `lfp(τP,Q)`; apply `Fold(Strengthen(Unfold(lfp,P),Q),lfp)` to produce the transformed CHCs (Section 6, p. 12)
5. solve the transformed clauses with a CHC solver.

The paper uses a widening-based `α` so a sequence of generalized constraints stabilizes, and proves finite termination. “Theorem 3 (Soundness and Completeness of Algorithm Tmq ). For any set P of definite clauses and Q of catamorphism-based queries, P ∪Q is satisfiable if and only if Tmq (P, Q) is satisfiable.” (Section 6, p. 12)

Verus form: Inference: use this as an offline contract-strengthening pass that emits additional Verus lemmas or invariants. The widening/generalization is heuristic and should not weaken the final Rust specification; Verus must check each emitted lemma. No Verus construct represents a CHC least-fixpoint operator directly.

## technique 4: exploit mutual query information for recursive data structures

The practical gain is that a query for one recursive function supplies summaries to clauses for another function sharing its ADT arguments. In insertion sort, `ins-sort` receives sortedness facts from `ord-ins`, `append`, and `snoc`; the resulting `new` predicates let SPACER search one combined model instead of solving independent predicates. This matters for mutually recursive definitions where independent solving cannot discover the needed relation.

The baseline experiment illustrates the trigger: on the insertion-sort clauses, Z3-based SPACER failed to answer within five minutes before transformation (Section 3, p. 6). After transformation it proved satisfiability. The paper's broader benchmark contains 170 problems, split evenly into 85 satisfiable and 85 unsatisfiable, with 470 queries total (Section 7, p. 13). VeriCaTmq proved all 170; baseline SPACER proved 84 unsatisfiable problems and none of the satisfiable problems. Transformation took 275 seconds total (1.62 s/problem); transformed solving took about 174 seconds total (about 1 s average, 0.10 s median). Baseline's 30.27 seconds covers its 84 solved unsatisfiable problems, not all 170, so the numbers are not an apples-to-apples total-time comparison (Section 7, pp. 13–14, Table 1).

Verus form: Inference: this suggests a library of reusable recursive sequence/tree lemmas whose postconditions are carried across calls. The evidence does not show that Verus automation will discover those lemmas; an agent-written contract can still be wrong while Verus proves it.

## what is proved, trusted, and limited

The paper proves rule-level soundness/completeness, algorithm termination, and equisatisfiability under its CHC, catamorphism, and widening assumptions. The trusted chain includes the program-to-CHC translation, catamorphism definitions, generalization operator, transformation implementation, and SPACER/Z3. Inference: a Verus integration should treat Tmq as an untrusted clause optimizer and retain Verus checking of the final Rust contracts and recursive lemmas. The threat to agent-written verified Rust is moderate for list/tree APIs: missing or partial summaries can make proofs fail, while an over-weak contract can pass without establishing the intended property.

The paper already addresses query sharing, recursive ADT summaries, and sound/complete unfold-fold transformation. VL should not redo those as a new CHC algorithm. Its open gap is a checked bridge from Rust ownership, mutable data structures, and concrete machine arithmetic to the abstract list/tree summaries. The stated limitation is that unspecified dependent predicates may lack inferred catamorphisms; the authors leave propagation to such predicates as future work (Conclusion, p. 15).

## techniques for the catalog

- catamorphism-based CHC queries — express recursive list/tree properties as satisfiability queries over total functional summaries
- sound unfold/fold rules — introduce, unfold, strengthen, and fold predicates while preserving satisfiability
- query-based strengthening — inject constraints and summaries from related queries into each program predicate
- Tmq fixpoint transformation — compute stable definitions with Skip, Extend, Project, widening, then transform all clauses
- mutual-query solving — let a CHC solver reuse summaries across mutually recursive functions and multiple contracts

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
