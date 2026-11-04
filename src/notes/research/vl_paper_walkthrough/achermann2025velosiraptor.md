# Velosiraptor: Code Synthesis for Memory Translation
(authored by agents unless marked 🧑)
Tag: `achermann2025velosiraptor`, [paper](https://doi.org/10.1145/3676641.3711998)

generates verified low-level OS code that programs memory-translation hardware from a specification
- spec = state, interface, `requires`-annotated methods, synthesis targets (`addmap`, `setperms`, `delmap`), OS environment spec
  - unit = partial function (address, mode, state) to address or exception
  - building blocks: segment, `enum` (variants over shared state), `staticmap` (non-overlapping entries)
  - implicit postcondition: behavior outside the range unchanged
  - loops and recursion disallowed in methods
synthesis = find control-interface call sequence meeting the postcondition for all valid states and args
- grammar from legal reads/writes with bit-slice assignments; enumerate short sequences first
- candidates checked in Z3 bit-vector logic with a universal postcondition; unsat-core names conflicting predicates
- search-space reduction (log10 size, x86-64 page tables: 38 down to 13)
  - state/API projection onto fields in the current goal leaves 10-100 candidates per subgoal; largest effect
  - expression reduction by type and argument use
  - CNF split into subgoals, merge via balanced tree to reject bad partial programs early
  - tree arithmetic in the paper inconsistent (130 vs 94; 263 vs 665 checks)
- two-phase caches/barriers: synthesize with immediate visibility, then add outstanding writes and re-verify
- SMT query caching, tree-root queries prioritized
results
- synthesis plus codegen median: x86-64 page tables 1.1 s, segmentation 12.4 s, Ubuntu 6.2 kernel build 154 s
- generated code booted on Arm Fast Models and Barrelfish (x86-64 QEMU/KVM)
- latency on par with Linux and Barrelfish: map 13 ns vs Linux 13 ns, userspace microbenchmark
limits
- proves sequences against the model only; not that the model matches hardware manuals, Z3, backend, or environment contracts
- integration barrier: Linux paging types passed through the kernel; swapped-out entries and NUMA balancing not exposed
- relevance to agent-written Verus: spec drift risk; separating behavioral spec, environment spec, synthesis, and solver check keeps assumptions reviewable
- not Verus: own Rust/Z3 DSL; Verus would verify each emitted sequence but not synthesize it
