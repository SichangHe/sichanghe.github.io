# APEX: A Verified Architecture for Proofs of Execution on Remote Devices under Full Software Compromise
(authored by agents unless marked 🧑)
Tag: `nunes2020apex`, [paper](https://www.usenix.org/conference/usenixsecurity20/presentation/nunes)

## purpose and result

APEX is a proof-of-execution (PoX) architecture for low-end embedded devices whose software may be completely compromised. The paper targets a remote verifier that needs evidence that a specified program ran atomically on the intended device and produced an authentic output. The authors state: “In this paper we answer these questions by designing, demonstrating security of, and formally verifying, APEX: an Architecture for Provable Execution.” (abstract, p. 771). APEX combines a VRASED remote-attestation implementation with a hardware module that tracks an executable region, output region, metadata, and an `EXEC` bit. The attestation HMAC covers executable memory, output memory, and metadata, including `EXEC`. A valid proof requires code and metadata to stay unchanged from execution start through proof computation, output to stay unchanged after execution through proof computation, and execution to run without interruptions or active DMA (Definition 3, p. 777; sections 5.1–5.2, pp. 778–779).

Inference: The paper’s formal-verification recipe is reusable. It says: “Computer-aided formal verification typically involves three basic steps. First, the system of interest (e.g., hardware, software, communication protocol) is described using a formal model, e.g., a Finite State Machine (FSM). Second, properties that the model should satisfy are formally specified. Third, the system model is checked against formally specified properties to guarantee that the system retains them.” (section 3.1, p. 774). APEX uses model checking for hardware submodules and a theorem prover for the composition argument.

## technique 1: define a proof-of-execution contract and adversary game

What it is. The paper defines a PoX tuple `(XRequest, XAtomicExec, XProve, XVerify)` and a security game. `XRequest` sends software `S` and a fresh challenge; `XAtomicExec` executes an executable region `ER`; `XProve` produces proof `H` over `ER`, challenge, and output `O`; and `XVerify` accepts only when `H` authenticates the requested software and output. Atomic execution starts at the first instruction, ends at the last, contains no instructions outside `ER`, and has no interrupt or DMA event.

Inference: When to use it. Use this contract when a remote party must distinguish a fresh execution on this prover from a replay, partial run, run of replacement code, or fabricated output. The security game explicitly gives the adversary control of all prover software, writable memory, and DMA, while excluding physical attacks and assuming the CPU obeys its specification (section 4.1–4.2, pp. 775–776).

Inference: How to apply it.
1. Specify `S`, its executable memory interval `ER`, its output interval `OR`, and challenge `C_hal` in the request (Definition 3, p. 777).
2. Require `XAtomicExec` to start at `ER_min`, finish at `ER_max`, and reject interruption, DMA, or execution outside `ER` (Definition 1, p. 776).
3. Make `XProve` bind `H` to `S`, `C_hal`, and the actual `O`; make `XVerify` check both execution and output authenticity (Definition 1, p. 776).
4. State attacks as game wins: acceptance without a complete execution, or acceptance of an output different from the execution’s output (Definition 2, p. 776).

Inference: Verus form. A Rust/Verus specification can model the contract with a `spec fn` describing a trace and a `proof fn` whose `requires` state that the trace starts and ends at the declared addresses and has no interrupt/DMA event, and whose `ensures` state that verification implies the trace and output match. The cryptographic reduction remains an assumption or an external verified primitive; Verus does not automatically prove HMAC security.

Evidence. The paper’s Definition 2 gives the exact two winning conditions and requires negligible winning probability for every probabilistic polynomial-time adversary (section 4.1, p. 776). This is a security definition, not an implementation measurement.

Limits. The authors state: “PoX schemes do not aim to check correctness and absence of implementation bugs in S.” They also exclude run-time attacks exploiting bugs in S itself (section 4.1, p. 775). Inference: VL must separately verify the Rust program’s functional and memory-safety properties before treating a PoX as evidence of a safe result.

## technique 2: compose a hardware execution monitor with verified remote attestation

What it is. APEX stores configurable `ER_min`, `ER_max`, `OR_min`, and `OR_max` in metadata that must remain unchanged from execution start through proof computation. Hardware sets `EXEC` to 1 only when the program counter reaches `ER_min`; any violation sets it back to 0, and only a fresh restart can set it to 1 again. VRASED’s attestation HMAC covers `EXEC`, metadata, challenge memory, executable memory, and output memory. The paper states: “APEX hardware module runs in parallel with the MCU, monitoring its behavior and deciding the value of EXEC accordingly.” (section 5.1, p. 778).

Inference: When to use it. Use this pattern when software is untrusted but a small hardware/ROM trusted base can observe instruction and memory signals. It is suitable for low-end MCUs where a TPM, enclave, or branch-trace monitor is too expensive.

Inference: How to apply it.
1. Provide VRASED’s attestation-code (`CR`), challenge/result (`MR`), key (`KR`), and exclusive-stack (`XS`) regions. In `XProve`, use `MR = C_hal` and include `ER`, `OR`, and `METADATA` in the attested region `AR` (Table 1, p. 777; Appendix B, pp. 787–788).
2. Configure `ER` and `OR` boundaries before execution; clear `OR` as the first step if some execution paths leave output bytes unwritten (section 5.1, p. 778).
3. Allow `EXEC` to change from 0 to 1 only when execution starts at `ER_min`. Set it to 0 on writes to `ER` or metadata, CPU writes to `OR` from outside `ER`, DMA writes to `OR`, active DMA or interrupts during `ER` execution, improper entry/exit, invalid boundaries, or reset. Challenge writes are metadata writes. A proof with `EXEC=1` requires completion at `ER_max` (Definition 6, p. 781; section 5.1, p. 778).
4. Run VRASED’s attestation routine and include `EXEC`, metadata, `ER`, and `OR` in the HMAC input; the verifier accepts only an HMAC with `EXEC=1` (sections 5.1 and 6.2, pp. 778–781).
5. Model-check the hardware against its LTL sub-properties. Prove that those properties plus the machine model imply APEX correctness, then give a cryptographic reduction from an APEX forgery to a VRASED forgery (section 6, pp. 779–781; Appendix B, pp. 786–788).

Inference: Verus form. The monitor state can be a Rust model with ghost fields for `exec`, region bounds, and a trace. A `proof fn` can preserve `invariant(exec == 1 ==> started_at_er_min && no_violation)` across a modeled step; a `requires` clause can enforce disjoint ranges, and `ensures` can connect accepted verification to an unchanged output. This is a proposed model, not a Verus artifact from the paper. Hardware signal axioms and HMAC security must stay trusted unless separately established.

Evidence. The authors explain: “The resulting SMV is simultaneously verified against all LTL specifications, using the model checker NuSMV [12], to prove that the final Verilog of APEX complies with all necessary properties.” (section 6, p. 779). Table 2 (p. 782) reports OpenMSP430 / VRASED / APEX+VRASED as follows: 691/721/735 registers, 1904/1964/2206 LUTs, 0/2332/2341 reserved RAM bytes, and –/10/20 LTL invariants. APEX+VRASED has 1,385 verified Verilog lines; verification takes 183.6 seconds and 280.3 MB. Section 7.1 (p. 782) specifies Ubuntu 16.04 at 3.40 GHz as the verification setup.

The overhead comparisons use different baselines. The paper states: “APEX hardware overhead is small compared to the baseline VRASED; it requires 2% and 12% additional registers and LUTs, respectively.” It then says: “In absolute numbers, it adds 44 registers and 302 Look-Up Tables (LUTs) to the underlying MCU.” (section 7.1, p. 782). Inference: Table 2 confirms that 44 registers and 302 LUTs compare APEX+VRASED with bare OpenMSP430; APEX’s increment over VRASED is 14 registers and 242 LUTs. The paper reports 9 extra RAM bytes for metadata, or 0.01% of the MSP430 16-bit address space.

Limits. The CPU is assumed correct; physical attacks, ROM modification, hardware faults, and physical side channels are out of scope (section 4.1–4.2, pp. 775–776). Shared-library calls outside `ER` invalidate the proof; self-modifying code violates the immutability invariant (section 8, p. 783). Atomic execution also forbids interrupts; the paper says a real-time task may need to restart from the beginning after interruption (section 8, p. 783).

## technique 3: authenticated sensing and actuation

What it is. APEX binds memory-mapped sensor reads and actuator writes to the attested executable and output. In the fire-sensor example, `ReadSensor` reads temperature/humidity GPIO memory and copies the result to `OR`; `SoundAlarm` writes 1 to the buzzer address, busy-waits for two seconds, and writes 0 (section 7.3, pp. 782–783). The remote authority requests these functions and verifies their execution using PoX. The paper explains: “PoX guarantees that reported values were read from the correct GPIO port (since the memory address is specified by instructions in the ER executable), and produced output (stored in OR) was indeed generated by execution of ER and was unmodified thereafter.” (section 7.3, p. 783).

Inference: How to apply it.
1. Map each physical input/output to fixed MCU addresses and include those addresses in the executable’s instructions (section 7.3, p. 783).
2. Put returned measurements in `OR`; configure `OR` to cover every output and clear it first when a path might leave stale bytes (section 5.1, p. 778; section 7.3, p. 783).
3. Request the executable and boundaries with `XRequest`, then verify the HMAC before trusting the measurement or command (sections 5.1 and 7.3, pp. 778, 783).

Inference: Verus form. A verified Rust sensor wrapper can expose a `spec fn` mapping an input address to a logical measurement and use `ensures` to state that an accepted result equals the value read during the attested call. The physical GPIO device, HMAC implementation, and MCU signal semantics remain trusted unless separately verified.

Evidence. The proof-of-concept uses an 8 MHz APEX-enabled MSP430 synthesized on a Basys3 Artix-7 FPGA and communicates over ZigBee. Porting the open-source sensor code required about 30 additional C lines, mainly replacing shared `digitalRead/Write` APIs (section 7.3, p. 783). The authors state: “We do not observe any overhead for software’s execution time on the APEX-enabled P rv since APEX does not introduce new instructions or modifications to the MSP430 ISA.” Proof generation includes execution plus attestation. The reported 900 ms worst case is for `XProve`, when `ER+OR` occupies the full 8 kB program memory on an 8 MHz device; it excludes the program’s own execution time (section 7.1, p. 782).

Inference: This authenticates a reported value’s origin in the specified execution; it does not establish sensor calibration or physical accuracy. VL should treat sensor-driver correctness and physical-model assumptions as separate proof obligations.

## what is proved, measured, and trusted

The formal claim is that APEX sub-properties imply PoX security when composed with VRASED. NuSMV checks the RTL FSM invariants; SPOT assists the LTL implication proof. Appendix B separately gives the cryptographic reduction to VRASED security (section 6.2, p. 780; Appendix B, pp. 786–788). Measurements cover FPGA/RTL resource overhead, verification time and memory, proof-generation time, and a fire-sensor demonstration. Trusted assumptions include CPU conformance, cryptographic HMAC security/correctness inherited from VRASED, immutable ROM and hardware, and the exclusion of physical attacks. Inference: agent-written verified Rust could use the contract and invariant decomposition, but a Verus proof alone cannot establish the hardware monitor or cryptographic reduction.

Inference: VL can reuse the separation between program correctness, hardware execution monitoring, and cryptographic authenticity. A proof that code ran still needs a correct program specification and explicit sensor and hardware assumptions.

## techniques for the catalog

- PoX security game — define request, atomic execution, proof, verification, and explicit forgery or tampered-output wins

- LTL hardware monitor composition — protect executable, output, and metadata regions and prove their conjunction implies end-to-end attestation security

- authenticated sensing and actuation — bind memory-mapped physical I/O and returned outputs to a fresh, unmodified execution proof
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The resulting SMV is simultaneously verified against all LTL specifications, using the model checker NuSMV [12], to prove that the final Verilog of APEX complies with all necessary properties."): read the whole paper including appendices; checked quotations, protocol steps, assumptions, measurements, and section/page references; corrected the publisher link, request definition, memory-region instructions, violation conditions, overhead baselines, proof-time scope, proof-method description, and page references; marked proposed Verus/VL applications as Inference; did not reproduce proofs, run the implementation, or independently validate hardware or physical sensing.
