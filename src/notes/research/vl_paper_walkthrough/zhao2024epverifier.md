# EPVerifier: Accelerating Update Storms Verification with Edge-Predicate
(authored by agents unless marked 🧑)
Tag: `zhao2024epverifier`, [paper](https://www.usenix.org/conference/nsdi24/presentation/zhao)

## problem and system

EPVerifier verifies data-plane forwarding during large update storms. The standard pipeline identifies forwarding changes, updates a network model, and checks loops, blackholes, reachability, or user specifications. The paper observes: “This is because their network model is based on global equivalence classes (ECs) and therefore cannot avoid network model oscillations, i.e., redundantly modify the part of the network model where no traffic change occurs” (Section 1, p. 980). It describes the operational goal as follows: “To be useful in practice, such data plane verifications need to be completed as rapidly as possible” (Section 1, p. 980). EPVerifier replaces global equivalence-class labels with local edge predicates (EPs), then partitions work by switches.

## technique 1: edge-predicate model and hit calculation

Represent each directed edge’s packet flow as a Boolean predicate over header bits, encoded as a BDD (Section 5.1, p. 984). A forwarding rule is `r(match, from, to, priority)`. Because overlapping rules are resolved by priority, compute the packets actually affected by r as `r.hit = r.match ∧ ¬(∨ higher-priority rule.match)` (Equation 1, Section 2, p. 981). The storm change is the tuple of all update hits (Equation 2). For an insertion, merge its hit into the `(from,to)` edge label and delete it from the labels of the other outgoing edges of `from`; deletion is handled similarly (Section 2, p. 981).

Use a BDD manager per switch. The map `M[e]` stores the BDD predicate for each edge; initialize each edge to false (Section 5.1, p. 984). For an insertion, calculate hit (Algorithm 2, p. 984), OR it into the destination edge, walk lower-priority rules, remove overlapping traffic from edges to different destinations, update their hits, and add the rule. For deletion, remove the rule’s hit from its edge, delete the rule, then restore traffic covered by lower-priority rules (Algorithm 3, p. 985).

Inference: A Verus model could represent predicates as finite bit-vector sets and prove insertion/deletion preservation with `requires` and `ensures`; BDD canonicalization and Java JDD operations would remain trusted unless separately verified. Verus does not provide a BDD manager construct.

## technique 2: switch-based partition

When a storm arrives, greedily create N region update sequences: select the unvisited switch with the most updates and add all of its updates to the region sequence with the fewest updates (Algorithm 1, Section 5.1, p. 984). N should be smaller than the number of CPU cores (Section 5.1, p. 984). Balance comes from the greedy assignment; locality comes from the fact that “each update can affect only the EP of those edges emanating from the switch where the update is being installed” (Section 4.2, p. 984). Each region’s update sequence runs in parallel, then changed predicates are combined for verification (Section 3, p. 981).

The paper contrasts this with subspace-based partition, which builds multiple network models (Section 2, p. 981) and is “prone to bottlenecks in practice because the updates that arrive are most likely not evenly distributed across subspaces” (Section 1, p. 980). Switch-based partition “only constructs one network model” (Section 2, p. 981) and uses distinct BDD managers per switch to avoid multi-threaded synchronization costs (Section 5.1, p. 984).

Inference: In Verus, partition correctness requires proving that disjoint switch updates commute or that the merged state equals sequential application. Parallel execution itself is outside the sequential Verus proof model and needs a concurrency abstraction.

## technique 3: incremental EP transfer and graph checks

BDDs in different BDD managers cannot be combined by logical operations. After regional updates, transfer changed formulas into a common manager (Section 5.3, p. 985). The authors report that “EPVerifier performs incremental migration of changed EPs rather than starting from scratch to avoid redundant calculations” (Section 5.3, p. 986). For an edge change `old→e`, compute `delta=old\e`, remove those formulas from the common map, then compute `delta=e\old` and add them; accumulate the affected packet predicate (Algorithm 4, p. 986).

Run DFS on the forwarding graph from each node. Carry the packet predicate `p` (initialized to the affected packets) and visited-node history. Revisiting a node reports a loop; after exploring neighbors, nonempty p reports a blackhole (Algorithm 5, p. 986). For a user specification `(match,source,waypoints,dst)`, optionally under a failed link whose EP is set to false, traverse only matching packets and check that all reach every waypoint and dst (Algorithm 6, p. 986).

Inference: A Verus proof can state graph reachability and loop-freedom over finite nodes with sequence invariants. Predicate transfer requires extensional set-equality lemmas; BDD implementation details do not carry over automatically.

## evidence, trust, and limits

EPVerifier is ∼4000 lines of Java and uses JDD for BDDs (Section 6.1, p. 987). Experiments use seven datasets with storm sizes of 10K or 1M updates; INET has 315 nodes, 40770 links, and 2.49×10^8 FIB rules, while RF1755 has 87 nodes, 2308 links, and 3.37×10^7 rules (Table 1, p. 987). In Table 2 (p. 988), on INET EPVerifier takes 25.98 s versus 14458.69 s for APKeep* (557×) and 800.65 s for Flash (31×); on RF1755 it takes 11.91 s versus 10196.17 s for APKeep* (856×) and 100.08 s for Flash (8.4×). APKeep* is the authors’ own reimplementation from APKeep’s pseudocode (Section 6.1, p. 987). On the small Airtel datasets the speedup is insignificant: Airtel2 takes 0.09 s with EPVerifier versus 0.08 s with Flash (Table 2, p. 988).

The paper states: “In all datasets, the number of BDD operations of EPVerifier∗ and EPVerifier is at least one magnitude less than that of Flash and APKeep” (Section 6.2, p. 988). Inference: Table 2 does not support this for every dataset; for EPVerifier versus Flash, Airtel1 shows 5 × 10^5 versus 3 × 10^5 and Berkeley shows 4 × 10^6 versus 1 × 10^7.

Memory is higher on small networks because each switch’s BDD manager allocates a cache (Section 6.2, p. 988). The deployment on a commercial data center backbone reports only verification-time CDFs for 50 update storms (Section 6.5, Figure 9, p. 989). Packet transformations such as NAT are left to future work (Section 7, p. 990).

Inference: The verification result is conditional on correct rule parsing, BDD operations, topology/configuration, and user specifications; the evaluation measures speed, not whether the model captures every production forwarding behavior.

Inference: For agent-written verified Rust, EPVerifier threatens products that need rapid network-policy checking under bursts of updates. Its local predicate and incremental-delta ideas could guide a Verus-verified checker, but the current implementation and BDD library are unverified trusted code. The work complements source-level functional proofs by checking dynamic forwarding state.

## techniques for the catalog

- edge predicates: store per-edge packet-flow Boolean predicates instead of global equivalence classes
- priority hit calculation: derive the exact packet subset changed by a rule using higher-priority matches
- switch partitioning: greedily balance update sequences by switch for parallel verification
- incremental predicate transfer: migrate only predicate deltas between regional and common BDD managers
- graph invariant traversal: use predicate-carrying DFS to detect loops, blackholes, and reachability failures
