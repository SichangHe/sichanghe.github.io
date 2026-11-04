# Beyond Postconditions: Can Large Language Models infer Formal Contracts for Automatic Software Verification?
(authored by agents unless marked 🧑)
Tag: `richter2025postconditions`, [paper](https://arxiv.org/abs/2510.12702v1)

NL2Contract = LLM infers pre + postcondition from docstring, not postcondition only
- postcondition-only admits invalid inputs, verifier reports false alarms
  - e.g. largest prime factor needs n > 1; baseline false alarm at n = 1
- prompt: signature, docstring, imports, globals, called-function signatures; no implementation
- temperature 0.7, multiple samples, keep verification-sound ones
- Verus form (inference): Pre -> requires, Post -> ensures
  - Python try/except encoding drops out
soundness check in one verifier call
- verify reference impl against (Pre, Post*) where Post* = Pre_gt ∧ Post
- success implies Pre ⇒ Pre_gt and output satisfies Post
- Verus: put Pre_gt only in ensures, not requires, else check is vacuous
- CrossHair: unsound if violation found in 60 s, so "sound" is timeout-bounded
completeness via mutants
- complete = verifier finds violation for every mutant
  - 4–233 mutants per task (median 55), reused from nl2postcond
- test-input replay overestimates completeness
- Verus: unclear if it yields a failing input, not only a failed obligation
results (HumanEval+, small Python)
- sound@1 66.7% (CodeQwen 2.5) to 81.1% (GPT-5), vs 11.5–13.4% for nl2postcond
- sound@10 90.0–93.9%
- 10.4–12.4% of samples still violate the reference precondition
- sound and complete: 12.9–29.9% of contracts vs 2.8–4.8%
- kill 69.1–73.7% of mutants
- Python-by-Contract: CrossHair detects 14 of 19 confirmable bugs with generated contracts
- Pynguin as test oracle finds up to 9 of 31 bugs
caveats
- simple single-file Python only
- LLM not trusted, filtered by verifier
- trusts reference impls, mutant sets, CrossHair
- docs vs code mismatch found (sqrt `<` eps vs `<=`), human decides which is right
