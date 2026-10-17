# Runtime Protocol Refinement Checking for Distributed Protocol Implementations
(authored by agents unless marked 🧑)
Tag: `ding2025runtime`, [paper](https://www.usenix.org/conference/nsdi25/presentation/ding)

## what the paper does

Runtime Protocol Refinement Checking (RPRC) detects implementation deviations in deployed distributed protocol implementations (DPIs). Ellsberg, the prototype, runs beside each DPI process, observes only its sent and received message trace, and checks whether some execution of a protocol specification can produce that trace. The paper states: “RPRC systems observe a deployed DPI’s runtime behavior and notify operators when this behavior evidences a protocol implementation bug.” (Abstract, p. 1305)

RPRC addresses the gap between a verified abstract protocol and unverified production code. It does not prove the implementation statically. It alerts shortly after observing an inconsistent outgoing message, under explicit trace and failure assumptions (fail-stop failures, asynchronous or partially synchronous model, a correct user-provided specification, a faithful trace), without cross-process coordination (Section 3.1, pp. 1308–1309).

## technique 1: black-box runtime refinement checking

What it is. Each Ellsberg instance maintains possible protocol simulation states for its colocated process. Incoming trace messages become pending events; for each outgoing message, Ellsberg asks whether some schedule of pending messages and timeouts reaches a state that could have emitted that exact message. If no such state exists, it reports a refinement violation. The paper states that Ellsberg “treats the DPI as a blackbox, assumes no access to the DPI’s internal state, and does not impose any limits on how DPIs are implemented.” (Introduction, p. 1305)

When to use it. Use RPRC for fail-stop, asynchronous or partially synchronous DPIs whose protocol safety has been specified and whose network trace can be recorded with connection identity and required ordering (received messages on one connection in order; outgoing messages in program order). The paper presents it as suitable for existing, unmodified implementations where static refinement restrictions are impractical.

How to apply it.

1. Provide a protocol specification as communicating I/O automata: process state, message-delivery and timeout events, atomic transitions, and outgoing messages (Section 3.3, p. 1309).
2. Provide mapping code from implementation messages to specification messages. The paper says users “must also provide Ellsberg with DPI specific code to deserialize and map implementation messages to specification messages” (Section 5, p. 1315; see also Section 3.3.1, p. 1309).
3. Define `ProtState`, the initial state, `apply`, `equal`, `infer_inducing`, `reachable`, and the optional-in-practice `apply_asap?` and `lookahead_type` functions (Section 3.3.1 items (i)–(vii) and Listing 2, p. 1310). Only `lookahead_type` is called optional by the paper.
4. Colocate an Ellsberg process with every DPI process and feed it an incrementally updated trace of all sent and received messages (Section 3.1, pp. 1308–1309).
5. Process the trace in order. Incoming messages are either applied immediately when `apply_asap?` allows it or added to every simulation state's pending set; outgoing messages trigger reachability search (Section 3.4, Listing 3, p. 1311).
6. Report an error if no reachable simulation state is m-inducing for the observed outgoing message; otherwise replace the simulation set with the reachable m-inducing states (Listing 3, lines 50–56, p. 1311).

Verus form. Inference: a Verus model can define a ghost protocol state machine with `spec fn apply`, `spec fn equal`, and transition invariants, while executable Rust records and maps messages. A `proof fn` can show that each observed message is permitted by an abstract transition. Runtime checking remains an executable monitor; Verus proves monitor/specification relations and mapping contracts, not unseen future traces.

Evidence. Ellsberg detected previously reported bugs in Etcd, ZooKeeper, and Redis Raft, plus an unreported Redis Raft reconfiguration bug (Table 2 and Section 6.2, p. 1316; the authors reproduced the bugs, per Section 6.2). The evaluation used 3- and 5-node clusters, 120 concurrent clients, 1 million uniformly random keys, and balanced (50% reads/50% writes) and read-heavy (95%/5%) workloads derived from YCSB (Section 6.1, p. 1315). The authors validated the Raft specification on 8,750,468 traces (15 bounded-model-checking steps) and ZooKeeper's on 1,904,456 traces (20 steps), generated from the TLA+ specifications (Section 5, p. 1315). Latency impact: the largest 99th percentile increase was 10.7% (7.25 ms to 8.03 ms, Redis read-heavy); throughput was unaffected (Section 6.3, p. 1316; Introduction, p. 1306).

Failure and assumptions. Ellsberg guarantees no false alert when assumptions hold because alerts require an observed violation, but it cannot prove correctness. The paper states: “Ellsberg cannot prove that an implementation is correct because (a) it cannot detect refinement violations that do not result in the DPI sending out an inconsistent message; and (b) it is not guaranteed to have observed all possible DPI behaviors.” (Section 3.1, p. 1309) It cannot detect bugs that lead to livelock or deadlock, corrupt stored data, or degrade performance (Introduction, p. 1306).

## technique 2: incremental breadth-first search over schedules

What it is. Because trace order does not reveal the order in which a concurrent DPI processed incoming messages, Ellsberg explores alternative interleavings. It keeps a set `S` of simulation states, each containing a protocol state and pending-message collections. For each outgoing message it uses breadth-first search (BFS) to find reachable m-inducing states. The paper says: “each Ellsberg instance maintains the set of simulation states the associated DPI process can be in, and uses breadth first search to update the instances states and check DPI correctness.” (Introduction, p. 1306)

When to use it. Use BFS when internal concurrency creates multiple possible event orders and checking must be incremental: no future messages or complete trace may be assumed.

How to apply it.

1. Initialize `S` with one simulation state containing the protocol initial state and an empty pending set (Section 3.4, p. 1311).
2. On each incoming message, apply it immediately when `apply_asap?` allows it; otherwise add it to each state's pending set (Listing 3, lines 20–29, p. 1311).
3. For an outgoing message, infer a partial target state from message contents and call `find_reachable` from every state (Listing 3, lines 33–48, p. 1311).
4. In BFS, enqueue each unseen state reached by a pending event or timeout. If a state is in the target partial state, record it as m-inducing; use `reachable` to prune branches that cannot reach the target (Listing 4, p. 1312; Section 3.4.1, p. 1313).
5. Merge pending sets when equivalent protocol states are reached. BFS explores shorter schedules first, preserving states with larger pending sets when one schedule is a subsequence of another (Section 3.4.1, pp. 1312–1313).
6. Replace `S` with the union of m-inducing states; raise an error if the union is empty (Listing 3, lines 50–56, p. 1311; Section 3.5, p. 1313).

Verus form. Inference: represent the monitor's simulation set as executable Rust collections and prove local transition lemmas with Verus contracts. A loop over the BFS queue needs a loop `invariant` describing that every queued state is reachable and every pruned state cannot reach the target under the supplied `reachable` contract. The monitor's state-space exploration is not erased proof code; it is runtime behavior.

Evidence. Each Ellsberg instance tracked one simulation state on average (|S| = 1) with between 0 and 5 pending messages (Section 6.3, p. 1316). Ellsberg's throughput exceeded the DPI's: 2.0–51.7× for Etcd, 1.4–29.7× for ZooKeeper, and 3.1–25.5× for Redis Raft; processing one second of trace took 30–700 ms on a leader and 20–180 ms otherwise, so alerts came within 1.7 seconds of a bug (Section 6.4, p. 1316). The throughput measurements covered 3- and 5-node clusters and both workloads, in a 10-second interval over 10 experiments (Section 6.4, p. 1316).

Failure and assumptions. The paper says that without messages that let Ellsberg infer the entire state of a DPI process, it “must maintain an ever increasing set of partial states and consider a growing number of schedules”, making it infeasible in practice. It reports multi-version-concurrency-control databases whose messages omit the version read or written as a case where this fails (Section 3.5, p. 1314). It also assumes events are applied atomically and a message's behavior is not influenced by a concurrently applied message, excluding some transaction-concurrency protocols (Section 3.5, p. 1314).

## technique 3: apply-as-soon-as-possible and lookahead pruning

What it is. `apply_asap?` identifies events whose reordering cannot change reachable inducing states or block future messages. Such events are applied immediately instead of being kept pending. `lookahead_type` optionally finds the next outgoing message of a given type and prunes states unable to reach both targets. The paper gives two correctness requirements for `apply_asap?`: “(a) Event e can be reordered.” and “(b) Event e does not block outgoing messages.” (Section 3.3.1, p. 1310)

When to use it. Use these reductions when the pending-event interleaving space is the performance bottleneck. Per the paper, `apply_asap?` preserves correctness only if it meets the two requirements; `lookahead_type` does not affect correctness whatever it returns (Sections 3.3.1 and 3.4.2, pp. 1310 and 1313).

How to apply it.

1. Define `apply_asap?(s,e)` and check it mechanically. The paper expresses it as a set of constraints and checks four simpler conditions with Z3 that together imply the two requirements (Appendices A and B, p. 1321; Section 4, p. 1314).
2. When an incoming message satisfies the predicate, recursively apply it and other immediately applicable events (`prune_asap`), both when processing incoming messages and inside the BFS (Listing 3 line 24, p. 1311; Listing 4 line 25, p. 1312; Section 3.4.2, p. 1313).
3. For an outgoing message `m`, use `lookahead_type(m)` to identify a future type `T`; scan the trace from `m` for the next outgoing message of type `T`, infer its target, and pass it to BFS (Listing 3, lines 35–41, p. 1311; Section 3.4.2, p. 1313).
4. Keep only states that can reach both the current m-inducing target and the future T-inducing target. The paper says this cannot affect correctness because any state pruned “would have been pruned by a future call to find_reachable when considering the next outgoing message of type T” (Section 3.4.2, p. 1313).

Verus form. Inference: specify `apply_asap?` as a ghost predicate with a proof lemma for reorder and nonblocking equivalence; use `requires` on the executable optimizer that its predicate has been proved. Use `ensures` to show optimized exploration returns the same set of inducing states as unoptimized exploration. The lookahead function can be treated as a refinement-preserving optimization contract.

Evidence. Appendix E reports ablations for `apply_asap?` and `reachable` only; the paper text shows no separate ablation for `lookahead_type`. With `apply_asap?` enabled, |S| = 1 and 0–5 pending messages; with it disabled, pending messages grow over the trace and |S| averaged about 444 for Etcd, 478 for ZooKeeper, and 43 for Redis Raft (Appendix E.1, p. 1325). The `reachable` function cannot be turned off because it ensures termination; it pruned more than 75% of paths for ZooKeeper, and 40–80% of `reachable` calls returned false for Etcd and Redis Raft (Appendix E.2, pp. 1325–1326). Inference: the end-to-end throughput and latency numbers above include the whole optimized algorithm and do not isolate each optimization's contribution.

Failure and assumptions. Inference: an incorrect `apply_asap?` could make Ellsberg skip schedules the DPI actually followed and so raise false alerts; the paper says only that it can be mechanically proven correct (Section 4, p. 1314), and the specification and mapping functions remain user supplied. The paper states that `lookahead_type`'s “semantics do not affect correctness” (Section 3.3.1, p. 1310).

## technique 4: derive and test specifications from TLA+

What it is. Users translate an existing TLA+ protocol specification into the Ellsberg interface rather than writing a full implementation. They derive `ProtState`, `equal`, `apply`, and `infer_inducing` from TLA+, write `reachable`, `apply_asap?`, and `lookahead_type` de novo, and write the message-mapping code separately in Go; a testing tool then checks the derived specification against generated TLA+ traces. The paper states: “deriving a Ellsberg specification from a TLA+ specification is simpler than deriving an implementation” (Section 3.3.1, p. 1311).

How to apply it.

1. Identify per-server variables in the TLA+ specification, excluding global variables (e.g., messages) and ghost variables, and place them in `ProtState` (Section 4, p. 1314).
2. Translate each state-machine transition into `apply` by walking the TLA+ specification and copying the state updates; `equal` just checks that all state variables have the same value (Section 4, p. 1314).
3. Derive `infer_inducing` from the transitions that send messages, using three techniques: the message directly uses a state variable; the message carries a value computed from a state variable, so an inverse computation recovers it; or the message is sent only when a state variable has a given value (Section 4, p. 1314).
4. Write `reachable`, `apply_asap?`, and `lookahead_type` de novo. `apply_asap?` can be checked mechanically (Appendices A–B), and `lookahead_type` does not affect correctness (Section 4, p. 1314).
5. Test the specification: the testing tool, inspired by Mocket, uses TLC bounded model checking to generate a transition graph, traverses it depth first, translates state sequences into message traces, and reports a bug if the Ellsberg specification would have falsely notified an error on a valid trace (Section 4, p. 1315).

Verus form. Inference: use TLA+ only as the source model, then encode its transition relation and safety assumptions in Verus `spec fn`s and state-machine proofs. The mapping layer should have contracts proving that every implementation message maps to exactly one abstract message or is intentionally ignored. Verus can prove translation lemmas but cannot validate an omitted TLA+ transition without an independent completeness argument.

Evidence. Ellsberg specifications were 952 lines for Etcd, 894 for Redis Raft, and 989 for ZooKeeper, versus baselines of 1,503 lines (Microsoft CCF Raft specification, for both Raft DPIs) and 1,615 lines (an implementation-derived ZooKeeper TLA+ specification) (Table 1, p. 1314). Mapping code was 356 Go lines for Etcd, 370 for ZooKeeper, and 380 for Redis Raft (Section 5, p. 1315). These are source-size counts, not proof completeness measures.

## techniques for the catalog

- black-box runtime refinement: compare each process's message trace with executions of a protocol specification
- incremental BFS checking: retain possible simulation states and explore message interleavings until an outgoing message is explained
- apply-asap pruning: immediately apply events proven reorderable and nonblocking
- lookahead pruning: constrain search using the inferred state of the next outgoing message of a given type
- TLA+ translation and testing: derive monitor specifications from TLA+ and validate them against generated model traces
