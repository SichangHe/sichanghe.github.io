# APKeep: Realtime Verification for Real Networks
(authored by agents unless marked 🧑)
Tag: `zhang2020apkeep`, [paper](https://www.usenix.org/conference/nsdi20/presentation/zhang-peng)

## scope and result

APKeep is an incremental data-plane verifier for networks containing forwarding, ACL filtering, NAT rewriting, and vendor-specific compositions. Its key abstraction is a Port-Predicate Map (PPM): each logically independent function is an element, each action is a logical port, and each equivalence class (EC) of packets is represented by a Boolean predicate mapped to its action port at every element. Updates alter only affected predicates. APKeep then builds a delta forwarding graph to check invariants, user policies, and what-if failures (§3.3, p. 247). The implementation includes an invariant checker and a what-if analyzer (§5.1, p. 249); policy checking is described as a supported method, not an implemented evaluation workload.

The paper identifies the problem precisely: range-based EC methods can explode to 15 million classes for 686 ACL rules, while AP Verifier can take up to 10 ms to update (§1, pp. 241–242). Its stated design target is “Realtime network verification” with “< 1ms per rule update” (Abstract, p. 241).

## technique 1: modular Port-Predicate Map

what it is and when to use it

Inference: use PPM when a device pipeline has multiple functions or vendor-specific orderings. Model functions rather than monolithic boxes. The paper defines an element as “a logically-independent function (e.g., IP forwarding, ACL, or NAT)” (§2.1, p. 242). Logical ports denote actions such as output to a VLAN, permit/deny, or header rewrite; unmatched packets take the default action: the forwarding default port, filtering deny port, or rewriting identity port (§3.1, p. 245).

how to do it

1. Parse topology and configuration into vendor-neutral rules and create forwarding, filtering, and rewriting elements. (§3.1, p. 245.)
2. Create a topology node for each application of an element; applications share the element’s port-predicate state (§2.1, p. 243). Connect those nodes according to intra-device composition and physical links. An ACL’s permit port, for example, connects to the forwarding element’s input port. (§3.1, p. 245.)
3. Initialize one predicate `True` for all headers. Place it on each default, deny, or identity port. (§3.1, p. 245.)
4. Maintain `Pred(p)`, the predicates at port `p`, and `Port(c)`, the set of ports carrying predicate `c`. The paper defines `Pred(p) = {c ∈ C | Porte(c) = p, e ∈ E}` (§2.1, p. 243).

Verus form

Inference: represent predicates as an abstract `spec` datatype and element topology as a ghost graph. Use `spec fn` to define packet membership and port maps; use `requires`/`ensures` on executable update functions to preserve disjointness, coverage, and port-map consistency. A Verus proof can establish the map invariants for a chosen Boolean-predicate representation, but BDD implementation correctness and arbitrary vendor semantics must be specified and proved separately.

## technique 2: three-stage incremental update

what it is and how to do it

For insertion of a rule `r = (priority, match, action)`, APKeep performs exactly three stages (§3.2, p. 245):

1. Encode `match` as a Boolean formula over header bits using binary decision diagrams (BDDs). BDD operations provide conjunction, disjunction, and negation (§3.2, p. 246).
2. Compute behavior changes locally. Initialize the inserted rule’s hit predicate to its match predicate and subtract overlapping higher-priority hits. For each overlapping lower-priority rule, emit `(delta, from, to)` if its port differs, then remove the inserted rule’s hit predicate from that lower-priority rule’s hit predicate. Algorithm 1 computes `hit` and the change set (Algorithm 1, p. 246).
3. Update predicates for each change. Algorithm 2 (p. 247) (a) splits a predicate `p` into `p ∧ delta` and `p ∧ ¬delta` when needed, (b) transfers the matching part from `from` to `to`, and (c) merges predicates with identical port sets by disjunction. Deletion differs only slightly; modification is deletion followed by insertion (§3.2, p. 245).

The worked example inserts two ACL rules and two forwarding rules. After all merges APKeep has four ECs, whereas match-field rectangles require ten (§2.2, p. 244). The authors prove: “APKeep maintains the minimum set of equivalence classes after each rule update.” (Theorem 1, §3.2, p. 246; proof in Appendix A, p. 254.) Inference: this guarantee describes the immediate split/transfer/merge algorithm. The delayed-merging optimization (§3.5, p. 248) can temporarily retain mergeable ECs; rewrite handling can require extra splits (§3.4, pp. 247–248).

Verus form

Inference: make `split`, `transfer`, and `merge` executable Rust functions with contracts stating that predicates remain a partition of the header domain and that each predicate’s port set equals its semantic behavior. Loop invariants over the rule list should state priority ordering and the definition of `hit`. Verus can check these logical invariants; it does not natively verify BDD package internals without a model of the BDD library.

## technique 3: verify invariants and path policies over a delta graph

After an update, APKeep constructs a delta forwarding graph (DFG) whose edges carry transferred predicates. It traverses the graph by intersecting the current predicate set with each edge’s predicates. An empty predicate set ends traversal. Revisiting a node with surviving predicates detects a loop; reaching the forwarding default port detects a blackhole (§3.3, p. 247; Appendix B, p. 255). The paper defines a loop as a packet traversing the same device again without modification, and a blackhole as a packet matching no forwarding rule (§3.3, p. 247). User policies are a header predicate plus a regular-expression path automaton. APKeep restricts the graph to transferred predicates intersecting the policy predicate, updates one automaton per predicate, and accepts only if all automata reach absorbing states (§3.3, p. 247).

Inference: a Verus implementation would model graph traversal as a recursive or iterative function with a visited-set invariant and a predicate-subset invariant. The automaton transition relation can be a `spec fn`; proof functions establish that every explored path respects the policy. The paper’s evidence is algorithmic and experimental, not a proof of Rust memory safety.

## technique 4: packet rewriting and optimizations

For NAT, APKeep represents a rewrite as existentially eliminating old header bits and conjoining the new values. The paper gives `T(p) = (∃x1 ∃x2 . p) ∧ (x1 ∧ x̄2)` for rewriting two bits (§3.4, p. 248). When a predicate is split, APKeep transforms each part and repeatedly splits predicates until every transformed result is representable in the PPM; Algorithm 3 maintains a rewrite table (p. 248).

The system separately maintains forwarding and ACL predicate sets, carries both during traversal, and checks their conjunction before reporting a loop. It records merge candidates and merges them when the total predicate count exceeds a threshold (500 by default), using a hash table keyed by ordered port lists to find candidates (§3.5, p. 248). Inference: separate predicate families require checking that a reported violation corresponds to packets satisfying both families.

## evidence, assumptions, and limits

The implementation uses about 5K lines of Java, config parsers for three vendors, an update parser for one vendor, and the JDD BDD library (§5.1, p. 249). The datasets include Airtel1/2, 4Switch, Internet2, Stanford, and Purdue. The last five datasets start from rule snapshots; updates insert ACL rules first, then forwarding rules, then delete them in reverse order (§5.1, p. 249). Figure 5 reports that less than 250 microseconds covers 90% of updates across datasets (§5.2, p. 250). Table 2 compares average times; Table 3 reports EC counts and reductions, including cases where Delta-netMF exhausts memory while APKeep completes (§§5.2–5.3, pp. 250–251). The Stanford and Purdue EC counts for Delta-netMF were obtained by running only EC-creation functions because full verification did not complete (§5.3, p. 250). Figure 7 evaluates rewrite-rule updates: the paper says, “the running time of APKeep is mostly less than 1ms, and scales well with the number of NAT rules.” (§5.5, p. 251.) The paper reports up to 200× speedup over AP Verifier for updates (§2.2, p. 244).

The paper explicitly excludes traffic statistics, flow mirroring, rate limiting, and congestion avoidance from the PPM model (§4, p. 249): “As all previous data plane verifiers, PPM cannot model these features.” Consistency across device updates remains future work: “Detailed design is left as one of our future work.” (§7, p. 252.) Inference: applying the verification result to a real network requires correct input-rule interpretation, BDD operations, model updates, and DFG traversal. The results concern the abstract packet-processing model; they do not prove switch firmware or a Rust implementation correct.

## relevance to VL

Inference: APKeep’s strongest lesson for verified Rust is an incremental proof architecture: isolate modules, represent behavior as predicates, and update only affected proof state. A Verus library could expose element-specific contracts and prove that split/transfer/merge preserve a partition invariant. Locally verified update code can still use an incomplete device model or policy, so model coverage and assumptions need explicit contracts.

## comparisons and work VL should not redo

The abstract’s sub-millisecond claim and Figure 5’s percentile use different summaries: the first is a target/result headline, while the paper states, “for all datasets, the verification time is less than 250µs for 90% of updates.” (§5.2, p. 250). NAT rule updates are a separate workload (§5.5, p. 251). What-if link-failure queries are evaluated separately in §5.4 and Table 4 (p. 251). Inference: these measurements should not be combined into one statistic. VeriFlow, Delta-net, NetPlumber, and AP Verifier already establish earlier incremental data-plane approaches and are the baselines APKeep compares against (§5.1, p. 250). Inference: VL should reuse those designs when testing a verified Rust implementation rather than claim the algorithms as new.

## techniques for the catalog

- modular PPM model — decompose device functions into elements, logical action ports, and predicate-to-port maps
- minimal incremental EC update — encode matches with BDDs, identify behavior deltas, then split, transfer, and merge predicates
- DFG verification — traverse predicate-labeled forwarding graphs to detect loops, blackholes, and regular-expression path violations
- rewrite predicates — model NAT with existential elimination and constrained header assignment, maintaining representable predicates
- scalable maintenance — delay merges, separate predicate families, and use hash indexing to reduce update work
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Since the predicate-based EC representation has no restriction on the match fields, we can encode these match conditions by adding more fields."): checked the entire paper, quotations, numerical claims, section/page references, and technique steps; corrected Algorithm 2 and policy page references, distinguished NAT updates from what-if queries, clarified hit updates, delayed merging, implementation scope, and evaluation limits, and replaced the link with the publisher page printed in the paper; did not reproduce experiments or verify code, BDD internals, vendor parsers, or the proposed Verus adaptations.
