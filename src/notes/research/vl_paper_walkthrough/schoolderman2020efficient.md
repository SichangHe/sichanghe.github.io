# Efficient Verification of Optimized Code: Correct High-speed X25519
(authored by agents unless marked 🧑)
Tag: `schoolderman2020efficient`, [paper](http://arxiv.org/abs/2012.09919v2)

## scope and result
Schoolderman, Moerman, Smetsers, and van Eekelen verify a high-speed X25519 implementation for 8-bit AVR microcontrollers. The abstract says the implementation “consists of over 3000 lines of assembly instructions”; Sec. 5 adds that it also has “around 300 lines of C code”. The paper's contribution is a machine-checked Why3 proof of functional correctness and memory safety, together with a reusable AVR machine model. The authors state: “We have formally verified such code: a library which implements elliptic curve cryptography on 8-bit AVR microcontrollers.” (abstract, p. 1)

The target uses 32 base-256 limbs, hand-optimized assembly, and a C Montgomery ladder. The proof covers field arithmetic, the ladder, the final scalar multiplication, memory safety, and calling conventions. Verification also found an interrupt-safety bug and enabled small performance improvements.

## technique 1: define a succinct mathematical specification before proving code
The ultimate Why3 contract for `crypto_scalarmult_curve25519` requires a canonical reduced result and states that the output represents the clamped scalar multiple of the input x-coordinate, returning zero for the point at infinity. The paper explains that, after the high bit of the input x-coordinate is masked, the second postcondition says “a ratio (X : Z) representing the x-coordinate of [s] · P is computed using repeated application of Montgomery’s formulas” (Sec. 5.2, p. 13).

How to apply it: model field elements as integers modulo `p = 2^255−19`; define clamping, scalar multiplication, Montgomery ladder formulas, and the infinity convention; write postconditions for canonical output and mathematical equivalence; then verify the implementation against that contract. The authors note (Sec. 2.2, 5.1) that the informal ladder specification is not entirely correct: the proof required the scalar to be even and to have bit 254 set. X25519's clamping operation supplies those conditions, with `s ∈ {2^254 + 8k : 0 ≤ k < 2^251}`.

Verus form. Inference: define `spec fn` models for clamping, field reduction, and ladder state, then put the mathematical contract in `ensures` on a verified Rust function. Use `requires` for scalar and input bounds and a loop `invariant` for the ladder's point relation. Keep the point-at-infinity convention explicit in the postcondition. Verus's `spec fn` and `ensures` express the contract, but the paper's Why3 notation and modular arithmetic libraries do not carry over unchanged.

## technique 2: validate a reusable machine model against the ISA
The authors model the AVR processor with an 8-bit address space represented by a Why3 map and an invariant `0 <= data[i] < 256`. Register file, data segment, and stack are separate address spaces. Memory-size restrictions are preconditions on instructions. They first implement primitive byte and bit-vector operations, then implement each required AVR mnemonic according to the official instruction specification.

For `SUBI`, the WhyML body computes the wrapped result and carry flag from the official bit formula. A more useful contract states the register update as `reg = old reg[rd <- mod (old (reg[rd] - k)) 256]` and the carry as `?cf = -div (old (reg[rd] - k)) 256`. The paper says Why3 verifies that this contract is satisfied by the AVR specification, and a different contract found more useful could replace it while maintaining validity of the model. A footnote (Sec. 4.1) says that for SUBI the process “also revealed a mistake in online documentation.”

Steps (the ordering is this study's summary of Sec. 4.1): define bounded memory and flags; implement primitive reads, writes, and bit operations; implement each instruction from the official ISA; state a compact contract for each instruction; prove the contract from the detailed body; reuse the validated instruction layer to translate assembly mechanically.

Verus form. Inference: model registers and memory with ghost/spec maps plus bounded integer types, and state each instruction wrapper's `requires`/`ensures`. Use `proof fn`s for arithmetic equivalence between bit-level and integer-level descriptions. A Rust implementation can be verified against this model only if the emitted machine code or FFI implementation is related to the modeled instructions; a Verus proof of a Rust source function alone does not certify a separate assembler or compiler.

Limits. The paper calls the address-space model an underspecification. For stack data it adds a requirement that the stack pointer does not alias the ordinary data inputs and checks manually that the code follows stack-access conventions; this manual check did not hold (Sec. 6.2), so the code was changed and the idiomatic stack-pointer sequence was added to the model. Limited branching is modeled with a WhyML function that throws an exception.

## technique 3: verify assembly in logical blocks with local contracts
The assembly routines must prove functional correctness, permitted memory effects, stack consistency, and AVR C calling-convention adherence. The 256-bit multiplication is built from 128-bit and 64-bit Karatsuba routines. The authors partition large routines into blocks and specify each block's effect. For deeper Karatsuba levels, they replace contextual algorithm-level summaries with local specifications in terms of the immediately preceding state, because, per the paper, this simplifies the specification for some blocks and makes the work for automatic provers slightly easier; needed context can be reasserted later. The paper notes a drawback: on assembly of this size it is easy to lose sight of the goal without contextual information. For the smaller Karatsuba routines, 7 blocks sufficed.

The 256-bit squaring proof similarly partitions the routine into five blocks implementing the algebraic decomposition. The earlier 64×64 Karatsuba proof of [30] is partly reused in the 128-bit multiplication, and the paper says some blocks of earlier proofs were respecified in local terms. Abstract blocks are described in Sec. 3 as a way to summarize multiple operations with a single functional contract.

Verus form. Inference: represent each assembly or unsafe primitive by a small verified wrapper with an `ensures` relation over registers, memory, and allowed footprint. Use helper `proof fn`s for block composition and keep each proof's `requires` local. The paper's “abstract blocks” correspond to specification-level helper functions, while Rust ownership and Verus memory predicates must supply the frame facts. If the assembly is outside Verus, its contract remains trusted until separately checked.

## technique 4: add ghost arguments when address reasoning stalls
The reduction, addition, and subtraction routines are highly repetitive and were modeled bottom-up with WhyML functions acting like assembly macros that use `LD+`/`ST+`, which update an address register after a load/store. After a few macro applications, SMT solvers could not prove memory safety or absence of aliasing, apparently because they could not track which address the index register referred to. The authors instrument the code with ghost arguments. Their example adds `ghost addr: int` to `ld_inc'` and requires `uint 2 reg src = addr`; the technique was also used in the 256×256-bit multiplication routine; the wrapper then calls the original modeled instruction.

Steps: identify an address fact obvious to a human but absent from the solver; add a ghost parameter carrying that fact; add a precondition correlating the ghost value with the machine register; call the original instruction; use the correlation in subsequent proofs. The same pattern supplies intermediate arithmetic values for `fe25519_invert`, where the ghost arguments formalize comments from the original authors.

Verus form. Inference: add ghost parameters or ghost state to proof wrappers, with `requires` tying them to the concrete register or pointer expression and `ensures` preserving the relation. Use `assert` to re-establish the address at each loop iteration. Ghost data is erased, but the executable operation must remain the same; an `assume` would weaken the result and is not a substitute for proving the correlation.

## technique 5: verify C and assembly through one primitive model
The C layer has around 300 lines and calls the verified assembly. The authors translate C by hand into the WhyML primitives underlying the AVR model. Each C array gets its own address space, avoiding assumptions about compiler memory layout and letting Why3's type system enforce non-aliasing. In-place operations are modeled and verified separately. Assembly contracts are duplicated for C-facing calls after removing calling-convention clauses.

The C proofs use ghost arguments and abstract blocks for repetitive routines. For inversion, the authors prove Fermat's little theorem inside Why3 with ghost code but state primality of `2^255−19` as an axiom. Table 2 reports 14 C routines, from 3-line routines such as `fe25519 setzero` and `fe25519 neg` through the 51-line inversion routine and the 13-line top-level scalar multiplication.

Verus form. Inference: give each Rust slice or allocation a representation predicate and prove C/assembly wrappers against the same abstract field model. Separate aliasing and in-place contracts as the paper does. Use `requires` for disjoint buffers, `ensures` for preserved or updated regions, and ghost lemmas for modular arithmetic. A primality axiom would enlarge Verus's trusted base; prefer a proved lemma or a reviewed imported theorem.

## technique 6: prove Montgomery ladder refinement and safety
The authors first prove `Ladderstep` implements Montgomery doubling and differential addition. They then define a Why3 specification of the ladder and prove `mladder` returns equivalent projective coordinates modulo `p`. The scalar parity and high-bit requirements are essential to strict correspondence. The final contract handles canonical reduction and the infinity case, while acknowledging that X25519 intentionally conflates some points in its output representation.

They also verify memory safety and aliasing. Multiplication and squaring prohibit overlapping input/output regions; modular addition/subtraction and multiplication by 121666 permit in-place updates. The C call sites obey these contracts, and `restrict` is added where C aliasing would otherwise be undefined.

Verus form. Inference: encode projective coordinates as a ghost/spec pair and state the ladder invariant after each bit. Use a `decreases` clause for the bit index and `invariant` clauses for scalar clamping, field bounds, and non-aliasing. Model in-place operations with a footprint predicate that distinguishes permitted mutation from preserved memory. Verus can prove the Rust ladder and wrappers, but compiled AVR assembly still needs a machine-level refinement certificate analogous to the paper's Why3 model.

## evidence, defects, and measurements
Table 1 reports nine assembly routines. It gives instructions, user annotations, generated goals, and CPU time; for example, `bigint mul256:mul128` has 1,078 instructions, 122 annotations, 300 goals, and 1,504.6 seconds, while `fe25519 add` has 242 instructions, 52 annotations, 209 goals, and 156.4 seconds. Table 2 reports 14 C routines; `fe25519 invert` has 51 lines, 49 annotations, 306 goals, and 557.3 seconds, while the top-level `crypto scalar mult curve25519` has 13 lines, 27 annotations, 57 goals, and 74.2 seconds. The authors say the annotation count is subjective and give 16 hours of work for `fe25519 mul121666` as a point of reference.

The proof confirmed that two instructions in the 128×128 multiplication routine were unnecessary, and that one call to `bigint subp` in `fe25519 freeze` suffices instead of two. The paper says an interrupt-safety problem was discovered during the modeling phase: the original code wrote data below the stack pointer, so an interrupt service routine needing stack space would clobber it (Sec. 6.2). The authors replaced it with an idiomatic stack-pointer sequence added to the model, and, due to the proof, saw that in the 256×256-bit multiplication some of the memory reserved for the output could serve as a temporary, reducing total stack space by 32 bytes.

The trust boundary named in Sec. 8 includes Why3's verification-condition generation, the automated provers, and the C compiler, assembler and linker; separately, Sec. 5 states primality of 2^255−19 as an axiom. The authors found a soundness error in Alt-Ergo 2.0 and excluded it. They used Why3 0.88.3 with CVC3 2.4.1, CVC4 1.4/1.6, Z3 4.6.0, and E-prover 2.0. They state that proof trust “mainly resides with trusting the verification condition generation of Why3, the soundness of the automated provers, and the compilation-toolchain” (Sec. 8, p. 15).

## techniques for the catalog
- succinct crypto contract: specify scalar multiplication, reduction, clamping, and infinity behavior mathematically
- validated instruction model: prove compact instruction contracts from a bounded machine model and the official ISA
- blockwise assembly proof: partition optimized code and compose local functional and frame contracts
- ghost address instrumentation: supply solver-visible address and intermediate-value facts without changing execution
- cross-layer refinement: translate C and assembly through one primitive model and preserve alias and calling conventions
- ladder and memory proof: combine projective-coordinate invariants, scalar preconditions, and explicit memory footprints
