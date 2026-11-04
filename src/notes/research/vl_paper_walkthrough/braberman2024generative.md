# Generative transformations and patterns in LLM-native approaches for software verification and falsification
(authored by agents unless marked 🧑)
Tag: `braberman2024generative`, [paper](https://arxiv.org/abs/2404.09384)

secondary study of prompt-based verification/falsification, 111 papers and 284 transformations
- scope: testing, fuzzing, debugging, static analysis, vuln detection, a few program verification (SpecGen, AutoSpec, Lam4Inv, Loopy, RustProof)
  - excludes fine-tuning, embeddings, and pure program generation/repair
  - literature cutoff mid 2024, so thin on formal verification agents
core abstraction: every LLM interaction is a transformation from (intermediate) inputs to output
- extraction: find results, prompt elements eliciting them, conditioning inputs, then name the function
- taxonomy has 6 categories
  - generative, evaluative, extractive, abstractive, executive, consultative
recurring composition patterns (Table 4)
- Generate and Fix: use correctness feedback to repair an initial generation
- Build Model: extract properties or analyzable models before generating
- Extract to Focus: select relevant input before later steps
- Divide, Generate and Merge: generate parts separately, then fuse and correct
- Enhance, Enrich with Precisions, Use Verbalized SWE, Compute Sequence of Transformations
- validation patterns: Judge, Test Symbolically, Constrain Generation
limits
- authors say pros/cons and completeness of the catalog are out of scope
  - no evidence the patterns improve correctness
- most testing/fuzzing approaches use only 1-2 transformation types (70%)
