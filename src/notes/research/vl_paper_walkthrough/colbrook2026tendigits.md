# Ten Digits on a Train: AI-Assisted Verification of Two Eigenvalue Problems
(authored by agents unless marked 🧑)
Tag: `colbrook2026tendigits`, [paper](https://arxiv.org/abs/2606.23821)

## scope and proof architecture

The paper reports a human–AI collaboration that turns numerical candidates into independently checkable certificates for two spectral problems. The abstract states: “Validated computation is a stringent test of AI-assisted mathematics: the output is not merely a number, but a number with a proof.” (abstract, p. 1) The first problem is a singular self-adjoint Schrödinger operator; the second is a difficult non-normal resonance pair. The paper's workflow separates exploration from certification: “The assistant operates in an exploration loop, where prompts lead to proposed methods, code, numerical candidates, and useful failures. A computed spectral claim enters the paper only after passing through a separate certification layer.” (section 1, p. 3)

## technique: Temple certificate for a ground-state enclosure

What it is. For the modified singular self-adjoint operator, the authors use a rational trial function, exact reductions of its integrals, a residual bound, a comparison spectral gap, and Temple's inequality. In the first AI response box the assistant says: “The proof uses a five-term hydrogenic Ritz vector, computes its Rayleigh quotient and residual with rational interval arithmetic, then applies Temple’s inequality.” (section 3.1, p. 6)

How to apply it.

1. Use exploratory floating-point Ritz calculations only to choose a useful trial shape; the final trial function is rounded to exact rational coefficients (section 3.1, p. 6).
2. Evaluate the normalized trial vector's Rayleigh quotient `ρ` and squared residual `δ²` with outward-rounded rational interval arithmetic (section 3.1, pp. 6–7).
3. Reduce all required integrals to rational expressions in one scalar `C`; enclose `C` with the finite identity and remainder bound given in section 3.1 (p. 7).
4. Prove a lower bound on the second eigenvalue by comparison with the Coulomb operator, obtaining `λ₂(H) ≥ −1/36` (section 3.1, p. 7).
5. Check `ρ < −1/36` and apply Temple's inequality `ρ − δ²/(−1/36 − ρ) ≤ λ₁(H) ≤ ρ` (section 3.1, p. 7).

The resulting enclosure is `−0.05319676154302054294 ≤ λ₁ ≤ −0.05319676154233948813` (Certificate 3.1, p. 7), with `δ² ≤ 1.7311721 × 10⁻¹⁴` and a Rayleigh quotient interval of width `10⁻²²` (`[−0.0531967615423394881331, −0.0531967615423394881330]`) (section 3.1, p. 7). The scalar expansion with `N=60` gives an interval for `C` of width below `8.33 × 10⁻⁴¹` (section 3.1, p. 7).

Inference: In Verus, represent the trial vector and rational integrals as mathematical `spec fn`s, prove algebraic identities with `lemma` proof functions, and state the enclosure as an `ensures` result on a proof function. Executable Rust can compute a candidate, but the proof-only arithmetic must be erased and cannot be called at run time. Verus does not provide Temple's theorem or interval arithmetic automatically; those must be formalized or trusted as an external theorem library.

Evidence and limits. The paper's first AI response was a claim until the author audited the argument and verifier (section 3.1, p. 6). The floating-point Ritz calculation is a locator, not a certificate (the paper's section 5.2, p. 23, says a Ritz calculation “supplies a trial vector, not an eigenvalue enclosure”).

Inference: Temple's argument needs self-adjointness, a valid residual enclosure, and a spectral gap; the paper supplies the gap by comparison with the Coulomb operator.

## technique: Sturm oscillation and certified zero counting

What it is. To count all negative eigenvalues of the modified operator, the paper combines a tail criterion, a regular zero-energy solution, Sturm oscillation, and interval-validated shooting. It states: “Sturm oscillation identifies the number of negative eigenvalues of H with the number of zeros of u0, provided that zero is not itself an eigenvalue.” (section 3.2, p. 8)

How to apply it.

1. Establish that the potential is nonnegative beyond `r₊ = 9800 + 4000√6`, and use the Kneser-type criterion to rule out infinitely many negative eigenvalues accumulating at zero (section 3.2, p. 8).
2. Initialize the regular zero-energy solution with `u₀(r) ~ r²` near the singular endpoint (section 3.2, p. 8).
3. Start at `ε=10⁻²` from a Frobenius expansion with an explicit omitted-tail bound (section 3.4, pp. 10–11).
4. Propagate `(u₀,u₀′)` by validated Taylor steps, using a Cauchy–Picard majorant to bound each remainder (section 3.2, p. 9; section 3.4, pp. 11–12).
5. For each candidate interval, prove a sign change and prove that no uncounted zero occurs between steps by enclosing the range of `u₀` or by showing opposite endpoint signs with the range enclosure of `u₀′` excluding zero (section 3.2, p. 9).
6. Prove the tail has no further zeros from verified signs `u₀(T)<0`, `u₀′(T)<0`, and `V≥0` for `r≥T` (section 3.2, p. 9).

The Arb verifier finds one zero in each of 11 displayed intervals, from `[10.681579,10.683579]` through `[5906.061779,5906.063779]` (section 3.2, p. 8). It also verifies that zero is not an eigenvalue because `u₀(r)` tends to negative infinity (section 3.2, p. 9).

Inference: A Verus encoding would model the ODE step relation and a ghost interval or rational enclosure, then prove an invariant connecting each executable Taylor step to the mathematical solution. `invariant` is a loop annotation in Verus syntax, not a function call. The transcendental majorant and Sturm theorem would require formal libraries or trusted lemmas; Verus alone does not discharge analytic facts about differential equations.

The paper also gives a shorter analytic check: a change of variables converts the zero-energy equation to an associated Legendre equation, and `182 < 200 < 210` implies exactly 11 zeros by Sturm oscillation (section 3.3, p. 9). The interval certificate remains valid even though the AI did not discover this closed form (section 3.3, p. 9).

## technique: Dirichlet–Neumann bracketing

What it is. Finite-interval Dirichlet and Neumann realizations bracket each half-line eigenvalue once the tail is nonnegative. The paper states the form inequality and result: `λ_j(H_L^N) ≤ λ_j(H) ≤ λ_j(H_L^D), j=1,…,11` (equation 3.4, section 3.4, p. 10).

How to apply it.

1. Choose a cutoff `L=T=19597.9589711328` beyond the nonnegative tail (section 3.4, p. 10).
2. Define finite-interval operators with the singular-endpoint condition at zero and Neumann or Dirichlet condition at `L` (section 3.4, p. 10).
3. Use the validated shooting solver to propagate the regular solution at both endpoints of each candidate eigenvalue interval (section 3.4, p. 12).
4. Infer a finite-interval Dirichlet eigenvalue from an opposite sign in `u(L,λ)` and a Neumann eigenvalue from an opposite sign in `u′(L,λ)` (section 3.4, p. 12).
5. Combine the two finite-interval levels with the form inequality to enclose each half-line eigenvalue (section 3.4, p. 12).

Certificate 3.2 proves exactly eleven negative eigenvalues, each in a radius `5×10⁻¹²` interval, yielding ten-decimal values (section 3.4, Table 3.1, pp. 12–13). The first eigenvalue has the independent Temple certificate.

Inference: In Verus, encode lower and upper spectral bounds as abstract predicates and prove monotonicity lemmas for the two boundary-condition models. This is a proof architecture rather than a direct Rust algorithm; differential-operator domains and min–max principles remain substantial formalization work.

## technique: projective multiple shooting for non-normal resonances

What it is. Direct one-way shooting fails because interval errors grow through unstable non-normal dynamics. The successful method uses projective solution lines, short transfer maps, one projective variable per mesh node, and a global matching system. The paper summarizes the change: “The key step is not extra precision. It is a change of proof object.” (section 1, p. 3)

How to apply it.

1. Choose mesh points `x_j=jh`, with `h=0.0025` and `j=0,…,4000`, and construct midpoint frames `P_j` along a numerical center solution line (section 4.3.1, pp. 18–19).
2. Enclose each short transfer matrix `T_j(z)` and its `z`-derivative using Arb complex-ball Taylor integration and a Picard majorant (section 4.3.1, p. 19).
3. Convert each transfer matrix into a Möbius map `f_j(z,w)=(c_j+d_jw)/(a_j+b_jw)` on the projective coordinate (section 4.3.1, p. 19).
4. Build `F(W,z)=0` from the left boundary equation, all 4,000 local matching equations, and the right outgoing boundary equation (section 4.3.1, p. 19).
5. Apply a structured inverse of the midpoint Jacobian by forward recurrence; prove its final denominator is bounded away from zero (section 4.3.2, p. 20).
6. Apply a Krawczyk inclusion on a simultaneous nonuniform polydisc containing every node variable and `z` (section 4.3.3, p. 20).

The paper reports that the first tail checker was unsound for a nonuniform polydisc because it compared worst-case radii rather than checking every node. The corrected procedure inserts the tail interval directly into the final boundary row and verifies inclusion component by component (section 4.3.4, pp. 21–22). The paper's procedure list gives six steps, including denominator checks, structured inversion, and tail insertion (section 4.3.4, p. 22).

Inference: In Verus, projective coordinates can be represented by a mathematical pair plus a nonzero-denominator invariant. Local transfer correctness can be specified with `ensures`; lemmas can compose the 4,000-step relation; and a final proof function can state the Krawczyk inclusion. Verus does not natively implement complex interval arithmetic, Brouwer's theorem, or analytic tail bounds, so a production implementation would need a verified arithmetic library or a trusted certificate checker.

## technique: tail-robust Krawczyk–Brouwer inclusion

What it is. The finite truncation does not prove the half-line resonance because the true outgoing boundary has tail uncertainty. The paper bounds the tail by `α_{X,θ,R}≤1.77×10⁻¹⁷`, converts it into a terminal projective uncertainty set `E`, and checks the robust inclusion (4.6) with `−ΥE` included (sections 4.3.3–4.3.4, pp. 20–22).

How to apply it.

1. Bound the tail integral `α_{X,θ,R}=∫_X^∞|q_{θ,R}|` and derive a bound on the terminal projective coordinate `τ=y′(X)/y(X)`: `|τ+k(z)|≤2ε|k(z)|/(1−ε)` (section 4.3.3, p. 20).
2. Represent the resulting terminal correction as an enclosure `E` in the final projective chart (section 4.3.3, p. 21).
3. Form the Krawczyk map with the tail term, and check that it maps the compact convex polydisc into its interior (equation 4.6, section 4.3.3, p. 21).
4. Use Brouwer's fixed-point theorem to obtain a fixed point of the map `T(W,z)=(W,z)−Υ(F(W,z)+e*(z))`; since `Υ` is invertible, it solves `F+e*=0`, the half-line resonance equation (section 4.3.3, p. 21).
5. Repeat for odd/Dirichlet and even/Neumann parity boundary conditions (section 4.3.4, p. 22).

Certificate 4.1 gives radii below `6.50×10⁻¹⁹` for both resonances and separation greater than `1.32×10⁻⁴`, proving they are distinct (section 4.3.4, p. 22). The reported node-radius fractions are 0.6474 and 0.6469, so the componentwise inclusions are strict (section 4.3.4, p. 22).

Inference: In Verus, the fixed-point argument could be represented as a proof over finite rational boxes, but only after formalizing the arithmetic and theorem. The practical product lesson is to check nonuniform components individually; aggregate maxima can produce a false certificate.

## failed validation as a diagnostic technique

The paper records failed routes: amplitude shooting, variation-of-constants and amplitude Lohner forms, midpoint or Wronskian matching, Riccati/projective shooting, centered projective Lohner forms, and more precision (Table 4.1, p. 15; discussion in section 4.2, pp. 15–18). It states: “Extended precision alone won’t help.” (section 4.2, p. 17) At 360 and 900 bits, roundoff decorations shrank but, in the AI's report, the enclosing-ball radius stayed about 21.1635544598 for the projective coordinate and 85.0013815165 for the denominator (Prompt 7 response, section 4.2, p. 17).

## techniques for the catalog

- certificate-first workflow: separate AI exploration and candidate generation from an independently checked mathematical certificate
- Temple residual enclosure: combine a rational trial vector, interval Rayleigh/residual bounds, a comparison gap, and Temple's inequality
- Sturm zero counting: count negative eigenvalues through a validated regular zero-energy solution and certified interval shooting
- Dirichlet–Neumann bracketing: bound half-line eigenvalues between finite-interval boundary-condition spectra with a nonnegative tail
- projective multiple shooting: replace unstable amplitude propagation with short transfer maps and one projective variable per mesh node
- tail-robust Krawczyk–Brouwer: insert terminal tail uncertainty into a componentwise inclusion that proves a half-line resonance
- failure-guided reformulation: use failed interval routes to identify unstable proof objects and change the mathematical representation
