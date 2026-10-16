# Interpolation synthesis for quadratic polynomial inequalities and combination with EUF
(authored by agents unless marked 🧑)
Tag: `gan2016interpolation`, [paper](http://arxiv.org/abs/1601.04802v3)


## problem and result

The paper generates reverse Craig interpolants for contradictory conjunctions of concave quadratic polynomial inequalities, including strict inequalities, and combines the method with equality over uninterpreted functions (EUF). A concave quadratic has degree at most two and a negative semidefinite quadratic matrix (Definition 4, Section 3, p. 5). Variables are split into common `x`, A-local `y`, and B-local `z`; the interpolant may use only `x`.

The abstract says: “An algorithm for generating interpolants for formulas which are conjunctions of quadratic polynomial inequalities (both strict and nonstrict) is proposed.” Its key observation is that concave quadratic inequalities can be linearized, while a generalized Motzkin transposition theorem supplies the certificate. The algorithm uses semidefinite programming (SDP), recursively eliminating variables when a nonpositive combination yields a sum of squares (SOS).

## technique 1: NSOSC base case and SDP certificate

NSOSC means that no nonpositive constant combination of the nonstrict input polynomials is a nonzero SOS. When NSOSC holds, generalized Motzkin produces nonnegative multipliers and an SOS polynomial satisfying an identity. The SOS splits into `h1(x,y)+h2(x,z)`; the common-variable expression on the A side is an interpolant.

How to apply it.

1. Partition contradictory formulas into nonstrict `f_i ≥ 0` and strict `g_j > 0`, with A-local, B-local, and common variables (Problem 1, Section 4, p. 8)
2. Check NSOSC by an SDP for nonnegative multipliers `δ_i` and SOS `h` with `Σ δ_i f_i + h ≡ 0` (Algorithm 2, lines 2–3, p. 18)
3. In the NSOSC case, solve the SDP certificate for `λ_i, η_j, η_0` and positive semidefinite matrices representing SOS terms (Section 4.2, pp. 12–13)
4. Decompose the quadratic SOS `h(x,y,z)` into SOS `h1(x,y)` and `h2(x,z)`; absence of `y_i z_j` cross terms is the required condition (Lemma 4, p. 11)
5. Form `I = Σ_{A} λ_i f_i + Σ_{A} η_j g_j + η_0 + h1`. If the strict-side multiplier sum is positive, use `I>0`; otherwise use `I≥0` (Theorem 4, p. 12)
6. Verify the numerical SDP result by reconstructing the SOS decomposition; if verification fails, return unknown rather than an unproved interpolant (Remark 1, Section 4.2, p. 13)

The paper's certificate is explicit: “there exist λi ≥ 0 … and two quadratic SOS polynomial h1 ∈ R[x, y] and h2 ∈ R[x, z]” satisfying identity (21) and normalization (22) (Theorem 4, p. 12).

Evidence. Theorem 4 proves soundness and existence under NSOSC. Theorem 8 states that IGFCH computes an interpolant in the NSOSC case (Section 4.4, p. 18). The paper gives no benchmark denominator in this theorem; SDP complexity is abstracted as `g`.

Verus form. Inference: encode the polynomial identity and SOS decomposition as `spec fn`s over mathematical reals, then prove the identity with `assert` and algebraic lemmas. Store the SDP's exact rational certificate as ghost constants; executable code may use the resulting inequality as a contract. Floating-point matrices must be rationally reconstructed and checked before Verus trusts them. Verus does not provide an SDP solver.

## technique 2: recursive IGFQC for general concave quadratics

When NSOSC fails, a nonpositive combination of nonstrict inequalities is the negative of an SOS. The SOS yields equalities that eliminate at least one variable. The algorithm recursively solves a smaller contradictory pair and wraps the result with a disjunction `(f>0) ∨ (f≥0 ∧ I')` (Algorithm 2, Section 4.4, p. 18).

How to apply it.

1. Find `δ_i` and SOS `h`; split `h=h1+h2` into A- and B-local parts (Algorithm 2, lines 6–9)
2. Define the common polynomial `f = Σ_{A}δ_i f_i + h1 = −Σ_{B}δ_i f_i − h2` (line 9)
3. Use `h1=h2=0` to derive linear equalities and eliminate variables, constructing `φ'` and `ψ'` (line 10; Theorems 6–7, pp. 15–17)
4. Recursively compute `I' = IGFQC(φ',ψ')` (line 11)
5. Return `(f>0) ∨ (f≥0 ∧ I')` (lines 12–14)
6. Stop when variables are exhausted or NSOSC holds; each recursive call removes a variable, so the algorithm terminates (Theorem 9, p. 18)

Example 3 derives `f=−x1+x2`, proves `φ |= f≥0` and `ψ |= f≤0`, then recursively handles the equality branch (Section 4.3, pp. 17–18). This example shows why the returned interpolant may be a disjunction of conjunctions rather than one inequality.

Evidence. Theorem 9 proves soundness and completeness for contradictory CQ inequalities. Theorem 11 gives complexity `O(n*g(r+s+n²))`, where `n` is the number of variables, `r` nonstrict inequalities, `s` strict inequalities, and `g` the SDP complexity (Section 4.5, p. 19). This is a symbolic bound, not a measured runtime.

Verus form. Inference: represent each recursive reduction as a proof function with `ensures` that the returned predicate satisfies the two interpolant implications. Use `decreases` on the number of variables. The disjunction is a `spec fn` Boolean predicate; each branch needs separate `assert` proofs. The SOS equalities should be imported as exact lemmas, not inferred from approximate matrices.

Limits. Completeness is tied to exact SOS/SDP certificates and concavity. Numerical SDP output is not itself rigorous; the paper explicitly says the algorithm is sound but not complete when a numerical result cannot be certified (Remark 1, p. 13). General polynomial equalities are only discussed as future extension through Gröbner bases (Introduction, p. 2).

## technique 3: combination with EUF

The combination first flattens and purifies uninterpreted-function terms. Each function application receives a fresh variable and a definition. Functionality becomes Horn clauses `∧ c_k=b_k -> c=b`; clauses are partitioned into A-local, B-local, and mixed sets (Section 5.1, pp. 20–21). If no mixed clauses exist, expand local Horn clauses into DNF and call IGFQC on every pair of conjunctions (Algorithm 3, p. 23). Mixed clauses are separated using linear bounds and the `SEPmix` procedure (Algorithms 4–6, pp. 22–24).

How to apply it.

1. Flatten every EUF term and record definitions `ω(c1,…,cn)=c` (Section 5.1, p. 20)
2. Generate Horn functionality clauses from pairs of definitions and partition them into `Nφ`, `Nψ`, and `Nmix` (p. 20)
3. If `Nmix` is empty, convert local clauses to DNF and invoke IGFQC for each A/B conjunction pair; disjoin the results (Algorithm 3, p. 23)
4. If `Nmix` is nonempty, use linear constraints to derive separating terms `t−,t+` for mixed equalities with `SEP` (Algorithm 6, p. 24)
5. Move each mixed Horn clause into an A- or B-local clause, introducing a fresh shared function value when both sides have local terms (Algorithm 5, p. 24)
6. Invoke IGFQC on the separated polynomial problems and substitute purified variables back to original EUF terms (Section 5.2, pp. 21–23)

The paper states: “The proposed algorithm and its way of handling of combined theories do not crucially depend upon using algorithms in [17]” (Section 5, p. 20), so the architecture is a hierarchical combination pattern rather than a single solver requirement.

Evidence. Theorem 12 states soundness and completeness of IGFQCE for contradictory CQ inequalities plus EUF (Section 5.2, p. 23). No implementation benchmark or instance denominator is reported in the supplied text; the evidence is theorem-based.

Verus form. Inference: model uninterpreted functions as `spec fn`s and purify calls into ghost variables with equality lemmas. Verify each Horn functionality clause with `assert` and use `requires`/`ensures` on the combined interpolant predicate. Mixed-term separation becomes a contract over shared arguments. Verus can check a concrete finite set of function applications, but does not automatically perform theory combination.

## what is proved, measured, and trusted

Proved: the generalized Motzkin/SOS certificate, NSOSC base-case interpolation, recursive termination and correctness, complexity bounds, and EUF combination soundness/completeness (Theorems 4, 8–12). Trusted assumptions include real arithmetic semantics, negative semidefinite matrices, exact SDP/SOS reconstruction, and the correctness of flattening and Horn functionality axioms.

Measured: the paper's claims are algorithmic and theorem-based. It reports no machine, runtime table, number of benchmarks, or success denominator in the supplied experimental discussion. Its `O(g(...))` bounds use an abstract SDP solver complexity.

Inference: threat to VeruLaw is moderate. The method can generate nonlinear interpolants useful as Verus invariants, including EUF-shaped specifications, but numerical SDP and theory combination are outside Verus's trusted kernel. VL should not redo the CQ interpolation theorem. A useful integration would import exact SOS certificates and measure proof size, solver time, and repair under Rust code changes.

## techniques for the catalog

- nssoc SDP interpolation: solve a semidefinite certificate and split its SOS witness into A-local and B-local parts
- recursive CQ interpolation: use SOS-derived equalities to eliminate variables and recurse, then wrap the result in a disjunctive interpolant
- SOS certificate checking: reconstruct exact square decompositions from numerical SDP output before accepting a candidate
- EUF purification and Horn combination: flatten function terms, generate functionality Horn clauses, separate mixed clauses, and call the CQ interpolator
- separating terms: compute common-variable lower and upper bounds for A-local and B-local terms to split mixed equalities
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
