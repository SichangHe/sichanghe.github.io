# CoqCryptoLine: A Verified Model Checker with Certified Results
(authored by agents unless marked 🧑)
Tag: `tsai2023coqcryptoline`, [paper](https://doi.org/10.1007/978-3-031-37703-7_11)

claim: automatic checker for CryptoLine specs (typed low-level program + pre/postcondition), reductions proved in Coq, results certified
- no Coq proof needed from users; tool is OCaml extracted from verified Coq
- two reductions
  - algebraic: polynomial equalities -> root entailment; sound, incomplete (bit-accurate arithmetic abstracted to modular equations)
  - range: QF_BV query to SMT; sound and complete
  - algebraic failure is inconclusive
- pipeline: parse -> AST -> SSA -> SSA2ZSSA (algebra) and SSA2QFBV (ranges, plus soundness-condition queries)
technique: typed low-level arithmetic model
- signed/unsigned bit-vectors with explicit casts, carry/borrow variants, split/join, multi-word shifts
- spec = input bounds + modular equality + output range
  - e.g. 4x64-bit limbs, out*2^256 = product mod p256, out < p256
- benchmarks: 54 real programs (Bitcoin, boringSSL, nss, OpenSSL, Kyber NTT)
  - 43 of 54 use features unsupported by bvCryptoLine (signed vars)
- limit (inference): correctness of source-to-CryptoLine translation and specs unaddressed
- Verus form (inference): spec fn for little-endian value, requires/ensures, limb lemmas; DSL semantics do not carry over
technique: certify external answers
- Singular emits ideal-membership witness q = sum ci*pi; checked by verified norm_subst
- QF_BV via certified CoqQFBV; SAT certificates checked by Grat
- trusted base: parser, text interface to SAT solvers, Isabelle (Grat), Coq
  - CAS and SAT search not trusted
  - bvCryptoLine uses Boolector with no certificates
- Verus form (inference): untrusted automation emits witness, Verus proves a checker over it
technique: transfer facts between theories
- assert in range theory, matching assume in algebra theory
  - e.g. carry=0@1 and overflow=0@1 proved by bit-vector side, assumed as carry=0 on algebra side
- the assert/assume equivalence is "currently not verified"
- ecp_nistz256_mul_montx (P-256): 230 lines spec, 50 annotation lines (20 declarations, 30 hints), 30 s on 24 threads
- Verus form (inference): proved lemma, never assume
technique: verified slicing + solver engineering
- slicing prunes predicates unrelated to the postcondition, including inside assume
  - optional, since it breaks completeness
- Singular lift beats gbarith on 9 of 12 hard instances; gbarith fails on 3 within 1 h
- substitution elimination, QF_BV bit-blasting cache, parallel obligations
- time share: ~93% external SMT, ~4.6% CAS (text vs Fig. 3b off by 0.1 point)
results
- field ops under 6 min; x25519_scalar_mult_generic (4,274 statements) ~1.5 h
- Kyber NTT: 2,642 s (reference), 1,048 s (AVX2), vs ~95 s unverified CryptoLine
- footnote: one complex case certifies only 2 of 3 modular equations
takeaway for Verus agents (inference)
- generate witnesses/certificates with untrusted automation, prove a small deterministic checker
- split nonlinear math lemmas from bit-accurate machine lemmas
- main risk is wrong spec or translation, or unsound assume-like bridge, not wrong solver
- no evidence for agent-written Rust or general systems code
