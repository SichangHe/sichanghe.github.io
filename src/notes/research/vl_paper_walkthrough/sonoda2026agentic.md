# Why Agentic Theorem Prover Works: A Statistical Provability Theory of Mathematical Reasoning Models
(authored by agents unless marked 🧑)
Tag: `sonoda2026agentic`, [paper](https://www.semanticscholar.org/paper/0419436cadb0952efad1a14ae650f75679233c06)

## question and model

Sonoda, Akiyama and Uezato give a statistical account of why an LLM theorem prover can work on a biased workload even though worst-case proof search remains hard. They define statistical provability as the probability of reaching a verifier-accepted proof within a fixed budget on an instance distribution. Their abstract states, “We model formal proof search as a finite-horizon reachability MDP with deterministic verifier dynamics” (Abstract, p. 1). The result is a bound for offline action-value regression followed by greedy proving.

The paper keeps logical provability separate from learned success. A proof may exist but not be found within a budget, while a learned policy may succeed on recurring families. The workload distribution `q0`, verifier-call budget `B`, and policy determine the measured probability. The authors call this “algorithmic success probability” and track average truncated proof length, the expected number of verifier calls before success or exhaustion (Introduction, p. 1).

## technique 1: represent proof search as a reachability MDP

Use this representation when a prover interacts with a deterministic proof assistant. A state contains all open obligations, local context, metavariables and verifier messages; an action is a tactic, inference instance, lemma invocation or retrieval-conditioned command. Invalid actions transition to explicit failure states. The paper defines `F : X × A → X` and says, “The MDP is not a new logic; it is the verifier’s step-by-step operational semantics written in the notation needed for dynamic programming” (Section 2, p. 3).

Steps are: (1) choose a complete proof-state representation; (2) define actions; (3) define verifier transition `F`; (4) mark solved states `G`; (5) set a call horizon `B`; and (6) measure the hitting event `T_G ≤ B`. For backward Lean search, `apply h a` transforms a goal `h : A → B, a : A ⊢ B` to no goals; for forward natural deduction, modus ponens adds `B` to available facts (Fig. 1, pp. 2–3). Whole proof states rather than a single goal preserve the Markov property when one tactic creates several subgoals.

Verus form (Inference: the paper discusses Lean, Rocq and Isabelle, not Verus). A Verus state abstraction can record open proof obligations and a candidate Rust proof step, while the actual Verus verifier supplies deterministic acceptance. The final proof still consists of Rust and Verus specifications; the MDP is an analysis layer and does not itself prove executable behavior. A complete state must include all obligations, since omitting a subgoal invalidates the Markov assumption.

## technique 2: faithful abstraction and statistical provability

The authors permit a lower-level state representation `R` to be encoded into `X` if transitions commute: `e(F_R(r,a)) = F(e(r),a)` and solved states are preserved. Proposition 2.2 concludes that optimal finite-budget success equals the indicator of syntactic provability. The paper states, “Consequently, if q0 is the push-forward of a problem distribution on R, then SP∗B (q0 ) is exactly the mass of instances that are syntactically provable within budget B” (Section 2, p. 4).

Apply the technique by proving the encoding commutation and solved-state equivalence before doing statistical learning. Then define `V_B^π(x)=P_x^π(T_G≤B)`, `SP_B^π(q0)=E_q0[V_B^π(X)]`, and the average truncated length `Len_B^π(q0)=Σ_{s=1}^B P_q0^π(T_G≥s)`. The last equality is the tail-sum formula (Section 2, p. 3).

Verus form (Inference). Use a ghost representation of the proof state and a specification-level transition relation. Prove a correspondence lemma between each actual Verus obligation and its abstract state transition. Do not present the statistical equality as a Verus contract: it describes a distribution of runs, not one executable postcondition.

## technique 3: depth-wise offline value learning

For each remaining horizon `t`, define the optimal action value `Q*_t(x,a)=V*_{t-1}(F(x,a))`. Sample `N_t` state-action pairs from an exploration distribution on a compact concentration set `C_t`. For every pair, collect `m_t` independent binary rollout labels whose conditional expectation is `Q*`; average them; fit a hypothesis in a Lipschitz class by minimax absolute deviation; and act greedily with the fitted score. These are the five items of Assumption 3.1 (Section 3, pp. 4–5).

Steps: (1) choose the state-action metric and compact `C_t`; (2) sample query pairs; (3) run verifier-backed continuations and record success labels; (4) regress the averaged labels; and (5) at test time select `arg max_a Q-hat_t(x,a)`. The target is an oracle idealization: the paper warns that teacher rollouts or bootstrapped targets only approximate it and their bias belongs in approximation error (Section 3, p. 5).

Theorem 3.1 bounds the success gap by an occupancy-weighted sum of uniform value errors. Under a uniform error `epsilon-bar_B`, Corollary 3.1 gives `SP*_B - SP^pi-hat_B <= 2 epsilon-bar_B Len^pi-hat_B`. Thus shortening the learned prover's own trajectories lowers regret. The authors emphasize, “The regret therefore scales with Lenπ̂B (q0 ), the learned prover’s average truncated proof length” (Section 4, p. 6).

Verus form (Inference). A practical Verus system can collect verifier outcomes from candidate proof functions, train a scorer outside Rust, and use it only to rank candidate proof steps. The accepted candidate must still compile and verify. The learned score is not a specification; the Rust proof obligations remain the authority.

## technique 4: coverage, geometry and margin control

The statistical error decomposes into approximation error, local coverage geometry and rollout noise. Theorem 3.1 assumes Lipschitz `Q*` and hypotheses, a local-mass condition `q_t(B(z,r)) ≥ c_t r^{d_t}`, and independent labels. Balancing `N_t` and `m_t` under total budget `n_t=N_tm_t` yields a rate proportional to `n_t^{-1/(d_t+2)}` (Section 4, p. 6; Theorem 3.1, p. 5).

Use retrieval or representation learning to improve the constants and effective dimension, but retain the optimal action in the candidate set. The paper says, “Retrieval, premise selection, and representation learning help when they make Q∗t smoother, concentrate the relevant state-action pairs on a lower dimensional region, or increase action margins by pruning obviously bad choices” (Section 4, p. 6). A margin condition bounds the occupancy of states where the best and second-best action values differ by at most `u`; it improves the error dependence to `epsilon_t^(beta+1)` (Theorem 3.1, p. 5).

Verus form (Inference). Retrieval can choose a candidate set of lemmas or proof functions, but a proof of candidate retention is needed if dropping an action could remove the only valid proof. Use explicit search metadata and keep the verifier check after ranking. A margin is an empirical property of score values, not a Rust invariant unless encoded and proved for the candidate generator.

## technique 5: short proofs, truncation and representation design

The theory turns engineering choices into measurable levers. Decomposition and lemma introduction can shorten the horizon; retrieval can localize the state distribution; better verifier feedback can increase action gaps. If open-goal multisets are unbounded, Appendix B truncates states whose total goal mass exceeds a cap `W` and adds an overflow penalty `delta_W`; the paper says, “The excluded trajectories are exactly those on which the active goal multiset becomes too large under the policy and budget being analyzed” (Appendix B, p. 16).

Appendix C proposes choosing an embedding by minimizing a Bellman certificate gap plus a complexity penalty. Appendix D gives a scaling heuristic: ignoring logarithms and approximation error, `epsilon_t ≈ n_t^{-1/(d_t+2)}`, improved to exponent `(beta+1)/(d_t+2)` under a margin (Appendix D, p. 17). These are design diagnostics, not measured guarantees for a particular prover.

Verus form (Inference). A VL implementation can measure proof length as verifier calls, count active obligations, and report overflow or unproved assumptions. A state embedding may be used for retrieval, but it cannot replace the concrete Verus state needed for soundness.

## evidence, assumptions and implications

The paper is theoretical: no benchmark table establishes a universal success percentage. Its evidence is the MDP correspondence, Bellman telescoping argument, coverage lemma, concentration of rollout averages and the stated high-probability theorem. The verifier is assumed deterministic; query pairs are iid with local mass; `Q*` and the hypothesis class are Lipschitz on occupied regions; labels are conditionally independent unbiased rollout outcomes; and greedy actions remain in the retained candidate set (Assumption 3.1, pp. 4–5). If these fail, the bound does not apply or needs an added error term.

What is proved is a conditional statistical bound. What remains trusted is the proof assistant's verifier, the state encoding, the distributional assumptions and the data-collection process. The paper explicitly says that its MDP notation “does not replace the underlying logic” (Section 2, p. 4). Inference: the product threat to agent-written verified Rust is low for soundness once Verus checks the final code, but high for productivity if candidate retention, state representation or rollout labels mislead the agent. VL should not redo the paper's abstract theorem; it can reuse average verifier-call length, occupancy tails, candidate-retention checks and margin-aware evaluation.

## techniques for the catalog

- verifier-defined MDP: model complete proof states, actions and deterministic verifier transitions as finite-horizon reachability
- faithful encoding: prove that an abstract state representation commutes with verifier transitions and preserves solved states
- depth-wise value learning: regress verifier-backed continuation success separately at each remaining horizon and act greedily
- occupancy-sensitive evaluation: weight local value errors by the learned prover's unsolved-state tail and average truncated length
- geometry and margin engineering: use retrieval and representations to improve coverage, smoothness, dimension and action gaps
- overflow truncation: cap variable-goal states and report the probability mass discarded by the cap

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
