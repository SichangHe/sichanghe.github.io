# Rusty Variation: Deadlock-free Sessions with Failure in Rust
(authored by agents unless marked 🧑)
Tag: `kokke2019rusty`, [paper](http://arxiv.org/abs/1909.05970v1)

## scope and claim

Rusty Variation (RV) is a Rust library that encodes session-typed communication. The abstract claims: “Programs written using RV are guaranteed to respect a specified protocol, and are guaranteed to be free from deadlocks and races.” (Abstract, p. 48). The design is an implementation of Exceptional GV (EGV), adapted to Rust's affine ownership, `Option`-based failure, implicit cancellation on drop, and general recursion. The paper presents the interface and examples; it does not yet provide a mechanized proof of the Rust implementation. The authors explicitly list formal verification as future work (Section 4.2, pp. 58–59).

Inference: RV is a type-level protocol discipline, not a functional-correctness verifier. It can prevent certain communication-order errors at compilation, but its guarantees depend on using the restricted API and on assumptions about destructors, thread creation, and nontermination.

## technique 1: type-level session protocols and duality

What it is. The primitive session types are `Send<T,S>`, `Recv<T,S>`, and `End`. The continuation `S` is itself constrained by the `Session` trait. The trait has an associated dual and a constructor:

```rust
pub trait Session {
  type Dual: Session<Dual=Self>;
  fn new() -> (Self, Self::Dual);
}
```

(Section 2.1, p. 49). `Send<T,S>` is dual to `Recv<T,S::Dual>`, and `End` is self-dual. The `Dual=Self` constraint makes duality involutive. Session constructors are public as types but their member functions are hidden, so users cannot construct malformed endpoints (Section 2.1, p. 49).

When to use it. Use a type-level protocol when a channel has a fixed sequence of message directions and payload types. Encode each expected message as a nested continuation, and derive the client type by duality from the server type.

How to apply it.
1. Define the protocol as nested `Recv`/`Send`/`End`, e.g. `type SqrSrv = Recv<i32, Send<i32, End>>` (Section 2.1, p. 49).
2. Obtain the peer type with `SqrSrv::Dual` (p. 49).
3. Create endpoints through `fork` or the hidden `new`; the two endpoints have dual types (Sections 2.2 and 2.7, pp. 49–55).
4. Consume each endpoint operation linearly, receiving the continuation returned by `recv` or the new continuation returned by `send` (Section 2.2, p. 49).

Verus form. Inference: represent a protocol as a ghost inductive state or a type parameter and expose transition lemmas `send_step` and `recv_step`. Use `requires` to require the current protocol state and `ensures` to return the continuation state. Verus cannot enforce Rust trait-level duality automatically; state duality as a ghost relation and prove involution lemmas. Inference: ordinary Verus `ensures` can prove payload postconditions but does not itself make runtime channel endpoints affine; Rust's ownership checker remains part of the trusted enforcement boundary.

Evidence and limits. The paper gives examples where reusing `s` after passing ownership to `send` fails to compile because Rust is affine (Section 2.3, p. 50). Dropping a session is permitted by affine Rust, so protocol completion is not forced by the type checker; RV handles this with cancellation (Section 2.3, pp. 50–51).

## technique 2: failure-aware send, receive, close, and fork

The interface has `send`, `recv`, `close`, and `fork`:

```rust
pub fn send<T, S: Session>(x: T, s: Send<T, S>) -> S
pub fn recv<T, S: Session>(s: Recv<T, S>) -> Option<(T, S)>
pub fn close(s: End) -> Option<()>
pub fn fork<S: Session>(p: P) -> S::Dual
  where P: FnOnce(S) -> Option<()>
```

(Section 2.2, pp. 49–50). Sending is nonblocking and does not fail; receiving blocks and returns `None` if the peer cancels. Closing is synchronous: it blocks until the dual endpoint closes and returns an error if the channel is cancelled. `fork` spawns a thread running one endpoint and returns the dual endpoint; a child failure cancels all open sessions in that child (Section 2.2, p. 50).

How to apply it. Fork a closure typed with one endpoint, then use `send`/`recv` to follow the nested protocol, propagate `Option` with `?`, and call `close` only at `End`. The paper's ping example forks a sender, sends `()`, closes its endpoint, receives `()`, and closes the peer (Section 2.2, p. 50).

Verus form. Inference: model `send` and `recv` as state transitions on a ghost protocol plus a runtime channel handle. Prove that `recv` returning `Some` advances to the declared continuation and `None` corresponds to a ghost cancelled state. A verified wrapper would need a concurrency model for `fork`; Verus alone does not prove the scheduler or channel implementation.

## technique 3: affine cancellation and destructor-based failure

What it is. Since Rust values can be dropped, RV treats dropping a session as cancellation, following EGV's affine semantics. Endpoint destructors decrement a reference count initially set to two. When it reaches one, the session is marked disconnected; sending then drops the payload, while receiving and closing return `None`. At zero the session memory is deallocated (Section 2.3, pp. 50–51). The API annotates session types with `#[must_use]` to warn on accidental drops and offers `cancel(x)` as an explicit spelling whose implementation simply drops its argument (Section 2.3, p. 51).

When to use it. Use implicit cancellation to make peer failure observable and prevent another process from waiting forever. Use `cancel` when termination is intentional and should not trigger a warning. Treat `Option` failure as part of every protocol operation that can observe cancellation.

The paper's two equivalent examples show a child either forgetting its endpoint or calling `cancel`; the parent's `recv` fails, `?` short-circuits, and the program returns `None` (Section 2.3, p. 51). The implementation relies on crossbeam-channel's one-shot channel drop behavior, so cancellation is inherited from that library (Section 2.3, p. 51; Section 2.6, pp. 54–55).

Verus form. Inference: use a ghost reference-count and cancellation bit with invariants stating that a cancelled endpoint cannot produce a successful receive. Destructors are not a Verus proof event; expose an explicit `cancel` operation in verified code and document that `Drop`/panic paths are trusted or modeled. Inference: a verified product should avoid relying solely on destructor execution because the paper itself notes `std::mem::forget` and reference cycles.

Evidence and limits. Rust does not guarantee that destructors run if memory is leaked. The authors state: “The biggest issue lies in the fact that Rust’s semantics do not guarantee that the destructors are actually run.” (Section 2.7, p. 55). `std::mem::forget` and safe reference cycles can therefore bypass cancellation. The guarantee also weakens when users access `new` and spawn threads manually: the paper says “using new and std::thread::spawn, it becomes easy to write code which deadlocks.” (Section 2.7, p. 55).

## technique 4: typed branching and homogeneous selection

Binary choice is encoded with `Either` continuation values. `Choose<S1,S2>` is `Send<Either<S1,S2>,End>`, and `Offer<S1,S2>` is the corresponding receive type. `choose_left` creates a fresh `S1` session, sends one endpoint, cancels the original continuation, and returns the other endpoint (Section 2.4, pp. 51–52). Cancelling rather than synchronously closing is required because the continuation is `End` and `choose` must remain asynchronous. Macros `choose!` and `offer!` generalize binary nesting to enum-labelled branches; the calculator example uses `CalcOp::Sqr` and `CalcOp::Neg` (Section 2.4, pp. 52–53).

Selection uses `select_mut` over `Vec<Recv<T,S>>`, returning the first completed receive and removing its endpoint (Section 2.5, pp. 53–54). The operation is homogeneous: all endpoints have the same payload and continuation type. This avoids the unchecked completion rules of the underlying `crossbeam_channel::Select`, but heterogeneous selection is not covered by EGV's guarantees (Section 2.5, p. 54).

Verus form. Inference: represent branch labels as an enum and prove that each branch continuation matches the corresponding protocol state. For `select_mut`, specify a ghost vector permutation invariant: exactly one endpoint is removed and its continuation is returned. Heterogeneous existential endpoint types would require a richer encoding than the paper provides.

## implementation and proof boundary

RV uses crossbeam one-shot channels. Every `send` allocates the continuation session `S`, sends `(value, dual_endpoint)`, and returns the local endpoint; `recv` receives `(value, continuation)`. `End` uses two asynchronous channels to emulate synchronous close: each side sends a unit and then blocks receiving the peer's unit (Section 2.6, pp. 54–55). The paper says the interface, rather than this particular channel backend, is the key contribution.

The authors unit-test EGV use cases, but state that tests are insufficient for complete coverage. They plan a formal concurrent lambda calculus, “formal RV,” and intend to prove preservation, progress, termination, confluence, the diamond property, and deadlock/livelock freedom, then establish operational correspondence with EGV and property-based correspondence with Rust (Section 4.2, pp. 58–59). These are plans, not results. The library also extends beyond EGV with recursion and selection; formal verification would require extending EGV accordingly (Section 4.3, p. 59).

## implications for VeruLaw

Inference: RV shows a useful product pattern for verified Rust agents: put protocol state in types, make each communication step return a typed continuation, and model cancellation as an explicit protocol state. This can complement Verus proofs of payload invariants. It does not replace Verus proofs of implementation correctness, liveness under arbitrary scheduling, or behavior after leaks and panics.

Inference: the threat to a product of agent-written verified Rust is concentrated at unsafe boundaries around channel backends, destructor behavior, `std::mem::forget`, reference cycles, exposed endpoint constructors, and nontermination. Existing work already supplies a Rust API and concrete examples for typed sessions; VL should not redo the interface design. The unfinished part is the formal correspondence between Rust implementation and EGV, exactly the work the authors list as future.

## techniques for the catalog

- dual session types: encode message direction, payload, and continuation in nested `Send`, `Recv`, and `End` types with an involutive `Dual`
- affine cancellation: interpret endpoint drop as cancellation, propagate disconnection through `Option`, and warn on accidental drops with `#[must_use]`
- typed branching: encode choices as enum-labelled continuation sessions and cancel the consumed continuation after asynchronous selection
- homogeneous selection: select among same-typed receiving endpoints while removing the chosen continuation from the vector
- one-shot channel implementation: send each continuation endpoint with its payload and emulate synchronous close with two unit channels
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
