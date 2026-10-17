# A formal proof of Hensel’s lemma over the p-adic integers
(authored by agents unless marked 🧑)
Tag: `lewis2019hensel`, [paper](https://arxiv.org/abs/1909.11342) (arXiv:1909.11342v1 as printed in the paper text; the DOI printed there is a placeholder)

## what is proved

Robert Y. Lewis constructs the p-adic field `Qp` and integer ring `Zp` in Lean and proves a strong Hensel lemma. The theorem assumes a polynomial `F : polynomial Z_[p]`, a seed `a`, and `‖F.eval a‖ < ‖F.derivative.eval a‖²`. It produces a root `z` with `‖z-a‖ < ‖F.derivative.eval a‖`, the exact distance `‖z-a‖ = ‖F.eval a‖/‖F.derivative.eval a‖`, preserved derivative norm, and uniqueness in that neighborhood. The paper says, “The field of p-adic numbers Qp and the ring of p-adic integers Zp are essential constructions of modern number theory.” (Abstract, p. 1.) It also says, “The formalization described in this paper is incorporated into the Lean mathematical library, available on GitHub.” (Section 1, p. 1.)

## technique: construct the p-adic structures

Use this when a proof needs complete non-Archimedean numbers. The paper chose a direct Cauchy-sequence completion over an absolute value valued in an arbitrary ordered field, over the uniform-space and normed-space completions (Section 4.3, pp. 5–6); it notes the ring operations on Qp are computable, “although this property is not used in the current development” (Section 4.3, p. 6).

1. Define the p-adic valuation on integers as the largest exponent `n` for which `p^n` divides a nonzero integer, extend it to rationals by subtraction of valuations of coprime numerator and denominator, and define `‖x‖ₚ = p^(-νₚ(x))`, with norm zero at zero (Section 2, p. 2; formalized with `nat.find_greatest` in Section 4.1, p. 5).
2. Prove that this norm is an absolute value and satisfies the stronger non-Archimedean inequality. The paper states, “The p-adic numbers Qp are the completion of Q with respect to the p-adic norm.” (Section 2, p. 2.) The formal proofs are in Section 4.2, p. 5; the hardest lemma is `min_le_padic_val_rat_add`, the core of the nonarchimedean property.
3. Define `Qp` as the completion of `Q` under this norm, then define `Zp = {z : Qp | ‖z‖ ≤ 1}`. Show that the ring operations preserve this subset: the paper says Zp “is closed under sums and products” and forms a subring of Qp (Section 2, p. 3; Section 4.5, p. 7). The formal Zp is a subtype `{z : Q_[p] // ‖z‖ ≤ 1}`.
4. In Lean, package the resulting objects with the existing norm, field, and completion type classes. Reuse generic lemmas about Cauchy sequences, limits, and continuity of the norm and of polynomial evaluation instead of reproving them (Sections 4.4 and 5.5, pp. 6–9; the library is described in Section 3, pp. 3–4). Inference: the paper does not list which generic lemmas were reused beyond these.

Inference: In Verus, this is a mathematical-library task rather than a Rust-program proof. Representing p-adic completions would require a trusted specification of the structures and algebraic lemmas; `spec fn`, `proof fn`, and quantified `ensures` can state individual properties, but Verus does not provide Lean’s quotient/completion library automatically.

Evidence: The paper reports that the construction and theorem were incorporated into `mathlib` (Section 1, p. 1); the claim is library integration, not a benchmark with a denominator. The paper gives the Hensel part as “around 400 lines of code” and the whole development as “around 4500 lines of code” added to `mathlib` (Section 7, p. 10). The authors compare their design with a Coq UniMath construction and an undocumented HOL Light construction; they say the UniMath development “does not prove any theorems about Zp or Qp.” (Section 6, p. 10.)

Assumptions and limits: The development uses classical reasoning in `mathlib`, and the paper says, “The code blocks presented in this paper should be read as schematic, not literal.” (Section 1, p. 1.) The construction must move among `N`, `Z`, `Q`, `R`, `Qp`, and `Zp`; the authors call “managing casts between various number structures” and “proving long but straightforward nonlinear inequalities” the two particularly painful parts (Section 7, p. 10). It is not a verified executable implementation of arbitrary p-adic computation.

## technique: establish reusable polynomial identities

Use this before the Newton proof whenever bounds on `F(x+y)` or differences of polynomial values are needed.

1. Prove the binomial-expansion lemma `binom_exp`: `∃ k, F.eval (x+y) = F.eval x + F.derivative.eval x * y + k*y^2`. It follows from a statement about `(x+y)^n` in a commutative semiring (`binom_exp'`, Section 5.1, p. 8).
2. Prove the power identity `binom_exp'` by induction on the exponent and discharge ring equalities with Lean’s `ring` tactic. The paper says, “After inducting on n, this proof follows nearly automatically using Lean’s ring tactic.” (Section 5.1, p. 8.) The only manual input is the witness for `k`, which the author computed with computer algebra software.
3. Prove `∃ z, F.eval x - F.eval y = z*(x-y)`, expressing that `x-y` divides the polynomial-value difference; the paper says this follows from an algebraic statement proved “by induction and ring evaluation” (Section 5.1, p. 8).
4. Rewrite every later Newton-step bound with these identities, the non-Archimedean norm inequality, and the induction hypothesis.

Inference: A Verus encoding would state the two identities as `proof fn` lemmas over an algebraic model and invoke them in later proof blocks. The algebraic operations and identities must be represented in the Rust specification; Lean’s `ring` tactic and polynomial library do not transfer directly.

Evidence: The authors estimate roughly 70 lines of Lean for the nonlinear inequality calculation using these identities, versus roughly 10 lines in the informal proof (Section 5.3, p. 9). The paper says many of these computations fall under the scope of the author’s tool Polya. No independent correctness experiment is reported; the evidence is kernel-checked proof acceptance.

## technique: bound the Newton iteration with an auxiliary constant

Use when the derivative is nonzero enough to make Newton corrections stay in `Zp` and shrink geometrically.

1. Fix `F` and `a` under the Hensel inequality `‖F.eval a‖ < ‖F.derivative.eval a‖²` (Section 5.2, p. 8).
2. Define the real number `T` as the norm of `(F.eval a).val / ((F.derivative.eval a).val)^2`, a quotient taken in `Qp`; the hypothesis gives `T < 1`, so the quotient is in fact an integer. Record the equivalent form `T = ‖F.eval a‖/‖F.derivative.eval a‖²` (lemma `T_def`, Section 5.2, p. 8).
3. Use `T` to state an induction invariant for an iterate `z`: derivative norm preservation `‖F′(z)‖ = ‖F′(a)‖` and `‖F(z)‖ ≤ ‖F′(a)‖² T^(2^n)` (`ih`, Section 5.3, p. 9).
4. Prove the base case at `z=a`; for the successor, define `z' = z - F(z)/F′(z)`, show the quotient is integral (its norm is at most 1), and establish the invariant with the inductive hypothesis, the nonarchimedean property, and both identities (Section 5.3, p. 9).

Inference: In Verus, the invariant is an `ensures` clause on a recursive or loop body, with a separate `invariant` clause on a `while` loop if the iteration is implemented operationally. The paper’s dependent subtype `{z : Z_[p] // ih n z}` has no direct Rust equivalent; use a value plus a proof lemma/specification connecting it to `ih`.

Evidence and limits: The evidence is the formal proof of the theorem, not an empirical sample. The proof assumes `F(a) ≠ 0` for much of the argument and treats `F(a)=0` as a separate degenerate case; the paper says Conrad does not make this case explicit, “but the argument fails at a crucial point if f (a) = 0.” (Section 5, p. 8.) The paper says the inequality chains are “relatively straightforward” but “long and nonlinear” (Section 5.3, p. 9).

## technique: define a Cauchy Newton sequence and take its limit

Use to turn the bounded Newton corrections into an actual root in a complete space.

1. Start at `a₀=a` and recursively use `aₙ₊₁ = aₙ − F(aₙ)/F′(aₙ)`. The paper notes that the informal sequence lives in `Qp`, but the formal development keeps it in `Zp` to avoid casts, so the recursion must carry the properties needed for integrality (Section 5.3, pp. 8–9).
2. Prove a distance bound for `n≤k`, `‖aₖ−aₙ‖ ≤ ‖F′(a)‖ T^(2^n)` (`newton_seq_dist`, Section 5.4, pp. 8–9).
3. Since `0≤T<1`, show the bound tends to zero and conclude the sequence is Cauchy; define `soln : Z_[p]` as its limit (Section 5.4, p. 9). The paper states, “We can thus define soln : Z_[p] to be the limit of newton_seq.” (Section 5.4, p. 9.)
4. Apply continuity of norm and polynomial evaluation to show `F(soln)=0`, preserve the derivative norm, and derive the exact distance formula, which gives the weaker bound `‖soln - a‖ < ‖F′(a)‖` (Section 5.5, p. 9).

Inference: In Verus, a terminating recursive function can carry a decreasing measure, while a mathematical limit is best introduced as an abstract specification with lemmas about convergence. Verus can verify finite approximants and their invariants; the completeness and continuity facts would remain trusted axioms or separately proved library theorems.

Evidence: The conclusion is a theorem checked in Lean, derived from the Cauchy-sequence and continuity libraries. The paper gives no runtime or proof-time denominator; its quantitative statement is the symbolic bound above.

## technique: prove local uniqueness and split the zero-seed case

Use after existence when the result requires a unique root in a norm neighborhood.

1. Assume `F(z)=0` and `‖z-a‖ < ‖F′(a)‖`.
2. Show `z = soln` by what the paper calls “a short computation using the first polynomial identity” from Section 5.1 (`binom_exp`) (Section 5.6, p. 9; lemma `soln_unique`).
3. If `F(a)=0`, return `a` directly; otherwise return the limit `soln`. The paper says, “When a is already a root of f, uniqueness follows even more directly.” (Section 5.6, p. 9.) It proves Hensel’s lemma by a case distinction on `F(a)=0`, with `a` as the witness in the special case and `soln` in the general case.

Inference: In Verus, encode uniqueness as a `proof fn` with preconditions for the root and neighborhood and an `ensures z == soln`; branch on the seed-root case before invoking the division lemmas.

Evidence: The uniqueness theorem is part of the same formal Hensel statement; no testing population is involved. The explicit case split reflects the paper’s remark that the informal argument does not make the `F(a)=0` case explicit (Section 5, p. 8).

## what remains trusted and what the result does not cover

The paper says Lean implements “a version of the calculus of inductive constructions (CIC) ... with support for quotient types and classical reasoning” (Section 3, p. 3). It does not discuss the trusted base further, and it does not claim a verified compiler, executable Newton solver, or empirical reliability study. The code blocks are schematic and tied to a preserved library snapshot (Section 1, pp. 1–2). Planned future work includes applications of the local-global principle, more general contexts for Hensel’s lemma, and the inverse-limit characterization of Zp (Section 7, p. 10).

Inference: Lean’s kernel checks the proof terms, while the classical axioms and the existing `mathlib` foundations are trusted.

Inference: For VL, the directly reusable lesson is proof decomposition: isolate algebraic rewrite lemmas, make a quantitative invariant explicit, keep iterates in the smallest useful type, and separate convergence, limit properties, and uniqueness. The mathematical content is far outside typical Rust systems specifications; the product threat is therefore indirect, through proof-engineering complexity and trusted-library dependence rather than an immediate competing implementation.

## techniques for the catalog

- p-adic completion: build valuation, norm, completion, and integer subring as reusable formal structures
- polynomial rewrite lemmas: prove binomial and difference identities before nonlinear bounds
- bounded Newton invariant: use an auxiliary `T<1` and an induction invariant to preserve integrality and shrink errors
- Cauchy-limit extraction: derive a Cauchy sequence, take its limit, and transfer properties by continuity
- local uniqueness split: prove neighborhood uniqueness and handle an already-root seed as a separate branch
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Conrad’s description is more concrete than Gouvêa’s [19] and avoids unnecessary detours into the group Z/pZ, although the approaches are schematically identical."): I read the whole paper text (all 10 content pages and the reference list) and the whole study; checked every quotation word for word, the theorem statement, the Newton-sequence steps, the uniqueness step, the line counts (70 vs 10, 400, 4500), and all section and page references against the PDF pages; changed the tag link to the arXiv page (the DOI printed in the paper is a placeholder), fixed page numbers throughout (Section 5 is on pp. 7–9, Sections 6 and 7 on pp. 9–10), corrected T to a real number defined as a norm, corrected the binomial lemma description, the uniqueness step (first identity, not a rewrite of F(z)-F(soln)) and the F(a)=0 explanation, moved claims about Lean-kernel trust to Inference, and added paper details on the completion choice and size; I did not check the Lean code in the mathlib repository, the cited external papers, or the Verus-related Inference statements beyond marking them as inference.

