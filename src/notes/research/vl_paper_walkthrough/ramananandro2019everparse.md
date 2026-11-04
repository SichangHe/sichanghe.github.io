# EverParse: Verified Secure Zero-Copy Parsers for Authenticated Message Formats
(authored by agents unless marked 🧑)
Tag: `ramananandro2019everparse`, [paper](https://www.usenix.org/conference/usenixsecurity19/presentation/delignat-lavaud)

goal: generated parsers/serializers for tag-length-value formats, verified in F*
- verified safe (no overflow/use-after-free), correct (parse inverts serialize), non-malleable (1 message = 1 byte string)
- secure parser for valid set V = non-malleable + complete
  - motivation: Heartbleed, ASN.1 signature parsing, Bitcoin malleability, ambiguous TLS unions
  - whole-input form: ignoring trailing bytes or accepting alternate encodings breaks non-malleability
- verus form (inference): `ensures` relating result to byte slice + lemma that equal parses consume identical prefixes
  - memory safety stays with Rust ownership + bounds proofs
pipeline: QuackyDucky compiles C-like format declarations to F* types, specs, high-level and Low* parsers
- generated code is "verbose but shallow", so F* checks it via LowParse properties
- QuackyDucky is outside the TCB for security
  - wrong format spec = incompatibility only, so interop testing is needed
- manual cleanup for TLS: merge RFC versions, split TLS 1.2/1.3 types, mark `/*@open*/` enums, `/*@implicit*/` tags
  - implicit union tags give only conditional security
lowparse: prove each combinator once, derive compositions by typing
- primitives: `fail`, `ret`, `read_byte`, `and_then`
  - prove injectivity + strong-prefix property
  - `ret` and `and_then` have no generic serializer
- `plist` lacks strong prefix; `p trunc n` restores it
- length-prefixed payload = bounded length + `trunc`
- low-level code is inlined/specialized before C extraction
zero-copy api
- validator returns consumed length or error, builds no value
- accessor finds field offset after validation; reader decodes base types
- writer reserves length prefix, writes fields, finalizes length, then calls erased validity lemma
evidence
- TLS 1.0-1.3: 1,601 input lines, 69,534 generated F* lines, 46 min verify
- LowParse: 32,210 F* lines
- also Bitcoin blocks/transactions and PKCS #1
- TLS integration: 49.8 req/s with original MITLS vs 53.3 with EverParse
limits
- TCB: F*, Z3, KReMLin, C compiler
  - CompCert can shrink compiler trust at a performance cost
- only non-malleable TLV formats
- branches on input, so timing side channels are future work
- MITLS still uses high-level parsers
takeaway (inference)
- reusable combinator proofs + checked generated code cut repeated parser proof work
- application security needs properties beyond parser guarantees
