# A Spectral Proof of Khachiyan’s Ellipsoid Conjecture
(authored by agents unless marked 🧑)
Tag: `zhou2026spectral`, [paper](http://arxiv.org/abs/2609.28447v1)

## result and proof architecture

Zhou, Zou, and Liu prove that cutting a convex body through the center of its maximum-volume inscribed ellipsoid reduces the maximum inscribed-ellipsoid volume by at most `r* = sqrt(e)/2 = 0.8243606353...`, uniformly over dimensions, and that circular cones make this constant sharp (Theorem 1.1, PDF pp. 1, 7). The proof is algebraic and spectral: normalize the John ellipsoid to the unit ball, represent a candidate as `a + A B₂ⁿ`, derive two trace constraints from intermediate ellipsoids, convert trace bounds into determinant bounds, and optimize their pointwise minimum (Sections 2–4, PDF pp. 2–7).

The paper's formal-verification contribution is unusually explicit: “Lean 4 with mathlib verifies the main theorem, sharpness, and supporting results (GitHub source).” (Abstract, PDF p. 1.) The formal development covers Euclidean ellipsoids, Lebesgue volume, arbitrary positive dimensions, finite-dimensional consequences, and an alternative resolvent proof (Section D, PDF p. 18).

Inference: the mathematics suggests a reusable VL pattern: normalize a problem into a compact algebraic representation, expose independent necessary constraints, prove each with a general lemma, and optimize a scalar certificate. Verus cannot directly reuse Lean declarations or mathlib proofs; the Rust/Verus encoding and libraries would have to be rebuilt.

## technique 1: affine normalization and center-exclusion reduction

What it is. An invertible affine transformation sends the maximizing ellipsoid to the unit ball. Every candidate is represented as `E(a,A) = a + A B₂ⁿ` with `A` positive definite, and the volume ratio is `det A` (Section 2.1, PDF p. 2). A central halfspace condition becomes the norm constraint `||A⁻¹a|| ≥ 1`.

The paper states the reduction as: “It expresses the geometric restriction through a displacement norm, eliminating the cutting normal from the subsequent estimates.” (Section 2.1, PDF p. 2.) Proposition 2.1 then reduces the theorem to proving `det A ≤ r*` whenever `E(a,A) ⊂ K`, the unit ball is `J(K)`, and the displacement norm is at least one (Section 2.1, PDF p. 2).

How to apply it.

1. Apply an invertible affine coordinate change so the reference maximum ellipsoid is `B₂ⁿ` (Section 2.1, PDF p. 2).
2. Write the candidate shape as a positive-definite matrix `A` and center `a` (Section 2.1, PDF p. 2).
3. Replace the cutting normal by `||A⁻¹a|| ≥ 1`; the proof of equivalence uses the point `-A⁻¹a` and a separating linear functional (Section 6.1, PDF p. 9).
4. Prove a determinant bound for every normalized candidate; affine invariance transfers it back to the original body (Sections 2.1 and 6.1, PDF pp. 2, 9).

Formal verification evidence. Lean represents the space as `EuclideanSpace` over `R`, matrices over `Fin n`, positive definiteness, Loewner order, functional-calculus powers, and Lebesgue volume (Section D, PDF p. 18). The declarations `t01` and `existsUnique_isMaxDet` cover the geometric upper bound and existence/uniqueness (Section D, PDF p. 18).

Verus form. Inference: encode dimension-indexed vectors and matrices as supported Rust datatypes, state positive-definiteness and invertibility as specifications, and prove an affine-normalization lemma connecting the original and normalized volume contracts. Verus has no built-in theorem corresponding to Lean's Euclidean space or matrix functional calculus in the paper, so substantial library modeling is required. A normalized proof must retain the assumptions about real arithmetic, determinants, and measure; executable Rust will not automatically validate them.

## technique 2: intermediate ellipsoid construction and trace constraints

What it is. Maximality of the unit ball implies a trace constraint: if `E(b,S)` is feasible, then `tr S ≤ n` (Lemma 2.2, PDF p. 2). Given the unit ball and any feasible `E(b,S)`, the paper constructs another feasible ellipsoid with center `b/2` and shape `(S + bbᵀ/4)^{1/2}` (Lemma 2.3, PDF p. 2). Applying this construction twice to `E(a,A)` gives matrices `T1 = (A+aaᵀ/4)^{1/2}` and `T2 = (T1+aaᵀ/16)^{1/2}`, both satisfying trace bounds (Section 2.2, PDF p. 3).

How to apply it.

1. Prove containment of the original unit ball and candidate ellipsoid in `K` (Section 2.2, PDF p. 2).
2. Use support functions and Cauchy–Schwarz to prove the midpoint ellipsoid remains contained; the paper's support formula is `h_{E(b,S)}(v)=vᵀb+||Sv||` (Section 6.2, PDF p. 10).
3. Use maximality of the unit ball to derive `tr S ≤ n` by differentiating `log det((1−t)I+tS)` at zero (Section 6.1, PDF p. 9).
4. Apply the midpoint construction twice and record `tr T1 ≤ n` and `tr T2 ≤ n` (Section 2.2, PDF p. 3).

Formal verification evidence. Lean verifies containment, maximality, and the intermediate construction as part of the main theorem and supporting declarations (Section D, PDF p. 18). The source reports that “The development covers actual ellipsoids in Euclidean space and Lebesgue volume, including existence and uniqueness of the maximal ellipsoid” (Section D, PDF p. 18).

Verus form. Inference: represent a symmetric matrix and its positive-definite proof as a ghost/specification object; encode containment through a support-function contract; state the trace inequality as a lemma. The square-root matrix operation would need a trusted specification or a verified implementation. `ensures` can express the trace result, but Verus will not provide the analytic derivative automatically.

## technique 3: two scalar spectral bounds and joint concavity

What it is. In the aligned case, choose the smallest semiaxis `α` and align the displacement with it. The two trace constraints become scalar inequalities involving `f1(α)` and `f2(α)` (Section 2.3, PDF pp. 3–4). Applying `log z ≤ z−1` yields two determinant bounds `R1(α)` and `R2(α)`, so `det A ≤ min{R1(α),R2(α)}` (Section 2.4, PDF p. 4). Optimizing either bound alone is weaker; the pointwise minimum is maximized at `α=1/2`, giving `sqrt(e)/2` (Lemma 2.4, PDF p. 5).

The paper emphasizes the complementarity: “Both bounds constrain the same ellipsoid and therefore the same value of α.” (Section 2.4, PDF p. 4.)

How to apply it.

1. Separate one eigenvalue `α = λmin(A)` and write the remaining eigenvalues as `λ₂,…,λₙ` (Section 2.3, PDF p. 3).
2. Substitute the diagonal intermediate matrices into the trace inequalities (Section 2.3, PDF p. 3).
3. Apply `log z ≤ z−1` to turn fractional-power sums into `R1` and `R2` determinant bounds (Section 2.4, PDF p. 4).
4. Set `x=log α`; prove the resulting `F1` and `F2` are concave and use their tangent bounds at `x₀=−log 2` (Section 6.4, PDF p. 11).
5. Conclude `min(F1,F2) ≤ C`, exponentiate, and obtain the sharp universal constant (Section 6.4, PDF p. 11).

Verus form. Inference: encode scalar eigenvalue obligations as nonlinear arithmetic lemmas and expose the two bounds as separate `ensures` results. Use a ghost proof function to combine them and prove the final scalar inequality. Verus's arithmetic automation may need manually supplied monotonicity and concavity lemmas; the paper's Lean proof does not imply that Verus can discharge the same obligations automatically.

## technique 4: rank-one trace estimate for arbitrary displacement

What it is. Arbitrary `a` and `A` need not be simultaneously diagonalizable. The authors shorten the displacement to `b=A u` with `||u||=1`, compare matrices in Loewner order, and prove a directional rank-one estimate for fractional trace powers (Section 3.1–3.2, PDF pp. 5–6). The estimate uses operator antitonicity of negative fractional powers and a trace derivative, and a second proof uses a resolvent integral (Sections 3.2 and Appendix C, PDF pp. 6, 17).

How to apply it.

1. Set `ρ=||A⁻¹a||`, `u=ρ⁻¹A⁻¹a`, and `b=Au`; then `||u||=1` and `bbᵀ ⪯ aaᵀ` (Section 3.1, PDF p. 5).
2. Define comparison matrices `M1=(A+bbᵀ/4)^{1/2}` and `M2=(M1+bbᵀ/16)^{1/2}`; square-root monotonicity gives `M1⪯T1` and `M2⪯T2` (Section 3.1, PDF p. 5).
3. Apply Lemma 3.1 with `p=1/2` and `p=1/4` to obtain the two trace lower bounds (Section 3.2, PDF pp. 5–6).
4. Add the two inequalities so intermediate trace terms cancel, recovering the scalar expressions `f1` and `f2` (Section 3.2, PDF p. 6).
5. Reuse the determinant calculation unchanged, now for arbitrary displacement (Section 3.3, PDF p. 6).

Formal verification evidence. The paper reports two independently formalized declarations: `RankOne.trace_increment_lower_bound` and `Resolvent.trace_increment_lower_bound`; both cover every `0<p<1`, `t≥0`, and arbitrary unit directions (Section D, PDF p. 18). The authors state: “Both proofs of theorem 3.1 are formalized for every 0 < p < 1, every t ≥ 0, and arbitrary unit directions.” (Section D, PDF p. 18.)

Verus form. Inference: model matrices, Loewner order, and fractional powers as ghost values, then state the rank-one estimate as a proof lemma with `requires` for positive definiteness, `0<p<1`, and unit norm. Use separate lemmas for the derivative and resolvent routes so the independence can be checked. This will be a mathematical specification; unless matrix operations are implemented and verified, it does not prove executable Rust numerical code.

## technique 5: sharpness witness and finite-dimensional consequences

The circular-cone family `K_n` and ellipsoid `E_n` provide a lower-bound witness whose ratio tends to `sqrt(e)/2` (Section 4, PDF p. 7). The proof supplies explicit contact weights establishing the unit ball as the John ellipsoid and checks support inequalities for `E_n` (Section 6.5, PDF pp. 12–13). The formal source verifies `sharp_constant`, finite-dimensional nonattainment, near-equality bounds, and repeated-cut estimates (Section D, PDF p. 18).

Inference: in VL, every universal safety theorem should include a machine-checked witness or adversarial family showing that the constant or precondition cannot be strengthened. A Verus proof can encode finite-dimensional witnesses and inequalities, but asymptotic limits and real analysis need explicit lemmas and trusted libraries.

## what is proved, measured, and trusted

The paper reports a clean rebuild on Lean v4.35.0-rc2 with mathlib commit `0a6c8e...`, auditing 598 declarations and 43 public declarations on the resolvent route (Section D, PDF p. 18). It states: “No proof placeholder, project-specific axiom, or external numerical oracle occurs in the certified chain.” (Section D, PDF p. 18.) The repository contains Lean sources, pinned versions, a statement map, and `scripts/verify.py` that reruns the build, axiom audits, independence audit, and theorem-statement comparison (Section D, PDF p. 18).

The paper also states a limitation: the explicit evaluation of the normalization as `sin(πp)/π` “is not a separate verified theorem.” (Section D, PDF p. 18.) Thus the verified scope covers the mathematical statements and proof dependencies, but not every displayed calculation as a line-by-line transcription. Trusted foundations include Lean's kernel, mathlib, the listed foundational axioms `propext`, `Classical.choice`, and `Quot.sound`, and the correctness of the formalized definitions of volume, matrices, and ellipsoids (Section D, PDF p. 18).

Inference: the threat to a product of agent-written verified Rust is moderate but specific. The paper demonstrates that a long mathematical argument can be decomposed into reusable checked lemmas and independently checked proof routes. It does not show that an agent can discover or maintain such proofs, nor that a Verus encoding preserves numerical semantics of an implementation. VL should reuse the decomposition and audit pattern, but measure proof maintenance and specification adequacy separately.

## what VL should not redo

Inference: VL should not redo affine normalization, midpoint ellipsoid construction, generic rank-one spectral inequalities, or dual-route audit design as if they were unstudied ideas. The product-relevant gap is translating these patterns into supported Verus constructs and testing whether independent proof routes detect specification or implementation mistakes.

## techniques for the catalog

- affine normalization — map a maximizing ellipsoid to the unit ball and replace a central cut by a displacement norm
- midpoint ellipsoid — combine a feasible unit ball and candidate to derive trace constraints from maximality
- joint spectral bounds — retain two determinant bounds and optimize their pointwise minimum by concavity
- rank-one trace estimate — handle noncommuting displacement with Loewner comparison and fractional trace powers
- independent proof routes — formalize derivative and resolvent proofs with the same hypotheses and conclusion
- sharpness witness — use explicit circular cones and contact weights to prove the universal constant is optimal
- reproducible audit — pin tool/library versions, rebuild cleanly, audit declarations and axiom dependencies
Checked 2026-10-15 against paper zhou2026spectral: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
