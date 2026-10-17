# Sound Borrow-Checking for Rust via Symbolic Semantics
(authored by agents unless marked 🧑)
Tag: `ho2024sound`, [paper](https://doi.org/10.1145/3674640)

## scope and relation to earlier notes

The existing Aeneas note in the human research notes describes the original functional-translation pipeline and mentions this paper as its semantic foundation. It does not walk through this paper's proof constructions, rules, loop algorithm, or measurements. This study supplies those missing details. The source studied is the long version, arXiv:2404.02680v2, 1 July 2024; section and page references below refer to that PDF.

The paper has one central claim: a borrow-centric Rust core calculus (LLBC), and its symbolic abstraction (LLBC#), are sound with respect to a conventional heap-and-addresses language (PL). It establishes this by composing simulations LLBC# → LLBC → HLPL → PL, where HLPL is an intermediate pointer view. The same framework proves a sound join for abstract environments and uses it to analyze loops. The result is a semantic foundation and a borrow-checking algorithm, rather than a Verus implementation or a proof of the Rust compiler.

### what it is

The paper replaces one difficult global relation between unlike states with a reflexive-transitive closure of small rewrites. A rewrite changes one value in a state-with-a-hole, such as Ω[n] ≤ Ω[σ] for a concrete integer and its abstract value. A proof can then induct over one rewrite at a time. Because an intermediate state can contain both representations, the authors add a superset language whose semantics combines the two languages and adds administrative rules. They call such mixed states hybrid states.

The formal target is forward simulation: if Ωₗ ≤ Ωₕ and the high-level state takes a step, there must be a matching low-level step ending in a related state. The high-level statement is Definition 2.1 (p. 4). The paper states the motivation precisely: “To circumvent this issue, our approach relies on two key components.” (Section 2, p. 4.) Those components are local transformations and hybrid-state reasoning.

### when to use it

Use this when two semantics share syntax but represent state differently, for example an ownership graph versus pointers, or concrete values versus symbolic values. It is especially useful when a direct relation would need a global map, quantified invariants, or many auxiliary structures. The presented proof is for big-step semantics; the authors leave adaptation to small-step semantics as future work (Section 2, p. 4).

### how to do it

1. Define the states and the evaluation judgment of each language.
2. Define local rewrite rules with a state hole. Make each rule alter one local value or graph fragment.
3. Define ≤ as the reflexive-transitive closure of those rules; allow reading a rule in either direction when a proof needs abstraction or concretization.
4. Define a hybrid language as a controlled union of both rule sets. Exclude rules that would destroy stability of the lower language, and add rules needed to evaluate mixed states.
5. Prove preservation on the hybrid language by induction on the evaluation derivation, nested with induction on the ≤ derivation.
6. Prove that the lower language is a stable subset: a hybrid step from a lower state is also a lower-language step and remains in the lower state space.
7. Handle the rules excluded from the hybrid language separately, then compose the results with transitivity of ≤.

The paper's concrete hybrid example is HLPL+, the union of pointer-like HLPL and borrow-centric LLBC, with new pointer rules and restrictions on assignment. For the symbolic proof it builds LLBC+, excludes symbolic call introduction from the union, and introduces that behavior through ≤. This separation is what lets an induction encounter an intermediate state without pretending that the intermediate state belongs to either endpoint language.

### Verus form (inference)

Verus does not provide a direct notation for a reflexive-transitive closure over operational semantics. A practical encoding would define an inductive datatype of one-step state rewrites, a recursive predicate for its closure, and a state relation whose proof uses `inductive` lemmas. Hybrid states can be an enum containing both pointer and borrow forms, or a common state record with an explicit representation tag. The simulation theorem can be a `ensures` lemma: a related source state and one target evaluation imply an existential matching source state. `decreases` measures are required for recursive closure and big-step evaluation. The idea carries over; the paper's OCaml implementation and mathematical semantics do not carry over automatically.

### evidence and limits

The paper proves Theorem 2.2 (p. 5), forward simulation on the superset language, and Definition 2.3 (p. 6), stability. It then instantiates this template twice. No benchmark is attached to the proof method itself. The method assumes matching program syntax, inductive big-step evaluation, and carefully chosen excluded rules. It does not by itself prove compiler correctness or handle arbitrary language translations.

### what it is

LLBC models values attached to loans and borrows; PL models words in an explicit heap at addresses. The paper inserts HLPL, where values remain attached to locations and pointers, then relates HLPL to PL with a global location-to-address map and a heap invariant. It proves LLBC → HLPL with local rewrites, then HLPL → PL with the conventional global invariant. This makes the borrow-centric execution a sound restriction of a low-level execution.

The running example is a mutable borrow followed by a reborrow: `x = 0; px = &mut x; px = &mut (*px); assert!(x = 0)`. Ending the inner loan first and the outer loan second explains why reborrow nesting matters (Section 3.1, pp. 7–9). The paper's key conversion rule moves a value from a borrow to a location and its borrow to a pointer. In the authors' words, “This is the reason why we forbid moving outer loans in the LLBC rules” (Section 3.3, p. 14). The restriction preserves the correspondence between an HLPL location and its PL address.

### when to use it

Use this architecture when a high-level ownership model is easier to reason about than addresses but the result must be justified against a conventional memory model. It is also a pattern for isolating the one genuinely global invariant from otherwise local simulation proofs.

### how to do it

1. Define LLBC values for mutable/shared loans, mutable/shared borrows, ordinary values, and bottom (invalidated or uninitialized).
2. Define the operational rules for borrow creation, move, assignment, dereference, reorganization, and reborrow termination.
3. Define HLPL values using locations and pointers, retaining the same syntax and control flow.
4. Define local ≤ rewrites: mutable borrow/loan to pointer/location, shared borrow to pointer, shared loan to location, and a location-merge rule for stacked reborrows.
5. Define HLPL+ as the union semantics with rules that can evaluate mixed states. Replace borrow creation with pointer creation and restrict assignments so locations or outer loans cannot be overwritten unsafely.
6. Prove evaluation preserves ≤ by nested induction. Show the LLBC-only borrow rules can be simulated by a pointer step followed by a ≤ rewrite.
7. Define PL with typed heap blocks, offsets, and words. Add a global map from abstract locations to concrete addresses and an invariant connecting each HLPL value to its heap cells.
8. Prove the HLPL-to-PL forward simulation, then compose it with LLBC-to-HLPL. Shared borrows use the analogous shared conversion rules.

### Verus form (inference)

Represent a Verus heap as a map from abstract block identifiers and offsets to words, with ghost maps for location-to-address correspondence and ownership permissions. Encode each local rewrite as a ghost lemma over a state-with-hole record. The PL invariant becomes a quantified `forall` relation between LLBC values and heap slices; pointer arithmetic and typed projections need explicit bounds lemmas. Verus's `tracked` permissions can represent exclusive versus shared access, but the paper's exact borrow graph is richer than ordinary Rust types, so this is an encoding design rather than a direct translation.

### evidence and limits

Theorem 3.1 (p. 13) proves evaluation preserves the HLPL+ relation; Theorems 3.2 and 3.3 connect HLPL+ to HLPL and LLBC. Appendix B supplies the global-map proof for PL. The model covers a core, desugared Rust language, not all Rust, unsafe code, concurrency, or the compiler's LLVM lowering. PL's determinism is assumed and is used later; the paper does not establish a real compiler refinement theorem.

### what it is

Plain big-step semantics cannot distinguish safe divergence from a stuck computation because neither produces a terminating derivation. The authors add a natural-number fuel index to statement evaluation. At zero fuel, evaluation returns ∞; recursive calls and loops decrement fuel. They then define unindexed divergence as “returns either ∞ for diverging computations, or the previously seen pair of a control-flow outcome and an environment”, and termination as existence of a non-∞ fuel result.

### when to use it

Use this when a simulation proof is otherwise convenient in big-step style but must cover programs that safely diverge. It avoids coinductive definitions at the cost of indexed judgments and an extra argument in every rule.

### how to do it

1. Add `n` to each evaluation judgment.
2. Add a zero-fuel rule returning ∞.
3. Keep the same index across ordinary premises; decrement it on function calls and loop recursion.
4. Define unbounded divergence as ∀n, evaluation at n yields ∞.
5. Repeat the simulation proof by induction on the same index. Because all languages decrement at the same control-flow points, the index aligns across PL, HLPL, and LLBC.

### Verus form (inference)

Make fuel an explicit `nat` parameter and prove step-indexed preservation with `decreases fuel`. A separate theorem can quantify over all fuel values for divergence. This is straightforward for recursive Verus functions, but a total executable function that returns an infinite computation still needs a finite certificate interface; the paper's ∞ judgment is a logical relation, not a runtime value.

### evidence and limits

Figure 7 and Theorem 3.4 (p. 15) give the indexed rules and the divergence result. The complete indexed proofs are described as a straightforward adaptation and omitted. The method reasons about divergence but does not establish productivity, fairness, or termination.

### what it is

LLBC# is a nondeterministic symbolic semantics. It replaces unknown concrete values with fresh symbols and summarizes function-call ownership effects using region abstractions derived solely from signatures. A region abstraction records loans and borrows associated with a lifetime. The checker succeeds when every symbolic execution path either panics or ends in a state related to the signature's expected output.

The paper's `choose` example calls a function returning one of two mutable borrows. At the call, the input borrows are moved to bottom, the output gets a fresh symbolic borrow, and a fresh region abstraction records that the output lifetime keeps both inputs inaccessible. Ending the output loan ends the region abstraction, returning fresh symbolic values for the input borrows. This is semantic lifetime checking rather than syntactic lifetime inference. The authors state the soundness target as: “We therefore aim to establish a forward simulation from LLBC# to LLBC” (Section 4, p. 16).

### when to use it

Use this for modular checking of a function without opening the function bodies of its callees. It is appropriate when signatures expose ownership and lifetime relationships, while values and callee behavior are unknown. It is an abstraction, so it can reject safe programs when its nondeterministic heuristics cannot find a successful path.

### how to do it

1. For each function signature, allocate fresh symbolic argument values and region abstractions containing the input loans/borrows.
2. Initialize locals and the return slot to bottom; this is `Ω₀#` in Figure 10.
3. For a call, instantiate the signature: project argument borrows into the callee regions, create fresh symbolic output values, and connect output borrows to region loans.
4. Execute ordinary LLBC rules over symbolic values. Incrementing a symbolic value produces a fresh symbol; ending a loan reorganizes the region abstraction.
5. End a region only when it contains no loans; return its borrows to fresh anonymous variables, preserving the lifetime contract.
6. Compute the signature's expected final state `Ω₁#` with `final`.
7. Accept iff every result is panic or is related by ≤ to `Ω₁#`. Check each function independently, then use the theorem's environment assumption that all callees satisfy `borrow_checks`.

The directional merge operator for region abstractions is essential. Union is always sound but can leave a mutable loan and its borrow in a cycle. `MergeAbs-Mut` removes a loan/borrow pair in one direction; the reverse direction is deliberately absent. The paper's cyclic example shows that allowing both directions would incorrectly let an unsafe symbolic state pass.

### Verus form (inference)

Model symbols as an uninterpreted ghost value type and regions as ghost sets or sequences of loan/borrow records. Function signatures become `requires`/`ensures` contracts over tracked ownership tokens. A Verus wrapper can consume input tokens, produce a symbolic output token, and maintain a region invariant. The checker itself would likely be an external analyzer that emits Verus lemmas or contracts; Verus is a theorem prover, not a nondeterministic LLBC# interpreter. The directional merge invariant can be encoded as a lemma forbidding the reverse rewrite.

### evidence and limits

Theorem 4.1 (p. 18) proves successful LLBC# evaluation has a corresponding safe LLBC execution, assuming every function in the environment passes `borrow_checks`. Theorem 4.2 (p. 22) derives a backward simulation from PL to LLBC and, with PL determinism, a bisimulation for borrow-checked programs. The theorem treats panic as safe and permits divergence. It trusts the signature environment, the LLBC semantics, and PL determinism; it does not prove that a source Rust program was correctly translated to LLBC.

### what it is

LLBC# originally collects one state per branch, causing path explosion. The paper introduces a pointwise join followed by collapse. Join compares each variable in two environments. Equal values are kept; unequal plain values become a fresh symbol; bottom on either side yields bottom; differing borrows and loans create fresh identifiers and region abstractions. Values are marked by origin (left or right) so that a mutable borrow is not duplicated accidentally. Collapse removes those markers and duplicate loans/borrows using the existing region-merge rules.

The authors summarize the implementation discipline exactly: “In practice, we perform the join in two phases.” (Section 5.1, p. 23.) The soundness theorem requires that collapse produce an unmarked LLBC# state. Under that condition, the result is related to both inputs, so execution can continue from one state. The running example joins two branches that move either `px` or `py` into `p`; the result keeps both `x` and `y` loaned and represents `p` as a fresh borrow constrained by one region abstraction.

### when to use it

Use it after an if-then-else or any merge point where retaining all symbolic states would multiply paths. Use collapse whenever the pointwise join creates repeated mutable borrows, repeated loans, or origin markers. If collapse cannot remove all markers, reject the join rather than claim soundness.

### how to do it

1. Pair variables in the two environments.
2. Apply value-join rules recursively through tuples, sums, boxes, loans, and borrows.
3. Keep equal values; abstract unequal ordinary values to a fresh symbol.
4. For bottom versus a value, abstract the value into a region and return bottom.
5. For two mutable borrows, create a fresh mutable borrow and a region containing both source borrows and the fresh loan; record each value's origin.
6. For shared borrows and loans, use their corresponding fresh identifiers and shared-loan premises.
7. Join environment-level region abstractions and anonymous bindings.
8. Collapse: merge abstractions with the directional Z operator, remove duplicate mutable/shared borrows and loans, and freshen unequal shared-loan values.
9. Check that no marked value remains. Apply Theorem 5.1 to resume symbolic execution from the collapsed state.

### Verus form (inference)

Represent a joined state as a ghost state carrying an origin tag, then prove a projection lemma for each side. Collapse is a sequence of ghost rewrites proved to preserve each projection's relation. A `forall` lemma can state that the final unmarked state refines both branch states. For executable Verus code, the join algorithm would be outside the verifier; Verus would check the emitted relation and branch-specific postconditions. Mutable ownership cannot be duplicated in ordinary tracked permissions, so the origin-and-collapse proof is the critical bridge.

### evidence and limits

Theorem 5.1 (p. 25) states: if join then collapse yields an unmarked state, both inputs are ≤ that state. Appendix E proves it using left/right projections, lemmas for value joins, state joins, abstraction merging, and collapse. The theorem is conditional and does not show that collapse always succeeds. The implementation uses heuristics and can raise an error; this incompleteness is a deliberate soundness-preserving failure mode.

### what it is

Loops can generate infinitely many paths and fresh loan identifiers. The paper observes that exact state inclusion is too strict: a loop body's state can be the same ownership shape with different loan and region names. It therefore compares shape graphs up to identifier substitution. The loop algorithm converts anonymous mappings into region abstractions, flattens related abstractions, joins the result with the loop-entry snapshot, and repeats until the normalized shape is unchanged.

The authors explicitly avoid an unconditional termination claim: “Our implementation of LLBC# fails if the fixpoint computation does not converge after a fixed number of steps.” (Section 5.2, p. 26.) In the toy reborrow loop, the fixpoint is reached in one step up to fresh-name substitution. Appendix F repeats the procedure on a list traversal that reborrows the tail.

### when to use it

Use this for loops whose iterations preserve an ownership shape while allocating fresh loan or region identifiers, especially recursive data-structure traversals. Set a finite iteration limit and report failure when normalization does not converge.

### how to do it

1. Save the abstract environment at loop entry.
2. Execute one loop body iteration symbolically.
3. Convert fresh anonymous values to region abstractions with `Le-ToAbs`.
4. Flatten by merging abstractions that contain related borrows and loans for the same identifier.
5. Join the normalized body state with the entry snapshot.
6. Collapse the join and alpha-rename fresh loan/region identifiers before comparison.
7. If the normalized shape is unchanged, use it as the fixpoint; otherwise repeat up to a fixed bound.

### Verus form (inference)

The Verus analogue is a loop invariant quantified over a shape relation that is insensitive to ghost identifier names. A ghost bijection between iteration-local loan IDs and canonical IDs can express alpha-equivalence. The executable loop still needs a conventional `invariant` and `decreases` measure if it terminates; for potentially unbounded loops, the checker can emit an invariant certificate while Verus proves one-step preservation. The paper's heuristic convergence test would remain an external analysis step.

### evidence and limits

The evaluation reports 22 micro-tests totaling 300 lines of code and hashmap plus B-epsilon-tree case studies totaling 867 lines. The extended interpreter successfully borrow-checks all the examples, requiring less than 1s for the whole test suite (Section 6, pp. 26–27). The paper gives no denominator for how many attempted programs failed, no per-test timing, and no independent reproduction measurement. The one-step convergence observation is empirical, not a termination theorem.

## what is proved, measured, and trusted

Proved: the local/hybrid simulation template; LLBC-to-HLPL forward simulation; HLPL-to-PL simulation with a heap invariant; step-indexed divergence preservation; LLBC#-to-LLBC soundness under per-function borrow checking; PL/LLBC backward simulation and conditional bisimulation; and join-collapse soundness when the result is unmarked. The proofs are presented as mathematical theorems with detailed appendices, not as a machine-checked artifact in this paper.

Measured: an OCaml extension of about 3,000 lines, 22 micro-tests (300 nonblank/comment-free lines), and two case studies (867 lines), all accepted in under one second total. The updated `get_suffix_at_x` example is accepted by the LLBC# interpreter, while `rustc` reports E0499; the paper says only Polonius and Aeneas accept the updated loop version. These are claims about the stated test suite, not a soundness result for all Rust.

Trusted or assumed: the LLBC language model and its desugaring from Rust; the PL memory model and determinism; correctness of the implementation's heuristics and parser; the function signatures supplied to LLBC#; the exclusion of unsupported Rust features; and the unshown compiler/extractor path from source Rust to LLBC. The conditional theorems do not remove these trusted boundaries.

## contradictions, accounting, and failure modes

The paper calls the join “(naturally) incomplete” (Section 1) and later says the implementation fails after a fixed number of nonconverging steps; these are consistent, but mean the reported success on all examples (the study's reading: a 100% rate) is only over the selected suite. The 3,000 OCaml lines are implementation size, whereas 300 and 867 are input Rust lines; they must not be compared as a proof-size ratio. The phrase “all the examples” has no denominator beyond the stated 22 micro-tests and two case studies, and “less than 1s” has no hardware or per-example breakdown. The paper claims PL/LLBC bisimulation only under successful borrow checking and PL determinism, so it must not be read as unconditional equivalence.

Failure is conservative at the join/fixpoint boundary: a marked value left after collapse or a nonconverging loop causes rejection/error. The symbolic semantics is nondeterministic and heuristic, so an implementation must find a successful derivation rather than merely execute one deterministic path. Big-step proofs cover divergence only after adding the step index. The scope excludes unsafe Rust and does not certify LLVM compilation.

## product risk assessment (inference)

The paper is a high threat to any product that treats Rust's compiler borrow checking as the entire ownership assurance story: it demonstrates a richer semantic checker that can accept a loop rejected by `rustc`, and it supplies a concrete proof architecture connecting ownership states to heap execution. It is a moderate threat to a Verus-based product's distinct value. The paper does not generate specifications, write proofs, or establish source-to-LLBC/compiler correctness; its all-examples-pass result is on a small curated suite, and its heuristic analysis can fail. An agent-writing Verus code still needs functional specifications, invariant synthesis, solver guidance, and trusted translation boundaries. The strongest product risk is therefore capability overlap in borrow/alias analysis and semantic frontends, not replacement of end-to-end verified Rust generation.

## techniques for the catalog

- local-and-hybrid simulation proofs — replace a global state relation with local rewrites, prove preservation in a hybrid union language, and recover endpoint simulation through stability
- heap bridge for valued borrows — relate borrow/loan states to pointers and locations, then connect locations to an explicit heap with a global address invariant
- step-indexed divergence — add fuel to big-step semantics so safe divergence is represented and simulated across languages
- symbolic region borrow checking — instantiate function signatures with fresh symbols and region abstractions, then accept only states related to the signature's final state
- directional region merging — use a one-way merge of loan/borrow pairs to abstract lifetimes without allowing cyclic ownership states to pass
- join-collapse analysis — pointwise-join branch environments with origin markers, collapse duplicates, and require an unmarked result before continuing
- alpha-equivalent loop fixpoints — normalize anonymous mappings and compare ownership shapes up to fresh loan/region identifier substitution
- deterministic-backend bisimulation — compose forward simulations with deterministic PL execution to obtain a backward direction for programs that pass the checker

## study status

This study was written from the batch PDF whose first page begins with the exact title “Sound Borrow-Checking for Rust via Symbolic Semantics” (the paper test passed before reading). All quotations are intended to be verbatim PDF text and are checked by `check_study.py`.
Audited 2026-10-12 against the paper: checked every theorem and definition number and page (2.1 p4, 2.2 p5, 2.3 p6, 3.1 p13, 3.4 p15, 4.1 p18, 4.2 p22, 5.1 p25), the quotations and their pages, the figures 22, 300, 867 and 3000, the under-1s claim, the E0499 and Polonius claim, the join, collapse, directional merge and loop-fixpoint steps, and the fuel semantics; changed the misquoted phrase on incompleteness to the paper wording, removed an unsupported mention of a determinism proof, widened one page reference, marked the 100% rate as the study's reading, and dropped a stale drafting remark; Verus forms are labeled inference and are sound as design sketches; not checked line by line: the appendix proofs and Figures 8 to 9.
