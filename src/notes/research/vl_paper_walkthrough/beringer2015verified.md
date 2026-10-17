# Verified Correctness and Security of OpenSSL HMAC
(authored by agents unless marked 🧑)
Tag: `beringer2015verified`, [paper](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/beringer)

## scope and result

The paper builds an end-to-end, machine-checked assurance argument for OpenSSL 0.9.1c HMAC with SHA-256. Its central result is that the C implementation satisfies the FIPS 198-1 HMAC and FIPS 180-4 SHA-256 specifications and that HMAC is a pseudorandom function under explicit assumptions about the compression function. The abstract states: “We have proved, with machine-checked proofs in Coq, that an OpenSSL implementation of HMAC with SHA-256 correctly implements its FIPS functional specification and that its functional specification guarantees the expected cryptographic properties.” (Abstract, p. 207.) The proof combines the Foundational Cryptography Framework (FCF), Verifiable C, and CompCert. It checks specification interfaces instead of trusting an informal correspondence.

The verified C code is lightly adapted from OpenSSL 0.9.1c, dated March 1999, with generic envelopes specialized to statically linked SHA-256 (p. 209). Inference: the result covers that adapted source and its stated assumptions; it does not establish correctness of every OpenSSL release. The paper explicitly says: “We do not analyze timing channels or other side channels.” (p. 209.)

## technique 1: chain functional, implementation, compilation, and cryptographic specifications

what it is

The authors construct an assurance graph whose nodes are specifications, programs, semantics, and proofs. Figure 1 and Section 1 number sixteen specifications and proof components. The chain starts with formal FIPS SHA and HMAC specifications, adds a Bellare functional HMAC specification and an equivalence proof, specifies C APIs, proves C bodies, connects Verifiable C to C operational semantics, and connects C to assembly through CompCert. A separate FCF proof establishes HMAC cryptographic security. The result is an end-to-end theorem: “The assembly-language program, resulting from compiling OpenSSL 0.9.1c using CompCert, correctly implements the FIPS standards for HMAC and SHA, and implements a cryptographically secure PRF subject to the usual assumptions about SHA.” (p. 209.)

when to use it

Inference: use this decomposition when a product claim spans mathematical security, source-level behavior, and compiled execution. Separate nodes make a changed cryptographic theorem replaceable without reproving the C implementation, provided the interface remains equivalent. The paper says that improved cryptographic specifications would change only items 15 and 16 (p. 209).

how to do it

1. Formalize FIPS 180-4 SHA-256 as a Coq function (Section 1, step 1, p. 208).
2. Formalize FIPS 198-1 HMAC and Bellare’s functional characterization (steps 2–3, p. 208).
3. Prove equivalence between the FIPS and Bellare HMAC specifications (step 4, p. 208).
4. Use Verifiable C’s formalized program logic, C operational semantics, and assembly semantics (steps 5–6 and 8, pp. 208–209).
5. Use the existing proofs of Verifiable C soundness and CompCert preservation of input-output properties (steps 7 and 9, p. 209).
6. Use the existing SHA API specification and implementation proof; specify the HMAC API and prove the HMAC body correct (steps 10–13, p. 209).
7. Formalize SHA assumptions, define PRF security, and prove the HMAC PRF theorem (steps 14–16, p. 209).
8. Chain specifications and proofs 1–16 into the theorem quoted above (p. 209).

Verus form

Inference: In Verus, represent each executable Rust function with `requires` and `ensures`, and state pure mathematical behavior in `spec fn`; connect a cryptographic abstraction to implementation through lemmas and representation predicates. A compiled-code theorem comparable to CompCert is outside ordinary Verus source; treat the Rust compiler, libraries, hardware, and proof erasure as trusted assumptions. Verus supports executable, specification, and proof code together, while proof code is erased before execution. The paper’s separate compiler-preservation link therefore cannot be silently claimed by a Verus function proof.

evidence

The paper enumerates 16 specifications and proof components and states a machine-checked theorem in Coq (pp. 208–209). The trusted code base (TCB) consists of items 1, 2, 8, 12, 14, and 15; proof links are checked by Coq’s kernel, and specification interfaces are checked on both sides (p. 209). The paper reports 2832 Coq lines for the HMAC proof and 6574 lines for SHA-256 plus 533 lines of HMAC specification (Table in Section 7, p. 218).

limits and assumptions

The theorem assumes the stated SHA cryptographic properties and the correctness of the Coq kernel and its compiler. Timing, power, fault, and other side channels are outside the proof. The source is an old, specialized OpenSSL version. Inference: a Verus port would need explicit assumptions for cryptographic primitives and for the compiler and target platform.

## technique 2: functional specification of byte-level SHA and HMAC

what it is

The paper writes mathematical byte-list functions that mirror FIPS algorithms. SHA-256 is defined as `intlist-to-Zlist (hash-blocks init-registers (generate-and-pad str))`; `intlist-to-Zlist` converts 32-bit machine integers into mathematical byte values (Section 2, p. 210). HMAC is factored into key preparation, an inner/outer hash core, and the top-level function. The paper gives the complete HMAC functional shape:

“Definition HMAC256 (m k : list Z) : list Z :=
 HmacCore m (KeyPreparation k)” (Section 2, p. 210.)

`mkKey` hashes keys longer than 64 bytes and zero pads to the SHA-256 block size; `HmacCore` hashes `(ipad xor key)` around the message and then `(opad xor key)` around the inner result (p. 210).

when to use it

Inference: use a pure functional specification as the stable target for implementation proofs and cryptographic proofs. Keep machine representation conversions at the boundary so that arithmetic, byte ordering, padding, and output lengths are explicit.

how to do it

1. Represent bytes as lists of mathematical integers and define SHA padding, block splitting, and compression (Section 2, p. 210).
2. Define key normalization with hash-if-longer-than-block and zero padding (p. 210).
3. Define `HASH`, `HmacCore`, and `HMAC256` over list concatenation and bytewise XOR (p. 210).
4. Prove the C API’s output represents the mathematical HMAC value (Sections 3 and 6, pp. 210–211, 217–218).
5. Prove conversion and padding properties needed by the abstract cryptographic specification (Section 5, pp. 214–216).

Verus form

Inference: use `spec fn sha256_spec(bytes: Seq<u8>) -> Seq<u8>` and `spec fn hmac_spec(msg: Seq<u8>, key: Seq<u8>) -> Seq<u8>`, with executable Rust operating on slices or arrays. Prove key-length and block-size preconditions with `requires`; state output equality with `ensures`. Keep cryptographic assumptions as axioms or trusted specifications only when the implementation is not being proved. Verus sequences and integer arithmetic can express the list-level model, but a complete SHA proof still needs lemmas for bit/byte conversion and modular arithmetic.

evidence

The SHA functional specification is 169 lines of Coq in the trusted base (Section 2, p. 210). Section 7 reports 159 Coq lines for the FIPS HMAC specification and 374 Coq lines for its API specification, corresponding to 25 C lines (p. 218). The displayed nonincremental API example is 25 Coq lines plus auxiliary predicates; the proofs also support the incremental API (Section 3, p. 211). The theorem is checked by chaining the specifications, not by testing digest vectors.

limits and assumptions

The functional specification itself is trusted in the TCB (items 1 and 2, p. 209). Inference: a correct proof can still establish the wrong cryptographic requirement if the specification is wrong. The paper allows the permissive FIPS 198-1 key-length behavior and notes a stricter RFC 4868 requirement in a footnote (p. 210).

## technique 3: separation-logic API contracts for C memory

what it is

Verifiable C specifies each C function with a precondition and postcondition over pure facts, local bindings, and separating memory predicates. The HMAC API contract binds abstract key/message data and requires disjoint memory blocks. Its postcondition says that the digest block contains `HMAC256 (CONT msg) (CONT key)` while the key and message blocks remain unchanged (Section 3, p. 211). The paper explains why separating conjunction matters: “The corresponding proof rule, the frame rule, is crucial for modular verification, guaranteeing, for example, that when we call SHA-256, the HMAC data structure remains unmodified.” (p. 211.)

when to use it

Inference: use a separation-style contract when a low-level function reads and writes aliased pointers, structs, and buffers. It makes footprint, non-overlap, initialization, and preservation explicit. The frame rule then allows a caller to preserve unrelated state.

how to do it

1. Define a record such as `DATA := { LEN:Z; CONT:list Z }` for abstract byte sequences (Section 3, p. 210).
2. Define length predicates for keys and messages and range constraints for C integers (p. 211).
3. In `PRE`, bind pointer values, lengths, writable shares, and separating `data-block` predicates for key/message/digest (pp. 210–211).
4. In `POST`, replace the uninitialized digest block with the mathematical HMAC result and preserve key/message blocks (p. 211).
5. Prove each C statement using Verifiable C’s Hoare/separation rules; use the frame rule when calling SHA from HMAC (pp. 211, 217).

Verus form

Inference: model each Rust buffer with owned `Vec`/slice permissions and contracts such as `requires buf.len() == n` and `ensures result == hmac_spec(old(msg), old(key))`; use `old` only in postconditions to refer to pre-state values. Rust ownership gives non-aliasing for ordinary references, but raw pointers, FFI, and mutable slices require explicit supported encodings and invariants. Verus has no direct Verifiable-C `SEP` syntax; represent a footprint with ownership, ghost state, and predicates. Do not write `invariant(...)` as a function call or use `modifies` as a contract clause.

evidence

The displayed nonincremental API specification has 25 Coq lines plus auxiliary predicates (Section 3, p. 211); the HMAC implementation proof has 2832 Coq lines (Section 7, p. 218). The authors state that separation logic guarantees no out-of-footprint reads, writes, or frees, rules out memory leaks, and ensures absence of memory violations and other runtime errors apart from memory exhaustion (p. 211).

limits and assumptions

The contract assumes the abstract predicates correctly describe C layouts and integer conversions. It does not prove timing or other side-channel properties. Inference: Rust ownership removes some C aliasing obligations but does not prove that an FFI buffer or cryptographic primitive has the intended semantics.

## technique 4: mechanized cryptographic security as games

what it is

FCF embeds a probabilistic programming language in Coq. It represents computations as `Comp A`, adversarial oracle interaction as `OracleComp`, and security as differences between probabilities in games. The paper defines PRF, weak collision resistance (WCR), and XOR-related-key attack (RKA) advantages. It states the HMAC theorem under three assumptions: the compression function is a PRF, the Merkle–Damgård hash is WCR, and the dual family is a PRF against XOR-RKA (Section 4.2, p. 212). The proof establishes NMAC PRF security, then HMAC/NMAC indistinguishability, then composes those results (p. 213).

when to use it

Inference: use game-based definitions when a security claim is probabilistic and adversaries query an oracle. Keep assumptions and reductions explicit; do not replace a cryptographic theorem with deterministic unit tests.

how to do it

1. Define the real oracle and a random-function oracle; let the adversary return a Boolean (Listing 2, p. 213).
2. Define advantage as the absolute difference between the probabilities that the adversary returns true in the two games (Listing 2, p. 213).
3. Define WCR as a collision-finding game (Listing 3, p. 213).
4. Define XOR-RKA real and random games that let the adversary supply a mask to XOR with a secret key; apply the assumption to the dual family of the compression function, which reverses the roles of inputs and keys (Listing 4 and surrounding text, p. 213).
5. Prove NMAC PRF from compression PRF and WCR; prove HMAC/NMAC closeness from XOR-RKA; compose the bounds into HMAC PRF (Section 4.2, p. 213).

Verus form

Inference: Verus can state deterministic functional lemmas about a fixed cryptographic model, but it is not by itself the FCF probabilistic game framework. A product proof should isolate randomness and adversary games in a separately modeled specification, then prove the executable Rust meets that model. Do not claim computational security from an `ensures` clause alone.

evidence

Section 4.2 states the three assumptions (p. 212), and Listing 6 bounds HMAC advantage by the sum of compression-function PRF, hash WCR, and dual-family XOR-RKA advantages (p. 214). Section 7 reports 70 Coq lines for the Bellare-style specification, 25 for the PRF statement, and 377 for its proof, totaling 472 (p. 218). The paper provides a symbolic bound, not an experimental attack rate.

limits and assumptions

The PRF theorem inherits unproved assumptions about SHA and the chosen Bellare specification. The authors note that later cryptographic specifications could replace items 15–16 while leaving implementation proofs modular (p. 209). The paper’s “HMAC brawl” discussion acknowledges that the chosen property may not capture all practical concerns (p. 209).

## technique 5: bridge abstract and concrete specifications

what it is

The abstract security model uses arbitrary bit vectors and sizes; the concrete FIPS model uses byte lists, SHA-256’s fixed block/output sizes, and C lengths. The authors prove equivalence through conversions, padding, Merkle–Damgård structure, and injectivity. They enumerate seven differences, numbered (0)–(6), in Section 5 and prove that bit/byte conversions preserve HMAC results (Section 5, pp. 214–216).

when to use it

Inference: use bridge lemmas whenever security reasoning uses a cleaner model than the implementation. A security proof about an abstract function is not evidence about code until the instantiation and conversion are proved.

how to do it

1. Instantiate abstract parameters with SHA-256 and conversion functions (p. 215). SHA-256 has 512-bit blocks and 256-bit output; the prose on p. 215 reverses these sizes in one sentence, while the preceding parameter discussion gives `b = 512` and `c = p = 256`.
2. Bridge iterative compression with recursive message processing by proving block splitting and folding equal (p. 215).
3. Prove the two SHA padding views equivalent and then fold padding into `hash-words-padded` (p. 216).
4. Replace bit vectors with bit lists and prove required length invariants; relate byte-list and bit-list inputs and outputs through conversion equivalence (p. 216).
5. Prove `splitAndPad` injective; the paper uses five cases based on equal lengths, encoded lengths, and 2^64 wraparound (p. 216).
6. Apply the abstract HMAC PRF theorem to the concrete API after equivalence and injectivity are established (p. 217).

Verus form

Inference: encode conversions as `spec fn` over `Seq<u8>`/`Seq<bool>` and prove round-trip, length, and injectivity lemmas with `proof fn`. Require message lengths to be multiples of eight when the concrete API accepts bytes. Keep each conversion lemma separate so a changed encoding invalidates a localized proof.

evidence

The paper says the machine-checked injectivity proof is more comprehensive than the one-sentence argument in prior work (p. 216). The bridge culminates in preservation of cryptographic security for the API (p. 217). Section 7 reports 3017 Coq lines for general equivalence and 993 for specialization to SHA-256, totaling 4010 (p. 218).

limits and assumptions

The instantiation proves injectivity for byte-aligned messages and handles wraparound of the 64-bit length encoding. The authors explicitly rule out non-byte-divisible attacker messages by the C API’s length interpretation (p. 216). Inference: a Rust API accepting arbitrary bitstrings would need a different contract.

## technique 6: verify incremental C implementations and compiler output

what it is

The implementation uses incremental `HMAC-Init`, `HMAC-Update`, `HMAC-Final`, and cleanup functions, with a one-shot wrapper. Each function receives a specification over an abstract `hmacabs` state and a representation predicate relating that state to the concrete `HMAC-CTX` struct (Section 6, pp. 217–218). The displayed lemma proves that initialization, one abstract update with the supplied data, and finalization produce the pure `HMAC256` result (p. 218); the incremental interface also supports repeated updates (p. 217). CompCert then preserves the proven C input-output property in assembly (Section 1, step 9, p. 209).

when to use it

Inference: use an abstract-state relation when the implementation is incremental or mutates a complex context. Prove each update locally and prove a final composition theorem once.

how to do it

1. Define an inductive abstract state containing SHA states, key length, and key bytes (p. 217).
2. Define `hmacUpdate` as an abstract transition relation over message fragments (pp. 217–218).
3. Define the displayed `hmacIncremental` relation as initialization, one update with the supplied data, and finalization; prove its output equals `HMAC256` (p. 218).
4. Define `hmacstate` as a separation-logic representation predicate relating abstract state to `HMAC-CTX` memory (p. 218).
5. Prove Init, Update, Final, Cleanup, and one-shot wrapper specifications; the table reports 1530, 101, 196, 31, and 99 Coq lines respectively (p. 218).
6. Compile through CompCert and rely on its preservation theorem (p. 209).

Verus form

Inference: model the context as a Rust struct with a ghost/spec state and prove each mutating method’s `ensures` relation. A `proof fn` can show that repeated updates compose to the one-shot specification; it is erased and must not be called as runtime code. Verus can verify the Rust body and contracts, but the CompCert-style machine-code preservation theorem remains outside the ordinary proof unless a separately verified compiler is used.

evidence

The HMAC implementation proof totals 2832 Coq lines for 134 C lines, while the SHA specification and proof total 6574 Coq lines for 248 C lines (Section 7 table, p. 218). The theorem is machine checked; no runtime benchmark is offered.

limits and assumptions

The proof covers the adapted, specialized source and its C semantics. It relies on the checked CompCert preservation proof and trusts the Coq kernel and the software compiling that kernel. The paper does not establish resistance to side channels or faults.

## what is proved, measured, and trusted

proved: FIPS functional correctness of SHA-256 and HMAC, equivalence of FIPS and Bellare HMAC views, C API/body correctness, incremental/one-shot equivalence, CompCert property preservation, and HMAC PRF security under three SHA assumptions (pp. 208–218)

measured: commented Coq line counts and C line counts in Section 7; no performance or attack-success denominator is reported (p. 218)

trusted: FIPS functional specifications, assembly semantics, HMAC API specification, SHA cryptographic assumptions, PRF security definition, and the Coq kernel and software compiling it; the CompCert preservation theorem is checked rather than an additional unproved assumption (p. 209)

Inference: a Verus proof of Rust source against a functional contract would need additional evidence to support this paper’s compiled-code and cryptographic-security claims. Specification mismatch and unmodeled side channels remain concerns; external cryptographic libraries, compiler behavior, and hardware need explicit treatment.

## techniques for the catalog

- end-to-end assurance graph — chain functional, API, source, compiler, and cryptographic links so each interface is machine checked
- functional cryptographic specification — define SHA/HMAC over mathematical lists and make representation conversions explicit
- separation-logic API contract — specify pointer footprints, disjointness, initialization, and post-state digest values
- FCF game proof — define PRF/WCR/RKA games and compose reduction lemmas into HMAC security
- abstract/concrete bridge — prove padding, byte/bit conversion, injectivity, and equivalence before applying an abstract theorem
- incremental-state verification — relate mutable C context states to an abstract state and prove update composition
- compiler preservation — use a verified compiler theorem to carry source input-output properties to assembly
