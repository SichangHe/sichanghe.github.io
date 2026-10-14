# Satisfiability Modulo Transcendental Functions via Incremental Linearization
(authored by agents unless marked 🧑)
Tag: `cimatti2018satisfiability`, [paper](http://arxiv.org/abs/1801.08723v1)

## result and setting

Cimatti et al. decide quantifier-free satisfiability over real arithmetic with exponential and trigonometric functions by abstraction and refinement. The abstract space is SMT(UFLRA): linear rational arithmetic plus uninterpreted functions. The abstract model is incrementally constrained with rational piecewise-linear bounds. The abstract says: “The transcendental functions are represented as uninterpreted in the abstract space, which is described in terms of the combined theory of linear arithmetic on the rationals with uninterpreted functions, and are incrementally axiomatized by means of upper- and lower-bounding piecewise-linear functions.”

The target theory is undecidable in general and rational arguments can have irrational function values (Sec. 1, PDF p. 2). Their implementation extends MathSAT through PySMT and uses GMP infinite-precision rationals (Sec. 6, PDF p. 11). The paper's concrete supported functions are exp and sin; log, cos, tan, arcsin, arccos, and arctan are handled by rewriting rather than native refinement (Sec. 4, PDF p. 6).

Inference: this is a solver-level technique rather than a Rust program proof. For Verus, it suggests a sound abstraction interface for nonlinear or transcendental specifications: represent difficult functions abstractly, add certified bounds on demand, and preserve a proof obligation that every abstraction contains the concrete behavior. Verus's normal arithmetic automation does not automatically provide this solver architecture.

## technique 1: abstraction-refinement loop over uninterpreted functions

Use this when a formula contains transcendental terms but the backend decides only linear arithmetic with uninterpreted functions. First flatten every non-variable function argument by introducing a fresh variable and equality. Replace each `tf(x)` with an uninterpreted `ftf(x)` and add simple initial axioms. The result is a safe SMT(UFLRA) approximation `φ̂` (Sec. 3, PDF p. 4).

Run the loop in Figure 1:

1. initialize `φ̂`, empty axiom set `Γ`, and a precision value (Fig. 1, PDF p. 4)
2. call `SMT-UFLRA-check(φ̂ ∧ Γ)` and obtain either unsat or model `μ̂` (Fig. 1, PDF p. 4)
3. return false when the abstract formula is unsatisfiable (Fig. 1, PDF p. 4)
4. run `check-refine(φ, μ̂, precision)`; return true if it proves that every compatible interpretation has a concrete solution (Fig. 1, PDF p. 4)
5. otherwise increase precision as needed, add ordinary and extra refinement lemmas, and repeat (Fig. 1, PDF p. 4)
6. abort when a resource budget is exhausted (Fig. 1, PDF p. 4)

The abstract loop can conclude satisfiability without constructing a concrete irrational model. The paper calls this a sufficient criterion based on all interpretations consistent with rational interval bounds (Sec. 1, PDF p. 2). Inference: for a Verus specification, the corresponding soundness condition is that an abstract model implies existence of a concrete value; a mere solver SAT result is insufficient unless that lifting lemma is proved.

## technique 2: Taylor bounds and tangent/secant refinement

`poly-approx(tf(x), c, ε)` computes lower and upper polynomials around model point `c`. Expand the Maclaurin series and a Taylor remainder until the difference at `c` is at most `ε`; for exp and sin, derivatives at zero are exact, so coefficients are rationally computed (Sec. 4, PDF p. 6). Taylor's theorem supplies `Pl(x) ≤ tf(x) ≤ Pu(x)`.

For each function application, `check-refine` evaluates the model argument `c = μ̂[x]` and model function value `v = μ̂[ftf(x)]`, computes `Pl` and `Pu`, and checks whether `v` lies outside the sound envelope (Fig. 2, PDF p. 5). If so, `get-lemmas-point` chooses a tangent or secant refinement according to concavity. Tangent refinement linearizes `Pl` or `Pu` at `c`, computes a validity interval `[l,u]`, and adds an implication restricting `ftf(x)` to the tangent bound on that interval (Fig. 3, PDF p. 5). Secant refinement retrieves neighboring stored points, builds secants on `[l,c]` and `[c,u]`, stores `c`, and adds two interval implications (Fig. 3, PDF p. 5).

The method relies on concavity to orient the bound. For exp, concavity is positive, so tangents are lower bounds and secants upper bounds; the implementation's tangent interval is unbounded because exp has no inflection points (Sec. 4, PDF p. 7). Initial exp axioms include positivity, the value/order relation at zero, and the tangent inequality `exp(x) > x + 1` away from zero (Sec. 4, PDF p. 7).

Inference: a Verus encoding would require a separately proved rational approximation library and explicit interval lemmas. A `spec fn` can state `lower(x) <= exp(x) <= upper(x)` on a domain, and `proof fn`s can derive contradictions from those bounds. The paper's irrational-number handling and transcendental derivatives must remain in that library or a trusted external certificate.

## technique 3: periodic reduction for sine

Sine's concavity depends on the sign of the argument within `[-π,π]`, but π is irrational. Introduce a symbolic `π̂` with rational bounds `lπ < π̂ < uπ`; map each sine term to a fresh base-period variable `yx` constrained to `[-π̂,π̂]`, equal to `x` when `x` is already in that interval, and satisfying `sin(x)=sin(yx)` (Sec. 4, PDF pp. 7–8).

Apply tangent/secant refinement only to base-period terms. If the model's π precision is too weak to determine the concavity region, refine π̂ instead of adding a potentially unsound tangent. For extended-period terms, compute an integer shift `s`, compare the shifted model value with the base variable, and add the linear shift implication `x` lies in the selected period → `yx = x − 2sπ̂` (Sec. 4, PDF p. 8). Even if the approximate shift is wrong, the paper says the generated lemma can be useless but never wrong. Reuse base-period bounds rather than refining every extended argument.

Add monotonicity lemmas when the model violates sine's known increasing/decreasing intervals. Initial sine axioms include `−1 ≤ sin(z) ≤ 1`, symmetry, phase/sign constraints, tangent bounds at zero and π, and exact values at selected multiples of π̂ (Sec. 4, PDF pp. 8–9).

Inference: periodic reduction is a reusable pattern for Verus specs involving bounded periodic functions: normalize into a canonical interval, prove a shift relation, and reason only in the canonical domain. The required π bounds and trigonometric inequalities are not built into Verus and must be supplied as trusted or separately verified lemmas.

## technique 4: numerical safeguards and satisfiability lifting

The implementation uses infinite-precision rationals, but Taylor powers can create huge numerators and denominators. It approximates model rationals with continued fractions when they become too large, trading precision for solver speed (Sec. 4, PDF p. 9). This safeguard changes the refinement point, not the soundness of the generated interval lemma.

The abstract solver can return unsat, a concrete SAT conclusion from the universal interval criterion, or an unresolved model requiring more refinement. The paper reports: “The results show that our solver compares favourably with the other solvers, being able to decide the highest number of benchmarks.” The approach therefore distinguishes definite SAT/UNSAT from unknown and budget exhaustion. Inference: a Verus integration should expose this three-way result and never turn an unresolved approximation into a verified postcondition.

## evidence, denominator, and limits

Experiments ran on 2.6 GHz Xeon X5650 machines with a 1000-second and 6 GB limit per instance (Sec. 6, PDF p. 11). The benchmark classes were 887 bounded-model-checking instances, 681 mathematical instances, and 944 DReal instances; the DReal set also had a 96-instance exp/sin-only subset after preprocessing (Sec. 6, PDF pp. 11–12). On all 2512 instances in the three reported classes, MathSAT solved 906 and DReal solved 779; the virtual-best combination solved 1353 (Table 2 and conclusion, PDF pp. 12–13). These counts combine different benchmark classes and should not be read as a per-class success percentage.

For scaled BMC (887 instances), MathSAT solved 84 SAT and 556 UNSAT cases; iSAT3 solved 35 SAT, 470 UNSAT, and returned 87 MaybeSAT. For scaled Mathematical (681), MathSAT solved 0 SAT and 215 UNSAT, while iSAT3 solved 0 SAT, 212 UNSAT, and returned 137 MaybeSAT (Table 1, PDF p. 12). On the 96 exp/sin-only DReal subset, MathSAT solved 3 SAT and 39 UNSAT, while DReal solved 17 UNSAT and returned 37 MaybeSAT (Table 2, PDF p. 13). The paper cautions that DReal's reported delta-SAT answers sometimes coincided with a numerical-precision error, so they may be MaybeSAT (Sec. 6, PDF p. 13).

The paper concludes: “The approach is based on an abstraction-refinement loop, where transcendental functions are represented as uninterpreted ones in the abstract space SMT(UFLRA), and are incrementally axiomatized by means of piecewise-linear functions.” Its evidence is solver benchmarks, not end-to-end Rust verification. Trusted components include the soundness of Taylor remainder bounds, concavity calculations, π rational bounds, LP/SMT implementation, preprocessing rewrites, and the model-to-formula encoding.

Inference: the threat to agent-written verified Rust is low unless VL's contracts require transcendental mathematics. If they do, this work offers a design for conservative solver extensions and explicit unknown outcomes. VL should not redo generic Taylor or SMT(UFLRA) engineering; it should reuse the abstraction boundary and focus on certifying the specific mathematical lemmas that product contracts need.

## techniques for the catalog

- uninterpreted-function abstraction loop — replace transcendental terms by UF applications and add sound axioms until the model is eliminated or satisfiability is lifted
- Taylor remainder envelopes — compute rational lower and upper polynomials to a requested precision
- concavity-guided tangent and secant refinement — add local piecewise-linear lemmas oriented by function curvature
- periodic canonicalization — reduce sine arguments to a bounded base period with symbolic π bounds and shift lemmas
- three-way solver outcomes — preserve SAT, UNSAT, UNKNOWN, and budget exhaustion as distinct results
Checked 2026-10-14: audit record cimatti2018satisfiability; paper-study comparison complete; gate executed; experiments not rerun
