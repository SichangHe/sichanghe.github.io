# Verifying Lock-free Search Structure Templates
(authored by agents unless marked 🧑)
Tag: `patel2024verifying`, [paper](https://arxiv.org/abs/2405.13271v1)

## what the paper proves

The paper mechanizes linearizability proofs of parameterized lock-free list and skiplist templates in Iris/Coq. Linearizability means that each operation appears to take effect at one point during its execution, consistently with the sequential specification. The abstract states: “We present and verify template algorithms for lock-free concurrent search structures that cover a broad range of existing implementations based on lists and skiplists.” (Abstract, p. 1.) The authors qualify their novelty claim: “The result is, to our knowledge, the first formal verification of fully-functional lock-free algorithms for skiplists of unbounded height.” (Section 1, p. 2.)

The base list determines set membership; upper lists accelerate search. Nodes have a key, height, next pointers, and one mark bit per level. Logical deletion precedes physical unlinking. The template supports search, insert, and delete. Insert links a new node at level 0 before upper-level insertion; delete marks all upper levels before level 0. Upper-level maintenance can follow any permutation. The paper states: “The skiplist template presented here makes sure that the base level gets marked at the end and the insertion first happens at the base level, but it imposes no order on how it proceeds at higher levels.” (Section 2, p. 5.) Failed base insertion restarts insert; failed base marking returns false from delete (Figure 2, p. 4).

## technique: parameterized template verification

Inference: This technique is useful when implementations share core operations but differ in node representation or cleanup. The paper explicitly abstracts “(i) node-level details; (ii) the style of unlinking marked nodes and (iii) the order of maintenance operations on higher levels.” (Section 2, p. 3.)

The construction separates these obligations:

1. Define node fields, sentinel conditions, and the core algorithm (Section 2, pp. 3–5, Figures 2–3).
2. Specify node helpers with logically atomic contracts using an abstract `Node` predicate. The authors explain: “The skiplist template proof is parametric in the definition of Node.” (Section 5.1, p. 19, Figure 10 on p. 20.)
3. Specify traversal separately. Its formal contract returns `(p,c,res)` with a past state during traversal satisfying `k ∈ keyset(c)` and `res ⇔ k ∈ C(c)`, where `C(c)` is the node's logical contents (Section 3.3, p. 10). It also populates predecessor/successor arrays whose observed keys satisfy `key(ps[i]) < k ≤ key(cs[i])` (Section 2, p. 4).
4. Prove the core operations against these contracts, then instantiate and verify node and traversal implementations (Sections 5–6, pp. 18–23). The proof organization uses Coq modules: “In order to correctly capture the dependence between different layers of the proofs (such as hindsight specification and the templates, the templates and the traverse/node implementations), we heavily make use of Coq’s module system.” (Section 6, p. 21.)

The eager traversal unlinks each marked node as encountered; the lazy traversal skips marked nodes and attempts to unlink the whole segment. The latter rechecks that its final successor is unmarked after a successful unlink, restarting otherwise (Section 2, p. 6; Appendix A.2, p. 31, Figure 13). The verified eager implementation uses option return types rather than the mutually recursive presentation (Section 2, footnote 1, p. 6).

Inference: A Verus implementation could separate executable atomic helpers from specification predicates for membership and traversal. Its contracts and ghost state would need to encode the obligations discharged by Iris resources; this paper supplies no Verus implementation or proof of that translation.

## technique: edgeset reasoning for traversal

An edgeset labels an edge with a set of search keys, rather than a set of edges: “We denote the edgeset from n to n′ by es(n, n′), and k ∈ es(n, n′) signifies that a search for key k will proceed from node n to n′.” (Section 3.1, p. 7.) The skiplist reasoning uses the base list. An inset describes keys whose search can arrive at a node; an outset is the union of its outgoing edgesets; the keyset is `inset(n) \ outset(n)` (Section 3.1, pp. 7–8).

Keysets connect local observations to global membership: “The keysets of all nodes partition the set of all keys and provide the crucial Keyset Property:” (Section 3.1, p. 8.) That property says that if `k ∈ keyset(n)`, then `k` is in the whole structure exactly when it is in `C(n)`. The Flow Framework supports local reasoning about the globally defined inset (Section 3.1, p. 8; Appendix C.1, pp. 36–38).

The concurrent proof preserves a past fact, rather than requiring the current inset to contain the key: “we argue first that eager_i does maintain the invariant that the search key was in the inset of the current node c between the start of the traversal and the point at which the eager_i accesses c.” (Section 3.4, p. 12.) The proof combines sorted reachable nodes, immutable keys, irreversible marking, and next pointers that stop changing after marking. When traversal ends at an unmarked node with key at least `k`, these facts establish past keyset membership and the returned membership result (Section 3.4, p. 12; Appendix A.1, pp. 29–30).

Inference: A Verus port would need ghost graph predicates and transition invariants that preserve these past facts through concurrent changes. A sequential sortedness invariant alone would not express this proof obligation.

## technique: hindsight reasoning for future-dependent linearization

The authors explain the target difficulty: “Hindsight reasoning has shown its usefulness in dealing with future-dependent and external linearization points, a challenge that commonly arises in lock-free data structures.” (Section 1, p. 2.) The reusable Iris method hides much of the prophecy and helping machinery behind a hindsight specification.

The shared invariant records snapshots and timestamps through `Hist(H,T)`, maintains a generic helping registry, and includes the structure-specific `Invtpl`. The latter contains resources tying the current snapshot to the physical structure, per-snapshot invariants, and transition invariants. History is preserved: “Using appropriate ghost resources, it ensures that the timestamps are non-decreasing and past states recorded in H are preserved by future updates to the history.” (Section 4.2, p. 17.)

To apply the method, identify decisive operations and resolve prophecies around them; define snapshots and instantiate the invariant; prove the hindsight specification (Section 5, p. 18). For this template, base-level `markNode` and `changeNext` are decisive for delete and insert; search has none. The specification separates modifying and unmodifying executions. A modifying execution receives an atomic update obligation and returns its receipt. An unmodifying execution establishes `PastLin`: a past state since the operation began satisfying the sequential specification without changing the abstract state (Section 4.1, pp. 14–16). The generic proof then yields the client-level atomic specification: “From the perspective of a proof author using our method to prove linearizability of some structure, one has to only establish the hindsight specification to obtain the proof of the client-level atomic specification.” (Section 4, p. 13.)

For a failed base mark in delete, traversal previously witnessed the node unmarked, while the failed mark observes it marked. Temporal interpolation identifies consecutive snapshots where a concurrent delete marked it. The later snapshot witnesses absence of the key and justifies returning false (Section 5.2, p. 21; Appendix C.3, pp. 39–40).

Inference: Reusing this interface in Verus would require a sound encoding of history, prophecy-dependent obligations, and atomic updates. Merely adding a ghost sequence does not establish the method's soundness.

## evidence, limits, and trust

Table 1 (p. 23) reports 408 program lines, 19,513 proof lines, 19,921 total lines, and 603 seconds of proof checking across the listed modules. The timing setup was a Docker image on an Apple M1 Pro with 16 GB RAM (Section 6, p. 22). Two node representations and both traversals are verified. The Herlihy–Shavit instantiation uses eager traversal and node implementation 2; restricting it to `L = 2` yields the Michael set. Replacing eager traversal with lazy traversal gives a new skiplist variant, whose `L = 2` case yields the Harris list (Section 6, p. 22).

The multicopy comparison reports 2,779 original lines versus 1,310 structure-specific lines using hindsight: “Hence, the new proof based on hindsight reasoning consists of only 1310 lines, which is a reduction of 53%.” (Section 6, p. 23; Table 2, p. 24.) The new total excludes 950 definition lines and 338 client-specification lines because these belong to the reusable hindsight library. Inference: This comparison measures proof reuse for that multicopy development, not execution speed or a universal reduction in verification effort.

Coverage has explicit limits. Backlink algorithms are “not immediately covered by our template algorithm” (Section 7, p. 25). Memory reclamation is outside the model: “In this paper, we assume a programming language with a garbage collected semantics.” (Section 7, p. 25.) The authors propose using orthogonal reclamation-verification techniques. Progress is also unproved: “Our proofs guarantee safety but not liveness.” (Section 8, p. 25.) Inference: Calling these algorithms lock-free does not mean this development mechanizes their progress guarantees. The reported proofs concern HeapLang implementations and their Iris specifications; they do not establish correctness of compiled Rust implementations or arbitrary production skiplists.

## techniques for the catalog

- parameterized lock-free templates — verify core operations against separate node and traversal contracts
- edgeset traversal invariants — connect past keyset membership and node contents to global membership
- hindsight linearization — combine snapshot histories and transition invariants with a reusable prophecy and helping proof
