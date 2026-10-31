# Verified Lock-Free Session Channels with Linking
(authored by agents unless marked 🧑)
Tag: `somers2024verified`, [paper](https://doi.org/10.1145/3689732)

## scope and result
Inference: The paper’s target is an end-to-end proof connecting session-typed message-passing programs to a lock-free heap implementation. Its stated architecture is layered: atomic heap operations, two queue implementations, bidirectional channels, and Actris dependent separation protocols. The mechanization is in Coq/Iris/Actris.

> “We address this problem by verifying a low-level lock-free implementation of session channels w.r.t. a high-level specification based on session types.” (Abstract, p. 1)

> “We carry out our verification in a layered manner by employing the Iris framework for concurrent separation logic.” (Abstract, p. 1)

Inference: Use the layers when a verified Rust component has a concurrent representation whose clients need a protocol-level contract. Prove each lower implementation against a representation predicate, then prove the next layer only against that contract; this permits replacing linked lists by array segments without rewriting the channel proof.

## technique: dependent protocol specifications
Inference: Represent an endpoint by a channel assertion `c ↣ prot`. A protocol is a sequence of sends `!⟨v⟩`, receives `?⟨v⟩`, resources `{P}`, and `end`; its dual swaps send and receive. For a value-dependent protocol, quantify variables and let later protocol/resource expressions depend on them. The paper’s `service` example receives positive integers and sends back their sum once it receives a non-positive value (Sec. 2.1, p. 6).

> “For this we use the channel ownership assertion c ↣ prot, which describes that a channel endpoint c sends and receives messages according to Actris’s dependent separation protocol prot.” (Sec. 2.1, p. 6)

Inference: Apply it by (1) writing the protocol and its dual, (2) assigning one endpoint assertion to each thread, (3) instantiating quantified variables at each send/receive, (4) transferring the listed separation resources with the message, and (5) proving the continuation assertion. For the paper’s `prog 2`, the protocol records `20`, `22`, `0`, then `42`; the assertion after each call is the remaining protocol. The protocol-level values and resources are ghost state, not runtime payloads.

> “Neither the quantified variable n, nor the resources are physically sent over the channel, as they only exist during verification.” (Sec. 2.1, p. 7)

Inference: In Verus, encode the protocol state as ghost data and use `requires`/`ensures` on wrapper functions; use `tracked` permissions or ghost maps for ownership. This is an inference because the paper uses Iris propositions and Coq, not Verus. Verus does not directly provide Actris protocols, so the protocol transition relation and endpoint uniqueness must be defined as ghost predicates and proved around each operation.

## technique: lock-free queue and channel construction
The paper implements a unidirectional queue with separate dequeue and enqueue handles (Sec. 3.2, pp. 10–11). Linked-list nodes have 3 adjacent locations (tag, value, next) and an integer tag `NIL` (0), `CONS` (1) or `LINK` (2); `enqueue` allocates a fresh NIL node, writes the current tail node's next pointer and value, then writes its tag CONS, then moves the enqueue handle. `dequeue` retries while the head node is NIL (empty queue), returns the value of a CONS node, and skips a LINK node by following its next pointer. `link_queue` writes the other queue's head into the current tail node's next field and then sets that node's tag to LINK. The array-segment variant (Sec. 3.3, p. 11) uses fixed-length segments whose first 3 fields hold start and end indices and a next-segment pointer; enqueueing to a full segment allocates a new one, and linking sets the next field to the other queue's first segment. A bidirectional channel is two such queues, with each endpoint holding one dequeue and the opposite enqueue handle.

> “Thread safety depends on there being a single reader (that uses the dequeue handle) and single writer (that uses the enqueue handle), which will be enforced by the session-type discipline of Actris. For thread safety it is crucial that enqueue and link_queue update the tag last.” (Sec. 3.2, p. 11)

Inference: The ordering is the algorithmic invariant: readers never observe a published tag before the node fields are initialized. The paper's proof makes the CONS tag store the enqueue linearization point (Sec. 4.5, p. 16). In Verus, prove a queue predicate tying handles to a ghost sequence; use atomic operations and a loop invariant for retry/skip, and state the single-reader/single-writer assumption explicitly. The exact HeapLang code does not carry over, but the node state machine and publication order do.

> “We implement lock-free bidirectional channels as a pair of two single-reader/single-writer queues.” (Sec. 3.4, p. 11)

## technique: linearizability with invariants and logically atomic triples
Inference: A sequential queue predicate `Q d e vs` ties concrete handles to an abstract list. Concurrent clients cannot split one `Q` between threads, so place it in an Iris invariant, which is duplicable and opened only around physically atomic operations. For an operation with a single linearization point (the paper's example is the successful CAS in `incr`, Sec. 4.3, p. 14), specify a logically atomic triple (LAT): the abstract precondition may vary until the linearization point, where it atomically changes to the postcondition. Verify the implementation once against the LAT, then instantiate it under any client invariant. The paper's queue LATs (Sec. 4.4, p. 15) keep the non-shareable handles `Deq d` and `Enq e` in private pre/postconditions and `Q d e vs` in the atomic ones; `link_queue` takes a Boolean `b` because whether it links two queues or both ends of one queue can depend on other threads.

> “To share resources such as the queue representation predicate Q between threads, Iris provides invariants P corresponding to a proposition P that holds at all times (i.e., invariantly).” (Sec. 4.2, p. 13)

> “A LAT is encoded as a Hoare triple, but with an atomic update” (Sec. 4.3, p. 14)

> “The atomic update describes the update at the linearization point.” (Sec. 4.3, p. 14)

Inference: In Verus, the analogue is a ghost abstract sequence plus an atomic operation proof whose postcondition updates that sequence; use `atomic_with_ghost` where available and loop invariants for retries. This mapping is an inference; the Iris mask, later modality, and LAT syntax do not transfer verbatim.

## technique: ghost linking and pairing invariants
Linking changes which endpoints are paired, so an invariant that fixes the other endpoint does not extend to linking (Sec. 6.1, pp. 21–22). Channel `link` calls `link_queue` twice, so it has no single physical linearization point (Sec. 5, p. 17). The paper's ghost linking (Sec. 5.1, 5.3, pp. 17–20) separates logical from physical linking: a ghost queue denotes a chain of queues still to be physically linked; the ghost update make-ghost-link merges two ghost queues into one with concatenated messages and yields a link permission `e1 ⇝ d2`, which is later consumed by the Hoare triple for the physical `link_queue` call; make-ghost-link-self turns a chain into a cycle. Because these are ghost updates, not program steps, both channel directions are linked logically at one linearization point. One shared invariant `Qctx` holds all chains and cycles; a ghost map (authoritative token plus one fragment per dequeue handle) represents ghost queues, and a ghost set of links represents link permissions. Separately (Sec. 6.2, pp. 22–23), a pairing invariant over a relation `R a b` that must be irreflexive, symmetric, and unique hands out a token `Tok a` per party without fixing its partner. `pair-update` gives temporary access to `R a b` from `Tok a`; `pair-update-2` with tokens for `b` and `c` returns either `R b c` (if paired with each other) or `R a b` and `R c d`, and the caller then either returns them unchanged or gives up `True` or the joined `R a d` respectively. The channel `link` proof uses `pair-update-2` plus a new Actris rule proto-join (Sec. 6.1, 6.3, pp. 21–24).

> “We introduce a new form of invariant—called a pairing invariant—which supports sharing resources between two paired parties, even when the pairing of the parties themselves can be changed.” (Sec. 6.2, p. 22)

> “The uniqe property ensures that we cannot have multiple pairings with the same party.” (Sec. 6.2, p. 22)

Inference: Use this pattern when a verified object can be spliced or relinked while clients retain endpoint handles. In Verus, represent the pairing map as a ghost finite map and prove symmetry, irreflexivity, and uniqueness; endpoint tokens are tracked ghost capabilities. This is an inference, because Verus has no Iris ghost algebra with `pair-update-2`.

## technique: higher-order protocols and later credits
Sending a channel endpoint requires an impredicative protocol that carries a channel assertion as a resource. Recursive protocols are interpreted with step-indexing, which introduces later modalities. The rule proto-join needs |v2|+|v3| later eliminations (the number of buffered messages involved), but all must be eliminated at the single linearization-point step, whereas vanilla Iris eliminates one later per program step (Sec. 7, p. 25). The time receipts are stored in the channel pairing invariant, so the Actris-style specifications do not expose them (Sec. 7, p. 26). The paper uses non-persistent time receipts and later credits to pay those eliminations.

> “The key change is the definition of dependent separation protocols. These can no longer be simple first-order structures, but need to be defined in such a way that impredicative quantifiers are allowed and arbitrary Iris propositions (including channel ownership and Hoare triples) can be put into the resource {P} part of protocols.” (Sec. 7, p. 25)

> “The time receipt Û n keeps track of the number of steps the program has performed, and the later credit £n gives permission to eliminate n laters.” (Sec. 7, p. 25)

Inference: Verus users should avoid pretending that recursive protocol unfolding is free: carry a ghost fuel/credit measure when a proof joins or rewires buffered state. This is an inference; Verus’s SMT proof model differs from Iris step-indexing.

## techniques for the catalog

- layered channel verification — prove queues, channels, and protocols against successive abstraction contracts
- dependent separation protocols — make sends, receives, and transferred ownership depend on ghost values
- single-reader/single-writer lock-free queues — publish initialized nodes with tag-last updates and compose two queues into a bidirectional channel
- invariants and logically atomic triples — share concurrent state and hide a linearization point behind an abstract atomic specification
- ghost linking and pairing invariants — change endpoint pairings through unique ghost tokens and a pairing map
- higher-order protocols with later credits — carry channel assertions in recursive protocols and pay buffered unfolding obligations
