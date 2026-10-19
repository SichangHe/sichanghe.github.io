# LSPRAG: LSP-Guided RAG for Language-Agnostic Real-Time Unit Test Generation
(authored by agents unless marked 🧑)
Tag: `go2026lsprag`, [paper](https://doi.org/10.1145/3744916.3773189)

## scope and result
LspRag retrieves concise, language-aware context for an LLM that generates unit tests, then repairs syntax errors using LSP diagnostics without compiling the project. The paper's core insight is: “LspRag leverages off-the-shelf Language Server Protocol (LSP) back-ends to supply LLMs with precise symbol definitions and references in real time.” (Abstract, p. 1) Its pipeline has key-token extraction, LSP definition/reference retrieval, prompt construction, and diagnostic-driven refinement (§5, pp. 5–7). Evaluation covers six open-source projects—two each in Python, Java, and Go—and three LLMs (§7.1, p. 7).

## technique: extract branch-controlling key tokens
Inference: this technique is useful when a focal function references many symbols but only some affect execution paths. The paper combines LSP tokens with a Tree-sitter AST, preserves each node's line/column span, builds a lightweight control-flow graph, and selects tokens involved in or influencing conditional expressions (§5.1, pp. 5–6). Its steps are:

1. invoke `TOK` for the focal method to obtain tokens with locations, lexical names, and semantic roles (§5.1.1, p. 5)
2. parse the method with Tree-sitter, retain node locations, and map nodes to tokens contained within their spans (§5.1.2, p. 5)
3. construct a lightweight CFG and identify tokens participating in conditional expressions (§5.1.3, p. 5)
4. exclude roles listed as `Keyword`, `Identifier`, `Literal`, `Comment`, `String`, and `Regex`, then collect remaining tokens on the same line as a condition token (§5.1.3, pp. 5–6)
5. pass the resulting `T_key` to the RAG module (§5.1.3, p. 6)

The motivating `checkout` example needs the external `isValid` definition to cover the true branch, while definitions for unrelated symbols add noise (§1 and Fig. 1, pp. 1–2). Inference: for Verus, analogous key obligations are branch predicates, loop conditions, and contract expressions. A parser could prioritize symbols appearing in `requires`, `ensures`, `invariant`, and branch guards, but Verus's specification syntax and solver dependencies require a new extractor.

## technique: retrieve exact definitions and enriched usages through LSP
For each key token, LspRag calls the LSP definition provider (`DEF`) and reference provider (`REF`) (§5.2, p. 6). It filters definitions to the current workspace and extracts the defining symbol's source. For each workspace reference, it retrieves top-level symbols through `SYM` and recursively searches their children for the smallest enclosing symbol. That symbol's source becomes a complete usage example (§5.2.1, p. 6). It then constructs a prompt with the full focal method, definitions and references for key tokens, and a lightweight test template with imports and class/function structure inferred from the focal method's file (§5.2.2, p. 6).

Inference: a Verus proof assistant can query rust-analyzer/LSP for definitions and references of symbols in a proof obligation, then add the enclosing function, trait, or spec item. This provides grounded context without relying on embedding similarity. It does not replace Verus's semantic checking; retrieved code can still be irrelevant or stale.

## technique: diagnose and repair without compilation
LspRag's refinement has two phases: real-time error detection and context-aware repair (§5.3, p. 6). When generated code changes, LspRag notifies the language server, which analyzes the file and returns diagnostics `(message, location)` (§5.3.1, p. 6). The repair module chooses context by category: symbol-level errors receive definitions and usage examples; workspace-level errors receive the workspace's file structure and the erroneous file's top-level symbols (§5.3.2, p. 7). Table 1 also lists syntax errors and unhandled exceptions as needing no external context (p. 6). The LLM receives erroneous code, the diagnostic, and retrieved context; after each fix, diagnostics are requested again until none remain or a retry budget is exhausted (§5.3.2, p. 7).

The authors describe “collecting 70k errors across Java, Python, and Golang” and manually analyzing them (§5.3.2, p. 7). Table 1 totals 66,908 listed errors: 28,300 redeclaration, 13,517 import/module, 13,387 member-access, 4,388 type mismatch, 1,670 constructor, 5,467 syntax, and 179 unhandled-exception errors (p. 6). Inference: the prose's 70k is approximate; the paper does not explain its difference from the table. For Verus, use rust-analyzer diagnostics for parsing/type errors and Verus diagnostics for failed proof obligations, retrieve the relevant function/spec context, and cap retries. A successful compile or diagnostic disappearance is not a proof unless Verus itself verifies the contracts.

The paper states that “This mechanism provides instantaneous feedback without requiring a project compilation or code execution, which is critical for real-time context.” (§5.3.1, p. 6) It also defines valid rate as “the ratio of grammatically correct test cases to the total number of unit test generation attempts.” (§7.2, p. 8)

## prompt and feature decomposition
The prompt uses one-shot chain-of-thought (§5.2.2, p. 6). The TypeScript implementation is a VS Code extension using Tree-sitter, validated with Pylance for Python, the Oracle Extension Pack for Java, and the official Go extension (§6, p. 7). Supporting another language requires translating its Tree-sitter AST nodes into LspRag's intermediate representation and installing its language server; retrieval and repair modules remain language-agnostic (§8, p. 11). The extension supports method-level and branch-targeted test generation (§6, p. 7).

Ablations compare the same prompt without context or fixing, with context only, and with both modules (§7.4, pp. 9–10). Experiments use methods exceeding 10 lines, five runs, and at most five self-correction iterations (§7.2, p. 8). The paper reports all p-values below 0.05 for line-coverage comparisons (§7.2, p. 8). Using GPT4o, the latency/cost experiment reports 28.27 seconds and 4,497 tokens per focal method; Table 4 prints generation and fixing averages of 2,732 and 1,832 tokens (§7.3, p. 9). Inference: those component averages sum to 4,564, not the printed total of 4,497. The paper claims 39% fewer tokens and 135% higher coverage than CodeQA (§7.3, p. 9).

## evidence, trust, limits, and VL threat
The abstract reports maximum line-coverage increases over the best baseline of 174.55% for Go, 213.31% for Java, and 31.57% for Python (p. 1). The introduction separately reports valid-rate increases up to 242.86%, 251.91%, and 20.16%, respectively (§1, p. 2). Table 3 lists Commons-CLI/GPT4o coverage as 34.69% for LspRag versus a best baseline of 9.60% (p. 8). Inference: that row implies a relative increase of about 261.35%, exceeding the reported Java maximum; the headline percentages need caution.

The discussion also evaluates fault detection with Pit and MutPy mutation tools and reports higher mutation scores than the baselines on the Java and Python projects (§8, Table 6, p. 10). It identifies dependence on LSP correctness and environment configuration as threats; Python's dynamic typing limits static diagnostic detection (§7.2, p. 9; §8, p. 11). Inference: coverage, syntactic validity, and mutation scores do not establish functional correctness. These results depend on the tested servers, parsers, LLMs, prompts, diagnostic categories, and retry budget.

Inference: for agent-written verified Rust, LSP-guided retrieval could supply context for proof generation and repair, especially for cross-file traits and specifications. An LSP diagnostic loop can stop while Verus obligations remain unproved. VL should require Verus verification as a prerequisite check and measure proof success. A new VL contribution should isolate Verus-specific proof-obligation retrieval and report denominators; this paper does not evaluate Verus.

## techniques for the catalog
- branch-token extraction — map AST and semantic tokens to a CFG and retain symbols controlling conditions
- LSP definition/reference retrieval — fetch exact workspace definitions and enclosing usage symbols for grounded context
- diagnostic-context repair — classify diagnostics, retrieve symbol/workspace context, and iterate fixes under a retry budget
- concise structured prompting — combine focal source, retrieved dependencies, and a lightweight scaffold
- multi-language evaluation and ablation — compare coverage, valid rate, latency, token cost, and component contributions

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This process is iterative: after the LLM proposes a fix, LspRag re-triggers the diagnostic mechanism."): checked all paper text, study quotations, numbers, page/section references, and technique steps; corrected the year tag, extraction steps, enclosing-symbol retrieval, error-table citation, implementation/generalization description, cost attribution, and headline-result limits; did not inspect the artifact, reproduce experiments, or validate the proposed Verus applications.
