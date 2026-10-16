# Solving Horn Clauses on Inductive Data Types Without Induction
(authored by agents unless marked 🧑)
Tag: `deangelis2018solving`, [paper](http://arxiv.org/abs/1804.09007v1)

## scope and formal result
The paper transforms constrained Horn clauses (CHCs) over lists and trees into equisatisfiable CHCs over linear integer arithmetic (LIA) and booleans. It separates structural-data reasoning from CHC solving. The abstract says: “We propose a transformation technique whose objective is the removal of these data structures from CHCs”. The key correctness result is conditional: “Given a program P that terminates, a property Prop holds for P iff the set Tr(P ) ∪ Tr(Prop) of clauses is satisfiable” (Section 3, p. 5). Algorithm E is only guaranteed to terminate for the class in Theorem 3; Algorithm EC adds constraint generalization outside that class.

## technique: translate functional programs and properties to CHCs
What it is. For each function, introduce a predicate whose final argument is the function result, then encode pattern branches as clauses. Encode a universal implication as a goal with head `false`; a violating constraint becomes derivable `false`.

How to do it. (1) Translate each recursive branch to a constrained fact or definite clause. (2) Translate the property and negate its postcondition into a goal. (3) Ask whether the resulting CHCs are satisfiable. For the tree example, `min-leaf`, `left-drop`, and `min` become clauses 1–7, while clause 8 is `false ← N ≥ 0, M + N < K, left-drop(N,T,U), min-leaf(U,M), min-leaf(T,K)` (Section 2, p. 3). The paper reports that direct Z3 cannot prove these because tree variables remain.

Verus form. Inference: a Verus implementation keeps executable Rust functions and states preconditions/postconditions with `requires` and `ensures`; recursive calls need a `decreases` argument where required. A relational CHC encoding is useful as an auxiliary proof model, but it does not replace Verus's ownership and memory model.

Evidence and limits. The translation theorem assumes program termination. It proves satisfiability equivalence, not that the property is a good requirement. The paper gives no separate measurement for translation correctness.

## technique: Algorithm E define–fold–unfold–replace
What it is. Algorithm E repeatedly introduces predicates for sharing blocks of non-basic data atoms, folds the original clause, unfolds definitions against original clauses, and replaces duplicate functional calls. Its output has only basic predicate arguments and preserves satisfiability if it terminates.

How to do it. (1) Initialize `Defs` empty, `InCls` to goals, and `TransfCls` empty. (2) For each non-fact `H ← c,B`, partition `B` into `SharingBlocks(B)` using shared non-basic variables. (3) Define a fresh `newp(V)` for each block, where `V` contains its distinct basic variables, and fold the block in the clause. (4) Unfold fresh definitions by resolution. Prefer an unfoldable atom that is strictly maximal under the non-basic subterm relation; otherwise unfold any remaining unfoldable atom. Mark newly introduced body atoms non-unfoldable. (5) Replace repeated calls to predicates known functional by unifying their result arguments. (6) Repeat until `InCls` is empty. The paper's tree example defines `new1(N,M,K)` for the single sharing block, unfolds `left-drop` and `min-leaf`, then replaces duplicate `min-leaf` calls to derive clauses 9–14 (Sections 4, pp. 6–9).

The strict-maximal strategy is a structural induction analogue. The authors state: “The subsequent folding steps correspond to applications of the inductive hypotheses.” This is a transformation, not an induction rule in the target solver.

Verus form. Inference: define ghost or spec predicates for the abstract result of a recursive Rust structure, then prove fold/unfold equivalence lemmas with `proof fn` and `ensures`. Verus has no CHC `Define`, `Fold`, or `Unfold` commands; the analogous steps are explicit helper lemmas and recursive proof functions. Use `assert`, `requires`, `ensures`, and `decreases` constructs documented for Verus, and retain executable Rust separately.

Evidence and limits. Theorem 2 says that if E terminates, input and output are satisfiable together and all output clauses have basic types (Section 5, p. 10). Termination needs disjoint quasi-descending slice decompositions and goals without sharing cycles. A goal with a cycle can generate infinitely many predicates; this is a concrete failure mode.

## technique: termination checks with slices and sharing cycles
A slice selects at most one non-basic argument per predicate and projects a clause onto that argument. A slice decomposition must cover every non-basic argument; disjoint, quasi-descending slices provide the structural decrease condition. A sharing cycle is a cycle of atoms connected by shared non-basic variables. Theorem 3 requires every definite clause to have a disjoint quasi-descending slice decomposition, and every goal to have distinct-variable atoms and no sharing cycle (Section 5, pp. 10–11).

If a constrained fact violates disjointness, preprocess it by introducing an equality predicate for the non-basic type. The paper rewrites `left-drop` with `eqt` for binary-tree equality; it says this “can be done automatically as a pre-processing step”.

Verus form. Inference: before writing a recursive Verus proof, identify a well-founded structural or numeric `decreases` measure and avoid mutually recursive ghost relations whose shared structure has no decreasing argument. Equality predicates can isolate shape-equality obligations, but they still require explicit lemmas.

## technique: Algorithm EC with constraint generalization
What it is. EC extends E by allowing definitions whose bodies include LIA/Bool constraints. `Gen` computes a constraint more general than both the current clause constraint and a prior definition's constraint. The implementation uses widening over bounded-difference shapes to avoid infinitely many definitions differing only in constraints.

How to do it. Keep the E loop, but for each sharing block `B_i` compute `g_i := Gen(c,B_i,Defs ∪ NewDefs)`, define `newp_i(V_i) ← g_i,B_i`, and fold using that constrained definition. The paper's list example keeps `M=N` while transforming `take`, `drop`, `append`, and `diff-list`; the unconstrained version does not terminate, whereas the constrained definition yields a finite recursive set (Section 6, pp. 11–13).

Verus form. Inference: bounded-difference widening has no direct Verus primitive. A practical analogue is to strengthen or generalize loop invariants and prove monotonicity lemmas, while keeping the invariant finite and explicit. Do not present widening as a Verus feature.

## evidence and comparison
The tool uses VeriMAP, Parma Polyhedra Library, and Z3 4.6.0 Spacer. The benchmark has 105 verification problems: 57 FirstOrder, 13 HigherOrderInstances, 16 MoreLists, and 19 MoreTrees; 94 satisfy their properties and 11 do not. With a 300-second timeout, direct Z3 solves 12/105 in 34.18 seconds total; EC followed by Z3 solves 91/105 in 84.03 seconds total; RCaml solves 66/105 in 436.17 seconds total (Table 1, p. 14). The paper reports averages of 2.85, 0.92, and 6.61 seconds respectively, but these are aggregate averages as defined in the table, not per-problem times including timeouts. EC;Z3 proves 65 of the 66 problems also proved by RCaml and 26 additional problems. Fourteen problems exceed the EC timeout, and two problems solved by direct Z3 are not solved by EC within timeout. For the 10 problems solved by both direct Z3 and EC;Z3, the paper reports 3.41 seconds versus 9.74 seconds average.

Inference: The trusted base includes the CHC transformation correctness arguments, VeriMAP, PPL widening, Z3/Spacer, and the translation from OCaml. Inference: the technique threatens a VL product only if its workload can be expressed as relational CHCs over recursive data; it suggests a preprocessing layer for Verus proofs rather than replacing Verus's ownership reasoning. Existing VL should not redo fold/unfold elimination or this 105-problem comparison; useful new work would test whether analogous ghost-state abstraction reduces Verus proof effort.

## techniques for the catalog
- CHC translation: encode terminating functional programs and negated properties as satisfiability goals
- define–fold–unfold–replace: abstract shared inductive data, unfold structurally, then exploit functional predicates
- slice termination test: require disjoint quasi-descending slices and reject sharing cycles
- constrained EC: generalize LIA/Bool constraints with widening while folding definitions
- solver handoff: send the basic-type CHCs to Z3/Spacer after transformation

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
