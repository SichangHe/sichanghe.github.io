# All from One, One for All: on Model Checking Using Representatives
(authored by agents unless marked 🧑)
Tag: `peled1993representatives`, [paper](https://doi.org/10.1007/3-540-56922-7_34)

## result and scope

Peled’s paper reduces finite-state concurrent-program model checking by exploring representative interleavings instead of every ordering of independent operations. A dependency relation identifies operations that cannot safely commute. Equivalence classes of finite or infinite executions, called traces, contain sequences related by repeatedly commuting adjacent independent operations. The reduced graph is constructed so that every run has at least one representative sequence. Linear temporal logic (LTL) can then be checked on the reduced graph when the property is equivalence robust: all sequences in one class either satisfy it or all fail it.

The paper proves algorithmic guarantees and complexity claims, not implementation correctness of a particular Rust program. Theorem 3.2 states that calculating ample sets yielding minimum-size representative state graphs is NP-hard (Theorem 3.2, printed p. 417). The checked program, operation semantics, dependency relation, proposition-effect analysis, and fairness assumptions are trusted inputs to the reduction.

## technique: define independence and trace equivalence

What it is. Model a program as finite operations, states, enabling predicates, and partial state transformations. Declare two operations independent when they preserve each other’s enabledness and commute when both are enabled. Define finite-string equivalence by swapping adjacent independent operations; lift it to infinite sequences through prefix permutations.

When to use it. Use this as the semantic foundation for partial-order reduction in concurrent systems whose independent actions produce the same global state regardless of order.

How to apply it.

1. Represent the program as `(T,Q,initial)` with an enabling predicate and state transformation for every operation (Definition 2.1, printed p. 410).
2. Construct a reflexive, symmetric dependency relation `D`; every pair outside `D` must preserve enabledness and commute (Definition 2.1, printed p. 410).
3. Define finite equivalence by repeated swaps of adjacent independent operations (unnumbered definition, printed p. 411).
4. Lift equivalence to infinite sequences using the paper’s prefix-permutation relation and take mutual inclusion as trace equivalence (Definition 2.3, printed p. 411).
5. Check the temporal property on one representative per equivalence class only after establishing equivalence robustness.

Definition 2.1 requires that, when α is enabled, an independent β is enabled before α exactly when it is enabled afterward; if both are enabled, they commute (printed p. 410). For finite equivalence the paper says: “That is, w is equivalent to v if it can be obtained from it by repeatedly commuting adjacent independent operations.” (printed p. 411, after Definition 2.2; the numbered definition itself defines interleaving sequences).

Verus form. Inference: encode each operation as an enum and state as a Rust value; specify `step` and prove pairwise commutation and enabledness preservation for declared independent pairs. Use a `spec fn` for trace equivalence over finite prefixes and proof lemmas for swapping. Infinite traces require a separate mathematical model; executable Verus code can only check bounded prefixes unless a coinductive encoding is supplied.

Evidence and limits. The reduction is only as sound as `D`. Omitting a true dependency can invalidate the representative guarantee; adding dependencies preserves soundness but reduces savings. The paper notes that a smaller dependency relation generally gives larger gains (Definition 2.1 discussion, printed p. 410).

## technique: modified sleep-set expansion for representatives of infinite runs

What it is. Extend sleep-set partial-order reduction so cycles do not suppress the only representative of an infinite run. Track open nodes, explored operations, unreliable cycle-closing directions, sleep sets, and fixed nodes. Create edges on backtracking only when they lead to a fixed/open node or deadlock.

When to use it. Use it when liveness or infinite-run properties matter; ordinary sleep sets can represent all finite traces yet omit an infinite run.

How to apply it.

1. At a node, choose `ample(s) \ sleep(s)` as the working set and mark the node open (Figure 1, printed p. 416).
2. Explore an operation recursively; before recursion, compute the successor’s sleep set from the parent sleep set and explored directions, removing dependent and unreliable operations (Figure 1, printed p. 416).
3. If an explored edge closes a cycle to an open node, mark that direction unreliable and do not add it to sleep sets of equivalent nodes (Section 3.2, printed p. 414).
4. Re-expand an existing node when its new sleep set is smaller; intersect old and new sleep sets (Figure 1, printed p. 416).
5. Create an edge only during backtracking when the successor is fixed or open, or has no enabled operations; remove non-fixed nodes after expansion (Section 3.2, printed p. 415).

The paper states the guarantee: “the spawned state graph contains representatives for infinite traces” (Section 3.2, printed p. 414). A direction that closes a cycle is excluded from successor sleep sets through `unreliable(s)` (Section 3.2, printed pp. 414–416).

Verus form. Inference: represent the reduction metadata in ghost state and prove an invariant that every run prefix has an unexplored representative direction unless it is covered by a sleep-set commutation. Use `requires` for a valid dependency relation and `ensures` for successor-state consistency. Verus can verify finite recursive search invariants; termination and all infinite-run claims require a well-founded search argument plus a separately stated temporal model.

Evidence and limits. With perfect hashing, the paper gives time `O(|T|^2|E|)` and space `O(|T||V|+|E|)` where `E` and `V` are explored edges and nodes (Section 3.2, printed p. 415). These bounds describe the algorithm, not a measured implementation.

## technique: ample sets and fairness-aware reduction

What it is. An ample set is a subset of enabled operations sufficient to preserve at least one representative for every relevant run. The algorithm computes a subset that does not lead to open nodes; if no safe subset exists, it explores all enabled operations. Fairness assumptions can reduce the relevant run set and therefore shrink ample sets.

When to use it. Use ample sets when many enabled operations are independent, and use fairness only when the property’s semantics explicitly restrict executions to fair runs or when checking safety under a feasible fairness assumption.

How to apply it.

1. Start with one enabled operation and repeatedly add operations dependent on it or not guaranteed disabled (Definition 4.3 and `ample(s)`, printed pp. 420–421).
2. Reject a candidate if it includes an operation not enabled at the current node or if it would close a cycle to an open node; try another seed (Figure 1 and `proc ample`, printed pp. 416, 420–421).
3. Under weak fairness, use a faithful decomposition: selected operations are enabled, and every dependent unselected operation is disabled until a selected operation executes (Definition 4.3, printed p. 420).
4. Without fairness, strengthen this to a strongly faithful decomposition that prevents unselected operations from executing forever without a selected operation (Definition 4.5, printed p. 421).
5. For safety properties and feasible fairness, use the fairness-aware reduction even when executions are not assumed fair; Theorem 4.6 establishes equivalence (Section 4.4, printed p. 421).

Definition 3.1 defines ample sets by requiring a selected next operation in every continuing run under consideration (printed p. 415). Lemma 4.4 makes the selected part of a faithful decomposition ample under the specific fairness condition (*) (printed p. 420). This condition requires an operation dependent on any enabled operation eventually to occur; Section 4.2 distinguishes it from the stronger operation-justice and operation-fairness conditions.

Verus form. Inference: encode enabled operations and candidate sets as finite maps or sets, then prove that each selected set preserves a representative successor under the dependency and fairness predicates. Use ghost sets for `sleep`, `explored`, and `unreliable`; executable graph construction can erase them. Fairness itself is a specification assumption and must be modeled explicitly.

Evidence and limits. The paper’s example shows that assuming weak fairness removes an infinite sequence that never executes an enabled operation, producing a smaller graph (Section 3.2, printed p. 417). An incorrect fairness assumption can remove behaviors that matter to the real system.

## technique: make an LTL formula equivalence robust by dependency extension and rewriting

What it is. Add dependencies between operations that can change propositions used by the formula. For a smaller relation, rewrite the formula into a Boolean combination of temporal components and add dependencies separately for each component.

When to use it. Use it for next-time-free LTL properties whose truth can change under reordering. Avoid adding dependencies for unrelated propositions because every added pair can enlarge the reduced graph.

How to apply it.

1. Compute `a(Y)`, a set containing operations that can affect proposition `Y`; take the union `a(φ)` over propositions in formula `φ` (Section 4.1, printed p. 418).
2. Add all pairs in `a(φ)×a(φ)` to the program dependency relation; Lemma 4.1 then gives robustness (Section 4.1, printed p. 418).
3. Rewrite temporal formulas using Boolean/temporal equivalences so independent Boolean components are exposed outside temporal operators (Section 4.1, printed p. 418).
4. Extract components with the `separate` procedure; do not expand an exponentially larger rewritten formula when only its components are needed (Section 4.1, printed p. 419).
5. Add dependency pairs separately for each extracted component and model-check the original equivalent formula.

Lemma 4.1 states that containing every pair in `a(φ) × a(φ)` suffices for equivalence robustness (printed p. 418). The paper warns that optimal rewriting “can be easily shown to be NP-hard in the size of the formula” (Section 4.1, printed p. 419).

Verus form. Inference: represent propositions and formulas as ghost syntax trees; define a pure `affects` function and prove that independent operations preserve proposition values. Formula rewriting can be an executable preprocessing pass with a proof of semantic equivalence. Verus does not provide an LTL model checker, so the resulting temporal proof remains an external checker or a separately formalized finite-state algorithm.

Evidence and limits. The guarantee is conditional on sound `a(Y)` over-approximations and the dependency relation. Section 3.1 says earlier visibility-based methods build the full graph when every operation is visible (printed p. 413). Section 3.2 explicitly claims this paper can still reduce that case (printed p. 414).

## what is proved, trusted, and not yet done

The paper presents representative-generation arguments, equivalence-robustness lemmas, fairness results, an NP-hardness theorem for optimal graph-generating ample-set choices, and asymptotic complexity. It does not print full proofs of all its stated theorems. It reports a PROLOG implementation and a pipeline experiment, but not a verified implementation. For seven processes, the table gives 972 nodes, 3348 edges and 59.016 seconds for the full graph, versus 13 nodes, 13 edges and 0.216 seconds for the reduced graph (Section 5, printed p. 422). The paper states: “An implementation of the algorithm was written in PROLOG.” These are reported measurements, not independently reproduced results. Trusted assumptions are finite-state modeling, correct operation semantics, dependency analysis, proposition-effect sets, fairness feasibility, and the downstream LTL checker.

Inference: for VeruLaw, the reusable lesson is to make concurrency reductions proof-carrying: prove commutation and enabledness conditions before pruning executions, and carry sleep-set invariants as ghost state. The threat to agent-written verified Rust is high when an agent invents an independence relation or fairness assumption; a successful Verus proof of the reduced graph is unsound if those semantic inputs are wrong. What has already been done here is the representative-state reduction framework; VL should not redo the basic sleep-set/ample-set algorithm without a concrete Rust/Verus integration question.

## techniques for the catalog

- dependency-based independence — declare commuting operations by enabledness preservation and state commutation
- infinite-trace sleep sets — expand a reduced graph while protecting representatives lost through cycle-closing sleeps
- ample-set reduction — choose a sufficient enabled-operation subset and fall back to all successors when unsafe
- fairness-aware reduction — use faithful decompositions and feasible fairness to shrink the representative set
- formula-aware dependencies — add dependencies for operations affecting LTL propositions and rewrite formulas to reduce pairs
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The reduction of the state graph was achieved so far by collecting information about the explored directions."): I checked the definitions of dependency and trace equivalence, the modified sleep-set and ample-set algorithm, fairness conditions, formula rewriting, complexity claims, theorem references, and the reported PROLOG experiment; I corrected invented quotations, the finite-equivalence reference, successor sleep-set timing, the space bound, the ample-set complexity claim, earlier-work attribution, and the false absence of implementation measurements; I did not reproduce experiments or verify Verus sketches; the DOI link is from the fetch record because the supplied paper text contains no DOI or URL.
