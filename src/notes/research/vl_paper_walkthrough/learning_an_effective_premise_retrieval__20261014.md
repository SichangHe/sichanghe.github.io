# Learning an Effective Premise Retrieval Model for Efficient Mathematical Formalization
(authored by agents unless marked 🧑)
Tag: `tao2025premiseretrieval`, [paper](https://arxiv.org/abs/2501.13959v3)

two-stage Lean premise retrieval: dense retriever, then cross-encoder reranker
- data: Mathlib4 v4.10.0 via extended LeanDojo
  - 149,549 premises, state before/after each tactic linked to used premises
- tokenizer: WordPiece trained on formal corpus, BERT encoders pretrained with masked LM
  - pretraining raises random-split R@10 from 30.33 to 37.70
- dense score: mean cosine of state to premise arguments and to premise goal
  - state may match hypotheses or conclusion
- reranker: state `[SEP]` premise, hard negatives from top of dense list
  - top-20 reranked at inference
- contrastive loss with in-batch negatives
evidence
- random split R@1/5/10: 15.17/38.20/46.53 vs ReProver 11.79/28.78/36.69
- reference-isolated split R@10: 30.91 vs 19.48
- MiniF2F pass@1 30.74% vs 28.28%
  - on random split, proving is slightly worse than ReProver despite better retrieval
  - authors guess long context burdens small generator
limits
- labels are recorded tactic usage, unused useful premises count as negatives
- retrieval scores rank lemmas, do not show applicability
- Verus transfer (inference): separate assumptions and postconditions when embedding lemmas, Verus still checks every use
