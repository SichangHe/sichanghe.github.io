# Nonlinear Craig Interpolant Generation
(authored by agents unless marked 🧑)
Tag: `gan2020nonlinear`, [paper](https://www.semanticscholar.org/paper/dd6e06f448c8f923af8e289d555fbb2b22c8cea5)

## scope
Gan et al. synthesize polynomial Craig interpolants for contradictory nonlinear polynomial formulas with shared variables x and local variables y and z. The abstract states: “Then, we show that synthesizing such interpolant can be reduced to solving a semi-definite programming problem (SDP).” (Abstract, p. 1). They also give a numerical-error check and use the interpolants to generate nonlinear loop invariants.

Inference: this is a useful mathematical recipe for a Verus front end, but the paper does not implement Verus or prove Rust code. Its assumptions, especially bounded (Archimedean) state sets and polynomial arithmetic, must be made explicit before transferring it.

## technique 1: project contradictory state sets and separate them with a polynomial

What it is. Let φ(x,y) be a conjunction of polynomial inequalities in shared x and local y, and ψ(x,z) a conjunction in x and local z. Assume φ ∧ ψ is unsatisfiable and both sets satisfy the Archimedean condition. Project each feasible set onto x: P_x(φ) = {x | exists y. φ(x,y)} and P_x(ψ) = {x | exists z. ψ(x,z)}. The projections are disjoint compact semi-algebraic sets. Find a polynomial h(x) positive on the first and negative on the second. Then h(x)>0 is an interpolant because it mentions only shared variables.

The paper gives the exact proof plan: “First, we prove that Px (φ(x, y)) and Px (ψ(x, z)) are compact semi-algebraic sets which are unions of finitely many basic closed semi-algebraic sets.” (§3, p. 419). It then uses Putinar's Positivstellensatz to obtain a polynomial whose zero set separates the pieces (§3, pp. 419–421).

When to use it. Use this when a verification state can be expressed by polynomial inequalities, the two sides share a state projection, and the reachable and bad regions are disjoint and bounded. It is a way to summarize a nonlinear path condition without exposing path-local variables.

How to do it. (1) Identify shared variables x and eliminate local variables by projection. (2) Use compactness and the finiteness theorem to express each projection as a finite union of basic closed semi-algebraic sets. (3) Apply Putinar's theorem under an Archimedean quadratic module to obtain a separator polynomial. (4) Check h>0 on the φ projection and h<0 on the ψ projection. Proposition 1 states these two inequalities are sufficient (§3, pp. 420–421).

Verus form. Inference: represent the shared abstract state as a Verus mathematical value and define `spec fn phi` and `spec fn psi` over sequences, integers, or reals supported by the project. Store h as a ghost polynomial evaluator and prove `requires phi(s) ==> h(s) > 0` and `requires psi(s) ==> h(s) < 0` through `ensures` on a `proof fn`. Verus does not provide quantifier elimination or a projection operator as a built-in interpolant generator. A tool would synthesize h externally, then have Verus check the resulting implications with `assert` and helper `proof fn`s. If the executable state uses machine integers, the bounded arithmetic and overflow model must be included in the specification.

Evidence and limits. The existence argument is mathematical and conditional. The Archimedean condition means some a>0 has a²−sum(xᵢ²) in the quadratic module (§2.1, p. 418); the authors explain that this amounts to bounded variables and is reasonable because only bounded numbers can be represented in a computer (§1, p. 417). Inference: unbounded counters, pointers, or heap sizes do not satisfy this assumption automatically.

## technique 2: reduce interpolation to sum-of-squares SDP

What it is. Introduce a polynomial h(x) and sum-of-squares multipliers u_i(x,y), v_j(x,z). Solve the identities

`h − 1 = sum_i u_i f_i + u_{m+1}`

and

`−h − 1 = sum_j v_j g_j + v_{n+1}`

with every multiplier an SOS polynomial. Theorem 5 proves that a solution gives an interpolant, and Theorem 7 states completeness once degree bounds are large enough (§4, pp. 425–426). The paper's soundness statement is: “Suppose that φ(x, y) and ψ(x, z) are defined as in Problem 1, and h(x) is a feasible solution to (9), then h(x) solves Problem 1.” (Theorem 6, p. 426).

How to do it. (1) Choose degree bounds for h and each multiplier. (2) Represent each SOS polynomial as E_d(x)^T C E_d(x), where C is positive semidefinite. (3) Equate coefficients to linear trace equations. (4) Give all coefficient equations and block positive-semidefinite constraints to an SDP solver. (5) Recover h and verify the interpolant inequalities. The resulting system is equation (12) in §5, pp. 427–428.

The paper's Example 2 sets the degree of h to 2 and uses MATLAB YALMIP with Mosek. It reports the concrete polynomial `h(x,y,z) = −416.7204 − 914.7840x + 472.6184y + 199.8985x² + 190.2252y² + 690.4208z² − 187.1592xy` (§4, p. 426). Example 4 handles disjunctions after conversion to disjunctive normal form, using degree 2 (§6, p. 432). Example 5 uses degree 7 for a benchmark and again solves with YALMIP and Mosek (§6, pp. 432–433).

When to use it. Use SDP when polynomial constraints are nonlinear but bounded and a numerical solver is available. Increase degree when the SDP is infeasible; completeness is asymptotic in the degree, so a failed low-degree run is not a proof that no interpolant exists.

Verus form. Inference: keep the SDP solver outside the trusted Verus proof and import h plus rationalized coefficients as ghost constants. Prove the two SOS identities or their resulting inequalities in Verus with `spec fn` polynomial evaluation, `assert`, and `proof fn` lemmas. Verus does not have a native SOS or matrix-positive-semidefinite construct in the referenced material. A safer workflow checks the exported coefficients symbolically or with a separately verified arithmetic certificate before using h in a Rust loop invariant.

Evidence and limits. Theorem 6 gives soundness and Theorem 7 gives completeness only under the stated Archimedean polynomial assumptions. Numerical examples show concrete h values, but the paper does not give a benchmark table of solve times or success rates. Inference: the method's practical cost and degree growth for systems-scale invariants remain unknown.

## technique 3: guard numerical SDP output against unsound rounding

What it is. Numerical SDP solvers return approximate matrices, so the authors add a floating-point error analysis. They represent SOS matrices as positive semidefinite Gram matrices, use a Cholesky-based sufficient condition, bound coefficient errors by a tolerance δ and floating-point term β, and then prove the reconstructed h remains positive and negative on the two sets.

How to do it. (1) Fix degree 2d and encode each SOS polynomial with a Gram matrix (§5, pp. 427–428). (2) Solve the coefficient equations numerically. (3) Compute the matrix dimension D, solver residual δ, and β from the floating-point format and Cholesky conditions. (4) Bound the constraint polynomials and monomial basis on each compact set. (5) Check the paper's inequalities `γ1 δ < 1/2` and `γ2 β < 1/2`; Proposition 2 then yields h>0 on φ and −h>0 on ψ (§5, pp. 429–430). (6) Alternatively, use symbolic projection and implication checking with REDUCE, or an infinite-precision SDP for small problems (Remark 1, p. 430).

Evidence. In Example 3, the paper reports γ1=6557 and γ2=2320, Mosek's default tolerance δ=10^-8, h rounded to four decimal places, and β bounded by 10^-6. It then calculates γ1δ<1/2 and γ2β<1/2, concluding the Example 2 polynomial is a real interpolant (§5, p. 430). The paper states: “If so, any numerical result h > 0 returned by calling an SDP solver to (12) is guaranteed to be a real interpolant for φ and ψ.” (§5, p. 430).

Verus form. Inference: do not trust a floating-point h directly. Require a certificate with exact rational coefficients and have Verus prove the final inequalities, or verify the SOS Gram matrices with a checker whose output is itself represented as a proof obligation. Record the solver tolerance and all bounds in the artifact. Verus's arithmetic model differs from IEEE floating point, so the β analysis cannot simply be pasted into a machine-integer proof.

Where it fails. The bounds depend on compactness and chosen degree. Infinite-precision SDP is described as practical only for small problems (§5, p. 430). Inference: a product must reject certificates whose residuals or rational reconstruction cannot be checked, rather than treating a solver's “optimal” status as proof.

## technique 4: generate nonlinear loop invariants by forward squeezing

What it is. The authors revise the Squeezing Invariant–Forward procedure. Maintain forward strongest-postcondition regions A_i and backward weakest-precondition regions B_j. When their conjunction is unsatisfiable and Archimedean, synthesize an interpolant I_i with the nonlinear method. Check whether `{I_i ∧ ρ} C {I_i}` is inductive; if not, add a strongest postcondition and repeat. The paper's Algorithm 1 includes an explicit branch that replaces a non-Archimedean A_{i+1} with a previous state condition (§7, pp. 433–434).

How to do it. (1) Initialize A0=P and B0=(not ρ and not Q). (2) If the accumulated A and B are contradictory and Archimedean, call nonlinear interpolation. (3) Test inductiveness. (4) If it fails, compute `sp(I_i ∧ ρ,C)` when I_i is Archimedean; otherwise compute `sp(A_i ∧ ρ,C)`. (5) Update B with `B0 ∨ (ρ ∧ wp(C,Bj))` and continue. (6) Return yes with I when inductive, or no on a concrete counterexample (§7, Algorithm 1, p. 434).

Worked evidence. For the car loop in Algorithm 2, the initial invariant candidate I0 and second candidate I1 fail the inductiveness test. The third candidate is `I2 : 2.2505 + 2.7267 * vc − 0.063 * vc2 > 0`; the paper says it is inductive and implies `vc < 49.61` (§7, pp. 434–435). The loop starts with `vc` in [0,40], and the bad region is clipped to an Archimedean interval union [−2,−1] and [49.61,55] (§7, p. 434).

Verus form. Inference: express the loop's velocity and guard as executable Rust, state I2 as a `spec fn` predicate, and put it in the loop `invariant` declaration. Prove preservation with `assert` and `proof fn` lemmas for the nonlinear arithmetic; use `requires` for the initial range and `ensures` for the postcondition. Verus does not run the paper's strongest-postcondition/weakest-precondition transformer automatically. A synthesis tool can propose I2, but Verus must check the actual loop body, integer widths, and overflow behavior.

## proved, measured, trusted, and implications for VL

The paper proves existence, SDP soundness, completeness under degree bounds, and the numerical-error proposition. It measures example polynomials and error bounds, not a broad implementation benchmark. The trusted base includes real algebra, Putinar's Positivstellensatz, SDP solver behavior, floating-point and Cholesky assumptions, symbolic REDUCE checks, and the translation from program states to polynomial formulas.

Inference: VL should reuse nonlinear interpolant synthesis as a candidate invariant generator, but should make the final Verus proof independent of the numerical solver. Existing invariant-generation frameworks already cover linear interpolation; this paper supplies the nonlinear extension VL should not rediscover as a general idea. The product threat is high when unbounded or overflow-prone Rust state is modeled as real polynomials, and medium when exact certificates are checked in the actual Verus model. A generated invariant can be mathematically sound yet describe the wrong engineering requirement.

## techniques for the catalog
- projection separator — project contradictory polynomial regions onto shared variables and synthesize a sign-separating polynomial
- SOS interpolation SDP — encode positivity certificates with SOS multipliers and solve their Gram-matrix constraints by SDP
- numerical certificate checking — bound solver residual and floating-point error before accepting an approximate interpolant
- nonlinear invariant squeezing — alternate strongest and weakest predicate transformers with interpolants until an inductive invariant is found

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
