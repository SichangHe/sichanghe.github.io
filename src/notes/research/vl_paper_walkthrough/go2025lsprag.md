# LSPRAG: LSP-Guided RAG for Language-Agnostic Real-Time Unit Test Generation
(authored by agents unless marked 🧑)
Tag: `go2025lsprag`, [paper](https://doi.org/10.1145/3744916.3773189)

## scope and result
LspRag retrieves concise, language-aware context for an LLM that generates unit tests, then repairs syntax errors using LSP diagnostics without compiling the project. The paper's core insight is: “LspRag leverages off-the-shelf Language Server Protocol (LSP) back-ends to supply LLMs with precise symbol definitions and references in real time.” (Abstract, p. 1) Its pipeline has key-token extraction, LSP definition/reference retrieval, prompt construction, and diagnostic-driven refinement (§5, pp. 5–7). Evaluation covers six open-source projects—two each in Python, Java, and Go—and three LLMs (§7.1, p. 7).

## technique: extract branch-controlling key tokens
Use this when a focal function references many symbols but only some affect execution paths. The paper constructs a Tree-sitter AST while preserving each node's line/column span, maps AST nodes to LSP lexical tokens, builds a lightweight language-agnostic control-flow graph, and selects tokens involved in or influencing conditional expressions (§5.1, pp. 5–6). Apply it as follows:

1. parse the focal method into an AST and retain source locations for every node (§5.1.2, p. 5)
2. map AST nodes to LSP semantic tokens whose locations lie within the node span (§5.1.2, p. 5)
3. construct a lightweight CFG and find tokens participating in branch conditions (§5.1.3, p. 6)
4. remove token roles that need no context search—keywords, identifiers, literals, comments, strings, and regex—then add same-line tokens around each condition (§5.1.3, p. 6)
5. use the resulting `T_key` for retrieval (§5.1, p. 5)

The motivating `checkout` example needs the external `isValid` definition to cover the true branch, while definitions for unrelated symbols add noise (§1 and Fig. 1, pp. 1–2). Inference: for Verus, analogous key obligations are branch predicates, loop conditions, and contract expressions. A parser could prioritize symbols appearing in `requires`, `ensures`, `invariant`, and branch guards, but Verus's specification syntax and solver dependencies require a new extractor.

## technique: retrieve exact definitions and enriched usages through LSP
For each key token, LspRag calls the LSP definition provider (`DEF`) and reference provider (`REF`) (§5.2, p. 6). It filters definitions to the current workspace, extracts the enclosing symbol at each definition, finds all workspace references, and replaces each raw reference location with the smallest enclosing top-level symbol so the prompt contains a complete usage example (§5.2.1, p. 6). It then constructs a prompt with the full focal method, definitions and references for key tokens, and a lightweight test template with imports and class/function structure (§5.2.2, p. 6).

Inference: a Verus proof assistant can query rust-analyzer/LSP for definitions and references of symbols in a proof obligation, then add the enclosing function, trait, or spec item. This provides grounded context without relying on embedding similarity. It does not replace Verus's semantic checking; retrieved code can still be irrelevant or stale.

## technique: diagnose and repair without compilation
LspRag's refinement has two phases: real-time error detection and context-aware repair (§5.3, p. 6). When generated code changes, the language server returns diagnostics `(message, location)` immediately (§5.3.1, p. 6). For each diagnostic, the repair module chooses context by category: symbol-level errors receive the symbol's definition and usage examples; workspace-level errors receive file structure and top-level symbols (§5.3.2, p. 7). The LLM receives erroneous code, the diagnostic, and retrieved context; after each fix, diagnostics are requested again until none remain or a retry budget is exhausted (§5.3.2, p. 7).

The paper manually categorized 70,000 generated-code errors across Java, Python, and Go. Table 1 totals 66,908 listed errors (28,300 redeclaration, 13,517 import/module, 13,387 member-access, 4,388 type mismatch, 1,670 constructor, 5,467 syntax, and 179 unhandled-exception); the prose says 70k, a discrepancy that should be retained rather than silently rounded (§5.3.2, Table 1, p. 7). Inference: for Verus, use rust-analyzer diagnostics for parsing/type errors and Verus diagnostics for failed proof obligations, retrieve the relevant function/spec context, and cap retries. A successful compile or diagnostic disappearance is not a proof unless Verus itself verifies the contracts.

The paper states that “This mechanism provides instantaneous feedback without requiring a project compilation or code execution, which is critical for real-time context.” (§5.3.1, p. 6) It also defines valid rate as “the ratio of grammatically correct test cases to the total number of unit test generation attempts.” (§7.2, p. 8)

## prompt and feature decomposition
The prompt uses full focal source, retrieved definitions/references, and a lightweight test skeleton, with one-shot chain-of-thought (§5.2.2, p. 6). The implementation is a VS Code extension in TypeScript of about 22k lines plus 8k lines of unit-test code, using Tree-sitter and any compatible LSP server (§6, p. 7). Its language generality depends on an LSP and Tree-sitter grammar, not on a universal semantic model.

Ablations attribute gains to two mechanisms: precise LSP dependency retrieval for coverage and iterative LSP diagnostics for valid-rate improvement (§7.2 and §7.4, pp. 8–10). The paper reports all p-values below 0.05 for line-coverage comparisons (§7.2, p. 8). Table 4's averaged per-focal-method cost is 28.27 seconds and 4,497 tokens, including up to five self-correction attempts; generation averages 2,732 tokens and fixing 1,832 (§7.3, p. 9). LspRag uses 39% fewer tokens than CodeQA while claiming a 135% coverage improvement in one comparison (§7.3, Table 4, p. 9).

## evidence, trust, limits, and VL threat
The abstract reports maximum line-coverage increases over the best baseline of 174.55% for Go, 213.31% for Java, and 31.57% for Python, and valid-rate increases up to 242.86%, 251.91%, and 20.16%, respectively (Abstract, p. 1). These are relative improvements whose denominators are baseline project/LLM measurements in Table 3, not universal guarantees. Coverage and valid rate measure tests, not functional correctness; the language server, Tree-sitter parser, LLM, prompt, diagnostic categorization, and retry policy remain trusted in the experiment.

Inference: for agent-written verified Rust, LSP-guided retrieval is a useful context layer for proof generation and repair, especially for cross-file traits and specifications. The threat is moderate: retrieval can reduce omitted definitions, but an LSP diagnostic loop can stop at syntactic cleanliness while Verus obligations remain unproved. VL should keep Verus verification as the acceptance gate and measure proof success, not only compile success or token/latency gains. Existing repository RAG and static-analysis systems already address much of context retrieval; a new VL contribution should isolate Verus-specific proof-obligation retrieval and report denominators.

## techniques for the catalog
- branch-token extraction — map AST and semantic tokens to a CFG and retain symbols controlling conditions
- LSP definition/reference retrieval — fetch exact workspace definitions and enclosing usage symbols for grounded context
- diagnostic-context repair — classify diagnostics, retrieve symbol/workspace context, and iterate fixes under a retry budget
- concise structured prompting — combine focal source, retrieved dependencies, and a lightweight scaffold
- verifier-aware evaluation — report coverage, valid rate, latency, token cost, and component ablations with explicit denominators
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
