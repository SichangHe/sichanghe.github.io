# SWE-Bench+: Enhanced Coding Benchmark for LLMs
(authored by agents unless marked 🧑)
Tag: `aleithan2024swebenchplus`, [paper](https://arxiv.org/abs/2410.06992v2)

## scope and main result

Aleithan, Xue, Mohajer, Nnorom, Uddin, and Wang audit whether SWE-bench test results mean that an LLM really fixed a software issue. They manually compare model patches with developer (“gold”) patches, inspect issue reports and trajectories, and then build SWE-Bench+ with post-cutoff issues screened for clear solutions in reports or comments. The abstract reports: "32.67% of the successful patches involve “cheating” as the solutions were directly provided in the issue report or the comments." (Abstract, PDF p. 1) It also reports 31.08% suspicious patches from weak tests and a drop from 12.47% to 3.97% after filtering those problems on the refined original set (Abstract, PDF p. 1).

The paper is not a formal-verification system. Inference: its evaluation techniques could help audit a Verus benchmark. A benchmark that accepts a patch because a weak test suite passes can similarly accept agent-written Rust whose Verus specification is incomplete, vacuous, or disconnected from the intended behavior. The study therefore gives VL a concrete audit procedure and threat model.

## technique: independent patch validation against a gold change

what it is

The authors compare files, lines, and code changes in a model-generated patch with the original pull request, while reading the issue, tests, logs, and trajectory. They write: "First, we picked issues claimed as resolved by SWE-Agent+GPT-4." They then say: "Second, we performed a patch validation study by comparing the gold patches (i.e., original) to the model patches (i.e., generated)." (§1, PDF p. 2)

how to do it

1. Start with the benchmark's complete issue set and each issue's repository revision, tests, and developer patch.
2. Run the target agent and retain instances whose evaluation logs say every test passed. Their initial results contained 286 instances marked resolved; they selected 251 after checking logs (§2, PDF p. 4).
3. For each retained instance, compare changed files, changed lines, and implementation behavior with the gold patch. Read the issue description, tests, and model trajectory.
4. Have multiple reviewers examine the patch independently. The paper states: "three authors independently performed the patch validation study." Disagreements were resolved through discussion involving all authors (§2, PDF p. 4).
5. Classify the patch as suspicious or correct, then recompute the resolution rate using only correct classifications.

Verus form

Inference: apply the same protocol to VL by storing the Rust diff, Verus proof obligations, specification diff, compiler/verifier logs, and the intended property. A review must compare the generated contract with the human task and with an independently written specification or test harness. In Verus, a passing `assert` or `ensures` proves only the encoded statement; it does not establish that the statement captures the issue. Inference: require at least two independent validators for benchmark labels and keep their disagreement record.

evidence and limits

Among 251 passed SWE-bench patches, Table 1 counts 82 solution leaks (32.67%), 32 incorrect fixes (12.75%), 9 changes to different files/functions (3.59%), and 37 incomplete fixes (14.74%). It counts 76 correct-but-different fixes (30.27%) and 15 more-comprehensive fixes (5.98%) (Table 1, PDF p. 4). After excluding all suspicious categories, the reported SWE-Agent+GPT-4 rate drops from 12.47% to 5.49% (§2.2, PDF p. 7). The abstract and §1 instead report 3.97% for the filtered original benchmark. The paper does not explain this conflict. Inference: Table 1 contains 91 correct fixes, and 91/2,294 is approximately 3.97%; this does not reconcile §2.2’s 5.49%. Inference: benchmark reports should state the exact retained-instance denominator and classification rule beside every rate.

## technique: detect solution leakage before measuring capability

what it is

A solution-leak instance gives the model the answer in the issue report or comments. The authors define it as cases where the solution is “clearly outlined in the issue description or comments on GitHub” (§2.1.1, PDF p. 4). They note that issue text and comments are model input, so copying them does not demonstrate independent problem solving.

how to do it

1. For each issue, inspect the report and comments supplied to the model.
2. Check whether the supplied text clearly outlines the solution. Inference: exact code, patch fragments, and implementation instructions are useful things to look for.
3. Mark the instance leaked if the supplied text directly specifies the solution.
4. Exclude leaked instances from the capability score, and report their count separately.
5. Construct a new benchmark from issues created after the model's training cutoff, then repeat manual leakage screening.

Verus form

Inference: for VL, remove existing Verus proof scripts, exact invariant text, and generated patches from prompts used for evaluation. A benchmark curator can use a `requires` predicate for a task's intended input and a separately authored `ensures` contract, then check that no supplied artifact contains the answer. This is a data-governance check, not a Verus proof.

evidence and limits

SWE-Bench Lite contains 18 leakage instances among 54 passed cases (33.33%); SWE-Bench Verified contains 37 among 112 (33.04%), Table 2 (PDF p. 7). The collection interval is stated as "2023-11-01 to 2024-08-22" (§1, PDF p. 3). Section 3 describes manual removal of instances with clear solution details (PDF p. 8). Inference: these checks reduce known leakage but cannot prove that an answer never appeared in pretraining. A post-cutoff Verus task can still leak through public repositories, model prompts, or dependency documentation.

## technique: test adequacy audit and suspicious-pattern taxonomy

what it is

The paper distinguishes weak tests from genuine correctness by checking whether a patch is wrong, incomplete, or aimed at unrelated code yet still passes. Its definition is direct: "Incorrect fixes: refer to cases where the model-generated patches provide incorrect solutions, yet pass the test cases when they should have failed." (§2.1.1, PDF p. 5)

The authors identify four suspicious patterns: incorrect fixes, different files/functions changed, incomplete fixes, and solution leaks. They also identify two correct patterns: a behaviorally correct implementation different from the gold patch, and a more comprehensive implementation.

how to do it

1. Run all benchmark tests and retain only patches where the expected tests pass.
2. Compare the changed files and functions with the gold patch to detect unrelated edits.
3. Read the issue’s behavioral requirement and inspect whether the patch meets it. Inference: constructing additional tests could help this review; the paper does not report doing that.
4. Inspect edge-case handling against the gold patch and the issue, marking omitted branches as incomplete.
5. Preserve correct alternative implementations instead of requiring textual similarity to the gold patch.
6. Publish counts for every category, not only an aggregate pass rate.

Verus form

Inference: a VL audit should add independent semantic checks: compile and verify the Rust, run the executable tests, and inspect whether `requires`, `ensures`, loop invariants, and `assert` facts express the user property. A generated proof that uses an overly weak postcondition should be classified as incomplete even if Verus accepts it. Inference: compare behavior and contracts, not proof-text similarity; equivalent Verus proofs can use different lemmas and invariants.

evidence and limits

The authors describe the Django example as a generated `__reversed__` implementation that reverses only dictionary keys while the gold patch reverses the whole dictionary; tests still pass (§2.1.1, PDF p. 5). For the incomplete-fix example, the authors say the generated patch is "missing critical parts of this logic, such as the try-except block and the check for a running event loop." (§2.1.1, PDF p. 6) In SWE-Bench+, Table 3 records 16, 11, 14, and 7 cases of changes to different files/functions for SWE-RAG+GPT-4, SWE-RAG+GPT-3.5, SWE-Agent+GPT-4, and AutoCodeRover+GPT-4o respectively (PDF p. 9). The paper reports: "on average, around 67.72% of the resolved instances did not truly resolve the issue, despite passing all the tests." (§4, PDF p. 9) Inference: this statement concerns instances selected as resolved, rather than all 548 tasks; the inconsistent Table 3 counts below limit its interpretation.

## technique: build a post-cutoff, filtered benchmark

what it is

SWE-Bench+ follows the original collection methodology while adding date and content filters. The authors state: "The primary objective of SWE-Bench+ is to assess the models’ ability to generate accurate patches for real-world GitHub issues without the risk of bias or prior exposure to the solution." (§3, PDF p. 8)

how to do it

1. Start with SWE-Bench’s 12 projects and exclude Django, whose issues are tracked outside GitHub.
2. Collect issues after October 2023, the latest cutoff among GPT-3.5, GPT-4, and GPT-4o used in the experiments.
3. Apply attribute filtering to retain issues that resolve a problem and add tests.
4. Apply an execution filter: repositories must install successfully and pull-request tests must pass.
5. Manually remove issues with clear solution details in reports or comments.
6. Retain the resulting 548 instances and identify the correct repository versions (§§3–4, PDF p. 8). The dataset release is linked at https://zenodo.org/records/13879453 (§1, PDF p. 3). Inference: freezing revisions and publishing collection scripts would support reproducibility; this paper reports reusing SWE-Bench’s open-source scripts.

Verus form

Inference: construct a VL benchmark from dated Rust/Verus issues, pin repository commits and Verus versions, require a task-specific specification plus tests, and exclude prompts containing the target proof. Run the same verifier version for every submission and archive logs. Date filtering reduces memorization risk but does not establish independence.

evidence and limits

Table 3 lists 4, 3, 3, and 21 correct patches for SWE-RAG+GPT-4, SWE-RAG+GPT-3.5, SWE-Agent+GPT-4, and AutoCodeRover+GPT-4o, respectively. Its total row lists 23, 20, 32, and 42 (PDF p. 9). Inference: the last two totals are inconsistent with their category sums, which are 20 and 46. Section 4 reports validated rates of 0.73%, 0.55%, 0.55%, and 3.83%, and original leaderboard rates of 1.31%, 0.17%, and 18.83% for the two RAG systems and AutoCodeRover (PDF p. 9). The authors write: "This drop in performance for all models when moving from SWE-Bench Full to SWE-Bench+, highlights the impact of excluding suspicious fixes on the overall resolution rates." (§4, PDF p. 9) Inference: GPT-3.5’s reported increase from 0.17% to 0.55% contradicts that claim. The authors state: "the issue with weak tests still persists and needs future investigation." (§4, PDF p. 9)

## technique: effectiveness-aware cost accounting

what it is

The authors report both average cost per benchmark instance and cost per genuinely fixed issue. They define the latter as "calculated by dividing the total cost by the number of instances successfully resolved by the model" (§5, PDF p. 9). Table 4 reports RAG+GPT-4 at $0.24 per instance and $32.5 per fix, RAG+GPT-3.5 at $0.05 and $10.0, SWE-Agent+GPT-4 at $3.59 and $655.0, and AutoCodeRover+GPT-4o at $0.46 and $12.61 (PDF p. 9).

how to do it

1. Record total model cost and generation time. Inference: retaining per-task measurements would make the accounting easier to audit.
2. Divide by all 548 benchmark instances for average cost per instance.
3. Manually validate which patches are genuinely correct.
4. Divide total cost by that validated count for effectiveness-aware cost per fix.
5. Inference: report model, dataset, denominator, and time alongside resolution rate.

Verus form

Inference: VL can add proof-checking time, repair iterations, compiler runs, and human review cost. A Verus accounting function can prove division and aggregation over a nonzero task count, but prices and wall-clock measurements are external observations.

evidence and limits

Section 5 reports SWE-Agent+GPT-4 at about four minutes per instance and 37 hours total, and AutoCodeRover at 4.5 minutes and 41 hours (§5, PDF p. 9). The cost prose on PDF p. 10 conflicts with Table 4: it assigns $0.24/$32.5 to SWE-Agent and $0.05/$10.0 to RAG+GPT-4, and later gives RAG+GPT-3.5 a $32 cost per fix. The figures above follow Table 4. Inference: even Table 4’s $12.61 per AutoCodeRover fix does not follow from $0.46 × 548 / 21 (about $12.00), so it should be treated as a reported value rather than reconciled accounting. Inference: VL comparisons should publish hardware, verifier version, timeout, and whether failed proof attempts count.

## what is proved, measured, and trusted

The paper does not provide a formal proof of patch correctness. It measures manual classifications, test outcomes, benchmark counts, costs, and rates. It trusts the gold patch as a reference for comparison, the benchmark scripts as an execution oracle, and reviewer judgment for semantic classification. The authors explicitly conclude: "weak test cases continue to pose challenges, with model resolution rates dropping further in this refined environment." (Conclusion, PDF p. 11) Inference: a Verus proof result is stronger than an ordinary unit-test result only for the exact formal specification supplied to Verus; the specification, external bodies, compiler, verifier, and environment remain trust boundaries.

## implications for VeruLaw

Inference: the greatest threat is false confidence from an under-specified contract. A model may generate a valid Verus proof for a postcondition that omits the security or functional requirement, just as a SWE-bench patch can pass weak tests. VL should score independently authored specifications, mutation tests, negative tests, and review of changed files and functions.

Inference: the paper's leakage filter should be applied before any training or evaluation corpus is used for agent-written verified Rust. Keep proof scripts and issue solutions out of prompts, pin dates and revisions, and report exact task denominators. Existing work on patch validation and test-strength auditing means VL should not redo a benchmark that reports only verifier pass rates.

## techniques for the catalog

- patch validation: compare generated and gold changes, inspect issue behavior and trajectories, and use independent reviewers
- leakage audit: remove tasks whose report or comments disclose the solution, then use post-cutoff issues
- test adequacy taxonomy: classify incorrect, unrelated, incomplete, leaked, alternative-correct, and more-comprehensive patches
- filtered benchmark construction: combine date, attribute, execution, and manual-content filters while pinning revisions
- effectiveness-aware cost: divide total cost by all tasks and by independently validated fixes
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The primary objective of SWE-Bench+ is to assess the models’ ability to generate accurate patches for real-world GitHub issues without the risk of bias or prior exposure to the solution."): checked every quotation, number, section/page reference, and technique against the full paper, including references; corrected the unrelated DOI, unsupported explanations and method steps, page references, and descriptions of conflicting rates, counts, and costs; did not reproduce experiments, inspect external artifacts, or independently establish patch correctness.
