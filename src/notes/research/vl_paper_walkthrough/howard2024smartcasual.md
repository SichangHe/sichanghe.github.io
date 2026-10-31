# Smart Casual Verification of the Confidential Consortium Framework
(authored by agents unless marked 🧑)
Tag: `howard2024smartcasual`, [paper](http://arxiv.org/abs/2406.17455v2)

## scope and result
The paper reports a production workflow that combines a TLA+ specification, model checking, implementation trace validation, and ordinary tests for CCF, a 63-kLoC C++ distributed system. The authors state: “We combine a rigorous TLA+ specification which we tie to our existing production implementation using trace validation.” (Introduction, §1.1, PDF p. 2). The goal is safety and liveness confidence while CCF evolves, without rewriting the implementation. The paper says the method found six subtle bugs before production impact (Abstract, PDF p. 1).

## technique: model the protocol at two abstraction levels
Use a high-level TLA+ consensus specification for node states, messages, elections, failures, and transaction-log properties. Separately specify client-visible consistency with two variables: an append-only history of client messages and append-only log branches representing leaders’ logs. The consensus model explores nondeterministic asynchronous behavior; the consistency model records requests, responses, and transaction status responses, omitting pending status responses. The authors explain: “Our aim with this spec was to keep it as high-level as possible, focusing solely on the possible safe interactions between clients and the service.” (Client Consistency Specification, §5, PDF p. 6). The paper describes strict serializability for committed read-write transactions and serializability for committed read-only transactions (§2, PDF p. 3). The consistency spec checks ancestor-commit behavior; its proposed `ObservedRoInv` property is violated by a 12-step counterexample found in four seconds, exposing non-linearizable read-only behavior (§7, PDF p. 11). The authors state: “Currently, we have no plans to change this behavior, as serializability for read-only transactions is sufficient for most applications, however, we hope that our consistency spec will help us to more clearly communicate this guarantee to developers.” (§7, PDF p. 11).

The consensus specification has 17 actions over 13 variables: 12 track local node state and one tracks in-transit messages (§4, PDF p. 5). It checks log consistency across nodes and append-only committed logs over time, plus 27 further invariants/properties. Exhaustive checking requires bounds on terms, client requests, and reconfigurations; action-weighted simulation provides a lighter alternative (§4, PDF pp. 5–6). Counterexamples were translated into functional tests (§7, PDF pp. 10–11). The consensus specification had 1,134 lines; Table 1 reports approximately 10^8 total states for model checking (PDF p. 9).

Inference: in Verus, represent protocol transitions with a ghost state-machine model and client properties with predicates over histories. Connect executable Rust operations to those models using `requires`, `ensures`, assertions, and proof functions. TLA+ state exploration does not carry over automatically; Verus needs explicit inductive invariants and proofs over Rust transitions.

## technique: trace validation against the implementation
Use the deterministic scenario driver to collect traces at side-effect-free linearization points, then constrain reused TLA+ actions so each action is enabled only when it matches the current trace event and values. The paper states: “Conceptually, trace validation checks that every observed implementation trace matches a behavior of the system’s high-level specification.” (Trace Validation, §6, PDF p. 7). Validation requires a nonempty intersection between behaviors constrained by the trace and behaviors allowed by the high-level spec (§6.2, PDF p. 7). Their driver added 15 log statements; preprocessing removed bootstrapping events not modeled by the spec (Trace Collection, §6.1, PDF p. 7).

Steps from the paper: instrument sends, receives, and state transitions; collect and preprocess traces; derive a `Trace` specification by mapping a happy-path trace line by line; reuse high-level actions with trace parameters; add assertions; run TLC; inspect the longest partial behaviors when intersection is empty; fix the implementation or specification and rerun. (Trace Collection and §§6.2–6.3, PDF pp. 7–8.)

Inference: for Verus, record test-harness events for trace checking and separately prove that each concrete operation refines an abstract transition. A runtime trace checker can complement, but cannot replace, Verus proofs because it checks sampled executions.

## technique: repair abstraction mismatches
When implementation and specification atomicity differs, compose actions. The paper says: “To reconcile these different grains of atomicity, we composed the actions UpdateTerm and HandleAppendEntriesReq, allowing them to occur atomically, i.e., in a single action.” (§6.2.1, PDF p. 8). For omitted message-loss events, compose a fault action with the trace next-state relation; for one high-level action represented by several implementation events, use finite stuttering that leaves abstract variables unchanged. For consistency traces limited to one client, reconstruct other transactions from observed transaction IDs (§6.5, PDF p. 9).

Inference: in Verus, define a single proof-level transition lemma for implementation operations that jointly update related abstract fields; use unchanged ghost state to model stuttering. This is a modeling choice, not a Verus primitive.

## techniques for the catalog

- dual-level specifications: separate node-protocol behavior from client-visible histories and check each with model checking
- trace validation: constrain specification actions with implementation trace events and require a nonempty behavior intersection
- action composition and stuttering: reconcile mismatched atomicity, omitted faults, and extra implementation events
- CI integration: rerun specification checks and trace validation as the production code and protocol evolve
