# Formal Premise Selection With Language Models
(authored by agents unless marked 🧑)
Tag: `tworkowski2022formal`, [paper](https://doi.org/10.5281/zenodo.7823669)

two-stage premise selection for Isabelle proving
- PSM retrieves a few premises from a large lemma database
- PGLM sees proof state + retrieved premises, generates next proof step
  - PSM frozen while training PGLM
retrieval model
- embed proof state and premise text, rank by cosine similarity
- cache premise embeddings
- batch contrastive loss, row-wise softmax only
  - 512 states x 2048 premises per batch, 1 positive, 2047 negatives
  - 1536 premises are extra sampled negatives, which help
- small: 6-layer decoder-only, 15M non-embedding params, not pretrained
- main result uses k = 4 premises
recall@k on test set (6 layers + extra negatives)
- @1 0.230, @4 0.446, @8 0.561, @16 0.656, @64 0.793, @128 0.839
- without extra negatives: @4 0.408, @8 0.516
- 1-layer model: @4 0.347, @8 0.447
proof rate, best-first search, 1000 test theorems
- Sledgehammer 22.4%, state-only 39.8%, PGLM+PSM 43.1%, union of PGLM+PSM and state-only 47.2%
- needs >= 1 premise: 17.7%, 14.7%, 19.6%, 22.6%
- needs 0 premises: 27.5%, 67.1%, 68.6%, 73.9%
- takeaway: retrieval helps most on premise-needing theorems and complements state-only
  - how the union is computed is not stated
data: 220K lemmas, 2.4M state-step pairs, 400K steps using >= 1 premise
Verus transfer (inference)
- index lemmas/spec declarations, retrieve at a proof obligation, put names + signatures in the LLM prompt
- Verus check is the filter; keep Verus types and namespaces in the database
