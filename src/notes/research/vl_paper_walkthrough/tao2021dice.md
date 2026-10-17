# DICE*: A Formally Verified Implementation of DICE Measured Boot
(authored by agents unless marked 🧑)
Tag: `tao2021dice`, [paper](https://www.usenix.org/conference/usenixsecurity21/presentation/tao)

## purpose and result
DICE* specifies and verifies the platform-agnostic DICE measured-boot engine and Layer 0 (L0). The implementation uses Low*, HACL* cryptography, and a custom ASN.1/X.509 library built with LowParse; KreMLin extracts the computational code to C. The authors integrate it on an STM32H753ZI microcontroller. The platform-agnostic proofs cover functional correctness, memory safety, and resistance to timing and cache side channels. Their confidentiality argument combines precise output specifications, restrictions on allocation and modification, explicit stack clearing, and abstract secret-byte types. Hardware operations remain trusted: “This native implementation is part of our TCB.” (Section 4, p. 1096; referring to the platform-specific implementation of the engine interface)

## technique: separate platform-independent proof from hardware operations
Inference: this separation is useful when devices share protocol logic but differ in secret storage and memory erasure. Define a state record containing CDI, the L0 image, and ghost state. Require the arrays to be disjoint and permanently allocated. Expose `read_uds`, `disable_uds`, and `clear_stack` through specifications; implement the engine against these, then link extracted C to native implementations. The authors explain: “To make the DICE engine implementation general and portable, we design a platform-agnostic interface (Section 4.1) against which we implement the core DICE engine (Section 4.2).” (Section 4, p. 1096)

The ghost state evolves according to a preorder. The interface permits disabling UDS access but provides no operation to enable it again. `read_uds` requires enabled access and a live stack buffer; `clear_stack` requires disabled access and preserves heap arrays. The engine's postcondition requires correct CDI, disabled UDS access, a cleared stack, and preservation of other heap arrays. The Stack effect prevents heap allocations and I/O. These specifications constrain the core's observable effects. (Sections 4.1–4.2, p. 1097)

Inference: a Verus adaptation could put specifications around a device abstraction and isolate MMIO and assembly in trusted external functions. It would need an explicit model of permitted state transitions and memory effects; ordinary functional specifications alone would not establish constant-time execution of generated Rust machine code.

## technique: prove measured-boot sequencing and secret lifetime
The architectural sequence authenticates L0 in RAM, derives CDI, disables UDS access and erases copies, then transfers control to the authenticated RAM copy to avoid TOCTTOU. Equation 1 gives `CDI_L0 = HMAC(UDS, Hash(L0))`. The implementation specification and code instead use `SHA256(UDS)` as the HMAC key and `SHA256(L0)` as the message. Preserve this distinction when transferring the implementation. (Section 2.1, pp. 1093–1094; Section 4.2 and Figure 5, pp. 1097–1098)

The verified core copies UDS into a stack buffer, hashes UDS and L0, computes CDI, disables UDS, clears the stack, and returns. Authentication and transfer require the surrounding platform integration. The stack-cleared predicate is abstract rather than connected to Low*'s memory model. The authors explicitly require manual auditing: “Since it is not connected to the Low* memory-model, it has to be manually audited to ensure that it is the last call in the DICE engine implementation.” (Section 4, p. 1096)

Inference: a Verus model could represent disabled access with ghost state and preserve a stack-cleared predicate after the final hardware operation. Actual erasure and hardware access restrictions would still require separate validation. Restricted secret types would require an accompanying enforcement argument before claiming side-channel resistance.

## technique: verified parsers and variable-length serializers
LowParse specifies complete parsers that accept at least one representation of each valid message, and non-malleable parsers that accept at most one. A serializer must return bytes that parse back to its input, consuming all bytes. Low-level serializers must match these specifications, preserve other memory, and respect buffer bounds. These properties prevent encoding ambiguity and unintended output changes. The paper states: “By building our X.509 library using LowParse, we formally verify that our parsers and serializers are also secure.” (Section 5.1, p. 1098)

DER uses tag-length-value encoding, with a variable-size encoding of the length. Forward placeholders would require knowing their sizes first. The extension writes the value from the end of the buffer, obtains its serialized length, then writes the length and tag before it. There is no separate preliminary message-length pass. Composition reverses execution order: the backward serializer for a pair invokes the second serializer before the first. The forward parser/serializer specifications remain unchanged, so their security properties carry over. (Section 5.2, pp. 1099–1100)

Inference: a Verus adaptation could use sequence specifications and byte buffers with cursor and bounds invariants. It would need proofs of parser completeness, non-malleability, inversion, and exact write ranges. Proving only that parsing reverses serialization would cover only part of the paper's specification.

## evidence, trust, and limits
Table 1 reports 533 F* lines and 205 extracted C lines for the engine; L0 has 24,241 F* lines and 5,051 C lines. Verification takes 1m10s and 11m9s with modular parallelism on an HP Z840; sequential L0 verification takes 26m2s. These counts and times exclude HACL* and LowParse. (Section 6, p. 1102)

Table 2 reports engine boot times of 786 ms unverified and 689 ms verified, with binary sizes of 72 KB and 68 KB. L0 takes 313 ms and 208 ms, with both binaries at 92 KB. The comparison uses one MCU and different curves: the handwritten mbedTLS implementation uses P-256; DICE* uses Ed25519. The authors attribute the engine difference to image-verification performance and the L0 difference to certificate serialization. Inference: these measurements support practicality on this platform, but do not isolate verification as the cause of faster execution. (Section 7.2 and Table 2, p. 1103)

The TCB includes the Low* toolchain, native hardware functions, bootloader, drivers, native declassification, and a secure manufacturer PKI. Verification extends through extracted C; using gcc adds it to the TCB. HACL*'s pure SHA256 specification is trusted and tested against standard vectors. On STM32H753ZI, `disable_uds` is empty; the trusted bootloader disables access by exiting secure access mode. The bootloader and platform interface contain 38 assembly lines and 815 C lines. Speculative execution, fault injection, cold boot, microscope-based extraction, manufacturing attacks, and supply-chain attacks are outside scope. (Sections 2.3, 2.5, 3.3, and 7.1, pp. 1094–1096, 1103)

## techniques for the catalog
- platform-agnostic verified interface: constrain shared protocol logic through specified hardware operations
- secret-lifetime sequencing: specify irreversible UDS disabling and final stack clearing, with trusted platform enforcement
- parser/serializer inversion: combine secure format specifications with bounded backward serialization

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Instead of serializing messages forward from the beginning of the array, backward serializers serialize messages backward from the end of the array."): checked the entire paper and study, quotations, numbers, sections, printed pages, technique steps, and trust boundaries; corrected quotations and page references, explained the UDS-hashing distinction, corrected backward serialization order, qualified Verus inferences, and replaced the link with the publisher page printed in the paper; did not inspect implementation artifacts or reproduce proofs or measurements.
