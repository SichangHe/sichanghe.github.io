# Towards Neural-Guided Program Synthesis for Linear Temporal Logic Specifications
(authored by agents unless marked 🧑)
Tag: `camacho2019neural`, [paper](http://arxiv.org/abs/1912.13430v1)

## problem and result
The paper studies reactive LTL synthesis: a strategy chooses system variables after each environment move so every resulting infinite trace satisfies an LTL formula. It reformulates bounded synthesis as a safety game and then uses deep Q-learning to guide search. The paper states, “We employ a neural network to learn a Q-function that is used to guide search, and to construct programs that are subsequently verified for correctness” (abstract, p. 1). Correctness comes from checking a concrete policy against the known transition model; the neural network is only a heuristic.

## technique: bounded synthesis as a safety game
Use this when an LTL specification can be transformed to a universal co-Büchi (UCW) automaton and exact synthesis is too expensive. The paper's construction is:

1. Define the specification as environment variables X, system variables Y, and formula φ (Definition 1, p. 2).
2. Transform φ into a UCW automaton Aφ = (Q, Σ, q0, δ, QF). A run is accepting when its rejecting-state co-Büchi index is finite (Section 2.1, p. 2).
3. Choose a bound k. Represent a game state s as one integer per automaton state, recording the maximum rejecting-state count among runs that currently end there; use −1 when no run ends there (Section 3.1, p. 4).
4. Let the environment choose x ⊆ X and the system choose y ⊆ Y. Advance every automaton run with δ and increment the counter when the destination is rejecting. Clamp counters at k. Mark states with idx(s)=k as losing (Theorem 3, p. 4).
5. Solve the resulting safety game by a fixed-point computation. A policy that avoids losing states induces the history-dependent LTL strategy by storing the current game state (Sections 3 and 3.3, pp. 3–5).

The paper gives the key guarantee: “LTL specification ⟨X , Y, ϕ⟩ is realizable iff the safety game Gk ... has a solution for some k < ∞” (Theorem 3, p. 4). Automata decomposition handles a conjunction φ=φ1∧…∧φm by building one UCW and one safety game per conjunct and taking their cross product (Section 3.2, p. 4).

Inference: In Verus, represent the bounded game state as a struct of bounded integer counters, define a pure transition `spec fn` for δ/counter updates, and state an invariant that every reachable state has counters in `-1..=k`. A `proof fn` can show that a policy's transition preserves the invariant and that no reachable state has `idx == k`; this is the analogue of the paper's exhaustive safety-game check. Verus does not provide LTL or UCW primitives, so the automaton and its transition table must be supplied as Rust data and proved consistent separately.

## technique: Bellman equations and value iteration
Use this when the safety-game transition function T is known and a numerical value can guide search. Define V(s) as the worst co-Büchi index reachable when both players act optimally. The paper's equations are V(s)=maxx Q(s,x) and Q(s,x)=max(idx(s), miny V(T(s,x,y))) (Theorem 5, p. 6). Choose the system action minimizing the successor value. Value iteration performs the one-step update Q(s,x) ← max(idx(s), miny maxx' Q(T(s,x,y),x')). Theorem 6 says repeated updates converge on safe states when every Q-value is updated sufficiently often and initialization is finite (Section 4.2, p. 6).

Inference: A Verus encoding can use a finite map or fixed array for Q values, with a loop invariant stating that each update is the Bellman backup and values remain bounded by k. This proves the arithmetic update and policy extraction, but it does not prove termination of an unbounded search unless the finite state space and update schedule are explicit.

## technique: DQS neural-guided search
Use this when exact fixed-point computation does not scale but a known T permits later validation. DQS encodes state s as the neural-network input and outputs one Q estimate for each environment action. Training episodes start at the initial state, simulate environment/system actions, and stop at a horizon, the all-−1 state, or idx(s)>K (Section 5.1, p. 7). With probability μ the player uses an ε-greedy policy; otherwise it is greedy. A batch samples states from prioritized replay, computes one-step targets with rounded Q values, clips them to K, and updates network weights to reduce temporal-difference error. The paper used μ=ε=0.2, learning rate α=0.005, K=4, a 50-step horizon, 1000 episodes, replay batches of 32, and one update every four exploration steps (Section 6, p. 9).

Double DQS maintains a target network Qt for targets and copies Qθ into Qt after each episode (Section 5.1, p. 8). Losing-gameplay replay adds states from a failed partial play backwards, one batch step per state (Section 5.2, p. 8). A potential Φ(s), based on distance from the currently maximal-index automaton state to a rejecting state, is added to targets to provide denser supervision (Section 5.3, p. 8). The paper reports: “The use of a stronger supervision signal in the form of potentials greatly improved the learning process” (Section 6, p. 10).

Inference: Verus should treat Qθ, replay, and ε-greedy choices as untrusted inputs. Verify only the extracted deterministic policy: define `spec fn policy` and prove by finite reachability induction that every reachable state has `idx < K`. Neural training itself is outside Verus's trusted proof boundary.

## evidence, limits, and product implications
The implementation used Spot for LTL-to-UCW conversion and TensorFlow 2.0, on 2.4 GHz Linux machines with 10 GB memory (Section 6, p. 9). It evaluated 19 lilydemo benchmarks, with each configuration run 20 times on each of 10 benchmarks shown in Figure 1 (caption, p. 10; the text and caption therefore describe different benchmark counts). DDQS learned faster than DQS, losing-play replay reduced episodes, and potentials improved learning. The learned controllers were significantly larger than minimal controllers (Section 6, p. 10). Decomposition increased automaton states and training effort, and the learned greedy policies did not find exact solutions on large specifications where decomposition was necessary (Section 6, p. 10). The authors explicitly limit the claim: “While we did not solve the largest benchmark problems in SYNTCOMP, and our approach did not manifest state-of-the-art performance” (Section 7, p. 11).

What is proved is the bounded-synthesis characterization, Bellman/value-iteration convergence under stated assumptions, and correctness of a candidate policy when exhaustive reachable-state checking succeeds. What remains trusted is Spot's automaton construction, the finite transition model, the implementation of exhaustive enumeration, and the neural arithmetic used to propose a policy. The paper assumes a known transition function and finite UCW game; it does not establish neural convergence or scalability to large LTL specifications.

Inference: VL should reuse the paper's separation between heuristic generation and a small, exhaustive proof checker. It should not redo the paper's LTL game-theory or neural-training experiments unless it needs a domain-specific policy learner. The main product threat is moderate: agent-generated verified Rust could still encode the wrong automaton or transition function, while Verus would prove only the supplied model. A checked, finite policy certificate would substantially reduce that risk; an unchecked neural policy would not.

## techniques for the catalog
- bounded UCW safety game: encode LTL realizability as a finite counter game and prove a policy avoids the rejecting bound
- automata decomposition: solve conjunct automata in a cross-product game to reduce individual transformation cost
- Bellman/value iteration: use worst-case successor values to derive a safety-game policy
- DQS neural guidance: train Q estimates with replay and then verify the extracted policy against the exact transition model
- losing-play replay and potentials: focus learning on failed traces and add distance-based supervision to reduce sparse feedback

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
