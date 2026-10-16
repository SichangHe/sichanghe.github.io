# VeriFlow: Verifying Network-Wide Invariants in Real Time
(authored by agents unless marked 🧑)
Tag: `khurshid2013veriflow`, [paper](https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final100.pdf)

## problem and architecture
VeriFlow is a shim between an SDN controller and network devices. It intercepts every forwarding-rule insertion, modification, or deletion, checks network-wide invariants before forwarding the update, and can drop a violating rule or raise an alarm. The paper's abstract says, “VeriFlow is a layer between a software-defined networking controller and network devices that checks for network-wide invariant violations dynamically as each forwarding rule is inserted, modified or deleted.” (abstract, p. 1). It targets low latency by checking only packet sets whose behavior may change.

## technique: slice packets into equivalence classes
An equivalence class (EC) is a set of packets that have identical forwarding actions at every device. For each new rule, VeriFlow finds overlapping existing rules and computes disjoint header ranges that no rule splits (section 3.1, p. 3).

Step by step: (1) intercept the new match rule; (2) traverse a multidimensional prefix trie to find overlapping rules, narrowing each header dimension to branches compatible with the new rule; (3) collect the affected rule leaves; (4) for each header field, compute disjoint lower/upper ranges; (5) take one range from each field to form ECs; (6) retain only ECs that may have changed. Example: adding 11.0.0.0/8 alongside 11.1.0.0/16 splits the former range around the latter. Inference: the third range starts at 11.2.0.0; the paper's printed 11.2.255.255 appears to be a typo (section 3.1, p. 3). The trie has 0, 1, and wildcard branches for each header bit.

Inference: in Verus, represent an EC as a set or predicate over packet headers and prove that every packet in an EC has the same abstract forwarding action. Use `requires`/`ensures` on an update function to show that unaffected ECs retain their action; the trie can be an executable map with a ghost set specification.

## technique: build forwarding graphs only for changed classes
For every modified EC, VeriFlow performs a second trie traversal to find all rules that match that EC, including default rules that did not contribute to the first overlap search. It builds a directed forwarding graph: a node is an EC at a device, and an edge records the forwarding decision to another node. The graph is an exact representation up to the metadata included by the implementation (section 3.2, p. 4).

Step by step: (1) enumerate modified ECs; (2) look up all matching rules for each EC; (3) apply switch priority to choose each device's forwarding action; (4) create graph nodes for device/EC pairs; (5) add edges for forwarding actions; (6) pass each graph to invariant functions. Inference: a Verus version would define a graph datatype and prove that each edge agrees with the rule-selection specification; packet-transformation rules require additional ECs and are left as future work in the paper.

## technique: incremental invariant queries and custom actions
VeriFlow stores a list of invariant functions. For each modified EC it calls every function with that EC's graph. Built-in examples are basic reachability (depth-first search to a destination), loop-freeness (cycle detection), and consistency between two routers; other examples include black-hole detection, VLAN isolation, access control, conflict checks, next-hop stability, and firewall traversal (section 3.3, pp. 4–5). A function can drop a rule, install it while alarming, maintain statistics, or write logs. The paper notes two limits: graph metadata must contain what an invariant needs, and the check must be incremental over modified ECs (section 3.3, p. 5).

Inference: in Verus, write each invariant as a pure specification over the graph and prove a checker returns `true` exactly when the property holds. Runtime actions should be separated from the proof result; a verified policy can require that a violating update is never committed.

## technique: trie and implementation optimization
The paper says, “VeriFlow achieves real-time response by confining its verification activities within those parts of the network that are affected when a new forwarding rule is installed.” (section 3.4, p. 5). The prototype has a controller-independent proxy and a NOX-integrated version; evaluation uses NOX 0.9.1. Its optimized trie indexes four arbitrarily wildcarded fields: DL_SRC, DL_DST, NW_SRC, and NW_DST. For the other ten exact-or-ANY fields, it first refines packet sets using rules at the updated device, then tracks excluded packets during forwarding-graph traversal to account for finer rules elsewhere (section 4.2, p. 6). If many ECs are affected, the proposed fallback is to verify asynchronously, allowing the update through and later alarm or remove it. The paper reports such disruptive events are rare: around 99% of realistic updates affect fewer than 10 ECs (section 3.4, p. 5).

Inference: Verus can prove that trie insertion and lookup preserve a finite map of rules, then prove the optimization returns the same EC set as a simpler reference algorithm. Asynchronous checking weakens prevention to detection, so a product should make that policy explicit.

## evidence and limitations
The microbenchmark uses a 172-router Rocketfuel topology, a five-million-entry Route Views RIB snapshot, and 90,000 BGP updates. Total verification stayed below 1 ms for 97.8% of forwarding updates, with mean verification time 0.38 ms; one update affecting 511 ECs took 159.2 ms (section 5.1, pp. 7–8). Removing each of 381 packet-carrying links separately took 1.15 seconds on average and 4.05 seconds maximum; 254 removals affected over 1,000 ECs (p. 8). A separate experiment varies from one to fourteen OpenFlow fields and shows gradually increasing overhead (section 5.2, pp. 10–11). In an emulated 172-host, 172-switch network, the largest throughput reduction was 0.74% for TCP connections and 12.8% for Flow Mod messages; average TCP setup latency rose from 45.58 ms to 52.63 ms, a 15.5% increase (section 5.2, p. 10). These results concern those workloads, not all possible networks.

Against Hassel on one Stanford backbone snapshot, VeriFlow averaged 68.06 ms (maximum 75.39 ms) to test all ECs at one node, while Hassel averaged 578.62 ms (maximum 6.24 s) for one port-pair reachability query. A BDD/NuSMV approach averaged 335.71 ms per update and reached 67.16 s maximum (section 5.2, p. 11). These comparisons use different tasks, so they are contextual measurements rather than an equivalence proof. The system assumes a complete network view; obtaining that view with multiple controllers and handling packet transformations remain open problems (section 6, p. 11). It can report transient black holes while an application installs a multi-rule path one rule at a time.

The trusted components are the controller's rule stream, the trie and graph implementation, invariant code, and the network state observed by the shim. Inference: threat to agent-written verified Rust is moderate for deterministic rule checking, because EC and graph invariants fit inductive proofs; it becomes high for asynchronous updates, incomplete views, packet transformations, and unmodeled switch behavior. The paper predates Verus and does not measure proof effort.

## what VL should reuse
The incremental pattern—partition state into behaviorally equivalent regions, update only affected regions, build a compact semantic graph, and check small invariant functions—is directly reusable. Existing work already covers generic model checking, BDD-based static checks, and header-space analysis; the paper's contribution is the real-time incremental algorithm. Inference: VL should reuse this decomposition for verified Rust artifacts instead of redoing a full-network proof on every edit, while requiring a proof that the optimized index matches its reference semantics.

## techniques for the catalog
- equivalence-class slicing: partition packets by identical network behavior and recompute only affected classes
- incremental forwarding graphs: model each changed class as a graph from switch decisions
- invariant plug-ins: run reachability, cycle, consistency, or custom checks per changed graph
- trie-indexed updates: use multidimensional prefix tries to locate overlapping rules quickly
- asynchronous fallback: handle disruptive updates in parallel when synchronous checking is too slow
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The average verification latency is not significantly influenced as we increase the number of filters present in the network."): checked all 13 paper pages, references, quotations, numbers, sections, technique steps, and tag; corrected the trie optimization and section/page references, marked the apparent printed range typo as inference, added workload counts and slow link-failure results, and described asynchronous checking as proposed; link from the fetch record; did not run the implementation or reproduce experiments.
