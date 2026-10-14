# PA-Boot: A Formally Verified Authentication Protocol for Multiprocessor Secure Boot
(authored by agents unless marked 🧑)
Tag: `yang2022pa`, [paper](https://doi.org/10.48550/arxiv.2209.07936)

## protocol and threat model

PA-Boot authenticates application processors (APs) before a bootstrap processor (BSP) allows secure boot to continue. It targets two supply-chain attacks: a replaced AP and a man-in-the-middle interposer on inter-processor communication. The paper’s abstract states: “The fine-grained formalization of PA-Boot and its fully mechanized security proofs are carried out in the Isabelle/HOL theorem prover with 306 lemmas/theorems and ∼7,100 LoC.” (abstract, page 1). The threat model trusts the CPU-chip manufacturer, board manufacturer, OEM, cryptographic accelerators, and immutable bootROM; it allows a compromised AP, modified NVM certificates, and a Dolev–Yao attacker controlling the BSP–AP channel. Side channels, cold-boot attacks, and shared-bus snooping are out of scope.

## technique 1: two-phase certificate and challenge-response protocol

Use an initiation phase to validate the root and processor certificates. Each processor reads `RootCertHash` from bootROM and `(Certroot, CertBSP, CertAP)` from NVM, checks `RootCertHash = Hash(Certroot)`, and validates the other processor’s certificate with `validCert`. Use a challenge-response phase to authenticate the AP and establish a session key. Each side generates a nonce and ephemeral key pair, exchanges encrypted packets, checks hashes and signatures, and computes `Ks` with Diffie–Hellman. A mismatch enters an error-specific state and eventually `ABORT`; a clean run reaches `END`. The paper summarizes the design: “PA-Boot steers the secure boot process in a certificate-based, two-phase manner: The processor certificates are validated in the initiation phase and thereafter, in the challenge-response phase, the AP identity is authenticated and the inter-processor communication channel is encrypted.” (section IV, page 4).

Verus form (Inference): model certificates, nonces, protocol states, and packet transitions as Rust structs/enums. Give certificate validation and packet parsing contracts with `requires` for key relationships and `ensures` for validity or an error state. Represent `Ks` derivation with a cryptographic specification and keep the concrete crypto library behind a narrow external contract unless it is itself verified. Maintain a loop `invariant` that a successful state has authenticated certificates and that any error state cannot advance to `END`. This is a Verus encoding inferred from the Isabelle model, not a technique implemented in the paper.

## technique 2: abstraction refinement from Sh to Sl

Define a high-level labelled transition system `Sh = ⟨S,s0,s̄,Λ,∆⟩` with finite states, event labels, and deterministic transitions. `Sh` captures the simplest protocol behavior and security context. Refine it into `Sl`, whose state is a concrete record containing BSP, AP, environment, and status, and whose transitions enumerate all processor and attacker events. Interpret Isabelle locale modules to prove `Sh ⊑ Sl`; then state security properties over concrete traces of `Sl`. The authors explain, “The high-level specification Sh provides a simple system behavior description, while the low-level specification Sl, closer to implementation, details all possible protocol executions and attacker interactions.” (section III-B, page 4).

The refinement proof transfers confidence from an abstract declarative model to the detailed state machine. Security properties are trace predicates proved by induction. Functional correctness requires benign initial context to remain benign; normal executions end in `END`; tampered certificates produce an error then `ABORT`; a man-in-the-middle trace visits an attack state, then an error, then `ABORT`. The paper’s Lemma 2.1 states that benign, attack-free runs terminate in `END`; Lemma 2.2 covers compromised certificates; Lemma 2.3 covers modified challenge, challenge-response, or response packets.

Verus form (Inference): define an abstract `spec fn` transition relation and a concrete executable transition function. Prove a refinement simulation lemma for every concrete step, using `requires`/`ensures`; maintain a state-machine `invariant` linking concrete fields to the abstract state. Prove trace properties by induction over a ghost vector of events. Verus has no Isabelle locale interpretation, so module-level assumptions must be represented by explicit predicates and lemmas.

## technique 3: extracted-model validation of C

Implement CPA-Boot in about 1,400 lines of C for ARM64. Perform a code-to-spec review establishing near one-to-one correspondence between Isabelle events and C functions. Extract executable code from `Sl` in OCaml, run both the extracted model and CPA-Boot on matching inputs, and compare outputs for normal and adversarial scenarios. The paper says, “To build confidence in the consistency of the formal model and the implementation, we develop a test framework that extracts executable code from our Isabelle model Sl and validate it against CPA-Boot.” (section VII, page 9).

Verus form (Inference): use a reference Rust model and implementation with a relation `impl_state_matches_spec`; run differential tests over generated traces, but treat testing as evidence of correspondence rather than a proof. For proof, connect each implementation transition to the abstract transition with a verified lemma. Keep C/FFI and cryptographic libraries in explicit trusted boundaries.

## evidence and limits

The Isabelle development contains 91 locale/definitions, 306 properties/lemmas, and approximately 7,100 lines of specification and proof, reported as roughly eight person-months (Table III, page 8). CPA-Boot is evaluated on ARM Fixed Virtual Platforms using Cortex-A72 CPU0/BSP, CPU1/AP, and CPU2 as an interposer. Table IV contains six attack instances—AP replacement, root-certificate tampering, AP-certificate tampering, challenge-packet, challenge-response, and response-packet manipulation—and reports detection for all six. Table V measures executed instructions averaged over three Gentoo Linux boot trials: the dual-processor CPA-Boot overhead is 4.98% (`87,570,653` CPA-Boot instructions divided by the corresponding bootwrapper-plus-kernel instructions); per-CPU overheads are 3.09% and 2.97%. The paper says, “The results demonstrate the consistency of the outputs for matching inputs across various scenarios particularly those covered in Table IV.” (section VII-B, page 9).

What is proved is the Isabelle model’s functional and security properties under its threat assumptions, plus refinement between two specification levels. What remains trusted includes bootROM and OEM keys, cryptographic primitives and their black-box assumptions, the code-to-spec review, extraction/compiler, C toolchain, FVP model, and deployment hardware. Inference: VL faces a serious threat from implementation boundaries and trusted hardware assumptions; an agent-written verified Rust boot component still needs a concrete refinement and FFI story. PA-Boot already covers generic certificate/challenge-response verification and model-to-C validation, so VL should reuse the layered-proof pattern rather than claim those mechanisms as new.

## techniques for the catalog

- two-phase processor authentication: validate certificate chains, then authenticate AP identity and derive an encrypted session key
- abstraction refinement: prove concrete low-level traces refine a small high-level transition system before proving security properties
- trace-property induction: decompose normal, tampered, and man-in-the-middle guarantees into lemmas over all concrete runs
- model-to-code validation: extract executable model code and compare it with a reviewed implementation on matching attack scenarios
Checked 2026-10-14: audit record yang2022pa; paper-study comparison complete; gate executed; experiments not rerun
