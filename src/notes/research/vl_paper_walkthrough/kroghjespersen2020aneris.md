# Aneris: A Mechanised Logic for Modular Reasoning about Distributed Systems
(authored by agents unless marked 🧑)
Tag: `kroghjespersen2020aneris`, [paper](https://arxiv.org/abs/2012.03842)

## scope and evidence
Aneris is a higher-order concurrent separation logic for distributed programs. The abstract says it is “fully mechanized in the Coq proof assistant” and reports verification of a multi-threaded load balancer and a two-phase-commit system with replicated logging. The implementation language, AnerisLang, has higher-order functions, local state, forked threads, and UDP-like sockets (Sections 1 and 3, pp. 337–339, 348). The authors formalized the theory and examples on Iris with MoSeL; the artifact URL is given in Section 1 (p. 339).

The paper’s adequacy theorem is the soundness boundary. It states: “Given primordial socket protocols Φa for each a ∈ A, suppose that the Hoare triple ...” (Theorem 1, p. 347; the displayed theorem continues over the page). The logic guarantees safety and protocol adherence under those primordial protocols. UDP delivery is deliberately weak: the paper says, “In accordance with UDP, Aneris provides no guarantee of delivery or ordering although we assume duplicate protection” (Section 2.2, p. 342). Inference: this is a safety framework under explicit network assumptions; it does not establish liveness, eventual delivery, or crash recovery unless those are separately modeled.

## technique 1: socket protocols as distributed resource invariants

What it is. Associate each socket address with a predicate `Φ : Message → iProp` describing incoming messages and the resources they carry. The paper says: “A socket protocol is a predicate Φ : Message → iProp on incoming messages received on a particular socket” (Section 2.2, p. 342). The assertion `a ⇒ Φ` records that address `a` is governed by `Φ`; it is duplicable, allowing multiple local proofs to rely on the same protocol.

How to apply it.
1. Choose a primordial protocol for each service address before execution; use `Fixed(A)` to record that the address set is static (Section 2.2, pp. 342–343).
2. Define the message predicate to include serialized payload and sender ownership. In the addition service, `Φadd(m)` requires a sender protocol `Ψ`, `body(m)=serialize(x,y)`, and that a serialized `x+y` response satisfies `Ψ` (Section 2.3, p. 344).
3. Bind a socket using `Socketbind-static` or `Socketbind-dynamic`. The static rule consumes `Fixed(A)`, membership, a free port, and an unbound socket handle; the dynamic rule additionally returns `a ⇒ Φ` for a freely chosen protocol (Section 2.2, p. 343).
4. Verify receive/send code against the protocol. The server’s postcondition may be `False` when it loops forever; its safety triple still guarantees responses obey `Φadd` (Section 2.3, p. 344).
5. Compose independently verified nodes with `Node-par-rule`.

Verus form (Inference). Represent each protocol as a `spec fn` over a message model and ghost resources; keep address-to-protocol ownership in a ghost map or invariant. Use `requires` for the socket binding facts and `ensures` for response payload/resource transfer. Verus has no built-in asynchronous network semantics, so the socket API and serialization model must be trusted or separately specified. Use `invariant` only as a loop invariant declaration, never as a call.

Evidence and limits. The addition server/client proof derives the returned sum from the protocol, and the authors state that composing the two specifications with `Node-par-rule` verifies a server with multiple clients (p. 344). The protocol assumes duplicate protection and does not guarantee delivery or order.

## technique 2: ownership transfer through message protocols

The lock-server example turns a concurrent lock specification into a network protocol. A non-duplicable key resource `K` is transferred with a successful `"YES"` response and is required in a `"RELEASE"` request. The paper says: “Receiving a ”RELEASE” request is similar, but the important part is that we require a client to send the key resource K along with the message, which ensures that only the current holder can release the lock” (Section 2.4, p. 347).

Apply it by defining `acq(m,Ψ)` for a `LOCK` request whose response is either `NO` or `YES * K`, and `rel(m,Ψ)` for `RELEASE * K` whose response is `RELEASED`; then set `Φlock(m) := ∃Ψ. from(m) ⇒ Ψ * (acq ∨ rel)` (Section 2.4, pp. 346–347). Give the server an initial `K * Static(a,A,Φlock)` resource and prove that every branch preserves the protocol. Inference: in Verus, model `K` as a linear ghost token represented by an ` Option`-like ghost value and prove that only a token owner can establish the release precondition; Rust ownership alone cannot express a cross-node token without a ghost protocol.

## technique 3: horizontal and vertical composition

Horizontal composition verifies each thread and node in isolation, then combines them with `Thread-par-rule` and `Node-par-rule`. Vertical composition uses bind and frame rules to replace an implementation by a verified module specification. The paper defines vertical composition as composing proofs of components inside a node, and horizontal composition as composing verified threads and nodes (Section 1, p. 338).

The load-balancer case instantiates generic input/output predicates `Pin` and `Pout`, defines a relay protocol, and reuses the same client specification in both a direct-server system and a load-balanced system (Section 5, pp. 353–356). The TPC case composes a generic coordinator/participant module with a replicated log client. Inference: a Verus library should expose stable contract predicates for network modules, then prove clients against those predicates instead of implementation details.

## technique 4: fractional ghost state for two-phase commit

TPC is specified with application-supplied decidable message predicates and local pre/postconditions `P` and `Q`. The implementation uses fractional ghost resources to track coordinator and participant states; participant views of coordinator state are kept consistent by an invariant (Section 6, pp. 356–357). The protocol steps are: coordinator sends vote requests; participants reply commit/abort; coordinator collects votes and decides commit iff all votes commit; participants apply the global decision and acknowledge (Section 6, p. 356).

Apply it by defining the transition-state ghost resources, giving each participant a fractional view, and proving that each transition consumes only the fraction it owns. Establish an invariant equating all participant views of coordinator state. Prove commit yields `Q` for every participant and abort preserves `P`; the paper lists these as the specification guarantees (Section 6, p. 357). Inference: Verus can encode state agreement as a ghost map plus quantified invariants and use `proof fn` lemmas for transition preservation, but fractional ownership and asynchronous message queues need explicit ghost abstractions.

## what is trusted, what fails, and VL relevance
The trusted base includes Coq’s kernel, Iris/MoSeL, Aneris operational semantics, serialization/deserialization definitions, and the assumed duplicate-protection network model. The two case studies demonstrate safety and modularity, not performance, fault tolerance, or liveness; no denominator or runtime benchmark is reported for the proof effort in the cited case-study section. Inference: agent-written verified Rust remains threatened at module boundaries where network assumptions, serialization, retries, and ownership transfer are left as external bodies. Existing Aneris work already supplies a compositional pattern VL should reuse conceptually rather than redo: protocol predicates, ghost resource transfer, and per-node proofs.

## techniques for the catalog
- socket-protocol invariants — specify each address as a message predicate carrying payload and logical resources
- protocol ownership transfer — enforce distributed mutual exclusion by transferring a linear key through protocol branches
- node/thread composition — prove components locally and combine them with frame, bind, thread-parallel, and node-parallel rules
- fractional TPC ghost state — track coordinator and participant transitions with fractional views joined by an invariant
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
