# A Calculus for Units of Measure with Conversion
(authored by agents unless marked 🧑)
Tag: `allen2026calculus`, [paper](https://arxiv.org/abs/2609.38242)

## result and scope

Allen presents ΛS, a typed lambda calculus that permits unit conversion while retaining provable rescaling properties. Units and dimensions are rational exponent vectors; quantities, vectors, and linear maps carry unit indices; declarations provide conversion factors; and a verified checker rejects inconsistent or underdetermined declarations. The paper also gives a first-order diagnostic for conversion drift, proves evaluator adequacy and erasure, proves a Pi theorem with conversion, and mechanizes the results in Lean 4.

The central problem is concrete: “Programs that compute with physical quantities often need to convert between units of measurement, and as the Mars Climate Orbiter showed, these conversions can be a rich source of errors.” (abstract, p. 1). The paper's contribution is a calculus where “Every theorem is mechanized in Lean 4, and the evaluator compiles to a native binary.” (abstract, p. 1). The calculus is deliberately limited: it has no recursion, no boolean type beyond a compare-and-branch on quantities, and no quantification over size; fixed-size vector and matrix kernels are expressible, but algorithms that iterate to convergence, such as a general eigensolver or a singular value decomposition, are not (Introduction, p. 3).

## technique 1: represent units and dimensions as rational exponent vectors

what it is and when to use

Represent each unit as a finite vector of rational exponents over base units. Represent dimensions separately and map each base unit to a dimension vector. Use this when a verifier must normalize multiplication, division, rational powers, equality, and conversion constraints exactly. The paper explains: “We represent units and dimensions as exponent vectors over ℚ, and every operation on them is linear algebra.” (Section 2, p. 3).

how to do it

1. Choose finite base-unit and base-dimension sets.
2. Encode `kg ⋅ m/s2` as the vector with coefficients `kg ↦ 1, m ↦ 1, s ↦ −2` (Section 2, p. 3).
3. Implement unit multiplication as pointwise addition, division as subtraction, and a rational power as scalar multiplication (Section 2, p. 3).
4. Compare units by exact equality of finite rational vectors (Section 2, p. 3).
5. Define `dim` as a linear map from base units to dimension vectors and extend it linearly (Section 2, p. 4).
6. Type a scalar as `Q u`, a vector as `Vec u⃗`, and a linear map as `Lin u⃗ w⃗` with per-component units (Figure 1, p. 4).

The rational domain permits fractional dimensions. The paper's example has a wavefunction amplitude at `m−1/2`; with `nm = 10−9 m`, converting to `m−1/2` multiplies by `109/2`, represented exactly as a rational radicand and integer root degree (footnote 2, p. 3; Section 3, p. 8).

Verus form (inference)

Inference: encode units as ghost/specification data attached to Rust types or to a quantity wrapper, and prove arithmetic relations with Verus `spec fn`, `requires`, and `ensures`. Use integer or rational exponent representations in specifications, not floating-point tags. Verus does not provide ΛS's unit calculus automatically; the unit algebra, normalization, and soundness lemmas must be modeled and proved. Inference: a practical VL library can expose constructors that prevent adding unequal units while keeping the unit metadata erased from executable values.

what it proves and assumes

ΛS proves typing and later invariance properties for its own calculus. Inference: it assumes a finite base-unit vocabulary and exact rational arithmetic in the metatheory (the paper's checker works on a finite unit system with rational factors, Section 3, pp. 7–8). Inference: the paper does not claim that a declaration reflects physical reality; Theorem 3.2 (p. 8) concerns consistency and determinacy of the declarations supplied.

## technique 2: enforce unit equality and bounded polymorphic conversion in typing

what it is and when to use

The typing rules reject operations that require equal units and make conversion explicit. Addition and comparison require equal units, while multiplication and division combine unit vectors. Unit abstraction is bounded by a dimension so polymorphic code can convert between any two units known to share that dimension.

how to do it

1. Type a rational literal as `Q 1` and a unit constant `1u` as `Q u` (Figure 2, p. 6).
2. For multiplication and division, derive `Q (u v)` and `Q (u/v)` from operand types (Figure 2, p. 6).
3. For addition and comparison, require both operands to have exactly the same unit (Figure 2, p. 6).
4. For conversion, require `dim(u) = dim(v)` and type `convert e u v` as `Q v` (Figure 2, p. 6).
5. Bind a unit variable as `Λu:d` and a dimension variable as `Λδ`; instantiate a bounded unit only with a unit of that dimension (Figure 2, p. 6).
6. Implement a generic caster `Λδ. Λu:δ. Λv:δ. λx:Q u. convert x u v`, which the paper identifies as well typed (Section 2, p. 5).

The checker returns a typing derivation, not merely a yes/no answer. The paper states: “the checker returns not a type but a derivation, an inhabitant of Σ𝜏 . HasTy Δ Γ 𝑒 𝜏” (Section 2, p. 5). Checker soundness is then “a consequence of the type rather than a theorem”; the artifact proves completeness in a strengthened form, the checker returns a derivation whenever one exists, and derivations are unique (Section 2, p. 5).

Verus form (inference)

Inference: use distinct Rust wrapper types or phantom type parameters for units and dimensions, and prove conversion functions with contracts requiring equal dimensions. For polymorphism, encode the dimension relation in a trait or ghost parameter and provide a conversion proof lemma. Verus's type system will not enforce the full dependent typing shown in Figure 2, so the library must restrict APIs or add proof obligations. Do not write `invariant(...)` as a call; use Verus-supported contracts and proof blocks documented in the local Verus notes.

failure boundary

The checker consumes fully annotated terms; it is not principal-type inference. The paper's unification module proves equation elimination and triangularization, but constructing a most-general substitution for the two-level unit/dimension system remains open (Section 2, p. 5).

## technique 3: check declarations for consistency and determined factors

what it is and when to use

Conversion needs numerical factors. A declaration set is accepted only if its equations have a satisfying valuation and every same-dimension conversion factor is determined by those equations. This prevents a library from choosing an arbitrary path through contradictory or incomplete declarations.

how to do it

1. Express each factor declaration `u = q v` as a ratio `r = u/v` and positive rational factor `q` (Section 3, p. 7).
2. Compute all rational linear dependencies among the ratio vectors.
3. Require every dependency `Σ ci ri = 0` to satisfy `∏ qi^ci = 1`; this is the paper's consistency criterion (Theorem 3.1, p. 7).
4. Solve the resulting equations by executable Gaussian elimination and back-substitution, storing logarithms symbolically as rational combinations rather than evaluating real logarithms (Section 3, p. 7).
5. Check that every same-dimension pair's ratio lies in the rational span of declared ratios; otherwise reject the unit system as underdetermined (Section 3, pp. 7–8).
6. Extract each determined factor exactly as a positive rational radicand and root degree (Section 3, p. 8).

The paper's example declares `yard = 3 foot`, `foot = 0.3048 meter`, and a mistyped `yard = 0.9 meter`. Since `3 × 0.3048/0.9 = 1.016`, no valuation satisfies all three; replacing 0.9 with 0.9144 makes the equations consistent (Section 3, p. 7). The checker also rejects declarations that are consistent but do not determine every needed factor, such as declaring meter and foot as primary units without a relation (Section 3, p. 7).

Verus form (inference)

Inference: implement declaration equations as ghost vectors and rational factors, then prove Gaussian-elimination or row-reduction lemmas. A Verus API can expose `check_declarations` with a postcondition that accepted declarations imply consistency and factor determinacy. Exact extraction should return a radicand/root representation rather than a floating approximation. The executable conversion can use a trusted numeric backend whose relationship to real arithmetic must be separately specified.

what is trusted

Theorem 3.2 (p. 8) gives consistency and factor determination relative to the supplied declarations. Inference: it does not establish that `0.3048` is the physically correct foot-to-meter factor; the paper takes the declared factors as given. The denotational theorems use real arithmetic and “do not prove that floating-point evaluation equals it” (Section 10, p. 18).

## technique 4: fuel-bounded evaluator with adequacy and erasure

what it is and when to use

ΛS defines a total evaluator parameterized by a natural-number fuel bound. Fuel avoids partial recursive definitions; termination proves that enough fuel exists for every closed well-typed term. An instrumented evaluator carries units and performs dynamic checks, while an erased evaluator carries magnitudes without unit tags.

how to do it

1. Define an evaluator taking a term, environments, conversion function, and fuel; return failure if fuel is exhausted (Section 4, p. 8).
2. Decrease fuel only when entering a closure; subterms receive the parent's fuel (Section 4, p. 8).
3. Perform dynamic checks for addition, comparison, conversion, map application, composition, and dimensionless `log`/`exp`; multiplication, division, and powers compute units directly (Section 4, pp. 8–9).
4. Prove normalization: every closed well-typed term evaluates with some fuel (Section 4, p. 9).
5. Prove unit soundness: a scalar result carries exactly the unit predicted by its static type (Theorem 4.1, p. 9).
6. Prove adequacy: with the conversion factors the valuation determines, the evaluator instantiated with real arithmetic computes the denotation (`evalC_eq_den`, Section 7, p. 14); Theorem 7.1 (p. 14) states that `convert e u v` then evaluates to the denotation of `e` multiplied by exactly the declared `q`, at unit `v`.
7. Prove erasure: the erased evaluator returns the same magnitude as the instrumented evaluator at a sufficient fuel bound (Theorem 7.2, p. 14).

The paper states: “Units can thus be stripped from run-time values, together with every dynamic check, without moving the numbers.” (Section 7, p. 14). Unit and dimension environments remain for polymorphic conversions; array extents also remain (Section 7, pp. 14–15).

Verus form (inference)

Inference: model a bounded interpreter as a Rust function with a fuel argument and prove that successful evaluation preserves a typed result and that fuel increase does not change the result. Use executable Rust for the evaluator and Verus specifications for unit metadata and adequacy lemmas. Proof-only lemmas are erased; do not call a proof function at runtime. Verus cannot by itself justify compiled floating-point equivalence to real arithmetic, so state that as a trusted assumption or prove a suitable finite-precision model.

## technique 5: accumulated conversion drift diagnostic

what it is and when to use

For first-order programs, the diagnostic tracks the net unit ratio by which conversion declarations can affect a result beyond its result type. It returns one of three verdicts: certifies invariance, names a drift ratio, or declines. Use it after typing and declaration checking, to identify whether a declaration-factor error can change an answer.

how to do it

1. Assign each input the trivial ratio.
2. Assign a conversion `convert e u v` the ratio `u/v`.
3. Multiply ratios through products; require equal excess ratios for sums and conditionals; reject or decline terms whose behavior cannot be represented by one ratio (Section 6, p. 13).
4. Treat `log` and `exp` on drifting values as declined and decline unit constants `1u` unconditionally (Section 6, p. 13).
5. Normalize the resulting ratio as a rational exponent vector and decide whether it is 1 (Section 6, p. 13).
6. Report drift-free, a concrete drift, or decline. Theorem 6.1 (p. 13) makes triviality exact for a first-order program over scalars, with nonzero denotation, to which the analysis assigns a ratio.

The paper's worked counterexample is `(x in ft) + y`, where x is a meter input and y a foot input. At both values 1 and both valuations 1, the sum is 2; doubling the meter changes it to 5, so the analysis correctly declines it (Section 6, p. 13). Two meter-to-foot inputs can be summed and receive drift `m/ft`; the same rule is then sound because both summands move together (Section 6, p. 13).

Verus form (inference)

Inference: add a ghost drift type or specification result to a verified computation. Each conversion proof carries a unit ratio; composition multiplies ratios, while a sum requires a proof that branch and summand drifts agree. Return an explicit `Declined` result when no single ratio is sound. This is a new library-level design for Verus, not a built-in construct. Its postcondition can state that drift-free code is independent of conversion-table valuation, subject to the modeled arithmetic.

limitations

The analysis is conservative and not complete: `0 ⋅ (x in ft) + y` is declined even though it denotes y and is invariant (Section 6, p. 13). Contexts containing unknown functions or unit-indexed families use a bounded comparison that is sound but not proved complete (Section 6, p. 13).

## technique 6: abstraction, Pi theorem, and dimensioned linear algebra

The abstraction theorem says every parametric term, including conversions, is invariant under rescalings that factor through dimensions (Theorem 5.2, p. 12). A single conversion of a nonzero value is invariant exactly when source and target receive the same rescaling factor (Theorem 5.3, p. 12). The paper says that “conversion reads the declared magnitudes and costs coherence” (Section 5, p. 12). Inference: the boundary is that convert-free terms keep invariance under every rescaling, while terms with conversion keep it only under dimension-coherent ones.

The Pi theorem then factors a first-order program through dimensionless products. Build the dimension-exponent matrix `A`, put argument dimensions in its columns and result dimensions in vector `b`, and solve `A X = b`. If solvable, then on positive arguments the program is that power product times a function of `n − rank(A)` dimensionless products; otherwise it is zero on every argument. The theorem is for a parametric first-order program in closed unit and dimension scope, which may convert (Theorem 8.1, p. 16). For the pendulum, the paper obtains `T = √(ℓ/g) ⋅ G(θ)` and reads mass independence off the type (Section 8, p. 15).

For dimensioned linear algebra, type a matrix as `Lin u⃗ w⃗`; entry `(j,i)` has unit `w_j/u_i`, so composition is automatically unit-compatible. A 2×2 Jacobi step is typable only on a uniform space, because diagonal subtraction otherwise adds unequal units (Section 9, pp. 17–18). A relative tolerance remains parametric; a fixed tolerance written as a literal times `1u` names a scale and leaves the parametric fragment (Section 9, p. 18).

Verus form (inference)

Inference: encode dimension matrices and nullspace calculations as ghost proofs, and attach dimension-indexed wrappers to vectors and matrices. Verify linear-algebra kernels with contracts that state entry units and output dimensions. Use relative tolerances or input-supplied absolute tolerances when scale invariance is required. A full Pi theorem and polymorphic conversion semantics would require substantial Verus library work; the paper's Lean proofs are not directly portable.

## mechanization, evidence, and trusted base

The Lean artifact has 10,900 lines of definitions and proofs and 6,300 lines of documentation, with no admitted proofs and no axioms beyond the three of Lean's standard library (Section 10, p. 18). Mechanization caught a variable-capture bug in substitution that every test missed; it was exposed when the composition law of substitutions was proved (Section 10, p. 18). Inference: this is evidence for proof-based testing of metatheory, not evidence that every compiled numeric result is exact.

The paper explicitly separates trusted layers: a theorem reader trusts Lean's kernel and three axioms; executed `#guard` checks additionally trust Lean's compiler; a reader who believes the number the compiled binary prints trusts, in addition, Lean's code generator, the Float carrier, and three C functions behind a BLAS-shaped interface (Section 10, p. 18). The denotational theorems use real arithmetic and do not prove floating-point equivalence (Section 10, pp. 18–19). Inference: for VL, the same separation should appear in reports: Verus proof soundness and specifications, external libraries, compiler and erasure, floating-point behavior, hardware, and the physical meaning of unit declarations remain distinct assumptions.

## product threat and prior work VL should not redo

Inference: the product threat is a generated API or numerical kernel that typechecks while conversion factors are inconsistent, underdetermined, or silently scale an answer. A Verus proof of a wrong conversion table can pass; the table checker and drift diagnostic address that missing property. Inference: the paper already provides a design for exponent-vector units, declaration consistency, exact factor extraction, drift diagnostics, adequacy/erasure, and dimensioned matrix typing. Inference: VL should not present those mechanisms as new without a concrete Rust/Verus implementation and measurements. The paper does not evaluate Verus, Rust, agent-written code, or product-scale maintenance; Inference: those are open integration questions.

## techniques for the catalog

- rational unit vectors: encode units and dimensions as exact rational exponent vectors
- typed conversion: require equal dimensions for explicit conversion and equal units for addition/comparison
- declaration checker: reject inconsistent or underdetermined conversion equations and extract exact factors
- fuel evaluator: prove termination and unit soundness with a bounded interpreter
- adequacy and erasure: connect instrumented unit semantics to magnitudes and executable evaluation
- drift diagnostic: compute accumulated conversion ratios and certify invariance, report drift, or decline
- coherent abstraction: preserve rescaling invariance for parametric terms under dimension-coherent scaling
- Pi factorization: derive dimensionless products and output power products by rational linear algebra
- dimensioned linear algebra: type vectors and matrices so entry units are determined by domain and codomain spaces
- mechanized metatheory: use Lean proofs of checker, evaluator, invariance, and erasure properties to expose bugs missed by tests
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The ratio records how a value moves under a rescaling beyond the factor its type predicts."): read the whole paper text (pages 1-24) and the whole study; checked the quotations, theorem numbers, section and page references, the declaration example and the drift example against the text; changed the abstract quotation (removed a comma), the derivation quotation (lower-case start, page 5 not 6), several page references (Section 2 unification p. 5, Section 3 incomplete-system example p. 7, Section 6 bounded comparison p. 13, Section 8 pendulum p. 15, Section 10 pp. 18-19), the adequacy step (adequacy is evalC_eq_den, Theorem 7.1 is the declared-factor theorem), the Pi theorem scope (positive arguments, closed scope), the Theorem 6.1 scope, the checker-soundness wording, and marked the unsupported conclusions as Inference; did not check the Lean artifact, the cited references, the PDF figures beyond the text layer, or any Verus-form advice (all marked Inference).
