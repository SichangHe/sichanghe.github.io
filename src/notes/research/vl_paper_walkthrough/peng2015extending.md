# Extending ACL2 with SMT Solvers
(authored by agents unless marked 🧑)
Tag: `peng2015extending`, [paper](https://doi.org/10.4204/EPTCS.192.6)

## what the paper proves or measures

Smtlink is an ACL2 clause processor that sends suitable arithmetic goals to Z3 while ACL2 checks the translation assumptions and returned subgoals. The paper targets polynomial and rational arithmetic in analog and mixed-signal (AMS) systems. Its central design is explicit: “We present our extension of ACL2 with Satisfiability Modulo Theories (SMT) solvers using ACL2’s trusted clause processor mechanism.” (Abstract, p. 61). ACL2 supplies induction and proof structuring; Z3 supplies automatic linear and nonlinear arithmetic. The paper presents examples and one phase-locked-loop (PLL) proof reduction, rather than a benchmark success rate.

## technique 1: two-phase clause translation with a trusted boundary

what it is: translate an ACL2 goal first into a small, expanded ACL2 language, then into a Python/Z3 representation. Z3 checks that the negation of the augmented goal is unsatisfiable. Smtlink returns ACL2 subgoals that justify the expansion and added assumptions.

how to do it:
1. start from an ACL2 goal `G` and collect type assertions, function-expansion results, user hypotheses, uninterpreted-function declarations, and substitutions (Sections 3.1–3.2, pp. 65–70)
2. produce expanded clause `G0` using only supported primitive forms; retain assumptions `A` describing the generalizations
3. translate `G0` to SMT expressions, declare SMT variables from the type assertions `T` and uninterpreted functions `U`, and ask Z3 whether `(not (implies H G0))` is unsatisfiable, where `H` is the set of user `:hypothesize` terms (Section 3.2, p. 69); the second-phase output is not returned to ACL2
4. return `Q1 = (G0 ∧ A) ⇒ G` and `Q2 = A ∨ G` (Equation 2, p. 70) to ACL2; ACL2 proves them and the SMT-checked clause establishes the original goal.

Figure 1 (p. 65) shows the pipeline from the original clause through an expand-and-simplify step to the expanded clause, then a translation to the SMT clause for Z3. The authors state: “Smtlink returns a list of clauses for subgoals that arose in the translation process.” (Section 3, p. 64)

Verus form: Inference: use a small, reviewable translation layer that emits Verus proof obligations, while keeping the Verus verifier as the checker of the final `requires`/`ensures` contract. A proof-producing SMT bridge could emit `lemma` calls or `assert` facts, but the translation and solver remain outside Verus unless their correspondence is proved. Do not treat an external solver answer as a Verus proof by itself.

evidence and limits: the first translation phase is largely checked by ACL2; the second Python interface is the critical trusted code. The authors explicitly say the current construction of `Q1` and `Q2` is trusted, unverified code (Section 3.3.6, p. 72). Inference: I found no solver error rates or machine-checked soundness theorem for the implementation in the paper; Section 3.3 gives an informal argument.

## technique 2: type-safe generalization from untyped ACL2

what it is: ACL2 is untyped and total, while Z3 is many-sorted. Smtlink recognizes syntactic `booleanp`, `integerp`, and `rationalp` hypotheses, maps them to SMT sorts that contain all values accepted by the ACL2 recognizer, and strengthens the SMT claim when the sort is a superset.

how to do it:
1. require each free variable sent to Smtlink to have a recognizable type hypothesis (Section 3.1.1, pp. 65–66)
2. replace each recognized type predicate with a Boolean constant in `G0`, while retaining the original predicate in the assumption set `A`
3. declare corresponding SMT variables; the implementation maps `booleanp` to SMT Boolean and both `integerp` and `rationalp` to SMT reals (Section 3.2.1, p. 69)
4. let ACL2 prove the returned type subgoals and the implication that restores the original untyped goal.

The paper's counterexample is `not-really-a-theorem`: without type hypotheses, ACL2's total arithmetic permits nonnumeric values, while Z3's real interpretation would prove a different theorem (Program 3.1, pp. 65–66). It warns that mapping ACL2 rationals or integers to reals can make a valid ACL2 theorem fail in Smtlink: the theorem that no rational square equals 2 cannot be discharged because Z3 finds the real value `sqrt(2)` (Program 3.4, p. 69).

Verus form: Inference: Rust types already constrain many values, but machine integers are finite and overflow matters. Encode domain restrictions in `requires`; use mathematical `int` specifications only when the implementation-to-specification relation is proved. A successful real-arithmetic lemma must not be read as a proof about wrapping or overflowing Rust arithmetic.

## technique 3: controlled function expansion and abstraction

what it is: expand user-defined ACL2 functions to a bounded depth, replace deeper recursive calls with typed fresh variables, or declare functions uninterpreted. Replace unsupported subexpressions with fresh variables and add hypotheses constraining them.

how to do it:
1. supply `:expand` hints with each function's return type and a maximum expansion level (Program 3.3, p. 67)
2. recursively expand calls; beyond the limit, introduce a fresh SMT variable, record its claimed type, and return an ACL2 subgoal checking that type
3. alternatively declare a function as uninterpreted with argument and return recognizers
4. for unsupported expressions such as `(expt z m)`, use `:let` substitution to bind a fresh variable and `:hypothesize` to add facts; ACL2 checks the substitutions and hypotheses (Program 2.3, pp. 63–64)
5. rerun the SMT proof on the generalized clause.

The paper notes a solver interaction: “Z3 does not combine its theories of non-linear arithmetic and uninterpreted functions: if a formula includes an uninterpreted function, the non-linear arithmetic solver is silently disabled.” (Section 3.1.2, p. 67). Thus fresh variables can be preferable to uninterpreted functions for nonlinear goals.

Verus form: Inference: model an unsupported Rust operation with a `spec fn` summary only after proving a lemma relating the summary to executable code; bounded unfolding can correspond to recursive lemmas with explicit decreases. A fresh unconstrained spec value is an assumption, not evidence. Verus `lemma` and `assert` can discharge the side conditions, while executable functions remain ordinary Rust.

## technique 4: customizable theory inference with RewriteExpt

what it is: use a custom SMT interface that recognizes `expt` instances, checks a guard, and adds a small set of algebraic consequences before Z3 runs. This removes repetitive user hints for nonlinear recurrence proofs.

how to do it:
1. declare `expt` as an uninterpreted function in the custom configuration
2. in `RewriteExpt.prove`, find each `expt` instance and ask whether the theorem hypotheses imply its guard (the text of Section 4, p. 73 says the base must be non-zero or the exponent non-negative; the Table 1 note says the exponent must be positive)
3. if the guard is not provable, fail; otherwise apply rules such as `expt x 0 → 1`, multiplicative decomposition, and monotonicity (Table 1, p. 73)
4. add each consequent as an SMT hypothesis and solve the remaining claim.

In a PLL proof, one theorem formerly needed 19 supporting lemmas and 334 lines of ACL2; the customized processor replaced it with a 13-line theorem (Section 4, p. 73). This is one theorem's proof-size comparison, not a general compression ratio.

Verus form: Inference: package recurring arithmetic facts as named `lemma`s with explicit `requires` guards and `ensures` consequences, then invoke them from proofs. Keep the guard in the contract; an automated rewrite that omits it would be unsound. A future proof-producing implementation could return those lemmas to the standard checker, as the authors suggest.

## what is proved, measured, and trusted

The paper gives an informal argument (Section 3.3, pp. 70–72) that ACL2 proving `Q1` and `Q2` establishes `G`, assuming Z3 and the translation code are correct; it demonstrates polynomial inequalities, an `expt` example, and part of a global PLL convergence proof. It reports no denominator-based benchmark accuracy. Trust includes ACL2, Z3, Python, the ACL2-to-Python translation, fixed external paths, and user-provided hypotheses/substitutions. The standard configuration bakes paths and interface code into certified ACL2 code to reduce accidental changes; the customizable configuration uses a separate trust tag and puts the burden on the user (Sections 1, 3.3.5 and 4, pp. 62, 71–73). The authors themselves say “we deliberately take a pragmatic approach to integration and trust both the theorem prover and the SMT solver.” (Related Work, p. 74)

## techniques for the catalog

- two-phase SMT clause processing — expand ACL2 goals, solve an SMT form, and return ACL2 obligations for the added assumptions
- type-safe sort mapping — require recognizers and map them to SMT supersets so translation does not prove an untyped false claim
- bounded expansion and substitution — generalize recursive or unsupported functions with typed fresh variables and checked hypotheses
- custom theory inference — add guarded rewrite rules such as `expt` decomposition before SMT solving
- trusted-interface minimization — isolate the solver bridge and have the theorem prover check translation side goals
