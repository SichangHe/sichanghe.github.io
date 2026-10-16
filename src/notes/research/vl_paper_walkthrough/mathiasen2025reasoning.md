# Reasoning about Weak Isolation Levels in Separation Logic
(authored by agents unless marked 🧑)
Tag: `mathiasen2025reasoning`, [paper](https://www.semanticscholar.org/paper/247333bde4393391b074ae1e44b538f4f900e56d)

## relation to existing notes and result

Existing notes already record this paper's headline: modular specifications for read uncommitted, read committed, and snapshot isolation, an OCaml/Aneris MVCC store, and the implication chain. This study adds the operation-level proof recipes, ghost resources, implementation invariants, and exact evidence needed to reproduce those claims.

The paper's abstract states: “In this paper, we formalize three weak isolation levels in separation logic, namely read uncommitted, read committed, and snapshot isolation.” (Abstract, PDF p. 1.) It also states: “To show that our specifications are realizable, we formally verify that an executable implementation of a key-value database running the multi-version concurrency control algorithm from the original snapshot isolation paper satisfies our specification of snapshot isolation.” (Abstract, PDF p. 1.) All results are mechanized in Rocq on Iris. The implementation is an in-memory single-node key-value store written in OCaml and transpiled to AnerisLang; the verification has more than 5,000 lines of Rocq proof code (Section 1, PDF pp. 3–4).

Inference: The paper is not about Rust or Verus. Its resource and invariant patterns can guide a Verus design, but no Verus syntax or soundness result follows from it.

## technique 1: make isolation specifications modular per operation

Use this when clients and implementations must be verified independently. Define contracts for `init_client`, `start`, `read`, `write`, and `commit` using local and global points-to resources. A local resource records a transaction's view of a key; a global resource records the key-value store state. The complete specification initializes these resources and exposes all operation contracts (Section 2.1, PDF pp. 6–9).

For read uncommitted, `write` immediately adds a value to global state, so another transaction may read it before commit; `read` may return `None` or a value in the global set, while a prior same-transaction write takes precedence (Figure 3 and Section 2.1, PDF pp. 6–8). `commit` collects local resources because writes already propagated. For read committed, `write` changes only local state and `commit` adds updates globally on success; failed commits leave global state unchanged (Section 3, PDF pp. 11–12). For snapshot isolation, global points-to resources are histories, `start` snapshots them into local resources, and `commit` checks write conflicts against the current histories (Section 5, PDF pp. 15–18).

Evidence. The authors prove client examples that prohibit dirty reads, commit-order violations, write skew, read skew, and non-repeatable reads, and a bank-transfer example (Sections 2, 3, and 5, PDF pp. 5–20). The abstract reports the implication chain: snapshot isolation implies read committed, and read committed implies read uncommitted (Abstract, PDF p. 1).

Inference: In Verus, model each operation as a Rust function with `requires` and `ensures` over ghost maps and transaction state. A Verus predicate can expose the client contract while ghost representation remains internal, but Verus does not supply Iris's separating conjunction or resource ownership automatically.

## technique 2: use observations to constrain shared invariants

A shared key-value invariant must exclude states that contradict what a client has already observed. The paper adds persistent `Seen(k,V)` resources. For read uncommitted, the exclusion property says that an observed set is a subset of the current set, and the creation property creates a `Seen` resource from the current global points-to resource (Equations (2)–(3), PDF p. 9). This prevents a value observed by a client from disappearing from the abstract state.

How to apply it: establish the global invariant, expose a points-to resource around an atomic operation, create a `Seen` fact after a read, and use the exclusion rule to constrain future states. For snapshot isolation, use histories rather than sets; the observed history must be a prefix of the current history (Equations (8)–(9), PDF p. 18).

Inference: In Verus, encode observations as ghost sequence prefixes and prove monotonicity lemmas whenever a mutating operation appends history. This is a translation of the paper's logical role; Verus ownership and aliasing rules are different from Aneris resources.

## technique 3: prove client phenomena with invariants

The paper uses concise bad-history examples as clients. For read uncommitted, the read-uncommitted-data example asserts that a reader sees either no value or a value written by another transaction, even if that writer aborts. The proof initializes `RU.x ↦ ∅`, creates a persistent invariant `∃V, x↦V * (V=∅ ∨ V={1})`, proves each transaction separately, and opens the invariant around atomic operations (Section 2.2, PDF pp. 9–10). The authors write: “By proving a specification for the example, we show that the assert shown in Figure 1 will not fail for any interleaving.” (Section 2.2, PDF p. 9.)

For read committed, the dirty-read example proves that a reader cannot observe an uncommitted write; the commit-order example proves that two transactions cannot both observe each other's writes (Section 3, PDF pp. 12–13). For snapshot isolation, write skew, read skew, and non-repeatable-read examples exercise the commit check, and the bank transfer checks an application invariant over two account histories (Section 5, PDF pp. 18–20).

Inference: A Verus workflow can turn each phenomenon into a small verified client and use `assert` statements as executable obligations. The paper's examples should be reused as regression specifications rather than rediscovered; the Rust encoding and proof scripts would be new work.

## technique 4: derive stronger and weaker specifications with ghost resource algebras

The implication proofs construct resources for the weaker specification from resources of the stronger one while preserving the same client-facing operation contracts. For read committed implies read uncommitted, the authors define authoritative `AuthSet(V)` and fragment `FragSet(V)` resources. An authoritative set grows monotonically; a fragment records a historical set, and a rule proves the fragment is a subset of the authoritative set (Equations (6)–(7), PDF pp. 14–15). Wrapped read-uncommitted resources hide the fact that read-committed global state updates only at commit (Figure 8, PDF p. 14).

The proof assumes the read-committed specification, defines wrapped resources in terms of it, applies the read-committed operation contract, and updates the custom resource algebra by hand to obtain each read-uncommitted postcondition (Section 4, PDF pp. 13–15). The proof is approximately 800 lines of Rocq code (Section 4, PDF p. 13). The snapshot-isolation-to-read-committed proof has the same structure and is also approximately 800 lines (Section 6, PDF p. 20).

Inference: In Verus, ghost maps or monotone sequences can encode authoritative state and snapshots, with lemmas proving inclusion or prefix relations. The resource algebra and update modality are Iris-specific; they must be replaced by explicit ghost-state invariants and proof lemmas.

## technique 5: specify snapshot isolation with two snapshots and histories

Snapshot isolation records a start snapshot and a commit snapshot. Global resources are histories of values, not sets, so the proof can compare versions between snapshots (Section 5, PDF p. 16). `start` copies each current history's last value into local resources and creates `KeyUpdStatus(c,k,false)`. `write` updates local state and marks the key as changed. `commit` receives the starting snapshot, current histories, local values, and update flags; it succeeds only if each changed key's current history equals its starting history, otherwise it returns false and leaves global state unchanged (Figure 10 and Section 5, PDF pp. 16–18).

The decidable predicate is: “A transaction is allowed to commit only if it has no write conflicts with any transaction committed between its own start snapshot and its commit snapshot.” (Section 5, PDF p. 16.) The paper's `CanCommit` condition is `∀k, mc[k]=Some(p,True) ⇒ m[k]=ms[k]` (Figure 11, PDF p. 17).

Inference: In Verus, represent histories as ghost sequences and use `old` values or explicit snapshot parameters in `requires`/`ensures`; prove that successful commits append only after the conflict predicate holds. This is an inference and must use only constructs supported by the local Verus guidance.

## technique 6: verify an MVCC implementation through client and server layers

The implementation stores each key as a list of value-timestamp pairs, guarded by a lock. A server timestamp reference generates start and commit times. The client proxy caches writes and start timestamps; reads use cached writes or ask the server for the latest value with timestamp strictly less than the start timestamp; commit checks every cached key for a later write and appends updates with a fresh timestamp (Section 7.1, PDF pp. 20–21).

Prove the client proxy and server handlers separately. The client lock protects either an inactive state or an active `(start timestamp, cache)` state (Section 7.2, PDF p. 21). The server lock owns the key-value map, timestamp, ghost memory maps, and a persistent `Model(M,S,t)` fact relating concrete memory, snapshots, and time (Section 7.3, PDF pp. 23–25). Define a `Cut` predicate that splits each current history at a start timestamp; the read-handler proof shows both the returned prefix and model snapshot are cuts, so they are equal (Equations (13)–(15), PDF pp. 23–24).

Evidence. The paper says the full implementation proof is too large for the article and points to the Rocq formalization; the stated proof effort exceeds 5,000 lines (Section 7, PDF p. 20; Section 1, PDF p. 4). It abstracts unreliable UDP behind a verified RPC library (Section 7.2, PDF p. 22).

Inference: For VeruLaw, this layered proof is a direct architecture for a Rust storage agent: protect concrete state with a lock invariant, relate it to ghost histories, and prove proxy and server operations against the same abstract contracts. Crash recovery, replication, and SQL predicate reads remain outside this paper.

## what is proved, trusted, and already done

The mechanized claims are conditional on the Rocq/Iris logic, Aneris semantics, OCaml-to-AnerisLang translation, RPC library, operation contracts, and mathematical isolation definitions. The verified database is a single-node in-memory MVCC implementation; the paper explicitly does not establish replication, durable storage, or crash recovery. The implication proofs show that verified specifications entail weaker specifications, not that arbitrary code is correct without satisfying the strongest contract.

Inference: The threat to agent-written verified Rust is high for weakly consistent concurrent components because informal tests cannot establish absence of bad histories. VL should reuse the paper's phenomenon clients, operation contracts, and two-snapshot MVCC decomposition instead of recreating them. The Verus adaptation remains engineering work, and this paper supplies no product-level failure rate.

## techniques for the catalog

- modular operation contracts — specify init, start, read, write, and commit with local/global resources independent of implementation
- observation monotonicity — use persistent seen resources to prevent observed values or histories from disappearing
- phenomenon clients — prove concise dirty-read, commit-order, write-skew, read-skew, and non-repeatable-read assertions
- specification implication — derive weaker contracts from stronger ones with authoritative and fragment ghost resources
- two-snapshot MVCC contract — compare start and commit histories and return conflict evidence on failed commits
- layered MVCC proof — verify client proxy and locked server handlers against a shared history/time model

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
