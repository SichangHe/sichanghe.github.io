# InvGen: An Efficient Invariant Generator
(authored by agents unless marked 🧑)
Tag: `gupta2009invgen`, [paper](https://www.semanticscholar.org/paper/2780dd83b79ed76ed21f641264582126cd803cf5)

## what the paper does

InvGen synthesizes linear-arithmetic loop invariants by instantiating user-supplied templates. It translates each cut-point path's Hoare-triple inductiveness condition into arithmetic constraints over template coefficients, then combines static and dynamic information to solve those constraints faster. The paper's abstract states: “InvGen’s unique feature is in its use of dynamic analysis to make invariant generation order of magnitude more efficient.” (abstract, p. 634)

A template is a Boolean combination of linear inequalities whose coefficients are parameters. The tool returns an invariant proving that the error location is unreachable, or fails (Section 2, p. 634). The source language is C syntax or a transition relation over linear arithmetic expressions (Section 2, p. 634).

## technique: template-based constraint synthesis

what it is and when to use it

Use a template when the expected invariant can be expressed as parameterized linear inequalities at loop-entry cut points. The template gives the solver a fixed shape while leaving coefficients unknown. Inference: this is appropriate for linear arithmetic loops and is less suitable when the needed predicate is nonlinear or has an unanticipated Boolean structure; the paper itself says only that the template must be expressive enough and that InvGen is not practical for disjunctive invariants (Section 4, pp. 638–639).

how to do it

1. Choose cut-point locations, normally loop entries, and attach a parameterized template `η(ℓ)` to each (Section 3.1, p. 635).
2. Set the start-location template to `true` and the error-location template to `false` (Section 3.1, p. 635).
3. For every path between adjacent cut points, require the Hoare triple `{η(ℓ)} path {η(ℓ')}` to be valid. Translate these implications into arithmetic constraints over template parameters (Section 3.1, p. 635).
4. Solve the resulting constraints. The paper says: “Each solution of this constraint yields a safe invariant.” (Section 3.1, p. 635) Here “safe” means the invariant proves non-reachability of the error location.

The paper's `simple.c` example uses `αx x + αn n ≤ α` at the loop entry. The three paths are the path from the start location to the loop entry, one loop iteration, and the path from the loop entry to the error location (Section 3.1, p. 636). The solution `αx = 1`, `αn = −1`, `α = 0` yields `x − n ≤ 0` (Section 3.1, p. 636).

Verus form

Inference: define the candidate as a Verus `spec fn` and use it in a loop `invariant`; use `requires` for the initial precondition and `ensures` for the postcondition. For the example, an illustrative sketch (not compiled or checked with Verus by the reviewer) is:

```rust
spec fn bound(x: int, n: int) -> bool { x - n <= 0 }

fn simple(n: i64) -> (x: i64)
    requires n > 0
    ensures x == n
{
    let mut x: i64 = 0;
    while x < n
        invariant 0 <= x
        invariant bound(x, n)
    { x = x + 1; }
    assert(x == n);
    x
}
```

Inference: the paper's linear arithmetic and Rust machine integers are different models (the paper does not discuss overflow); a Rust port must state overflow behavior and use the actual integer type's arithmetic contracts, as the `i64` in the sketch does. Inference: the coefficient solver generates the candidate, while Verus checks the instantiated invariant against the Rust body. The paper's Hoare triples are not themselves Verus syntax.

what evidence shows it works and limits

The method depends on the template. “A template that is not expressive enough cannot yield a desired invariant.” (Section 4, p. 638) Conversely, if the template is too expressive, “the efficiency of InvGen is decreasing due to the increased difficulty of constraint solving.” (Section 4, p. 638) By default, InvGen assumes a conjunction of two parametric linear inequalities at each cut point; the authors write “In our experience, the majority of invariants require a template that is a conjunction of two linear inequalities,” which they attribute to the strengthening by abstract-interpretation invariants (Section 4, p. 638). Disjunctive templates are accepted, but “Currently, InvGen is not practical for disjunctive invariants.” (Section 4, p. 639)

## technique: dynamic analysis as constraint strengthening

what it is and when to use it

Every state reached during execution satisfies a true program invariant. The paper says: “By definition, each reached state must satisfy program invariants.” Substituting its variable values into the template yields a linear constraint on template coefficients. The paper contrasts these with the inductiveness constraints, which “contain non-linear arithmetic expressions and are difficult to solve,” and says “Such linear constraints improve the efficiency of constraint solving [4].” (Section 3.1, p. 636)

how to do it

1. Minimize the transition relation before execution (Section 3.3, p. 637).
2. Run guided concrete testing to collect reachable states, or bounded exhaustive symbolic execution (Section 3.3, p. 637).
3. At each reached state, substitute values for variables occurring in the template and add the resulting coefficient constraint (Section 3.1, p. 636).
4. Pass the results of the analysis, with the program and templates, to the constraint generator; the generated constraints go to the constraint solver (Section 3.2, p. 636, Figure 3).

The paper's state `(x = 0, n = 1)` yields `αx·0 + αn·1 ≤ α` (Section 3.1, p. 636). For symbolic execution, the symbolic state `x = 0 ∧ n ≥ 0` yields `λ ≥ 0 ∧ −λ = αn ∧ α ≥ 0`, which local simplification reduces to `αn ≤ 0 ∧ α ≥ 0` (Section 3.3, pp. 637–638). In the implementation, the default symbolic-execution bound is the number of cut points, and the user can limit visits per cut point (Section 3.3, p. 637).

Verus form

Inference: use this analysis to propose coefficient values or candidate invariants, but do not turn sampled states into Verus `assume` statements in production proof code. The universal Verus loop invariant must hold for every reachable state, including states not sampled. Inference: a generator can emit a `spec fn` from the solved coefficients and let Verus reject an invalid candidate through its ordinary proof obligations.

what evidence shows it works

The authors generated 17 random programs, each with “three cut-point and one error location”; they “observed that for these programs, dynamic analysis either improves or at least does not decrease the efficiency of invariant generation. In four cases, the efficiency of InvGen increased by two orders of magnitude.” (Section 5, p. 640) This is a count over 17 generated programs, not a success rate on arbitrary programs. In the 12-program challenge collection, “InvGen handles 11 examples in 6.3 seconds, and times out on one program.” (Section 5, p. 639) The paper gives aggregated data only for that collection (“we present the aggregated data and do not provide information for each program individually”) and notes InterProc with the polyhedral domain alone proves the assertion for six of the 12. In Table 1, dynamic analysis does not always help: InvGen is slower than InvGen* on svd(light), mergesort, Spam-loop and apache-tag (Table 1, p. 639).

## technique: static abstract-interpretation guidance

what it is and when to use it

Before synthesis, run interval, octagon, and polyhedral abstract interpretation. The resulting invariants are “not necessarily strong enough to prove the non-reachability of the error location” but let InvGen “focus on the synthesis missing, complex invariants in a goal directed way” (Section 3.1, p. 636); they can also eliminate transitions (Section 3.3, p. 637). The paper says such missing invariants “may be missed by the abstract interpreter due to the necessary precision loss of join and widening operators and the limited precision of efficient abstract domains” (Section 3.1, p. 636). Section 4 (p. 638) adds that the template instantiation may rely on these invariants, and InvGen reports them to the user.

how to do it

1. Run the abstract interpreter eagerly to compute a collection of invariants that hold for the program (Section 3.1, p. 636).
2. Annotate the program with those invariants (Section 3.1, p. 636); in the implementation, the frontend outputs the transition relation annotated with the InterProc results (Section 3.3, p. 637).
3. Use them during minimization, where they “can lead to the elimination of additional transitions” (Section 3.3, p. 637), and to focus synthesis on the missing invariants (Section 3.1, p. 636).

The implementation invokes InterProc three times, using interval, octagon, and polyhedral domains, and passes the annotated transition relation to InvGen (Section 3.3, p. 637).

Verus form

Inference: encode an abstract-analysis fact as a separate Verus invariant only after proving it from the Rust code. A fact obtained from an unverified analyzer is a candidate hint, not a trusted premise. Inference: Verus's `invariant` clauses can carry the retained facts alongside the generated template predicate, while the final proof establishes both from the loop body.

## technique: minimization and local simplification

Program minimization computes a minimal cut-point set, collapses each cut-point-free path to one compound transition, and removes unsatisfiable or redundant transitions (Section 3.3, p. 637). The simplifier “simplifies all arithmetic constraints locally at each step of the algorithm” (Section 3.3, p. 637). It locally eliminates existential variables whose scope is limited; in the symbolic example, eliminating program variables and an unused `λ` produces `αn ≤ 0 ∧ α ≥ 0` (Section 3.3, pp. 637–638).

Inference: a Verus-oriented generator can perform these transformations before emitting a candidate specification, but the simplification must preserve logical equivalence. Verus then checks the resulting candidate against the unminimized Rust control flow; a minimized transition relation is not evidence that the implementation has fewer behaviors.

## technique: incomplete case analysis for nonlinear constraints

Inductiveness translation produces nonlinear constraints over template parameters. For the error path, the paper gives constraints such as `λ ≥ 0 ∧ δ ≥ 0 ∧ λαx = δ ∧ λαn + δ = 0 ∧ λα + 1 ≤ δ`, where existential variables encode implication validity (Section 3.3, p. 638). The paper says that “in practice, such existentially quantified variables range over a small domain, typically they are either 0 or 1”; InvGen performs a case analysis on these variables, and each case gives a linear constraint over template parameters that a linear constraint solver handles (Section 3.3, p. 638).

This is intentionally incomplete: “This approach is incomplete, since InvGen does not take all possible values during the case analysis, however it is effective in practice.” (Section 3.3, p. 638) Inference: a Verus integration may use this solver only as a candidate generator; the Verus proof remains the sound acceptance test. If the candidate is not inductive, the proof fails rather than silently validating an unsound coefficient assignment.

## technique: incremental handling of multiple error paths

When several cut-point-free paths reach the error, InvGen synthesizes a safe invariant for one error path at a time and uses the already-computed invariant to strengthen the constraints for the next path (Section 3.3, p. 638). The paper says this is done “for efficiency reasons.” Inference: the corresponding Verus workflow can add obligations or helper lemmas per error branch, but each branch must still be proved from the same executable Rust semantics.

## evidence from comparisons and product implications

Table 1 compares three configurations on 10 constructed benchmarks: baseline `InvGen**` has neither static nor dynamic analysis, `InvGen*` has no dynamic analysis, and `InvGen` has both (Table 1, p. 639). Several baseline entries time out after 10 minutes; for example `Seq-len`, `nested`, `svd(light)`, `heapsort`, `mergesort`, and `Spam-loop`, while full InvGen reports 2.8, 2.3, 14.2, 13.3, 170, and 0.4 seconds respectively. These are individual table rows, not averages. Table 2 reports Blast refinement counts for 10 programs: Blast diverges on four rows, while Blast+InvGen finishes in 3–43 steps on the listed rows and reduces iterations on the remaining rows (Table 2, p. 639).

The evaluation also reports 12 challenge programs and 17 random programs, as stated above. The authors report that dynamic analysis never decreases efficiency in the random set, but the paper gives no per-program times or statistical test for it (it points to [5] for the programs). Separately, Section 4 (p. 639) reports that symbolic execution performs better than concrete execution, with efficiency “never worse” than concrete. The paper reports the Blast integration as reducing refinement iterations “by 25–400%” in the cases where Blast did not diverge (Section 5, p. 640).

## trusted boundary and assumptions

The paper has no section on trust or soundness. Inference: the result relies on its C frontend (CIL), InterProc, the dynamic and symbolic executors, transition-relation construction, simplifier, constraint solver, and the generated Hoare constraints being correct. The paper makes synthesis conditional on the chosen template (Section 4, p. 638). The solver's case analysis is explicitly incomplete (Section 3.3, p. 638). Inference: the final result is a safe invariant only if the encoded inductiveness constraints faithfully represent the program paths and are solved correctly.

Inference: in a Verus pipeline, the generator and all sampled facts should remain untrusted search components; Verus's checked contracts and invariants form the acceptance boundary. Inference: assumptions about Rust integer overflow, panic behavior, external calls, and unsafe code must be modeled in the Verus specification because the C-oriented paper does not address them.

## techniques for the catalog

- template-based linear invariant synthesis — instantiate parameterized inequalities so every cut-point path satisfies a Hoare inductiveness condition
- dynamic constraint strengthening — substitute concrete or symbolic reached states into templates to add cheap coefficient constraints
- abstract-interpretation guidance — use interval, octagon, and polyhedral facts to remove paths and focus synthesis on missing predicates
- transition minimization and local simplification — collapse cut-point-free paths and eliminate redundant or scoped existential constraints
- incomplete small-domain case analysis — enumerate likely 0/1 implication variables and solve the resulting linear systems
- incremental error-path solving — synthesize one error path at a time and reuse each invariant to strengthen later paths
