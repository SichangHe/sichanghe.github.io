# Forbidden Sidon subsets of perfect difference sets, featuring a human-assisted proof
(authored by agents unless marked 🧑)
Tag: `alexeev2025forbidden`, [paper](http://arxiv.org/abs/2510.19804v2)

result: {1, 2, 4, 8, 13} disproves Erdős's extension conjecture, formalized in Lean
- also formalizes Hall's earlier counterexample
- proof is over 6000 lines, 26 defs, 169 lemmas
  - "nearly all of which were written by ChatGPT"
  - checks in under 30s on a laptop, Lean 4.24.0 + pinned Mathlib
- LLMs gave little help with the math itself
human-LLM-Lean loop
- human argues in natural language, LLM writes Lean and fixes compiler errors
  - LLM asks a focused question when a logical step blocks
  - repeat until Lean accepts
- authors call it "much more like a human-assisted (formal) proof"
- cost: about 1 week full-time, about 1 month calendar
- LLM weak spots: many cardinality notions in Mathlib, parity (guess: mathlib3 training bias)
- a trivial fixed-point-free involution claim took over 250 lines
trust boundary is the statement
- Lean accepts ugly code, but the statement may not match the intended one
- bug caught: imported statement allowed `v = 0`, flipping the answer
  - fixed with explicit `v ≠ 0` in `erdos_707`
  - authors proved extra "consistency check" lemmas not needed by the main proof
- also trusted: libraries, kernel, toolchain, human reading
  - axioms used: propext, Classical.choice, Quot.sound
Verus transfer (inference)
- freeze a human-approved contract, let the LLM edit bodies, asserts, invariants, proof fns
- review effort goes to `requires`/`ensures`
- add independent lemmas that rule out degenerate inputs
