# Improving LLM Code Reasoning via Semantic Equivalence Self-Play with Formal Verification
(authored by agents unless marked 🧑)
Tag: `nok2026improving`, [paper](https://doi.org/10.18653/v1/2026.findings-acl.1615)

haskell program-equivalence self-play, verifier as reward gate
- alice generates variant q of program p, bob judges equivalence
- seq game: alice also gives a liquid haskell proof of `∀x. p(x) = q(x)`
  - keep pair only if liquid haskell accepts
  - accepted proof trace is sft data for alice
- sinq game: alice gives input xa with `p(xa) ≠ q(xa)`
  - keep pair only if executing both confirms the mismatch
  - execution falsifies only, cannot prove equivalence
- not rust/verus, all verus mappings are inference
difficulty-aware curriculum
- difficulty `d̂ = 10 × (1 − Nsuccess/N)`, bob sampled N=10 times
- keep hard examples above τ, plus a share of easy ones
  - τ=3 in experiments, easy share stated as both 20% and 50% in the paper
- lora fine-tune alice every round, bob once in the final round
- alice mean difficulty rises 0.50 (round 1) to 1.18 (round 7) vs fixed untrained bob
results
- seq proofs are the bottleneck
  - E0 (50/50 seq/sinq): 937 validated pairs, E1 (pure sinq): 1,839, E2 (96% seq): 140
- E0 beats E1 on semantic reasoning with fewer pairs, so proofs add signal beyond counterexamples
  - E2/E3 samples ~150 pairs, authors caution small
- bob base vs trained on round-7 challenge set: 87.57% vs 91.34% train, 88.24% vs 88.79% test
- haskell zero-shot pass@1 bob: HumanEval 17.7 to 26.4, MBPP 26.7 to 36.9
- transfer uneven: PySecDB F1 51.3 to 54.0, CodeXGLUE 47.9 to 43.2
- little benefit on low-level tasks (DCE, STOKE, TVM), haskell lacks memory/bit behavior
- dataset OpInstruct-HSx, ~28k validated functions
takeaways for verus (inference)
- verifier is the acceptance oracle, critic model never replaces it
- verus equivalence must cover ownership, mutation, panics, termination
- counterexample-only data can hide low proof quality, report verifier pass rate with all attempts as denominator
