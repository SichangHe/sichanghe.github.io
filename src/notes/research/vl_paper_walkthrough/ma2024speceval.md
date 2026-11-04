# SpecEval: Evaluating Code Comprehension in Large Language Models via Program Specifications
(authored by agents unless marked 🧑)
Tag: `ma2024speceval`, [paper](https://arxiv.org/abs/2409.12866)

benchmark for llm code comprehension via JML specs, not a verifier
- 204 java programs: 117 SpecGenBench, 47 SV-COMP, 40 Frama-C-Problems
  - specs cross-validated by 3 experts, pass OpenJML
- verus use: test contract/invariant understanding before trusting an agent on proofs (inference)
4 spec tasks
- judgement: is a candidate spec consistent with the program
- selection: pick the correct and strongest of 4 candidates
  - at most 1 weak-but-valid distractor, e.g. `ensures \result <= Integer.MAX_VALUE`
- infilling: mask 1 spec component (index, identifier, quantifier boundary)
- generation: write pre/postconditions and loop invariants for unannotated program
  - precision = fraction passing, recall = equivalent to ground truth (bidirectional implication)
  - checked by runtime tests, not static verification
negative candidates by mutation
- change variables, operators, `\forall` vs `\exists`
  - 50% per component, at least 1 change, remutate if still correct
counterfactual robustness
- 5 semantics-preserving mutations: Def-use Break, If-else Flip, Independent Swap, Name Random, Name Shuffle
- metric: Jaccard distance on solved sets, mean abs diff for generation
- Name Random most influential for 4 of 6 models
- avg impact: GPT-4 0.183, GPT-3.5 0.307, DeepSeek-Coder 0.340, Llama 0.573
- rust rewrites need care: ownership, evaluation order, overflow may change semantics (inference)
results
- GPT-4 original programs
  - judgement 81.37%, selection 89.71%, infilling 41.18%
  - generation precision 83.37%, recall 34.17%
- conclusion: "LLMs showcase a limited ability to specify program semantics with formal specifications"
  - generating specs is the weak spot: low recall
- few-shot matters unevenly: GPT-4 selection 25.00% at 0-shot to 89.71% at 2-shot, generation barely moves
  - greedy decoding, 2 JML examples
limits
- authors' own leakage argument, no independent audit
- runtime-test coverage falsifies candidates, does not prove them
