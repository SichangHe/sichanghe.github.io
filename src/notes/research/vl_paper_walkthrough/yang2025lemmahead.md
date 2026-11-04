# LemmaHead: RAG Assisted Proof Generation Using Large Language Models
(authored by agents unless marked 🧑)
Tag: `yang2025lemmahead`, [paper](https://arxiv.org/abs/2501.15797)

setup: GPT-4 writes Lean proofs for MiniF2F (488 problems), Pass@1 checked by Lean
- retrieval corpus: textbook pages -> GPT image transcription to LaTeX -> LLM chunking -> embeddings in CHROMA
  - chunks keep problem-solution pairs together, not ablated
- enhanced query generation (EQG): GPT-4 lists needed concepts/theorems as keywords, which form the retrieval query
- iterative proof augmentation (IPA): re-query with the draft informal proof, refine for σ=5 rounds, then convert to Lean
results: Pass@1 validation/test
- GPT-4 control 9.4/9.0%
- basic RAG 2.3/2.5%, worse than control
  - paper's guess: poor queries retrieve unrelated context
- RAG+EQG 25.2/27.6%
- RAG+IPA 40.0/32.4%
  - multiplies inference time by iteration count, no cost curve given
- GPT-f baseline 23.9/24.6%
caveats
- no corpus size, retrieval precision, top-k, or chunking ablation reported
- only GPT-4 on MiniF2F, percentages without counts
takeaway for Verus (inference, untested)
- retrieval hurts unless queries are good, so generate queries from the problem and draft proof
- retrieved lemmas/contracts are suggestions, Verus must check the final proof
