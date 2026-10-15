# Reinforcement Learning of Theorem Proving
(authored by agents unless marked 🧑)
Tag: `kaliszyk2018reinforcement`, [paper](https://www.semanticscholar.org/paper/920febb03475b068286a855c10ea09b968fe7ee3)

## scope and result
This paper builds rlCoP, a connection-tableau prover guided by Monte Carlo Tree Search (MCTS) and reinforcement learning (RL) from earlier proof attempts. It removes iterative deepening and most hand-designed heuristics, then learns policy and value guidance. The abstract reports: “The trained system solves within the same number of inferences over 40% more problems than a baseline prover” (abstract, p. 1). The formal object is first-order logic translated to clause normal form; the experiments use Mizar-derived problems, not Rust or Verus.

## technique 1: connection-tableau game and bare prover

### paper procedure
Translate axioms and the negated conjecture to clauses. Start from a goal literal and repeatedly apply extension or reduction. Extension unifies the goal with a complementary literal of a new clause, possibly adding branches; reduction unifies with a complementary literal already on the active path. A proof closes when every branch has complementary literals (section 2, pp. 2–3). The paper's bare prover removes iterative deepening and randomly chooses extension/reduction steps, making it incomplete. A stated failure mode is an infinite branch that repeatedly extends `P(0)` to `P(s(0))`, `P(s(s(0)))`, and so on (section 2.1, p. 3).

A playout is a sequence of inferences from a proof state; after b playouts, a bigstep commits to one inference and starts the next batch from that tableau. Search nodes are inference sequences from the empty tableau (section 2.1, pp. 3–4).

### Verus form
Inference: model a Verus proof search state as a goal plus hypotheses and let actions add a lemma application, `assert`, or quantified instantiation. A successful branch must still be checked by Verus; unlike the bare prover, an incomplete learned search cannot be treated as evidence that no proof exists. Verus code retains `requires`, `ensures`, `proof fn`, and loop `invariant` constructs. Connection literals and unification are not Verus syntax.

## technique 2: MCTS with a state heuristic

At each node i, maintain visit count `n_i`, total reward `w_i`, and prior probability `p_i`. A closed tableau has reward 1 and an unsuccessful leaf reward 0. The default nonlearned state value is `0.95^{G_o}`, where `G_o` is the number of open goals; fewer open goals receive higher value (section 3.1, p. 3). Select actions using UCT, `w_i/n_i + c p_i sqrt(ln N/n_i)`, where N is parent visits; c is set to 2 when policy and value are learned (section 3.1, p. 4).

Inference: use MCTS to allocate Verus proof-search attempts between candidate lemma applications. A Verus check supplies the terminal reward; open-goal count can be a heuristic only. The paper says, “We use the standard UCT formula [23] to select the next inferences (actions) in the playouts” (section 3.1, p. 4). The paper's 0.95 exponent and UCT constants require retuning for Rust proof states and do not establish semantic progress.

## technique 3: policy learning from proof-search frequencies

For each bigstep search node, extract sparse features from the current goal, active path, and tableau; extract features from the selected clause/literal action; concatenate them. The UCT action frequency is normalized by the average action frequency at that node to form a relative target `r_a`. Train a regression model on log targets. During search, softmax the predicted action scores to obtain priors, using temperature 2.5 (section 3.2, p. 4). By default, only bigstep nodes supply training examples to keep data manageable and focus on important decisions (section 3.2, p. 4).

Inference: for Verus, collect which candidate lemma or assertion action leads to later verified success, learn a prior over actions, and feed it to search. The paper says, “During the proof search the prior probabilities p_i of the available actions a_i in a state s are computed as a softmax of their predictions” (section 3.2, p. 4). The policy must never be the acceptance test; a high prior can only change ordering. A candidate proof remains a Rust function checked against its `ensures`.

## technique 4: value learning with distance discount

For each bigstep state, assign value 1 if the run eventually proves the theorem and 0 otherwise. Positive states are discounted by `0.99^{d_proof}`, where `d_proof` is the number of inferences to the closed tableau (section 3.3, p. 4). Train a predictor by regression on logits and use its estimated value during search. The authors use XGBoost gradient boosting with tuned parameters (section 3.5, p. 5).

Inference: define a Verus state value from whether a subsequent candidate verifies and optionally discount by proof steps or solver time. This is an engineering heuristic; it does not weaken or replace the contract. A timed-out proof is unknown, so a VL dataset should distinguish timeout from a verified failure.

## technique 5: structural sparse features and iterative feedback

Features include normalized term walks up to length three, hashed symbols reduced modulo a large prime, and abstract tableau statistics: number and size/depth of goals, active-path length, variable instantiations, and common symbols (section 3.4, pp. 4–5). The authors choose XGBoost after comparing fast linear learners; final settings include 400 iterations, depth 9, learning rate 0.3, early stopping after 200 rounds, and lambda 1.5 (section 3.5, p. 5).

Each RL iteration runs the prover, logs search data, retrains policy/value predictors from all previous iterations, and runs again. The learned system therefore improves from its own proof attempts rather than requiring extra human labels (sections 4.2–4.5, pp. 5–7).

Inference: use proof-state features such as quantified-variable counts, hypothesis size, and solver time, and retrain from verified and failed attempts. Rust syntax and ownership facts must be represented explicitly; hashed token features alone cannot ensure borrow correctness.

## evidence and denominators

On M2k, full policy-plus-value rlCoP reaches 1,235 proved problems at iteration 20, compared with mlCoP at the same 4×10^6 inference budget; this is 19.4% more than mlCoP, 13.6% more than policy-only, and 44.3% more than value-only (section 4.4, p. 6). Replacing the jointly learned final policy with the best policy-only model reduces 1,235 to 1,182, and replacing value reduces it to 1,144 (section 4.4, p. 6).

For the held-out Miz40 evaluation, the dataset is split into 29,272 training and 3,252 testing problems. At a 200,000-inference limit, mlCoP proves 1,143/3,252 test problems, the bare prover 431/3,252, and unguided UCT 804/3,252 (Table 7, p. 7). Training policy and value only on the training problems, iteration 5 proves 1,624/3,252 test problems, which the paper reports as 42.1% more than mlCoP at the same inference limit (Table 8 and section 4.5, p. 7). The paper notes 577 test problems solved by rlCoP but not standard mlCoP and 96 solved by mlCoP but not rlCoP, for a net difference of 481 (footnote 9, p. 7).

These are solved-problem counts under fixed inference budgets, not proof correctness rates independent of the underlying tableau calculus. The calculus supplies the formal evidence; MCTS, features, XGBoost, and learned priors are untrusted guidance. The bare prover is incomplete by design, so failure to solve is not a counterexample.

## implications for VL

Inference: the transferable pattern is iterative proof-search self-improvement: use a formally checked Verus result as terminal reward, learn action priors and state values from proof traces, and use MCTS to spend solver calls. The paper already establishes policy-only, value-only, joint guidance, UCT exploration, distance discounting, and held-out evaluation; VL should not present these as new formal-verification primitives. The product threat is search bias and incompleteness: a policy can repeatedly miss a valid proof or exploit a proxy feature, while only Verus establishes the contract.

## techniques for the catalog

- bare connection search: build tableau proofs with extension and reduction actions from clauses
- UCT Monte Carlo guidance: select proof actions by visit reward, priors, and an exploration term
- policy learning: regress action-frequency targets and turn predicted scores into softmax priors
- value learning: predict proof-state success with distance-discounted rewards
- iterative RL feedback: retrain policy and value models from accumulated proof-search attempts

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
