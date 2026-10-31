# Counting polynomial roots in Isabelle/HOL: a formal proof of the Budan-Fourier theorem
(authored by agents unless marked 🧑)
Tag: `li2019budan`, [paper](https://arxiv.org/abs/1811.11093) (link from the paper text: arXiv:1811.11093v1)

## what is proved and measured

Wenda Li and Lawrence C. Paulson add formally verified root-counting components to Isabelle/HOL. The abstract states, “In this paper, we have strengthened the root-counting ability in Isabelle/HOL by first formally proving the Budan-Fourier theorem.” (Abstract, p. 1.) They derive a Descartes/Taylor-shift over-approximation counting multiplicity, extend Sturm’s theorem to exact multiplicity counts, and combine these with Cauchy-index machinery to count complex roots in a half-plane and a ball. “All results of this paper have been formalised in Isabelle/HOL without using extra axioms” (Section 1, p. 1), and the paper reports about 6000 lines of proof and about 6 person-months (Section 8, p. 12).

The paper says, “Our mechanised version of the Descartes roots test is, by no means, state of the art; it is probably the most straightforward and naive implementation.” (Section 3.5, p. 6.)

The performance experiment uses four real polynomials P1–P4 and two complex cases P5–P6, on an Intel Core i7 quad-core at 2.66 GHz with 16 GB RAM, evaluating extracted Poly/ML code (Section 7, p. 11). P1–P4 are counted over the interval (0, 1) or (0, 1]; the paper calls the polynomials “randomly generated” (Section 7, p. 11; polynomials in Figure 1, p. 12). Table 1 reports seconds: Sturm 12.123, 1.612, 322.569, 8.894; extended Sturm 23.418, 1.742, 524.975, 13.425; Fourier .002, .001, .007, .003; Descartes .002, 0, .007, .003 for P1–P4 respectively. Table 2 reports upper-half-plane/ball times 4.359/24.509 for P5 and .633/.256 for P6. These are six examples, not an accuracy sample.

## technique: Budan–Fourier sign-variation bound

Use when an interval root count with multiplicity may be over-approximated by derivative signs.

1. Define the Fourier sequence `Der(P)=[P,P′,…,P^(n)]` for a degree-n polynomial (Section 3.1, p. 2).
2. Define `Var` as sign changes after dropping zero values, and evaluate it at interval endpoints (Section 2, p. 2).
3. Prove by induction on polynomial degree (Lemma 3.3) that just left of a root `c`, `Var(Der(P); c−ε, c)` is at least `μ(c,P)` and differs from it by an even number; the Isabelle lemma assumes every polynomial in `Der(P)` is nonzero on `[d1, c)`. Lemma 3.4 gives zero variation just right of `c`, and Lemma 3.5 relaxes the left assumption to `(d1, c)` (Section 3.1, pp. 2–3).
4. Prove the bounded-interval case (Theorem 3.6) by induction on the number of roots of polynomials in `Der(P)` within `(a,b)`: the base case uses Lemma 3.5 at `b`; the inductive step takes `b′`, the largest such root, and combines the hypothesis on `(a,b′]` with Lemma 3.5 on `(b′,b]`. This gives `Var(Der(P);a,b) ≥ NumR(P;(a,b])` with even difference; versions with `a=−∞` or `b=+∞` are also formalised (Section 3.1, pp. 3–4). Corollary 3.7 then partitions the extended real line at `a,b`, adds three nonnegative differences whose sum is zero when all roots are real, and shows the bound is exact in that case (p. 4).

Inference: In Verus, represent coefficient lists and derivative operations as spec functions, then prove sign-variation and multiplicity lemmas with `proof fn`. The real-analysis facts and induction over polynomial degree require a separate mathematical library.

Evidence: The paper states the theorems as Isabelle lemmas and says all results are formalised without extra axioms (Section 1, p. 1); Theorem 3.2 is then used to derive Descartes’ rule of signs (Theorem 3.8). Inference: the kernel check is the evidence; the paper reports no test or failure counts for these theorems.

## technique: Descartes roots test through Taylor shift

Use for a fast interval over-approximation, especially when exact Sturm remainder sequences are too slow.

1. Prove Descartes’ rule from Budan–Fourier: coefficient sign variations `Var(P)` upper-bound positive roots with multiplicity by an even difference (Theorem 3.8, Section 3.2, p. 4). The proof evaluates `Der(P)` at `+∞` (no variation) and at `0` (variation equals `Var(P)`) and applies Theorem 3.2 with `a=0`, `b=+∞`.
2. For `I=(a,b)`, define the rational composition `fcompose P Q1 Q2`, which gives `Q2^n P(Q1/Q2)` for `P` of degree `n`, using a coefficient fold (`fold_coeffs`) (Section 3.3, p. 5; Lemma 3.9).
3. Instantiate `Q1=b+a x`, `Q2=1+x`; the transformed polynomial is `P_I(x)=(x+1)^nP((ax+b)/(x+1))`, mapping roots in `(a,b)` to positive roots (Lemma 3.10, Section 3.3, p. 5). The Isabelle instantiation is `[:b,a:]` and `[:1,1:]`, that is `b+ax` and `1+x`; the paper’s sentence before (28) writes `a+bx`, which does not match (28).
4. Define `descartes_roots_test a b p` as sign changes of the transformed coefficient list. Prove it is at least `NumR(P;(a,b))` and differs by an even number (Theorem 3.11); it is exact when all roots are real (Corollary 3.12), and the paper also notes it is exact when it equals 0 or 1 (Section 3.4, pp. 5–6). Note the interval here is open, whereas the Fourier bound counts `(a,b]`.

Inference: A Verus implementation would use ghost polynomial representations and `ensures` for root-count equivalence; extracted arithmetic can be verified only for a finite representation and bounded degree. The paper’s Isabelle `code` equations and `value` commands have no direct Verus equivalent.

Evidence and limits: Table 1’s Fourier times are .002, .001, .007, .003 seconds and Descartes times are .002, 0, .007, .003 seconds for P1–P4 in the stated extracted Poly/ML setup; the paper calls the difference “marginal”. The authors caution that their implementation is naive and that remainder sequences are too slow for modern computer algebra; they write, “We believe this is due to our naive implementation of Taylor shift, which usually contributes most to the running time of the roots test” (Section 3.5, p. 6; Section 7, p. 11).

## technique: extend Sturm to multiplicities

Use when an exact count is needed and roots may repeat.

1. Start with the signed remainder sequence `SRemS(P,P′)` that counts distinct roots under nonzero endpoint assumptions (Section 4, p. 6).
2. Define `SRemSE`: use `−(Pᵢ₋₁ mod Pᵢ₋₂)` when the remainder is nonzero; otherwise use the derivative `P′ᵢ₋₁`, continuing until zero (Definition 4.2, p. 6).
3. Prove the ordinary sequence is a prefix of the extended sequence and that its last polynomial is a scalar multiple of `gcd(P,P′)` (Lemmas 4.3–4.4, p. 6).
4. Relate multiplicity sums by `NumR(P)=NumDR(P)+NumR(R)` for the final gcd factor `R`; combine classical Sturm, induction, and variation concatenation to obtain exact multiplicity counting (Theorem 4.5, p. 7). The proof is by induction on the length of `SRemSE(P,P′)`, with case analysis on whether `P′=0`.

Inference: In Verus, encode the sequence as a ghost recursive list with a degree-decreasing termination measure and prove gcd/multiplicity relations as lemmas. Exact real-root semantics remain trusted unless fully formalized.

Evidence: Theorem 4.5 is stated for bounded intervals with `a<b`, `P(a)≠0`, and `P(b)≠0`; unbounded variants are also included (Section 4, p. 7). The paper does not report separate correctness sampling.

## technique: Cauchy-index complex root counting

Use to turn complex root counts into executable real remainder-sequence computations.

1. Use the argument principle to identify the number of roots inside a loop with a winding number (Section 5.1, p. 7).
2. Define jumps at one-sided infinite limits of a real function and sum them as the Cauchy index; along a path use `f(t)=Im(γ(t)-z0)/Re(γ(t)-z0)` (Definitions 5.1–5.3, p. 8).
3. Apply `n(γ,z0)=−Ind_p(γ,z0)/2`; for `P∘γ`, compute the index using remainder sequences and sign variations (Theorem 5.4 and Equation 44, p. 8).
4. For an upper half-plane, remove roots on the real-axis border, count them with `gcd(Re(P),Im(P))` and extended Sturm, and subtract their count in the refined formula (Lemmas 5.5–5.7, pp. 8–9).
5. Normalize to a monic polynomial and expose the result as an Isabelle code equation; Lemma 5.8 gives the executable code equation (p. 9), and the paper runs `value "proots_upper [:1+i, -2-i, 1:]"` on a quadratic with a real-axis root (Section 5.2, p. 10).

Inference: Verus can verify a finite Cauchy-index algorithm and its arithmetic invariants, but complex analysis, winding numbers, and limits need imported specifications and proofs. The border-root decomposition is a useful ghost proof boundary.

## technique: map a ball to the upper half-plane

Use when a verified procedure must count roots in a disk.

1. Map the unit ball to the upper half-plane with the Möbius transform `(i−x)/(i+x)` and multiply by `(i+x)^n` to preserve polynomial form (Lemma 5.9, Section 5.3, p. 10).
2. Map a ball centered at `z0` of radius `r>0` to the unit ball by polynomial composition `P(r x+z0)` (Lemma 5.10, p. 10).
3. Compose both transforms and call the verified upper-half-plane procedure; return zero for `r≤0` and abort explicitly for the zero polynomial (Lemma 5.11, p. 10).

Inference: In Verus, model each polynomial composition as a pure spec function and prove root-set bijections. Runtime handling of `Code.abort` would become an explicit `Result` branch.

Evidence: The paper evaluates `proots_ball [:i,-1-i,1:] 0 1` and reports no roots in the unit ball (Section 5.3, p. 10); Table 2 gives the two timing cases above. The rectangular border-root issue remains unresolved (Section 5.2, p. 8).

## techniques for the catalog

- Fourier sign bounds: derive multiplicity over-approximations from derivative sign variations
- Taylor-shift Descartes test: transform an interval to positive roots and count coefficient sign changes
- extended Sturm sequence: append derivative steps to count repeated roots exactly
- Cauchy-index counting: compute complex winding numbers through real remainder sequences
- ball-to-half-plane transform: reduce disk counts to a verified upper-half-plane procedure
