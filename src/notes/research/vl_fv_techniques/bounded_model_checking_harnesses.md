# Bounded model checking and symbolic execution harnesses beside deductive proofs
(authored by agents unless marked 🧑)

Counterexamples from these tools are used to repair proofs on another page:
[counterexample guided repair](counterexample_guided_repair.md).
This page covers the harness itself, and what a Verus user gets from running one next to Verus.
Background on the tools:
[Kani](../topic_studies/formal_verification_rust/rust_verifiers/kani.md),
[Verus](../topic_studies/formal_verification_rust/rust_verifiers/verus.md).

## the problem

Verus proves a property for all inputs, but it needs specs and invariants first.
Some code resists that: raw pointers, optimized bit tricks, thousands of small unsafe functions.
A harness tool asks a cheaper question: for inputs up to a bound, does any run break the property?
It needs almost no annotation, and a failure comes with a concrete input.

The price is the bound.
A pass covers only what the bound covers.
So the useful question is where the cheap check is enough, and where it replaces nothing.

## how to do it in Verus, step by step

No study runs Kani or Crux on Verus code.
The harness steps below are the studies'.
Everything about Verus is my inference.

1. Choose the property.
   Panic, overflow, out-of-bounds, invalid pointer use: a harness tool checks these with no spec.
   Functional correctness for all sizes: Verus.
2. Write a harness: a test whose inputs are symbolic.
   The std paper:
   "A proof harness is analogous to a unit test, but instead of calling a function with concrete inputs, it calls the function with symbolic (non-deterministic) values"
   (the rest: "that represent all possible inputs simultaneously").
   In Kani: `#[kani::proof]`, `kani::any()`, `kani::assume(...)`, `assert!(...)`, run `cargo kani` ([study](../vl_paper_walkthrough/kani_20261012.md)).
   In Crux: `#[crux_test]`, `Symbolic::symbolic`, `crucible_assume!`, `crucible_assert!`,
   run `cargo crux-test` ([study](../vl_paper_walkthrough/crux_a_precise_verifier_for_rust_and_oth_20261012.md)).
3. Make assumptions match the Verus `requires` of the function.
   An assumption that is too strong hides bugs.
   The Kani paper: "an incorrect assumption (e.g., assume(false)) makes the proof vacuously true, so assumptions must be reviewed as carefully as the code itself".
   Check them with the tools on [specification quality checks](specification_quality_checks.md).
4. Give every loop a bound (`#[kani::unwind(k)]`).
   Kani adds an unwinding assertion.
   If it fails while the safety assertion passes, the result is inconclusive, not a proof.
5. Compare against a reference when you have one.
   Run implementation and reference on the same symbolic input and assert equal output.
   In Verus the reference would be a `spec fn` (inference).
   Here the reference is executable.
6. When the bound is too costly, use a contract and reuse it as a stub.
   Details are under variants.
7. Record what the pass means: bound, unwind complete or not, assumptions, stubs, solver, timeouts.
   The studies repeat this need ([Kani](../vl_paper_walkthrough/kani_20261012.md), [std](../vl_paper_walkthrough/verifying_the_rust_standard_library_20261012.md)).
8. Do not expect a shared source.
   I found no study on compiling Verus-annotated source with Kani.
   Expect to keep a plain Rust copy or a thin harness crate (inference, untested).

## variants by paper

Kani, bounded harness
([study](../vl_paper_walkthrough/kani_20261012.md)):
steps 2 to 4 above.
Kani inserts checks for invalid dereference, misaligned cast, overflow, division by zero, bad shifts, bounds, `unwrap` on `None`.
The GCD harness needed `unwind(94)`, the exact worst case for 64-bit Euclid.
The full-range query still did not finish in one hour.
So a complete bound can be correct and unusable.

Kani, function contracts and verified stubs (same study):
`requires`, `ensures`, `modifies`; `#[kani::proof_for_contract(f)]` proves it.
`#[kani::stub_verified(f)]` replaces `f` in a caller by its contract.
Kani asserts the precondition, forgets the writable memory, and assumes a result that meets the postcondition.
This is the same move as calling a Verus lemma or function by its spec (inference).
In the TokenBucket caller, replacing GCD by its contract turned hours of unwinding into seconds.
A plain `kani::stub` is handwritten and trusted.
The Firecracker rate limiter stubs the clock with arbitrary non-decreasing time.

Kani, loop contracts (same study):
`loop_invariant`, `loop_modifies`, `loop_decreases`.
Kani checks base case and step, so time does not depend on iteration count.
The std paper: "A successful verification with loop contracts therefore constitutes an inductive proof for the annotated loops"
([study](../vl_paper_walkthrough/verifying_the_rust_standard_library_20261012.md))
Verus users already write this as `invariant` and `decreases`.
Invariant writing is covered on [loop invariant synthesis](loop_invariant_synthesis.md).

Std library, generated harnesses
([study](../vl_paper_walkthrough/verifying_the_rust_standard_library_20261012.md)):
a compiler pass lists monomorphic functions whose arguments implement `kani::Arbitrary`, and calls each with symbolic values.
A function with a contract gets precondition assumed and postcondition checked.
Others are checked for supported undefined behavior only.

Std library, bit-valid versus safe inputs (same study):
generated inputs are bit-valid, not necessarily constructible.
An `is_safe()` predicate carries the type invariant and is assumed in contract harnesses.
The study's warning: "types whose safety invariants are not yet annotated with is safe() are tested over all bit-valid values"
In Verus this is a `spec fn` invariant in `requires` (inference).

Lessons from the std effort
([study](../vl_paper_walkthrough/lessons_rust_std_20261012.md)):
generic functions get one near-identical harness per type: "The result of this is a plethora of near-identical harnesses where only the types are different".
Shadow memory (the paper's proposal, not an existing tool) would track history-dependent obligations such as whether a `MaybeUninit` is initialized.
The paper also says there is "No one-size-fits-all approach", so tools are chosen per property.

Crux, symbolic unit tests
([study](../vl_paper_walkthrough/crux_a_precise_verifier_for_rust_and_oth_20261012.md)):
same shape as Kani, by symbolic execution to SMT.
Its equality target: "By extensional equality, we mean (1) that code and specification cannot generate undefined behaviour / panic"
and (2) equal output on equal inputs.
The reference can be Cryptol, hacspec, or Rust.
Compositional step: prove a helper equal to a simple model with `#[crux_spec_for]`, then enable it in callers.
The paper: "Compositional reasoning is necessary to verify even mid-size pieces of code."
For SHA2 the loops were factored into one-iteration helpers, each proved equal to the spec, so the loop comparison became trivial.

Choosing a tool by property
([std study](../vl_paper_walkthrough/verifying_the_rust_standard_library_20261012.md),
[lessons](../vl_paper_walkthrough/lessons_rust_std_20261012.md),
[survey](../vl_paper_walkthrough/surveying_rust_verification_landscape_20261012.md)):
Kani for finite safety checks.
VeriFast (separation logic) for the linked list that model checking did not cover.
Flux for refinement types.
Randomized testing for 565 SIMD intrinsics.
The std study quotes the paper that "no single tool can discharge all verification conditions."

Hybrid assurance in industry
([study](../vl_paper_walkthrough/toward_practical_deductive_verification_20261012.md)):
interviewees combine deductive proofs with tests, static analysis, model checking and monitors.
The study's steps are its own inference from counts, not the paper's procedure.
Its Verus form is also inference: Verus proofs plus unit and property tests and runtime checks, with coverage stated.

Comparative symbolic execution, C against Rust translation
([study](../vl_paper_walkthrough/finding_a_crab_in_the_c_20261012.md)):
cozy runs both binaries on the same symbolic input in angr and pairs the feasible terminal paths.
A pair is compatible when the joint path constraints are satisfiable.
For compatible pairs it asks whether memory can differ, and returns concrete inputs that show a difference.
It differs from a sequential equality harness (Kani, as in VERT).
The study quotes the paper:
"a copy of the execution tree of the second function is made for every leaf of the execution tree of the first function"
and that it gives "a fairly coarse success/failure signal".
Verus form: the study gives none; a Rust harness with two calls and equality assertions is its inference, and it loses the path-pair diagnostics.

Not a variant: KaPilot ([study](../vl_paper_walkthrough/kapilot_20261012.md)) uses an LLM to write the Kani contracts around a harness.
It is a spec-writing technique, so I only use its numbers below.

TLC or Apalache for counterexamples, TLAPS for the final proof (Scimitar)
([study](../vl_paper_walkthrough/interactive_safety_verification_of_distr_20261012.md)):
the model checker finds counterexamples to induction on finite instances, then a proof checker validates the unbounded graph.
The paper's words: TLC “cannot produce full proofs of inductive invariants for protocols of arbitrary size, but can generate CTIs for finite protocol instances”.
The paper does not report false-negative rates of the bounded search.
Verus form: the study's inference; a bounded harness must share the transition semantics or its counterexamples mislead.

## what a Verus user gains

The studies do not compare Kani or Crux with Verus on one codebase.
Each point below is evidence from the Kani, Crux or std papers plus my inference for Verus.

- Checks on code Verus does not handle.
  The [hybrid Rust study](../vl_paper_walkthrough/hybrid_rust_verification_20261012.md) says, of the paper's related work: "Verus cannot verify traditional raw pointers".
  Kani targets unsafe code and the std campaign checked 4,645 unsafe functions with harnesses.
  Those are Kani's checked classes only, not a proof of functional behavior.
- Bugs without a spec.
  Kani paper: eleven bugs missed by testing and fuzzing across four codebases.
  One survived 16,777,216 fuzz runs and Kani found it in 20 seconds.
  Those are bug counts, not a detection rate.
- A second opinion on assumptions.
  The bounded check does not trust your `requires`.
  Caveat: a harness shares the assumptions you give it (inference).
- Concrete failing inputs.
  A proof failure in Verus says "might not hold".
  A harness gives an input.
  Use is on [counterexample guided repair](counterexample_guided_repair.md).
- Cheap equality against an executable model, with panics counted as differences.
  Crux's SHA1 and SHA2 proofs against Cryptol and hacspec each reran in under ten minutes.
  A newcomer took three weeks for the first, then three more for the other three.
- A cheap gate on generated code.
  Both Kani studies suggest it as a gate for agent output (inference of those studies).
  Gate rules are on [anti-cheating gates](anti_cheating_gates.md).
- Different trust base.
  Kani relies on rustc, MIR-to-GOTO translation, CBMC and the solver.
  Verus relies on its own encoding and Z3.
  Two tools agreeing is weak independence, since both trust Rust semantics (inference).

## evidence with denominators

Kani CI, self-selected projects:
34 harnesses in 21 minutes (Firecracker), 102 in 23 (s2n-quic), 153 in 42 (Hifitime), 16,748 in 69 (std).
The paper: "the evaluated projects self-selected into Kani adoption, potentially over-representing favorable cases".

cozy: three experiments, no counts of paths or queries
([study](../vl_paper_walkthrough/finding_a_crab_in_the_c_20261012.md)).
Insertion sort in C, Rust and C2Rust was verified equivalent, and C insertion sort against Rust bubble sort for sorted outputs, with small bounded array lengths.
Box blur was verified only for small images and kernel sizes.
The watch example needed input assumptions to avoid overflow states.

Hifitime: 57 of 158 generated harnesses timed out at 60 seconds.
Each caller re-unrolled the same callee.
After contracts: 153 active proofs, and six new bugs.
One loop took 0.2 s with a contract against 91.8 s with 19-step unwinding.

Std library, automatic harnesses:
11,970 of 16,748 passed (71.5%).
Only 295 of the passing ones had contracts.
With 694 manual contract proofs that makes 989 functions with contract proofs.
17,207 functions were skipped: 56% generic, 22% no `Arbitrary`, 19% Kani internals, 3% other.
The 78% figure (generic plus missing `Arbitrary`) is a projection of what support might cover, not a result.

Std lessons paper, a later snapshot:
Kani solved 6 of 9 completed challenges.
Kani contracts annotated 361 of 9,078 core unsafe functions and abstractions (3.98%) and 10 of 714 std (1.4%).
The paper notes annotated functions are not necessarily fully verified.
No safety bug confirmed; two specification bugs fixed.
Different snapshot from the 29-challenge figure in the other study.

Crux: four proof developments, each under ten minutes.
The Shardstore deserializer result is cited from another paper and has no numbers here.

KaPilot, Kani contracts written by models, 54 functions with expert ground truth:
good contracts for 31 (GPT-5), 28 (DeepSeek), 34 (Claude).
Good means Kani passes and the contract is no stronger in its precondition and no weaker in its postcondition than the expert's.

Hybrid assurance: 13 participants reported combining methods.
The study counts 29 usable interviews for most totals, so this is a minority-scale interview result.

Model checking beside a Verus proof (SoundGate)
- TLC checked the concurrent abstract model over finite run and key sets; the largest completed search had 74,805,201 states.
  Loom checked bounded interleavings of the deployed Rust gate: three models, zero failures reported.
- The finite TLC search is bounded. TLAPS proved the invariants for arbitrary run and key sets (68 obligations).
- Study inference: a statistical bound under the harness distribution does not establish arbitrary deployment correctness.
- [study](../vl_paper_walkthrough/stop_means_stop_20261011.md)

## where it fails

- Bound too small or too big.
  Passing means paths within the bound.
  A bound that is complete can still not finish.
- Vacuous assumptions.
  `assume(false)` proves everything.
- Plain stubs are trusted, unchecked models.
- Passes without contracts mean little.
  In the std campaign 622 unsafe functions passed without contracts.
  The authors call them triage, since the pass may be real safety or an unmodelled property.
- Bit-valid inputs raise false alarms and hide intended states.
- Aliasing and concurrency.
  The Kani study says Kani does not model Stacked Borrows or Tree Borrows, and Miri is suggested for those.
  Kani's frontend lacks concurrency.
- Generics are per type, so coverage is partial.
- Quantifiers are solver dependent.
  The Kani paper: "Z3 cannot automatically instantiate the quantifier at d = result over nonlinear 64-bit bitvector remainder".
- Kani checks safety classes, not type safety or functional correctness unless you write a postcondition.
- Crux needs bounded, fixed-size data and rejects most raw layout casts.
- Verified-looking is not verified: a contract can be weak.
  See [specification quality checks](specification_quality_checks.md).

- Equivalence by symbolic execution is bounded by explored paths and by the compiler, ABI and layout modeling.
  The study's inference: it is not an all-input theorem for unbounded loops.
  Pairwise comparison can become quadratic in paths.
  The paper names binary interpretation in angr as the main cost, not the solver
  ([study](../vl_paper_walkthrough/finding_a_crab_in_the_c_20261012.md)).
- Undefined behavior differs by language: the study says C overflow is undefined, Rust debug builds panic and release builds wrap.
  Input assumptions removed these states, so they narrow the claim.

## where the studies disagree

Loop termination in Kani.
The Kani study documents `loop_decreases` and says Kani checks it.
The std study says the std paper reports that Kani does not yet support loop variant (decreases) clauses.
The std study notes this differs from the Kani paper and follows the std paper for what the campaign used.
I would guess the std paper is older, but I have not checked.

The std study also says Verus offers no whole-program symbolic execution.
The lessons study suggests Verus for concurrent constructs.
I read that as: Verus proofs, not symbolic search, so they do not conflict, but neither compares costs.

## open questions

- Can one source file serve both Verus and Kani, or must the harness live in a separate copy that can drift?
- Does a bounded pass find bugs in Verus-verified code that a missing `requires` hid?
  No study measured it.
- How should a bounded result sit in an assurance case next to a proof?
  The studies say to record bounds and stubs, but give no format.
- When is the unwind bound worth paying for compared with writing the Verus invariant?
  Only GCD and Hifitime numbers exist, and both are Kani-only.
- Can an agent be stopped from picking assumptions that make the harness pass?
