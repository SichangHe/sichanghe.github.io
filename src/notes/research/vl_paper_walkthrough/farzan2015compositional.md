# Compositional Invariant Generation via Linear Recurrence Analysis
(authored by agents unless marked 🧑)
Tag: `farzan2015compositional`, [paper](http://arxiv.org/abs/1502.00138v1)

## scope and result
The paper presents linear recurrence analysis (LRA), a compositional numerical invariant generator. It represents each control-flow edge as an input/output transition formula, composes edges through a regular path expression, and summarizes loops by recurrences extracted from an abstract loop-body formula. The semantic universe is the set of "(not necessarily linear) arithmetic transition formulas" (sec. 2, PDF p. 4); formulas are linearized before the iteration operator is applied (sec. 4, PDF p. 12). The paper’s running division program proves `x = q*y + r` at the assertion. Its evaluation uses 119 loop benchmarks: 81 safe integer-only cases and 38 unsafe cases. LRA proves 71/81 safe cases (88%), LRA-Comp proves 65/81 (80%), CPAChecker 38/81 (47%), and SeaHorn 68/81 (85%); mean times are 5.4s, 3.0s, 42.4s, and 37.7s respectively (Table 1, PDF p. 14; sec. 5, PDF p. 13). On the 38 unsafe cases, LRA and LRA-Comp have no false negatives, while CPAChecker has 3 and SeaHorn 2 (sec. 5, PDF p. 13).

## technique: compositional transition-formula analysis
What: give every control-flow edge an arithmetic transition formula, then evaluate a regular expression for all paths to an assertion. Sequential composition existentially joins an intermediate state; choice is disjunction; iteration is the LRA loop operator.

When: use for arbitrary control flow, including nested or unstructured loops and branching, when a sound over-approximation is acceptable. The paper says its framework makes “the control structure of the loop irrelevant” once a body formula has been computed (sec. 1, PDF p. 2).

How:
1. Model the program as a control-flow automaton whose edges carry statements (sec. 2, PDF p. 3).
2. Build a path expression for the target location; the division example uses a regular expression with inner and outer Kleene stars (sec. 2, PDF p. 3).
3. Map an assignment or guard to a relation over unprimed pre-state and primed post-state variables; unchanged variables are expressed with `stable(X)` (sec. 2, PDF p. 4).
4. Compose `ϕ` then `ψ` as `∃x''. ϕ[x''/x'] ∧ ψ[x''/x]`; interpret choice as `ϕ ∨ ψ` (sec. 2, PDF p. 4).
5. Replace each loop star with a recurrence summary and compose the resulting formulas with the surrounding edges (sec. 2, PDF p. 5). The general iteration operator is `ϕ⍟ = (ϕ+ ∧ guard(ϕ)) ∨ (identity on all variables)`, where `ϕ+` existentially quantifies `k ≥ 1` over the closed recurrences (sec. 3.5, PDF p. 11).
6. Check that the final transition formula implies the assertion. In the example it obtains `q' ≥ 0 ∧ r' = x − q'y ∧ r ≤ y ∧ stable({x,y})`, which the paper says is "strong enough to imply" the assertion (sec. 2, PDF p. 5).

Verus form: Inference: encode the program’s state as a Rust struct, define a `spec fn` relation or summary over pre-state and post-state values, and use `requires`, `ensures`, and `invariant` on the executable loop. Inference: Verus contracts do not directly evaluate regular expressions; the path-expression composition is an invariant-generation procedure that supplies formulas to the contracts. Inference: existential intermediate states become ghost/specification variables and proof lemmas, while executable Rust remains ordinary assignments.

Evidence and limits: The division example requires proving a nonlinear transition invariant for the loop (sec. 2, PDF p. 5). LRA-Comp is "fully compositional" and gets 65/81 safe cases; LRA gets 71/81 and "uses an intraprocedural polyhedron analysis" for some contextual information (sec. 5, PDF p. 13). The abstract domain is arbitrary arithmetic formulas, which the paper says "incurs a price in performance" (sec. 6, PDF p. 15); the paper calls the resulting loop behavior an over-approximation. It assumes a satisfiable loop-body formula, and unsatisfiable bodies are summarized as zero iterations (sec. 3, PDF p. 6).

Quote: “This paper presents a compositional method for generating numerical invariants (polynomial inequalities of unbounded degree among integer and rational variables) for programs.” (sec. 1, PDF p. 2)

## technique: simple and stratified recurrence closure
What: extract equations describing variables after one body execution, then solve their closed forms over an iteration count `k`. A simple recurrence is `x' = x + c`; stratified recurrences allow a variable to depend linearly on lower-stratum induction variables.

When: use when loop updates have affine recurrence structure. Stratification handles polynomial behavior such as a counter `x` and an accumulator `y := y + x`.

How:
1. Obtain a model of `ϕbody` from an SMT solver and test whether `ϕbody` implies `x' = x + c`; this detects simple induction variables (sec. 3.1, PDF p. 6).
2. Close each simple recurrence as `x(k) = x(0) + kc` and existentially quantify `k ≥ 0` in the loop summary (sec. 3.1, PDF p. 6).
3. Compute the affine hull `aff(ϕbody)` by repeatedly obtaining models, joining their linear equalities, and excluding the current hull (Algorithm 1, sec. 3.2, PDF p. 8).
4. For stratum `N`, solve a linear system for coefficients `λ,c,d` so that `x' = x + c·y` is implied, where `y` contains induction variables from lower strata (sec. 3.2, PDF pp. 7–8). The paper says this is "simply a matter of solving a system of linear equations (e.g., using Gaussian elimination)" (PDF p. 8).
5. Sum the lower-stratum polynomial closed forms. The paper obtains `y(k) = y(0) + kx(0) + k(k+1)/2` for the loop `x := x+1; y := y+x` (sec. 3.2, PDF p. 7). Closed forms of higher strata sum polynomials, found by curve fitting (PDF p. 9).

Verus form: Inference: represent the closed form as a `spec fn` and prove it by a `proof fn` induction on `k`; use `requires` for the recurrence precondition and `ensures` for the closed form. The executable loop receives an `invariant` relating the current counter to the specification. Inference: Verus does not infer these recurrences automatically (a claim about Verus, not from the paper), so LRA’s output is a candidate invariant to encode and prove.

Evidence and limits: Stratified closed forms can be nonlinear and are used as intermediate facts before later linearization (sec. 3.2, PDF p. 7). The method relies on polynomial curve fitting for summations (PDF p. 9) and on linear algebra over the affine hull. Inference: it is limited to recurrences of the stratified form `x' = x + cy`; the paper makes no completeness claim for arbitrary nonlinear updates.

Quote: “Stratified recurrence equations generalize this idea: starting from simple recurrence equations, we solve more and more complicated recurrences using the closed forms for simpler ones.” (sec. 3.2, PDF p. 7)

## technique: linear recurrence inequalities via convex hulls
What: summarize variables without exact recurrences using inequalities over linear terms, including difference variables `δx = x' − x`. This handles nondeterministic updates such as decrementing either `x` or `y`.

When: use when no equation describes an individual variable but bounds on its change do. The example derives `x(0)−k ≤ x(k) ≤ x(0)` and analogous bounds for `y`.

How:
1. Keep exact stratified variables in `siv(ϕbody)` and introduce one difference variable for every other variable (sec. 3.3, PDF p. 10).
2. Project the loop-body formula onto differences and induction variables, then compute its convex hull with Algorithm 2: repeatedly choose a model, take a DNF cube containing it, project it, join polyhedra, and exclude the joined region (sec. 3.3, PDF p. 10).
3. Read each hull inequality as `cδ ⊲⊳ by+d`, rewrite `δ` as `x'−x`, and obtain `cx' ⊲⊳ cx+by+d` (sec. 3.3, PDF p. 10).
4. Sum the recurrence inequality for `k` iterations using already-known lower-stratum closed forms: `cx(k) ⊲⊳ cx(0) + Σ_{i<k} b·y(i) + d` (sec. 3.3, PDF p. 10).

Verus form: Inference: state each resulting inequality as a loop `invariant`, and use arithmetic proof steps or nonlinear arithmetic tactics where supported. Difference variables are ghost/specification quantities; Rust code need not store them.

Evidence and limits: The paper defines the hull so that every linear (in)equation implied by the body is also implied by the hull (sec. 3.3, PDF p. 10), but the resulting loop summary is still an over-approximation. Inference: polyhedral projection and repeated SMT model extraction can be costly; the paper gives only per-suite counts and times in Table 1, not a breakdown of this cost.

Quote: “Linear recurrence (in)equations generalize recurrence equations in two ways: first, they allow for inequalities rather than equations.” (sec. 3.3, PDF pp. 9–10)

## technique: loop guards and linearization
What: recover information from guards that recurrence equations lose, and turn nonlinear formulas into linear over-approximations before SMT processing.

How for guards: define `guard(ϕ) = (∃Var.ϕ) ∧ (∃Var'.ϕ)`. The pre-state projection captures conditions required before each iteration; the post-state projection captures conditions after one iteration. For the loop `while (x ≤ 10) {x:=x+1; y:=y+x; z:=2*x}` with body formula `x ≤ 10 ∧ x' = x+1 ∧ y' = y+x' ∧ z' = 2x'`, the paper derives `(x ≤ 10) ∧ (x' ≤ 11 ∧ z = 2x')` (sec. 3.4, PDF p. 11; the paper prints `z = 2x'`, probably a typo for `z'`). The paper suggests eliminating the quantifiers, or over-approximating quantifier elimination by the convex hull of the guard (Algorithm 2) or by optimization modulo theories to compute intervals (sec. 3.4, PDF p. 11).

How for linearization:
1. Normalize a nonlinear formula, separating it into a linear part and a set of nonlinear equations, introducing existentially quantified temporaries (sec. 4, PDF p. 12).
2. Replace nonlinear operations with uninterpreted functions and compute an affine hull; this can discover equalities such as `γ0 = γ1`.
3. Compute concrete and symbolic operand intervals with symbolic optimization, multiply intervals, and conjoin the resulting bounds. In the example this yields `2 ≤ γ1 ≤ 12`, `y ≤ γ1 ≤ 3y`, and `2x ≤ γ1 ≤ 4x` (sec. 4, PDF pp. 12–13). `lin(ψ)` is the coarse linear approximation conjoined with these discovered facts.
4. Feed the linearized formula to the iteration operator (sec. 4, PDF p. 12).

Verus form: Inference: preserve nonlinear relations directly in Verus `spec fn` contracts when the solver can handle them; otherwise use interval bounds as ghost lemmas and assert them before applying a loop invariant. The paper says its linearization "is (necessarily) a heuristic" (sec. 4, PDF p. 12), so the Verus proof must still establish that the approximation is an inductive consequence of the actual Rust code.

Quote: “Linearization is an operation that, given an (arbitrary) arithmetic formula ϕ, computes a formula lin(ϕ) which over-approximates ϕ (i.e., ϕ ⇒ lin(ϕ)), but which is expressed in linear arithmetic.” (sec. 4, PDF p. 12)

## evidence, trust, and product relevance
The measured claims are benchmark verification counts, false-negative counts, and mean/median wall-clock times in Table 1 (PDF p. 14), with denominators stated above. The paper also notes "8 benchmarks for which LRA can prove safety but which CPAChecker and SeaHorn cannot" (sec. 5, PDF p. 13). The paper says "There is generally no best approximation of a non-linear formula as a linear formula" (sec. 4, PDF p. 12). Inference: a Verus integration would treat LRA as an invariant synthesizer, not as a replacement for Verus’s proof checker. Inference: SMT Z3, Apron/New Polka polyhedra, CIL parsing, and the Rust/Verus semantics would remain trusted infrastructure; the generated formulas must be checked by Verus. Inference: this is a moderate threat reduction for agent-written arithmetic loops because it can produce strong candidates, but unsound use of an over-approximation, unsupported nonlinear operations, or a mismatch between C and Rust semantics can still yield failure or vacuous contracts.

Inference: the paper’s related-work comparison (sec. 6) suggests VL need not redo basic recurrence closure, polyhedral convex-hull projection, or guard projection as research ideas. A product would still need a Rust/Verus adapter, diagnostics for failed invariants, and specification review.

## techniques for the catalog
- compositional transition formulas — compose edge relations through regular path expressions and use loop summaries at stars
- simple and stratified recurrence closure — solve affine recurrences and layer dependent recurrences into polynomial closed forms
- convex-hull recurrence inequalities — derive bounds on difference variables when exact recurrences are unavailable
- guard projection — recover pre/post loop conditions by existentially projecting a body formula
- SMT-guided linearization — replace nonlinear terms with affine equalities and concrete/symbolic interval bounds
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The closed form of a summation of a polynomial of degree m is a polynomial of degree m + 1."): read the whole paper text and checked every quotation, the Table 1 numbers (71/65/38/68 of 81; means 5.4/3.0/42.4/37.7 s; 119 benchmarks, 38 unsafe, false-negative counts), the recurrence, hull, guard and linearization steps, and the example formulas; I changed all PDF page references (the PDF has 17 pages and the old ones were off by one to several pages), fixed the guard example loop (`y:=y+x`), rewrote the Gaussian-elimination and convex-hull exactness claims to match the paper wording, added the iteration operator definition (sec. 3.5) and the 8-benchmark claim, and marked unsupported statements about Verus, cost and completeness as Inference; I did not check the cited related work, the tool and benchmark archive, and the link is the arXiv ID printed in the paper (1502.00138v1), kept.
