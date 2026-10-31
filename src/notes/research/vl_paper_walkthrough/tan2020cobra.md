# Cobra: Making Transactional Key-Value Stores Verifiably Serializable
(authored by agents unless marked 🧑)
Tag: `tan2020cobra`, [paper](https://www.usenix.org/conference/osdi20/presentation/tan)

## scope and trust model
Cobra checks serializability of an unmodified, black-box transactional key-value store using only client requests and responses. Collectors record histories, and an off-critical-path verifier searches for an acyclic serialization graph. The database is untrusted; clients, collectors, and verifier share a trust domain (section 1, p. 64). The system combines “black-box checking” and serializability while scaling to online workloads (abstract, p. 63). The paper reports 10× lower verification cost than baselines and a sustained 2,000 transactions/second on supported workloads, equivalent to roughly 170M/day (abstract, p. 63).

The authors state the central result as follows: “Cobra imposes modest overhead on clients, improves over baselines by 10× in verification cost, and (unlike the baselines) supports continuous verification” (abstract, p. 63). They also identify the core limit: “the underlying search problem is computationally expensive” (abstract, p. 63).

The paper describes the architecture plainly: “The database is untrusted while the clients, collectors, and verifier are all in the same trust domain” (section 1, p. 64).

## technique 1: graph encoding with write chains
Use this when history has read-modify-write (RMW) transactions and the naive polygraph has too many possible write orders.

Steps from sections 2.2, 3.1–3.2, and 4.2:
1. Give every write a unique version using Cobra's client library; each read then identifies the write it observed (section 2.2, p. 65). Construct the known graph with read-from and session-order edges (Figure 3, p. 67; section 4.2, p. 70).
2. Initialize each write as a one-element chain. For every RMW transaction and its prior-write transaction, concatenate their chains. A chain therefore represents consecutive writes whose order is forced.
3. For each pair of chains for a key, create a generalized constraint choosing one whole chain order or the reverse. Edges point from reads of one chain's tail to the other chain's head; if there are no such reads, use tail-to-head edges directly (section 3.2, p. 68).
4. For a non-RMW read from transaction `u`, add an anti-dependency to `u`'s successor in its write chain, if one exists; otherwise the reader could be placed after a later write and still claim the older value (section 3.1, p. 68).

Evidence: The authors state that Appendix B of the separately linked extended version proves that an acyclic graph compatible with its constraints exists if and only if the history is serializable (section 3, p. 67). The authors describe their RMW-only TPC-C case as all history coalescing into one correctly ordered chain, eliminating constraints (section 6.1, p. 72).

Inference: In Verus, represent transactions and graph edges as finite maps/sets and prove that each transformation preserves the serializability predicate. The graph solver remains an external trusted component unless its certificate is checked by Verus. Unique write IDs and collectors are part of the trusted input boundary.

## technique 2: coalescing and reachability pruning
When many reads observe the same write, coalesce their choices. For each pair of write chains, combine the reads from each tail write into one generalized pair of edge sets. Omit a direct tail-to-head edge when a read-from edge followed by a reader-to-head edge already implies it (section 3.2, p. 68). Then compute transitive closure of the known graph, using Boolean matrix multiplication on GPUs. For each constraint, if one edge would create a cycle, discard that side, add the other side's edges to the known graph, and remove the constraint; repeat pruning (section 3.3, p. 68).

The final search creates Boolean `E(i,j)` variables for every transaction pair, fixes known edges true, encodes each pair-of-edge-sets as an exclusive choice, and asks MonoSAT to enforce acyclicity (section 3.4, pp. 68–69). MonoSAT is selected because it directly supports graph properties such as acyclicity.

Inference: A Verus checker could validate a solver-produced graph certificate by checking every edge, constraint, and acyclicity proof, but the paper does not provide such a certificate checker. GPU closure, MonoSAT, and the history parser therefore remain trusted for a product deployment.

## technique 3: rounds, fences, and safe garbage collection
Use rounds to bound an ever-growing online history. Clients issue periodic fence transactions that read and write a dedicated `EPOCH` key. Cobra chains fences using RMW edges, assigns epoch numbers, and records session order. The guarantee is that every transaction with epoch at most `epochagree−2` has a known-graph path to every transaction with epoch at least `epochagree` (section 4.2, pp. 69–70).

Steps:
1. Preserve session order, or enforce it with a per-session RMW key if the database does not provide it (section 4.2, p. 70). Insert fence transactions periodically; the scaling experiments use every 20 normal transactions in all benchmarks (section 6.2, pp. 73–74).
2. Chain fences by their RMW relation and number their positions. Between fences numbered `i` and `j`, assign each normal transaction epoch `j−1`. Compute `epochagree`, the largest epoch seen or surpassed by every session (section 4.2, p. 70).
3. Define the frontier as latest writes in epochs at most `epochagree−2`. A transaction is superseded only if it is outside the frontier, old enough, and every transaction with a known-graph path to it is also old enough (section 4.3, p. 70).
4. Clone the known graph and add all edges from both sides of every unresolved constraint. Delete a superseded transaction only if it belongs to no cycle in this augmented graph, or every cycle it belongs to consists only of superseded transactions (section 4.3, p. 70).

Evidence: Deleting a merely superseded transaction can hide a future cycle; the paper's T1–T8 example shows this failure when T3 is deleted (section 4.3, p. 70). Cobra therefore uses the conservative cycle test. Blind writes can prevent collection and exhaust GPU memory (section 6.2, p. 74).

Inference: A verified Rust service could adapt the epoch and retention proof, but bounded memory would also require workload conditions that permit collection. For strict serializability checking, Cobra separately assumes collector clock differences stay within a configurable threshold, 100 ms by default; exceeding it can falsely reject a serializable history (section 3.5, p. 69).

## techniques for the catalog
- chain-based serializability encoding — combine RMW writes into chains and encode only feasible chain orders
- constraint coalescing and pruning — merge same-write reads and eliminate choices that reach known cycles
- solver-backed acyclicity — encode graph edges as Boolean variables and solve generalized constraints with MonoSAT
- epoch garbage collection — fence sessions, prove old-to-new ordering, and delete only transactions outside future-relevant cycles
