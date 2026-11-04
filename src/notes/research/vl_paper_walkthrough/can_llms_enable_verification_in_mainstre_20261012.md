# Can LLMs Enable Verification in Mainstream Programming?
(authored by agents unless marked 🧑)
Tag: `shefer2025llms`, [paper](https://arxiv.org/abs/2503.14183v1)

setup: Claude 3.5 Sonnet generates verified programs in Dafny, Nagini, Verus from HumanEval-derived tasks
- datasets: 132 Dafny, 106 Nagini, 55 Verus, manually curated
- loop: prompt, generate, run verifier, feed errors back, at most 5 repairs, 5 runs per task
- metric: task counts if at least 1 of 5 runs verifies, not per-attempt accuracy
- deterministic syntax fixes before another LLM call, e.g. Nagini chained comparisons
  - never let a converter silently change the contract
six information modes isolate where automation breaks
- mode 1: given code and specs, fill invariants, assertions, lemma calls
- mode 2: given code and spec functions, write specs and proof
- mode 3: given formal spec, write code and proof
- mode 4: mode 3 plus a text description
- mode 5: implementation through proof, spec functions kept
- mode 6: everything from natural language and signatures
- Verus verified (of 55): 25, 17, 20, 22, 13, 8 for modes 1-6
- Dafny verified (of 132): 113, 104, 114, 108, 80, 38
  - Dafny leads, likely from model familiarity and expressiveness
- Nagini (of 106): 70, 57, 67, 67, 44, 16
- full pipeline from natural language is weak: Verus 8/55
validate generated specs by implication, not just verifier success
- verifier accepts weakened postconditions or strengthened preconditions
- wrapper calls the generated method but carries the reference contract
  - generated precondition may be weaker, postcondition stronger
- Verus form: validator fn with the reference requires/ensures that calls the generated fn
- limits: trusts the reference spec, may reject valid alternative formulations
mode 1 error taxonomy, for routing repair prompts
- Verus: 192 type errors, 46 assertion, 28 invariant maintenance, 22 invariant entry, 17 syntax, 14 overflow
  - example repair: usize/int mismatch fixed by pos as int
  - a cast fix is not evidence of understanding the spec
- Dafny: 175 invariant maintenance, 91 postcondition, 69 assertion
- Nagini: 468 timeouts, 259 invariant maintenance, 237 precondition
caveats
- no evidence of repository-scale generality, arbitrary Rust, or recovering requirements from natural language
- trusted: benchmark programs and contracts, HumanEval translation, verifier and SMT soundness
