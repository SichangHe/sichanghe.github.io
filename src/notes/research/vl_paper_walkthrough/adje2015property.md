# Property-based Polynomial Invariant Generation using Sums-of-Squares Optimization
(authored by agents unless marked 🧑)
Tag: `adje2015property`, [paper](http://arxiv.org/abs/1503.07025v1)

## what is proved and measured

This paper synthesizes an inductive polynomial invariant that implies a user-selected polynomial property. The input is a single-loop program in SSA form whose branches have polynomial guards and polynomial updates. The user property is a sublevel set `Pκ,α = {x | κ(x) ≤ α}` (or `<` for an infinite bound), such as bounded state, a safe numerical range, or avoidance of a bad region. The abstract says: “While the target property is not necessarily inductive with respect to the program semantics, our method identifies a stronger inductive polynomial invariant using numerical optimization.” (Abstract, p. 1). The synthesized set is `P = {x | p(x) ≤ 0}` and the desired inclusions are `R ⊆ P ⊆ Pκ,w ⊆ Pκ,α`, where `R` is the reachable set and `w` is optimized (Equation 7, p. 7).

The proof obligation is set containment, not merely simulation. A feasible solution of the exact optimization problem (Problem 11, p. 8) has `p ≤ 0` on all initial states, `p(Ti(x)) ≤ p(x)` on every branch domain, and `κ ≤ w + p` everywhere; together these make `{p ≤ 0}` an inductive invariant contained in `Pκ,w`. The paper then relaxes this problem to a hierarchy of sums-of-squares (SOS) semidefinite programs (Problem 13, p. 9). Inference: this is a candidate generator for Verus loop invariants; the numerical solver’s output must be turned into exact lemmas or checked certificates before it is trusted in a Verus project.

## technique 1: model a loop as a constrained piecewise polynomial system

what it is: represent the program as a quadruple `(Xin, X0, X, L)`. `Xin` is a compact basic semialgebraic initial set, `X0` is the basic semialgebraic set where the state variable lives (the loop condition), `X={Xi}` partitions states by branch guards, and `L={Ti}` contains polynomial updates. The reachable set is the least fixed point of `F(C) = Xin ∪ ⋃i Ti(C ∩ Xi ∩ X0)` (Sections 2–3, pp. 3–6; `F` is Equation 6, p. 6).

when to use it: use this abstraction for a loop with polynomial assignments and polynomial inequalities in guards. The paper’s program shape (Figure 1, p. 3) is a single `while` loop with a `case` body of nested conditional branches. Inference: it does not directly cover arbitrary Rust operations, heap mutation, or non-polynomial control flow.

how to do it:
1. put the loop in SSA form so every variable is initialized at most once (Section 2, p. 3)
2. write each branch guard as a conjunction of weak or strict polynomial inequalities and each update as a parallel polynomial map `Ti` (Section 2, p. 3)
3. define `Xin`, `X0`, branch regions `Xi`, and the updates `Ti`; ensure the branch regions form a partition (Definition 1 and Equation 3, p. 4)
4. define the collecting functional `F` and use `F(P) ⊆ P` as the inductiveness condition (Section 3.1, p. 6)

The running example has two kept variables (`x1`, `x2`; `oldx1` and `oldx2` are only memories), two guards based on `x1²+x2²`, and cubic updates (Example 1, pp. 4–5). The paper states: “To prove that a subset P is a loop invariant, it suffices to show that P satisfies F (P ) ⊆ P .” (Section 3.1, p. 6).

Verus form: Inference: represent the state as a Rust or `spec` datatype, branch guards as boolean `requires` conditions, and the update as a `spec fn`; write a loop `invariant` containing `p(state) <= 0` and prove each branch preserves it. Verus requires the invariant syntax in the loop, whereas the paper reasons over real-valued sets. Integer rounding, overflow, and executable representation must be modeled explicitly.

## technique 2: property-driven invariant optimization

what it is: choose a polynomial template `p` and bound `w` satisfying Problem (11): `p(x) ≤ 0` on `Xin`; `p(Ti(x)) ≤ p(x)` on each branch domain `Xi ∩ X0`; and `κ(x) ≤ w + p(x)` for every real `x`. Minimize `w`. Lemma 1 proves that any feasible solution with `w ≤ α` (or finite `w` for α=∞) satisfies the conditions that give the inclusion chain and therefore the target property (Section 3.3, pp. 7–8).

when to use it: use a finite α to prove a numerical safety bound, or α=∞ to establish boundedness (Lemma 1, p. 8). For avoiding a bad region, the paper writes: “If the bad region can be encoded as a sublevel property k(x) ≤ 0 then its negation −k(x) ≤ 0 characterize the avoidance of that bad zone.” (Example 2, p. 7). In Example 7 the authors seek a negative α for such a `κ` (Section 5.2, p. 13).

how to do it:
1. choose the target polynomial `κ` and threshold α (Section 3.2, pp. 6–7)
2. choose a half-degree `m`, so the unknown polynomial `p` has degree at most `2m` (Section 4, pp. 8–9)
3. enforce the initial-state, branch-decrease, and target-containment constraints from Problem (11)
4. minimize `w`; accept the result only if `w ≤ α` (Lemma 1, p. 8)
5. use `P={p≤0}` as the inductive invariant and `Pκ,w` as the certified target bound (Equation 7, p. 7)

Evidence: for Example 4, the boundedness target `κ=||x||²` produced bounds `w2=639`, `w3=17.4`, `w4=2.44`, and `w5=2.02` (Table 2, p. 12). For the bad-ball Example 7, `w3` and `w4` were nonnegative and did not certify avoidance, while `w5=-0.0777` did (Section 5.2, p. 13, and Table 2, p. 12). These are bounds for those concrete polynomial systems, not success rates over a benchmark population.

Verus form: Inference: encode `p(state) <= 0` as a loop invariant and `κ(state) <= w` as a postcondition or lemma consequence. If coefficients are rational, use exact integer-scaled polynomials or an abstract mathematical model; floating-point coefficients from an SDP output cannot be assumed exact. A Verus `proof fn` can prove each branch implication, but it cannot call the numerical optimizer at run time.

limits: the paper says of Problem (11): “since we minimize w, either there exists a feasible w such that w ≤ α and we can exploit this solution or such w is not available and we cannot conclude.” (p. 8). It adds that when the optimal bound `w` is greater than α, the solution could be used “with another method such as policy iteration [AGM15]” (p. 8). The method needs a compact `Xin` (Definition 1, p. 4). The paper gives no termination analysis.

## technique 3: SOS and semidefinite relaxation hierarchy

what it is: replace global nonnegativity constraints with SOS identities. The authors write: “In practice, we rely on sum-of-squares programming to solve a relaxed version of Problem (11).” (Section 3.3, p. 8). A polynomial `q` is SOS when `q=Σi qi²`; it can be represented as `q(x)=bm(x)^T Q bm(x)` with a positive semidefinite matrix `Q` (Equation 12, Section 4, pp. 8–9). Problem (13) imposes SOS multipliers for initial and branch guards and an SOS residual `ψ` for `w+p−κ`, with template degree `2m` (p. 9).

when to use it: use increasing `m` when a low-degree template cannot find a certificate; in Example 7, `m=3` and `m=4` fail and `m=5` succeeds (Section 5.2, p. 13). The paper expects tractable approximations only when the number of variables or the degree is small (Section 4, p. 10), and Table 1 shows cost growing with dimension and degree.

how to do it:
1. select half-degree `m` and let `p ∈ R[x]2m` (Problem 13, p. 9)
2. express every nonnegativity condition as an SOS identity with guard-polynomial multipliers and degree bounds (Problem 13, p. 9)
3. convert each identity to SDP coefficient constraints using the monomial basis `bm` and PSD matrix `Q` (Equations 12–13, pp. 8–9)
4. solve with an SDP solver such as Mosek (the paper also names SDPA, p. 9); extract `p`, `w`, and SOS certificates
5. apply Proposition 1: the feasible SOS solution is feasible for Problem (11), and if `w≤α`, the target property is certified (Proposition 1, p. 9)

The paper’s illustrative polynomial `q=1+x1²−2x1x2+x2²` has SOS certificate `1+(x1−x2)²` (Example 3, p. 9). The benchmark used Yalmip interfaced with Mosek on an Intel Core i5 2.40 GHz (Section 5, p. 10). Example 4 (d=2) took 0.82, 1.35, 4.00, and 9.86 seconds for degrees 4, 6, 8, and 10; Example 5 (d=3) took 0.84, 2.98, 21.4, and 109 seconds; Example 6 (d=4) took 2.85, 57.3, 1534 seconds, and could not be solved within one day at degree 10 (Table 1, p. 12). The paper does not state repeated trials; each table cell is one reported SDP instance.

Verus form: Inference: use SOS output only to generate candidate polynomial lemmas. A trustworthy Verus adaptation would state exact `ensures` for the polynomial identity and prove nonnegativity with arithmetic lemmas; PSD numerical eigenvalues are evidence for search, not a Verus proof. The paper’s guard multipliers correspond to branch-specific `requires` facts and `assert`/`lemma` steps, not to a Verus primitive.

## technique 4: complete templates with SOS-dominated polynomials

what it is: after obtaining `p`, add polynomials `q` such that `p−q` is SOS. Proposition 2 proves the conjunction `p≤0 ∧ q≤0` remains inductive and lies inside the same target bound, giving a richer template basis that can initialize policy iteration (Section 6, p. 14).

how to do it:
1. obtain a feasible `(p,w)` from Problem (13)
2. choose a finite set `Q` of polynomials
3. for every `q∈Q`, find an SOS certificate for `p−q`
4. add `q≤0` to the invariant and use the resulting basis to initialize policy iteration (Proposition 2, p. 14)

Evidence: Example 9 chooses `Q={xk²−w}` and derives `p−(xk²−w)=ψ+Σj≠k xj²`, an SOS expression (Section 6, p. 14). Inference: this is a principled way to turn one automatically generated invariant into several Verus loop-invariant conjuncts, but every added conjunct still needs an exact proof.

## trusted boundary, contradictions, and product threat

The paper proves Lemma 1, Proposition 1 and Proposition 2 for real-valued polynomial systems. It does not discuss SDP solver tolerances or floating-point rounding of the computed certificates; it mentions floating-point arithmetic only as a possible cause of wrongly evaluated branch conditions in Example 8 (p. 13). Inference: numerical optimization, floating-point SDP tolerances, solver implementations, and the abstraction from Rust to polynomial real state therefore lie outside what the paper proves, and an agent-written verified Rust product must treat the optimizer as an untrusted invariant synthesizer and ask Verus to check the final invariant against executable code.

The paper reports timing and concrete bounds, not a corpus-wide percentage. Table 1 (p. 12) prints, for d=4 at degree 8, “Nb. vars” 18480 and “Mat. size” 373057, while the degree-6 column has 65306 and 6622. Inference: the two degree-8 values look swapped, since the matrix size would not exceed the variable count in the neighboring columns; both displayed values are retained. Inference: VL should reuse SOS as a search method for numeric loop invariants and should not redo generic interval-only invariant generation for polynomial controllers. The threat to a product is high for floating-point control code if numerical certificates are accepted without exact checking; it is lower for ordinary ownership proofs because this technique does not model memory or Rust lifetimes.

## techniques for the catalog

- piecewise-polynomial loop abstraction — encode SSA loops as guarded polynomial transitions and use `F(P)⊆P` for inductiveness
- property-driven polynomial invariant — optimize `w` so `R⊆{p≤0}⊆{κ≤w}⊆{κ≤α}`
- SOS semidefinite hierarchy — replace global polynomial inequalities with SOS identities and solve degree-bounded SDP relaxations
- SOS template completion — add `q≤0` when `p−q` is SOS to obtain a richer inductive template basis

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Thus, one expects tractable approximations when the number d of variables (resp. the degree 2m of the template p) is small."): read the whole paper text (arXiv 1503.07025v1, 17 PDF pages) and checked the quotations, the formulations of Problems (11) and (13), Lemma 1, Propositions 1 and 2, Examples 3, 4, 7 and 9, the Table 1 timings, the Table 2 bounds, the benchmark setup, and every page reference (page numbers here are PDF pages, which I recomputed because many earlier ones were wrong); I changed the page and section references throughout, removed the unsupported claims that Problem (11) is nonconvex, that the hierarchy is complete only in special conditions, and that the paper's soundness assumes exact SDP certificates, replaced the Example 2 pointer for the negative bound with Example 7, corrected the Table 1 description (column, not row), labelled my own readings as Inference, and kept the tag and the arXiv link (which is in the paper text); I did not check the Verus adaptations, which are the study's own inferences, the references, the plotted figures 2 and 3, the Example 5 and 6 formulas, or the cited external works.
