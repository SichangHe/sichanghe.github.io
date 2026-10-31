# When Does a Second Model Help? Cross-Model Review in LLM Verification
(authored by agents unless marked 🧑)
Tag: `song2026second`, [paper](https://arxiv.org/abs/2610.01471)

## scope and result

The paper studies whether a reviewer from another model detects different planted defects from a same-model reviewer. Its controlled experiment has 30 artifacts, 150 planted errors, 10 conditions, and 900 review sessions (abstract; §4.1, p. 5). The generator was Claude Opus 4.6; reviewers were Gemini 2.5 Flash, Gemini 2.5 Pro, and GPT-5.4 (§4.1, p. 4–5). The authors explicitly warn that reviewer capability and model identity are confounded: “Using a single generator ensures that all reviewer conditions evaluate identical artifacts, removing generator variation; it does not separate reviewer independence from other reviewer characteristics such as capability.” (§4.1, p. 4)

The headline result is conditional. The best single cross-model condition, XMR-GPT, has F1 32.3% on 86 analysed sessions, while fresh-session same-model review (CCR) has F1 28.6% on 90 sessions; the adjusted Wilcoxon comparison is 1.00 and run-1 paired t-test is .478 (Table 2, p. 6). Thus the paper does not establish a significant individual advantage. One CCR plus one restricted GPT cross-model review matches 85/150 errors (56.7%) versus 64/150 (42.7%) for two CCR reviews, with adjusted p=.006, but on the 29 artifacts without a failed session the mixed pair matches 82/145 errors versus 76/145 for two restricted GPT reviews (gain 4.1 percentage points, 95% CI [−2.1, 10.3]), with adjusted p=.184 (§5.2, p. 6). On the top-tier-versus-CCR F1 comparison the paper says: “without an equivalence test, this is not evidence that the two are equal” (§5.1, p. 6).

## technique 1: model-independence review with a fixed artifact set

What it is. The paper defines four binary independence dimensions: context (C), temporal (T), structural (S), and model (M). Model independence means “the reviewer is a different model, typically from a different developer” (§3.1, p. 4). Information restriction (R) is a modifier in which the reviewer receives only the artifact, not the original prompt or requirements (§3.1, p. 4).

When to use it. Use this design when the question is whether two reviewer models expose complementary blind spots. Keep the generated artifact and injected defect set fixed so a reviewer comparison is not also a generator comparison. The paper’s artifacts are 10 code modules, 10 technical tutorials, and 10 presentation scripts; each has five planted defects, one each of FACT, CONS, CTXT, RCVR, and MISS (§4.1, p. 4). The ground truth is exactly 150 planted errors, but it is not independently annotated (Appendix A, p. 10).

How to do it.

1. Generate or select a fixed artifact corpus and inject known defects. The paper injects “exactly five errors” per artifact, one per type, producing 150 errors (Appendix A, p. 10).
2. Run same-model baselines: same-session self-review (SR), repeated review (SR2), sub-agent review (SA), and fresh-session review (CCR) (Table 1, p. 5).
3. Run cross-model review (XMR) in three capability tiers: Gemini Flash, Gemini Pro, and GPT-5.4. For each tier run unrestricted and restricted variants (Table 1, p. 5).
4. Give each reviewer the artifact plus requirements, or artifact only for R. The paper says: “Each session proceeds identically: the reviewer receives the artifact (and requirements, unless information-restricted) and produces a structured list of findings (location, description, severity, error type).” (§4.1, p. 5)
5. Record model, duration, timestamp, findings, and failed calls; the paper's cross-model records carry the reviewer model identifier, call duration, and a per-session timestamp (§4.1, p. 5). The paper excludes failed calls from its primary analysis (it says a failed call is not a review) and reports a failures-scored-as-zero version in Appendix D (§4.1, p. 5; Appendix D, p. 11).

Verus form. Inference: apply this as an engineering review protocol around Verus code. Give one reviewer the Rust artifact and its `requires`/`ensures` contracts, and give a second model the artifact without the generation conversation. Ask both to return locations, proof obligation, severity, and error type. The Verus source remains executable Rust plus specifications and proof code; review models do not replace Verus’s solver proof. A model-independence result says only that review findings differ, not that either reviewer established a theorem.

Evidence and limits. The design has 90 sessions per condition (three runs per 30 artifacts), but same-model records were transcribed and lacked raw model output; one SR run (run 3) was excluded because 92% of its finding descriptions appear verbatim inside the script that wrote the files, so the paper cannot confirm they are unedited model output, and 14 cross-model calls failed (§4.1, p. 5). The single generator, one reviewer per tier, unverified baseline transcripts, planted rather than independently annotated ground truth, and Korean-language matching all limit causal interpretation (Limitations, p. 9).

## technique 2: location-and-keyword matching against planted truth

What it is. A finding is matched to at most one ground-truth error using a weighted score. Appendix A specifies +3 for an exact line match, otherwise +1 when a line is within five lines; plus 4 times the fraction of ground-truth keywords found in the finding description; plus 1 for matching error type. A score of at least 2 credits the finding, with each ground-truth error credited at most once per review (Appendix A, p. 10).

How to do it. Build records containing error location, original and injected text, type, severity, description, and correct answer. For every finding, score it against every error, assign it to the highest-scoring error if the threshold is met, and count unmatched findings as false positives. Compute precision and F1 against planted errors only. The paper cautions that “A location match alone (3 points) clears the threshold, so the matcher can credit a finding that does not identify the error.” (Appendix A, p. 10)

Verus form. Inference: use source spans or function names for locations, normalize identifiers and specification keywords, and separately retain the verifier’s actual `ensures` result. A matcher score is test instrumentation, not a Verus proof. Do not treat a model’s finding as verified merely because a line number matches.

Evidence and limits. The matcher is language-sensitive because the ground truth is Korean while many CCR findings are English (Limitations, p. 9). The matcher was not audited by hand, and a pre-existing real defect counts as a false positive under this metric (Appendix A, p. 10). Therefore reported F1 is evidence about this matcher and planted set, not exhaustive correctness.

## technique 3: union coverage and complementary detection

What it is. Compute the set of unique ground-truth errors found by at least one session in each condition. Union recall measures the size of the union; unique-finding rates measure findings in one condition absent from another; Jaccard is intersection divided by union. The paper defines complementary as partially non-overlapping detection, not super-additive coverage (§1, p. 2; §5.2, p. 7).

How to do it. Pair two review calls, count each condition’s matched errors, subtract their intersection, and divide by 150. In run 1, one CCR plus one XMR-GPT-R review gives 56 + 64 − 35 = 85 errors, or 56.7%; two CCR reviews match 64/150, or 42.7% (§5.2, p. 6). The paper gives the gain as 14.0 points, artifact-level bootstrap 95% CI [6.7, 22.0]. Compute Jaccard for CCR and XMR-GPT-R as 35/85 = 41.2% (§5.2, p. 6). Compare against the same number of calls and report confidence intervals and paired tests.

Verus form. Inference: run two independent review passes over the same Verus module and union the distinct proof failures, missing contracts, and semantic counterexamples. Preserve the exact source location and obligation so a human can deduplicate. The union does not compose proofs; only successful Verus verification of the final code establishes the contract.

Evidence and limits. The 56.7% versus 42.7% comparison is retrospective and depends on the matcher; the paper calls it consistent with union superiority only “in the narrow sense that the union covers more than either review alone”, and says it does not claim synergy (§5.2, p. 7). Against two XMR-GPT-R reviews the gain is 4.1 percentage points with 95% CI [−2.1, 10.3] and adjusted p=.184 (§5.2, p. 6).

## technique 4: information restriction

What it is. Remove the generation requirements and provide only the artifact. This tests whether a reviewer assesses intrinsic quality rather than compliance with the original request (§3.1, p. 4).

How to do it. For each reviewer tier, run paired unrestricted and R conditions. The reported F1 changes are GPT 32.3→32.1 (−0.2 points), Gemini Pro 26.8→29.0 (+2.2), and Gemini Flash 24.0→27.0 (+3.0) after exclusions (§5.6, p. 8). Recompute with failures scored as zero; the changes become +0.9, +2.2, and +0.9 (§5.6, p. 8).

Verus form. Inference: ask a review model to inspect Verus code and contracts without the natural-language task specification, then separately run a requirements-aware review. Compare missed invariants, inconsistent contracts, and unsupported assumptions. Keep the requirements for the final human decision because restriction can hide intended behavior.

Evidence and limits. The two sides use different session sets after exclusions, so the changes are untested point estimates (§5.6, p. 8). The paper’s proposed mechanism is explicitly a hypothesis, not a demonstrated cause.

## technique 5: category and error-type stratification

What it is. Report F1 by artifact category and recall by defect type instead of only aggregate F1. Table 3 shows CCR at 40.7% on code and XMR-GPT at 42.1% on documents; Table 4 shows GPT recall of 58% FACT, 53% CONS, 26% CTXT, 34% RCVR, and 21% MISS, versus CCR’s 48%, 37%, 13%, 19%, and 19% (pp. 7–8).

How to do it. Label every planted error and artifact before review, calculate per-session recall within each label, average over analysed sessions, and report denominators and uncertainty. Interpret category reversals descriptively; the paper says these estimates have no uncertainty intervals and were not tested for significance (§5.4–5.5, pp. 7–8).

Verus form. Inference: classify obligations as functional, safety, concurrency, API-contract, or recovery obligations and report which reviewer finds which class. This helps choose review allocation but does not alter Verus’s proof semantics.

## what is proved, trusted, and left unresolved

The paper measures reviewer findings against planted defects; it does not prove that a reviewer is independent, that errors are exhaustive, or that a model’s finding is correct. It trusts the injected ground-truth records, the automated matcher, model/API behavior, and the transcribed same-model logs. The paper itself reports that the artifacts’ generating model is not recorded in the files and that endpoint identifiers are requested parameters rather than confirmed checkpoints (§4.1, p. 4). Inference: for agent-written verified Rust, the threat is substantial at the review layer: even the union matches only 56.7% of planted errors under this matcher, while a keyword-based, unvalidated classification labels 187 of 1,995 (9.4%) cross-model false positives as model bias, most often flagging generator-specific features or tools as non-existent (§5.8, p. 8). This does not weaken a successful Verus proof, but it threatens specification review, defect triage, and confidence that generated proofs address the intended behavior.

The paper’s practical guidance is tentative: combine same-model and cross-model review for coverage, use a top-tier cross-model reviewer for a single call, favor same-model review for code-heavy artifacts (40.7% versus 37.2% code F1), and cross-model review for documents (42.1% versus 24.5%); avoid lightweight cross-model review (§6.2, p. 9). These recommendations are limited to this sample and early-2026 models.

## techniques for the catalog

- four-dimensional independence taxonomy — separate context, temporal, structural, and model independence, with information restriction as a modifier
- fixed-artifact cross-model review — compare reviewer models on identical artifacts and planted defects
- weighted finding matcher — score location, keyword overlap, and error type, then enforce one-to-one assignment
- union and Jaccard analysis — measure complementary detections and matched-call coverage
- information-restricted review — remove requirements to test intrinsic-quality checking
- stratified verification review — report findings by artifact category and error type
