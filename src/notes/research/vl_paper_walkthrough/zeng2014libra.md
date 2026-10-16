# Libra: Divide and Conquer to Verify Forwarding Tables in Huge Networks
(authored by agents unless marked 🧑)
Tag: `zeng2014libra`, [paper](https://www.usenix.org/conference/nsdi14/technical-sessions/presentation/zeng)

## problem and result
Libra verifies forwarding-table correctness in very large data-center networks. It addresses two failure modes of earlier static checkers: snapshots can describe a state that never existed, and centralized analysis does not scale to thousands of switches. The paper says, “We show how Libra can take an accurate snapshot of the forwarding state 99.9% of the time, and knows when the snapshot cannot be trusted.” (abstract, p. 1). Its benchmark is a 10,000-switch network with millions of rules checked in minutes using distributed MapReduce.

## technique: stable snapshots from event uncertainty
A routing process emits timestamped add, modify, and delete events. If clock and network-delay uncertainty is bounded by ε, each event at timestamp t occurred in `(t−ε,t+ε)`. Libra waits for a quiet interval of length 2ε after replaying events. The paper states, “if no routing events are recorded during a 2ε period we can be confident that no routing changes actually took place.” (section 3, p. 4).

Step by step: (1) take an initial snapshot S0 of all switch tables; (2) subscribe to timestamped event streams from every table-writing routing process; (3) replay each event in timestamp order to produce Sᵢ; (4) after event j, wait 2ε with no event; (5) declare Sⱼ stable and run analysis on that state. Events from different processes may be reordered because each process writes separate tables; events for one table remain timestamp ordered. In a day-long production trace of 28,445 events, at ε = 100 ms, only 0.1% of time was unstable, so 99.9% was stable (section 3, pp. 4–5; Table 1 gives stable-state counts for ε from 0 to 10,000 ms).

Inference: a Verus service can model event intervals and prove that a quiet 2ε window implies no unobserved update under explicit clock and delivery assumptions. The proof cannot establish those assumptions for an arbitrary network; event-stream integrity remains trusted.

## technique: MapReduce divide-and-conquer by subnet
Libra partitions by destination subnet rather than switch cluster. For each subnet, it associates all forwarding rules whose prefix contains that subnet, then constructs one forwarding graph and checks it independently. The paper explains, “In the map phase, it breaks the graph into a number of slices, one for each prefix.” (section 1, p. 2).

Step by step: (1) distribute shards of forwarding rules to mappers while giving each mapper the full subnet list; (2) match each rule against the subnet trie and emit `(subnet, rule)` pairs; (3) shuffle and group pairs by subnet into slices; (4) send slices to reducers; (5) for each local switch choose the highest-priority matching rule, breaking equal priorities by longer mask; (6) build a directed graph whose edges are possible next hops; (7) run loop, black-hole, reachability, or other graph checks. Mappers use a binary trie to find all subnet prefixes contained by a rule; reducers see every matching rule, so longest-prefix selection is correct even when a mapper saw only a shard.

The reducer's correctness argument is structural: in an uncompressed trie, the smallest matching node's descendants contain all matching prefixes; the compressed-trie case preserves this property by excluding nodes outside the matching range (section 5.1, pp. 6–7). Inference: Verus can specify a reference set of matching prefixes and prove trie lookup returns exactly that set, then prove reducer graph edges match the selected-rule specification.

## technique: graph properties and incremental updates
The graph encodes all data-plane behavior for one subnet, including multipath edges. Reverse DFS from the destination checks reachability in O(V+E); Tarjan's strongly connected components detect loops (section 6, p. 8). Vertices with zero out-degree identify possible black holes; section 6 distinguishes intended destination or explicit-drop behavior from unintended missing routes. The incremental design is not fully implemented: “Although Libra’s design supports incremental updates, our current prototype only does batch processing.” (section 7, p. 9). For an update in that design, mappers find affected subnets and reducers load each slice graph, apply the rule, and recompute properties. Adding an edge for loop detection needs only a DFS from that edge's destination in the usual case (section 5.3, pp. 7–8).

Inference: in Verus, prove DFS/SCC invariants over finite graph sequences and state an update postcondition that unaffected subnet graphs remain identical. Persisting all matching rules, rather than only the selected rule, is required so deletion can reveal the next-highest rule.

## evidence, limits, and trust
Table 2 (p. 9) gives DCN as 11,260 switches, 2,657,422 rules, and 11,136 subnets; DCN-G as 1,126,001 switches, 265,742,626 rules, and 1,113,600 subnets; and INET as 316 routers, 151,649,486 rules, and 482,966 subnets. INET uses a roughly half-million-entry BGP table to generate per-router forwarding tables, not half a million total rules. Cluster times were 57 seconds for DCN on 50 machines, 15 minutes for DCN-G (extrapolated to 20,000 machines from 1% of subnets on 200 machines, assuming 100 independent jobs in parallel), and 93 seconds for INET on 50 machines (Table 4, p. 10). The paper reports, “Libra can meet the benchmark goal we set out to achieve: it can verify the correctness of a 10,000-node network in 1 minute using 50 servers.” (conclusion, p. 12). Runtime scales linearly with rule count in the tested range; eight reducer threads gave 4.17× speedup on DCN and 5.38× on INET (Table 3, p. 9).

Libra assumes static IP-prefix forwarding, no header transformation, deterministic behavior, complete forwarding snapshots, and subnet prefixes contained by rules. It cannot explain why a state is wrong or interpret control logic; dynamic NAT and arbitrary header matching are outside the design (section 9, pp. 11–12). Inference: the trusted base includes route dumpers, event timestamps, MapReduce, trie and reducer code, switch-table semantics, and graph algorithms. Inference: threat to agent-written verified Rust is moderate for pure prefix and graph invariants, but high when snapshot assumptions, distributed event delivery, or hardware behavior are unverified. Verus can check a certificate for each slice, yet cannot by itself make an external snapshot accurate.

## what VL should reuse
Libra already covers scalable stable-snapshot reconstruction, subnet slicing, trie matching, graph construction, and incremental graph checking. Inference: VL should reuse the divide-and-conquer architecture and prove its indexing and graph reductions against simple reference specifications rather than reimplementing a monolithic global checker. The paper says, “Veriflow slices the network into equivalence classes and builds a forwarding graph for each class, in a similar fashion to Libra.” (section 10, p. 12). Inference: Libra’s distributed decomposition complements that approach.

## techniques for the catalog
- stable snapshot reconstruction: replay timestamped updates and wait 2ε to obtain a state known to have existed
- subnet MapReduce slicing: map rules to contained prefixes, shuffle by subnet, and reduce independently
- trie matching proof: use a compressed prefix trie to enumerate every rule containing a subnet
- forwarding-graph checking: detect reachability, black holes, and loops with DFS and SCC algorithms
- incremental slice updates: update only affected subnet graphs and rerun local graph properties

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Since each mapper only sees a portion of the forwarding rules, there may be a longer and more specific—but unseen—matching prefix for the subnet in the same forwarding table."): checked the whole paper, study quotations, metadata, references, technique steps, and reported results; corrected dataset sizes, DCN-G machine count, timestamp uncertainty, black-hole interpretation, incremental-prototype scope and page reference, and inference labels; replaced PDF URL with the publisher page printed in the paper; did not reproduce experiments or verify implementations.
