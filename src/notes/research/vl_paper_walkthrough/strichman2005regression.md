# Regression Verification - A Practical Way to Verify Programs
(authored by agents unless marked 🧑)
Tag: `strichman2005regression`, [paper](https://www.semanticscholar.org/paper/c0107f9683b7cbbdde7643fb391387d7e39e7622)

## purpose and result

Source: Ofer Strichman and Benny Godlin, a short note in B. Meyer and J. Woodcock (eds.), Verified Software, LNCS 4171, pp. 496–501, 2008 (page numbers below are from this printing; the tag year 2005 is not stated in the paper text).

Regression verification checks that a revised program preserves selected behavior of an earlier version. It is intended for code whose full formal specification is difficult to write. The motivation comes from regression testing, of which the paper says, “Regression Testing does not require a formal specification of the investigated system nor a deep understanding of the code, which makes it highly suitable for accompanying the development process.” (Sect. 1, p. 496). The authors propose to “learn from this experience and develop techniques for Regression Verification”, and say “The underlying proof engine is still a certifying compiler as envisioned by the grand challenge”. They state that equivalence can be reduced, without completeness, to proving an assertion on a merged program.

## technique: relational regression contract

What it is. Compare old and new programs on the same inputs and assert equality at chosen program locations. The user supplies pairs of labels and expressions, one in each version; the tool checks that the expression sequences are equal for all inputs. Outputs are a special case, and internal variables can be compared to localize changes (Sect. 2.4, p. 500).

Workflow from Sect. 2.2 (pp. 498–499). The paper names two user phases; the tool part is described in one sentence:

1. The user supplies a list of pairs ⟨label#1, expression#1⟩, ⟨label#2, expression#2⟩, saying that expression#1 at label#1 in the first program should always equal expression#2 at label#2 in the second.
2. The tool generates “a combined C program that is unrolled and checked by cbmc”, with simplifications and abstractions using Uninterpreted Functions.
3. When CBMC finds a counterexample, the user confirms whether it is an error or a legitimate change from further development.
4. Planned, not described as implemented: the user will describe the allowed changes symbolically and choose dynamically the subset of outputs to concentrate on. The motivation is that “there can be an exponential number of examples due to a single change” (Sect. 2.2, p. 499).

The paper defines the intended relation as follows: “the sequence of values of these two expressions in these locations should be equal regardless of the inputs.” (Sect. 2.2, p. 498).

Verus form. Inference: write a Rust wrapper that runs both old and new pure functions on the same input and state, then prove an `ensures` equality for selected outputs or internal summaries. Use `requires` to express an allowed-change condition such as a disabled flag, and `old(...)` when relating pre-state values. For stateful code, prove a relational loop invariant over paired states. Verus proves the chosen relation for all modeled inputs, but it cannot infer which locations represent intended behavior; the labels and expressions remain a human design choice.

When to use it. Inference: use regression verification after refactoring or optimization when a complete high-level specification is unavailable but a trusted previous implementation exists; it fits changes expected to preserve outputs conditionally (the flag scenario above). The paper states the theoretical limit: “While formally proving equivalence between two programs is generally undecidable, if one is willing to sacriﬁce completeness this becomes not only a decidable problem, but also one that can be built on top of existing tools.” (Sect. 1, p. 496).

## technique: CBMC bounded relational checking

The prototype uses CBMC because it is “one of the two tools (together with CMC) that supports full C and C++” (Sect. 2, p. 498). For each loop i, the user must specify a bound ki on the number of iterations. CBMC symbolically characterizes the executions within these bounds as a propositional formula f; a solution to f ∧ ¬a, where a is a user-defined assertion, implies a path that violates a. Otherwise the bounds may still be too low, so CBMC can generate unwinding assertions for each loop. An unwinding assertion for loop i is satisfied iff the loop condition cannot be true after iterating ki times. The paper states, “cbmc can be thought of as a complete tool as long as all the loops are terminating.” (Sect. 2.1, p. 498).

Inference (the paper gives no step list for this part): select loop bounds; generate the merged program and equality assertions; ask CBMC for a counterexample; add unwinding assertions; increase bounds when an unwinding assertion fails. Verus form (inference): replace bounded exploration with a verified Rust loop proof and an inductive invariant; use `ensures` for the relational postcondition. CBMC's completeness depends on terminating loops and sufficient bounds; a Verus proof does not inherit CBMC's bounded model assumptions.

## technique: uninterpreted-function abstraction with side effects

What it is (Sect. 2.3, pp. 499–500). Hide function bodies in both versions while assuring that equal inputs give equal outputs and side effects. The paper's example is a function f and its syntactically equivalent counterpart f′ in the new code, and it assumes they do not call other functions. Let f read the global variables in Gr and write the global variables in Gw (not necessarily disjoint; static locals count as globals). Replace f and f′ by two new variables of type int, fv and fv′, and add the constraint:

`(∧(xi = x′i) ∧ ∀gr ∈ Gr . gr = g′r) → (fv = fv′ ∧ ∀gw ∈ Gw . gw = g′w)` (Eq. 1, Sect. 2.3, p. 499; the conjunction over i = 1..n).

The paper calls this a conservative abstraction that “can be seen as a simple extension of a method suggested by Ackermann [1], who considered the case in which there are no side eﬀects”.

Inference (reconstructed procedure, not given as steps): identify syntactically equivalent function pairs; compute Gr and Gw; replace bodies by uninterpreted values; add Eq. 1; let the relational checker reason about the reduced program.

Complications listed in the paper: recursive and mutually recursive functions require proofs by induction; a change in a function renders all its ancestors in the call graph unsuitable for replacement. The authors try to limit this in two ways: prove that two syntactically different functions are still semantically the same, and consider Uninterpreted Scopes, which are “more ﬁne-grained than Uninterpreted Functions, and hence less sensitive to the propagation of changes”. The paper does not detail Uninterpreted Scopes. Pointers (arguments or globals) make Eq. 1 unusable because the two pointers represent different memory addresses; the authors are investigating syntactic analysis methods to check, at least in some cases, whether two pointers point to two isomorphic objects.

Inference: in Verus, model an abstract function with a `spec fn` relation and prove a `proof fn` that equal arguments and read-state snapshots imply equal returns and writes. The abstract relation must not be marked `external_body` on the function being verified; any external axiom is trusted.

## evidence, assumptions, and product impact

The paper argues for a verification workflow and describes a CBMC-based prototype that was started (“We started building a Regression Veriﬁcation tool”, Sect. 2.2, p. 498); it reports no completed machine-checked equivalence proof, benchmark count, runtime, or defect-detection rate. On the claimed benefit, it says comparing two similar systems “is in most cases computationally easier than property-based veriﬁcation” (Sect. 2.4, p. 500); this is a claim without measurements in the paper. Inference: the trusted base includes the old program, the chosen correspondence points, the allowed-change policy, the CBMC encoding, loop bounds and unwinding, the compiler, and any uninterpreted-function abstraction. Inference: for agent-written verified Rust, regression proofs can guard refactors and optimizations when a prior version is a suitable behavioral oracle, but they do not prove the original version correct and can preserve an existing bug. The paper's stated aim is to make the complexity “depend only on the diﬀerences between the two programs (including the propagation of these changes to other parts of the program), rather than on their original sizes” (Sect. 1, p. 497).

## techniques for the catalog

- relational regression contract — assert equality of selected old/new expressions under the same inputs
- bounded relational checking — merge versions, unroll loops, and search CBMC's propositional formula for counterexamples
- unwinding validation — add loop unwinding assertions to check whether the bounds are high enough
- side-effect-aware uninterpreted functions — abstract unchanged function bodies while constraining returns and writes
- uninterpreted scopes — a finer-grained abstraction than whole functions, named by the paper as less sensitive to propagation of changes (no details given)
