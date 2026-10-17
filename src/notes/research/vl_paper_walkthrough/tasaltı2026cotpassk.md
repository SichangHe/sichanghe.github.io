# Does CoT-Pass@k Really Check the CoT? A Multilingual Mathematical Audit
(authored by agents unless marked 🧑)
Tag: `tasaltı2026cotpassk`, [paper](https://arxiv.org/abs/2609.32622)

## question and metric
CoT-Pass@k modifies Pass@k. Pass@k counts a sampled solution when its final answer is correct. CoT-Pass@k counts it only when the final answer is correct and an LLM judge approves the reasoning chain. The paper audits whether the judge actually detects damaged reasoning under the same protocol used by the metric. It uses five mathematical benchmarks in English, Turkish, and Portuguese, including native Turkish and Portuguese sets.

The central assumption is explicit: “Its value rests entirely on one assumption: that the judge catches flawed reasoning.” (Abstract, p. 1) The paper reports that all three judges accept corrupted chains almost as often as clean chains, while reacting strongly to wrong final answers. It concludes: “Our study shows that chain–answer agreement dominates the two larger judges’ verdicts and that all three fail to reliably detect the tested reasoning errors.” (Abstract, p. 1)

## technique 1: construct a multilingual, controlled audit suite

When to use it: use this design when evaluating a judge or a metric that claims to measure reasoning across languages. Keep the underlying questions fixed while varying language and benchmark origin, and manually audit translations so that an apparent judge failure is not a translation error.

Step by step:

1. Select the English AIME 2026 set of 30 integer-answer problems (Section 3, p. 3)
2. Machine-translate those same 30 problems into Portuguese and Turkish, then have native speakers manually audit them; six Portuguese and two Turkish native speakers performed this audit, one of the Turkish two an author (Section 3, p. 3)
3. Add 32 first-stage problems from the 2026 Turkish TÜBİTAK olympiad and 166 Portuguese multiple-choice mathematics problems from PHEB, converting the latter to open-ended form; two further graduate students, native speakers of Portuguese and independent of the translation audit, checked that each kept question has a single ground-truth answer and can be posed without its options (Section 3, p. 3)
4. Run solvers with 64 generations per question, or 16 on the Portuguese exams, at temperature 0.6, top-p 0.95, and a 16,384-token generation budget unless an experiment changes it (Section 4.1, p. 3)
5. Prompt each solver in the benchmark language, but record that chains may switch to English or a mixture; use the same English judge prompt plus two lines naming the problem language and requiring mathematical scoring (Section 4.1, p. 4; prompt in Appendix A.1)

Verus form: Inference: this is a benchmark design rather than a Verus proof. For VeruLaw, keep a fixed set of Rust/Verus specifications and vary the natural-language language, model, and generation mode while preserving the executable property checks. Inference: use a reference implementation and a verifier-checked oracle so that a generated answer's correctness is known independently of an LLM judge.

Evidence and limits: the suite has 30 English AIME questions, 30 each in translated Turkish and Portuguese, 32 Turkish olympiad questions, and 166 Portuguese exam questions. The paper excludes Portuguese from some cross-generation comparisons because it has no non-thinking runs and uses `k=16`; it excludes thinking mode from that comparison because Qwen2.5 has no thinking counterpart (Section 4.3, p. 5). Thus denominators differ by analysis and must not be merged.

## technique 2: deterministic error injection with separated failure modes

When to use it: use error injection to test whether a judge reads the reasoning chain rather than simply matching the final answer. Begin with solutions whose answers are correct, apply reproducible string edits, and keep chain corruption separate from answer corruption.

Step by step:

1. From each model×benchmark cell (two solvers, Qwen3.5-4B and Qwen3.5-9B in thinking mode, times five benchmarks), randomly select 72 correctly answered solutions to which all four error types can be applied; this yields 720 originals (Section 4.2, p. 4; Appendix A.2 adds that the originals stopped before the max-token limit and are longer than 600 tokens)
2. Expand each original into five variants: clean control plus one variant for each error type, for 720 × 5 = 3,600 variants (Section 4.2, p. 4)
3. For an intermediate numeric error, replace one number drawn at random from between 40% and 70% of the solution's length, never one that appears in the question or the answer, and leave the final answer correct (Section 4.2, p. 4)
4. For truncation, delete the last 25% of the chain and re-append the boxed final answer on a new line, leaving a visible seam and the answer correct (Section 4.2, p. 4)
5. For a plain final-answer error, replace only the final answer while leaving the chain untouched (Section 4.2, p. 4)
6. For a consistency-preserving final-answer error, replace every occurrence of the correct final-answer value in the chain with the same wrong number, so the chain supports the wrong answer; every wrong number is a near miss (shifted by one or two, two digits transposed, or a single digit changed), and all edits are deterministic string edits (Section 4.2, p. 4)
7. Score every variant with three thinking-mode judges (V4-Flash, Qwen3.6, R1-distill), three judgments each; the majority rule compares approvals against rejections, and a judgment that reaches its max-token limit without a verdict counts as neither (Section 4.1, p. 4; Section 4.2, pp. 4–5)

Verus form: Inference: apply the same idea to verified Rust by mutating proof-relevant code or contracts while preserving a known test answer. For example, alter one arithmetic expression in a proof function, remove a loop invariant clause, truncate a proof block, or change an `ensures` postcondition while keeping a separate executable oracle. Inference: use deterministic source edits and a trusted parser, then require Verus to recheck; the judge analogue is an LLM reviewing the proof text, which should be measured against the verifier's result rather than trusted.

Evidence: the injection design keeps the correct verdict known by construction and avoids using another model to create corruptions (Limitations, p. 10). Its limitation is realism: a string edit may look unlike a natural human mistake. The authors argue that the consistent final-answer error corrupts strictly more of the chain than the plain one yet is accepted more often by V4-Flash and Qwen3.6, so the edits cannot be dismissed as mere slips, and that where the edits are too mild, "the bias understates rather than overstates how little the judges assess" (Limitations, p. 10).

## technique 3: compare judge acceptance under each corruption

When to use it: use acceptance deltas as a direct diagnostic. Inference: a sound chain judge should reject intermediate numeric errors while accepting the clean control, and a judge that follows the final answer should react mainly to final-answer errors.

The reported error-injection panel uses 720 original solutions, 3,600 variants, and three judgments per variant. Intermediate numeric corruption stays within four percentage points of the clean control for all five benchmarks under every judge. A wrong final answer costs V4-Flash and Qwen3.6 47 to 98 points of acceptance across benchmarks and R1-distill 15 to 27 (Section 5.1, p. 6). Pooled over the five benchmarks, the plain final-answer error cuts acceptance to 18% (V4-Flash), 34% (Qwen3.6) and 71% (R1-distill), so the metric's own judge leaves most wrong answers accepted (Section 5.1, p. 6). For consistent wrong answers, acceptance rises to 25% for V4-Flash and 54% for Qwen3.6 despite greater chain corruption; R1-distill does not show the rise (62% against 71% for the plain ones) (Section 5.1, p. 6). The truncation error costs 8, 6 and 3 points (Section 5.1, p. 6). These are percentage-point changes in acceptance over the injected variants, not solver accuracy.

The paper's mechanism is that chain–answer agreement dominates. It states: “Acceptance barely moves when we corrupt the chain under any judge.” (Section 1, p. 1) The paper reasons that a judge that verified the mathematics would accept the consistent wrong chain less often than the plain wrong final answer, since the wrong value now runs throughout the chain; V4-Flash and Qwen3.6 do the opposite (Section 5.1, p. 6). Inference: a judge that checks the mathematics should also reject a chain whose intermediate number is wrong even when the final answer remains correct; the paper finds all three judges stay at their clean acceptance rates there (93%, 98% and 92% against 93%, 98% and 90%, Section 5.1, p. 5).

Verus form: Inference: perform the same diagnostic by presenting a reviewer model with proof scripts whose final theorem statement remains unchanged while an intermediate lemma or invariant is invalidated. Compare acceptance against Verus's compile/proof result. Inference: the acceptance delta should be reported by mutation type, model, proof size, and language; a judge passing unchanged text after a semantic mutation is evidence of a weak reviewer, not evidence of proof correctness.

## technique 4: test collapse of CoT-Pass@k onto Pass@k

When to use it: report both metrics and their difference when a judge is intended to add evidence about reasoning. The paper writes the difference `Pass@k − CoT-Pass@k` and notes that at `k = n` it is the share of questions with a correct solution but no approved one (Section 4.1, p. 4).

Step by step:

1. Compute standard unbiased Pass@k from `n` sampled generations with `c` correct answers (Section 4.1, p. 4)
2. Replace `c` by the number of generations that are both correct and judge-approved to compute CoT-Pass@k (Section 4.1, p. 4)
3. Report the difference for each solver, benchmark, and `k`, with bootstrap intervals over questions (Section 5.2, p. 7; Section 4.3, p. 5)
4. Repeat for earlier Qwen2.5 and current Qwen3.5/Gemma-4 generations, keeping judge and budget visible (Section 4.3, p. 5; Section 5.2, p. 7)
5. Repeat under different generation modes and token budgets; record judgments that stop at the max-token limit (Section 4.4, p. 5; Section 5.3, pp. 8–9)

Results: averaged over four benchmarks, the difference is 19.7 points (95% CI [16.4, 23.0]) for the earlier generation and 4.1 points (95% CI [2.7, 5.5]) for the current generation at `k=64` under the anchor judge Qwen3.6 with a 16k generation budget, over the four 64-sample benchmarks (Section 5.2, p. 7; Section 4.3, p. 5). Qwen3.5-9B-Base is exactly zero on all four benchmarks; no Qwen3.5 model exceeds 10 points anywhere, the Gemma-4 models reach 18.8 only on the Turkish olympiad, while earlier Qwen2.5 differences range from 6.7–20 points on AIME and 34–47 on the Turkish olympiad (Section 5.2, p. 7). At an identical Pass@64 of 59.4 on the Turkish olympiad, the two earlier solvers lose 43.8 and 46.9 points while the current one loses 18.8 (Section 5.2, p. 7). The paper adds that the comparison is observational, between model families rather than a controlled intervention (Section 5.2, p. 8).

Verus form: Inference: report a proof-completion metric beside a mutation-sensitive proof-review metric, and publish their difference. A Verus proof result is checker-based and should be the primary correctness signal; an LLM judge can only be an auxiliary measure of readability or likely missing assumptions. Inference: if review filtering collapses to proof pass rates, it adds little evidence about reasoning quality.

## technique 5: audit token-budget and timeout confounds

The paper varies budgets because both solver and judge can stop at a maximum token limit. Under a shared 16k budget, on the four competition benchmarks, Gemma4 stops on 33 to 54% of its judgments of the Qwen3.5 solutions but only 2 to 14% of the Gemma-4 solutions; Qwen3.6 stays at or below 18% (Section 5.3, p. 8). In thinking mode, Gemma4 reports 5.7 points against 1.4 for Qwen3.6, and counting Gemma4's stopped judgments as approvals removes 92.7% of its 5.7, an upper bound on the budget's share, against 47.9% in non-thinking mode, where the two judges report 5.9 and 5.8 (Section 5.3, p. 8). Raising generation budgets reduces solver stops from 84–90% to 9–18% on English AIME and raises Pass@1 from 10.5 and 16.2 to 75.4 and 84.5 for the two compared solvers; Pass@64 − CoT-Pass@64 is exactly zero in all sixteen benchmark×solver×budget cells, under the anchor judge alone (Section 5.3, p. 8; Appendix D.3). These denominators are cells and benchmarks specified by the paper, not a universal accuracy estimate.

Verus form: Inference: report solver timeouts, verifier timeouts, proof retries, and model context limits separately. Treat a timeout as an explicit third outcome, not as rejection or approval, and recompute metrics under multiple budgets.

## what the audit proves, trusts, and implies for VL

The audit establishes that, in its tested settings, three LLM judges do not reliably detect the injected reasoning errors and that CoT-Pass@k often adds little beyond Pass@k for current solvers. It does not establish that all possible judges fail, that deterministic edits represent every real reasoning error, or that non-English mathematics is intrinsically easier or harder. The paper notes that it read the original judge's behaviour "off its acceptance rates and did not audit the reasoning behind its verdicts", and that the residual Turkish-olympiad difference is "observed, not explained" (Limitations, p. 10). It also notes that the injected solutions come from two Qwen3.5 thinking-mode solvers, that its current-generation solvers reach 9B parameters, and that it claims nothing beyond three languages in mathematics (Limitations, p. 10).

Inference: the paper's conclusions rest on trusting the benchmark answers, translation audits, deterministic corruption scripts, judge prompts, model implementations, majority rule, and its reading of acceptance as detection. Inference: for VeruLaw, this paper is a warning against using an LLM to certify a proof or contract merely because it agrees with a correct final output. The decisive independent checker should be Verus and executable tests; LLM review should be mutation-tested with proof-preserving and proof-breaking edits. Inference: the threat to agent-written verified Rust is substantial when product evaluation rewards a plausible proof narrative or a final theorem while omitting intermediate invariants, external assumptions, or failure transitions.

Inference: the paper already provides controlled corruption, judge-free comparison, multilingual replication, and budget sensitivity analysis, so VL should not redo these as generic metric ideas; a useful adaptation would construct Verus-specific proof mutations and measure whether LLM reviewers detect them while Verus independently determines validity.

## techniques for the catalog

- deterministic chain corruption: mutate reasoning and final answers separately with reproducible string edits
- acceptance-delta audit: compare judge approval of clean, chain-corrupted, and answer-corrupted variants
- metric collapse check: report Pass@k beside CoT-Pass@k and their difference per benchmark and solver
- budget and timeout audit: vary token limits and keep max-token judgments as a separate outcome
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The anchor judge still rejects some solutions, but no question ever loses all of its correct ones."): read the whole paper text (pages 1–10 and appendices A–D) and the whole study; checked both quotations and the quote of the introduction against the paper word for word, the benchmark sizes, the error-injection steps, the acceptance rates, the cross-generation numbers, the token-budget numbers, and the section and page references (PDF pages; Section 4.1 spans pp. 3–4, 4.2 pp. 4–5, 5.1 pp. 5–6, 5.2 pp. 6–8, 5.3 pp. 8–9); changed wrong or missing page and section references, the claim that the difference is defined "at the chosen k" (the paper says at k = n), the misattributed abstract quote (it is from Section 1), the Gemma4 92.7% figure (thinking mode only), the statement that the paper did not inspect the judge's reasoning (it concerns the original judge), the unsupported statement of which parts the paper "trusts", and added the omitted R1-distill results and several omitted design details, with unsupported "should" claims marked "Inference:"; did not check the figures, the tables or the appendix numbers beyond those quoted, the cited literature, the Verus-form suggestions (the study's own inferences), or the linked repository. Link kept from the arXiv identifier printed in the paper (arXiv:2609.32622v1).
