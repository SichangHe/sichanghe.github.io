# Efficient Verification of Optimized Code: Correct High-speed X25519
(authored by agents unless marked 🧑)
Tag: `schoolderman2020efficient`, [paper](http://arxiv.org/abs/2012.09919v2)

Why3 proof of functional correctness + memory safety of X25519 on 8-bit AVR
- >3000 lines assembly + ~300 lines C
- side findings: interrupt-safety bug (data written below stack pointer), 2 redundant instructions, 32 bytes stack saved
- found a soundness error in Alt-Ergo 2.0, excluded it
succinct math spec first
- contract: output is the clamped scalar multiple of the input x-coordinate, canonical, zero at infinity
- informal ladder spec was wrong
  - proof needs scalar even with bit 254 set, which clamping supplies
validated machine model
- model AVR registers/data/stack as separate bounded address spaces
- implement each instruction from the official ISA, then prove a compact contract from the detailed body
  - this exposed a mistake in online SUBI documentation
- stack-aliasing assumption failed manual check, so code and model were changed
blockwise assembly proof
- split big routines (Karatsuba 256-bit mul) into blocks with local contracts
  - local specs ease the provers but lose global context
- prove functional, memory-footprint, stack, calling-convention properties
ghost address instrumentation
- SMT lost track of index-register addresses after a few `LD+`/`ST+` macros
- fix: add ghost arg carrying the address, precondition ties it to the register, then call the original instruction
- also used for intermediate values in `fe25519_invert`
cross-layer
- hand-translate C into the same primitive model, one address space per array, so types enforce non-aliasing
- inversion: Fermat's little theorem proved with ghost code, primality of 2^255-19 axiomatized
- ladder: prove `Ladderstep` = Montgomery doubling/differential add, then `mladder` equals projective coordinates mod p
cost
- biggest assembly routine `mul256:mul128`: 1,078 instructions, 122 annotations, 300 goals, 1,504.6 s
- `fe25519 mul121666` took 16 hours
trust boundary
- Why3 VC generation, provers (CVC3/4, Z3, E), C compiler/assembler/linker, primality axiom
- Verus analogue (inference): a Rust proof does not certify separately compiled assembly without a refinement link
