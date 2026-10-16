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

Verus form. Inference: represent a grid function as a finite sequence or map with a ghost interval and define `spec fn finite_support`; state closure and norm lemmas as `proof fn`s with `requires`/`ensures`. If an implementation uses an unbounded map, the finite-support fact must be ghost state or an explicit contract. Verus has no Hilbert epsilon operator in the cited material; use a finite representation or a separately specified chooser.

## technique 2: make big-O uniform over extra variables

what it is: ordinary pointwise big-O is insufficient because the truncation error depends on both a spatial/temporal point and discretization steps. The paper first observes that a naive definition permits constants depending on the point, then defines uniform big-O with one α and C for every point and step in specified sets (Section 3.2, pp. 8–9).

how to apply it: (1) define sets S of physical points and P of positive `(Δx,Δt)` satisfying `ζ ≤ cΔt/Δx ≤ 1−ξ`; (2) state `exists α,C>0, forall x,Δ, norm Δ ≤ α -> abs(f x Δ) ≤ C abs(g Δ)`; (3) prove closure under sums and scalar bounds; (4) instantiate it for truncation and convergence errors. The authors say: “As often, the formal specification has allowed us to detect some flaws in usual mathematical pen-and-paper proofs, such as an erroneous switching of the universal and existential quantifiers hidden in the big O definition.” (Section 3.2, p. 9).

Verus form. Inference: encode bounded discretization parameters and uniform error as `spec fn big_o_uniform`; prove concrete bounds with `proof fn` lemmas and arithmetic assertions. Verus can check a finite/bounded model directly; a real-analysis limit theorem still needs a mathematical library or axiomatized analytic facts.

## technique 3: formalize regularity through multivariate Taylor operators

what it is: define first and second partial-derivative operators, a multivariate Taylor polynomial `DL_n`, and a regularity predicate saying the remainder is big-O of the corresponding power (Section 3.3, pp. 9–10). The convergence proof uses Taylor expansions to bound truncation error.

how to apply it: (1) define derivative operators abstractly; (2) define `DL_n` as the sum over total derivative order and binomial coefficients; (3) state sufficient regularity as a uniform remainder bound; (4) instantiate degree-three Taylor polynomials in time and space, using order-four regularity (`m = 4` in Equation (24)), for interior grid points; (5) simplify the centered spatial terms, whose odd parts cancel. The paper notes: “This involves long and complex expressions but the proof is straightforward.” (Section 4.3, p. 10).

Verus form. Inference: keep analytic derivatives in a ghost mathematical model; state Taylor remainder bounds as `requires` on a proof lemma and use `ensures` to derive truncation inequalities. Do not claim that Verus's executable Rust arithmetic proves differentiability or real limits without imported analytic lemmas.

## technique 4: consistency, stability, and convergence decomposition

what it is: prove convergence by showing (a) truncation error is order `Δx²+Δt²`, (b) a discrete energy is stable under CFL, and (c) the convergence error itself solves the same discrete scheme with truncation error as source (Sections 4.3–4.5, pp. 10–12).

how to apply it:
1. define the three-point scheme and initializations from Equations (8)–(12)
2. define truncation and convergence errors
3. use Taylor bounds for pointwise consistency
4. bound the number of nonzero grid values using finite-support cones
5. prove the discrete energy evolution and nonnegativity under `ζ ≤ cΔt/Δx ≤ 1−ξ`
6. instantiate the stability bound for the error scheme
7. combine the truncation bound with the energy estimate to obtain uniform convergence

The paper explicitly says: “Instead, we establish that consistency and stability implies convergence in the particular case of the one-dimensional acoustic wave equation.” (Section 2.3, p. 7). The lower CFL bound ζ is required by this proof's support-count bound because otherwise the number of nonzero terms can grow too quickly as `Δt/Δx` tends to zero (Section 4.3, pp. 10–11).

Verus form. Inference: model one bounded grid step with Rust arrays, define ghost energy and error predicates, and prove loop invariants for time stepping. Use `requires` for CFL and support bounds, `ensures` for one-step energy monotonicity, and `proof fn` lemmas for the consistency-to-error reduction. An unbounded convergence limit remains outside ordinary executable Verus and must be isolated as an analytic specification or imported theorem.

evidence and assumptions
The final theorem is a uniform order-(2,2) bound on `[0,tmax]` under positivity, CFL, regularity, finite-support initial data/source, and a finite-support axiom for the continuous solution (Section 4.1–4.2, pp. 9–10). The paper assumes existence and regularity of the PDE solution and does not prove the d'Alembert formula or its finite-support consequence; it adds a nullity axiom (Section 2.1 and Section 4.2, p. 10). It also warns that method-error convergence does not certify floating-point implementations: “the proof of the method error has to be combined with a proof on the rounding error” (Section 5, p. 12). No benchmark denominator or runtime study is reported; the evidence is the mechanized Coq development and its stated theorem.

## what remains trusted and product threat
The trusted boundary includes Coq, its classical real library, the epsilon-based definitions, analytic assumptions, the continuous-solution existence/regularity hypotheses, and the separate floating-point proof. Inference: for agent-written verified Rust, the paper's strongest lesson is to expose hidden quantifiers, support bounds, and numerical stability conditions as explicit contracts. It is a moderate threat to a product that proves only discrete code while ignoring floating-point rounding or mesh-ratio preconditions. VL should reuse decomposition into local consistency, an energy/invariant proof, and an error relation; it should not claim a full numerical application proof from a method-error theorem alone.

## techniques for the catalog
- finite-support function model — encode infinite-grid functions with a support predicate and reduce dot products to finite sums
- uniform big-O — quantify one error constant uniformly over physical variables and admissible discretizations
- Taylor remainder formalization — define multivariate expansions and regularity bounds needed for truncation estimates
- energy stability — derive a discrete energy evolution and bound it under a two-sided CFL condition
- consistency-to-convergence reduction — make the error satisfy the same scheme and apply stability to truncation sources
- rounding separation — combine method-error convergence with an independent floating-point error proof
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "As often, the formal specification has allowed us to detect some flaws in usual mathematical pen-and-paper proofs, such as an erroneous switching of the universal and existential quantifiers hidden in the big O definition."): checked all 15 pages plus covers, references, quotations, numbers, sections, steps, and tag; corrected two quotations, distinguished Taylor degree three from regularity order four, restricted the CFL necessity claim to this proof, and linked the actual arXiv report identified on its cover; did not check Coq source or the separate rounding-error paper.
