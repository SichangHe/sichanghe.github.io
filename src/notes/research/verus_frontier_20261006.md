# Program verification and Verus: October 6, 2026 collection
(authored by agents unless marked 🧑)

Six new primary papers were retrieved from the official arXiv API, downloaded as PDFs, checked for PDF signatures, and extracted with `pdftotext`. Each collection directory holds the versioned PDF, text, retrieval date, SHA-256, exact abstract, and primary links in `source-provenance-20261006.md`. Existing files were preserved. Author claims below have not been reproduced.

- [SO-RSI, October 5](https://arxiv.org/abs/2610.05701v1), Jiang, Vempaty and Jagmohan
  - Authors: “SO-RSI improves final held-out pass rates over Naive RSI by 21.8 and 25.8 percentage points under matched 24-hour search budgets.”
  - Relevance: failure diagnosis and workflow improvement on Lean and Verus; a pass-rate improvement is not evidence of specification correctness
- [Solving VeriContest with a Lean-Backed Rust Verifier, October 2](https://arxiv.org/abs/2610.03994v1), Serbanuta, Xu, Stefanescu and Radoi
  - Authors, §4.1, p.5: “This validated 658 of the 1007 specs.” They describe agent reviews for the other 349; not all were individually reviewed
  - Authors, §4.2, p.5: “114 of the problems”. This is the coverage of the 21,413 source/target execution test cases, not all 1007 problems
  - Authors, §4.2, p.5: “For 27 problems”. Their code or specification helper required re-encoding; Appendix A describes the evidence for preservation
  - Inference: kernel-checked proofs apply to translated statements; these translation checks support preservation but do not establish a universal source-to-target equivalence theorem
- [Vosti, September 30](https://arxiv.org/abs/2609.38981v1), Qin, Du, Zhang, Lentz and Zhuo
  - Authors, abstract: “preserve output logits”. They describe a Verus inductive proof covering scheduling and the paged, prefix-sharing KV-cache
  - Authors, §5.1: “imports kernel contracts as trusted assumptions in Verus.”
  - [Official artifact](https://github.com/QDelta/Vosti)
  - Relevance: real systems verification across an engine/GPU boundary; trusted contract translation and representation correspondence remain a research boundary, not a disproved result
- [Fewer Assumptions by Design, September 28](https://arxiv.org/abs/2609.34886v1), Antoneac, Lucanu and Gavriluţ
  - Authors: “a specification weakness can arise when verification relies on unproven or invalidated assumptions, such as axiomatic lemmas and assume statements”
  - Relevance: strong doubly linked list specifications with a smaller trusted base; scope is specific data structures and properties
- [Forte, September 24](https://arxiv.org/abs/2609.30254v1), Abuah
  - Author: “Verus mechanizes the theorem, the function rule, and the refutation.”
  - Author: “Flux checks Forte as an ordinary library, with no fork of the compiler”
  - Relevance: ownership-based sensitivity reasoning across mutable Rust borrows and checked function boundaries

- [RESOLVE, October 5](https://arxiv.org/abs/2610.05683v1), Gargary et al.
  - Authors: “combines testing and formal verification to build a comprehensive kernel validation pipeline”
  - Competing work identified by ChatGPT Pro, then independently collected from the official arXiv record and PDF
