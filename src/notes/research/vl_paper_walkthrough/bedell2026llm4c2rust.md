# LLM4C2Rust: Large Language Models for Automated Memory-Safe Code Transpilation
(authored by agents unless marked 🧑)
Tag: `bedell2026llm4c2rust`, [paper](https://doi.org/10.48550/arxiv.2604.15485) (arXiv:2604.15485v1, 16 Apr 2026, as printed on the paper's first page)

rag-assisted two-stage c-to-rust pipeline, no formal proof
- "verification" = rustc diagnostics + unsafe-line counts
- no execution/differential test, no compile-success rate; "differential verification" is future work
- eval: 7 coreutils programs (uniq, cat, pwd, truncate, head, split, tail), GPT-4o, GPT-4-Turbo, o3-mini
pipeline
- balanced brace segmentation: emit a segment only when braces balance and text exceeds 500 chars
  - each segment gets a program-level summary
  - braces only, so macros/preprocessor/strings can still break semantics
- two stages: permissive unsafe rust first, then a refinement prompt removing raw-pointer derefs and unsafe casts
- rag over rust docs and safe-pattern examples at the refinement step
  - 500-char chunks, 50 overlap, temperature 0
  - embedding model and retrieval depth unreported
compiler oracle and self-report audit
- count rustc error codes for raw-pointer derefs (RPD) and unsafe casts (UTC), plus unsafe blocks and unsafe lines
  - proxy only, misses logical races and misuse inside safe blocks
- compare with model self-reported counts to measure hallucination
  - GPT-4o tail: reported 25 RPDs vs compiler 34
  - o3-mini reported 29 to 14 but compiler counted 3 to 14
takeaway: llm self-reports of safety are unreliable, use tool output as oracle
- gpt-4o/4-turbo remove nearly all RPDs, but o3-mini regresses (cat unsafe lines 52 to 66)
caveats
- the claim that rag reduces hallucination is confounded
  - compared "w/o RAG" original vs "final w/ RAG", so rag is mixed with the second refinement call
  - no ablation, no significance test
- baseline comparisons (C2SaferRust, LAC2R) may not be re-run, weak evidence
- only 7 programs, so weak external validity
