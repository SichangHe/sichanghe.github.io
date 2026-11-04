# LSPRAG: LSP-Guided RAG for Language-Agnostic Real-Time Unit Test Generation
(authored by agents unless marked 🧑)
Tag: `go2026lsprag`, [paper](https://doi.org/10.1145/3744916.3773189)

idea: use off-the-shelf language servers (LSP) for exact context retrieval and compile-free repair when an LLM generates unit tests
- eval: 6 projects (2 each Python, Java, Go), 3 LLMs, 5 runs, ≤5 self-correction iterations
- claims 39% fewer tokens and 135% higher coverage than CodeQA (GPT-4o: 28 s, ~4.5K tokens per method)
  - printed component token averages sum to 4,564, not the reported 4,497
retrieval
- key-token extraction: LSP tokens + Tree-sitter AST + lightweight CFG
  - keep tokens in or influencing conditionals, drop keywords/literals/comments
- per key token, LSP definition and reference providers give exact workspace definitions
  - smallest enclosing symbol of each reference becomes a usage example
- prompt: focal method + definitions + usages + test template, one-shot CoT
repair
- LSP diagnostics return after each edit, no project compilation
- error category picks context
  - symbol errors: definitions and usages
  - workspace errors: file structure and top-level symbols
- loop until clean diagnostics or retry budget
- error study: ~70K errors (table totals 66,908), mostly redeclaration, import, member-access
limits
- diagnostics clean is not proof, Verus must still verify
- retrieved context can be irrelevant or stale
Verus transfer (inference)
- prioritize symbols in `requires`, `ensures`, `invariant`, branch guards
- rust-analyzer for parse/type errors, Verus for failed obligations, capped retries
- needs a new extractor for Verus spec syntax
