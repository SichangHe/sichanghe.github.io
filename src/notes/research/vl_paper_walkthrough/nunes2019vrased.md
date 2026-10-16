# VRASED: A Verified Hardware/Software Co-Design for Remote Attestation
(authored by agents unless marked 🧑)
Tag: `nunes2019vrased`, [paper](https://www.usenix.org/conference/usenixsecurity19/presentation/de-oliveira-nunes)

## scope and result

VRASED is a formally specified and verified remote-attestation design for low-end embedded devices. It combines a hardware module that protects a key and controls attestation execution with software that computes HMAC-SHA256 over an attested memory region. The paper states: “VRASED is the first formally specified and verified RA architecture accompanied by a formally verified implementation” (Section 1, p. 1430). Its end-to-end claims cover hardware, software, their composition, and remote-attestation soundness and security.

The target is a single-core MSP430-class MCU. The adversary controls all writable software state, code, and data, but cannot modify immutable attestation code or read hardware-protected key storage. The authors explicitly assume the MCU architecture follows axioms about program-counter and memory signals, reset, DMA, and interrupts, and they trust the compiler to preserve HACL* semantics. Physical hardware attacks are out of scope (Section 3.1, p. 1432).

## technique 1: formalize the end-to-end security contract

VRASED begins with protocol-level definitions rather than proving isolated implementation behavior. Remote attestation is a challenge-response protocol: a verifier sends a challenge, the prover computes an authenticated integrity check over memory and the challenge, and the verifier checks the result (Section 2.1, pp. 1430–1431). The paper defines soundness as temporal consistency: the reported HMAC must describe one unchanged memory state during the computation. Its Definition 1 requires that if execution starts with attested memory M and challenge C, and reaches the last instruction without reset, then the result is `HMAC(KDF(K,C),M)` (Section 4.2, p. 1435).

Security is expressed as a game in which an adversary may modify attested and result memory but loses that ability while attestation runs. The adversary wins only by producing a valid HMAC for a message different from the memory at the call time (Definition 2, p. 1435). The procedure is: (1) define the attacker capabilities; (2) define the soundness trace property; (3) define the cryptographic security game; (4) identify the assumptions connecting the machine model to the implementation; and (5) make every component property imply the end-to-end definitions.

Verus form. Inference: encode the prover state, challenge, memory snapshot, and attestation phase as state objects; use `requires` for the protected-memory and key assumptions and `ensures` for the result relation. A `spec fn` can describe the ideal HMAC relation, while executable Rust implements the protocol. The cryptographic unforgeability game remains an external theorem unless a verified cryptographic model is supplied.

## technique 2: divide the proof into LTL sub-properties

The authors use Linear Temporal Logic (LTL) over finite-state-machine models for hardware. “We start by dividing the end-to-end goal of RA soundness and security into smaller sub-properties that are also defined in LTL” (Section 1, p. 1430). Each hardware submodule is an FSM and is checked with NuSMV; a theorem prover then uses LTL equivalences to show that the conjunction implies the end-to-end definitions (Sections 1 and 2.2, pp. 1430–1431).

Application steps are: (1) define the signals and memory regions; (2) state each security obligation as an LTL formula; (3) model the corresponding hardware block as a Mealy FSM; (4) run the model checker over all reachable states; (5) combine the checked formulas; and (6) prove the implication to soundness and security. The paper lists temporal operators `X` (next), `F` (eventually), `G` (globally), and `U` (until) (Section 2.2, p. 1431).

Verus form. Inference: represent the FSM state and transition as a Rust state machine, then prove that each transition preserves the safety conditions and that a decreasing execution measure establishes progress to the attestation end. Verus can express state relations and arithmetic postconditions, but it does not directly replace NuSMV's LTL model checker; the temporal encoding and finite-state proof obligations must be supplied explicitly.

## technique 3: verified software attestation and compiler boundary

SW-Att derives a context-specific key with HKDF and invokes HACL*'s verified HMAC-SHA256 over the attested region. HACL* is described as functionally correct, memory safe, and secret independent (Section 4.3, p. 1436). The paper's code shape first copies the protected key, derives a key from the challenge, computes HMAC into a fixed result address, and returns. Functional correctness is stated as an LTL property conditioned on code, key, attested memory, and protected regions remaining stable during execution (Definition 3, p. 1436).

The method is: (1) place SW-Att in immutable ROM; (2) allocate its temporary buffers on the stack; (3) use HACL*'s verified HMAC; (4) expose only a fixed result location; and (5) connect the F* functional guarantee to the LTL machine property. The paper does not have a verified MSP430 compiler. It therefore assumes “the standard compiler can be trusted to semantically preserve its expected behavior” (Section 3.1, p. 1432), including callee-saved registers and C-to-assembly semantic preservation.

Verus form. Inference: specify HMAC as a `spec fn` relation and verify a Rust implementation with `requires` for non-overlapping buffers and `ensures` for the digest. A separate proof must connect the Rust memory model to the target machine; a Verus proof of source-level HMAC does not prove compiler or assembly preservation. Secret independence should be an explicit relational property, not inferred from memory safety.

## technique 4: hardware access control, atomicity, and controlled invocation

The key-access FSM resets the MCU whenever code outside the attestation region reads an address in key storage. The paper gives the invariant: “G : {¬(PC ∈ CR) ∧ Ren ∧ (Daddr ∈ KR) → reset }” (Section 4.4.1, p. 1437). The atomicity and invocation FSM requires that execution can leave SW-Att only at its last instruction, can enter only at its first instruction, and resets if an interrupt occurs during execution (Section 4.5.1, p. 1437). These properties prevent jumping into the middle of the routine, early return, and interrupt-based interleavings.

Steps are: (1) define code region CR and key region KR; (2) monitor program-counter, read-enable, address, and interrupt signals; (3) transition to reset on an illegal key read; (4) enforce first and last program-counter states; (5) reset on an interrupt in the protected region; and (6) model-check each FSM against its LTL specification. The paper provides separate verified FSM diagrams for key access and invocation (Figures 8 and 9, pp. 1437–1438).

Verus form. Inference: use a state enum and a transition function with `requires` describing valid signal combinations and `ensures` stating that forbidden reads or control transfers lead to reset. A caller should not be able to invoke the proof-only transition function at runtime; executable hardware behavior must remain separate from proof specifications.

## technique 5: exclusive stack, erasure, and DMA defenses

VRASED protects temporary key-derived state with an exclusive stack region XS. LTL properties reset on any non-attestation access to XS and on attestation writes outside XS or the fixed MAC result region MR (Section 4.6.1, p. 1438). The design additionally models DMA, because DMA can bypass CPU memory-access checks. DMA accesses to key or exclusive-stack memory always trigger reset; any DMA activation while SW-Att runs also triggers reset through extra LTL specifications (Section 4.7, pp. 1438–1439).

The paper discusses three ways to handle residual stack data: reserve a protected stack; erase the stack at the end of SW-Att; or invoke HMAC a second time with an independent constant key so deterministic HACL* allocations overwrite key-tainted buffers (Section 5, pp. 1439–1440). The double-HMAC option costs about twice the CPU cycles. The paper states that boot-time RAM erasure is still needed in variants without a reserved stack, and that compiler-based cleanup increases the trusted compiler base (Section 5, p. 1440).

Verus form. Inference: prove non-aliasing and region separation for XS, MR, KR, and AR as preconditions, then prove that each transition preserves those regions. A DMA model must be a separate transition relation; proving CPU accesses alone leaves a bypass. For erasure, prove that every secret-dependent location is overwritten before returning, or retain a protected region whose access policy is itself verified.

## evidence, trusted assumptions, and limits

NuSMV verified all required hardware properties. The composed HW-Mod check used 13.6 MB and 0.28 seconds; individual checks used 7.5–8.5 MB and 0.02–0.05 seconds (Table 2, p. 1441). On FPGA, the secure-stack design adds 587 Verilog lines, 6.6% LUTs, 5.4% registers, and 6.3% logic cells; attesting 4 KB takes 3,601,216 cycles or 450.15 ms at 8 MHz (Table 3, p. 1441). The double-HMAC design takes 7,201,605 cycles or 900.20 ms (Table 3, p. 1441). The secure stack reserves 2.3 KB RAM, about 3.5% of MSP430's 16-bit address space (Section 6.3, p. 1441).

The full LTL-equivalence proofs are machine-checked with Spot 2.0, which the paper calls a proof assistant, and the authors provide the proofs publicly (Appendix A, p. 1444). Trusted components still include the MCU's implementation of axioms A1–A5, the compiler assumptions A6–A7, HACL*'s verified translation boundary, and the absence of physical attacks. The design targets low-end single-core MCUs; it does not verify a general-purpose processor or an MSP430 compiler, and its guarantees depend on the assumed signal semantics and exclusion of physical attacks.

Inference: VRASED is a direct model for VL's product risk. Agent-written Rust can be functionally proved while the compiler, machine model, memory isolation, interrupts, DMA, and cryptographic assumptions remain outside the proof. The paper's strongest reusable pattern is contract-first decomposition: state the end-to-end property, prove small hardware and software obligations, then prove their composition. Inference: VL could reuse an appropriate verified cryptographic implementation while focusing on the target Rust-to-machine boundary and on explicit assumptions about interrupts, aliasing, DMA-like concurrency, and secret erasure.

## techniques for the catalog

- end-to-end LTL contract — define remote-attestation soundness and a cryptographic security game before implementation proofs
- divide-and-conquer model checking — verify finite-state hardware submodules and prove their LTL conjunction implies the global goal
- verified cryptographic software boundary — reuse HACL* functional, memory-safety, and secret-independence guarantees while recording compiler assumptions
- access-control and atomicity FSMs — reset on illegal key reads, interrupts, entry, or exit behavior
- exclusive-memory and DMA modeling — protect stack and result regions and model non-CPU memory accesses explicitly
- composition theorem — derive temporal consistency and unforgeability from component properties and HMAC security
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Since a reset can be triggered during attestation execution, any registers and memory accessible to regular applications must be erased upon reset."): I read the complete paper text, the omitted pages in the PDF, and all appendices; checked quotations, numbers, section/page references, metadata, and techniques; corrected publisher link, page references, read-versus-write attacker capabilities, soundness precondition, DMA scope, Spot description, and trust/limit wording; did not reproduce FPGA measurements or inspect the public implementation.
