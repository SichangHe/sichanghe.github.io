# TacticZero: Learning to Prove Theorems from Scratch with Deep Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `wu2021tacticzero`, [paper](https://www.semanticscholar.org/paper/848160df4e4eeabf0b0f296925fc17ecbd7b65db)

## scope and result
TacticZero learns interactive theorem-proving policies in HOL4 without human proof traces. It treats a proof state as a set of potential derivation paths, predicts tactics and arguments, and learns when to backtrack. The abstract states: “The proposed framework is able to learn proof search strategies as well as tactic and arguments prediction in an end-to-end manner” and “This structure allows us to introduce a novel backtracking mechanism which enables the agent to efficiently discard (predicted) dead-end derivations and restart from promising alternatives” (Abstract, p. 1). The learned policy is evaluated by whether HOL4's kernel accepts the resulting proof.

Inference: for VL, this is a proof-search controller that proposes Verus tactics, lemma calls, and assertion sites; Verus remains the checker and must reject any invalid candidate.

## technique 1: Markov decision process over proof fringes

What it is. A state is a fringe: a set of partial derivation paths, each containing a goal and its preceding tactic sequence. An action selects a fringe, a tactic, and tactic arguments; HOL4 executes it to produce zero or more subgoals. A solved fringe is removed; a failed or dead-end fringe is discarded; backtracking resumes another fringe. This is the paper's MDP formulation (Sections 2 and 2.2, pp. 2–4).

When and steps.
1. Encode every HOL4 expression as a 256-dimensional vector using a transformer autoencoder pretrained on 4,360 definitions and theorems in Polish notation (Section 2.2, p. 4).
2. Encode each fringe goal and estimate its value with `V_goal`; combine goal values and path information into a fringe score (Section 2.2, p. 4).
3. Select a fringe, sample a tactic from the tactic policy, and sample arguments from the corresponding argument policy.
4. Apply the tactic in HOL4; replace the selected fringe by its resulting subgoal fringe.
5. If the path is predicted dead-end, remove it and restart from the highest-scoring remaining fringe (Abstract and Section 2.2).

Verus form. Inference: represent a candidate Verus proof state as a vector plus a list of pending verification obligations. An action proposes `assert`, `assert ... by`, a `proof fn` call, `reveal`, or an invariant edit; invoke `cargo verus` after each transition. Keep only compiler-accepted states and backtrack on failures. Verus obligations include Rust typing, ownership, termination, and SMT validity, so HOL4's expression encoder and tactic vocabulary do not transfer directly.

Evidence and limits. The MDP learns search and tactic selection jointly, unlike fixed BFS/DFS. The environment still trusts HOL4's kernel and tactic implementations. The action space is restricted to the tactics and argument forms in Table 1; free generation of complex terms is listed as future work (Conclusion, p. 9).

## technique 2: tactic and argument policy learning

What it is. The agent predicts one tactic from `drule`, `irule`, `fs`, `metis_tac`, `rw`, `simp`, `Induct_on`, `eq_tac`, and `strip_tac`; argument policies predict a theorem, theorem list, term, or no argument according to Table 1 (Section 3.1, p. 6). The model is trained from theorem statements only, so it learns by successful interaction rather than imitation.

When and steps.
1. Collect 1,342 theorems known to be provable by the allowed core tactics; split 80:20 into train/test (Section 3.1, p. 6).
2. For a goal, restrict candidate theorem arguments to theories mentioned in the goal and declarations earlier in the library.
3. Run the tactic policy and the appropriate argument policy; execute the resulting action.
4. Give terminal reward 5 or 15 for a proof depending on earlier success rate, −5 for failure, 0.1 for generating subgoals, 0.2 for solving a subgoal, and −0.1 for other steps (Section 3.1, p. 6).
5. Train both policies with RMSProp, learning rate `5×10^-5`, discount `γ=0.99`; training 800 iterations took two weeks on one Tesla P100 and one Intel Xeon CPU (Section 3.1, p. 6).

Verus form. Inference: define an action grammar limited to Verus constructs found in the local verifier notes, have a policy propose a construct and its lemma arguments, and compile after each action. A successful `cargo verus` run is the terminal positive reward. A policy may rank candidates, but it cannot be trusted to establish a theorem.

Evidence and limits. The paper does not provide a per-tactic accuracy denominator; only end-to-end theorem counts are reported. Candidate restriction excludes later library facts and arbitrary term synthesis, and rewards are hand-designed.

## technique 3: replay buffer for sparse proof rewards

What it is. Successful proof trajectories are retained per theorem. If a theorem previously proved is later failed, one of the five most recent successful proofs is replayed and used to update parameters (Section 3.1, p. 6). This addresses sparse terminal rewards and reduces forgetting.

When and steps. Store each successful tactic/argument sequence; on failure, sample one of the five newest; walk the agent through it and apply policy updates; resume exploration. The paper explicitly calls replay “a departure from pure policy gradients” (Section 3.1, p. 6).

Verus form. Inference: store accepted Verus proof traces keyed by obligation shape, replaying only traces that still compile against the current source. Invalidation after a specification or dependency change is mandatory; a textual replay without recompilation is not evidence.

## technique 4: learned backtracking versus fixed search

What it is. TacticZero learns which fringe to expand, rather than committing to BFS or DFS. The ablation compares stochastic and top-k BFS/DFS, latest-fringe greedy search, and TacticZero (Section 3.3, p. 7).

Evidence. On the same timestep budget of 50, Table 2 reports TacticZero proving 132 theorems, mean 11.72 timesteps, and mean proof length 5.00. BFS/top-k with branching 2 proves 116; latest-fringe proves 112; DFS variants range from 83 to 96 (Table 2, p. 7). These counts use the 268-theorem evaluation set implied by the 80:20 split of 1,342 (Inference: 1,342×20%=268.4, so the paper's table denominator should be checked against its exact plotted test set; the paper does not print the denominator beside Table 2).

Verus form. Inference: compare a learned obligation scheduler against FIFO, depth-first, and breadth-first queues while holding a fixed compile/SMT budget. Report both solved obligations and proof length; a scheduler cannot weaken the verifier.

## proof boundary, trust, and VL impact
The HOL4 kernel checks accepted proofs; the neural encoder, policy networks, reward design, replay buffer, and search implementation are trusted only as guidance. The paper compares Z3, E, and Vampire hammers on unseen problems (Section 3.2, p. 6), but the extracted text does not expose every plotted count, so no unsupported percentage is asserted here. Existing hammers and fixed searches already provide baselines; VL should not redo a generic RL theorem-proving benchmark without measuring Verus compile cost and ownership-sensitive obligations. Inference: product threat is medium: a learned scheduler could reduce proof latency, while unconstrained tactic generation and stale replay can waste compute; soundness remains with Verus if every candidate is rechecked.

## techniques for the catalog
- fringe MDP — represent partial proofs as scored fringes and choose tactic, arguments, and branch as actions
- joint tactic/argument policy — learn which tactic and theorem or term argument to apply from theorem statements
- reward shaping — combine terminal proof rewards with subgoal-progress and dead-end penalties
- proof replay — replay one of five recent successful trajectories when a previously solved theorem fails
- learned backtracking — discard predicted dead ends and restart from a promising alternative fringe
- search ablation — compare learned scheduling with stochastic/top-k BFS, DFS, and latest-fringe strategies

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
