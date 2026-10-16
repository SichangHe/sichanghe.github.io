# When Does Structured Knowledge Help Neural Theorem Proving?
(authored by agents unless marked 🧑)
Tag: `nabi2026structured`, [paper](https://www.semanticscholar.org/paper/0358217c52496e7735508f2ed392d38e8b0c7259)

## question and findings

Nabi, Vogl, and Nabi test whether structured mathematical knowledge improves Lean 4 theorem proving, and for which models. They build MATH KG, a semantic graph of 364 verified MATHLIB theorems and definitions connected by 9,434 typed edges, and MATH AGENT, a four-agent system that retrieves graph and library context before iterative Lean checking. The controlled miniF2F experiment compares Qwen3 and Lean-specialized Goedel-Prover-V2 at 8B and 32B, plus Claude Sonnet 4.6, under four modes: no context, MATH KG, lexical MATHLIB retrieval, and both.

The main empirical fact is capability conditioning. The paper reports that Lean specialization adds 33–38 percentage points in every mode, while “no augmentation mode improves solve rate by more than 3 points” in aggregate (Abstract, p. 1). Knowledge-graph context helps Goedel-8B by 14 problems over the no-context baseline but hurts Qwen3-32B by 14 and Claude by 7 (Table 3, p. 7). Modes are complementary: on 488 miniF2F problems, a per-problem oracle gains 36 problems for Goedel-8B (205/488 to 241/488) and 23 for Sonnet (365/488 to 388/488) (Table 4, p. 8).

## technique 1: build a verified semantic knowledge graph

What it is. MATH KG chooses 364 MATHLIB declarations across seven domains: 229 theorems and 135 definitions. Each node stores an identifier, name, domain, natural-language statement, type, keywords, MATHLIB declaration and import, and verification status. Every declaration name is checked against a 404,440-entry MATHLIB database. Directed edges carry a relation type, confidence, and natural-language justification. The eight relations are prerequisite, generalizes, specializes, equivalent-to, applied-in, analogous-to, cross-domain-bridge, and instance-of. The paper says: “M ATH KG is a directed graph G = (V, E), built with NetworkX,2 where:” (Section 3.1, p. 3).

How to apply it. (1) Select a curated core whose declarations are already formalized and verified. (2) Record exact declaration names and imports. (3) Define relation types with endpoint restrictions. (4) For every ordered pair, ask a relation-extraction model for JSON `{relationship, confidence, reasoning}` using names, statements, keywords, domains, and few-shot examples. (5) Discard confidence below 0.75. (6) Check both directions because relations can be asymmetric. (7) Remove type-violating edges and contradictory generalizes/specializes cycles. (8) Add inverse edges for symmetric and inverse relation types. These are Section 3.2's steps.

Verus form. Inference: make nodes for verified Verus `spec fn`s, datatypes, lemmas, and module-level contracts, storing source paths and imports. Edge types can represent prerequisite specifications, generalization, application in proofs, and cross-domain correspondences. Edge confidence and reasoning remain untrusted retrieval metadata; Verus checks any selected lemma use. Inference: relation extraction should never be allowed to create a proof obligation shortcut or an admitted fact.

Evidence and limits. The graph has 8,026 LLM-inferred edges plus 1,408 automatic inverses (Section 5.1, p. 6). Cross-domain-bridge (3,481) and prerequisite (2,293) make up 72% of inferred edges; logical relations are sparse. The core is intentionally small because all-pairs extraction over all MATHLIB would be infeasible (Section 3, p. 3). Inference: a Verus graph built from a narrow core will miss specialized lemmas unless it also has a library retriever.

## technique 2: two-layer Explorer retrieval

What it is. Targeted MATH AGENT retrieval has two layers. Layer 1 searches MATH KG semantically; Layer 2 searches MATHLIB declaration names lexically and enriches matches with exact signatures and docstrings. The paper's algorithm gives the sequence: “contextKG ← Explorer.search_kg(P, G)” followed by “contextMathlib ← Explorer.search_mathlib(P)” (Algorithm 1, p. 4).

How to apply it. Layer 1: (1) pre-filter nodes by problem domain plus cross-domain-bridge neighbors; (2) ask the model to score candidates and select five seeds; (3) breadth-first walk one hop in both directions; (4) emit seeds and neighbors with statements, relation types, confidence, and rationales. Layer 2: (1) extract Lean identifiers by regex from the formal statement and ask the model for 10–15 namespace prefixes; (2) exact- or prefix-match the 404,440-name index; (3) rank by source priority, match precision, name depth, declaration kind, and module proximity; (4) attach full type signatures and up to 200 characters of docstring. Appendix C gives these four-step procedures.

Verus form. Inference: extract Rust/Verus identifiers and module paths from a goal, then retrieve graph neighbors and exact `spec fn`/lemma signatures. Preserve module imports and generic bounds in the context block. The ranking metadata should only select candidates; the generated proof must compile and verify.

Evidence and limits. The KG block is uncapped. Appendix I records context overflow for Goedel-32B: 10 problems in `with_kg` and 28 in `full_system` exceeded a 40,960-token serving window and were counted as failures, yielding 234/488 (48.0%) and 208/488 (42.6%). Excluding overflow gives 234/478 (49.0%) and 208/460 (45.2%). Inference: a production retriever needs a token budget and truncation policy, and must report denominator changes.

## technique 3: staged four-agent proving with error feedback

What it is. MATH AGENT uses Explorer, Conjecturer, Prover, and Integrator with MATH KG as shared memory. The evaluated targeted mode uses Explorer and Prover. The Prover generates a Lean proof once with context, submits it to Lean, then retries with previous code and up to ten error messages. Algorithm 1 sets max attempts K to 32.

How to apply it. (1) Retrieve KG and MATHLIB context. (2) Prompt the prover with the problem's natural-language and Lean statements plus context. (3) Submit generated code to the Lean 4 type-checker. (4) If it fails, return previous code and errors to the prover. (5) Repeat until success or 32 attempts. (6) Return only a proof that Lean verifies. The paper states: “Error-guided refinement: On failure, feed the previous code and its error messages (up to ten) back to the model to fix.” (Section 4.2, p. 5).

Verus form. Inference: use an agent loop that emits Rust/Verus proof code, runs `verus`, and feeds diagnostics back for bounded repair. Keep executable code fixed while editing proof blocks and specifications under review. A successful Verus check is the acceptance condition; model confidence or a retrieved edge is not.

Evidence and limits. The paper reports pass@32 with sequential refinement, not 32 independent samples (Section 5.1, p. 6). Lean's kernel checks accepted proofs; the LLM, graph extraction, relation labels, and retrieval ranking are trusted only as proposal machinery. Inference: a Verus loop should log each attempt, diagnostic, and final verifier result to detect accidental reliance on `assume` or external bodies.

## technique 4: controlled augmentation ablation

What it is. Four conditions isolate no context (`prover_only`), KG context (`with_kg`), MATHLIB retrieval (`with_mathlib`), and both (`full_system`). The matched models form general versus Lean-specialized pairs at 8B and 32B. This design separates specialization from inference-time context.

How to apply it. (1) Fix benchmark split, model, attempt budget, verifier, and hardware. (2) Run all four context modes. (3) Count solved problems over the same denominator. (4) Compare each augmented mode to the no-context baseline and report deltas with paired significance tests. (5) Also compute the union of problems solved by any mode to expose complementarity. The miniF2F denominator is 488 problems (Section 5.1 and Table 4).

Evidence. Table 3 reports KG deltas: Qwen3-8B +2, Qwen3-32B −14, Goedel-8B +14, Goedel-32B −3, Sonnet −7; MATHLIB deltas range from −6 to 0. Table 4 reports oracle gains of +19/+18/+36/+29/+23 problems for Qwen3-8B/Qwen3-32B/Goedel-8B/Goedel-32B/Sonnet. The paper's McNemar tests find some deltas significant, but every MATHLIB-minus-baseline delta is within noise (Appendix J, Table 11).

Verus form.

## what is proved, measured, and trusted

Lean's kernel proves accepted generated code. Measured quantities are pass@32 solve counts, per-model deltas, per-problem unions, token-overflow failures, and p-values. MATH KG relation labels are LLM-generated and filtered, not formally proved semantic facts. The selected MATHLIB declarations and their verification status are trusted inputs. The open-ended Conjecturer and Integrator are implemented but not evaluated (Section 4, p. 4), so claims concern targeted proving only.

## techniques for the catalog

- verified semantic graph — store exact formal declarations as nodes and typed, confidence-filtered semantic edges
- two-layer Explorer — combine domain-filtered graph walks with exact library-name search and signature enrichment
- error-guided prover loop — repeatedly submit generated proof code to the kernel and feed bounded diagnostics back
- four-mode ablation — isolate graph, library, combined, and no-context proving under matched budgets
- complementarity oracle — union problems solved by different augmentation modes to quantify adaptive selection headroom
