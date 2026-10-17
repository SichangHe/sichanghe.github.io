# PATROL: Provable Defense against Adversarial Policy in Two-player Games
(authored by agents unless marked 🧑)
Tag: `guo2023patrol`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/guo-wenbo)

## problem and formal object
PATROL trains policies for two-player zero-sum Markov games so that each policy has a lower-bound value against arbitrary opponent policies. The paper models a game with state space, action spaces, transition function, rewards, and discount factor, then treats a Nash-equilibrium (NE) joint policy as the robust target. It states: “We present PATROL, the first provable defense against adversarial policy attacks in two-player competitive games.” (Section 8, p. 3955). The authors claim an approximate guarantee under the assumptions of their value-estimation and convergence arguments. Inference: this is not a certificate for a particular finite training run. Theorem 2 states that the output satisfies “V 1 (π1 , π2∗ ) − ε ≤ V 1 (π1∗ , π2∗ ) ≤ V 1 (π1∗ , π2 ) + ε, for all π1 and π2.” (Section 4.4, p. 3949).

## technique 1: Monte Carlo value-function approximation
what it is and when to use it
When the transition function is unknown, PATROL estimates long-term reward from sampled episodes and fits a neural value function. Inference: these estimates let the training algorithm compare candidate opponents.

how to do it
1. Run the current joint policy in the environment and collect M episodes of observations, actions, and rewards (Section 4.3, p. 3948).
2. For each state s_t, compute a discounted Monte Carlo return by summing rewards from t through the end of each episode and averaging over M episodes.
3. Use the return as the label for a DNN V_η(s) and minimize the squared error objective in Equation (7) (Section 4.3).
4. Use estimated player-1 values to select strongest population opponents (Algorithm 1, lines 5–6, p. 3949).
The paper explains the statistical role precisely: “It states that with a large number of episodes, the true value function could be accurately approximated by a parametric function with a high probability.” (Section 4.4, p. 3949).

Verus form
Inference: in Verus, a deterministic value computation over a finite episode can be a `spec fn`; a runtime Rust implementation can carry a lemma proving that the accumulated discounted sum equals the specification. Neural-network approximation and its probability bound are outside ordinary Verus verification, so the approximation error ε and confidence are trusted inputs. Inference: verified policy code should accept a value estimate plus an explicit ε assumption and prove safety properties conditional on that assumption.

evidence and limits
Lemma 1 states the probability bound `Pr(|V1−Vη1|≤ε) ≥ 1−p` for sufficiently many episodes (Section 4.4, p. 3949). Appendix A.2 uses bounded rewards, Hoeffding’s inequality, and a DNN with enough capacity (p. 3958). Inference: these mathematical assumptions and the learned approximation need separate justification; verifying return accumulation alone does not establish the probability bound.

## technique 2: strongest-opponent population updates
what it is and when to use it
PATROL maintains K policy pairs and, for each pair, chooses the strongest available opponent from the population. It then updates both players against those opponents, approximating minimax and maximin simultaneously. Inference: use this population update when ordinary self-play cycles in a game with a non-convex value function.

how to do it
1. Initialize K pairs `(π1k, π2k)` (Algorithm 1, line 2, p. 3949).
2. For each iteration i and pair k, find `π2v` minimizing player 1's value against `π1k`; find `π1u` maximizing player 1's value against `π2k` (Algorithm 1, lines 3–6).
3. Fix `π2v` and update `π1k` for l iterations with PPO (line 7).
4. Fix `π1u` and update `π2k` for l iterations with PPO to minimize player 1's value (line 8).
5. Refit the value function with Equation (7) (line 9).
6. After I iterations, play every final policy against every opposite-player policy and select the strongest policy for each player (line 12).
After Equation (8), the authors state that the selected-value gap “keeps reducing as the iteration proceeds.” They explain that the two terms approximate the minimax and maximin values (Section 4.3, p. 3949). Inference: a gap over population opponents alone does not establish a bound against every possible policy.

Verus form
Inference: represent finite populations with a `Vec` plus a length bound, and specify `argmin`/`argmax` results as quantified extremum predicates. A verified update function can ensure that selected indices are in bounds and that policy metadata is preserved. PPO's floating-point optimization and neural policy weights are external assumptions; do not claim that Verus proves gradient convergence. Inference: a Rust monitor can verify that each deployment policy was selected from evaluated opponents and that a stored certificate records ε and sampling assumptions.

evidence and limits
The claimed guarantee assumes a two-player zero-sum game, a smooth differentiable value approximation, bounded learning rate, and enough episodes. Appendix A.3 also relies on a sufficiently large population recovering global best responses: “With a reasonable large K, we have π2v and π1u equals to argminπ2 (V 1 (π1T , π2 )) and argmaxπ1 (V 1 (π1 , π2T )).” (p. 3959; subscripts flattened). Inference: this requires more than selecting the strongest member of an arbitrary finite population. Section 7 states: “We cannot guarantee it is larger than a specific winning rate.” (p. 3955).

## technique 3: theoretical convergence and robustness proof
what it is and when to use it
The authors combine a population-update argument with Lemma 1’s approximation error to claim convergence to an ε-NE point. Their method is a mathematical proof of a worst-case value inequality (Section 4.4 and Appendix A.3), not machine-checked verification of the training implementation.

how to do it
1. Establish the minimax/maximin inequalities for each selected strongest opponent (Section 4.3).
2. Show PPO updates improve player 1 against `π2v` and improve player 2 against `π1u`; subtract the inequalities to obtain Equation (8) (Section 4.3).
3. Follow Appendix A.3’s argument using the true value function: impose the learning-rate conditions in Equations (15) and (27) and derive the distance recurrence in Equation (25) (pp. 3958–3959).
4. At a claimed accumulation point with zero selected-value gap, assume the population opponents recover global best responses; derive the NE inequalities in Equations (28)–(30) (p. 3959).
5. Apply Lemma 1’s approximation-error bound to obtain the claimed two-sided ε inequality for every opponent policy (Theorem 2 and the end of Appendix A.3).
The paper summarizes the result: “Theorem 2 shows that the solution given by our method guarantees to converge to a ε-approximate Nash equilibrium point, where ε is the value function approximation error in Lemma 1.” (Section 4.4, p. 3949).

Verus form
Inference: encode finite-policy game values as pure specifications and prove monotonic update lemmas with proof functions and `assert` statements; use loop invariants for bounded iteration counts and population membership. The continuous optimization proof is mathematical evidence, not a Verus executable proof. Inference: Verus can check a replayed finite certificate of inequalities, while trust in the neural approximation, real arithmetic, and PPO implementation remains outside the verifier.

evidence
On seven toy games, each method was run four times; PATROL converged to the NE point in all selected games, while baselines converged in at most 5 of 14 settings (Section 5.3, p. 3951). On six sophisticated games, tables 2–4 report winning rates; for example Table 2 reports PATROL_1 vs. Self-play_2 winning rates of 42%, 85%, 55%, 54%, 52%, and 76%, respectively, for You-Shall-Not-Pass, Kick-And-Defend, Sumo-Humans, Sumo-Ants, Pong, and StarCraft II (p. 3953). Its caption states: “Note that we run each setup four times and report the mean result.” Against PPO-based attacks, Figure 3 uses matched hyperparameters and reports lower attack winning rates for PATROL; Sumo-Ants is less distinguishable because the attack space is limited (Section 5.3, p. 3953). These results measure robustness in specified games and attacks, not arbitrary environments.

## trusted boundary, contradictions, and VL implications
Claimed by the authors: convergence under the stated assumptions and an ε worst-case value bound (Section 4.4). Measured: toy-game convergence, cross-play winning rates, zoo-agent performance, and attack winning rates (Section 5.3). Inference: an implementation-level proof would still need to justify the environment, PPO optimizer, DNN error, global-best-response coverage, arithmetic, and mapping from a deployed agent to the mathematical policy. The paper reports its finite-population experiments with K = 2 (Section 5.1, p. 3951); its Appendix A.3 argument invokes a sufficiently large K. Inference: the reported experiments do not establish global-best-response coverage. Inference: agent-written verified Rust could use PATROL-style certificates for bounded game logic, but policy networks and training remain a high threat surface. Inference: a Verus proof could protect a policy wrapper’s action constraints and accounting; this would not itself establish that the model is at an NE point.

## techniques for the catalog
- monte carlo value approximation — label a value network with discounted returns from M episodes and carry ε as an explicit assumption
- strongest-opponent population training — maintain K policy pairs and update each player against its population extremum
- epsilon-NE convergence proof — combine update inequalities, sampling error, and smooth bounded-learning assumptions
- adversarial robustness evaluation — compare attack winning rates under matched hyperparameters in the selected games
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "These results confirm that PATROL is more robust than the baselines against the PPO-based attack."): checked the complete paper, quotations, numbers, section/page references, Algorithm 1, proof assumptions, and evaluation claims; corrected the publisher link, quotation wording and locations, Table 2 opponent and values, proof sequence, and population-coverage limitation; did not reproduce experiments, independently validate the mathematical proofs, or verify the proposed Verus applications.
