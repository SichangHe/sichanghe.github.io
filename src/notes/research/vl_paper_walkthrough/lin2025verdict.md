# Towards Practical, End-to-End Formally Verified X.509 Certificate Validators with Verdict
(authored by agents unless marked 🧑)
Tag: `lin2025verdict`, [paper](https://www.usenix.org/conference/usenixsecurity25/presentation/lin-zhengyao)

## scope and result
Verdict is a formally verified X.509 validator implemented in Rust with Verus. It covers parsing, path building, and customizable validation policies. The paper’s central engineering technique is to separate common parsing/path logic from policy logic and compile a concise policy DSL into verified executable code. The abstract claims “Verdict’s formal guarantees cover certificate parsing, path building, and path validation.” (abstract, p. 5035)

The threat model includes malicious leaf and intermediate certificates but assumes no malicious local actor, which includes assuming the user-provided root certificates are issued by trusted CAs. The authors say “we need to trust the end-to-end specification itself (including the user-provided policy encoded in our policy DSL), the Verus program verifier, the Rust compiler, and our glue code calling external verified cryptographic libraries.” (section 3, p. 5037) The implementation is about 13,000 lines of verified proof/code (Verus) plus 3,200 lines of unverified Rust, of which 79% does not need to be trusted (the policy DSL compiler and testing infrastructure); the rest, glue code for the crypto providers, is trusted (section 6, p. 5043).

## technique: executable specifications and Verus refinement
What it is: define mathematical `spec fn`s over immutable sequences and prove that executable Rust functions refine those specifications. The paper explains that “A spec function in Verus cannot be compiled or executed, but it serves a concise, abstract definition for static reasoning.” (section 2.2, p. 5037) Executable functions are annotated with `requires`, `ensures`, and loop invariants; Verus also verifies basic safety such as absence of integer overflow and panics (section 2.2, p. 5037).

When to use it: Inference: use this pattern when production Rust must retain native performance while correctness is stated over simple mathematical values. Keep the specification independent of mutable slices and implementation details, then prove equivalence or refinement.

How to do it:
1. Write a pure specification function over mathematical types such as `Seq` or unbounded `int` (section 2.2, p. 5037).
2. Add a precondition (`requires`) and postcondition (`ensures`) to the executable Rust function (section 2.2, p. 5037).
3. Add loop invariants and other proof hints until Verus discharges each obligation (section 2.2, p. 5037).

Verus form: this is the paper’s native method. Inference: for another VL subsystem, use `spec fn` for abstract state and `proof fn` for lemmas, with `requires`/`ensures` on executable functions, and do not call a `spec fn` at runtime. Inference: the proof establishes only the stated specification, so the specification and all trusted calls remain part of the trusted base.

## technique: verified parser combinators and schema DSL
What it is: build ASN.1 DER parsers from reusable verified combinators (from the Vest library), each with specification and executable parsing/serialization functions, then derive complex X.509 structures from a macro DSL. The post-conditions of `parse` and `serialize` state that they are equivalent to the spec versions. The authors implement and verify 20 parser combinators for ASN.1 DER (section 4.1, p. 5039) and 26 combinators for X.509 certificates, including 9 commonly used X.509 extensions (section 4.1, p. 5040).

How to do it:
1. Define primitive combinators for base types (integer, object identifier, strings, UTC time), structures (sequence and union), tagging, and Base64 (section 4.1, p. 5039).
2. For each combinator, provide `spec_parse`, `spec_serialize`, executable `parse`, and `serialize`; prove the executable functions equal the spec ones (section 4.1, p. 5039).
3. Prove that parsing and serializing are partial inverses (`prop_inverses`) and that parsing is prefix-secure, meaning appending more bytes to the input does not change a successful parse result (section 4.1, p. 5039). The paper notes that the inverse property implies non-malleability.
4. Express a schema such as `TBSCertificate` in the `asn1!` DSL, and let the Rust macro generate the verified combinator (section 4.1, p. 5040).
5. Verify the top-level `parse_x509` is sound, complete, non-malleable, and prefix-secure (section 4.1, p. 5040).

Verus form: Inference: use `spec fn` parser relations over `Seq<u8>`, executable slices, `requires` for valid bounds, and `ensures` for parse-result equivalence; loop invariants must then preserve cursor position and the relation between consumed bytes and the spec sequence. The paper says the ASN.1 DER and X.509 combinators “are designed to be reusable in other Rust or Verus projects” (section 4.1, p. 5040). Inference: cryptographic signature checks remain external contracts.

Evidence and limits: the authors found that a popular Rust DER library’s encoding of ASN.1 object identifiers is incorrect and malleable in certain ranges (“1.2.128” and “1.2.0” encode to the same bytes), found during differential testing, confirmed by the library’s author and since fixed (sections 4.1 and 6.4, pp. 5039, 5046). Verdict as a whole still trusts unverified low-level utilities: Rust standard-library string functions (prefix/suffix checking, UTF-8 encoding, case folding) and the conversion of ASN.1 time to UNIX timestamps via the Rust library chrono (section 7, p. 5047).

## technique: complete path construction separated from policy
A naïve chain checker misses cross-signed alternatives. Verdict’s path-builder specification (Figure 3, p. 5038) requires a path from the leaf to a trusted root, with intermediates drawn from the supplied intermediates, where each edge satisfies the issuing relation (the policy’s `issued` predicate plus signature validity), the path has no cycles, and the policy’s `valid_path` holds. The executable performs a depth-first traversal of all simple paths; its postcondition says the result is true iff such a valid path exists (section 4.2, p. 5040), giving soundness and completeness. Signature checking uses EverCrypt via libcrux (verified) for ECDSA P-256 and RSA PKCS #1 v1.5, and AWS-LC for ECDSA P-384 (section 4.2, p. 5040).

Verus form: Inference: model a path as `Seq<Certificate>`, specify issuer and signature predicates, and use a visited-set invariant to prove depth-first traversal does not revisit certificates. The policy remains a parameter, so path construction does not hard-code browser behavior.

## technique: policy DSL with certified compilation and conformance
What it is: a policy is two predicates, `issued` (the issuing relation between certificates) and `valid_path` (extra constraints on a candidate path), written in a first-order-logic DSL with Rust-like syntax (section 4.3, p. 5041). The DSL compiles (via a procedural macro) to a Verus `spec fn` and an executable function with a Verus proof that it is equivalent to the spec; bounded universal and existential quantifiers become loops with suitable invariants and proofs (section 4.3, p. 5041). The OpenSSL policy is “formalized in less than 400 lines of specification” (section 4.3, p. 5041); the Chrome/Firefox/OpenSSL policies take 405/400/372 lines plus 325 lines of common definitions (section 5, p. 5042).

How to do it:
1. Define `issued` and `valid_path` for a policy; `valid_path` can be decomposed into `valid_leaf`, `valid_intermediate`, `valid_root`, and `check_name_constraints` (Figure 6, p. 5041).
2. State policy rules over certificate fields, key usages, validity times, and name constraints (section 4.3, p. 5041).
3. Compile the predicates; Verus then checks that each executable function’s result equals the policy spec (section 4.3, p. 5041).
4. Optionally prove RFC/BR conformance: express a requirement as a trait on `Policy` (for example `NonLeafMustBeCA`) and discharge it for a concrete policy; Verus did this automatically for all conforming properties, with no proof hints (section 5.1, p. 5042).

Results of conformance checking: of 20 encoded RFC 5280 and CA/B BR requirements, the Chrome, Firefox, and OpenSSL policies conform to 8, 10, and 11 respectively (section 5.1, p. 5042). Example differences: Chrome does not check expiration of a trusted root, and OpenSSL checks `notBefore ≤ t < notAfter` (section 5.1, p. 5042).

Verus form: use `spec fn` predicates and executable checks with `ensures` equivalence; provide loop `invariant`s for quantified scans. Inference: the policy spec itself stays trusted (section 3 says so); because Verus checks each generated function against it, the compiler need not be trusted (it is in the 79% the paper says need not be trusted).

## evidence, performance, and product threat
The benchmark uses 10,627,993 certificate chains from Certificate Transparency logs (collected by Hammurabi), with parsing of leaves/intermediates and chain validation measured on one Intel Core i9-13950HX with 32 GiB RAM; each chain gets ten timings and the minimum is used; root parsing is excluded (section 6.1, p. 5044). Mean times: Chrome 84 µs, OpenSSL 97 µs, Firefox 167 µs. Verdict with verified libcrux signature checking averages 157 µs (V/Firefox), 167 µs (V/OpenSSL), and 174 µs (V/Chrome); the starred variants use unverified AWS-LC RSA and ECDSA P-256 and average 69, 78, and 86 µs respectively (Figure 8, p. 5044). ARMOR and CERES were tested on 10K random samples and Hammurabi on 100K, because full testing did not finish (section 6.1, p. 5044).

Differential testing (section 6.2, p. 5045; Figure 9) compares the Verdict policies against the original implementations on the 10M CT chains and on 5,286 of 9,741 x509-limbo tests. On CT chains, Chrome and Firefox agree completely, and OpenSSL disagrees on 7 chains, which the authors attribute to a path-builder bug in baseline OpenSSL. On Limbo the policies are inconsistent on 0.1% (Chrome), 0.08% (Firefox), and 0.7% (OpenSSL) of tests, attributed to unsupported features and a Chrome harness clock issue. The authors “do not claim that our formalizations of Chrome/Firefox/OpenSSL policies behave exactly the same as the original implementations.”

Verus verifies the full project in 57 seconds on one thread, compared with 1,186 seconds for ARMOR type checking (section 6.5, p. 5047). Limits: Verdict’s Chrome and Firefox policies inherit only a revoked-certificate list; OCSP is not modeled, and policies are Boolean predicates without error reporting (section 7, p. 5047). The benchmarks disabled EV, revocation checking, networking, SHA1 fallback, and SCT validation in Chrome and Firefox because Verdict does not model them (section 6.1, p. 5043), and Limbo tests requiring IP validation or client authentication were excluded (section 6.2, p. 5045).

Inference: the threat to agent-written verified Rust is specification and trusted-glue drift: a passing proof can coexist with an incorrect policy, unverified time conversion, or a caller that supplies the wrong inputs. Inference: VL could reuse Verdict’s parser-combinator, exhaustive-path, and policy-DSL patterns, but should not claim that Verus alone proves external cryptography or the user’s intent. Inference: the paper already demonstrates end-to-end X.509 verification, so reproducing the architecture without a new target would redo existing work.

## techniques for the catalog
- spec/exec refinement: prove imperative Rust refines immutable mathematical specifications
- verified parser combinators: compose ASN.1 primitives with parse/serialize equivalence and prefix security
- schema macro generation: derive verified X.509 parsers from concise ASN.1 DSL declarations
- exhaustive path building: depth-first search all simple certificate paths with soundness and completeness postconditions
- policy DSL compilation: compile customizable validation predicates into verified executable checks
- conformance verification: prove a policy satisfies RFC/BR requirements stated as traits on the policy
- differential testing: compare policy models against the original validators on real certificate chains and a synthetic edge-case suite
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We cache the RSA public keys of the root certificates (including certain precomputation required for signature checking), which results in a 19% speedup in our experiments."): read the whole paper text start to finish and checked every quotation, number, section and page reference, and each technique step against it; changed the abstract quote and page (p. 5035), the capitalisation of the spec-function quote, the policy-DSL steps (the `issued` predicate was missing, and the conformance step wrongly cited equivalence proofs to p. 5042 instead of RFC conformance in section 5.1), the claim that the compiler must be trusted (the paper says it need not be), the differential-testing description (the paper reports bug and harness causes, not policy differences), the section and page of the limits, and the tag link (now the USENIX presentation page given on the paper's first page); removed an unsupported step on proof-only code and marked advice as Inference. I did not check the cited 2020 outage, the reference list, the figures' plotted values (Figure 7), or the PDF layout.
