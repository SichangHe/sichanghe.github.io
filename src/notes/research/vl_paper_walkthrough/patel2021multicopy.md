# Verifying Concurrent Multicopy Search Structures
(authored by agents unless marked 🧑)
Tag: `patel2021multicopy`, [paper](http://arxiv.org/abs/2109.05631v1)

This paper gives a reusable Iris/Coq framework for proving linearizability of concurrent data structures that retain several copies of a key, such as LSM trees. Its key move is to separate a client map specification from a template specification about search recency, then connect them once with history ghost state, prophecy variables, and helping. The authors state: “By introducing this intermediate abstraction level (\"Template Level\" in the figure) at which we can verify concurrent multicopy structure template algorithms, we aid proof reuse in two ways.” (Section 1, p. 2)

## technique: specify multicopy behavior with timestamps and search recency

What it is. Model the structure as a DAG of nodes. Each node stores `(key, (value, timestamp))`; timestamps are ghost data that order copies. The client abstraction `M` maps each key to the value at its largest timestamp. The desired client-level operations are atomic: upsert changes `M[k]`, while search returns `M[k]` (equations (1)–(2), Section 3.2, pp. 6–7). The paper explains why this is needed: “Since copies of a single key 𝑘 can be present in different nodes simultaneously, we need a mechanism to differentiate between these copies.” (Section 3.1, p. 5)

The reusable template property is search recency: a search returns the value current when it started or a copy upserted during its execution (Section 3.3, p. 7). The template-level upsert advances a global clock and adds `(k,(v,t))` to history `H` (equation (3)); search returns a history copy whose timestamp is no earlier than its start timestamp (equation (4), Section 3.3, pp. 7–8).

How to apply it.
1. Add a fresh timestamp to every upserted node entry and maintain `HInit`, `HUnique`, and `HClock` over the history (Section 3.3, p. 7).
2. Define the latest history copy `H̄(k)` and the logical map from it; require that every physical node copy belongs to `H` (Section 3.3, p. 7).
3. Give upsert the atomic triple that increments the clock and extends `H`; give search the recency triple with a start timestamp witness (equations (3)–(4), pp. 7–8).
4. Prove once that any execution satisfying these template triples refines the client map triples. The paper says: “When proving the validity of the template-level atomic triple of search for a particular implementation (or template), one can now always commit the atomic triple (i.e., declare a linearization point) at the point when the return value 𝑣 of the search is determined.” (Section 3.3, p. 8)

Verus form. Inference: represent `H` and the timestamp order as ghost state in a Verus state-machine or proof-oriented API. A `spec fn` can define the latest entry and logical map; `requires` and `ensures` express the atomic upsert/search contract. Verus has no direct Iris atomic-triple connective, so a Verus implementation would need a verified concurrent protocol whose transition relation exposes a linearization event. Timestamps and monotonicity remain useful ghost fields. This is an inference because the paper uses Iris, not Verus.

Evidence and assumptions. The refinement is mechanically checked in Coq/Iris, but it assumes a sequentially consistent lock-based model and the representation predicates supplied by an instantiation. Timestamp ghost state need not be stored by the implementation.

## technique: use prophecy variables and helping for dynamic linearization points

What it is. A search's linearization point may be an upsert executed by another thread, and cannot be fixed in the search code. The proof wraps search with two one-shot prophecies: one predicts the returned value and one gives a fresh thread identifier (Fig. 4, Section 4.1, p. 9). The prophecy resource is transferred through the shared representation predicate. The paper states: “Iris prophecies, based on the idea first introduced by Abadi and Lamport [1988], allow a thread to predict what will happen in the future.” (Section 4.1, p. 9)

How to apply it.
1. At search entry, call `NewProph` twice, binding one prophecy to a thread id and one to the eventual value (Fig. 4, p. 9).
2. Keep the exclusive `Proph(p,vp)` resource in the thread or transfer it through the shared predicate; resolve it after the concrete search returns, proving `vp = v` (Section 4.1, p. 9).
3. If the predicted value equals the logical value at search start, commit the client atomic triple immediately.
4. Otherwise register the thread's pending atomic triple in shared ghost state. An upsert that inserts the matching `(k,(v,t'))` scans registered searches and discharges their obligations. This is the helping protocol described in Section 4.1, pp. 9–10.
5. Use a unique token `Tok` and per-thread state (`Pending`, `State`, `Done`) to prevent duplicate completion; when search obtains a history entry with timestamp at least its start timestamp, it trades the token for the postcondition (Section 4.2, pp. 10–12 and Appendix A).

Verus form. Inference: model each pending search as an entry in a ghost state machine, with a unique token represented by an exclusive ghost resource. A transition for upsert can mark matching searches done; a search transition resolves its predicted result and consumes its entry. Verus state-machine transitions and `invariant`s can encode uniqueness and monotone history, but prophecy prediction itself is not a standard executable Verus feature. A practical Verus design would instead expose a linearization witness or use an explicit history/refinement proof. This limitation is an inference.

Evidence and limits. The helping proof is mechanized in Iris, including unboundedly many registered searches. It depends on higher-order ghost state, exclusive prophecy resources, and the atomic-triple semantics. It does not prove lock-free progress; the template assumes a maintenance thread eventually flushes a full root (footnote to Fig. 7, p. 13).

## technique: prove a generic search template with three monotonicity invariants

What it is. The LSM DAG template traverses one locked node at a time. `traverse` checks `inContents`; if absent it follows the unique edge selected by `findNext`; `upsert` locks the root, calls `addContents`, and retries if the root is full (Fig. 7, Section 5, p. 13). The proof uses contents-in-reach, a recursive function giving the first copy encountered for each key.

How to apply it.
1. Define `C_ir(n)` recursively over node contents and disjoint edge sets (equation (5), Section 6.1, p. 15).
2. Maintain Invariant 1, `H̄ = C_ir(r)`, linking logical history to the root's reachable contents.
3. Maintain Invariant 2: each node's reachable timestamp for a key only increases over time under upsert and maintenance.
4. Maintain Invariant 3: every physical copy `C_n` is contained in `H`.
5. Give each recursive `traverse(r,n,k)` call the local precondition `ts(C_ir(n)(k)) ≥ t0`, where `t0` is the timestamp at search start. If a node contains the key, Invariants 2–3 establish recency and history membership; if not, edge semantics preserve the precondition for the recursive successor call (Section 6.1, pp. 15–16).
6. Linearize upsert when the root lock is released after a successful insertion, update `H`, and use Invariant 4 (all history timestamps are below the current clock) to show the latest copy remains the logical one (Section 6.1, p. 16).

Verus form. Inference: encode the graph, timestamp map, and `C_ir` as specifications; carry the traversal precondition as a recursive function contract. Rust recursion or an explicit stack needs a `decreases` measure based on DAG height. A concurrent Verus proof would need a state-machine transition for root insertion and lock ownership. The three invariants should be facts in the state-machine invariant, while node helper contracts can be ordinary `requires`/`ensures` functions. This is a translation proposal, not a claim about the paper's code.

Evidence and assumptions. The proof is generic over node-level data structures and requires a DAG with pairwise-disjoint outgoing edgesets, a lock-based sequentially consistent memory model, and helper-function contracts. It abstracts storage media and does not model disk failure.

## technique: use flow interfaces for local reasoning about recursive DAG state

What it is. The recursive `C_ir` function can change globally when one edge changes. The paper uses the flow framework: a flow maps nodes to a commutative cancellative monoid and satisfies a local flow equation. Preserving a region's inflow/outflow interface guarantees that flows outside the region are unchanged (Section 6.2, pp. 16–17). The paper explains: “If the interface of a modified region is preserved, then the framework guarantees that the flow of the rest of the graph is unchanged.” (Section 6.2, p. 17)

How to apply it.
1. Choose a flow domain and define node inflow and edge propagation so the flow equation computes the desired reachability quantity (Section 6.2, p. 17).
2. Store auxiliary ghost functions `Q_n` per node to turn bottom-up contents-in-reach into a forward flow (Section 6.2, pp. 17–18).
3. For an update, prove only that the modified region preserves its flow interface; the framework supplies unchanged flow values elsewhere.
4. Add a second multiset-key flow for insets. Use local predicates to enforce that reachable keys belong to a node's inset (Invariant 6) and that predecessor insets are disjoint (Invariant 7, Section 6.2, pp. 22–23).

Verus form. Inference: represent the flow equation as a `spec fn` over finite graph maps and prove interface-preservation lemmas for each edge update. Ghost maps can be fields of a Verus state machine. Since Verus's automatic solver may not discover arbitrary graph fixpoints, explicit induction over a bounded representation or a proved flow abstraction is required. This is an inference.

Evidence and limits. The Iris flow library and invariants are mechanically checked. The method relies on commutative-monoid algebra and acyclicity; it does not automatically verify arbitrary graph mutations without a suitable interface proof.

## technique: verify maintenance compaction while preserving the abstract map

What it is. The `compact` template moves recent copies from a node to its successor, creating a node when needed. Its atomic specification leaves `(t,H)` unchanged (Section 7.2, p. 20). The proof adds Invariant 5: a node's timestamp is no smaller than the reachable timestamp of its successor. For DAGs, it also uses unique key-specific search paths, encoded by inset-flow Invariants 6–7 (Section 7.2, pp. 21–23).

How to apply it.
1. Specify `chooseNext`, `allocNode`, `insertNode`, and `mergeContents` with separation-logic triples (Fig. 10, Section 7.2, p. 20).
2. For each merge, retain the newer copy in the upstream node and move or discard older copies according to `mergeLeft` and `mergeRight`.
3. Prove the auxiliary timestamp and inset invariants before releasing locks; the final lock release is the compact linearization point (Section 7.2, p. 21).
4. Reject DAG shapes that permit two incoming paths carrying the same key to interfere; enforce this with disjoint inset flow (Invariant 7, pp. 22–23).

Verus form. Inference: make compaction a state-machine transition over node maps and prove that the logical latest-timestamp map is unchanged. A lock-protected `compact` function can call verified merge helpers; its invariant must include successor timestamp ordering and unique key paths. Crash persistence and file semantics require separate specifications.

Evidence and limits. The paper gives a counterexample showing that unrestricted DAG compaction can decrease a reachable timestamp and violate the abstract map (Fig. 11, Section 7.2, pp. 21–22). Thus the shape invariant is essential, not cosmetic.

## mechanized evidence, trusted parts, and VL relevance

The artifact verifies the client/template refinement and templates in Iris/Coq, and verifies an LSM implementation in GRASShopper. Table 1 reports 75 lines of template code, 9,620 proof-annotation lines, 9,695 total, and 535 seconds; the implementation side reports 398 code lines, 686 proof lines, 1,084 total, and 62 seconds (Table 1, p. 24). The measured setup is an Intel Core i7-8750H laptop with 16 GB RAM (Section 8, p. 24). The authors explicitly identify two end-to-end gaps: “First, there is currently no way to formally compose the proofs done in Iris/Coq and GRASShopper.” They also model each file as a RAM disk because GRASShopper cannot reason about file access directly (Section 8, p. 24).

The result proves linearizability of the abstract templates and an LSM instantiation under the stated helper contracts. Trusted parts include Iris, Coq, GRASShopper, the bridge between their specifications, lock and memory semantics, and the RAM-disk abstraction. It does not prove crash consistency or weak-memory lock-free implementations; the related-work section says the verified LSM “do[es] not model disk failure and hence do[es] not address crash consistency” (Section 9, p. 26). Inference: the threat to agent-written verified Rust is high for concurrent storage code if a project lacks an explicit history, shape, and persistence model. The reusable abstraction can reduce proof effort, but cross-tool gaps and unmodeled I/O remain product risks.

The paper already supplies a complete template methodology, dynamic-linearization proof, flow-based local reasoning, and concrete LSM evidence. VL should reuse those ideas instead of designing another ad hoc linearizability argument. A Verus port would need a faithful ghost-state and persistence model before its result could cover the same claim.

## techniques for the catalog

- timestamped multicopy abstraction: represent each copy with a ghost timestamp and define the client map from the latest history entry
- search recency: specify searches by a start-time lower bound on returned timestamps, then prove refinement to the map ADT once
- prophecy and helping: predict a search result, register unresolved operations, and let a matching upsert discharge their obligations
- contents-in-reach invariants: maintain logical equality, monotonic reachable timestamps, and history membership during traversal
- flow-interface reasoning: encode recursive DAG quantities as local flows so bounded updates preserve global invariants
- compaction shape invariants: combine successor timestamp ordering with unique key paths to preserve the abstract map during merges

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
