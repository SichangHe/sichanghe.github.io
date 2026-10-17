# ARM-FM: Automated Reward Machines via Foundation Models for Compositional Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `castanyer2025armfm`, [paper](https://arxiv.org/abs/2510.14176)

## problem and contribution
ARM-FM translates a high-level natural-language task description (and, where available, an image) into a finite-state reward machine, then uses that machine to provide intermediate rewards and a language-conditioned policy state. The paper calls the result a Language-Aligned Reward Machine (LARM). It defines an RM as `⟨U, uI, Σ, δ, R, F, L⟩`: finite RM states, initial state, event symbols, deterministic transitions, reward function, final states, and a labeling function from environment states/actions to events (Section 2.1, p. 3). Each LARM state also has a natural-language instruction and embedding.

The authors write: “Automated Reward Machines via Foundation Models (ARM-FM), a framework for automated reward design in RL that leverages the reasoning capabilities of foundation models to automatically translate complex, natural-language task descriptions into structured task representations for RL training.” (Section 2, p. 2) The method targets sparse, long-horizon tasks where, per the introduction, RM design has been “confined to task-specific applications due to the complexity of their manual, expert-driven design” (Section 1, p. 1). Inference: it is an approach to structured task guidance, not a proof that the generated automaton is correct.

## technique 1: specify a reward machine as a formal automaton

When to use it: use an RM when a task consists of temporally ordered subtasks, non-Markovian progress, or reusable events. Define event predicates over environment state and action, then make each automaton transition explicit. A state represents the active sub-goal; a transition occurs when a labeled event is observed.

Step by step:

1. List the finite sub-goal states `U` and initial state `uI` (Section 2.1, p. 3)
2. Define event symbols `Σ` and a deterministic transition function `δ(u, σ)` (Section 2.1, p. 3)
3. Define `L(s, a)` that maps each environment transition to an event, and define `R(u, s, a, s′)` for intermediate and terminal rewards (Section 2.1, p. 3)
4. Mark final states `F` and attach a natural-language instruction `lu` to every state (Section 2.1, p. 3)
5. Embed each instruction with `zu = ϕ(lu)` for policy conditioning (Section 2.1, p. 3)

Verus form: Inference: encode the RM as an enum or finite indexed type and define transition and reward functions as `spec fn`s. Inference: prove determinism with a postcondition that one `(u, σ)` pair yields one successor, and prove that every executable label is in the declared event set. Inference: use `requires` on event predicates for valid environment observations and `ensures` to relate each transition to the corresponding sub-goal. Inference: embeddings are opaque numeric data in Verus; their semantic similarity is an external assumption.

Evidence and limits: the formal tuple and transition semantics are definitions, not empirical evidence. The paper states that the labeling function “is required to connect the RM’s events, transitions, and rewards to states and actions from the underlying MDP” (Section 2.1, p. 3). Inference: this means the labels are taken to reflect environment events and the instructions to match the sub-goals; the formalism does not check either. Inference: a generated machine can be internally consistent while encoding the wrong task. The paper’s own appendix shows a loose label: for UnlockToUnlock, `entered_goal_room` is `return env.agent_pos[0] < 5` with the code comment “Example check: agent is in the leftmost 5 columns.” (Appendix A.10, p. 34). In the Craftium RM listing (Appendix A.9, p. 32), the reward lines name `get_stone`, `get_iron` and `get_diamond` as events leaving `u0`, while the transition list only moves `u0` on `get_wood`; Inference: the listed reward function does not match the listed transitions, so the listing is not self-consistent as printed.

## technique 2: generator–critic self-improvement for LARMs

When to use it: use paired foundation models when an initial automaton may omit edge cases or produce invalid event predicates. The generator proposes the LARM; a critic reviews it; the generator receives the history and feedback for a fixed number `N` of rounds. A human may approve or correct a proposal. The paper says: “We present a framework to automatically construct LARMs from language-and-image-based task descriptions by iteratively prompting an FM” (Section 2.1, p. 3). The paper says it employs “N rounds of self-improvement using paired generator and critic FMs”.

Step by step:

1. Prompt the generator with the environment description, the mission text, its role, the constraints the machine must meet (densify the reward, Boolean-predicate events, compactness, strict format), the action set, and the output format; the same prompt structure is used for all tasks, with the mission and environment API changed (Appendix A.8, p. 26). Figure 1 and Section 2.1 say a visual observation is also an input
2. The shown generator prompt asks for the RM only (states, initial state, transition function, reward function, in a fixed plaintext format); the labeling functions come from a separate “Labeling Function Generator” prompt that must use only listed `env` attributes (Appendix A.8, pp. 26, 28). Section 2.1 and Figure 4 say the FM also produces natural-language state instructions; I found no prompt for them in the appendix
3. Give the candidate RM to a separate critic FM whose listed criteria are compactness, Boolean-predicate events, coverage of events, dense rewards and penalties, mission logic, and format, ending in the verdict “NO CHANGES NEEDED” or “CHANGES REQUIRED” (Appendix A.8, p. 27); a second critic checks the labeling functions for predicate fidelity, coverage, correct use of the `env` API, and clarity (Appendix A.8, p. 29)
4. Feed the candidate and critic feedback back to the generator and repeat for `N` rounds (Section 2.1, p. 3); in human mode the generator receives “the full history of LARM attempts and critic feedbacks” (Appendix A.4, p. 20)
5. Optionally replace the critic with a human comment and continue the same loop: “a human operator could replace the critic foundation model during any round of self-improvement” (Appendix A.4, p. 20)
6. Inference: executing the labeling functions in the target environment and rejecting or repairing candidates that fail is a sensible extra step; the paper text I read does not describe it, and its critic only reads the code against the listed `env` API

Verus form: Inference: treat each candidate RM as data and verify it against a formal task invariant before execution. Inference: encode critic obligations as proof functions that establish transition coverage, no unreachable required state, and reward monotonicity; a human or FM critique itself remains untrusted input. Inference: if predicates inspect mutable environment state, expose an abstract state model and prove that each Rust predicate agrees with the model; external simulator behavior remains trusted.

Evidence and limits: Table 3 (Appendix A.4, p. 20) reports, for MiniGrid DoorKey, “No intervention. The FM self-improvement loop was sufficient. Human check confirmed correctness after 3 iterations.” It reports human intervention for UnlockPickup because “The initial LARM missed an edge case: the agent dropping a key after pickup.”; for KeyCorridorS3R3 because “The originally generated LARM was too sparse.”; and for all Meta-World tasks, where a human scaled reward values to avoid a local minimum. It reports no intervention for BlockedUnlockPickup, Craftium and the 1,000 XLand-MiniGrid LARMs (the latter validated by an LLM-as-judge). Inference: these cases show that self-improvement alone did not guarantee completeness or good reward scale in 3 of the 7 listed environment groups. The authors used GPT-4o for all LARM components except the 1,000 XLand LARMs, generated with open-source models of different scales (Section 3, p. 4).

## technique 3: augment RL with LARM state, dense reward, and replay

When to use it: use this integration for a standard RL agent that needs sub-goal-aware state and intermediate feedback. The augmented MDP is the product `S × U`; the policy receives the environment observation and the embedding of the current LARM state. After each action, the labeling function emits an event, the RM transitions, and the agent receives the sum of environment and RM rewards.

Step by step (DQN Algorithm 1, Appendix A.3, p. 19):

1. Initialize replay memory, online and target Q networks, target update frequency, the LARM, and embedding function `ϕ` (Algorithm 1, lines 1–6)
2. Reset the environment and RM to `s0` and `uI` at each episode (lines 7–9)
3. Choose a random action with probability `ε`; otherwise maximize `Q(st, ϕ(ut), a)` (lines 10–12)
4. Execute the action, observe `Rt` and `st+1`, then compute event `et = L(st+1, at)` and next RM state `ut+1 = δ(ut, et)` (lines 13–15)
5. Compute `RtRM = R(ut, et)` and total reward `Rttotal = Rt + RtRM` (lines 16–17)
6. Store `(st, ut, at, Rttotal, st+1, ut+1)` and train on minibatches over this joint state (lines 18–21)
7. Update the target network every `C` steps (line 22)

Verus form: Inference: model the transition as a pure `spec fn` from `(s, u, a)` to `(s′, u′, r)` and prove that the executable Rust environment adapter preserves the RM transition and reward equations. Inference: represent the replay tuple with a Rust struct and prove serialization/deserialization invariants if replay is persisted. Inference: Verus can verify deterministic RM logic, but stochastic policy learning, neural-network arithmetic, and environment dynamics require separate trusted models or testing.

Evidence: the authors report results “averaged over 3 independent random seeds, with shaded regions and error bars indicating one standard deviation” (Section 3, p. 5). On MiniGrid DoorKey, DQN+RM consistently beats DQN, DQN+ICM, and ReAct across fixed and procedurally generated layouts; on three harder tasks (UnlockToUnlock, BlockedUnlockPickup, KeyCorridor), it is the only method solving all three (Section 3.1, p. 5). On Craftium's procedurally generated Minecraft-like world, PPO+LARM completes the wood→stone→iron→diamond sequence while baseline PPO makes minimal progress (Section 3.2, p. 6). On Meta-World continuous manipulation, with SAC, the paper says the method “achieves higher success rates than learning from sparse rewards alone” (Section 3.3, p. 6); Figure 8’s caption says “In most tasks”, and Appendix A.4 notes a human scaled the RM reward values there. On UnlockToUnlock, Appendix A.7.2 (p. 23) reports that the agent first maximizes the LARM reward, and the sparse-task success rate then “rises sharply”.

## technique 4: compositional language embeddings and zero-shot reuse

When to use it: use language embeddings when several tasks share semantically related sub-goals and a single policy should transfer skills. The policy is conditioned on `ϕ(ut)` rather than a one-hot RM state. The paper's zero-shot design trains on tasks `TA` and `TB`, then evaluates a new task `TC` whose sub-goals have embeddings near those seen during training (Section 3.4, p. 7).

Step by step:

1. Train one policy `π(a|s, zu)` on the tasks `{TA, TB}`, each with its own LARM; it “learns skills corresponding to the union of all sub-goal embeddings” (Section 3.4, p. 7)
2. Run the ablation in Figure 9 (legend: Baseline, No RM Reward, No Embeddings, Ours): the paper describes embeddings only, LARM rewards only, and both, against a baseline, on a Rainbow DQN agent trained on 1, 3, 5 or 10 simultaneous XLand-MiniGrid tasks (Section 3.4, pp. 6–7)
3. Generate an unseen composite LARM `RC` with the FM and run the policy on it without retraining (Section 3.4, p. 7)
4. The paper’s condition for zero-shot success is that “for any state u′ ∈ UC, its embedding zu′ is close to an embedding seen during training” (Section 3.4, p. 7). Inference: check this condition before crediting success to skill reuse

Verus form: Inference: a Verus proof can establish that the policy receives the correct RM state and embedding, but cannot prove that vector proximity implies behavioral transfer. Treat the embedding model and generalization claim as trusted empirical components; verify only the finite-state interface and reward invariants.

Evidence: the XLand ablation shows that only the full method (LARM rewards plus state embeddings) maintains high success as simultaneous tasks increase to 10 (Figure 9, p. 7). The zero-shot claim is within the same domain: “zero-shot generalization across novel task compositions within the same domain, rather than cross-domain transfer” (Section 3.4, p. 6). The main text illustrates one unseen composite task `TC` (Figure 10, p. 7; repeated as Figure 17, p. 18). Section 4 (pp. 7–8) analyses embeddings from 1,000 XLand tasks by PCA, using Qwen3-30B-A3B-Instruct-2507 to obtain them, and reports that start, middle and end instructions form distinct clusters; I found no statement of which embedding model `ϕ` the training runs used.

## techniques for the catalog

- LARM construction: translate a natural-language task into a finite reward automaton with event predicates, rewards, final states, and language instructions
- generator–critic refinement: iteratively repair the automaton with an FM critic and optional human feedback
- product-state RL: train on the cross-product of environment state and RM state with summed rewards and augmented replay
- compositional embeddings: condition one policy on semantic RM-state embeddings to reuse sub-goal skills on unseen task compositions
