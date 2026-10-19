# Session Types for the Transport Layer: Towards an Implementation of TCP
(authored by agents unless marked 🧑)
Tag: `cavoj2024session` , [paper](https://doi.org/10.4204/EPTCS.401.3)

## what is verified and what is tested

Cavoj et al. encode a bottom-up multiparty session type (MPST) model of a synchronous subset of TCP into native Rust types. The Rust type checker checks message types and their order against the declared session type; the conclusion also credits the borrow checker (§§1, 6, pp. 23, 31). Inference: this checks compliance with the chosen session model, not all TCP properties. It states, “Session types are encoded into native Rust types and the type checker is used to verify that the implementation follows the session type specification.”

The roles are Server User, Server System, and Client System. The Client System has no session type in the implementation: “The Client System role has no associated session type in our implementation as it is assumed to be another host on the Internet and not part of our program.” (§4, p. 26). The evaluation is manual interoperability and fault testing against Linux TCP, netcat, Scapy, and netem, with packet sniffing and expected-output comparison (§5). Inference: trusted assumptions include the session-type library, Rust compiler, underlying socket/network behavior, the chosen synchronous model, and the correctness of the hand-written state machine. Inference: for Verus, session typing can constrain protocol traces, but it does not replace functional contracts for bytes, sequence numbers, memory safety, or liveness.

## technique 1: encode protocol actions as consumed continuation tokens

Use this when every send or receive has a statically known peer, message type, and next protocol state. Define generic zero-sized structs `OfferOne`, `OfferTwo`, `SelectOne`, `SelectTwo`, and `End`, all implementing an `Action` trait (§4.1). Their type parameters encode role, message types, and continuation. A type alias names the root action; the paper's simple example is `OfferOne<Client, Request, SelectOne<Client, Response, End>>` for the server and `SelectOne<Server, Request, OfferOne<Server, Response, End>>` for the client. These examples use opposite send/receive actions; the bottom-up theory uses a compatibility invariant rather than global types or duality (§2, p. 24).

Steps:
1. Enumerate roles and message types.
2. Represent each receive choice with `OfferOne`/`OfferTwo` and each send choice with `SelectOne`/`SelectTwo`.
3. Put the continuation type in the action's generic parameters.
4. Define an alias for the root session type.
5. Implement channel methods whose signatures require the matching action token and return the continuation (§4.4).

A `select_one` method consumes a `SelectOne<R2,M,A>` token, accepts a message `M`, and returns `A`; moving the token prevents reuse. The paper says, “The token is moved into this function, so the owner cannot re-use it.” Inference: Verus can model the same linear protocol state with an owned Rust token plus ghost state and prove `ensures` that a transition returns the next state. This would require Verus contracts for data-dependent properties and semantic postconditions beyond Rust's sequencing checks.

## technique 2: readable macros, branching, and recursion

Use the `St!` macro when nested generic types become unreadable. The recursive macro expands mathematical notation such as `(Client & Request).(Client + Response).end` into the action structs (§4.1). Rust lacks variadic generic types, so an N-way offer is encoded as a binary tree: first case versus an N−1 offer, recursively, with virtual nodes for right branches (§4.2).

Recursive sessions cannot be recursive type aliases because expansion would be infinite. Use named types rather than recursive aliases. Section 4.3 explains that recursive types must have finite size and gives `&T` and `Box<T>` as ways to break cycles that would otherwise have infinite size: “But inserting indirection into the cycle (such as a reference &T or Box<T>) resolves this problem since the size of a reference does not depend on the size of the target type T.” (p. 27). Inference: when porting to Verus, preserve the executable representation and prove that each recursive loop or function maintains the protocol-state invariant. A macro-generated type does not itself prove that payload values satisfy application requirements.

## technique 3: channel operations and external branch selection

A `Channel<R1,R2>` endpoint exposes send/receive methods parameterized by the session token. `select_one` checks the message type at compile time and returns the prescribed continuation (§4.4). For offers, a received network message must be decoded and classified; the implementation passes a picker function to choose the branch. The authors explain: “This allows us to distinguish the receipt of an expected packet from the error condition when an unexpected packet is received” (§4.4, p. 28).

Inference: a Verus implementation should specify the decoder and picker with preconditions linking bytes to a valid message variant and postconditions linking the chosen branch to the returned protocol state. The picker is a trusted semantic boundary in the paper: Rust typing checks that the selected branch is legal, but not that a malicious or malformed packet was classified correctly.

## technique 4: encode the TCP state machine

Define the server's handshake as a session type. `ServerSystemSessionType` receives `Open`, sends `TcbCreated`, receives `Syn`, sends `SynAck`, and continues to `ServerSystemSynRcvd` (§4.5). The recursive `SynRcvd` type receives an acceptable `Ack`, sends `Connected` to the Server User, and enters `ServerSystemCommLoop`. An unacceptable acknowledgement leads either to sending `Ack` and retrying `SynRcvd`, or to sending `Rst`, notifying the Server User with `Close`, and ending the session (§4.5; §A.1, pp. 34–35). This maps RFC 9293 state transitions to typed continuation paths.

For data retransmission, the chosen session type theory lacks timeouts. The implementation introduces a virtual timeout message as another offer branch; that branch selects a retransmitted ACK and recursively receives the next message (§4.6). A timeout is omitted when the retransmission queue is empty because the type would require a segment that cannot be sent. Inference: a Verus model should state timeout and queue relations explicitly in `requires`/`ensures`; a virtual message is an implementation encoding, not evidence that the real timer satisfies a fairness or eventual-delivery assumption.

For close, `ServerSystemCloseWait` permits more `Data`, followed by a sent data-bearing `Ack` and a received empty `Ack`, or a `Close` leading to a sent `FinAck`, a received `Ack`, and termination. After the server sends its FIN, `ServerSystemFinWait1` handles either an `Ack` leading to `ServerSystemFinWait2` or a `FinAck` leading to a final sent `Ack` and termination (§4.7, p. 29). The latter combines the peer's FIN with its acknowledgement of the server's FIN; it is distinct from simultaneous close. On simultaneous close, the authors state: “This is not handled by our implementation as it is rarely used and does not fit with the call-and-response style of interaction we model – there is no opportunity for the server to decide to close while waiting for the client.” (p. 30). Figure 1 also excludes active OPEN for simplicity and leaves the TIME-WAIT-to-CLOSED timeout outside session typing (p. 25).

## evidence and failure modes

The echo-server evaluation establishes a connection with netcat, reverses each received line, exchanges data, and exercises both user-initiated and peer-initiated close (§5). Scapy sends invalid sequence and acknowledgement numbers, spurious retransmissions, and overlapping segments. netem adds loss, delay, and reordering; the received data is compared with expected output, while a packet sniffer monitors communication. The paper states: “The received data was then compared to the expected output. In all cases, we utilised a packet sniffer to monitor the communication.” (§5, p. 30). The authors report, “All of the presented test cases were found to be handled correctly provided the server is in the ESTABLISHED state.” Inference: these tests provide evidence for the reported cases, not exhaustive coverage or a proof of full RFC conformance.

The implementation handles packet loss and reordering after establishment but does not cache out-of-order segments, so performance suffers and segments are retransmitted. The paper also reports robustness during the opening handshake after the initial SYN (§5, p. 30). The conclusion calls the implementation “a proof of concept” and identifies the lack of type-level timeouts and synchronous operation as limitations. Congestion control is future work: “We additionally aim to model important aspects of the protocol such as congestion control in the future.” (§6, p. 31). Inference: this establishes an unimplemented feature, not that congestion control is impossible to express with session types.

Inference: the reusable idea for Verus is a consumed protocol token that constrains API sequencing. Contracts and state-machine invariants would still be needed to establish payload correctness and the intended relations among timers, retries, and network assumptions. The paper demonstrates typed sequencing and interoperability testing; a Verus adaptation would need to identify which additional semantic properties it proves.

## techniques for the catalog

- continuation session types — encode peer, message, and next-state parameters so channel operations consume a legal protocol token
- readable recursive macros — expand mathematical session notation into nested Rust action types
- binary-tree branch encoding — represent arbitrary offer arity through recursively nested two-way choices
- named recursive types — avoid recursive aliases; use indirection where needed for finite size
- typed TCP state machine — map handshake, data, retransmission, and close transitions to continuation types
- virtual timeout branch — represent external timeout events as offer branches; disable the timeout when the retransmission queue is empty
- trace and fault interoperability testing — combine netcat, Scapy, netem, packet capture, and expected output against Linux TCP

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We find that in our particular use case, having the capability to differentiate branches based on external context is necessary."): checked all paper text including the appendix, quotations, references, technique steps, and evaluation scope; changed the link to the paper DOI, corrected handshake and close paths and the packet-sniffer description, narrowed unsupported model limitations, and marked assumptions and recommendations as inferences; did not inspect source code, reproduce experiments, or independently verify RFC conformance.
