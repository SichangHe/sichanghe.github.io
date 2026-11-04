# Extending concurrent separation logic to the hardware level to verify the xv6 OS kernel on RISC-V with AI agents
(authored by agents unless marked 🧑)
Tag: `kaashoek2026extending`, [paper](http://arxiv.org/abs/2609.04043v2)

MachCSL: Iris-style concurrent separation logic over Sail's sub-instruction RISC-V model, proofs in Rocq
- verified artifact is the xv6 ELF and fs.img, not C source
  - compiler, linker, assembler leave the TCB
- theorem quantifies over interleavings of HARTs, devices, interrupts, DMA, power cycles
  - implies process isolation, crash safety, hardware safety
- scale: 6,593 C/asm lines, 8,697 instructions, about 1.5M Rocq proof lines, 93 days
- found 10 xv6 bugs and 1 Sail bug
- trusted: Rocq, Sail/interconnect/device models; safety only, no liveness or non-interference
- model assumes TSO with load-load reordering
- application theorem: echo hello world has only the specified output, but safe executions may still power off or fail in allowed ways
agents wrote proofs and intermediate specs after humans designed the abstractions
- Claude Code; machine checking meant generated proof text was not inspected
- agents repaired proof shifts when recompilation moved binary offsets
ownership and framing give local proofs under concurrency
- each register and memory cell is a resource; a function gets only what it touches
- specs are chained separation implications (PC, args, return address, code, lock invariant, continuation)
- frame disjoint resources through unchanged
- acquire hands the protected predicate to the body, release returns it to the lock invariant
- proof never considers other cores, interrupts, or DMA explicitly
- Verus analogue (inference): requires/ensures + borrows cover part; needs explicit ghost ownership map, no native separation connectives
infinite CPU loop handled with continuation wp
- wp CpuLoop has no postcondition since the CPU never finishes
- Sail steps use wp Sail(m){Φ}; callers must establish wp CpuLoop after each return address
- adequacy theorem initializes every invariant and links CSL proofs to real model executions
- Verus analogue (inference): recursive spec fn for continuation safety; infinite execution needs finite-step relation + induction
hardware state gets owner predicates
- registers, TLB, page-table roots, trap vectors, timers owned per HART; immutable config persistent
- TSO memory: write histories + per-HART timestamps
- devices (UART, PLIC, disk): one invariant each, MMIO specs open it
- page tables allow arbitrary A/D-bit writeback
  - translation tiers separate boot identity maps from kernel maps
  - TLB holds only common mappings between the two sfence.vma on table switch
xv6 proof patterns
- interrupts: sie_cap_gpr (enabled flag, stack budget, register map, trap-vector continuation)
- context switch: stores wp CpuLoop in a valid context to resume a preempted thread
- locks: interrupt-disable depth, CPU-local release, lock ranks against recursive acquisition
- pipes: cancellable invariant once refcount hits zero; file-ref slots bound refcount increments
- allocator: counted boot regime vs duplicable concurrent regime
- file system: durable D vs in-memory M state, write-ahead-log permits, per-buffer fractional refcount ghost state
  - link-count ghost fragments localize directory consistency
  - stronger iget premises exposed real xv6 bugs
