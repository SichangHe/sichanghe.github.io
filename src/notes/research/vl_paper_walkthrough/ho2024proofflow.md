# Proof Flow: Preliminary Study on Generative Flow Network Language Model Tuning for Formal Reasoning
(authored by agents unless marked 🧑)
Tag: `ho2024proofflow`, [paper](https://doi.org/10.48550/arxiv.2410.13224)

Proof Flow studies Generative Flow Network (GFlowNet) fine-tuning for Lean tactic generation. It treats a proof as a trajectory through Lean states and trains a policy to sample complete proofs in proportion to reward, with the aim of preserving diverse high-reward search paths. The paper calls its results early and preliminary: on a 20-theorem holdout, the full GFlowNet reaches 9 solved theorems at its best validation point, while supervised fine-tuning (SFT) reaches the same 9 and the base model 4 (Table 1, PDF p. 10). The abstract says: “Unlike classical reward-maximization reinforcement learning, which frequently over-exploits high-reward actions and fails to effectively explore the state space, GFlowNets have emerged as a promising approach for sampling compositional objects, improving generalization, and enabling models to maintain diverse hypotheses.” (Abstract, p. 1)

## encode Lean proof search as trajectories

What it is and when to use it. Each tactic is an action, each intermediate Lean proof state is a node, and a terminating sequence is a proof trajectory. The forward policy `P_f(t|s)` conditions on the current state, all previous tactics, and the initial state. This is useful when the same Lean state can be reached through multiple tactic sequences: including history makes the graph a tree with one parent per state and removes the need to learn a difficult backward inverse policy (Section 2, p. 2).

How to do it. (1) Initialize the Lean proof state. (2) Represent state as `(initial_state, tactics_so_far, current_state)`. (3) Sample a tactic from the forward policy. (4) Run it in Lean to obtain the next state; syntactically invalid tactics cannot advance. (5) Append the tactic and state until proof completion or a failure/maximum depth. (6) Store the trajectory and its log probability for the training objective. The paper states: “Instead of representing a partially constructed proof by just its current proof state, we include its initial state and all previous tactics.” (Section 2, p. 2)

Inference: In Verus, model a proof attempt as a sequence of edits to Rust contracts, assertions, and proof functions, with the verifier producing the next diagnostic state. Include the edit history if distinct proof scripts can reach the same diagnostic. This is an orchestration model; Verus still checks the final code and has no GFlowNet primitive.

Evidence and limits. The authors use ReProver initialized from ByT5-small (350M parameters), a single A100 40GB GPU, 1,000 training theorems, and 20 validation theorems (Section 3, p. 3; Appendix D.1, p. 9). They restrict ground-truth proofs to three or fewer tactics, state length under 900 tokenizer tokens, tactic length under 90, and Dojo initialization under five seconds (Appendix D.1, p. 9). These filters make the result a small proof-search study, not evidence for long product proofs.

## history-augmented GFlowNet and trajectory balance

What it is and when to use it. GFlowNets train a policy so terminal proof probability is proportional to a non-negative reward rather than concentrated on one maximum-reward trajectory. The paper uses the Trajectory Balance (TB) objective, which compares forward and backward log probabilities, terminal reward, and a learned log partition function `log Z` (Section 2, p. 3; Appendix C, pp. 7–8).

How to do it. (1) Define terminal reward from proof completion and partial reward from a reward model (RM). (2) Learn `log Z` from the model's hidden state at each theorem's initial state. (3) Sample trajectories through Lean. (4) Compute TB loss over forward probabilities, backward probabilities, terminal log reward, and `log Z`. (5) Update policy parameters. In this implementation, the history encoding makes the backward policy trivial because every state has one parent. The appendix gives the training loop: initialize LeanDojo, choose replay or fresh trajectories, compute TB loss, and update `θ ← θ−η∇θLTB` (Appendix D, Algorithm 1, p. 9).

The paper says: “The trajectory balance (TB; Malkin et al., 2022) learning objective for GFlowNets also requires estimating the log partition function logZ, where Z is the sum of rewards for all terminal states for the given theorem.” (Section 2, p. 3)

Inference: A Verus version would reward a verified final contract more strongly than an incomplete edit, while an RM scores promising intermediate diagnostics. TB would train a policy over proof edits, but Verus obligations and diagnostics must define the state and reward. This is an inference because the paper trains Lean tactics, not Rust proofs.

Evidence and limits. The RM gives partial reward only after a tactic is syntactically correct; before training step 1000, the model often fails to produce such tactics, so GFlowNet-OO and binary-reward differences are initially negligible (Section 3, p. 4). The full method experiences instability around episode 1000 (Figure 3, p. 3), and the paper has no large-scale comparison to stronger theorem-proving models.

## reward shaping and verifier feedback

What it is and when to use it. A binary Lean-completion reward is exact but sparse. Proof Flow adds an RM score for incomplete trajectories, using ReProver's objective to score individual tactics. The full reward in Appendix A assigns zero log penalty to completed proofs, a length-penalized value to Lean errors, and the mean RM log score to other incomplete trajectories; the binary-reward ablation removes the RM and uses only completion or length penalty (Appendix A, p. 7).

How to do it. (1) Run each sampled tactic in Lean. (2) If the proof completes, assign completion reward. (3) If Lean errors, assign the length penalty. (4) Otherwise score each tactic with the RM and average the scores. (5) Train with TB. For RM data, collect failed trajectories verified by Lean as hard negatives. To decide whether a tactic is truly negative, search from its resulting state; the paper warns that limited search can create false negatives and that a later tactic can undo an apparently positive tactic (Appendix E.1, pp. 11–12).

Inference: In Verus, verifier diagnostics are the exact terminal signal, while an RM can rank edits that reduce unsolved obligations. Treat RM labels as heuristic and retain verifier evidence as the acceptance criterion. A proof function must not be executed as product code merely to obtain reward.

Evidence and limits. Reward-model experiments report 86.6% and 87.9% for SFT under two prompts, and 87.3% and 86.4% for DPO (Table 2, p. 12). These are RM classification accuracies, not proof success; the paper says prompt format changes the relative result. False-negative and false-positive labels remain a stated limitation.

## replay, online sampling, and SFT baseline

The standard GFlowNet uses a replay buffer with probability 0.5; GFlowNet-OO samples fresh trajectories only; GFlowNet-BR-OO combines online-only sampling with binary reward (Section 3, p. 3). Every GFlowNet run injects the ground-truth trajectory, making comparison to SFT possible. The authors evaluate with 30 seconds and branching factor 8, versus ReProver's 10 minutes and branching factor 64; the base model uses ReProver's original state encoding (Section 3, p. 3).

Table 1 records best validation solve counts over 20 theorems: Base 4/20, SFT 9/20, GFlowNet-BR-OO 9/20, GFlowNet-OO 8/20, and GFlowNet 9/20 (Appendix D.1, p. 10). The full GFlowNet's peak of 9 occurs before the end and then regresses; replay completes 2,000 steps in 0.86 times the duration of other runs, but introduces short-run instability (Section 3, p. 4). The authors conclude that under low compute, SFT matches or exceeds GFlowNet and that larger models, datasets, and search budgets are needed.

Inference: For VL, compare any learned proof-search policy with a simple SFT or hand-written baseline under the same verifier budget. Report solved-count denominators, search time, branching, and whether replay or ground-truth trajectories are injected. The paper's 20-problem split is too small for a product claim.

## what is proved, trusted, and risky for VL

Lean verifies each tactic transition and completed proof in the training and evaluation environment. Trusted components include LeanDojo state extraction, the reward model, history encoding, reward shaping, replay-buffer implementation, and the ground-truth trajectories. The paper itself labels the work a proof of concept, with constrained dataset size and search budgets (Section 4, p. 4). Its conclusions about better exploration remain hypotheses requiring scale.

Inference: The threat to agent-written verified Rust is moderate for search efficiency and high for reward/specification mismatch. GFlowNet can diversify attempts, but it cannot repair a wrong Verus contract or prove external assumptions. VL should reuse the paper's exact-verifier trajectory collection, reward-ablation discipline, replay-vs-online comparison, and explicit low-budget denominators; it should not assume that better exploration beats SFT without a larger controlled study.

## techniques for the catalog

- history-augmented proof states: include initial state and tactic history so each trajectory state has one parent
- trajectory-balance fine-tuning: train a forward tactic policy against terminal reward, backward flow, and learned log partition
- verifier-shaped partial reward: combine exact completion/error signals with a reward model for incomplete trajectories
- replay-buffer GFlowNet training: mix replayed and newly sampled proof trajectories and measure off-policy instability
- online and binary-reward ablations: separate replay effects from reward-model effects under matched search budgets
- Lean trajectory collection: execute every sampled tactic in the proof assistant and retain only state transitions with verifier feedback
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
