# OwlC: Compiling Security Protocols to Verified, Secure, High-Performance Libraries
(authored by agents unless marked 🧑)
Tag: `singh2025owlc`, [paper](https://www.usenix.org/conference/usenixsecurity25/presentation/singh)

## result

OwlC compiles an Owl protocol specification into a verified Rust library. It emits two things: a Verus specification built from interaction trees (ITrees), produced by a trusted specification compiler, and an executable implementation, produced by an untrusted implementation compiler and verified by Verus against that specification (Sec. 3, Figure 1). Owl's information-flow type system proves protocol-level computational security before compilation. Linear ghost ITree tokens make the implementation perform exactly the specified I/O effects.

The paper claims: "OwlC emits an efficient, interoperable, side-channel resistant Rust library that is automatically formally verified to be correct." (Abstract, p. 5071). This is a compiler architecture, not a general-purpose protocol verifier: the protocol is first written in Owl and security is proved by Owl's type system.

## technique 1: interaction-tree specifications

An ITree here is an inductive Verus enum with five constructors: `Ret`, `Input`, `Output`, `Sample`, and `Declassify` (Figure 3). Each effect constructor holds an argument and a continuation; a monadic bind composes ITrees. Because the type is inductive (unlike coinductive Coq ITrees), it handles only terminating computations; long-running protocols are encoded as terminating message handlers that may be called multiple times (Sec. 4.1, p. 5075).

Steps: (1) write the protocol in Owl (localities, names for secrets, structs for message formats, routines); (2) type check it with Owl for security; (3) the spec compiler emits an ITree-producing Verus `spec fn` (e.g. `alice_recv_spec`) in a nearly line-for-line correspondence with the Owl routine, written inside a 119-line `owl_spec!` macro that expands to the ITree constructors (Figure 4); (4) verify the generated implementation against that ITree. In the receive example the ITree inputs a message, parses it, declassifies an `ADec` of the ciphertext, and returns `Some` plaintext or, if parsing fails, `None`.

Verus form (Sec. 4.2): each compiled function takes a mutable reference to the ghost token; a `requires` clause demands the token initially holds the routine's ITree, and an `ensures` clause states that afterwards it is `Ret(res)` with `res` the function's result. The paper says this guarantees the code performs all specified effects, "rather than just some prefix of them", and returns the correct value. The effect functions are marked `#[axiom]` and trusted, because the verifier cannot reason about the system calls behind network and sampling.

## technique 2: linear ghost tokens for effect control

The token `ITreeToken<A>` holds a ghost ITree in a private field and does not implement `Clone` or `Copy`, so Rust's linearity and scoping rules prevent copying, duplicating, or constructing tokens (Sec. 4.2, Figure 5). `input` requires the token to be an `Input` node and leaves it as the continuation applied to the received value; `output` requires an `Output(v, k)` node whose value equals the bytes output, and leaves `k`; `sample` is similar and calls a cryptographically secure PRNG. Extra functions split a bind into two tokens and join `Ret(v)` with a continuation, for modular verification of subroutines.

The paper says: "the token grants the implementation permission to perform the ITree’s I/O effects." (Sec. 4.2, p. 5075). The paper also says it ensures "syntactically that no other I/O routines are accessible to the implementation." OwlC emits no proof hints; the paper attributes fully automatic verification "primarily" to linearity (Sec. 4.2, p. 5076). The paper says the technique could be encoded in other tools with substructural reasoning (Iris, Steel), or, without linearity, by verification conditions forbidding token duplication.

Inference: in Verus, encode token transitions and ownership in ghost state; the concrete socket and RNG calls remain an external trust boundary. This protects protocol effect sequencing but cannot prove the OS or the cryptographic primitive implementation.

## technique 3: type abstraction, semantic declassification, and type-guided compilation

Secret values live in an opaque `SecretBuf` whose private buffer exposes only four constant-time operations: `len`, `from_public`, `subrange`, `concat` (Sec. 5.1, Figure 7). An attempt to strip leading zeroes from a `SecretBuf` (as in the Raccoon attack) was rejected by Rust's typechecker. OwlC collapses Owl's information-flow lattice to two levels: always-public values become `PublicBuf`s and possibly-secret-with-public-length values become `SecretBuf`s. OwlC changed Owl's typing rules to forbid values with secret lengths, because Verus cannot express such types (Sec. 5.2).

Declassification: where Owl deems a value always public but it is held in a `SecretBuf`, OwlC inserts a `Declassify` node into the ITree, carrying a `DeclassifyingOp` (`ControlFlow`, `EnumParse`, `EqCheck`, `ADec`, other crypto ops that may fail; Figure 8). The implementation spends it in two steps: ghost `consume_itree_declassify` turns the ITree node into a linear `DeclassifyingOpToken`, and `declassify` consumes that token to turn the matching `SecretBuf` into a `PublicBuf` (Figure 9). The two-step split lets OwlC's optimizations reorder some cryptographic operations relative to the ITree order.

Compilation (Sec. 6): OwlC relies on Verus to type check the emitted Rust but tracks enough Rust-level detail (ownership, borrowing) to avoid violating the Rust type system. `PublicBuf` uses reference counting so values copy cheaply. Parsers and serializers come from Vest's verified combinators. Encryption, serialization, and output can be fused into one in-place computation; these optimizations are untrusted and verified. EverCrypt (via libcrux) provides primitives; the Verus-to-EverCrypt connection is axiomatized and trusted, and EverCrypt routines are added to `SecretBuf`'s API (Sec. 8.1.1, Figure 12).

## technique 4: compositional verified applications

Applications can be written in Owl, giving end-to-end cryptographic proofs for the composed system, or written directly in Verus with a handwritten ITree that calls OwlC's generated ITrees; the Verus route cannot prove properties beyond functional correctness without significant extensions to Verus (Sec. 7). Owl has no recursion or loops, so the Owl echo server runs once and a trusted 3-line wrapper calls it in an infinite loop (Sec. 7.1). In Verus, a recursive ITree with a fuel parameter specifies the echo server; the executable is a loop whose invariant states that the current token holds `echo_server(cfg, cur_fuel)` (Sec. 7.2, Figure 11).

The paper says: "ITrees provide a flexible spec format for verified applications, without constraining implementation choices—we are free to use a more performant looping implementation, rather than perfectly mirroring the ITree’s control flow." (Sec. 7.2, p. 5079).

## evidence and limits

OwlC compiles each of the 16 case studies in Figure 13 (14 from the original Owl work, plus WireGuard and HPKE) to Verus in under a second. Verus checks the generated code in 13.1 seconds for WireGuard (6,499 generated Verus lines) and 7.8 seconds for HPKE (4,030 lines); Owl security proofs take 659.8 and 83.0 seconds respectively (Figure 13, p. 5082). The compilers are 5,934 lines of Haskell, of which 753 are the trusted specification compiler (Sec. 8, p. 5079).

WireGuard interoperation was unit-tested in four initiator/responder configurations (Sec. 10.2, p. 5082). The wireguard-go-based executable has a maximum throughput overhead of 6% against wireguard-go and becomes indistinguishable at 1 ms link latency (Sec. 10.2.1, p. 5083). Microbenchmarks with verified EverCrypt crypto show 10% faster handshakes but a 40% transport penalty (15% with the baseline's unverified primitives) (Sec. 10.2.2, p. 5083). HPKE runs about 20% faster than rust-hpke with verified primitives and about 11% faster with the same primitives (Sec. 10.3, p. 5084).

Limits. The WireGuard proof covers the core handshake and transport protocol, not virtual network devices or UDP, and not anonymity or receive-once properties (Sec. 9.2.1, p. 5081). Owl does not model dynamic compromise, so perfect forward secrecy cannot be proved in full generality (Sec. 9.1). HPKE is proved in the plain model for AuthPSK secrecy and integrity; CCA security and other modes are future work (Sec. 9.3.1, pp. 5081–5082). The TCB is the Rust compiler, Verus, Owl, and the specification compiler; the EverCrypt connection is axiomatized and `SecretBuf` is trusted to be constant time (Sec. 2.1). Side-channel resistance holds only at the Rust source level; microarchitectural channels are out of scope.

## techniques for the catalog

- ITree effect specification — represent protocol returns, input, output, sampling, and declassification as an inductive Verus specification
- linear ghost effect token — make each permitted side effect consume a unique token and return only its continuation
- type-guided verified compilation — track Rust ownership and borrowing while emitting code, and let Verus type check and verify it
- semantic declassification — mark each secret-to-public step (branch, enum parse, equality check, failing crypto op) as an ITree node spent via a linear token
- compositional application specification — connect generated protocol ITrees to handwritten recursive Verus application specs
