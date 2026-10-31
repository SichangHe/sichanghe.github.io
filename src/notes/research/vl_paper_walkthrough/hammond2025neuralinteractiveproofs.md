# Neural Interactive Proofs
(authored by agents unless marked 🧑)
Tag: `hammond2025neuralinteractiveproofs`, [paper](http://arxiv.org/abs/2412.08897v2)

## problem and formal object

The paper studies a trusted but computationally bounded verifier interacting with powerful, untrusted neural provers. Its central object is a prover–verifier game (PVG), generalizing interactive proofs to learned agents. An instance is a decision problem `(X,S,P)`, where `S` is the set of positive instances and `P` is an input distribution. Agents exchange messages and the verifier eventually accepts or rejects. Classical validity has completeness error `εc` and soundness error `εs`, with `εc + εs < 1`: positive instances are accepted with probability at least `1−εc`, while every prover on a negative instance is rejected with probability at least `1−εs` (Definition 2, p. 3).

The motivating code example treats `x` as a natural-language specification and a Python program, with `S` containing pairs where the program satisfies the specification. The authors explicitly assume: “Importantly, we assume that it is impractical or impossible to convert the task description into a specification amenable to standard formal verification tools.” (Example 1, footnote 1, p. 2.) The learned protocol decides whether the code satisfies the specification.

## technique: learned prover–verifier game

What it is. Agents choose parameterized strategies in a messaging game. The verifier is trained from labelled examples `(xj,yj)`, and the protocol defines losses for each player. The paper compares empirical risk, the average loss over a dataset, with empirical worst-case loss, the maximum loss on any dataset item. The authors state their aim: “Conversely, optimising LWC (σ) aims to produce a verifier that has low probability of being fooled on any code.” (Section 4, p. 6.)

How to apply it. (1) Define the positive set `S` and message channels. (2) Choose prover and verifier strategy classes. (3) Define the prover loss to reward helping on positives and misleading the verifier on negatives. (4) Train toward a verifier-leading Stackelberg equilibrium: the verifier commits, and the prover best-responds. (5) Evaluate both average accuracy and worst-case behavior under adversarial prover strategies. Their neural-IP protocol (nip) uses one prover and one verifier alternating messages, with losses `Lp = LWC(·|y=1) − LWC(·|y=0)` and `Lv = LWC(·|y=1) + LWC(·|y=0)`. Theorem 8 assumes the decision problem has a valid proof system and states that validity corresponds to an approximate verifier-leading Stackelberg equilibrium. Its proof specifies strict approximation bounds (Section 4, p. 6; Appendix C.1, pp. 23–24). Inference: an arbitrary approximate equilibrium reached by training need not meet these bounds.

The paper warns that learning this equilibrium is difficult for two reasons: worst-case loss is harder than expected loss, and Stackelberg equilibria are bilevel optimization problems. A standard timescale-separated update makes the prover’s learning rate larger than the verifier’s (`αv = o(αp)`), with a Hessian correction; the authors discuss LOLA as an approximation when the inverse Hessian is intractable. They caution: “While LOLA may fail to converge, interpolating between the LOLA update and LookAhead (Zhang & Lesser, 2010) leads to local convergence to stable fixed points in differentiable games under self-play (Letcher et al., 2019).” (Section 4.2, p. 7.)

Verus form.

## technique: adversarial worst-case learning

What it is. Instead of trusting a finite sample to represent all inputs, add an adversary whose strategy chooses a positive and a negative input to maximize verifier loss. Proposition 10 relates approximate verifier-leading Stackelberg equilibria of nip to approximate verifier–prover-leading Stackelberg equilibria of the adversarial three-player game (Section 4.1, p. 6; Appendix C.1, pp. 24–25).

How to apply it. (1) Define adversary space `S × (X\S)`. (2) Give the adversary loss `−ℓ(σ,s)−ℓ(σ,x)`. (3) Replace the prover/verifier worst-case terms with `ℓ(σ,s)−ℓ(σ,x)` and `ℓ(σ,s)+ℓ(σ,x)`. (4) Train to a verifier–prover-leading Stackelberg equilibrium. This replaces fixed-sample training with the stronger assumption of access to an adversary capable of outputting any input in `X`. The paper qualifies this method: “This stronger assumption may not always hold, but when it does, learning can be more efficient (Goldman & Kearns, 1995).” (Section 4.1, p. 6.)

Verus form. Inference: use an adversarial generator to propose Rust inputs, then reproduce each alleged counterexample against the implementation and check the corresponding Verus contract. Encode the safety property as `ensures`; if a counterexample violates it, repair the implementation or contract and rerun. The adversary is a search aid, not a trusted oracle.

## technique: multi-prover cross-examination

What it is. `mnip` uses two provers that cannot communicate during interaction. The verifier can cross-examine them. Because provers may coordinate beforehand, the relevant equilibrium is a correlated Stackelberg equilibrium. Theorem 11 assumes a valid proof system exists and connects validity to an approximate verifier-leading correlated Stackelberg equilibrium (Section 5.1, p. 7; Appendix C.1, p. 25).

How to apply it. (1) Instantiate two provers with the same loss. (2) Prevent all communication between the provers during their interactions with the verifier; allow an agreed joint strategy and shared randomness beforehand. (3) Train the verifier against correlated strategies, not only independent ones. (4) Measure soundness against arbitrary replacement provers. The paper explains that this separation “allows the verifier to ‘cross-examine’ the provers.” (Section 5.1, p. 7.) These are theoretical requirements; the experiments do not establish convergence to the required equilibrium.

Verus form. Inference: two proof-producing agents can emit independent lemmas or traces. A Verus `proof fn` should consume both and establish that they describe the same abstract state; disagreement causes verification failure. Independence of neural prompts is not a formal independence guarantee, so any shared state must be explicit in the model and checked.

## technique: zero-knowledge protocol

What it is. The `zk-nip` protocol adds a second verifier and a simulator. The simulator approximates the message distribution that an interacting verifier sees, limiting information beyond the answer. Total variation distance is half the sum of absolute differences between transcript probabilities. The second verifier minimizes negative worst-case total variation distance between real and simulated transcripts; the simulator minimizes the opposite loss. Thus the second verifier maximizes the distance and the simulator minimizes it. Theorem 12 assumes a valid statistically zero-knowledge system exists and gives a sufficient equilibrium condition for such a system (Section 5.2, pp. 7–8).

How to apply it. (1) Define the verifier’s observable message distribution. (2) Add a simulator that receives the instance and label but does not interact with the prover. (3) Train the second verifier to maximize the worst-case transcript distance and the simulator to minimize it. Give the prover a lexicographic objective: first minimize the original nip loss, then minimize the simulator loss among those minimizers. (4) Check statistical closeness for both labels, as this paper’s stronger condition requires. The hierarchy has more than two levels: the deciding verifier commits before the prover, which commits before the second verifier and simulator; their zero-sum subgame is solved at a Nash equilibrium (Section 5.2, p. 8). The proof states: “we would like the prover to minimise ϵk conditional on the system being valid, as opposed to reducing ϵk while potentially violating the validity of the system.” It also assumes a tight zero-knowledge bound, zero approximation error for the second verifier and simulator, and strong Stackelberg tie-breaking in favor of the prover (Appendix C.1, pp. 26–27, footnote 9).

Verus form.

## evidence: graph isomorphism

The first experiment uses 10,000 Erdős–Rényi graph pairs, approximately ten vertices each, with an 80:20 train-test split. The verifier and prover use graph neural networks, a transformer and feed-forward heads; independent PPO trains each protocol for 5,000 steps across 10 seeds. By controlling Weisfeiler–Leman difficulty, the authors calibrate the verifier’s standalone limit. The authors report “verifiers learning to near-perfectly classify valid instances when interacting with the prover,” while other protocols show no increase in performance in this toy setting (Section 6.1, p. 9). Larger models solve the task better, and interaction helps most when the verifier cannot solve it alone but can after learning to interact. For zk-nip, Figure 2c shows a roughly negative correlation between the prover’s simulator-loss coefficient and the mean difference in real versus simulated message-sequence probabilities. The authors interpret this as suggesting lower information leakage (Section 6.1, p. 9). Inference: this mean likelihood measure does not establish the worst-case total variation bound. Architecture, split and training details are in Appendix D.1, pp. 29–30.

## evidence: code validation

The second experiment uses APPS. GPT-4o-mini modifies human solutions into valid Python programs that fail at least one test, producing 4,877 questions with two solutions; the eventual train-test split is 90:10. GPT-4o is the prover and GPT-4o-mini the verifier. Both are fine-tuned for eight rounds of expert iteration from positive-reward rollouts, using 10% of the underlying dataset at a time and training from scratch on accumulated positive rollouts each round. The median Levenshtein edit distance for bug insertion is seven (Section 6.2, p. 9; Table 2, p. 29; Appendix D.2, pp. 30–33).

All protocols modestly improve final test accuracy over an isolated verifier. The paper reports: “The nip and mnip protocols see the greatest improvements in accuracy (around 11%).” The prose does not specify whether this means percentage points or a relative percentage (Section 6.2, p. 9). To assess worst-case behavior, the authors sample 10 rollouts per test point and count points on which the verifier is always wrong. Most protocols improve over the solo baseline, with MNIP best. Vanilla expert iteration can collapse toward rejection because only correct verifier rollouts enter training. “Stabilised” expert iteration replaces the verifier guess with the true label for an annealed partition, beginning at 80% and decreasing linearly to zero. This greatly reduces mode collapse and improves the measured always-wrong fraction for every protocol. The solo verifier obtains much higher mean accuracy; mean accuracy changes are small and mixed for the interaction protocols (Section 6.2, p. 10; Appendix D.2.3, p. 33). Inference: the always-wrong fraction measures repeated failures on held-out points; it does not bound error over all inputs and replacement provers.

## techniques for the catalog

- worst-case prover–verifier game — train a verifier against a strategic prover with worst-case rather than only average loss
- adversarial input player — add a third agent that searches positive and negative inputs exposing verifier failures
- multi-prover cross-examination — use provers separated during interaction; the validity theorem requires an approximate correlated Stackelberg equilibrium
- zero-knowledge simulator — minimize transcript distance after satisfying the original prover objective; statistical closeness limits information beyond the answer
- stabilised expert iteration — replace verifier guesses with true labels on an annealed training partition to reduce rejection collapse
