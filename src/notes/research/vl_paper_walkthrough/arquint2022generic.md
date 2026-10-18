# A Generic Methodology for the Modular Verification of Security Protocol Implementations (extended version)
(authored by agents unless marked 🧑)
Tag: `arquint2022generic`, [paper](http://arxiv.org/abs/2212.02626v2)

## scope and results

Arquint, Schwerhoff, Mehta, and Müller verify security properties directly on realistic protocol implementations. Their methodology uses concurrent separation logic, ghost state, a global event trace, local snapshots, and reusable protocol-independent libraries. The motivation is a gap between model verification and implementation verification: the introduction says verifying protocol models “is useful to show the security of the protocol design, but does not guarantee that concrete protocol implementations are also secure.” (introduction, p.1). The approach targets Go and C and claims language/verifier portability.

The case studies are Needham–Schroeder–Lowe (NSL), signed Diffie–Hellman (DH), and WireGuard in Go/Gobra, plus NSL in C/VeriFast (Sec. 6, pp.10–12). Figure 14 reports implementation lines, specification lines including ghost code, and average verification time: Go NSL 197 LOC/924 LOS/97.6 s, signed DH 225/888/119.0 s, WireGuard 557/5,815/268.1 s; C NSL 300/1,014/5.0 s (Fig. 14, p.12). The reusable libraries themselves are 83 LOC/6,932 LOS/126.1 s in Gobra and 343/3,837/0.8 s in VeriFast (Fig. 9, p.9). These are averages over 30 runs on a 2020 Apple Mac mini with M1 processor (§5.1, p.9); Fig. 14 states the case-study measurements were taken the same way (p.12). Inference: these are proof-checking times, not end-to-end product costs.

The protocol claims are strong: NSL and signed DH prove secrecy and injective agreement; WireGuard proves strong forward secrecy and injective agreement with actor-key-compromise security (Sec. 6.3, pp.11–12). The WireGuard subset reintroduces concurrent sending and receiving of transport messages in the initiator, which reaches 72% of the official implementation's throughput; the change increases TCP throughput by a factor of 180 over the earlier implementation (Sec. 6.3, p.11). The subset omits DDoS protection, session-key renewal, and support for multiple concurrent VPN connections, and replaces a message buffer pool by single-use buffers (Sec. 6.3, p.11), so the performance and proof claims concern that subset.

## technique 1: model protocol executions as a global ghost trace

What it is: every protocol participant and the Dolev–Yao attacker is a concurrent thread; protocol-relevant events are appended to a shared global trace. Security properties become trace invariants and entailments. The trace is ghost state erased before execution, while concrete I/O and cryptographic operations remain executable.

How to apply it:

1. Define symbolic terms, event constructors, and the trace algebra. The paper treats terms and events as mathematical values, not mutable byte arrays (§5.2, p.9).
2. Encapsulate the trace in a concurrent data structure protected by a ghost lock (§3.3, pp.4–5).
3. For each relevant operation, acquire the ghost lock, perform the concrete operation, append its event, and release the lock while proving the trace invariant. The paper gives this four-step sequence explicitly (§3.3, p.4).
4. Give each participant a local snapshot, generally a prefix of the global trace, and relate local concrete fields to symbolic terms through a local invariant (§3.4, pp.5–6).
5. State protocol-specific event and message invariants as parameters of a reusable trace invariant (§5.1, pp.8–9).

The paper states: “Using ghost code allows us to cleanly separate the global trace, which is necessary to prove protocol-wide properties, from the data structures maintained locally by each participant.” (introduction, p.2). It also requires a syntactic check that all relevant operations use the wrapper library, so events cannot be silently omitted (§3.3, p.5).

## technique 2: local snapshots and stable knowledge under concurrency

What it is: a participant cannot retain arbitrary facts about a trace that other threads may extend. It retains only facts stable under extension, represented by a local snapshot that is a trace prefix. Fractional permissions split ownership: the participant holds a read fraction, while the ghost lock holds the other fraction; acquisition temporarily combines them for an update (§3.4, pp.5–6).

How to apply it:

1. Store a snapshot and a concrete-to-symbolic term relation in each participant's local invariant.
2. On a protocol-relevant operation, update the snapshot to the current trace and prove it remains a prefix (§3.4, p.5).
3. Give the participant a nonzero fractional permission so other threads cannot mutate its snapshot behind its back.
4. Use stable facts such as “event `e` occurs” to prove later message and authentication obligations.

The NSL example calls `CreateNonce`, returns both a concrete nonce and a ghost term, updates Alice's snapshot, and then proves `NonceOccurs` from the postcondition (Fig. 4, p.6). This lets Alice reason about an earlier nonce without enumerating intervening attacker actions.

Inference: Verus does not provide fractional separation-logic permissions as a built-in notation. Encode ownership with ghost tokens or a Verus state-machine protocol and prove that only the owner can update the snapshot. Use `old(...)` in `ensures` to relate pre-state and post-state; do not claim that an ordinary Rust clone is a permission split.

## technique 3: trace invariants for non-injective and injective agreement

What it is: authentication is expressed as correspondence between protocol-specific events. NSL records `Initiate`, `Respond`, and `FinishA/FinishB` events with participant and nonce arguments. A trace invariant says every finish has a matching earlier response unless corruption occurred (§4.1, pp.6–7).

How to apply it:

1. Add events at the implementation points where a participant begins, responds, or finishes a session.
2. Define a message invariant saying which earlier event must exist for a received message.
3. Prove each wrapper operation preserves the trace invariant.
4. Prove a global entailment from the invariant to non-injective agreement.
5. For injective agreement, associate a unique linear witness with a nonce/event pair. Create the witness with the nonce and transfer it to the trace when the finish event is appended.

The paper explains the key mechanism: “Due to the linearity of the resource, any attempt to append another FinishA event with na would fail to verify because the required witness cannot be provided a second time.” (§4.1, p.7). This avoids quantifying over the entire trace, which would be difficult with only local snapshots. The claim is protocol- and model-specific: NSL's injective agreement does not survive actor-key compromise, while WireGuard's does under its stated conditions (§6.3, pp.11–12).

Inference: in Verus, use a ghost uniqueness token represented by a state-machine resource or a ghost set with a proved no-duplicate invariant. A `proof fn` should consume the token in the abstract state; executable Rust must not depend on proof-token erasure for synchronization. Verus `ensures` can state a one-to-one event relation, but the token discipline must be modeled explicitly.

## technique 4: secrecy labels and attacker-knowledge over-approximation

What it is: instead of tracking a concrete attacker's exact terms, assign each symbolic term a secrecy label describing allowed recipients. The attacker knowledge is over-approximated by all terms whose labels permit a corrupted participant or session to read them. Every send operation is checked to send only terms already allowed by the attacker knowledge (§4.2, pp.7–8).

How to apply it:

1. Define labels from public, through participant sets, to specific protocol sessions.
2. Define a join operation and cryptographic equations in the mathematical term theory (§5.2, p.9).
3. On corruption, add all terms readable by the corrupted participant/session to attacker knowledge.
4. Require every send message to belong to a class already known to the attacker; reject a send that would leak a secret (§4.2, p.7).
5. Prove once, in the reusable library, that the trace invariant preserves the secrecy property for every protocol instantiation (§5.1, pp.8–9).

Inference: in Verus, implement labels and attacker knowledge as ghost `Set`/map models and use `spec fn` membership predicates. External cryptographic primitives require `assume_specification` or an explicitly modeled contract; label proofs alone do not verify a primitive's implementation. Inference: require a non-vacuity test that every secret has a meaningful label and that corruption transitions add the intended knowledge.

## technique 5: reusable parametric verification library

What it is: RVL encapsulates traces, terms, snapshots, I/O, cryptography, attacker completeness, and generic secrecy lemmas. Protocol clients supply event types, event invariants, and protocol-specific message invariants through a parameter interface. The library is verified once and reused (§5, pp.8–10).

How to apply it:

1. Build a protocol-independent trace/CDS layer and prove append, prefix, attacker, and secrecy lemmas.
2. Make protocol-specific events and invariants parameters. Gobra uses Go interfaces; VeriFast uses generic types, abstract functions, and abstract lemmas (§5.1, p.9).
3. Wrap network and crypto operations so each concrete effect appends its event and checks the parameterized invariant.
4. Instantiate the parameter interface for a protocol and verify participants modularly against wrapper preconditions.
5. Keep ghost code out of the executable artifact. The paper reports that only around 1% of the library is executable code (§5.1, p.9) and that the calls to the underlying I/O and crypto libraries can be inlined so the library can be removed from the executable (§5.1, p.8).

Inference: Verus can approximate RVL with a generic Rust module containing ghost state, `spec fn` predicates, `proof fn` lemmas, and `assume_specification` contracts for external APIs. Keep protocol-specific facts in separate modules so a library proof does not silently assume one protocol. Verus generic types and traits are not automatically equivalent to Gobra interfaces; each abstraction boundary requires a checked contract.

## technique 6: custom mathematical theories and concurrency reasoning

The library represents events, traces, terms, and secrecy labels as immutable mathematical theories. Gobra encodes algebraic data types and cryptographic equations as uninterpreted functions plus axioms; VeriFast uses native ADTs and auto-lemmas (§5.2, p.9). The global trace is protected by a lock invariant, and local snapshots rely on stable-under-concurrency facts. Ghost locks are erased, so concrete operations inside a critical section must be atomic (§5.2, pp.9–10).

Inference: Verus `spec fn`s, `Seq`, `Set`, and `Map` can encode the mathematical layer; `lemma` is not a Verus keyword, so use `proof fn` for algebraic facts. Model cryptographic equations only when their assumptions are explicit, and keep uninterpreted equations separate from executable primitive correctness. Inference: concurrent Verus state machines can represent the trace lock and participant transitions, but the paper's separation-logic permission algebra does not transfer automatically.

## what is proved, measured, and trusted

The methodology proves memory safety and protocol security for the listed implementations, including secrecy, non-injective/injective agreement, and WireGuard forward secrecy under specified corruption models. The trust section assumes the program verifier is sound, perfect cryptography, that all output operations (sending messages) are reflected on the global trace, and that terms from the initial state or from operations outside the library are readable at least by that participant according to their secrecy labels (§7, p.13). It says cryptographic primitives are not functionally verified, and that messages sent via inline assembly or third-party libraries must still be reflected on the global trace; omitting any other event affects only completeness, not soundness (§7, p.13). These are trusted assumptions, not results.

The most serious scope limits are the reduced WireGuard implementation, the perfect-cryptography abstraction, and the requirement that all protocol-relevant effects pass through wrappers. The authors report that the hardest work was finding a sufficiently strong trace invariant; WireGuard needed KDF-specific secrecy lemmas and fewer than 40 additional LOS to strengthen non-injective to injective agreement (§6.4, p.12).

## techniques for the catalog
- global ghost trace — record protocol and attacker events in a shared trace whose invariant implies security properties
- local stable snapshots — retain trace-prefix facts with fractional ownership across concurrent extensions
- linear uniqueness witnesses — prove injective agreement by consuming a non-duplicable event resource
- secrecy labels — over-approximate attacker knowledge and reject sends that introduce unauthorized terms
- parametric verification library — verify trace, attacker, and cryptographic lemmas once and instantiate protocol-specific invariants
- custom mathematical theories — encode events, traces, terms, labels, and cryptographic equations for SMT reasoning
- wrapper-enforced modularity — route every protocol-relevant I/O/crypto operation through contracts that append trace events
