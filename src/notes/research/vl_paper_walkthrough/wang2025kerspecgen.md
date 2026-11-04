# KerSpecGen: Co-piloting formal Kernel specification synthesis with refined knowledge graphs and large language models
(authored by agents unless marked 🧑)
Tag: `wang2025kerspecgen`, [paper](https://doi.org/10.1371/journal.pone.0338821)

kerspecgen: seL4 spec generation from requirements, 3 stages
- property extraction -> spec-code generation -> program synthesis
- generated Isabelle/HOL is never executed or verified, only scored by similarity and experts
knowledge-graph property extraction
- summarize docs, retrieve by embedding similarity (45% threshold), restore source context
- hierarchy from abstract requirement to code-level property
- code-grounded refinement
  - check properties against real spec code, label provenance (doc / code / both)
  - dedupe only siblings under the same parent
  - infer missing properties from code context
fine-tuned property-to-code model
- Llama-3.1-8B on 2,998 description/code pairs, 9:1 split
- robustness: hold out a title group, BLEU-4 51.03%
results
- benchmark: 30 modules, 624 properties
- Llama-3.1-405B BLEU-4: refining 42.05 vs few-shot 34.80
- expert score: refining 3.57, few-shot 3.40, zero-shot 2.74, RAG 1.38
- 9 modules not better than few-shot, rerun unstable
- codeBLEU varies sharply per module (e.g. System Call 46.09 -> 25.13)
- paper text and Table 7 disagree on capability BLEU-4 (59.92% vs 62.59%)
verus adaptation (inference, untested)
- graph nodes -> `spec fn`, invariants, contracts, with provenance
- BLEU/ROUGE cannot show a `requires`/`ensures` pair is sufficient
