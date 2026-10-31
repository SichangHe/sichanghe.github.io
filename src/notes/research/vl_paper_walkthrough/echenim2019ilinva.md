# Ilinva: Using Abduction to Generate Loop Invariants
(authored by agents unless marked 🧑)
Tag: `echenim2019ilinva`, [paper](http://arxiv.org/abs/1906.11033v1)

## scope and result

Ilinva synthesizes loop invariants only when they are needed to prove program assertions. It connects Why3, which generates and checks verification conditions, to GPiD, which generates abductive implicants modulo a theory. The abstract describes the key design: “The key feature of this approach is a method to automatically synthesize inductive invariants of the loops contained in the program.” It is generic because GPiD only requires a decision procedure for the selected theory, and lazy because it starts every loop at `⊤` and strengthens only invariants that block a proof. The abstract describes this scope as: “The method is generic, i.e., it applies to a large set of programming languages and application domains; and lazy, in the sense that it only generates invariants that allow one to derive the required properties.”

The input language has assignments or other base instructions, assumptions, assertions, conditionals, and `while C do P {φ} end`. Ilinva seeks a program with the same code and strengthened loop formulas such that all assertion, initialization, and propagation verification conditions are valid. The paper emphasizes that verification conditions interact globally: every loop invariant is initially `⊤`, and a candidate is accepted only after it is preserved and true on loop entry.

## technique 1: abduce a hypothesis from a failed assertion

what it is. Given a failed verification condition `φ`, select a finite set `A` of abducible literals and search for conjunctions of literals from `A` that entail `φ` modulo theory `T`. Definition 1 calls such a conjunction an `A`-implicant. GPiD recursively explores relevant literals, uses models of `¬φ` to prune, and removes redundant implicants. Its completeness theorem is conditional on a terminating and complete decision procedure and a subset-closed search property.

how to do it.

1. Extract symbols from the program and theory, then construct literals up to a configured depth (`GetAbducibles`). The implementation builds a global set once and selects a location-specific subset.
2. Remove literals already entailed by the failed formula. Algorithm 3, line 2, sets `A := {l | l ∈ A ∧ φ ⊭_T l}`.
3. Call `GPiD(φ,∅,A,P)`. If the current hypothesis set is not enough, choose relevant literals, recursively add one, and discard literals made irrelevant by that choice. The ordering `<` prevents duplicate exploration.
4. Optionally combine returned implicants into disjunctions. Algorithm 3 returns formulas `ξ1 ∨ … ∨ ξn`; the current implementation tries conjunctions first and allows disjunctions of size two.
5. Use solver timeouts as satisfiable when a decision procedure cannot finish. The paper explicitly permits this operational approximation, but the formal theorem requires termination and completeness.

The GPiD algorithm is theory-parametric. It can exploit a model of `{¬φ} ∪ M` to prune literals; if model construction is unavailable, no pruning is performed. The search property `P` can bound implicant size, and Theorem 2 guarantees that every permitted implicant is subsumed by one returned by GPiD under its stated assumptions.

Verus form. Inference: construct candidate formulas over Rust variables and specification functions, then add each candidate as a loop `invariant` and let Verus check preservation. Inference: GPiD's abductive search should remain an external candidate generator; the Verus verifier must re-prove each candidate, so generated formulas do not become trusted facts. Inference: an abducible literal may be an equality, order relation, predicate application, or a user-defined mathematical relation represented by a Verus `spec fn`.

## technique 2: lazily strengthen invariants to prove assertions

Algorithm 2 (`Ilinva`) performs a recursive search over candidate invariants.

1. If all assertion conditions `VCgena(P)` are valid, return the program.
2. Select a non-valid assertion condition `φ` that depends on a loop at location `ℓ`.
3. Run `Abduce(φ,P,ℓ)` to obtain hypotheses `ξ` that would make `φ` valid.
4. For every earlier or equal loop location `ℓ′ ≤ ℓ`, back-propagate `ξ` to `ℓ′` with a weakest-precondition calculation `ξ′ := bp(ξ,P,ℓ,ℓ′)`, ignoring loops on the path.
5. Strengthen the invariant at `ℓ′` to `ξ′ ∧ ψ`. Reject it if its loop-entry conditions are not valid.
6. Call `Ind` to repair any propagation conditions made invalid by the strengthening. If successful, recurse on the remaining assertion conditions.

`Abduce` therefore generates a property at the assertion site, while `bp` transports that property to a loop invariant. Inference: this is how the paper's lazy behavior arises, since each hypothesis comes from abducing a selected failed assertion condition rather than from a general invariant search. In the list example, Ilinva begins with `⊤`, abduces `head(L)=length(L)`, then `Ind` strengthens it further to a correct invariant such as `head(L)=length(L) ∧ i=head(L)` because the first candidate does not propagate.

Verus form. Inference: map each loop location to a Verus `while` and add candidate invariants incrementally. Use `requires` for entry assumptions and `ensures` for the final assertion; use proof lemmas or `assert` statements to establish the weakest-precondition facts that connect a candidate at the assertion site to the loop state. Inference: Verus does not expose Ilinva's location calculus, so a generator would need to reconstruct paths from the Rust syntax and emit ordinary Verus invariants.

## technique 3: repair induction with forward propagation

`Ind` handles a candidate that proves the target assertion but fails its loop-preservation conditions (Algorithm 4).

1. Select a non-valid propagation condition in `VCgenind(P,ℓ)`.
2. Abduce a formula `ξ` that would imply it.
3. For every loop `ℓ′` nested in or equal to the current loop, forward-propagate `ξ` from `ℓ` to `ℓ′` with `fp(ξ,P,ℓ,ℓ′)`, using strongest postconditions on the loop-free path.
4. Strengthen the affected invariant, check its entry condition, and recurse until all propagation conditions hold.

The paper says `Ind` strengthens either the considered loop or loops nested within it, and that properties "must be propagated forward, from location ℓ to the actual location of the strengthened invariant"; it says this technique “considering hypotheses that do not propagate.”

Verus form. Inference: encode the propagated fact as a separate invariant on the nested `while`, and prove it after each branch or state update with `assert` or a reusable `proof fn`. Inference: strongest-postcondition computation can guide candidate placement offline, but the final Verus proof still checks each transition.

## technique 4: control search with ordering, bounds, and iterative deepening

The implementation orders abducibles from simple to complex: Boolean variables, equalities between variables of the same sort, predicate applications, then deeper literals involving function symbols. Negative literals share their atom's priority. Unit implicants precede larger conjunctions, and single implicants precede disjunctions. Loops nearest the failing assertion are tried first. The tool bounds the number of literals, maximal implicant size, and disjunction size; when a call fails, it increases limits through iterative deepening. The paper reports that its current disjunction limit is one or two implicants.

Inference: this is a practical policy for a Verus invariant synthesizer: begin with equalities and inequalities over visible variables, then add calls to specification functions, and increase formula depth only after the simpler pool fails. Inference: retaining the ordering matters because SMT cost grows sharply with the abducible pool.

## implementation and evidence

The implementation connects a WhyML wrapper to GPiD and Why3. Why3 generates verification conditions, reports failed assertion or induction tasks, and rechecks updated programs. GPiD uses the same SMT solver as Why3 for satisfiability queries. The systems run as a pipeline, generating abductive hypotheses while earlier candidates are checked. The framework supports CVC4, Z3, and Alt-Ergo through SMT-LIB2 interfaces, but the solvers must be installed separately.

Experiments use benchmarks from several sources plus additional examples "corresponding to standard algorithms for division and exponentiation (involving lists, arrays, and non linear arithmetic)"; some benchmarks were translated by hand from C or Java into WhyML. The initial invariant is `⊤` in every case. Z3 handles real arithmetic, Alt-Ergo lists and arrays, and CVC4 the other cases. Tests ran on a dual-core Intel i5 at 1.3 GHz with 4 GB RAM, macOS 10.14.3, Why3 1.2.0, Alt-Ergo 2.2.0, CVC4 prerelease 1.7, and Z3 4.7.1. The timeout is 20 minutes; for some examples the authors deemed interesting they allowed longer runs, reported in parentheses. A local SMT call has a one-second timeout, chosen after measuring already-proved conditions; a timeout is treated as satisfiable, which can miss a solution.

Figure 6 reports, per benchmark and separately for conjunctions (`T(C)`, `C(C)`) and disjunctions (`T(D)`, `C(D)`), whether all assertions were proved before timeout, candidate count, and Why3 time with supplied invariants. For example, O01 uses 36 abducible literals, finds a conjunction solution in 9.68 seconds after 7 candidates, and a disjunctive solution in 11.89 seconds after 10 candidates; Why3 alone takes 0.26 seconds. O06 uses 390 abducibles, takes 6 minutes 13.6 seconds and 56 candidates for conjunctions, and 18 minutes 5.1 seconds and 552 candidates for disjunctions; Why3 takes 0.72 seconds. O09 reports 390 abducibles but zero candidates and no solution in both modes, while Why3 takes 0.56 seconds when correct invariants are provided. The right-hand table also has row 509 with 130 abducibles and a parenthesized (longer-run) conjunction result of 1h50′ and 95 candidates, with 0 candidates in disjunction mode; and row 534 with 172k abducibles, 8 candidates in conjunction mode and 0 in disjunction mode. These are individual rows, not averages. The paper's header text lists the candidate columns as "C(D) and C(D)", a typo for C(C) and C(D).

The authors conclude that the system handles a wide range of theories but is usually slow. They say "the cost of the numerous calls to the SMT solvers and the size of the search tree of the abduction procedure remain the bottleneck of the approach", especially for hard theories such as nonlinear arithmetic where most satisfiable calls hit the local timeout. They also note that treating Why3 as a black box costs time in translations and in rechecking tasks from scratch after each invariant update, and that using SMT-LIB2 files rather than solver APIs is not optimal. They believe the system "in its current state is mainly useful when used in an interactive way". A stated limitation is that it cannot handle problems where Why3 relies on a combination of different solvers. They do not claim completeness: the open question is whether a solution exists whose invariants can be constructed from `GetAbducibles`' finite set.

## techniques for the catalog

- theory-generic implicant abduction: search bounded conjunctions of abducible literals that entail a failed verification condition
- lazy assertion-directed strengthening: start loops at `⊤` and strengthen only invariants needed for a selected assertion
- induction repair: use abduction plus forward strongest-postcondition propagation to make strengthened invariants inductive
- path back-propagation: transport an assertion-site hypothesis to earlier loops with weakest preconditions
- search control: order literals by complexity and use bounds, pruning, disjunction limits, and iterative deepening
