# NDD: A Decision Diagram for Network Verification
(authored by agents unless marked 🧑)
Tag: `li2025ndd`, [paper](https://www.usenix.org/conference/nsdi25/presentation/li-zechun)

## purpose and result

NDD replaces bit-level Binary Decision Diagrams (BDDs) with a field-aware Network Decision Diagram. The paper's motivation is that BDD-based network verifiers suffer memory inefficiency, slow recursive operations, and little native support for atoms, incremental atom updates, and packet transformers (Sections 1–2, pp. 237–239). NDD wraps per-field BDDs in a second decision-diagram layer: each NDD node represents a field, and each edge carries a BDD predicate over that field (Section 3.2, pp. 240–241). The paper reports that five existing verifiers needed only small code changes and achieved “a 2 orders-of-magnitude reduction in both memory and time.” (introduction, p. 238).

The design assumes field locality. The authors state: “Field locality refers to the fact that even though there can be many fields in the network, each rule only matches on one or few of these fields, and different rules may match different fields.” (Section 3.1, p. 240). They explicitly warn that if rules match most fields, NDD may not outperform BDD (Limitations paragraph of Section 1, p. 238; Section 6.6, p. 247).

## technique 1: partition network state into fields and build a reduced ordered NDD

What it is. Partition the network bit vector into fields such as packet headers, route attributes, or link up/down state. Create a BDD namespace for each field, then layer an NDD whose node variable is a whole field and whose edge labels are predicates over that field (Section 3.2, pp. 240–241). The paper states: “In an NDD, each NDD node represents a field of multiple bits and has multiple edges; each edge of it is labeled with a BDD encoding those bits.” (Section 3.2, p. 241). A reduced ordered NDD (RONDD) extends BDD reduction with three conditions: unique nodes, no redundant nodes, and no two edges from one node pointing to the same successor (Section 3.3, pp. 241–242). The paper states canonicity for a fixed variable ordering (Lemma 1, p. 242) and proves it in Appendix C (Lemma 2, pp. 255–256).

When to use it. Use field partitioning when network rules tend to inspect only a few fields and those fields are mostly independent. The paper's heuristics for unclear fields are to keep variables with one complete meaning together and to group variables that appear in the same BDD operand (Section 8, p. 248).

How to apply it.
1. Identify fields and their bit widths (Section 3.2, p. 240; Section 8, p. 248).
2. Call `createVar(len)` once for each field; the library creates the corresponding BDD variables and maps them to the NDD variable (Section 4.1, p. 242).
3. Use an ordered field sequence and construct NDD nodes whose outgoing edge labels are mutually exclusive and cover all values (Definition 1, p. 241).
4. Reduce nodes by uniqueness, no redundant node, and no redundant edge (Section 3.3, pp. 241–242; Section 4.2, p. 244).
5. Apply Boolean operations through the NDD library, which can skip an entire field in one recursion (Section 3.2, p. 241).

Evidence. In the toy network, per-field reduction leaves 24 BDD nodes instead of 50 (Section 3.2, pp. 240–241); and NDD needs six recursions to reach the node with the matching variable where BDD needs 17 (Section 3.2, p. 241; the BDD count also in Section 2.2, p. 239). In the virtualized datacenter data, APKeep(NDD) used 0.01 GB for six leaf nodes versus 4.36 GB for APKeep(BDD), and 112 atoms versus 28,077 (Table 3, p. 246). For seven dataset sizes from 6 to 500 leaf nodes, APKeep(NDD) was the only verifier that ran to completion on all snapshots, while the two BDD-based verifiers either timed out (>24 h) or ran out of memory (>256 GB) (Section 6.2, pp. 245–246; Table 3, p. 246).

Verus form. Inference: model each field as a typed component of a Rust state struct and define a mathematical state predicate over those components. A `spec fn` can describe field-local predicates; executable code can use the same representation, with `requires` for valid field domains and `ensures` for operations. A Verus loop `invariant` can preserve the representation invariant. The paper's canonical DAG and BDD labels would remain a library algorithm whose correctness needs separate lemmas. This is an inference because the paper implements Java decision diagrams, not Verus.

## technique 2: atomize each field and make verification operations set operations

What it is. An atomized NDD replaces each edge's BDD label with a set of disjoint per-field atoms. For each field, atoms are non-false, cover all values, are pairwise disjoint, and are the smallest partition satisfying all NDD edge labels (Definition 2, p. 242). After atomization, logical operations (∧, ∨) on atomized NDDs can use set operations (∩, ∪) on the atom sets rather than BDD operations (Section 1, p. 238; Section 4.1, p. 243). The paper says verifiers “are agnostic of atoms, and do not need to realize their own atom-related algorithms” (Section 1, p. 238).

How to apply it.
1. Build the NDDs for port predicates or other network predicates (Figure 2 and Section 4.3, pp. 239, 244).
2. Call `atomize(Set<NDD>)`; the library computes a separate atom set for every field and replaces edge BDDs with atom sets (Table 1 and Section 4.1, p. 243).
3. For reachability, initialize the packet set to `ndd.true`, intersect it with each port's atomized predicate, and recurse to the next hop (Figure 2, p. 239).
4. Use the same `and` operation after atomization; the verifier remains atom-agnostic (Section 4.3, pp. 244–245).

Evidence. On Purdue, APKeep(NDD) reduced ACL-processing time to 7.04 seconds versus 22.37 seconds for BDD, reduced ACL atoms from 3,893 to 411, and reduced property-check time from 46.11 seconds to 0.88 seconds (Table 6, Appendix A.3, p. 251). The authors report an 89.4% atom reduction in that experiment (Appendix A.3, p. 251). For virtualized datacenter snapshots, NDD atom counts grew almost linearly, while for BDD the paper reports “quite large” node counts that blow up the node table (Section 6.3, p. 246; Table 3).

Verus form. Inference: represent an atom partition as a ghost sequence or set with proof obligations for nonemptiness, disjointness, and coverage. Prove that an `and` operation on atomized labels preserves equivalence to the original predicate with a `proof fn`; keep the atom table ghost-only if runtime code needs only a compact decision structure. The paper's atom definitions are mathematical, so the Verus encoding must choose finite domains and executable representations.

## technique 3: incremental atom updates

What it is. NDD's `update(δ, a)` API updates per-field atoms when a new NDD `δ` is added to an existing atomized NDD `a`, under the precondition `δ ⇒ a` (Table 1, p. 243). It conjoins the edge labels of δ only with atoms on paths from `a` to `true`, considers an edge only if one of its atoms has a non-false conjunction with the label, recurses into the successors, and then replaces the split atoms on all related edges (Section 4.1, p. 243).

How to apply it.
1. Maintain an atomized NDD `a` representing current predicates (Table 1, p. 243).
2. Construct new predicate `δ` and establish `δ ⇒ a` (Table 1, p. 243).
3. At `δ`'s node, intersect edge labels with atoms on paths in `a`; skip atoms that cannot intersect (Section 4.1, p. 243).
4. Recurse through related successors and replace split atoms on all affected edges (Section 4.1, p. 243).

Evidence. On 2,707 Purdue ACL updates, APKeep(BDD) had a highly skewed update time, with 1% taking 300–2,000 ms; APKeep(NDD) stayed below 150 ms (Section 6.2, p. 246). BDD created more than 3,000 new atoms for seven updates, whereas NDD created at most 24 (Section 6.2, p. 246). In virtualized datacenter updates, APKeep(NDD) created 7–15 new atoms for the listed sizes, while APKeep(BDD) created 8,043 (6 leaf nodes) or timed out and KatraR(BDD) created 1,309 (6 leaf nodes) or 4,062 (10 leaf nodes) before timing out on larger sizes (Table 3, p. 246).

Verus form. Inference: encode an update as a pure state transition with a precondition that the new predicate is covered by the old partition. Prove that only affected atoms change and that disjointness and coverage remain true. This can use `requires`, `ensures`, and a loop `invariant`; mutation of a runtime atom table would need ownership proofs in addition to the mathematical partition proof.

## technique 4: represent packet transformers with field-local atoms

What it is. NDD handles packet transformers (rewrite, encapsulate, decapsulate) with the same NDD operations: each transformer is a tuple (match, field, action) whose match and action predicates are NDDs, and both are used when computing atoms (Appendix F.3, p. 258). The authors synthesize NAT and twice-NAT rules for the Purdue dataset and measure APKeep with BDD and NDD (Section 6.4, pp. 246–247).

How to apply it.
1. For each transformer action, create a logical port on the device with two NDD predicates, `match` and `action`, computed as in AP Verifier (Appendix F.3, Step 1, p. 258).
2. Atomize these predicates with `atomize`, using both `match` and `action` to compute atoms (Appendix F.3, Step 2, p. 258).
3. When a packet set reaches the transformer, conjoin it with `match`; if the result is not false, erase the old field value with `exist` (decapsulate or rewrite), conjoin with `action` (encapsulate or rewrite), and merge the outputs of all logical ports (Appendix F.3, Step 3, p. 258).

Evidence. APKeep(NDD) was 10× faster with four NAT rules and 100× faster with 40; APKeep(BDD) ran out of memory after 80 NAT rules, while NDD completed through 2,000 rules (Section 6.4, p. 247; Figure 11). The paper attributes this to NDD computing “atoms separately for srcIP and dstIP, leading to much fewer atoms” (Section 6.4, p. 247).

Verus form. Inference: model a transformer as a relation from an input packet state to an output packet state, with a `spec fn` for the relation and a proof that each executable rewrite satisfies it. Use field-specific predicates and preserve a ghost atom partition. The paper does not describe Rust or Verus transformer contracts.

## appendix technique: recursive NDD operations and optimization

Appendix B gives the operational `apply(op,a,b)` algorithm (Algorithm 1). It handles terminal or identical operands first, recursively pairs overlapping successor edges when the variables match, swaps operands when the field order differs, merges edges to the same successor with a BDD disjunction, and looks up or creates the result node in the node table (Appendix B, p. 253). Atomized NDDs replace BDD conjunction/disjunction in this procedure with set intersection/union (Appendix B, p. 253). The library also removes the false NDD node and keeps an operation cache; NDD-based SRE with the cache is reported as over 10× faster than without it (Section 4.2, p. 244). Inference: a Verus implementation would prove recursive `apply` preserves denotation and reduction invariants, with a termination measure over node ordering and `ensures` relating the result to the Boolean operation.

## techniques for the catalog

- field-aware NDD: represent each network field with a BDD label inside an ordered, reduced decision diagram
- atomized NDD: partition each field into disjoint atoms so logical checks become set operations
- incremental atom update: split and propagate only atoms affected by a new predicate
- transformer handling: represent NAT and twice-NAT input/output predicates with field-local atoms
