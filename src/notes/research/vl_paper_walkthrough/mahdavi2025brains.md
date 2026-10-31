# Brains vs. Bytes: Evaluating LLM Proficiency in Olympiad Mathematics
(authored by agents unless marked 🧑)
Tag: `mahdavi2025brains`, [paper](http://arxiv.org/abs/2504.01995v2)

## scope and central claim

This paper evaluates whether frontier LLMs produce logically sound Olympiad proofs and whether LLMs can verify other LLM-generated proofs. It combines human annotation of 455 International Mathematical Olympiad shortlist problems (2009–2023) with automatic model-as-judge experiments. The abstract reports: “Our study reveals that current LLMs fall significantly short of solving challenging Olympiad-level problems and frequently fail to distinguish correct mathematical reasoning from clearly flawed solutions.” (Abstract, p. 1.)

## technique 1: human proof-quality evaluation beyond final answers

What it is. Seven evaluators classify generated solutions as correct, partially correct, or incorrect and record fallacy types. Their qualifications are described as “each either a former national-level Olympiad medalist or holding or doing a relevant Ph.D. in fields like mathematics or computer science” (Section 3, p. 5). The dataset contains 108 algebra, 117 combinatorics, 116 geometry, and 114 number-theory problems, totaling 455 (Section 4, p. 7).

When to use it. Inference: use this evaluation when a final numeric answer can be guessed independently of a valid derivation and when proof soundness is the target property.

Steps from the paper.

1. Select IMO shortlist problems from 2009–2023 across four topics (Section 4, p. 7).
2. Ask frontier models (o1, o1-mini, o3-mini, DeepSeek R1, Gemini 2.0) for solutions (Sections 3 and 3.2, pp. 5–6).
3. Have evaluators read each solution and classify it as correct, partially correct, or incorrect (Section 3.3, pp. 6–7).
4. For non-correct solutions, label one or more fallacies; record both the reference and generated final answers when a final answer is required (Section 3.3, p. 7).
5. Have the team lead review evaluator outputs in parallel and discuss borderline cases (Section 3.3, p. 7).

Verus form. Inference: encode the mathematical claim as a Verus `ensures` clause and use proof functions and loop invariants to force every required step to be justified by solver-checkable facts. Inference: human labels can identify missing lemmas and suggest benchmarks, but they cannot replace machine checking. A proof that compiles against a weak postcondition can still be wrong about the intended theorem.

Evidence. Table 1 reports correct/partial/incorrect percentages: DeepSeek 3.8/6.7/89.4, Gemini 2.0 0.0/1.1/98.9, o1 1.9/3.9/94.2, o1-mini 0.0/0.0/100.0, and o3-mini 3.3/4.4/92.2 (Table 1, p. 7). Inference: each row sums to approximately 100%, consistent with rounding.

Assumptions and failure. The paper says: “Due to the cost and labor involved in assessing the accuracy of the reasoning used by LLM in solving mathematical problems, there is growing interest in LLM-as-a-Judge, a technique to use an LLM to automatically assess the quality of LLM-generated responses [26, 27, 8, 1, 29, 31].” (Section 1, p. 2.) Inference: these results measure this model/problem/evaluator setup, not all LLMs or formal proof systems.

## technique 2: explicit fallacy taxonomy

What it is. The authors classify recurring defects as Proof by Example, Proposal Without Verification, Inventing Wrong Facts, Begging the Question (Circular Reasoning), Solution by Trial-and-Error, and Calculation Mistakes (Section 3.2, p. 6). A model that tests a few examples and generalizes is classified as Proof by Example; one that proposes a strategy without proving it is Proposal Without Verification.

When to use it. Inference: use a taxonomy to produce actionable failure labels rather than one undifferentiated “wrong” score.

Steps from the paper.

1. Inspect incorrect generated arguments qualitatively (Section 3.2, p. 6).
2. Define fallacy categories and provide demonstrative examples in the appendix (Section 3.2, p. 6).
3. Assign one or more categories to each solution that is not correct, including partially correct solutions (Section 3.3, p. 7).
4. Compare frequencies by model, presence of a final answer, and mathematical topic (Sections 4 and Figures 2–4, pp. 8–10).

Verus form. Inference: map these labels to proof-review checks: example-only reasoning requires a universally quantified postcondition; an unverified proposal lacks a lemma or invariant; invented facts require a proved lemma or trusted axiom declaration; circular reasoning indicates the postcondition was assumed rather than derived; trial-and-error requires exhaustive or mathematically justified search; calculation mistakes require checked arithmetic. Inference: Verus syntax must use supported `spec fn`, `requires`, `ensures`, proof functions, and loop invariants; labels are review metadata, not language constructs.

Evidence. “We observe that among the different types of fallacies, Inventing Wrong Facts is the most frequent in four of the models and the second most frequent in a fifth model.” (Section 4, p. 9.) “The results show that Proposal Without Verification is the second most frequently observed reasoning fallacy.” (Section 4, p. 9.) “Notably, Proof by Example and Solution by Trial and Error occur more frequently in solutions that include a final answer.” (Section 4, p. 9.)

Assumptions and failure. Category frequencies are descriptive and solutions may receive multiple labels. Inference: a taxonomy does not establish that a fallacy detector catches every invalid proof; it only organizes observed defects.

## technique 3: final-answer versus proof-quality comparison

What it is. The paper separately reports final-answer accuracy and the conditional percentage of fully correct solutions given a correct final answer. The authors interpret this gap as evidence of shortcuts: “These results suggest that the models use heuristics, shortcuts, and educated guesses that often turn out to be misguided instead of using sound reasoning.” (Section 4, p. 8.) Table 2 reports, for example, DeepSeek final-answer accuracy 63.2% but 0% fully correct conditional solutions; o1 has 30.8% final-answer accuracy and 12.5% fully correct conditional solutions (Table 2, p. 8).

When to use it. Inference: use this comparison whenever a benchmark can be passed by guessing, memorizing, or checking only an output value.

Steps from the paper.

1. Identify problems with concrete final answers in the evaluation set (Section 4, p. 7).
2. Record final-answer accuracy for each model (Section 4, Table 2, p. 8).
3. Among instances with a correct final answer, count those whose complete solution is correct (Section 4, p. 8).
4. Compare the two percentages and inspect fallacy labels (Section 4, pp. 8–9).

Verus form.

Evidence. The authors conclude: “Hence, we argue that evaluating the performance of LLMs on mathematical reasoning tasks based solely on the correctness of the final answer without checking the soundness of the rationale used to justify the answer is fundamentally flawed.” (Section 4, p. 8.) The conditional percentages in Table 2 are explicitly conditioned on correct final answers, not all 455 problems.

Assumptions and failure. Final-answer tasks are only a subset of the 455 problems, and the paper does not state a single total denominator for that subset in the table. Inference: comparisons should preserve the table's conditional denominator and must not be read as proof that every final answer is wrong.

## technique 4: LLM-as-verifier tests

What it is. The authors test two judge tasks: label each solution correct/incorrect, and choose the correct solution from a pair containing one correct and one fallacious solution. Correct solutions come from the Art of Problem Solving; incorrect solutions are model outputs with an obvious fallacy (Section 5, p. 11).

Steps from the paper.

1. Collect incorrect model solutions from the human-evaluation data and obtain correct solutions from AoPS (Section 5, p. 11).
2. Ask each model to analyze a solution and output `Correct` or `Wrong` using the detailed appendix prompt (Section 5, p. 11; Appendix A.3, p. 32).
3. Present one correct and one incorrect solution in random order and ask which is correct (Section 5, p. 11; Appendix A.3, pp. 32–33; Appendix A.4, p. 33).
4. Compare judgments with ground truth and report percentages or pair-selection accuracy (Tables 3 and 4, p. 11).

Verus form. Inference: replace LLM judgment with `verus` verification of the candidate's executable Rust and specification. An LLM may triage or propose lemmas, but a trusted verifier should decide whether the proof obligations discharge. Inference: a model that is near random as a textual judge is not a suitable prerequisite check for accepting agent-written proofs.

Evidence. Table 3 gives percentages of solutions identified as correct: DeepSeek 48% for real and 43% for wrong, Gemini 52% and 50%, o1 31% and 39%, o1-mini 36% and 45%, and o3-mini 26% and 31% (Table 3, p. 11). Table 4 pair-selection accuracy is DeepSeek 57%, Gemini 49%, o1 50%, o1-mini 46%, and o3-mini 52% (p. 11). The paper says: “Only DeepSeek and o3-mini perform modestly better than chance, outperforming random selection by 7% and 2%, respectively.” (Section 5, p. 12.)

Assumptions and failure. The pair task guarantees one solution is correct and one wrong, which simplifies judging. The authors note that some solutions partially satisfy criteria, making the first task complicated (Section 5, p. 11). Inference: these percentages do not measure formal-verifier soundness; they measure model classification under fixed prompts.

## proved, measured, and trusted

The paper measures human-rated proof correctness, fallacy frequencies, final-answer/proof gaps, and model judging accuracy. It does not provide machine-checkable proof certificates, formal semantics, or evidence that any model can verify arbitrary proofs. Inference: the results depend on evaluator expertise, AoPS reference solutions, prompt design, randomization, and human labels. The authors conclude: “In light of the fact that identifying the presence of fallacies in reasoning is a simpler task compared to full verification of the solution, we conclude that LLMs are incapable of verifying the correctness of LLM-generated solutions.” (Section 1, p. 3.)

## techniques for the catalog

- human proof-quality evaluation: classify complete arguments separately from final-answer correctness
- explicit fallacy taxonomy: label example overreach, unsupported proposals, invented facts, circularity, trial-and-error, and arithmetic errors
- conditional final-answer analysis: compare correct outputs with fully correct derivations using explicit denominators
- LLM-as-verifier challenge: test judges on single-solution labels and randomized correct-versus-wrong pairs
