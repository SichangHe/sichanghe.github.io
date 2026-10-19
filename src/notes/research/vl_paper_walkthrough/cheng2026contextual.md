# Contextual Drag: How Errors in the Context Affect LLM Reasoning
(authored by agents unless marked 🧑)
Tag: `cheng2026contextual`, [paper](https://arxiv.org/abs/2602.04288v2)

## phenomenon and measurement
Cheng et al. study whether failed attempts left in a model's context improve later attempts. They define contextual drag as a performance drop and structural bias caused by incorrect drafts. The abstract reports that “contextual drag induces 10–20% performance drops” across 11 models and eight tasks (Abstract, p. 1). Their controlled comparison is Direct (clean slate) versus 1F or 2F (one or two incorrect drafts in context), with the model explicitly told to verify drafts before solving (§2.1, p. 3). Problems are filtered so anchor models have both successes and failures, and correctness is checked by comparing parsed final answers with ground truth using a symbolic verifier (§2.1, p. 3). Proprietary models are evaluated only on competition math because of API costs (§2.1, footnote 2, p. 2).

## technique: measure context drag before trusting refinement
Inference: use this evaluation before relying on a proof-repair loop that feeds failed candidates back to a model. The paper constructs its evaluation as follows:

1. generate clean-slate answers and select top-three open-weight models as anchor sources (§2.1, p. 3)
2. retain questions where anchors have at least two correct and two incorrect responses, avoiding trivial or impossible items (§2.1, p. 3)
3. evaluate Direct, 1F, and 2F; in 1F/2F explicitly ask the model to verify each draft before producing a new answer (§2.1, p. 3)
4. parse final answers and compare them with ground truth using a symbolic verifier (§2.1, p. 3)
5. report performance changes; for Game of 24, compare final-expression trees with tree edit distance (§2.3, pp. 4–5)

The drafts omit thinking traces inside `<think></think>` to keep context length manageable (Appendix A.1, p. 13). The prompt requires an overall correctness verdict and stops checking each draft after the first fatal error, before generating a solution. It permits reuse of sound draft ideas (Appendix A.1, pp. 13–14).

Table 1 uses 16 generations per question. For example, GPT-OSS-20B on AIME24 falls from 51.88% Direct to 17.50% with one incorrect draft and 21.25% with two; the AIME24 subset denominator is 10/30 (§2.1, Table 1, p. 3). The AIME24 accuracy covers 10 filtered questions with 16 generations each, rather than the full 30-question benchmark. In iterative refinement, GPT-OSS-20B's accuracy declines across 16 iterations while majority voting improves (§2.2, Figure 2, p. 4). The authors warn: “without mechanisms to detect, filter, or reset from low-quality drafts in the context, the model can become increasingly biased toward the erroneous context.” (§2.2, p. 4)

## technique: quantify structural copying with tree edit distance
The paper applies this analysis to Game of 24. Expressions must use four supplied integers exactly once with addition, subtraction, multiplication, division, and parentheses to reach 24 (§2.3, p. 4). For each problem, extract final expressions from Direct and 1F responses, parse them into trees, and compute tree edit distance (TED) from each expression to the incorrect draft. TED counts the minimum-cost node insertions, deletions, and relabelings (Appendix C.1, p. 22). For 2F, use the minimum distance to either draft for both Direct and conditioned responses; the lower absolute distances do not establish stronger drag (Appendix C.2, p. 22).

Conditioned responses remain closer to the erroneous draft than Direct responses across the six models shown (Figure 3, p. 5). The caption cautions: “Lower TED indicates stronger structural similarity to the in-context draft but not necessarily worse performance.” (Figure 3, p. 5) Inference: apply this analysis when solutions have a meaningful tree representation; expression similarity alone does not establish the model's internal reasoning mechanism.

Inference: a Verus analogue can parse candidate proof syntax or normalized verifier obligations, then compute structural similarity of failed and subsequent proof states. This is an analysis signal only: Verus's AST and solver traces are not the paper's expression trees, and similarity cannot establish semantic copying or unsoundness.

## technique: test external and self-detected error signals separately
To test whether drag is merely failure to notice an error, the authors add an external prompt warning that the draft is incorrect and instructing the model not to copy its final answer (§3.1, p. 5). Performance generally remains below Direct, with MMLU as the main exception; Game-of-24 outputs remain structurally closer to the draft than Direct outputs (Figure 4, p. 5). The authors conclude: “External error signals alone are insufficient to mitigate contextual drag.” (§3.1, p. 6) They then retain only 1F trajectories whose structured verdict correctly says the draft is incorrect (§3.2, p. 6). The authors caution: “it selectively keeps “good” trajectories and therefore biases toward stronger performance.” (§3.2, p. 6) The retained subset differs by model and task, so its accuracy and TED are not directly comparable to the full 1F results. Nemotron models partially recover or exceed Direct, while GPT-OSS-20B remains strongly degraded (Figure 5, p. 6).

Inference: in a Verus repair system, a compiler error or failed proof should be represented explicitly, but the orchestration must test whether the next candidate changes its proof structure rather than merely repeating the failed invariant. Do not interpret a model's “incorrect” label as evidence that it actually escaped the failed proof path.

## technique: denoise context or train a conditional fallback
The paper evaluates two test-time denoisers (§4.1, p. 6; Appendix E.1, pp. 27–29):

1. Revise first improves each draft independently, then solves the problem using the revised draft
2. Filter first generates a high-level strategy from the problem alone, without computations or an answer; it then selects only correct, useful draft steps aligned with that strategy, independently for each draft; finally, it solves using the filtered draft

Both remove `<think></think>` traces between passes and omit explicit draft verification in the final solve prompt (Appendix E.1, pp. 27–29). The paper therefore includes a baseline without that verification instruction, labeled 1F-V in Table 2. Gains vary by method, task, and model; Filter is generally more robust. Neither method restores Direct in all settings, although some results exceed Direct. The authors report: “test-time cost increases by at least 2×, scaling with the number of denoising steps and drafts.” (§4.1.2, p. 7) For GPT-OSS-20B on HMMT25, Direct is 58.63%, Revise 62.20%, Filter 45.83%, and 1F 20.54% (§4.1.2, Table 2, p. 7).

The targeted fallback trains GPT-OSS-20B on 40,000 correct-draft and 40,000 incorrect-draft pairs (§4.2, p. 7). Only verification trajectories whose verdict agrees with the symbolic answer checker are retained (Appendix F.3, p. 33). Each incorrect example concatenates correct error verification with a correct clean-slate trajectory from GPT-OSS-20B; each correct example combines correct verification with a fixed answer-reuse template (Appendix F.4, pp. 33–34). Training uses token-level supervised learning (§4.2, p. 7). Table 3 reports 1F gains: AIME24 rises from 17.5% baseline to 40.6% after fine-tuning, but remains below Direct (§4.2.1, Table 3, p. 7). Appendix Table 15 exposes a tradeoff: on 1T (correct drafts), fine-tuned pass@1 falls from 73.12% to 50.63% on AIME24 (Appendix F.6, p. 34).

## techniques for the catalog
Inference: the proof-specific adaptations below require separate evaluation.

- drag benchmark — compare clean-slate and failed-draft-conditioned generations on matched filtered problems
- structural similarity audit — use parsed proof trees and edit distance to detect repeated failed patterns
- independent error-signal test — distinguish external warnings from model self-verification with separate conditions
- context denoising — revise or filter drafts before reuse, measuring cost and residual degradation
- conditional fallback training — train incorrect-draft verification followed by clean-slate regeneration and correct-draft reuse
