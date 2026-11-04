# MIRB: Mathematical Information Retrieval Benchmark
(authored by agents unless marked 🧑)
Tag: `ju2025mirb`, [paper](https://arxiv.org/abs/2505.15585)

benchmark of retrieval used around proving: 12 datasets, 4 tasks
- tasks: semantic statement retrieval, question-answer retrieval, premise retrieval, formula retrieval
- motivation: ReProver retrieves mathlib4 premises from the proof state before tactic generation
- paper never mentions Verus; relevance to lemma search is my inference
premise retrieval datasets: query = conjecture or proof state, relevant = declarations used by the successful proof
- NaturalProofs (natural language), LeanDojo (Lean), MAPL (Isabelle), HolStep (HOL Light)
- LeanDojo: 4,109 queries, 180,944 declarations, 2.33 relevant per query
- MAPL: 4,000 queries, 493,029 documents, 7.07 relevant
- HolStep: 1,411 queries, 3,973 documents, 22.82 relevant
- novel_premises split: each test proof has at least 1 premise unseen in training
- caveat: labels come from one successful proof, so other useful premises count as false negatives
dynamic per-query corpora cut false negatives
- MSE duplicates: transitive closure of duplicate graph, one query per component, drop candidates sharing at least half the tags
- ARQMath/NTCIR: corpus is only the query's judged documents (nDCG' ignores unjudged)
evaluation: 13 models (BM25, 3 open <1B, 6 open >1B, 3 proprietary), nDCG@10
- voyage-3-large best: avg 54.54, first on 7/12 datasets
  - formal premises weak: LeanDojo 13.02, MAPL 17.77, HolStep 32.68, vs 91.69 on ProofWiki answers
  - cause per authors: embeddings not pre-trained on much formal language
- reranking mostly hurts: voyage avg 54.54 to 48.36 (bge) and 50.42 (jina)
  - rare gains, e.g. ARQMath-Task-1 52.45 to 53.03 with jina
gaps: no hard negatives for ProofWiki and Stacks, no Coq dataset
- inference for Verus: needs near-duplicate removal and multiple valid proof routes represented
