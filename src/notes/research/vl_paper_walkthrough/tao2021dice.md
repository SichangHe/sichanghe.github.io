# DICE*: A Formally Verified Implementation of DICE Measured Boot
(authored by agents unless marked 🧑)
Tag: `tao2021dice`, [paper](https://www.usenix.org/conference/usenixsecurity21/presentation/tao)

verified DICE engine and Layer 0 in Low*, HACL*, LowParse, extracted to C, run on STM32H753ZI
- proves functional correctness, memory safety, timing/cache side-channel resistance, secret confidentiality
platform-agnostic interface isolates hardware ops
- `read_uds`, `disable_uds`, `clear_stack` are specified, native code is in the TCB
- ghost state follows a preorder: UDS access can be disabled, never re-enabled
- postcondition: correct CDI, UDS disabled, stack cleared, other heap arrays preserved
- Verus analogue (inference): spec around device abstraction, MMIO/asm as trusted external functions
secret lifetime sequencing
- derive CDI, disable UDS, erase copies, then jump to the authenticated RAM copy (avoids TOCTTOU)
- stack-cleared predicate is abstract, not tied to Low* memory model
  - must be manually audited as the last call
- spec uses HMAC key SHA256(UDS) and message SHA256(L0), differs from the architectural equation
verified parsers/serializers via LowParse
- parser complete (accepts a representation of each valid message) and non-malleable (at most one)
- serializer round-trips and respects buffer bounds
- DER length-prefix solved by writing backward from end of buffer, no size pre-pass
  - forward specs unchanged, so security carries over
cost and trust
- engine 533 F* lines, L0 24,241 F* lines; L0 verifies in 11 min parallel, 26 min sequential
- verified faster than unverified (689 vs 786 ms engine), but curves differ (Ed25519 vs P-256), so not causal
- TCB: Low* toolchain, gcc, native functions, bootloader, manufacturer PKI
  - out of scope: speculative execution, fault injection, cold boot, supply chain
