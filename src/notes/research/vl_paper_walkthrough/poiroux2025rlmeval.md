# RLMEval: Evaluating Research-Level Neural Theorem Proving
(authored by agents unless marked 🧑)
Tag: `poiroux2025rlmeval`, [paper](http://arxiv.org/abs/2510.25427v1)

rlmeval: 613 blueprint theorems from 6 real Lean projects (Carleson, FLT, PFR, PNT, FLT3, TLB)
- best result 10.3% pass@128: DeepSeek-Prover-V2-7B, proof autoformalization, normal mode
- tables average per-project rates unweighted, so 10.3% is not 63/613
benchmark design
- select blueprint theorems, not auxiliary lemmas
  - main theorems avg 16.6 proof lines vs 6.6 for auxiliary
- two tasks: ntp (formal statement only) vs proof autoformalization (plus informal proof)
  - informal proof helps modestly: 8.8% to 10.3%
- context modes: easy exposes all project lemmas, normal hides non-blueprint ones
  - ntp 8.8% to 14.7%, autoformalization 10.3% to 16.7% in easy mode
- pass@k with k up to 128, gains diminish
- LeanInteract backports repl across 41 Lean versions; annual releases limit contamination
findings
- large project variance: FLT3 32.14% vs Carleson 2.73%
  - ordered by mean human proof length; correlation only
- results likely underestimate: 7B model, small sampling budget
- Verus: pin verifier/toolchain versions; keep type errors separate from proof failures
