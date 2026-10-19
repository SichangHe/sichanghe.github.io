# The Choice of Divergence: A Neglected Key to Mitigating Diversity Collapse in Reinforcement Learning with Verifiable Reward
(authored by agents unless marked 🧑)
Tag: `li2026divergence`, [paper](https://arxiv.org/abs/2509.07430)

## claim and setting
Li et al. study RL with verifiable rewards (RLVR), where a checker supplies reward for generated SQL or mathematics. They identify a mismatch between one-shot and multi-attempt quality. The abstract says: “A central paradox in fine-tuning Large Language Models (LLMs) with Reinforcement Learning with Verifiable Reward (RLVR) is the frequent degradation of multi-attempt performance (Pass@k) despite improvements in single-attempt accuracy (Pass@1).” Their proposal, Diversity-Preserving Hybrid RL (DPH-RL), uses mass-covering f-divergences against an initial policy as rehearsal.

The paper compares GRPO, DAPO, reverse-KL, forward-KL (DPH-F), JS (DPH-JS), and α-divergence. Llama-3.1-8B-Instruct SQL results in Table 1 (page 7) report greedy accuracy and Pass@8/16 in percent. Figure 6 (page 22) reports three training runs per method and says: “We then selected the model that achieved the highest pass@16 score on the Bird.” On Bird, base Pass@8 is 68.8 and DPH-F 70.1; DPH-JS (Generator) with η=0.2 is 70.5. On Spider, base Pass@16 is 93.2, DPH-F 85.7, and DPH-JS divergence-definition η=0.2 is 86.7. These are task scores, not proof probabilities. The paper also reports Qwen and 32B experiments, but model and dataset settings must accompany every comparison.

## technique 1: partition data by verifier success
Use this when a verifier can label sampled solutions and easy items should retain existing capability while hard items need exploration. The paper's pre-sampling steps (section 4.1, page 4) are:

1. For every query Q, generate and evaluate k independent samples under the reference model πref.
2. Classify each query as near-perfect or exploration using a correctness threshold, producing Dpef and Dexp.
3. For Dpef, draw one additional sample; retain the query only if that sample is correct, otherwise discard it or move it to Dexp.
4. In the generator implementation, apply retention regularization on Dpef and no divergence penalty on Dexp during training (section 4.2.1, page 5).

The motivation is explicit: “This partition allows our agent to focus on challenging examples in Dexp while using a KL divergence constraint to maintain performance on mastered examples in Dpef.” Llama uses a 6-of-8 threshold and Qwen a 7-of-8 threshold (section 5, page 6), so the required number of correct attempts differs by model. The conclusion instead recommends: “We explicitly recommend the DPH-JS (Generator) variant with the ‘8 of 8’ threshold as the optimal configuration for future researchers.” In this setting, all eight sampled trajectories per retained query are used (section 6.2, page 10).

Inference: For Verus proof generation, Dpef can contain specifications where a baseline model produces a verified proof in at least the threshold number of attempts; Dexp contains specifications needing search. The verifier is Verus compilation plus proof checking. Rust code can carry the generated proof, but the thresholding and model sampling remain an external training pipeline.

## technique 2: generator-based mass-covering regularization
The objective is

`max E[r(a|q)] − η Df(πθ(·|q) || πref(·|q))`.

Forward-KL is defined with the reference on the left, `DKL(πref || πθ)`. Its expectation is estimated using stored reference responses. JS gives a symmetric alternative. The generator implementation steps (sections 4.2.1–4.2.2, page 5) are:

1. Pre-sample responses from πref before online training; this makes a static dataset.
2. On Dexp, optimize the standard PPO-clip objective with no KL term.
3. On Dpef, estimate the reference-policy expectation of `log(πref/πθ)` for forward-KL, or of the JS generator `f(u) = [u log u − (u+1) log((u+1)/2)]/2`, using `u=πθ/πref`. Inference: because responses are already sampled from πref, a Monte Carlo average does not multiply each sampled log ratio by πref again.
4. Combine losses as `LDPH-RL = Lexp + η Lpef`.

The paper emphasizes the systems consequence: “Our implementation relies on pre-sampling from the reference policy. This approach allows us to compute the divergence term using a static dataset, eliminating the need to run inference with the reference model during the online training loop.” The abstract explains why reverse-KL differs: “The reverse-KL actively accelerates this decay by narrowing the policy, while its absence provides no safeguard against the model drifting from its diverse knowledge base.” Appendix F (page 19) describes a separate JS divergence-definition implementation: it adds a current-policy-to-mixture KL term on Dexp and requires an online reference model. The no-divergence-on-Dexp step above applies to the generator implementation.

Inference: A VL pipeline can partition specifications by repeated baseline verification success, retain verified proof attempts for near-perfect specifications as Dpef, and train proof generation with a divergence loss that preserves multiple proof shapes. Verus itself has no probability distribution or gradient loss; the model-training code is outside Verus. Verus can check each retained proof; verification success could supply a binary reward.

## technique 3: conditional monotonic-improvement guarantee
The paper defines a conditional reference policy πpef: stored correct trajectories on Dpef and the current policy on Dexp, making the divergence zero for exploration states. It assumes expected advantage of πpef actions is at least δ≥0, with δ=0 for Dexp, and states an enhanced TRPO lower bound (Theorem 1, section 4.3, pages 5–6; proof in Appendix J, pages 26–27). The claimed improvement over the standard bound requires its extra term to be positive: `δ/(1−γ) − Cf γ α2 εpef/(1−γ)^2 > 0`. The paper motivates this with positive reference advantage and a small divergence from πpef. This is an assumption-dependent mathematical claim, not an empirical pass rate. The paper states: “On the exploration set Dexp, the bound gracefully reduces to the standard TRPO guarantee.”

Inference: For verified Rust, an analogous argument could condition regularization on previously verified proof traces, but the theorem does not transfer automatically: Verus proof search is discrete, reward can be sparse, and advantage estimates are model-training quantities. Treat the guarantee as guidance for a trainer, not as a Verus theorem.

## evidence, trust, and limits
Evidence spans SQL (Bird and Spider) and mathematics, using Llama 3.1 and Qwen families from 7B to 32B. Pass@k samples are generated repeatedly; table captions identify k and model. Inference: applying this method to proof generation requires a reliable verifier and reference samples that cover useful proofs. It does not show that forward-KL is universally best, and some DPH scores remain below the base model on cross-domain Spider. The paper identifies a limitation in its conclusion (page 10): “However, a key limitation, shared with GRPO, is the dependence on the base model’s capabilities, which become scarce on more challenging datasets.” Inference: diversity-preserving training might improve the variety of generated Rust proofs, but the paper provides no Verus experiments. The model-training procedure and its theorem do not establish proof validity; each generated proof still needs checking by Verus.

## techniques for the catalog
- verifier-based data partition: split queries into near-perfect and exploration sets using repeated checked samples
- mass-covering rehearsal: use forward-KL or JS against a frozen reference, estimated from pre-sampled responses
- conditional policy guarantee: analyze a conditional reference policy under an assumption about its advantage
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We explicitly recommend the DPH-JS (Generator) variant with the ‘8 of 8’ threshold as the optimal configuration for future researchers."): read the full paper, including references and appendices; checked quotations, reported numbers, model settings, page and section references, and technique steps; corrected page references, the forward-KL sampling description, threshold wording, and JS implementation scope, added the recommended configuration and selection procedure, and marked proof-generation extrapolations as inferences; did not reproduce experiments, inspect code, or independently validate the theorem proof.
