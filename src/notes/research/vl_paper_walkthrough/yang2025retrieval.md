# Retrieval-Augmented Language Models are Mimetic Theorem Provers
(authored by agents unless marked 🧑)
Tag: `yang2025retrieval`, [paper](https://doi.org/10.18653/v1/2025.findings-emnlp.1162)

claim: retrieval should supply proof methods, not just statements, so LLMs imitate techniques from raw documents
- Dual RAG = rewrite query and context before embedding, retrieve, rerank, then generate
- natural-language proofs only, scored by 4 human annotators, no proof assistant
theorem-proof chunking
- LLM segments LaTeX with [SEP], theorem/lemma + proof + examples/remarks stay together
- removing chunking drops coverage@4/8: Probability 68.00/80.67 -> 34.10/42.10, Real Analysis 68.00/76.00 -> 58.42/66.89
dual augmentation
- target side: LLM lists challenges, candidate theorems, techniques
- source side: LLM summarizes each theorem, adds applications and proof-technique analysis
- gain larger on "Technique" than "Theorem" subset
- Dual RAG coverage beats vanilla RAG by 10.62-34.19 points on Exercise100 (100 problems, 4 books)
- generated analysis can hallucinate, unverified
zero-shot LLM reranking
- picks passages "directly applicable to constructing the proof"
- removing it: Probability 68.00/80.67 -> 65.23/72.00
generation scores (4 books, normalized human scores)
- DeepSeek-R1: 62/90/80/64 no RAG, 70/94/86/82 vanilla, 82/96/90/88 Dual RAG
- o1: 54/92/60/68, 64/92/68/78, 76/98/76/86
- one research-level contextual bandit case reproduced a lemma and proof structure, experts say minor fixes needed
limits
- no gain on problems needing fundamentally new strategies
- trusts LLMs, annotators, annotated ground-truth passages
takeaway for Verus (inference, untested)
- index lemma + spec + proof together, augment library items with when-to-apply notes
- Verus verification, not ranker score, is the acceptance test
