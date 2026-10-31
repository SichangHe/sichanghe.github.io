# Plankton: Scalable network configuration verification through model checking
(authored by agents unless marked 🧑)
Tag: `prabhu2020plankton`, [paper](https://www.usenix.org/conference/nsdi20/presentation/prabhu)

## scope and result

Plankton checks network policies over converged data planes using a protocol abstraction, subject to the limits below. It combines packet-equivalence partitioning with explicit-state model checking. The paper’s motivation is that Minesweeper’s SMT formulation took “4+ hours to check a 245-device network for loops” in their experiments (§1, p. 953), while Plankton reports less than a second for some networks with more than 300 devices and up to a 10,000× speedup (Abstract and §1, pp. 953–954).

## technique 1: packet equivalence classes and dependency-aware scheduling

what it is and when to use it

Partition header space into Packet Equivalence Classes (PECs), sets of packets that behave identically throughout exploration. Use this to avoid analyzing every header while retaining all forwarding behaviors. The paper says: “We leverage the notion of Packet Equivalence Classes (PECs), which are sets of packets that behave identically.” (§2, p. 954).

how to do it

1. Build a trie from every prefix in the configuration: advertisements, route maps, static routes, and related entries. (§3.1, p. 955.)
2. Recursively traverse the trie. At each prefix boundary, merge the prefix-specific configuration into the current network-wide configuration. Each resulting partition is a PEC. Retain the contributing prefixes, because their lengths still affect advertisements and route-filter matches (§3.1, p. 955).
3. Construct a dependency graph whose nodes are PECs and whose directed edges record recursive routing, BGP-session, or similar dependencies (§3.2, p. 955).
4. Compute strongly connected components (SCCs), groups of mutually dependent PECs, and analyze each SCC in one verification process. Schedule prerequisites first and save all their converged outcomes and nondeterministic choices for dependent SCCs. Match link failures across PECs (§3.2, pp. 955–956). The paper states: “These SCCs represent groups of PECs that are mutually dependent, and hence need to be analyzed simultaneously through a single verification run.” (§3.2, p. 956).

Verus form

Inference: represent a PEC partition and dependency graph as ghost data, with `spec fn` defining packet equivalence and graph reachability. Use `requires` and `ensures` to prove that every packet belongs to exactly one class and that dependencies are respected by a scheduler. This establishes the abstraction’s consistency; it does not prove a router protocol implementation unless that implementation is also modeled.

## technique 2: Reduced Path Vector Protocol and exhaustive convergence

The Reduced Path Vector Protocol (RPVP) replaces the extended Simple Path Vector Protocol’s (SPVP’s) message passing with shared memory. Algorithm 1 (p. 957) repeatedly chooses an enabled node, clears its best path if invalid, and chooses a peer among the highest-ranking available updates. It then applies import/export filters to that peer’s best path. It sends no explicit advertisements: “Note that there are no explicit advertisements propagated; instead nodes are polled for the advertisement that they would generate based on their current best path when needed.” (§3.4.2, p. 957). Topology changes occur before protocol execution; ranking functions use their final versions. Theorem 1 covers every converged state reachable in extended SPVP under the same filters, failed links, and final ranking functions (§3.4.2, pp. 957–958). It does not preserve all transient states or divergent behavior.

The resulting verification procedure is: (1) apply failures; (2) explore RPVP choices for each prefix in an SCC; (3) combine converged prefix/protocol results into the PEC’s data plane using the forwarding information base (FIB) model; and (4) invoke the policy callback with that data plane and relevant converged states of prerequisite PECs (§§3.3–3.5, pp. 956–958). A policy is an arbitrary callback returning Boolean; a failed callback produces a trail file showing the violating event sequence (§3.5, p. 958).

Verus form

Inference: encode RPVP as a Verus transition system with a ghost state machine and executable state updates. Use proof functions to show that each reduced transition can be simulated by several full-protocol steps and that every full converged state has a reduced witness. `ensures` can express preservation of policy-relevant state; the simulation theorem is the critical proof obligation.

## technique 3: preserve completeness while pruning execution

consistent executions

For a converged state S, a partial execution is consistent when each executed node chooses its path in S and never changes it (§4.1.1, p. 959). Theorem 2 states: “Any partial execution of RPVP consistent with a converged state can be extended to a complete execution consistent with that state.” (§4.1.2, p. 959). Plankton does not know the final state in advance. It stops exploring when evidence rules out a consistent execution, such as a node needing to change its selected best path (§4.1.1, p. 959).

deterministic-node heuristic

Plankton tries to identify enabled nodes whose best-path update will hold in every reachable converged state. If it finds one, it executes one such node without branching over node order. For OSPF, it runs a network-wide shortest-path computation and picks a node only after all nodes with shorter paths have executed. For BGP, it conservatively tests whether an update must win against present and possible future alternatives: “For each node which is enabled to update its best path, it checks whether there exists a pending update that would never get replaced, because the update would definitely be preferred over other updates that are enabled now or may be in the future.” (§4.1.2, p. 959). If all possible winning updates are available but tied, it can fix the node choice while branching over updates. The heuristic may miss deterministic nodes (§4.1.2, pp. 959–960).

partial-order and failure ordering

When two nodes’ advertisements cannot affect one another because advertisements in either direction must pass through a node that has already fixed its best path, Plankton explores one arbitrary order (§4.1.3, p. 960). It also applies all topology changes before protocol execution and enforces a strict link-failure order (§4.1.4, p. 960).

failure equivalence

Plankton also groups devices into Device Equivalence Classes (DECs) and links between two DECs into a Link Equivalence Class (LEC). It explores one representative failed link per LEC, refining both partitions after each selected failure. Interesting nodes each receive their own DEC. Verification still uses the original network; this optimization applies only without cross-PEC dependencies (§4.3, p. 960). The paper states: “Note that this optimization limits the choice of failed links, but the verification happens on the original input network.”

Verus form

Inference: each pruning rule needs a proof that the omitted order is observationally equivalent for the policy state. State-machine invariants can express consistency and fixed best paths; a lemma can show that deterministic scheduling preserves the set of reachable converged states.

## technique 4: policy-based pruning and state hashing

The policy API can declare sources and interesting nodes. Two data planes are policy-equivalent when their paths from sources have equal lengths and the same interesting nodes at the same positions (§3.5, p. 958). Policy-based pruning stops an assumed-consistent execution once all sources have made their best-path decisions (§4.2, p. 960). With one prefix in a PEC, it can also prevent devices that cannot influence sources from executing; that stronger rule is not applied to PECs on which others depend. State hashing deduplicates routing-table entries and stores 64-bit pointers to them in network states (§4.4, p. 960): “Plankton leverages this property to the reduce memory footprint, storing routing table entries as 64-bit pointers to the actual entry, with each entry stored once and indexed in a hash table.”

## evidence, assumptions, and limits

The prototype contains 373 lines of Promela and 4,870 lines of C++, excluding SPIN, and was evaluated on Ubuntu 16.04, a 3.4 GHz Xeon with 32 hardware threads and 188 GB RAM (§5, pp. 960–961). It supports OSPF, BGP, and static routing. In fat-tree experiments, Minesweeper did not finish in four hours even on a 500-device network, while Plankton scaled to 2,205 devices; single-IP reachability completed in seconds or minutes on the largest networks (§5, p. 961). In high-nondeterminism waypoint experiments, worst-case times were below two seconds (§5, p. 961). Plankton and Minesweeper produced the same policy results on shared tests (§5, p. 961).

The RPVP results concern the extended SPVP abstraction, with fixed import/export filters: import filters reject loops and preserve accepted paths; export filters append the exporting node to accepted paths (Appendices A–C, pp. 965–967). The prototype supports OSPF multipath, but not BGP multipath (§3.4.2, p. 958). Modeling each prefix separately limits route aggregation: an exact-match route map for an aggregate does not apply to the modeled more-specific routes (§3.3, p. 956). Policies requiring multiple PECs fall outside the API described in §3.5; their proposed extension was not performance-evaluated. Policies inspecting transient behavior are out of scope (§3.5, p. 958). Cross-PEC dependencies can cause false positives when protocol choices need coordination (§§3.2 and 6, pp. 956, 964). External advertisements require stubs; vendor-specific implementation bugs are outside the technique’s scope (§6, p. 964). The authors state: “As with most formal verification tools, one needs to assume that Plankton itself is correct, both in terms of the theoretical foundations as well as the implementation.” (§6, p. 964). Inference: proving a Rust reimplementation would still require explicit assumptions about the parser, protocol abstraction, and policy specification.

SPIN’s optional bitstate hashing uses a Bloom filter instead of explicit state storage and can miss execution paths. It was disabled in the other experiments: “Nevertheless, we have not turned on bitstate hashing in our other experiments in favor of full correctness.” (§5, p. 964).

## techniques for the catalog

- PEC partitioning — build trie-based packet classes whose members have identical behavior
- dependency scheduler — group strongly connected PEC dependencies and analyze independent groups separately
- RPVP reduction — model only convergence-relevant control-plane behavior and prove it covers all full converged states
- completeness-preserving pruning — use consistent executions, deterministic-node tests, partial-order reduction, ordered failures, and representative failures from link classes
- policy/state optimization — stop once policy-relevant nodes converge and hash repeated state entries
