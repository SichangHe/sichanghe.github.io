# Local refinement typing
(authored by agents unless marked 🧑)
Tag: `cosman2017local`, [paper](https://arxiv.org/abs/1706.08007)

## scope and result

Cosman and Jhala introduce Fusion, an SMT-based local refinement-type inference algorithm for polymorphic data types and higher-order functions. The programmer supplies signatures for exported top-level functions and cyclic dependencies; Fusion infers intermediate refinements. The paper's abstract says Fusion can “predictably synthesize the most precise refinement types for all intermediate terms (expressible in the decidable refinement logic).” The method targets Haskell's refinement typing, not Rust or Verus, but its constraint-solving techniques are directly relevant to reducing proof annotations.

The evaluation uses two benchmark groups from the LiquidHaskell project totaling more than 12 KLOC (Section 6, p. 23). On the safety suite, Fusion is nearly twice as fast and uses roughly half as many qualifiers; on theorem-proving benchmarks it is more than 10 times faster and avoids false alarms that make verification possible. Table 1 gives per-benchmark denominators, code/specification sizes, qualifier counts, and end-to-end times.

## technique: generate a refinement template only where a type is unknown

Use this when local variables, polymorphic instantiations, collections, or higher-order functions need inferred types. A refinement type has a base type and a predicate, for example `Nat = {v:Int | 0 ≤ v}`. For each term whose type is not supplied, Fusion creates a fresh refinement variable `κ` scoped over the variables visible at that term. In the paper's local-variable example, the intermediate `y` receives `{ν:Int | κ(ν)}` while the surrounding input and output signatures remain explicit (Section 2.3, pp. 5–6).

Steps:
1. propagate known input, library, and output types through the expression
2. create a fresh `κ` template for each unannotated local term or polymorphic type argument
3. constrain the term's inferred type to be a subtype of its template
4. preserve the lexical variables in scope at each occurrence of `κ`
5. later solve the resulting constraints for `κ`

Verus form (Inference): use a `spec fn` predicate or a ghost type invariant for an intermediate value, and let proof lemmas establish it from the surrounding `requires` facts. Verus does not infer arbitrary refinement types, so an external generator would have to emit these predicates and lemmas. The scope restriction is still useful: state only facts over variables available at the term.

## technique: reduce typing to nested NNF Horn constraints

Fusion turns each subtype obligation into an implication between refinement variables in negation normal form (NNF), retaining the source program's binding structure. For a let-binding, one constraint relates the body to the fresh template; another relates the complete expression to its declared output. The paper explains, “Each subtyping (i.e. implication) happens under a context where the program variables in scope are bound and required to satisfy the refinements from their previously computed templates.”

Steps from Sections 2.3 and 4 (pp. 5–6, 16–18):
1. generate a structural type for each expression
2. generate a `sub` implication whenever an argument must fit a parameter, a body must fit a result, or a let-bound value must fit its template
3. encode binders as nested universal implications rather than flattening them
4. represent unknown refinements as `κ` variables in heads and bodies of Horn clauses
5. check satisfiability of the complete NNF constraint

Verus form (Inference): each implication becomes a proof obligation from a precondition and local assertions to an `ensures` fact. Nested scope corresponds to lemma parameters and `assert` blocks. The NNF/Horn representation is an off-line intermediate language, not a Verus syntax feature.

## technique: compute the strongest scoped refinement

For a refinement variable `κ`, Fusion computes the disjunction of the hypotheses under which `κ` occurs as a goal, existentially quantifying local binders. In the `dec`/`inc` example, this yields the precise intermediate fact `0 ≤ z + 1`, called an almost-natural number. The paper says, “Fusion computes an interpretation called the strongest refinements using a method inspired by the classical notion of ‘unfolding’ from the Logic Programming literature.”

Steps:
1. traverse each constraint and collect bodies whose head contains `κ`
2. turn conjunction into disjunction across independent definitions
3. turn a bound implication `∀x. p ⇒ c` into `∃x. p ∧ sol1(κ,c)`
4. replace formal parameters of `κ` with the variables in its template
5. use the resulting scoped predicate as the assignment for `κ`
6. substitute it into the remaining constraints and ask the SMT solver to check validity

The strongest assignment is exact for acyclic constraints. Fusion does not perform expensive general quantifier elimination; existential hypotheses remain in solver-friendly antecedent positions. Verus analogue (Inference): define a ghost predicate equal to the strongest postcondition of the preceding expression and prove the next operation's precondition from it. Keep the predicate as a lemma result rather than executing proof code at runtime.

## technique: preserve scope to avoid let-chain explosion

Naively unfolding a chain of `let` bindings duplicates shared predicates exponentially. Fusion computes `scope(κ,c)`, the subconstraint containing all `κ` occurrences while omitting binders whose hypotheses already hold at every use. The paper says, “This sharing crucially allows Fusion to compute the most precise solution.” (Section 2.3, p. 6) It later proves that scoped definitions preserve satisfiability (Section 5.1, p. 18).

Steps:
1. build the dependency graph of refinement variables
2. locate the smallest nested subconstraint containing all definitions and uses of `κ`
3. remove outer binders that do not mention `κ` in their hypotheses
4. compute the strongest solution only in that scope
5. substitute the solution while retaining shared outer binders

For a chain of `n` identity lets, direct unfolding duplicates a predicate exponentially, whereas the scoped solution remains linear (Section 2.4, pp. 9–10). Verus form (Inference): keep common assumptions as shared lemma parameters or invariant facts instead of copying them into every assertion. This is a proof-maintenance optimization, not a change to the mathematical property.

## technique: eliminate acyclic variables exactly

`elim1` substitutes a variable's strongest scoped solution and removes its head occurrences. When the dependency graph is acyclic, iterating this operation produces a quantifier-free refinement VC whose satisfiability is equivalent to the original constraint (Section 5.3–5.4, pp. 20–21). This gives a terminating, relatively complete solver for non-recursive inference. The paper's formal result is that “`elim1(κ, c)` is satisfiable iff `c` is satisfiable” when `κ` is acyclic.

Steps:
1. compute dependencies between `κ` variables
2. select an acyclic variable
3. compute its scoped strongest solution
4. replace body uses with that solution and head goals with `true`
5. repeat until no acyclic variables remain
6. send the residual VC to an SMT validity checker

Verus form (Inference): generate lemmas in topological dependency order. Each lemma proves one inferred predicate and discharges it before later lemmas use it. Verus itself does not expose a `κ` elimination API; this algorithm belongs in a front-end that emits ordinary Verus specifications.

## technique: cut cyclic variables and solve the remainder approximately

Cyclic constraints make satisfaction undecidable. Fusion computes a greedy feedback set of “cut variables”: it builds the strongly connected-component graph and removes variables until the remaining graph is acyclic. It eliminates all non-cut variables exactly, then invokes Liquid-style predicate abstraction on the residual Horn clauses (Section 5.5, pp. 21–22).

Steps:
1. compute the transitive dependency graph
2. find strongly connected components
3. greedily choose cut variables until every remaining component is a singleton without a self-cycle
4. eliminate non-cut variables with the exact procedure
5. solve the residual cut-variable constraints over supplied qualifiers
6. accept only assignments satisfying the original constraints

The result is conservative: a satisfying assignment proves the constraints, but failure can mean that the qualifier set is too weak. Verus form (Inference): cyclic proof dependencies require user lemmas or induction; use the cut set as the small interface where annotations are required. Do not label a failed approximate solve as a program bug without a counterexample.

## technique: infer polymorphic and higher-order collection refinements

Fusion applies the same templates to function composition and list constructors. In the composition example, it infers a middle type `0 ≤ z + 1` between `dec` and `inc`; in the iteration example, covariance lifts the constraints through `map`, so the same solution verifies `map inc . map dec` over natural-number lists (Section 2.3, pp. 8–9). This avoids requiring a full implementation specification for the higher-order combinator.

Verus form (Inference): encode a generic function's relation with a `spec fn` and prove composition lemmas over sequences. Rust generics and trait bounds provide some type structure, but value refinements still need explicit predicates and proof lemmas.

## evidence, trust, and limits

Table 1 compares Liquid (L) and Fusion (F). Safety examples include Data-Struct (1,818 code lines, 126 s L versus 94 s F), Vec-Algos (1,252, 78 versus 61), Bytestring (4,811, 233 versus 136), and Text (3,157, 349 versus 231). Qualifiers fall from 18 to 11 for Bytestring and 9 to 5 for Text. The theorem benchmarks show larger effects: Fold takes 78 s with L and 1 s with F; Sat-Solver is a Liquid false positive at 48 s but verifies with Fusion in 1 s; Unification is a false positive at 240 s versus 3 s with one Fusion qualifier. Times are total end-to-end checks on a 2.2 GHz MacBook Pro using Z3, not isolated solver calls (Section 6, pp. 23–24).

The formalism assumes call-by-value Haskell semantics and simultaneously proves termination for potentially bottom-inhabited terms. Trust remains in the refinement logic, SMT solver, Haskell semantics, and supplied top-level signatures. Fusion is relatively complete only when suitable signatures exist and, for exact elimination, when constraints are acyclic; cyclic inference is approximate and depends on qualifiers.

Inference: the threat to VL is moderate. Agents could benefit from a front-end that infers local predicates and emits Verus lemmas, reducing repetitive annotations for map-like code and wrappers. The hard boundary is unsafe Rust, aliasing, arithmetic overflow, and external effects, which are outside this paper's pure higher-order setting. VL should not redo Fusion's Haskell benchmark; it should measure whether scope-preserving predicate generation reduces proof churn in real Verus modules.

## techniques for the catalog

- scoped refinement templates: create unknown predicates only for unannotated local or polymorphic terms
- nested NNF Horn constraints: encode subtyping implications while preserving lexical scope
- strongest scoped solutions: synthesize the most precise refinement from hypotheses defining a variable
- scope-based sharing: omit redundant outer binders to prevent exponential let-chain expansion
- acyclic elimination: remove refinement variables exactly in dependency order
- cyclic cut solving: leave a feedback set for qualifier-based predicate abstraction
- higher-order lifting: propagate inferred refinements through polymorphic functions and collections
Checked 2026-10-13: audit record cosman2017local; paper-study comparison complete; gate executed; experiments not rerun
