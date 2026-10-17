# Basilisk: Using Provenance Invariants to Automate Proofs of Undecidable Protocols
(authored by agents unless marked 🧑)
Tag: `zhang2025basilisk`, [paper](https://www.usenix.org/conference/osdi25/presentation/zhang-tony)

## what the paper proves

Basilisk automatically derives inductive invariants for asynchronous distributed protocol models outside EPR. Its central idea is to replace manually invented inter-host clauses with Provenance Invariants that connect current state or network messages to the local transition that produced them. The paper states: “By tracing the provenance of one host variable back to another host’s actions, we can derive an invariant relating the two hosts’ states.” (Abstract, p. 1)

An inductive invariant must imply safety, hold initially, and survive every protocol step. Basilisk generates such an invariant as a conjunction of Regular Invariants, then leaves the developer only the proof that this conjunction implies the requested safety property. The authors evaluate 16 protocols, including Multi-Paxos, and report that generated invariants suffice in all cases.

## technique 1: provenance invariants

What it is. A Provenance Invariant records which transition made a message or local value true. A Network-Provenance Invariant has the shape `m ∈ network ⇒ ∃i: T1(hist[i],hist[i+1],m) ∨ …`, where `hist` is the sender's history; a Host-Provenance Invariant says that a current witness `q` that is not true in any initial state became true across an adjacent history pair by one of a set of transitions. The paper defines the network form as: “A Network-Provenance Invariant relates a message m in the network to the execution of one of a few host steps T1, . . . , Tj that must have sent it.” (Section 3.2, p. 4)

When to use it. Use this when a safety proof needs to relate a recipient's current state to the sender's state, or needs to explain a local value without inventing a global inter-host invariant. Inference: it suits asynchronous message systems because the history keeps the causal step even after messages are delayed, duplicated, or reordered.

How to apply it (Two-Phase Commit).

1. Define host transitions; Basilisk generates the history-preserving model. The paper's coordinator and participant steps include `CoordinatorMakeDecision`, `CoordinatorSendDecide`, and `ParticipantReceiveDecision` (Figure 3, p. 4).
2. For each message variant, state a Network-Provenance clause. The paper's Decide-Msg-Provenance says: “For every D ECIDE message m in the network, there must be adjacent states v, v′ in the coordinator’s history such that CoordinatorSendDecide(v, v′, m).” (Section 3.2, p. 4)
3. For each local witness, state a Host-Provenance clause requiring a history edge where the witness changes from false to true. Participant-Decision-Provenance attributes a participant's Commit decision to `ParticipantReceiveDecision` (Section 3.2, pp. 4–5).
4. Chain the clauses. A participant Commit implies it received a `D ECIDE(Commit)` message; Network-Provenance implies the coordinator sent it via `CoordinatorSendDecide`, whose body says the coordinator's decision matched the message; because the coordinator does not equivocate on its decision, its current decision is Commit. This proves Participant-Agreement without a manually written inter-host invariant (Section 3.3, p. 5).
5. Attribute local properties to local computation. Coordinator-Decision-Provenance attributes a Commit decision to `CoordinatorMakeDecision`, whose enabling condition requires Yes votes from every participant; the add-only `yesVotes` set then proves the yes-vote threshold still holds (Section 3.4, p. 5).

Verus form. Inference: represent host history as ghost `Seq<HostState>`, messages as an enum with source and destination, and each transition as a state-machine action. Write provenance predicates as `spec fn`s and prove them with `proof fn`s whose `ensures` quantify an index and adjacent sequence entries. Use `old(...)` for pre-state values and `requires`/`ensures` contracts on transition functions. This is an inference because Basilisk generates Dafny state-machine definitions and lemmas, not Verus code.

Evidence. Basilisk's evaluation found sufficient invariants for all 16 protocols (Section 6.1, p. 10). Among 64 Host-Provenance Invariants, only 6 required user provenance hints (Section 6.2, p. 12), so 58/64 were generated without such hints. Table 1 reports Multi-Paxos with 0 user invariants, 4 monotonic annotations, 2 provenance hints, a 522-line safety proof (565 lines total), and 61.5 seconds verification time; the denominator is one protocol row and the time is for Dafny verifying the final proof of the history-preserving asynchronous protocol (Table 1, p. 11).

Failure and assumptions. Provenance clauses are inductive because history is append-only; the paper says: “It is trivially inductive because for any message in the network, the fact that the sender performed a step that sent it is forever recorded into the history, so there is no subsequent transition that ever can make this invariant false.” (Section 3.2, p. 5) Inference: a Verus proof must establish that the ghost history is updated exactly once per concrete transition, otherwise the provenance evidence can diverge from executable behavior.

## technique 2: atomic sharding

What it is. A shard is a subset of local variables. It is atomic if no protocol step updates only part of that subset. Atomic Sharding statically computes these subsets and associates each with the steps that modify it. The paper states: “if a part of a host’s state, which we call a shard, is always updated atomically—no steps modify only some variables in the shard but not others—then we can automatically track the provenance of this shard to one of the steps that modify it.” (Section 1, p. 2)

When to use it. Use it to generate Host-Provenance witnesses from syntax rather than manually inspecting every possible execution. Maximal shards preserve relationships among fields updated together; refined shards that give each collection variable its own shard preserve provenance of individual set/map elements.

How to apply it.

1. Estimate every step's footprint, the local variables it may modify, by static analysis. Overestimation is safe but weakens invariants; the algorithm never underestimates, which would yield incorrect invariants (Section 4.2, p. 6).
2. Split conditionally divergent updates. Basilisk rejects a protocol containing a step that updates `x` or `y` under different conditions (e.g., `if c then x := 5 else y := 6`); the developer rewrites it as two steps with enabling conditions `c` and `¬c` (Section 4.2, p. 6).
3. Compute maximal shards from footprint intersections. Each Venn-diagram partition is a shard; for three footprints the paper names regions `W = F1 \ F2`, `X = F1 ∩ F2`, `Y = F2 \ F1`, and `Z = F3` (Section 4.2, pp. 6–7).
4. Generate a Host-Provenance invariant for each shard: if the shard's current values are not those of any initial state, the host attained them by executing one of the shard's associated steps across a history edge (Section 4.1, p. 6).
5. Refine collection shards. For a step updating `x` and adding to set `s`, `{x,s}` cannot identify which message introduced an element; refined `{s}` yields a per-element provenance relation (Section 4.2, p. 7).

Verus form. Inference: annotate transition functions with ghost footprints or generate them from Rust syntax, then emit `spec fn` shard predicates and quantified history lemmas. For a `Set<T>`, use a ghost set and prove each newly present element was introduced by an allowed transition. Do not store full histories in executable state; keep them in a proof-only state machine or ghost variables.

Evidence. In the participant example, `{decision}` is atomic and `ParticipantReceiveDecision` is its only modifying step, yielding the Participant-Decision-Provenance clause (Section 4.1, p. 6). Across the evaluation, 6 of 64 Host-Provenance Invariants needed hints (Section 6.2, p. 12). Inference: the static algorithm covered most cases in the evaluated protocols.

Failure and assumptions. Atomic sharding does not capture relationships established only across multiple steps. The paper's calendar-year example resets `events` when `currentYear` increments; the generated invariant misses that every event's year equals the current year, so if the proof needs that property the user must provide a provenance witness (Section 6.4, pp. 12–13). The paper reports the only implicit relationship it observed in real protocols is resetting collections on a new epoch, the case for all three protocols that needed provenance hints (Section 6.4, p. 13). Overestimated footprints also add spurious steps to a disjunction and weaken the invariant, though the authors did not face this in their protocols (Section 6.4, p. 13).

## technique 3: automatic network provenance and monotonicity

What it is. Network-Provenance generation enumerates each message variant and its sending steps, then emits a history witness. Basilisk also inherits Kondo's Monotonicity Invariants for monotonic types such as add-only sets and write-once options. The generated invariant (Section 4.3, p. 7) is `∀ m : variant(m) = M ∧ m ∈ S.network ⇒ ∃ i : T1(hist[i], hist[i+1], m) ∨ ... ∨ Tj(hist[i], hist[i+1], m)`, where `hist` is the sender's history.

When to use it. Use message provenance whenever a safety proof needs sender facts; use monotonic annotations whenever a current value must inherit a fact from an earlier history state.

How to apply it.

1. Enumerate message variants and all host steps that send each variant (Section 4.3, p. 7).
2. Emit the disjunctive history witness for every network message of that variant.
3. Label grow-only sets or write-once values as monotonic; these types implement an `lteq` partial order, and Basilisk emits an invariant that each one satisfies `lteq` as it evolves over history (Sections 5.1 and 5.3, pp. 8–9).
4. Combine the generated clauses with Host-Provenance clauses to chain sender and receiver facts (Section 3.3, p. 5), then prove the safety obligations (Section 5.4, p. 9).

Verus form. Inference: use enum pattern matching in transition proofs to establish the message variant and source action; represent monotonicity as a `spec fn` ordering and prove subset/nondecrease across `old` and current states. Rust ownership can help with resource uniqueness, but it does not automatically establish message provenance.

Evidence. Table 1 shows Basilisk's safety lemma for Flexible Paxos is 441 lines versus Kondo's 559, with verification times 22.8 versus 49.4 seconds; the times are for Dafny verifying the final asynchronous proof and exclude verifying Kondo's synchronous protocol (Table 1, p. 11; Section 6.3, p. 12). The authors hypothesize the speed difference comes from Basilisk needing fewer host steps and from users writing and optimizing the asynchronous proof directly (Section 6.3, p. 12). Inference: this is not a controlled comparison, so it does not support a general speed claim.

Failure and assumptions. The prototype only supports state update syntax `v′ = v.(Z1 := X1, …)` and not the relational update format `r(v′.Z, v, m)` (Section 5.3, p. 9). Basilisk targets safety of crash fault tolerant protocols; liveness and weaker fault models are outside scope (Section 6.4, p. 13).

## Basilisk workflow and proof obligations

The four steps are: define hosts, initialization, and local transitions; generate a history-preserving asynchronous protocol; generate an inductive invariant and a proof of its inductiveness; and prove that invariant implies safety. The paper's Figure 5 labels this workflow (p. 8). The generated asynchronous state is `GS(history, network)`, with initial history length one and empty network (Section 5.2, p. 9).

The developer proves two obligations: `Init(S) ⇒ I(S) ∧ ϕh(S)` and `I(S) ∧ ϕh(S) ∧ Next(S,S′) ⇒ I(S′) ∧ ϕh(S′)` (Section 5.4, p. 9). This shifts creativity from inventing `I` to showing that generated facts imply the desired safety property. If generated invariants are too weak, add a provenance witness hint; if the protocol definition itself violates safety, the verifier reports the host step where the proof breaks down (Section 5.4, pp. 9–10).

Inference: in Verus, these obligations map to a ghost state-machine invariant and transition-preservation proof, followed by a `proof fn` connecting the invariant to executable safety contracts. The concrete Rust implementation still requires a refinement proof from runtime state and network operations to the abstract model.

## what is proved, trusted, and threatening to VL

Basilisk proves safety of Dafny protocol state machines and proves inductiveness of its generated clauses. Inference: it does not verify complete executable distributed implementations. The paper says: “while the protocol description is verified, a developer must trust that the description accurately models their actual system, or employ prior techniques [10,36] to provably connect it to their implementation.” (Section 6.4, p. 13)

The paper lists as trusted the safety specification, the protocol description's fidelity to the real system, and Dafny with all its underlying dependencies and hardware (Section 6.4, p. 13). Inference: the asynchronous network model and Basilisk's generated history-preserving protocol are also part of what is trusted; a Verus implementation additionally trusts the Rust compiler, Verus translation and solver, proof erasure, and concrete libraries.

Inference: the threat to VeruLaw is substantial for distributed safety proofs that currently spend effort inventing cross-host invariants. Basilisk's static sharding and provenance chaining could become a Verus invariant generator. The threat is narrower for executable-code refinement, liveness, Byzantine behavior, and implicit multi-step relations, all of which require additional proof machinery. VL should avoid repeating a generic provenance taxonomy without demonstrating Verus integration, concrete-code refinement, or maintenance results.

## techniques for the catalog

- provenance invariants: connect each message or local witness to the history transition that produced it
- atomic sharding: compute variable groups updated together and derive host-provenance clauses from their footprints
- refined collection shards: split collection variables into dedicated shards to preserve per-element provenance
- network provenance: enumerate message variants and sending steps to create causal sender witnesses
- monotonicity lifting: carry add-only and write-once facts from prior history snapshots to current state
- safety obligations: prove initialization and transition preservation of generated invariants together with the safety property
Checked 2026-10-16 against the full paper by a Claude agent (mid-paper quote: "In each transition of the system, a non-deterministically chosen host performs a non-deterministically chosen local step."): checked every quotation, number, section and page reference (printed proceedings page numbers), and technique step against the paper text; changed the link to the publisher page printed in the paper, fixed a truncated quotation ("net" to "network"), the Multi-Paxos proof size (522 is the safety lemma, 565 the total), section references for the shard quote (Section 1) and the 6-of-64 hint count (Section 6.2), several page ranges, the chaining step (added coordinator non-equivocation), the trusted-component list (split paper-stated items from inference), and the Kondo speed comparison (the paper gives hypotheses, not a caution); marked agent conclusions "Inference:"; did not check the Verus and VeruLaw inferences or the artifact repository.
