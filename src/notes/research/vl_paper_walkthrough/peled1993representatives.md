# All from One, One for All: on Model Checking Using Representatives
(authored by agents unless marked 🧑)
Tag: `peled1993representatives`, [paper](https://doi.org/10.1007/3-540-56922-7_34) (link from the fetch record)

## result and scope

Peled’s paper reduces finite-state concurrent-program model checking by exploring representative interleavings instead of every ordering of independent operations. A dependency relation identifies operations that cannot safely commute. Traces are equivalence classes of admissible sequences, including finite prefixes. Finite-string equivalence uses swaps of adjacent independent operations; infinite-sequence equivalence uses permutations of finite prefixes. A run is a trace containing maximal interleaving sequences. The reduced graph is constructed so that every run under consideration has at least one representative sequence. Linear temporal logic (LTL) can then be checked on the reduced graph when the property is equivalence robust: all sequences in one class either satisfy it or all fail it.

The paper states algorithmic guarantees and complexity bounds; it does not verify a Rust implementation. Theorem 3.2 states that calculating ample sets yielding minimum-size representative state graphs is NP-hard (Theorem 3.2, printed p. 417). Inference: applying the reduction requires a correct program model, operation semantics, dependency relation, proposition-effect analysis, and fairness assumptions.

## technique: define independence and trace equivalence

What it is. Model a program as finite operations, states, enabling predicates, and partial state transformations. Declare two operations independent when they preserve each other’s enabledness and commute when both are enabled. Define finite-string equivalence by swapping adjacent independent operations; lift it to infinite sequences through prefix permutations.

When to use it. Inference: use this as the semantic foundation for partial-order reduction in concurrent systems whose independent actions produce the same global state regardless of order.

How to apply it.

1. Represent the finite-state program as `(T,Q,initial)` with an enabling predicate and partial state transformation for every operation (Section 2, before Definition 2.1, printed p. 410).
2. Construct a reflexive, symmetric dependency relation `D`; every pair outside `D` must preserve enabledness and commute (Definition 2.1, printed p. 410).
3. Define finite equivalence by repeated swaps of adjacent independent operations (unnumbered definition, printed p. 411).
4. Lift equivalence to infinite sequences using the paper’s prefix-permutation relation and take mutual inclusion as trace equivalence (Definition 2.3, printed p. 411).
5. Check the temporal property on one representative per equivalence class only after establishing equivalence robustness.

Definition 2.1 requires that, when α is enabled, an independent β is enabled before α exactly when it is enabled afterward; if both are enabled, they commute (printed p. 410). For finite equivalence the paper says: “That is, w is equivalent to v if it can be obtained from it by repeatedly commuting adjacent independent operations.” (printed p. 411, after Definition 2.2; the numbered definition itself defines interleaving sequences).

Verus form. Inference: encode each operation as an enum and state as a Rust value; specify `step` and prove pairwise commutation and enabledness preservation for declared independent pairs. Use a `spec fn` for trace equivalence over finite prefixes and proof lemmas for swapping. A proof about all infinite executions would also need an explicit mathematical model of infinite sequences and the representative guarantee; the paper supplies no Verus encoding.

Evidence and limits. Inference: the reduction is only as sound as `D`. Omitting a true dependency can invalidate the representative guarantee; adding dependencies preserves soundness but reduces savings. The paper notes that a smaller dependency relation generally gives larger gains (Definition 2.1 discussion, printed p. 410).

## technique: modified sleep-set expansion for representatives of infinite runs

What it is. Extend sleep-set partial-order reduction so cycles do not suppress the only representative of an infinite run. Track open nodes, explored operations, unreliable cycle-closing directions, sleep sets, and fixed nodes. Create edges on backtracking only when they lead to a fixed/open node or deadlock.

When to use it. Inference: use it when liveness or infinite-run properties matter; ordinary sleep sets can represent all finite traces yet omit an infinite run.

How to apply it.

1. Initialize the starting node’s sleep, explored, and unreliable sets to empty and mark it open. On expansion, mark deadlocks fixed and set `working_set(s) = ample(s) \ sleep(s)` (Figure 1, printed p. 416).
2. Remove a chosen operation `α` from the working set, add it to `explored(s)`, and compute `new_sleep = (sleep(s) ∪ explored(s)) \ (dep(α) ∪ unreliable(s))`. Create an unseen successor with that sleep set, empty explored/unreliable sets, and its open flag set; expand it recursively (Figure 1, printed p. 416).
3. For an existing successor, update it if its old sleep set contains any operation absent from `new_sleep`. Intersect the sets and clear its explored/unreliable sets. If it is closed, mark it open and re-expand it; if already open, reset its working set without another recursive call (Figure 1, printed p. 416).
4. After processing the successor, create the edge only if the successor is fixed or open, and mark the parent fixed. If the successor remains open, add `α` to `unreliable(s)` so later successor sleep sets exclude that direction (Figure 1, printed p. 416; explanation in Section 3.2, printed p. 414).
5. Clear a node’s open flag when its expansion finishes. After expanding the starting node, remove every non-fixed node (Figure 1, printed p. 416).

The paper states the guarantee: “the spawned state graph contains representatives for infinite traces” (Section 3.2, printed p. 414). A direction that closes a cycle is excluded from successor sleep sets through `unreliable(s)` (Section 3.2, printed pp. 414–416).

Verus form. Inference: retain runtime reduction metadata and use additional ghost state to prove an invariant that every run prefix has an unexplored representative direction unless it is covered by a sleep-set commutation. Use `requires` for a valid dependency relation and `ensures` for successor-state consistency. A proposed formalization would also need termination and temporal arguments; the paper does not establish the adequacy of this Verus encoding.

Evidence and limits. With perfect hashing, the paper gives time `O(|T|^2|E|)` and space `O(|T||V|+|E|)` where `E` and `V` are explored edges and nodes (Section 3.2, printed p. 415). These bounds describe the algorithm, not a measured implementation.

## technique: ample sets and fairness-aware reduction

What it is. An ample set is a subset of enabled operations sufficient to preserve at least one representative for every relevant run. The algorithm computes a subset that does not lead to open nodes; if no safe subset exists, it explores all enabled operations. Fairness assumptions can reduce the relevant run set and therefore shrink ample sets.

When to use it. Inference: use ample sets when many enabled operations are independent, and use fairness only when the property’s semantics explicitly restrict executions to fair runs or when checking safety under a feasible fairness assumption.

How to apply it.

1. Under the specific fairness condition (*), seek a faithful decomposition: selected operations are enabled, and every dependent unselected operation is disabled until a selected operation executes (Definition 4.3 and Lemma 4.4, printed p. 420).
2. To construct one, use a symmetric relation `E` containing only pairs that cannot be enabled together. Start with `V = en(s)`, select a seed from `V`, and initialize candidate `U` and frontier `X` to that singleton. Accumulate `DIS`, the operations excluded by `E` against any frontier operation. Replace `X` with operations dependent on its previous frontier but outside `U ∪ DIS`, and add them to `U` (procedure `ample`, printed p. 420).
3. Repeat until `X` is empty or contains an operation outside `V`. Return `U` only if the frontier is empty and no selected direction leads to an open node. Otherwise remove `U` from `V` and try another seed; if none succeeds, return all enabled operations (procedure `ample`, printed pp. 420–421).
4. Without fairness, strengthen this to a strongly faithful decomposition that prevents unselected operations from executing forever without a selected operation (Definition 4.5, printed p. 421).
5. For safety properties, a feasible fairness assumption preserves satisfaction even when executions are not assumed fair. Feasibility means every finite admissible sequence extends to a full fair execution. Use this result with an equivalence-robust fairness condition when constructing the reduced graph (Theorem 4.6 and Section 4.4, printed pp. 421–422; Section 4.2, printed p. 419).

Definition 3.1 defines ample sets by requiring a selected next operation in every continuing run under consideration (printed p. 415). Lemma 4.4 makes the selected part of a faithful decomposition ample under the specific fairness condition (*) (printed p. 420). This condition requires an operation dependent on any enabled operation eventually to occur (Section 3.2, printed p. 416); it is equivalence robust without adding dependencies. Section 4.2 distinguishes it from the stronger operation-justice and operation-fairness conditions. Operation justice requires infinite execution for an operation enabled continuously from some point; operation fairness requires it for an operation enabled infinitely often. For these stronger conditions, add dependencies, for each operation, between all operations that can enable or disable it, making the enabledness subformulas equivalence robust (printed pp. 419–420).

Verus form. Inference: encode enabled operations and candidate sets as finite maps or sets, then prove that each selected set preserves a representative successor under the dependency and fairness predicates. For an executable implementation of Figure 1, keep `sleep`, `explored`, and `unreliable` as runtime sets because they control exploration; use additional ghost state for proof invariants. Fairness itself is a specification assumption and must be modeled explicitly.

Evidence and limits. The paper’s example shows that assuming weak fairness removes an infinite sequence that never executes an enabled operation, producing a smaller graph (Section 3.2, printed p. 417). Inference: an incorrect fairness assumption can remove behaviors that matter to the real system.

## technique: make an LTL formula equivalence robust by dependency extension and rewriting

What it is. Add dependencies between operations that can change propositions used by the formula. For a smaller relation, rewrite the formula into a Boolean combination of temporal components and add dependencies separately for each component.

When to use it. Inference: use it for next-time-free LTL properties whose truth can change under reordering. Avoid adding dependencies for unrelated propositions because every added pair can enlarge the reduced graph.

How to apply it.

1. Compute `a(Y)`, a set containing operations that can affect proposition `Y`; take the union `a(φ)` over propositions in formula `φ` (Section 4.1, printed p. 418).
2. Add all pairs in `a(φ)×a(φ)` to the program dependency relation; Lemma 4.1 then gives robustness (Section 4.1, printed p. 418).
3. Use temporal equivalences to expose Boolean components outside temporal operators. Lemma 4.2 ensures that negation, conjunction, and disjunction preserve equivalence robustness of their operands (Section 4.1, printed p. 418).
4. Push negations through conjunctions and disjunctions with De Morgan equivalences, then extract components with `separate`: recursively split matching forms from its table and push unmatched formulas onto its stack. The component extraction takes linear time in formula size, avoiding potentially exponential explicit rewriting (Section 4.1, printed pp. 418–419).
5. Add dependency pairs separately for each extracted component and model-check the original equivalent formula.

Lemma 4.1 states that containing every pair in `a(φ) × a(φ)` suffices for equivalence robustness (printed p. 418). The paper warns that optimal rewriting “can be easily shown to be NP-hard in the size of the formula” (Section 4.1, printed p. 418).

Verus form. Inference: represent propositions and formulas as ghost syntax trees; define a pure `affects` function and prove that independent operations preserve proposition values. Formula rewriting can be an executable preprocessing pass with a proof of semantic equivalence. The temporal check would still need a checker or a separately formalized algorithm; neither is supplied for Verus in this paper.

Evidence and limits. The guarantee is conditional on sound `a(Y)` over-approximations and the dependency relation. Section 3.1 says earlier visibility-based methods build the full graph when every operation is visible (printed p. 413). Section 3.2 explicitly claims this paper can still reduce that case (printed p. 414).

## what is proved, trusted, and not yet done

The paper presents representative-generation arguments, equivalence-robustness lemmas, fairness results, an NP-hardness theorem for optimal graph-generating ample-set choices, and asymptotic complexity. It does not print full proofs of all its stated theorems. It reports a PROLOG implementation and a pipeline experiment, but not a verified implementation. For seven processes, the table gives 972 nodes, 3348 edges and 59.016 seconds for the full graph, versus 13 nodes, 13 edges and 0.216 seconds for the reduced graph (Section 5, printed p. 422). The paper states: “An implementation of the algorithm was written in PROLOG.” These are reported measurements, not independently reproduced results. Inference: an application must justify its finite-state model, operation semantics, dependency analysis, proposition-effect sets, any required fairness feasibility, and the downstream LTL checker.

## techniques for the catalog

- dependency-based independence — declare commuting operations by enabledness preservation and state commutation
- infinite-trace sleep sets — expand a reduced graph while protecting representatives lost through cycle-closing sleeps
- ample-set reduction — choose a sufficient enabled-operation subset and fall back to all successors when unsafe
- fairness-aware reduction — use faithful decompositions and feasible fairness to shrink the representative set
- formula-aware dependencies — add dependencies for operations affecting LTL propositions and rewrite formulas to reduce pairs
