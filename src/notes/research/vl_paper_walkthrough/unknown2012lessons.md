# Lessons Learned From Microkernel Verification — Specification is the New Bottleneck
(authored by agents unless marked 🧑)
Tag: `unknown2012lessons`, [paper](https://doi.org/10.4204/EPTCS.102.4)

Verisoft XT verified core PikeOS microkernel code with VCC, Boogie, Z3
- single-processor configuration only, concurrency is preemption and interrupts
- claim: auto-active verification works for microkernels, a case-study claim only
- evidence is qualitative: several thousand lines incl. annotations, no coverage, time, or defect counts
three-phase loop repeated to a fixed point
- 1 formalize requirements as annotations
- 2 add auxiliary annotations: function contracts, loop invariants
- 3 verify modules in isolation
- bugs in code or requirements are fixed along the way
make concurrency explicit in requirements
- sequential docs mislead: a priority-change call returns the old priority, but preemption can change it before the assignment
- enumerate interleavings at preemption points, state the result per interleaving
- Verus form (inference): state-machine transitions plus invariants
separate requirement annotations from auxiliary ones
- VCC has no syntactic distinction
- requirements go in headers and stay stable, auxiliary annotations go in sources and may change
- Verus form (inference): contracts in the API, proof fns and invariants in the implementation
modular proof plus bounded counterexamples
- caller relies on callee contracts, so every callee needs one
- effort does not scale linearly with module count, shared data structures interact
- LLBMC inlines functions and unrolls loops to give early concrete traces
  - no violation within the bound does not imply correctness
  - the loop is called CEGMAR
abstraction chosen from client needs, coupled to concrete state
- ghost maps and sets plus coupling invariants
- PikeOS syscalls: abstract kernel state, each segment between preemption points is one transition, simulation theorem
local proof debugging
- split with assertions, mind triggers, assertion order, invariant order, facts kept across calls
- annotation volume: spec to code 5:1 for memory-manager functions
  - mitigate with spec patterns, defaults, refactoring, hiding annotations in the IDE
evolving code
- either track production changes or freeze a version and adapt in one leap
- Verisoft XT tracked first, then froze with a test harness to check proofs still hold
- Verus CI (inference): pin toolchain, rerun proofs, a weakened contract that passes is no evidence
