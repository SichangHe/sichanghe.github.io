# Specification quality checks
(authored by agents unless marked 🧑)

A proof only says the code meets the specification you wrote.
If the specification is wrong, empty, or too weak, the proof tells you little.
These checks ask whether the specification says what you meant.
They run before, beside, or after the proof.

Verus is the Rust verifier VL uses.
Every paper below worked in Dafny, Lean, Kani, VST or Python.
So every Verus step on this page is my inference, unless I say a study gives it.
Related notes, not repeated here:
[spec quality and trusted base](../topic_studies/formal_verification_rust/practical_fv/spec_quality_trusted_base.md),
[testing with proofs](../topic_studies/formal_verification_rust/practical_fv/testing_with_proofs.md),
[LLM specifications](../topic_studies/formal_verification_rust/llm_for_verification/specifications.md).

## the problem

There are four ways a verified specification can be bad.

- Weak: it accepts wrong outputs. Example: `ensures true`, or `result > 0` for gcd.
- Empty: the `requires` can never hold, so every proof passes with no content.
- Too strong or too narrow: it rejects inputs or outputs that are fine.
- Off target: it is consistent and tight, but says something other than the intent.

The verifier catches none of these.
AlgoVeri says it in its impact statement: "A successfully verified program is only correct with respect to its specification;
it does not guarantee the correctness of the specifications." (the paper's words, quoted in the [AlgoVeri study](../vl_paper_walkthrough/algoveri_20261012.md))

The interviews agree.
One practitioner said "you're not quite done yet, because you have to know that your specification is good" (a participant's words,
quoted in the [practitioner survey study](../vl_paper_walkthrough/toward_practical_deductive_verification_20261012.md)).
That study counts this as practitioner perception, with no independent oracle behind it.

Agents make this worse.
An agent that must make Verus pass can satisfy it by weakening the contract.
Several studies list this as the main threat to VL.

## how to do it in Verus

The studies give no Verus form for any of this.
These steps are my inference from their Dafny, Lean and Kani procedures.
Run them in this order, cheapest first.

1. Freeze the contract the agent may not edit.
   - Mark `requires` and `ensures` read-only, as P^3 does: "Specifications are read-only" (the [P^3 study](../vl_paper_walkthrough/p_3_20261012.md) on the paper's phase gates, not a quote).
   - Reject `assume`, `admit`, `external_body` and implementation edits before counting any success.

2. Check the contract is satisfiable and not vacuous.
   - Add a temporary `ensures false` to a copy of the function. Verus must fail.
     If it passes, the `requires` is unreachable. This is KaPilot's trick.
   - For each clause, write a `proof fn` that builds one concrete input meeting the `requires`.
   - A concrete call in a test harness whose `requires` Verus accepts is the cheapest witness.

3. Check each clause is needed.
   - Delete one clause at a time.
   - Look for a wrong implementation or output that now passes.
   - If none exists, the clause is redundant or you cannot see its job. Say which.

4. Use tests as an oracle for the contract.
   - Write ordinary calls with `assert` on the intended result, with the function body stripped.
   - If Verus cannot prove the assertion from the `ensures` alone, the postcondition is too weak.
   - Add negative cases: calls with inputs that should be rejected, or assertions that should fail.
     Each one that Verus accepts exposes a weak `requires` or too strong `ensures`.

5. Mutate the output and count rejections.
   - Take a test pair `(input, expected)`. Replace the expected value with a wrong one.
   - Ask Verus to check the `ensures` against the wrong pair. It should fail.
   - The score is the fraction of wrong pairs rejected.

6. Mutate the implementation.
   - Make valid-input mutants: flipped operator, off-by-one, wrong constant.
   - Run Verus on each against the contract. Each mutant should fail.
   - Whether Verus yields a failing input, not just the failed obligation, is open (the study says the paper does not establish it). If not, pair it with test generation.

7. Compare with a reference contract when you have one.
   - Write a wrapper function with the reference `requires` and `ensures`.
   - Inside it call the generated function. Verus must prove the wrapper.
   - This allows a weaker generated `requires` and a stronger generated `ensures`, which is the right direction.

8. Compare with the intent in words.
   - A human reads the contract next to the docstring or requirement.
   - Nothing above replaces this step. Every study ends here.

## variants by paper

### mutating outputs, to score postconditions

[Assured Automatic Programming](../vl_paper_walkthrough/assured_automatic_programming_via_large__20261012.md) (Dafny).
The paper adopts Lahiri's completeness score: "the fraction of output mutations from T that are inconsistent with φ" (the paper's words, as quoted in the study).
It mutates the outputs of consistent tests, 20 mutations.
It also marks trusted tests as hard intent "to exclude vacuous fixes such as `ensures true`" (the study's words).

[Automated Proof Generation via Self-Evolution (SAFE)](../vl_paper_walkthrough/automated_proof_generation_for_rust_code_20261012.md) (Verus).
This is the only Verus study here.
It checks the specification on about 5 true tests, then on about 20 random wrong outputs.
It keeps a specification at 80% correctness and 60% completeness, up to three per function.
Its stated purpose differs: "SAFE is fine with incomplete specifications,
as the usage of specifications in SAFE is to stimulate proof synthesis not to judge code correctness" (the paper's words, as quoted in the study).
So these thresholds select training data, and the paper does not offer them as a quality bar for a delivered contract.

[P^3](../vl_paper_walkthrough/p_3_20261012.md) (Lean) admits a benchmark task only with full reference satisfaction and `Quality = 0.5·Mutation + 0.5·Review >= 80%`.
The mutants are of the reference implementation.
An LLM review flags trivial, tautological or duplicate specifications.

### mutating programs, to score discrimination

[Beyond Postconditions](../vl_paper_walkthrough/beyond_postconditions_20261012.md) (Python, CrossHair).
It reuses an earlier mutant set of 4 to 233 mutants per task (median 55).
A mutant is killed when the verifier finds an input that meets `Pre` and breaks `Post`.
It reports two numbers: the share of sound contracts that kill every mutant, and the share of mutants killed by at least one sound contract.
It separates this from replaying known bug-triggering inputs, which, the study says, overestimates verifier completeness (study's paraphrase, not a quote).

[Verina](../vl_paper_walkthrough/verina_20261012.md) (Lean) builds the mutation into the tests.
Every positive test becomes at least three negatives, each labelled by whether it breaks the precondition or the postcondition.
The ground truth must reject all negatives.
Positive tests must cover every line of the reference.

### tests as the oracle

[Automatic Generation with Test Oracles](../vl_paper_walkthrough/automatic_generation_of_formal_specifica_20261012.md) (Dafny).
The method body is left alone and only the tests keep their `assert`s.
In the paper's words, the tests "act as specification-level oracles, validating specifications at compile time rather than implementations at run time,
and are effective at revealing incomplete postconditions".
Negative tests marked `//@invalid` are uncommented one at a time after the candidate verifies. If one verifies, repair the contract.

[Assured Automatic Programming](../vl_paper_walkthrough/assured_automatic_programming_via_large__20261012.md) goes further.
It turns each test into a tiny specification and checks it with the same verifier.

### vacuity and satisfiability

[KaPilot](../vl_paper_walkthrough/kapilot_20261012.md) (Kani).
It appends `#[kani::ensures(|_| false)]`. If the contract and this impossible postcondition both verify, the assumptions are unreachable.
Its example: a precondition `T::IS_ZST && ...` excluded every non-zero-size type. The fix was `!T::IS_ZST || ...`.

[AlgoVeri](../vl_paper_walkthrough/algoveri_20261012.md) (Lean, for the benchmark only).
For hard tasks it splits a contract into clauses `C_i` and proves, in Lean, that each is satisfiable and that dropping any one "admits unintended behaviors (e.g.,
dropping a permutation constraint allows an arbitrary sorted list)" (the paper's words, as quoted).
It also asks for an existential witness, so a returned scalar cannot be guessed.
Its longest-increasing-subsequence contract rules out a result of 0, which an earlier contract allowed.

[AutoSpec](../vl_paper_walkthrough/enchanting_program_specification_synthes_20261012.md) (C, Frama-C) separates two properties.
A clause can be legal and satisfiable and still be inadequate to prove the target.
It filters for the first, then tests the second by trying the target assertion.

[Assurance cases from C](../vl_paper_walkthrough/assurance_cases_20261012.md) (Rocq) requires a covering witness.
That is one satisfiable run from an empty state that exercises every interface.
The study says the paper's protocol theorem "does not prove that every declared state is satisfiable" (the paper's words, as quoted), so the witness is a separate obligation.

[StateSync-GKR](../vl_paper_walkthrough/statesync_gkr_20261012.md) (Isabelle/HOL, audited).
It requires a registered concrete witness for every locale assumption set, and an activation that fires every headline theorem's premises.
The paper says "a clean build with zero sorry contained a compiler-model assumption set that was unsatisfiable" (the paper's words, as quoted in the study).
Two vacuity defects were found: unsatisfiable specification-vector lengths, and an undischargable constant degree bound.
The fixes were padding to power-of-two width and a width-dependent bound.
It also tests assumption removal and checks that no theory file sits outside a ROOT.
Verus form is the study's inference: concrete witness tests for each contract premise, and mutation tests that must be rejected.

### implications against a reference

[Can LLMs Enable Verification in Mainstream Programming?](../vl_paper_walkthrough/can_llms_enable_verification_in_mainstre_20261012.md) (Dafny, Nagini, Verus).
This is the one study with a Verus implementation.
A wrapper carries the reference contract, calls the generated method, and the verifier must prove it.
The paper chose implication, not equality: "we check if the generated specification implies the specification as written in the reference solution in the data set" (the paper's words, as quoted).
The Verus validator restricts some features (no classes, no open/closed).

[Beyond Postconditions](../vl_paper_walkthrough/beyond_postconditions_20261012.md) does the same in one call.
It conjoins the trusted reference precondition onto the postcondition, then verifies the reference implementation.
Success means the inferred `Pre` implies the true valid-input predicate and the reference output satisfies `Post`.

[Verina](../vl_paper_walkthrough/verina_20261012.md) defines four directions.
For a precondition, sound means `P -> P̂` and complete means `P̂ -> P`.
For a postcondition, sound means `P ∧ Q̂ -> Q` and complete means `P ∧ Q -> Q̂`.
It tries a proof first, then falls back to tests and property-based testing, and reports "unknown" when neither settles it.

Note the opposite meanings of "sound" in two papers.
Verina calls the generated precondition sound when the true one implies it (it admits all valid inputs).
Beyond Postconditions calls it sound when it implies the valid-input predicate (it admits only valid inputs).
Read each paper's definition before comparing numbers.

### checking against intent and documentation

[Practitioner survey](../vl_paper_walkthrough/toward_practical_deductive_verification_20261012.md).
It lists the manual checks: against documentation and concrete test cases, and for vacuity, overconstraint and missing cases.
It reports that intent transcription is "the bottleneck" (the study's summary, with page 8 cited).

[KaPilot](../vl_paper_walkthrough/kapilot_20261012.md) writes contracts from the documentation without showing the model the implementation.
It says a defective body would otherwise become its own contract.
It also runs a model-scored precheck, and says that check is "a lightweight semantic-based specification checker rather than a sound verifier" (the paper's words, as quoted).

### return-determinacy probe: SpecAgent

[SpecAgent study](../vl_paper_walkthrough/specagent_20261012.md) (ACSL).
Call the function twice on the same input and assert the results are equal: `m := f(x); n := f(x); assert m = n`.
If the verifier proves it, the postcondition fixes the return value.
The paper's words: "If the verifier proves m = n, the contract is strong enough to uniquely determine the return value for each input".
The study says it reasons about returns, not heap effects or relational properties.
For Verus it is the study's inference, and it does not suit nondeterministic or stateful functions.

### agent-classified isomorphism failures: CLEVER with Claude Code

[Agentic proving study](../vl_paper_walkthrough/agentic_proving_for_program_verification_20261012.md) (Lean 4, CLEVER benchmark).
The agent writes a specification, then proves it isomorphic to the benchmark's reference.
When the proof fails, it must say why: ISSUE (a component is wrong, with a counterexample) or MISMATCH (both readings valid, not isomorphic).
Authors then review the flags by hand.
The study asks for "all and only" defensible readings and tests each against the reference.
Verus has no definitional equality of contracts, so the study's inference is implication lemmas, refinement predicates and tests.

### trace-window conformance: executable JavaScript specs

Dubray's JS-SAM on SysMoBench. [study](../vl_paper_walkthrough/executable_javascript_as_a_checkable_spe_20261012.md)
Instrument the real system and replay `(pre, action, post)` windows against a generated model.
Set the model to `pre`, apply the action, compare only the keys present in the trace post-state.
The paper's words: "Only replay against the real kernel's transitions caught it" (a release defect that passed every invariant).
The study says this is a conformance oracle, not a proof.
For Verus the study gives an inference only: a `spec fn observable(s)` projection and an `ensures observable(new) == post` per trace case.

### test lemmas for autoformalized statements: AlphaProof Nexus

[study](../vl_paper_walkthrough/advancing_mathematics_research_with_ai_d_20261012.md), Lean.
- the agent was told to prove test lemmas first (the paper, section 3, page 6):
  "verifying the first few terms of each sequence against its formal definition before attempting the target conjectures"
- a human then reviews whether each proved statement is correctly formalized and previously unproven
- the Verus form (`assert` on initial elements, map entries, arithmetic cases before the general lemma) is the study's inference

## evidence, with denominators

None of these numbers say the checks find specification errors in real Verus code.

- SAFE, low-quality versus filtered specifications as training data, on VerusBench (139 tasks): Accuracy@1 17.27% versus 43.17%, Accuracy@10 23.02% versus 53.96%.
  This shows that poor specifications damage learning. It does not measure the filter's accuracy as a check.
- Assured Automatic Programming (Dafny, MBPP-based). On 253 subjects where program and specification agreed but tests did not, completeness went from 0.27 to 0.88 after the test stage.
  On 60 subjects that disagreed, it went from 0.48 to 0.51 after the first repair. These depend on the 20 chosen mutations and the tests.
- Beyond Postconditions, HumanEval+ (164 tasks): test-set correctness was 73.6 to 89.0%, while postcondition-only verification soundness was 11.5 to 13.0%.
  Contract inference raised sound@1 to 66.7 to 81.1%. Verification-complete samples were 12.9 to 29.9%, against 2.8 to 4.8% for postcondition-only.
- Test oracles (Dafny, 110 programs): 106 generated pre/postconditions were logically equivalent to the manual ones. Four were not: one too strong postcondition and three weak preconditions.
  All four were repaired with negative tests.
  Of 165 manually analysed failed Claude repair attempts (syntax errors and timeouts excluded), 7 had a verified body but failing tests due to weak or missing postconditions.
- P^3 benchmark gate (108 libraries, 1,030 placeholders): 98.6% mutation rejection, 82.7% review score, 90.7% mean quality. The authors still warn that tests may miss intent.
- KaPilot ablation, 54 functions: with the precheck removed, 12 good specifications; the full pipeline, 31. With verification feedback removed, 12.
  The vacuity check is part of the verification stage, so no number isolates it. Labels came from two experts (Cohen's kappa 0.81 to 0.95).
- SpecAgent critique stage, 50 programs: recall up 8.02 points (DeepSeek) and 10.63 (GPT-5) over generation only ([study](../vl_paper_walkthrough/specagent_20261012.md))
  - the study reports no run of the determinacy probe alone, so its own effect is not measured
- AutoSpec had no mutation or vacuity score. Its 199 of 251 solved cases measure proving the target assertion.
- Practitioner survey: 29 interviews, with counts only. Seven found formal expression difficult. Five struggled to choose strength.
- AlgoVeri: Gemini on Verus, 25.97% compiler verified versus 24.68% after semantic filtering (77 tasks). The filter is an LLM judge.
  The paper does not report how many specifications the Lean audit rejected.
- CLEVER, 161 entries, Claude Opus 4.6 ([study](../vl_paper_walkthrough/agentic_proving_for_program_verification_20261012.md)): 65 OK, 81 ISSUE, 13 MISMATCH, 2 FAIL
  - 98.8% had at least one arguably valid reading, but only 65 matched the reference
  - 81 ISSUE are mostly reference defects, not agent errors; of 80 ground-truth issues, 48 are Lean-encoding hazards
  - defect counts: conjunct-as-guard 15, precedence 12, invalid-domain quantification 7, wrong semantics 21
  - the authors reviewed the classifications; the study says an independent blinded audit is its inference, not the paper's
- KBSpec, FormalBench-Base: completeness is the fraction of non-equivalent mutants a specification rejects. [study](../vl_paper_walkthrough/kbspec_20261012.md)
  - C@Pass counts passing specifications only; C@All gives zero to programs with none. KBSpec's C@Pass is below SpecGen's on all three models while its C@All is 38.51%, 30.92%, 39.46%
  - the 3 of 232 (1.3%) equivalent mutants is FormalBench's manual check, not KBSpec's own

- Trace replay, SysMoBench spinlock ([study](../vl_paper_walkthrough/executable_javascript_as_a_checkable_spe_20261012.md)): all four models passed syntax, bounded exploration and shipped invariants.
  Replay passed 6/28 to 25/28 windows (21.4% to 89.3%). Six windows are identity (state unchanged), so the base rate is 6/28.
  On the 22 state-changing windows the range is 0 to 86.4%. Internal consistency is weak evidence of fidelity.

AlphaProof Nexus ([study](../vl_paper_walkthrough/advancing_mathematics_research_with_ai_d_20261012.md)).
- 44 of 492 autoformalized OEIS questions were proved and judged correctly formalized and new by manual review
- the paper does not measure how much the test lemmas cut misformalization; tested cases cannot show a broad statement is right
- StateSync-GKR: two vacuity defects found, in a model with six sessions and twenty theories. [study](../vl_paper_walkthrough/statesync_gkr_20261012.md)
  - the study gives no rate of defects per assumption set, so this is two cases, not a detection rate

## where it fails

- Every score is relative to a test set or mutant set you chose. Neither study nor paper claims it measures semantic completeness.
- Test and mutation checks can be gamed or can lie. SAFE chose a 80% correctness threshold, not 100%, because the generated tests may themselves be wrong.
- Weak preconditions slip past output checks. Overly strong ones reject callers. You need both directions, and only the reference-implication or negative tests test them.
- Implication against a reference trusts the reference.
  The CLEVER paper shows how far: its reference specifications are often defective ([study](../vl_paper_walkthrough/agentic_proving_for_program_verification_20261012.md)),
  so isomorphism is a weak score for intent.
  Asking for several candidate readings did not fix it: 290 candidates, 15 proved isomorphic, across 11 entries.
  The [mainstream study](../vl_paper_walkthrough/can_llms_enable_verification_in_mainstre_20261012.md) says the paper notes it can reject useful alternatives.
- Verina reports an unknown status when neither proof nor tests settle a relation. Beyond Postconditions counts a sample as sound if CrossHair finds no violation within 60 seconds.
  That is a timeout convention, not a proof.
- Clause audits scale badly. AlgoVeri applied them to hard tasks only, with expert curation.
- Vacuity checks are tool specific. KaPilot's trick depends on how Kani handles the appended `false`. Whether Verus behaves the same is not shown.
- A passing check finds no error, so it does not prove the contract right.
  [Assurance cases](../vl_paper_walkthrough/assurance_cases_20261012.md) found a defective use (`CopyCtx(ctx, ctx)`) only by human review of a valid proof.
- Specification inference from existing code copies bugs.
  The Beyond Postconditions study says AutoSpec and SpecGen are "described as refining contracts to buggy implementations, which prevents bug detection" (the study's words).
  The Verina study agrees in part: ground-truth code gave little or negative SpecGen improvement (the study's words).

- A finite trace corpus cannot speak for behavior outside the captured windows,
  and the projection can hide implementation state. [study](../vl_paper_walkthrough/executable_javascript_as_a_checkable_spe_20261012.md)

## where the studies disagree

- How much to demand of completeness. SAFE accepts incomplete specifications for training. Beyond Postconditions, P^3 and Verina treat incompleteness as a defect to measure and report.
  The goals differ, so this is not a contradiction.
- What to mutate. Output-mutation (ProofRover, SAFE) is cheap and works on any test pair. Program-mutation (Beyond Postconditions, P^3, Verina) tests the verifier's ability to discriminate bugs.
  Beyond Postconditions says replaying known inputs overestimates completeness. No paper compares the two on the same specifications.
- Whether a reference specification is a safe oracle. Most studies above use it as one.
  The CLEVER study ([study](../vl_paper_walkthrough/agentic_proving_for_program_verification_20261012.md)) found most reference specifications defective in some way.
- Whether the model should see the implementation when drafting the contract. KaPilot excludes it on purpose. AutoSpec and the test-oracle paper give the code.
  KaPilot's cost is its own admission that source exclusion can make functional postconditions impossible when documentation is incomplete.
- Where to place the human. ProofRover marks trusted tests as hard. Practitioners and [AlgoVeri](../vl_paper_walkthrough/algoveri_20261012.md) rely on expert review.
  No study measures reviewer error.

## things in the studies that looked wrong

- The [test-oracle study](../vl_paper_walkthrough/automatic_generation_of_formal_specifica_20261012.md) flags that the abstract says 98.2% in at most eight attempts,
  while the table puts 98.2% under r@10. The study reports this itself.
- The [Beyond Postconditions study](../vl_paper_walkthrough/beyond_postconditions_20261012.md) already notes the paper's "2018" ACM metadata conflicts with its 2025 dates.

## open questions

- Does a Verus `ensures false` probe catch an unreachable `requires` in every case? What about `requires` that only fail under a quantifier trigger?
- Which mutation set is enough? No study gives a stopping rule. Beyond Postconditions had a median of 55 mutants. ProofRover used 20 output mutations.
- Can we mutate Rust code the way these papers mutate Python and Dafny, with ownership and borrowing in play? Wrong mutants may not compile.
- Can the implication wrapper handle contracts about `&mut` state? The mainstream study restricts Verus validation features.
- How do we check a contract against an English requirement without a human? AlgoVeri's LLM judge and KaPilot's precheck are model based, so they carry the same risk as the thing they check.
- Which of these checks should run in CI for every change to a contract? The practitioner survey reports that proofs break as code changes,
  and none of the papers say how the specification checks age.
