# Local refinement typing
(authored by agents unless marked 🧑)
Tag: `cosman2017local`, [paper](https://arxiv.org/abs/1706.08007)

## scope and result

Cosman and Jhala introduce Fusion, an SMT-based local refinement-type inference algorithm for polymorphic data types and higher-order functions. The programmer supplies signatures for exported top-level functions and cyclic dependencies; Fusion infers intermediate refinements. The paper's abstract says Fusion can “predictably synthesize the most precise refinement types for all intermediate terms (expressible in the decidable refinement logic).” Page numbers below are the article pages 26:N of the Proc. ACM Program. Lang. version. The method is implemented in LiquidHaskell (Section 6, p. 23) and targets Haskell, not Rust or Verus. Inference: its constraint-solving techniques may be relevant to reducing proof annotations.

The evaluation uses two benchmark sets from the LiquidHaskell project totaling more than 12 KLOC (Section 6, p. 23). The paper reports that on the safety suite Fusion gives "nearly 2× speedups" and about half the qualifiers (Section 1, p. 2; Section 6, p. 23); on theorem-proving benchmarks it reports "more than 10×" speedups and, by synthesizing the most precise types, avoids false alarms so verification becomes possible. Table 1 (p. 24) gives, per benchmark, code lines, specification lines, qualifier counts, and end-to-end times for Liquid inference (L) and Fusion (F).

## technique: generate a refinement template only where a type is unknown

Use this when local variables, polymorphic instantiations, collections, or higher-order functions need inferred types. A refinement type has a base type and a predicate, for example `Nat = {v:Int | 0 ≤ v}`. Fusion creates a fresh refinement variable `κ` "for each position where the (refinement) types cannot be directly synthesized – namely, function inputs, let-binders, and polymorphic instantiation sites" (Section 4.4, pp. 16–17). In the paper's local-variable example, the let-bound `y` receives the template `{ν:Int | κ(ν)}` because `t` goes out of scope, while the surrounding input and output signatures remain explicit (Section 2.3, pp. 5–6).

Steps:
1. propagate known input, library, and output types through the expression
2. create a fresh `κ` template at each function input, let-binder, and polymorphic instantiation site
3. for a let-binding, constrain the type of the let body to be a subtype of the template (`sub(t2, t̂)` in `cgen`, Fig. 8, p. 18)
4. require the assignment for `κ` to be a predicate over variables in scope wherever `κ` appears (Section 2.3, p. 6)
5. later solve the resulting constraints for `κ`

Verus form (Inference): use a `spec fn` predicate or a ghost type invariant for an intermediate value, and let proof lemmas establish it from the surrounding `requires` facts. Inference: Verus does not infer arbitrary refinement types, so an external generator would have to emit these predicates and lemmas. The scope restriction is still useful: state only facts over variables available at the term.

## technique: reduce typing to nested NNF Horn constraints

Fusion turns each subtype obligation into an implication between refinement variables in negation normal form (NNF), retaining the source program's binding structure. In `ex1` the paper says of the two constraints, "The first relates the body of the let-in with its template; the second the body of ex1 with the specified output" (Section 2.3, p. 6). The paper explains, “Each subtyping (i.e. implication) happens under a context where the program variables in scope are bound and required to satisfy the refinements from their previously computed templates.”

Steps from Sections 2.3 and 4 (pp. 5–6, 13, 15–18):
1. traverse the term with `cgen`, returning a constraint and a template for each expression
2. generate a `sub` implication at each application (argument against parameter), each function definition (body against output type), and each let-bind (let body against the fresh template of the let-in)
3. encode binders as nested universal implications `∀x:b. p ⇒ c` rather than flattening them
4. represent unknown refinements as `κ` variables in heads and bodies of the Horn clauses
5. check satisfiability of the complete NNF constraint, which implies the term is safe (Theorem 4.8, p. 17)

The paper notes that NNF constraints generalize the flat constraint Horn clauses of Liquid Typing and that "The nesting structure of NNF permits the scope-based optimization that makes Fusion practical" (Section 4.1, p. 13). Verus form (Inference): each implication becomes a proof obligation from a precondition and local assertions to an `ensures` fact. Nested scope corresponds to lemma parameters and `assert` blocks. The NNF/Horn representation is an off-line intermediate language, not a Verus syntax feature.

## technique: compute the strongest scoped refinement

For a refinement variable `κ`, Fusion computes the disjunction of the hypotheses under which `κ` occurs as a goal, existentially quantifying local binders. In the `dec`/`inc` example, this yields the precise intermediate fact `0 ≤ z + 1`, called an almost-natural number. The paper says, “Fusion computes an interpretation called the strongest refinements using a method inspired by the classical notion of ‘unfolding’ from the Logic Programming literature” (Section 2.3, p. 6); the formal `sol1` is in Section 5.2 (pp. 18–19, Fig. 10).

Steps:
1. traverse each constraint and collect bodies whose head contains `κ`
2. turn conjunction into disjunction across independent definitions
3. turn a bound implication `∀x. p ⇒ c` into `∃x. p ∧ sol1(κ,c)`
4. at a head occurrence `κ(y)`, the solution is the conjunction of equalities between `κ`'s parameters and the actual arguments `y`
5. use the resulting predicate (computed over the scope of `κ`, next technique) as the assignment for `κ`
6. substitute it into the remaining constraints and ask the SMT solver to check validity

The paper says the simplification to `0 ≤ z + 1` is "purely for exposition" because quantifier elimination is "prohibitively expensive in practice, and hence avoided by Fusion" (Section 2.3, p. 6). The existential quantifiers are harmless to the SMT solver because they appear negatively, in antecedents, and can be removed by skolemization (p. 6). The strongest scoped solution satisfies the definitions of `κ` (Theorem 5.5, p. 19), and elimination of an acyclic `κ` preserves satisfiability (Theorem 5.9, p. 20). Verus analogue (Inference): define a ghost predicate equal to the strongest postcondition of the preceding expression and prove the next operation's precondition from it. Keep the predicate as a lemma result rather than executing proof code at runtime.

## technique: preserve scope to avoid let-chain explosion

Naively unfolding a chain of `let` bindings duplicates shared predicates exponentially. Fusion computes `scope(κ,c)`, a subconstraint of the form `∀(xi:pi) ⇒ c'` in which `κ` occurs in no `pi` and all occurrences of `κ` in `c` lie in `c'`; the omitted hypotheses are already present at all uses of `κ` (Section 5.1, p. 17, Fig. 9). Of the shared binder in the NNF constraint the paper says, “This sharing crucially allows Fusion to compute the most precise solution.” (Section 2.3, p. 6) Restricting unfolding to the scope "does not affect satisfiability" (Section 5.1, p. 17; Lemmas 5.1–5.3, pp. 17–18).

Steps:
1. descend through the constraint: into the one side of a conjunction that mentions `κ`, and through a binder `∀x:b. p ⇒ ...` when `κ` does not occur in `p`
2. stop at the first node that cannot be descended; this is the scope of `κ`
3. compute the strongest solution `sol1` only over that scope
4. substitute the solution while the omitted outer binders stay in the constraint, shared

For the paper's chain of `n` `id` lets, direct unfolding gives exponentially many copies of `0 ≤ x0` in the solution for `κi`, whereas the scoped solution is `z = x(i-1)` and the resulting VC is linear-sized (Section 2.4, pp. 9–10; Section 5.4, p. 21). The paper also says some blowup cannot be avoided in general: local refinement typing is ExpTime-hard and Boolean constraint satisfaction is ExpTime-complete (Theorem 5.12, p. 21). Verus form (Inference): keep common assumptions as shared lemma parameters or invariant facts instead of copying them into every assertion. This is a proof-maintenance optimization, not a change to the mathematical property.

## technique: eliminate acyclic variables exactly

`elim1` substitutes a variable's strongest scoped solution for its body occurrences and replaces its head occurrences with `true`. When the constraint is acyclic, iterating this operation yields a VC, a constraint with no `κ` variables, whose satisfiability is equivalent to the original constraint (Corollary 5.11, Sections 5.3–5.4, pp. 20–21). The VC may still contain existential quantifiers from `sol1`. The paper claims relative completeness "(assuming no recursion)" (Section 2.5, p. 10). The formal result is Theorem 5.9: “elim1(κ, c) is satisfiable iff c is satisfiable” when `κ` is acyclic in `c` (p. 20).

Steps:
1. compute dependencies between `κ` variables
2. select an acyclic variable
3. compute its scoped strongest solution
4. replace body occurrences with that solution and head occurrences with `true`
5. repeat until no acyclic variables remain
6. send the residual VC to an SMT validity checker

Verus form (Inference): generate lemmas in topological dependency order. Each lemma proves one inferred predicate and discharges it before later lemmas use it. Verus itself does not expose a `κ` elimination API; this algorithm belongs in a front-end that emits ordinary Verus specifications.

## technique: cut cyclic variables and solve the remainder approximately

The paper says that for cyclic constraints satisfaction is undecidable, by reduction from checking safety of while-programs, so only conservative solutions can be computed (Section 5.5, p. 21). Fusion computes a set of "cut variables" with a greedy heuristic, because the minimum set is the NP-complete minimum feedback vertex set problem: it computes the strongest connected component (SCC) digraph for `deps*(c)` and iteratively removes variables, recomputing the digraph, until each SCC has a single vertex. It eliminates all non-cut variables exactly, then solves the residual flat Horn clauses with the `solve` procedure of Liquid Typing, which uses predicate abstraction (Section 5.5, pp. 21–22, Fig. 12). In the evaluation it also marks all refinement variables in templates for top-level types as cut variables (Section 6, p. 23).

Steps:
1. compute the transitive dependency graph
2. find strongly connected components
3. greedily remove variables (the cut set) until each component has a single vertex
4. eliminate non-cut variables with the exact procedure
5. solve the residual constraints over the user-supplied qualifiers `Q` with predicate abstraction
6. `sat(c, Q)` holds if `solve` finds an assignment

The result is conservative: Theorem 5.14 (p. 22) says that if `sat(c, Q)` holds then `c` is satisfiable, and that for acyclic `c` it holds iff `c` is satisfiable. Table 1's `*` marks a false positive, "i.e. the benchmark could not be verified using the qualifiers provided as the intermediate terms have refinements not expressible using the given qualifiers". Inference: for Verus, cyclic proof dependencies require user lemmas or induction; use the cut set as the small interface where annotations are required, and do not label a failed approximate solve as a program bug without a counterexample.

## technique: infer polymorphic and higher-order collection refinements

Fusion applies the same templates to function composition and list constructors. In the composition example, it infers a middle type `0 ≤ z + 1` between `dec` and `inc`; in the iteration example, covariant list subtyping lifts the constraints through `map`, so the same strongest refinements verify `map fp . map fn` over `List Nat` (Section 2.3, pp. 8–9). Section 2.5 (p. 11) says F* with Dijkstra Monads "requires an implementation or logically equivalent strong specification of the compose operator (.), instead of the weaker polymorphic type signature required by Fusion", and that F* fails to verify `ex4`.

Verus form (Inference): encode a generic function's relation with a `spec fn` and prove composition lemmas over sequences. Rust generics and trait bounds provide some type structure, but value refinements still need explicit predicates and proof lemmas.

## evidence, trust, and limits

Table 1 (p. 24) compares Liquid (L) and Fusion (F). Safety examples include Data-Struct (1,818 code lines, 126 s L versus 94 s F), Vec-Algos (1,252, 78 versus 61), Bytestring (4,811, 233 versus 136), and Text (3,157, 349 versus 231). Qualifiers fall from 18 to 11 for Bytestring and 9 to 5 for Text, but only from 5 to 4 for Data-Struct and stay at 4 for Vec-Algos. Inference (arithmetic on Table 1): the speedups are about 1.3x, 1.3x, 1.7x and 1.5x, so the paper's "often halving the time" describes the larger benchmarks only. The paper's text says the speedup is for "the larger benchmarks (text and bytestring)" and that the times are end-to-end, so the speedup for refinement checking alone is "even greater". The theorem benchmarks show larger effects: Fold takes 78 s with L and 1 s with F; Functor 55 s versus 3 s; Monoid only 3 s versus 1 s. Liquid gives false positives (`*`, the time is that of returning the false positive) on Arith (63 s versus 5 s), Applicative (70 versus 2), Monad (35 versus 3), Sat-Solver (48 s versus 1 s), and Unification (240 s versus 3 s, with one Fusion qualifier; the other Fusion rows use none). Benchmarks ran on a MacBook Pro with a 2.2 GHz Intel Core i7 using the Z3 SMT solver; times are total end-to-end checks, not isolated solver calls (Section 6, p. 23).

The formalism uses call-by-value evaluation; the paper says it "is sound for Haskell as we also simultaneously prove termination for all potentially bottom-inhabited terms, as described in [Vazou et al. 2014b]" (Section 6, p. 23). Soundness (Theorem 4.8, p. 17) rests on the soundness of refinement typing from [Vazou et al. 2014b], which the paper cites rather than reproves. The paper's relative completeness claim is stated "assuming no recursion" (Section 2.5, p. 10); exact elimination needs acyclic constraints, and cyclic inference is approximate and depends on qualifiers (Section 5.5). Inference: trust therefore rests on the refinement logic, the SMT solver, the Haskell semantics, and the supplied top-level signatures.

Inference: the threat to VL is moderate. Agents could benefit from a front-end that infers local predicates and emits Verus lemmas, reducing repetitive annotations for map-like code and wrappers. The hard boundary is unsafe Rust, aliasing, arithmetic overflow, and external effects, which are outside this paper's pure higher-order setting. VL should not redo Fusion's Haskell benchmark; it should measure whether scope-preserving predicate generation reduces proof churn in real Verus modules.

## techniques for the catalog

- scoped refinement templates: create unknown predicates only for unannotated local or polymorphic terms
- nested NNF Horn constraints: encode subtyping implications while preserving lexical scope
- strongest scoped solutions: synthesize the most precise refinement from hypotheses defining a variable
- scope-based sharing: omit redundant outer binders to prevent exponential let-chain expansion
- acyclic elimination: remove refinement variables exactly in dependency order
- cyclic cut solving: leave a feedback set for qualifier-based predicate abstraction
- higher-order lifting: propagate inferred refinements through polymorphic functions and collections
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The procedure recursively traverses c to compute the returned predicate as the disjunction of those bodies in c where κ appears as the head."): read the whole paper text (pp. 1-31 including the appendix proofs) and checked every quotation, number, section and page reference and technique step in the study against it, plus the Table 1 figures; changed the Table 1 description, several page references (the cgen section starts on p. 15, scope lemmas are on pp. 17-18), the let-binding constraint description, the `sol1` head-occurrence step, the scope procedure steps (it is a syntactic traversal, not a dependency-graph computation), the wrongly described "quantifier-free" VC, a quotation that contained code formatting, and the cut-variable and trust descriptions, and marked own conclusions "Inference:"; not checked: the appendix proofs in detail beyond reading them, the cited external works, and the exact exponent of the let-chain blowup (the layout text shows a superscript flattened; the study only says exponentially many).
