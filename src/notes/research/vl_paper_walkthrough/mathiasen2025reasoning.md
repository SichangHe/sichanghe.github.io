# Reasoning about Weak Isolation Levels in Separation Logic
(authored by agents unless marked 🧑)
Tag: `mathiasen2025reasoning`, [paper](https://doi.org/10.1145/3747515)

## relation to existing notes and result

This study covers operation specifications, client proofs, specification implications, and the verified MVCC implementation. Inference: The proposed Verus adaptations below require separate implementation and verification.

The paper's abstract states: “In this paper, we formalize three weak isolation levels in separation logic, namely read uncommitted, read committed, and snapshot isolation.” (Abstract, PDF p. 1.) It also states: “To show that our specifications are realizable, we formally verify that an executable implementation of a key-value database running the multi-version concurrency control algorithm from the original snapshot isolation paper satisfies our specification of snapshot isolation.” (Abstract, PDF p. 1.) The abstract states: “All results are mechanized in the Rocq proof assistant on top of the Iris separation logic framework.” (PDF p. 1.) The implementation is an in-memory single-node key-value store written in OCaml and transpiled to AnerisLang; the verification has more than 5,000 lines of Rocq proof code (Section 1, PDF pp. 3–4).

Inference: The paper is not about Rust or Verus. Its resource and invariant patterns can guide a Verus design, but no Verus syntax or soundness result follows from it.

## technique 1: make isolation specifications modular per operation

Use this when clients and implementations must be verified independently. Define contracts for `init_client`, `init_srv`, `start`, `read`, `write`, and `commit` using local and global points-to resources. A local resource records a transaction's view of a key; a global resource records the key-value store state. The complete specification initializes these resources and exposes all operation contracts (Section 2.1, PDF pp. 6–9).

For read uncommitted, `write` immediately adds a value to global state, so another transaction may read it before commit; `read` may return `None` or a value in the global set, while a prior same-transaction write takes precedence (Figure 3 and Section 2.1, PDF pp. 6–8). `commit` collects local resources because writes already propagated. For read committed, `write` changes only local state and `commit` adds updates globally on success; failed commits leave global state unchanged (Section 3, PDF pp. 11–12). For snapshot isolation, global points-to resources are histories, `start` snapshots them into local resources, and `commit` checks write conflicts against the current histories (Section 5, PDF pp. 15–18).

Evidence. The client examples exclude dirty reads, mutual observation of concurrent uncommitted writes, read skew, and non-repeatable reads. The write-skew example instead proves that both transactions commit despite a possible nonserializable execution: “Note that even the execution in which both transactions share the same snapshot, in form of the initial snapshot, succeeds in snapshot isolation whereas it is not allowed under serializability because serializability requires there to be an order amongst transactions.” (Section 5, PDF p. 18.) A bank-transfer example is also verified (PDF pp. 18–19). The abstract reports the implication chain: snapshot isolation implies read committed, and read committed implies read uncommitted (Abstract, PDF p. 1).

Inference: In Verus, model each operation as a Rust function with `requires` and `ensures` over ghost maps and transaction state. A Verus predicate can expose the client contract while ghost representation remains internal, but Verus does not supply Iris's separating conjunction or resource ownership automatically.

## technique 2: use observations to constrain shared invariants

A shared key-value invariant must exclude states that contradict what a client has already observed. The paper adds persistent `Seen(k,V)` resources. For read uncommitted, the exclusion property says that an observed set is a subset of the current set, and the creation property creates a `Seen` resource from the current global points-to resource (Equations (2)–(3), PDF p. 9). This prevents a value observed by a client from disappearing from the abstract state.

How to apply it: establish the global invariant, expose a points-to resource around an atomic operation, create a `Seen` fact from the global points-to resource while it is available, and use the exclusion rule to constrain future states. For snapshot isolation, use histories rather than sets: “Moreover, we see that from the exclusion property, a client is able to conclude that an observed history must be a prefix of the history representing the key-value store state.” (Section 5, Equations (8)–(9), PDF p. 18.)

Inference: In Verus, encode observations as ghost sequence prefixes and prove monotonicity lemmas whenever a mutating operation appends history. This is a translation of the paper's logical role; Verus ownership and aliasing rules are different from Aneris resources.

## technique 3: prove client phenomena with invariants

The paper uses concise bad-history examples as clients. For read uncommitted, the read-uncommitted-data example asserts that a reader sees either no value or a value written by another transaction, even though the writer loops forever without committing (Figure 1, PDF p. 5). The proof initializes `RU.x ↦ ∅`, creates a persistent invariant `∃V, x↦V * (V=∅ ∨ V={1})`, proves each transaction separately, and opens the invariant around atomic operations (Section 2.2, PDF pp. 9–10). The authors write: “In other words, by proving a specification for the example, we show that the property expressed in the assert statement holds for any interleaving.” (Section 2.2, PDF p. 9.)

For read committed, the dirty-read example proves that a reader cannot observe an uncommitted write; the commit-order example proves that two transactions cannot both observe each other's writes (Section 3, PDF pp. 12–13). For snapshot isolation, the write-skew example asserts successful commits; the read-skew and non-repeatable-read examples assert consistent reads and successful read-only commits. The bank transfer uses an invariant over two account histories and updates both balances atomically on a successful transfer (Section 5, Figures 12–15, PDF pp. 18–19).

Inference: A Verus workflow can turn each phenomenon into a small verified client and use `assert` statements as executable obligations. The paper's examples should be reused as regression specifications rather than rediscovered; the Rust encoding and proof scripts would be new work.

## technique 4: derive weaker specifications with ghost resource algebras

The implication proofs construct resources for the weaker specification from resources of the stronger one and prove the weaker operation contracts for the same implementation. For read committed implies read uncommitted, the authors define authoritative `AuthSet(V)` and fragment `FragSet(V)` resources. An authoritative set grows monotonically; a fragment records a historical set, and a rule proves the fragment is a subset of the authoritative set (Equations (6)–(7), PDF pp. 14–15). Wrapped read-uncommitted resources hide the fact that read-committed global state updates only at commit (Figure 8, PDF p. 14).

The proof assumes the read-committed specification, defines wrapped resources in terms of it, applies the read-committed operation contract, and updates the custom resource algebra by hand to obtain each read-uncommitted postcondition (Section 4, PDF pp. 13–15). The proof is approximately 800 lines of Rocq code (Section 4, PDF p. 13). The snapshot-isolation-to-read-committed proof has the same structure and is also approximately 800 lines (Section 6, PDF p. 20).

Inference: In Verus, ghost maps or monotone sequences can encode authoritative state and snapshots, with lemmas proving inclusion or prefix relations. The resource algebra and update modality are Iris-specific; they must be replaced by explicit ghost-state invariants and proof lemmas.

## technique 5: specify snapshot isolation with two snapshots and histories

The paper specifies strong snapshot isolation: “In this paper, the snapshots will be the most recent snapshots at the time they are a captured.” (Section 5, PDF p. 15; wording as printed.) It records a start snapshot and a commit snapshot. Global resources are histories of values, not sets, so the proof can compare versions between snapshots (Section 5, PDF p. 16). `start` copies each current history's last value into local resources and creates `KeyUpdStatus(c,k,false)`. `write` updates local state and marks the key as changed. `commit` receives the starting snapshot, current histories, local values, and update flags; it succeeds exactly when each changed key's current history equals its starting history; failure supplies evidence of a write conflict and leaves global state unchanged (Figure 10 and Section 5, PDF pp. 16–18).

The informal commit rule is: “A transaction is allowed to commit only if it has no write conflicts with any transaction committed between its own start snapshot and its commit snapshot.” (Section 5, PDF p. 16.) The paper's `CanCommit` condition is `∀k, mc[k]=Some(p,True) ⇒ m[k]=ms[k]` (Figure 11, PDF p. 17).

Inference: In Verus, represent histories as ghost sequences and use `old` values or explicit snapshot parameters in `requires`/`ensures`; prove that successful commits append only after the conflict predicate holds. This requires a separate Verus proof, including the guarantee that a conflict-free commit succeeds.

## technique 6: verify an MVCC implementation through client and server layers

The implementation stores each key as a list of value-timestamp pairs, guarded by a lock. A server timestamp reference generates start and commit times. The client proxy caches writes and start timestamps; reads use cached writes or ask the server for the latest value with timestamp strictly less than the start timestamp; commit checks every cached key for a later write and, on success with a nonempty cache, appends updates with a fresh timestamp (Section 7.1, PDF pp. 20–21).

Prove the client proxy and server handlers separately. The client lock protects either an inactive state or an active `(start timestamp, cache)` state (Section 7.2, PDF p. 21). The server lock owns the key-value map, timestamp, and `MemLocal(M)`; `isMap(kvs,M)` relates the concrete map to its logical representation, while persistent `Model(M,S,t)` facts constrain histories, snapshots, and time (Section 7.3, PDF pp. 23–25). Define a `Cut` predicate that splits each current history at a start timestamp; the read-handler proof shows both the returned prefix and model snapshot are cuts, so they are equal (Equations (13)–(15), PDF pp. 23–24).

Evidence. The paper says the full implementation proof is too large for the article and points to the Rocq formalization; the stated proof effort exceeds 5,000 lines (Section 7, PDF p. 20; Section 1, PDF p. 4). It abstracts unreliable UDP behind a verified RPC library (Section 7.2, PDF p. 22).

## what is proved, trusted, and already done

The paper reports mechanized client proofs, specification implications, and verification of a single-node in-memory MVCC database. It states: “We remark that we do not cover the full details of the proof, and use simplifications, as the whole proof is too large to be included in the paper.” (Section 7, PDF p. 20.) The article points to its Rocq formalization for those details. No formal equivalence to dependency-graph models is proved; Section 9 describes that connection as future work (PDF p. 27).

Scope limits are explicit. Predicate reads are not modeled (Section 1, PDF pp. 2–3). Distributed transactions and crash resilience are future work: “Further, it would be interesting to see the developed theory applied to databases that are resilient to crash failures.” (Section 9, PDF p. 27.) Appendix C also explains why serializability does not imply this snapshot-isolation specification under the paper's notion of implication (PDF p. 32).

Inference: Using these results for Rust would require new contracts, code, and proofs. The phenomenon clients, operation contracts, and two-snapshot decomposition are candidate patterns. I have not audited the logic, language semantics, translation, RPC library, or proof artifact; reading the paper does not independently establish their correctness.

## techniques for the catalog

- modular operation contracts — specify initialization, start, read, write, and commit with local/global resources independent of implementation
- observation monotonicity — use persistent seen resources to prevent observed values or histories from disappearing
- phenomenon clients — exclude dirty reads, commit-order violations, read skew, and non-repeatable reads; prove write-skew transactions commit
- specification implication — derive weaker contracts from stronger ones with authoritative and fragment ghost resources
- two-snapshot MVCC contract — compare start and commit histories and return conflict evidence on failed commits
- layered MVCC proof — verify client proxy and locked server handlers against a shared history/time model
