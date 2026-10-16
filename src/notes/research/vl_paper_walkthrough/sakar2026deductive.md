# Deductive Verification of Weak Memory Programs with View-based Protocols (extended version)
(authored by agents unless marked 🧑)
Tag: `sakar2026deductive`, [paper](http://arxiv.org/abs/2604.21084v1)

## scope and result
The paper extends VerCors with a permission-based encoding of relaxed weak-memory programs. Its contribution is VerCors-relaxed: per-thread/per-location protocol trees plus thread-local views, encoded in VerCors so that relaxed executions can be checked automatically. The target is the relaxed fragment of SLR, a permission-based separation logic. The paper states its goal directly: “We propose VerCors-relaxed as an approach to encode relaxed memory accesses using view-based protocols in VerCors” (Section 1, p. 2). It verifies thirteen small examples, including executions that should be consistent and executions rejected by coherence rules.

The model has threads `T`, atomic locations `A`, register variables, relaxed writes and reads, and read-modify-write operations. VerCors supplies permission-based separation logic (PBSL), contracts, parallel blocks, and atomic invariants. Fractional permissions split read access and preserve race freedom; a full permission denotes writing permission (Section 2, pp. 2–4). The paper's PVL `ArraySum` example uses a method contract, a parallel block, per-thread read permissions, and an atomic invariant containing `Perm(sum, write) ** sum >= 0` (Fig. 1, p. 3).

## technique 1: per-thread/location protocol trees

A protocol models the writes one thread may perform to one atomic location. Definition 1 gives a tuple containing finite states, an initial state, accepting states, labelled transitions, and a state-to-value function (Section 3, p. 5). Protocols are trees, so their transitive closure gives a partial order of that thread's writes. A separate protocol `P_x^t` exists for each thread-location pair to which thread `t` writes. This differs from one protocol per location and makes speculative observations attributable to a particular writer.

How to apply it.
1. List every thread and atomic location it writes.
2. Create a finite tree for each pair; label each edge with the stored value and each state with the value currently held.
3. Mark initial and accepting states. At program start all protocols are initial; a valid execution must finish in accepting states (Section 3, p. 6).
4. Encode states and transitions in a VerCors-relaxed abstract data type. The paper's skeleton declares pure state constructors, `val`, `next`, `intra`, and axioms for values and transitions (Fig. 9, p. 13).
5. Check that the protocol's transitions match the program's stores. Evaluation cases `COH-p1` (missing transition) and `COH-p2` (wrong value) deliberately fail this check (Section 6, pp. 16–17).

Verus form. Inference: represent protocol states as a datatype or integer-indexed enum, with a `spec fn next` and `spec fn val`; prove transition lemmas and a `requires` clause for each store. Inference: use `requires state_is_accepting`/`ensures state_is_accepting` around a verified execution model. Verus's proof is over the abstract state machine; it does not inherit VerCors's PVL syntax or SMT axioms automatically. Inference: any axiomatized transition function must be backed by a proof or an explicitly documented trusted model.

## technique 2: thread-local views and coherence

Definition 2 assigns each thread `t` and location `x` a view `L_t^x : T -> S ∪ {⊥}`. The view records the current state of every writer's protocol as observed by `t`. Two additional structures are maintained: `π(x)`, the most recently observed store state, and `τ(x)`, a relation recording observed modification order. The paper explains the purpose: “The values that can be read from location x are the values that are associated with states from the protocols for x that are reachable from the respective current states as defined by the view” (Section 3, p. 6).

The `PRead` function gathers states reachable from other threads' viewed states, excludes states ordered before `π(x)` by the transitive closure of `τ`, and includes `π(x)`. `Read` additionally removes initial states after a write has been observed (Fig. 4, p. 7). The operational rules then update views, `π`, and `τ`:

“the Write-rule expresses that a store operation can be executed when from the current state Ltx (t) of Pxt , a transition labeled v exists” (Section 3, p. 8)

and the Read rule selects a state in `Read_t^x`, updates the reader's view of that writer, and records the new order (Fig. 5, pp. 7–8).

How to apply it.
1. Initialize every view to every protocol's initial state; initialize `π` and leave `τ` undefined.
2. For one thread, execute operations in program order, updating its own protocol view on stores and selecting permitted states on loads.
3. Reset `π` before processing another thread, while retaining and updating thread-local views.
4. After all threads, reject executions whose final own-protocol states are not accepting or whose speculated state is not reachable from the actual writer state.
5. Enforce CC1 and CC2: “An execution is consistent iff: ∀t ∈ T, x ∈ A.Ltx (t) ̸= ⊥ =⇒ Ltx (t) ∈ Fxt” and every cross-thread viewed state is reachable from the actual state (Section 3, p. 8).

Verus form. Inference: store `L`, `pi`, and `tau` in ghost state; define `spec fn readable(...)` and prove that each load result corresponds to a reachable protocol state and each store extends `tau`. A verified Rust API can expose `load` and `store` with `requires`/`ensures`, while ghost view updates remain proof-only. Inference: Verus's `old(...)` expression can relate pre-state `pi` to post-state `tau`; use only constructs documented in the project's Verus notes.

The COH example demonstrates the point. After one thread writes 1 and reads 2, the other writes 2; the relation `τ` then prevents a later read of 1 because it would reverse the observed per-location order (Section 3, pp. 8–9). Thus the method rejects executions that violate SC-per-location while allowing write reordering across different locations, as in 2+2W.

## technique 3: SLR encoding and soundness correspondence

The paper maps SLR's relaxed assertions `W^p(x,X)` (write permission plus write history) and `O(x,v,ts)` (observed value and timestamp) into protocols and views. It omits concrete timestamps and represents their order with `τ`: “the view-based protocols do not encode the timestamps explicitly, but model the modification order using τ” (Section 4, p. 10). A single writer corresponds to exclusive permission; multiple progressing writer protocols correspond to shared permission (Section 4, p. 9).

The relaxed write rule requires write permission, an observed timestamp, and a pure predicate on the value; the protocol Write rule updates the writer's state, `π`, and `τ`. The relaxed read rule updates the observer's view and order; with one writer, the only reachable write is the maximum history element, matching SLR's `r-rlx*` rule. Distinct protocol states preserve SLR's Different-Writes property even when values are equal (Section 4, pp. 10–12).

The soundness argument maintains a correspondence after initialization and after every Write and Read update. Its conclusion is explicit: “if a program verifies with the view-based protocols approach, then also the program verifies with the SLR logic” (Section 4, p. 12). This is a logical implication from the encoding, not a claim that every SLR proof is automatically generated.

## implementation and evidence

VerCors-relaxed encodes protocols as ADTs and atomic variables as PVL classes with contracts for load, store, and RMW. The evaluation covers thirteen examples with two to nine relaxed accesses each. Table 1 reports ten-run averages on a 2020 MacBook Pro with a 2.0 GHz Intel Core i5: 49.61–91.68 seconds across the examples, with exact denominators of ten runs (Section 6, pp. 16–17). For example, COH averages 55.52 seconds, 100 protocol lines, 167 program lines, and 480 total lines; ARM-weak averages 81.14 seconds and 751 total lines; 2+2W averages 80.88 seconds and 711 total lines (Table 1, p. 16). The line counts include boilerplate and atomic-variable encoding; the paper says protocol code grows exponentially with the number of states (Section 6, p. 17).

What is proved is consistency or inconsistency of the specified executions, protocol/program agreement, and the encoding's soundness relative to relaxed SLR. Trusted elements include VerCors, its SMT backend, ADT axioms, the model of protocol states, and the correctness of the PVL encoding. Inference: a Verus port must make the protocol transition model and memory-order relation explicit ghost state; treating an unproved ADT axiom as a fact would enlarge VL's trusted base. Inference: the direct product threat is high for concurrent agent-written Rust because relaxed atomics and compiler reorderings can invalidate sequential proofs; this paper provides a reusable modeling pattern but not a Verus implementation or a C11/Rust memory-model proof.

The paper deliberately limits itself to relaxed ordering; release/acquire assertions and modalities are omitted (Section 4, p. 10). It reasons about finite protocols and small examples, and verification time grows with protocol-state boilerplate. VL should reuse the per-thread protocol, view, and coherence-certificate ideas rather than redo them; it still needs a Rust-specific memory-model interface and proofs that generated code's atomic operations refine the modeled operations.

## techniques for the catalog
- per-thread/location protocol trees: model each writer's permitted stores as a finite labelled tree with accepting states
- thread-local views with pi and tau: track each thread's observations and modification order to enforce coherence and permit speculation
- SLR-to-protocol encoding: represent permission histories and relaxed reads/writes through protocol transitions and view updates
- consistency filtering: execute threads in order, then enforce final-state and reachability conditions CC1 and CC2
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
