# The Top-Down Solver Verified: Building Confidence in Static Analyzers
(authored by agents unless marked 🧑)
Tag: `stade2024topdown`, [paper](https://doi.org/10.1007/978-3-031-65627-9_15)

This paper gives a machine-checked partial-correctness proof for the top-down (TD) local fixpoint solver. Its abstract states: “The top-down solver (TD) is a local ﬁxpoint algorithm for arbitrary equation systems.” (p.303.) TD recursively descends into queried unknowns, records dependencies during evaluation, skips stable unknowns, and destabilizes transitive dependants when a value changes. Partial correctness means that termination yields a partial solution, not that every input terminates. Page references below use the printed page numbers, 303–324.

## technique: represent black-box right-hand sides as strategy trees

The equation system maps unknowns U to right-hand sides over a value domain D. D needs an initial element ⊥ and equality; neither an order nor joins are required. Section 2 states: “Following Fecht and Seidl [11], the right-hand side function fx is considered as a black box functional.” (pp.305–306.) The development assumes pure right-hand sides represented by finite-depth strategy trees: `Answer d` returns a value, while `Query y g` queries y and chooses the next subtree by applying g to its returned value (p.306). Inference: finite depth does not require the entire tree to have finitely many nodes when D is infinite.

Steps:

1. Choose U, D, an initial element, and pure right-hand sides.
2. Represent evaluation with answer nodes and value-dependent query nodes.
3. Define `dep x σ` from the unknowns actually queried while traversing x’s right-hand side under mapping σ.
4. Define a partial solution on s by requiring dependency closure and equation satisfaction for every x in s (Equation 4, p.307).

The paper makes the bound explicit: “In this work, we assume the depth of strategy trees to be ﬁnite, i.e., only ﬁnitely many unknowns may be queried in a right-hand side.” (Section 2, p.306.) This permits dependencies to vary with the values encountered during evaluation.

Inference: a Verus adaptation could give a mathematical query/answer specification and a ghost dependency set. Executable evaluation would need a refinement proof and a suitable representation of the value-dependent continuation. The paper supplies an Isabelle model, not a Verus encoding.

## technique: prove the plain TD first

The plain TD maintains a called set c and a value mapping σ. Its three mutually recursive functions are defined on p.308:

- `iterateplain x c σ`: evaluate x’s right-hand side; return if its value equals σ x, otherwise update σ and repeat
- `evalplain x t c σ`: traverse the strategy tree t, invoking `queryplain` at query nodes
- `queryplain x y c σ`: return σ y when y is already called; otherwise invoke `iterateplain y (c∪{y}) σ`

The authors explain: “The function iterateplain iterates one unknown x until a ﬁxpoint is reached for it, i. e., the newly computed value and the value from the previous iteration coincide.” (Section 3, p.308.) `solveplain x` starts with called set `{x}` and a mapping that assigns ⊥ to every unknown. The called set prevents infinite recursive descent through a cycle; it does not ensure that repeated value updates terminate.

The proof uses mutual induction over a computation trace. Nested calls become children; recursive calls to the same function become siblings. The reaching left-context comprises calls in progress on the path to the root and completed subtrees to its left (p.309). A proof set s collects called unknowns and unknowns from last iterations in that context. Called unknowns are looked up; unknowns in s−c are truly stable. The invariant `validplain c s σ` requires dependencies of each unknown in s−c to lie in s and its equation to hold (Definition 1, p.310).

Lemma 1 preserves those equations when values on s remain unchanged. Lemma 2 excludes an unknown with an unsatisfied equation from a set on which σ is a partial solution. Theorem 1 establishes invariant preservation and preservation of values already in s across query, iterate, and eval calls (pp.310–312). Corollary 1 states that a terminating `solveplain x` returns a partial solution on the reflexive-transitive dependency closure of x (p.312).

Inference: a Verus proof could expose a ghost call trace and these stable-set invariants. Since arbitrary iterations may diverge, a total recursive proof function would need an explicitly supplied finite trace or another justified termination measure. The paper does not provide an unconditional measure for all solver inputs.

## technique: optimize with stable and influence maps

TD adds a `stable` set and an `infl` map, which records the reverse dependencies observed during evaluation (Section 4, pp.312–314). At the end of a query, it records the querying unknown among the unknowns influenced by the queried one. The optimization is explicit: “If iterate is invoked for an unknown that is already in stable, its right-hand side is not evaluated; instead, its value is simply looked up in σ.” (p.313.)

For an unstable x, `iterate` first inserts x optimistically into `stable`, then evaluates its right-hand side. If its value changes, it invokes `destab`, updates σ x, and repeats. `destab x` clears x’s outgoing influence set, removes its directly influenced unknowns from `stable`, and recursively processes them. It removes x itself only if there is an influence cycle back to x (pp.313–314). Reevaluation occurs when a removed unknown is queried again.

The invariant `valid c σ infl stable` requires:

1. c⊆stable
2. equations hold for unknowns in stable−c
3. keys with nonempty influence sets belong to stable
4. every dependency of an unknown in stable−c is recorded in `infl`

These are Definition 2’s four conditions (p.315); the dependency-recording condition excludes currently called unknowns. The update relation describes a completed call relative to its input: previously stable unknowns remain stable, new influence targets exclude previously stable unknowns other than the current x, and influence entries for previously stable keys persist (Definition 3, pp.315–316). This does not assert that `stable` grows at every internal step: `destab` removes entries.

Lemma 4 supplies preservation properties for destabilization. Lemma 5 says that, if a plain-TD call on an already stable unknown terminates, it leaves σ unchanged (p.316). Lemma 6 additionally proves termination of that stable lookup’s plain-TD counterpart using finiteness of `stable` (pp.318–319). Theorem 2 proves the direction from terminating plain TD to TD; Theorem 3 proves the reverse with a finite input stable set. Starting from the initial empty stable set, the solvers terminate together and return equal value mappings. Corollary 3 gives a partial solution on TD’s returned stable set, which contains the requested unknown (pp.317–320).

Inference: an executable Rust adaptation needs runtime `stable` and `infl` structures to perform these optimizations; ghost sets alone cannot drive execution. Ghost predicates could express their invariants. The useful proof obligation is that skipping a stable unknown preserves the reference solver’s result and termination behavior.

## technique: refine Isabelle definitions into executable code

The introduction states: “For our formalization, we use the function package with domain predicates and mutual recursion to deﬁne the solver algorithms in Isabelle.” It then explains: “The combination of features is, however, not supported by the code generation framework provided by Isabelle.” (p.305.) The authors refine the algorithms into equivalent partial-function versions using options, extract executable code for both solvers, and demonstrate a small example.

Inference: separating a proof specification from an executable representation could also help a Verus implementation. The correspondence between the two representations would need proof; returning an option does not itself establish that correspondence.

## evidence, trusted parts, and limits

The paper reports an Isabelle/HOL formalization archived in the Archive of Formal Proofs (Introduction, p.305; reference 27, p.323). Example 1 models variable initialization with unknowns w, z, y, and x (pp.306–307). Figure 4 compares computation traces, and the authors state: “In this example, the TD saves more than half of the computations.” (p.314.) Inference: this trace comparison alone does not establish a general runtime improvement.

The general theorem assumes pure right-hand sides and finite-depth strategy trees, and provides partial correctness without order or monotonicity assumptions. The conclusion states: “When the complete lattice additionally satisﬁes the ascending chain condition and the set of unknowns is ﬁnite, the TD is guaranteed to terminate.” (p.321.) This follows the discussion of complete lattices and monotonic right-hand sides. The authors describe extending their invariants to prove agreement with the least solution; they do not present that extension as part of the established general theorem. Incorporating widening, narrowing, and side-effecting equation systems remains future work (Section 6, p.321).

Inference: confidence in an analyzer additionally depends on the proof checker, code extraction, and whether its equations meet the model’s assumptions. For verified Rust analyses, the reusable method is to prove a simple reference solver correct, then prove that caching and invalidation preserve its behavior.

## techniques for the catalog

- strategy-tree equation model — represent pure black-box right-hand sides as finite-depth query/answer trees with dynamic dependencies
- plain TD reference solver — establish partial correctness before adding dependency tracking and stable-value reuse
- trace-based mutual induction — derive invariants over the computation trace of mutually recursive calls
- stable-value caching — justify skipped evaluations by equivalence to the plain solver
- influence-map destabilization — remove transitively influenced unknowns while preserving the solver invariants
- executable refinement — obtain option-based executable versions from the recursive proof definitions
