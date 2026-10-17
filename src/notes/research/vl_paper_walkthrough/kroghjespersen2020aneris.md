# Aneris: A Mechanised Logic for Modular Reasoning about Distributed Systems
(authored by agents unless marked 🧑)
Tag: `kroghjespersen2020aneris`, [paper](https://doi.org/10.1007/978-3-030-44914-8_13)

## scope and evidence
Aneris is a higher-order concurrent separation logic for distributed programs. The abstract says it is “fully mechanized in the Coq proof assistant” and reports verification of a load balancer and a two-phase-commit protocol with replicated logging (p. 336). AnerisLang is an untyped functional language with higher-order functions, mutable references, forked threads, and socket primitives (Section 3, pp. 347–349). The authors formalized the theory and examples on Iris using MoSeL; the artifact URL appears in Section 1 (p. 339).

The soundness result is Theorem 1 in Section 4.2 (p. 352). It assumes initial state coherence, primordial socket protocols, available IP addresses, and a derivable Hoare triple. It concludes that the main expression satisfies its first-order postcondition if it returns a value, and that every non-value thread can take a reduction step. The authors explain: “We now state a formal adequacy theorem, which expresses that Aneris guarantees both safety, and, that all protocols are adhered to.” Here safety means that execution does not get stuck; postconditions describe terminating executions (Section 4, pp. 349–350).

The network assumptions matter: “In accordance with UDP, Aneris provides no guarantee of delivery or ordering although we assume duplicate protection” (Section 2.2, p. 342). Inference: the stated theorem does not establish termination, eventual message delivery, or crash recovery. These require additional models and proofs.

## technique 1: socket protocols as distributed resource invariants

What it is. Associate each socket address with a predicate describing incoming messages and the logical resources they carry. The paper says: “A socket protocol is a predicate Φ : Message → iProp on incoming messages received on a particular socket” (Section 2.2, p. 342). Write `a ↦ Φ` here for the paper's socket-protocol assertion. It records duplicable knowledge of the protocol, rather than exclusive ownership of the address. Protocol uniqueness is subject to Iris's later modality, which the paper omits from its presentation (p. 342, footnote 3).

How to apply it.

1. Choose primordial protocols for static service addresses before execution. `Fixed(A)` records the set of static addresses; dynamic addresses lie outside this set (Section 2.2, pp. 342–343).
2. Describe the request and the permitted response. For addition, `Φadd(m)` requires a sender protocol `Ψ`, a body serializing two numbers `x,y`, and a separating implication that lets a response serializing `x+y` satisfy `Ψ` (Section 2.3, p. 344).
3. Allocate a socket and provide a free port and an unbound socket resource to bind it. Static binding requires membership in `A`; dynamic binding requires non-membership and returns knowledge of a freely chosen protocol. `Fixed(A)` is persistent and duplicable, so its use does not exhaust that knowledge (Sections 2.2 and 4.1, pp. 343, 350–351).
4. Before sending, establish the destination protocol with the message's resources. On receiving a message, obtain its protocol resources and a certificate `R(m)` recording actual receipt. If reception returns `None`, obtain no message resources (Section 4.1, pp. 351–352).
5. Prove server and client separately, then compose their specifications with the node-parallel rule. The addition server loops forever and has postcondition `False`; the client specification states that its result, if returned, is `x+y` (Section 2.3, p. 344).

Inference: for a verified Rust library, this suggests specifying the socket API through message predicates and resource transfer. This paper does not supply a Verus implementation or establish which Verus constructs can express these predicates.

## technique 2: ownership transfer through message protocols

The lock-server example adapts a concurrent lock specification to a network service. Its key `K` is a non-duplicable logical resource. A successful `YES` response transfers `K`; a `RELEASE` request must supply it. The paper says: “Receiving a ”RELEASE” request is similar, but the important part is that we require a client to send the key resource K along with the message, which ensures that only the current holder can release the lock” (Section 2.4, p. 347).

Define `acq(m,Ψ)` to require a `LOCK` request and a continuation accepting either `NO`, or `YES` together with `K`. Define `rel(m,Ψ)` to require `RELEASE` together with `K` and a continuation accepting `RELEASED`. Combine them as `Φlock(m) := ∃Ψ. from(m) ↦ Ψ ∗ (acq(m,Ψ) ∨ rel(m,Ψ))`. Give the server `K ∗ Static(a,A,Φlock)` initially. Verify that each response meets the sender's protocol (Section 2.4, pp. 345–347).

The server's mutable lock reference remains hidden in its specification. A client may retry after a denial; the paper suggests a loop, without proving it eventually acquires the lock (p. 347). Inference: a Rust adaptation would need a logical token whose ownership can move through the network specification; the token is not a serialized runtime key in this example.

## technique 3: horizontal and vertical composition

Horizontal composition combines separately verified threads and nodes through the thread-parallel and node-parallel rules. Vertical composition uses component specifications, with bind and frame rules, to verify larger programs (Section 1, p. 338). Starting nodes requires unused IP resources; only the distinguished system node can start them. Node-parallel postconditions are `True`, because nodes cannot synchronize their completion with that system node as joined local threads can (Sections 2.2 and 4.1, pp. 341–342, 350).

The load balancer forks one thread per server. Threads share an input socket; each has a separate socket for forwarding requests to its server and awaiting responses. A shared invariant owns the main socket resource (Section 5, pp. 353–355).

To reuse the load-balancer proof, choose request and response predicates `Pin(m,v)` and `Pout(m,v)`. Its relay protocol also carries `Pval(v)` between request and response. For each server address `s`, use fractional ghost state `LB(π,s,v)`: full ownership permits updating `v`, whereas partial ownership enforces agreement on `v`. The load balancer updates the full resource for the next request, retains half, and transfers half to the server. The server must return that half with its response. Agreement then identifies the response with the same request value, despite existential quantification in the relay protocol (pp. 354–355).

The authors instantiate this specification for addition and reuse the same client specification in two verified systems: two clients with one server, and two clients with a load balancer and three servers (p. 356). Inference: keeping module contracts independent of routing can let clients reuse their proofs when deployment changes.

## technique 4: fractional ghost state for two-phase commit

The two-phase-commit implementation accepts application-specific decidable predicates for requests, votes, and decisions, together with participant preconditions `P` and postconditions `Q` (Section 6, p. 357). The coordinator requests votes; participants vote commit or abort; the coordinator collects all votes and chooses commit only if all vote commit. Participants that voted commit await the verdict and commit or abort accordingly. All participants must acknowledge (pp. 356–357).

The specifications use fractional ghost resources to track coordinator and participant states. Partial ownership restricts when transitions can occur; an invariant keeps participant views of coordinator state in agreement. The receive certificate from Section 4.1 distinguishes an actual vote received by the coordinator from an arbitrary message with matching content (pp. 352, 357). The specification provides `Q` for all participants after commit and preserves `P` for all participants after abort. It also allows a coordinator that is not primordial (p. 357).

The replicated-log client illustrates application of the module. Track both the current log with `LOG(π,a,l)` and the proposed change with `PEND(π,a,(l,s))`. The coordinator retains half of the pending-log resources. Instantiate `P` with half ownership of the current log and pending change, and `Q` with half ownership of the appended log and the same pending change. Fractional agreement ties the existentially quantified log and change to the coordinator's retained knowledge. The TPC guarantees then yield the appended log on every database after commit, or the unchanged log after abort (Section 6.1, pp. 357–358).

Inference: the reusable pattern is to expose application preconditions and postconditions through a protocol module, then use shared logical agreement to prevent participants from choosing inconsistent updates. A Verus encoding needs its own sound model of fractional resources and asynchronous communication.

## techniques for the catalog
- socket protocols — describe incoming payloads and logical resources through address-specific predicates
- protocol ownership transfer — enforce mutual exclusion by requiring a non-duplicable key in the release protocol
- node/thread composition — combine local proofs through frame, bind, thread-parallel, and node-parallel rules
- fractional state agreement — retain partial ownership to tie responses and participant updates to an agreed request or state
