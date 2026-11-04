# Equivalence Checking of ML GPU Kernels
(authored by agents unless marked 🧑)
Tag: `driscoll2026equivalence`, [paper](https://doi.org/10.1145/3839470)

volta: black-box equivalence checker of reference vs optimized gpu kernel (ptx), also detects races and deadlocks
- checks output equality for all valid inputs, so usable on llm-generated kernels
structured-cta restriction
- static cta/thread counts, tile sizes, branch targets, memory addresses
- checks cta 0 against cta 0 only, assumes uniform ctas
- out of scope: top-k/argsort data-dependent swaps, cross-cta atomics, async producer-consumer, fp non-associativity
  - tensor elements modeled as reals
symbolic execution
- round-robin thread schedule, per-address reader/last-writer tracking, barriers block threads
- all threads blocked = deadlock, conflicting access = race
- confluence verified in agda, so schedule choice does not matter
- proved: race detection, deadlock sound and complete, equivalence sound and complete, under model assumptions
  - real-code guarantee still trusts the implementation to match the semantics
equality decision procedure
- fresh symbol per input cell, canonicalize output rational functions with exp, uninterpreted functions, min/max
- completeness via linear independence of exponentials plus Schwartz-Zippel
- nested exponentials outside the proof
- proves naive softmax = online softmax without bitwise identity
results
- reductions: red-1 to 4 pass, red-5 to 7 rejected for races
- sgemm 4096^3: vc generation 30-45 s, solving 89-94 s
- flashattention variants pass, solve about 154 s
- llm-generated conv2d after 13 optimization rounds passed (32 s vc, 14 s solve)
- found out-of-bounds shared-memory reads that evade compute sanitizer
  - empirical tests can pass despite invalid accesses
verus transfer (inference)
- needs a math tensor spec and an explicit gpu execution model
