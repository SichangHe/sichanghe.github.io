# TacticZero: Learning to Prove Theorems from Scratch with Deep Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `wu2021tacticzero`, [paper](https://arxiv.org/abs/2102.09756)

## scope and result
TacticZero learns interactive theorem-proving policies in HOL4 without human proof traces. It treats a proof state as a set of potential derivation paths, predicts tactics and arguments, and learns when to backtrack. The abstract states: “The proposed framework is able to learn proof search strategies as well as tactic and arguments prediction in an end-to-end manner” and “This structure allows us to introduce a novel backtracking mechanism which enables the agent to efficiently discard (predicted) dead-end derivations and restart from promising alternatives” (Abstract, p. 1). A proof attempt succeeds when an empty fringe is derived in HOL4: “The MDP terminates when an empty fringe is constructed, which implies that we can recover a proof of the main goal” (Section 2.1, Termination, p. 4). The paper reports the number of unseen test theorems proved within a 10-second timeout (Section 3.2, p. 7).

## technique 1: Markov decision process over proof fringes

What it is. A fringe is a finite set of goals such that proving all of them proves the main goal; a fringe stands for one derivation path. An MDP state is a finite sequence of fringes. An action is a 4-tuple (i, j, t, c): fringe i, goal j within that fringe, HOL4 tactic t, and a possibly empty list c of arguments (theorem names or HOL4 terms). HOL4 executes the tactic and returns zero or more new subgoals. A new fringe is built by copying fringe s(i) and replacing goal s(i)(j) with the new subgoals; it is appended to the state, and the old fringes are kept. If the tactic times out, has no effect, or is not applicable, the state does not change. The episode ends when an empty fringe is built (success) or the timestep budget is exceeded (failure). Backtracking is therefore choosing an older fringe rather than the newest one; the paper says that always choosing the most recently generated fringe would be equivalent to never backtracking in HOL4 (Section 2.1, p. 3). This is the paper's MDP formulation (Sections 2.1 and 2.2, pp. 3–5).

When and steps.
1. Encode every HOL4 expression as a 256-dimensional vector using a transformer autoencoder pretrained on 4,360 definitions and theorems in Polish notation (Section 2.2, p. 4).
2. Learn `V_goal`, which maps a goal vector to a real number meant to say how easy the goal is to prove. The score of fringe i is the sum of `V_goal` over its goals (Equations 1–2, Section 2.2, p. 4).
3. Sample a fringe from the softmax of the fringe scores (Equation 3). By default the first goal of that fringe is worked on, because all goals in a fringe must be proved and their order is irrelevant (p. 5). Sample a tactic from the softmax of `V_tactic(g)` (Equation 5), then sample arguments one at a time with an LSTM-based argument network, up to a fixed maximum length L (Section 2.2, p. 5; Figure 3, p. 4).
4. Apply the tactic in HOL4; append the new fringe to the state (see above).
5. There is no separate dead-end classifier or explicit discard step in the model description. The Figure 1 caption says the agent can stop working on the newly added fringe and go back to an older one if the new one is predicted to be hard; in the equations this happens because older fringes keep a nonzero sampling probability. Train all policies jointly with the REINFORCE estimator (Equations 6–7, p. 5–6).

Verus form. Inference: represent a candidate Verus proof state as a vector plus a list of pending verification obligations. An action proposes `assert`, `assert ... by`, a `proof fn` call, `reveal`, or an invariant edit; invoke `cargo verus` after each transition. Keep only compiler-accepted states and backtrack on failures. Inference: Verus obligations include Rust typing, ownership, termination, and SMT validity, so HOL4's expression encoder and tactic vocabulary do not transfer directly; the paper does not test any Rust or Verus setting.

Evidence and limits. The MDP learns search and tactic selection jointly, unlike the fixed BFS/DFS strategies that the paper says other systems use. Inference: the environment still relies on HOL4 to execute tactics and report subgoals. The action space is restricted to the tactics and argument forms in Table 1, and candidate terms are only the variables that occur in the goal (p. 5); free generation of complex terms is listed as future work: “allowing free generation of complex HOL4 terms as arguments to obtain a more refined action space” (Conclusion, pp. 9–10).

## technique 2: tactic and argument policy learning

What it is. The agent selects one tactic from `drule`, `irule`, `fs`, `metis_tac`, `rw`, `simp`, `Induct_on`, `eq_tac`, and `strip_tac`; argument policies predict a theorem, theorem list, term, or no argument according to Table 1 (Section 3.1, p. 6). The model is trained from theorem statements only, so it learns by successful interaction rather than imitation.

When and steps.
1. Collect 1,342 theorems known to be provable by the allowed core tactics; split 80:20 into train/test (Section 3.1, p. 6).
2. Set a timestep budget of 50 and an execution limit of 0.1 seconds per tactic application. For a goal, restrict candidate theorem arguments to theorems from the theories mentioned in the goal that occur before it in the library.
3. Run the tactic policy and the appropriate argument policy; execute the resulting action.
4. Give terminal reward 5 for a proof if the theorem's rate of being proved in earlier rollouts is above average, otherwise 15; −5 if the attempt fails; 0.1 when new subgoals are generated; 0.2 when a subgoal is solved; and −0.1 for all other outcomes (Section 3.1, p. 6).
5. Train the policies jointly with RMSProp, learning rate `5×10^-5` for each policy, discount `γ=0.99`; training 800 iterations took two weeks on one Tesla P100 and one Intel Xeon CPU (Section 3.1, p. 6).

Verus form. Inference: define an action grammar limited to Verus constructs found in the local verifier notes, have a policy propose a construct and its lemma arguments, and compile after each action. A successful `cargo verus` run is the terminal positive reward. A policy may rank candidates, but it cannot be trusted to establish a theorem.

Evidence and limits. Inference: the paper gives no per-tactic accuracy; I found only end-to-end theorem counts. Candidate restriction excludes later library facts and arbitrary term synthesis, and rewards are hand-designed.

## technique 3: replay buffer for sparse proof rewards

What it is. Successful proof trajectories are retained per theorem. If a theorem previously proved is later failed, one of the five most recent successful proofs is replayed and used to update parameters (Section 3.1, p. 6). The paper's motivation: “positive rewards are sparse”, and replay is meant “to help the agent recall its successes” (Section 3.1, p. 6).

When and steps. Keep a replay buffer of earlier successful proofs of each theorem; when the agent fails on a theorem it proved before, walk it through one of the five most recent successful proofs and update the parameters accordingly. The paper explicitly calls replay “a departure from pure policy gradients” (Section 3.1, p. 6).

Verus form. Inference: store accepted Verus proof traces keyed by obligation shape, replaying only traces that still compile against the current source. Invalidation after a specification or dependency change is mandatory; a textual replay without recompilation is not evidence.

## technique 4: learned backtracking versus fixed search

What it is. TacticZero learns which fringe to expand, rather than committing to BFS or DFS. The ablation compares stochastic and top-k BFS/DFS, latest-fringe greedy search, and TacticZero (Section 3.3, p. 7).

Evidence. All agents in this ablation use learned tactic and argument policies and the same timestep budget of 50 (Section 3.3, p. 7). Table 2 reports TacticZero proving 132 theorems, mean 11.72 timesteps, and mean proof length 5.00. BFS/topk with branching factor 2 proves 116; the latest-fringe strategy proves 112; the four DFS variants prove 83 to 96 (Table 2, p. 7). BFS variants find shorter proofs (mean length 2.36 to 3.25) but generally need more timesteps than DFS; DFS variants find proofs quickly (mean 8.04 to 9.78 timesteps) but longer ones (mean length 5.86 to 6.36). The paper states that the testing set has 268 theorems (“13 (out of 268) testing problems”, p. 7); Inference: the 132 in Table 2 equals the 132 reported for the test set in Figure 5, so Table 2 appears to use the same 268 theorems, but the paper does not print the denominator beside Table 2.

Verus form. Inference: compare a learned obligation scheduler against FIFO, depth-first, and breadth-first queues while holding a fixed compile/SMT budget. Report both solved obligations and proof length; a scheduler cannot weaken the verifier.

## techniques for the catalog
- fringe MDP — represent partial proofs as scored fringes and choose tactic, arguments, and branch as actions
- joint tactic/argument policy — learn which tactic and theorem or term argument to apply from theorem statements
- reward shaping — combine terminal proof rewards with a failure penalty, subgoal-progress bonuses, and a small per-step penalty
- proof replay — replay one of five recent successful trajectories when a previously solved theorem fails
- learned backtracking — keep all fringes in the state and sample which one to expand, so the agent can leave a fringe predicted to be hard
- search ablation — compare learned scheduling with stochastic/top-k BFS, DFS, and latest-fringe strategies
