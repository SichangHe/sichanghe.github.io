# InvGen: An Efficient Invariant Generator
(authored by agents unless marked 🧑)
Tag: `gupta2009invgen`, [paper](https://www.semanticscholar.org/paper/2780dd83b79ed76ed21f641264582126cd803cf5)

## what the paper does

InvGen synthesizes linear-arithmetic loop invariants by instantiating user-supplied templates. It translates each cut-point path's Hoare-triple inductiveness condition into arithmetic constraints over template coefficients, then combines static and dynamic information to solve those constraints faster. The paper's abstract states: “InvGen’s unique feature is in its use of dynamic analysis to make invariant generation order of magnitude more efficient.” (abstract, p. 634)

A template is a Boolean combination of linear inequalities whose coefficients are parameters. The tool returns an invariant proving that the error location is unreachable, or fails (Section 2, p. 634). The source language is C syntax or a transition relation over linear arithmetic expressions (Section 2, p. 634).

## technique: template-based constraint synthesis

what it is and when to use it

Use a template when the expected invariant can be expressed as parameterized linear inequalities at loop-entry cut points. The template gives the solver a fixed shape while leaving coefficients unknown. This is appropriate for linear arithmetic loops and is less suitable when the needed predicate is nonlinear or has an unanticipated Boolean structure.

how to do it

1. Choose cut-point locations, normally loop entries, and attach a parameterized template `η(ℓ)` to each (Section 3.1, p. 635).
2. Set the start-location template to `true` and the error-location template to `false` (Section 3.1, p. 635).
3. For every path between adjacent cut points, require the Hoare triple `{η(ℓ)} path {η(ℓ')}` to be valid. Translate these implications into arithmetic constraints over template parameters (Section 3.1, p. 635).
4. Solve the resulting constraints. Any satisfying assignment instantiates a safe invariant (Section 3.1, p. 635).

The paper's `simple.c` example uses `αx x + αn n ≤ α` at the loop entry. The three paths are initialization, one loop iteration, and the path from loop exit to the error assertion. The solution `αx = 1`, `αn = −1`, `α = 0` yields `x − n ≤ 0` (Section 3.1, pp. 635–636).

Verus form

Inference: define the candidate as a Verus `spec fn` and use it in a loop `invariant`; use `requires` for the initial precondition and `ensures` for the postcondition. For the example, a shape is:

```rust
spec fn bound(x: int, n: int) -> bool { x - n <= 0 }

fn simple(n: int) -> (x: int)
    requires n > 0
    ensures x == n
{
    let mut x: int = 0;
    while x < n
        invariant 0 <= x
        invariant bound(x, n)
    { x = x + 1; }
    assert(x == n);
    x
}
```

Inference: the paper's C integers and Verus mathematical integers are different execution models; a Rust port must state overflow behavior and use the actual integer type's arithmetic contracts. Inference: the coefficient solver generates the candidate, while Verus checks the instantiated invariant against the Rust body. The paper's Hoare triples are not themselves Verus syntax.

what evidence shows it works and limits

The method depends on the template. “If the template is not expressive enough cannot yield a desired invariant.” (Section 4, p. 638) Conversely, an over-expressive template makes constraint solving harder. By default, the authors use a conjunction of two parametric linear inequalities because they report that most invariants in their experience need that shape (Section 4, p. 638). Disjunctive templates are accepted but “currently not practical for disjunctive invariants.” (Section 4, p. 639)

## technique: dynamic analysis as constraint strengthening

what it is and when to use it

Every state reached during execution satisfies a true program invariant. Substituting its concrete variable values into the template yields a linear constraint on template coefficients. These constraints are cheap compared with the original universally quantified inductiveness constraints and can sharply reduce the search space (Section 3.1, p. 636).

how to do it

1. Minimize the transition relation before execution (Section 3.3, p. 637).
2. Run guided concrete testing to collect reachable states, or bounded exhaustive symbolic execution (Section 3.3, p. 637).
3. At each reached state, substitute values for variables occurring in the template and add the resulting coefficient constraint (Section 3.1, p. 636).
4. Pass these constraints with the inductiveness constraints to the solver (Section 3.2, p. 636).

The paper's state `(x = 0, n = 1)` yields `αx·0 + αn·1 ≤ α` (Section 3.1, p. 636). For symbolic execution, the state `x = 0 ∧ n ≥ 0` is eliminated into `αn ≤ 0 ∧ α ≥ 0` after local simplification (Section 3.3, p. 637).

Verus form

Inference: use this analysis to propose coefficient values or candidate invariants, but do not turn sampled states into Verus `assume` statements in production proof code. The universal Verus loop invariant must hold for every reachable state, including states not sampled. Inference: a generator can emit a `spec fn` from the solved coefficients and let Verus reject an invalid candidate through its ordinary proof obligations.

what evidence shows it works

The authors generated 17 random programs, each with three cut points and one error location; dynamic analysis improved or preserved efficiency for all 17, and improved it by two orders of magnitude in four cases (Section 5, p. 640). This is a count over 17 generated programs, not a success rate on arbitrary programs. In the 12-program challenge collection, InvGen handled 11 in 6.3 seconds and timed out on one (Section 5, p. 639). The paper does not report per-program times for that collection.

## technique: static abstract-interpretation guidance

what it is and when to use it

Before synthesis, run interval, octagon, and polyhedral abstract interpretation. These analyses produce invariants that may be too weak to prove the assertion but can strengthen the template and remove irrelevant paths. This is useful when joins and widening lose precision and the missing fact is a small refinement of a coarse invariant.

how to do it

1. Run the abstract interpreter eagerly and collect invariants at program locations (Section 3.1, p. 636).
2. Annotate the transition relation with those invariants (Section 3.1, p. 636).
3. Use them to eliminate unsatisfiable or redundant transitions and to focus synthesis on missing constraints (Section 3.3, p. 637).

The implementation invokes InterProc three times, using interval, octagon, and polyhedral domains, and passes the annotated transition relation to InvGen (Section 3.3, p. 637).

Verus form

Inference: encode an abstract-analysis fact as a separate Verus invariant only after proving it from the Rust code. A fact obtained from an unverified analyzer is a candidate hint, not a trusted premise. Inference: Verus's `invariant` clauses can carry the retained facts alongside the generated template predicate, while the final proof establishes both from the loop body.

## technique: minimization and local simplification

Program minimization computes a minimal cut-point set, collapses each cut-point-free path to one compound transition, and removes unsatisfiable or redundant transitions (Section 3.3, p. 637). The simplifier reduces arithmetic constraints after each phase. It locally eliminates existential variables whose scope is limited; in the symbolic example, eliminating program variables and an unused `λ` produces `αn ≤ 0 ∧ α ≥ 0` (Section 3.3, pp. 637–638).

Inference: a Verus-oriented generator can perform these transformations before emitting a candidate specification, but the simplification must preserve logical equivalence. Verus then checks the resulting candidate against the unminimized Rust control flow; a minimized transition relation is not evidence that the implementation has fewer behaviors.

## technique: incomplete case analysis for nonlinear constraints

Inductiveness translation produces nonlinear constraints over template parameters. For the error path, the paper gives constraints such as `λ ≥ 0 ∧ δ ≥ 0 ∧ λαx = δ ∧ λαn + δ = 0 ∧ λα + 1 ≤ δ`, where existential variables encode implication validity (Section 3.3, p. 638). InvGen assumes these variables usually range over a small domain, often 0 or 1, enumerates cases, and solves each resulting linear system.

This is intentionally incomplete: “This approach is incomplete, since InvGen does not take all possible values during the case analysis, however it is effective in practice.” (Section 3.3, p. 638) Inference: a Verus integration may use this solver only as a candidate generator; the Verus proof remains the sound acceptance test. If the candidate is not inductive, the proof fails rather than silently validating an unsound coefficient assignment.

## technique: incremental handling of multiple error paths

When several cut-point-free paths reach the error, InvGen synthesizes a safe invariant for one error path at a time and uses the already-computed invariant to strengthen the constraints for the next path (Section 3.3, p. 638). This reduces one large solve into incremental solves. Inference: the corresponding Verus workflow can add obligations or helper lemmas per error branch, but each branch must still be proved from the same executable Rust semantics.

## evidence from comparisons and product implications

Table 1 compares three configurations on 10 constructed benchmarks: baseline `InvGen**` has neither static nor dynamic analysis, `InvGen*` has no dynamic analysis, and `InvGen` has both (Table 1, p. 639). Several baseline entries time out after 10 minutes; for example `Seq-len`, `nested`, `svd(light)`, `heapsort`, `mergesort`, and `Spam-loop`, while full InvGen reports 2.8, 2.3, 14.2, 13.3, 170, and 0.4 seconds respectively. These are individual table rows, not averages. Table 2 reports Blast refinement counts for 10 programs: Blast diverges on four rows, while Blast+InvGen finishes in 3–43 steps on the listed rows and reduces iterations on the remaining rows (Table 2, p. 639).

The evaluation also reports 12 challenge programs and 17 random programs, as stated above. The authors claim dynamic analysis is never worse in the random set, but do not provide all raw times or a statistical test. Inference: for agent-written verified Rust, InvGen's strongest reusable idea is combining cheap execution facts and coarse abstract facts before expensive proof search. The product threat is treating those facts as proof: a stale analyzer, an incomplete case split, or a wrong template can produce a plausible candidate. Independent Verus checking of the final candidate is required. InvGen already covers linear templates, static/dynamic strengthening, path minimization, incremental error paths, and Blast integration; VL should treat these as prior art rather than re-describe them as new.

## trusted boundary and assumptions

The paper trusts its C frontend, CIL, InterProc, dynamic and symbolic executors, transition-relation construction, simplifier, constraint solver, and the correctness of the generated Hoare constraints. Its synthesis is conditional on the chosen template and on bounded or guided execution being a useful source of constraints. The solver's case analysis is explicitly incomplete. The final result is a safe invariant only if the encoded inductiveness constraints faithfully represent the program paths and are solved correctly.

Inference: in a Verus pipeline, the generator and all sampled facts should remain untrusted search components; Verus's checked contracts and invariants form the acceptance boundary. Inference: assumptions about Rust integer overflow, panic behavior, external calls, and unsafe code must be modeled in the Verus specification because the C-oriented paper does not address them.

## techniques for the catalog


- template-based linear invariant synthesis — instantiate parameterized inequalities so every cut-point path satisfies a Hoare inductiveness condition
- dynamic constraint strengthening — substitute concrete or symbolic reached states into templates to add cheap coefficient constraints
- abstract-interpretation guidance — use interval, octagon, and polyhedral facts to remove paths and focus synthesis on missing predicates
- transition minimization and local simplification — collapse cut-point-free paths and eliminate redundant or scoped existential constraints
- incomplete small-domain case analysis — enumerate likely 0/1 implication variables and solve the resulting linear systems
- incremental error-path solving — synthesize one error path at a time and reuse each invariant to strengthen later paths
Checked 2026-10-15 against paper gupta2009invgen: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
