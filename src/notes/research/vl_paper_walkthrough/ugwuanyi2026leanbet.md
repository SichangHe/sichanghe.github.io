# LeanBET: Formally-verified surface area calculations in Lean
(authored by agents unless marked 🧑)
Tag: `ugwuanyi2026leanbet`, [paper](https://arxiv.org/abs/2605.16169)

## what is verified

LeanBET is an executable Lean 4 implementation of BETSI-style gas-adsorption surface-area analysis. It enumerates contiguous fitting windows, applies the BET linearization, computes least-squares regression, checks Rouquerol admissibility conditions, and chooses one result with a knee rule. The same polymorphic algorithm runs over IEEE-754 `Float` for computation and is specified/proved over `Real`. The formal results cover the BET algebraic derivation, window soundness and completeness, regression least-squares optimality, admissibility-check soundness, parameter extraction and final selection. The abstract says, “We evaluate the implementation against the BETSI reference method on benchmark adsorption isotherms.” (p. 1). The benchmark has 19 isotherms: 18 agree to machine precision and UiO-66 differs by about 0.36 m²/g (0.03%).

Inference: the proofs establish that accepted outputs satisfy the formalized BETSI specification; they do not prove that BET's physical assumptions fit a material or that the floating-point run is identical to exact-real execution at every threshold. The authors explicitly say the UiO-66 cause remains unknown and that tests were needed to catch implementation variants that still satisfied theorems.

## technique: derive the BET equation as a specification

What it is: formalize the multilayer adsorption model, its convergence condition, the nonlinear BET isotherm, and the linearized expression used by regression. The model defines first-layer and multilayer rates, the BET constant, geometric layer occupancy, total area and total volume. The condition `0 < x < 1` makes the infinite sums converge.

When to use it: use derivation-as-specification when an algorithm implements a scientific formula whose paper derivation could otherwise drift from code. The derived expression supplies the exact semantic target for the executable transformation.

How to do it: (1) define the layer rates and occupancy; (2) state convergence; (3) simplify the sums to closed forms; (4) derive the nonlinear isotherm; (5) algebraically rearrange to `p/[n(1-p)] = ((C-1)/(nm C))p + 1/(nm C)`; (6) prove that the executable linearization computes this quantity when its denominator is nonzero.

Verus form: Inference: encode the formula and its assumptions as `spec fn`s over rational or real-like ghost values; prove algebraic lemmas with `proof fn` and `assert`. A Rust implementation can calculate the transformed pair and use `requires n*(1-p) != 0` and `ensures` to relate it to the specification. Verus does not provide Lean's infinite-series library, so convergence lemmas would need to be supplied.

Evidence and limits: Section 5.3 states Theorem A.1 (the isotherm follows from the layer model) and Theorem A.2 (linearization is algebraically correct), pp. 12--13. BET itself assumes uniform sites, non-interacting higher layers and constant higher-layer enthalpy (Section 1, p. 2); these physical assumptions remain outside the software proof.

## technique: polymorphic executable/proof implementation

The paper describes the design goal directly: “A key advantage of Lean for scientific computing applications is that executable code and mathematical specifications can be expressed side by side.” (Section 3.1, p. 6)

What it is: write the BETSI algorithm once over a `BETLike α` typeclass, instantiate `α=Float` for execution and `α=Real` for proofs. This separates numerical performance from proof-friendly exact arithmetic without maintaining two algorithms.

How to do it: (1) define arithmetic, order and zero operations in `BETLike`; (2) make points, fits and results parameterized by `α`; (3) run finite-list functions with `Float`; (4) specialize the same functions to `Real`; (5) prove theorems for the real instance and use numerical tests for the float instance. The paper's `Point α` stores relative pressure and uptake; `BETFit α` stores slope, intercept, `rSquared`, `nm`, `c`, range and point count.

Verus form: Inference: use a trait only for the narrow arithmetic protocol required by the algorithm, with a specification model mapping concrete numbers to mathematical values. Prove the algorithm over an exact ghost type and separately establish conversion bounds for the executable type. Verus's supported Rust subset may make a single generic implementation harder than Lean's typeclass approach.

Evidence and limits: Section 3.2 says real numbers are noncomputable in Lean while floats execute, and that correctness is proved over reals and execution performed over floats (Section 3.2, p. 6). The authors later report that polymorphic development was difficult and do not recommend starting a new project with it (Section 6, p. 17). Inference: this is a practical engineering trade-off, not evidence that floating-point results inherit exact-real proofs automatically.

## technique: exhaustive fitting-window enumeration

The implementation's contract is explicit: “The implementation enumerates every contiguous window containing at least two points and records its start index, end index, and associated sublist of data.” (Section 4.3, p. 9)

What it is: enumerate every contiguous sublist with at least two data points, recording start and end indices. This defines the complete candidate search space rather than relying on a user's selected pressure range.

How to do it: (1) choose every `i,j` with `0 <= i < j < N`; (2) slice the isotherm `I[i:j+1]`; (3) store the boundaries and data; (4) transform and regress each window; (5) pass each result to admissibility checks. The proof has two directions: every returned triple is valid, and every valid index pair appears.

Verus form: Inference: implement nested finite-index iteration with explicit bounds and a loop `invariant` stating that generated windows are valid and that all earlier index pairs have been emitted. Prove the slice correspondence with `ensures`; use a ghost set of emitted pairs to prove completeness.

Evidence and limits: Theorem A.3 states that enumeration produces exactly the valid contiguous fitting windows (Section 5.4, pp. 13--14). The paper contrasts this completeness proof with a Python filter that can enforce soundness but cannot assert that no window was missed. Inference: exhaustive enumeration is quadratic in the number of points and can dominate runtime for long isotherms.

## technique: executable BET linearization and regression

What it is: map each point `(p,n)` to `(p, p/[n(1-p)])` when the denominator is nonzero, then compute ordinary least-squares slope, intercept and `R²`. The function returns `none` for fewer than two points or zero x-variance.

How to do it: (1) reject undefined denominators; (2) compute sample means; (3) compute covariance and x variance; (4) reject zero variance; (5) compute `m=cov/variance` and `b=ȳ-m x̄`; (6) compute fitted values, total and residual sums of squares, and `R²`; (7) derive `nm=1/(b+m)` and `C=1+m/b`.

Verus form: Inference: represent the data as a finite `Seq` and specify sums with recursive `spec fn`s. A verified function can return an option-like result and use `ensures` for the coefficient equations. Prove the least-squares inequality against arbitrary `(m',b')` with algebraic lemmas; do not use floating-point equality as the proof relation.

Evidence and limits: Theorem A.4 says a successful regression returns a least-squares minimizer (Section 5.5, pp. 14--15); Theorem A.5 connects extracted BET parameters to that certified line. The theorem assumes positive x variance. Inference: near-zero denominators and finite-precision comparisons require explicit runtime policy beyond the real-number theorem.

## technique: Rouquerol admissibility checks

What it is: retain a candidate only when all physical and statistical criteria hold: nondecreasing `n(1-p)`, positive `C` and `nm`, monolayer pressure inside the fitting window, agreement with the analytically predicted monolayer pressure within 20%, and minimum-data/fit constraints used by BETSI.

How to do it: (1) compute the derived sequences; (2) scan for monotonicity; (3) check positivity and data-count conditions; (4) compute monolayer pressure and verify it lies in the window; (5) compare predicted and read pressures using the 20% tolerance; (6) retain only candidates for which every Boolean check succeeds.

Verus form: Inference: define each criterion as a pure `spec fn`; implement executable checks returning booleans and prove `check == true` implies the corresponding proposition. Use sequence-index bounds and loop invariants for monotonicity scans. State tolerances explicitly in `requires`/`ensures` and distinguish exact rational checks from float approximations.

Evidence and limits: Theorem A.6 states that successful checks imply nondecreasing sequences, positive fitted parameters and the monolayer consistency conditions (Section 5.6, p. 15). The 20% tolerance is Rouquerol criterion (iv) in Section 2.2 (pp. 4--5). The authors note that a float comparison near a threshold can differ from real arithmetic (Section 5.2, pp. 11--12). Inference: the theorem guarantees accepted results, not that rejected borderline results are physically impossible.

## technique: knee-based final selection

What it is: resolve multiple admissible windows deterministically. First keep candidates whose end index is maximal; then choose the smallest percentage error among that subset.

How to do it: (1) traverse admissible results to find the largest end index; (2) filter to that index; (3) fold over the filtered list to select minimum error; (4) return the selected fit and its window. Theorem A.7 proves membership, maximal end index and minimal error among ties.

Verus form: Inference: write a pure fold over a sequence of candidate records and maintain an `invariant` that the accumulator is an admissible candidate with maximal end index among processed records and minimal error among ties. Use `ensures` to expose all three selection properties.

Evidence and limits: Sections 4.6 and 5.6 describe the two-stage list traversal and prove its soundness (Section 4.6, p. 10; Section 5.6, pp. 15--16). Inference: this removes user choice but encodes BETSI's policy; a different scientific policy would require a different specification and proof.

## evidence and trust boundary

LeanBET's formal evidence consists of Theorems A.1--A.7 and the Lean 4/Mathlib build (Lean 4.27.0, Mathlib v4.27.0-rc1). The external benchmark compares 19 isotherms: 18/19 agree to machine precision; UiO-66 differs by 0.03%. The denominator and setting are explicit in Section 6 (p. 16). The authors also report that an earlier linear-interpolation implementation satisfied the specifications yet selected different windows from BETSI's PCHIP interpolation; benchmark tests exposed that mismatch (Section 6, p. 17).

Inference: trusted components include Lean's kernel, Mathlib, the float implementation and its IEEE-754 semantics, the physical BET assumptions, input measurements, and the reference comparison. The proofs do not certify the reference Python code or experimental noise. Inference: threat to agent-written verified Rust is moderate for numerical scientific workflows: contracts can establish algorithmic meaning and edge conditions, but domain assumptions and float/real correspondence remain review obligations. Inference: VL should reuse the paper's pattern of executable checks paired with specification theorems and benchmark comparisons; it should not claim that theorem proving alone selects the scientifically correct model.

## techniques for the catalog

- derivation as specification — prove the scientific equation and connect its algebraic form directly to executable code
- polymorphic numeric design — run one algorithm over executable floats while proving its specification over exact reals
- complete window enumeration — generate every contiguous fitting range and prove soundness and completeness
- certified least-squares regression — prove returned coefficients minimize residual error under nonzero variance
- admissibility checks — turn monotonicity, positivity and tolerance criteria into executable booleans with implication proofs
- knee selection — choose maximal-end-index candidates and minimal error with a proved deterministic fold
- benchmark validation — compare formal outputs with a reference implementation and use discrepancies to catch underspecified variants
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The main correctness goal is soundness: whenever one of these checks succeeds and the algorithm returns a result, the corresponding mathematical specification is satisfied."): read the whole paper text and the study; checked the three quotations, the 19-isotherm, 18-agree, UiO-66 0.36 m²/g and 0.03% figures, Lean 4.27.0 and Mathlib v4.27.0-rc1, theorem numbers A.1--A.7, the enumeration, regression, admissibility and knee-selection descriptions, and the tag and arXiv link (2605.16169, matches the paper header); changed section and page references (the page number is printed at the top of each PDF page; fixed the pages for Sections 1, 3.2, 5.3, 5.4, 5.5, 5.6, 4.6 and 6), reworded the Real-instantiation step to the paper's "specialize", added the Section 2.2 pointer for the 20% tolerance and an Inference: label on the final VL recommendation; did not check the Lean repository or proofs, the cited references, or the Verus-form suggestions (the study's own inference).
