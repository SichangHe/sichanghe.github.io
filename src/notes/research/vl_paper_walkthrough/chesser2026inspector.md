# InSPECtor: Improving SLEIGH Specification Veracity via Proxy
(authored by agents unless marked 🧑)
Tag: `chesser2026inspector`, [paper](https://www.usenix.org/conference/usenixsecurity26/presentation/chesser)

InSPECtor tests SLEIGH processor specs (Ghidra, Icicle) against hardware
- the spec itself generates tests: "automated oracle validation strategy by proxy"
- GenSYS generates instructions + initial states, JuxtaPlayer diff-executes vs hardware
- relevance: specs can be wrong, so verifying code against a spec does not give processor-level correctness
GenSYS constructor-path traversal
- 1 instruction per decode path (root constructor + subtable constructors)
  - simple equality constraints become fixed bits
  - inequalities/relations (`rd = rn`) deferred to Z3 at path end
  - negate earlier overlapping constructors, force subtable backtracking
- prunes constructor-combination explosion (e.g. ARM LDMIA/STMIA ~2^16 paths) via traversal limit
  - detection and semantic redundancy of pruned paths not proved, no separate measurement
- coverage of constructors: 97% x86-64/AArch64, 96% ARM/Thumb, 99% RISC-V, 90% MSP430
  - 460 uncovered constructors manually classified (n/a, redundant, incomplete, spec bugs)
  - cannot find instructions missing from the spec
edge-case state generation from Pcode
- symbolically execute Pcode, solve per-operation edge assertions (overflow, zero, NaN, shift too big)
  - assertions solved independently to avoid exponential combinations
- assumes internal processor state fixed and reset between instructions
- single-instruction testing misses ARM/Thumb IT blocks
differential execution
- Icicle vs hardware: KVM VMs (x86-64, AArch64, ARM), MSP430FR5969 + JTAG, BeagleV-Ahead + ptrace
- 589,713 discrepancies, 38,920 constructor combos, 125 unique bugs (root-cause fixes in an ISA)
  - 87 incorrect semantics, ~16 decoding, ~9 aliasing, ~9 semantics ordering (Total row in paper inconsistent, sums to 121)
  - triage ~4 h per unique bug
- mismatch is a testing counterexample, not proof either side is right
ablation vs naive baseline
- naive random generation, x86-64 after 1.1e7 tests / 8 h: missed 1,249 constructors, 15 of 32 bugs
  - PACKUSWB bug (255 -> 0) found only by boundary states
- dropping deferred constraints loses 16.7-69.6% decode accuracy, dropping implied overlap constraints 12.3-54.7%
- x86-64 generation + execution < 40 min
language feedback to SLEIGH, 8 recommendations
- decompiler hints, templated constructors, SIMD iteration, precise float semantics, explicit undefined values, alignment requirements
