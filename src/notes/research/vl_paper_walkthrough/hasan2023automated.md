# Automated Repair of Declarative Software Specifications in the Era of Large Language Models
(authored by agents unless marked 🧑)
Tag: `hasan2023automated`, [paper](https://doi.org/10.48550/arxiv.2310.12425)
## scope and method
This empirical paper evaluates ChatGPT (gpt-3.5-turbo) as a repair assistant for faulty Alloy specifications and compares it with ARepair, BeAFix, ATR, and ICEBAR. Alloy specifications are translated to propositional formulas and checked with off-the-shelf SAT solvers within a finite scope (Section II-A, pp. 2–3). The paper’s abstract says: “Our study revealed that while ChatGPT falls short in comparison to existing techniques, it was able to successfully repair bugs that no other technique could address.” The study uses 1,974 faulty specifications: 1,936 hand-written ones from Alloy4Fun (student submissions) and 38 from ARepair (Section I, p. 2; Section IV-C, p. 5). Five prompt scenarios vary bug-location information, fix comments, and whether passing assertions is requested (Table I, p. 5). ChatGPT is used one-shot: each prompt is sent through the API and the response is saved and then checked with Alloy Analyzer 4.2 (Section IV-D, p. 6); the analyzer’s output is not fed back to the model. The paper lists conversational use with human feedback as an untested possibility (Section VII, p. 10).

Inference: For Verus, the paper supports an LLM-in-the-loop workflow that proposes proof/specification repairs, runs the actual verifier, and rejects candidates that do not compile or prove. It does not show that ChatGPT can repair Verus proofs, and Alloy’s bounded SAT semantics differs from Verus’s Rust/SMT verification.

## technique 1: counterexample-oracle repair loop

What it is. Alloy’s `check` command searches for a counterexample to `M ∧ ¬p`; `run` searches for a satisfying instance of `M ∧ p` (Section II-A, pp. 2–3). The paper’s baselines edit the specification, rerun the Analyzer, and use assertion success as the correctness oracle. BeAFix exhaustively enumerates candidate mutations up to a bound and uses assertions as oracles; ARepair uses AUnit tests, the AlloyFL fault localizer, and mutation; ICEBAR uses property-based oracles and Alloy counterexamples to prune partial fixes; ATR is template-based and extends FLACK fault localization (Section III-A, pp. 3–4). In the paper’s own ChatGPT pipeline the model is not shown counterexamples; the Analyzer is used only afterwards, to evaluate each response (Section IV-D, p. 6).

How to apply it. Steps 1, 2 and 5 follow the paper’s illustrative example and baselines; steps 3 and 4 as written are Inference (an adaptation, not the paper’s ChatGPT procedure).
1. Identify a faulty Alloy specification and its assertion
2. Obtain a counterexample with `check` at a chosen scope (Section II-B, p. 3, shows the Analyzer producing a counterexample for the faulty room-access specification)
3. Inference: give the model, counterexample, and optional bug location/fix hint to the repair generator (the paper’s ChatGPT prompts carry the specification and optional location/fix comments, not counterexamples)
4. Generate a candidate edit (mutation, template, exhaustive candidate, or LLM response)
5. Re-run Alloy Analyzer; retain only candidates whose assertion check succeeds (the paper uses each specification’s assertions as oracles, Section IV-E, p. 6)
6. When evaluating on a benchmark, compare against the known correct specification: the benchmarks “come with the correct versions of the specifications, which serve as ground truths for verifying the accuracy of the obtained results” (Section IV-C, p. 5)

Verus form (Inference). Replace Alloy Analyzer with `cargo verus` and use compiler/verifier diagnostics as the oracle. Ask an LLM to propose a changed `requires`, `ensures`, invariant, lemma, or implementation expression; apply it in a clean working tree; rerun Verus; and accept only a candidate that compiles and verifies the intended tests. A passing proof is not sufficient if the specification was weakened, so preserve independent behavioral tests and review the diff.

Evidence. The authors evaluated five scenarios and compared correctly repaired specifications on the same benchmark suites used by the prior tools (Section V, p. 6). In Repair Scenario 2, ChatGPT repaired 517/1974 specifications (26%); in Alloy4Fun it repaired 497/1936 (26%) in Scenario 2, while in ARepair it repaired 29/38 (76%) in Scenario 1 (Table II and Section V, pp. 6–7). Table II totals over the 1,974 specifications: ARepair 194, ICEBAR 1072, BeAFix 1005, ATR 1308; ChatGPT Scenario 1 to 5: 430, 517, 329, 151, 385. The paper says ChatGPT “falls behind the other repair tools in the Alloy4Fun benchmark, except for ARepair” and “achieved the best performance on the ARepair benchmark with 29 repairs in Repair Scenario 1” (p. 7). Percentages are rounded from the displayed fractions.

Limits. Alloy is bounded-exhaustive: a successful check covers only instances within the selected scope (Section II-A, p. 3). ARepair can overfit when tests are insufficient; BeAFix’s exhaustive search can be time-consuming (Section I, p. 1; Section III-A, pp. 3–4). Inference: Verus’s unbounded mathematical obligations remove this particular scope limitation but introduce solver incompleteness and specification-strength risks.

## technique 2: prompt-factorized LLM repair

What it is. The study treats prompt content as experimental factors, each binary: bug location indicator, fix comment, and assertion instruction (Section IV-E4, p. 6). Scenario 1 supplies location and fix comment and does not ask to pass assertions; Scenario 2 supplies location only; Scenario 3 supplies neither but asks to pass assertions; Scenario 4 supplies neither and does not ask to pass; Scenario 5 supplies location and asks to pass (Section IV-A, p. 4; Table I, p. 5). The bug location is given as a comment in the specification; fix comments exist in the ARepair benchmark but not in Alloy4Fun (Section V, pp. 9–10).

How to apply it.
1. Prepare the faulty specification and select whether to include a location marker
2. Optionally include a natural-language fix comment
3. Optionally instruct the model to make the assertions pass
4. Send the prompt through the API and save the complete response (the consistency test used a new chat session each time, Section IV-E2, p. 6)
5. Extract the proposed specification and validate it with Alloy Analyzer
6. Repeat under alternative factor combinations and compare repair counts and errors (Sections IV-D and IV-E, p. 6)

Verus form (Inference). Use prompts that include the exact Verus diagnostic, relevant function/lemma text, intended property, and a precise edit location. Test variants with and without a suggested fix, but always run Verus and independent regression tests. Prompt factors should be logged as metadata so repair rates are not confused with model changes.

Evidence. The study reports that “Specific instruction on how to fix the bug as part of the prompt has the most significant impact on ChatGPT’s performance.” (Observation 4, p. 10). Scenario 4, “which has the least amount of guidance provided”, performed “the worst compared to all other Repair Scenarios” (Section V, RQ4, p. 9; Table II: 151 repairs against 329 to 517 for the other scenarios). On the assertion instruction the authors “observed no significant impact of requiring to pass assertions in the prompt” (p. 10). Inference: the fix-comment and bug-location effects are not isolated, because fix comments are present only in the ARepair benchmark and the authors attribute ChatGPT’s lower Alloy4Fun results to the missing guidance (p. 10); the evidence is an association within these benchmarks, and benchmark differences are a possible confound.

Limits. The paper used gpt-3.5-turbo, the default temperature after exploring values from 0.05 to 1 in increments of 0.05 on benchmark samples, and approximately 10,000 requests (Section IV-D, p. 6). Inference: results may change with newer models, temperatures, context windows, or conversational feedback (the paper itself notes conversational use as an untested possibility, Section VII, p. 10).

## technique 3: repeated-run consistency testing

What it is. To measure nondeterminism, the authors sent the exact same prompt ten times for each of ten faulty specifications (which included a bug location indicator), each time in a new chat session with no context, then measured BLEU, ROUGE-L, METEOR, and BERT-based semantic similarity (Section IV-E2, p. 6; Section V, p. 8). The experiment ran twice: once asking ChatGPT to satisfy the assertions (“Consider the following Alloy specification. There is a bug in this specification. Fix the bug so that it satisfies the assertions.”) and once without that request (p. 8).

How to apply it.
1. Select a fixed set of faulty specifications and a fixed prompt
2. Run the repair request repeatedly in independent sessions
3. Compute text and semantic similarity across outputs
4. Verify every output with the formal analyzer (stated in Section IV-E2, p. 6; I found no reported results of this verification in Section V)
5. Compare the conditions statistically; the paper compares “instructed” against “not instructed” scores for the same prompt with Welch’s t-test and a Bonferroni-adjusted p-value of 0.005 (Section V, p. 8)

Evidence. With assertion instruction, the ten-prompt average was BLEU 0.765, ROUGE-L 0.378, METEOR 0.244, and BERTSim 0.764; without it, averages were 0.033, 0.0562, 0.202, and 0.402 (Table III, p. 7). Each cell is the average similarity among the ten generated repairs of one prompt; the averages are over ten prompts. The authors report that the analysis “revealed significant differences between all pairs of scores for the same prompt (Welch’s t-test, p-val<6.660e-05)” (p. 8), then conclude: “ChatGPT shows inconsistency by generating different repairs for the same input on different executions.” (Observation 2, p. 8).

Verus form (Inference). Run each proposed Verus repair multiple times under fixed model and repository state, then cluster by normalized diff and verify every member. A single successful run is insufficient evidence of reproducibility.

## technique 4: typed and semantic error taxonomy

What it is. Two authors independently checked and categorized all of the mistakes by open coding, then reached consensus by negotiated agreement. They analyzed 6,559 mistakes in total (Section IV-E3, p. 6). Categories are incorrect use of operator, incorrect type (described as unexpected tokens such as “{” and “|” that break the Alloy grammar), misuse of higher-order logic (a single case, where higher-order quantification could not be skolemized), mismatch in relational arity (illegal relational join), and hallucination (a variable referenced in a predicate or fact but never declared) (Section V, pp. 8–9).

Evidence. Table IV (p. 9) uses 1,974 as denominator for each scenario row. Wrong-type errors were 450/1974 (23%), 246/1974 (12%), 424/1974 (21%), 1125/1974 (57%), and 637/1974 (32%) for Scenarios 1–5 respectively; the displayed percentages are rounded. Observation 3 (p. 9): “ChatGPT makes different types of mistakes with Incorrect type being the most frequent.” The paper reports Cohen’s kappa 0.95 for its manual labeling (Section VII, p. 10). Inference: the Table IV counts sum to 6,554 (1,287, 914, 1,199, 1,657 and 1,497 for Scenarios 1–5), not the stated 6,559, and the paper does not say whether one specification can contribute several mistakes, so the rows should not be read as mutually exclusive rates.

Verus form (Inference). Build a validator that classifies failed agent patches into parser/type errors, unsupported proof constructs, failed assertions, timeout, and specification weakening. Store the original diagnostic and patch so categories remain auditable. Verus’s Rust type checker can catch some errors before SMT verification.

Limits. Categories are manual and may carry labeling bias; the authors used independent labeling by two authors (Section VII, p. 10). Generalization beyond the two Alloy benchmark suites is explicitly limited (Section VII, p. 10).

## proved, trusted, and product threat
The paper measures repair outcomes, similarity, and error categories. Inference: it does not establish semantic correctness beyond Alloy Analyzer checks at bounded scopes and the benchmark ground-truth specifications. Inference: the trusted components are the Alloy Analyzer/SAT backend, the benchmark assertions and correct versions as oracles, the model/API behavior, and the authors’ manual labels. The authors recommend human validation: “incorporating a human-in-the-loop validation step in the repair process with ChatGPT may be able to enhance the reliability of the repaired specifications.” (Section VI, p. 10).

Inference: Threat to a product that lets agents write verified Rust is high if LLM patches are accepted from text alone: this study reports frequent wrong types, operators, arities, hallucinated names, and nondeterministic outputs. Threat is lower when every candidate is checked by Verus, strengthened by regression tests, and reviewed for weakened specifications. VL should not redo Alloy APR baselines; it should adapt the counterexample/diagnostic loop and measure Verus-specific repair soundness.

## techniques for the catalog
- analyzer-oracle repair loop: generate edits, rerun the formal checker, and retain only candidates that satisfy the assertion oracle
- prompt-factorized repair: vary bug locations, fix hints, and assertion instructions as explicit repair factors
- repeated-run consistency testing: repeat identical prompts in fresh sessions, compare outputs, and verify every candidate
- typed repair-error taxonomy: classify wrong operators, types, arities, unsupported logic, and hallucinated identifiers from verifier failures
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "We decided to use Welch’s t-test because it does not assume equal variance between groups but only assumes normality of the data."): read the whole paper text (and Table II in the PDF) and checked every quotation, number (Tables I to IV, 517/1974, 497/1936, 29/38, 6,559, kappa 0.95, temperature range, 10,000 requests), section and page reference, and technique step. Changed: page and section references (IV-C is p. 5; the consistency method is IV-E2 on p. 6 and its results are on p. 8; related work is Section III-A); added the Table II baseline totals; stated that the paper’s ChatGPT pipeline is one-shot and does not feed counterexamples to the model, and marked steps 3 and 4 of technique 1 as Inference; replaced an unsupported claim that Scenario 4 was worst across all reported comparisons with the paper’s wording and added the no-significant-impact finding on assertion instruction; flagged the fix-comment/benchmark confound as Inference; corrected the Welch test description; replaced the unsupported “must not be summed” remark with the observation that Table IV sums to 6,554, not 6,559; marked the trusted-components list as Inference. Link kept from the fetch record (the paper text contains no DOI or arXiv id). Not checked: the cited related work, the replication package, Figure 2 and Figure 3 contents, and the Verus-form suggestions (my own inferences).
