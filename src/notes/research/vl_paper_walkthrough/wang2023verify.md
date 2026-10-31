# Math-Shepherd: Verify and Reinforce LLMs Step-by-step without Human Annotations
(authored by agents unless marked 🧑)
Tag: `wang2023verify`, [paper](https://arxiv.org/abs/2312.08935)

## scope and result

Math-Shepherd is a process reward model (PRM) for mathematical reasoning. It scores each intermediate reasoning step rather than assigning one score to a complete answer. The authors’ central claim is: “In this paper, we present an innovative process-oriented math process reward model called M ATH -S HEPHERD, which assigns a reward score to each step of math problem solutions” (Abstract, p.1). Training labels are generated without human step annotations by completing a partial solution several times (N=8 in the experiments, §4, p.6) and checking each completion’s final answer against a known answer. The resulting PRM is used in two modes: reranking many candidate solutions and supplying step rewards to PPO.

The method needs a narrow oracle setting: every problem has a checkable golden answer. It does not prove arbitrary mathematical claims, and the authors explicitly acknowledge noisy labels: “The automatic process annotation consists of noise” (Limitations, p.11). Inference: the useful transfer to Verus is the decomposition of a proof attempt into checkable intermediate obligations and the use of a local score to prioritize repair; a reward model remains a heuristic and cannot replace Verus’s sound obligation checking.

## technique 1: automatic process annotation by completion

what it is

For a problem p and a solution step sᵢ, a ‘completer’ model decodes N continuations from that step. Each continuation yields an answer aⱼ. A step’s quality is defined by its potential to lead to the correct final answer: “we define the quality of a reasoning step as its potential to deduce the correct answer” (§3.3.1, p.4). The definition is “Inspired by Monto Carlo Tree Search” (§3.3.1, p.4): it estimates a step from multiple sampled paths rather than inspecting the step with a symbolic proof checker.

how to apply it

1. Obtain a problem with a golden answer and a step-by-step solution (§1, p.2).
2. For each intermediate step sᵢ, use a completer to decode N subsequent paths, recording each final answer (§3.3.2, pp.4–5).
3. Compare every decoded answer with the golden answer (§3.3.2, p.5).
4. Assign either hard estimation (HE), 1 if any completion is correct and 0 otherwise, or soft estimation (SE), the fraction of N completions that are correct (§3.3.2, p.5).
5. Train a PRM with cross-entropy on the per-step labels (§3.3.2, p.5). The experiments use the HE version, encoded as two special tokens for ‘has potential’ and ‘no potential’ (§4, p.6).

The definitions are explicit. “HE supposes that a reasoning step is good as long as it can reach the correct answer a∗” and “SE assumes the quality of a step as the frequency with which it reaches the correct answer” (§3.3.2, p.5). Figure 2 uses N=3 to show one step s₁ producing two correct and one incorrect completion, hence an SE label of 2/3 and an HE label of 1 (Figure 2, p.5).

evidence and limits

To build the training data, the authors train 7B and 13B models for one epoch on the GSM8K and MATH training sets, sample 15 solutions per problem from each model, remove duplicates, and annotate each step with LLemma-7B as completer and N=8; this yields around 170k GSM8K and 270k MATH solutions (§4, p.6). A manual check labels 160 steps sampled from the GSM8K training set to assess annotation quality (§5.2, p.8). With a LLaMA2-70B completer, HE accuracy reaches 86% at N=4 and then declines as N grows; the authors write “larger values for N may lead to false positives” (§5.2, p.8). In Table 4, Math-Shepherd with a LLaMA2-13B completer and N=4 obtains 85.0% accuracy and loss 2.05, compared with 75.6% and 3.27 for DIVERSE-NLI using LLaMA2-13B and 75.0% and 3.43 for DIVERSE-Rule (Table 4, p.10). Inference: the denominator for that accuracy is the 160-step sample of §5.2; Table 4 does not state its denominator.

The computational cost grows with N. “To determine the label of each reasoning step, we utilize a ‘completer’ to decode N subsequent reasoning processes” and “this completion process demands a lot of computing resources” (Limitations, p.11). The Limitations section states “We observe that as N increases, so does the quality of automatic annotations” (p.11), while §5.2 reports the HE accuracy decline above N=4 and that SE loss falls as N grows (§5.2, p.8). Inference: the noise is structural: a bad intermediate step can occasionally reach the right answer, and a good step can fail under a weak sampled continuation; no amount of sampling turns the labels into proofs.

Inference: for a Verus proof assistant, a related data generator could sample candidate proof steps or lemma applications and score them by whether a later proof attempt closes the goal. The retained training signal must still be checked by Verus. A Verus implementation would express the actual property with `requires` and `ensures`, use `assert` and loop `invariant` facts for intermediate obligations, and use a `proof fn` only for proof code erased before execution. The paper does not provide Rust or Verus code; this mapping is an inference.

## technique 2: PRM step scoring and solution reranking

what it is

A PRM assigns a score to each step. For a complete solution, Math-Shepherd uses the minimum step score as the solution score: “Following (Lightman et al., 2023), we use the minimum score across all steps to represent the final score of a solution assigned by PRM” (§3.4, p.5). Given N candidate solutions, the verifier selects the highest-scoring candidate (best-of-N, §3.1, p.3).

how to apply it

1. Sample N complete solutions for each test problem (§3.1, p.3).
2. Run the PRM on every step of every solution (§3.4, p.5).
3. Reduce each solution’s step scores with the minimum (§3.4, p.5).
4. Select the solution with the largest reduced score (§3.1, p.3).
5. Optionally group candidates by final answer, sum reward scores within each group, and pick the answer of the group with the largest sum, combining self-consistency and reward modeling (§3.4, Eq. 5, pp.5–6).

The model compares to outcome reward models (ORM), which assign one confidence score to the whole sequence. The introduction states, “The ORM assigns a confidence score based on the entire generation sequence, whereas the PRM evaluates the reasoning path step-by-step” (§1, p.2). Table 1 evaluates 256 outputs per problem; it reports GSM8K and MATH500 accuracy for LLaMA2-70B, LLemma-34B, and DeepSeek-67B generators fine-tuned on MetaMATH under self-consistency, ORM, Math-Shepherd, and combinations, with reward models trained from LLaMA2-70B (GSM8K) and LLemma-34B (MATH) (Table 1, p.6). For example, the LLaMA2-70B MetaMATH model scores 93.2% on GSM8K and 44.5% on MATH500 with Math-Shepherd, versus 91.8% and 40.4% with ORM (Table 1, p.6). The test sets are the whole GSM8K test set and MATH500, a 500-problem subset identical to the test set of Lightman et al. (2023); reported accuracy is “the mean accuracy of 3 groups of sampling results” (§4, p.6).

Figure 3 varies N from 1 to 256 for LLaMA2-70B. The authors write that “PRM exhibits consistent superior performance when compared to both ORM and majority voting, with the degree of this superiority becoming more pronounced as N escalates” (§5.1, p.8); the figure gives no tabulated values per N (Figure 3, p.9). On MATH, the automatically annotated data also beat the human-annotated PRM800K, which the authors ascribe to distribution gap and data quantity (§5.1, p.8). The authors also find model-size asymmetry: “utilizing a larger reward model to validate the output of a smaller generator significantly enhances performance,” whereas a smaller reward model validating a larger generator “adversely impacts the model’s performance compared to SC” (§5.3, p.10).

## technique 3: step-by-step PPO supervision

what it is

After training the PRM, the paper uses it as a reward model for Proximal Policy Optimization. Conventional ORM-PPO supplies one reward at the end of a response. Math-Shepherd gives a reward at every reasoning step: “our step-by-step PPO offers rewards at the end of each reasoning step” (§3.5, p.5).

how to apply it

1. Train the PRM with automatically labeled steps (§3.3.2, p.5).
2. Generate a reasoning trajectory from the policy (§3.5, p.5).
3. Score each completed step with the PRM and use those scores as rewards at the end of each step (§3.5, p.5).
4. Update the policy with PPO; evaluate greedy decoding on the benchmark (§3.1, p.3; §4, p.6).

For reinforcement learning, the reward model is trained from Mistral-7B and supervises LLaMA2-7B and Mistral-7B generators; the PRM is trained for 1 epoch with learning rate 1e-6, PPO uses learning rate 4e-7 for LLaMA2-7B and 1e-7 for Mistral-7B, and the Kullback-Leibler coefficient is 0.04 (§4, p.6). On GSM8K, Mistral-7B MetaMATH rises from 77.9% greedy accuracy to 84.1% with step-by-step PPO, versus 81.8% with ORM-PPO; on MATH it rises from 28.6% to 33.0%, versus 31.3% with ORM-PPO (Table 2, p.7). Combining PPO and later verification (self-consistency plus Math-Shepherd, 256 outputs) reaches 89.1% on GSM8K and 43.5% on MATH500 (Abstract, p.1; Table 3, p.8). Greedy reinforcement-learning results use the whole GSM8K and MATH test sets (§4, p.6); the paper does not print item counts in the tables. After PPO, verification with the reward model alone is worse than self-consistency, which the authors attribute to “the initial reward model is not sufficient to supervise the more powerful model after PPO” (§4.1, p.8).

Inference: a Verus agent could use failed proof obligations as step-level rewards during search, rewarding an attempt that reduces remaining obligations. This is an agent-control strategy, not a correctness argument. The final artifact still requires Verus to verify all obligations, and any reward based on a heuristic prover or compiler must be treated as untrusted guidance.

## technique 4: out-of-distribution and failure analysis

The authors test generalization on the Hungarian national final exam, 33 questions totaling 100 points. A LLemma-34B generator trained on MetaMATH produces 256 candidates per question, and LLemma-34B-ORM and LLemma-34B-PRM select among them (§5.5, p.10). The reported scores are 46.0 for greedy, 54.0 with ORM, and 63.0 with Math-Shepherd (Figure 6(b), p.11). In the case study, Math-Shepherd selects the correct solution from 256 candidates while ORM selects a wrong one; Math-Shepherd “recognized errors in Step 2, Step 6, and Step 9 and so on” of the ORM-selected solution and scored them lower (Table 5 and text, p.11). Inference: this demonstrates error localization on one example, not general mathematical reliability.

The paper reports further caveats. PRM beats ORM by “approximately 4% accuracy” with a 10k-instance training set (§5.4, p.10; plotted in Figure 6(a), p.11). In the 160-step manual check, completer size and completer training data affect annotation loss (§5.2, pp.8–9). The authors state that “a noticeable gap remains between PRM800K and the candidate responses generated by the open-source models utilized in this study” and that “the impact of this potential noise on PRM performance is still undetermined” (Limitations, p.11).

## what is proved, measured, and trusted

Math-Shepherd measures benchmark answer accuracy, annotation loss and manual step-label accuracy, best-of-N selection, and PPO gains. It proves no theorem about the mathematics or the model. The authors state the proxy’s noise directly: “Analogous to ORM, this definition also introduces some degree of noise” (§3.3.1, p.4; Limitations, p.11). Inference: its trusted components include the benchmark golden answers, answer extraction, completer, sampling distribution, reward-model training, and the assumption that final-answer correctness is a useful proxy for each intermediate step.

Inference: the threat to a product that emits agent-written verified Rust is indirect but real. A PRM could improve search efficiency and identify likely bad proof steps, yet a false high score can waste computation or steer the agent toward an invalid invariant. Treating the score as evidence of correctness would undermine the product’s verification claim. The safe boundary is: use PRM scores to schedule attempts, and accept code only after Verus checks its contract.

## techniques for the catalog

- automatic process annotation — sample multiple completions from each intermediate step and label it by hard or soft frequency of correct final answers
- process reward reranking — score every step, reduce a solution by its minimum step score, and select among many candidates
- step-by-step PPO — use per-step reward-model scores instead of one terminal reward to train a reasoning policy
- out-of-distribution verifier testing — evaluate reranking and error localization on a separate problem set
