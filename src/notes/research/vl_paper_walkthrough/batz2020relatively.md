# Relatively Complete Verification of Probabilistic Programs
(authored by agents unless marked 🧑)
Tag: `batz2020relatively`: [paper](http://arxiv.org/abs/2010.14548v2)

## what the paper proves or measures

The paper constructs a syntactic language `Exp` for quantitative assertions about probabilistic programs. Assertions map states to nonnegative extended reals; the weakest preexpectation `wp⟦C⟧(f)` is the expected postexpectation after program `C` terminates. The main theorem is expressiveness: if `f` is expressible, then the weakest preexpectation of every pGCL program is expressible (Theorem 10.2, pp. 22–23). The abstract states: “We prove that our syntax is expressive in the following sense: Given any probabilistic program C, if a function f is expressible in our syntax, then the function mapping each initial state σ to the expected value of f evaluated in the final states reached after termination of C on σ (also called the weakest preexpectation wp⟦C⟧(f)) is also expressible in our syntax.” (Abstract, p. 1)

The paper defines expressiveness as: “The set Exp of syntactic expectations is expressive iff for all programs C and all f ∈ Exp there exists a syntactic expectation g ∈ Exp, such that wp⟦C⟧(JfK) = JgK.” (Definition 3.1, p. 8)

The resulting verification system is relatively complete in Cook's sense. “Apart from proving a single inequality between two functions given by syntactic expressions in our language, given f, g, and C, we can check whether g ⪯ wp⟦C⟧(f).” (Abstract, p. 1) The remaining inequality is left to an oracle: “Given an oracle for discharging inequalities between syntactic expectations, every correct inequality of the above form can be derived.” (Section 12.1, p. 25) Inference: the paper gives no procedure for that inequality, so this is not an automated verification result.

## technique 1: weakest-preexpectation semantics

what it is: calculate expected postvalues backwards through a probabilistic program. For a probabilistic choice, the transformer is a weighted sum; for a conditional, it guards each branch by the Boolean predicate; for a loop, it is the least fixed point `lfp Y. [¬φ]·X + [φ]·wp⟦C'⟧(Y)` of the loop's characteristic function (Figure 2, p. 7), which equals the supremum of its finite iterations from 0 (Lemma 2.2, p. 7).

when to use: use it to state expected values, termination probabilities, probabilities of postconditions, and distributions over final states. The program language pGCL has assignments, conditionals, probabilistic choices, and while loops (Section 2.1, p. 4).

how to do it:
1. choose a postexpectation `f`; Boolean predicates become indicator expectations `[φ]`
2. apply the transformer rule for each syntax constructor, preserving probabilities and expectations (Section 2.2, pp. 5–7)
3. for a loop, reason about the least fixed point of the loop functional, using the paper's characterization as a supremum over path lengths of sums over finite state sequences (Section 6, pp. 14–16; Theorem 10.1, p. 22)
4. prove the desired lower or upper bound as an inequality between the resulting preexpectation and a syntactic bound.

Verus form (Inference): represent a finite-state probabilistic transition as a Rust model with a ghost probability or rational weight, and state expected-value contracts with `ensures`. Use `spec fn` for the transformer and proof functions for algebraic inequalities. Verus has no native probabilistic wp calculus, so the transition model and arithmetic facts must be encoded explicitly; `old(...)` can relate pre-state values in an `ensures` clause.

evidence and limits: the paper's result is mathematical, not a runtime benchmark. Termination probabilities are expressible because `wp⟦C⟧(1)` is expressible (Section 12.2, p. 25), but checking the final inequality is left to an oracle. The language assumes nonnegative rational-valued program variables and nonnegative extended-real expectations (Sections 2.1 and 11, pp. 4, 24). It has no nondeterministic choice, and whether weakest liberal preexpectations (needed for conditioning) are expressible “currently remains open” (Section 13, pp. 26–27).

## technique 2: a deliberately restricted expressive syntax

what it is: define `Exp` from arithmetic expressions, guarded expectations `[φ]·f`, addition, scaling by arithmetic expressions, and supremum/infimum `sup_x f` and `inf_x f` over a variable. Arithmetic expressions use nonnegative rationals, variables, addition, multiplication, and truncated subtraction (monus); Boolean expressions use strict inequality `a<a`, conjunction, and negation (Sections 4.1–4.4, pp. 8–11).

how to do it:
1. encode constants and program variables as arithmetic expressions
2. guard an expectation by `[φ]` to make it zero outside a predicate
3. combine branches with addition and scale by arithmetic expressions
4. use supremum and infimum to bind a variable. Their semantics evaluates the body at all nonnegative rational values and takes the supremum or infimum; the supremum of an empty set is 0, the infimum of an empty set is ∞, and the supremum of an unbounded set is ∞ (Section 4.4, p. 11)
5. avoid unrestricted `f·g` in the surface syntax. The authors show it breaks prenex normalization because `0·∞=0`; instead use the later constructive product encoding.

The paper's example `sup_x [x·x < 2]·x` evaluates to `√2`, showing that rational syntax can denote an irrational semantic value (Section 4.4, p. 11). This is a useful reminder that syntactic expressibility and rational evaluation are different claims.

Verus form (Inference): use `spec fn` for arithmetic and Boolean expressions, and ghost lemmas for guard, addition, and finite bounds. In the paper, supremum and infimum range over all nonnegative rationals, so a Verus encoding would need a finite domain or an externally proved bound; an unbounded real supremum is outside ordinary executable Rust. Keep the restricted product discipline when normalization or automation depends on expression shape.

evidence and limits: the expressiveness proof needs a syntactic normal form and therefore forbids direct arbitrary expectation multiplication (Section 4.6, pp. 11–12). Negative program variables are emulated by magnitude and sign variables (Section 11.2, pp. 24–25), and expectations stay unsigned (Section 11.1, p. 24).

## technique 3: constructive loop expressiveness with Sum and Product

what it is: encode finite sums and products over a natural-number bound inside `Exp`, using Gödel-number encodings of sequences, Dedekind cuts (Section 8, pp. 20–21), and substitution. `Sum` and `Product` make the finite path formula for a loop expressible even though direct aggregation operators are absent.

how to do it:
1. encode a sequence by a Gödel number and an `Elem` predicate, extend it to rationals with `RElem` and to program states with `StateSequence` (Sections 7.2–7.4, pp. 18–20)
2. define `Sum[v_sum,f,v]`, built from the Dedekind normal form of `f` (Theorem 8.4, p. 20; Lemma 9.1, p. 21), so that its value is the sum of `f[v_sum/j]` for `j` from zero through the value of `v` (Theorem 9.2, p. 21)
3. define `Product` analogously (Theorem 9.4, p. 22); it also yields an unrestricted product `f ⊙ g` (Corollary 9.5, p. 22)
4. Theorem 10.1 (p. 22) writes the loop's weakest preexpectation as a supremum over path length `k` of a sum over state sequences of the terminal value `[¬φ]·f` times the product of one-step probabilities `wp⟦if (φ) {C'} else {skip}⟧([σ_{i+1}])(σ_i)`; the proof of Theorem 10.2 (p. 23) defines an expectation `Path[f]` for the summand
5. take `S length : S nums : Sum[v_sum, StateSequence(v_sum, length) ⊙ Path[f](length, v_sum), nums]`: the supremum over `length` corresponds to the supremum over `k`, and the `Sum` ranges over the Gödel numbers of state sequences of that length. Theorem 10.2 thereby gives an expression for every loop's weakest preexpectation (Section 10, pp. 22–23).

The paper's concrete loop is `while (c = 1) { {c := 0}[1/2]{c := 1}; x := x + 1 }`; its compact preexpectation is `x + [c = 1]·2`, although the general construction is much larger (Section 10.1, pp. 23–24).

Verus form (Inference): for a bounded loop, encode `Sum` and `Product` as recursive `spec fn`s with a decreasing natural argument and prove their recurrence lemmas. For an unbounded probabilistic loop, use a mathematical state-sequence model and prove a bound or convergence separately; Verus termination of the specification recursion is a trusted proof obligation, not a probabilistic termination result.

evidence and limits: the paper calls the construction effective and says it “yields rather complex syntactic preexpectations” (Section 10.1, p. 24). Inference: it may be impractically large; the paper gives no size bound or measurement. The concise example is a hand-sketched equivalence, not an implementation or performance measurement.

## techniques for the catalog

- weakest-preexpectation calculus — transform a probabilistic program backwards to an expected postvalue and discharge one final inequality
- expressive expectation syntax — use guards, addition, arithmetic scaling, and bounded sup/inf while preserving a normal form
- constructive Sum/Product — encode finite path sums and products with sequence predicates and substitution
- loop path encoding — represent weakest preexpectations of loops as a supremum over encoded state sequences
