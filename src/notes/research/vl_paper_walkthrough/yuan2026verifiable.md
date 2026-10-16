# Verifiable Process Rewards for Agentic Reasoning
(authored by agents unless marked 🧑)
Tag: `yuan2026verifiable`, [paper](https://www.semanticscholar.org/paper/0952e56ce35e2e548d458c9365ab4438dbb5df8b)

## what the paper contributes

This paper turns an objective intermediate-action checker into dense reinforcement-learning feedback. Its target is a long-horizon agent whose terminal reward is too sparse to assign credit to individual turns. The authors call the method Verifiable Process Rewards (VPR). “We propose Verifiable Process Rewards (VPR), a framework that converts symbolic or algorithmic oracles into turn-level reward signals for reinforcement learning.” (Abstract, p. 1). The method is applicable when a task exposes a reliable verifier for each state/action pair. The paper instantiates three forms: Monte Carlo Tree Search (MCTS) for Tic-Tac-Toe, a solution-consistency checker for Sudoku, and posterior-probability checking for Minesweeper.

The central formal object is an episodic MDP `(S,A,P,R,H)` and a policy πθ. A verifier `V:S×A→{0,1}` defines the oracle-valid actions `AV(s)={a:V(s,a)=1}`. VPR uses `r_t=V(s_t,a_t)` at every turn, while outcome reward is zero before the terminal step and `I(success)` at the end (Section 2.1, p. 3). “VPR checks each intermediate action against a task-specific verifier and returns a dense, noise-free reward whenever the action is valid or optimal under that verifier.” (Introduction, p. 2).

## the VPR construction, step by step

1. Identify an environment whose action has an objectively checkable criterion. The paper requires structure such as a search algorithm, symbolic constraint system, or inference engine; a vague human judgment is outside the claimed setting (Section 1, pp. 1–2)
2. Define the verifier `V(s,a)` and the oracle-valid set. A verifier may mark validity, usefulness, or optimality, but that meaning must be fixed before training
3. At every trajectory turn, execute the verifier on the action emitted by the policy and store `rVPR_t=V(s_t,a_t)`
4. Aggregate rewards across the currently active trajectories in a GRPO group. For turn `t`, compute the mean `μ_t`, standard deviation `σ_t` and normalized advantage `A_i,t=(rVPR_i,t−μ_t)/(σ_t+δ)` over trajectories that have not terminated
5. Insert each turn-level advantage into the clipped PPO surrogate with importance ratio `ρ_i,t=πθ(a_i,t|s_i,t)/πθold(a_i,t|s_i,t)` and clipping range `[1−ε,1+ε]` (Section 2.3, p. 4)
6. Train for the same update budget as the outcome-reward and rollout-process baselines, then evaluate both the local task and transfer tasks

The method’s assumption is explicit: correctness of the reward is only as good as correctness of `V`. “Our results indicate that densely-verifiable agentic reasoning provides a useful path for studying how dense, objective process feedback can improve the general reasoning abilities of LLM agents.” (Conclusion, p. 9). This is a claim supported by the reported environments, not a universal result for open-ended agents.

## search-based verification for dynamic deduction

In Tic-Tac-Toe, the verifier uses MCTS with a default of 10,000 simulations per move. Let `Q_MCTS(s,a)` be the estimated value of action `a`; the oracle-valid set is `argmax_a Q_MCTS(s,a)`, and the reward is one exactly when the policy action is in that set (Section 2.2, p. 3). Ties are therefore valid actions. Apply it by: (1) run MCTS from the current board; (2) compute each legal action’s value; (3) mark all maximizers valid; (4) reward the chosen move; (5) continue until terminal state; (6) train with the turn-level advantages.

The evidence uses Qwen3-4B with thinking mode, 100 updates, 128 trajectories per update, and five evaluation runs of 1,024 games each. Table 1 reports Tic-Tac-Toe return (optimum 0) against a strong MCTS opponent. VPR obtains −0.09±0.03 as first player and −0.11±0.03 as second, versus outcome reward −0.18±0.03 and −0.21±0.03. The MCTS-quality ablation is decisive about assumptions: with 100 simulations returns fall to −0.48±0.06/−0.52±0.07, below the base −0.31±0.04/−0.35±0.05; 1,000 simulations recover much of the benefit, and 10,000 is best (Tables 1 and 4, pp. 6 and 8).

Inference: in Verus, model the board and legal moves as mathematical state, define a `spec fn` for the legal-action set and an abstract search-value relation, then use `requires`/`ensures` to prove that a returned move is legal and belongs to the declared maximizer set. A proof of a bounded MCTS implementation can establish its arithmetic and state-transition invariants; it cannot prove that a finite simulation estimate equals the game-theoretic optimum without a separate theorem and assumptions about the search policy. The learned policy and training loop remain outside a normal Verus proof.

## constraint-based verification for logical reasoning

For Sudoku, each puzzle has a unique solution grid `G*`. An action `(i,j,d)` fills digit `d` into cell `(i,j)`; the verifier returns `I(G*[i,j]=d)`. The process reward is therefore one for an action consistent with the unique global solution, even before the puzzle is solved (Section 2.2, p. 3). Apply it by: (1) maintain the current grid state; (2) receive the proposed cell and digit; (3) look up the corresponding solution digit; (4) emit one if equal, zero otherwise; (5) update the environment and continue. The paper’s checker is stronger than ordinary local row/column legality because it uses the known unique solution.

Across five runs, VPR reaches Sudoku solution rate 56.25±2.28% and completion rate 85.13±0.96%, versus outcome reward 48.44±2.61% and 82.80±1.18%; MC-PR reaches 34.73±2.35% and 77.39±1.47% (Table 1, p. 6). The denominator is 1,024 puzzles per run, with mean and standard deviation over five runs. These numbers measure the paper’s synthetic 9×9 puzzles with 40 blanks, not arbitrary Sudoku instances.

Inference: Verus is a natural fit for a Sudoku solver. Encode a grid as a fixed-size mathematical sequence, state row/column/box and solution-consistency predicates as `spec fn`s, and prove each update preserves the invariant and agrees with the postcondition. `invariant` is a loop annotation, not a function call; executable Rust must be separated from proof-only functions. The proof covers the encoded solver and the supplied puzzle/solution contract, not the completeness or uniqueness of an external puzzle generator.

## posterior-based verification for probabilistic inference

Minesweeper is partially observable. Let Ω(s) be all mine configurations consistent with observations and define each cell’s posterior mine probability as the fraction of configurations containing a mine there. The verifier accepts either a reveal of a cell with minimum posterior mine probability, even when that minimum is positive, or a flag of a cell with posterior probability exactly one; ties are valid (Section 2.2, p. 3). Apply it by: (1) enumerate or otherwise calculate Ω(s); (2) compute each cell’s posterior; (3) choose the minimum-risk reveal or probability-one flag; (4) reward the policy action if it meets that criterion; (5) update observations and repeat.

VPR obtains Minesweeper success rate 10.39±1.86% and completion rate 80.27±1.08%, versus outcome reward 3.91±1.52% and 77.26±1.31%; MC-PR obtains 2.34±1.11% and 78.67±1.22% (Table 1, p. 6; five runs of 1,024 games). The paper’s trajectory example explains the mechanism: high-probability mine reveals receive immediate negative advantage, while safe flags receive immediate positive advantage.

Inference: a Verus model can prove exact posterior calculations for a finite board if configurations and counting are represented in specifications and arithmetic bounds are explicit. This does not prove that an implementation’s floating-point probabilities, approximate enumeration, or environment observation channel matches the mathematical model. A product should therefore make approximation and observation assumptions explicit in contracts.

## turn-level optimization and theoretical guarantees

The training objective is GRPO with per-turn group normalization. For each environment instance, sample K trajectories from the old policy, retain active trajectories at each turn, compute `μ_t`, `σ_t`, and `A_i,t`, then optimize the clipped surrogate over every active turn (Section 2.3, p. 4). The method does not require a learned process-reward model or extra rollout values; the verifier is the process oracle.

Proposition 1 shows that with a fixed state distribution and a verifier aligned with the optimal action set, the VPR gradient is `E[V(s,a)∇logπ(a|s)]`, equivalent at the old policy to a weighted imitation-like update that upweights oracle-valid sampled actions. Proposition 2 bounds gradient bias from an approximate verifier by `G ε̄`, where `ε̄` is the state-action disagreement fraction and `G` bounds the score-function norm. Proposition 3 compares horizon scaling: in a coherent independent Bernoulli regime, expected VPR signal is Θ(T), while outcome-reward signal is Θ(T p^T) and tends to zero as T grows (Section 2.4, pp. 4–5).

Inference: these are idealized mathematical analyses. A Verus encoding could prove finite-sum identities, normalization denominators are nonzero under preconditions, and bounded update algebra. It cannot turn the paper’s assumptions about fixed state distribution, policy differentiability, independent step correctness, or PPO clipping into facts about a deployed neural network. The propositions justify an engineering hypothesis, not a complete correctness theorem.

## transfer, oracle quality, and evidence

The paper tests zero-shot transfer to seven general reasoning benchmarks (GSM8K, MATH-500, AIME24/25, GPQA-Diamond, BBH, MMLU-Pro) and two agentic tasks (ALFWorld and WebShop), with no further fine-tuning. Table 2 reports pass@1 over the listed denominators (GSM8K n=5; MATH-500, AIME24/25, GPQA-D n=10; BBH and MMLU-Pro n=1). VPR’s average exceeds the base and both baselines for each training environment; Minesweeper-trained VPR has the highest reported average, 62.59 versus base 60.92. Table 3 uses three evaluation runs for ALFWorld and WebShop; for Tic-Tac-Toe-trained models, VPR reaches ALFWorld 27.36±2.62% and WebShop score 30.88±0.75 with success 1.87±0.50%, versus base 24.13±2.40%, score 27.42±1.00, success 1.40±0.20%.

These transfer results are evidence that the trained policy changed, but they do not prove that the transferred behavior is formally correct.

The oracle ablation is the most important failure condition. With 100 MCTS simulations, every general-benchmark average falls below base (58.47 versus 60.92), while 1,000 recovers most of the benefit and 10,000 is best at 62.17 for Tic-Tac-Toe training (Table 5, p. 8). The paper states: “A weak oracle (N =100) actively harms training in both settings: in-domain returns fall below the base model, and the OOD average also drops below it with degradation across every benchmark.” (Section 3.4, p. 8). Dense rewards therefore amplify bad verification as well as good verification.

## what is proved, measured, and trusted

The paper proves three first-order propositions under explicit assumptions and measures training outcomes, transfer scores, and oracle sensitivity. It does not prove that VPR improves arbitrary agentic reasoning, that MCTS estimates are optimal, that a Sudoku solution is correctly supplied, or that Minesweeper’s posterior enumeration is exact in a deployed implementation. Its trusted setup includes Qwen3-4B behavior, GRPO/PPO implementation, environment transitions, MCTS/constraint/posterior oracle code, evaluation scripts, and benchmark task validity. The authors also note that less structured open-ended environments remain unresolved.

Inference: threat to a product is high when a weak oracle silently labels intermediate steps, because the paper measures degradation below base under 100 MCTS simulations and across all transfer benchmarks. Threat is lower when the checker is a small, fully specified Rust component whose contracts and test oracle are independently verified. The product should not treat dense reward as evidence of correctness unless it can state what the verifier proves and what remains trusted.

## techniques for the catalog

- turn-level verifier reward — define `V(s,a)` and use its zero/one result as an objective reward on every action
- search-based process verification — use MCTS values to mark all maximizer actions valid in dynamic deduction
- constraint-based process verification — reward actions consistent with a unique global solution in a symbolic puzzle
- posterior-based process verification — reward minimum-risk reveals and probability-one flags from enumerated beliefs
- GRPO turn normalization — normalize verifier rewards over active trajectories and insert each turn advantage into clipped policy optimization
- verifier-error bias bound — bound policy-gradient bias by score norm times verifier disagreement fraction
- horizon credit analysis — compare linear accumulation of dense process signal with exponential dilution of terminal success signal
- oracle-quality ablation — vary verifier strength and measure both in-domain and transfer degradation before trusting dense rewards
