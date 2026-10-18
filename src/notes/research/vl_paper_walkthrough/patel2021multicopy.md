# Verifying Concurrent Multicopy Search Structures
(authored by agents unless marked 🧑)
Tag: `patel2021multicopy`, [paper](http://arxiv.org/abs/2109.05631v1)

This paper gives a reusable Iris/Coq framework for proving linearizability of concurrent data structures that retain several copies of a key, such as LSM trees. Its key move is to separate a client map specification from a template specification about search recency, then connect them once with history ghost state, prophecy variables, and helping. The authors state: “By introducing this intermediate abstraction level ("Template Level" in the figure) at which we can verify concurrent multicopy structure template algorithms, we aid proof reuse in two ways.” (Section 1, p. 2)

## technique: specify multicopy behavior with timestamps and search recency

What it is. Model the structure as a DAG of nodes. Each node stores `(key, (value, timestamp))`; timestamps are ghost data that order copies. The client abstraction `M` maps each key to the value at its largest timestamp. The desired client-level operations are atomic: upsert changes `M[k]`, while search returns `M[k]` (equations (1)–(2), Section 3.2, pp. 6–7). The paper explains why this is needed: “Since copies of a single key 𝑘 can be present in different nodes simultaneously, we need a mechanism to differentiate between these copies.” (Section 3.1, p. 5)

The reusable template property is search recency: a search returns the value current when it started or a copy upserted during its execution (Section 3.3, p. 7). The template-level upsert advances a global clock and adds `(k,(v,t))` to history `H` (equation (3)); search returns a history copy whose timestamp is no earlier than its start timestamp (equation (4), Section 3.3, pp. 7–8).

How to apply it.
1. Add a fresh timestamp to every upserted node entry and maintain `HInit`, `HUnique`, and `HClock` over the history (Section 3.3, p. 7).
2. Define the latest history copy `H̄(k)` and the logical map from it; require that every physical node copy belongs to `H` (Section 3.3, p. 7).
3. Give upsert the atomic triple that increments the clock and extends `H`; give search the recency triple with a start timestamp witness (equations (3)–(4), pp. 7–8).
4. Prove once that any execution satisfying these template triples refines the client map triples (Section 4, pp. 8–13). The payoff, in the paper's words: “When proving the validity of the template-level atomic triple of search for a particular implementation (or template), one can now always commit the atomic triple (i.e., declare a linearization point) at the point when the return value 𝑣 of the search is determined, i.e., when (𝑘, (𝑣, 𝑡 ′)) ∈ 𝐻 is established.” (Section 3.3, p. 8)

Verus form. Inference: represent `H` and the timestamp order as ghost state in a Verus state-machine or proof-oriented API. A `spec fn` can define the latest entry and logical map; `requires` and `ensures` express the atomic upsert/search contract. Verus has no direct Iris atomic-triple connective, so a Verus implementation would need a verified concurrent protocol whose transition relation exposes a linearization event. Timestamps and monotonicity remain useful ghost fields. This is an inference because the paper uses Iris, not Verus.

Evidence and assumptions. The refinement is mechanically checked in Coq/Iris (Section 8, p. 24). The paper considers lock-based templates and says: “As we consider lock-based templates, we can assume a sequentially consistent memory model for our verification.” (Section 9, p. 27). The instantiation supplies the node-level predicate `node` and helper-function specifications (Section 6.2, pp. 18–19). Timestamps are ghost data: “Implementations do not need to explicitly store this timestamp information.” (Section 3.1, p. 6)

## technique: use prophecy variables and helping for dynamic linearization points

What it is. A search's linearization point may be an upsert executed by another thread, and cannot be fixed in the search code. The proof wraps search with two one-shot prophecies: one predicts the returned value and one gives a fresh thread identifier (Fig. 4, Section 4.1, p. 9). The prophecy resource is transferred through the shared representation predicate. The paper states: “Iris prophecies, based on the idea first introduced by Abadi and Lamport [1988], allow a thread to predict what will happen in the future.” (Section 4.1, p. 9)

How to apply it.
1. At search entry, call `NewProph` twice, binding one prophecy to a thread id and one to the eventual value (Fig. 4, p. 9).
2. Keep the exclusive `Proph(p,vp)` resource in the thread or transfer it through the shared predicate; resolve it after the concrete search returns, proving `vp = v` (Section 4.1, p. 9).
3. If the predicted value equals the logical value at search start, commit the client atomic triple immediately.
4. Otherwise register the thread's pending atomic triple in shared ghost state. An upsert that inserts the matching `(k,(v,t'))` scans registered searches and discharges their obligations. This is the helping protocol described in Section 4.1, pp. 9–10.
5. Register each helped search by its thread id in a shared registry. Each registered thread has a state that is either `Pending` (holds the atomic update token and a fact that no copy of the predicted value is at or after the start timestamp) or `Done` (holds the receipt or the exclusive token `Tok`, plus a history entry with timestamp at least `t0`). When the search obtains such a history entry, it trades `Tok` for the receipt that completes its atomic triple (Section 4.3, Figs. 5–6, pp. 11–13; Appendix A.4).

Verus form. Inference: model each pending search as an entry in a ghost state machine, with a unique token represented by an exclusive ghost resource. A transition for upsert can mark matching searches done; a search transition resolves its predicted result and consumes its entry. Verus state-machine transitions and `invariant`s can encode uniqueness and monotone history, but prophecy prediction itself is not a standard executable Verus feature. A practical Verus design would instead expose a linearization witness or use an explicit history/refinement proof. This limitation is an inference.

Evidence and limits. The helping proof is mechanized in Iris, including unboundedly many registered searches. It depends on higher-order ghost state, exclusive prophecy resources, and the atomic-triple semantics (Section 4.1, p. 9). The paper proves linearizability. For progress it only assumes: “we assume that a separate maintenance thread flushes the root if it is full to ensure that upserts eventually make progress.” (footnote 3, Section 5, p. 14). Inference: the paper gives no progress proof.

## technique: prove a generic search template with three monotonicity invariants

What it is. The LSM DAG template traverses one locked node at a time. `traverse` checks `inContents`; if absent it follows the unique edge selected by `findNext`; `upsert` locks the root, calls `addContents`, and retries if the root is full (Fig. 7, Section 5, pp. 13–14). The proof uses contents-in-reach, a recursive function giving the first copy encountered for each key.

How to apply it.
1. Define `C_ir(n)` recursively over node contents and disjoint edge sets (equation (5), Section 6.1, p. 15).
2. Maintain Invariant 1, `H̄ = C_ir(r)`, linking logical history to the root's reachable contents.
3. Maintain Invariant 2: each node's reachable timestamp for a key only increases over time under upsert and maintenance.
4. Maintain Invariant 3: every physical copy `C_n` is contained in `H`.
5. Give each recursive `traverse(r,n,k)` call the local precondition `ts(C_ir(n)(k)) ≥ t0`, where `t0` is the timestamp at search start. If a node contains the key, Invariants 2–3 establish recency and history membership; if not, edge semantics preserve the precondition for the recursive successor call (Section 6.1, pp. 15–16).
6. Linearize upsert when the root lock is released after a successful insertion, update `H`, and use Invariant 4 (all history timestamps are below the current clock) to show the latest copy remains the logical one (Section 6.1, p. 16).

Verus form. Inference: encode the graph, timestamp map, and `C_ir` as specifications; carry the traversal precondition as a recursive function contract. Rust recursion or an explicit stack needs a `decreases` measure based on DAG height. A concurrent Verus proof would need a state-machine transition for root insertion and lock ownership. The three invariants should be facts in the state-machine invariant, while node helper contracts can be ordinary `requires`/`ensures` functions. This is a translation proposal, not a claim about the paper's code.

Evidence and assumptions. The proof is generic over node-level data structures and requires a DAG with pairwise-disjoint outgoing edgesets (Section 3.1, p. 6), a lock-based setting where sequential consistency is assumed (Section 9, p. 27), and helper-function contracts (Fig. 8, p. 19). The paper abstracts from storage media and does not model disk failure (Section 9, p. 26).

## technique: use flow interfaces for local reasoning about recursive DAG state

What it is. The recursive `C_ir` function can change globally when one edge changes. The paper uses the flow framework: a flow is a function from nodes to a commutative cancellative monoid that satisfies the flow equation `fl(n) = in(n) + sum of e(n',n)(fl(n'))`. Preserving a region's inflow/outflow interface guarantees that flows outside the region are unchanged (Section 6.2, pp. 16–17). The paper explains: “If the interface of a modified region is preserved, then the framework guarantees that the flow of the rest of the graph is unchanged.” (Section 6.2, p. 17)

How to apply it.
1. Choose a flow domain and define node inflow and edge propagation so the flow equation computes the desired reachability quantity (Section 6.2, p. 17).
2. Store auxiliary ghost functions `Q_n` per node to turn bottom-up contents-in-reach into a forward flow (Section 6.2, pp. 17–18).
3. For an update, prove only that the modified region preserves its flow interface; the framework supplies unchanged flow values elsewhere.
4. Add a second multiset-key flow for insets. Use local predicates to enforce that reachable keys belong to a node's inset (Invariant 6) and that predecessor insets are disjoint (Invariant 7, Section 7.2, pp. 22–23).

Verus form. Inference: represent the flow equation as a `spec fn` over finite graph maps and prove interface-preservation lemmas for each edge update. Ghost maps can be fields of a Verus state machine. Since Verus's automatic solver may not discover arbitrary graph fixpoints, explicit induction over a bounded representation or a proved flow abstraction is required. This is an inference.

Evidence and limits. The Iris flow library and invariants are mechanically checked (Section 8, p. 24). Inference: each graph update still needs its own interface-preservation argument; the framework does not remove that proof obligation. The paper notes that the flow equation computes forward, so the bottom-up `C_ir` needed the auxiliary `Q_n` trick (Section 6.2, p. 17).

## technique: verify maintenance compaction while preserving the abstract map

What it is. The `compact` template moves recent copies from a node to its successor, creating a node when needed. Its atomic specification leaves `(t,H)` unchanged (Section 7.2, p. 20). The proof adds Invariant 5: a node's timestamp is no smaller than the reachable timestamp of its successor. For DAGs, it also uses unique key-specific search paths, encoded by inset-flow Invariants 6–7 (Section 7.2, pp. 21–23).

How to apply it.
1. Specify `chooseNext`, `allocNode`, `insertNode`, and `mergeContents` with separation-logic triples (Fig. 10, Section 7.2, p. 21).
2. For each merge, move the copies of a chosen key set `K` from `n` to its successor `m`, replacing older copies in `m`; `mergeLeft` removes the moved keys from `n` and `mergeRight` writes them into `m` (Section 7.2, p. 20).
3. Prove the auxiliary timestamp and inset invariants before releasing locks; the final lock release is the compact linearization point (Section 7.2, p. 21).
4. Reject DAG shapes that permit two incoming paths carrying the same key to interfere; enforce this with disjoint inset flow (Invariant 7, pp. 22–23).

Verus form. Inference: make compaction a state-machine transition over node maps and prove that the logical latest-timestamp map is unchanged. A lock-protected `compact` function can call verified merge helpers; its invariant must include successor timestamp ordering and unique key paths. Crash persistence and file semantics require separate specifications.

Evidence and limits. The paper gives an execution on a DAG in which a timestamp in the contents-in-reach of `n` decreases, “which violates Invariant 2” and the specification of `compact` (Fig. 11, Section 7.2, pp. 21–22). Inference: the shape invariant is therefore needed, not cosmetic.

## mechanized evidence, trusted parts, and VL relevance

The artifact verifies the client/template refinement and templates in Iris/Coq, and verifies an LSM implementation in GRASShopper. Table 1 reports 75 lines of template code, 9,620 proof-annotation lines, 9,695 total, and 535 seconds; the implementation side reports 398 code lines, 686 proof lines, 1,084 total, and 62 seconds (Table 1, p. 23). The measured setup is an Intel Core i7-8750H laptop with 16 GB RAM (Section 8, p. 24). The authors explicitly identify two end-to-end gaps: “First, there is currently no way to formally compose the proofs done in Iris/Coq and GRASShopper.” Their second gap is that they model each file as a RAM disk because GRASShopper cannot reason about file access directly (Section 8, p. 24).

The result proves linearizability of the abstract templates and an LSM instantiation under the stated helper contracts. Inference: trusted parts include Iris, Coq, GRASShopper, the unverified bridge between their specifications, the lock and memory semantics, and the RAM-disk abstraction. The paper does not cover crash consistency or weak-memory lock-free implementations; the related-work section says: “Notably, in our verified LSM tree implementation, we do not model disk failure and hence do not address crash consistency.” (Section 9, p. 26). Lock-free multicopy structures such as the Bw-tree are left open: “For lock-free multicopy structures such as the Bw-tree [Levandoski et al. 2013], weak memory consistency may be a concern.” (Section 9, p. 27). Inference: for concurrent storage code, a project would need an explicit history, shape, and persistence model before a comparable claim could be made. The authors claim the abstraction enables proof reuse (Section 1, p. 2), but the cross-tool gap and unmodeled I/O stay open.

Inference: the paper supplies a template methodology, a dynamic-linearization proof, flow-based local reasoning, and one concrete LSM instantiation, so VL could reuse these ideas instead of designing another ad hoc linearizability argument. A Verus port would need a faithful ghost-state and persistence model before its result could cover the same claim.

## techniques for the catalog

- timestamped multicopy abstraction: represent each copy with a ghost timestamp and define the client map from the latest history entry
- search recency: specify searches by a start-time lower bound on returned timestamps, then prove refinement to the map ADT once
- prophecy and helping: predict a search result, register unresolved operations, and let a matching upsert discharge their obligations
- contents-in-reach invariants: maintain logical equality, monotonic reachable timestamps, and history membership during traversal
- flow-interface reasoning: encode recursive DAG quantities as local flows so bounded updates preserve global invariants
- compaction shape invariants: combine successor timestamp ordering with unique key paths to preserve the abstract map during merges

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Proving that disjoint outgoing edgesets imply unique search paths involves global inductive reasoning about the paths in the multicopy structure."): read the full text (main body, Appendix A, skimmed the reference list); checked every quotation, equation/figure/section/page reference, the Table 1 numbers, the laptop setup, and each technique step against the paper; changed several page and section references (Fig. 7 and footnote 3 are on p. 14, Fig. 10 and Table 1 are on pp. 21 and 23, the inset invariants are in Section 7.2, helping protocol is Section 4.3), corrected the mergeLeft/mergeRight description, replaced two bracket-edited quotes with exact ones, expanded the search-recency commit quote, and marked own conclusions as "Inference:"; did not check the Iris/Coq or GRASShopper artifacts, the cited prior work, or the Verus-form translations (these are Inference and not claims of the paper); tag and arXiv link kept (the link matches arXiv:2109.05631v1 in the paper header).
