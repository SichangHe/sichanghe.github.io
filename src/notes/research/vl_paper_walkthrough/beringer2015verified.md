# Verified Correctness and Security of OpenSSL HMAC
(authored by agents unless marked 🧑)
Tag: `beringer2015verified`, [paper](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/beringer)

end-to-end Coq proof for OpenSSL 0.9.1c HMAC-SHA256
- C code satisfies FIPS 198-1 and 180-4 specs, and HMAC is a PRF assuming SHA compression properties
- 16-link assurance graph chains FIPS spec, Bellare spec, Verifiable C, CompCert, FCF
  - each interface machine-checked on both sides
  - TCB: items 1, 2, 8, 12, 14, 15 (specs, C semantics, assumptions)
  - changing the crypto theorem touches only items 15, 16
- size: HMAC proof 2832 Coq lines, SHA-256 6574 lines, HMAC spec 533 lines
- scope limits
  - adapted old source, not every OpenSSL release
  - no timing or side channels
functional spec as byte-list functions
- HMAC256 m k = HmacCore m (KeyPreparation k)
- conversions between machine ints and Z bytes kept explicit
- spec is trusted: a correct proof can still prove the wrong requirement
separation-logic API contracts (Verifiable C)
- disjoint key, message, digest blocks
- post: digest = HMAC256, inputs unchanged
- frame rule keeps the HMAC data structure intact across the SHA call
crypto proved as games in FCF
- PRF, WCR, RKA games composed via reduction lemmas
- bridge lemmas (padding, byte/bit conversion, injectivity) connect abstract to concrete
  - abstract security says nothing about code until bridged
incremental API verified via abstract state
- C context states related to abstract state, update composition proved
- CompCert preserves io properties down to assembly
verus lesson (inference)
- spec fn for SHA/HMAC, requires/ensures on Rust
- compiler link and crypto security are outside Verus, must be assumed
