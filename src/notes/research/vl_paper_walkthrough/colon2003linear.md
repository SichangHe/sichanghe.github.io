# Linear Invariant Generation Using Non-linear Constraint Solving
(authored by agents unless marked 🧑)
Tag: `colon2003linear`, [paper](https://www.semanticscholar.org/paper/0d68b14e040c346fca41350f8d6e7b603604bf82)

## result and scope

Colón, Sankaranarayanan, and Sipma generate linear inductive invariants for linear transition systems by solving constraints on the unknown coefficients of a target inequality. The abstract states: “Our method, based on Farkas’ Lemma, synthesizes linear invariants by extracting non-linear constraints on the coeﬃcients of a target invariant from a program.” The method is sound and complete for the chosen class of inductive linear assertions, but solving the resulting nonlinear constraints limits practical size (abstract; §6, PDF pp. 420, 431–432).

## technique: encode a program at cutpoints

Use this for a program whose initial condition and transitions are conjunctions of linear inequalities over real-valued variables. Build a transition system with variables `V`, locations `L`, initial location `l0`, initial assertion `Θ`, and transitions `⟨l,l',ρτ⟩` (§2, p. 421). Choose a cutset `C` meeting every cyclic path. For each cutpoint `l`, posit a target assertion `η(l) = c_l1 x1 + ... + c_ln xn + d_l ≤ 0`, where the coefficients are unknown (§3, p. 424).

Enumerate basic paths. For each path from the initial location to a cutpoint, encode initiation `Θ ∧ ρπ ⊨ η(l)'`; for each path between cutpoints, encode consecution `η(li) ∧ ρπ ⊨ η(lj)'`. The paper distinguishes enabled paths, where the antecedent is satisfiable, from disabled paths, where the antecedent is inconsistent (§2–§3, pp. 421, 424–425). This path decomposition is the first practical step: cut cycles, enumerate simple basic paths, and retain each path's composed linear relation.

Inference: a Verus implementation would express the desired assertion as a `spec fn` or predicate over a Rust state, use `requires` for the initial domain, and use a loop `invariant` for the candidate assertion. Verus does not automatically enumerate CFG paths or synthesize coefficient values from these formulas; an external synthesizer could propose constants, after which Verus checks the invariant. The transition relation and proof obligation carry over conceptually, while the paper's real-arithmetic solver does not become a Verus construct.

## technique: Farkas encoding of implication

Use Farkas' lemma to turn each linear implication into equations and non-negativity constraints over multipliers. The paper states: “Farkas’ lemma provides a sound and complete method for reasoning about systems of linear inequalities” (§2, p. 423). For antecedent rows `a_i·x+b_i≤0`, introduce nonnegative multipliers `λ_i` and `λ_0`; equate the weighted sum's coefficients to the target coefficients, with the constant adjusted by `−λ_0`. An inconsistent antecedent is represented by deriving `1≤0` (§2, pp. 423–424).

For initiation, add the unknown target row as the consequent. For enabled consecution, add a nonnegative multiplier `μ` for the existing invariant row, plus Farkas multipliers for the transition rows; the product `μ c_li` makes the coefficient system nonlinear (§3, pp. 424–425). For disabled paths, prove inconsistency instead. The running example has `i=2,j=0`, transitions adding either `(4,0)` or `(2,1)`, and target `c1 i+c2 j+d≤0`; the paper writes the resulting existential constraints as equations (1)–(3) (§3, pp. 425–426).

Inference: in Verus, the corresponding proof is a normal loop-invariant proof: establish the invariant at initialization and preserve it across each branch. A generated coefficient candidate can be encoded as constants in a `spec fn`, but Verus's supported syntax does not provide existential real multipliers or Farkas automation by itself. The paper's theorem is evidence about the external generator, not about Verus.

## technique: solve and simplify the coefficient constraints

Start with linear elimination for linear constraints. The paper lists polyhedral projection using the simplex or double-description method, and Fourier elimination, noting exponential complexity (§4, p. 427). For nonlinear constraints, use quantifier elimination such as cylindrical algebraic decomposition, then simplify with factorization and Gröbner bases; alternatively delay nonlinear rows in a linear-programming or CLP solver (§4, p. 427).

Apply low-degree heuristics before expensive elimination. The authors write: “If a polynomial P is reducible, it is always possible to reduce the degree of the constraints by splitting.” Replace `P1P2≤0` by the disjunction `(P1≤0 ∧ P2≥0) ∨ (P1≥0 ∧ P2≤0)` (§4, p. 428). If the resulting formula is too large, set selected coefficients to zero, restricting invariants to a subset of variables; in two dimensions this produces a polyhedral cone (§4, p. 428).

In the running example, substitution factors the `μ` equations into `μ=1` or zero multipliers; the final generators yield `−1≤0`, `−j≤0`, and `−i+2j+2≤0` (§4, pp. 428–429). The method therefore returns a family of invariants rather than one guessed assertion. Inference: an agent can use this as a counterexample-guided synthesis loop, but every restriction such as setting coefficients to zero must be recorded because it can remove valid invariants.

## evidence from applications

For the increment example, the approach finds `1≤i+k≤2` and `i≥1` in one iteration, while the cited abstract-interpretation analysis misses `i≥1` (§5, p. 429). For heapsort, array operations are not modeled and branches depending on arrays are nondeterministic; it obtains `l−1≥0`, `n≥3`, `r≥2`, `r≤n`, `2l−r≥0`, and `j=2i`, then additional inequalities after assuming `l≥1` (§5, pp. 429–430). For the vagrant robot, full elimination is too large; setting coefficients to zero yields pairwise invariants such as `t≤x≤2t` and `−t≤y≤t`, sufficient to show the point `y=12,x=9` unreachable after the appropriate post-image computation (§5, pp. 430–431).

These are three hand-selected case studies, not a denominator over programs. The heapsort abstraction leaves arrays and branch conditions outside the modeled transition relation; the robot needs an extra post-image step for continuous evolution. The paper's conclusion says: “The main drawback of our method is that it produces non-linear constraints.” Current nonlinear solving therefore remains the limiting assumption (§6, p. 431).

## formal boundary and relevance to VL

Theorem 2 says a `k`-linear assertion map is inductive iff it satisfies the generated constraints (§3, p. 426). Completeness is only for invariants provable by inductive linear assertions; nonconvex reachable sets may require nonlinear or nonconvex inductive assertions (§3, p. 426). Trusted components include the transition-system abstraction, arithmetic solvers, path enumeration, and the correctness of any array or continuous abstraction. Inference: this is a useful invariant proposal engine for Verus, but it does not infer Rust specifications, ownership proofs, unsafe-code models, or executable code contracts. Its product impact is therefore indirect: it can supply candidate loop facts while leaving the Rust proof and specification work unresolved.

## techniques for the catalog

- cutpoint path encoding — choose a cutset, compose basic paths, and encode initiation and consecution for an unknown linear assertion
- Farkas coefficient synthesis — replace each linear implication with multiplier equations and nonnegative constraints
- nonlinear constraint solving — eliminate multiplier variables with quantifier elimination, factorization, roots, or CLP methods
- restriction heuristics — factor products and set selected coefficients to zero when the full result is too large
- post-image validation — compute successor assertions and account explicitly for omitted array or continuous dynamics

Checked 2026-10-15 against the paper by a Codex agent for linear_invariant_generation_using_non_li_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
