# Pushing the Limit: Verified Performance-Optimal Causally-Consistent Database Transactions
(authored by agents unless marked 🧑)
Tag: `ghasemirad2025pushing`, [paper](https://doi.org/10.1007/978-3-031-90660-2_3)

## scope and result

The paper designs Eiger-PORT+, a distributed transaction protocol that provides transactional causal consistency with convergence (TCCv) while keeping performance-optimal read-only transactions (PORTs). It refutes the conjecture that transactional writes make TCC the strongest possible isolation level. The authors state, “We also deductively verify that Eiger-PORT+ satisfies this isolation level by refining an abstract model of transactions.” (Abstract, p. 43) The proof is in Isabelle/HOL and covers all protocol executions at the model level; a separate Java implementation is evaluated experimentally.

The protocol model is an interleaved labeled transition system (LTS) for clients and per-key servers. Correctness is proved by (1) reducing executions to a model in which commit timestamps never arrive out of order and then (2) refining that restricted model to an abstract TCCv transaction LTS. The paper reports “10.3k lines of Isabelle/HOL code, composed of 0.7 kLoC for the model and 9.6 kLoC for the proof, which required 108 invariants.” (Conclusion, p. 59)

## technique 1: model a concurrent protocol as an LTS with an abstract transaction model

What it is. An LTS has states, initial states, and labeled event transitions. Eiger-PORT+ states contain client/server control states plus history variables. The abstract model is a centralized multi-version key-value store with client views, transaction IDs, reader sets, write-read dependencies (WRK), and session order (SO) (Sections 2.2–2.3, pp. 46–47).

When to use it. Use this abstraction for a distributed protocol whose implementation details obscure the isolation property. The concrete protocol can be asynchronous and partitioned; the abstract model states the transaction-level property to be preserved.

How the paper does it.
1. Define concrete client states (`Idle`, read in progress, write prepare, write commit) and server version states (`No_Ver`, `Reg`, `Prep`, `Commit`) as Isabelle datatypes (Section 4.1, pp. 51–52).
2. Define each event by guards and state updates. Client/server events interleave, while direct access to local configurations abstracts message exchange (Section 4.1, p. 51).
3. Define the abstract TCCv commit and view-extension events, including read-your-writes, last-write-wins, well-formed views, and causal closure under SO ∪ WRK (Section 2.3, pp. 47–48).
4. Choose event mapping π: read-done and write-commit refine abstract commit, read-invoke refines view extension, and all other events refine `skip` (Section 4.3, p. 54).

Verus form. Inference: encode concrete protocol state as a Verus state machine with transition proof functions and a ghost abstract state. Each transition gets `requires` guards and `ensures` relating concrete and abstract states. Inference: Verus does not inherit Isabelle datatypes or HOL sets; define Rust enums/structs and ghost `Set`/`Map` views, then prove the same event correspondence. Inference: abstracting communication as direct ghost-state access is sound only if a later refinement connects it to message passing.

Evidence. The paper's target is the reachable-state inclusion “rEPP (reach EPP) ⊆ reach ITCCv.” (Section 4.2, p. 54) It defines the abstract model and protocol model explicitly and proves all events against the abstraction. The model is general over values and unbounded executions; model checking is discussed as requiring bounds, whereas this deductive proof does not (Related Work, pp. 58–59).

Limits. The protocol model assumes sequential transaction execution per client, one server per key, and direct component access. The Java implementation is not connected to the proof; the authors list verifying the implementation as future work (Conclusion, p. 59).

## technique 2: use history variables to reconstruct abstract state

What it is. The concrete protocol stores local server/client state, but the abstract model needs globally ordered versions and client views. Three ghost history variables record read timestamps, write commit timestamps, and per-key commit order. Functions `kvs_of` and `views_of` reconstruct the abstract KVS and views from these histories (Section 4.3, pp. 54–56).

When to use it. Use history variables when the abstract state is not a direct projection of the implementation state, especially when local events must be assembled into a global transaction history.

How the paper does it.
1. Add `rtxn_rts`, `wtxn_cts`, and `cts_order` to the global configuration; update them at read and write commit events (Section 4.3, p. 55).
2. Insert each committed transaction into `cts_order` by commit timestamp, rather than execution order (Figure 5, p. 53; Section 4.3, p. 55).
3. Define `kvs_of` by mapping each ordered transaction to its server version value and reader set (Section 4.3, p. 55).
4. Define `get_view` as transactions with commit timestamp ≤ the client's global safe time, plus the client's own writes; map those IDs through `cts_order` to abstract version-list indices (Section 4.3, p. 56).

Verus form. Inference: keep history as ghost maps/lists updated in transition proofs. Prove that the history list is sorted, contains distinct committed transactions, and agrees with concrete server states. Inference: because Verus ghost state is erased, this is suitable for executable Rust, but every abstraction relation must be stated in contracts; a ghost map alone does not verify storage or networking.

Evidence. The paper says, “The variable cts_order maps each key to a list of client-committed write-only transactions, ordered by their commit timestamps.” (Section 4.3, p. 55) The reconstruction supports the refinement theorem and is used in the guard and update proofs.

## technique 3: eliminate inverted commits with reduction and event commutation

What it is. Concrete commits can execute in an order different from their timestamps. The abstract model only appends versions, so a direct refinement fails when a later execution inserts an earlier-timestamp version. The authors define a restricted model ĔPP that forbids such inverted commits and prove it has exactly the same reachable states as EPP.

How the paper does it.
1. Add a guard requiring a committing transaction's timestamp to exceed every timestamp already in `cts_order`; the restricted event therefore appends (Section 4.4, p. 55).
2. For any execution with inverted commits, identify events of the two transactions that are pairwise causally independent (Section 4.4, p. 56).
3. Prove adjacent independent events commute while preserving the final state (Section 4.4, p. 56).
4. Use a measure on executions to show repeated commuting terminates in an execution with no inverted commits (Section 4.4, p. 56).
5. Conclude `reach EPP = reach ĔPP` and refine only the restricted model (Section 4.4, pp. 55–56).

Verus form. Inference: represent an execution as a ghost sequence and prove a swap lemma for independent transitions. Use a natural-valued measure as a termination variant. Inference: this is a proof-level reduction; it does not reorder runtime events. The concrete Rust implementation still needs a separate proof that each event satisfies the modeled independence conditions.

Evidence. The paper states, “To address this problem, we introduce an extra proof step to reorder the inverted commits before the refinement.” (Section 4.2, p. 54) Lemma 1 gives the reachable-state equality, with the proof using independence, commutation, and termination (Section 4.4, p. 56).

## technique 4: prove refinement by guard strengthening, update correspondence, and invariants

What it is. For every restricted concrete event, prove its abstract event's guard and show that the mapped post-state equals the abstract update. The authors organize the proof around 108 invariants.

How the paper does it.
1. For events refining `skip`, prove the mapped state is unchanged; for read invoke and commit events, prove the corresponding abstract event is enabled (Section 4.4, p. 56).
2. Prove view atomicity, last-write-wins, read-your-writes, monotonic reads, and causal closure under SO ∪ WRK (Section 4.4, p. 56).
3. Maintain timestamp ordering `gst < lst_map < lst < svr_clock` for each client/server pair (Section 4.4, p. 57).
4. Maintain freshness of transaction IDs, valid protocol control states, sorted and distinct `cts_order`, and well-formed views (Section 4.4, pp. 56–57).
5. Conclude `rEPP(reach ĔPP) ⊆ reach ITCCv`, then combine with the reduction equality to obtain TCCv correctness (Section 4.4, pp. 55–56).

Verus form. Inference: each invariant becomes a state-machine invariant or a reusable proof function. Use `requires` for event guards, `ensures` for state correspondence, and explicit lemmas for map/list sorting and timestamp transitivity. Inference: Verus can encode the shape of this refinement, but the database and network implementation require additional contracts that this paper does not supply.

Evidence and measurements. The correctness theorem is a deductive proof over the protocol model; no bounded number of clients, transactions, or executions is used. The implementation evaluation uses about 12 kLoC of Java per protocol, 32 threads per client, one million keys, 90% reads, Zipf skew 0.8, eight servers and eight clients, and five 60-second trials (Section 5, p. 57). Eiger-PORT+ reports up to 1.8× throughput over Eiger-PORT and 2.5× over Eiger, with similar latency (Section 5, pp. 57–58). These denominators are the compared protocol and deployment settings; the paper does not claim a universal speedup.

## what is proved, trusted, and relevant to VL

Proved: Eiger-PORT+'s LTS refines the abstract TCCv model for arbitrary reachable executions, after reduction. Measured: the separate Java implementation's throughput and latency under the stated CloudLab workload. Trusted or outside scope: Isabelle/HOL, its libraries and proof kernel; the abstract transaction model; the correctness of the Java implementation, network stack, storage, and hardware; and the relation between implementation and verified model. The paper itself says implementation verification and a connection to the protocol proof are future work (Conclusion, p. 59).

Existing work already verifies simpler transaction protocols by model checking or textbook deductive proofs; this paper's novelty is a complex causally consistent protocol with refinement plus reduction. VL should reuse the proof architecture when an agent writes concurrent Rust: define a small abstract state machine, maintain ghost history, reduce inconvenient executions, and prove transition correspondence. Inference: the product threat is high for claims about database isolation if VL verifies only an abstract model; it is lower for a Rust protocol whose implementation, storage, and message layer are separately connected by refinement proofs.

## techniques for the catalog

- abstract transaction LTS: model concrete protocol events and prove reachable states satisfy an abstract isolation machine
- ghost history reconstruction: record timestamps and commit order, then reconstruct abstract versions and client views
- reduction by commutation: reorder causally independent events to eliminate inverted commits before refinement
- refinement obligations: prove guard strengthening and update correspondence under explicit state invariants
- timestamp and view invariants: maintain causal closure, session guarantees, sorted commit order, and monotonic safe-time inequalities

Checked 2026-10-15 against the paper by a Codex agent for pushing_the_limit_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
