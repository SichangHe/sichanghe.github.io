# Session Types for the Transport Layer: Towards an Implementation of TCP
(authored by agents unless marked 🧑)
Tag: `cavoj2024session` , [paper](https://www.semanticscholar.org/paper/d1c1cfeb469806d338465fe1ef7cdb9f1b084941)

## what is verified and what is tested

Cavoj et al. encode a bottom-up multiparty session type (MPST) model of a synchronous subset of TCP into native Rust types. The Rust compiler's type checker and borrow checker reject implementations that send the wrong message or use a continuation out of order. The paper's claim is protocol-session compliance, not a machine-checked proof of all TCP properties. It states, “Session types are encoded into native Rust types and the type checker is used to verify that the implementation follows the session type specification.”

The roles are Server User, Server System, and Client System. Only the first two are implemented; the network peer is treated as another host. The evaluation is manual interoperability and fault testing against Linux TCP, netcat, Scapy, and netem, with packet sniffing and expected-output comparison (§5). Trusted assumptions include the session-type library, Rust compiler, underlying socket/network behavior, the chosen synchronous model, and the correctness of the hand-written state machine. Inference: for Verus, session typing can constrain protocol traces, but it does not replace functional contracts for bytes, sequence numbers, memory safety, or liveness.

## technique 1: encode protocol actions as linear continuation types

Use this when every send or receive has a statically known peer, message type, and next protocol state. Define generic zero-sized structs `OfferOne`, `OfferTwo`, `SelectOne`, `SelectTwo`, and `End`, all implementing an `Action` trait (§4.1). Their type parameters encode role, message types, and continuation. A type alias names the root action; the paper's simple example is `OfferOne<Client, Request, SelectOne<Client, Response, End>>` for the server and the dual sequence for the client.

Steps:
1. Enumerate roles and message types.
2. Represent each receive choice with `OfferOne`/`OfferTwo` and each send choice with `SelectOne`/`SelectTwo`.
3. Put the continuation type in the action's generic parameters.
4. Define an alias for the root session type.
5. Implement channel methods whose signatures require the matching action token and return the continuation (§4.4).

A `select_one` method consumes a `SelectOne<R2,M,A>` token, accepts a message `M`, and returns `A`; moving the token prevents reuse. The paper says, “The token is moved into this function, so the owner cannot re-use it.” Inference: Verus can model the same linear protocol state with an owned Rust token plus ghost state and prove `ensures` that a transition returns the next state. Rust's type checker enforces the sequencing before Verus; Verus is needed for data-dependent properties and semantic postconditions.

## technique 2: readable macros, branching, and recursion

Use the `St!` macro when nested generic types become unreadable. The recursive macro expands mathematical notation such as `(Client & Request).(Client + Response).end` into the action structs (§4.1). Rust lacks variadic generic types, so an N-way offer is encoded as a binary tree: first case versus an N−1 offer, recursively, with virtual nodes for right branches (§4.2).

Recursive sessions cannot be recursive type aliases because expansion would be infinite. Define a named type with indirection such as `&T` or `Box<T>` so the type has finite size (§4.3). Inference: when porting to Verus, preserve the executable representation and prove that each recursive loop or function maintains the protocol-state invariant. A macro-generated type does not itself prove that payload values satisfy application requirements.

## technique 3: channel operations and external branch selection

A `Channel<R1,R2>` endpoint exposes send/receive methods parameterized by the session token. `select_one` checks the message type at compile time and returns the prescribed continuation (§4.4). For offers, a received network message must be decoded and classified; the implementation passes a picker function to choose the branch. The authors need external context to distinguish an expected packet from an error condition.

Inference: a Verus implementation should specify the decoder and picker with preconditions linking bytes to a valid message variant and postconditions linking the chosen branch to the returned protocol state. The picker is a trusted semantic boundary in the paper: Rust typing checks that the selected branch is legal, but not that a malicious or malformed packet was classified correctly.

## technique 4: encode the TCP state machine

Define the server's handshake as a session type. `ServerSystemSessionType` receives `Open`, sends `TcbCreated`, receives `Syn`, sends `SynAck`, and continues to `ServerSystemSynRcvd` (§4.5). The recursive `SynRcvd` type branches on an acceptable `Ack` to `ServerSystemCommLoop`, or on an unacceptable acknowledgement to another `Ack`/`Rst` sequence and close. This maps RFC 9293 state transitions to typed continuation paths.

For data retransmission, session types lack timeouts. The implementation introduces a virtual timeout message as another offer branch; that branch selects a retransmitted ACK and recursively receives the next message (§4.6). A timeout is omitted when the retransmission queue is empty because the type would require a segment that cannot be sent. Inference: a Verus model should state timeout and queue relations explicitly in `requires`/`ensures`; a virtual message is an implementation encoding, not evidence that the real timer satisfies a fairness or eventual-delivery assumption.

For close, `ServerSystemCloseWait` permits more `Data` or a `Close` leading to `FinAck` and `Ack`; `ServerSystemFinWait1` handles an ACK or simultaneous FIN-ACK (§4.7). Simultaneous close is excluded because the call-and-response model offers no opportunity for the server to close while waiting for the client. This is a model limitation, not a verified impossibility.

## evidence and failure modes

The echo-server evaluation establishes a connection with netcat, reverses each received line, exchanges data, and exercises both user-initiated and peer-initiated close (§5). Scapy sends invalid sequence and acknowledgement numbers, spurious retransmissions, and overlapping segments. netem adds loss, delay, and reordering; packet sniffers compare received output to expectations. The authors report, “All of the presented test cases were found to be handled correctly provided the server is in the ESTABLISHED state.” This is a finite manual test set, with no denominator of all TCP traces and no proof of full RFC conformance.

The implementation handles packet loss and reordering after establishment but does not cache out-of-order segments, so performance suffers and segments are retransmitted. The synchronous session-type model cannot express simultaneous close, full timeout semantics, congestion control, or all asynchronous behavior. The conclusion calls it “a proof of concept” and lists lack of timeouts in the type system and synchronous operation as future work.

Inference: threat to VL is moderate for protocol-session sequencing and API misuse, high if session typing is mistaken for functional or liveness verification, and low for the soundness of ordinary Rust type checking. VL should reuse the linear-token idea for verified protocol APIs, but should add Verus contracts and state-machine invariants for payload correctness, timers, retries, and network assumptions. Existing work has already demonstrated the typed-sequencing pattern and basic interoperability; repeating it without a Verus-specific semantic proof adds little.

## techniques for the catalog

- continuation session types — encode peer, message, and next-state parameters so channel operations consume a legal protocol token
- readable recursive macros — expand mathematical session notation into nested Rust action types
- binary-tree branch encoding — represent arbitrary offer arity through recursively nested two-way choices
- indirection for recursive protocols — use reference or `Box` indirection to give recursive session states finite size
- typed TCP state machine — map handshake, data, retransmission, and close transitions to continuation types
- virtual timeout branch — model unavailable type-level timers as explicit message branches with queue-dependent guards
- trace and fault interoperability testing — combine netcat, Scapy, netem, packet capture, and expected output against Linux TCP

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
