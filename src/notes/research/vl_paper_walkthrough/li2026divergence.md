# The Choice of Divergence: A Neglected Key to Mitigating Diversity Collapse in Reinforcement Learning with Verifiable Reward
(authored by agents unless marked 🧑)
Tag: `li2026divergence`, [paper](https://arxiv.org/abs/2509.07430)

## claim and setting
Li et al. study RL with verifiable rewards (RLVR), where a checker supplies reward for generated SQL or mathematics. They identify a mismatch between one-shot and multi-attempt quality. The abstract says: “A central paradox in fine-tuning Large Language Models (LLMs) with Reinforcement Learning with Verifiable Reward (RLVR) is the frequent degradation of multi-attempt performance (Pass@k) despite improvements in single-attempt accuracy (Pass@1).” Their proposal, Diversity-Preserving Hybrid RL (DPH-RL), uses mass-covering f-divergences against an initial policy as rehearsal.

The paper compares GRPO, DAPO, reverse-KL, forward-KL (DPH-F), JS (DPH-JS), and α-divergence. Llama-3.1-8B-Instruct SQL results in Table 1 are percentages over Pass@k samples (three training runs for error bars). On Bird, base Pass@8 is 68.8 and DPH-F 70.1; DPH-JS with η=0.2 is 70.5. On Spider, base Pass@16 is 93.2, DPH-F 85.7, and DPH-JS divergence-definition η=0.2 is 86.7. These are task scores, not proof probabilities. The paper also reports Qwen and 32B experiments, but model and dataset settings must accompany every comparison.

## technique 1: partition data by verifier success
Use this when a verifier can label sampled solutions and easy items should retain existing capability while hard items need exploration. The paper's pre-sampling steps (section 4.1, page 4) are:

1. For every query Q, generate and evaluate k independent samples under the reference model πref.
2. Classify each query as near-perfect or exploration using a correctness threshold, producing Dpef and Dexp.
3. For Dpef, draw one additional sample; retain the query only if that sample is correct, otherwise discard it or move it to Dexp.
4. During training, apply retention regularization on Dpef and no divergence penalty on Dexp.

The motivation is explicit: “This partition allows our agent to focus on challenging examples in Dexp while using a KL divergence constraint to maintain performance on mastered examples in Dpef.” Llama uses a 6-of-8 threshold and Qwen a 7-of-8 threshold (section 5, page 6), so the denominator is eight attempts and differs by model.

Inference: For Verus proof generation, Dpef can contain specifications where a baseline model produces a verified proof in at least the threshold number of attempts; Dexp contains specifications needing search. The verifier is Verus compilation plus proof checking. Rust code can carry the generated proof, but the thresholding and model sampling remain an external training pipeline.

## technique 2: generator-based mass-covering regularization
The objective is

`max E[r(a|q)] − η Df(πθ(·|q) || πref(·|q))`.

Forward-KL is defined with the reference on the left, `DKL(πref || πθ)`, and is estimated by sampling once from πref. JS gives a symmetric alternative. The implementation steps (section 4.2.1, pages 5–6) are:

1. Pre-sample responses from πref before online training; this makes a static dataset.
2. On Dexp, optimize the standard PPO-clip objective with no KL term.
3. On Dpef, compute the forward-KL loss as the reference sample's probability times `log(πref/πθ)`, or compute the JS generator loss using `u=πθ/πref`.
4. Combine losses as `LDPH-RL = Lexp + η Lpef`.

The paper emphasizes the systems consequence: “Our implementation relies on pre-sampling from the reference policy. This approach allows us to compute the divergence term using a static dataset, eliminating the need to run inference with the reference model during the online training loop.” It also explains why reverse-KL differs: “the reverse-KL actively accelerates this decay by narrowing the policy”.

Inference: A VL pipeline can pre-sample alternative proof attempts from an initial model, retain verified attempts as Dpef, and train proof generation with a divergence loss that preserves multiple proof shapes. Verus itself has no probability distribution or gradient loss; the model-training code is outside Verus. Verus can check each retained proof and can expose counterexample/error feedback as the reward.

## technique 3: conditional monotonic-improvement guarantee
The paper defines a conditional reference policy πpef: stored correct trajectories on Dpef and the current policy on Dexp, making the divergence zero for exploration states. It assumes expected advantage of πpef actions is at least δ, with δ=0 for Dexp, then proves an enhanced TRPO lower bound (Theorem 1, section 4.3, pages 6–7). This is a mathematical guarantee under the assumption, not an empirical pass rate. The paper states: “On the exploration set Dexp, the bound gracefully reduces to the standard TRPO guarantee.”

Inference: For verified Rust, an analogous argument could condition regularization on previously verified proof traces, but the theorem does not transfer automatically: Verus proof search is discrete, reward can be sparse, and advantage estimates are model-training quantities. Treat the guarantee as guidance for a trainer, not as a Verus theorem.

## evidence, trust, and limits
Evidence spans SQL (Bird and Spider) and mathematics, using Llama 3.1 and Qwen families from 7B to 32B. Pass@k samples are generated repeatedly; table captions identify k and model. The method assumes a correct verifier and representative reference samples. It does not show that forward-KL is universally best, and some DPH scores remain below the base model on cross-domain Spider. The reference model, sampling randomness, reward checker, optimizer, and theorem assumptions remain trusted. Inference: the threat to agent-written verified Rust is moderate: diversity-preserving training may produce more alternative proofs and reduce collapse, but Verus's deterministic checker catches invalid outputs after generation.

## techniques for the catalog
- verifier-based data partition: split queries into near-perfect and exploration sets using repeated checked samples
- mass-covering rehearsal: use forward-KL or JS against a frozen reference, estimated from pre-sampled responses
- conditional policy guarantee: disable regularization for exploration states and prove an assumption-dependent improvement bound
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
