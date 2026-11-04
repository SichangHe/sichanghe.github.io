# Spoq: Scaling Machine-Checkable Systems Verification in Coq
(authored by agents unless marked 🧑)
Tag: `li2023spoq`, [paper](https://www.usenix.org/conference/osdi23/presentation/li-xupeng)

spoq auto-generates Coq specs + refinement proofs for unmodified C and Arm asm (no LLM)
- pipeline: clang → LLVM IR → Coq AST → structure reconstruction → layered refinement proofs
- result on SeKVM: 3.8K lines translated, >99% of functions per codebase
  - manual Coq 33.5K → 7.0K lines (-79%) for functional correctness
  - 38.3K → 10.0K (-74%) incl. security
  - the security proof's 38% cut comes from a different proof method, not spoq
- guarantee: generated specs behave exactly like the source, but may be too complex to be useful, and some refinement proofs may fail
structure reconstruction
- LLVM IR loses structured if/loop, so rewrite CFG with 8 rules (R1-R8) until one block of if/loop/break/continue/return
  - SCCs handle cycles; asm extracted into a separate instruction-list procedure
- aims at proof-friendly structure, not original C syntax
layered refinement (CCAL)
- layer calls only lower layers; bottom = machine model, top = self-contained spec
- per layer: M@L ⊑id Slow (generated), then Slow ⊑R L' (lifting), then compose
- data abstraction (e.g. array → Map) needs manual relations and lifting proofs
generated specs and loops
- users give a decreasing rank per loop (termination undecidable in general); used as Fixpoint fuel
- 12 rewrite rules + Z3 (0.5 s timeout) derive the high-level spec
  - Z3 results become annotations for the hrefine tactic, then removed by a second proof, so Z3 is untrusted
- automatic identical refinement requires the loop not be inside a conditional
concurrency
- machine model: CPU-private, lock-protected, lock-free (event log + oracle)
- assumes sequential consistency; relaxed Arm needs 6 weak-DRF conditions proved via VRM
trusted base and limits
- TCB: clang, LLVM, unverified LLVM-to-Coq translator, LLVM/Arm semantics
  - generators are outside TCB since Coq checks proof objects
- translator supports only a subset of LLVM IR and Arm asm
- Z3 is the bottleneck: >30 min for large functions, 2 h for SeKVM on 8 cores
- data-abstraction proofs and asm-with-jump refinement stay manual
Verus takeaways (inference)
- auto-generate low-level contracts, hand-write abstraction relations only where representation is hidden
- Rust modules/traits as layers, spec fn for representation relations, decreasing measures for loops
- SC ghost model does not justify relaxed atomics
