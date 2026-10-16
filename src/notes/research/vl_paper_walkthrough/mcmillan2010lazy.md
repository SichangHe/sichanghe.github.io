# Lazy Annotation for Program Testing and Verification
(authored by agents unless marked 🧑)
Tag: `mcmillan2010lazy`, [paper](https://www.semanticscholar.org/paper/0f7e8234197643b7240c4af76620b743c37b50d8)

## scope and result
McMillan adapts DPLL conflict learning to symbolic execution. The method explores feasible program paths, and when a path cannot reach a goal it learns a Floyd/Hoare annotation that blocks the failed region. The abstract states: “The method generates Floyd/Hoare style annotations of the program on demand, as a result of failure to achieve goals, in a manner analogous to conflict clause learning in a DPLL style SAT solver.” (Abstract, p. 104). InterLA extends the method to procedure summaries; an interpolating prover supplies formulas.

## technique 1: on-demand intraprocedural annotation
What it is. A symbolic state contains path parameters, a constraint from branch guards, and symbolic expressions for program variables. Each control-flow location and edge has a formula describing states from which no goal is reachable. Initially labels are false. When a state is blocked, the algorithm backtracks and learns a label for the incoming edge; when all outgoing edges are blocked, it conjoins them into a location label.

How to apply it. (1) Mark target locations as goals. (2) Execute a feasible symbolic path using a sound symbolic interpreter. (3) If the current location label is implied, mark the state blocked and backtrack. (4) For a blocked edge, compute a formula that blocks the current query and is justified; use an interpolant of `A = χ(s1)` and `B = Sem(a) ∧ ¬A(l2)'` (Section 2.1, pp. 111–112). (5) Continue along an unlabeled edge. (6) When all edges are blocked, conjoin their labels and mark the location blocked. The `simple` example learns `x ≥ 0` and then proves the `error` goal unreachable (Section 1, pp. 104–105).

The interpolation definition is explicit: an interpolant for inconsistent `(A,B)` is implied by `A`, implies `¬B`, and uses only the shared vocabulary (Section 2, p. 109). Interpolation avoids quantifier elimination when weakest preconditions contain irrelevant variables.

Verus form. Inference: represent a Rust control-flow location with a ghost state summary and use `requires`/`ensures` to state edge relations. A failed Verus obligation can trigger a candidate `proof fn` lemma or `assert`; loop facts belong in loop `invariant` declarations. The learned formula is only a candidate until Verus proves it. Verus’s solver interface is not an interpolant API, so extracting interpolants would require a separate front end.

Evidence and limits. The paper’s Theorem 1 says that, on termination, reached goals are reachable and remaining goals are unreachable (Section 2.1, p. 112). The theorem assumes a sound symbolic interpreter and justified annotations; it does not guarantee termination for arbitrary loops or undecidable reachability.

## technique 2: bounded execution plus inductive strengthening
Unbounded loops can run forever without producing a blocked state. The method adds a decreasing auxiliary variable `τ`, labels every location with `¬W`, and chooses an initial `τ0`; every infinite run is then eventually blocked (Section 2.2, pp. 112–113). The bounded annotation is generalized by replacing `τ` with a fixed bottom value, repeatedly dropping labels that are not justified, and retaining the greatest inductive subset. If the result does not prove the initial state, increase `τ0` and repeat.

How to apply it. (1) Choose a well-founded domain predicate `W` and decrement `τ` on every action, cycle back-edge, or strongly connected component. (2) Run IntraLA to termination for `τ0`. (3) Remove `τ` dependence and compute the greatest justified inductive subset. (4) Add that subset to the annotation and test the initial state. (5) Increase `τ0` when necessary. For a large fixed bound, double `τ0` to reduce decision steps from O(N²) to O(N log N) (Section 2.2, p. 113).

Verus form. Inference: model `τ` as a ghost natural-number budget and state its decrease in a loop invariant and lemma. Use the resulting invariant as a candidate `ensures` fact. A Verus proof of a loop invariant can establish unbounded safety only if the invariant is genuinely inductive; a bounded run alone cannot do so.

## technique 3: negative procedure summaries
What it is. A negative summary is a transition formula over entry and exit variables that excludes unreachable exits. It can be reused at call sites. InterLA recursively calls `Sum` to either return a counterexample exit state or a summary proving that the requested postcondition cannot fail. Stack-frame shifts use `push` and `pop`; a weakening `W(φ) = φ ∧ ¬(f ∧ f')` lets the caller abort when the callee reaches a goal (Sections 2.3, pp. 113–116).

How to apply it. (1) Give each procedure a special flag `f` that is true on goal abort and false on normal exit. (2) Compute a summary for a query and postcondition using IntraLA. (3) At a call edge, push caller formulas into the callee frame. (4) Ask `Sum` for a summary of the callee. (5) Pop the returned state and weaken the return summary so callee aborts propagate. (6) Learn a call-edge interpolant with `A = χ(s1) ∧ ¬ψ1'` and `B = ¬pop(A(l2)) × ¬W(A(l3))` (Section 2.3, p. 115).

Verus form. Inference: give each Rust function a ghost summary relation and prove it with `requires`/`ensures`; represent caller/callee state relation in ghost fields and use `proof fn` lemmas for frame transfer. Rust ownership supplies concrete stack/borrow discipline, but the paper’s `push`/`pop` summary calculus must be modeled explicitly.

## technique 4: implementation and measured search reduction
Impact II builds LLVM control-flow graphs, uses FOCI for satisfiability and interpolants, models the C heap with arrays, and partitions loads/stores into alias classes. A reached goal yields a satisfying assignment as a test. Marking every location as a goal provides 100% coverage of reachable locations and proves uncovered locations unreachable, subject to the model (Section 3, pp. 116–117).

The comparison uses the same symbolic interpreter and prover for InterLA and DART on three bounded device-driver examples with 104–279 reachable basic blocks. Backtracks to saturation/completion are: `kbfiltr` 87/94 with learning versus 1,290/1,811 without; `diskperf` 214/221 versus 7,552/15,148; `floppy` 327/330 versus 13,827/27,788 (Figure 6, p. 117). The largest completion reduction is a factor 84. Inference: these denominators are backtracks, not tests proved correct; DART terminates here because loops are bounded and there is no recursion.

Verus form. Inference: apply the same experiment to verifier-guided Rust proof search: count verifier invocations and accepted goals with and without learned ghost summaries, keeping source and solver settings fixed. Treat generated annotations as heuristics and report the final Verus acceptance rate separately.

The paper summarizes the benefit: “Lazy annotation allows us to deduce program annotations in response to search failure, much in the way that a DPLL SAT solver learns conflict clauses.” (Section 4, p. 118)

## what is proved, measured, and trusted
Theorems concern reachability conditional on sound symbolic semantics and justified annotations. The implementation section states: “When a goal location is reached, Impact II extracts a satisfying assignment to the symbolic constraint C of the symbolic state as a test case.” (Section 3, p. 116) Experiments measure search cost and coverage, not functional correctness of arbitrary external code. Trusted components include LLVM translation, FOCI, array and alias models, external-function assumptions (no side effects and nondeterministic returns), and the target goals. Inference: for agent-written verified Rust, learned annotations can reduce repeated solver work, but a wrong goal, alias abstraction, or external contract can make an apparently complete result unsound.

## what VL should reuse
Inference: reuse failure-triggered learning, interpolation-shaped summaries, bounded-to-inductive strengthening, and disjoint measurements of search cost versus proof evidence. Do not redo generic DPLL-style path learning without a Verus-specific diagnostic study. Inference: the product risk is learning a convenient invariant that blocks hard paths while leaving a specification gap; require explicit coverage of goals and review of external assumptions.

## techniques for the catalog
- lazy path annotation — learn edge and location formulas only when symbolic execution is blocked
- interpolant generalization — derive relevant preconditions without quantifier elimination
- bounded-to-inductive strengthening — use a decreasing budget, remove it, and retain the greatest justified invariant subset
- negative procedure summaries — compute reusable transition exclusions for modular calls
- verifier-guided search measurement — compare learned and unlearned backtracks, coverage, and accepted proofs separately
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
