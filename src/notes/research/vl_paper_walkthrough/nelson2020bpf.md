# Specification and verification in the field: Applying formal methods to BPF just-in-time compilers in the Linux kernel
(authored by agents unless marked 🧑)
Tag: `nelson2020bpf`, [paper](https://www.usenix.org/conference/osdi20/presentation/nelson)

jitterbug: verifies linux bpf jits with reviewable c and unchanged kernel interface
- correctness = behavioral equivalence of source bpf machine and target machine code + calling convention
- designs new rv32 jit, ports 5 deployed jits, finds 16 unknown bugs, all upstreamed
- design goals: deployability, proof automation, separability from verification artifacts
stepwise correctness spec
- jit = prologue + one block per source instruction + epilogue
- prove prologue, per-instruction, epilogue correctness → whole-jit correct (lean metatheorem)
  - relations ~ctx (source/target states) and Ictx (initial/intermediate target)
  - same trace-event memory model on both sides
- trusted: wf(codeS, ctx), source safety assumed
- spec caught 2 bugs testing missed: tail_call limit 32 vs 33, stack not 16-byte aligned
- historical check: catches 80 of 82 past bugs
  - misses 2 in offset-table construction, which spec does not cover
  - permits null jits that reject every program; selftests cover feature completeness
symbolic verification in rosette (+ boolector)
- guess skolem step-count function f(x); wrong guess gets stuck, cannot pass a bad jit
- merge states at joins, split on each concrete opcode of symbolic instruction
  - rv64 LD64_IMM: 2181 block types, 307 feasible
- replace mul/div/rem with uninterpreted functions + few axioms proved by hand in lean
  - 1492 lines of lean total
restricted c dsl, unverified extraction
- no address-of, deref, goto, fallthrough
- encoders validated separately: c bytes equal dsl bytes
- synthesis found 4-instruction rv32 add64/sub64 where manual used 5
cost
- per-opcode verification mean s: rv32 73, rv64 116 (max 7542), arm32 130, arm64 26, x86-32 122, x86-64 33
- spec size 163-336 lines per jit
- arm32, arm64 ported in 1 week each, x86 both in 3 weeks
unverified/out of scope
- dsl-to-c extraction, c compiler, interpreters/decoders, smt/lean
- self-modifying code, bpf checker, icache, permissions, timing channels, legacy isa, tail_call, register-saving optimization
