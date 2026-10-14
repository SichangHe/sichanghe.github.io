# Efficient Verification of Optimized Code: Correct High-speed X25519
(authored by agents unless marked 🧑)
Tag: `schoolderman2020efficient`, [paper](http://arxiv.org/abs/2012.09919v2)

## scope and result
Schoolderman, Moerman, Smetsers, and van Eekelen verify a high-speed X25519 implementation for 8-bit AVR microcontrollers. The implementation contains more than 3,000 assembly instructions plus about 300 lines of C. The paper's contribution is a machine-checked Why3 proof of functional correctness and memory safety, together with a reusable AVR machine model. The authors state: “We have formally verified such code: a library which implements elliptic curve cryptography on 8-bit AVR microcontrollers.” (abstract, p. 1)

The target uses 32 base-256 limbs, hand-optimized assembly, and a C Montgomery ladder. The proof covers field arithmetic, the ladder, the final scalar multiplication, memory safety, and calling conventions. Verification also found an interrupt-safety bug and enabled small performance improvements.

Inference: for VL, the main lesson is to verify low-level wrappers against a mathematical model while preserving explicit contracts at every representation boundary. This is evidence about a specialized Why3 workflow, not a measurement of Verus or agent-written Rust.

## technique 1: define a succinct mathematical specification before proving code
The ultimate Why3 contract for `crypto_scalarmult_curve25519` requires a canonical reduced result and states that the output represents the clamped scalar multiple of the input x-coordinate, returning zero for the point at infinity. The paper explains that the second postcondition says “a ratio (X : Z) representing the x-coordinate of [s] · P is computed using repeated application of Montgomery’s formulas.” (Sec. 5.2, p. 12)

How to apply it: model field elements as integers modulo `p = 2^255−19`; define clamping, scalar multiplication, Montgomery ladder formulas, and the infinity convention; write postconditions for canonical output and mathematical equivalence; then verify the implementation against that contract. The authors note that the informal ladder specification was insufficient: the proof required the scalar to be even and its most significant bit set. X25519's clamping operation supplies those conditions, with `s ∈ {2^254 + 8k : 0 ≤ k < 2^251}`.

Verus form. Inference: define `spec fn` models for clamping, field reduction, and ladder state, then put the mathematical contract in `ensures` on a verified Rust function. Use `requires` for scalar and input bounds and a loop `invariant` for the ladder's point relation. Keep the point-at-infinity convention explicit in the postcondition. Verus's `spec fn` and `ensures` express the contract, but the paper's Why3 notation and modular arithmetic libraries do not carry over unchanged.

## technique 2: validate a reusable machine model against the ISA
The authors model the AVR processor with an 8-bit address space represented by a Why3 map and an invariant `0 <= data[i] < 256`. Register file, data segment, and stack are separate address spaces. Memory-size restrictions are preconditions on instructions. They first implement primitive byte and bit-vector operations, then implement each required AVR mnemonic according to the official instruction specification.

For `SUBI`, the WhyML body computes the wrapped result and carry flag from the official bit formula. A more useful contract states the register update as `old(reg)[rd <- mod(old(reg[rd]-k)) 256]` and characterizes carry arithmetically. Why3 verifies that this contract follows from the instruction body; a different useful contract can replace it while preserving model validity. The paper reports that this process exposed an error in online `SUBI` documentation.

Steps: define bounded memory and flags; implement primitive reads, writes, and bit operations; implement each instruction from the official ISA; state a compact contract for each instruction; prove the contract from the detailed body; reuse the validated instruction layer to translate assembly mechanically.

Verus form. Inference: model registers and memory with ghost/spec maps plus bounded integer types, and state each instruction wrapper's `requires`/`ensures`. Use `proof fn`s for arithmetic equivalence between bit-level and integer-level descriptions. A Rust implementation can be verified against this model only if the emitted machine code or FFI implementation is related to the modeled instructions; a Verus proof of a Rust source function alone does not certify a separate assembler or compiler.

Limits. The paper calls the address-space model an underspecification and separately checks stack alias conditions. It adds an exception-based model for limited branches and later extends the stack model after discovering a flaw.

## technique 3: verify assembly in logical blocks with local contracts
The assembly routines must prove functional correctness, permitted memory effects, stack consistency, and AVR C calling-convention adherence. The 256-bit multiplication is built from 128-bit and 64-bit Karatsuba routines. The authors partition large routines into blocks and specify each block's effect. For deeper Karatsuba levels, they replace contextual algorithm-level summaries with local specifications in terms of the immediately preceding state, because this simplifies SMT reasoning; needed context can be reasserted later.

The 256-bit squaring proof similarly partitions the routine into five blocks implementing the algebraic decomposition. Existing proofs for the basic 64-bit routine are reused. Each block is represented by an abstract or contract-bearing WhyML operation, and the surrounding routine proves that the composition preserves the field arithmetic relation.

Verus form. Inference: represent each assembly or unsafe primitive by a small verified wrapper with an `ensures` relation over registers, memory, and allowed footprint. Use helper `proof fn`s for block composition and keep each proof's `requires` local. The paper's “abstract blocks” correspond to specification-level helper functions, while Rust ownership and Verus memory predicates must supply the frame facts. If the assembly is outside Verus, its contract remains trusted until separately checked.

## technique 4: add ghost arguments when address reasoning stalls
Reduction, addition, subtraction, and multiplication sequences repeatedly use `LD+`/`ST+`, which update an address register after a load/store. After several macro applications, solvers could not infer which address the register denoted, so memory-safety and aliasing goals failed. The authors instrument the code with ghost arguments. Their example adds `ghost addr: int` to `ld_inc'` and requires `uint2(reg src) = addr`; the wrapper then calls the original modeled instruction.

Steps: identify an address fact obvious to a human but absent from the solver; add a ghost parameter carrying that fact; add a precondition correlating the ghost value with the machine register; call the original instruction; use the correlation in subsequent proofs. The same pattern supplies intermediate arithmetic values for `fe25519_invert`, where the ghost arguments formalize comments from the original authors.

Verus form. Inference: add ghost parameters or ghost state to proof wrappers, with `requires` tying them to the concrete register or pointer expression and `ensures` preserving the relation. Use `assert` to re-establish the address at each loop iteration. Ghost data is erased, but the executable operation must remain the same; an `assume` would weaken the result and is not a substitute for proving the correlation.

## technique 5: verify C and assembly through one primitive model
The C layer has around 300 lines and calls the verified assembly. The authors translate C by hand into the WhyML primitives underlying the AVR model. Each C array gets its own address space, avoiding assumptions about compiler memory layout and letting Why3's type system enforce non-aliasing. In-place operations are modeled and verified separately. Assembly contracts are duplicated for C-facing calls after removing calling-convention clauses.

The C proofs use ghost arguments and abstract blocks for repetitive routines. For inversion, the authors prove Fermat's little theorem inside Why3 with ghost code but state primality of `2^255−19` as an axiom. The reported C results include 13 routines, from 3-line setters through a 51-line inversion routine and the 13-line top-level scalar multiplication.

Verus form. Inference: give each Rust slice or allocation a representation predicate and prove C/assembly wrappers against the same abstract field model. Separate aliasing and in-place contracts as the paper does. Use `requires` for disjoint buffers, `ensures` for preserved or updated regions, and ghost lemmas for modular arithmetic. A primality axiom would enlarge Verus's trusted base; prefer a proved lemma or a reviewed imported theorem.

## technique 6: prove Montgomery ladder refinement and safety
The authors first prove `Ladderstep` implements Montgomery doubling and differential addition. They then define a Why3 specification of the ladder and prove `mladder` returns equivalent projective coordinates modulo `p`. The scalar parity and high-bit requirements are essential to strict correspondence. The final contract handles canonical reduction and the infinity case, while acknowledging that X25519 intentionally conflates some points in its output representation.

They also verify memory safety and aliasing. Multiplication and squaring prohibit overlapping input/output regions; modular addition/subtraction and multiplication by 121666 permit in-place updates. The C call sites obey these contracts, and `restrict` is added where C aliasing would otherwise be undefined.

Verus form. Inference: encode projective coordinates as a ghost/spec pair and state the ladder invariant after each bit. Use a `decreases` clause for the bit index and `invariant` clauses for scalar clamping, field bounds, and non-aliasing. Model in-place operations with a footprint predicate that distinguishes permitted mutation from preserved memory. Verus can prove the Rust ladder and wrappers, but compiled AVR assembly still needs a machine-level refinement certificate analogous to the paper's Why3 model.

## evidence, defects, and measurements
Table 1 reports nine assembly routines. It gives instructions, user annotations, generated goals, and CPU time; for example, `bigint mul256:mul128` has 1,078 instructions, 122 annotations, 300 goals, and 1,504.6 seconds, while `fe25519 add` has 242 instructions, 52 annotations, 209 goals, and 156.4 seconds. Table 2 reports 13 C routines; `fe25519 invert` has 51 lines, 49 annotations, 306 goals, and 557.3 seconds, while the top-level `crypto scalar mult curve25519` has 13 lines, 27 annotations, 57 goals, and 74.2 seconds. The authors say the annotation count is subjective and report 16 hours for `fe25519_mul121666` as a work reference.

The proof removed two unnecessary instructions from 128×128 multiplication and one redundant modular-reduction call. Modeling uncovered an interrupt-safety bug: code wrote below the stack pointer, allowing an interrupt handler to clobber temporary data. The authors changed the stack-pointer update, added the needed model extension, and saved 32 bytes of stack space by reusing output memory as temporary storage.

The trust boundary includes Why3's verification-condition generation, automated provers, the C compiler, assembler, linker, and mathematical assumptions. The authors found a soundness error in Alt-Ergo 2.0 and excluded it. They used Why3 0.88.3 with CVC3 2.4.1, CVC4 1.4/1.6, Z3 4.6.0, and E-prover 2.0. They state that proof trust “mainly resides with trusting the verification condition generation of Why3, the soundness of the automated provers, and the compilation-toolchain.” (Sec. 8, p. 15)

Inference: threat to VL is high for low-level crypto and unsafe/FFI boundaries, because the paper demonstrates that a real bug can survive conventional engineering but be exposed by a machine model. The product should reuse block contracts, ghost address facts, validated instruction models, and explicit alias/frame conditions. It should not claim end-to-end binary assurance unless the Rust compiler and emitted machine code are included in the refinement chain.

## techniques for the catalog
- succinct crypto contract: specify scalar multiplication, reduction, clamping, and infinity behavior mathematically
- validated instruction model: prove compact instruction contracts from a bounded machine model and the official ISA
- blockwise assembly proof: partition optimized code and compose local functional and frame contracts
- ghost address instrumentation: supply solver-visible address and intermediate-value facts without changing execution
- cross-layer refinement: translate C and assembly through one primitive model and preserve alias and calling conventions
- ladder and memory proof: combine projective-coordinate invariants, scalar preconditions, and explicit memory footprints
Checked 2026-10-13: audit record schoolderman2020efficient; paper-study comparison complete; gate executed; experiments not rerun
