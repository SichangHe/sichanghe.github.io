# Does Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model?
(authored by agents unless marked 🧑)
Tag: `yue2025reinforcement`, [paper](https://arxiv.org/abs/2504.13837)

## formal-verification content

The authors' main claim is that current RLVR usually concentrates probability on paths already available in the base model. The abstract reports that RLVR models can beat base models at k=1 while base models win at large k; it also reports that distillation can add new patterns. The paper states: “While RLVR improves sampling efficiency towards correct paths, we surprisingly find that current training rarely elicit fundamentally new reasoning patterns.” (abstract, PDF p. 1). Inference: this is a claim about the tested model families and tasks, not a universal theorem. The paper itself says its conclusions "should be interpreted with awareness of these practical constraints" (section 7, PDF p. 13).

## technique: deterministic verifiable reward

What it is. Let πθ generate y from prompt x. A deterministic verifier V returns r=V(x,y)∈{0,1}, with r=1 exactly when the final answer is correct (section 2.1, PDF p. 3). RL maximizes expected reward over the prompt distribution. For programming tasks, V is a compiler and predefined unit test cases; for mathematics, it checks the final answer, and the paper manually checks chain-of-thought correctness on a subset of outputs to detect accidental guessing (section 2.2, PDF p. 5). A format reward may also be added (section 2.1, PDF p. 3).

How to apply it. (1) Specify the answer format and an executable V. (2) Generate multiple responses. (3) Assign reward only from V and optionally a separate format reward. (4) Optimize a policy with PPO, GRPO, Reinforce++, RLOO, ReMax or DAPO (the six algorithms the paper compares in section 4.3, PDF p. 9). (5) Evaluate base and RL models with "the same zero-shot prompt as in RLVR training, or the default prompt provided by the benchmark" (section 3, PDF pp. 5-6), and report the benchmark and verifier. The paper uses temperature 0.6, top-p 0.95 and a 16,384-token maximum for its broad comparison (section 3, PDF p. 5); exceptions are 32k response length for the two code models in section 3.2 (PDF p. 7) and a 40k context for Magistral-Medium (section 4.6, PDF p. 11). The paper warns that in mathematics a model "may generate an incorrect CoT but still accidentally arrive at the correct answer" (section 2.2, PDF p. 5), so it manually inspects chains: on GSM8K problems with average accuracy below 5%, the base model answered 25 such questions, 24 with at least one correct chain-of-thought; the RL model answered 25, 23 with one; on AIME24 the base model had 5 of 6 (one ambiguous case excluded) and the RL model 4 of 6 (section 3.1, PDF p. 6; details in Appendix C.2).

Verus form. Inference: V can be a Rust executable whose correctness is established by Verus contracts, for example a parser with `requires` on input format and `ensures` that accepted outputs satisfy a specification. This creates a proof-backed reward checker. The model and optimizer remain untrusted; only the verifier's decision supplies reward. A `proof fn` should establish verifier lemmas, while the executable wrapper calls ordinary Rust functions.

Evidence and assumptions. Table 1 spans mathematics, code generation, visual reasoning and a "Deep Analysis" setup, with Qwen, LLaMA, DeepSeek-R1-Distill and Qwen2.5-VL models and the RL frameworks SimpleRLZoo, Oat-Zero, DAPO, Code-R1, DeepCoder, EasyR1 and VeRL (section 2.2, PDF p. 5). Inference: the result depends on the verifier, prompt, sampling temperature and benchmark; it does not show that a reward captures semantic correctness outside those checks.

## technique: pass@k as a reasoning-boundary test

The metric defines pass@k for a problem as 1 if at least one of k sampled outputs passes V, otherwise 0; the dataset mean is the fraction of problems solvable within k trials (section 2.2, PDF p. 5). The paper says: “Given a problem, we sample k outputs from the model.” (section 2.2, PDF p. 5). It uses the unbiased low-variance estimator of Chen et al. (2021), described in Appendix A.2 (PDF p. 19), with n samples per problem (n ≥ k) set to the largest k on each curve, typically 128, 256 or 1024. This differs from best-of-N or majority voting: pass@k asks whether any correct path exists, rather than which answer a selector would choose.

Use it by fixing model, prompt, temperature, top-p, maximum length and benchmark, then evaluating k over powers of two up to n (the paper's curves end at 128, 256 or 1024 depending on benchmark; Figure 2 uses 1024 for AIME24 and AMC23, 128 for MATH500, Minerva and GSM8K). Report the denominator as the number of benchmark problems. In Table 2, AIME24 uses k=1024 and MATH500 k=128: for SimpleRLZoo versus its base, both solve 63.3% and 92.4%, base-only is 13.3% and 3.6%, RL-only is 0.0% and 1.0%, and neither is 23.3% and 3.0% (section 4.1, PDF p. 8). Percentages are fractions of the respective benchmark sets at the stated k.

Paper caveat: with astronomically large k even uniform sampling over tokens would find a correct path, though the base model already produces correct outputs at k = 128 or 1024 (section 2.2, PDF p. 5).

## technique: compare distributions, coverage and perplexity

The paper combines three tests. First, accuracy histograms compare how often base and RL outputs fall into each accuracy interval. Second, solvable-set analysis compares questions each model solves at fixed k. Third, perplexity evaluates RL-generated responses under the base model: for response Y, PPLm(Y|x) is exponentiated average negative log likelihood (section 4.1, PDF p. 8). They randomly sample two AIME24 problems, 16 responses each from Qwen2.5-7B-Base and SimpleRL-Qwen2.5-7B-Base, and eight from OpenAI-o1; the paper says the distribution of PPL_Base(Y_RL|x) "closely matches the lower portion of the PPLBase(YBase|x) distribution" (section 4.1, PDF p. 8). Appendix C.4 (PDF p. 23) adds that PPL_Base(Y_RL|x) decreases over RL training, measured on the first 10 problems.

The paper's conclusion is: “These findings indicate that RLVR does not introduce fundamentally new reasoning capabilities and that the reasoning capacity of the trained model remains bounded by that of its base model.” (section 4.1, Summary, PDF p. 9). This is an inference from sampled distributions, not a formal containment proof.

## technique: distillation to expand coverage

Distillation trains a student on long reasoning traces produced by a stronger teacher. The study compares the base Qwen2.5-Math-7B, its RLVR model Qwen2.5-Math-7B-Oat-Zero, Qwen2.5-Math-7B-Instruct as an additional baseline, and DeepSeek-R1-Distill-Qwen-7B, which distills DeepSeek-R1 into Qwen2.5-Math-7B (section 4.2, PDF p. 9). In Figure 7 (Minerva) the distilled model's pass@k curve is "consistently and significantly above that of the base model", which the authors interpret as "new reasoning patterns learned from a stronger teacher model" (section 4.2, PDF p. 9). Inference: a proof-agent could distill verified proof traces or lemma sequences, but every generated Rust proof still requires independent Verus checking; teacher correctness cannot be assumed.

## technique: sampling-efficiency gap and training ablations

Define ΔSE as RL pass@1 minus base pass@256; lower is better, with base pass@256 used as an empirical upper bound (section 4.3, PDF p. 9). The authors reimplement PPO, GRPO, Reinforce++, RLOO, ReMax and DAPO in VeRL without the KL term, with AdamW at constant learning rate 1e-6, train on 2,000 Omni-MATH-Rule examples, test on 821 in-domain examples and MATH500 out of domain, with eight responses per prompt, prompt batch size 256 and 8,192-token maximum rollout (section 4.3, PDF p. 9). The text reports ΔSE "ranging from GRPO's 43.9 to RLOO's best 42.6 on the in-domain test set" and "consistently above 40 points". Inference: these text values do not follow from Table 3 by subtraction (69.1 − 25.1 = 44.0 for GRPO; 69.1 − 28.1 = 41.0 for RLOO), and Figure 8 labels the in-domain top panel with ΔSE = 0.410, so the RLOO figure in the text appears inconsistent with the paper's own table. Table 3 gives exact pass@1/pass@256 pairs; for example, GRPO is 26.1/66.3 on training, 25.1/68.3 in-domain and 74.4/97.2 on MATH500 (Appendix C.5, PDF p. 23).

Training longer raises Omni-MATH training pass@1 from 26.1 at step 150 to 42.5 at step 450, while pass@256 falls from 66.3 to 64.3; on MATH500, pass@1 rises 74.4 to 76.3 while pass@256 falls 97.2 to 95.4 (Table 4, Appendix C.5, PDF p. 23). Increasing rollouts n from 8 to 32 improves pass@k slightly but the RL model is still eventually outperformed by the base model (n = 32 was trained only 220 steps, Figure 16); a KL coefficient 0.001 gives "similar pass@1 to GRPO without KL, but with a much lower pass@128" (section 4.4, PDF p. 10; Appendix C.6, PDF p. 24). These denominators are benchmark problems and sampled outputs, not deployed tasks.

## techniques for the catalog

- executable verifiable reward: train against a deterministic checker whose accepted outputs satisfy a stated condition
- pass@k boundary measurement: estimate the fraction of benchmark problems solvable within k independent samples
- distribution and perplexity analysis: test whether trained outputs are already likely under the base model
- reasoning-trace distillation: transfer long teacher traces to expand a student's sampled coverage
- sampling-efficiency gap: compare RL pass@1 with base pass@256 under fixed denominators
- training ablations: vary steps, rollout count, KL regularization and sampling temperature (entropy matching, section 4.5) while reporting pass@k
