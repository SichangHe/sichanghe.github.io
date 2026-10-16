# Experiments in Verification of Linear Model Predictive Control: Automatic Generation and Formal Verification of an Interior Point Method Algorithm
(authored by agents unless marked 🧑)
Tag: `davy2018experiments`, [paper](https://doi.org/10.29007/qt5j)

## scope and result
The paper generates a problem-specialized primal interior-point method (IPM) for linear-programming model-predictive control (MPC), emits C plus ACSL contracts and lemmas, and proves the generated contracts with Frama-C and Alt-Ergo. The abstract states: “This paper proposes to revisit the code generation of an interior point method (IPM) algorithm, an efficient family of convex optimization, focusing on the proof of its implementation at code level.” (abstract, p. 290). It also states: “Since the algorithm is complex, additional lemmas are also produced, allowing the complete proof to be checked by SMT solvers only.” (abstract, p. 290).

The verified mathematical setting is real arithmetic, a primal IPM for bounded linear programs. Floating-point error is explicitly excluded. The generated solver is instance-specific: dimensions and known coefficients are specialized before proof.

## technique 1: specialize code and contracts together

what it is and when to use it

The generator takes a convex problem, canonicalizes it, chooses a fixed bound for a loop of IPM iterations, and emits code, ACSL annotations, and proof artifacts as one product. This is useful when a deployed controller has fixed dimensions and parameters known at generation time.

how to apply it

1. Express the MPC instance as a linear program `min c^T x` subject to `A x <= b` (section 1, Eq. 2).
2. Compute the required iteration bound from the stopping precision and specialize array sizes and constants (section 3.1).
3. Generate a `for` loop implementing the Newton updates, rather than an unbounded while loop; the paper says the generated code “follows strictly the algorithm presented in the previous section for each iteration steps” (section 3.1, p. 295).
4. Emit ACSL preconditions, postconditions, loop invariants, and intermediate lemmas for each generated function (sections 3–4).
5. Submit every goal to Frama-C/Alt-Ergo (section 5).

Verus form (inference)

Inference: a Verus generator can specialize Rust array lengths and constants, then emit `requires`, `ensures`, and `invariant` clauses on a bounded `while` loop. A mathematical predicate such as ACC should be a `spec fn`; helper proofs should be `proof fn` and called only in proof context. Rust arithmetic and array operations must be modeled with Verus-supported types and explicit bounds; ACSL syntax does not carry over.

Evidence

The authors report that “all proofs are performed, at code level, using SMT-solvers only” (section 1, p. 292). In the experiment, about 100 random instances were generated for each `(n,m)` pair with `n ∈ [2,4]` and `m ∈ [3n,5n)`; each goal was tried with one- and ten-second timeouts (section 5.2, p. 303). For `(n,m)=(3,9)`, total proof time ranged from 124 s to 127 s across instances (section 5.2, p. 303). Figure 11 reports an instance of size `5 × 33` with 195 goals, all proved: “the analyzed instance of size 5 × 33 produces 195 goals, all proved.” It groups goals by solver limits of 1 s, 10 s, 50 s, 150 s, and 500 s; these are per-goal timeout categories, not total proof times (Figure 11, p. 304). The stated generated goal count is `129 + 18n + 3m + 9n²` (section 5.2, p. 303). Inference: substituting `(n,m)=(5,33)` gives 543 goals, inconsistent with the caption’s 195 if its dimensions use the same convention. The paper does not explain the difference.

limits and trust

The paper says: “The considered setting is a primal IPM solving a LP problem.” (section 1, p. 292). The authors write: “We deliberately choose to ignore:” and then list soundness of Cholesky, gradient/Hessian validation, matrix algebra properties, and optimization theorems (section 5.1, p. 302). Those facts are axiomatized, so the proof establishes correctness conditional on them. The analytic center is assumed to exist and must be supplied or computed by a separate algorithm (section 2, Remark 2, p. 295; section 5.1, pp. 302–303). Floating-point behavior is outside the result (sections 1 and 7).

## technique 2: decompose array proofs into element contracts

what it is and when to use it

Large matrix expressions overwhelm SMT encodings. The paper wraps each element operation in a small function with a contract, allowing solvers to reason about calls abstractly.

how to apply it

1. Identify a matrix operation whose postcondition contains many array accesses (section 4.3).
2. Encapsulate one-element access/update in a function.
3. State the element-level relation using `\old` for the pre-state; the paper gives `mat_get(MatVar(dX,2,1),0,0) == mat_get(\old(mat_scal(MatVar(cholesky,2,1),-1.0)),0,0)` (section 4.3, p. 300).
4. Prove the small goals first; let the caller contract summarize the whole matrix operation.

Verus form (inference)

Inference: represent matrices as `Seq` or fixed-size arrays and prove a per-index lemma. Use Verus’s supported pre-state expressions where a mutable-argument contract needs them; `old` is specification notation rather than a runtime function. This paper does not specify Verus’s placement rules. Keep the matrix-level function opaque to the SMT solver through its contract, while exposing an index lemma.

Evidence and limits

The paper says that “These generated goals are small enough for SMT.” (section 4.3, p. 301). Sparse matrices may generate optimized code but “are likely to generate harder problem for the solvers” (section 5.2, p. 303). The abstraction does not prove the underlying numerical theorem if it is listed among asserted axioms.

## technique 3: proof trees of intermediate lemmas

what it is and when to use it

A high-level IPM postcondition is split into a tree of definitional and algebraic lemmas, each small enough for SMT. For `update_t`, the paper introduces `update_t_ensures1`, then expands ACC and proves norm identities and triangle-inequality steps through `update_t_ensures1_l1`, `_l2`, and `_l3` (section 4.4, pp. 301–302).

how to apply it

1. State the desired postcondition as a top-level lemma.
2. Add a lemma expressing the algorithmic update (for example `dt = γ / ‖c‖*_x` (the star denotes the paper’s local norm)).
3. Expand the mathematical definition of the invariant into a separate lemma.
4. Split the expansion into independent facts: preserve the old ACC bound, bound the increment, and combine them with a norm inequality.
5. Generate dependencies so each lemma is discharged before its parent (section 4.4).

Verus form (inference)

Inference: use `proof fn` lemmas with `requires`/`ensures`; call them from a proof block or `assert` chain. Keep the loop invariant as a predicate and prove each update lemma separately. Verus does not accept ACSL quantifier syntax or a `lemma` keyword.

Evidence

The authors explain: “Step by step, we introduce new lemmas to prove the previous ones” (section 4.4, p. 301). The entire chain is checked by Alt-Ergo after generation (section 5). This is effective for solver automation but leaves the asserted axioms trusted.

## technique 4: explicit convergence invariants and a bounded loop

The paper defines the Approximate Centering Condition (ACC) by `‖tc + F′(x)‖*_x ≤ β`, with local norm `‖y‖*_x = sqrt(yᵀ F″(x)⁻¹ y)` (Definitions 5–6, p.294). It chooses the increment `dt = γ / ‖c‖*_x` and the Newton update `dX = −F″(X)⁻¹((t+dt)c + F′(X))` (Eqs.9,13). Theorem 1 supplies conditions on β and γ under which the update preserves ACC. These are mathematical assumptions supporting the code proof, not measured floating-point guarantees.

How the paper applies it: compute `klast(ε)` from a convergence bound, generate a bounded `for` loop, and maintain feasibility, ACC, and a lower bound on t given by a geometric progression (section 3.1, p.295; Figure 7, p.298). The paper says: “We need three invariants for our pathfollowing algorithm.” (section 3.3, p.298) Intermediate contracts divide the t update from the x update; the former weakens ACC to β+γ and establishes growth of t, and the latter restores the required ACC bound (section 3.3, p.299; Theorem 1, p.294). The output contract requires a feasible point whose cost is ε-close to the axiomatized optimum. This technique is useful when a convergence theorem gives a predictable iteration bound.

Verus form (Inference): express feasibility, the centering bound, and the progress bound as specification predicates; prove their initialization and preservation with separate lemmas. A bounded Rust loop alone proves neither convergence nor the accuracy of machine arithmetic. The real-number norms and optimization facts would need a suitable formal model or explicit assumptions.

## technique 5: generated static storage to simplify alias reasoning

The implementation replaces local variables and function arguments with global static variables so distinct static arrays cannot overlap (section 4.2, p.300). The authors write: “Another more pragmatic approach amounts to substitute all local variables and function arguments with global static variables.” Each variable is prefixed with its owning function’s name. This avoids a more complex alias model and helps compute the memory footprint; contracts also specify modified locations with ACSL `assigns` (Figure 5, p.297). The paper acknowledges reduced readability and access to globals from any function.

Verus form (Inference): reuse the objective of simplifying ownership and framing, rather than mechanically copying global storage. Distinct owned arrays and explicit mutable borrows may provide a clearer Rust encoding. Any shared storage still needs contracts describing what a call may change. The paper does not evaluate this Rust adaptation.

## what is proved, measured, and trusted

The proved artifact is the generated real-arithmetic C implementation’s ACSL contracts, including termination by a fixed loop bound and functional properties of the specialized IPM. Measured are solver time, goal count, and timeout categories on random LP instances; denominators are the stated approximately 100 instances per `(n,m)` pair and one goal per generated proof obligation. Trusted are Frama-C’s weakest-precondition translation, Alt-Ergo’s correctness, the ACSL axioms, and all omitted numerical and optimization theorems.

Inference: for agent-written verified Rust, the main threat is specification drift during generation: a generator can emit a contract that is internally consistent but does not describe the intended controller. The paper’s instance specialization and proof-tree strategy are directly reusable; its axiomatized numerical layer must be replaced by proved Verus lemmas or explicitly bounded assumptions.

## prior work VL should not redo

Inference: the paper already demonstrates automatic instance-specific contract generation, element-level matrix abstraction, and SMT-friendly lemma trees for numerical code. VL should reuse these patterns rather than invent another generic proof script. It should separately address floating-point error and validate the mathematical axioms, which this paper leaves open.

## techniques for the catalog

- instance-specialized autocoding: generate fixed-dimension code, contracts, and proof lemmas from one optimization instance
- element-contract abstraction: hide large matrix expressions behind per-element contracts
- intermediate-lemma proof tree: split a difficult numerical postcondition into solver-sized definitional and algebraic lemmas
- convergence invariants: maintain feasibility, approximate centering, and a geometric progress bound in a statically bounded loop
- static storage and framing: use distinct generated arrays and modifies clauses to simplify memory reasoning

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "A more efficient approach is to associate small pieces of code with local contracts; these intermediate annotations acting as cut-rules in the proof processes."): read the entire supplied 17-page paper text (printed pp.290–306), including references, and the entire study; compared quotations, formulas, experiment counts, page references, and technique steps; corrected page locations, loop-generation wording, the element-access expression, and timeout interpretation, recorded the apparent goal-count inconsistency, added convergence-invariant and static-storage techniques, and labeled Verus advice as inference; did not run the generator, Frama-C, Alt-Ergo, or Verus, independently prove the mathematical axioms, validate cited work, or visually inspect PDF figures.
