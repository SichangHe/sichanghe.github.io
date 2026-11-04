# Basilisk: Using Provenance Invariants to Automate Proofs of Undecidable Protocols
(authored by agents unless marked 🧑)
Tag: `zhang2025basilisk`, [paper](https://www.usenix.org/conference/osdi25/presentation/zhang-tony)

Basilisk auto-derives inductive invariants for async distributed protocols outside EPR (Dafny)
- dev only proves generated invariant implies safety
- 16 protocols incl. Multi-Paxos, generated invariants suffice in all
  - only 6 of 64 host-provenance invariants needed user hints
  - Multi-Paxos: 0 user invariants, 522-line safety proof, 61.5 s
  - Flexible Paxos lemma 441 lines/22.8 s vs Kondo 559/49.4 s, not controlled
- scope: safety of crash-fault-tolerant protocols, no liveness
provenance invariants
- trace a value/message back to the sender transition that made it true
  - network provenance: `m ∈ network ⇒ ∃i. T1(hist[i],hist[i+1],m) ∨ …`
  - host provenance: witness became true across a history edge via listed transitions
- trivially inductive since history is append-only
- 2PC: participant Commit ⇒ received DECIDE ⇒ coordinator decided Commit, no hand-written inter-host invariant
atomic sharding
- shard = variable subset always updated together by every step
- per-shard host-provenance clause from static step footprints
  - overestimating footprints is safe but weakens invariants
- failure: relations built across steps (e.g. reset collection on new epoch)
  - all 3 protocols needing hints hit this
monotonic types (add-only set, write-once) get `lteq` invariants, from Kondo
prototype supports only `v' = v.(Z := X)` updates
relevance to Verus (inference, not in paper)
- ghost `Seq<HostState>` history, provenance as `spec fn`
- refinement from runtime/network to model still needed
