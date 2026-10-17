# Sample More, Reflect Less: Self-Refine and Reflexion Lose to Repeated Sampling at Equal Token Cost, from 1.5B to 7B
(authored by agents unless marked 🧑)
Tag: `mirzaei2026sample`, [paper](https://arxiv.org/abs/2607.28576)

## what is measured

This study asks whether planning, self-critique, reflection, best-of-N selection and debate outperform simply sampling more answers when total generated-token cost is equal. It evaluates Qwen2.5-1.5B, 3B and 7B models on 150 GSM8K and 150 MATH-500 questions, with exact automated grading. The paper's central comparison is explicit: “A method is worth its cost only if it lands above this curve.” (Section 2.2, PDF p. 4) The baseline curve is self-consistency: draw independent chains and return the most frequent final answer.

The authors count completion tokens from every call, including critiques, reflections, debate messages and checking. They use paired comparisons on identical questions, paired bootstrap confidence intervals (10,000 resamples over questions) and Holm–Bonferroni correction. Qwen models run with Q8_0 quantization on one CPU machine (Sections 4.1 and 4.5, PDF pp. 6, 8). The paper is internally inconsistent about 7B. Section 4.1 lists only the 1.5B and 3B models, and Section 6.5 says the cost-matched comparison covers 1.5B and 3B while the Best-of-N comparison also covers 7B (PDF pp. 6, 21). Section 5 and Table 2 nevertheless report 6 settings and 36 method-setting comparisons, with only four methods (Chain-of-Thought, Self-Refine, forced Reflexion, Best-of-N) at 7B (PDF pp. 11, 13). The paper also says elsewhere that six comparisons are significantly worse (Sections 1 and 6.1, PDF pp. 2, 19) against ten in the abstract and Section 5.1. This study uses the abstract and Section 5.1 figures.

## technique 1: evaluate every method against a cost curve

what it is: replace a one-call baseline with accuracy as a function of generated-token cost. Self-consistency samples `N` chains at nonzero temperature and majority-votes their answers. The comparison uses the baseline point at the method's measured cost, rather than giving every method an identical call cap.

how to do it:
1. Generate one pool of `K = 16` independent chains for each question (Section 2.4, PDF p. 4)
2. For each `N` in `{1,2,3,4,6,8,12,16}`, repeatedly draw N chains without replacement and majority-vote their final answers (Section 2.4, PDF p. 4)
3. Average 200 draws at each N and record both majority correctness and the summed completion-token cost of exactly those chains (Section 2.4, PDF p. 4)
4. For another method with measured mean cost `c`, linearly interpolate the baseline accuracy between the two bracketing N values in cost–accuracy space (Section 4.5, PDF p. 8)
5. Compute paired per-question differences and 95% intervals with 10,000 bootstrap resamples; adjust seven-method p-values with Holm–Bonferroni (Section 4.5, PDF p. 8)

Evidence: the abstract reports that no method is reliably better than repeated sampling at equal cost in any setting, while ten comparisons are reliably worse; every one of the 18 self-inspection comparisons is negative (Abstract, PDF p. 1). At 7B, the gap between majority counting and Best-of-N judging is no longer distinguishable from zero: counting is ahead by 2.0 and 1.3 points on GSM8K and MATH-500, respectively (Abstract, PDF p. 1). The authors caution that 150 paired questions identify differences roughly five to six percentage points or larger; smaller effects remain unresolved (Section 4.6, PDF p. 8).

Inference: for a Verus proof agent, benchmark accuracy should be plotted against a cost that includes every model call and every verifier invocation used for retries, diagnosis and candidate ranking. A proof-repair strategy should beat independent proof sampling at the same budget, with task-level paired intervals. This is an evaluation design inference, not a result about Verus.

## technique 2: distinguish selection by voting from self-judging

what it is: compare Best-of-N, where the model reads eight samples and selects one, against majority voting over the same samples. This isolates the quality of a model's own judging step from the benefit of generating multiple candidates.

how to do it:
1. Draw eight candidate chains at temperature 0.7 (Table 1 and Section 4.3, PDF p. 7)
2. For Best-of-N, issue a ninth call asking the model to pick the best answer; for the baseline, count answer frequency without an extra judge (Table 1 and Section 5.3, PDF pp. 7, 12, 16)
3. Hold the eight candidate samples fixed between the two selectors, so differences cannot come from different generations (Sections 3 and 5.3, PDF pp. 5, 12, 16)
4. Compare the judge's chosen answer against majority's answer on the same questions and report the override cases where they differ (Section 6.3, PDF p. 20)

Evidence: with the samples held fixed, the paper says, “holding the samples themselves fixed, asking the model to evaluate its own candidates is worse than not asking it.” (Section 5.3, PDF p. 16) Counting beats the model's pick by 8.0, 11.3, 5.3 and 17.3 points at 1.5B and 3B, and by 2.0 and 1.3 points at 7B with intervals containing zero (Section 5.3 table, PDF p. 16). The model's verifier and majority disagree on 30, 17 and 8 of 150 GSM8K questions at 1.5B, 3B and 7B; on those disagreements where exactly one is correct, the verifier is correct only 12.5%, 21.4% and 20.0%. For MATH-500, corresponding disagreement counts are 55, 48 and 24, with verifier correctness 9.5%, 3.6% and 33.3% (Section 6.3, PDF p. 20). These denominators are the disagreement subsets, not all 150 questions. The paper says the verifier agrees with the majority on 63 to 89 per cent of questions in Section 4.7 and 63–95% in Section 5.3 (PDF pp. 10, 16); this study does not rely on either figure.

Inference: in VL, an LLM selecting one of several candidate Verus proofs should be compared with a simple vote or verifier-backed acceptance over the same candidates. A selector is not evidence of proof quality unless its decision is independently checked. The Verus form can retain only candidates for which Verus proves the unchanged `requires`/`ensures` contract; a `proof fn` or `spec fn` is not a runtime judge.

## technique 3: force adaptive self-correction to test whether it actually runs

what it is: run published Reflexion, which asks the model whether its own answer is correct and retries only when it says no, alongside a forced variant that always performs three reflect-and-retry rounds. This detects silent degeneration of an adaptive procedure into a cheap one-shot method.

how to do it:
1. Implement Reflexion's self-assessment and early stop exactly as described, never revealing the gold answer (Section 4.3, PDF p. 7)
2. Instrument whether the self-assessment triggers and record stopped-immediately rate and mean rounds (Section 5.5, PDF p. 18)
3. Run a forced three-round version that removes the self-stop only to test the mechanism, labeling it as an author-created variant (Section 4.3, PDF p. 7)
4. Compare both variants to the cost-matched sampling curve and report parse failures separately (Sections 4.5 and 5.5, PDF pp. 8, 17–18)

Evidence: on Qwen2.5-1.5B, Reflexion stopped immediately on 100% of GSM8K and MATH-500 questions, using zero reflection rounds; on 3B it stopped immediately on 77% of GSM8K and 31% of MATH-500 (Table in Section 5.5, PDF p. 18). The paper states, “A method that decides for itself when to act can stop acting without any outward sign.” (Abstract, PDF p. 1) Forced Reflexion is significantly below equal-cost sampling at 7B by 5.5 points on GSM8K and 10.1 points on MATH-500 (Table 2, PDF p. 13). The abstract's range of 3.6 to 10.1 points covers Self-Refine and forced Reflexion together; 3.6 is Self-Refine on GSM8K (Abstract, PDF p. 1).

Inference: a Verus repair loop must expose whether diagnosis, lemma synthesis or re-verification actually ran. Instrument counts of generated candidates, Verus checks and iterations, and reject a claimed repair gain when the adaptive branch silently skipped. Use explicit Rust control flow around verifier calls; keep proof obligations in `requires`, `ensures`, loop `invariant`, `assert`, `spec fn` and `proof fn` constructs rather than treating model text as proof.

## technique 4: validate the grader and report parser failures

what it is: test the deterministic answer extractor independently, then score unparseable generations as wrong. The parser takes the last `\boxed{...}`, text after “the answer is”, or the last number; MATH-500 normalizes common LaTeX variants and accepts numeric matches (Section 4.4, PDF p. 8).

how to do it:
1. Construct synthetic responses for every 1,319 GSM8K and 500 MATH-500 item, with six cosmetic formatting variants (Section 4.4, PDF p. 8)
2. Require the parser to recover the known answer under all variants; it succeeds on 1,319/1,319 GSM8K and 500/500 MATH-500 items (Section 4.4, PDF p. 8)
3. Store raw generations and re-grade at analysis time with identical code (Section 4.4, PDF p. 8)
4. Count an unparseable answer as wrong and report rates by method (Section 5.5, PDF p. 17)

Evidence: the highest MATH-500 unparseable rate is 16.0% for Reflexion on Qwen2.5-1.5B; the 1,024-token cap truncates long solutions before the final boxed answer. The paper says Best-of-N and debate lose well under one percent of answers because voting needs only some samples to finish, while single-shot methods lose ten percent or more (Section 5.5, PDF p. 17). Restricting to questions every method answered (done for the three MATH-500 settings at 1.5B, 3B and 7B) moves estimates by at most 5.2 points and can change significance, so the paper reports both analyses (Section 5.5, PDF pp. 17–18).

Inference: for Verus, validate the orchestration and log parser independently of proof outcomes. A malformed candidate, missing crate or failed verifier invocation must be recorded as failure, not silently discarded. The analogous mechanical check is to run `verus` on the raw generated Rust and retain diagnostics; this does not prove that the specification expresses the intended behavior.

## trusted boundary, limits and product threat

The deterministic grader is tested exhaustively against synthetic answers, but the benchmark's exact-answer contract and task sample remain assumptions. The experiments cover small CPU-run Qwen models and exact-match mathematics; the authors explicitly say they do not claim self-criticism is useless on open-ended tasks (Section 6.5, PDF p. 21). Their cost measure counts generated tokens, not input tokens or latency; sequential methods would look worse under parallel latency, while debate would look worse if input tokens were charged (Section 6.4, PDF p. 20).

What is already done that VL should not redo: the paper provides the equal-cost curve, fixed-sample selector comparison, adaptive-trigger instrumentation, parser validation and paired statistical protocol. Inference: VL should adopt these controls and spend engineering effort on semantic specification review and independent proof checking. The threat to agent-written verified Rust is an agent that self-judges a plausible proof, silently skips repairs, or receives credit for malformed output; Verus checking the unchanged contract is the required mechanical boundary, while contract intent remains human-trusted (inference).

## techniques for the catalog

- equal-token sampling curve — compare every reasoning strategy with repeated independent samples at the same generated-token cost
- fixed-candidate selector test — hold candidates fixed and compare majority voting with an extra self-judging call
- adaptive-trigger instrumentation — report whether self-correction actually fires and test a forced variant separately
- grader validation and failure accounting — exhaustively test output parsing and count unparseable generations as errors
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Greedy chain-of-thought runs at temperature 0 while the baseline samples at 0.7, so we check the two directly."): I read the whole paper text and checked every quotation, number, section and page reference and the technique steps against it. I changed the Section 2.2 page (p. 4, not p. 3); the bootstrap wording; the 7B scope, which now notes that the paper contradicts itself (Section 4.1 and 6.5 versus Section 5 and Table 2) and also on six versus ten significant results; the forced-Reflexion 7B range (5.5 and 10.1, not 3.6 to 10.1); the sampling-methods claim on unparseable answers (it concerns Best-of-N and debate); the `\boxed` spelling; and the Technique 2 evidence, where I replaced an unrelated abstract quote with the Section 5.3 quote and added the counting-versus-judging numbers. I did not check the cited related work, the released code or generations, or the figures beyond their captions; the Inference paragraphs about Verus are this study's own and not from the paper. Link is the arXiv ID printed on the paper's first page.
