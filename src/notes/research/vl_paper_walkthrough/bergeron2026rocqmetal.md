# From Rocq to Metal: A Pipeline for Formally Verified Microcontroller Firmware
(authored by agents unless marked 🧑)
Tag: `bergeron2026rocqmetal`, [paper](https://arxiv.org/abs/2606.02651v2)

## architecture and verified boundary

The paper’s architecture keeps firmware business logic as a pure Rocq state machine and runs extracted code on Cortex-M hardware. The central type is `step : State × Event → State × list Effect`: an event is data from the device, and an effect describes an operation for an interpreter. The authors write, “We structure applications as pure state-transition functions, so the business logic is proved in Rocq while the event/effect boundary, host callbacks, compiler, and VM remain explicit trusted components.” (Abstract, p. 1)

When to use it. Inference: use this design when a product can separate deterministic policy and parsing from hardware I/O. The paper states, “Their size is independent of firmware complexity unless new hardware operations and capabilities are added.” (Section 2.1, p. 3) Section 2.3 also allows boundary changes for new externs or runtime primitives. It does not prove the event poller, effect interpreter, VM, compiler, callbacks, or hardware behavior.

Steps from Section 2 (pp. 2–4):

1. Define application `State`, incoming `Event`, and declarative `Effect` types.
2. Implement a pure `step` function that maps one state and event to a new state and an effect list. Copy values rather than mutating state and interpret effects outside the core.
3. State theorems over the parser and transition function. In the transaction example, `deserialize_preserves_data` proves bytes are neither dropped nor reordered, and `check_encoding_spec` proves every memo byte is ASCII (Section 2.4, pp. 4–5).
4. Implement the event poller and effect interpreter in the Formal Software Development Kit (FSDK), and connect host callbacks to the extracted VM.
5. Extract and deploy the verified logic through the compiler and runtime pipeline described below.

The transaction-signing example receives APDU bytes, parses fields, displays them for approval, then signs and returns a result. Its scope is limited: “The app is a toy: it is not tied to any real crypto protocol.” (Section 2.4, p. 4) The verified Gallina core is about 400 lines and the unverified Rust layer about 575 lines (Section 5.3, p. 12).

Verus form. Inference: model `State`, `Event`, and an effect description as Rust datatypes, then write executable functions with `requires` and `ensures` contracts for parser preservation and state-machine transitions. Use `proof fn` lemmas and `assert` to prove byte-order and encoding properties; use loop `invariant` for iterative parsers. Keep device polling, cryptography callbacks, and effect execution behind explicit trusted specifications. This mirrors the boundary but is an inference because the paper uses Rocq, not Verus.

Evidence. The app ran end-to-end on physical Ledger Flex hardware; other measurements use QEMU configured for Cortex-M (Section 5, p. 9). The paper reports two non-trivial machine-checked properties and states, “State-machine safety, signing only from PendingTx, follows by simpl; discriminate.” (Section 5.3, p. 12) Inference: the hardware demonstration shows deployment rather than proving the host layer.

## technique 1: extraction to Scheme and Encore! CPS VM

What it is. Rocq extracts Gallina to Scheme; Encore! parses the extracted subset, compiles it to CPS bytecode, and executes it in a `#![no_std]` register VM written in Rust. The VM has 256 registers, packed 32-bit values, a flat bump-allocated heap, and mark-compact garbage collection. The paper states, “Encore! is a #![no_std] register-based bytecode interpreter with 256 registers and no call stack.” (Section 4.1, p. 7)

Inference: use it when a hosted runtime will not fit embedded flash or RAM. The extraction survey eliminates Lean and OCaml runtimes; CertiRocq is conditional on bounded allocation; Scheme/Encore! preserves the proof extraction path and works bare metal (Table 3, p. 10).

Compiler and build steps (Sections 4.2–4.3, pp. 8–9):

1. Lex and parse extracted Scheme, recognizing Rocq extraction macros.
2. Build the direct-style (DS) intermediate representation.
3. Uncurry complete application chains to avoid closure allocation.
4. Convert DS to fully CPS-transformed, De Bruijn-indexed IR.
5. Iterate shrinking and expanding optimizations, then compile register-addressed IR to bytecode and run post-emission optimizations.
6. Link bytecode and generated bindings into the Rust firmware with `build.rs` and `include_bytes!`.

CPS removes semantic call-stack dependence; contiguous active registers make GC-root discovery straightforward (Section 4, p. 7). Host interaction is deliberately narrow: call a named global or closure with typed arguments, or register a typed callback invoked by `EXTERN` (Section 4.3, p. 8). Derive macros establish a compile-time mapping between host structs/enums and VM constructor tags.

Verus form. Inference: verify the VM’s dispatch and garbage collector with a state model and simulation invariants. Contracts can state that every live register has a valid tag and that compaction preserves reachable objects; loop `invariant` clauses can cover root scans. A Verus proof of the VM would still need models for bytecode and hardware callbacks. The paper’s current compiler and VM remain trusted.

Evidence and limits. Encore! alone among the three Scheme runtimes satisfied all four deployment requirements (Table 4, p. 10). The authors state, “The Encore! compiler’s nine CPS optimisation passes are currently implemented in Rust and trusted by construction.” (Section 6.2, p. 12) Inference: this trust boundary is a direct product risk if generated firmware relies on unverified compiler transformations.

## technique 2: resource-aware runtime comparison

The paper compares Encore! with a modified CertiRocq runtime on seven benchmarks under QEMU Cortex-M. Flash, minimum heap, and clean-build wall time are reported with tool versions and hardware context (Section 5, pp. 9–12). CertiRocq’s runtime was changed to use a static nursery, abort on collection, stub remaining methods, and configure bare metal (Section 5.2, p. 11). The comparison uses a restricted runtime: “The goal of these changes is to treat memory as a static bump allocator, enabling us to compare the runtime behaviors in terms of allocation rate and overall performance.” (Section 5.2, p. 11)

Table 5 reports seven benchmark cases. Encore! needs less heap except for `fsm`; for `rbtree-100`, CertiRocq requires about 63 KB and exceeds the 50 KB ST33J2M0 RAM limit, while Encore! uses 3,671 bytes. Encore! stays near 18 KB flash as tree size grows, whereas CertiRocq grows from 6 KB at 10 nodes to 146 KB at 100. Build-time ratios range from 1.3× to 665× in favor of Encore! on the reported cases (Table 5, pp. 11–12). The paper states, “Encore! needs less heap in every case except fsm.” (Section 5.2, p. 11) Inference: these are benchmark-specific resource measurements, not a universal runtime advantage or a comparison against CertiRocq with a functioning collector.

## technique 3: explicit axioms and trust-chain accounting

Hashing, CRC, finite-field operations, raw byte operations, and similar primitives are admitted as Rocq axioms and supplied as host callbacks or typeclass implementations (Section 2.2, p. 3). The trusted computing base includes the Rocq kernel and extraction, Scheme frontend, Encore! compiler and VM, Rust compiler, callbacks, event poller, and effect interpreter (Section 2.3, pp. 3–4). The paper says, “The current work therefore establishes verified firmware logic running on bare metal; proving the compiler or VM is future work, discussed in Sect. 6.” (Section 2.3, p. 4)

Verus form. Inference: represent every callback and external primitive with an explicit trusted specification and record it in the verification boundary. Keep the trusted implementation behind a separately specified interface instead of marking the target function itself as an external body. This is a design translation, not a claim about Rocq syntax.

## what is proved, trusted, and relevant to VL

Proved: Rocq theorems for parser preservation, memo ASCII validity, and signing only from PendingTx. Demonstrated: successful extraction and execution, including one physical-device demonstration. Measured: minimum configured heap, linked-image flash, and clean-build wall time under QEMU Cortex-M. Trusted: compiler, VM, Rust compiler, callbacks, I/O, and admitted mathematical primitives. Not proved: compiler correctness, VM simulation, hardware I/O, cryptographic callback correctness, or full end-to-end firmware equivalence.

Inference: VL would still need to account for runtime and foreign-function interface assumptions even when a pure policy core is proved. The paper’s architecture is a useful pattern for VL: isolate agent-written Rust policy from a small trusted host interface, and require contracts at that interface. VL should not redo the state-transition architecture or resource table as if novel; the open opportunity is a Verus proof of the VM or of the generated Rust host boundary, with explicit accounting of all trusted assumptions.

The paper proposes using `rocq-of-rust` to translate `encore_vm` to Rocq: “The central theorem to establish is a simulation between the abstract CPS operational semantics and the concrete interpreter: each step of the Rust dispatch loop corresponds to a reduction in the Gallina model.” (Section 6.4, p. 13) The proof obligations include mark-compact pointer rewriting and the `ENCORE` opcode. This is future work in the paper, not evidence already supplied.

## techniques for the catalog

- pure state-transition firmware — express business logic as `step : State × Event → State × list Effect` and interpret effects at a trusted boundary that changes for new hardware actions, externs, or runtime primitives
- Scheme extraction to a no-std CPS VM — compile extracted Gallina through DS, CPS, optimization, and register bytecode stages for Cortex-M execution
- typed host–VM interface — expose only typed calls and extern callbacks, with generated constructor tags and bindings
- explicit trust-chain accounting — list kernels, compilers, runtimes, callbacks, and I/O as trusted components rather than silently including them in a proof claim
- embedded resource benchmarking — compare flash, heap, and build time under named MCU, QEMU, and benchmark denominators
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The compiler pipeline starts with a lexer/parser step, which identifies specific Rocq-extracted Scheme macros and includes them in its intermediate representation (IR)."): checked quotations, numbers, section/page references, technique steps, and proof/trust boundaries; corrected the paper link, Section 6.2 page, truncated quotation, and proof-versus-demonstration wording, and labeled recommendations as inferences; did not inspect source code, reproduce experiments, or validate the proposed Verus translations.
