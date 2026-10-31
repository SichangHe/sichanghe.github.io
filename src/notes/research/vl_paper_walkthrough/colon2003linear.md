# Linear Invariant Generation Using Non-linear Constraint Solving
(authored by agents unless marked 🧑)
Tag: `colon2003linear`, [paper](https://www.semanticscholar.org/paper/0d68b14e040c346fca41350f8d6e7b603604bf82)

## result and scope

Colón, Sankaranarayanan, and Sipma generate linear inductive invariants for linear transition systems by solving constraints on the unknown coefficients of a target inequality. The abstract states: “Our method, based on Farkas’ Lemma, synthesizes linear invariants by extracting non-linear constraints on the coeﬃcients of a target invariant from a program.” The method is sound and complete for the chosen class of inductive linear assertions, but solving the resulting nonlinear constraints limits practical size (abstract; §6, PDF pp. 420, 431–432).

## technique: encode a program at cutpoints

Use this for a program whose initial condition and transitions are conjunctions of linear inequalities over real-valued variables. Build a transition system with variables `V`, locations `L`, initial location `l0`, initial assertion `Θ`, and transitions `⟨l,l',ρτ⟩` (§2, p. 421). Choose a cutset `C` meeting every cyclic path. For each cutpoint `l`, posit a target assertion `η(l) = c_l1 x1 + ... + c_ln xn + d_l ≤ 0`, where the coefficients are unknown (§3, p. 424).

Enumerate basic paths. For each path from the initial location to a cutpoint, encode initiation `Θ ∧ ρπ ⊨ η(l)'`; for each path between cutpoints, encode consecution `η(li) ∧ ρπ ⊨ η(lj)'`. The paper distinguishes enabled paths, where `Θ ∧ ρπ` is satisfiable, from disabled paths, where it is unsatisfiable (§3, p. 424; the initiation and consecution conditions are Definition 2, §2, p. 422). A basic path is a simple path through no cutpoint other than its endpoints, and a path's relation `ρπ` is the composition of its transition relations (§2, p. 422). The paper's examples are declared over `integer` variables (Figures 1–3) while Farkas' lemma is stated over real-valued variables (§2, p. 423); the text I read does not discuss this gap.

Inference: a Verus implementation would express the desired assertion as a `spec fn` or predicate over a Rust state, use `requires` for the initial domain, and use a loop `invariant` for the candidate assertion. Verus does not automatically enumerate CFG paths or synthesize coefficient values from these formulas; an external synthesizer could propose constants, after which Verus checks the invariant. The transition relation and proof obligation carry over conceptually, while the paper's real-arithmetic solver does not become a Verus construct.

## technique: Farkas encoding of implication

Use Farkas' lemma to turn each linear implication into equations and non-negativity constraints over multipliers. The paper states: “Farkas’ lemma provides a sound and complete method for reasoning about systems of linear inequalities” (§2, p. 423). For antecedent rows `a_i·x+b_i≤0`, introduce nonnegative multipliers `λ_i` and `λ_0`; equate the weighted sum's coefficients to the target coefficients, with the constant adjusted by `−λ_0`. An inconsistent antecedent is represented by deriving `1≤0` (§2, pp. 423–424).

For initiation, add the unknown target row as the consequent. For enabled consecution, add a nonnegative multiplier `μ` for the existing invariant row, plus Farkas multipliers for the transition rows; the product `μ c_li` makes the coefficient system nonlinear (§3, pp. 424–425). For disabled paths, prove inconsistency instead. The running example has `i=2,j=0`, transitions adding either `(4,0)` or `(2,1)`, and target `c1 i+c2 j+d≤0`; the paper writes the resulting existential constraints as equations (1)–(3) (§3, pp. 425–426).

Inference: in Verus, the corresponding proof is a normal loop-invariant proof: establish the invariant at initialization and preserve it across each branch. A generated coefficient candidate can be encoded as constants in a `spec fn`, but Verus's supported syntax does not provide existential real multipliers or Farkas automation by itself. The paper's theorem is evidence about the external generator, not about Verus.

## technique: solve and simplify the coefficient constraints

Start with linear elimination for linear constraints. The paper lists polyhedral projection using the simplex or double-description method, and Fourier elimination, noting exponential complexity (§4, p. 427). For nonlinear constraints, use quantifier elimination such as cylindrical algebraic decomposition, then simplify with factorization and Gröbner bases; alternatively delay nonlinear rows in a linear-programming or CLP solver (§4, p. 427).

Apply low-degree heuristics before expensive elimination. The authors write: “If a polynomial P is reducible, it is always possible to reduce the degree of the constraints by splitting.” Replace `P1P2≤0` by the disjunction `(P1≤0 ∧ P2≥0) ∨ (P1≥0 ∧ P2≤0)` (§4, p. 428). When the result of elimination is too large to factorize or simplify, the paper sets some coefficients to zero, restricting target invariants to a subset of the variables; since any two-dimensional cone is finitely generated, setting sufficiently many variables to zero always yields a polyhedral cone (§4, p. 428). If all resulting polynomials are linear, the solution cone is polyhedral and its minimal generators come from the double description method; the paper reports that irreducible nonlinear polynomials have been rare in its experience, and that it knows of no efficient test for whether a cone with unfactorizable nonlinear constraints is finitely generated (§4, p. 428).

In the running example (Figure 1), the paper obtains `μ=1` or `λ1=λ2=0` by substitution and solves the `π2` consecution by factorization; after DNF conversion and removal of unsatisfiable disjuncts the generators give `−1≤0`, `−j≤0`, and `−i+2j+2≤0`, matching the invariants of Cousot and Halbwachs [7]; `−i+2≤0` follows as a consequence (§4, pp. 428–429). The method returns the set of inductive invariants characterized by generators rather than one guessed assertion. Inference: every restriction such as setting coefficients to zero should be recorded, because it can remove valid invariants (it restricts targets to a subset of the variables).

## evidence from applications

For the increment example, the approach finds `1≤i+k≤2` and `i≥1` in one iteration, while the cited abstract-interpretation analysis misses `i≥1` (§5, p. 429). For heapsort, array operations are not modeled and branches depending on arrays are nondeterministic; it finds eight paths from `l3` back to itself, the eliminated formula has no nonlinear constraint, and it obtains `l−1≥0`, `n≥3`, `r≥2`, `r≤n`, `2l−r≥0`, and `j=2i`; assuming `l≥1` it adds `2l≤j` and `2l+2r≥j+2`, matching Cousot and Halbwachs [7] (§5, pp. 429–430). For the vagrant robot, the result after quantifier elimination is too large for redlog to factorize or normalize, so the paper analyzes the expression with each coefficient set to 0, looking for invariants over at most two variables; at `l0` it obtains `t≤x≤2t` and `−t≤y≤t`, and their post image gives `t≤x≤2t`, `−t+2≤y≤t+2`, `y≤2t`, `t≥1` at `l1` (§5, p. 430). The paper says these invariants hold immediately after a discrete mode transition, that a further post-image step is needed for continuous evolution, and that “In either case, the invariants above suffice to establish the unreachability of the point y = 12, x = 9” (§5, pp. 430–431).

Inference: these are three hand-selected case studies from the literature, not a sample over programs; the paper reports no runtimes or sizes. The heapsort abstraction leaves arrays and array-dependent branch conditions outside the modeled transition relation, as the paper states. The paper's conclusion says: “The main drawback of the method is that it produces non-linear constraints.” It adds that applicability to larger systems is limited (§6, p. 431). The introduction says the constraints “can be solved only for small or medium size problem instances using current techniques” (§1, p. 421).

## techniques for the catalog

- cutpoint path encoding — choose a cutset, compose basic paths, and encode initiation and consecution for an unknown linear assertion
- Farkas coefficient synthesis — replace each linear implication with multiplier equations and nonnegative constraints
- nonlinear constraint solving — eliminate multiplier variables with quantifier elimination, factorization, roots, or CLP methods
- restriction heuristics — factor products and set selected coefficients to zero when the full result is too large
- post-image validation — compute successor assertions and account explicitly for omitted array or continuous dynamics
