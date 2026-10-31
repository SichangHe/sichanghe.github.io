# Formal Proof of a Wave Equation Resolution Scheme: The Method Error
(authored by agents unless marked 🧑)
Tag: `boldo2010wave`, [paper](https://arxiv.org/abs/1005.0824v2)

## what is proved or measured
The paper formalizes in Coq the convergence of the centered three-point finite-difference scheme for the one-dimensional acoustic wave equation. “We present a comprehensive formalization of the simplest scheme and formally prove its convergence in Coq.” (Abstract, p. 1). The result is uniform order-(2,2) convergence on a finite time interval under a two-sided CFL condition, finite-support assumptions, and regularity assumptions (Sections 2 and 4, pp. 5–12). The authors do not prove the Lax equivalence theorem; they prove consistency plus stability implies convergence for this scheme (Section 2.3, p. 7).

## technique 1: model infinite-grid numerical quantities with finite-support functions

what it is: define grid functions as maps from integers to reals but use a `FS` predicate to restrict the functions used in dot products to finite support. The dot product is defined on the full function space with Hilbert's epsilon operator, selecting a finite sum when support exists and leaving it unspecified otherwise (Section 3.1, pp. 7–8).

how to apply it:
1. define `FS(f) := exists a b, forall i, f i != 0 -> a <= i <= b`
2. define addition, scalar multiplication, and shifts pointwise
3. prove closure of `FS` under those operations
4. define the dot product using a finite-sum witness selected by epsilon
5. prove algebraic and norm inequalities only under `FS` hypotheses
6. use a tactic to discharge routine support goals (Section 3.1)

The paper states: “To ease the manipulation of functions with finite support, we introduce the following predicate characterizing such functions” (Section 3.1, p. 8). It proves scalar, addition, norm, and Cauchy–Schwarz lemmas by reducing to finite sums (p. 8).

Verus form. Inference: represent a grid function by a finite sequence or a map with a ghost support interval; state support closure and dot-product laws as proof contracts. This is a proposed adaptation, not a Verus result established by the paper.

## technique 2: make big-O uniform over extra variables

what it is: ordinary pointwise big-O is insufficient because the truncation error depends on both a spatial/temporal point and discretization steps. The paper first observes that a naive definition permits constants depending on the point, then defines uniform big-O with one α and C for every point and step in specified sets (Section 3.2, pp. 8–9).

how to apply it: (1) define sets S of physical points and P of positive `(Δx,Δt)` satisfying `ζ ≤ cΔt/Δx ≤ 1−ξ`; (2) state `exists α,C>0, forall x in S,Δ in P, norm Δ ≤ α -> abs(f x Δ) ≤ C abs(g Δ)`; (3) instantiate it for truncation and convergence errors. The authors say: “As often, the formal specification has allowed us to detect some flaws in usual mathematical pen-and-paper proofs, such as an erroneous switching of the universal and existential quantifiers hidden in the big O definition.” (Section 3.2, p. 9).

Verus form. Inference: define a uniform-error predicate with explicit witnesses α and C, and prove inequalities under the admissible-step conditions. A corresponding convergence theorem would also require a model of the analytic assumptions; the paper does not evaluate this adaptation.

## technique 3: formalize regularity through multivariate Taylor operators

what it is: assume operators for differentiation with respect to the first variable (space) and second variable (time), build higher mixed derivatives and a multivariate Taylor polynomial `DL_n`, and define regularity by uniform big-O remainder bounds (Section 3.3, p. 9). The convergence proof uses Taylor expansions to bound truncation error.

how to apply it: (1) define derivative operators abstractly; (2) define `DL_n` as the sum over total derivative order and binomial coefficients; (3) state sufficient regularity as a uniform remainder bound; (4) instantiate degree-three Taylor polynomials in time and space, using order-four regularity (`m = 4` in Equation (24)), for the later time steps; (5) combine the expansions at positive and negative increments so that terms cancel. Handle the initial steps separately using the initialization equations and Taylor bounds (Section 4.3, pp. 10–11). The paper notes: “This involves long and complex expressions but the proof is straightforward.” (Section 4.3, p. 10).

Verus form. Inference: keep derivatives in a ghost mathematical model, take Taylor remainder bounds as proof assumptions, and derive truncation inequalities from them. This would preserve the paper’s separation between assumed analytic regularity and the discrete proof.

## technique 4: consistency, stability, and convergence decomposition

what it is: prove convergence by showing (a) truncation error is order `Δx²+Δt²`, (b) a discrete energy is stable under CFL, and (c) the convergence error itself solves the same discrete scheme with truncation error as source (Sections 4.3–4.5, pp. 10–12).

how to apply it:
1. define the three-point scheme and initializations from Equations (8)–(12)
2. define truncation and convergence errors
3. use Taylor bounds for pointwise consistency
4. bound the number of nonzero grid values using finite-support cones
5. prove the discrete energy balance, nonnegativity under CFL, and an upper bound involving the accumulated source norms; energy is constant when the source is zero (Section 4.4, p. 11)
6. show that the convergence error solves a discrete scheme with initial data `u0,j = 0`, `u1,j = e¹_j/Δt`, and source `s_j^k = ε_j^{k+1}`; apply the energy bound to that scheme (Section 4.5, p. 12)
7. bound the initial errors and the sum of truncation sources to obtain uniform order-(2,2) convergence

The paper explicitly says: “Instead, we establish that consistency and stability implies convergence in the particular case of the one-dimensional acoustic wave equation.” (Section 2.3, p. 7). The lower CFL bound ζ is required by this proof's support-count bound because otherwise the number of nonzero terms can grow too quickly as `Δt/Δx` tends to zero (Section 4.3, pp. 10–11).

Verus form. Inference: model grid steps with arrays and ghost energy/error predicates; use CFL and support conditions as preconditions, the energy balance and source-dependent bound as postconditions, and the error-scheme relation as a proof lemma. A proposed adaptation must account for the initial errors and accumulated source terms.

evidence and assumptions
The final theorem is a uniform order-(2,2) bound on `[0,tmax]` under positive grid steps, the two-sided CFL condition, regularity, finite-support initial data/source, and a finite-support axiom for the continuous solution (Sections 4.1–4.5, pp. 9–12). Existence and uniqueness of a continuous solution are admitted (Section 2.1, p. 4). The continuous solution’s regularity is assumed through Taylor remainder bounds (Section 3.3, p. 9). Its support is assumed to lie in `[χ1−ct,χ2+ct]`, as does the source’s support; initial data vanish outside `[χ1,χ2]` (Section 4.2, p. 10). The authors explain: “This is mathematically correct, since it derives from d’Alembert’s formula (6). But its proof is out of the scope of the current formalization and we therefore preferred to simply add the nullity axiom.” (Section 4.2, p. 10). It also warns that method-error convergence does not certify floating-point implementations: “the proof of the method error has to be combined with a proof on the rounding error” (Section 5, p. 12). No benchmark denominator or runtime study is reported; the evidence is the mechanized Coq development and its stated theorem.

## techniques for the catalog
- finite-support function model — encode infinite-grid functions with a support predicate and reduce dot products to finite sums
- uniform big-O — quantify one error constant uniformly over physical variables and admissible discretizations
- Taylor remainder formalization — define multivariate expansions and regularity bounds needed for truncation estimates
- energy stability — derive a discrete energy evolution and bound it under a two-sided CFL condition
- consistency-to-convergence reduction — make the error satisfy the same scheme and apply stability to truncation sources
- rounding separation — combine method-error convergence with an independent floating-point error proof
