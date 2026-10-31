# Actris 2.0: Asynchronous Session-Type Based Reasoning in Separation Logic
(authored by agents unless marked 🧑)
Tag: `hinrichsen2022actris`, [paper](https://doi.org/10.46298/LMCS-18(2:16)2022)

Actris 2.0 is a concurrent separation logic for proving functional correctness of asynchronous message-passing programs that also use higher-order functions, mutable references, forked threads, shared channels, and locks. Its central technique is to put a dependent protocol on each channel endpoint. A protocol says which value is sent or received next and which separation-logic resources move with that value. The paper then adds subprotocols, a preorder that permits safe asynchronous reordering and resource rearrangement. The theory is modeled in Iris and mechanized in Coq.

## dependent separation protocols

What it is. A channel assertion `c ↣ prot` owns endpoint `c` and records a stream of send (`!`) and receive (`?`) actions. Each action binds logical variables, describes a payload, attaches a proposition `P` for resources transferred with the payload, and names the continuation protocol. The paper states: “Dependent separation protocols are streams of ! ~x :~τ hvi{P }. prot and ?~x :~τ hvi{P }. prot constructors that are either infinite or finite, where finite streams are ultimately terminated by an end constructor.” (§1.2, p. 3). This makes protocol state and heap ownership one specification.

When to use it. Use this when message validity depends on earlier messages, when a message carries ownership of a reference, or when a protocol must transfer a function or another channel. A plain session type records only payload types. Actris can state that the second value equals the first plus two, or that a receiver owns a location while it updates it.

How to apply it.

1. Create dual endpoint assertions at channel allocation. For a channel that sends 42 to the receiver, write `c ↣ ?h42i{True}. end` and its dual `c0 ↣ ! h42i{True}. end` (§1.2, pp. 3–4). The paper gives the exact example: “These protocols state that the endpoint c expects the number 42 to be sent along it, and that the endpoint c0 expects to send the number 42.”
2. Bind data in the protocol where it is sent. For the program that sends 40 and then receives the incremented value, use `c ↣ ! (x : Z) hxi{True}. ?hx + 2i{True}. end` (§1.2, p. 4). The send instantiates `x`; the receive checks the expression using that bound value.
3. Put ownership in the payload proposition. For the mutable-reference example, use `c ↣ ! (` : Loc) (x : Z) h`i{` 7→ x}. ?h()i{` 7→ (x + 2)}. end` (§1.2, pp. 4–5). Sending consumes ownership of the location; the receiver updates it and sends ownership back with the notification.
4. Use guarded recursive protocols for repeated interaction. The paper’s loop uses `c ↣ µrec. ! (x : Z) hxi{True}. ?hx + 2i{True}. rec` (§1.2, p. 5). The recursive variable is under the contractive send/receive constructor.
5. For delegation, place endpoint ownership inside the message proposition, such as `c1 ↣ ! (c : Val) hci{c ↣ ! (x : Z) ...}. ...` (§1.2, p. 5). In the paper’s words, “the main thread must give up ownership of the channel endpoint c2, thereby delegating it.”
6. For higher-order values, bind a function and its Hoare-triple resources. The paper sends `f` together with precondition `P` and postcondition `Q`, then receives a function that returns a value two larger (§1.2, p. 6).

Verus form. Inference: model protocol state as a ghost enum or ghost sequence and channel ownership as a `Tracked` token; model each send/receive operation as an executable `fn` whose `requires` consumes the current protocol state and whose `ensures` returns the next state and the payload relation. A `spec fn` can state the relation between the sent and received values, and a `proof fn` can establish that the transition preserves it. Inference: Verus does not provide Actris’s separation-logic channel connective or impredicative protocol quantification, so the endpoint library and resource-token discipline would have to be written first. Inference: mutable-reference ownership can be represented by a ghost representation tied to the executable borrow, but the exact Actris transfer rules do not carry over automatically.

Evidence. The authors prove “functional correctness of a variety of examples, including a channel-based merge sort, a channel-based load-balancing mapper, and a variant of the map-reduce model” and report that they mechanised “all examples in the paper, in the Coq proof assistant” (abstract, p. 1). Fig. 22 (p. 49) gives approximate Coq sizes: 250 lines for the coarse-grained merge sort, 300 for the fine-grained one, 200 for the load-balancing mapper, 300 for map-reduce, and 5000 for the whole development. For merge sort, they specify a comparison function and a list representation, then prove the client postcondition that the output is sorted. The paper says: “The proof of these specifications is almost entirely performed by symbolic execution using the rules Ht-new, Ht-send, Ht-recv, and the standard separation logic rules.” (§5.1, p. 20). The evidence is mechanized proofs, not a measured bug-detection study. The proofs establish safety and postcondition validity (§3.4, §4.3, p. 16 and p. 18).

Failure and assumptions. The endpoint protocol must match the actual communication and resource ownership. The paper states that Actris does not rule out deadlock: “using Actris one can prove Hoare triples for programs that deadlock, for example: {True} let (c, c0 ) ::= new chan () in recv c {True}” (§4.3, p. 18). The safety notion “is not concerned with whether a program terminates (total correctness)” (§3.4, p. 16), and the paper says Actris “guarantees partial correctness” (§11.3, p. 58). Inference: the guarantees also rest on Iris, on Coq and its libraries, and on the mechanized development being sound, and a verified protocol says nothing about whether the specification captures the product requirement.

## subprotocols for asynchronous composition

What it is. Actris 2.0 adds `prot1 v prot2`, a logical subprotocol relation inspired by asynchronous session subtyping. It weakens exact duality: independent sends may move ahead of receives, variables can be reordered, and ownership can be moved between protocol messages. The paper’s motivating rule is that, in session subtyping, “sends can be swapped ahead of receives ?T.!U.S <: !U.?T.S” (§1.3, p. 6).

When to use it. Use subprotocols when one endpoint legally buffers a message before consuming an earlier one, or, in the paper’s words, “whenever we want to reuse existing specifications that might use a syntactically different protocol, but that nonetheless logically entail each another” (§1.3, p. 7). Do not swap a send that depends on a variable bound by the receive it would overtake.

How to apply it.

1. Pick the protocol for the channel so that one endpoint satisfies it directly. In `prog 7` the main thread satisfies `c ↣ ! (x : Z) hxi{True}. ?h20i{True}. ?hx + 2i{True}. end` and the forked thread does not (§1.3, p. 7).
2. Identify an independent send. In `prog 7`, the first send of 20 does not depend on `x`; the second send `x + 2` does (§1.3, pp. 6–7).
3. Apply the swapping rule only to the independent action. The paper derives `?(x : Z) ... ! h20i ... ! hx + 2i ... v ! h20i ... ?(x : Z) ... ! hx + 2i ...` (§1.3, p. 7).
4. Weaken the endpoint with the channel-ownership monotonicity rule `v-chan-mono` (Fig. 11, p. 28), then continue with ordinary send/receive proof rules. The paper’s derived general swap rule `v-swap'` carries the side condition that the receive’s variables do not bind into the send and vice versa (§6.1, p. 27).
5. For reusable protocol composition, use the relation to move a resource into a later message or to change binder order. The paper gives a conditional example that moves ownership `ℓ01 7→ 20` into a protocol while instantiating a location variable (§1.3, p. 7).
6. For recursive protocol equivalence, use the coinductive subprotocol relation with Löb induction (§1.3, p. 7; §6.4, pp. 32–34).

Verus form. Inference: encode a protocol as a ghost state machine whose transition relation admits a queue of pending independent sends. A `proof fn` can show that moving an action earlier preserves an observational relation, with `requires` expressing that the action does not read the receive-bound variable and `ensures` relating the two ghost traces. The concrete Rust channel still needs an executable FIFO implementation and a verified refinement lemma. Inference: this is a weaker and more explicit construction than Actris’s coinductive proposition; Verus has no direct subprotocol connective.

Evidence. The subprotocol section proves a mapper whose client sends all requests up front while the service handles one at a time (§6.2, pp. 29–31), and proves composition of a list-reversal service and client whose protocols use different list predicates (§6.3, pp. 31–32). Fig. 22 (p. 49) gives roughly 400 lines of Coq for the mapper with swapping and 100 for list reversal. The paper reports no timing or benchmark for these proofs. Its evidence is the mechanized Coq proofs.

Failure and assumptions. The swap rule applies only when the send does not depend on the logical variables of the receive (§1.3, p. 6; §6.1, p. 27). The paper’s channels are “binary”, “asynchronous”, “bidirectional”, “reliable” and “order preserving”, with buffers of unbounded size (§2.4, p. 11). Inference: the relation is a logical abstraction over those buffers, so it says nothing about a real transport that drops or reorders messages or has bounded capacity unless that is separately modeled.

## reusable proof pattern for verified services

The merge-sort case study shows a practical workflow. First define an interpretation predicate from mathematical elements to heap values, a total ordering relation, and a list ownership predicate. Then write a protocol with an arbitrary suffix so the service can be embedded in a larger protocol. The paper explicitly says the suffix is important “so they can be embedded in other protocols” (§5.1, p. 20). Prove the service and client with symbolic execution, using the channel rules and ordinary separation-logic rules; prove recursive services by guarded recursion and Löb induction; prove a fine-grained stream protocol by carrying the sent prefix and received prefix as protocol indices. In the fine-grained sorter, the receive phase maintains that each returned element is greater than all previously returned elements, while a permutation condition ensures that every sent element is accounted for (§5.6, pp. 23–25).

Verus form. Inference: use a ghost `Seq` for the input and output history, a `spec fn` for sortedness and permutation, and loop `invariant` clauses for the sent and received prefixes. Executable Rust functions can send one element at a time; their `ensures` clauses relate each transition to the ghost state. A separate `proof fn` establishes the merge invariant. What changes is that Verus requires explicit invariants and ownership APIs; what remains is the paper’s decomposition into a local service contract, a protocol invariant, and a top-level refinement theorem.

## locks, ghost state, and shared channels

What it is. Actris combines channel protocols with Iris locks and user-defined ghost state so several workers can share one endpoint without duplicating protocol ownership. A lock guards an existential protocol state and an authoritative count of outstanding contributions. The paper states: “The resources R that are protected by the lock are therefore invariant in-between any of the critical sections.” (§7.1, p. 34).

How to apply it.

1. Put the channel assertion and a ghost authority in a lock invariant, for example `is lock lk (∃n. authγ n ∗ c ↣ lock prot n)` (§7.1, p. 35).
2. Allocate one contribution token per worker. `authγ n` records the count; `contribγ` proves that a worker is still active.
3. At a critical section, acquire the lock, use the endpoint protocol, update the authority and consume or allocate a contribution token, then release the lock (§7.1, pp. 35–36).
4. For a load-balancing mapper, extend the authority and contribution resources with multisets. The multiset records values currently assigned to workers; the last worker may request more work only when the multiset is empty (§7.2, pp. 36–38).
5. Prove the client result as a permutation of `flatMap f` over the input. The worker proof uses the contribution token to establish that the protocol has not terminated, then applies `AuthM-add` and `AuthM-remove` before restoring the lock invariant (§7.2, p. 38).

Verus form. Inference: represent the lock invariant as a ghost state object protected by a verified mutex API, and represent `authγ` and `contribγ` with `Tracked` tokens. Each worker function’s `requires` takes a contribution token; its `ensures` returns the updated token and multiset relation. Inference: Verus does not provide Actris’s Iris resource algebra, so the authority/contribution algebra would need proof functions for allocation, agreement, and removal.

The map-reduce case study composes the fine-grained sorter and mapper. Its specification is `(flatMap g) ◦ group ◦ (flatMap f)` over lists (§8.1, p. 39), while the implementation distributes map, shuffle, and reduce work over forked threads. The paper explicitly excludes network failure, restarting, and rescheduling from this single-machine variant (§8, p. 38). Inference: a Verus product proof would need separate contracts for each worker phase and a ghost multiset or map to relate intermediate results to the final grouped output.

## what is proved, measured, and trusted

The paper builds a model of protocols, subprotocols, channel ownership, and the ghost theory as definitions in Iris, and proves the Actris rules as lemmas (§9, pp. 40–47). Adequacy of Actris (Theorem 9.1) is “an immediate consequence of Iris’s adequacy theorem” (§9.6, p. 47). It mechanizes the logic, its model, tactics, and all examples in Coq, about 5000 lines in total (§10, pp. 48–49, Fig. 22). Inference: the trusted base therefore includes Coq, Iris and its adequacy theorem, HeapLang’s operational semantics (Fig. 1, p. 10), and the truth of user-written predicates and specifications; the channel implementation (§2.4, Fig. 3) is HeapLang code that the paper proves against the rules (§9.5), not an assumption. The paper reports no runtime overhead or fault-finding rate. Inference: for an agent-written verified Rust product, Actris’s strongest lesson is an API design pattern: make communication protocols and resource transfers explicit before generating implementation code. The main threat is a wrong or incomplete protocol that still verifies; asynchronous reordering also makes a superficially plausible trace insufficient evidence of safety.

No earlier study in the walkthrough notes covers Actris 2.0’s protocol and subprotocol techniques.

## techniques for the catalog

- dependent separation protocols: attach dependent send/receive streams and resource propositions to channel endpoints
- resource-carrying delegation: transfer references, functions, or channel endpoints by placing their ownership assertions in message propositions
- guarded recursive protocols: use contractive recursive protocol states to verify repeated services
- asynchronous subprotocols: prove safe send-before-receive reorderings and extensional protocol composition
- protocol-indexed invariants: index a fine-grained protocol by sent and received histories to preserve sortedness and permutation facts
- lock and ghost accounting: share endpoint protocols with lock invariants and authoritative contribution tokens
