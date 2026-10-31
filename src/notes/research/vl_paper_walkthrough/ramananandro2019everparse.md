# EverParse: Verified Secure Zero-Copy Parsers for Authenticated Message Formats
(authored by agents unless marked 🧑)
Tag: `ramananandro2019everparse`, [paper](https://www.usenix.org/conference/usenixsecurity19/presentation/delignat-lavaud)

## scope and security target
EverParse generates parsers and serializers from tag-length-value descriptions. The paper states: “The resulting code is verified to be safe (no overflow, no use after free), correct (parsing is the inverse of serialization) and non-malleable (each message has a unique binary representation).” (§abstract, p. 1465). A parser is correct when parsing a serialization returns the original value; it is exact when it accepts only serialized messages. For parsers that consume their whole input, non-malleability means equal successful results cannot come from two different byte strings; completeness means every valid value has a representation (§2.1, p. 1467). A secure parser is both non-malleable and complete.

Inference: For Verus, these are useful as separate specifications: a parser can return a value and consumed length with `ensures` relating the result to a byte slice, while a uniqueness lemma can state that two successful parses of the same value have identical consumed byte prefixes. Memory safety still needs ordinary Rust ownership and bounds proofs. The paper's F* refinements and ghost predicates do not transfer verbatim.

The paper motivates the target with Heartbleed, ASN.1 signature parsing, Bitcoin transaction malleability, and ambiguous TLS unions (§2.2, pp. 1467–1468). Writing V for the set of valid messages, it gives the concrete design rule: “We say that p is a secure parser for V if p is non-malleable and complete.” (§2.1, p. 1467). Under this whole-input definition, ignoring trailing bytes or accepting alternate encodings of the same value violates non-malleability. The more general definition in §5 permits unconsumed suffixes but requires uniqueness of the consumed prefix. Untagged unions require the separate context condition discussed below.

## technique 1: compile a constrained format description

Use this when a binary protocol has fixed integers, arrays, bounded lists, structs, enums, tagged unions, or length-dependent fields. Write declarations in QuackyDucky's C-like language. Figure 4 gives examples such as `uint16 payload<2..8>`, `header tag`, `select(tag)`, and `message data[len]` (p. 1469). QuackyDucky recursively translates declarations to F* datatypes, parser specifications, a high-level functional implementation, and a Low* implementation. The generated code is “verbose but shallow,” so F* can check safety, correctness, and non-malleability using LowParse properties (§4, p. 1471).

Steps from the paper:
1. Extract protocol declarations from RFCs and merge versions; the TLS study manually corrected mistakes and added documented length dependencies (§3, p. 1469).
2. Mark extensible enums with `/*@open*/` and provide default cases for extensible unions; distinguish these from closed enums and unions that reject unknown values (§3, p. 1470).
3. Split incompatible protocol-version types, such as TLS 1.2 and 1.3 `Certificate`, into version-specific definitions (§3, p. 1470).
4. Mark context-supplied union tags with `/*@implicit*/`. When such a type is nested, require an enclosing explicit length; the outer parser skips that content, and the application separately calls the inner parser with the correct tag. The authors warn: “we only provide a conditional security guarantee in this case.” (§3, p. 1470).
5. Generate and type-check the F* modules. QuackyDucky is outside the trusted computing base for security; a wrong format specification causes incompatibility, while LowParse remains verified (§8, p. 1480).

Inference: In Verus, the declaration compiler can emit Rust structs/enums plus parser functions over `&[u8]`, and proof functions for each format. A version-specific enum and an explicit discriminant should replace context-dependent unions where possible. The generator itself would be trusted unless its output is checked by Verus; an untrusted generator is acceptable only when generated obligations fail closed.

## technique 2: verify reusable parser combinators

LowParse proves each primitive parser combinator once and derives properties for compositions. Its non-malleability definition requires that equal successful results consume the same number of bytes and that those bytes coincide; its strong-prefix property says a successful result remains unchanged on any input with the same consumed prefix. Serializing concatenated values requires this property for the first parser (§5, p. 1475). The paper says: “For each of them, we prove injectivity and any relevant additional properties indicated in their metadata, such as the strong prefix property.” (§5.1, p. 1475).

Apply it as follows:
1. Define primitives `fail`, `ret[x]`, `read_byte`, and monadic `and_then`; establish non-malleability and/or the strong-prefix property under their stated composition conditions (§5.1, p. 1475).
2. Derive fixed-width integers from byte parsers, for example little-endian 16-bit parsing as `(read_byte × read_byte) synth ((x, y) ↦ x + 256 × y)` (§5.1, p. 1476).
3. Use `plist[p]` for repeated elements: it fails if an element parser fails or consumes zero bytes, and succeeds when the whole input is consumed. Use `p trunc n`, for `n > 0`, to require success on exactly the first `n` bytes. `plist` lacks the strong-prefix property; truncation provides it even when the underlying parser lacks it (§5.1, p. 1476).
4. Build tagged unions with `p . f q`, where the dependent parser's result must carry the tag; use `filter`, `synth`, products, and sums for records and refinements (§5.1, p. 1476).
5. For a length-prefixed payload, parse a bounded length and apply `p trunc n`; the serializer supplies the payload length (§5.1, p. 1476).
6. Provide serializer combinators where possible and prove their inverse properties. The paper states: “For instance, ret[x] and and_then do not have a generic serializer.” Correct serializers are derived for products, lists, variable-length data, and tagged unions (§5.1, p. 1476).
7. Implement corresponding functional parsers, validators, jumpers, serializers, and accessors; prove safety and correspondence to their specifications. Inline and specialize the higher-order combinator code before C extraction, using annotations and, where needed, F* tactics (§5.2, p. 1476).

Inference: Verus can represent each parser as a function returning `Result<(T, usize), Error>` and maintain a predicate describing consumed bytes and validity. `spec fn` predicates and `proof fn` lemmas can express composition and injectivity; executable parser functions must remain ordinary Rust functions. A Verus proof should use `requires`/`ensures` and `old(...)` for mutable buffers, rather than F* effects or LowParse metadata.

## technique 3: zero-copy validators, accessors, readers, and writers

Use the low-level API when allocations and copies are unacceptable. A validator checks bytes and returns a final position or an error without constructing a value. Accessors compute field positions after validation; readers decode base-type values; writers fill an output slice sequentially. The paper explains: “A validator reads the input buffer and returns either the number of bytes that p would consume by successfully parsing its contents, or an error code.” (§4.4, p. 1473).

Steps:
1. Validate a bounded mutable slice and position. The generated precondition requires a live slice and a maximum length (§4.4, p. 1473).
2. Use an accessor to locate a field, reading intermediate lengths only to skip variable fields (§4.4, p. 1473).
3. Use a reader for a base type under its parser's validity predicate to return the value. Validators, accessors, jumpers, and readers preserve the memory state (§4.4, p. 1473).
4. Write fixed fields and copied arrays in order, reserve bytes for variable-length prefixes, write the payload, then call a finalizer to fill its length (§4.5, p. 1474).
5. Invoke the generated validity lemma after all fields are written; it is erased from C extraction (§4.5, p. 1474).

Inference: Rust slices and checked indexing provide the memory model; Verus can prove that every position is within `input.len()` and that the returned position equals the starting position plus the parser's consumed length. A writer can require sufficient capacity and ensure the resulting prefix satisfies the format predicate. Proofs for mutable output should relate the final bytes to the buffer before the write.

## evidence and limits

The evaluation covers TLS 1.0–1.3, Bitcoin blocks and transactions, and PKCS #1 ASN.1 payloads. Table 1 reports 1,601 QuackyDucky lines and 69,534 generated F* lines for TLS, verified in 46 minutes and extracted in 25 minutes; Bitcoin uses 31 input lines and 1,925 F* lines, with 1m56s verification and 1m14s extraction; PKCS #1 uses 117, 4,452, 2m14s, and 2m39s; LowParse has 32,210 F* lines, 3m5s verification, and 1m5s extraction (Table 1, p. 1477). TLS integration served 49.8 requests/s with original MITLS and 53.3 requests/s with EverParse over 500 sequential HTTP requests (§6.1, p. 1477). In-place TLS validation reached 2,684 MB/s (1.177 cycles/byte) versus a baseline that checked message length, allocated a buffer, and copied the message, reported as Memcpy at 1,864 MB/s (1.761 cycles/byte) (§6.1, p. 1477). Bitcoin validation processed 21 MB at 4,568,632 kiB/s versus Bitcoin Core deserialization at 152,786 kiB/s; the authors caution that accessor overhead is excluded (§6.2, p. 1478). Fuzzing tested 21,664,448 inputs at 599 inputs/minute and reported no bugs (§6.2, p. 1479). PKCS #1 verification was 79K operations/s for both mbedTLS and EverParse (5,700 versus 5,649 cycles/operation), while encoding was 31M versus 134M operations/s (14 versus 3 cycles/operation) (§6.3, p. 1479).

The proof trusts F*, Z3, KReMLin, and the C compiler. The paper says: “All our verification results, including preservation of memory safety and functional correctness down to machine code, relies on a trusted computing base (TCB) that includes:” (§8, p. 1480). CompCert can reduce compiler trust at a performance cost. QuackyDucky's input specification is trusted for liveness but not security; interoperability testing is needed to catch specification mistakes (§8, p. 1480). QuackyDucky targets non-malleable TLV formats; LowParse also currently supports only non-malleable formats (§8, pp. 1480–1481). The Bitcoin implementation excludes SegWit because its overloaded length requires an ad-hoc combinator (§6.2, p. 1477). Implicit tags receive only conditional security (§3, p. 1470).

Side-channel resistance is future work: “the implementation produced by EverParse branches on values read from the input buffer, which may leak (through timing side-channels) information when used on confidential data.” (§8, p. 1481). The main MITLS integration uses high-level parsers; transitioning it to the low-level implementation remains future work (§8, p. 1481).

Inference: For agent-written verified Rust, reusable combinator proofs and checked generated code could reduce repeated parser proof work. Proofs against a generated specification still need interoperability tests to detect a mistaken format description; application security requires properties beyond the parser guarantees.

## techniques for the catalog

- secure parser definition — require non-malleability and completeness so authenticated bytes have one accepted representation
- constrained format compiler — generate typed specifications, high-level parsers, and low-level implementations from bounded TLV declarations
- parser combinator proofs — prove primitive injectivity and prefix properties once, then derive composition proofs by typing
- zero-copy validator API — validate positions first, access fields by offsets, and decode only requested values
- verified sequential writer — reserve variable-length prefixes, write fields, finalize lengths, and discharge a whole-message validity lemma
- trust-boundary accounting — treat proof assistant, SMT solver, extraction compiler, and C compiler as trusted while keeping LowParse and each generated implementation verified
