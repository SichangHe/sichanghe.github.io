# Rarus: A Succinct and Efficient Range Proof for Polynomial-based Vector Commitment
(authored by agents unless marked 🧑)
Tag: `yang2026rarus`, [paper](https://www.usenix.org/conference/usenixsecurity26/presentation/yang-xinyang)

Rarus is a zero-knowledge range-proof protocol for proving that every value in a committed vector lies in an interval `[0,R)`. It targets polynomial-based vector commitments (PBVC), where a vector is interpolated into a polynomial and committed with a polynomial commitment such as KZG. The abstract (proceedings p. 5771) presents it as "an efficient range proof for polynomial-based vector commitments that achieves optimal asymptotic complexity across all metrics" and states that "Rarus achieves O(1) proof size and verifier time", with prover time `O(Nℓ/log(Nℓ))G + O(Nℓ)F`, "where G and F denote group and field operations respectively." Here `ℓ` is the number of committed values and `N` the range bit length when the range is `[0,2^N)`. The authors are Xinyang Yang, Wenjie Qu, Yanpei Guo, and Jiaheng Zhang (National University of Singapore), in the Proceedings of the 35th USENIX Security Symposium (2026).

## technique: polynomial-based vector commitment and relation

What it is. For a vector `a=(a0,…,aℓ−1)`, interpolate a polynomial `a(X)` of degree below `ℓ` over a multiplicative subgroup `Hℓ`, with `a(ωℓ^i)=ai`, and commit with `C ← PCS.Commit(pp,a)` (§2.2, p. 5773). The range relation `R_RP` requires that `C` is the PBVC commitment of `a` and every `ai` is in `[0,R)` (§1.2, p. 5772). The paper instantiates the PCS with KZG and uses PST, "a generalized multi-variate extension of KZG", for bi-variate polynomials (§2.2, p. 5773); setup is trusted (Table 1, p. 5772; §3, p. 5774).

How to apply it. (1) Run a trusted setup that provides the crs and subgroup `Hℓ`. (2) Interpolate the vector over `Hℓ`. (3) Commit to the polynomial. (4) Run the range protocol below against the same commitment, opening only queried evaluations.

Verus form. Inference: model field and polynomial values with ghost sequences or maps and define interpolation and commitment relations as `spec fn`s. State an executable API's input commitment and output proof with `requires`/`ensures`; use `proof fn`s for evaluation-consistency lemmas. KZG binding, pairing security, and finite-field algebra are cryptographic assumptions outside the Verus constructs documented for this project.

## technique: Sumset-Representation b-ary decomposition

What it is. Binary decomposition forces each value into bits; the paper says this "leads to high-degree constraints" (§1.3, p. 5772). Rarus instead uses Sumset-Representation (from reference [8]) with base `b` and basis `G0,…,Gk−1`, so each value is `a = Σj Gj dj` with each digit `dj∈[0,b)`. With `R0=R−1`, it recursively sets `Gj=⌊(Rj+1)/b⌋` and `Rj+1=Rj−(b−1)Gj`, stopping when `Rj+1 ≤ b−1`. Theorem 1 (§2.3, p. 5774) states `[0,R0] = Σj<k Gj·[0,b−1] + [0,R′]`, with `R′=0` if `(b−1)|R0`, and `k ≤ ⌈log_b(R0+1)⌉`. The paper claims this supports arbitrary ranges "without padding" (§1.3, p. 5773). It gives two examples for `[0,10)` with `b=3`: `G=(4,2,1)` (§3, p. 5774) and `G=(4,1)` with `x=4d0+1d1` (§4.3, p. 5777). Inference: the two examples disagree, and neither matches the recursion, which for `R=10`, `b=3` gives `G=(3,1)` and `R′=1`.

How to apply it. (1) Set `R0=R−1` and choose `b`. (2) Derive the basis by the recursion. (3) Decompose each `ai` by "repeated division" into digits `di,j` (§4.3, p. 5777). (4) Prove the decomposition equation (Eq. 13) by sampling a random `r0` to reduce it to the univariate Eq. 14, then running the optimized uni-variate Sum-Check below (§4.3, pp. 5777–5778). (5) Prove every digit is in `[0,b)` with the log-derivative check below.

Verus form. Inference: represent digits and basis as ghost sequences, define a `spec fn` for their weighted sum, and prove decomposition with a `proof fn` using `ensures`. A loop that performs repeated division can carry an `invariant` that the remaining value plus accumulated basis terms equals the original value and use `decreases` on the remaining quotient. The PIOP is not Verus syntax; Verus checks a concrete decomposition implementation and its arithmetic contracts, not a cryptographic proof transcript.

## technique: log-derivative range check

What it is. Lemma 1 (§2.4, p. 5774, from Haböck's log-derivative lookup, reference [20]): every `di` is in `[0,b−1]` iff for some multiplicities `m`, `Σi 1/(X+di) = Σj mj/(X+j)` as rational functions. Rarus lets `mi` count occurrences of `i` in the digit matrix `D`, samples `α ← F \ {−b+1,…,0}`, and defines `ti,j=1/(α+di,j)` and `ei=mi/(α+i)` (§3, p. 5774). Excluding those values "elegantly avoids the zero-denominator issue in the log-derivative method, achieving perfect completeness with negligible impact on soundness" (§4.3, p. 5777). The soundness error of this step is `(b+ℓ+k−1)/|F|` (§4.3, p. 5777).

How to apply it. (1) Interpolate with NTT `d(Y,X)` (digits), `c(X)` (basis), `I(X)` (index `i`), and `m(X)` (multiplicities), and commit to `d, a, c, I, m`. (2) The verifier samples `α`. (3) Interpolate and commit `t(Y,X)` and `e(X)`. (4) Prove Eq. 10, `t(α+d)−1=0` on `Hℓ×Hk`, with the bi-variate Zero-Test, and Eq. 11, `e(α+I)−m=0` on `Hb`, with the uni-variate Zero-Test. (5) For Eq. 12 (sum of `t` equals sum of `e`), use the subgroup property to reduce it to `t(0,0)·ℓk = e(0)·b`, which the verifier checks directly (§4.3, pp. 5777–5778).

Verus form. Inference: model finite-field division with a `requires` clause that denominators are nonzero and use `ensures` for the multiplicity identity. A `proof fn` can establish each digit's membership in a finite range by case splitting or a ghost count. Rational-polynomial soundness and Schwartz–Zippel probability are mathematical lemmas that require an explicitly modeled finite field; they are not automatic from Rust integer proofs.

## technique: bi-variate Zero-Test PIOP

What it is. To prove a committed `f(X,Y)` vanishes on `Hℓ1×Hℓ2`, the verifier samples `r` and the prover folds the `Y` axis into `f̄(X)=Σj f(X,ωℓ2^j)u(r,ωℓ2^j)`, where `u(X,Y)=Σi<ℓ2 X^iY^i` gives linearly independent weights (Theorem 2 and Lemma 2, §4.1, p. 5775). The paper states: "The verifier verifies it by a Uni-variate Sum-check PIOP and verifies the equation by a Uni-variate Zero-Test PIOP." (§4.1, p. 5775.) The prover commits `f, p, h, g` at a dominant cost of `D1D2 G`, versus `3D1D2 G` for the Pianist bi-variate zero-test, which commits `f` and two bi-variate quotients (§4.1, pp. 5775–5776).

How to apply it. (1) The verifier samples `r`. (2) The prover forms `f̄` and a quotient `p` with `p·ZHℓ1=f̄`, and commits `p`. (3) The verifier samples `τ1`, the prover sends `f=f̄(τ1)`, and the verifier checks `f = p(τ1)·ZHℓ1(τ1)`. (4) The prover commits `h(Y), g(Y)` with `f(τ1,Y)u(r,Y) − f/ℓ2 = h(Y)ZHℓ2(Y) + Y·g(Y)`; the verifier samples `τ2`, computes `u(r,τ2)` and `ZHℓ2(τ2)` itself, queries `f(τ1,τ2)`, `h(τ2)`, `g(τ2)`, and checks the equation (§4.1, p. 5776). Theorem 3 gives perfect completeness and knowledge-soundness error at most `(D1+D2+ℓ2)/|F|` (p. 5776).

Verus form. Inference: encode the polynomial identity as a `spec fn` over finite index sets and use `proof fn`s to prove evaluation and quotient lemmas. A Rust verifier can have `requires` for valid subgroup parameters and `ensures` for acceptance only when the checked equations hold. Random challenges and knowledge soundness remain cryptographic protocol assumptions; Verus cannot replace the PIOP's algebraic proof without a formal finite-field development.

## technique: optimized uni-variate Sum-Check PIOP

What it is. Rarus views `Hℓ` as `Hℓ1×Hℓ2` with `ℓ=ℓ1ℓ2`, so a degree-`D` polynomial becomes a grid, and proves an outer row sum and then an inner sum along one random column (§4.2, p. 5776). Setting `ℓ1=log D` and `ℓ2=D/log D` reduces prover group operations from `O(D)` to `O(D/log D)` and field operations from `O(D log D)` to `O(D log log D)`, with `O(1)` verifier time and proof size (Theorem 4 and Table 2, p. 5777). Theorem 4 gives a knowledge-soundness error of "approximately" `(ℓ1+ℓ2)/|F|`.

How to apply it. (1) Use the domain isomorphism to view `f(X)` as `f̂(X,Y)`. (2) The prover commits the partial-sum polynomial `p(X)=Σj f̂(X,ωℓ2^j)` and its quotients `q1, h1` over `Hℓ1`. (3) The verifier samples `τ1` and checks Eq. 8. (4) Set `v=p(τ1)` and `g(Y)=f̂(τ1,Y)`; the prover commits quotients `q2, h2` over `Hℓ2`. (5) The verifier samples `τ2`, checks Eq. 9, and checks `g(τ2)` against the original commitment by a PCS evaluation of `f` at the point for `(τ1,τ2)` (§4.2, p. 5776).

Verus form. Inference: state a ghost matrix representation and prove that flattening and reshaping preserve the sum. Use loop `invariant`s over rows and columns and a `proof fn` for the domain-isomorphism indexing. The asymptotic complexity is not implied by functional correctness; a separate measured or cost semantics is required.

## technique: complete Rarus protocol, masking, and Fiat–Shamir

The witness-bearing polynomials `a, d, m, t, e` are masked by adding multiples of vanishing polynomials of `Hℓ`, `Hk`, `Hb` with random `s0, s1`, chosen so every PIOP equation still holds (Eqs. 15–19, §4.4, p. 5778). Theorem 5 states the masked protocol is zero-knowledge; its proof (Appendix C, p. 5787) assumes "the underlying polynomial commitment scheme is perfectly hiding." The verifier's 10 random challenge points are reduced to 5 shared ones, which the paper says reduces verifier time and proof size and eases batch opening; the Fiat–Shamir transform then makes the argument non-interactive (§4.5, p. 5778). Figure 2 (p. 5779) shows the full interactive protocol in three steps: commit decomposition (`d′, a′, c, I, m′`); receive `α`, commit `t′, e′`; receive `r0`, run the Sum-Check on the decomposition, the bi-variate Zero-Test on Eq. 10, the uni-variate Zero-Test on Eq. 11, and check `t′(0,0)×ℓk = e′(0)×b`.

Verus form. Inference: model masking as a ghost polynomial transformation and prove that evaluations on the subgroup are unchanged with `ensures`. Keep randomness and transcript hashing in executable Rust behind contracts; a `proof fn` can show transcript challenge order and equation preservation. Zero knowledge and Fiat–Shamir security require cryptographic assumptions about the commitment and hash functions, which remain trusted.

## techniques for the catalog

- PBVC encoding — interpolate a vector as a polynomial and commit it with KZG-like polynomial commitments
- Sumset-Representation — use a recursively derived b-ary basis to represent arbitrary ranges without padding
- log-derivative range check — prove all decomposed digits lie in `[0,b)` through rational multiplicity identities
- bi-variate Zero-Test PIOP — fold a grid of polynomial evaluations into a univariate zero check with a random challenge
- optimized uni-variate Sum-Check — reshape the domain into rows and columns to reduce prover group operations
- vanishing-polynomial masking — add zero-on-domain masks to hide witness polynomials while preserving checks
- Fiat–Shamir transcript — derive non-interactive challenges, shared across sub-protocols to allow batch openings
- parameter optimization — choose `b`, `k`, and subgroup sizes to minimize the modeled prover cost
