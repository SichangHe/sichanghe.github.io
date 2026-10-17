# Optimization of Lyapunov Invariants in Verification of Software Systems
(authored by agents unless marked 🧑)
Tag: `roozbehani2011optimization`, [paper](http://arxiv.org/abs/1108.0170v1)

## what the paper contributes
This paper transfers Lyapunov-function reasoning and convex optimization to numerical software verification. Its abstract states, “The paper proposes a control-theoretic framework for verification of numerical software systems,” covering “absence of overflow, absence of division-by-zero, termination in finite time, presence of dead-code, and certain user-specified assertions.” (Abstract, p. 1.) The authors locate the contribution in integration, not new proofs: “it is in the systematic integration of new ideas and some well-known tools within a unified software analysis framework that we see the main contribution of our work” (Section I-A2, p. 3). A program is modeled as a discrete-time dynamical system, concretely as a graph model (nodes are code locations), a mixed-integer linear model (MILM), or a hybrid of both (MIL-GHM) (Section II, pp. 4–10).

A Lyapunov invariant is a real-valued function V of the program state satisfying the one-step inequality V(x+) − θV(x) ≤ −µ (equation (9)). Definition 4 says, “Lyapunov invariant satisfies the difference inequality (9) along the trajectories of S until they reach a terminal state X∞.” (Section III, p. 12.) Unlike a classical Lyapunov function, V need not be nonnegative or monotone (p. 12). Different side conditions on V and (θ, µ) certify different specifications: Proposition 4 (p. 13) gives finite-time termination (FTT) with an iteration bound Tu, and Theorem 1 (p. 14) gives unreachability of an unsafe set. Inference: the framework therefore turns safety or termination into finding coefficients for V.

## technique 1: model the program as a transition graph
Inference: use this when control flow has finitely many locations, as in the paper's graph model, or can be abstracted into them. The paper's construction (Section II-B2, pp. 8–10) is:

1. represent each program location as a graph node and each branch or assignment as an edge with a transition label and a passport label (a condition that must hold for the transition to be possible)
2. give the starting node the invariant set that holds the available information about initial conditions; the specification names sets X_i^- of states that must be unreachable at node i (Section III, Corollary 2)
3. add simple invariant sets, from the programmer or by propagation through invertible transitions and equality-preserving assignments
4. use the resulting node sets as assumptions in the Lyapunov search

The paper has a subsection “Construction of Simple Invariant Sets” and says they may be “provided by the programmer” or computed (Section II-B2a, p. 9). The “Invariant Propagation” and “Preserving Equality Constraints” constructions are bullets under that same subsection (p. 10). The abstraction must over-approximate the real program (Definition 2, p. 5); Proposition 2 (pp. 11–12) states that unreachability and FTT proven on the abstraction transfer to the actual program.

Inference: in Verus, encode each control-state predicate as a `spec fn` over a state model and prove transition lemmas. Rust control flow remains executable; the graph abstraction is a ghost model. Verus has no built-in convex optimizer, so coefficient synthesis must happen outside the proof and the resulting arithmetic facts must be checked by Verus lemmas.

## technique 2: choose and optimize a Lyapunov template
Inference: use this when a numeric safety or termination property can be expressed by polynomial, quadratic, or affine bounds. The paper fixes basis functions and searches for coefficients through convex optimization: the first step is “selecting a finite-dimensional linear parameterization of a candidate function V” (Section IV-A1, p. 18), with quadratic (33), affine (37) and polynomial (41) families. The paper also notes that requiring (9) only on reachable-looking states, as in (28), gives a non-convex problem, and “Such non-convex formulations are not considered in this paper.” (p. 18.)

Steps are:

1. choose basis functions, such as monomials up to a degree (41) or a quadratic form (33), over program variables
2. write V as a coefficient vector multiplying those bases
3. encode the Lyapunov inequality (9) on every transition, the initial-set constraint, and the unsafe-set constraint
4. relax non-convex constraints with the S-procedure or sum-of-squares (SOS) constraints (Section IV-A2, pp. 19–20)
5. solve an LP, SDP, or SOS program (the paper uses LMILAB, SeDuMi and YALMIP); if feasible, the coefficients are a certificate
6. optionally round coefficients and reverify the inequalities

The paper describes the certificate criterion: “If the associated optimization problem is feasible, the result is a certificate for the specification.” (Abstract, p. 1.) In the case study the invariants were found “after post-processing, rounding the coefficients, and reverifying” (Section V-A, p. 26), and footnote 1 there says, “Note that rounding is not essential.” (p. 26.)

Inference: a VL pipeline could synthesize candidate coefficients with an optimizer, emit them as Rust constants, and have Verus prove the finite set of inequalities. This is a synthesis-plus-check workflow, not a claim that Verus can trust the optimizer.

## technique 3: prove finite-time termination and boundedness
Inference: use this when each transition satisfies V(next) ≤ θV(state) − µ for some chosen θ, µ. The paper's Definition 4, Proposition 4, Theorem 1 and Corollary 1 connect such inequalities to finite-time termination and unreachability (Section III, pp. 12–15). Its IntegerDivision example uses V(dd,dr,q,r)=r and states that this “is a (1, dr)-Lyapunov invariant for IntegerDivision” (Example 3, Section III-A1, p. 14). The paper adds that this “only proves absence of infinite loops” and the program could still terminate with an overflow (p. 14).

Steps, from the theorem hypotheses:

1. FTT (Proposition 4, p. 13): V is uniformly bounded on the nonterminal states and satisfies (9), V ≤ −η ≤ 0 on the initial states (13), µ + (θ − 1)‖V‖∞ > 0 (14), and max(µ, η) > 0 (15); then the number of iterations is at most Tu given by (16)
2. unreachability (Theorem 1, p. 14): V satisfies (9) and sup of V over the initial states is less than inf of V over the states that can reach the unsafe set (17), and either θ = 1, or θ < 1 with that infimum positive (18), or θ > 1 with sup of V over initial states ≤ 0 (19)
3. overflow plus FTT together (Corollary 1, p. 15): V ≤ 0 on initial states (20) and V bounds ‖α⁻¹h(x)‖_q − 1 from above (21); termination additionally needs µ > 0 and µ + θ > 1
4. for graph models, apply the per-node version (Corollary 2, p. 16), where the iteration bound sums over simple cycles

Inference: Verus can represent V as a `spec fn`, prove edge-wise decrease with `ensures`, and use arithmetic lemmas to show a recursive `decreases` measure. The paper's real-valued optimization and SOS machinery does not carry directly to integer machine arithmetic; overflow semantics and casts need explicit contracts. The paper itself abstracts integers by reals (Example 2, p. 7) and defers fixed-point and floating-point abstractions to its report [49] (p. 6).

## evidence, trust, and limits
The evidence is worked examples, not a benchmark suite. Example 3 (IntegerDivision, p. 14) and Example 4 (a division-by-zero check on a program with `sin`, pp. 17–18) are small. Section V (pp. 24–30) analyses one program, Euclidean division (Program 4), in three ways:
- global graph model with SOS invariants found with YALMIP (p. 26): no single invariant gave both termination and boundedness; the paper says this “could not be established in one shot, at least when trying polynomials of degree d ≤ 4” (p. 27). Pairing σ2 or σ3 with σ5 or σ6 proves FTT and boundedness within [−M, M] for any M ≥ 1, with Tu = 2M² (Table III, p. 27)
- MIL-GH model solved with LMILAB and SeDuMi (Table IV, p. 28): bound γ(M) between 5.99M and 7.05M for M from 10² to 10⁶, SeDuMi returns NAN at M = 10⁶, and the iteration bound grows from Tu = 2e4 to 3e9. The authors say, “The analysis using the MIL-GHM is in general more conservative than SOS optimization over the graph model presented earlier.” (p. 28)
- modular analysis (pp. 29–30), which the authors list as needing further study of scalability and conservatism

The paper reports no common benchmark denominator or aggregate success percentage. The authors caution that “The success and efficiency of the proposed approach depend on computability of φ (·) and its subgradients.” (Section IV-A1, p. 19.) They also write that abstraction brings “conservatism of the analysis and (potentially) undecidability” (Section II-A2, p. 5).

Inference: trusted components for a reuse of this approach include the program abstraction, the numerical solver, coefficient rounding, and re-verification; the paper's Table IV NAN result shows solver failure can occur. Inference: threat to VL is medium for arithmetic-heavy code. The approach can reduce manual invariant discovery, but it does not solve heap ownership, aliasing, quantifier instantiation, or specification adequacy. VL should reuse the template-and-check split and avoid redoing a generic Lyapunov theory; a product experiment would need denominators for solved versus attempted programs and exact machine-arithmetic rechecks.

## techniques for the catalog
- transition-graph abstraction: attach state sets and edge maps to program locations before proof search
- convex Lyapunov synthesis: parameterize an invariant template and solve LP, SDP, or SOS constraints
- decrease certificates: prove edge-wise Lyapunov decrease to certify boundedness, unreachability, or finite-time termination
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The advantage of using semidefinite programming is that efficient SDP relaxations for treatment of binary variables exists, though the computational cost is typically higher than the LP-based approach."): read the whole paper text (pp. 1-37, including appendices and references); checked every quotation, page and section reference, theorem and equation conditions, and the case-study numbers (Tables II-IV) against it; changed several wrong page and section references, a quotation with a wrong word (subgradients), a misused quotation (the (28) restriction, which the paper rejects), the solver attribution (SOSTOOLS was not used for the found invariants), and added the Proposition 4, Theorem 1 and Corollary 1 conditions; marked own conclusions "Inference:". Did not check: the proofs in Appendix II, the cited references, the matrices of the MILM examples, or the Matlab code and extended report [49].
