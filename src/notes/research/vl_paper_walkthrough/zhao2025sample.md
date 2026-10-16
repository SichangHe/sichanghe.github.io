# Sample, Scrutinize and Scale: Effective Inference-Time Search by Scaling Verification
(authored by agents unless marked 🧑)
Tag: `zhao2025sample`, [paper](http://arxiv.org/abs/2502.01839v2)

## scope and main result
The paper studies sampling-based search: generate many candidate answers, score each with language-model self-verification, and select the best. Its abstract says, “sampling-based search, a simple paradigm for utilizing test-time compute, involves generating multiple candidate responses and selecting the best one—typically by having models self-verify each response for correctness.” (Abstract, p. 1.) The central result is that a minimalist implementation scales strongly when both the number of candidates and verification attempts increase. Table 1 reports Gemini v1.5 Pro Verification@200 as 8/15 on AIME, 467/500 on MATH, 135/200 on LiveBench Math, and 97/140 on LiveBench Reasoning; the denominators are the full benchmark question counts stated in the table (p. 3). These are single-run scores, as the caption states.

Inference: for VeruLaw (VL), the transferable pattern is a generate–check loop in which a verifier ranks candidate Rust/Verus specifications or proofs. The paper does not verify programs, and its language-model scores are not formal proof certificates. A VL implementation must therefore treat model judgments as search guidance and require Verus to discharge the final contract.

## technique 1: sampling-based search with self-verification
The paper gives Algorithm 1. Step 1 populates a set S with `k_inf` random samples from `LM("Answer Q")`. Step 2 obtains `k_verif` binary verification samples for each candidate using `LM("Return 1[response s_i to Q is correct]")`. Step 3 averages each candidate's scores and keeps candidates within 0.05 of the highest average. If one remains, it is returned. Otherwise, pairwise tie-break queries compare every pair in the retained set, and the response with the most wins is returned. The algorithm is printed in Section 1, Algorithm 1 (p. 3).

The implementation details in Section 3.1 are operational instructions: candidate responses are generated in parallel at temperature 1.5; each candidate receives 50 binary verification attempts at temperature 1; each attempt rewrites the response as “a theorem, supporting lemmas, and proofs” and scans for errors (Section 3.1, pp. 8–9). When the top three candidates are within 5% and disagree, each pair is compared 100 times; each comparison identifies divergence points and determines which side is correct (Section 3.1, p. 9). The paper's exact description is, “Each matchup is a single conversation thread that identifies where responses diverge and, at each such point, determines which side is correct.” (Section 3.1, p. 9.)

Inference: a Verus adaptation generates candidate implementations, contracts, and proof lemmas. A verifier prompt can ask for a structured review, but the selected candidate should then be compiled with Verus. The executable Rust remains ordinary `fn`; specifications use `requires` and `ensures`; mathematical helper proofs use `proof fn`; final acceptance is the Verus result, not a score. Candidate generation and verification can be parallelized, while the final compile is the trusted gate.

Evidence: on MATH, Table 3 compares 460/500 Consistency@200, 457/500 Verification@200 without tie-breaking, and 467/500 with tie-breaking. On LiveBench Math the corresponding values are 118/200, 125/200, and 135/200; on LiveBench Reasoning they are 75/140, 94/140, and 97/140; on AIME they are 4/14, 7/14, and 8/14 (Table 3, p. 9). The AIME denominator is 14 in this table, whereas Table 1 uses 15; the paper gives both tables without reconciling this difference.

Limits: the pipeline costs substantial inference. Section 5 estimates 200·50·13,000 ≈ 130 million output tokens per AIME question, about $650 at the stated Gemini Pro price; preliminary scoring reduces this to about $200, and Flash verification to $12 (Section 5, p. 12). These figures use September 2024 Gemini models and the paper's token-price assumptions.

## technique 2: implicit scaling and quality selection
The paper isolates “ambiguous” questions, where at least one sampled candidate has a correct final answer. It controls for the increasing chance of finding a correct answer (Pass@k), then measures Verification@k only on those questions. Accuracy rises as k rises, even with verification attempts held fixed. The authors explain that more samples increase the chance of a high-quality correct response that is easier to check. Their statement is, “This demonstrates an implicit scaling of verification accuracy, where increasing the number of generated responses increases not only the chance that at least one response is correct (Pass@k) but also the chance that at least one of the correct responses is of higher quality.” (Section 2.2, p. 6.)

Inference: for VL, candidate diversity should be measured separately from proof success. Generate variants with different decomposition, invariants, and lemma choices; then verify each candidate's actual Verus proof. Keep the best compiling candidate, while recording Pass@k (at least one compiles) and selection accuracy (the ranker chooses a compiling candidate). This exposes whether a verifier merely prefers plausible text.

Evidence: Table 2 contains 200 AIME generations for Problem 11. The correct answer 601 appears once and receives score 0.98; the most frequent wrong answer 1 appears 124 times and receives 0.36. The table demonstrates why plurality voting can fail while verification finds a rare correct response (Table 2, p. 7). The paper's conclusion states that sampling-based search “scales remarkably well even with simple implementations” and that implicit scaling contributes substantially (Section 8, p. 17).

Assumption: implicit scaling depends on the model producing at least one rigorous candidate as k grows. It cannot exceed Pass@k; Section 4.2 calls Pass@200 an upper bound on Verification or Consistency (p. 11). For VL, a candidate that never compiles cannot be recovered by ranking.

## technique 3: compare candidates to localize errors
The first self-verification principle is to expose disagreements among candidate answers. Section 3 says, “Disagreements between candidate solutions strongly signal the potential locations of their errors.” (Section 3, p. 8.) The verifier receives multiple responses, identifies where they diverge, and checks those local claims. This addresses the paper's observed low recall when models must find errors without a location hint.

Inference: a VL verifier can diff candidate Rust/Verus code and ask targeted questions about changed contracts, loop invariants, arithmetic bounds, or ownership facts. Pairwise comparison should be used when candidates have similar verification scores and disagree on behavior. The resulting review is still advisory; Verus must prove the chosen candidate.

Evidence: removing tie-breaking lowers MATH from 467/500 to 457/500 and LiveBench Math from 135/200 to 125/200 (Table 3, p. 9). The experiment evaluates 500 MATH and 200 LiveBench Math questions, as shown by denominators. The paper attributes the largest gains to cases where top candidates receive inflated scores despite errors.

## technique 4: rewrite before judging
The second principle separates generation style from verification style. Chain-of-thought is useful for generating a solution, while verification is easier when the response is rewritten in rigorous hierarchical form. Section 3 states, “responses are easier to verify when written rigorously, hierarchically, and modularly.” (Section 3, p. 8.) Each verification attempt therefore rewrites the candidate into theorem–lemma–proof form before checking it.

Evidence: Table 4 evaluates 1,080 candidate responses from 54 level-5 MATH training questions and 120 responses from six AIME 2023 questions, using 20 verification attempts per response (Section 3.2, pp. 9–10). On MATH, the Main prompt has 14% false-positive and 17% false-negative rates; omitting rewriting raises these to 16% and 18%. On AIME, Main is 7%/7%, while Without Rewrite is 11%/12% (Table 4, p. 10). Splitting verification into separate threads is worse: 19%/23% on MATH and 11%/14% on AIME. The paper says, “The gap between the performance of ‘Main’ and ‘Without Rewrite’ demonstrates that ablating the rewriting of solutions negatively impacts verification performance.” (Section 3.2, p. 10.)

Inference: in VL, normalize generated code into a review form containing the function contract, loop invariants, relevant lemmas, and proof obligations before asking a model to critique it. Do not split mutually dependent obligations into isolated conversations unless the dependency is explicit. The Verus source itself should preserve executable code and proof code together so that the compiler checks their connection.

## technique 5: preliminary scoring for cost control
Section 5 first obtains 10 verification scores per candidate. Candidates averaging below 0.2 are discarded; when a final answer has more than 15 candidates, only the top 15 by preliminary score are retained for the full 50 scores. This is used on every dataset except AIME (Section 5, p. 12). The paper reports roughly 70% fewer output tokens after this filter.

Inference: a VL service can run a cheap first compile or shallow specification check, retain a bounded beam, then run complete Verus verification on survivors. The filter must be tracked as a recall risk: discarding the only compiling candidate is irreversible. Record the number of generated candidates, survivors, and successful final proofs.

## what is proved, measured, and trusted
The paper measures benchmark answer accuracy, false-positive/false-negative verification rates, and token cost. It does not prove that model-generated reasoning is sound. Its benchmark's scoring task presents one response; its comparison task presents a correct and incorrect pair with labels hidden, and models are told at least one is correct (Section 6, pp. 13–15). Table 7 reports commercial-model accuracies with denominators represented as curated benchmark percentages; random guessing is 80%/20%/20% for Correct/Wrong/Flawed scoring and 50% for comparison (Table 7, p. 15).

Inference: a VL product should trust only the Verus checker, Rust compiler, and explicitly reviewed specifications. Model scores, prompt rewrites, benchmark accuracy, and search heuristics remain assumptions. External libraries, unsafe code, hardware, and the correctness of the specification remain outside this paper's evidence.

## threat and avoided repetition
Inference: the direct product threat is that an agent may generate a plausible but incorrect proof plan and a language model may rank it highly, especially when all candidates share the same hallucination. Pairwise disagreement, rigorous rewriting, and compile-gated selection reduce this risk but do not remove it. The paper already evaluates black-box self-verification, candidate comparison, rewriting, implicit scaling, preliminary filtering, and a verification benchmark; VL should reuse these as engineering baselines rather than claim them as new techniques.

## techniques for the catalog
- sampling-based search: generate many candidates, score each with repeated self-verification, and select the highest-scoring candidate with pairwise tie-breaking
- implicit scaling: increase candidate count so that a correct, high-quality response becomes available and easier for the verifier to identify
- disagreement localization: compare candidates at divergence points to focus error checking where responses differ
- verification rewriting: rewrite a candidate into theorem–lemma–proof form before judging correctness
- preliminary scoring: cheaply filter low-scoring candidates before expensive repeated verification
- verification benchmark: evaluate scoring of correct, wrong, and correct-by-coincidence flawed responses separately from pairwise comparison
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
