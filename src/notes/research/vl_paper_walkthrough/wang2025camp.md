# CAMP in the Odyssey: Provably Robust Reinforcement Learning with Certified Radius Maximization
(authored by agents unless marked 🧑)
Tag: `wang2025camp`, [paper](https://www.usenix.org/conference/usenixsecurity25/presentation/wang-derui)

## problem and certification setting

Wang et al. (USENIX Security 2025) train deep-Q agents with discrete actions so that the expected return of a smoothed (noise-randomized) policy can be certified against a bounded sequence of adversarial observation perturbations. Their method, Certified-rAdius-Maximizing Policy (CAMP), combines policy smoothing, a soft global radius and per-step local radii, a Q-gap robustness loss, and policy imitation from a reference network. The motivation is that existing certifiable policies are trained with plain Gaussian augmentation, and, in the paper's words, “the augmentation does not directly maximize the certified radius during training”.

The environment is a discrete MDP observed over a finite horizon T, with fully observable states. At each step, the attacker perturbs the observation, not the underlying state used for transitions and rewards. The perturbation sequence ∆ = (δ0, …, δT−1) has an ℓ2 norm ‖∆‖2 = √(Σt ‖δt‖2²) of at most τ. The defender adds Gaussian noise N(0, σ²I) to observations during training and certification. Certification gives a probabilistic (confidence 1−α) lower bound on expected return for all perturbation sequences with ‖∆‖2 ≤ τ, using an adaptive Neyman–Pearson lemma based on a structured adversary (Kumar et al., policy smoothing). The threat model section begins: “CAMP operates during the training stage of DRL agents.”

## technique: empirical policy-smoothing certificate

What it is. Run the noised policy on m random trajectories, collect returns R={r1,…,rm}, and form an empirical CDF. The Dvoretzky–Kiefer–Wolfowitz inequality gives a confidence interval for the true CDF; the upper CDF bound yields a lower bound on the probability Pπz(C) that the return is at least each threshold C. An adaptive Neyman–Pearson lemma (Equation 5) transfers this probability bound to every perturbation sequence with norm at most τ, and Equation 6 sums these per-threshold bounds into a lower bound on expected return. This certificate is prior work (policy smoothing); CAMP reuses it unchanged.

How to do it.

1. For each episode step t sample εt from N(0,σ²I), feed st+εt to the policy, take the greedy action, and record the return r (the experiments compute the certification return with γ = 1).
2. Repeat for m rounds and sort returns r1≤…≤rm.
3. Compute ECDF Ψ̃(C)=Σ1{ri<C}/m and add √(ln(2/α)/(2m)) to obtain a CDF upper bound that holds with probability 1−α (Equation 4).
4. Use Equation 6 to obtain a lower bound on expected return for every perturbation sequence with ‖∆‖2≤τ.
5. The certified radius is the largest τ for which that lower bound is at least a target ξ; it is “usually determined by binary search”.

The paper states, “By sampling Fπ(z) values for m times via allowing the agent to play on random trajectories for m runs, a set R = {r1, ..., rm} of return values sorted in ascending order can be obtained to compute an empirical cumulative distribution function (ECDF)”.

Verus form (Inference: CAMP is a neural-RL method, not a Rust verifier). A Verus wrapper can specify a deterministic certificate computation over a finite `Seq` of returns: prove sorting, the ECDF count, and the arithmetic confidence bound with `requires` and `ensures`. Gaussian sampling, neural-network inference, and floating-point confidence calculations must remain in a trusted or separately validated numerical layer. A proof of the formula does not prove the random samples are independent or that the environment satisfies the assumed model.

Evidence and limits. Each certification run uses return values from 10000 game rounds. For Cartpole and Pong1r, whose agents get 0/1 reward per step, the paper uses per-step Clopper–Pearson point estimates of the CDF and sums them; for Highway, Freeway, and Bank Heist it uses exact CDF smoothing. Inference: α, m, σ, and the return range determine the certificate, so changing them changes the result; the paper text does not state the α used.

## technique: change of variables for a substitute radius

What it is. The certified radius is the largest τ for which Equation 6's bound is at least ξ; it is found by search, so it is a variable, not a differentiable function of the policy. Theorem 1 changes variables: with the smallest sampled return r1 and probability Pπz(r1), if ξ/r1 ≤ Pπz(r1) and ‖∆‖2 ≤ σ[Φ⁻¹(Pπz(r1))−Φ⁻¹(ξ/r1)], then E[Fπ(z′)] ≥ ξ. The proof (Appendix A) keeps only the r1 term of Equation 6 and drops the nonnegative sum. The paper reads this as τ = σ[Φ⁻¹(Pπz(r1))−Φ⁻¹(ξ/r1)], a substitute radius that depends on the Q-network π, the statistic Pπz(r1), and ξ.

How it is used. Theorem 1 is an analysis step, not a training loss: “However, the substitute certified radius remains non-differentiable at this stage.” The paper then turns to the soft radius (Theorem 3) and local radii (Theorem 4) below, and certifies the trained policy with the unchanged smoothing procedure.

Verus form (Inference). Encode the change-of-variable identity as a pure specification over rational or fixed-point approximations and prove monotonicity under stated positivity conditions. Do not use it as evidence that a floating-point implementation computes a mathematically exact inverse CDF. The numerical library and approximation error need separate contracts.

## technique: soft and local certified radii

What it is. Lemma 1 (from Salman et al. and CROP) says the smoothed return E[Fπ(z)] of a return function bounded in [A,B] is ((B−A)/σ)·√(2/π)-Lipschitz. Theorem 3 uses this to derive a global soft radius: for target ξ ≤ E[Fπ(z)], the expected return stays at least ξ if
`‖∆‖2 ≤ σ[Φ⁻¹((E[Fπ(z)]−A)/(B−A)) − Φ⁻¹((ξ−A)/(B−A))]`.
The paper calls this radius loose but positively correlated with the Theorem 1 radius; with ξ fixed, enlarging it means raising the expected return over randomized trajectories. Theorem 4 then works per step: with li and ui the lower and upper bounds of the expected action value at step i, the optimal expected return from step t to T−1 is not reduced if each δi satisfies
`‖δi‖2 ≤ (σ/2)[Φ⁻¹((Q̄(si,ai(1))−li)/(ui−li)) − Φ⁻¹((Q̄(si,ai(2))−li)/(ui−li))]`,
where ai(1) and ai(2) are the top-1 and runner-up actions of the optimal expected action-value function Q̄π∗. The paper says, “Maximizing the Q-gap at each step reduces action errors, thereby enhancing the global certified radius.”

How it is used. The paper does not compute li, ui, or Equation 16 during training. It uses Theorem 4 only to justify a surrogate: a larger gap between the top-1 and runner-up Q-values gives a larger local radius, so training maximizes that Q-gap (next technique). This avoids optimizing a binary-search output directly.

Verus form (Inference). Represent each step's Q bounds and radius in a ghost record and prove that the sum of local perturbation norms is below the global budget. Floating-point neural Q-values require interval contracts; a Verus proof can establish the bound only for those intervals, not for an unmodeled network.

Evidence and limits. Theorem 4 assumes a greedy policy and an optimal expected action-value function; the conclusion admits CAMP “selects the top-1 and runner-up Q-values based on a presumed optimal policy, which may not be fully captured by the reference network.” The paper also states, “CAMP currently supports only discrete action spaces.” The threat model covers only observation perturbations, not attackers that change transitions or rewards.

## technique: Q-gap robustness loss

What it is. CAMP penalizes a small margin between top-1 and runner-up Q-values under a noised observation (Equation 17). Let a(1) be the primary network's top action on s+ε and a(2) its runner-up. The loss is λ·1{Qπ̃(s+ε,a(1)) ≥ Qπ̃(s+ε,a(2))}·max(0, η−[Qπ(s+ε,a(1))−Qπ(s+ε,a(2))]): it applies only when the reference network π̃ also ranks a(1) at least as high as a(2) (a prerequisite check). η is the hinge offset and λ the loss coefficient. The reason for the check: “Note that the predicted action may differ from the optimal a(1) and a(2) required by Theorem 4.”

How to apply it. Sample s+ε; compute the primary top two actions; check the reference network's ordering; calculate the margin; apply the hinge with offset η and coefficient λ; this term produces gradients only for the primary network. In the experiments η is adaptive: η = max Qπ(s,a) − min Qπ(s,a) over the current trajectory batch. The ablation trains Cartpole agents with λ ∈ {0.5, 1, 2, 4, 8, 16}.

Verus form (Inference). A Rust specification can state `Q_top - Q_runner >= eta` as a postcondition for a certified policy step. Prove the ordering with inequalities and an explicit tie-breaking rule. This proves a margin for supplied Q values, not robustness of a neural network to arbitrary real inputs.

## technique: policy imitation with a reference network

What it is. A reference Q-network π̃ is trained with the ordinary TD utility loss on noised observations (Equation 11). The primary network π minimizes the robustness loss plus a cross-entropy imitation loss toward the reference network's softmax action distribution on the same noised observation. The reason: “We found that attaching the robustness loss to the TD loss during training is unsuitable, as it leads to overestimation of Q-values.”

How to apply it (Algorithm 1).

1. Initialize primary π, reference π̃, and a reference target network π̃′ ← π̃.
2. During burn-in (t ≤ tb), sample random actions and store transitions alternately (by step parity) into replay buffers Z and Z̃.
3. Afterwards, on even steps act with π and store into Z; on odd steps act with π̃ and store into Z̃.
4. Each step, sample a batch of size N from each buffer. Algorithm 1 updates π̃ with the gradient of ℓCAMP on the Z̃ batch and π with the gradient of ℓCAMP on the Z batch; the text says only ℓut produces gradients for π̃ and only ℓro and ℓim for π. Note: the prose just before Algorithm 1 states the opposite buffer assignment (“samples trajectories from Z̃ to minimize the robustness loss and the imitation loss, while sampling from Z to minimize the utility loss”); the paper does not resolve this.
5. Compute imitation cross-entropy `−Σ Softmax(π̃(s+ε))i log Softmax(π(s+ε))i` (Equation 18).
6. Every △ steps, update the reference target network: π̃′ ← kπ̃ + (1−k)π̃′ (the experiments use Polyak rate 1).

Algorithm 1 inputs include batch size N, burn-in steps tb, learning rate α, noise scale σ, Polyak rate k, and target update frequency △. The final loss is `ℓCAMP = ℓut(π̃)+ℓro(π,π̃)+ℓim(π,π̃)` (Equation 19).

Verus form (Inference). Treat the reference policy as an explicit ghost or immutable specification function and prove that a selected action satisfies the reference ordering and margin. A proof function may establish the loss decomposition, but gradient descent and neural updates remain outside Verus's logical kernel. Never mark the network function `external_body` and present that as a proof of its behavior.

## evidence, what is proved, and what remains trusted

Theorems 1 and 3 have full proofs in the paper; Theorem 4 has a proof sketch in Section 4.2 and a proof in Appendix A. The experiments use five environments: Cartpole (single-frame Cartpole-1 and five-frame Cartpole-5), Highway, Freeway, Pong1r (one-round Pong), and Bank Heist. DQN uses an MLP for Cartpole and Highway and Nature CNN for the Atari games. Atari reference networks train for 10 million steps; the primary network then trains for an extra 1 million steps with the reference network fixed. Baselines are Gaussian augmentation and NoisyNet, certified with the same policy-smoothing method; NoisyNet is left out of the Atari comparison because it “consistently underperformed Gaussian”.

Reported results (from figures, so no exact certified numbers are in the text): CAMP's certified expected returns are higher than the baselines in Cartpole and Highway; the largest gain is “in Cartpole-5 at σ = 0.4, where CAMP doubles the certified return against adversaries with budgets between 0.2 and 1.0”. Atari gains are “more subtle”. Table 2 reports that the minimal Q-gap over 10000 Cartpole games is 0 for Gaussian and NoisyNet agents and mostly small but nonzero for CAMP agents. Table 3 reports that CAMP takes about twice the GPU hours of Gaussian training in most environments (e.g. 13.78 versus 7.00 hours on Highway). Inference: these are single-configuration results per environment and architecture; the paper text does not report seeds or confidence intervals for the certified curves.

Inference: trusted components include the environment transition and reward implementation, neural-network arithmetic, random-number generator, Monte Carlo independence, the DKW confidence inequality, the policy-smoothing theorem, and the assumption that the attacker perturbs observations only. The certificate assumes bounded returns, independent samples, and fully observable states (the paper assumes states “are fully observable by a deterministic observation function”).

Inference: for agent-written verified Rust, CAMP's most useful lesson is to separate a utility specification from a robustness margin and to keep a reference behavior stable while optimizing a safety objective. A Verus contract can prove action margins and bounded perturbation arithmetic for an abstract policy, but it cannot by itself certify a floating-point neural policy, stochastic environment, or statistical confidence interval. The product threat is treating empirical robust returns as a universal safety proof; the safe integration is to use the certificate as a monitored assumption and verify the deterministic control wrapper separately.

## what VL should not redo

The paper already provides the smoothing-certificate usage, Neyman–Pearson transfer, change-of-variable radius, Lipschitz soft radius, local Q-gap theorem, Q-gap loss, reference-policy imitation, and a complete training loop (Algorithm 1). Inference: VL should reuse these as conceptual patterns rather than re-derive them for a Rust service unless its threat model includes observation perturbations and a discrete policy.

## techniques for the catalog

- empirical smoothing certificate: estimate randomized-return CDFs and transfer them to bounded observation perturbations
- radius change of variables: replace binary-searched τ with a policy-dependent inverse-CDF expression
- soft and local radii: derive global and per-step bounds from Lipschitz smoothed return and Q-gaps
- Q-gap loss: maximize the noisy top-1 versus runner-up action margin, with a reference-policy prerequisite check
- policy imitation: stabilize robustness training with a TD-trained reference network and separate replay buffers
Checked 2026-10-16 against the full paper by a Claude agent (mid-paper quote: "It can be observed that CAMP does not degrade the training performance in noise-free environments, supporting the versatility of CAMP."): read all 1401 lines of the paper text (body, Appendices A–C, references) and checked every quotation, number, equation, section/algorithm reference, and technique step; changed the link to the publisher page in the paper text, corrected the budget (ℓ2 norm, not squared), the Theorem 1 condition, how Theorems 1 and 4 are used (analysis, not computed in training), the full Theorem 4 bound, the ECDF quote (was cut mid-sentence), the burn-in and buffer steps of Algorithm 1 plus the paper's own buffer inconsistency, and replaced vague evidence claims with reported figures, tables, and costs; marked agent conclusions "Inference:"; did not check the PDF figures (curves not in the text) or the authors' code.
