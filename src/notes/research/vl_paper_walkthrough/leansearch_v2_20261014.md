# LeanSearch v2: Global Premise Retrieval for Lean 4 Theorem Proving
(authored by agents unless marked 🧑)
Tag: `gao2026leansearchv2`, [paper](https://www.semanticscholar.org/paper/86f2b969bdeb9b703753306cd087b924e0a7de1e)

global premise retrieval: find a coherent set of library lemmas for a whole proof, not one next step
- standard mode: search single Mathlib declarations
- reasoning mode: sketch, retrieve, filter, judge, revise
- Lean/Mathlib only, Verus transfer is inference, retrieval proposes and the kernel decides
dependency-aware informalized corpus
- extract all declarations and dependency DAG, topologically sort, describe bottom-up
- record kind, name, type, value, source, dependencies, description
- Mathlib v4.28.0-rc1, extraction/informalization errors unmeasured
- Verus analogue (inference): index modules, spec fn, proof fn, contracts, traits
embedding then kind-aware rerank
- top 50 by cosine similarity, then cross-encoder with prompts per declaration kind
- no Mathlib fine-tuning, domain knowledge enters via descriptions
- MathlibQR, 810 shared rows: nDCG@10 0.623, Recall@10 0.780, Recall@50 0.847
  - retriever only: 0.494 and 0.657
  - abstract: nDCG@10 0.62 vs 0.53 for next system
sketch-retrieve-filter-judge-revise loop
- sketch steps with move, context, query, no lemma names
- filter may return empty set, so no support stays distinct from weak support
- judge checks the filtered map supports one strategy, else reviser gets reasons
- up to 3 revision rounds
- MathlibMPR, 69 theorems, mean 2.96 interchangeable premise groups
  - group Recall@10 46.1% vs DIVER 38.0%
  - Covered@10 (a full routing hit) 30.4% vs 24.6%
- Verus analogue (inference): reject a route when any step has no visible valid lemma
three-level evaluation with fixed prover loop, 8 reflection rounds
- FATE-H: 20/100 vs 4/100 without retrieval
- MathlibMPR-Prop: 7/50 vs 2/50
- caveats
  - minimal downstream loop
  - repository-level agent interaction unexplored
