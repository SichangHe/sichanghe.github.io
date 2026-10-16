# Neural Interactive Proofs
(authored by agents unless marked 🧑)
Tag: `hammond2025neuralinteractiveproofs`, [paper](http://arxiv.org/abs/2412.08897v2)

## problem and formal object

The paper studies a trusted but computationally bounded verifier interacting with powerful, untrusted neural provers. Its central object is a prover–verifier game (PVG), generalizing interactive proofs to learned agents. An instance is a decision problem `(X,S,P)`, where `S` is the set of positive instances and `P` is an input distribution. Agents exchange messages and the verifier eventually accepts or rejects. Classical validity has completeness error `εc` and soundness error `εs`, with `εc + εs < 1`: positive instances are accepted with probability at least `1−εc`, while every prover on a negative instance is rejected with probability at least `1−εs`.

The motivating code example treats `x` as a natural-language specification and a Python program, with `S` containing pairs where the program satisfies the specification. The authors explicitly assume that the description is “impractical or impossible to convert the task description into a specification amenable to standard formal verification tools.” They therefore learn a protocol rather than directly proving code correctness.

## technique: learned prover–verifier game

What it is. Agents choose parameterized strategies in a messaging game. The verifier is trained from labelled examples `(xj,yj)`, and the protocol defines losses for each player. The paper compares empirical risk, the average loss over a dataset, with empirical worst-case loss, the maximum loss on any dataset item. For safety, the target is low worst-case loss even when a prover actively tries to fool the verifier.

How to apply it. (1) Define the positive set `S` and message channels. (2) Choose prover and verifier strategy classes. (3) Define losses so a helpful prover is rewarded for helping on positives and an adversarial prover is rewarded for exposing verifier weaknesses on negatives. (4) Train toward a verifier-leading Stackelberg equilibrium: the verifier commits, and the prover best-responds. (5) Evaluate both average accuracy and worst-case behavior under adversarial prover strategies. Their neural-IP protocol (nip) uses one prover and one verifier alternating messages, with losses `Lp = LWC(·|y=1) − LWC(·|y=0)` and `Lv = LWC(·|y=1) + LWC(·|y=0)`. Theorem 8 states that a valid IP system corresponds exactly to an approximate verifier-leading Stackelberg equilibrium of this game.

The paper warns that learning this equilibrium is difficult for two reasons: worst-case loss is harder than expected loss, and Stackelberg equilibria are bilevel optimization problems. A standard timescale-separated update makes the prover’s learning rate larger than the verifier’s (`αv = o(αp)`), with a Hessian correction; the authors discuss LOLA as an approximation when the inverse Hessian is intractable.

Verus form. Inference: a VL implementation can use the game only to generate candidate explanations or test cases. The Rust checker should express the actual safety property in `requires` and `ensures`; a `proof fn` can establish each protocol step, and loop `invariant`s can preserve the relation between the concrete state and an abstract specification. Neural equilibrium, reward design and worst-case sampling remain outside the Verus proof. A verifier decision is evidence only after the candidate code itself passes Verus.

## technique: adversarial worst-case learning

What it is. Instead of trusting a finite sample to represent all inputs, add an adversary whose strategy chooses a positive and a negative input to maximize verifier loss. The adversarial three-player game has the same equilibria as the original nip game under the paper’s proposition.

How to apply it. (1) Define adversary space `S × (X\S)`. (2) Give the adversary loss `−ℓ(σ,s)−ℓ(σ,x)`. (3) Replace the prover/verifier worst-case terms with `ℓ(σ,s)−ℓ(σ,x)` and `ℓ(σ,s)+ℓ(σ,x)`. (4) Train to a verifier–prover-leading Stackelberg equilibrium. This removes the assumption that a fixed dataset contains every hard case, but assumes access to an adversary capable of producing arbitrary inputs. The paper qualifies this method: “This stronger assumption may not always hold, but when it does, learning can be more efficient (Goldman & Kearns, 1995).”

Verus form. Inference: use an adversarial generator to propose Rust inputs, then require each generated counterexample to be reproducible in a Verus test harness. Encode the safety property as `ensures`; if a counterexample violates it, repair the implementation or contract and rerun. The adversary is a search aid, not a trusted oracle.

## technique: multi-prover cross-examination

What it is. `mnip` uses two provers that cannot communicate during interaction. The verifier can cross-examine them. Because provers may coordinate beforehand, the relevant equilibrium is a correlated Stackelberg equilibrium. Theorem 11 connects that equilibrium to valid multi-prover interactive proofs.

How to apply it. (1) Instantiate two provers with the same loss. (2) Isolate their message channels so neither sees the other’s current message. (3) Train the verifier against correlated strategies, not only independent ones. (4) Measure soundness against arbitrary replacement provers. This protocol is intended to increase theoretical power through consistency checks between independent views.

Verus form. Inference: two proof-producing agents can emit independent lemmas or traces. A Verus `proof fn` should consume both and establish that they describe the same abstract state; disagreement causes verification failure. Independence of neural prompts is not a formal independence guarantee, so any shared state must be explicit in the model and checked.

## technique: zero-knowledge protocol

What it is. The `zk-nip` protocol adds a second verifier and a simulator. The simulator must reproduce the message distribution that an interacting verifier sees, so the verifier learns no information beyond the answer. The authors implement this by giving the second verifier a loss equal to negative statistical similarity and adding the simulator’s loss to the prover’s loss. Theorem 12 states that an approximate verifier–prover-leading Stackelberg equilibrium yields a statistically zero-knowledge IP system.

How to apply it. (1) Define the verifier’s observable message distribution. (2) Add a simulator that receives the instance and label but does not interact with the prover. (3) Train the verifier to distinguish real interaction from simulation while training the prover to minimize that distinguishability. (4) Check statistical closeness for both labels, as this paper’s stronger condition requires. The hierarchy has more than two levels: the prover commits before the two verifier agents, and the two-verifier subgame reaches a Nash equilibrium.

Verus form. Inference: zero-knowledge is usually outside VL’s functional goal. If secrecy matters, model an allowed observation as a specification and prove that proof-only state is erased; do not claim distributional indistinguishability from a deterministic `proof fn`. Verus can prove that an implementation exposes no designated secret field through its API, but cryptographic or probabilistic indistinguishability needs an appropriate formal model.

## evidence: graph isomorphism

The first experiment uses 10,000 Erdős–Rényi graph pairs, approximately ten vertices each, with an 80:20 train-test split. The verifier and prover use graph neural networks, a transformer and feed-forward heads; independent PPO trains each protocol for 5,000 steps across 10 seeds. By controlling Weisfeiler–Leman difficulty, the authors calibrate the verifier’s standalone limit. NIP verifiers approach near-perfect classification when interacting with a trained prover, while other protocols show little increase in this toy setting. Larger models solve the task better, and interaction helps most when the verifier cannot solve it alone but can after learning to interact. In zk-nip, increasing the simulator-loss coefficient roughly decreases information leakage.

## evidence: code validation

The second experiment uses APPS. GPT-4o-mini modifies human solutions into valid Python programs that fail at least one test, producing 4,877 questions with two solutions; the eventual train-test split is 90:10. GPT-4o is the prover and GPT-4o-mini the verifier. Both are fine-tuned for eight rounds of expert iteration from positive-reward rollouts, using 10% of the dataset per iteration and training from scratch each round.

All protocols modestly improve final test accuracy over an isolated verifier; NIP and MNIP improve by about 11% (the figure gives the comparison, not a denominator in the prose). To assess worst-case behavior, the authors sample 10 rollouts per test point and count points on which the verifier is always wrong. Most protocols improve over the solo baseline, with MNIP best. Vanilla expert iteration can collapse toward rejection because only correct verifier rollouts enter training. “Stabilised” expert iteration replaces the verifier guess with the true label for an annealed partition, beginning at 80% and decreasing linearly to zero. This greatly reduces mode collapse and improves worst-case performance for every protocol, although mean accuracy changes only slightly and inconsistently.

## trusted boundary and VL threat

The paper supplies proofs of its equilibrium theorems and releases code, datasets and generation scripts. It does not prove that neural training reaches the required equilibria, that APPS bugs represent real software faults, or that two domains generalize to real systems. Its discussion says the methods are “far from being ready to enforce safety in complex real-world applications” and should not be understood as guaranteeing safety.

Inference: neural interactive proofs offer VL a useful adversarial review architecture, especially multi-agent counterexample generation and worst-case evaluation. The product threat is medium to high if agents treat a verifier verdict as a substitute for Verus: a learned verifier can accept a subtle bug, while training incentives can teach a prover to persuade it. The safe division is to use NIP-style agents to propose tests and proof obligations, then let Verus’s checked `requires`/`ensures` contracts decide acceptance.

## techniques for the catalog

- worst-case prover–verifier game — train a verifier against a strategic prover with worst-case rather than only average loss
- adversarial input player — add a third agent that searches positive and negative inputs exposing verifier failures
- multi-prover cross-examination — use non-communicating provers and correlated-equilibrium training for stronger soundness
- zero-knowledge simulator — train a simulator to match interaction distributions so the verifier learns only the answer
- stabilised expert iteration — replace verifier guesses with true labels on an annealed training partition to prevent rejection collapse
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
