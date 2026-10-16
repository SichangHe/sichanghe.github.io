# Resource-Guided Program Synthesis
(authored by agents unless marked 🧑)
Tag: `knoth2019resource`, [paper](http://arxiv.org/abs/1904.07415v2)

## scope and result

Knoth, Wang, Polikarpova, and Hoffmann combine refinement-type synthesis with automatic amortized resource analysis. ReSyn synthesizes recursive functional programs from a goal type, component signatures, and resource bounds. The paper's abstract states the central claim: “The proof of type soundness shows that synthesized programs are correct by construction.” (Abstract, p. 1) Here “correct” means satisfying the supplied refinement and resource type under the formal cost semantics; it does not establish that the specification captures a user's intended behavior.

The system extends Synquid's refinement types with AARA-style potential annotations. Potential is attached to values and can be transferred to pay for recursive calls or other costs. During synthesis, round-trip type checking propagates the goal type top-down and rejects partial programs as soon as their refinements or resource constraints cannot be satisfied. Unknown refinements become Horn constraints; unknown numeric potential terms become resource constraints solved by an incremental counterexample-guided inductive synthesis (CEGIS) loop and SMT.

## technique 1: refinement types plus potential annotations (Re²)

what it is

An annotated type `R^ϕ` describes values satisfying refinement `R` and carrying non-negative potential `ϕ`. A list annotation can put one unit on every element (`L¹(int)`), or use a dependent expression such as `ν−a`. Potential pays for the cost of a transition, so initial potential bounds the high-water resource usage. The paper describes the invariant: “The type system ensures that the initial potential is sufficient to cover the cost of the evaluation.” (Section 1, p. 2)

when to use it

Use this for recursive data-structure code where a functional specification and an asymptotic or input-dependent bound should guide synthesis. It supports user-defined metrics, including recursive-call count and allocation. Dependent potential is useful when the bound depends on values: `range a b` receives `b` a type with potential `b−a`; insertion into a sorted list can assign potential only to elements smaller than the inserted value (Section 2.3, pp. 4–5).

how to apply it

1. Write a refinement type for the result, such as `elems ν = elems l1 ∩ elems l2` for list intersection (Section 2.1, p. 3).
2. Choose a cost metric and annotate component types with the potential needed to pay for each call. In the `common'` example, each sorted-list element carries one unit, yielding an `m+n` recursive-call bound (Section 2.3, pp. 4–5).
3. Use sharing and transfer rules to split potential among duplicated variables and move it into a free potential term consumed by `tick` (Section 3, pp. 8–9).
4. Check each recursive call: pattern matching transfers potential from the constructor to binders; the call is accepted only if the remaining arguments carry enough potential (Section 2.3, p. 5).
5. Reject a candidate when a guard or component consumes potential needed by a later call. The paper's inefficient `common` implementation fails because `member` consumes all potential on the second list (Section 2.3, p. 5).

Verus form (Inference): express the functional relation as `spec fn`s over mathematical `Seq`s or sets, and express a resource budget as a ghost integer or sequence measure. A recursive executable `fn` can carry `requires` for the input budget, `ensures` for output relation, and `decreases` for termination; ghost arithmetic lemmas can show that each call consumes at most the available budget. Verus does not have Re²'s affine type checker or automatic potential transfer, so ownership and budget conservation must be explicit in contracts and `proof fn`s. The paper's `tick` is a semantic cost marker, not executable Rust.

evidence and limits

The formal calculus proves progress, preservation, consistency, and synthesis soundness. The paper's synthesis theorem is explicit: “Theorem 4 (Soundness of Synthesis). If Γ ⊢ ◦ :: S ⇝ e then Γ ⊢e :: S.” (Section 4.1, p. 13). The formal development is restricted to Booleans and length-indexed lists, although the implementation supports integers, user-defined datatypes, sets, and user-defined measures (Section 4.3, p. 14). Nonlinear resource terms are rejected by the implementation, so the implementation is incomplete for that class (Section 4.3, p. 14).

## technique 2: round-trip type-directed search

what it is

ReSyn extends type-directed synthesis with resource-aware incremental checking. A partial program is generated against a goal type; the type checker propagates refinements and potential requirements back into its holes. Ill-typed prefixes are discarded before their remaining branches are enumerated. The paper says: “The key to efficient synthesis is type-checking each program candidate incrementally as it is being constructed, and discarding an ill-typed program prefix as early as possible.” (Section 2.4, p. 6)

how to apply it

1. Provide a goal type, a component library with refinement/resource signatures, and a maximum program depth (Section 4.2, p. 10).
2. Use goal-directed backtracking rules for abstractions, fixpoints, conditionals, matches, and applications; propagate the expected return type into subgoals (Sections 4.1–4.2, pp. 10–13).
3. Maintain a symbolic typing derivation containing unknown Boolean and numeric refinements. Translate subtyping, sharing, and transfer premises into validity constraints (Section 4.2, pp. 10–11).
4. Solve Horn constraints for logical unknowns and resource constraints for numeric unknowns, then continue search with the resulting types (Section 4.2, pp. 11–12).
5. Retain the completed term only if its derivation type-checks; theorem 4 makes this a sound acceptance criterion (Section 4.1, p. 13).

Verus form (Inference): the closest workflow is contract-first synthesis: generate a Rust function skeleton, `requires`/`ensures`, loop `invariant`s, and candidate `proof fn`s, then run Verus after each edit and prune code whose obligations are unsatisfiable. Verus's verifier is a checker rather than a hole-directed synthesizer, so implementing round-trip search would require an external enumerator that reads diagnostics and contract shape. The accepted artifact must keep the specification frozen while search edits proof and executable bodies; otherwise a weakened `ensures` can make an incorrect candidate verify.

evidence and limits

The synthesis rules are proved to produce well-typed expressions, but search completeness is limited by depth, component set, and constraint solvers. The authors note that their default greatest-fixpoint Horn solver technically makes the implementation incomplete, although it worked well in experiments (Section 4.2, p. 12). The component specifications are assumed sound (Section 1, p. 2), which is a trusted boundary.

## technique 3: incremental CEGIS for dependent resource constraints

what it is

Dependent potentials generate constraints of the form `ψ ⇒ ϕ ≥ 0`, with universally quantified program variables and unknown integer coefficients. ReSyn uses an incremental CEGIS algorithm. It asks SMT for a counterexample to the current coefficient assignment; if one exists, it keeps only clauses violated by that counterexample and solves for coefficients satisfying the accumulated examples (Algorithm 1, Section 4.2, p. 12).

how to apply it

1. Replace each unknown numeric term with a linear template over in-scope numeric variables (Section 4.2, p. 11).
2. Normalize each guarded inequality into a resource clause and initialize all unknown coefficients and examples (Section 4.2, pp. 11–12).
3. Query SMT for `e` satisfying `¬R(C,e)`. If none exists, return the current solution (Algorithm 1, p. 12).
4. Add `e` to the example set, retain only clauses violated by `e`, and ask SMT for new coefficients satisfying those clauses on all examples (Algorithm 1, p. 12).
5. Recurse as new typing clauses arrive; invalidate only coefficients affected by the new counterexample rather than resolving the entire system (Section 4.2, p. 12).

Verus form (Inference): use a bounded external synthesis loop to propose coefficients for ghost budget functions, then let Verus prove the resulting arithmetic obligations. Verus can discharge linear arithmetic with `assert` and proof lemmas, but it does not expose a CEGIS API; counterexamples would come from failed verification conditions or an auxiliary SMT encoding. Dependent bounds involving sequences and conditionals may need explicit lemmas and triggers rather than automatic type inference.

evidence and limits

The paper's implementation supports conditional, multiplicative, and measure-based resource terms but rejects nonlinear terms, and it adds well-formedness checks because such terms are not syntactically guaranteed non-negative (Section 4.3, p. 14). Incremental solving matters empirically: in case studies 8–13, disabling it (`T-NInc`) takes up to twice as long (Section 5.2, p. 16). This is a time comparison, not a proof that CEGIS finds an optimal solution.

## technique 4: resource-aware termination and constant-resource synthesis

what it is

Potential bounds also subsume termination checking: every recursive call consumes potential, so a finite initial amount rules out divergence. The paper contrasts this with Synquid's tuple-of-arguments metric: “ReSyn need not reason explicitly about termination, since potential annotations already encode an upper bound on the number of recursive calls.” (Section 2.3, p. 6)

The same mechanism can enforce constant resource use by allotting potential only to public inputs. In benchmark 15, potential on a public list but not a secret list forces comparison to consume a resource amount independent of the secret length, avoiding a side channel (Section 5.2, p. 17).

how to apply it

1. Annotate every recursive call (or generated function application) with one cost unit; in the core calculus this is `tick(1, ·)` (Section 3, p. 7).
2. Supply enough input potential to pay for every possible call; no infinite path can consume a finite budget (Sections 2.2–2.3, pp. 4–6).
3. For constant-resource code, place potential only on public arguments and require that secret arguments carry none; reject any candidate that needs secret-dependent potential (Section 5.2, p. 17).

Verus form (Inference): encode a public-input budget in a ghost `spec fn`, use `decreases` for recursive termination, and prove that each branch's cost is bounded by a public expression. A constant-time property needs a relation over traces or an explicit cost model; ordinary `ensures` on the return value is insufficient. Verus can prove the supplied model but does not automatically model microarchitectural timing or allocator behavior.

evidence and limits

The evaluation uses 43 linear-bounded problems from Synquid's original 64 (the other 21 require nonlinear bounds and are out of scope) and 16 case studies (Sections 5.1–5.2, pp. 15–16). Across Table 1, ReSyn's median synthesis time is about 2.5× Synquid's, while the generated programs have resource guarantees; the paper reports one original benchmark where ReSyn found a more efficient implementation (`compress`) (Section 5.1, p. 15). In Table 2, the naive synthesis-plus-analysis method times out at 10 minutes for `common` and `list difference`, whereas ReSyn completes in 30.8 and 173.5 seconds respectively (Table 2, p. 16). These denominators and settings are benchmark-specific; they do not support a universal speed claim.

## what is proved, measured, and trusted

Proved: Re² progress, preservation, consistency of values, and soundness of synthesis under the small-step cost semantics; a well-typed program either evaluates to a consistent value or can continue for every finite number of steps (Theorem 3, Section 3, p. 9). Measured: synthesis times, generated AST sizes, and tightest resource bounds on the 43-problem and 16-case-study suites. Trusted: the refinement and resource specifications, component signatures, SMT solver, Horn solver, cost annotations, and the assumption that the implementation's extensions preserve the formal calculus's soundness. The implementation's nonlinear rejection and solver incompleteness are explicit limits.

## implications for VL

Inference: this is a direct design pattern for VL's proof search around verified Rust: treat contracts and ghost budgets as search guides, reject candidates as soon as Verus reports an unsatisfied obligation, and retain only code whose proof and resource invariant both pass. It threatens any product claim that generic synthesis can optimize recursive code without explicit resource specifications; ReSyn already demonstrates synthesis guided by asymptotic and side-channel constraints. It does not replace VL's Rust ownership, concurrency, unsafe-code, or hardware models. A major product risk is specification drift: a candidate can be “correct by construction” only relative to the supplied `requires`/`ensures` and component assumptions.

## techniques for the catalog

- refinement-potential types — attach logical refinements and dependent potential to values so resource bounds are checked with functional correctness
- round-trip resource-guided synthesis — propagate goal types during search and prune partial programs as soon as a refinement or budget fails
- incremental resource CEGIS — solve guarded coefficient inequalities by SMT counterexamples and update only clauses invalidated by each example
- potential-based termination — use finite potential consumed by recursive calls as both a resource bound and a termination argument
- constant-resource synthesis — place potential on public inputs only to constrain generated code's resource use independently of secret input size
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
