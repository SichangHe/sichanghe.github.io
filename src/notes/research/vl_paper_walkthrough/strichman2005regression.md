# Regression Verification - A Practical Way to Verify Programs
(authored by agents unless marked 🧑)
Tag: `strichman2005regression`, [paper](https://www.semanticscholar.org/paper/c0107f9683b7cbbdde7643fb391387d7e39e7622)

## purpose and result

Regression verification checks that a revised program preserves selected behavior of an earlier version. It is intended for code whose full formal specification is difficult to write. The paper says, “Regression Testing does not require a formal speciﬁcation of the investigated system nor a deep understanding of the code, which makes it highly suitable for accompanying the development process.” (Sect. 1, p. 496). The proposed proof engine is a certifying compiler, with equivalence reduced—without completeness—to an assertion on a merged program.

The target scenarios are side effects of new flags, performance optimizations, and manual refactoring. The paper’s practical scope is a prototype for two closely related C programs using CBMC bounded model checking. It reports no benchmark table or success rate; this is a proposal and prototype description, so there are no denominators or measured speedups to transfer to VL.

## technique: relational regression contract

What it is. Compare old and new programs on the same inputs and assert equality at chosen program locations. The user supplies pairs of labels and expressions, one in each version; the tool checks that the expression sequences are equal for all inputs. Outputs are a special case, and internal variables can be compared to localize changes.

Steps from Sect. 2.2 (pp. 498–499):

1. Choose corresponding labels and expressions, such as old output and new output.
2. Supply a list of pairs ⟨label#1, expression#1⟩, ⟨label#2, expression#2⟩.
3. Build a combined C program containing both versions, unroll it, and check the equality assertions with CBMC.
4. Inspect counterexamples; classify each as an error or an intentional change.
5. Update the allowed-change description when a difference is legitimate. The authors plan symbolic descriptions because “there can be an exponential number of examples due to a single change.” (Sect. 2.2, p. 499).

The paper defines the intended relation as follows: “the sequence of values of these two expressions in these locations should be equal regardless of the inputs.” (Sect. 2.2, p. 498).

Verus form. Inference: write a Rust wrapper that runs both old and new pure functions on the same input and state, then prove an `ensures` equality for selected outputs or internal summaries. Use `requires` to express an allowed-change condition such as a disabled flag, and `old(...)` when relating pre-state values. For stateful code, prove a relational loop invariant over paired states. Verus proves the chosen relation for all modeled inputs, but it cannot infer which locations represent intended behavior; the labels and expressions remain a human design choice.

When to use it. Use regression verification after refactoring or optimization when a complete high-level specification is unavailable but a trusted previous implementation exists. It is especially useful when the change is expected to preserve outputs conditionally. The paper cautions that equivalence is generally undecidable: “Without completeness, the equivalence problem can be reduced to one of proving an assertion on a merged program.” (Sect. 1, p. 496).

## technique: CBMC bounded relational checking

The prototype uses CBMC because it handles full ANSI-C and C++. For each loop, the user supplies a bound ki. CBMC symbolically represents executions up to those bounds as a propositional formula f; satisfiability of f ∧ ¬a gives a path violating assertion a. An unwinding assertion checks whether the loop condition is still possible after ki iterations. The paper states, “cbmc can be thought of as a complete tool as long as all the loops are terminating.” (Sect. 2.1, p. 498).

Steps: select loop bounds; generate the merged program and equality assertions; ask CBMC for a satisfying counterexample; add unwinding assertions; increase bounds or prove termination when unwinding fails. Verus form (inference): replace bounded exploration with a verified Rust loop proof and an inductive invariant; use `ensures` for the relational postcondition. CBMC’s completeness qualification depends on terminating loops and sufficient bounds; a Verus proof does not inherit CBMC’s bounded model assumptions.

## technique: uninterpreted-function abstraction with side effects

What it is. Hide unchanged function bodies in both versions while preserving equal return values and writes when arguments and read globals agree. Let f and f′ read Gr, write Gw, and have equal arguments and equal Gr values. Replace each body by fresh integer variables fv and fv′ plus the conservative constraint:

`(∧(xi = x′i) ∧ ∀gr ∈ Gr . gr = gr′) → (fv = fv′ ∧ ∀gw ∈ Gw . gw = gw′)` (Eq. 1, Sect. 2.3, p. 499).

Steps: identify syntactically equivalent function pairs; compute read set Gr and write set Gw; replace bodies by uninterpreted values; add Eq. 1; prove equality of inputs and read globals at each call; let the relational checker reason about the reduced program. The abstraction can be applied at finer Uninterpreted Scopes to reduce propagation of changes through callers.

Limits are explicit. Recursive or mutually recursive functions require induction. A changed function invalidates ancestor replacements unless semantic equivalence or finer scopes recover them. Pointers make Eq. 1 unusable directly because corresponding pointers have different addresses; pointer-isomorphism analysis is future work. Inference: in Verus, model an abstract function with a `spec fn` relation and prove a `proof fn` that equal arguments and read-state snapshots imply equal returns and writes. The abstract relation must not be marked `external_body` on the function being verified; any external axiom is trusted.

## evidence, assumptions, and product impact

The paper argues for a verification workflow and describes a CBMC-based prototype; it does not report a completed machine-checked equivalence proof, benchmark count, runtime, or defect-detection rate. Trust includes the old program, the chosen correspondence points, allowed-change policy, CBMC encoding, loop bounds/unwinding, compiler, and any uninterpreted-function abstraction. Inference: for agent-written verified Rust, regression proofs can guard refactors and optimizations when a prior version is a suitable behavioral oracle, but they do not prove the original version correct and can preserve an existing bug. The key reusable idea is a relational proof obligation whose cost tracks differences between versions; the paper says the goal is for complexity to depend “only on the diﬀerences between the two programs ... rather than on their original sizes.” (Sect. 1, p. 497).

## techniques for the catalog

- relational regression contract — assert equality of selected old/new expressions under the same inputs
- bounded relational checking — merge versions, unroll loops, and search CBMC’s propositional formula for counterexamples
- unwinding validation — add loop unwinding assertions and increase bounds until termination is justified
- side-effect-aware uninterpreted functions — abstract unchanged function bodies while constraining returns and writes
- uninterpreted scopes — limit abstraction to smaller regions so changes propagate to fewer callers

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
