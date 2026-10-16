# The Top-Down Solver Verified: Building Confidence in Static Analyzers
(authored by agents unless marked 🧑)
Tag: `stade2024topdown`, [paper](https://doi.org/10.1007/978-3-031-65627-9_15)

This paper gives a machine-checked partial-correctness proof for the top-down (TD) local fixpoint solver used in static analyzers. A solver receives an equation system whose right-hand sides may discover dependencies while evaluating. The TD recursively descends into queried unknowns, caches stable values, and destabilizes transitive dependants after a change. The abstract states: “The top-down solver (TD) is a local ﬁxpoint algorithm for arbitrary equation systems.” (Abstract, PDF p.1.) Partial correctness means that, if TD terminates, its result is a partial solution for the unknowns reached.

## technique: represent black-box right-hand sides as strategy trees

Use this when an equation solver must support dynamically varying dependencies. Let U be unknowns and D abstract values with bottom ⊥. Represent each pure right-hand side as a finite strategy tree: `Answer d` or `Query y g`, where g chooses the next subtree from the value returned for y (Section 2, PDF pp.2–3). A system is T: U→strategy-tree. Define `dep x σ` as the unknowns encountered while evaluating T x under mapping σ; a partial solution on s requires closure under reflexive-transitive dependencies and equation satisfaction (Equation 4, p.3).

Steps:

1. Choose U, D, bottom, and pure strategy trees.
2. Define evaluation of an answer node and query node under the current σ.
3. Compute dependencies from the actual traversal, rather than a predeclared graph.
4. State the partial-solution predicate over the reached dependency closure.

The paper’s motivation is explicit: “Fecht and Seidl [11], the right-hand side function fx is considered as a black box functional.” (Section 2, p.3.) Purity is required; side effects are outside this development. Finite strategy-tree depth bounds each right-hand-side evaluation.

Verus form (Inference:): encode strategy trees as a recursive datatype and evaluation as a `spec fn` over an immutable map. Use a ghost `dep` set and prove evaluation preserves a `decreases` measure (tree height). Model purity by making the function depend only on the tree and σ. If executable evaluation is needed, prove its result refines the spec function.

## technique: prove the plain TD first

Use this staged proof when optimization obscures the solver invariant. The plain TD maintains a called set c (to stop recursive descent) and mapping σ. Its mutually recursive functions are:

- `iterateplain x c σ`: evaluate x; if the new value differs from σ x, update σ and recurse until equal
- `evalplain x t c σ`: traverse a strategy tree
- `queryplain x y c σ`: look up σ y when y∈c; otherwise call `iterateplain y (c∪{y}) σ`

The paper gives the core update: “The function iterateplain iterates one unknown x until a ﬁxpoint is reached for it, i. e., the newly computed value and the value from the previous iteration coincide.” (Section 3, PDF p.4.) `solveplain` starts with `{x}` and bottom mapping.

The proof follows the computation trace, a tree of calls. For each trace node, define a set s of unknowns in the reaching left-context that are stable under re-evaluation. The key invariant `validplain c s σ` requires (i) dependencies of each truly stable unknown remain in s and (ii) T x σ = σ x for each x∈s−c (Definition 1, PDF p.6). The proof uses mutual induction over query, iterate, and eval calls; Lemma 1 preserves partial solutions after updates, and Lemma 2 shows a changed value cannot belong to s. On termination with c empty, Corollary 1 yields a partial solution for the reached closure.

Verus form (Inference:): write three mutually recursive proof/spec functions with explicit decreasing measures, or use an iterative executable loop plus ghost trace. Maintain `validplain` as a loop invariant over ghost sets/maps. Prove that any update preserves stable equations and that the final called set is empty. The trace induction is a proof device; production Rust need only execute the solver.

## technique: optimize with stable and influence maps

Use this when repeated evaluation is expensive and dependencies can change. The full TD adds:

1. `stable`, the set of unknowns whose current values need not be reevaluated
2. `infl`, a reverse dependency map recording which unknowns are influenced by each queried unknown
3. `destab`, which recursively removes all transitive dependants from stable when a value changes

A query records its parent in `infl`; `iterate` returns σ x immediately when x is stable, otherwise optimistically inserts x into stable, evaluates it, and calls `destab` if the value changed. The paper states: “If iterate is invoked for an unknown that is already in stable, its right-hand side is not evaluated; instead, its value is simply looked up in σ.” (Section 4, PDF p.8.)

The crucial TD invariant `valid c σ infl stable` requires called⊆stable, stable equations hold outside c, nonempty influence-map keys lie in stable, and every dependency of a stable unknown is recorded in `infl` (Definition 2, PDF p.10). The update relation requires stable to grow, old influence entries to persist for old stable nodes, and new dependencies to involve only unstable nodes or the current x (Definition 3, p.10).

Prove `destab` is both thorough and specific: it removes every possibly outdated stable node, but does not remove an unaffected stable node. Lemma 4 establishes preservation of the TD invariant. Lemma 5 shows stable lookups return exactly the value plain TD would compute. Theorem 2 proves that termination of plain TD implies termination of TD with the same value; Theorem 3 proves the converse under finite stable; Corollary 2 concludes equivalence and Corollary 3 gives TD partial correctness (PDF pp.11–13).

Verus form (Inference:): store `stable` and `infl` in ghost sets/maps alongside executable σ. Specify `destab` with postconditions stating the removed set is exactly the transitive influence closure and that unaffected stable nodes remain. Use map/set extensionality lemmas and a termination variant based on the finite stable set. Do not treat destabilization as an unproved optimization: prove equivalence to the plain solver first.

## technique: refine Isabelle definitions into executable code

The Isabelle function package supports domain predicates and mutual recursion but its code generator cannot directly extract this combination. The authors therefore prove the abstract algorithms, then refine them to equivalent partial-function versions returning options for code generation (Introduction, PDF p.2). They extract executable programs for both plain TD and TD and run a small example.

Verus form (Inference:): similarly separate a mathematically convenient `spec fn` from executable Rust with explicit `Option`/result states. Prove a refinement lemma that every executable step corresponds to a spec step and that termination/error behavior is preserved. This keeps code-generation restrictions from weakening the proof model.

## evidence, trusted parts, and limits

Evidence is formal rather than statistical: the Isabelle/HOL development proves the stated partial-correctness and equivalence theorems and is archived publicly. The paper demonstrates the solver on a variable-initialization equation system with unknowns w,z,y,x (Example 1, PDF p.3) and a computation trace; it reports that in this example TD skips more than half of the computations (Section 4, p.9), but gives no benchmark denominator or runtime table. The formal guarantees assume pure right-hand sides, finite strategy-tree depth, and termination when partial correctness is invoked. For complete correctness, the authors note that complete lattices, monotonic right-hand sides, finite unknown sets, and an ascending-chain condition suffice for termination (Conclusion, PDF p.13). Widening, narrowing, and side-effecting equation systems remain future work.

What is proved: if TD terminates, its stable values satisfy the reached equations; TD and plain TD terminate together and return the same result. What remains trusted: Isabelle’s kernel and extraction toolchain, the purity/modeling assumptions, and any external analyzer that supplies equation systems. The paper does not prove least-fixpoint optimality for arbitrary domains; that needs additional order/monotonicity assumptions.

Inference: this is a strong pattern for VL’s verified Rust analyses. Agent-written optimizations should be proved equivalent to a simpler reference algorithm, with computation-trace invariants exposing hidden mutable state. The threat to a product is moderate: an incorrect dependency cache or invalidation policy can silently reuse stale proofs, while a too-conservative `destab` harms performance. Existing work already provides the TD proof architecture; VL should reuse its staged invariant method rather than invent another generic fixpoint proof without a concrete gap.

## techniques for the catalog

- strategy-tree equation model — represent pure black-box right-hand sides as finite query/answer trees with dynamic dependencies
- plain TD reference solver — prove recursive descent and fixpoint iteration correct before optimization
- trace-based mutual induction — derive invariants over the computation trace of mutually recursive calls
- stable-value caching — skip reevaluation when an unknown depends only on unchanged stable values
- influence-map destabilization — invalidate transitive dependants precisely after a value changes
- executable refinement — extract option-based executable code from a proof-friendly recursive specification
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
