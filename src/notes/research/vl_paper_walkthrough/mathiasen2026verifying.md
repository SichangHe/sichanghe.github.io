# Verifying Isolation Levels of Database Implementations for Free Using Separation Logic
(authored by agents unless marked 🧑)
Tag: `mathiasen2026verifying`, [paper](https://www.semanticscholar.org/paper/3c7d25b5200cadb9765fa7e39ca7e0ccf930ee65)

## result and setting

The paper connects executable database implementations to formal isolation-level models. Its abstract says: “we derive isolation levels directly, as formalized in transactional consistency models by the database community, from the structure of separation logic specifications.” (Abstract, PDF p. 1.) The result is a free theorem: “any database implementation, whose operations are verified against a specific set of separation logic specifications, actually implements its isolation level.” (Abstract, PDF p. 1.) The paper mechanizes all proofs in Rocq on top of Iris and Aneris, with more than 13,000 lines of proof code (Section 1, PDF p. 4).

The covered levels are read uncommitted, read committed, and snapshot isolation (Section 1, PDF pp. 3–4). The implementation API has `init`, `start`, `read`, `write`, and `commit`; implementations may be local or distributed, and the only implementation assumption is that these operations satisfy the specified separation-logic contracts (Section 2, PDF p. 5). The model is a key-value store. The authors remove assumptions that writes are globally unique and that each transaction writes a key at most once, but retain the assumption that transactions read their most recent write (Section 3, PDF p. 7).

Inference: The paper does not use Rust or Verus. Its extraction and invariant pattern is transferable to Verus only as a design inference; the Rocq/Iris proof itself is not evidence about Verus soundness or syntax.

## technique 1: define a realistic executable transactional model

Use this when a high-level isolation definition has simplifying assumptions that do not match client programs. Define operations `R(id,k,ov)`, `W(id,k,v)`, and `C(id,b)`, give each a unique identifier, and define a transaction as an operation set with a total program order whose greatest element is exactly one commit (Definition 3.1, PDF p. 8). Define a state as a key-to-value map and an execution as a sequence of state/transaction pairs linked by transaction write transitions (Definition 3.2, PDF p. 9).

Then define an isolation level by a commit test over executions. For snapshot isolation, `Complete` requires every first read of a key to match the transaction's snapshot, while `NoConf` forbids a concurrent committed transaction from writing a key that the transaction writes (Definition 3.3, PDF pp. 9–10). For read committed, `Preread` requires each first read to come from an earlier state in the execution; read uncommitted uses `True` as its commit test (Definition 3.4 and Figure 5, PDF pp. 10–11). Implementation correctness means that every set of committed transactions produced by the database has a coherent execution satisfying every committed transaction's commit test (Definition 3.5, PDF p. 11).

Evidence. The write-skew example has two transactions that read initial values and write different keys. It is forbidden by serializability but permitted by snapshot isolation (Section 3, PDF pp. 8–9). The formal model explicitly contains both execution orders for that example (Figure 4, PDF p. 9).

Inference: A Verus project can represent operations and executions with ghost datatypes, predicates, and sequence histories, then state isolation as proof obligations over those ghost structures. The paper's exact Rocq definitions do not carry over automatically; the invariant and commit-test decomposition does.

## technique 2: specify operations with parametric separation-logic resources

The specification existentially quantifies resources such as connection state, global key histories, local snapshots, and per-key update status (Section 4.1, PDF pp. 11–12). A client sees only the operation contracts, so the proof may refine the hidden resources while preserving the client interface. For snapshot isolation, `start` creates local snapshot resources; `write` updates local state and marks a key as written; `commit` succeeds only if every written key still has the same current and snapshot value, expressed by `CanCommit` (Section 4.2, PDF pp. 12–14).

The paper emphasizes the abstraction boundary: “All resources in the specification are existentially quantified.” (Section 4.1, PDF p. 12.) It also says: “any client program, which is verified using spec SI, can work with any database implementation that implements the transactional library as specified in spec SI.” (Section 4.1, PDF p. 12.) This parametricity is what permits adding trace resources without changing client-visible contracts.

Inference: In Verus, the analogous boundary would use opaque or ghost predicates and trait-level contracts whose internal representation can be strengthened. Verus does not provide Iris's separating conjunction or existential resource algebra in the same form, so this is a conceptual translation, not a drop-in encoding.

## technique 3: ghost-instrument the executable API and maintain a trace invariant

Instrument each client-facing operation with ghost code. The paper's wrappers call `fresh` before the real operation and `emit` after it. For example, `Wrap(read c k)` creates a fresh identifier, executes `read c k`, and emits the identifier, connection, operation label, key, and returned value (Figure 8, PDF p. 15). The instrumentation is erasable and has no runtime effect (Section 5, PDF p. 15).

Maintain a global trace containing pre and post events. Define `ValidTrace(I,t)` to existentially quantify a linearization-point sequence, a transaction set, and an execution, then require validity, transaction validity, the isolation commit test, and coherence between all levels (Section 5.1, PDF pp. 16–17). The paper writes: “The fundamental insight that we utilize in this paper, is that a trace of pre events and post events is enough information to verify that a database implements an isolation levels.” (Section 2, PDF p. 5.)

Inference: Verus ghost state can record an event sequence and invariants can constrain every append. Ghost code must remain proof-only; a runtime wrapper would alter the implementation and invalidate the paper's no-overhead claim.

## technique 4: insert linearization points between pre and post events

Use atomic operation specifications to insert a logical linearization point between each pre and post event. The coherence predicate requires four facts: linearization order respects event overlap, every pre/post pair has one matching point, every point has a pre-event, and points are unique (Section 5.2, PDF p. 17). The paper notes that this “essentially captures the standard linearizability correctness criteria for concurrent objects” (Section 5.2, PDF p. 17).

For the write-skew trace, overlapping reads may be ordered either way, but a read cannot be placed after a write whose pre-event begins later because the read post-event precedes that write pre-event (Section 5.2, PDF p. 18). This partial-order reasoning turns concurrent executions into a sequence suitable for transaction extraction.

Inference: A Verus proof can represent linearization events as ghost sequence elements and prove uniqueness and interval ordering with `assert` and lemmas. The paper's atomic Hoare triples and Iris invariant-opening rules have no direct Verus equivalent; the required ordering facts must be encoded explicitly.

## technique 5: chop linearization points into valid transactions and executions

Group operations by connection from the linearization sequence. `CoherenceTrans` requires operations from the same connection to share the following commit, preserves program order, and forbids duplicate operations. `ValidTrans` requires at most one open transaction per connection, reads of a key to observe the most recent same-transaction write, and exactly one final commit for each transaction (Section 5.3, PDF pp. 18–19). Then choose an execution ordering the committed transactions and prove `CoherenceExec` plus the relevant commit test (Section 5.4, PDF p. 19).

The write-skew example is extracted into two transactions and then into an execution applying the first transaction followed by the second; that execution satisfies snapshot isolation (Figures 13–14, PDF p. 19). The main theorem states that for arbitrary verified clients, arbitrary execution points, and any implementation satisfying the separation-logic specification, the trace is valid and no thread is in a crash state (Theorem 5.1, PDF pp. 19–20).

Inference: This is the paper's strongest reusable architecture for VeruLaw: preserve a ghost chain from concrete events to abstract transactions to a model-level safety predicate. A Verus implementation would need explicit sequence and map invariants and cannot assume Rocq's adequacy theorem.

## technique 6: wrap hidden resources with a ghost theory

To preserve `ValidTrace` while operations append events, the authors define `ReflectI`, `PermissionLin`, and `PermissionPost` resources with laws for pre-event insertion, post-event insertion, uniqueness, and prefix ordering (Section 6, Figure 15, PDF pp. 21–23). They place `Trace(t) * ReflectI(t,t')` in an internal invariant. Law 1 derives `ValidTrace`; Law 2 grants exclusive permission to insert a linearization point after a fresh pre-event; Law 3 consumes post-event permission only when coherence holds.

For snapshot-isolation reads, define `LatestWrite(k,ov,c)` and wrap the original key resource as `Wrap(k↦c ov) ≜ k↦c ov * LatestWrite(k,ov,c)` (Section 7, PDF p. 24). The wrapped resource proves that the current transaction has a start point, preserves an open transaction, and returns either its latest own write or the value in its snapshot. Atomicity allows the proof to open the internal invariant around the read's linearization point (Section 7, PDF pp. 23–24).

Inference: In Verus, a ghost permission token and a wrapped predicate can encode ownership of a pending operation and prevent duplicate linearization identifiers. The exact Iris resource algebra is trusted machinery absent from this paper's Verus context.

## evidence, trust, and limits

All results are mechanized in Rocq, and the paper reports more than 13,000 proof lines (Section 1, PDF p. 4). The theorem assumes verified clients and an implementation satisfying the prior separation-logic specifications; it therefore proves a conditional free theorem. The Rocq kernel, Iris and Aneris soundness proofs, the operational semantics, the prior specifications, and the model definitions remain trusted foundations. The paper does not verify a production SQL engine, and its model currently exposes a key-value API; the conclusion says SQL's richer predicate operations and additional isolation levels remain future work (Section 9, PDF p. 26).

Inference: For VeruLaw, the threat is high for concurrent storage agents that rely on informal claims about isolation: this architecture can turn per-operation proofs into an all-client guarantee, but only after a substantial ghost model and specification library exists. What VL should not redo is the basic observation that trace invariants can connect separation-logic contracts to state-based isolation; it should adapt the pattern to Verus and its target API. This threat estimate is an inference, not a measured product failure rate.

## techniques for the catalog

- realistic transactional model — define identified operations, ordered transactions, executions, and commit tests after removing unrealistic simplifying assumptions
- parametric operation specifications — hide resource representations behind existential contracts so clients remain unchanged when proofs add structure
- ghost trace instrumentation — emit erasable pre and post events at every API operation and maintain a validity invariant
- linearization extraction — insert unique logical points between matching pre and post events using atomic specifications
- transaction chopping — group linearization points by connection into well-formed transactions and abstract executions
- ghost resource wrapping — combine original resources with permissions and reflection predicates to preserve cross-level coherence

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
