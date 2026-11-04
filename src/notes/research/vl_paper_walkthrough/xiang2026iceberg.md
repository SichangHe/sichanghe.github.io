# Iceberg: Automated Verification of DNS Authoritative Engines via Just-in-Time Summarization
(authored by agents unless marked 🧑)
Tag: `xiang2026iceberg`, [paper](https://www.usenix.org/conference/nsdi26/presentation/xiang-iceberg)

iceberg verifies dns authoritative engines by refinement against a top-level spec only
- no per-layer manual specs below top level
- symbolic execution over llvm ir, top-down from entry function
jit summarization
- zone config gives invariants (fixed args, constant memory, well-formed data)
- summary per callee built in the calling context
  - specialize node splits state when used as index/offset, dereferenced, or marked in a stub
  - on specialize mismatch, re-summarize and merge
- effect tree: assume, return, heap ops, memory writes, panic
memory model
- regions stack/global/const/heap with lifetimes, scalar-level layout
- symbolic region ids make pointer summaries reusable
summary optimization
- minimizeassume and mergeassume
- no verification in the paper terminates without them
stubs
- boolean spec function adds path constraint
- hints invariants, forces splitting via specialize, limits scope
- found through timeouts and inspecting summaries
reference checking
- wrapper compares implementation vs ideal model, bugs are unequal-result branches
- ideal model from rfcs, one top-level spec per implementation
evidence
- coredns (go), bind 9 (c), powerdns (c++), hickorydns (rust)
- 12 new bugs: 8 coredns, 2 powerdns, 2 hickorydns; 7 acknowledged; scale finds 2 of 12
- spec-to-code ratio 5.8-9.6%
- porting one person-week; retrofitting new versions one person-hour
trust and limits
- trusts llvm toolchain, z3, iceberg itself, intrinsics
- core lookup logic only: no i/o, networking, concurrency, rate limiting
- functional correctness only up to the top-level spec; safety at all layers
- modeling shortcuts: abstract hashmap, identity hash in bind 9, 7 manual type annotations
- inference: verus analogy only, no llvm summary engine
