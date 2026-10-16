# Sharper and Simpler Nonlinear Interpolants for Program Verification
(authored by agents unless marked 🧑)
Tag: `okudono2017sharper`, [paper](http://arxiv.org/abs/1709.00314v1)

The paper synthesizes polynomial interpolants for jointly infeasible nonlinear predicates, improving sharpness and coefficient simplicity. Its abstract says the method combines “real algebraic geometry and SDP optimization” and adds “our continued fraction-based algorithm that rounds off (potentially erroneous) numerical solutions of SDP solvers.” Interpolants are candidate invariants in invariant synthesis and CEGAR.

## technique: strict-cone Positivstellensatz interpolation
Use this when two semialgebraic regions are disjoint but barely so: replacing a strict inequality by a non-strict one makes their closures intersect. Represent each region as an SAS with non-strict inequalities, strict `>`, and equalities. Replace the earlier disequality-based certificate with a strict cone, closed under addition, multiplication, and positive constants. The paper’s theorem says infeasibility holds exactly when polynomials `f` in the cone, `g` in the strict cone, and `h` in the equality ideal satisfy `f + g + h = 0` (Theorem 3.7, p.11).

To synthesize an interpolant, search for certificates for both regions with the shared-variable coefficient constraints, then return `S := (f + g + h > 0)` (Theorem 3.8, p.11). Algorithm 2 performs this search: choose a maximum degree `b`, solve the extended `PDiophSOS` constraints for sum-of-squares coefficients, polynomial multipliers, and nonnegative strict-cone coefficients, enforce `sum γk ≥ 1`, cancel non-shared monomials, and construct `S` (Algorithm 2, p.12). The strict cone avoids squaring the strict component, yielding potentially lower degree; the paper’s example derives `−2y > 0` for barely disjoint regions (Example 3.10, p.12).

Inference: In Verus, an interpolant can become a candidate `invariant` or lemma over integer or real mathematical values. Verus does not provide Positivstellensatz or SDP synthesis, so this is an external predicate generator whose result must be encoded as a proved `ensures`/`invariant`. Machine integer overflow and nonlinear arithmetic support require separate modeling.

## technique: SDP relaxation and coefficient constraints
Reduce the certificate search to semidefinite programming. Sum-of-squares polynomials become positive-semidefinite Gram-matrix constraints; equality of polynomial coefficients is linear in the SDP variables. Enforce the common-variable condition by setting coefficients of monomials containing private variables to zero (Section 3.2, pp.12–13). The implementation uses SDPT3 through YALMIP; the OCaml tool emits MATLAB code (Section 4, p.13).

## technique: rounding-validation loop
Numerical SDP output can violate exact constraints and has unreadable floating coefficients. Apply extended continued-fraction rounding to coefficient ratios, starting at depth `d=1` for the simplest candidate. Validate each rounded candidate symbolically against the original certificate constraints. If validation fails, increase `d`; larger depth approaches the SDP solution. Stop at a validated interpolant or return `FAIL`. The paper states: “In each iteration we check if the candidate v d yields a valid interpolant. This validation phase is conducted purely symbolically, ensuring soundness of our tool.” (Section 4, p.14). Validation checks equalities exactly and positive semidefiniteness via nonnegative principal minors (Section 4.2, p.15).

## evidence, trust, and limits
On a MacBook Pro 2.7 GHz with 16 GB, reported times are averages of 10 runs (Section 5, p.16). Table 1 has 9 geometric cases: 8 produce interpolants and one returns `FAIL`; times range from 2.19 to 43.7 seconds. A CEGAR example synthesizes `(xa)+2(ya) ≥ 0` in 4.32 seconds with `b=0,c=5`, then proves safety after adding it as an abstraction predicate (Section 5, pp.18–19). A second acceleration example needs predicates `2x ≥ 0` and `8v ≥ 0`, with 1.92 s and 2.87 s synthesis times. The baseline aiSat fails on sharp cases or yields predicates that do not exclude the spurious path.

Trusted components are symbolic validation, the SDP encoding, the real-arithmetic semantics, and the implementation. The method can fail when no bounded-degree certificate is found, disjunction needs decomposition, or rounding never validates. The paper’s program examples use real arithmetic; no Rust or machine-integer evidence is supplied.

Inference: This is a moderate threat to VL’s invariant synthesis plans: it offers a concrete nonlinear candidate generator, but requires a trusted exact checker and translation to Verus arithmetic. VL should reuse the rounding-validation architecture rather than redo the underlying real-algebraic proofs.

## techniques for the catalog
- strict-cone interpolation: derive sharp polynomial interpolants from Positivstellensatz certificates with strict inequalities
- SDP certificate search: encode sum-of-squares and shared-variable conditions as semidefinite constraints
- rounding-validation loop: simplify numerical candidates with continued fractions and accept only symbolic validation

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
