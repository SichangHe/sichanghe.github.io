# Trusted base audit: know what a proof trusts, and write it down
(authored by agents unless marked 🧑)

A verified result is a conditional statement.
It holds if the stubs, models, axioms and tools underneath it are right.
This page is about finding those conditions, shrinking them, testing them, and keeping a record of them.
It is not about an agent that sneaks new conditions in.
That is [anti-cheating prerequisite checks](anti_cheating_prerequisites.md).
For specifications that are too weak, see [specification quality checks](specification_quality_checks.md).

Catalog names that land here:
verified and environmental stubs, conservative semantic modeling, evidence-producing verification prerequisite checks,
external adjudication records, hand-oracle construct testing, invariant-aware input generation,
Core/Application decomposition, virtual I/O boundaries, out-of-band conditional contracts,
input-aware protocol soundness, and the "assumptions at unverified boundaries" half of proof maintenance.

Related notes, not repeated here:
[spec quality and trusted base](../topic_studies/formal_verification_rust/practical_fv/spec_quality_trusted_base.md)
and [proof maintenance and repair](../topic_studies/formal_verification_rust/practical_fv/proof_maintenance_repair.md).

## the problem

A green verifier run does not say that the program is correct.
It says the program meets this contract, given everything the proof took on faith.

What a proof takes on faith, from the studies:
- code the verifier never saw: `external_body` functions, FFI, inline assembly, library calls
- models of the world: clocks, random numbers, the OS, hardware instructions, the allocator
- axioms: facts stated and not proved
- the caller: preconditions that someone else must establish
- the tools: the solver, the verifier, the translation from Rust to logic, the compiler
- the specification itself: nothing proves it says what you meant

Two things go wrong.
The trusted facts can be false.
Or they can be true but forgotten, so a claim is read wider than it is.

The studies say it plainly.
The study of the Rust standard library campaign (Kani, VeriFast) says: "None of the tools is itself formally verified."
([study](../vl_paper_walkthrough/verifying_the_rust_standard_library_20261012.md), the study's words).
It infers that the title's "verified" means a scoped theorem under the models and assumptions it lists.

The VerusBelt study, on Verus itself, quotes the paper: "Verus’s translation of Rust source to verification conditions is also entirely trusted code"
([study](../vl_paper_walkthrough/verusbelt_20261012.md), the paper's words).

So the technique has two jobs.
Make the trusted base small and explicit.
Then check the parts that can be checked.

## how to do it in Verus

None of the studies runs the whole procedure on Verus.
Most of them use Kani, Gobra, Rocq, Lean or Prusti.
The Verus steps below are my inference from those studies, plus ordinary Verus features.
I mark where a study gives a Verus form.

1. List every place trust enters.
   - In Verus these are `#[verifier::external_body]`, `assume_specification`, `assume(...)`, `admit()`, axiom-style `proof fn`s with no body, `#[verifier::external]`, and `unsafe` blocks.
   - Add the things Verus cannot show you: FFI, the OS, hardware, unmodeled library behavior.
   - The Verusage study builds this list by hand for one benchmark: "`external_body` signatures intentionally skip dependent bodies"
     ([study](../vl_paper_walkthrough/verusage_20261012.md), the study's words).

2. Put each trusted item behind a small contract at a boundary.
   - A trusted function gets the narrowest `requires` and `ensures` that the proof needs, and no more.
   - Keep trusted items few, and in one module, so they can be reviewed in one sitting.
   - The Forte study does this with "trusted signatures", each pointing to a Verus leaf theorem
     ([study](../vl_paper_walkthrough/forte_20261012.md)).

3. Prefer a proved stub over a trusted one.
   - If you can prove the callee, verify its contract once, then let callers use only the contract.
   - Kani calls this `stub_verified`: the contract is checked first, then used at call sites.
   - Verus does this by default for any verified function, so a proved callee needs no stub (inference).
   - A stub is for what you cannot prove: FFI, clocks, hardware, a library you will not verify.

4. Make environment models over-approximations.
   - A clock model should allow every behavior the real clock allows, and more.
   - Kani's Firecracker model of `clock_gettime` returns monotonically non-decreasing nondeterministic values.
   - In Verus, the same shape is an `external_body` function whose `ensures` is a loose property, not one value (inference).
   - Do not let the model rule out behavior the real system has.

5. Mark unsound-looking assumptions as assumptions.
   - Make a precondition or an axiom visible in the signature, never buried in a body.
   - A trusted fact that only appears in a proof body is invisible to review.

6. Test each trusted fact against the real thing.
   - For a stub of a library or hardware function, fuzz or run the real function and look for inputs that violate the stub.
   - The SWE-Proof study ships axiom tests with the task and runs them against the real callee (see variants).
   - For a Verus `assume_specification` on a std function, a Rust test with the same inputs is the cheapest check (inference).

7. Record all of it.
   - Keep a ledger with one entry per trusted item: what it assumes, why, who reviewed it, which test checks it, which theorem depends on it.
   - Record tool versions: Verus, Z3, rustc.
   - Report the count and size of trusted items next to every verified-line count.

8. Re-run the audit on every change.
   - Diff the ledger, not only the proof.
   - A new `external_body` or axiom appearing in a diff is a review event.
   - Whether the new item was added by an agent trying to cheat is the job of [anti-cheating prerequisite checks](anti_cheating_prerequisites.md).

## variants by paper

Stubs and environment models

- Kani. Plain stubs for FFI, clocks, random values, large code; verified stubs for code you can prove.
  - The study says "A plain stub is handwritten and unchecked against `f`; its behavior is therefore trusted" (the study's words),
    and that it is sound only if it over-approximates what it replaces.
  - Concrete use: the Firecracker rate limiter stubs `libc::clock_gettime`, and the study reports this "found a rounding bug allowing up to 0.01% bandwidth excess".
  - [study](../vl_paper_walkthrough/kani_20261012.md)
- PropertyGPT. Conservative models of what the prover cannot see.
  - Unknown on-chain calls: the study quotes the paper that they "remain unknown at the verification stage, so we assume all on-chain calls succeed but make their return data symbolic".
  - It also models `sha3` as injective, and calls both over-approximations or assumptions that can cause false alarms or miss semantics.
  - The study's Verus advice: "Do not assume external calls succeed unless that is a documented product assumption" (the study's words, labelled inference).
  - [study](../vl_paper_walkthrough/propertygpt_20261012.md)
- Scaling verification of cryptographic software. Hardware instructions modeled over lane arrays; an AES round may use an axiom tied to the formal AES specification.
  - [study](../vl_paper_walkthrough/scaling_verification_of_cryptographic_so_20261012.md)
- Crux. Bounds, representation mappings and simplified library models are listed as assumptions the user must own.
  - [study](../vl_paper_walkthrough/crux_a_precise_verifier_for_rust_and_oth_20261012.md)

Axioms

- SWE-Proof. The strongest axiom discipline in the studies. Python bug fixes verified in Nagini, Velvet or Lean (no Rust, no Verus).
  - Unchanged callees are summarized by axioms: the study quotes "summarize each unchanged callee with an axiom stating the properties the fix relies on".
  - The study quotes the paper: "Axioms are a last resort, not a default."
  - Each axiom is refined by two loops: a fuzzer runs the real callee and sends any violating input back (correctness), and the verifier must close the proof with the axiom (usefulness).
  - An axiom must not contain the fix: "An axiom that asserted the corrected behavior of a callee would make the specification verify for the wrong reason".
  - Even so, the study lists "that each axiom is true of the real callee" as not proved.
  - [study](../vl_paper_walkthrough/swe_proof_20261012.md)
- Verifying Verus (a Lean model of Verus's translation to logic). The translated formula carries the axioms it was built with.
  - The paper threads "an axiom set through the translation", so a target formula without its axioms is incomplete evidence.
  - The study adds, as its own inference, that equivalence proved under an inconsistent axiom set is vacuous, so a model of the axioms must exist.
  - [study](../vl_paper_walkthrough/verifying_verus_20261012.md)
- Probabilistic Rust (Alerus). New axioms added to Verus's logic for randomness.
  - The paper says the two rules "are the only constructs Alerus adds as trusted axioms".
  - The study points out this undercounts: bignum operations have "trusted specifications",
    the exponential is an uninterpreted function with axioms, and an `external_body` lemma appears in an appendix.
  - [study](../vl_paper_walkthrough/probabilistic_rust_20261012.md)
- Graph algorithms in Why3. Comparison-function properties stated as module-boundary axioms.
  - The study: "This is an assumption, not a theorem proved by the graph development."
  - [study](../vl_paper_walkthrough/auto_active_verification_of_graph_algori_20261012.md)

Trusted signatures and seams

- Forte (differential privacy sensitivity checking in Flux and Verus). Every trusted primitive signature points to a Verus theorem. The Rust body is still trusted.
  - The paper: "We trust the Rust body of each trusted primitive to implement the function the corresponding theorem describes, by inspection".
  - Also: "nothing prevents a program from minting a second token". One privacy budget per run is a protocol the checker does not enforce.
  - [study](../vl_paper_walkthrough/forte_20261012.md)
- Mendel (interior mutability). Annotations on `UnsafeCell`-based library types are trusted, so the client proof does not show the library is sound.
  - [study](../vl_paper_walkthrough/reasoning_about_interior_mutability_in_r_20261012.md)
- Compositional reasoning for iterators (Prusti). Out-of-band contracts: a separate specification trait and external specifications where library source cannot be edited.
  - Client closure contracts are "supplied assumptions" (the study's words), and the study lists fused completion,
    exclusive mutation, stable snapshots and manually trusted specifications as assumptions to surface.
  - [study](../vl_paper_walkthrough/compositional_reasoning_for_side_effectf_20261012.md)

Boundaries around verified code

- Diodon (Core/Application decomposition; Go with Gobra, Tamarin, Argot). Verify a small Core hard; check the rest with automatic analyses.
  - The paper's claim: "This split allows us to apply powerful semi-automated verification techniques to the security-critical Core,
    while fully-automatic static analyses scale the verification to the entire codebase."
  - The Core's assumptions about callers become checkable conditions on the Application: init, no modification, preservation, locality, callbacks, parameter disjointness, access.
  - Virtual I/O: calls and callbacks across the boundary are treated as protocol events with permissions.
  - Trusted by the paper: Tamarin, Gobra, Argot, crypto library specs, I/O capability specs, taint source and sink configuration. Unsafe Go, cgo and reflection are not handled.
  - [study](../vl_paper_walkthrough/the_secrets_must_not_flow_20261012.md)
- Assurance cases from C (CCV; Rocq with VST). Input-aware protocol soundness: a state-based protocol of legal call sequences,
  with soundness conditional on the implementation meeting the contracts and callers meeting their obligations.
  - Prerequisite checks and artifacts: freeze the input, record all external functions, allocator premises and axioms,
    require proofs free of admitted obligations, audit dependencies, have humans review conformance.
  - Quotes: "Proof success does not imply unconditional correctness beyond the disclosed axiomatic specifications and assumptions." and "The LLM agent is not in the TCB:
    Rocq rechecks every formal statement and proof that it proposes."
  - [study](../vl_paper_walkthrough/assurance_cases_20261012.md)
- Rust standard library verification. Invariant-aware input generation.
  - Kani's derived `Arbitrary` respects bit validity but not semantic invariants. The example is `Duration` nanoseconds that must stay below 10^9.
  - An `Invariant` trait with an `is_safe()` predicate is assumed in contract harnesses, so the assumption is named.
  - The paper warns that "types whose safety invariants are not yet annotated with is safe() are tested over all bit-valid values".
  - [study](../vl_paper_walkthrough/verifying_the_rust_standard_library_20261012.md)

Imported contracts between components

- Vosti. The Verus engine proof imports Triton kernel contracts; a custom analyzer checks the kernels.
  - Paper, §5.1, as quoted in the study: "imports kernel contracts as trusted assumptions in Verus."
  - Also trusted: "Contract translation and the correspondence between tensor representations remain trusted."
  - Trusted too, per §5.3: the translator, rules and solver encoding, interface mapping, Triton compiler and GPU execution.
  - Attention needs input-dependent finiteness that is "unchecked at runtime".
  - Runtime configuration checks bind the launched parameters but do not prove the compiler correct.
  - The study recommends keeping component proofs, translation, runtime checks and tests as separate evidence categories.
  - [study](../vl_paper_walkthrough/vosti_20261012.md)

Testing the axioms of a semantics

- Corten (Rocq and Iris). Weakest-precondition rules are axioms; only some are shown adequate against an interaction-tree model.
  - The paper's caution (as quoted in the study): "full soundness establishes only internal consistency".
  - The test-suite oracle is hand-authored expected behavior, so it is not independent of the authors. The paper plans differential tests against rustc and Miri.
  - The study's Verus advice (inference): test Verus encodings against rustc and Miri, and keep the frontend and library contracts in the trusted base.
  - [study](../vl_paper_walkthrough/corten_foundational_verification_of_rust_20261012.md)

Records of who judged, with what

- SaltBench. External adjudication: a frozen toolchain, a referee outside the agent's toolchain, a result line parsed mechanically, cost recorded.
  - Abstract: "Outcomes are decided outside the agent's toolchain."
  - Trust-boundary fact: Verus emits no proof object, so the record says the referee accepted, not that a kernel checked the proof.
  - [study](../vl_paper_walkthrough/saltbench_20261012.md)
  - The screening half of this paper (rejecting `assume`, `external_body`) belongs to [anti-cheating prerequisite checks](anti_cheating_prerequisites.md).

Residual trust reported next to the verifier count
- Fewer Assumptions by Design (DLL skill, six author-reported runs).
  - Report assumptions and external bodies with the verified-item count. The first experiment: 9 assumptions and 3 axiomatic lemmas; the final state: "45 verified, 0 errors, 11 assumes".
  - Where the trust sits matters. The I4 run made the central `link` mutator `external_body`: "The proof is incomplete in the most mutation-critical parts."
  - Unsupported representations get a documented axiom boundary: "executable functions are marked with external_body, code bodies should not be proved".
    The result is a conditional specification, not verified implementation correctness.
  - The study's inference: temporary `assume` stubs need an exit criterion, discharged or kept in the final evidence.
  - [study](../vl_paper_walkthrough/fewer_assumptions_20261012.md)

Assumptions at unverified boundaries, as maintenance

- Toward practical deductive verification (interviews, not a technique run).
  - Practitioners isolate unsafe and external APIs behind `external_body` specs and track assumptions in `requires`.
  - The Verus form is the study's labelled inference, not the interviewees'.
  - [study](../vl_paper_walkthrough/toward_practical_deductive_verification_20261012.md)

Translation as trusted base

- Rust-Prover (Lean). Proofs are about Lean code that Charon and Aeneas translate from Rust, and pure specification helpers take a separate `#[pure]` macro path.
  - The study says both translation paths matter to assurance, so kernel checking does not cover the Rust-to-Lean step.
  - Mitigations it reports: differential tests of translated code, spec review,
    and an itemized list of 27 specializations (Appendix A) where the verified code differs from the original, such as ASCII strings as bytes and hash lookups as vector search.
  - The study's inference: report each transformation individually; a hash-to-vector rewrite can keep values but change cost.
  - [study](../vl_paper_walkthrough/lean_backed_rust_verifier_20261012.md)

Partial refinement ledger

- StateSync-GKR (Isabelle/HOL for the model, Creusot/Why3 for Rust). Four contract levels R1 to R4 anchor compiler, sumcheck, protocol and hash-gadget clauses to Isabelle objects.
  - Translated code, open obligations, black-box libraries and documentation contracts are labelled separately.
  - Trusted: Rust, LLVM and the OS, pinned Plonky3 crates, abstract hash functions, one tool-artifact axiom, the premise tying running traces to model objects, and the challenge distribution.
  - Fiat-Shamir and multi-round non-interactive security are outside the model.
  - Verus form is the study's inference: a correspondence ledger naming each `assume`, external spec and uninterpreted hash.
  - [study](../vl_paper_walkthrough/statesync_gkr_20261012.md)

## evidence

Evidence here is mostly counts of how much is trusted, plus a few cases where a trusted piece was caught wrong.
Few studies measure whether the audit itself works.

How much is trusted
- Verus systems case studies: 6,119 executable lines, 31,231 proof lines, 4,692 lines in the trusted column, across five systems
  ([study](../vl_paper_walkthrough/verus_practical_20261012.md)).
  The study notes the categories are not interchangeable.
  The audit log says the paper's Figure 9 rows sum to 31,691 proof lines against a printed 31,231,
  so treat the totals as approximate.
  The allocator alone has 245 trusted OS and interface lines plus 37 user-facing specification lines, reported as 282.
- Rust standard library, Kani campaign: 16,748 harnesses generated out of 33,955 functions; 11,970 of the 16,748 passed.
  Only 295 of those passes had function contracts, and 694 contracts were written by hand, so 989 functions had contract proofs
  ([study](../vl_paper_walkthrough/verifying_the_rust_standard_library_20261012.md)).
  So the headline count of passes hides a large uncontracted majority.
- A related survey of the same effort: 361 of 9,078 unsafe functions and safe abstractions of unsafe code in core (3.98%)
  and 10 of 714 such functions in std (1.4%) were annotated with Kani contracts.
  The paper notes annotated functions are not necessarily fully verified
  ([study](../vl_paper_walkthrough/lessons_rust_std_20261012.md)).
- Diodon on a 100k+ line Go codebase: Core 749 lines,
  3,825 specification and proof lines; the study says the abstract's "less than three person months" appears to cover Core verification only
  ([study](../vl_paper_walkthrough/the_secrets_must_not_flow_20261012.md)).
- OpenDP survey in the Forte study: 68 trusted transformation stability closures, 14 with proof documents, 54 without
  ([study](../vl_paper_walkthrough/forte_20261012.md)).
- SWE-Proof, appendix B.2 as the study reports it: 500 deep callee models in Nagini against 264 axioms over 137 instances; pure Lean over Mathlib needs 3 axioms in the whole corpus
  ([study](../vl_paper_walkthrough/swe_proof_20261012.md)).

Vosti trust lists
- Engine and model code: 14,043 implementation, 876 specification and 64,952 proof lines, checked in 52.9 seconds (author reports, Table 2).
  The trusted bridges above sit outside these counts, and the study says checking time does not measure proof-generation labor
  ([study](../vl_paper_walkthrough/vosti_20261012.md)).
- 5,488 bitwise-matched test pairs across seven models are tests, not verification (the paper: "are not exhaustive verification").

Residual trust in six runs of one skill
- Table 5 of the paper, as the study reports it: I1 46 assumes and 0 axioms; I2 and I3 0 and 0; I4 18 and 1; the standard-list and SlotMap runs 0 assumes and 8 axioms each.
  Zero assumptions did not mean an adequate specification: I2 "lacks a positional witness for ordering".
  Six heterogeneous demonstrations, not repeated estimates ([study](../vl_paper_walkthrough/fewer_assumptions_20261012.md)).

A trusted model that found something
- The Firecracker clock stub exposed a rounding bug of up to 0.01% bandwidth excess
  ([study](../vl_paper_walkthrough/kani_20261012.md)).
  This shows an over-approximate environment model can find bugs.
  It is one case; the study gives no rate.

Checks on the trusted pieces
- Rust-Prover: of 1007 specs, 658 validated automatically; of the other 349 only samples and the 169 unfinished-suite cases were reviewed,
  and the paper says "The reviews found no wrong or weakened spec." The study says this covers performed reviews,
  not all translations ([study](../vl_paper_walkthrough/lean_backed_rust_verifier_20261012.md)).
- Rust-Prover code tests: 105 of 114 problems with runnable suites completed, 19,555 matching sampled cases;
  nine failed by timeout or unsupported signature. The study infers this covers about a tenth of the problems.
- Diodon's negative tests: injecting a plaintext secret broke the Core refinement proof, and logging session keys broke the taint check.
  The study says these are not a detection rate over a corpus.
- SWE-Proof reports the axiom checks as two loops (fuzz the real callee; require the proof to close) but, per the study, does not prove any axiom true.
- No study reports how often a stub or axiom turned out wrong in practice.
- StateSync-GKR refinement inventory: 331 proof files, 2,421 discharged leaves, 179 open leaves. The study says these counts are not a coverage denominator.
  - 37 historical contract distortions were rejected, but the journal is not a public external audit. [study](../vl_paper_walkthrough/statesync_gkr_20261012.md)
- StateSync-GKR artifact: 194 Rust release tests passed, 0 failed, 2 intentionally ignored. The study says this is not a whole-program verification claim.

## where it fails

- Soundness of a stub is a claim about the real world, and no verifier checks it.
  Kani's study says a plain stub is sound only if it over-approximates what it replaces.
- A passing proof can hide a reduced claim.
  The Kani study says a wrong assumption "makes the proof vacuously true"
  ([study](../vl_paper_walkthrough/kani_20261012.md), the paper's words as quoted in the study).
  The std study says an agent could write an `assume` or a stub with a wrong model and "Kani will still certify the reduced claim" (the study's words).
- Counts mislead.
  "Over 10,000 functions" and "two axioms" are both headlines that undercount what is trusted (std study; probabilistic Rust study).
- The record is not the thing.
  A ledger can be stale, and nothing in the studies keeps it in sync with the code except review.
- Semantics checked against its own authors.
  Corten's hand-written test oracle is not independent execution
  ([study](../vl_paper_walkthrough/corten_foundational_verification_of_rust_20261012.md)).
- The translation layer is large and still trusted.
  VerusBelt lists the translation, the solvers, standard-library axioms for Vec and HashMap, and the erasure scheme as outside its proof
  ([study](../vl_paper_walkthrough/verusbelt_20261012.md)).
  The Verifying Verus study says citing that Lean work as proof that "Verus itself is fully verified would overstate the source"
  ([study](../vl_paper_walkthrough/verifying_verus_20261012.md), the study's words).
- Models of unsafe and concurrent code are thin.
  Kani does not model Stacked or Tree Borrows aliasing, and its frontends lack concurrency (std and lessons studies).
- The memory model is trusted.
  The Core ARC study lists the C20 and YC20 definitions, Iris soundness and the ARC code model as trusted.
  Under C20 the authors also assume every atomic access is enabled, and leave the nonpositive-counter-read condition open
  ([study](../vl_paper_walkthrough/an_approach_for_modularly_verifying_the__20261012.md), study's summary of the paper).
- Executable code can be the weak link.
  SWE-Proof's study quotes the paper that the Python translation of the verified model is "the weakest link in the guarantee".
- A proof of determinism can hide wrong semantics.
  The Vosti paper (§7, as quoted in the study): "A consistently incorrect implementation can still be deterministic."
  Full numerical correctness against a reference is out of its scope, so list that as an unproved claim
  ([study](../vl_paper_walkthrough/vosti_20261012.md)).
- A green build is not end-to-end assurance.
  StateSync-GKR's GKR soundness covers only a circuit's output claim; if the compiler is wrong, "the verifier faithfully checks the wrong statement" (the paper's words, as quoted in the study).
  Value correspondence, library semantics and challenge generation stay trusted. [study](../vl_paper_walkthrough/statesync_gkr_20261012.md)
- The specification is the biggest assumption and nothing here covers it.
  See [specification quality checks](specification_quality_checks.md).

## open questions

- How do you check an `assume_specification` for a std function in Verus? Tests are cheap, but no study does this for Verus.
- Can the ledger be generated from the code, so it cannot drift? No study does it. CCV and SaltBench produce records, but by process, not by extraction.
- Which stubs are worth proving? The std study says stubs speed up compilation (3.97x with caching, parallelism and ordering, per the study) but gives no per-stub trust cost.
- How do you measure trusted size? Lines, number of items, and number of theorems that depend on each item all give different answers. The Verus systems study uses lines only.
- Does an audit catch real unsoundness in agent-written proofs? No study measures this directly; the prerequisite check studies measure cheating, not wrong-but-honest stubs.
- How far does Diodon-style splitting go in Rust? The study says Rust ownership may discharge some obligations statically; that is the study's inference, untested.

Where studies disagree or slip, as I read them:
- the Probabilistic Rust paper says "only two axioms", and the study shows it does not describe the whole trust surface
- the Diodon abstract and its detailed case study differ on person-months, and the study says so
- the Verus Practical study lists a "trusted" column that, by its own note, is not comparable across systems
