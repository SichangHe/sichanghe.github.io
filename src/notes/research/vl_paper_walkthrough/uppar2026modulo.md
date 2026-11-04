# Verification Modulo Tested Library Contracts
(authored by agents unless marked 🧑)
Tag: `uppar2026modulo`, [paper](http://arxiv.org/abs/2604.15533v2)

VMTLC: prove the client against synthesized library contracts, only test the library against them
- weaker than end-to-end proof
  - library contracts are tested, not verified, so it can succeed on incorrect programs
- tool Dualis: CHCs (Z3), ICE learner (HornICE), LLM (Gemini 2.5 Pro), AFL++ fuzzing
- Verus use (inference): verify a small Rust client while treating a big dependency as a tested contract boundary
  - label such contracts as tested assumptions
observer-based modular contracts
- contracts over pure observers (`size`, `min`, `empty`) with primed post-state versions
  - e.g. insert: `size'(o) = size(o)+1 ∧ contains'(o,k)`
- needs the right observers: AtomicLinkedList2 failed for lack of a last-inserted observer
contextual contracts
- one contract per call site, only needs to hold on states the client reaches
- simpler contracts, but can accept spurious ones
  - 30 rare-path mutants: contextual verified 11/30, modular 0/30
ICE-CHC learning
- learner proposes invariants and contracts, CHC check gives positive, implication, or negative examples
- must generalize: plain CHC solvers overfit, CVC5 replacement got only 10 modular / 15 contextual contracts
- LLM proposes formulas and repairs them from verifier/tester counterexamples
  - hybrid feeds LLM atoms into HornICE
tested-contract loop
- tester returns violating valuation as a positive example, relearn, repeat
- terminates only if the logic is finite, a solution exists in it, and examples are classified correctly
results (43 C++ clients: 19 Folly, 9 Abseil, 1 Android, 14 SV-COMP)
- modular success: HornICE 19, HornICE+LLM 25, LLM 38
- contextual success: HornICE 21, HornICE+LLM 28, LLM 41
- SeaHorn solves only 7 even with proving contracts
- contracts manually vetted, all correct; 30 min AFL++ per contract found 34 nonredundant tests on average, 50% edge coverage
  - no proof of absence of violations
