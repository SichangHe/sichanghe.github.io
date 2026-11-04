# Towards Practical, End-to-End Formally Verified X.509 Certificate Validators with Verdict
(authored by agents unless marked 🧑)
Tag: `lin2025verdict`, [paper](https://www.usenix.org/conference/usenixsecurity25/presentation/lin-zhengyao)

verdict = verified X.509 validator in Rust + Verus (USENIX Sec 25)
- covers parsing, path building, path validation
- ~13k lines verified Verus + 3.2k unverified Rust
  - 79% of the unverified part need not be trusted (policy DSL compiler, test infra)
  - trusted: end-to-end spec incl. user policy, Verus, rustc, crypto glue code
- threat model: malicious leaf/intermediate certs, no malicious local actor
  - roots assumed issued by trusted CAs
spec/exec refinement is the core pattern
- `spec fn` over `Seq`/`int`, exec Rust with `requires`/`ensures`/loop invariants
- Verus also checks overflow and panic freedom
verified parser combinators (Vest) + schema macro
- 20 ASN.1 DER combinators, 26 X.509 combinators incl. 9 extensions
- each combinator: spec_parse/spec_serialize + exec parse/serialize proven equal
- proven properties: parse/serialize partial inverses (implies non-malleability), prefix security
- `asn1!` DSL generates verified combinators for structs like `TBSCertificate`
- bug found in popular Rust DER lib: OIDs `1.2.128` and `1.2.0` encode to same bytes
  - confirmed and fixed
path building separated from policy
- exec = DFS over all simple paths, postcondition iff a valid path exists (sound + complete)
  - handles cross-signed alternatives that naive chain checkers miss
- sig checks: EverCrypt via libcrux (ECDSA P-256, RSA), AWS-LC (P-384), all trusted contracts
policy DSL compiled to verified code
- policy = `issued` + `valid_path` predicates in FOL with Rust-like syntax
- proc macro emits `spec fn` + exec fn with equivalence proof, so compiler is untrusted
  - bounded quantifiers become loops with invariants
- Chrome/Firefox/OpenSSL policies: 405/400/372 lines + 325 common
conformance proofs
- state RFC 5280 / CA/B BR requirement as a trait on `Policy`, discharge per policy
  - Verus proves them with no proof hints
- 20 requirements: Chrome/Firefox/OpenSSL conform to 8/10/11
  - e.g. Chrome skips trusted-root expiry check
untrusted leftovers
- Rust std string functions, chrono time conversion
