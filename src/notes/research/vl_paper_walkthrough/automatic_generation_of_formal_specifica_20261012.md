# Automatic Generation of Formal Specification and Verification Annotations Using LLMs and Test Oracles
(authored by agents unless marked 🧑)
Tag: `faria2026automatic`, [paper](https://arxiv.org/abs/2601.12845v1)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and contribution

This paper studies whether large language models can add the annotations needed to verify an existing Dafny implementation. The input is conventional Dafny code, natural-language requirements in comments, and test methods with statically checked `assert` statements. The output may add preconditions, postconditions, loop invariants, ghost predicates/functions, assertions, and lemmas, while leaving the implementation unchanged. The authors call the test assertions specification-level oracles because Dafny checks them from contracts without executing the method body. The central workflow is “generate–check–repair–minimize” (Figure 1, p. 4): ask one or more models for annotations, run the Dafny verifier, feed diagnostics back to a repair prompt, then remove unnecessary generated code.

The paper evaluates 110 programs in TESTDAFNY110. Its multimodel system runs Claude Opus 4.5 and GPT-5.2 in parallel and chooses an output by syntax validity, verifier success, fewer lines, and shorter verification time. With up to eight repair attempts, it verifies 98.2% of the 110 programs (108/110), averaging two attempts. The two misses, `FastModularExponentiation` and `PrimeFactorization`, need four and ten lemmas in the manual solutions. These numbers measure Dafny contract satisfaction on this curated benchmark; they do not establish that an arbitrary natural-language requirement is complete.

## technique 1: make static tests semantic oracles

What it is: retain test calls and assertions while stripping every formal annotation from the method under verification. A call such as `var idx := BinarySearch(a, 3); assert idx == -1;` forces the generated postcondition to imply the intended result. The paper explains that “These static test cases therefore act as specification-level oracles, validating specifications at compile time rather than implementations at run time, and are effective at revealing incomplete postconditions” (Section 2, p. 6).

When to use it: use this when tests can express concrete valid outputs and when a verifier checks calls using only the contract. It catches a contract that is too weak even when the implementation body proves against it. In the paper's binary-search example, a postcondition that permits arbitrary values outside the intended `-1..a.Length-1` range cannot prove the test assertions.

How to apply it:

1. Keep ordinary method calls and positive output assertions in each test method.
2. For nondeterministic valid outputs, assert a disjunction, such as `idx == 1 || idx == 2` for duplicate values.
3. Add array-to-sequence or intermediate-value assertions when Dafny needs a trigger, for example `assert a[..] == [1, 4, 4, 6]`.
4. Generate `requires` and `ensures`, then run Dafny. A failing test assertion means the postcondition is incomplete, wrong, or needs a helper assertion.
5. Add negative tests marked `//@invalid` for edge cases that should be rejected. Uncomment each one after a candidate verifies; if it verifies, the candidate has an overly weak precondition or overly strong postcondition and must be repaired.

Verus form (inference): preserve executable Rust test or harness calls and put the intended result in `assert` statements over the function's specification view. Verus `requires`/`ensures` clauses are checked symbolically, so the same oracle idea works when a test call's result is constrained by the postcondition. Rust arrays and `Vec` values need explicit `Seq` views (`v@`) and ownership-compatible setup; a Verus proof cannot rely on runtime assertions alone. Add negative harness lemmas or compile-fail cases to test that an invalid precondition is not accidentally accepted. The paper is about Dafny, so this translation is an inference.

Evidence and limits: of 165 manually analysed failed Claude repair attempts (syntax errors and timeouts excluded), 7 had a verified body but failing tests due to weak or missing postconditions (Section 6.4, p. 18). The authors report that four edge cases with weak preconditions or strong postconditions were repaired after negative tests. A test suite only checks its chosen inputs and outputs; the authors therefore still manually compare contracts with expert solutions.

## technique 2: staged direct generation followed by diagnostic repair

What it is: use two prompts that mirror a human workflow. The direct prompt asks for all missing annotations in one attempt. If verification fails, the repair prompt receives the complete current program and exact Dafny errors, and revises annotations without changing the implementation or deleting tests. The repair prompt explicitly forbids unproved `assume`, `decreases *`, and test removal. The paper states that “Our two prompts are designed to mirror this workflow in an LLM-assisted setting” (Section 4, p. 8).

How to apply it:

1. Strip preconditions, postconditions, loop invariants, lemmas, ghost declarations, and helper assertions, but retain test assertions.
2. Send the code between `BEGIN DAFNY` and `END DAFNY` tags with a direct prompt that requests only modified code.
3. Post-process recurring formatting errors, such as invariants placed outside the loop header.
4. Run Dafny 4.11.0 with a one-minute timeout. Stop immediately on success.
5. Otherwise send the current annotated program and verifier diagnostics to the repair prompt. Repeat for at most nine repair iterations after the initial attempt.
6. Record syntax errors, timeouts, and VC failures separately. The paper forbids `assume`, `decreases *`, and test removal in the repair prompt and says generated solutions should be manually inspected; an automatic rejection check is the study's inference, not a described step.

The direct prompt contains concrete Dafny idioms: `requires` and `ensures` immediately after method headers; `invariant` immediately after loop headers; `==>` for implication; sequence length `|s|`; explicit quantifier lower bounds; and recursive ghost functions whose recursion direction matches the implementation. The repair prompt gives recurring helper patterns, such as `assert a[..i+1] == a[..i] + [a[i]]`, sequence-concatenation facts, array-to-sequence facts, and concrete test examples. These are practical prompt content, not a theorem that an LLM understands the program.

Verus form (inference): map the direct prompt to a Rust/Verus skeleton containing `requires`, `ensures`, loop `invariant`, `decreases`, `spec fn`, and `proof {}` blocks. Return a whole compilable file so ownership and macro context are preserved. Feed the exact Verus diagnostic, distinguishing Rust parse/type errors from failed verification conditions. Guardrails should reject `assume`, `admit`, `external_body`, unchecked FFI, and implementation edits. Verus often requires explicit casts from `usize` to mathematical `int` and proofs about `Seq` views; include those constraints in the system prompt.

Evidence: under repair prompting, Claude Opus 4.5 reaches 90.0% by attempt five and 96.4% by attempt ten. GPT-5.2 with low reasoning reaches 75.5% by attempt five and 89.1% by attempt ten. The multimodel row reaches 94.5% at five and 98.2% at ten, although the text calls the 98.2% result `repair@8`; the table reports 98.2% in the `r@10` column. Direct multimodel prompting reaches only 57.3% by five attempts. This shows value from verifier-directed repair, but the exact attempt accounting should be clarified before reproducing the headline.

## technique 3: use a catalogue of proof-helper patterns

What it is: teach the repair prompt patterns that Dafny's SMT verifier commonly needs. Proof helpers include assertions, lemmas, ghost variables, and auxiliary predicates/functions. In test code, the paper gives examples: assert a concrete array sequence, prove an intermediate list length, or provide a counterexample property before the final assertion. For recursive specifications, it recommends adding non-recursive postconditions and, when concrete list tests fail, setting `{:fuel N}` on the recursive function. For quantifiers with no trigger, it recommends extracting the complex expression into a predicate rather than manually adding a trigger.

When to use it: use helpers after the contract and loop invariant express the intended property but the verifier cannot connect a local state to that property. The dataset shows why this matters: 56% of programs need proof helpers beyond pre/postconditions and invariants, and the logistic model finds helper count is the strongest difficulty signal.

Steps (1 and 6 are the study's inference, not the paper's):

1. Classify each error as a missing contract, missing invariant, or missing proof step.
2. For sequence facts, insert a local concatenation or slice assertion at the loop iteration where it is true.
3. For tests, assert concrete intermediate facts before asserting the method result.
4. For recursive ghost definitions, recurse from the end of the sequence when the implementation iterates upward, and add postconditions that expose membership or bounds.
5. If quantifier instantiation fails, wrap the complex body in an auxiliary predicate and quantify over that predicate.
6. Verify after each small helper so that later minimization can remove redundant helpers.

Verus form (inference): use `proof fn` lemmas with `requires`/`ensures`, `assert` and `assert forall` blocks, `Seq` slicing/concatenation facts, and `#[trigger]` only when needed. Ghost state must be explicitly declared with `ghost` values, and recursive `spec fn` definitions need termination measures. Verus's ownership rules mean a helper may consume or borrow a view rather than an executable vector; keep executable mutation unchanged and reason over `v@` snapshots. These details are a Verus adaptation, not evaluated in the paper.

Evidence and limits: regression coefficients are `βL = -0.0735` for implementation lines, `βA = -0.0475` for annotation lines, and `βH = -0.5825` for helper annotations, all significant at `p < 0.001`; the logistic model has AUC 0.907 over 1,540 problem-configuration pairs (110 × 14). The helper coefficient indicates correlation with difficulty, not a causal penalty (study's inference). The two unsolved tasks need many lemmas, showing that a pattern catalogue does not replace domain-specific proof invention.

## technique 4: minimize a verified generated program

What it is: repair tends to accumulate patches. Appendix B gives a dependency-aware deletion algorithm that preserves the original program and verifier success. It aligns original and extended files with an LCS, makes removal candidates from added statements, blocks, groups, loop clauses, and declaration clauses, then tentatively removes candidates and reruns Dafny with a short timeout.

How to apply it:

1. Compute `Δ = Pext \ Porig` with an LCS alignment that ignores whitespace and attributes.
2. Build candidates from single or grouped statements, nested blocks, `invariant`/`decreases`, and `requires`/`ensures` clauses.
3. Build declaration dependencies and reference counts.
4. Traverse candidates from bottom to top and outside in. For each eligible candidate, construct `Ptent = Pmin \ c`.
5. Verify `Ptent` within 10 seconds, using `--filter-symbol` for body deletions; cache results. Commit a deletion only if verification success and verification time are preserved.
6. Remove declarations whose reference count reaches zero. Repeat rounds until no deletion commits.

Verus form (inference): perform the same delta analysis on Rust/Verus syntax, but preserve macro wrappers and any original executable statement. Candidate deletion must re-run `verus`, not just `cargo check`; a proof block, `requires`, or `ensures` can affect distant obligations through dependencies. Cache per-symbol verification results where the Verus command supports scoped checking. This minimizer is an inference because the paper's implementation is Dafny-specific.

Evidence: repair-generated programs are 63.2% larger than manual solutions. Minimization removes 58% of annotation lines and lowers overhead to 10.6%, at an average 1.4 seconds per removed line. Direct prompting has only 7.9% extra lines. Removing proof text can improve reviewability, but preserving verification time is a heuristic, not proof that the remaining annotation is conceptually minimal.

## technique 5: combine models and select by objective criteria

What it is: run Claude Opus 4.5 and GPT-5.2 in parallel, then select the candidate in this order: syntactically valid, verifier-passing, fewer lines of code, and shorter verification time. The paper reports that this multimodel strategy gives the highest repair result, while single-model results differ in cost and latency. Claude at temperature 0.5 gives 90.0% repair@5, 96.4% repair@10, $0.0441 per call, and 15.8 seconds average response time; DeepSeek costs $0.0007 per repair call but succeeds on only 69.1% by ten attempts.

Verus form (inference): dispatch independent Verus candidates and rank them only after running the same compiler and verifier. Preserve a trace of model, prompt, diagnostics, and selected candidate. A lower line count is not automatically safer if it uses opaque axioms or broad triggers, so add explicit policy checks before ranking. The paper does not test Verus or establish that two particular models complement each other there.

## IDE integration

The Dafny AI Assistant adds generation and repair controls to the official Visual Studio Code extension. It supports OpenAI, Anthropic, DeepSeek, and xAI, retries another provider after syntax, verification, rate-limit, or timeout failures, and presents the best partially verified version if no candidate succeeds. In a crossover usability study, seven master's students with six weeks of Dafny experience performed 42 tasks. Tool-assisted success was 85.7% versus 42.1% manually; mean completion time was 6.2 versus 11.1 minutes; SUS was 74.6/100. The sample is small and the participants are students, so this measures usability under a controlled exercise, not production reliability.

## what is proved, measured, and trusted

Dafny's verifier proves each accepted implementation against the generated contract and test assertions. The experiment measures pass rates, API cost and latency, annotation lines, contract similarity to manual solutions, and usability. Among 110 programs, generated pre/postconditions are logically equivalent to manual ones for 106 (96.4%); 12 (10.9%) are textually identical, 11 (10.0%) structurally identical, and 68 (61.8%) semantically similar. Four (3.6%) are not logically equivalent: one overly strong postcondition and three weak preconditions. The authors repaired all four with negative tests.

The trusted base includes Dafny, Z3, the test-suite authoring, manual reference specifications, model APIs, post-processing, and the human comparison. A verifier success proves only the supplied contract. The authors describe their acceptance rule, in the comparison with mutation-based work, as: “a candidate specification is accepted only if it verifies and makes all test assertions provable” (Section 8.2, p. 26), and negative tests must be non-provable, adding that it “places higher demands on test quality”; that it assumes the tests cover the intended behavior is the study's inference. Models can cheat by inserting `assume`, disabling termination, or simplifying code; the paper says generated solutions “should be manually inspected” (Section 6.5, p. 20).

## contradictions, gaps, and work VL should avoid repeating

The abstract says 98.2% within at most eight attempts, while Table 2 places 98.2% under `r@10`; the results narrative repeats `repair@8`. This is an internal reporting inconsistency, even though 98.2% of 110 rounds to 108 programs. The paper reports 96.4% logical equivalence over 110, but the prose discusses 108 solved programs and two unsolved versions; the denominator for the contract comparison is all 110, including generated candidates for the two unsolved tasks. Direct and repair costs are per API call, not total cost per solved task. The logistic regression treats 1,540 problem-configuration pairs as observations, so repeated configurations for one program are not independent in the ordinary sense; the paper does not discuss clustered uncertainty.

VL should not simply repeat a Dafny benchmark with pass/fail counts. The reusable ideas are static test oracles, negative tests, explicit anti-cheating checks, verifier-feedback repair, pattern catalogues, and dependency-aware minimization. A Verus study still needs ownership-sensitive examples, `usize`/`int` conversion failures, `external_body` policy checks, and independent semantic validation because Dafny's test oracle assumptions do not automatically transfer.

## threat to agent-written verified Rust (inference)

The paper suggests a meaningful but bounded threat to VL. An agent can generate a verifier-passing Rust contract that is weak, overly strong, or algorithmically wrong if its tests and postconditions are incomplete. Repair loops can improve proof completion while accumulating large, opaque proof scaffolding. For VL, the practical controls are: require positive and negative specification tests; reject bypass constructs and implementation edits; retain exact verifier diagnostics; compare generated contracts to a human or machine oracle; minimize only after successful verification; and report semantic correctness separately from compiler success. This is an inference from the Dafny evidence, not a measured Verus result.

## techniques for the catalog

- static test oracles: retain statically checked output assertions so contracts must imply concrete intended results
- negative specification tests: uncomment assertions that should fail to expose weak preconditions or overly strong postconditions
- staged verifier-feedback repair: generate annotations, run the verifier, and iteratively repair the complete program from exact diagnostics
- proof-helper pattern catalogue: supply sequence, recursion, quantifier, and test-helper templates for recurring SMT failures
- dependency-aware minimization: delete generated declarations and clauses only when a short verifier run still succeeds
- multimodel candidate selection: rank parallel model outputs by syntax, verification, size, and verification time
Audited 2026-10-12 against the paper: checked every number (Tables 2 and 3, regression coefficients, AUC, usability results, costs, minimization figures), the Appendix B minimization steps, prompt contents, and the quotations; corrected page references for Figure 1 (p. 4), the oracle quotation (p. 6) and the acceptance-rule quotation (p. 26), rewrote the 7-of-165 count that was stated as all seven of 165, relabelled the acceptance rule that was presented as a warning, removed an automatic-rejection step the paper does not describe, and marked technique 3 steps 1 and 6 and the causal caveat as the study's inference; Verus forms were read against the Verus references and found sound.
