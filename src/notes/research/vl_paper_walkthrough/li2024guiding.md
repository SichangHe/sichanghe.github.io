# Guiding Enumerative Program Synthesis with Large Language Models
(authored by agents unless marked 🧑)
Tag: `li2024guiding`, [paper](https://arxiv.org/html/2403.03997)

llm + enumerative SyGuS (CEGIS) beats llm alone, enumerator alone, and cvc5
- GPT-3.5 alone is weaker than formal solvers; the combination wins
- benchmarks: 609 total (BV 384, LIA 87, INV 138), 600 s timeout, Z3 4.8.12 verifier
- solved: LLM alone 303 (49.8%), enumerator 188.7 (31.0%), cvc5 415 (68.1%)
  - LLM ∪ A* pCFG-synth 488 (80.1%)
  - LLM ∪ e-pCFG-synth 436.7 (71.7%)
  - A* iLLM-synth 408.0 (67.0%)
  - fractional counts are averages of 3 runs
prompt library for standalone synthesis
- rename vars/functions to generic names
- ask for a Lisp function, not SMT-LIB, then convert and check format + semantics
  - on 50 benchmarks, Lisp +6% over Python; both beat SMT-LIB; emotional prompt +8% (denominators unstated)
- invariants: first ask the LLM to explain pre/transition/post constraints
- iterate prompt variants until one verifies
pCFG-synth: call the LLM before enumeration
- hypothesis: correct solutions lie near incorrect ones
- count grammar-rule occurrences over failed candidates' derivations → weights → pCFG
- CEGIS with probabilistic top-down enumeration, or weighted A* (cost -log2 P, smoothing γ=0.4)
- paper's probability formula does not normalize counts, despite claiming it does
iLLM-synth: call the LLM during enumeration
- every n iterations send partial program + constraints (+ last failed candidate and counterexample)
- ask for helper functions; add well-typed ones as new grammar productions with average weight
- LLM gives syntactic guidance, SMT verifier gives semantic verdict
- worse than standalone on INV, attributed tentatively to custom invariant prompts
- omitted PBE track: LLM overfits examples with big if-then-else splits
limits
- possible training-data leakage, GPT-3.5 not reproducible, hyperparameters untuned
- failures: complex constraints, syntax/semantic mistakes, uncommon operators
Verus takeaways (inference, unevaluated)
- weight proof/expression templates from failed agent attempts, enumerate with Verus as oracle
- plain-language explanation before writing an `invariant` clause
- feed proof hole + failed assert to the agent, add accepted lemmas as candidates
