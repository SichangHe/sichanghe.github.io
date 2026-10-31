# Sound Borrow-Checking for Rust via Symbolic Semantics (Long Version)
(authored by agents unless marked 🧑)
Tag: `ho2024soundb`, [paper](https://arxiv.org/abs/2404.02680v2)

## scope and prior notes

This long version formalizes why Aeneas's LLBC symbolic semantics can act as a borrow checker for Rust-like LLBC programs, and adds a sound join operator for branches and loops. This study concentrates on the long version's extra simulation detail, partial-state framing, backward simulation, joins, loop fixpoints, and evaluation. The paper is not a Verus paper. All Verus mappings below are my inference.

The central pipeline has three semantics. PL is a low-level heap-and-address language. LLBC is a borrow-centric language with loans, borrows, places, reborrows, and two-phase borrows. LLBC# is the symbolic abstraction used by Aeneas. The paper proves a forward simulation from LLBC# to LLBC, then LLBC to PL; for programs that pass symbolic borrow checking it proves a backward simulation and therefore a bisimulation between LLBC and PL. The abstract states may contain fresh symbolic values, region abstractions, and invalidated `⊥`, which safely forget concrete values while retaining ownership constraints.

The abstract states are not ordinary test traces. A successful symbolic evaluation gives a theorem about all concrete executions represented by the abstraction, conditional on the semantics, function signatures, and proof assumptions.

## technique: prove a simulation chain instead of trusting the checker

use conditions

To justify a symbolic verifier, define a relation between abstract and concrete states and prove that every abstract step has a related concrete step. Use this when a tool claims that successful symbolic execution implies safe execution.

how to do it

1. Define the low-level PL operational semantics, including heap locations and pointers.
2. Define LLBC's borrow-centric states and reduction rules for mutable/shared borrows, reborrows, moves, assignments, and reorganization.
3. Define a relation `≤` from a concrete state to a more abstract state; abstraction may replace values by symbols and convert borrow/loan structure to region abstractions.
4. Prove evaluation preservation for the intermediate HLPL+ language and then a forward relation from HLPL to the heap model.
5. Prove that each LLBC# evaluation step preserves `≤` to an LLBC execution.
6. Compose relations: LLBC# success implies an LLBC execution, which implies a PL execution.
7. For borrow-checked programs, prove the reverse direction from PL to LLBC, yielding bisimulation and preservation of returned results.

The paper states its goal as proving “that LLBC’s symbolic semantics act as a borrow-checker for LLBC.” (abstract, page 1) It also describes the relation's consequence: “if the borrow checker succeeds, then the program executes safely.” (section 4, page 16)

Verus form (inference)

A Verus product should model the concrete Rust state and the verifier's ghost state with a refinement predicate. Each symbolic execution rule becomes a proof lemma preserving refinement. A top-level `proof fn` can show that successful abstract checking implies the concrete postcondition. Verus already checks Rust code directly, so this architecture is most useful for validating a separate proof-search or borrow-analysis layer; it is not needed for ordinary Verus contracts.

evidence and limits

The chain is formalized by theorems 3.1–3.4, 4.1, and 4.2, with long proofs in appendices. It assumes the PL semantics faithfully models execution and that all functions in the program satisfy `borrow_checks`. It proves semantic soundness, not completeness: a safe program may fail symbolic checking.

## technique: use a borrow-centric LLBC state with explicit loans and borrows

use conditions

Model ownership directly rather than translating immediately to a conventional heap. An LLBC environment maps variables and places to values such as mutable/shared loans, mutable/shared borrows, symbols, and `⊥`. Loan identifiers connect an owner to references; mutable borrows carry the borrowed value, which makes reborrows explicit.

how to do it

1. Desugar Rust into places, rvalues, statements, function calls, and explicit borrow operations.
2. Represent `&mut p` as a fresh mutable loan at `p` and a mutable borrow value carrying the borrowed value.
3. Represent `&p` as a shared loan and shared borrow.
4. For a reborrow `&mut (*px)`, nest a fresh loan inside the existing borrow and transfer the active reference.
5. Use `⊥` for moved or invalidated places.
6. Add reorganization rules that end borrows when their borrowed values are available, possibly early but conservatively.
7. Track two-phase borrows and reserved borrows in the operational rules.

In the paper's running example, line 2, px = &mut x, leaves x mapped to a mutable loan with identifier ℓ0 and px mapped to a mutable borrow of ℓ0 holding 0; line 3 then reborrows with a nested loan (section 3.1, page 7). It emphasizes that mutable borrows “carry” the value they borrow (section 3.2, page 10).

Verus form (inference)

Verus's Rust type checker already enforces concrete ownership, while ghost state can model permission tokens, regions, or abstract borrows. Use ghost maps keyed by loan identifiers and predicates connecting a mutable reference to its owned location. A Verus proof need not expose compiler MIR, but an external checker for agent-written code could use this LLBC-shaped intermediate representation.

evidence and limits

The model handles mutable/shared borrows, reborrows, moves, and two-phase patterns. Shared borrows are simpler because their loan values are immutable. The semantics is a core language after desugaring; unsupported Rust features must first be translated or are outside the theorem.

## technique: relate borrow-centric states to heap-and-address states through local transformations

use conditions

Introduce HLPL and PL to bridge LLBC's borrow-centric values with a conventional heap. HLPL uses locations and pointers but no explicit borrow graph; HLPL+ temporarily admits both forms. A local `≤` transformation gradually converts loans/borrows into locations/pointers while preserving behavior.

how to do it

1. Define PL with an explicit heap and addresses and deterministic pointer operations.
2. Define HLPL with locations that carry values and pointers that refer to locations.
3. Extend HLPL to HLPL+ with rules that can represent both pointers/locations and LLBC loans/borrows.
4. State local refinement rules such as converting a mutable borrow/loan pair to a pointer/location pair.
5. Prove that every HLPL+ evaluation preserves the relation (`Eval-Preserves-HLPL+-Rel`).
6. Prove HLPL is a stable subset of HLPL+, then derive a forward relation between HLPL+ and HLPL (Theorem 3.2); the step from HLPL to PL is a separate theorem (Theorem B.2, section 3.3).
7. Use transitivity to connect LLBC executions to PL executions.

The authors explain that the conversion “amounts to losing information about the nature of the borrows, in order to only” retain the pointer/location structure (section 3.2, page 11). The crucial conversion moves the borrowed value from a borrow to a location.

Verus form (inference)

evidence and limits

The proof of Theorem 3.1 is, in the paper's words, a nested case analysis: first for each reduction step, then for each local transformation step (section 3.2, page 14). The relation is designed for the modeled semantics; it does not establish that rustc's implementation is identical to PL, and it leaves a separate proof obligation for a concrete borrow checker.

## technique: symbolic execution with region abstractions and fresh values

use conditions

Replace unknown concrete values with fresh symbolic values, and summarize caller-owned borrows in region abstractions. Use this to check a function modularly without knowing the caller's heap or exact argument values.

how to do it

1. `init` receives argument types and lifetimes.
2. Allocate fresh symbolic values for arguments and fresh loans/borrows for references.
3. Put input loans and borrows in an abstraction `A_in(ρ)` for each lifetime region.
4. Initialize local variables and the return variable as uninitialized (`⊥`).
5. Symbolically execute the body using LLBC# rules.
6. At exit, use `final` to reorganize outer loans, move local values into fresh abstractions, turn returned values into symbols where needed, and merge abstractions.
7. Check that the resulting state refines the expected signature-derived output state `A_sig(ρ)`.

The paper calls `A_in` “an abstraction barrier between the local state (the callee) and some external state (the caller)” (section 4.3, page 21). In `choose`, the symbolic checker can verify either branch returning one of two mutable references without knowing which concrete reference was selected.

Verus form (inference)

At a function boundary, initialize ghost arguments with arbitrary values satisfying their types and ownership predicates. Represent lifetime-region summaries with ghost sets of loans. Prove that the function's `ensures` relation matches the region summary. `arbitrary`/symbolic values must be constrained by type and permission invariants; Verus's executable references remain concrete.

evidence and limits

The method is modular because each function can be checked from its signature. It relies on valid signatures and on handling partial states whose borrows may have loans outside the local environment. A bug in `init`, `final`, or signature materialization would undermine the checker, so these components are part of the trusted proof development.

## technique: reason over partial states with framing

use conditions

Permit local symbolic states in which a borrow's corresponding loan is outside the current environment. Use a frame relation to compose the callee's partial state with disjoint caller state, mirroring separation-logic framing.

how to do it

1. Define partial states and a disjoint frame `Ω_f` containing external loans.
2. Prove that evaluating `Ω#` to `Ω'#` leaves a disjoint frame unchanged.
3. Prove the analogous framing property for `≤` transformations.
4. Convert a concrete caller state into a partial abstract callee state related by `≤`.
5. Apply symbolic call evaluation and frame the result back into the caller context.
6. Use this lemma to justify `E-Call-Symbolic` and modular function checking.

The paper says the framing lemma states that when a state evaluates, “we can compose Ω0# with a disjoint frame Ω#f which doesn’t get modified during the evaluation.” (section 4.3, page 21)

Verus form (inference)

Model a frame as a ghost map disjoint from the function's footprint. Add disjointness and unchanged-frame clauses to function contracts. Verus's ownership system often gives concrete frame guarantees, but ghost collections still need explicit preservation lemmas.

evidence and limits

The proof requires local evaluation rules and carefully designed call/signature predicates. The frame is disjoint by construction; aliasing that violates disjointness is rejected by the symbolic rules or lies outside the theorem.

## technique: prove borrow-checker soundness by forward and backward simulation

use conditions

Forward simulation establishes that every successful LLBC# execution corresponds to a valid LLBC execution. Backward simulation, assuming all functions borrow-check, shows that every PL execution has a related LLBC execution. Together with PL determinism, this yields result preservation and bisimulation for accepted programs.

how to do it

1. Prove Theorem 4.1: if initial LLBC and LLBC# states are related and symbolic execution succeeds, there exists an LLBC execution with related outcome.
2. Define `borrow_checks f` as symbolic checking of each function body against its signature.
3. For a PL state related to LLBC and LLBC related to the initialized LLBC# state, invoke the forward theorem.
4. Use the LLBC-to-PL forward relation and PL determinism to match results.
5. Conclude Theorem 4.2: any PL execution has a related LLBC result for programs where all functions pass checking.

The paper's theorem summary says successful symbolic checking implies a “safe LLBC evaluation” and, by the simulation relation, a safe concrete execution (section 4, pages 16–18).

Verus form (inference)

A Verus proof of a custom analyzer can encode the analyzer state and prove each transition's refinement. To establish backward coverage, prove that every concrete Rust operation accepted by the target semantics has an analyzer counterpart. This is much stronger than verifying generated application code and should be isolated as infrastructure work.

evidence and limits

The result is conditional on all functions in `P` satisfying `borrow_checks`, valid initial relations, and deterministic PL execution. It says nothing about rejected programs or analyzer completeness. Bisimulation is shown for the modeled LLBC/PL pair, not directly for rustc.

## technique: join symbolic environments after branches

use conditions

Merge two LLBC# environments into one soundly more general environment to avoid path explosion. Use this after `if` branches or other disjunctive control flow when retaining every symbolic state would become exponential.

how to do it

1. Evaluate both branches to environments `Ω0` and `Ω1`.
2. Join variables pointwise. Keep equal values; replace unequal ordinary values with a fresh symbol.
3. If one side has `⊥`, use `⊥` in the join because access is unavailable on one path.
4. For differing permissions, choose the conservative lower permission (for example, a loan remains loaned).
5. For borrows from different loans, create a fresh borrow and region abstraction linking both source borrows and the new loan.
6. Track the origin (left/right) of values to detect duplicate mutable borrows.
7. Collapse marked values and duplicate abstractions until a well-formed LLBC# environment with no marks remains.
8. Resume symbolic execution from the collapsed state.

The branch example joins `p` borrowing either `x` or `y` into a fresh borrow linked to both through a region abstraction. The authors state: “A join is naturally computed as a pointwise operation over the variables in both environments.” (section 5.1, page 23)

Verus form (inference)

For ghost states after branch proofs, define a join predicate that conservatively intersects permissions and existentially summarizes branch-specific references. A Rust reference that may point to either location should be represented by an abstract permission token, not an unsound concrete alias. Prove branch-to-join refinement before continuing the common suffix.

evidence and limits

Theorem 5.1 (`Join-Collapse-Le`) proves that if collapse terminates with no marked values, the result relates to both branch environments. The collapse implementation uses heuristics and can fail; the authors explicitly call it incomplete. A join therefore trades path count for loss of precision and possible checker failure.

## technique: collapse marked environments while preserving both projections

use conditions

The pointwise join may temporarily contain marked values and duplicate borrows that are not legal LLBC# states. Collapse is a local rewrite system that merges abstractions, removes duplicate mutable borrows, and erases branch-origin marks.

how to do it

1. Mark each value with its branch origin during join.
2. Merge region abstractions using the existing abstraction-merge rules.
3. Apply duplicate mutable-borrow collapse when the same loan appears twice.
4. Check that no marked value remains in the result, the condition of Theorem 5.1.
5. Reject or report failure if no mark-free derivation is found.
6. Use state projections retaining only left or right markers to prove each branch remains related.

The soundness condition is exact: “if the composition of join and collapse yields an LLBC# state Ωc ... then this state is related to both Ωl and Ωr.” (section 5.1, page 24)

Verus form (inference)

Treat collapse as a proof-producing normalization over ghost permissions. Each rewrite lemma preserves a relation to the source branch. Do not erase branch tags by an untrusted cast; require a final `no_marked` predicate before using the joined state.

evidence and limits

The theorem is conditional on successful mark elimination. Heuristic search may fail even when another collapse derivation exists. The paper reports no completeness theorem or failure percentage for collapse.

## technique: compute loop fixpoints up to loan-identifier renaming

use conditions

Handle loops by repeatedly joining the loop-entry environment with the environment after one body iteration. Since each reborrow creates fresh loan identifiers, compare states up to substitution of loan and region identifiers rather than literal equality.

how to do it

1. Snapshot the environment at loop entry.
2. Symbolically execute one loop body.
3. Convert fresh anonymous mappings to region abstractions.
4. Flatten the environment by merging abstractions associated with related loans.
5. Join the normalized body state with the entry snapshot.
6. Compare the result up to fresh identifier substitution (graph isomorphism of the borrow shape).
7. Repeat until a fixpoint or a configured iteration limit.

The paper says “it is actually sufficient to consider a fixpoint up to loan and region identifier substitution.” (section 5.2, page 25) Its toy loop repeatedly reborrows `p` and increments through it; the normalized state stabilizes while identifiers change.

Verus form (inference)

For a loop over a mutable reference, formulate a loop invariant parameterized by an abstract permission identity rather than a concrete borrow ID. Use `invariant` and `decreases` clauses, and prove that each iteration preserves the invariant modulo ghost-token renaming. Verus generally requires an explicit invariant; an analyzer implementing this technique can search for the renaming automatically.

evidence and limits

The authors explicitly do not claim termination: “we do not claim that our approach terminates.” The implementation fails after a fixed number of iterations if no fixpoint is found. They report convergence in one step for the evaluated examples, but this is empirical, not a general bound.

## implementation and evaluation

The extended LLBC# interpreter is about 3,000 lines of OCaml. The test suite has 22 micro-tests totaling 300 lines of Rust (excluding blanks/comments), covering loops, vector updates, array/slice sums, in-place list reversal, and retrieving the nth shared or mutable list borrow. The larger test consists of Aeneas hashmap and B-tree implementations totaling 867 lines, rewritten from recursive traversals to idiomatic loops. The interpreter successfully borrow-checks all examples in less than one second for the whole suite.

The paper also gives a minimized `get_suffix_at_x` loop that rustc rejects with E0499 (“cannot borrow `*ls` as mutable more than once”) but that Polonius and Aeneas accept. This demonstrates that LLBC# can be more precise than today's borrow checker for some safe patterns; it does not show that every accepted program is accepted by rustc or that the analyzer is complete.

The denominators are explicit: 22 micro-tests, 300 Rust LOC, 867 larger-program LOC, and all examples accepted. No random corpus, bug rate, or percentage of Rust is reported. The speed is for one machine and the complete suite, not per-program worst case. The join/collapse heuristics and symbolic interpreter remain trusted implementation components in addition to the semantic proofs.

## what is proved, trusted, and assumed

The paper proves forward simulation from symbolic LLBC# to LLBC, simulation from LLBC to PL, borrow-checker soundness, backward simulation for accepted programs, and join-collapse soundness under mark-free collapse. The appendix contains detailed induction proofs over evaluation, reorganization, abstraction, join, and collapse derivations.

The model assumes a correct LLBC desugaring, well-formed function signatures and lifetimes, deterministic PL execution for the backward result argument, and successful `borrow_checks` for every function called. It does not prove that rustc, Polonius, or Aeneas implementations themselves are free of bugs. It also does not prove termination of loop fixpoint search or completeness of collapse heuristics.

I found no arithmetic contradiction in the reported evaluation numbers. The strong “all examples” result has a small denominator (22 micro-tests plus 867 LOC of data-structure code). The fact that Aeneas accepts a function rustc rejects is a precision comparison, not evidence that rustc is unsound.

## techniques for the catalog

- simulation-chain soundness — prove abstract-to-concrete forward simulation and, for accepted programs, concrete-to-abstract backward simulation
- borrow-centric LLBC modeling — represent loans, borrows, reborrows, moves, and invalidation explicitly
- heap refinement — relate borrow-centric states to pointer/location semantics through local transformations
- symbolic function checking — initialize fresh values and region abstractions from signatures, then check the body against expected outputs
- partial-state framing — compose local symbolic states with unchanged disjoint caller frames
- join and collapse — merge branch environments conservatively, track origins, and normalize marked duplicate borrows
- identifier-renamed loop fixpoints — iterate joins while comparing borrow graphs up to fresh loan/region renaming
- heuristic-failure accounting — require mark-free collapse and bounded convergence, treating failures as incompleteness

Audited 2026-10-12 against the paper: checked the theorem numbers and directions (3.1-3.4, 4.1, 4.2, 5.1), the join, collapse, loop-fixpoint and framing steps, the evaluation numbers (about 3000 lines of OCaml, 22 micro-tests of 300 lines, 867 lines, under 1 second), the E0499 example, page references and the Verus-form paragraphs (all marked as inference). Changed: the HLPL-to-PL step, the direction of the forward relation in the backward-simulation steps, the proof method of Theorem 3.1 (case analysis, not induction), the unverifiable first-person search sentence, the collapse mark-removal step, and three page references (carry on page 10, framing on page 21, join soundness on page 24); replaced a non-verbatim quotation of the running example with prose.
