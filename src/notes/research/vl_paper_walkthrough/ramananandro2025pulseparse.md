# Secure Parsing and Serializing with Separation Logic Applied to CBOR, CDDL, and COSE
(authored by agents unless marked 🧑)
Tag: `ramananandro2025pulseparse`, [paper](https://www.semanticscholar.org/paper/1289b62c1240b5253a57a68f4d4e92f045badbc2)

## result and boundaries

PulseParse is a verified library of parser and serializer combinators in F*/Pulse separation logic. EverCBOR formalizes CBOR and emits verified C and safe Rust. EverCDDL checks CDDL well-formedness and emits verified parsers and serializers. The paper states: “All our code is proven memory safe, arithmetically safe, and functionally correct, and the formats we formalize are all proven non-malleable.” (Section 1, p. 2.) Here non-malleable means that one high-level value has a unique accepted byte representation under the specified format.

Inference: this is directly relevant to VL’s verified Rust parser work, but its proofs are in F*/Pulse and its generated Rust is extracted code. A Verus port must re-establish the memory, arithmetic, functional, and uniqueness theorems; the paper’s theorems do not transfer automatically.

## technique 1: specification and implementation combinators

What it is. A parser specification is a pure function from a byte sequence to an optional value and consumed length. A serializer is a value-indexed byte sequence refined by the property that the parser returns the value and the complete length. Primitive combinators compose into pairs, integers, bit fields, lists, dependent pairs, and rewrites under bijections. The authors say: “PulseParse follows this approach too.” (Section 2, p. 2.) They separate pure specification combinators from implementation combinators that refine them to low-level code.

How to apply it.

1. Define a pure parser specification for the format and prove its non-malleability/prefix properties. (Section 2.1.)
2. Define a serializer whose output satisfies the parser/value/length refinement. (Section 2.1.)
3. Compose parser and serializer specifications with combinators such as `parse_pair` and `serialize_pair`. (Section 2.1.)
4. Implement validators, jumpers, accessors, readers, and writers that operate on arrays and preserve the specification through separation-logic triples. (Section 2.2.)
5. Extract first-order C or safe Rust after proving the Pulse implementation. (Section 1 and Fig. 1.)

The pair serializer requires the prefix property: once a parser accepts (n) bytes, any input sharing that prefix must produce the same result. This property is needed to prove that concatenating serializers parses back to the pair (Section 2.1). Inference: this is a reusable proof obligation for VL combinators; an implementation should expose it as a Verus `requires`/`ensures` contract on the specification function, then prove each concrete combinator preserves it.

Verus form. Inference: model parser specifications as `spec fn`s over `Seq<u8>` returning an option-like result, and serializers as executable functions with `requires` that the output buffer is large enough and `ensures` relating bytes written to the parser result. Use `proof fn`s or lemmas for pair composition and non-malleability. Use `invariant` clauses for loops over input arrays. These are Verus adaptations; the paper uses F*/Pulse syntax.

## technique 2: separation-logic ownership for zero-copy parsing

What it is. PulseParse represents valid serialized regions with predicates such as `ser s a v`. A pair accessor splits ownership of disjoint subarrays, and a magic-wand/trade postcondition lets the caller later recover ownership of the original array. The paper explains: “postcondition uses two separation logic connectives.” (Section 2.2, p. 3.) An accessor returns a pointer to a valid subarray without copying it. A reader returns values while proving that the input array is unchanged. A zero-copy reader can borrow a byte array or substructure under a relation between low-level and high-level values.

How to apply it.

1. State a separation predicate connecting the byte array and the specification value. (Section 2.2.)
2. Give an accessor or reader a precondition owning the serialized array. (Section 2.2.)
3. Split ownership for disjoint fields, read or borrow subarrays, and return a postcondition relating each result to its slice. (Section 2.2.)
4. Use the ownership-recovery connective when the caller is finished with the subobjects. (Section 2.2.)
5. Avoid heap allocation for variable-size input; return pointers or iterators into the caller-owned buffer. (Section 2.2.)

The paper’s pair example states that the postcondition gives ownership of two valid subsegments and a way to recover the original segment. It also says: “This specification captures the essence of zero-copy parsing with no heap allocation.” (Section 2.2, p. 3.)

Verus form. Inference: represent ownership with Verus ghost permissions or linear ghost tokens tied to a slice and range, and prove disjointness of subranges before returning borrows. Use Rust slices and lifetimes for the executable aliasing boundary; use `requires` for valid serialization and `ensures` for unchanged bytes and returned-value relations. The paper’s magic wand is not a Verus call or keyword; the exact encoding requires a Verus state-machine or permission abstraction. Inference: a direct translation must not claim Pulse’s separation logic connective exists in Verus.

Failure boundary. Zero-copy values borrow the input buffer. Inference: VL callers must retain the buffer for the borrow lifetime or copy into owned data. The paper’s no-heap claim concerns its parser representation, not arbitrary application memory.

## technique 3: bounded writers and arithmetic-safety checks

PulseParse supplies value-size combinators that take an upper bound and fail when the required size exceeds it, avoiding arithmetic overflow (Section 2.2). Copy writers require a relation between application data and specification values and a sufficiently large output buffer. They return the number of bytes written or zero when the bound is inadequate. The paper’s copy-writer contract requires that the output buffer is large enough for the serialized bytes and that the low/high-level relation holds (Section 2.2).

How to apply it.

1. Compute a size bound before writing. (Section 2.2.)
2. Return failure when the bound is too small or arithmetic would overflow. (Section 2.2.)
3. Require a relation between application-owned and specification-level values. (Section 2.2.)
4. Write fields through compositional copy writers and prove the output relation. (Section 2.2.)

Inference: in Verus, use `requires` for buffer capacity and representation relation, `ensures` for exact byte count and serialization, and arithmetic lemmas to show no overflow. Keep the failure path explicit in the return type. The paper does not supply Verus code.

## technique 4: recursive formats with constant-stack validation

Theorem 2.1 covers formats whose objects begin with a header, contain a contiguous sequence of recursive payload entries, and contain nothing afterward, where the header alone determines the number of children. The paper concludes: “then data in this format can be validated in constant stack and memory space.” (Section 2, p. 5.) `parse_rec` is a recursive specification combinator. Its implementation validator is iterative: it maintains a counter initialized to one, decrements when an item starts, and adds the child count from its header. The validator succeeds when the counter reaches zero. The paper proves functional correctness with a loop invariant and avoids overflow because a valid header consumes at least one byte. (Section 2, p. 5.)

How to apply it.

1. Define a header parser that consumes at least one byte. (Section 2.)
2. Define `count` from a header to its number of immediate payload items and `synth` to construct the high-level object. (Section 2.)
3. Use the recursive `parse_rec` only as the specification. Its fuel is bounded by input length. (Section 2.)
4. Implement validation with a loop and an expected-item counter, not recursive calls. (Section 2.)
5. Prove the loop invariant, arithmetic safety, and functional correspondence to `parse_rec`. (Section 2.)

EverCBOR applies this to definite-length CBOR arrays, maps, and tags. Indefinite-length representations are deliberately excluded because arbitrary nesting would require stack space proportional to depth; the paper says it chooses “to validate all bytes at once after making sure we receive it.” (Section 3.1, p. 6.)

Verus form. Inference: write an executable loop over a byte slice with a ghost/spec counter and a loop `invariant` relating the counter to unvisited children and the current offset. Use a `spec fn` for the recursive reference parser and a `proof fn` to connect each loop iteration to one specification step. Prove `offset + header_len` bounds and checked arithmetic. This is a direct methodological adaptation, not a reported Verus implementation.

## technique 5: deterministic CBOR and non-malleability

What it is. EverCBOR first validates raw CBOR, then refines it to valid CBOR with no duplicate map keys, then to deterministic CBOR with minimal integer encodings and sorted map keys. The authors define mutually recursive validity and equivalence predicates, prove well-foundedness by a structural size, and show that canonicalization yields a unique representation. Theorem 3.1 states that deterministic CBOR is a data model bijective with a view type; Theorem 3.2 gives the lexicographic order used to sort items.

How to apply it.

1. Parse raw headers and payloads into a low-level representation that retains byte-size and map-entry order. (Section 3.2.)
2. Validate recursively with the constant-stack counter algorithm. (Section 3.2.)
3. Define validity recursively: children are valid and maps have no equivalent duplicate keys. (Section 3.3.)
4. Define equivalence that ignores alternate integer widths but compares semantic values, arrays, tags, and maps. (Section 3.3.)
5. Minimize integer widths and sort map entries by deterministic byte order. (Section 3.3.)
6. Prove that equivalent deterministic encodings are equal, yielding non-malleability. (Section 3.3.)

Verus form. Inference: define recursive `spec fn`s over an inductive ghost representation and a structural `size` measure; prove termination and canonicalization lemmas with `proof fn`s. Implement validation and sorting iteratively where possible, with loop invariants for sorted prefixes and duplicate absence. Use `ensures` to relate serialized output to the canonical representation. Verus must support the chosen recursive datatype and termination proof; the paper’s F* termination machinery is not transferable.

## technique 6: EverCDDL elaboration and verified code generation

What it is. EverCDDL takes CDDL, rewrites map groups into a canonical deterministic form, annotates excluded key domains, and rejects ambiguous alternatives. The elaboration function is partial. Theorem 4.3 says elaboration preserves validating semantics; Theorem 4.4 gives injectivity and a serializer for serializable values. The generated implementation contains types, validators, parsers, and serializers. For array groups it returns iterator slices and function pointers instead of eagerly parsing all elements; for maps it returns iterators and validators for key/value types. (Section 4.)

How to apply it.

1. Rewrite CDDL map groups into canonical form. (Section 4.1.)
2. Annotate key tables with excluded types and check disjoint alternatives, array-group conditions, and map-group footprints. (Section 4.1, Fig. 5.)
3. Reject an undefined elaboration rather than generating an ambiguous parser. (Section 4.1.)
4. Generate Pulse validators, low-level parsers, serializers, and relations to high-level values. (Section 4.2.)
5. Validate the complete CBOR item before exposing iterators; then parse lazily through verified iterator functions. (Section 4.2 and Section 5.1.)

Inference: a Verus generator could emit a Rust datatype, `spec fn` format, executable parser, and proof functions per schema. The generator itself can remain outside the trusted proof boundary only if each generated implementation is verified against its generated specification. The paper does not claim this for Verus.

## evidence, measurements, and trusted parts

The paper reports verification setup on an Intel Xeon E5-2680 v4 with 56 cores, using 24 cores. PulseParse has 650 lines for `parse_rec` and proofs, 700 implementation lines, and 6,400 Pulse combinator lines; verification takes 6 minutes. EverCBOR has 6k specification and 26k implementation/proof lines, verifies in 10 minutes, and extracts/compiles to C and Rust in 1 minute. EverCDDL has 6k specification and 23k implementation/proof lines and verifies in 0.5 hour. (Section 5, p. 12.) These are reported line counts and wall times for the stated machine and parallel-core setting.

Synthetic benchmark denominators and settings matter. Table 1 uses a record with eight unsigned-integer fields; EverCDDL validation/parsing is 3.33 μs versus QCBOR 1.91 and TinyCBOR 3.78, and serialization is 0.57 versus 0.23 and 0.29. A map benchmark has (N=8000) entries and (K=1000) random lookups; lookup is 138 μs for EverCBOR versus 282 and 306. Nested arrays contain (N=10^4) subarrays with (10^4) integers each, about 100 MB total; EverCDDL validation/parsing is 2.67/4.92 s and serialization 2.06 s, versus QCBOR 2.92/2.91 and 0.75, and TinyCBOR 2.68/2.68 and 1.23. (Section 5.1, Table 1, p. 13.) The slash distinguishes validation from parsing.

For COSE, Table 2 signs and verifies an 896-byte payload with Ed25519 on an Intel Xeon W-2255, clang 19.1.7 `-O3`; the C/OpenSSL and Pulse/HACL★ times differ by operation. The generated COSE F* file verifies in 5 minutes on one core and Karamel extraction takes 23 seconds (Section 5.2, p. 14). The paper does not give iteration counts for these timing measurements.

What is proved: memory safety, arithmetic safety, functional correctness, and non-malleability for the formalized formats and implementations. What remains trusted includes F*, Pulse, Karamel, extracted-code/compiler behavior, cryptographic libraries in the verified application boundary, the CDDL/CBOR specifications, and the application’s semantic interpretation. The authors explicitly do not support floating-point CBOR because of missing F* support and reject recursive CDDL as a security risk from input-proportional stack use (Section 3.3 and Section 4.1).

## transfer to VL and product threat

Inference: the threat to agent-written verified Rust is high at the format-specification and generated-code boundary if VL assumes extraction preserves all source-level invariants, or if it accepts streaming semantics that the paper intentionally excludes. The reusable design is strong: separate pure format semantics, low-level ownership predicates, bounded arithmetic, iterative validation, and generated code checked against the same specification. The paper is prior art for verified Rust binary parsing, canonical serialization, zero-copy ownership, and schema-driven generation. VL should not redo those general claims. A distinct VL result would need a Verus implementation, explicit trust accounting, and a meaningful extension such as verified resumable arrival semantics while respecting PulseParse’s whole-buffer validation boundary.

## techniques for the catalog

- specification/implementation combinators: define pure parser/serializer semantics and refine them into compositional low-level implementations
- separation-logic zero-copy parsing: split and recover ownership of valid subarrays while avoiding heap copies
- bounded writers: compute size limits and fail safely before insufficient buffers or arithmetic overflow
- constant-stack recursive validation: replace recursive execution with a counter loop proved against a recursive specification
- deterministic non-malleable encoding: validate, canonicalize integer widths, sort map keys, and prove unique byte representations
- CDDL elaboration and generation: reject ambiguous schemas, prove injective semantics, and emit verified parsers and serializers

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
