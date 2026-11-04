# EvolProver: Advancing Automated Theorem Proving by Evolving Formalized Problems via Symmetry and Difficulty
(authored by agents unless marked 🧑)
Tag: `tian2025evolprover`, [paper](https://arxiv.org/abs/2510.00732)

evolprover: augment lean training problems along symmetry and difficulty, then sft + rl a 7b non-reasoning prover
- 3 evolutions
  - evoldomain: transfer a verified theorem's logical skeleton to another math domain
  - evoldifficulty: llm makes harder/easier variants (logic, depth, abstraction, constraints, parameters)
  - evolast: deterministic ast rewrites, 7 equivalence rules (reorder hypotheses, commutativity, associativity, distributivity, de morgan, symmetric swap, dual relation)
- funnel: generate, lean compile (1 repair try), llm judge nl/formal consistency, evolast, prove, keep compiler-verified proofs
results (pass@32)
- formalmath-lite 53.86% vs 44.71% base
- minif2f-test 69.80% vs 52.0% base
- ineq-comp seed 52.20%, transformed 34.02%, ratio 65.17%
  - base transformed was 14.89%, so augmentation mainly buys robustness
- paper prints 53.86% and 53.96% for the same model, unresolved
ablation
- domain + difficulty augmentation gives the big jump (>10 points)
- evolast adds consistent smaller gains
  - ratio drops 65.62 to 65.17 only because numerator and denominator both rose
- evoldomain shifts domain mix: algebra 57.5% to 20.1%, calculus 3.5% to 6.8%
- 400 seeds give 661 verified candidates, vs 408-570 for plain formalization baselines
rl curriculum
- keep problems with 0 < sft pass@1 < 1/2, hard but solvable
limits
- llm judge reliability unmeasured, no manual error rate
- evolast "no further verification" claim is for lean math, not rust
verus transfer (inference, untested)
- verus compile is the deterministic filter, not the llm judge
- difficulty labels should be empirical (proof time, pass@k)
- rust rewrites may change overflow, triggers, ownership, so recheck every transform
