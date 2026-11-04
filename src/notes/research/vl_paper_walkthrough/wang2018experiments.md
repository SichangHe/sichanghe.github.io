# First Experiments with Neural Translation of Informal to Formal Mathematics
(authored by agents unless marked 🧑)
Tag: `wang2018experiments`, [paper](https://arxiv.org/abs/1805.06502)

early autoformalization: seq2seq translation of informalized LaTeX to Mizar statements
- metric is exact string match, not proof checking or ATP acceptance
- best config 65.73% exact on 105,247 inference pairs, union of 39 models 79.17%
- on 48,102 non-overlapping pairs: 47.77% best, 66.70% union
synthetic aligned data from a formal corpus
- informalize Mizar to LaTeX with nontrivial rewrites (not just symbol swaps)
- tag formulas with source line and column to align pairs
- ~1.06M pairs, split 947,231 train, 2,000 dev, 2,000 test, 105,247 inference
- Verus analogue: generate informal prompts from verified Rust specs
  - synthetic only, supplement with human-written specs
tokenization
- split fused formal tokens, keep spec-significant tokens, drop typesetting metadata
- separate source and target vocabularies (7,820 LaTeX, 16,793 Mizar)
model and tuning
- Luong seq2seq, LSTM/GRU, greedy decoding
- attention matters most: LSTM no attention 38.12% vs scaled Luong 57.68% exact
- staged ablation over optimizer, depth, residual, encoding direction, units
ensemble and triage
- greedy selection of models by added correct outputs, top-10 covers 76.89%
- edit distance flags near misses, but one token can flip a quantifier so verifier must check
semantic checking
- string mismatch may still be correct (synonymous formulations)
- proposed ATP equivalence check, left as future work
- Verus analogue: verifier acceptance and equivalence of postconditions, reported separately from exact match
