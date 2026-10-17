# Verifying Hardware Security Modules with Information-Preserving Refinement
(authored by agents unless marked 🧑)
Tag: `athalye2022hardware`, [paper](https://www.usenix.org/conference/osdi22/presentation/athalye)

## scope and security claim
Knox verifies complete hardware/software HSM stacks against a functional specification while accounting for wire-level timing behavior. The abstract defines the goal: “This definition captures the notion that the HSM implements its functional specification, and that it leaks no additional information through its wire-level behavior.” (Abstract, p. 503) The method, information-preserving refinement (IPR), compares a real world (host plus implementation) with an ideal world (specification plus emulator). IPR requires indistinguishability at both interfaces, including when the host switches between them (§3, pp. 505–506). The threat model allows arbitrary digital inputs and cycle-by-cycle output observations, but excludes physical attacks and analog observations (§2, p. 505).

Inference: IPR is a useful model for Verus when a Rust service has a lower-level observable interface. A Verus proof can relate concrete state to an abstract state and prove functional behavior plus an observational non-leakage relation, but cycle-accurate hardware and timing require an explicit model beyond ordinary Rust contracts.

## technique 1: information-preserving refinement with driver and emulator

what it is and when to use it

A driver is part of the specification and translates abstract operations into wire-level I/O. An emulator is a proof artifact that translates arbitrary wire interactions back into specification operations. IPR requires an emulator such that the real and ideal worlds remain indistinguishable, including after switching between functional and physical views. This captures timing and malformed-input leaks that ordinary functional equivalence misses.

how to apply it

1. Write a functional specification exposing operations such as `store`, `retrieve`, or `get_totp` and define the security behavior (for example, a PIN guess limit).
2. Define a driver for each spec operation using wire primitives (`set-input`, `get-output`, `tick`, and `yield`). The driver is trusted specification code.
3. Model the implementation as a cycle-accurate state machine: circuit state, one-cycle step function, initial nonvolatile state, and reset/power behavior.
4. Supply a refinement relation `R` between implementation and specification states. It normally includes a quiescence invariant between abstract operations. Require it initially, before/after driver-mediated operations, and after switching from physical to functional view, when driver reinitialization resets the circuit in these implementations (§4.2, pp. 506–507). It need not hold at arbitrary intermediate circuit steps.
5. Prove functional equivalence: starting from states related by `R`, every spec operation and its driver produce the same output and leave states related by `R`. Include the driver’s no-op behavior, because the circuit keeps running between operations (§4.3, p. 507).
6. Write an emulator for each wire interaction. It may query the specification and keep auxiliary state across cycles; initialize its auxiliary state to null on switching from functional to physical view (§§3, 4.4, pp. 505, 507).
7. Prove physical equivalence for every finite sequence of wire inputs: circuit outputs equal emulator outputs and final circuit/spec states are related by `R` (with the circuit reset as required).
8. Conclude IPR from initialization, functional equivalence, and physical equivalence. The paper states, “Together, these properties imply IPR.” (§4, p. 506)

Verus form (inference)

Inference: represent abstract and concrete states as Verus structs, `R` as a `spec fn` relation, and each operation as an executable function with `requires`/`ensures` preserving `R`. A driver can be a verified wrapper over the Rust API; an emulator is ghost/proof code that maps observable calls to abstract operations. Prove an observational equivalence lemma for each finite trace. Verus cannot directly prove physical timing unless timing is modeled as explicit state and transitions.

evidence and limits

The definition transfers cryptographic and non-cryptographic properties, including PIN guess limits and timing secrecy. The driver is trusted, as the paper says: “The driver is a part of the specification (and is trusted).” (§1, p. 503) Knox verifies the emulator’s behavioral correspondence, but checks its efficiency through manual audit. The authors state, “The Knox framework does not fully formalize or mechanically verify emulator efficiency.” (§8.1, p. 514) An inefficient emulator could hide a leak by brute force. IPR requires deterministic specifications, so true random-number generators are unsupported; the paper proposes a CSPRNG with explicit entropy input instead.

## technique 2: hybrid symbolic execution for functional equivalence

Knox symbolically executes driver code against the implementation and compares each abstract operation. The driver may contain unbounded nondeterminism (`yield`) and branches. Knox handles `yield` by automatically finding fixed points and handles path explosion with state merging and solver-checked hints.

steps

1. Compile C with GCC’s RISC-V backend into the circuit’s software image. Process Verilog with Yosys’s SMT-LIB backend, then convert that output into a Rosette model using `#lang yosys`. Model the software as initial ROM contents within the circuit, not as a separate verified layer (§6, p. 510; §8.4, p. 514).
2. Symbolically execute each driver operation against the circuit from states satisfying `R`, and compare its result with the corresponding specification operation.
3. For `yield`, compute a set of symbolic states closed under the circuit step function, using symbolic subsumption checks. Continue symbolic execution for each state in the set, covering arbitrary waiting (§5.1, p. 508).
4. Place untrusted `merge` hints in the driver. At those points, Knox uses subsumption checks to find a smaller set of symbolic states that still covers every concrete state in the original set (§5.1, p. 508).
5. Check output equality and preservation of `R` for every resulting path, including the no-op operation. Optionally prove the stronger crash-safety property separately: an interruption followed by reset leaves a state related to either the pre-operation or post-operation specification state (§4.5, p. 508).

The paper emphasizes that “All invocations of hints are verified by the Knox framework with an call to the SMT solver when necessary.” (§5.3, p. 509) Thus hints affect performance, not soundness.

Verus form (inference)

Inference: model a `yield` loop with a Verus loop invariant and a proven summary lemma, then use `decreases` where termination is required. Represent merged symbolic cases as a ghost enum or disjoint predicates and prove each branch's postcondition. Solver hints have no direct Verus equivalent; use explicit lemmas and `assert` statements whose validity Verus checks.

evidence and limits

Functional equivalence covers the functional view but not arbitrary physical I/O. Most functional-equivalence verification time comes from nondeterminism and crash-safety checking (§7.2, p. 513). The authors first disable these features for fast feedback, then re-enable them and repair proofs; this is a workflow optimization, not a weakened final theorem.

## technique 3: guided symbolic model checking for physical equivalence

Physical equivalence quantifies over arbitrary-length wire-input sequences. Ordinary symbolic execution directly handles only a fixed-length sequence. Knox’s guided symbolic model checking instead explores symbolic states and checks subsumption to cover unbounded executions (§5.2, p. 509).

steps

1. Start from symbolic implementation/specification states related by `R`, with null emulator auxiliary state.
2. Use `STEP` to execute the circuit and emulator/specification for one cycle with the same symbolic input.
3. At every step, verify output equality and recovery: after circuit reset, its state must be related by `R` to the current specification state.
4. Use `SUBSUMED` to prove that a state under consideration is covered by an earlier explored state, closing that branch. Apply solver-checked hints to manipulate symbolic terms and guide exploration.
5. Continue until Knox checks that the state space is fully explored. The explored states include the initial states and are closed under the step functions, supporting an inductive proof (§5.2, p. 509).

The case-study emulators run a copy of the circuit with dummy data. They extract inputs from that copy, query the specification, and inject the results so its outputs match the real circuit (§7.1.1, p. 511). For TOTP, the emulator queries `audit` to reproduce timestamp-comparison timing. It invokes `get_totp` at the timestamp commit point, saves the result, and injects it when the dummy TOTP computation returns (§7.1.3, pp. 512–513).

A physical-equivalence proof catches leaks that functional tests do not. In the TOTP case, variable-latency C modulus leaked information about an HMAC-derived value; the implementation was rewritten in constant time. In the PIN-protected backup HSM, `strcmp` timing could reveal how many bytes of a PIN guess matched; the specification reveals whether the guess is correct and, for a correct guess, the secret (§7.1.1, p. 511). The password hasher instead leaked which persistent-memory region was active, revealing the parity of the number of hash operations; branch-free C code fixed that leak (§7.1.2, p. 512).

Verus form (inference)

Inference: encode each observable input/output step as a transition in a Verus state machine, with a ghost abstract state updated by the emulator relation. Prove a simulation invariant for every step and a loop/state-space invariant for repeated inputs. Unbounded trace coverage still needs an inductive argument; finite tests or bounded symbolic runs are insufficient.

evidence and limits

The method covers wire timing and arbitrary digital I/O under the modeled interface, but not analog side channels such as electromagnetic leakage. Knox is single-threaded (§7.2, p. 513). Inference: applying the model’s guarantee to a deployed device requires the translated circuit model and deployment process to preserve the modeled behavior.

## technique 4: end-to-end stack verification and bug discovery

Knox verifies hardware, embedded software (including peripheral drivers), persistence, and cryptographic accelerators as one cycle-accurate system. The host-side specification driver remains trusted (§6, p. 510). It does not prove a generic CPU; software is effectively inlined into the hardware model. The three case studies are a PIN backup HSM, password hasher, and RFC 6238 TOTP token.

The paper reports the following sizes and settings. Figure 16 (p. 513) gives specification core/total, driver, hardware, software, and proof lines: PIN backup 32/60, 110, 2670, 190, 470; password hasher 5/150, 90, 3020, 240, 650; TOTP 10/180, 80, 2950, 360, 830. Figure 18 (p. 513) gives verification minutes on an Intel i7-5930K: PIN backup FE-N 1, FE-N+C 10, FE 209, FE+C 962, PE 8; password hasher 1, 6, 74, 238, 4; TOTP 3, 8, 44, 141, 8. FE and PE together imply IPR; `-N` disables driver nondeterminism and `+C` adds crash-safety checking.

Verification caught an uninitialized CPU address bus activating the SHA256 peripheral at boot; the fix also required `mem_valid` (§7.1.2, p. 512). In the PIN backup HSM, a PIN-dependent commit time allowed repeated guesses with carefully timed power-offs, despite correctness and crash safety; constant-time code fixed the commit point (§7.1.1, p. 511). In TOTP, a missing `volatile` qualifier allowed the compiler to move the commit flag update before the state write, violating crash safety (§7.1.3, p. 512).

The TOTP modifications changed FPGA LUTs from 3966 to 3962 (−0%), maximum clock frequency from 20.01 to 20.53 MHz (+3%), code size from 2412 to 2592 bytes (+7%), and operation latency from 0.73 to 0.83 ms (+14%) (Figure 19, p. 514; baseline versus verified token). The latency comparison used a 12 MHz clock and 2M baud rate; most of the slowdown came from rewriting dynamic truncation to avoid symbolic memory addresses (§7.2, p. 514).

Inference: these numbers establish feasibility for three small HSMs, not scalability to commercial HSMs or arbitrary Rust systems. The authors state that the verified HSMs are relatively simple, do not use public-key signatures, and rely on a manual audit for emulator efficiency.

## techniques for the catalog

- information-preserving refinement — require an emulator that makes real wire behavior indistinguishable from a secure functional specification
- refinement relation — relate concrete cycle/state-machine states to abstract states and preserve the relation across operations and resets
- functional equivalence — prove driver-mediated implementation calls match specification outputs and final states
- physical equivalence — prove every wire trace is reproducible by an emulator with no extra observable information
- fixed-point symbolic execution — summarize unbounded waiting and repeated cycles during symbolic equivalence checking
- guided symbolic model checking — use `STEP`, `SUBSUMED`, and solver-checked hints to cover arbitrary-length physical traces and verify recovery at each step
