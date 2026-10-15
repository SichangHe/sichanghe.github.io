# A Verified Certificate Checker for Finite-Precision Error Bounds in Coq and HOL4
(authored by agents unless marked 🧑)
Tag: `becker2017verified`, [paper](https://arxiv.org/abs/1707.02115)

## scope and result

FloVer is a formally verified checker for certificates containing finite-precision roundoff bounds. A separate static analyzer (Daisy in the evaluation) computes ranges, types, and error bounds; FloVer checks the certificate and proves that the bounds hold for the real and finite-precision executions. The abstract states: “This paper presents a formally verified and modular tool which fully automatically checks the correctness of finite-precision roundoff error bounds encoded in a certificate.” (abstract, p. 1). The implementation is proved in both Coq and HOL4; HOL4 definitions are extracted through CakeML to a verified binary, while Coq extraction is unverified OCaml (Sections I–II, pp. 1–2).

Inference: the reusable product pattern is a small, independently checkable certificate plus a trusted checker, rather than trusting a large analyzer. For VL, a generated agent proof artifact could similarly be checked by a small verified kernel, but this paper gives no Verus integration and no evidence that Rust proof certificates can be represented this way.

## technique 1: certificate format and modular validators

what it is and when to use it. A certificate records the analyzed expression, input domain, type assignment, and an abstract result for each subexpression. Use it when an untrusted or complex analyzer should provide evidence that a small checker can validate. The paper lists the payload: “the expression f , as an abstract syntax tree (AST)”; “a precondition P , specifying the domain (interval) of all input variables”; “a … type assignment Γ”; and “the analysis result which consists of a range ΦR and an error bound ΦE for each intermediate subexpression.” (Section II, p. 2).

how to do it. (1) Encode the expression `f` as an AST. (2) Encode precondition intervals `P` for free variables; input ranges are necessary because errors are unbounded without ranges (Section II, p. 2). (3) Encode `Γ`, including mixed floating-point precisions or fixed-point word/fractional sizes. (4) Encode `ΦR` real-value ranges and `ΦE` positive rational absolute-error bounds for every AST node. (5) Run four validators: `validTypes`, `validRealRange`, `validErrors`, and `validMachineRanges`. The authors state: “We have implemented the validators in both Coq and HOL4 and proven an overall soundness theorem.” (Section II, p. 2).

Verus form. Inference: define a serializable ghost certificate type containing a syntax tree, precondition, abstract ranges, and proof summaries; then write a `proof fn` checker whose `ensures` says the certificate implies the desired contract. Keep certificate parsing and checking separate from the analyzer. Verus does not use Coq's extraction model, so an executable Rust checker would need a separately trusted parser and arithmetic library.

evidence. Figure 2 shows the same certificate structure in Coq and HOL4. FloVer's overall theorem composes all four validators; no external analyzer proof is required for a certificate that passes checking. The paper does not give a certificate-count denominator in the abstract; the later benchmark tables report 19 accuracy rows and 20 timing rows (the full appendix contains more rows).

assumptions and limits. The certificate checker does not re-run the complete static analysis; it validates the supplied result. Incorrect ranges or error bounds cause checking to fail, but conservative bounds may pass. FloVer supports straight-line expressions, local variables, FMA, floating point, and fixed point, but “FloVer currently does not handle conditionals and loops.” (Section VIII, p. 7).

## technique 2: structurally validate ranges and types

what it is and when to use it. `validTypes` infers/checks a full type map; `validRealRange` checks that each AST node's real-valued result lies within its certified interval. Use these before checking errors because error propagation needs both types and operand ranges.

how to do it. (1) Start with partial annotations `Γ`; `validTypes(Γ,e)` computes a full map `ΦT` and rejects an invalid type. The paper says the full map is reused “in both the error validator and the machine range validator.” (Section IV, p. 3). (2) For every AST node, evaluate the real expression under the input precondition and interval or affine arithmetic; check containment in `ΦR`. (3) Handle let-bindings without recomputing a bound by reusing the stored result. (4) For fixed point, require a complete `Γ` because fractional bits are supplied externally (Section IV, p. 3).

Verus form. Inference: model `ΦR` as ghost interval bounds and prove, by recursion over an expression enum, that evaluation lies between lower and upper bounds. Use `requires` for input intervals and `ensures` for containment. A Rust `enum` AST and a recursive `proof fn` can mirror the structural validator; the paper's rational arithmetic and IEEE operations need a Verus numeric library.

evidence. The soundness theorem for `validRealRange` states that values under `P` evaluate within `ΦR`; the type theorem states that inferred precision agrees with evaluation precision (Section V, p. 4). Proofs are by structural induction on `e`, with 16 and 32 arithmetic subcases for multiplication and division respectively (Section V, p. 5).

assumptions and limits. Interval arithmetic loses correlations; the paper notes it cannot show `e1 − e1 ∈ [0,0]`, while affine arithmetic tracks linear correlations (Section IV, p. 3). Bounds are therefore sound overapproximations and may reject a valid certificate.

## technique 3: propagate roundoff errors and reject unsafe machine ranges

what it is and when to use it. `validErrors` checks each `ΦE(e)` against the real/finite-precision difference, while `validMachineRanges` ensures no overflow, NaN, or division by zero. This gives both numerical accuracy and absence of runtime errors.

how to do it. For an addition, use the certified operand errors and the fresh operation error. The paper gives the inequality: “|(e1 + e2 )−(ẽ1 +fp ẽ2 )| ≤ |e1 − ẽ1 | + |e2 − ẽ2 | + error((ẽ1 + ẽ2 ), f p)” (Section IV, p. 3). For multiplication and division, bound the difference between ideal and finite-precision products/reciprocals, then add the new operation error (p. 3). At each AST node: (1) obtain operand ranges from `ΦR`; (2) obtain operand errors from `ΦE`; (3) compute the operation-specific upper bound; (4) compare it with the certificate's `ΦE`; (5) reject if a denominator range may contain zero. For floating point, also check that a range contains only finite IEEE754 values; for fixed point, check representable magnitude and no overflow (Section V, pp. 4–5).

Verus form. Inference: state operation-specific error lemmas as `proof fn`s with interval and precision preconditions and absolute-error postconditions. Use a ghost environment relating ideal real values to finite-precision values; carry this relation through recursive AST evaluation. A checker can return `bool`, while a separate proof function establishes that `true` implies the error contract. Rust's floating-point semantics and arbitrary-precision rationals require explicit library models.

evidence. Theorem 1 states that if all four validators succeed, there exist real and finite-precision results and every finite-precision result is within `ΦE(f)` of the real result (Section V, p. 4). The authors connect this abstract execution to IEEE754 in Coq Flocq and HOL4 floating-point libraries, proving that successful checking implies a finite IEEE754 execution (Section V-A, p. 5). They found a Daisy division bug: Daisy checked zero only in the real-valued denominator range, while the finite-precision range could contain zero (Section V-B, p. 5). FloVer rejects such certificates.

assumptions and limits. Equation 3's relative-error model applies only to IEEE754 normal values; subnormals, infinity, and NaN are treated as errors. Absolute bounds can be conservative. The soundness theorem is conditional on a successful certificate check and on the formalized IEEE754 connection.

## technique 4: extract a verified checker binary

what it is and when to use it. Execute the checker outside the theorem prover without losing its proved correctness. HOL4 functions are compiled with CakeML's proof-producing synthesis; Coq functions are extracted to OCaml but the latter binary is unverified. Use this when in-logic evaluation is too slow.

how to do it. (1) Define and prove the checker in HOL4. (2) Use CakeML to translate the ML-like definitions and prove the generated binary's correctness. (3) Add an unverified lexer and parser for certificate files. (4) Run the binary on the encoded certificate. The paper reports that compiling the CakeML libraries and checker took around 90 minutes on the experiment machine (Section VI, p. 5). The Coq path uses native extraction to OCaml and `ocamlopt` (Section VI, p. 5).

Verus form. Inference: a Rust checker could be verified as a normal executable function with a proof that its result implies the certificate theorem, then compiled with the ordinary Rust toolchain. This does not make parsing or the Rust compiler verified; a proof-carrying binary would need an independently justified extraction/compiler boundary.

evidence. Table II compares in-logic Coq/HOL4 checking with CakeML and OCaml binaries. For the `traincar4` benchmark (269 arithmetic operations), the table reports 10.6 s Daisy, 116.94 s Coq interval, 115.38 s HOL4, 17,429.3 s CakeML, and 0.77 s OCaml; these are end-to-end UNIX times under the paper's Debian 9, four-core Intel i3 3.3GHz, 8 GB RAM setup, averaged over three runs for provers and 300 executions for binaries (Section VII, p. 6). The displayed CakeML number is much slower than the others for this row; the paper nevertheless describes the verified binary as a performance improvement, so this table's setting/column should be checked before drawing a general speed claim.

assumptions and limits. CakeML verifies the generated binary but not the unverified parser. Coq's extracted OCaml binary has no equivalent compiler proof. Performance comparisons include certificate generation and parsing for some columns and therefore are not pure checker throughput (Section VII, p. 6).

## what is proved, measured, and trusted

The central formal result is Theorem 1: successful `validTypes`, `validRealRange`, `validMachineRanges`, and `validErrors` imply sound error bounds and finite evaluation. Theorem 2 connects this result to 64-bit IEEE754 executions (Section V-A, p. 5). The checker is implemented and proved in both Coq and HOL4. The evaluation compares FloVer and FPTaylor error bounds on the benchmarks listed in Table I (the paper says the full table is in the appendix), and reports per-benchmark timing rows in Table II, with arithmetic-operation counts and exact hardware/settings shown in the table. The paper does not report a single overall success percentage; it reports successful checks for the listed generated certificates.

Trusted components include the Coq/HOL4 kernels, the formalized IEEE754 libraries, CakeML's verified compiler for the HOL4 path, the certificate parser, and the mathematical assumptions about rounding. The external analyzer Daisy is not trusted for correctness because FloVer checks its output; it is trusted only as a certificate producer whose artifacts may be rejected. The authors explicitly say: “A successful run of FloVer shows that the encoded roundoff error is a valid upper bound and that the analyzed function can be run without any errors.” (abstract, p. 1).

Inference: threat to agent-written verified Rust is medium. The certificate/checker split could reduce the trusted computing base for generated proof artifacts and detect unsound analyzer output, but finite-precision arithmetic is a narrower domain than general Rust verification. The parser, Rust compiler, unsafe code, external libraries, and specification adequacy remain outside this paper's proof.

## what VL should not redo

VL should not claim novelty for modular certificate checking, validator composition, or extracting a HOL4 checker with CakeML. New work should test whether Verus can verify a compact checker for agent-generated proof summaries, quantify checker rejection/acceptance on mutated certificates, and state exactly which parser/compiler/library components remain trusted.

## techniques for the catalog

- certificate carrying analysis results — encode AST, precondition, types, ranges, and per-node errors for independent checking
- modular validator composition — check types, real ranges, machine ranges, and roundoff errors separately and compose soundness theorems
- interval and affine range validation — recompute sound enclosures inside the prover, using affine correlations when intervals are too coarse
- operation-level error propagation — derive addition, multiplication, division, and FMA bounds from operand ranges and errors
- machine-safety validation — reject overflow, NaN, infinity, and possible division by zero under finite-precision execution
- verified extraction — compile a proved HOL4 checker to a CakeML binary while distinguishing the unverified Coq/OCaml path
- analyzer/checker separation — treat Daisy as an untrusted certificate producer and accept only certificates passing the verified checker
Checked 2026-10-14 against the paper by a Codex agent: audit record becker2017verified; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
