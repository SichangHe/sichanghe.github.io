# Checking Robustness Against Snapshot Isolation
(authored by agents unless marked 🧑)
Tag: `beillahi2019robustness`, [paper](http://arxiv.org/abs/1905.08406v2)

## purpose and result
The paper asks whether a transactional program has only serializable behaviors when run under snapshot isolation (SI). Its abstract states: “We show that this verification problem is polynomial time reducible to a state reachability problem in transactional programs over a sequentially consistent shared memory.” (Abstract, p. 1.) It also gives a Lipton-mover proof method. Robustness means that the stronger serializable semantics and SI semantics produce the same computations; under SI, a transaction reads its start snapshot and can commit when no concurrent committed transaction wrote a location it wrote.

The paper's central anomaly is write skew. Two transactions read x and y as 0, then write the other variable. The paper explains: “The execution of Write Skew under SI allows the reads of x and y to return 0 although this cannot happen under serializability.” (Section 2, p. 3.) A trace records begin/commit and memory events plus causal dependencies; a behavior is anomalous when the transitive closure called happens-before is cyclic.

## technique 1: reduce SI robustness to sequentially consistent reachability

Use this when the target is a finite-state or otherwise reachability-verifiable transactional program and SI snapshots would otherwise require unbounded history. The paper's reduction delays only one transaction, then checks whether its issue and simulated commit can be linked by a happens-before chain.

Steps from Sections 2 and 5 (pp. 3–12):

1. Represent each transaction by an issue event (local reads and writes) and a commit event. Under SI, issue and commit may be separated by other transactions (Section 2).
2. Choose an attacker process nondeterministically. It executes one transaction while deactivating its shared writes, storing each write in an auxiliary register such as `r_x`; this is the delayed transaction's issue (Section 5.1).
3. At the delayed transaction's reads, use a primed snapshot copy (`y'`) and mark the read event. Set the `HB` flag to start the dependency chain; the attacker then stops starting transactions (Section 5.1).
4. Instrument the other processes as happens-before helpers. After the attacker creates the secondary copy, a helper pledges that its transaction will read a helper-written variable, access a helper-read/written variable, or write a variable read by the delayed transaction. A missed pledge blocks that execution (Section 5.2).
5. Track each helper's latest access with `x.event` flags. Forbid a helper from writing a variable whose event flag would conflict with the delayed transaction. Stop in an error state when a helper reads the variable recorded as the delayed transaction's access, completing the cycle (Section 5.2).
6. Run sequentially consistent reachability on the instrumented program. Theorem 2 says the original program is non-robust exactly when the instrumentation reaches the error state (Section 5.3, p. 12).

The key compression is formal: “it is actually enough to delay a single transaction, i.e., a program admits an anomaly under SI iff it admits an anomaly containing a single delayed transaction.” (Section 2, p. 4.) For finite-state programs the reported complexities are PSPACE-complete with a fixed process count and EXPSPACE-complete otherwise (Corollary 1, p. 12).

Inference: In Verus, model each transaction as an operation in a `state_machine!` with shared state and an explicit ghost snapshot. Use transition invariants to relate the delayed operation's private ghost writes to the eventual shared-state commit; use `requires`, `ensures`, and `assert`/lemmas for the happens-before flags. The paper's auxiliary registers and `HB` flags become ghost state, while executable Rust keeps the database operations. Verus cannot directly execute the paper's nondeterministic attacker, so a proof would encode the instrumentation as a ghost transition system and prove that every reachable error state is impossible.

Evidence and limits: the reduction is a theorem, but the experiments instantiate fixed clients and therefore are bounded model checks. The paper explicitly cautions: “Note that since clients are of fixed size, this requires no additional assertions/invariants (it is an instance of bounded model checking).” (Section 7, p. 14.) In Table 1, reachability found Courseware and SmallBank non-robust; the other eight applications were marked robust by the CDG proof after reachability did not find a violation. For example, Auction used 70 reachability proof obligations in 0.3 s and 20 CDG obligations in 0.5 s; PlayList used 99 in 4.63 s and 236 in 7.3 s. These denominators are obligation counts, and times are seconds for the listed fixed clients, not whole applications.

## technique 2: commutativity-dependency graph and Lipton movers

Use this when a sound sufficient proof of robustness is preferable to searching for a violation. A transaction is a right mover if it can commute right across another process's event while preserving the final state; left movers commute left. The paper defines three non-mover relations: write-read (`MWR`), write-write (`MWW`), and read-write (`MRW`) (Section 6, pp. 12–14).

Steps (Section 6):

1. Build `t \ {r}` by replacing shared reads with nondeterministic reads; build `t \ {w}` by disabling shared writes. These approximate the delayed issue and commit phases.
2. Create graph vertices for every original transaction and both read-free/write-free variants. Add program-order edges for transactions from one process.
3. Add `MWR`, `MWW`, and `MRW` edges when a transaction cannot move right because of a dependency on another transaction.
4. Search for a non-mover cycle whose first vertex is the write-free `t0`, whose last edge enters the read-free `t0`, and whose intermediate transactions do not write variables written by `t0`.
5. If no such cycle exists, apply Theorem 3: the program is robust. The theorem's exact condition is “if the commutativity dependency graph of P does not contain non-mover cycles, then P is robust.” (Section 6, p. 14.)

Inference: A Verus encoding can represent each graph vertex as a ghost transaction summary and prove acyclicity with a finite rank function in a `spec fn`; use a state-machine invariant that every allowed edge increases the rank. Rust code need not change if the graph is generated from operation contracts. The abstraction is only a sufficient proof, so a failed acyclicity check does not prove a real SI bug.

The CDG experiment used Civl to identify mover relations. All applications not already disproved by reachability had no non-mover cycle, so the authors concluded robustness for those cases (Section 7). The method applies to SQL queries as well as the paper's simple reads and writes, but it assumes the SI conflict and dependency model is faithful to the database.

## proved, measured, and trusted

The paper proves the single-delayed-transaction reduction, instrumentation correctness, and the mover-cycle sufficient condition. It measures fixed-client proof obligations and seconds in Table 1, with 10 named applications and at most three processes per client. Trusted elements include the transactional semantics, Civl/Boogie and solver correctness, the chosen client abstractions, and the user's specification of what counts as a serializable behavior. The paper's complexity claims concern finite-state programs, not arbitrary Rust.

Inference: For VL, this work supplies a reusable concurrency proof pattern rather than a ready Verus library. VL should not redo the reduction theorem; the useful new engineering work is a Verus state-machine encoding and tests against real transactional APIs. The threat to agent-written verified Rust is medium: a proof can establish robustness only for the modeled SI implementation and contracts, while database internals, isolation details, and external calls remain trusted.

## techniques for the catalog

- single delayed transaction instrumentation: encode SI anomalies as sequentially consistent reachability by ghost auxiliary writes, an attacker, happens-before helpers, and an error state
- commutativity dependency graph: prove robustness when mover-derived dependency edges contain no non-mover cycle
- snapshot-isolation robustness benchmark: use fixed clients, Civl reachability, obligation counts, and CDG checks while labeling bounded absence of errors correctly
Checked 2026-10-14 against the paper by a Codex agent: audit record beillahi2019robustness; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
