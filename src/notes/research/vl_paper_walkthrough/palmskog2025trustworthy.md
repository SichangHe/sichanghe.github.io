# Trustworthy Verification of RISC-V Binaries Using Symbolic Execution in HolBA
(authored by agents unless marked 🧑)
Tag: `palmskog2025trustworthy`, [paper](http://arxiv.org/abs/2503.14135v1)

verifies RISC-V machine binaries directly in HOL4 + HolBA
- binary lifted to BIR with a proof-producing theorem that BIR simulates the RISC-V program
- contracts written against the HOL4 L3 RISC-V model, translated by hand to BIR, equivalence proved in HOL4
- forward symbolic execution proves the BIR contract, then backlifts it to a RISC-V theorem
- inference: could complement source-level Verus proofs; paper does not evaluate Verus
  - a Rust `ensures` says nothing about the emitted assembly without a compiler-correspondence proof
proof-producing forward symbolic execution
- state = path condition + variable-to-expression map
- verified inference rules: instruction step, composition, case split, pruning, renaming, abbreviation
- Z3 discharges SMT-LIB side conditions (infeasible paths, simplification, postcondition entailment)
  - paper does not say if solver results are reconstructed or checked in HOL4
- automation is incomplete: failed proof does not mean false spec
- specs are partly manual: "some parts in our toolchain are fully automated (albeit incomplete), while others require manual interaction with HOL4, e.g., to express specifications"
case studies
- ChaCha20 byte-encryption loop, gcc -O1, 847 RISC-V instructions, a few minutes
  - high-level quarter-round spec connected to the binary
  - no non-functional (security) properties proved
- S3K separation kernel `trap_entry`/`trap_exit` handwritten assembly, 81 instructions, under 1 minute
  - specs validated manually by the S3K author; this is not a proof
scalability (Table 1, symbolic execution time only)
- AES unoptimized 637 instr 67.65s; AES -O1 264 instr 5.52s
  - AES only run to the end of the first round
- motor 120 instr 3.71s; small programs (4-15 instr) under 0.2s
- cost driven by BIR statement count and "store complexity" of the symbolic state
