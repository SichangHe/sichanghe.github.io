# A Two-Phase Infinite/Finite Low-Level Memory Model: Reconciling Integer–Pointer Casts, Finite Space, and undef at the LLVM IR Level of Abstraction
(authored by agents unless marked 🧑)
Tag: `beck2024twophase`, [paper](https://doi.org/10.1145/1926385.1926394)

## what the paper proves or measures

Beck, Yoon, Chen, Zakowski, and Zdancewic formalize a low-level memory model that separates optimization from finite-machine effects. The infinite phase has unbounded addresses and integers; the finite phase has bounded addresses and can produce out-of-memory (OOM). The paper's key idea is stated directly: “The advantage of this is that many optimizations, such as dead allocation elimination, are always valid in the infinite memory model without any additional reasoning (though some optimizations are valid in both).” (Introduction, p. 3). A Coq formalization instantiates the model in the VIR LLVM-like semantics, proves an infinite-to-finite refinement that introduces only OOM behavior, and supplies executable reference interpreters.

The paper proves semantic theorems and verifies three representative transformations: dead-allocation removal, removing a pointer-to-integer cast, and adding an allocation. It does not claim to verify full optimization passes: “Though we have not (yet) verified full-blown optimization passes based on these transformations” (Section 5, p. 21). Validation uses several hundred handwritten LLVM IR tests, compiled C tests, random QuickChick programs, and differential comparison with `llc` (Section 6.2.1, p. 24); exact denominators beyond “several hundred” are not reported.

## technique 1: split compilation into infinite and finite phases

what it is: perform nearly all optimization under an unbounded model, then translate the optimized program to a bounded model. The finite translation is almost syntactic identity but may add OOM points. The authors summarize: “Once optimizations are performed, there is an explicit translation to the finite model.” (Section 3, p. 8).

when to use: use this when a language exposes pointer–integer casts and finite machine memory but compiler optimizations need abstract, unbounded allocation. It avoids requiring every optimization to prove that allocations always succeed.

how to do it:

1. Define the infinite model with Coq integers for addresses and an unbounded `iptr` (Sections 3 and 4.2, pp. 8–16)
2. Define the finite model with bounded address/integer types and OOM on overflow (Section 3.2, p. 9)
3. Prove an operation-level relation between the two configurations and operations, allowing finite executions to stop with OOM (Section 3.5, pp. 14–16)
4. Optimize the program under infinite semantics, where dead allocations and casts can be removed (Section 5, pp. 21–22)
5. Translate the optimized syntax to the finite VIR semantics and use the refinement theorem to relate behaviors (Sections 3.5 and 4.5, pp. 14–20)

Verus form: Inference: model an abstract unbounded address/provenance state with ghost maps and a concrete bounded Rust representation with explicit OOM/error results. Use `spec fn` relations between abstract and concrete states, `requires` for valid allocations, `ensures` for preservation/refinement, and `proof fn` lemmas for each memory operation. The phase split is an architectural proof pattern; Verus does not supply Coq's nondeterministic semantics or a compiler-level refinement theorem automatically.

evidence and limits: The formal result is a Coq refinement theorem for the paper's VIR semantics; it is not a Rust compiler proof. The model is sequential (Section 7.1, p. 25), and the paper says concurrency is future/orthogonal work. OOM is intentionally permissive: every memory specification may have an OOM behavior (Section 3.4, p. 12). Inference: product claims must decide whether this permissive OOM abstraction is acceptable for the target runtime.

## technique 2: provenance-aware specification monad

what it is: configurations contain byte memory with provenance, heap allocation roots, stack frames, and used provenances. Each primitive is a nondeterministic `MemSpec` mapping an initial configuration to a set of `Result` behaviors: `UB`, `OOM`, `FAIL`, or `ok`. The paper explains the purpose: “The monadic specification is particularly useful for maintaining very similar structures between the memory model and the executable interpreter (See Section 6), which simplifies maintenance and the proof that the executable implementations of the memory model respect the specifications.” (Section 3.3, p. 10).

when to use: use this to specify byte reads/writes, stack/heap allocation, free, and frame operations while preserving alias provenance and permitting implementation nondeterminism.

how to do it:

1. Parameterize the configuration by address and symbolic-byte types; store `(byte, provenance)` at each address (Sections 3.1–3.2, pp. 9–10)
2. Define pointer access as an address lookup plus provenance equality; reject mismatches as UB (Section 3.2, p. 10)
3. Define `MemSpec(X) = Conf → P(Result(Conf × X))` and compose operations with `ret` and `bind` (Section 3.3, p. 10)
4. Specify `read_b`, `write_b`, `alloca`, `malloc`, `free`, `pushf`, and `popf` with frame/heap and unchanged-memory conditions (Section 3.4, pp. 10–13)
5. Relate operation results to the infinite/finite refinement relation (Section 3.5, pp. 14–16)

Verus form: Inference: encode `Result` as an enum, memory as a ghost map from address to `(byte, provenance)`, and pointer validity as a `spec fn`. Verified wrappers can return `Result` and use `ensures` to state that writes change only the pointed location and allocation returns disjoint addresses. Verus's executable Rust is deterministic unless modeled otherwise; nondeterministic choices should be represented as ghost relations or a separately verified reference model.

evidence and limits: The Coq proofs establish operation-level soundness and refinement. The model intentionally treats `FAIL` as a partial-specification feature and allows OOM broadly (Section 3.3–3.4, p. 10–12). Inference: provenance prevents cross-allocation aliasing only under the model's pointer rules; unsafe Rust, FFI, integer casts, and allocator behavior need separate contracts.

## technique 3: refine VIR with symbolic bytes, undef, and iptr

what it is: the authors instantiate the generic model in VIR, an LLVM-like semantics containing pointer/integer casts, `undef`, poison, symbolic bytes, and nondeterministic memory. The infinite and finite models differ in pointer and `iptr` types; concretization maps symbolic/undef values to concrete values while preserving refinement. Section 4.5 proves the finite lowering relation, and Theorem 6.1 proves the executable interpreter is a valid refinement.

when to use: use this pattern when a language's IR has underdefined values and low-level casts that cannot be represented safely by a single concrete execution semantics.

how to do it:

1. Define VIR values, including dynamic values, `iptr`, symbolic bytes, and undef (Section 4.2, pp. 16–18)
2. Define concretization from symbolic VIR values to finite sets of concrete values (Section 4.3, pp. 18–20)
3. Prove behavioral refinement within each VIR model and then prove lowering from `VIRinf` to `VIRfin` (Sections 4.4–4.5, pp. 20–21)
4. Instantiate executable operations and show the deterministic interpreter's singleton behavior refines the nondeterministic specification (Section 6.2, pp. 24–25)

Verus form: Inference: use ghost enums/records for symbolic bytes and undef choices, with `spec fn` concretization and `proof fn` refinement lemmas. Keep executable code explicit about `Result`/OOM/UB; do not erase undefined behavior into `assume` or mark the verified implementation `external_body`. The paper's coinductive interaction trees and Coq module abstraction do not carry over directly.

evidence and limits: Theorem 6.1 states the interpreter is sound with respect to the VIR specification (Section 6.2, p. 24). Differential tests found unclear LLVM corner cases involving sub-byte structure addresses and `extractelement` (Section 6.2.1, p. 24); this is evidence of model-testing value, not a proof that LLVM itself is unambiguous.

## technique 4: optimization proofs under the model

what it is: prove refinement relations for transformations as small semantic blocks. Optimization 1 removes a dead allocation in the infinite model. Optimization 2 removes a `ptrtoint` cast. Optimization 3 adds an `alloca` and is allowed in both models because OOM refinement accounts for the extra allocation (Section 5, pp. 21–22).

how to do it:

1. State source and target snippets as VIR programs (Figure 10 and Section 5, p. 21)
2. Choose the appropriate model; dead allocation removal is infinite-only, while cast removal is valid in both (Section 5, p. 21–22)
3. Prove a behavioral refinement relation between source and target interaction trees (Section 4.4 and Section 5, pp. 20–22)
4. Compose block-level relations into a future optimization pass; the paper explicitly leaves whole-pass static analysis outside scope (footnote 15, p. 21)

Verus form: Inference: represent a source and optimized Rust function, define an observational `spec fn` relation over return values and allowed errors, and prove it with `ensures`/`proof fn`. For allocation changes, include OOM/error behavior in the postcondition. Rust's ownership may rule out some aliases, but integer-to-pointer casts and unsafe code still require explicit provenance assumptions.

evidence and limits: The paper's three transformations are Coq-verified examples, not a full compiler. The authors note finite bounds checks can affect performance and expect many to be removed by later optimizations (Section 5.1, pp. 22–23), but provide no runtime measurements. Inference: this is a semantic foundation for a verifier, not evidence of production compiler speed.

## trusted boundary, contradictions, and product threat

The proved artifacts are the generic memory operations, infinite/finite behavioral refinements, VIR integration, executable-interpreter soundness, and three transformation relations. Testing adds confidence but does not enlarge the theorem. Trusted assumptions include Coq's logic and extraction, the abstract address/byte instantiations, LLVM/VIR interpretation choices, and any implementation that is claimed to refine the model. The paper is sequential, and full optimization passes remain unproved.

Inference: VL should reuse the phase separation, explicit error/UB modeling, provenance relations, and executable-reference-interpreter pattern when verifying unsafe Rust or allocator-facing code. VL should not redo the generic observation that pointer/integer casts complicate optimization; it should test whether the Rust crate's actual allocator, FFI, and integer casts satisfy the modeled relation. The threat to agent-written verified Rust is high around unsafe blocks, pointer provenance, OOM behavior, and underdefined values: an agent can prove a clean abstract contract while the implementation violates the refinement assumptions.

## techniques for the catalog

- two-phase memory refinement — optimize under unbounded addresses, then lower to bounded memory with explicit OOM refinement
- provenance-aware specification monad — specify byte operations and allocation as nondeterministic behaviors over pointer provenance
- undef and cast concretization — relate symbolic bytes, `undef`, and pointer/integer values to finite concrete executions
- executable reference interpreter — implement deterministic operations and prove each result belongs to the nondeterministic specification
- block-level optimization proofs — prove dead-allocation, cast-removal, and allocation-addition refinements before composing passes
Checked 2026-10-14 against the paper by a Codex agent: audit record beck2024twophase; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
