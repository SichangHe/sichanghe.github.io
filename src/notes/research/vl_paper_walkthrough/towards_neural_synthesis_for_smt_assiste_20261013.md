# Towards Neural Synthesis for SMT-Assisted Proof-Oriented Programming
(authored by agents unless marked 🧑)
Tag: `chakraborty2024neural`, [paper](https://arxiv.org/abs/2405.01787)

task: given the type (spec) of one F* definition, synthesize a body that F* + Z3 accepts
- 32,054 problems from 8 F* projects (MSR, arXiv:2405.01787)
- closest published analogue of filling a Verus fn/lemma body under a contract
- spec trusted as is, partial specs may pass without matching intent
- out of scope: choosing decomposition, specs, auxiliary lemmas
harness: recheck one definition in its original scope
- reload verifier state up to the definition, check candidate there
- candidate cannot reference the original, by name or implicitly via Z3
- reject `admit ()` / `assume`
  - these cause only false positives, hard to notice
- keep only ground-truth defs that recheck: 90% survive, rest unstable under SMT heuristics
- drop SMT-trivial problems (empty body verifies)
- Verus: no top-to-bottom order, harness must compute the dependency cut itself
  - also reject added `external_body`, self-calls
goal-type taxonomy: simply typed / proof / dependently typed, report separately
- verify@10 intra-project, fine-tuned StarCoder: 61.5 / 35.7 / 41.2
- GPT-4: 54.0 / 26.9 / 34.2
- proofs hardest
split by dependency closure
- training set closed under dependencies, 2 whole projects held out as cross-project test
- 343 of 5,965 intra-project test defs are clones of training defs (5.8%), results without them not reported
retrieval of related examples by goal-type embedding (ada-002), 400 token budget
- ablation, Phi-2 verify@10: intra 31.10 -> 25.92 without, cross 20.97 -> 21.82
- appendix B: pool = all files not depending on the current file
premise selection: fine-tuned MiniLM, names only, 300 tokens
- mostly negative: removing it changes 31.10 -> 31.15 intra
- MAP intra 0.15 -> 0.32, cross only 0.16 -> 0.18, does not generalize
- oracle premises: 35.84 intra, 23.74 cross, so ceiling is +4.7 / +2.8
- untested idea: lemmas called by retrieved examples as cheap near-ideal list
prompt assembly: goal type, modules, file context, premises, related examples, def prefix
- budgets 500 / 300 / 400 / 500 generated
- file context matters most: removing it 31.10 -> 21.89 intra, 20.97 -> 10.97 cross
- natural-language labels 31.10, tags 30.76, plain separator 10.54
- bigger prompts help: 100 problems, GPT-4 37 at 2k tokens -> 50 at 16k
model results, verify@10 intra / cross, no repair loop
- GPT-4 prompted 36.38 / 28.49
- fine-tuned StarCoder 43.98 / 32.90
- fine-tuned Phi-2 31.10 / 20.97
- Phi-2 vs GPT-3.5 gap: 4.3% intra, 13.1% cross
- fine-tuning needs 22,779 verified defs, no known Verus corpus of that size
- cascade: all 8 models 55.34 / 45.56 (80 samples), cheap fine-tuned first then big models
error triage: syntax / identifier not found / semantic
- GPT-4 and fine-tuned models: invented identifiers (e.g. nonexistent lemma) are the top failure
- fix: constrain to in-scope names or resolve-only check before SMT
paper's headline claims overstated
- "a third to a half of proofs": best single model on proof class only 35.7% intra, 25.9% cross
- "up to 29.6% drop without context" is intra only, cross is 47.7%
- GPT-4 not completed on dataset v2, and v2 changes pool, data, class mix together
