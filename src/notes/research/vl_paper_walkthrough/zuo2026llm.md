# From LLM-Generated Conjectures to Lean Formalizations: Automated Polynomial Inequality Proving via Sum-of-Squares Certificates
(authored by agents unless marked 🧑)
Tag: `zuo2026llm`, [paper](https://doi.org/10.1016/j.jsc.2011.08.002)

## scope and result
The paper proposes Neuro-Symbolic SOS-based Polynomial Inequality Proving (NSPI), a pipeline that turns a polynomial into an LLM-generated sum-of-squares (SOS) structure, repairs it exactly with symbolic computation, and emits a Lean proof. The target is unconstrained nonnegativity, (f(x)\ge0) for all real vectors. The paper states: “we propose a new neuro-symbolic framework for polynomial inequality proving” (Introduction, p.2) and reports 522 benchmark problems (Introduction, p.2). The proof obligation is an exact certificate, not a floating-point claim.

## technique: SOS as a constructive certificate
What it is: represent (f(x)) as ∑ᵢ fᵢ(x)². The paper says: “It is immediate f (x) being SOS implies that is nonnegative over Rn” (Preliminaries, p.2). It also requires even degree and uses a monomial vector (v_d); equivalently (f=v^T Gv) for a positive-semidefinite Gram matrix.

When to use it: use for unconstrained polynomial nonnegativity when an SOS decomposition exists. A polynomial may be nonnegative without being SOS, so this certificate is sufficient rather than complete (the paper explicitly calls it “a widely-used sufficient certificate”, Preliminaries, p.2).

Steps from the paper:
1. choose monomials through degree d and form (v_d) (Section 3, p.2)
2. seek a PSD Gram matrix satisfying coefficient equalities (f=v^TGv) (Section 3, p.3)
3. factor G or list square terms (Appendix A, pp.12–13)
4. check each square is nonnegative and equality reconstructs f (Section 4.3, p.5)

Verus form: Inference: encode a fixed polynomial as executable/specification data and prove `f(x) == sum squares` with a `proof fn`; use `requires` for real-number domain assumptions and `ensures` for the equality and nonnegativity theorem. Keep the SOS identity as a lemma, then prove each square is nonnegative. Verus has no built-in Lean tactic or real-algebraic solver, so generated coefficients must be checked by explicit arithmetic lemmas or an external trusted certificate parser.

Evidence and limits: Appendix A Example 1 gives a quartic with two explicit squares and concludes nonnegativity (p.12). The certificate does not cover non-SOS polynomials; the paper’s experiments therefore measure solved benchmark instances, not all inequalities.

## technique: training SOS conjectures
What it is: construct polynomial–SOS pairs, train an LLM to output SOS structures, and rank candidates by error. The architecture caption says the LLM “is trained on the constructed data to function as an SOS structure conjecturer” (Figure 1, p.3).

Steps:
1. synthesize PSD Gram matrices by computation-driven spectral shifting, factor construction, or LMI optimization (Section 4.1.1, pp.4–5)
2. synthesize structure-driven matrices with controlled sparsity/coefficient patterns (Section 4.1.1, pp.4–5)
3. cold-start with supervised fine-tuning, then curriculum reinforcement learning (Section 4.1.2, p.5)
4. generate several SOS structures and rank them by coefficient-reconstruction error (Figure 1, p.3)

Verus form: Inference: use the model only to propose coefficients; parse its output into a typed vector/matrix and prove a postcondition that the exact checker accepts. Do not trust the model’s PSD assertion. A failed `ensures` obligation rejects the candidate.

Evidence: Table 1 reports NSPI pass rates on PolyIneqBench by variable count: 44.1% (n=3), 40.3% (n=4), 36.7% (n=5), 29.5% (n=6), 26.7% (n=7), 21.7% (n=8), 15.0% (n=9), and 11.7% (n=10), each “within 1 hour” (Table 1 caption, p.6). These denominators are the benchmark subsets for each n; the table gives percentages, not counts. The decline with dimension is an observed limitation.

## technique: symbolic correction and rational recovery
What it is: refine a floating Gram matrix to satisfy coefficient equations exactly, then recover rational coefficients. The paper describes “Newton-style numerical refinement and rational recovery” (Section 4.2, p.5).

Steps:
1. initialize G from the LLM structure (Section 4.2, p.5)
2. apply Newton iteration to reduce coefficient residual (Section 4.2, p.5)
3. adjust coefficients by minimizing θ = ||f̂ - vᵀGv|| (Equation 12, p.5)
4. recover rational values and verify exact equality (Section 4.2, p.5; Appendix C)

Verus form: Inference: run Newton and rational recovery outside verification, then pass only rational integers/fractions to a Verus proof. State `ensures` that expansion equals the target polynomial; prove PSD by exhibiting a factorization (G=L^TDL), avoiding a floating-point PSD premise.

Evidence: the paper’s exact-certificate requirement and Lean checking are the evidence; numerical refinement itself is not trusted until the exact identity passes. Failure modes are ill-conditioned numerical starts, unsuccessful rational recovery, and candidates that are non-PSD after rounding (Section 4.2, pp.5–6).

## technique: Lean proof template
What it is: instantiate a fixed Lean theorem template with the target polynomial and exact SOS list. The paper says the module “generates a complete Lean proof” (Section 4.3, p.5).

Steps:
1. fill theorem parameters and polynomial equality hypothesis (Appendix E.1, pp.14–15)
2. encode exact square terms as a list (Appendix E.1, p.15)
3. discharge equality between the polynomial and SOS expansion (Section 4.3, p.5)
4. discharge nonnegativity of each square and close the theorem (Section 4.3, p.5)

Verus form: Inference: use a Rust function with `ensures` for `result >= 0`, a separate `proof fn` for expansion equality, and arithmetic lemmas for square nonnegativity. Proof functions are erased and never called at runtime; executable evaluation should remain separate from the proof.

Trusted and measured: Lean’s kernel checks the generated proof; the LLM, Newton arithmetic, rational recovery, and benchmark harness remain outside that kernel until their outputs are rechecked. The paper does not report proof-kernel bugs or a complete accounting of trusted preprocessing.

## implications for VL
Inference: NSPI’s separation of heuristic generation from exact checking matches VL’s agent workflow: let an agent search for a certificate, but make Verus prove the final algebraic contract. The main threat is certificate complexity and dimension-driven failure, not unsoundness when the exact checker rejects bad candidates. Existing work already covers SOS/Lean pipelines; VL should reuse the certificate pattern rather than redo an LLM conjecturer unless it needs Rust-specific arithmetic.

## techniques for the catalog
- SOS certificate: prove polynomial nonnegativity by an exact sum of polynomial squares
- neural SOS conjecture: train an LLM to propose and rank Gram-matrix structures
- symbolic correction: refine numerical candidates and recover exact rational coefficients
- template formalization: instantiate a fixed Lean proof template and let the kernel check equality and nonnegativity
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
