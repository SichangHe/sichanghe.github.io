# Leveraging Large Language Models for Automated Proof Synthesis in Rust
(authored by agents unless marked 🧑)
Tag: `yao2023leveraging`, [paper](https://arxiv.org/abs/2311.03739v2)

gpt-4 + lightweight static analysis generates Verus proof annotations (Yao et al. 2023)
- verifier stays authoritative, each query's context is kept small
- targets single-function vector programs, human-in-the-loop prototype
- 20 vector programs from Diffy safe category, translation equivalence checked manually
segment interfaces
- split at loops, gpt-4 writes postcondition of segment k as precondition of segment k+1
- each segment verified independently by Verus
- developer can edit a wrong interface
- no check that the interface is the intended contract
invariants and proofs
- few-shot prompt, JSON output with reasoning + full program
- keep only what Verus accepts
- gpt-4 good at postconditions and invariants
- weak at Verus triggers, assertions, nonlinear arithmetic
- omitted preservation facts (untouched middle keeps old values) break inductiveness
read/write invariant propagation
- per loop, compute variables read and written
- copy a precondition into the invariant if it mentions no written variable and at least one read
- e.g. `N <= 0x7FFF_FFFF` needed for no overflow of `sum + a[i]`
- inference: sound only under the tool's variable model, aliasing and heap effects need conservative handling
error-feedback repair
- append last response + Verus error to new prompt
- 1 retry in main setup, 2 more for the later model
results
- 110 segments, 163 queries
  - 55 needed no annotation
  - 18 direct, 17 after propagation, 2 after feedback, 1 after both
  - 16 needed human correction, 1 unverified (buggy program)
- developer corrected 55 of 334 ground-truth proof lines, over 80% proof-line reduction
- gpt-4 2023-03-15: 3/20 programs fully automated
- 2023-11-06 model + 2 more attempts: 14/20, feedback repaired 20+ segments
- model- and benchmark-specific, entry-level only
future work: Set, Map, user types, cross-function, reusable lemmas
