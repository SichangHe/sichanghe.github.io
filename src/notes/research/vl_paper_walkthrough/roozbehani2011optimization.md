# Optimization of Lyapunov Invariants in Verification of Software Systems
(authored by agents unless marked 🧑)
Tag: `roozbehani2011optimization`, [paper](http://arxiv.org/abs/1108.0170v1)

## what the paper contributes
This paper transfers Lyapunov-function reasoning and convex optimization to numerical software verification. Its abstract states, “The paper proposes a control-theoretic framework for verification of numerical software systems,” covering “absence of overflow, absence of division-by-zero, termination in finite time, presence of dead-code, and certain user-specified assertions.” (Abstract, p. 1.) A program is modeled as a finite graph or mixed-integer linear model, with state transitions and invariant sets attached to nodes.

A Lyapunov invariant is a real-valued function V of program variables satisfying a one-step inequality. Definition 4 says, “Lyapunov invariant satisfies the difference inequality (9) along the trajectories of S until they reach a terminal state X∞.” (Section III, p. 9.) If V is bounded on nonterminal states and decreases by a positive amount, level sets cannot contain an infinite execution. The framework therefore turns safety or finite-time termination into finding coefficients for V.

## technique 1: model the program as a transition graph
Use this when control flow is finite-state or can be abstracted into finitely many modes. The paper's construction (Section II, pp. 4–8) is:

1. represent each program location as a graph node and each branch or assignment as an edge with a transition map
2. attach an initial invariant set to the entry node and terminal or error sets to designated nodes
3. propagate simple invariant sets through deterministic, invertible, or equality-preserving transitions
4. use the resulting node sets as assumptions in the Lyapunov search

The paper lists “Construction of Simple Invariant Sets” and describes programmer-supplied or readily computable sets (Section II-B2a, p. 8). It also gives invariant propagation and equality-preservation constructions (Section II-B2b–c, pp. 8–9).

Inference: in Verus, encode each control-state predicate as a `spec fn` over a state model and prove transition lemmas. Rust control flow remains executable; the graph abstraction is a ghost model. Verus has no built-in convex optimizer, so coefficient synthesis must happen outside the proof and the resulting arithmetic facts must be checked by Verus lemmas.

## technique 2: choose and optimize a Lyapunov template
Use this when a numeric safety or termination property can be expressed by polynomial, quadratic, or affine bounds. The paper parameterizes V as a linear combination of basis functions and searches for coefficients through convex optimization. Section IV-A says, “chances of finding a Lyapunov invariant are increased when (9) is only required on a subset of X\\X∞.” (Section IV-A, p. 20.)

Steps are:

1. choose basis functions, such as monomials up to a degree or quadratic forms, over program variables
2. write V as a coefficient vector multiplying those bases
3. encode the Lyapunov inequalities, initial-set constraints, and terminal-set constraints
4. relax nonlinear constraints with the S-procedure or sum-of-squares (SOS) constraints when needed
5. solve an LP, SDP, or SOS program; if feasible, retain the coefficients as a certificate
6. round coefficients if desired and reverify the inequalities

The paper describes the certificate criterion: “If the associated optimization problem is feasible, the result is a certificate for the specification.” (Abstract, p. 1.) It says rounding is optional in the graph examples (Section IV-C, pp. 29–31).

Inference: a VL pipeline could synthesize candidate coefficients with an optimizer, emit them as Rust constants, and have Verus prove the finite set of inequalities. This is a synthesis-plus-check workflow, not a claim that Verus can trust the optimizer.

## technique 3: prove finite-time termination and boundedness
Use this when every transition decreases V by at least μ or contracts it by θ. The paper's Definition 4 and Corollary 1 connect such inequalities to finite-time termination and unreachability (Section III, pp. 9–12). Its IntegerDivision example uses V(dd,dr,q,r)=r and states that this “is a (1, dr)-Lyapunov invariant for IntegerDivision” (Section III-C, p. 11).

Steps:

1. prove V satisfies the initial bound and is uniformly bounded away from negative infinity
2. prove V(next state) ≤ θV(state) − μ on every applicable edge
3. show terminal or error states are separated by a level set of V
4. conclude boundedness, unreachability, or finite-time termination from the theorem's hypotheses

Inference: Verus can represent V as a `spec fn`, prove edge-wise decrease with `ensures`, and use arithmetic lemmas to show a recursive `decreases` measure. The paper's real-valued optimization and SOS machinery does not carry directly to integer machine arithmetic; overflow semantics and casts need explicit contracts.

## evidence, trust, and limits
The paper gives symbolic case studies including IntegerDivision, Euclidean division, and graph models, with invariants found by SeDuMi, LMILAB, YALMIP, or SOSTOOLS (Sections IV-B–C, pp. 23–35). It reports no common benchmark denominator or aggregate success percentage; feasibility and displayed invariant formulas are the evidence. The authors caution that “The success and efficiency of the proposed approach depend on computability of φ (·) and its subgradient.” (Section IV-A, p. 20.) Trusted components include the program abstraction, numerical solver, coefficient rounding, and re-verification assumptions.

Inference: threat to VL is medium for arithmetic-heavy code. The approach can reduce manual invariant discovery, but it does not solve heap ownership, aliasing, quantifier instantiation, or specification adequacy. VL should reuse the template-and-check split and avoid redoing a generic Lyapunov theory; a product experiment would need denominators for solved versus attempted programs and exact machine-arithmetic rechecks.

## techniques for the catalog
- transition-graph abstraction: attach state sets and edge maps to program locations before proof search
- convex Lyapunov synthesis: parameterize an invariant template and solve LP, SDP, or SOS constraints
- decrease certificates: prove edge-wise Lyapunov decrease to certify boundedness, unreachability, or finite-time termination
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
