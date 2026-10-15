# Property-based Polynomial Invariant Generation using Sums-of-Squares Optimization
(authored by agents unless marked 🧑)
Tag: `adje2015property`, [paper](http://arxiv.org/abs/1503.07025v1)

## what is proved and measured

This paper synthesizes an inductive polynomial invariant that implies a user-selected polynomial property. The input is a single-loop program in SSA form whose branches have polynomial guards and polynomial updates. The user property is a sublevel set `Pκ,α = {x | κ(x) ≤ α}` (or `<` for an infinite bound), such as bounded state, a safe numerical range, or avoidance of a bad region. The abstract says: “While the target property is not necessarily inductive with respect to the program semantics, our method identifies a stronger inductive polynomial invariant using numerical optimization.” (Abstract, p. 1). The synthesized set is `P = {x | p(x) ≤ 0}` and the desired inclusions are `R ⊆ P ⊆ Pκ,w ⊆ Pκ,α`, where `R` is the reachable set and `w` is optimized.

The proof obligation is set containment, not merely simulation. A feasible solution of the exact optimization problem proves that all initial states satisfy `p ≤ 0`, every enabled branch preserves `p ≤ 0`, and `κ ≤ w + p` everywhere. The paper then relaxes this problem to a hierarchy of sums-of-squares (SOS) semidefinite programs. Inference: this is a candidate generator for Verus loop invariants; the numerical solver’s output must be turned into exact lemmas or checked certificates before it is trusted in a Verus project.

## technique 1: model a loop as a constrained piecewise polynomial system

what it is: represent the program as a quadruple `(Xin, X0, X, L)`. `Xin` is a compact basic semialgebraic initial set, `X0` is the loop-state domain, `X={Xi}` partitions states by branch guards, and `L={Ti}` contains polynomial updates. The reachable set is the least fixed point of `F(C) = Xin ∪ ⋃i Ti(C ∩ Xi ∩ X0)` (Sections 2–3, pp. 2–4).

when to use it: use this abstraction for a loop with polynomial assignments and polynomial inequalities in guards. It supports nested if-then-else branches after conversion to SSA; it does not directly cover arbitrary Rust operations, heap mutation, or non-polynomial control flow.

how to do it:
1. put the loop in SSA form so every variable is assigned at most once (Section 2, p. 2)
2. write each branch guard as a conjunction of weak or strict polynomial inequalities and each update as a parallel polynomial map `Ti` (Section 2, p. 2)
3. define `Xin`, `X0`, branch regions `Xi`, and the updates `Ti`; ensure the branch regions form a partition (Definition 1, p. 3)
4. define the collecting functional `F` and use `F(P) ⊆ P` as the inductiveness condition (Section 3.1, p. 4)

The running example has two variables, two guards based on `x1²+x2²`, and cubic updates (Example 1, pp. 3–4). The paper states: “To prove that a subset P is a loop invariant, it suffices to show that P satisfies F (P ) ⊆ P .” (Section 3.1, p. 4).

Verus form: Inference: represent the state as a Rust or `spec` datatype, branch guards as boolean `requires` conditions, and the update as a `spec fn`; write a loop `invariant` containing `p(state) <= 0` and prove each branch preserves it. Verus requires the invariant syntax in the loop, whereas the paper reasons over real-valued sets. Integer rounding, overflow, and executable representation must be modeled explicitly.

## technique 2: property-driven invariant optimization

what it is: choose a polynomial template `p` and bound `w` satisfying Problem (11): `p(x) ≤ 0` on `Xin`; `p(Ti(x)) ≤ p(x)` on each branch domain; and `κ(x) ≤ w + p(x)` for every real `x`. Minimize `w`. Lemma 1 proves that any feasible solution with `w ≤ α` (or finite `w` for α=∞) gives the inclusion chain and therefore the target property (Section 3.3, pp. 5–6).

when to use it: use a finite α to prove a numerical safety bound, or α=∞ to establish boundedness. To avoid a bad region encoded by `κ(x) ≤ 0`, negate the polynomial and seek a strictly negative bound (Example 2, p. 5).

how to do it:
1. choose the target polynomial `κ` and threshold α (Section 3.2, p. 5)
2. choose a degree for the unknown polynomial `p` and initialize the constraint system (Section 3.3, p. 5)
3. enforce initial-state, branch-decrease, and target-containment constraints from Problem (11)
4. minimize `w`; accept the result only if `w ≤ α` (Lemma 1, p. 6)
5. use `P={p≤0}` as the inductive invariant and `Pκ,w` as the certified target bound (Equation 7, p. 5)

Evidence: for Example 4, the boundedness target `κ=||x||²` produced bounds `w2=639`, `w3=17.4`, `w4=2.44`, and `w5=2.02` (Table 2, p. 9). For the bad-ball Example 7, `w3` and `w4` were nonnegative and did not certify avoidance, while `w5=-0.0777` did (Section 5.2 and Table 2, pp. 10–11). These are bounds for those concrete polynomial systems, not success rates over a benchmark population.

Verus form: Inference: encode `p(state) <= 0` as a loop invariant and `κ(state) <= w` as a postcondition or lemma consequence. If coefficients are rational, use exact integer-scaled polynomials or an abstract mathematical model; floating-point coefficients from an SDP output cannot be assumed exact. A Verus `proof fn` can prove each branch implication, but it cannot call the numerical optimizer at run time.

limits: Problem (11) is nonconvex in general and only a sufficient certificate is sought. If the optimum `w` exceeds α, the paper says no conclusion follows, although policy iteration may refine it (Section 3.3, p. 6). The approach assumes real arithmetic and compact initial sets; it does not prove termination.

## technique 3: SOS and semidefinite relaxation hierarchy

what it is: replace global nonnegativity constraints with SOS identities. The authors write: “In practice, we rely on sum-of-squares programming to solve a relaxed version of Problem (11).” (Section 3.3, p. 6) A polynomial `q` is SOS when `q=Σi qi²`; it can be represented as `q(x)=bm(x)^T Q bm(x)` with a positive semidefinite matrix `Q` (Equation 12, Section 4, pp. 6–7). Problem (13) imposes SOS multipliers for initial and branch guards and an SOS residual `ψ` for `w+p−κ`, with template degree `2m`.

when to use it: use increasing `m` when a low-degree template cannot find a certificate. The hierarchy is complete only in special mathematical conditions; computational cost grows rapidly with variable dimension and degree.

how to do it:
1. select half-degree `m` and let `p ∈ R[x]2m` (Section 4, p. 7)
2. express every nonnegativity condition as an SOS identity with guard-polynomial multipliers and degree bounds (Problem 13, p. 7)
3. convert each identity to SDP coefficient constraints using the monomial basis `bm` and PSD matrix `Q` (Equations 12–13, pp. 6–8)
4. solve with an SDP solver such as Mosek; extract `p`, `w`, and SOS certificates
5. apply Proposition 1: the feasible SOS solution is feasible for Problem (11), and if `w≤α`, the target property is certified (Section 4, p. 8)

The paper’s illustrative polynomial `q=1+x1²−2x1x2+x2²` has SOS certificate `1+(x1−x2)²` (Example 3, p. 7). The benchmark used Yalmip with Mosek on an Intel Core i5 2.40 GHz (Section 5, p. 8). Example 4 (d=2) took 0.82, 1.35, 4.00, and 9.86 seconds for degrees 4, 6, 8, and 10; Example 5 (d=3) took 0.84, 2.98, 21.4, and 109 seconds; Example 6 (d=4) took 2.85, 57.3, 1534 seconds, and failed within one day at degree 10 (Table 1, p. 9). The denominators are one SDP instance per listed example/degree, not repeated trials.

Verus form: Inference: use SOS output only to generate candidate polynomial lemmas. A trustworthy Verus adaptation would state exact `ensures` for the polynomial identity and prove nonnegativity with arithmetic lemmas; PSD numerical eigenvalues are evidence for search, not a Verus proof. The paper’s guard multipliers correspond to branch-specific `requires` facts and `assert`/`lemma` steps, not to a Verus primitive.

## technique 4: complete templates with SOS-dominated polynomials

what it is: after obtaining `p`, add polynomials `q` such that `p−q` is SOS. Proposition 2 proves the conjunction `p≤0 ∧ q≤0` remains inductive and lies inside the same target bound, giving a richer template basis for policy iteration (Section 6, pp. 11–12).

how to do it:
1. obtain a feasible `(p,w)` from Problem (13)
2. choose a finite set `Q` of polynomials
3. for every `q∈Q`, find an SOS certificate for `p−q`
4. add `q≤0` to the invariant and use the resulting basis to initialize policy iteration (Proposition 2, p. 11)

Evidence: Example 9 chooses `Q={xk²−w}` and derives `p−(xk²−w)=ψ+Σj≠k xj²`, an SOS expression (Section 6, p. 12). Inference: this is a principled way to turn one automatically generated invariant into several Verus loop-invariant conjuncts, but every added conjunct still needs an exact proof.

## trusted boundary, contradictions, and product threat

The paper proves soundness of the set-theoretic and SOS implications assuming exact real arithmetic, exact feasible SDP certificates, and correct program modeling. Numerical optimization, floating-point SDP tolerances, solver implementations, and the abstraction from Rust to polynomial real state remain outside that proof. Inference: an agent-written verified Rust product must treat the optimizer as an untrusted invariant synthesizer and ask Verus to check the final invariant against executable code.

The paper reports timing and concrete bounds, not a corpus-wide percentage. Table 1’s d=4 degree-8 row is printed as 18,480 SDP variables but its matrix size is 373,057; the surrounding trend and neighboring rows suggest the first value may be a typographical inconsistency; both displayed values are retained. Inference: VL should reuse SOS as a search method for numeric loop invariants and should not redo generic interval-only invariant generation for polynomial controllers. The threat to a product is high for floating-point control code if numerical certificates are accepted without exact checking; it is lower for ordinary ownership proofs because this technique does not model memory or Rust lifetimes.

## techniques for the catalog

- piecewise-polynomial loop abstraction — encode SSA loops as guarded polynomial transitions and use `F(P)⊆P` for inductiveness
- property-driven polynomial invariant — optimize `w` so `R⊆{p≤0}⊆{κ≤w}⊆{κ≤α}`
- SOS semidefinite hierarchy — replace global polynomial inequalities with SOS identities and solve degree-bounded SDP relaxations
- SOS template completion — add `q≤0` when `p−q` is SOS to obtain a richer inductive template basis

Checked 2026-10-15 against the paper by a Codex agent for property_based_polynomial_invariant_gene_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
