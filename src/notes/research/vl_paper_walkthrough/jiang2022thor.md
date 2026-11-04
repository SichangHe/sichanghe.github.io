# Thor: Wielding Hammers to Integrate Language Models and Automated Theorem Provers
(authored by agents unless marked 🧑)
Tag: `jiang2022thor`, [paper](https://arxiv.org/abs/2205.10893)

idea: LM does proof steps, hammer (ATP via Isabelle Sledgehammer) does premise selection
- ATP is a relevance filter, not a trusted oracle
  - proof reconstructed and kernel-checked
- LM premise-selection steps advance proof 1.9% vs 28.2% for steps without premises
results
- PISA/test: LM 39.0, Sledgehammer 25.7, union 48.8, Thor 57.0
  - 8.2% solved by neither alone
- MiniF2F test: Thor 29.9, LM 24.2, Sledgehammer 10.4
- Isabelle only
technique: hammer-backed training labels
- hammer-solvable states: target rewritten to `<hammer> <EOS>`
- at test time the token triggers the hammer on live state
- best-first search; stop at proof, 300 queries, or 500 s
- preprocessing one-time cost; cheaper where hammer leaves a trace (`sauto`, `metis`, `smt`)
- ablation: emitting Sledgehammer keywords instead of the token 55.4 (-1.6)
  - model should learn when to call automation, hammer decides which premises
context and sampling
- most recent proof step as context; removing it 57.0 -> 53.6
- temperature 1.2 vs 1.0: 57.0 vs 55.7
Verus form (inference)
- token requesting bounded lemma/fact search, then ordinary proof block checked by Verus
- solver answer never counts as proof
- premise serialization must keep types and assumptions
