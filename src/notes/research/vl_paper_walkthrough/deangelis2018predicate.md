# Predicate Pairing for Program Verification
(authored by agents unless marked 🧑)
Tag: `deangelis2018predicate`, [paper](http://arxiv.org/abs/1708.01473v2)

Page numbers below are PDF page numbers of the arXiv v2 file (page 1 is the title/abstract page; the TPLP print is vol. 18(2), 126-166).

## scope and contribution

De Angelis, Fioravanti, Pettorossi, and Proietti transform constrained Horn clauses (CHCs) before solving them. The target is a solver that searches for models definable in a constraint class A, such as a subset of linear integer arithmetic (LIA). The paper's stated motivation (section 7, PDF page 30) is that "state-of-the-art solvers often fail to prove the satisfiability of sets of clauses encoding relational properties because they can only infer relations among the variables of individual atoms." The paper introduces Predicate Pairing, which, in the paper's words, "introduces a new predicate defined by the conjunction of two predicates together with a conjunction of constraints." (section 1, PDF page 4).

Inference: For VL, this is a solver-preprocessing pattern for relational lemmas: pair calls whose arguments are synchronized, then let the SMT-backed verifier discover cross-call invariants in a simple theory.

## technique: encode program properties as CHCs

What it is. A Hoare triple or relational property is reduced to satisfiability of clauses. For `sum_upto` (Figure 1), the paper encodes the loop relation `su` and a false-headed clause that represents a violation. It explains: “This triple is valid if the following set of clauses, called verification conditions, is satisfiable.” (section 1, PDF page 2).

How to do it.

1. Obtain CHCs for the operational semantics of the program. The paper says they "can be obtained in an automatic way from an interpreter of the C-like imperative language we consider and the given Hoare triple" (section 1, PDF page 2); section 4 (PDF page 15) says the clause sets "can be derived by specializing the interpreter of the imperative language with respect to the programs".
2. Represent loops with recursive predicates and base/step clauses; in clauses 2 and 3, `su` has a base clause for `X≤0` and a recursive clause for `X>0` (section 1, PDF page 2).
3. Encode a property violation as a clause with head `false`. In clause 1 the body contains the negated postcondition (`M > Sum`), the precondition (`M ≥ 0`), the initialization (`R = 0`), and the program predicate `su` (section 1, PDF page 2).
4. Ask a CHC solver for satisfiability. Per the paper, the triple is valid if the clause set is satisfiable (section 1, PDF page 2).

Verus form. Inference: represent the program relation as a `spec fn` or proof predicate and encode the property as a lemma with `requires` and `ensures`. For loops, use a `while` invariant rather than recursive CHCs when verifying executable Rust. The false-headed-clause idea maps to assuming a negated postcondition and proving `false` with `assert(false)`; this is an inference because the paper does not use Verus.

Limits. The paper says satisfiability of CHCs is undecidable, so "CHC solvers may not be able to return conclusive answers" (section 1, PDF page 3). Inference: success of an A-definable-model search is therefore a solver capability condition, not a general completeness theorem. The paper adds that existence of an A-definable model is semidecidable when validity in A is decidable (section 1, PDF page 3).

## technique: preserve and improve A-definable models by unfold/fold

What it is. The paper defines transformation rules R1-R4 (definition, unfolding, folding, constraint replacement; section 3, PDF pages 8-9). Provided every definition is unfolded at least once, the rules preserve D-satisfiability (Theorem 2, PDF page 9). Every transformation sequence is A-sound, meaning that if the original clauses have an A-definable model then so do the transformed clauses (Definition 2 and Theorem 4, PDF page 10). The authors state: “Every transformation sequence is A-sound.” (Theorem 4, section 3, PDF page 10).

How to do it.

1. Choose a constraint set C with canonical interpretation D, and a model class A⊆C (section 3, PDF page 8; the paper's example uses C = LIA and A = 2VAR, a subset of LIA with comparisons between at most two variables, Examples 1 and 3, PDF pages 6 and 11).
2. R1: introduce a fresh definition `newp(X1,...,Xk) ← c, G` where `c` is in A and `G` is a non-empty conjunction of atoms whose predicates occur in the original set P0 (PDF page 8).
3. R2: unfold an atom by replacing it with the bodies of all clauses whose head is that predicate (PDF page 8).
4. R3: fold a conjunction of atoms into the head of a definition when the substitution, equivalence, and variable conditions (i)-(iii) hold (PDF pages 8-9).
5. R4: replace a set of clauses with the same head and body atoms by clauses with equivalent constraints; this also deletes a clause whose constraint is unsatisfiable (PDF page 9).
6. For Theorem 2 to apply, every definition introduced must be unfolded during the sequence; then P0 is D-satisfiable if and only if the final set Pn is (PDF page 9).

Verus form. Inference: this is analogous to introducing ghost predicates and lemmas that summarize conjunctions of facts, then rewriting proof obligations to use the summary. Use `lemma` functions and `assert` statements in Verus; do not treat `lemma` as a runtime keyword or use CHC rule syntax directly. The semantic preservation proof remains an external metatheory unless implemented in Verus.

A-soundness is one-way. The paper gives additional conditions for A-completeness, stated for the case A equal to C: no application of unfolding is a self-unfolding, and every application of folding is a reversible folding (Theorem 5, PDF page 11). In Example 3 (PDF page 12) the paper observes that the 2VAR-definable model for the transformed clauses exists while none exists for the original because "the applications of the folding rule R3 are not reversible foldings". The paper also says A-completeness "might not always be a desirable property" (section 3, PDF page 11), since transformation is meant to produce an A-definable model where none existed. Inference: a transformed solver goal can be easier without preserving the set of all solver-definable explanations.

## technique: choose predicate pairs by shared equalities

What it is. Predicate Pairing creates a fresh predicate for two atoms plus equalities implied by the current constraint. The strategy (Algorithm 1, PDF page 14) repeatedly unfolds one atom from each predicate set and then folds the pair that shares the greatest number of cross-argument equalities. It defines `Eq(d,A,B)` as the set of equalities `X=Y` with X a variable of A and Y a variable of B, such that the constraint d entails `X=Y`.

How to do it.

1. Start with a false-headed clause `Cinit: false ← cinit, q(X), r(Y)` and two disjoint clause sets Q and R defining q and r (Algorithm 1, PDF page 14).
2. While an input clause has a body atom from Q and an atom from R, unfold each once (Algorithm 1, PDF page 14).
3. In each unfolded clause, take a pair (A from Q, B from R) such that `|Eq(d,A,B)|` is at least `|Eq(d,M,N)|` for every other Q/R pair (M,N) in the body (Algorithm 1, PDF page 14).
4. If an existing definition allows folding of (A,B), fold with it; otherwise introduce `newp(Z) ← e,A,B`, where Z is the union of the variables of A and B and e is the conjunction of the equalities in `Eq(d,A,B)` (Algorithm 1, PDF page 14).
5. Add each new definition to the input clause set, so it is itself unfolded and paired in later iterations (Algorithm 1, PDF page 14).
6. Stop when no input clause has both a Q atom and an R atom. Termination argument: the number of definitions is bounded by the number k of conjunctions `(e,A,B)` with A, B atoms over predicates in Q∪R and e a conjunction of equalities between their variables, so the loop body runs at most k times (section 4, PDF page 19). Theorem 6 (PDF page 19) states termination and that the output is D-satisfiable iff the input is, and has an A-definable model if the input has one.
7. The strategy may be iterated, so that more than two predicates end up tupled together (section 4, PDF pages 19-20).

Verus form. Inference: identify synchronized recursive calls in two proof branches, define a ghost predicate over both states and shared indices, and prove recursive relational lemmas using that predicate. The equality-maximization heuristic could guide a lemma generator, but Verus has no CHC transformation phase; it must generate Rust proof functions or assertions.

## worked example: sum_upto vs square (Examples 2 and 3)

Clauses 4-6 relate `sum_upto` and `square`: if m = n initially, then `sqr` is not smaller than `sum`. The paper shows (Example 2, PDF pages 7-8) that clauses 2-6 are satisfiable but have no 2VAR-definable model, and argues that even a LIA-definable model is unavailable because one would have to discover quadratic relations such as Sum = M×(M−1)/2 and Sqr = M×M. In Example 3 (PDF pages 11-13), the definition rule introduces `su_sq` pairing `su` and `sq`, unfolding and constraint replacement give clauses 12 and 13, and folding with clause 7 gives the recursive clause 15. The paper notes that the resulting set has a 2VAR-definable model that maps `su_sq` to the constraint `Sum ≤ Sqr ∨ R0 > S0 ∨ M > N` and `su` and `sq` to `true`. The paper's comment on this example (PDF pages 12-13): "the introduction of the new predicate su sq(M , R0, Sum, N , S 0, Sqr ), defined in terms of the conjunction of su(M , R0, Sum) and sq(N , Y , S 0, Sqr ), allows us to discover linear relations be-" and continues on page 13 "tween Sum and Sqr without having to deal with nonlinear constraints." (Example 3, remark (3); the text is reproduced as in the extracted text, with its spacing and the hyphenation.)

## worked example: Ackermann program equivalence

The paper compares `ackermann1`, which uses recursion only, with `ackermann2`, which uses recursion and iteration (section 4, PDF pages 13-14); both implement the specification S1-S3. Their equivalence is encoded by clause 9, which requires equal non-negative inputs and unequal outputs (`A1 ≠ A2`) (PDF page 16). The paper explains that a LIA-definable-model solver cannot prove clauses 1-9 directly, because it "should discover that the atoms ackermann1 ... and ackermann2 ... imply the two equalities A1 = ackermann(M1,N1) and A2 = ackermann(M2,N2)", and these "cannot be expressed as linear integer constraints" (section 4, PDF page 16, paraphrase of the quoted fragments). The first pairing definition is clause 11:

`new1(M1,N1,A1,M2,N2,A2) ← M1=M2, N1=N2, ack1(M1,N1,A1), ack2(M2,N2,A2)` (section 4, PDF page 17).

In the second iteration, clause 15 has two `ack1` atoms and two `ack2` atoms. The strategy pairs `ack1(M1,Y1,Z1)` with `ack2(M2,Y2,Z2)` because they share two equalities (M1=M2 and Y1=Y2), and the other two atoms are paired through a new definition, clause 17, `new2`, whose equality is only `M1=M2` (PDF pages 17-18). The run ends after three iterations with TransfCls = Q ∪ R ∪ {12, 13, 16, 18, 19, 24, 25, 26, 27} (PDF page 19).

Evidence. Z3 constructs a LIA-definable model of the transformed clauses; in clause 12 it infers that `new1(...,A3)` implies `A1 = A3 + 1`, which with `A2 = A3 + 1` gives `A1 = A2`, so the body is false. By Theorem 2 this entails that clauses 1-9 have a Z-model, hence the programs are equivalent (section 4, PDF page 19). The paper gives no separate time for this single example; it is one of the 13 `nlin` problems in Table 2.

## relational properties and security

The same false-headed pattern, given in general as clause RP (section 5, PDF page 20), encodes equivalence of programs with nonlinear or nested recursion, injectivity, monotonicity, functional dependence, non-interference, equivalence of loop-optimized versions with their originals, and equivalence of integer-array programs (section 5, PDF pages 20-27). For loop optimizations, the paper reports success on specific instances and says it leaves schematic correctness proofs of optimizations "for future research" (section 5.4, PDF page 25). For non-interference, two executions start with equal public input and possibly different private input; unequal public outputs form the violating body. The paper gives the clause: “false ← OutL 6= OutL1, L = L1, p(L, H , OutL), p(L1, H 1, OutL1)” (section 5.3, PDF page 23). The paper's program HL (`while (high >= 1) { high = high-1; low = high; }`) violates non-interference, so the clause set for it is unsatisfiable (section 5.3, PDF pages 23-24). The paper also reports a program HL1 where `low1` is incremented and then decremented by `f(high)` and `g(high,low1)`, two different but equivalent functions: "This program HL1 does satisfy the non-interference property, and thus the corresponding set of clauses is satisfiable." (section 5.3, PDF page 24).

Inference: in Verus, model two executions as two state values and prove a non-interference lemma requiring equal public fields and concluding equal public outputs. A paired ghost predicate can summarize synchronized loop iterations, but termination and heap framing require explicit Verus invariants.

## experimental evidence

Implementation uses VeriMAP for Algorithm 1 and Z3 version 4.5.0 with the Duality fixed-point engine; CHCs are translated to SMT-LIB (section 6, PDF page 27). The benchmark contains 163 sets of CHCs, 153 satisfiable and 10 unsatisfiable, all acting on integers and 14 of them on integer arrays (section 6, PDF pages 27-28). It runs on a single core of an Intel Core Duo E7300 2.66GHz processor with 4GB of memory running Ubuntu, with a timeout of 300 seconds for all problems (section 6, PDF page 28). The 163 problems fall in 12 categories (nlin, mon, inj, fun, nint, lopt, ite, arr, rec, i-r, comp, pcor).

Before pairing, Z3 solves 31 of 163 problems; after pairing, it solves 135 of 163 (Table 2, PDF page 29; the category rows sum to these totals). Table 2 totals: Z3 time on the solved problems is 144.58 seconds before and 121.42 seconds after; VeriMAP's Predicate Pairing step takes 132.36 seconds over all 163 problems, with no timeout during pairing. The table's "Average Time" row gives 4.66 (before), 0.81 (PP) and 0.90 (after). The times for translating to SMT-LIB are given separately: 6.39 seconds for the first process and 22.59 seconds for the second (PDF page 29). The paper reports that "the average time taken to run PP and then Z3 (1.88 seconds) is lower than the average time taken to run Z3 on the original set of clauses (4.66 seconds)" (section 6, PDF page 29). Inference from the table: 4.66 = 144.58/31 and 1.88 = (132.36+121.42)/135, so these averages are per solved problem and compare different problem sets (31 versus 135 problems); the paper's like-for-like comparison is the 28-problem one below.

Size increase: the paper says the transformed clauses are larger, "size increases of about 2.16 times on average" (section 6, PDF page 29). It found "three problems which Z3 was able to solve before the application of the PP strategy ... and it was no longer able to solve, within the given time limit, after" (section 6, PDF page 30), even though PP preserves all LIA-definable models. The paper's hypothesis is that "the termination of the algorithms implemented by the Z3 solver is sensitive to the syntactic form of the input clauses". On the 28 problems solved both before and after, PP plus Z3 averages 1.58 seconds versus 1.77 seconds for Z3 alone (PDF page 30). PP was iterated on 24 CHC sets (PDF page 28).

These numbers show increased solver coverage, not proof of all 163 properties. Inference: 135/163 is 82.8%; the paper does not state a percentage. The three regressions are consistent with the paper's explanation of syntactic sensitivity in Z3, but the paper does not test that explanation. The paper also says it "experimentally checked that most of the problems considered in Section 6 cannot be solved via (non-conjunctive) specialization alone" but does not report these results (section 7, PDF page 32).

## trust, limits, and VL implications

Proved claims concern CHC encodings and transformation theorems; the proofs of Theorems 3 and 5 are in the appendix (PDF pages 38-41). Inference: trusted components for a user of this method include the interpreter specialization that generates CHCs, the correctness of the transformation implementation, the constraint theory and SMT solver, and the adequacy of each relational encoding; the paper itself omits the details of generating the relational verification conditions ("For brevity, we do not give here the details", PDF page 8, citing De Angelis et al. 2016). Inference: for VL, a Verus backend would additionally trust the Verus verifier and SMT solver, while ghost-predicate generation must preserve Rust heap and termination semantics.

The study already covers CHC encoding of relational properties, a terminating equality-based pairing algorithm, A-soundness, and a broad benchmark. VL should not redo these generic ideas. Inference: useful new work is a Verus lemma generator that detects shared equalities between two executions, generates relational ghost predicates, and reports solver regressions when transformed obligations grow.

Inference: threat to agent-written verified Rust is medium to high for relational claims. Pairing can substantially improve automation (31/163 to 135/163 in the paper's benchmark), but transformed clauses are about 2.16 times larger on average, three problems regressed to timeouts, and the guarantee is about solver-definable models rather than the correctness of the source-to-CHC translator or Rust implementation.

## techniques for the catalog

- CHC property encoding — represent operational semantics recursively and put a negated relational property in a false-headed clause
- unfold/fold preprocessing — introduce, unfold, fold, and constraint-replace predicates while preserving D-satisfiability
- equality-guided predicate pairing — pair atoms whose arguments share the most entailed equalities and summarize them with a fresh predicate
- relational verification via paired executions — encode equivalence, monotonicity, injectivity, functional dependence, non-interference, and optimization correctness for specific instances as two-run CHCs
- solver coverage measurement — compare solved counts, time, clause growth, and timeout regressions before and after preprocessing

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "This program HL1 does satisfy the non-interference property, and thus the corresponding set of clauses is satisfiable."): read the whole paper text (sections 1-8, references, appendix) and checked every quotation, number (163/153/10/14 benchmark split, 31 to 135 solved, Table 2 totals and averages, 2.16 times, three regressions, 28-problem comparison, hardware, timeout), theorem, rule and Algorithm 1 step, and page reference against it; changed: moved the su_sq quotation from the Ackermann example to its own sum_upto/square example, corrected Ackermann program description, A-completeness (A = C requirement), Theorem 2 wording, the non-interference quote page (23), Table 2 average interpretation and page references, and marked own conclusions as Inference; did not check: the appendix proofs in detail, the arXiv abstract page or the published TPLP version, or anything outside the paper (the referenced benchmark and tools).
