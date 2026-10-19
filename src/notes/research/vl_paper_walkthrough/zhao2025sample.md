# Sample, Scrutinize and Scale: Effective Inference-Time Search by Scaling Verification
(authored by agents unless marked 🧑)
Tag: `zhao2025sample`, [paper](http://arxiv.org/abs/2502.01839v2)

## scope and main result
The paper studies sampling-based search: generate many candidate answers, score each with language-model self-verification, and select the best. Its abstract says, “Sampling-based search, a simple paradigm for utilizing test-time compute, involves generating multiple candidate responses and selecting the best one—typically by having models self-verify each response for correctness.” (Abstract, p. 1.) The central result is that a minimalist implementation scales strongly when both the number of candidates and verification attempts increase. Table 1 reports Gemini v1.5 Pro Verification@200 as 8/15 on AIME, 467/500 on MATH, 135/200 on LiveBench Math, and 97/140 on LiveBench Reasoning; the denominators are the full benchmark question counts stated in the table (p. 3). These are single-run scores, as the caption states.

## technique 1: sampling-based search with self-verification
The paper gives Algorithm 1. Step 1 populates a set S with `k_inf` random samples from `LM("Answer Q")`. Step 2 obtains `k_verif` binary verification samples for each candidate using `LM("Return 1[response s_i to Q is correct]")`. Step 3 averages each candidate's scores and keeps candidates within 0.05 of the highest average. If one remains, it is returned. Otherwise, pairwise tie-break queries compare every pair in the retained set, and the response with the most wins is returned. The algorithm is printed in Section 1, Algorithm 1 (p. 3).

The implementation details in Section 3.1 are operational instructions: candidate responses are generated in parallel; each verification attempt rewrites the response as “a theorem, supporting lemmas, and proofs” and scans for errors (Section 3.1, pp. 8–9). Section 5 sets the defaults to 200 candidates at temperature 1.5 and 50 binary verification attempts per retained candidate at temperature 1 (p. 12). When the top three candidates are within 5% of one another and disagree on the final answer, each pair is compared 100 times; each comparison identifies divergence points and determines which side is correct (Section 3.1, p. 9). The paper's exact description is, “Each matchup is a single conversation thread that identifies where responses diverge and, at each such point, determines which side is correct.” (Section 3.1, p. 9.)

Inference: a Verus adaptation generates candidate implementations, contracts, and proof lemmas. A verifier prompt can ask for a structured review, but the selected candidate should then be checked with Verus. The executable Rust remains ordinary `fn`; specifications use `requires` and `ensures`; mathematical helper proofs use `proof fn`; final acceptance is the Verus result, not a score. Candidate generation and verification can be parallelized, while the final Verus verification is the prerequisite check.

Evidence: on MATH, Table 3 compares 460/500 Consistency@200, 457/500 Verification@200 without tie-breaking, and 467/500 with tie-breaking. On LiveBench Math the corresponding values are 118/200, 125/200, and 135/200; on LiveBench Reasoning they are 75/140, 94/140, and 97/140; on AIME they are 4/14, 7/14, and 8/14 (Table 3, p. 9). The AIME denominator is 14 in this table, whereas Table 1 uses 15; the paper gives both tables without reconciling this difference.

Limits: the pipeline costs substantial inference. Section 5 estimates 200·50·13,000 ≈ 130 million output tokens per AIME question, about $650 at the stated Gemini Pro price; the paper extrapolates that preliminary scoring reduces the per-question cost to about $200, and Flash verification to $12 (Section 5, p. 12). Preliminary scoring was not used on AIME itself. These figures use September 2024 Gemini models and the paper's token-price assumptions.

## technique 2: implicit scaling and quality selection
The paper isolates “ambiguous” questions, where at least one sampled candidate has a correct final answer. It controls for the increasing chance of finding a correct answer (Pass@k), then measures Verification@k only on those questions. Accuracy rises as k rises, even with verification attempts held fixed. The authors explain that more samples increase the chance of a high-quality correct response that is easier to check. Their statement is, “This demonstrates an implicit scaling of verification accuracy, where increasing the number of generated responses increases not only the chance that at least one response is correct (Pass@k) but also the chance that at least one of the correct responses is of higher quality.” (Section 2.2, p. 5.)

Evidence: Table 2 contains 200 AIME generations for Problem 11. The correct answer 601 appears once and receives score 0.98; the most frequent wrong answer 1 appears 124 times and receives 0.36. The table demonstrates why plurality voting can fail while verification finds a rare correct response (Table 2, p. 8). The paper's conclusion states that sampling-based search “scales remarkably well even with simple implementations” and that implicit scaling contributes substantially (Section 8, p. 17).

Section 4.2 states, “Pass@200 upper bounds what one can hope to achieve through Verification or Consistency.” (p. 10.)

## technique 3: compare candidates to localize errors
The first self-verification principle is to expose disagreements among candidate answers. Section 3 says, “Disagreements between candidate solutions strongly signal the potential locations of their errors.” (Section 3, p. 7.) The verifier receives multiple responses, identifies where they diverge, and checks those local claims. This addresses the paper's observed low recall when models must find errors without a location hint.

Evidence: removing tie-breaking lowers MATH from 467/500 to 457/500 and LiveBench Math from 135/200 to 125/200 (Table 3, p. 9). The experiment evaluates 500 MATH and 200 LiveBench Math questions, as shown by denominators. The paper attributes the largest gains to cases where top candidates receive inflated scores despite errors.

## technique 4: rewrite before judging
The second principle separates generation style from verification style. Chain-of-thought is useful for generating a solution, while verification is easier when the response is rewritten in rigorous hierarchical form. Section 3 states, “responses are easier to verify when written rigorously, hierarchically, and modularly.” (Section 3, p. 8.) Each verification attempt therefore rewrites the candidate into theorem–lemma–proof form before checking it. Appendix C.1 provides the multi-turn prompts for decomposition, rewriting, error checking, repair, and an improved solution (pp. 29–35).

Evidence: Table 4 evaluates 1,080 candidate responses from 54 level-5 MATH training questions and 120 responses from six AIME 2023 questions, using 20 verification attempts per response (Section 3.2, pp. 9–10). Table 4 defines a false positive as labeling a correct response incorrect, and a false negative as labeling an incorrect response correct. On MATH, the Main prompt has 14% false-positive and 17% false-negative rates; omitting rewriting raises these to 16% and 18%. On AIME, Main is 7%/7%, while Without Rewrite is 11%/12% (Table 4, p. 10). Splitting verification into separate threads is worse: 19%/23% on MATH and 11%/14% on AIME. The paper says, “The gap between the performance of "Main" and "Without Rewrite" demonstrates that ablating the rewriting of solutions negatively impacts verification performance.” (Section 3.2, p. 10.)

## technique 5: preliminary scoring for cost control
Section 5 first obtains 10 verification scores per candidate. Candidates averaging below 0.2 are discarded; when a final answer has more than 15 candidates, only the top 15 by preliminary score, breaking ties randomly, are retained for the full 50 scores. This is used on every dataset except AIME (Section 5, p. 12). The paper reports roughly 70% fewer output tokens after this filter.

## what is proved, measured, and trusted
The paper measures benchmark answer accuracy, false-positive/false-negative verification rates, and token cost. It does not prove that model-generated reasoning is sound. Its benchmark's scoring task presents one response; its comparison task presents a correct and incorrect pair with labels hidden, and models are told at least one is correct (Section 6, pp. 13–15). Table 7 reports commercial-model accuracy percentages without sample counts; random guessing is 80%/20%/20% for Correct/Wrong/Flawed scoring and 50% for comparison (Table 7, p. 15).

## techniques for the catalog
- sampling-based search: generate many candidates, score each with repeated self-verification, and select the highest-scoring candidate with pairwise tie-breaking
- implicit scaling: increase candidate count so that a correct, high-quality response becomes available and easier for the verifier to identify
- disagreement localization: compare candidates at divergence points to focus error checking where responses differ
- verification rewriting: rewrite a candidate into theorem–lemma–proof form before judging correctness
- preliminary scoring: cheaply filter low-scoring candidates before expensive repeated verification
- verification benchmark: evaluate scoring of correct, wrong, and correct-by-coincidence flawed responses separately from pairwise comparison
