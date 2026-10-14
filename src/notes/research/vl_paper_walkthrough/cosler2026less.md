# Less Effort, Shorter Proofs: Reinforcement Learning for Security Protocol Analysis in Tamarin
(authored by agents unless marked 🧑)
Tag: `cosler2026less`, [paper](https://arxiv.org/abs/2605.23643)
## scope and prior notes

Cosler, Cremers, Finkbeiner, Ghanem, and Medinger present a reinforcement-learning (RL) proof-search system for Tamarin, a symbolic verifier for security protocols. The contribution is an API that exposes Tamarin's constraint-solving search to an external client, plus a Monte Carlo Tree Search (MCTS) agent whose neural policy and value estimates learn from completed subproofs. The paper evaluates 16 case studies, from small textbook protocols to WPA2, SPDM, 5G authentication, Signal, and WireGuard.

The paper's abstract states the outcome: “Our method finds more proofs automatically than Tamarin’s standard search and produces shorter proofs than both the standard and human-engineered heuristics.” (Abstract, p. 1.) The target is proof-search effort, not a new protocol logic. Tamarin still supplies the symbolic semantics, constraint-solving rules, and final proof checker.

## technique 1: expose Tamarin through a stateless proof-search API

What it is. Tamarin normally chooses applicable constraint-solving rules with a heuristic and stores its proof search internally. The authors turn it into a stateless REST server. An external client obtains the initial constraint system and applicable rules, executes one selected method at a time, and submits a constructed proof to a final checker. The server has three endpoints: `getInitialSystem`, `executeMethod`, and `checkProof` (Section 4.2, pp. 5–6).

When to use it. Use the API when a custom search algorithm needs information unavailable to Tamarin's built-in tactics, such as the whole constraint system, proof history, graph deduplication, or learned priorities. It also permits clients in languages other than Tamarin's implementation language.

How to apply it.

1. Start `getInitialSystem` for a lemma; receive the initial constraint system and its applicable methods (Section 4.2, p. 6)
2. Select one applicable rule using a heuristic or search algorithm (Section 4.2, p. 6)
3. Send the current constraint system and selected method to `executeMethod`; receive child systems and each child's applicable methods (Section 4.2, p. 6)
4. Store the returned systems in a client-side tree or graph and repeat until a solved or contradictory system is reached (Section 4.2, pp. 6–7)
5. Construct the proof tree and send it to `checkProof`; retain the returned proof file and metadata such as size (Section 4.2, p. 6)

The paper says the API “allows users to interact with Tamarin’s proof search without modifying its source code.” (Section 4.2, p. 6.) Tamarin's own solving rules remain sound and complete for the modeled constraint system (Section 4.1, p. 4); the API changes who chooses their order.

Verus form (inference). A comparable Verus service could expose candidate proof obligations and diagnostics to an external search process, but Verus's final verifier must recheck the generated Rust proof. A REST response cannot itself be a trusted proof fact. Keep the checked source and exact tool version as the acceptance boundary, and use the external API only to choose lemmas, invariant instantiations, or proof steps.

Evidence and limits. The API enables the experiments but is not separately benchmarked for latency or correctness. It delegates every rule application and final proof validation to Tamarin. The paper states: “Tamarin performs unbounded verification, i.e., there are no bounds on the number of protocol sessions, the number of messages, the number of agents running the protocol, and, thus, the size of a counterexample.” (Section 3, p. 3.) Searches can therefore fail to terminate. The API does not make that underlying problem decidable.

## technique 2: AND/OR Monte Carlo graph search

What it is. The agent treats a constraint system as an OR node: choosing any one applicable proof method can succeed. A method yielding multiple child systems creates an AND node, conservatively requiring all children to resolve. The client merges equal constraint systems reached through different paths into a directed acyclic graph, avoiding duplicate work. Selection uses a PUCT-style score combining backed-up value and the neural prior. Expansion evaluates the neural network, executes the top `N` methods, and creates OR or AND children. Backup takes a visit-weighted mean at OR nodes and a minimum over non-contradictory visited children at AND nodes. Once a subtree resolves, extraction walks the proven child at OR nodes and all branches at AND nodes (Section 5.1, pp. 6–8).

The algorithm is explicit in Figure 3. Its phases are selection, expansion/evaluation, backup, and extraction. Terminal contradictions and solved systems receive fixed values, while a method timeout is retried with a longer timeout and then excluded if it fails again (Section 5.1, p. 7).

How to apply it.

1. Represent each proof state by its constraint system and applicable methods; mark method-choice nodes OR and case splits AND (Section 5.1)
2. At an OR node, traverse to the child maximizing the PUCT score, which combines `V(s,a)`, a value discount, exploration coefficient, and prior `p(a|s)` (Section 5.1, pp. 6–7)
3. At an unexpanded node, query the policy/value network and execute the top `N` methods through the API (Section 5.1, p. 7)
4. Create an OR child for one successor, a terminal child for solved/contradictory results, or an AND node with uniformly initialized children for a case split (Section 5.1, p. 7)
5. Back up values: visit-weighted mean for OR; minimum of visited non-contradictory children for AND (Section 5.1, p. 7)
6. Merge duplicate systems reached by different paths, then extract and independently validate a resolved proof tree (Section 5.1, pp. 7–8)

The graph is useful because the same state can arise from different interleavings. The authors report that shared nodes are usually 2–5% of the search and reach 25% for some protocols (Section 5.1, p. 8).

Verus form (inference). Treat a Verus proof obligation as an OR node over candidate lemmas or trigger choices, and a lemma with multiple subgoals as an AND node. The generated proof must still pass Verus; graph values can rank attempts but cannot replace a checked `ensures`. A proof-state hash must include all facts that affect Verus's semantics, otherwise merging can conflate obligations.

Evidence and limits. The algorithm is a search strategy over Tamarin's sound rules, so a checked proof remains evidence of the stated property. It can still exhaust its budget or time on deep existential goals. The paper reports that existential lemmas are especially difficult because solutions are deep and solved branches provide little contradictory-subproof training (Section 6, pp. 11–12).

## technique 3: neural policy and value representation

What it is. The observable state is the set of applicable proof methods rather than the full constraint system, because full-state graph encodings did not scale. Each method's type and arguments are tokenized and embedded. A Transformer encoder produces a vector per method. A pointer-style policy head scores each method and normalizes scores into a prior distribution. A separate value head scores methods and mean-pools them to one state value; both heads share the encoder (Section 5.2, pp. 8–9).

How to apply it.

1. Encode every applicable method as its type and arguments, using the same textual representation as Tamarin's web interface (Section 5.2, p. 8)
2. Tokenize and embed the sequences, add sinusoidal positions, and run the Transformer encoder (Section 5.2, p. 8)
3. Use pointer attention to score methods and normalize logits into `p(a|s)` (Section 5.2, p. 8)
4. Use a value head to produce a scalar estimate from per-method scores (Section 5.2, p. 9)
5. Feed the prior to PUCT and the value to expansion and backup (Section 5.1, pp. 6–8)

The paper says: “The observable proof state is encoded by a Transformer-based neural network.” (Section 5.2, p. 8.) The observation is intentionally partial: it omits the complete constraint system. This reduces input size but asks the network to infer useful state information from available actions. The paper's full-state graph-network experiment encountered scalability problems (Section 5.2, p. 8).

Verus form (inference). A model could encode normalized Verus diagnostics, candidate lemma names, and local goal shapes, then rank proof attempts. Avoid treating raw source text as a sufficient state: hidden context, quantified facts, and module imports can change validity. Store the exact candidate and let Verus validate it after every accepted search path.

Evidence and limits. The network learns per protocol from self-generated data; there is no large cross-protocol pretraining. The authors explicitly leave transfer learning across protocols open because each Tamarin protocol defines its own semantics (Section 6, p. 12). This limits claims about generalization beyond the 16 evaluated models.

## technique 4: heuristic combination and reward shaping

What it is. The learned prior can be combined with Tamarin's existing heuristic rank. A rank-dependent logit bias controlled by `λ` and temperature `T` interpolates between a purely learned policy (`λ=0`) and the built-in ordering. Each edge receives base cost −1, plus normalized penalties for branching, soft execution time, and hard timeouts: `R(s,a)=−(1+βb+αt+τh)` (Sections 5.3–5.4, pp. 8–9).

How to apply it.

1. Obtain Tamarin's heuristic ordering of applicable methods (Section 5.3)
2. Convert ranks to a bias and add `−λr` to the neural logits before softmax (Section 5.3, p. 8)
3. Set `λ=0` to disable the heuristic or increase it when the built-in ordering is useful (Section 5.3)
4. Assign every edge base reward −1 to prefer termination and shorter proofs (Section 5.4, p. 9)
5. Add normalized branching, wall-clock, and hard-timeout penalties with tunable weights (Section 5.4, pp. 9–10)
6. Retry timed-out methods with an extended timeout; give a fixed penalty to methods that succeed only after retry and exclude methods that still fail (Section 5.4, p. 9)

Verus form (inference). Rank candidate proof lemmas with project heuristics while penalizing solver time and repeated timeouts. Reward shaping should influence search only; never weaken a contract to obtain a reward. Report proof size and solver time separately so the policy cannot hide a slower or less maintainable proof behind a single scalar.

Evidence and limits. The paper reports that short proofs are easier to understand and maintain, but reward is only a proxy for that goal (Section 6, p. 11). Hyperparameters vary by protocol (Appendix A, Table 3), so a single universal setting is not established.

## technique 5: online self-play, partial-subproof training, and multi-worker search

What it is. Parallel workers run independent MCTS searches against separate Tamarin servers. When a subtree resolves, the client extracts a training tuple `(state, action, target value)` immediately instead of waiting for a complete proof. A centralized trainer samples a FIFO replay buffer, updates policy cross-entropy and value mean-squared-error losses with Adam, and sends the latest network weights back to workers. Workers can cover multiple lemmas or protocols, sharing the network (Section 5.5, pp. 9–10).

How to apply it.

1. Run workers on separate lemma searches and collect resolved subproofs during search (Sections 5.1 and 5.5)
2. Recompute target values by backing up resolved subtrees without the network's own estimates, avoiding self-contamination (Section 5.1, p. 8)
3. Insert tuples into a FIFO replay buffer and sample inversely to example draw count; require a minimum fill fraction and maximum repeat count (Section 5.5, p. 10)
4. Optimize policy cross-entropy plus value mean-squared error with Adam and gradient norm 1.0 (Section 5.5, p. 10)
5. Increase the search budget geometrically after exhaustion (`B' = floor(Bφ)`) and restart (Section 5.5, p. 10)
6. Send updated weights to workers and schedule lemmas round-robin across protocols (Section 5.5, p. 9)

Verus form (inference). The analogous system can learn from successful Verus subproofs, but every training target must be regenerated and independently checked after source changes. A replay buffer should retain the exact Verus version and module dependencies; otherwise a proof state may no longer mean the same thing.

Evidence and limits. The method learns from partial subproofs, unlike approaches that wait for a full proof. It still underperforms on existential lemmas and on very expensive method calls. For SPDM and 5G Handover XN, one expansion can take up to 90 minutes, limiting exploration (Section 6, p. 12).

## measured evidence and denominators

The evaluation contains 16 case studies. Table 1 reports lemma counts by protocol and universal/existential type. The strongest examples are: 5G Handover EPS N26, where RL solves 8/8 total lemmas while baselines solve 3/8; Signal, 5/5 versus 2/5 for the `c` heuristic and 1/5 for `s`; 5G AKA, 13/13 versus 9/13 for `c`; 5G Handover XN, 9/20 versus 3/20 for `c`; SPDM, 37/49 versus 43/49 for `c`; and WPA2, 73/85 versus 43/85 for `c` (Section 6, pp. 10–11, Table 1). The denominator is each protocol's total universal plus existential lemmas; parenthesized totals indicate that the original heuristic did not solve every reported lemma in the current reproduction.

Proof size is measured only on the intersection of lemmas solved by both compared methods in Table 2. Examples include YubiKey HSM, where RL averages 20.8 steps versus 378.8 for the `c/s` baseline; 5G Handover EPS N26, 17.3 versus 9531.7; and WPA2, 34.8 versus 903.7. The paper also compares against original human heuristics on their shared lemma sets: RL averages 24.4 versus 85.8 for 5G Handover EPS N26, 48.3 versus 102.8 for 5G Handover XN, and 52.0 versus 81.9 for WPA2 (Table 2, p. 11). These are averages over solved intersections, not all lemmas.

Wall-clock results include training and proof search for RL and assume maximal parallelization across lemmas. RL takes 3 minutes 25 seconds for 5G Handover EPS N26 versus 45 minutes 6 seconds for `c` and 49 minutes 29 seconds for `s`; it takes 5 minutes 10 seconds for WireGuard versus 22 minutes 37 seconds for `s` (Appendix A, Table 5, p. 16). For state-of-the-art models, RL takes 4.5–20 hours: 4 hours 36 minutes for 5G Handover XN, 17 hours 48 minutes for SPDM, and 12 hours 55 minutes for WPA2 (Table 5). These timings are not universal speedups; they use the stated hardware, parallelism, and best per-protocol configurations.

The baseline machine is an Intel Xeon E5-4650L 2.60 GHz with 1 TB RAM and eight cores per Tamarin call. RL uses one NVIDIA A100 40 GB GPU, up to 64 AMD Rome 7742 cores, 250 GB RAM, and at least 60 GB recommended for CPU-only runs (Section 6, p. 10). Tamarin baselines use two-hour timeouts, extended to four hours for SPDM and WPA2; RL budgets and hyperparameters vary by protocol (Section 6 and Appendix A, Table 3).

## proved, trusted, and implications for VL

Proved by the underlying Tamarin checker: accepted proof trees establish the specified trace property in Tamarin's symbolic protocol semantics. The RL system itself does not prove that its neural policy is correct; it only proposes search steps. The API's final `checkProof` call is therefore essential.

Trusted or assumed: the Tamarin implementation and cryptographic equational theory, protocol model and lemmas, REST wrapper, state encoding, reward design, neural training code, hardware timeouts, and the correspondence between a model and a deployed protocol. The paper reports failure to reproduce all original proofs for YubiKey, Signal, 5G AKA, SPDM, and WPA2; it attributes this to Tamarin-version differences, missing source lemmas, or insufficient resources (Appendix A.B, pp. 14–15). This is evidence that solver versions and artifacts materially affect results.

Inference: the threat to an agent-written verified-Rust product is medium. The transferable pattern is verifier-in-the-loop search with a hard proof gate, not trusting a learned score. A Verus agent could use MCTS or a policy network to choose lemma applications, but accepting generated code without a clean Verus run would remove the paper's own trusted boundary. Proof-size reward may reduce maintenance cost, while protocol-specific training and expensive solver calls limit portability.

Inference: VL should reuse the API/search separation, partial-subproof replay, and explicit denominator reporting. It should not claim novelty for generic MCTS over proof steps alone; this paper already supplies an implementation, 16-case evaluation, graph deduplication, reward shaping, and comparison to built-in and human heuristics. A useful open direction is a reproducible Verus benchmark where the same generated proof is rechecked across compiler and dependency versions.

## techniques for the catalog

- reusable verifier API — expose initial obligations, one-step execution, and final proof checking to an external client
- AND/OR MCTS graph search — search proof-method choices and case splits with PUCT, value backup, and duplicate-state merging
- learned policy/value guidance — encode applicable methods with a Transformer and predict priorities plus state values
- heuristic interpolation — combine learned logits with existing heuristic ranks through a tunable bias
- proof-cost reward shaping — penalize steps, branching, soft execution time, and hard timeouts
- online subproof reinforcement learning — train from resolved subproofs in a replay buffer while searches continue
- multi-worker proof search — run independent verifier workers with centralized neural updates across lemmas
- checked-proof boundary — use learning only to propose steps; accept results only after the underlying verifier validates the proof tree
Checked 2026-10-13: audit record cosler2026less; paper-study comparison complete; gate executed; experiments not rerun
