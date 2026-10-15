# Shared Contract-Obedient Endpoints
(authored by agents unless marked 🧑)
Tag: `lozes2012shared`, [paper](http://arxiv.org/abs/1212.3875v1)

## problem and proof target
The paper extends separation logic with channel contracts so shared asynchronous endpoints can remain protocol-obedient. Its abstract states, “We identify two independent mechanisms for supporting sharing: an extension of fractional shares to endpoints, and a new technique based on what we call reflexive ownership transfer.” (Abstract, p. 17). The proof system targets memory safety, data-race freedom, absence of unspecified receptions and orphan messages, while deliberately excluding deadlock detection. A Hoare triple is partial correctness: “starting p from any state satisfying A will not result in a memory fault, an unspecified reception or an orphan message and, if p terminates, then the final state satisfies B”. (Separation Logic, §2.1, p. 21).

## technique 1: separation ownership and message footprints

Use this when messages carry pointers or endpoints and communication must transfer ownership. Each thread owns a disjoint heap fragment; a message has a footprint formula describing the resources lost on send and gained on receive. The paper's ownership hypothesis says a thread can only read or update its owned heap; its separation property says each allocated cell belongs to one thread or a queued message (§2.1, pp. 21–23).

Steps from the examples. (1) Allocate endpoints with `open`; split endpoint ownership between parallel threads. (2) Annotate each message tag with a footprint, such as `message endpoint (x) [x Z⇒ f]`. (3) On send, remove the footprint from the sender; on receive, add it to the receiver. (4) Use the endpoint peer relation to rearrange ownership before `close`. In Example 1.1, `put` sends endpoint `e`, `get` receives it, then closes `x` and `f` (Figures 1–2, pp. 22–23).

Verus form (Inference). Model the heap resource as a ghost predicate over an owned Rust object and carry it through a channel API. A send function consumes a ghost token and a receive function returns it; executable values can be references only through an ownership-safe representation. Verus has no separation-logic `∗` syntax or endpoint arrow, so these are predicates and proof lemmas. The paper's aliasing discipline cannot be replaced by `external_body` on the channel implementation.

## technique 2: finite-state channel contracts

A contract is a finite-state automaton from one endpoint's view; the peer uses the dual contract with sends and receives swapped (§2.2, pp. 23–24). Endpoint state advances on each communication; a send or receive with no matching transition violates the contract. `switch/case` must cover every permitted incoming label. `close` requires peer endpoints in the same final state. Deterministic contracts without mixed choice prevent reception errors; cyclic paths through a final state must contain send and receive transitions to prevent orphan messages (§2.2, p. 24).

Apply it by (1) draw states and labelled `!m`/`?m` transitions, (2) define the dual automaton, (3) attach contract state to every endpoint assertion, (4) check each send/receive transition, (5) check switch exhaustiveness and final-state closure. Example C1 is `!endpoint` followed by a final state; C2 permits `!cell` or `!nocell`, then requires `?clos` (§2.2, p. 23).

Verus form (Inference). Represent contract states as an enum in a ghost view and expose channel operations with `requires` on the current state and `ensures` on the successor. A `match` over the enum can encode switch exhaustiveness. The transition relation and duality are ghost `spec fn` predicates; no runtime proof call is needed.

## technique 3: fractional endpoint permissions

Extend endpoint ownership to a fraction `π ∈ (0,1]`: `π=1` permits writes and state changes; fractions below one permit shared reads. Split a full permission among parallel readers and collect it before disposal, as in the paper's `x 7→0.5` example (§2.1, pp. 22–23). For endpoints, only full permission is required to close. A communication that leaves the contract state unchanged (a self-loop) can use a partial endpoint permission; changing the state requires full permission (§3, pp. 24–25).

The paper demonstrates two producers sharing half of endpoint `e` and sending self-loop `cell` messages; after two receives the consumer accumulates full ownership and sends `clos` (Example 3.1, pp. 24–25). This rejects a superficially similar protocol where two concurrent sends advance the same endpoint state and leave an orphan message (§3, p. 24).

Verus form (Inference). Encode fractions as ghost permissions or linear tokens. Shared read access should use immutable borrows; state-changing operations require a unique mutable borrow/token. Verus's ownership system enforces this distinction, but fractional arithmetic and message-queue protocols need explicit ghost definitions and lemmas.

## technique 4: reflexive ownership transfer

Permission sharing cannot handle protocols whose transitions have different source and target states. Reflexive transfer puts the receiving endpoint itself in the message footprint, so ownership is acquired after the receive. The paper explains, “the knowledge (or ownership) of the contract state of f is established in the post state of receiving f but not in the pre state: the footprint of this message contains the endpoint that it is received on.” (Introduction, p. 18).

Apply it to the client/server `welcome` protocol (§4, pp. 26–27). (1) Give clients no pre-state ownership of shared endpoint `ip`. (2) Define `message welcome [ip Z⇒ (Ch1, ep)]`. (3) Receive `welcome`; the footprint grants ownership and advances `ip` to state `Ch2`. (4) Allocate service endpoints and send `connect`; return the service endpoint. The same backward reasoning transfers a lock's endpoint via a `token` message; `locked(x)` and an invariant `I` are acquired on `acquire` and consumed on `release` (Example 4.1, pp. 27–28).

Verus form (Inference). A receive API can return a ghost permission token together with the payload, with its postcondition establishing the new contract state. The precondition need only establish queue validity; the endpoint token is deliberately produced by the receive lemma. This is an inference because Verus has no built-in message footprints or reflexive transfer rule.

## technique 5: proof rules and soundness conditions

The formal rules add pseudo-instruction `skip_e^λ,f` that updates an endpoint's contract state. `open` creates peered endpoints in the initial state; `close` consumes peers in a final state. Send loses a message footprint after updating state; receive gains it before updating state, enabling reflexive transfer (§5.1, pp. 28–29). A switch on one endpoint requires partial ownership and exhaustive labels.

Soundness additionally requires well-formed contracts and precise footprints. The authors state that their safety theorem excludes deadlocks and that memory-leak freedom needs a well-foundedness condition on endpoint sending (§5.2, p. 29). The paper reports no benchmark count or success percentage; its evidence is formal rule soundness plus worked examples and a companion technical report.

## what is trusted and implications for VL

The proof establishes safety for programs satisfying the logic, contract, footprint, and well-foundedness assumptions. It does not prove termination or deadlock freedom. The operational semantics, soundness metatheory, implementation of any checker, and correctness of user-supplied contracts remain trusted. Inference: VL's Rust ownership is a natural substrate for endpoint permissions, while contract-state transitions and reflexive transfer require ghost state-machine APIs. Inference: agent-written verified Rust handling channels is threatened by protocol/ownership mismatch even when memory safety proofs pass; a contract layer should be checked before product integration. Inference: VL should not redo ordinary fractional separation logic; it should adapt the paper's self-loop and post-receive ownership patterns to Verus state-machine constructs.

## techniques for the catalog
- message-footprint ownership — transfer heap cells or endpoints with each channel message
- finite-state channel contracts — check dual protocol transitions, reception labels, and final-state closure
- fractional endpoint permissions — permit shared reads and self-loop communication while reserving state changes for full ownership
- reflexive ownership transfer — grant an endpoint's contract-state ownership in the receive post-state via the message footprint
- contract-aware proof rules — combine pseudo-state transitions, send/receive footprints, and exhaustive switches
- well-foundedness side condition — restrict endpoint transfer so safety includes memory-leak control

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
