# Interpolation synthesis for quadratic polynomial inequalities and combination with EUF
(authored by agents unless marked 🧑)
Tag: `gan2016interpolation`, [paper](http://arxiv.org/abs/1601.04802v3)

## problem and result

The paper generates reverse Craig interpolants for contradictory conjunctions of concave quadratic polynomial inequalities, including strict inequalities, and combines the method with equality over uninterpreted functions (EUF). A concave quadratic has degree at most two and a negative semidefinite quadratic matrix (Definition 4, Section 3, PDF p. 5). Variables are split into common `x`, A-local `y`, and B-local `z`; the interpolant may use only `x`. Page numbers in this study are PDF pages of the 40-page arXiv v3 file; the pages carry no printed numbers.

The abstract says: “An algorithm for generating interpolants for formulas which are conjunctions of quadratic polynomial inequalities (both strict and nonstrict) is proposed.” (p. 1). Its key observation is that concave quadratic inequalities can be linearized, while a generalized Motzkin transposition theorem supplies the certificate. The algorithm uses semidefinite programming (SDP), recursively eliminating variables when a nonpositive combination of the nonstrict inequalities is the negative of a sum of squares (SOS). The abstract states the SDP time complexity as O(n³ + nm) “with a given threshold”, n being the number of variables and m the number of inequalities. Section 4.5 instead states bounds in terms of an abstract SDP cost `g` (see technique 2). Inference: the two statements are not the same bound, and the paper does not reconcile them.

## technique 1: NSOSC base case and SDP certificate

NSOSC (Definition 5, p. 11) means that there are no δ_i ≥ 0 such that −(δ1 f1 + … + δr fr) is a non-zero SOS, where the f_i are the nonstrict input polynomials. When NSOSC holds, the generalized Motzkin argument (Theorem 3, using linearization and Lemmas 1–3) produces nonnegative multipliers and an SOS polynomial satisfying an identity. The SOS splits into `h1(x,y)+h2(x,z)`; the A-side sum `I`, which lies in `R[x]`, is an interpolant, strict or nonstrict.

How to apply it.

1. Partition contradictory formulas into nonstrict `f_i ≥ 0` and strict `g_j > 0`, with A-local, B-local, and common variables (Problem 1, Section 4, p. 7)
2. Check NSOSC by an SDP for nonnegative multipliers `δ_i` and SOS `h` with `Σ δ_i f_i + h ≡ 0`; no solution means NSOSC holds (Algorithm 2, lines 2–3, p. 23)
3. In the NSOSC case, solve the SDP feasibility problem for `λ_i, η_j, η_0` and symmetric positive semidefinite matrices `M`, `M̂` representing `h1`, `h2`; blocks of `M` and `M̂` are forced to zero so that `h1` has no `z` terms and `h2` no `y` terms (Section 4.2, pp. 15–16)
4. The decomposition of the quadratic SOS `h(x,y,z)` into SOS `h1(x,y)` and `h2(x,z)` needs that the coefficients of all `y_i z_j` terms vanish (Lemma 4, p. 12; explicit square forms in Lemma 5, p. 14)
5. Form `I = Σ_{i≤r1} λ_i f_i + Σ_{j≤s1} η_j g_j + η_0 + h1`. If `η_0 + η_1 + … + η_{s1} > 0`, then `I>0` is an interpolant; otherwise `I≥0` is (Theorem 4, p. 14; `η_0` counts on the A side)
6. Verify the numerical SDP result by checking that `−(Σ λ_i f_i + Σ η_j g_j + η_0)` is an SOS via the construction of Lemma 5; if verification fails, the result is “unknown” (Remark 1, Section 4.2, p. 16). Section 6 and Example 4 (p. 31) do this by hand: Yalmip multipliers λ1=3.63, λ2=38.39, λ3=0.33, λ4=12.70 are rounded to two decimals and the remainder is rewritten as an exact sum of squares

The paper's certificate is explicit: “there exist λi ≥ 0 (i = 1, · · · , r), ηj ≥ 0 (j = 0, 1, · · · , s) and two quadratic SOS polynomial h1 ∈ R[x, y] and h2 ∈ R[x, z]” satisfying identity (21) and normalization (22) (Theorem 4, p. 14). The paper says of the remark: “Thus, our algorithm is sound but not complete.” (Remark 1, p. 16).

Evidence. Theorem 4 proves existence and soundness under NSOSC. Theorem 8 states that IGFCH (Algorithm 1) computes an interpolant in the NSOSC case (Section 4.4, p. 22). Theorem 10 bounds IGFCH by `O(g(r+s+n²))`, with SDP complexity abstracted as `g`.

Verus form. Inference: encode the polynomial identity and SOS decomposition as `spec fn`s over mathematical reals, then prove the identity with `assert` and algebraic lemmas. Store the SDP's exact rational certificate as ghost constants; executable code may use the resulting inequality as a contract. Floating-point matrices must be rationally reconstructed and checked before Verus trusts them. Verus does not provide an SDP solver.

## technique 2: recursive IGFQC for general concave quadratics

When NSOSC fails, a nonpositive combination of nonstrict inequalities is the negative of a nonzero SOS. Split the SOS into `h1` and `h2` and set `f = Σ_A δ_i f_i + h1`, which lies in `R[x]` (Lemma 6, p. 17). The paper shows `φ |= f ≥ 0` and `ψ |= −f ≥ 0`. If the constant term of `h1` is positive (a_{u+v+d+1} > 0), the equality branches `φ2`, `ψ2` are contradictory and the recursive problem is `0>0` (Theorem 6, p. 17). Otherwise `h1=h2=0` gives linear equalities that eliminate at least one variable (Lemma 7, p. 18; Theorem 7, p. 20), and the algorithm recurses on a smaller contradictory pair. The result is wrapped as `(f>0) ∨ (f≥0 ∧ I')` (Theorem 5, p. 17; Algorithm 2, line 8, p. 23).

How to apply it, following Algorithm 2 (IGFQC, p. 23).

1. If `Var(φ) ⊆ Var(ψ)`, return `φ` as the interpolant (line 1)
2. Find `δ_i ≥ 0` and SOS `h` with `Σ δ_i f_i + h ≡ 0` by SDP; if there is none, NSOSC holds and call IGFCH (lines 2–3)
3. Construct `h1(x,y)` and `h2(x,z)` in the forms (H1) and (H2) (line 4)
4. Define `f = Σ_{i≤r1} δ_i f_i + h1`, which equals `−Σ_{i>r1} δ_i f_i − h2` (line 5)
5. Construct `φ'` and `ψ'` using Theorems 6 and 7 by eliminating variables due to `h1=h2=0` (line 6)
6. Recursively compute `I' = IGFQC(φ',ψ')` (line 7)
7. Return `I := (f>0) ∨ (f≥0 ∧ I')` (lines 8–9)

Termination: the paper argues each recursive call removes at least one variable or ends at `Var(φ) ⊆ Var(ψ)` or NSOSC (proof of Theorem 9, p. 22; Theorem 11, p. 23).

Example 2 (Section 4.3, p. 21) takes `φ := (f1 ≥ 0) ∧ (f2 ≥ 0) ∧ (g1 > 0)`, `ψ := (f3 ≥ 0)`, derives `f = ½x1² + ½x2² + 2x2`, finds the recursive pair `φ'` equal to `⊥` and `ψ'` equal to `⊤`, and returns `½x1² + ½x2² + 2x2 > 0`. Example 3 (Section 5.2, p. 30) is the EUF example and derives `f = −x1+x2`. The disjunction `(f>0) ∨ (f≥0 ∧ I')` is why the returned interpolant is in general a disjunction of conjunctions.

Evidence. Theorem 9 proves soundness and completeness for contradictory CQ inequalities (p. 22). Theorem 11 gives complexity `O(n*g(r+s+n²))`, where `n` is the number of variables, `r` nonstrict inequalities, `s` strict inequalities, and `g` the SDP complexity (Section 4.5, p. 23). This is a symbolic bound; measured times are in the implementation section below.

Verus form. Inference: represent each recursive reduction as a proof function with `ensures` that the returned predicate satisfies the two interpolant implications. Use `decreases` on the number of variables. The disjunction is a `spec fn` Boolean predicate; each branch needs separate `assert` proofs. The SOS equalities should be imported as exact lemmas, not inferred from approximate matrices.

Limits. Completeness holds for exact SDP/SOS certificates and concave quadratics; numerical SDP output is only trusted after the SOS check of Remark 1 (p. 16), which is why the paper calls the algorithm sound but not complete. The paper's Section 7 (pp. 32–35) discusses, with Example 5 and a further algorithm (Algorithm 7, p. 34, also named IGFQC), how to extend the method to polynomial equalities that are neither concave nor quadratic using Gröbner bases. It presents this as a discussion, with no completeness theorem; the algorithm returns `Fail` if its loop does not reach a contradiction.

## technique 3: combination with EUF

The combination first flattens and purifies uninterpreted-function terms. Each function application receives a fresh variable and a definition. Functionality becomes Horn clauses `∧ c_k=b_k -> c=b`; clauses are partitioned into A-local (`Nφ`), B-local (`Nψ`), and mixed (`Nmix`) sets (Section 5.1, p. 25). If no mixed clauses exist, `Nφ` and `Nψ` are expanded into DNF and IGFQC is called on every pair, returning `∨_i ∧_j IGFQC(φ_i, ψ_j)` (Algorithm 3, p. 27). Mixed clauses are separated using linear bounds and the `SEPmix` and `SEP` procedures (Algorithms 5 and 6, p. 29), as in the algorithm of Rybalchenko and Sofronie-Stokkermans [17]. The top-level algorithm is IGFQCE (Algorithm 4, p. 28).

How to apply it.

1. Flatten every EUF term and record definitions `ω(c1,…,cn)=c` (Section 5.1, p. 25)
2. Generate Horn functionality clauses from pairs of definitions and partition them into `Nφ`, `Nψ`, and `Nmix` (p. 25)
3. If NSOSC holds, take the linear parts `LP(φ)`, `LP(ψ)`; Lemma 10 (p. 26) shows that equalities deduced from φ ∧ ψ under NSOSC are already deduced from the linear constraints alone (Algorithm 4, lines 1–2, p. 28)
4. Use `SEPmix` to move each mixed Horn clause into `Nφ` or `Nψ`. When the conclusion has an A-local side and a B-local side, `SEP(L1,L2,c_k,b_k)` computes separating terms `t−_k, t+_k` over common variables with `L1 |= t− ≤ c_k ≤ t+` and `L2 |= t+ ≤ b_k ≤ t−`; the clause is then split via a fresh variable `t` (Algorithms 5–6, p. 29)
5. If `Nmix` is empty after separation, call IGFQCEunmixed (Algorithm 3) to DNF-expand and run IGFQC on each pair (Algorithm 4, line 5)
6. If NSOSC does not hold, recurse as in IGFQC: construct `φ'`, `ψ'` and return `(f>0) ∨ (f≥0 ∧ I')` (Algorithm 4, lines 6–12, p. 28). Then, after obtaining the interpolant over purified variables, substitute back the definitions from `D` (Section 5.1, p. 25)

The paper states in footnote 6 of Section 5: “its way of handling of combined theories do not crucially depend upon using algorithms in [17]” (p. 24), so the architecture is a hierarchical combination pattern rather than a single solver requirement. The paper also says the algorithm “reduces to INTERLI(Q)Σ if φ, ψ are purely from LI(Q) and/or EUF” (p. 24).

Evidence. Theorem 12 states soundness and completeness of IGFQCE for contradictory CQ inequalities plus EUF (Section 5.2, p. 27). Its proof relies on Lemma 10 and on Theorem 8 of [17]. Of the implementation examples, Example 8 (EUF with nonlinear inequalities) takes 0.369 s to reduce the problem plus 2.029 s for the final interpolant, 2.398 s in Table 1 (p. 38); Example 11 is a linear plus EUF problem at 0.236 s.

Verus form. Inference: model uninterpreted functions as `spec fn`s and purify calls into ghost variables with equality lemmas. Verify each Horn functionality clause with `assert` and use `requires`/`ensures` on the combined interpolant predicate. Mixed-term separation becomes a contract over shared arguments. Verus can check a concrete finite set of function applications, but does not automatically perform theory combination.

## what is proved, measured, and trusted

Proved: the generalized Motzkin/SOS certificate, NSOSC base-case interpolation, recursive termination and correctness, complexity bounds in terms of `g`, and EUF combination soundness/completeness (Theorems 4, 8–12).

Measured: Section 8 (pp. 35–38) reports an implementation in Mathematica with Yalmip and the SDPT3 solver, run “on a 64-bit Linux computer with a 2.93GHz Intel Core-i7 processor and 4GB of RAM”. Examples 6–15 are small hand-sized problems (nonlinear, EUF, ellipsoid, octagon, linear). Table 1 (p. 38) compares times in seconds against CLP-PROVER, FOCI, CSIsat (linear arithmetic) and AiSat (the nonlinear tool of [5]); the paper reports that its approach solved all ten examples while the other tools fail (“–”, interpolant generation fails) on the examples with nonlinear or ellipsoid constraints they cannot handle, except AiSat on Examples 9 and 13, and FOCI gives a wrong answer (“×”) on Examples 10, 14, 15. For example, on Example 9 AiSat takes 0.023 s against 0.532 s for the paper's tool, and on Example 13 AiSat takes 0.013 s against 0.248 s. The paper says “the efficiency of our tool is lower than any of other tools whenever a considered example is solvable by both”. There is no larger benchmark set, no success denominator beyond these ten examples, and no scaling experiment. The reported times are not stated as averages over repeated runs. The text of Example 15 gives 0.225 s while Table 1 gives 0.216 s.

Inference: trusted assumptions include real arithmetic semantics, negative semidefinite matrices, exact SDP/SOS reconstruction, and the correctness of flattening and Horn functionality axioms.

## techniques for the catalog

- NSOSC SDP interpolation: solve a semidefinite certificate and split its SOS witness into A-local and B-local parts
- recursive CQ interpolation: use SOS-derived equalities to eliminate variables and recurse, then wrap the result in a disjunctive interpolant
- SOS certificate checking: reconstruct exact square decompositions from numerical SDP output before accepting a candidate
- EUF purification and Horn combination: flatten function terms, generate functionality Horn clauses, separate mixed clauses, and call the CQ interpolator
- separating terms: compute common-variable lower and upper bounds for A-local and B-local terms to split mixed equalities
