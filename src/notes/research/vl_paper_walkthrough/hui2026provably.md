# Learning Provably Correct Distributed Protocols Without Human Knowledge
(authored by agents unless marked 🧑)
Tag: `hui2026provably`, [paper](https://www.semanticscholar.org/paper/c932ba2f63b0363303c986473c9df7b1092b22f5)

## scope and result

The paper presents Guided Global Monte Carlo Tree Search (GGMS), a synthesis procedure for finite-state distributed protocols. Its input is a protocol specification (initial states, decision states, and correctness properties) and a bounded setting (process count, rounds, failures, and internal-state count). Its output is a deterministic state machine. The model is synchronous, broadcast-only, uses identical state machines, models crashes as message loss, and requires decisions in the final round. The authors state: “Protocols output by GGMS are verified correct via exhaustive model checking for all executions within the bounded setting.” (Abstract, p. 1.) They also state: “We further prove that, under mild assumptions, the search process is complete: if a correct protocol exists, GGMS will eventually find it.” (Abstract, p. 1.)

Inference: the central separation is synthesis versus certification. MCTS and the neural policy propose transitions; exhaustive verification checks every modeled execution. A bounded check proves only the selected process count and protocol bounds. The paper explicitly says: “Model checking provides correctness guarantees for a concrete N . Proving correctness for arbitrary N requires inductive formal verification ... an important direction we leave to future work.” (Section 2.2, p. 2.)

## technique 1: state-machine synthesis from a formal safety specification

What it is. Each process runs one deterministic transition function. Its input is round, process identifier (optionally), current state, and received states; its output is the next state broadcast in the next round. The allowed state classes are initial, decision, lost, and internal. The human supplies only initial states, decision states, and correctness properties; GGMS must discover useful internal states and transitions. The formal definitions are: “Definition 3.1 (Protocol Specification). A target protocol is a tuple DP = (I, D, C): initial states I, decision states D, and correctness properties C.” and “Definition 3.4 (State Machine). A state machine SM is a transition function: [round , procID, inputStates] 7→ newState.” (Section 3.3, p. 3.)

When to use it. Use this representation when the target protocol can be bounded to a finite number of rounds, processes, states, and crash patterns. It is useful for discovering a protocol when no implementation is supplied, including a problem such as synchronous atomic commit for which the authors say they did not know a prior solution.

How to do it.

1. Choose the bounded setting S = (n, r, f, k), and define I, D, and C. (Section 3.3, p. 3.)
2. Represent a scenario as initial assignments and a set of message losses. The paper defines a scenario as “(Init, Loss) specifies initial states Init[1..n] and message losses Loss ⊆ {(i, j, t) : message from i to j lost in round t}.” (Section 3.3, p. 3.)
3. Execute synchronous rounds: broadcast, apply the scenario's message losses, apply the transition function, and decide in the final round. (Section 3.2, p. 3.)
4. Start with small settings and increase rounds or internal states when synthesis fails. (Section 3.3, p. 4.)

Example. FloodSet stores a set W, broadcasts W, unions received sets, then decides min(W) after f+1 rounds. For atomic commit, the learned two-process, one-failure protocol uses `internal:a` only when no message is lost and every proposal is `init:commit`; every other first-round case uses `internal:b`; it commits in the final round only when every received state is `internal:a`, otherwise it aborts (Algorithm 1, p. 6).

Verus form. Inference: encode the transition function as a pure `spec fn` over a finite state enum and message vector, and encode safety as `ensures` clauses on a proof wrapper that enumerates bounded scenarios. Use executable Rust only for the protocol runner; keep the finite transition relation and scenario enumeration in specification/proof code. Verus's `spec fn`, `ensures`, and `assert` forms are the constructs documented in the local Verus study. The paper's neural transition proposer does not carry over as a proof: it is an input generator, while Verus proves the resulting transition relation against the contract.

Evidence and limits. The paper's model assumes identical machines, broadcast, synchronous timing, and final-round decisions (Section 3.4, p. 4). It excludes Byzantine behavior and point-to-point protocols. The output is certified only for fixed n, r, f, and k; arbitrary-n correctness remains unproved. Inference: a Verus implementation would need a separately proved correspondence between the Rust protocol state and this abstract state machine, plus explicit assumptions for networking and crash semantics.

## technique 2: MCTS with transformer policy and adversarial scenarios

What it is. GGMS models protocol design as a two-player game. The protocol player chooses transitions to satisfy properties; an adversarial player chooses initial states and message losses to expose failures. The authors write: “We model the whole process as two players in a game. The protocol player tries to find the right transitions in its state machine ... The adversarial player tries to find the scenarios that can defeat the protocol player.” (Section 4.1, p. 4.)

How to do it.

1. Initialize a neural model that returns a probability for every possible next state for an input tuple (round, process, input states). (Appendix C.1, p. 14.)
2. For a chosen scenario, run MCTS until protocol termination. At each node, select the transition with greatest UCB score
   `U(s,a) = Q(s,a) + c_puct P(s,a) sqrt(sum_b N(s,b))/(1+N(s,a))`; select message losses with the opposing objective. (Appendix C.5, pp. 18–19.)
3. Expand unvisited nodes, evaluate terminal reward (+1 if no property is violated, −1 otherwise), and back up the reward along the visited path. (Appendix C.5, p. 19.)
4. Record the simulated transition probabilities in a bounded training buffer and update the policy with cross-entropy loss. (Appendix C.1 and Section E, pp. 14, 20.)
5. During inference, choose the highest-probability transition because process-local execution cannot see MCTS visit counts. (Section 4.1, p. 4.)

The model uses a transformer encoder with one-hot input, global average pooling, and an output layer; an MLP alternative has three fully connected layers. Both use cross-entropy (Section E, p. 20). Experiments use a 16-core AMD 7302P at 3.00 GHz with 128 GB memory, learning rate 0.001, 100 scenarios per episode, and `#rounds × #processes × 1000` MCTS iterations per simulation (Section F, p. 20).

Verus form. Inference: use MCTS only offline to propose a concrete transition table. Then translate that table into a Rust `spec fn` and prove the table's safety properties; no neural network or runtime search is needed in the verified binary. A Verus proof can model the adversarial choices as universally quantified scenario inputs or as bounded loops with invariants, but the paper's Python/Keras training remains outside the trusted Rust artifact.

Evidence. In Table 1 (p. 7), each success rate is over 10 runs. GGMS reaches 100% for `ac-2-1`, `ac-4-1`, `con-2-1`, `con-3-2`, and `con-4-3`; it reaches 60% for `ac-3-2`, 70% for `ac-4-2`, and 90% for `con-4-2`. These are bounded protocol settings, not arbitrary process counts. Inference: the results show search effectiveness under the paper's model, not that a learned neural policy is itself a formal proof.

## technique 3: global DFS freezing to resolve superposition

What it is. Independent scenarios can support different correct meanings for the same internal state. MCTS may combine transitions from incompatible protocol versions, producing an incorrect state machine. The paper calls this the “superposition problem” and explains that “MCTS may end up in a situation where it learns some transitions from one version and some other transitions from another version, but when these transitions are combined, they do not generate a correct state machine.” (Section 4.2, p. 4.)

How to do it.

1. Collect transition probabilities from MCTS. Mark an input ambiguous when at least two outputs have probability above 0.2 and differ by at most 0.1. (Appendix C.3, Algorithm 5, p. 16.)
2. Sort ambiguous inputs by later round first and fewer lost messages first; freeze one candidate transition and push it onto a stack. (Appendix C.3, Algorithm 5, p. 16.)
3. Continue MCTS with frozen transitions forced. If a scenario receives negative reward and a frozen transition was activated, pop the most recent activated entry. (Appendix C.3, Algorithm 4, p. 16.)
4. If that input still has unexplored outputs, freeze its next output and push it back; otherwise keep popping, exactly as depth-first backtracking. (Appendix C.3, p. 16.)

Theorem 4.1 states that, in a feasible finite setting and with an accurate unfreezing condition, DFS eventually finds a correct machine because it can enumerate the finite machine space (Section 4.2, p. 5). The paper notes that its current unfreezing test exhaustively explores all relevant state machines and may be replaced by a Z3-style check, because the exhaustive test does not scale (Section 4.2, p. 5; Appendix C.3, p. 16).

Verus form. Inference: freezing is a synthesis-time search constraint, not a Rust construct. Its result can be represented as a finite map from input tuples to output states and then checked with Verus lemmas. Do not write `invariant(...)` as a call or use a runtime proof function; express loop invariants in Verus's supported loop syntax and keep proof functions ghost-only.

Evidence and assumptions. The completeness argument depends on finite state-machine space and accurate unfreezing. It does not imply practical termination: the authors warn that time limits can prevent success. The illustrative three-process machine has 54 possible inputs and two possible outputs per input, so naive enumeration has 2^54 machines (Section 4.2, p. 5). Inference: freezing reduces search only when the chosen transition is compatible with at least one correct machine; a bad freeze can force backtracking.

## technique 4: guided curriculum and counterexample replay

What it is. GGMS reduces ambiguity by training first on scenarios that have definite decisions and losses late in the protocol, then progressively allowing harder losses and mixed initial states. The authors state: “After freezing the initial path, GGMS simulates only those scenarios where message losses occur in the final round and initial states lead to a definite decision.” (Section 4.3, p. 6.)

How to do it.

1. Set phase 0 to definite initial states and losses only in the final round. (Appendix C.1, p. 14.)
2. After validation finds no failures for that phase, advance the phase to allow losses in the final two rounds, then continue until all rounds are allowed. (Section 4.3, p. 6.)
3. Finally relax the initial-state restriction to all initial assignments. (Section 4.3, p. 6.)
4. After every episode, exhaustively validate; retain failed scenarios. Scenario sampling chooses a failed scenario with probability 0.7 when one exists, otherwise or with probability 0.3 samples uniformly from the current phase (Appendix C.2, Algorithm 3, p. 15).

Validation enumerates all x^n initial-state patterns and all loss patterns consistent with crash timing, forms their cross product, and simulates each in parallel (Appendix C.4, Algorithm 6, pp. 16–17). The verifier returns the failed scenarios to the training loop. This is a counterexample-guided loop: “GGMS integrates verification into a counterexample-guided loop: after each episode, the verifier either confirms correctness ... or returns counterexamples whose sampling rate is increased in subsequent episodes.” (Section 4.4, p. 6.)

Verus form. Inference: encode the bounded scenario generator as a ghost iterator or finite sequence and prove that each generated loss pattern respects the crash predicate. Use a loop invariant stating that every checked scenario satisfies the transition contract; separately prove that the generator covers the intended finite set. The paper's parallel Python validator is an implementation detail, not evidence that coverage is complete for unbounded systems.

Evidence. The verifier is exhaustive for the selected bound, while MCTS dominates runtime in the reported implementation (Section 4.4, p. 6). Table 1 reports GGMS average times, in minutes, over successful runs: `con-4-3` averages 3358 minutes (minimum 1857, maximum 5693) over the 10-run experiment, and `ac-4-2` averages 754 minutes (minimum 563, maximum 938); the table leaves averages blank where no run succeeded. Inference: these timings make the curriculum and replay practically significant, but they also show that exhaustive bounded synthesis is expensive.

## what is proved, measured, and trusted

The paper proves the finite-search completeness theorem for GGMS under its feasibility, finiteness, and unfreezing assumptions, and proves a group-freezing preservation theorem when the selected simulation has a definite decision and only one transition is frozen per (round, process) pair (Theorem 4.2, Section 4.3, p. 5). It measures success and wall-clock time for 10 runs per setting, comparing MCTS, MCTS+DFS, and GGMS (Table 1, p. 7). It reports a newly found synchronous atomic-commit protocol and FloodSet-like consensus protocols (Section 5, pp. 6–8).

The trusted core includes the transition semantics, crash/message-loss model, correctness properties, scenario enumerator, and the model checker. The neural model, MCTS heuristics, Python implementation, hardware, and Keras training are not themselves verified. The paper does not prove arbitrary-n correctness, asynchronous correctness, Byzantine tolerance, point-to-point behavior, or correctness of a generated Rust implementation.

## techniques for the catalog

- bounded state-machine synthesis — define initial/decision states and safety properties, then search a finite transition function
- adversarial MCTS — jointly search protocol transitions and crash/message-loss scenarios with terminal safety rewards
- DFS freezing — freeze ambiguous transitions, continue learning, and backtrack on negative reward
- guided curriculum — begin with definite late-loss scenarios and progressively relax losses and initial states
- exhaustive counterexample replay — enumerate bounded executions, retain failures, and bias later sampling toward them
- group freezing — freeze one transition per round/process pair when a definite-decision scenario preserves completeness
