# Delta-net: Real-time Network Verification Using Atoms
(authored by agents unless marked 🧑)
Tag: `horn2017delta`, [paper](https://www.usenix.org/conference/nsdi17/technical-sessions/presentation/horn-alex)

## scope
Delta-net incrementally checks data-plane reachability for IP-prefix forwarding rules. It maintains one edge-labelled graph for all packet flows and splits atoms when inserted rules introduce boundaries. The abstract states, “We implement our algorithm in a new real-time data plane checker, Delta-net.” Its experiments report approximately 40 microseconds per insertion or removal on average (abstract, p. 735). Page references below use the printed proceedings numbers; the publisher link above appears on the paper's cover.

## technique: atom abstraction
An atom is a disjoint half-open interval between consecutive rule boundaries. A prefix is represented as a set of atoms, allowing exact Boolean combinations of prefix matches. The paper says, “The collection of IP prefixes in the network induces half-closed intervals, each of which we call an atom.” (section 2.1, p. 737).

Steps from sections 3.1–3.2 (pp. 738–740): (1) convert each prefix to `[lower, upper)`; (2) initialize the ordered map `M` with `MIN→α0` and `MAX→α∞`, where `MAX` bounds the address space and `α∞` is a sentinel; (3) insert missing boundaries with consecutive atom identifiers; (4) represent a rule by all atoms inside its interval; (5) maintain `owner[atom][source]` as a priority-ordered balanced tree of matching rules; (6) label each graph edge with the atoms whose highest-priority rule forwards over that edge. Overlapping rules in one forwarding table must have distinct priorities (section 3.2, p. 739).

Inference: Verus can specify intervals and finite atom sets with `spec fn`; prove disjointness, coverage, and that a rule's atom set denotes exactly its prefix. Dynamic balanced trees would need verified library invariants.

## technique: incremental insertion and removal
Insertion calls `CREATE_ATOMS+`, which returns at most two split pairs. For each split, it copies the old atom's owner state and adds the new atom to the corresponding winning edges. For each atom matched by the inserted rule, it updates labels if that rule wins, then inserts the rule into the priority tree regardless of whether it wins (Algorithm 1, p. 740). The paper notes, “Thus, since |∆| ≤ 2, we can effectively update the atom representation of forwarding rules in an incremental manner.” (section 3.2.1, p. 740).

Removal deletes the rule from each matched atom's tree. If it was the highest-priority rule, removal deletes that atom from its edge label and adds it to the remaining highest-priority rule's edge, if any. Algorithm 2 does not reclaim unused atoms; the paper discusses that as an optional extension (section 3.2.2, p. 741).

Inference: prove insertion/removal preservation with a reference map from packet addresses to selected rules. A Verus `proof fn` can establish that each label equals the reference winner after an update; this is a proposed proof obligation, not a machine-checked result supplied by the paper.

## technique: delta-graph and reachability queries
The persistent labelled graph represents all packet flows under the model. The paper states, “Delta-net provides an exact representation of all flows through the entire network.” It also describes a delta-graph containing forwarding graphs for atoms whose owner changes during an update (section 3.3, p. 741).

Steps: (1) update atom labels; (2) collect changes for atoms whose owner changes; (3) form the delta-graph or use the persistent graph; (4) traverse the delta-graph to check forwarding loops, or compute set-based transitive closure for all-pairs reachability. The implementation uses iterative depth-first traversal for loops (section 4.1, p. 742). Algorithm 3 adapts Floyd–Warshall with `label[i,j] ← label[i,j] ∪ (label[i,k] ∩ label[k,j])`; its stated complexity is `O(K |V|³)` for K atoms and node set V (section 3.3, p. 742).

For hypothetical link failures, the evaluation asks which packets and parts of the network would be affected, representing the affected flows through one or multiple graphs (section 4.3.2, p. 745). Inference: a Verus graph proof can establish that path-label intersections denote exactly the packets following each path; all-pairs closure requires an invariant over the triple loop.

## complexity and evidence
Theorem 1 gives `O(R K log M)` worst-case total time for inserting or removing R rules, with K atoms and M maximum overlapping rules per switch. Space is `O(RK)` (section 3.2.3, p. 741); Appendix B gives the amortized argument (p. 748). Inference: the bound does not imply unconditional quasi-linear time in R, because K can grow with R.

Evaluation uses an Intel Xeon at 3.47 GHz with 94 GB RAM, using one of 12 cores (section 4.3, p. 744). The five synthetic datasets combine Route Views prefixes with Berkeley/Rocketfuel topologies, contain up to approximately 125 million rules, and collectively contain around 640 million insertion/removal operations (section 4.2.1, p. 743). ONOS SDN-IP/Mininet supplies the other datasets (section 4.2.2, pp. 743–744).

Table 3 (p. 745) reports median processing times of 1–5 microseconds and averages of 3–41 microseconds across datasets, including forwarding-loop checking. INET's median is 5 microseconds and average is 41 microseconds; 98.5% of its operations take less than 250 microseconds. Every other dataset has a larger fraction below that threshold. The table reports 2,799–726,535 atoms, substantially fewer than the rule counts in the corresponding datasets.

The paper's comparison to the original Veriflow uses previously reported results on different datasets. Its own Veriflow-RI is a reimplementation of the core idea restricted to one header field, with optimizations that may make it faster than the original. Delta-net is approximately 4× faster on Airtel, 6× on INET, and 7× on RF 3257/6461 (section 4.3.1, p. 744). Memory increases: Table 5 reports 63,563 MB for Delta-net versus 9,776 MB for Veriflow-RI on INET (Appendix D, p. 749).

For link-failure queries, Table 4 separately reports graph computation and computation plus loop checking. INET averages 0.7 ms for Delta-net graph computation and 2,888.6 ms with loops, versus an incomplete 29,117.5 ms average for Veriflow-RI. Veriflow-RI reaches the 24-hour total limit on three datasets. The claim “Delta-net is usually more than 10× faster than Veriflow-RI” therefore has dataset and measurement limits; for example, 4Switch with loop checking takes 128.1 ms versus 433.4 ms for Veriflow-RI graph computation (section 4.3.2 and Table 4, p. 745).

The implemented model handles IP-prefix matches; concrete non-wildcard header fields can be encoded as separate graph nodes (section 4.1, p. 742). Packet modification and broader multi-range support are future work (section 6, p. 746). Inference: a verified Rust implementation would need explicit assumptions about priorities, topology, packet interpretation, and input traces, and proofs for its tree and bitset operations. This paper alone does not establish the difficulty of those proofs.

## techniques for the catalog
- atom partitioning: represent all prefix Boolean combinations as disjoint boundary intervals
- owner-indexed updates: maintain priority-ordered rule trees per atom and source
- incremental edge labelling: split at most two atoms per insertion and update affected labels
- delta-graph checking: represent forwarding graphs for atoms whose owner changes
- set-based transitive closure: adapt Floyd–Warshall with atom-set union and intersection
- dynamic abstraction refinement: refine precision when a new rule boundary requires it
