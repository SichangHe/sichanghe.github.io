# Aragog: Scalable Runtime Verification of Shardable Networked Systems
(authored by agents unless marked 🧑)
Tag: `yaseen2020aragog`, [paper](https://www.usenix.org/conference/osdi20/presentation/yaseen)

## problem and system boundary
Aragog monitors distributed network functions such as NAT gateways and firewalls while they run. The authors motivate runtime verification because static exploration of distributed interleavings causes state/path explosion and because hand-written models can diverge from a deployed system (Sections 1–3, pp. 701–703). Their target is a scale-out verifier that checks observed executions, accepts expressive network properties, and uses fewer resources than the network function. They explicitly state the tradeoff: “Compared to static verification, runtime verifiers only test inputs and control flows that are seen in practice, thus improving scalability and enabling verification of actual deployments running over actual data.” (Section 1, p. 701.)

Aragog is a grey-box design: NF code exports selected events to a co-located local agent; local agents filter, map, group, and suppress events; Kafka transports the remainder; sharded Apache Flink workers run global checks (Section 4, pp. 703–704). The paper warns that “Aragog does not guarantee perfect accuracy under asynchrony” and instead reports transient inconsistencies after the fact (Section 1, p. 702). Inference: this is monitoring evidence, not a proof that every execution satisfies an invariant.

## technique: event and invariant-violation specifications
What it is: users define an event schema in JSON and a policy in Aragog's invariant-violation (IV) language. The event schema lists packed fields and bit lengths, supports conditional parsing (for example IPv4 versus IPv6), and names constants (Section 5.1, p. 704). An IV specification is a sequence of transformations followed by a regular-expression-like event expression (Section 5.2, p. 705). The paper says, “Aragog parses incoming event messages and checks them against a set of user-defined policies that describe sequences of events that violate the invariants of the system.” (Section 5.2, p. 705.)

When to use it: Inference: use this for stateful, timed, distributed properties whose relevant facts can be represented as events and whose events can be grouped by flow or another key. The language supports location variables, stateful variables, partial packet-field matches, and temporal predicates (Section 1, p. 702).

How to do it:
1. Define the ordered binary event fields and conditional branches in JSON (Section 5.1, p. 704).
2. Add `FILTER` to retain only event types and nodes relevant to the policy (Section 5.2.1, p. 705).
3. Use `MAP` to compute any normalized fields before grouping by them; use `GROUPBY` for related events, such as a NAT 5-tuple (Section 5.2.1, p. 705; Figure 7, p. 706).
4. Write a `MATCH` expression using event predicates, variables, repetition (`*`, `+`, `?`), `CHOICE`, and `SHUFFLE` (Section 5.2.2, pp. 705–706).
5. Attach each event to `ANY`, a named location, or a negated location; use `TIME` with variables for deadlines (Section 5.2.2, p. 706).

The paper's Figure 4 groups events by a flow's five fields and matches a primary mapping at `$X`, followed by a primary mapping at `NOT $X` without `$X` removing it; removals elsewhere may intervene (Section 5.2, p. 705). Figure 6 checks that a stateful firewall permits reverse traffic after initialization; Figures 7–8 illustrate TCP timing constraints (Section 5.2.2, p. 706).

Verus form: Inference: define Rust event types and executable event extraction, then use Verus specifications to state predicates over an event sequence and proof functions to establish a transition invariant. A `GROUPBY` key can be a ghost/model value, and a temporal deadline can be a relation over timestamps. The regex matcher, parser, and event-export code still require contracts connecting implementation events to the mathematical trace. Aragog's language itself is not a Verus construct.

## technique: symbolic automata and deterministic checking
Aragog translates each IV expression into a symbolic finite automaton (SFA). It turns field and location matches into Boolean predicates, uses a start-state self-loop so a violation may begin anywhere, builds the SFA with Thompson's construction, determinizes it into a symbolic deterministic finite automaton (DSFA), and then creates localized machines (Sections 6.1–6.2, pp. 707–709). The paper specifies that “Aragog performs an additional check on the sequence of generated predicates to facilitate efficient variable checking” (Section 6.1, p. 707): uses of a variable in arithmetic or ordered comparisons (`<`, `≤`, `>`, `≥`) must follow its introduction by equality.

How to apply it:
1. Conjoin event-field and location predicates, negating predicates for `!` events (Section 6.1, p. 707).
2. Run the variable-use reachability check (Section 6.1, p. 707).
3. Build the SFA with Thompson's construction, treating `CHOICE` as a choice and expanding `SHUFFLE` into all permutations; mark the final state as accepting (Section 6.1, p. 707).
4. Determinize it symbolically so transitions are unambiguous and exhaustive (Section 6.1, p. 707).
5. Execute the DSFA over each keyed stream; an accepting state is a violation (Sections 6.2 and 7.1, pp. 707–709).

Verus form: Inference: encode the automaton state and event step as Rust data plus a specification of the transition relation; prove each executable step refines that relation and that acceptance agrees with the specified violation predicate. A Verus proof can establish the matcher implementation against its specification, but it does not provide Aragog's symbolic-automaton construction or automatically prove that a human IV policy captures the real requirement.

## technique: local suppression with soundness conditions
A central optimization marks a global DSFA transition suppressible when observing or omitting an event cannot change whether a future stream reaches an accepting state. The definition requires that the immediate target is not accepting and that every continuation reaches an accepting state after the event exactly when it would without the event (Section 6.2.1, p. 707). Timing-constrained transitions are never marked suppressible because an apparently irrelevant event can affect timing.

The local-machine algorithm accounts for events at other locations. For each location variable it copies the global DSFA, adds epsilon transitions when an event could have occurred elsewhere, simplifies predicates under the local-location assumption, determinizes, and marks a local transition suppressible only when all compatible global transitions are suppressible (Algorithm 1 and Section 6.2.2, p. 708). A negated condition captures non-suppressible transitions for an instance outside every named location; events satisfying it must be exported (Algorithm 2, p. 709). If non-location variables or arithmetic remain after Aragog tries to eliminate their uncertainty, Aragog suppresses no events (Section 6.2.3, p. 709).

At runtime, local agents apply `FILTER`, `MAP`, and `GROUPBY`, run these localized machines, and suppress an event only if every relevant local instance takes a suppressible transition and the negated condition is false (Section 7.1, p. 709). The paper's four-event, three-replica example sends two events and suppresses two removes (Section 7.1, p. 709).

Verus form: Inference: prove a suppression lemma stating that dropping an event preserves the acceptance predicate for every continuation and every compatible global state. Use proof functions for the lemma and contracts for local/global transition functions. This is stronger than proving the local code is memory-safe: the proof must quantify over future traces and location assignments.

## technique: sharding, variable tracking, and fault handling
Aragog derives sharding keys from `GROUPBY` and distributes keyed streams across Kafka/Flink workers (Section 4, p. 704). It tracks all possible variable instantiations in a multi-level tree: each variable has a level, leaves store DSFA states, and a predicate splits a wildcard assignment into matching and nonmatching cases (Section 7.2, p. 710). A consistent-hashing sample can trade completeness for throughput; sampled keys remain complete internally, but violations on unsampled keys can be missed (Section 7.1, p. 710).

The global verifier waits a maximum latency before processing timestamped events, reorders them with a priority queue, and assumes partial synchrony. The paper's recall guarantee is for traces beginning after the stabilization time; precision is argued for studied IVs whose state eventually returns to the initial state after remove/FIN/RST transitions (Sections 7.1–7.3, pp. 709–711). Late timestamps, gaps in per-instance sequence numbers, and local-agent failures trigger warnings of possible false positives. A restarted agent can temporarily export all events until it rebuilds its local state from the global verifier (Section 7.3, p. 711).

Verus form: Inference: model the variable tree and timestamp queue as ghost state and prove refinement of each update; state partial synchrony and sampling as explicit assumptions. Verus cannot prove an unsampled violation was absent, and it cannot turn a clock or Kafka delivery assumption into a theorem without a model of that environment.

## evidence, numbers, and limits
The implementation has “more than 6,500 lines of Java 8 code” and “more than 2,000 lines of C++ code” (Section 8, p. 711). The NATGW evaluation uses two traces, each from seven flow deciders over 30 minutes: V1 has 23.7 million packets and V2 has 9.0 million. Because the production deployment lacked fine-grained clock synchronization, the authors corrected trace time drift using known synchronization points (Section 9, p. 711). The authors evaluated eight NATGW IVs and report four operator-confirmed bugs; Table 2 reports absolute violations, including V2 counts of 45,019 (`nat_open_to`), 29,964 (`nat_primary_to`), 259 (`nat_same_consensus`), and 2,697 (`nat_syn_to`) (Section 9.1, p. 712). Section 9.1 also explains that the single V1 `nat_open_to` violation was an expected consequence of eventual consistency.

On one Intel Xeon E5-2450 at 2.10 GHz with one Flink task slot, the global verifier processes over 500,000 events/s for one IV and over 30,000 events/s for eight IVs (Section 9.2, p. 712). Table 4 counts events across all eight IV specifications: V1 has 189 million generated events, 92.9 million after filtering (49.1%), and 70.2 million after suppression (37.1%); V2 has 72.2 million, 36.7 million (50.8%), and 28.0 million (38.8%), respectively (Section 9.4, p. 713; Table 4, p. 714). The firewall median detection latency is roughly 70 ms (Section 9.3, p. 713; Figure 18, p. 714), and the paper says injected firewall configuration bugs were all found (Section 9.1, p. 712).

Inference: these measurements establish useful runtime coverage and scaling for the tested NF traces and hardware. They do not establish exhaustive correctness, arbitrary-NF scalability, or correctness under broken clocks, lost events, unsampled keys, or policies that cannot be sharded. The paper itself says its scalability depends on whether the violations of interest use sharding and suppression effectively (Section 11, p. 714).

## techniques for the catalog
- event and IV language — define packed events, filters, grouping, mappings, location variables, regular-expression traces, and timing predicates
- symbolic automata checking — compile IV predicates to SFA/DSFA machines and report accepting states
- local suppression — suppress only transitions proven irrelevant to every future accepting continuation
- localized uncertainty — construct per-location machines with epsilon transitions for events at other locations
- sharded runtime verification — partition keyed streams across Kafka/Flink workers and reorder timestamped events
- partial-synchrony recovery — use bounded latency, eventual state reset, and post-hoc alerts for desynchronization
