# Formal Mathematical Reasoning: A New Frontier in AI
(authored by agents unless marked 🧑)
Tag: `yang2024formalreasoning`, [paper](https://arxiv.org/abs/2412.16075)

position paper, not a survey or experiment: argues for llm + proof assistant
- formal environment gives soundness, automatic feedback, goal checking
- all numbers cited from other work
requirement -> formal spec -> checked code
- key risk: spec neither too strong nor too weak, matching intent
  - seL4 cited as >20 person-years
- neither BLEU nor compile success correlates with human judgement of autoformalization
  - passing the checker does not show fidelity
- cited: ~30% formalizing competition math vs >70% informalizing, denominators unstated
theorem proving
- tactic generation + search (BFS, best-first, MCTS)
- expert iteration: retry unsolved, fine-tune on new checked proofs
  - gains diminish after a few iterations
- COPRA: memory of errors/failed predictions
  - many mistakes fail late, so error messages miss them
- premise retrieval, evaluate on new-premises split (cf. LeanDojo)
data
- Proof Pile: only 500MB formal proofs across six languages
- AlphaProof: 1M informal problems -> 100M formal theorems, proofs by expert iteration
- cross-framework transfer largely unexplored
verified code generation
- routes: verified Coq/Lean artifact compiled down, or code + proof in Dafny/Verus
- transpilation: source as spec, prove equivalence
- LLM code can be buggy/insecure
