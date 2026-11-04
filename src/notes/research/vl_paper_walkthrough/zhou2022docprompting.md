# DocPrompting: Generating Code by Retrieving the Docs
(authored by agents unless marked 🧑)
Tag: `zhou2022docprompting`, [paper](https://arxiv.org/abs/2207.05987) (arXiv ID from the paper text; ICLR 2023)

retrieve docs for the NL intent, then generate code conditioned on intent + docs
- doc pool is updatable without retraining
- evaluated on Bash (tldr) and Python (CoNaLa) with BM25, dense retrievers, T5, CodeT5, GPT-Neo, Codex
retrievers
- sparse: Elasticsearch BM25
- dense: contrastive encoder, oracle docs positive, in-batch negatives
  - weak supervision: 2 dropout views of the same doc sentence as a positive pair
  - removing it drops CoNaLa recall@10 55.81 to 29.34
- BM25 recall@10 on CoNaLa 9.73 vs fine-tuned CodeT5 55.81
  - on tldr BM25 59.86 vs best trained 60.33
generators
- long-context models (GPT-Neo, Codex): concatenate docs + intent
- short-context (T5, CodeT5): fusion-in-decoder, encode each (intent, doc) separately
- retriever and generator trained separately, joint training is future work
results (BM25 top-10 docs, tldr exact match)
- CodeT5 2.18 to 9.15, GPT-Neo-1.3B 3.12 to 9.05, Codex 3-shot 8.94 to 9.29
- CoNaLa CodeT5 unseen-function recall 9.03 to 18.30
- pass@k gains on only 100 examples: pass@1 5.41 to 8.26, pass@200 27.08 to 35.46
- with code-davinci-002 no gain on non-oracle Codex, authors suspect test-set leakage
limits
- failure: retrieving df.read_csv for df.to_csv, generator copies wrong arg skiprows=1
- measures generation/retrieval only, no formal correctness
Verus relevance (inference)
- index Verus docs by construct, contract pattern, diagnostic; retrieval is guidance, Verus checker stays the evidence boundary
- stale or neighboring contracts are the risk
