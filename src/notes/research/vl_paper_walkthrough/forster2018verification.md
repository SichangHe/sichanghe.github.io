# Verification of PCP-Related Computational Reductions in Coq
(authored by agents unless marked 🧑)
Tag: `forster2018verification`, [paper](https://doi.org/10.1007/978-3-319-94821-8_15)

Page numbers below are PDF pages of the arXiv v2 text (page 1 is the title page; LNCS page = PDF page + 252).

## result and scope
Forster, Heiter, and Smolka formalise reductions among undecidable problems in Coq: `TM → SRH → SR → MPCP → PCP`, plus `PCP → CFP` and `PCP → CFI`. Their abstract says: “We formally verify several computational reductions concerning the Post correspondence problem (PCP) using the proof assistant Coq.” (Abstract, p. 1.) Their stated contribution: “Our reduction functions follow the ideas in the literature. The main contributions of the paper are the formal correctness proofs for the reduction functions.” (Introduction, p. 2.) They also say the decomposition `TM → SRH → SR → MPCP` “is novel” (Section 9, p. 15). The core of the work is finding the inductive invariants that textbook proofs omit.

## technique: constructive reduction as a function and iff specification

What it is. A problem is a type `X` with predicate `p`; a reduction to `(Y,q)` is a function `f : X → Y` such that `∀x. p x ↔ q (f x)` (Section 2, p. 3). The paper notes that “the usual requirement that f is total and computable can be dropped since it is satisfied by every function in a constructive type theory” (Section 2, p. 3), so no separate computability proof is needed. Transitivity is proved once: “If p  q and q  r, then p  r.” (Fact 1, Section 2, p. 3.)

How to use it (steps follow the paper's setup in Section 2 and Sections 3 to 7).
1. Define input and output datatypes with list and natural-number operations.
2. Define each source and target problem as a proposition over those datatypes.
3. Define the reduction function.
4. Prove both implications of the specification, then compose reductions by function composition and transitivity (Section 2, p. 3; Section 1, p. 2).

Verus form. Inference: define executable Rust structs/enums and a mathematical `spec fn` predicate for each problem. Prove a `proof fn` with `ensures source(x) <==> target(f(x))`; composition is another proof function. Inference: Verus's `spec fn` and proof-only functions keep executable reduction code separate from proof obligations. Inference: the totality that Coq gives for free must be specified separately in Rust (termination, no panics).

Evidence and trust. The paper says: “The Coq development verifying the results of sections 3 to 7 consists of about 850 lines of which about one third realises specifications.” (Section 9, p. 15.) Per reduction it gives 70 lines (SRH to SR), 105 (SR to MPCP), 206 (MPCP to PCP), 60 (PCP to CFP) and 107 (PCP to CFI). “The reduction TM  SRH takes 610 lines, 230 of them specification, plus a definition of Turing machines taking 291 lines.” (Section 9, p. 15.) These are source-size counts, not proof success percentages. Inference: Coq's kernel and the definitions of strings and rewriting are the trusted foundations; the paper does not discuss its trusted base.

## technique: discover strong inductive invariants for reduction proofs

What it is. Informal reductions often state only the final equivalence, which is too weak for induction. The authors say the missing ingredient was “the formulation of the inductive invariants enabling the necessary inductive proofs to go through.” (Introduction, p. 1.) For SR→MPCP, the proof of Lemma 10 “consists of two translation lemmas: Lemma 11 and Lemma 12” that “generalise the two directions of Lemma 10 such that they can be shown with canonical inductions” (Section 4, pp. 7–8). For MPCP→PCP, Lemmas 17 and 18 play the same role (Section 5, p. 10; Section 9, p. 15).

How the paper does it, for SR→MPCP.
1. Take the recursive structure: the derivation `x ≻*R y0`, or a card stack.
2. Forward lemma (Lemma 11): for `x ⊆ Σ` and `x ≻*R y0`, there is `A ⊆ P` with `A1 = x#A2`; proved by induction on `x ≻*R y0`.
3. Reverse lemma (Lemma 12): for `A ⊆ P`, `A1 = x#yA2` and `x, y ⊆ Σ`, we get `yx ≻*R y0`; proved by induction on `A` with `x` and `y` generalised, treating each kind of card (`d`, `e`, a rule card, `#/#`, `a/a`) in turn.
4. Lemma 10 and Theorem 13 follow from the two lemmas.
The authors state: “The translation lemmas formulate what we call the inductive invariants of the reduction function.” (Section 4, p. 8.) They add: “The challenge of proving the correctness of the reduction function is finding strong enough inductive invariants that can be verified with canonical inductions.” (Section 4, p. 8.)

Verus form. Inference: encode derivations as an inductive ghost datatype or a sequence with a validity predicate. State the strengthened relation as a `spec fn` over arbitrary context strings, and prove each constructor case with `proof fn`s. A final `ensures` theorem can then instantiate the general invariant. Inference: Verus will not invent the strengthening; that is the key human or agent design step.

Failure and assumptions. Inference: the paper reports that the literature lacks these invariants (“the correctness arguments in the literature argue about the correctness of programs with loops without stating and verifying loop invariants”, Introduction, p. 1), so a proof attempt by direct induction on the final equivalence should be expected to stall. The proofs depend on list induction and on the delimiters `$` and `#` being outside the alphabet `Σ`.

## technique: delimiter and freshness invariants

What it is. Reductions insert fresh symbols `$` and `#` to separate encoded strings. Symbols are naturals; `fresh [ ] = 0` and `fresh (a :: Σ) = 1 + a + fresh Σ`, with Lemma 5 “For all a ∈ Σ, fresh Σ > a” and Corollary 6 “For all a ∈ Σ, fresh Σ ≠ a” (Section 2.5, p. 6).

How the reductions use it. SR→MPCP fixes “two symbols $, # ∉ Σ” (Section 4, p. 7). For MPCP→PCP, `#x` and `x#` insert `#` before and after every symbol of `x`, and the dedicated first card is `d := $(#x0) / $#(y0#)` and the last card is `e := #$ / $` (Section 5, pp. 8–9). For PCP→CFP, Fact 20 says “Let # ∉ x, y. Then x#y is a palindrome iff y = x̄”, where `x̄` is the reversal of `x` (Section 6, p. 10).

Verus form. Inference: model strings as `Seq<int>` or a verified Rust sequence and prove `fresh` with `ensures result > every element`. Keep non-membership as a `spec fn`; every transformation that inserts a delimiter must preserve it. This is a logical invariant, not a Rust lifetime property.

The paper compares implicit natural-number alphabets with explicit finite alphabet types. Explicit types allow “arbitrarily many fresh symbols” to be “introduced simultaneously” and make fresh symbols easy to distinguish “by inversion”, but strings “have to be explicitly embedded pointwise”, which “complicates proofs”. “If proofs need the construction of many strings, as most of our proofs do, modelling symbols as natural numbers shortens proofs.” (Section 2.5, p. 6.) This is a proof-engineering tradeoff, not an empirical measurement.

## technique: verified reduction chain TM to PCP

The chain factorises a complex reduction into simpler ones: “complex reductions can be factorised into simpler reductions” (Section 1, p. 2).

1. TM→SRH. Represent a configuration as a string with the current state written to the left of the currently read symbol and left and right markers (`L`, `M`) delimiting the previously written part of the tape. Turn the transition function into rewriting rules using the scheme of Table 1 (p. 13). Lemma 29: for all Turing machines `M` and configurations `c`, `c′` there is a rewriting system `R` such that `⟨c⟩ ≻*R ⟨c′⟩` iff `c′` is reachable from `c` (Section 8, p. 14). Then introduce SRH′ (a string `z` of halting states) and reduce SRH′ to SRH with a fresh `#` and rules `a/#` for `a ∈ z` (Lemmas 30–31, p. 14; Theorem 32).
2. SRH→SR. Add rules `aa0/a0` and `a0a/a0` for every symbol `a` of an alphabet covering the input, so any string containing `a0` rewrites to `a0`. Lemmas 7–8 give the equivalence (Section 3, p. 7).
3. SR→MPCP. Use the cards `d := $/$x0#`, `e := y0#$/$`, the rules of `R`, `#/#`, and `a/a` for every `a ∈ Σ` (Section 4, p. 7). The paper says that “every matching stack starting with d will yield a derivation” of the source rewriting (Section 4, p. 7).
4. MPCP→PCP. Add dedicated first and last cards and insert `#` symbols into the cards; Lemma 15 shows every nonempty match of the new card list starts with `d`; Lemmas 17 and 18 are the translation lemmas; Lemma 14 and Theorem 19 conclude (Section 5, pp. 8–10).
5. PCP→CFP. Map each card `x/y` to the grammar rule `x/ȳ` (`γA := [x/ȳ | x/y ∈ A]`), prove `σ#(γA) = A1 # A2̄`, and use palindrome equivalence (Lemmas 21–23, Theorem 24, Section 6, pp. 10–11).
6. PCP→CFI. Map each card `x/y` to two grammar rules, `x/x#y#` in the first grammar and `y/x#y#` in the second; Lemma 25 gives `σ#(γ1A) = A1#(γA)` and `σ#(γ2A) = A2#(γA)`, and Lemmas 26–27 with Fact 3 give that equal generated strings force equal stacks `A1 = A2` and hence a nonempty match (Section 7, pp. 11–12, Theorem 28).

Verus form. Inference: each step should be an independently verified Rust transformation with an `ensures` iff relation; compose only after checking the intermediate predicates. Keep delimiter, list-order, and nonempty-stack assumptions explicit. Inference: this decomposition would also suit a verified compiler or protocol translator.

## what is proved, measured, and trusted

The paper proves correctness of each reduction function in Coq and reports development line counts. It does not report runtime, solver effort, or defect rates. For TM→SRH, “The proof is mainly a big case distinction over all possible shapes of configurations of a machine, which leads to a combinatorial explosion and a vast amount of subcases.” and “This proof is by far the longest in our development.” (Section 8, p. 14.) The authors say they “omit the technical details of the proof” and refer to Heiter's bachelor thesis (Section 8, p. 12). The proofs of the other reductions are given in the paper.

Inference: threat to agent-written verified Rust is medium. The strongest protection is the iff specification and compositional proof chain; the main risks are an underspecified predicate, an incorrectly modelled external machine, or an unverified representation conversion. Agents can write a locally valid proof of a weak predicate, so review must check that the predicate matches the intended reduction.

## techniques for the catalog

- constructive reduction specification — implement a total function and prove source predicate iff target predicate
- inductive-invariant strengthening — generalise a reduction claim with context and delimiter facts before induction
- freshness reasoning — generate fresh symbols and preserve non-membership through every transformation
- compositional reduction chain — verify small reductions independently and compose them by transitivity
- representation-aware formalisation — choose lists, naturals, or explicit alphabets according to the proof's construction and inversion needs
