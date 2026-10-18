# Resource-Guided Program Synthesis
(authored by agents unless marked 🧑)
Tag: `knoth2019resource`, [paper](http://arxiv.org/abs/1904.07415v2)

## scope and result

Knoth, Wang, Polikarpova, and Hoffmann combine refinement-type synthesis with automatic amortized resource analysis. (The paper spells the baseline tool "Synqid"; this study writes Synquid.) ReSyn synthesizes recursive functional programs from a goal type, component signatures, and resource bounds. The paper's abstract states the central claim: “The proof of type soundness shows that synthesized programs are correct by construction.” (Abstract, p. 1) Here “correct” means satisfying the supplied refinement and resource type under the formal cost semantics; it does not establish that the specification captures a user's intended behavior.

The system extends Synquid's refinement types with AARA-style potential annotations. Potential is attached to values and can be transferred to pay for recursive calls or other costs (Section 2.2, p. 4). During synthesis, round-trip type checking propagates the goal type top-down and rejects partial programs as soon as their refinements or resource constraints cannot be satisfied (Section 2.4, p. 5). Unknown refinements become Horn constraints; unknown numeric potential terms become resource constraints solved by an incremental counterexample-guided inductive synthesis (CEGIS) loop and SMT (Sections 4.2–4.3, pp. 11–12).

## technique 1: refinement types plus potential annotations (Re²)

what it is

An annotated type `R^ϕ` describes values satisfying refinement `R` and carrying non-negative potential `ϕ`. A list annotation can put one unit on every element (`L¹(int)`), or use a dependent expression such as `ν−a`. Potential pays for the cost of a transition, so initial potential bounds the high-water resource usage. The paper describes the invariant: “The type system ensures that the initial potential is sufficient to cover the cost of the evaluation.” (Section 1, p. 2)

when to use it

Use this for recursive data-structure code where a functional specification and an asymptotic or input-dependent bound should guide synthesis. It supports user-defined cost metrics: the paper's examples are wrapping recursive calls in `tick(1,·)` to count them, or wrapping data constructors in `tick(c,·)` to track memory (Section 3, p. 5). Dependent potential is useful when the bound depends on values: `range a b` receives `b` a type with potential `b−a`; insertion into a sorted list can assign potential only to elements smaller than the inserted value (Section 2.3, p. 4).

how to apply it

1. Write a refinement type for the result, such as `elems ν = elems l1 ∩ elems l2` for list intersection (Section 2.1, p. 3).
2. Choose a cost metric and annotate component types with the potential needed to pay for each call. In the `common'` example, each sorted-list element carries one unit, yielding an `m+n` recursive-call bound, where `m` and `n` are the two list lengths (Section 2.3, p. 4).
3. Use sharing and transfer rules to split potential among duplicated variables and move it into a free potential term consumed by `tick` (Section 3, p. 8; rules in Fig. 6, p. 7).
4. Check each recursive call: pattern matching transfers potential from the constructor to binders; the call is accepted only if the remaining arguments carry enough potential (Section 2.3, p. 4).
5. Reject a candidate when a guard or component consumes potential needed by a later call. The paper's inefficient `common` implementation fails because, with `member` annotated as requiring one unit of potential per element, the guard "consumes all the potential stored in l2" (Section 2.3, p. 4).

Verus form (Inference): express the functional relation as `spec fn`s over mathematical `Seq`s or sets, and express a resource budget as a ghost integer or sequence measure. A recursive executable `fn` can carry `requires` for the input budget, `ensures` for output relation, and `decreases` for termination; ghost arithmetic lemmas can show that each call consumes at most the available budget. Verus does not have Re²'s affine type checker or automatic potential transfer, so ownership and budget conservation must be explicit in contracts and `proof fn`s. The paper's `tick` is a semantic cost marker, not executable Rust.

evidence and limits

The formal calculus proves progress, preservation, consistency, and synthesis soundness. The paper's synthesis theorem is explicit: “Theorem 4 (Soundness of Synthesis). If Γ ⊢ ◦ :: S ⇝ e then Γ ⊢e :: S.” (Section 4.1, p. 10). The formal development is restricted to Booleans and length-indexed lists, although the implementation supports integers, user-defined datatypes, sets, and user-defined measures (Section 4.3, p. 12). In the implementation, resource terms are not syntactically restricted to be linear, so it "is incomplete, and simply rejects the program if a nonlinear term arises" (Section 4.3, p. 12).

## technique 2: round-trip type-directed search

what it is

ReSyn extends type-directed synthesis with resource-aware incremental checking. A partial program is generated against a goal type; the type checker propagates refinements and potential requirements back into its holes. Ill-typed prefixes are discarded before their remaining branches are enumerated. The paper says: “The key to efficient synthesis is type-checking each program candidate incrementally as it is being constructed, and discarding an ill-typed program prefix as early as possible.” (Section 2.4, p. 5)

how to apply it

1. Provide a goal type, a context, and a bound on program depth: the algorithm "takes as input a goal type S, a context Γ, and a bound k on the program depth" (Section 4.2, p. 10). Component signatures are given to the synthesizer as a library (Section 2.1, p. 3) and appear in the typing context (Section 3, p. 8).
2. Use goal-directed backtracking rules for abstractions, fixpoints, conditionals, matches, and applications; for an application, the goal for the function is `_:? → T`, which filters out functions that cannot fulfil the goal type (Sections 4.1–4.2, pp. 9–11).
3. Maintain a symbolic typing derivation containing unknown Boolean and numeric refinements. Translate subtyping, sharing, and transfer premises into validity constraints (Section 4.2, pp. 10–11).
4. Solve the Horn constraints first with existing techniques, then plug that solution into the resource constraints and solve those; the algorithm does not solve Boolean and numeric unknowns at the same time (Section 4.2, p. 11).
5. Theorem 4 says the synthesis rules always produce a well-typed expression (Section 4.1, p. 10). Inference: a program produced by the rules therefore needs no separate final type check, though this holds only for the rules as formalized, not for the implementation's extensions.

Verus form (Inference): the closest workflow is contract-first synthesis: generate a Rust function skeleton, `requires`/`ensures`, loop `invariant`s, and candidate `proof fn`s, then run Verus after each edit and prune code whose obligations are unsatisfiable. Verus's verifier is a checker rather than a hole-directed synthesizer, so implementing round-trip search would require an external enumerator that reads diagnostics and contract shape. The accepted artifact must keep the specification frozen while search edits proof and executable bodies; otherwise a weakened `ensures` can make an incorrect candidate verify.

evidence and limits

The synthesis rules are proved to produce well-typed expressions, but Inference: search completeness is also bounded by the depth bound and the component set. The authors note that their default greatest-fixpoint Horn solver "technically renders this technique incomplete, however we observed that it works well in practice" (footnote 4, Section 4.2, p. 11). The component specifications are assumed sound (Section 1, p. 2), which is a trusted boundary.

## technique 3: incremental CEGIS for dependent resource constraints

what it is

Dependent potentials generate constraints of the form `ψ ⇒ ϕ ≥ 0`, with universally quantified program variables and unknown integer coefficients. ReSyn uses an incremental CEGIS algorithm. It asks SMT for a counterexample to the current coefficient assignment; if one exists, it keeps only clauses violated by that counterexample and solves for coefficients satisfying the accumulated examples (Algorithm 1, Section 4.3, p. 12).

how to apply it

1. Replace each unknown numeric term with a linear template over in-scope numeric variables (Section 4.2, p. 11).
2. Normalize the constraints into clauses `ψ(x) ⇒ Σ f(Ci)·x ≥ 0`; the algorithm takes the full clause set, the current solution (new coefficients mapped to 0), and the current examples (Section 4.2, p. 11; Section 4.3, p. 12).
3. Query SMT for `e` satisfying `¬R(C,e)`. If none exists, return the current solution (Algorithm 1, p. 12).
4. Add `e` to the example set, retain only clauses violated by `e`, and ask SMT for new coefficients satisfying those clauses on all examples (Algorithm 1, p. 12).
5. Repeat from step 3 with the extended solution and examples. The rationale is that as clauses are added during incremental type checking "only a few existing coefficients Ci are typically invalidated", so not everything is solved from scratch (Section 4.3, p. 12).

Verus form (Inference): use a bounded external synthesis loop to propose coefficients for ghost budget functions, then let Verus prove the resulting arithmetic obligations. Verus can discharge linear arithmetic with `assert` and proof lemmas, but it does not expose a CEGIS API; counterexamples would come from failed verification conditions or an auxiliary SMT encoding. Dependent bounds involving sequences and conditionals may need explicit lemmas and triggers rather than automatic type inference.

evidence and limits

The paper's implementation supports conditional, multiplicative, and measure-based resource terms but rejects nonlinear terms, and it adds well-formedness constraints because such terms are not syntactically guaranteed to be non-negative (Section 4.3, p. 12). Incremental solving matters empirically: for benchmarks 8–13, which use dependent potential annotations, synthesis without it (`T-NInc`) takes times that "are up to 2× higher" (Section 5.2, p. 14). This is a time comparison, not a proof that CEGIS finds an optimal solution.

## technique 4: resource-aware termination and constant-resource synthesis

what it is

Potential bounds also subsume termination checking: every recursive call consumes potential, so a finite initial amount rules out divergence. The paper contrasts this with Synquid's tuple-of-arguments metric: “ReSyn need not reason explicitly about termination, since potential annotations already encode an upper bound on the number of recursive calls.” (Section 2.4, p. 5)

A simple extension of the type system verifies constant-resource behavior: subtyping keeps potentials invariant (`=` instead of `≥` in Sub-TVar, Sub-Arrow, Sub-Pot) and (Simp-Atom-Var) requires ϕ = 0 (Section 3, p. 9). In case-study benchmark 15, comparing a public list `ys` with a secret list `zs`, "By allotting potential only to ys, we guarantee that the resource consumption of the generated program is independent of the length of zs"; relaxing this (benchmark 16) yields a program that terminates early and can reveal the length of `zs` (Section 5.2, p. 14).

how to apply it

1. Count one cost unit per recursive call or generated function application. In the synthesis formalization every application generated by (AFill-App) or (AFill-SimpAtom) is wrapped in `tick(1,·)` (Section 4.1, p. 10); the implementation also lets the programmer annotate any arrow type with a non-negative cost c (same page).
2. Supply enough input potential to pay for every call; the paper says potential annotations "already encode an upper bound on the number of recursive calls" (Section 2.4, p. 5). Inference: Theorem 3's second case (Section 3, p. 9) allows an execution that continues for every number of steps, so the termination claim rests on the paper's prose and the cost metric, not on Theorem 3 alone.
3. For constant-resource code, use the modified rules above and give potential only to the public arguments, as in benchmark 15 (Section 5.2, p. 14).

Verus form (Inference): encode a public-input budget in a ghost `spec fn`, use `decreases` for recursive termination, and prove that each branch's cost is bounded by a public expression. A constant-time property needs a relation over traces or an explicit cost model; ordinary `ensures` on the return value is insufficient. Verus can prove the supplied model but does not automatically model microarchitectural timing or allocator behavior.

evidence and limits

The evaluation uses 43 problems from Synquid's original 64 (the rest "require nonlinear bounds, and thus are out of scope") and 16 case studies (Sections 5.1–5.2, pp. 12–13). In Table 1 "the median synthesis time is about 2.5× higher" than Synquid's, while the generated programs have resource guarantees; the paper reports that ReSyn found a more efficient implementation for "only one of the original Synqid benchmarks" (`compress`) (Section 5.1, p. 13). In Table 2, the naive combination of Synquid and resource analysis (`T-EAC`) times out at ten minutes for `common` and `list difference` (benchmarks 5 and 6), whereas ReSyn takes 30.8 and 173.5 seconds respectively (Table 2, p. 14; Section 5.2, p. 13). These denominators and settings are benchmark-specific; they do not support a universal speed claim.

## what is proved, measured, and trusted

Proved: Re² progress, preservation, consistency of values, and soundness of synthesis under the small-step cost semantics; a well-typed program either evaluates to a consistent value or can continue for every finite number of steps (Theorem 3, Section 3, p. 9). Measured: synthesis times and generated AST sizes (Table 1, 43 problems), and synthesis times and tightest resource bounds (Table 2, 16 case studies). Trusted: the refinement and resource specifications, component signatures, SMT solver, Horn solver, cost annotations, and the assumption that the implementation's extensions preserve the formal calculus's soundness. The implementation's nonlinear rejection and solver incompleteness are explicit limits.

## techniques for the catalog

- refinement-potential types — attach logical refinements and dependent potential to values so resource bounds are checked with functional correctness
- round-trip resource-guided synthesis — propagate goal types during search and prune partial programs as soon as a refinement or budget fails
- incremental resource CEGIS — solve guarded coefficient inequalities by SMT counterexamples and update only clauses invalidated by each example
- potential-based termination — use finite potential consumed by recursive calls as both a resource bound and a termination argument
- constant-resource synthesis — place potential on public inputs only to constrain generated code's resource use independently of secret input size
