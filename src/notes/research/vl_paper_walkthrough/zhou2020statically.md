# Statically verified refinements for multiparty protocols
(authored by agents unless marked 🧑)
Tag: `zhou2020statically`, [paper](https://doi.org/10.1145/3428216)

## result

RMPST extends multiparty session types with logical refinements on message data. Session⋆ accepts a Scribble global protocol, projects local types, generates F⋆ APIs, and asks the F⋆ checker to establish both communication and data constraints. The paper’s central claim is: “We provide an implementation of RMPST, in a toolchain called Session⋆, using Scribble, a multiparty protocol description toolchain, and targeting F⋆, a verification-oriented functional programming language.” (abstract, page 1). Its counting example sends a nonnegative `count`, then exactly `count` `Hello` messages, then `Finish`; recursive variables and predicates express the relationship between the payload and the control flow.

## technique 1: refinement types in global and local protocols

Use refinements when a protocol’s legal next message depends on values already exchanged. Write a base payload type plus a predicate, such as `count : int{count ≥ 0}`. Add a recursion variable carrying the current count, initialize it (`curr := 0`), increment it on each recursive `Hello`, and guard branches with predicates (`curr = count` for `Finish`, `it = count` for the payload). Project the global type to each participant; the resulting local types preserve the predicates needed by that endpoint. The paper explains, “The reﬁnement curr = count in the Finish branch speciﬁes that the branch may only be taken at the last iteration.” (introduction, page 2).

F⋆ checks predicates by translating them to SMT formulas for Z3. Indexed types carry protocol state into generated payload types. Dependent functions and effects separate proof-relevant state from executable effects. A HigherLower example encodes `higher`, `lower`, `win`, and `lose` branches using conditions on a secret number, current guess, and attempt counter. An impossible refinement makes a protocol branch unconstructible, so protocol flow is enforced by type checking rather than a runtime test.

Verus form (Inference): use a Rust `struct` for protocol state and `spec fn` predicates such as `valid_count` and `can_finish`; attach `requires` to send/receive methods and `ensures` to update the state. Preserve the recursive counter with a loop `invariant`, and prove each branch’s guard before constructing its message enum. Verus can express arithmetic and state predicates, but the F⋆ refinement solver, indexed types, and effect system do not carry over directly. The translation to Verus is an inference from the examples, not a claim made by the paper.

## technique 2: callback APIs for static linearity

Use callback-style APIs when a functional or otherwise statically typed language lacks linear channels. Generate one state type per CFSM state, containing known payloads and recursion variables. For each input edge generate a callback `state -> refined_payload -> unit`; for a single output generate `state -> refined_payload`; for an output choice generate an indexed sum whose constructors are exactly the legal labels. The user supplies callbacks but never receives the communication channel. A generated runtime owns connections, performs I/O, calls the callback for the current state, builds the successor state, and repeats. The authors emphasize, “The inversion of control allows us to dispense with linearity checking, because our approach does not expose communication channels to the user.” (introduction, page 3).

For a receiving state, generated code reads a label, decodes it, receives the payload, uses F⋆ `assume` to reattach the protocol refinement, invokes the corresponding callback, and constructs the next state. For a sending state, it invokes the choice callback, sends the label and payload, records the payload in the next state, and recurses. Internal `run_q` functions are hidden from the developer, so the generated control flow cannot be altered through ordinary code. This makes linear use of channels a construction property.

Verus form (Inference): make the connection and protocol-state token private to a Rust module; expose callback-like functions receiving only a ghost/spec state and concrete payload. A verified driver owns the channel, uses `requires`/`ensures` on each transition, and maintains an `invariant` over the state token. If channel effects are outside the model, mark only the narrow external boundary and prove the protocol state around it; do not claim that an `external_body` function itself is verified. The paper’s F⋆ `assume` step is a trust boundary; in Verus it should correspond to a proved conversion lemma or an explicitly documented external assumption.

## technique 3: erased variables carry latent knowledge

Projection normally drops interactions involving other roles. That is unsound for refinements when a role needs facts about an unknown value. Session⋆ retains the fact as an erased, refinement-typed variable. In HigherLower, participant C cannot know secret `n`, but receives a type carrying `n > x` after a `higher` message. C can therefore prove that `x + 1` remains below 100 without using `n` computationally. F⋆’s erased type is distinct from `int`; `reveal` produces a Ghost value, and Ghost effects cannot mix with callback ML effects. The paper says, “the type-checker can still take advantage of the reﬁned types of erased variables to prove properties of the endpoint implementation; however, these variables cannot actually be used computationally.” (section 3.2, page 10).

Verus form (Inference): store unknown protocol facts in `ghost` variables or proof-only state, expose lemmas that consume those facts, and keep executable functions independent of them. Prove that no ghost value flows into an executable return or channel payload. This approximates the paper’s erased/Ghost discipline; exact F⋆ effect typing is not a Verus construct.

## evidence, limits, and VL relevance

The metatheory proves trace equivalence of global and projected local types (Theorem 4.10), preservation of well-formedness (Theorem 4.12), progress (Theorem 4.14), and type safety (Theorem 4.15). The implementation evaluates HigherLower, a buyer/seller protocol, and other examples from session-type literature. Experiments use a 0.340 ms network latency, repeat each measurement 30 times, and cap the parameter at 25 because larger generated types use unreasonable resources (section 5, pages 24–25). The generated implementation is compared with a bare implementation using the same connection primitives; the paper concludes overhead is small, while noting network fluctuations. It does not report a single universal overhead number in the text excerpt.

Trusted elements include F⋆/Z3, generated runtime and transport, the `assume` used to restore refinements after decoding, cryptographic or network libraries, and the correctness of the Scribble input. The paper’s proofs cover the RMPST calculus and generated endpoint shape, not arbitrary external code. Inference: VL can reuse the separation between protocol state and business logic, but a Verus integration must prove the decoder-to-refinement conversion and channel ownership explicitly. Existing RMPST already addresses value-dependent session protocols and callback linearity; VL should not recreate those claims without a Rust/Verus-specific contribution.

## techniques for the catalog

- refinement-typed MPST: attach logical predicates to payloads and recursion state, then statically reject data-dependent protocol violations
- callback linearity: hide channels behind generated state callbacks so the runtime owns exactly-once communication
- erased latent facts: preserve unknown third-party values as proof-only refinements while preventing their computational use
- generated CFSM executor: generate hidden per-state runners that perform labels, payloads, callbacks, state updates, and termination
Checked 2026-10-14: audit record zhou2020statically; paper-study comparison complete; gate executed; experiments not rerun
