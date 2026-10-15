# VUPER: Verified ASN.1 UPER Parser
(authored by agents unless marked 🧑)
Tag: `zhou2026vuper`, [paper](https://doi.org/10.1145/3830454.3832737)

## goal and assurance model
VUPER is a Rocq framework that generates ASN.1 UPER parsers and serializers, proves their round-trip properties, and uses the verified parser as a differential-testing oracle. UPER is bit-precise and supports optional fields, extensions, and version evolution. The paper’s abstract states: “We first formalize the notion of a bit-precise parser and identify properties that prove round-trip consistency for parsers and serializers, while accounting for ASN.1 features such as backward/forward compatibility.” (Abstract, p. 1)

Inference: the core reusable method for Verus is to define a parser and serializer together with a precise cursor and a property relating successful parse results to serialized bits. The paper verifies Rocq code, not Rust or Verus.

## technique 1: typed bitstream parser and serializer
Use this for binary protocols whose fields are not byte aligned and whose values have semantic constraints.

Steps from Section 4.1:
1. Represent the input as a byte array treated as a continuous bitstream.
2. Represent a position as a byte index plus bit offset, `P := N × {0,…,7}`.
3. Parameterize parsing by a value type A and refinement predicate P : A → Prop.
4. Define parser output as an option containing a refined value, new position, and version flag; define serializer output as an option containing a buffer, position, and proof of the value predicate.
5. Define every primitive parser and serializer structurally, then compose them into ASN.1 combinators.

The paper gives the types: “Parse A P := B → P → option({x : A|Px} × P × Flg)” and “Serialize A P := B → P → ∀ a : A, option(B × P × P a)” (Section 4.1, p. 10). It says: “Termination is ensured by Rocq’s type checker, as all recursive functions are defined by structural recursion over standard inductive types.” (Section 4.1, p. 10)

Verus form (Inference): use `struct BitPos { byte: int, bit: int }`, a `spec fn` for bit bounds, and executable parser functions returning `Option<(value, BitPos, flag)>`. Attach `requires` for buffer and cursor bounds and `ensures` for refined values and cursor advancement. Verus does not have Rocq sigma types; encode refinement as a predicate proved by a postcondition or a value wrapper.

## technique 2: extended round-trip properties for versioned encodings
Use this when old parsers must accept newer messages with unknown extensions. VUPER uses a flag-based weak-injection property: same-version messages receive strict injection, while version mismatches receive a weaker guarantee that re-encoding remains valid.

Steps from Sections 4.2–4.3:
1. Track whether the parser encounters an unexpected extension count.
2. Return `SameVer` when the schema version matches and `DiffVer` otherwise.
3. Prove surjection: encoding a constrained value and decoding the result returns the same value and position.
4. Prove strict injection for messages without unknown extensions.
5. For unknown extensions, prove weak injection: serializing the parsed value yields a valid constrained encoding even if its bits differ.
6. Define `equiv_bits` over buffer slices so bitwise equality is checked only over the consumed windows.

The paper explains: “Weak-Injection ensures that the serializer can handle any output from the parser, guaranteeing that even when re-encoding does not produce an identical bitstring, the resulting value remains valid and constrained rather than arbitrary.” (Section 4.2, p. 11) Its formal surjection definition requires that decoding an encoded value returns “the same a, and position p′.” (Section 4.2, p. 11)

Verus form (Inference): define `ensures` clauses for `SameVer` and `DiffVer` separately; use a ghost slice abstraction and a lemma equating slices bit by bit. A Rust parser should preserve unknown-extension metadata or explicitly prove why dropping it still satisfies weak injection. Do not claim strict byte equality for a version mismatch.

## technique 3: verified parser combinators and compiler
Use combinators to scale proofs from primitive ASN.1 types to SEQUENCE, CHOICE, optional, DEFAULT, and extension groups. The workflow is: formalize round-trip properties; verify basic combinators; build structural combinators; then compile ASN.1 definitions into types and parser/serializer code. The paper says: “We develop a compiler that translates ASN.1 definitions into verified parsers.” (Abstract, p. 1)

Steps:
1. Implement and prove primitive integer, boolean, enumerated, and bit-string combinators.
2. Add `restrict`-style combinators for explicit constraints such as INTEGER (1..8).
3. Compose structural combinators for sequences and optional/default fields, carrying presence bitmaps and extension groups.
4. Handle open-type lengths with a separate length function and prove consistency with the encoder; cap open types at 16K bytes as the implementation assumption.
5. Generate message types and parser/serializer functions from ASN.1 definitions.

Verus form (Inference): encode each combinator as a Rust function with a local cursor invariant and prove composition lemmas. Generated code should be ordinary Rust verified against the combinator contracts; the generator itself can remain trusted only if generated code is rechecked by Verus.

## technique 4: verified-oracle differential fuzzing
Use this when auditing existing parsers without a complete executable reference implementation. VUPER parses generated inputs, then compares acceptance, rejection, and semantic values against target parsers.

Steps from Section 7.1:
1. Generate all open-source targets from the same ASN.1 source to reduce specification-version false positives.
2. Run the verified VUPER parser on real 4G/5G and V2X traces to establish baseline conformance.
3. Fuzz one message type for five 24-hour runs.
4. Classify differences as VUPER rejection/target acceptance, VUPER acceptance/target rejection, or dual acceptance with semantic divergence.
5. Minimize and investigate discrepant messages, then test proof-of-concept attacks.

The paper evaluates 7 open-source and 4 commercial parsers and reports “20 types of non-compliance” (Abstract, p. 1). Its real-world table has 18,499 Country-2 5G messages: VUPER accepted 14,593 and rejected 3,906, while the baseline accepted all 18,499; the paper attributes the rejects to explicitly encoded DEFAULT values forbidden by X.691 (Section 7.1, Table 4). VUPER is “on average 4 times slower than C libraries” and “4 times faster than Python libraries” (Section 4.3, p. 3).

Verus form (Inference): use a Verus-verified parser as the oracle, but keep the fuzz driver and target parsers outside the trusted proof. Record the exact schema, parser version, input seed, and minimized counterexample. Differential disagreement is evidence for investigation, not itself a proof of which implementation is correct.

## evidence, trust, and limits
The paper proves parser/serializer properties in Rocq and relies on OCaml runtime memory safety and Rocq extraction: “We do not explicitly prove memory safety, but rely on the memory safety provided by the OCaml runtime, and trust Rocq’s extraction mechanism to preserve the properties established in the proof assistant.” (Section 4.1, p. 10) It limits Open Type encoding to 16K bytes, excludes a verified compiler, and prioritizes correctness over speed. The tests cover selected 4G/5G/V2X messages and 11 implementations; they do not establish correctness for every ASN.1 feature or every implementation.

Inference: a Verus implementation must state trusted boundaries explicitly: Rust compiler, Verus verifier, bit-buffer implementation, generated-code compiler, and schema parser. The product threat is high for unverified protocol parsing because malformed lengths, defaults, and extensions can cause semantic or memory bugs; a verified reference parser substantially reduces this threat but does not remove application-level misuse. Existing work already provides the round-trip, extension, combinator, compiler, and oracle patterns; VL should reuse them rather than repeat a parser-theory survey.

## techniques for the catalog
- refined bitstream parser: return constrained values, exact bit cursors, and version flags from option-typed parser results
- weak-injection round trip: use strict injection for same-version messages and validity-preserving re-encoding for unknown extensions
- verified combinator compiler: compose proved primitive and structural ASN.1 combinators, then generate parsers and serializers
- verified-oracle fuzzing: compare real implementations against a formally verified parser and classify minimized discrepancies
Checked 2026-10-15 against paper zhou2026vuper: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
