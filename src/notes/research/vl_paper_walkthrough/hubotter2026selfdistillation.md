# Reinforcement Learning via Self-Distillation
(authored by agents unless marked 🧑)
Tag: `hubotter2026selfdistillation`, [paper](https://www.semanticscholar.org/paper/89e83ee3eb95843292b1f75f0e50b89e7667b828)

## scope and result
The paper defines reinforcement learning with rich feedback (RLRF) and presents Self-Distillation Policy Optimization (SDPO). Its central claim is that an online policy can use its own feedback-conditioned predictions as a dense teacher. The paper says: “Many verifiable environments expose rich tokenized feedback beyond scalar rewards r, such as runtime errors, failing unit tests, or evaluations from an LLM judge.” (Introduction, p. 2). It reports three settings: ordinary scalar-reward reasoning and tool use, coding with LeetCode-style feedback, and test-time discovery on hard coding questions.

Inference: For Verus, the analogue is a policy that samples Rust/specification/proof attempts, feeds verifier diagnostics and counterexamples back into the same model, and updates token-level probabilities toward the feedback-conditioned prediction. This is a training strategy around a sound verifier; it is not itself a proof of Rust correctness.

## technique 1: self-teacher distillation from verifier feedback

what it is

The student first produces an answer, while the same policy is then prompted with the original question, the failed answer, and environment feedback. The second pass is the self-teacher. The paper states: “In contrast, we use the current policy as a ‘self-teacher’ that, rather than sampling a new response, re-evaluates the existing rollout after receiving rich feedback.” (Introduction, p. 2). It also states: “Including the feedback in-context transforms the model’s next-token distribution, allowing the self-teacher to agree or disagree with the student’s original choices at specific tokens.” (Introduction, p. 2).

when to use it

Use it when the environment exposes tokenized diagnostic information, such as a runtime error, failing test, judge text, or a successful alternative in the same rollout group. Scalar rewards alone do not provide this information; when every rollout has the same reward, the paper says GRPO advantages “collapse to zero and learning stalls.” (Introduction, p. 2).

how to do it

1. Sample a question x and responses yᵢ from the current policy πθ (Algorithm 1, p. 4).
2. Evaluate every response to obtain feedback fᵢ (Algorithm 1, p. 4).
3. Prompt the same policy with the question, a successful previous rollout when available, the environment output for an unsuccessful attempt otherwise, and the original response. The exact template is given in Table 2 (p. 5).
4. Recompute teacher log-probabilities for the original response under the feedback-conditioned context, rather than sampling a replacement. The paper says: “Crucially, this mechanism incurs no sampling overhead: we simply re-compute the log-probabilities of the original attempt under the self-teacher’s feedback-augmented context.” (Introduction, p. 3).
5. Minimize the per-token KL loss
   `L_SDPO(θ) = Σ_t KL(πθ(· | x, y_<t) || stopgrad(πθ(· | x, f, y_<t)))` (Eq. 1, p. 4).
   `stopgrad` prevents the teacher branch from moving toward the student (Sec. 2, p. 4).
6. Repeat sampling, evaluation, log-probability computation, and gradient descent (Algorithm 1, p. 4).

Verus form

Inference: Put the verifier in the environment loop. The sampled artifact can be a Rust function with `requires` and `ensures`, a proof function, or a `spec fn`; compile and run Verus, capture diagnostics, and place the diagnostics in the teacher prompt. Keep the verifier’s acceptance result external to the loss: accepted code still needs a normal Verus check. The paper’s KL computation and `stopgrad` have no Verus-language counterpart; they belong in the training implementation. A generated artifact is not verified merely because SDPO increased its probability.

what the evidence shows

The paper reports aggregate final accuracy of 70.2% for SDPO versus 66.6% for its GRPO baseline in scalar-reward scientific reasoning and tool use (summary, p. 3). On LiveCodeBench v6 it reports 48.8% versus 41.2%, and says SDPO reaches GRPO’s final accuracy in four times fewer generations (summary, p. 3; Fig. 1, p. 1). The experiment uses Qwen3-8B and Olmo3-7B-Instruct for the first setting, Qwen3 models for coding, and three random seeds where the figure caption reports standard deviation (Fig. 1, p. 1). The paper says: “SDPO also outperforms baselines in standard RLVR environments that only return scalar feedback by using successful rollouts as implicit feedback for failed attempts.” (Abstract, p. 1).

The compute experiment uses micro-batch size 2; the paper reports SDPO’s step-time overhead as +5.8% without a code environment and +17.1% with one (Fig. 5, p. 6). The authors attribute the overhead to an additional teacher log-probability pass and state that it can be parallelized (Sec. 2.2, p. 6). Test-time self-distillation on very hard LiveCodeBench questions has base-model pass@64 below 0.03 and is reported to accelerate discovery by 3× (summary, p. 3; Sec. 5, pp. 14–16).

Inference: These denominators and settings matter for a Verus deployment: 70.2% and 66.6% are aggregate final accuracies over the paper’s reasoning/tool-use evaluation, while 48.8% and 41.2% are final LiveCodeBench v6 accuracies. They do not measure verified-Rust success rates.

where it fails or assumes

The self-teacher assumes feedback is informative and that the current model can use it in context. The paper reports that gains grow with model scale and that smaller models improve only slightly over GRPO (Sec. 4.1, pp. 9–10). It also assumes on-policy rollouts for the main algorithm; an off-policy extension requires PPO-style clipped importance sampling (Sec. 2.1, p. 6). The teacher is the same model, so systematic inability to interpret a diagnostic can be reinforced. The paper’s coding experiments depend on executable test feedback and its reasoning experiments use answer verifiers; neither establishes coverage of arbitrary specifications.

Inference: Verus diagnostics can be incomplete, unstable across tool versions, or misleading when a specification is wrong. SDPO can therefore optimize a bad specification or a repeated solver workaround. A product should retain independent review of specifications, pinned Verus/toolchain versions, and a final verifier run; those controls are engineering consequences, not claims made by the paper.

## technique 2: dense logit-level advantages as an RLVR replacement

what it is and how to do it

The paper identifies SDPO’s advantage for sampled token ŷᵢ,ₜ as
`A_SDPOᵢ,ₜ(ŷᵢ,ₜ) = log [πθ(ŷᵢ,ₜ | x, fᵢ, yᵢ,<t) / πθ(ŷᵢ,ₜ | x, yᵢ,<t)]`, while GRPO uses a rollout-level reward-minus-group-mean (Eq. 2 and Sec. 2.1, p. 6). It states: “The SDPO advantage is zero only for tokens where student and teacher perfectly agree.” (Sec. 2.1, p. 6). Positive values increase tokens favored after feedback; negative values decrease tokens disfavored after feedback. The implementation can reuse a standard RLVR pipeline by swapping advantages (Sec. 2.1, p. 6).

Inference: A Verus training system can retain an existing policy-gradient data path and replace sparse pass/fail advantages with token-level ratios obtained from the diagnostic-conditioned pass. It should log the original artifact, feedback, teacher probabilities, and verifier result so that each update remains auditable. This changes optimization only; soundness remains the Verus checker’s responsibility.

## what is proved, measured, and trusted

The paper gives a derivation that SDPO is a policy-gradient algorithm (Proposition 2.1, p. 4) and measures accuracy, response length, discovery probability, and step time. It does not prove that generated programs satisfy a formal specification. Trusted components include the environment’s reward/feedback, the model implementation, tokenizer, optimizer, and the benchmark graders; the Verus inference additionally trusts Verus, Rust compilation, and the specification supplied by a user.

Inference: The strongest transferable pattern is propose, obtain concrete feedback, re-score the same artifact under feedback, and update locally. It reduces the information bottleneck but cannot repair an unsound oracle or an incorrect contract.

## prior work VL should not redo

The paper already supplies the self-teacher construction, KL loss with `stopgrad`, the token-level advantage, the rollout template, the Algorithm 1 loop, and the comparison with GRPO. A VL implementation should reproduce these only as an adaptation to Verus diagnostics, then evaluate against verifier-specific baselines rather than rerunning the paper’s benchmark claims.

## threat to agent-written verified Rust

Inference: The threat is medium for proof-generation throughput and low for formal soundness when every candidate is independently checked. SDPO may make an agent converge faster on recurring verifier errors, but it can also amplify an incorrect contract, exploit diagnostics without establishing the intended theorem, or overfit to a fixed Verus version. The acceptance gate must remain the verifier and specification, not the learned reward.

## techniques for the catalog

- self-teacher from rich feedback — condition the current policy on its failed attempt plus tokenized environment feedback, then reuse its feedback-conditioned log-probabilities as dense supervision

- KL self-distillation — minimize per-token KL from the ordinary student distribution to a stop-gradient, feedback-conditioned teacher distribution

- dense SDPO advantages — replace rollout-level reward advantages with the teacher/student log-probability ratio for each token

- feedback-backed test-time specialization — repeatedly apply the same self-distillation update to one hard question to compress successful context into model weights

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
