# NL2TL: Transforming Natural Languages to Temporal Logics using Large Language Models
(authored by agents unless marked 🧑)
Tag: `chen2023nl2tl`, [paper](https://arxiv.org/abs/2305.07766)

nl2tl: english to signal temporal logic (STL), 28K nl-tl pairs
- lifted representation: replace concrete atomic propositions (APs) with prop_i
  - model learns logical structure only, transfers across domains
  - ap detection via spaCy + rules on collected data, via gpt-3 at deployment
  - lifted t5 + gpt-3 ap recognition: ~95-97% on circuit, navigation, office email
  - further finetune on full domain pairs: >95% with <10% training data
- data generation: random pre-order stl trees -> words -> gpt-3 sentence -> human fix
  - framework 2 adds stl -> nl -> stl back-translation loop, gpt-3 filters odd formulas
  - 15108 lifted pairs, ~150 person-hours, f2 annotates ~120 pairs/h vs 80 for f1
  - annotated data +~10% accuracy, both frameworks +~2% over f1 alone
- model: t5-base/large finetuned on lifted pairs
  - in-order output + operators as words helps most
    - t5-large 97.52% in-order/word vs 88.17% in-order/operator
  - split ap recognition and lifted parsing: more data-efficient than end-to-end
- limits
  - no proof that english and formula agree, trusts gpt-3, annotators, ap recognizer
  - for verus: only drafts contracts, prover checks the draft, not intent
