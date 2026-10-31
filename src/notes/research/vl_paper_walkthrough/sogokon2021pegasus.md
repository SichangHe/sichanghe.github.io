# Pegasus: sound continuous invariant generation
(authored by agents unless marked 🧑)
Tag: `sogokon2021pegasus`, [paper](https://arxiv.org/abs/2005.09348)

## what the paper proves and builds

Pegasus is a continuous-invariant generator integrated with the KeYmaera X theorem prover. The paper's abstract states: “Continuous invariants are an important component in deductive verification of hybrid and continuous systems.” (Abstract, p. 1.) It frames the target as polynomial ordinary differential equations (ODEs), where an invariant is a set of states that trajectories cannot leave. The safety rule has three obligations: initial states imply the invariant, the invariant is preserved by the ODE, and the invariant implies safety (Section 2, pp. 4–5). The paper's exact formulation is: “The second premiss states that I is a continuous invariant, i.e. I is maintained throughout the continuous evolution of the system whenever it starts inside I, that is, the following dL formula is true in all states:” (Section 2, p. 5.)

Pegasus proposes candidates, while KeYmaera X checks them in its sound differential-dynamic-logic (dL) core. The architecture is deliberate: “KeYmaera X checks all the invariants it is supplied with—including those provided by Pegasus.” (Section 4, p. 9.) The paper therefore leaves heuristic and numerical generation outside the soundness-critical core and checks the exact candidate afterward. It contrasts this with HHL, which trusts an external LZZ checker and generator, and says KeYmaera X “pursues an LCF-style approach, seeking to minimize the soundness-critical code that needs to be trusted in its output.” (Section 3.2, p. 7.) Pegasus restricts prover-facing polynomials to rational coefficients: “KeYmaera X works with polynomials p ∈ Q[x] that have rational coefficients.” (Section 3.3, p. 8.)

Inference: a Verus implementation should separate candidate discovery from proof. Rust code can compute candidate predicates or coefficients, but the Verus proof should state the invariant as a `spec fn` or predicate and prove preservation with `requires`, `ensures`, loop invariants, and proof lemmas. The generator is trusted only for finding candidates if the Verus proof independently checks them; the executable should not call a `proof fn` at run time. This is an analogy to the paper's architecture, not a claim that the paper used Verus.

## technique: invariant checking and template enumeration

The paper gives two baseline mechanisms. LZZ decides whether a semi-algebraic set is invariant using higher-order Lie derivatives, Gröbner bases, and universal real arithmetic (Section 3, p. 5). dL instead constructs a proof from ODE axioms. For generation, the complete semi-algorithm is template enumeration: “A template is a parametric formula, such as” followed by a polynomial inequality with symbolic coefficients (Section 3.1, p. 6). The method enumerates templates and uses quantifier elimination to find coefficients satisfying the safety and invariance constraints. The paper calls it “a theoretically complete semi-algorithm, in the sense that it terminates with a positive answer iff that is possible with the given templates” (Section 3.1, p. 6), but warns: “quantifier elimination algorithms for real arithmetic used in practice have doubly-exponential time complexity in the number of variables.” (Section 3.1, p. 6.)

The paper describes the method only in outline: exhaustively enumerate parametric templates covering all real arithmetic formulas, and use a quantifier elimination algorithm (such as CAD) to decide whether template parameters exist that meet the required arithmetic constraints (Section 3.1, p. 6). The paper then says that in practice invariant generation uses “incomplete—but considerably more efficient—generation methods” (Section 3.1, p. 6), which is what Pegasus implements.

Inference: in Verus, template enumeration becomes a finite search performed outside the proof, followed by a concrete proof of the selected predicate. For a candidate `p`, encode the arithmetic relation as a `spec fn`, prove `init ==> p`, prove `p` is preserved across each Rust transition, and prove `p ==> safe`. Verus's integer or real arithmetic support and nonlinear solver limits mean the search space and lemma structure must be adapted; the paper's quantifier-elimination completeness does not carry over automatically.

## technique: exact discrete abstraction

Pegasus discretizes continuous state space with polynomial sign predicates. The paper lists three steps: “(i) discretize the continuous state space of a system by defining predicates that correspond to discrete states, (ii) compute a (local) transition relation between the discrete states obtained from the previous step, yielding a discrete transition system which abstracts the behavior of the original continuous system, and finally (iii) compute reachable sets in the discrete abstraction to obtain an over-approximation of the reachable sets of the continuous system.” (Section 4.1, p. 9.) A transition is checked by asking whether the source cell is invariant under an evolution domain equal to the union of source and target cells. If invariant, no transition is added; otherwise soundness requires one. The paper states: “Soundness of the discrete abstraction guarantees that any invariant extracted from the discretization corresponds to an invariant for the original system.” (Section 4.1, p. 9.)

The concrete example uses sign conditions on `p1` and `p2`, yielding cells such as `S1 ≡ p1 < 0 ∧ p2 = 0`; each possible adjacent transition is reduced to a dL invariance query (Section 4.1, pp. 9–10). Reachable cells are the smallest abstraction invariants, although Pegasus often prefers cheaper conservative invariants.

Inference: the Verus analogue is predicate abstraction over a finite Rust state model. Define a ghost classification function returning a cell, prove every concrete transition maps to an allowed abstract edge, and prove safety for all reachable cells. This works for discrete encodings of the ODE or a sampled controller, but Verus does not reason directly about real-time ODE trajectories; a discretization or trusted numerical model is an additional assumption.

## technique: qualitative analysis

For one-dimensional polynomial ODEs, Pegasus computes real roots of the right-hand side `f(x)`, creates linear predicates `x − ri`, adds initial-set boundaries, and computes the exact reachable set of the resulting abstraction (Section 4.2, p. 11). It also uses the potential `F(x) = −∫ f(x) dx`; every sublevel set `F(x) ≤ k` is invariant (Remark 4, Section 4.2, p. 12).

For linear systems `x' = Ax`, it computes eigenvalues and transpose eigenvectors. Given an eigenvector `v` of `Aᵀ` with real eigenvalue `λ`, the linear form `p = vᵀx` satisfies `p' = λp`, so `p > 0`, `p = 0`, and `p < 0` are invariant regions (Section 4.2, p. 12). If all eigenvalues have negative real parts, Pegasus solves the Lyapunov equation `AᵀP + PA = Q` and uses the quadratic `V(x)=xᵀPx`; each sublevel `V ≤ k` is invariant (Section 4.2, p. 12). The paper also experiments with conic abstractions that partition space into cones with bounded vector-field twisting, but its implementation for bounded two-dimensional linear systems “is not able to return an exact invariant region” (Section 4.2, p. 14).

For nonlinear systems, Pegasus extracts factors and summands from ODE right-hand sides, Lie derivatives, and physical quantities such as divergence. It also builds locally transverse linear forms `f(x0)·(x−x0)` at regular points and partitions a bounded domain using a grid of such points (Section 4.3, pp. 14–15).

Inference: Verus can encode the linear and Lyapunov predicates as ghost arithmetic and prove preservation of a discrete update or numerical integrator. Eigenvector computation and conic partitioning are candidate-generation steps; exact rational coefficients must be supplied to the proof. Continuous-time derivative arguments require a separately proved discretization theorem or an external model, so direct transfer is limited.

## technique: polynomial first integrals

A polynomial `p` is a first integral when its Lie derivative is the zero polynomial, so every level set `p = k` is invariant (Section 4.4.1, p. 16). Pegasus searches all first integrals up to a degree bound by undetermined coefficients. The paper's worked Kasner example uses a quadratic template with ten coefficients, computes its degree-three Lie derivative, equates every monomial coefficient to zero, and solves the resulting linear system; a nontrivial solution is `x1 x2 + x1 x3 + x2 x3` (Section 4.4.1, pp. 16–17). It then chooses `kmin` and `kmax` by minimizing and maximizing `p` over `Init ∩ Q`, yielding `kmin ≤ p ∧ p ≤ kmax`.

The paper also combines `n−1` functionally independent first integrals in an `n`-dimensional system. Evaluating them at an initial point gives a one-dimensional invariant curve when the gradient matrix has full rank (Section 4.4.1, pp. 18–19).

Inference: in Verus, represent `p` as a pure specification function and prove `p(next_state) == p(state)` for each transition. For a loop, put that equality-derived predicate in the loop invariant. Coefficient search can be done offline; the proof must check the concrete polynomial identities. Exact maxima over real sets are outside ordinary Rust execution, so bounds need a proved discrete lemma or conservative constants.

## technique: Darboux and rational first integrals

A Darboux polynomial satisfies `p' = αp` for a polynomial cofactor `α`; only `p = 0` is automatically invariant. Pegasus searches a degree-`d` polynomial template and a degree-`r−1` cofactor template, expands `p' − αp`, and equates coefficients. This is nonlinear in the two coefficient sets and harder than first-integral search; Pegasus therefore implements Man's `ps_1` and `new_ps_1` algorithms (Section 4.4.2, pp. 19–20). The paper says that deciding whether an arbitrary polynomial ODE has a Darboux polynomial remains open (Section 4.4.2, p. 20).

Multiple Darboux polynomials yield a rational first integral when an integer vector `λ` solves `Σ λi αi = 0`. The paper's theorem defines `rλ = p1^λ1 … pk^λk` and proves its derivative is zero (Section 4.4.3, p. 21). Its six-step combination procedure is explicit: generate Darboux polynomials; build sign-invariant cells; prune cells missing initial or unsafe states; restrict each remaining cell; solve the cofactor equation and form rational integrals; optimize their values to refine each cell; then increase degree if conflicts remain (Section 4.4.3, p. 23).

Inference: Verus should avoid division in executable proofs where possible. On a cell with a proved nonzero denominator, state the rational invariant as a cross-multiplied polynomial equality and prove preservation by multiplication. Sign-cell pruning and degree search are ghost/offline work. The paper's rational function is undefined at denominator zero, so the nonzero-domain precondition must remain explicit.

## technique: barrier certificates

A barrier certificate is a differentiable `p` whose sublevel set `p ≤ 0` contains the initial states and excludes unsafe states. Pegasus supports convex barriers with `p' ≤ 0`, exponential barriers with `p' ≤ λp`, and vector barriers (Section 4.4.4, p. 24). It searches polynomial templates with sum-of-squares (SOS) or linear programming (LP). For an exponential barrier, the paper's constraints are `Init → p ≤ 0`, `Unsafe → p > 0`, and `p' ≤ λp` (Section 4.4.4, p. 25). SOS strengthens these to polynomial identities with SOS multipliers and a positive margin ε; semidefinite programming finds numerical coefficients. Pegasus rounds the result and checks the exact candidate with real quantifier elimination because the numerical candidate can be false. The paper's cautionary example shows a candidate that looks invariant in a small plot but fails at larger values (Section 4.4.4, pp. 25–26).

Inference: in Verus, encode the barrier as a ghost predicate and prove initial inclusion, unsafe exclusion, and preservation for the actual transition relation. SOS and LP remain candidate synthesis tools; rounded coefficients are untrusted until Verus proves the exact inequalities. A nonlinear real proof may need auxiliary lemmas or bounded integer arithmetic.

## technique: differential saturation

Differential saturation loops through methods in increasing cost, strengthening the evolution domain with each found invariant until safety is proved. The paper says it “orders the methods by computational efficiency, e.g. it first searches for first integrals, followed by Darboux polynomials and barrier certificates.” (Section 5.1, p. 27.) Its example first finds `x1 > 0`, then qualitative analysis finds `x2 > 0` under that restriction, then a degree-two barrier completes the proof. Pegasus records the construction order as proof hints so KeYmaera X can prove each conjunct with the appropriate tactic (Section 5.1, p. 28). Four configuration options control auto-reduction, heuristic search, budget redistribution, and subsystem splitting.

Inference: a Verus workflow can mirror this as a staged invariant synthesizer: cheap algebraic predicates first, then stronger lemmas, while preserving each discovered fact in the loop invariant. The proof-hint idea maps to explicit lemma ordering and trigger control, but Verus's solver behavior is different.

## technique: differential divide-and-conquer

The differential divide-and-conquer rule uses a polynomial `p` that is invariant for both forward and backward ODEs. It partitions the state space into `p < 0`, `p = 0`, and `p > 0`, then solves each restricted subproblem separately (Section 5.2, p. 29). Pegasus replaces the rational-integral procedure's refinement steps with a call to differential saturation on each unpruned conflict cell. In the example, two cells are trivial because they contain no unsafe states, while the `x1 > 0` cell needs a barrier (Section 5.2, pp. 29–30).

Inference: in Verus, prove a partition predicate is stable under transitions, split the proof by cases, and discharge each case with a smaller invariant. The backward-flow premise has no direct Rust analogue; for a discrete transition, stability of the partition under both predecessor and successor reasoning must be proved explicitly.

## evidence, trust, and limits

The evaluation uses 150 continuous safety problems: 71 two-dimensional, 30 three-dimensional, 35 dimensions four through sixteen, and 14 randomly formed product systems (Section 6.1, p. 30). The paper reports that differential saturation solves 16 additional problems that no individual method solves, including 7 product systems (Section 6.2.1, p. 32). It reports that generation usually dominates proof duration and that qualitative analysis and first integrals are often fastest, followed by Darboux polynomials and barrier certificates (Section 6.2.1, p. 32). The experiments ran on a 2019 MacBook Pro with Mathematica 12.1, MATLAB 2019b, and SOSTOOLS 3.03 (footnote 18, p. 31). These denominators and settings apply to the 150-problem suite; the paper itself calls the evaluation “a qualitative evaluation” (Section 6, p. 30).

The trusted result is the dL proof checked by KeYmaera X's core; Pegasus's numerical solvers, heuristics, and rounding are not trusted for correctness. The paper still relies on Mathematica's real quantifier elimination, and it identifies fully formal real-arithmetic witnesses as future work (Section 8, p. 37). It also says the benchmark suite is drawn from prior literature and partly uses author-designed initial and safe sets when source papers omitted them (Section 6.1, p. 30).

## techniques for the catalog

- exact discrete abstraction: partition an ODE state space by polynomial sign cells, prove cell transitions sound, and compute reachable cells as invariant candidates
- qualitative analysis: use roots, eigenvectors, Lyapunov equations, factors, Lie derivatives, and transverse forms to propose predicates
- polynomial first integrals: solve linear coefficient equations so a polynomial Lie derivative is zero, then use level-set bounds
- Darboux and rational integrals: solve cofactor equations and combine Darboux polynomials whose cofactors have an integer dependence
- barrier certificates: synthesize polynomial sublevel sets with SOS or LP, then check rounded candidates exactly
- differential saturation: sequence cheap and expensive generators while strengthening the domain and retaining proof hints
- differential divide-and-conquer: partition by a forward-and-backward invariant polynomial and solve each cell independently
