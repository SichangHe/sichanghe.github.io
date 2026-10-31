# Progress in Formalizing Sphere Packing in Dimension 8
(authored by agents unless marked 🧑)
Tag: `hariharan2026progress`, [paper](http://arxiv.org/abs/2604.23468v3)

## result and boundary
The project formalizes Viazovska’s dimension-8 sphere-packing result in Lean. The human-written blueprint and infrastructure were extended by the Gauss autoformalization model. The paper reports a sorry-free Lean development, but the exact correspondence of the generated proof to the intended mathematical path remains under investigation. It says: “The work done so far by both human formalizers and the autoformalization model ‘Gauss’ has together led to a complete, correct proof that the optimal sphere packing in R8 is the E8 lattice packing.” (Introduction, p. 2). The paper’s footnote 8 on “correct” reads “in the sense of being formally verified by the Lean kernel”.

## technique 1: specification-first mathematical infrastructure
What it is: define domain structures and the main theorem before proving analytic details, so later proofs use stable APIs.

When to use it: use this for a large formalization whose theorem depends on geometry, measure, topology, analysis, and algebra.

Steps from the paper:
1. Define `SpherePacking d` with centers, a real separation, positivity of separation, and pairwise distance separation (Section 2.1, p. 2).
2. Define balls as the union of metric balls of radius separation/2 and define finite density by volume ratio, then density as a limsup (Section 2.1, pp. 2–3).
3. Extend to `PeriodicSpherePacking` with an integer submodule lattice, lattice action, discrete topology, and `IsZLattice` instance (p. 3).
4. Define the sphere-packing constant as the indexed supremum over all packings and define `E8Packing` with the E8 lattice and separation √2 (p. 3).
5. State `SpherePacking.MainTheorem : SpherePackingConstant 8 = E8Packing.density` before filling the proof (p. 3).
6. State the Cohn–Elkies linear-programming bound and the required properties (nonzero, nonpositive outside the unit ball, nonnegative Fourier transform), then reduce the target to Viazovska’s magic function (p. 4).

Verus form: Inference: represent executable geometry or packing data as Rust structs with ghost/spec fields; use `requires` for positive separation and `ensures` for distance and density relations. Mathematical sets, volumes, limsup, and Fourier transforms would generally be `spec fn` values and `proof fn` lemmas rather than executable code. The paper’s Lean structures and typeclass instances do not transfer directly to Verus syntax.

Evidence and limits: the main theorem is kernel-checked in Lean, but the paper does not provide a proof-size denominator for the human baseline beyond later line counts. The specification is an assumption boundary: a formally proved equality concerns the Lean definitions actually chosen.

## technique 2: choose formal-friendly contours and prove deformation lemmas
What it is: adapt definitions to existing library theorems when informal mathematics leaves implementation choices open.

When to use it: use it when a proof depends on integration or topology that the target library supports only for restricted shapes.

Steps from the paper:
1. Replace unspecified contours in the magic-function integrals with six rectangular parametrizations, because mathlib has Cauchy–Goursat for rectangular contours (Section 2.2, p. 5).
2. Define `a` and `b` as sums of integrals along those contours (p. 5).
3. Prove unbounded rectangular Cauchy–Goursat and use it (PR #229) to derive an alternate expression for `a`, valid for ‖x‖ ≥ √2 (Eq. 1, p. 5).
4. Replacing ϕ0 with ψS in Eq. 1 gives the analogous expression for `b`; the paper says that when analytically continued to all x these representations give g as a certain Laplace transform (p. 5).
5. A direct computation gives (CE1); (CE2) and (CE3) are reduced, using that the Fourier transform of `a` is `a` and that of `b` is −`b`, to the two inequalities on the positive imaginary axis (Eq. 2, p. 5; the informal and formal machinery for this was largely developed by Lee based on [10]).
6. The eigenfunction identities need Cauchy–Goursat for contours of the shape in Figure 2, which touch the real line where the quasimodular integrands are undefined; the paper says the integrands vanish there because the real line is approached vertically. Before the autoformalization this was not formalized; the Gauss formalization (Section 3) proves such contours can be deformed (p. 5).

Verus form: Inference: encode a chosen contour representation as a specification and prove algebraic/analytic lemmas over ghost mathematical values. Verus is not an analysis library and cannot directly reuse Lean’s contour or Cauchy–Goursat theorems; this part would require an external verified math library or trusted axioms, which must be named.

Evidence and limits: the paper says the rectangular choice was forced by missing contour machinery, so it is a library-driven engineering choice. The Gauss contour-deformation proofs appear in PR #341 (PermI12ContourMain.lean, PermJ12ContourDeformation.lean, Section 3, p. 7); the authors say they would like to generalize the argument to a broader class of contours (p. 5).

## technique 3: modular-form API and restricted-domain wrappers
What it is: build missing modular-form definitions and expose difficult expressions through domain-specific helper functions.

When to use it: use it when a large proof repeatedly needs identities and inequalities over a restricted domain.

Steps from the paper:
1. Construct E2 and the discriminant form Δ and prove level-one dimension formulas; use them for identities such as Δ=(E4³−E6²)/1728 (Section 2.3, p. 6).
2. Define normalized and Serre derivatives and prove Ramanujan identities for Eisenstein and Jacobi theta functions (p. 6).
3. Define `ResToImagAxis F` by returning F(it) for positive t and zero otherwise (p. 6).
4. Prove realness, positivity, and derivative interaction for this wrapper, (p. 6). The paper says the two inequalities (2) “will be proved in PR #331 as FG_inequality_1 and FG_inequality_2” (p. 6), so they were not yet proved when the paper was written.

Verus form: Inference: a Verus port should isolate reusable mathematical operations in `spec fn`s and prove domain lemmas as `proof fn`s. The wrapper’s explicit behavior outside the positive axis is a useful specification pattern. Verus’s allowed Rust subset and solver support do not provide complex analysis primitives automatically.

## technique 4: metaprogramming for recurring computation
What it is: create tactics that normalize complex expressions and discharge continuity limits from known atomic limits.

When to use it: use a tactic when the same syntactic proof transformation appears across many goals.

Steps from the paper:
1. `norm_numI` recursively splits complex expressions into real and imaginary parts, calls `norm_num` on each, and recombines them as a+bi (Section 2.4, p. 6).
2. `tendsto_cont` uses the continuity of the projection maps from a product of topological spaces to prove goals `Tendsto (fun z => expr(f1 z, ..., fn z)) l (nhds c)`, where the atomic limits are known from context and `expr` is continuous in the atoms (proved via `fun_prop`) (Section 2.4, pp. 6–7).
3. The paper uses `tendsto_cont` to simplify the proof of the limit of quasimodular forms that are polynomials in E2, E4, E6, θ10^4, θ01^4 (p. 7). It does not say where `norm_numI` is applied.

Verus form: Inference: use reusable proof lemmas and controlled solver facts rather than inventing a Verus tactic; automation should preserve a final independently checked proof. A Rust macro or external tactic would be trusted only as proof search, not as evidence without Verus checking.

## technique 5: model-assisted completion followed by refactoring
What it is: provide an existing blueprint, definitions, and detailed proof strategy to an autoformalizer, then clean the generated code.

When to use it: use it after foundational APIs and theorem statements exist. Inference: asking the model to invent the entire mathematical architecture is untested by this paper, which only reports Gauss working from an existing blueprint and Lean development.

Steps from the paper:
1. Give Gauss the existing blueprint and Lean development (Section 3, p. 7).
2. Gauss produced a sorry-free formalization of the main theorem, including the dimension-8 contour-deformation identities and the finite-dimensionality theory for modular forms on finite-index subgroups (the latter not strictly required for the theorem) (p. 7).
3. A compression and refactoring pass cut the development from 80 000 to 60 000 lines; the authors are continuing to clean the Gauss code to mathlib standards, paying attention to overly long proofs and reproved mathlib results (p. 7).
4. Review whether generated proofs follow the intended argument; the paper says exact correspondence is still investigated (Section 4, p. 8).

Verus form:

Evidence and limits: Gauss completed the main theorem in five days, expanding about 20,000 lines to 80,000, then refactoring to 60,000 (Section 3, p. 7). The paper says: “Interestingly, it was easier to generate the proof than to clean up and golf the code from 80k lines to 60k.” (Section 3, p. 7). It also reports many tiny auxiliary definitions, repeated local patterns, very long proofs, and trivial or duplicate lemmas (p. 7). Inference: the final artifact is therefore evidence of kernel-checked completion, not evidence that generated code is maintainable by default.

## techniques for the catalog
- specification-first structures — define domain objects, invariants, and the main theorem before filling analytic proofs
- library-compatible reformulation — choose contours or representations that match existing target-library lemmas
- restricted-domain wrapper — expose hard mathematics through helper functions with explicit behavior outside the intended domain
- proof metaprogramming — automate recurring normalization and continuity transformations while retaining kernel checking
- generate then refactor — let an agent complete a detailed blueprint, then compile, audit correspondence, and remove duplication
