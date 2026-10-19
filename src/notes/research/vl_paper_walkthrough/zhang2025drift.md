# DRIFT: Decompose, Retrieve, Illustrate, then Formalize Theorems
(authored by agents unless marked 🧑)
Tag: `zhang2025drift`, [paper](http://arxiv.org/abs/2510.10815v4)


## purpose and result

DRIFT is a four-stage retrieval-augmented autoformalization pipeline: decompose an informal theorem into concept queries, retrieve formal dependencies, illustrate their use with existing theorems, and formalize the original statement. The abstract states: “This facilitates targeted retrieval of premises from mathematical libraries such as Mathlib.” It evaluates Lean 4 on ProofNet (374 theorems), MiniF2F-test (224 after removing 20 noncompiling or duplicate examples), and ConNF (961 research-level theorems). On ConNF, GPT-4.1 with DRIFT reaches BEq+@10 62.33%, versus 6.76% zero-shot and 20.08% DPR; DeepSeek-V3.1 reaches 54.21% versus 11.03% zero-shot (Table 2, PDF p.9).

Inference: For VL, this is a concrete design for selecting relevant vstd or crate lemmas before asking an agent to write Verus specifications. Lean numbers are evidence about retrieval and context assembly, not direct Verus performance.

## technique 1: atomic decomposition

What it is. A decomposer LLM converts an informal statement IF into a dynamically sized set Q={(qᵢ, l̂ᵢ)} of sub-queries. Each qᵢ describes one mathematical concept in natural language; l̂ᵢ predicts its formal representation. The paper explains that the formal anchor “probes the LLM’s parametric knowledge” and helps retrieval use both semantics and syntax (Section 3.1, PDF p.4).

How to apply it. (1) Give the decomposer the complete informal statement. (2) Ask for one query per atomic concept, such as primality, a type, an operation, or an order predicate. (3) For each query produce a natural-language description and a candidate formal name or type. (4) Let the decomposer choose the number of queries. (5) Preserve both fields for retrieval; do not replace the natural phrase with the guessed symbol. (6) Use five few-shot Putnam examples spanning number theory, algebra, analysis, and geometry; human experts verified those examples (Appendix A.1.1, PDF p.15).

The running example concerns a prime p = 4t+3 and whether a is a primitive root modulo p exactly when -a has order (p-1)/2. Its six queries cover primality, primitive roots, modular negation, the order condition, the biconditional, and multiplicative order (Figure 1, PDF p.2). Inference: a Verus decomposer should emit Rust type and predicate candidates such as `Seq<T>`, `Map`, or a vstd lemma name, while clearly marking guessed names as candidates.

Evidence. On ProofNet, no decomposition gives retrieval F1 13.77%; Claude-Opus-4, GPT-4.1, and DeepSeek-V3.1 decompositions give 27.68%, 26.64%, and 27.01% respectively (Table 1, PDF p.8). On ConNF, the corresponding values are 28.17%, 35.29%, 35.56%, and 36.88%. These F1 values compare retrieved premises with oracle* dependencies; they are not formalization success rates. Table 1 uses DRIFT’s retriever for both query strategies. The separate DPR (RAuto) retriever scores F1 27.28% on ProofNet and 15.71% on ConNF (Appendix A.2.2, Table 5, PDF pp.16–17). Inference: decomposition helps when a statement contains multiple concepts, but its guessed formal anchors can also introduce errors.

Verus form. Inference: represent each sub-query as structured metadata stored alongside a proof task. Retrieval should search both prose and declarations, while a later compile check confirms whether the candidate Verus name exists. Implement this stage as external generator logic.

## technique 2: dense dependency retrieval

What it is. DRIFT fine-tunes a BGE-M3 dense passage retriever on Mathlib informal statements aligned with formal declarations. It precomputes embeddings for every library object and, for each sub-query, selects the object maximizing cosine similarity. The final dependency set is the union of one top result per query with duplicates removed (Sections 3.2 and 4.3, PDF pp.4, 7).

How to apply it. (1) Build a declaration corpus from the target formal library. (2) Extract ground-truth dependencies from source code with an AST parser where available. (3) Train contrastively: informal statement as anchor, dependency as positive, random objects as negatives (Appendix A.1.2, p.15). (4) Encode all declarations offline and index vectors. (5) Encode each decomposed query at runtime. (6) Select its top-1 declaration, union results, and deduplicate. (7) Keep the number of retrieved premises dynamic, at most the number of sub-queries.

The paper trains on Mathlib 4.7.0, evaluates ProofNet and MiniF2F-test with Lean 4.18.0, and uses Lean 4.7.0 for ConNF’s pinned dependencies. It reports near-100% compilation of gold statements as evidence that the version disparity did not destabilize evaluation (Appendix A.1.2, p.15).

Verus form. Inference: index vstd specifications, verified crate APIs, and lemma signatures using embeddings that include names, types, `requires`, and `ensures`. Key the index to the Verus and vstd revisions, and retain visibility and generic parameters in retrieved context.

## technique 3: greedy theorem illustration

What it is. Definitions alone show what an object means but not how to use it. DRIFT finds up to m=3 existing theorems that use retrieved premises. It builds candidates containing at least one retrieved premise, sorts by similarity to the original statement, then greedily selects the theorem covering the largest number of not-yet-covered premises. The paper states: “The selection process is a greedy algorithm designed to maximize the coverage of the input premises” (Section 3.3, PDF p.5).

How to apply it. (1) Gather all library theorems that use at least one retrieved premise. (2) Score each theorem by cosine similarity between its informal statement and the original IF, using the retrieval encoder; sort candidates in descending similarity as a deterministic tie-breaker. (3) Initialize selected set and covered-premise set empty. (4) Repeatedly choose an unselected candidate with maximum marginal coverage of retrieved premises. (5) Add the retrieved premises it uses to the covered set. (6) Stop at m or when marginal gain is zero. (7) Provide each selected theorem as an informal/formal pair to the formalizer.

With m=3, the average premise coverage is 74.59±4.80% across decomposers and benchmarks (Section 5.1, PDF p.8). Removing Illustrate lowers GPT-4.1 BEq+@1 on ConNF from 54.84% to 35.90% and DeepSeek-V3.1 from 46.72% to 29.34% (Table 3, PDF p.10). Inference: examples can carry syntax and composition information that a declaration cannot.

Verus form. Inference: select existing verified functions or lemmas that exercise retrieved contracts, showing invocation syntax, generic instantiation, and invariant shape. These examples should be compile checked before indexing; copied proof text remains candidate guidance, not a trusted proof.

## technique 4: context assembly and formalization

What it is. The formalizer receives context C = instruction ⊕ retrieved premises ⊕ illustrative theorems ⊕ original informal statement, then emits the formal statement. Each premise includes full name, declaration, and source code; each illustration includes informal and formal statements (Section 3.4 and 4.3, PDF pp.5–7).

How to apply it. (1) Start with the formalization instruction. (2) Append retrieved premises. (3) Append illustrative theorem pairs. (4) Append the original statement. (5) Generate formal statements. (6) For evaluation, typecheck candidates and test equivalence against reference formalizations; this is not an implemented feedback loop. DRIFT generates ten formalizations per problem for pass@10 (Section 4.3, p.7).

The semantic metric BEq+ uses deterministic tactics to prove bidirectional equivalence between prediction and reference; Typecheck measures compiler acceptance. The paper cites Poiroux et al. (2025) for Pearson 0.974 and Kendall 0.872 correlation between BEq+ and human judgments (Section 4.4, PDF p.7). Inference: for Verus, replace BEq+ with a specification-equivalence harness appropriate to Rust types; mere compilation does not establish that the generated contract matches the intended one.

## technique 5: proposed adaptive retrieval by dependency regime

The paper evaluates an in-distribution high-dependency set (ProofNet averages 3.39 dependencies from over 243,000 Mathlib objects), a low-dependency set (MiniF2F averages 0.43), and an OOD set (ConNF averages 3.92 premises from 1,348 objects) (Section 4.1, PDF pp.5–6). Retrieval helps ConNF dramatically but can distract on MiniF2F. For GPT-4.1 MiniF2F BEq+@10 is 29.02% with DRIFT versus 28.12% zero-shot; for DeepSeek-V3.1 it is 24.55% versus 27.23% (Table 2, p.9). The authors report: “for the simpler, low-dependency problems in MiniF2F-test, adding more context can act as a distractor” (Section 5.3, PDF p.10).

The paper measures an ideal per-problem choice between zero-shot and DRIFT, not a learned adaptive policy. Its MiniF2F-test oracle ensemble reaches BEq+@1 35.27% for Claude-Opus-4 versus 32.59% with DRIFT, and 25.89% for GPT-4.1 versus 24.55% with DRIFT (Appendix A.2.9, Table 9, PDF pp.19–20). The authors describe agentic iteration as future work: “Future work on agentic frameworks could retrieve select information, judge its utility, and iterate based on compiler feedback” (Section 5.3, PDF p.10).

Inference: an implementation could estimate dependency need, choose zero-shot or full retrieval, and use compiler feedback to revise context. The paper does not implement or validate such a classifier or loop.

Verus form. Inference: add a context utility classifier using retrieval scores, declaration count, and failed proof diagnostics. The classifier should be allowed to return “no context” and should not force irrelevant vstd lemmas into every prompt.

## ablations, evidence, and limits

Ablations show that the effects depend on the benchmark and metric. Removing all retrieval drops GPT-4.1 ConNF BEq+@1 from 54.84% to 4.47%; removing decomposition drops it to 46.72%; removing illustration drops it to 35.90% (Table 3, PDF p.10). On MiniF2F-test, removing illustration raises TC@1 for GPT-4.1 and DeepSeek-V3.1, leaves GPT-4.1 BEq+@1 unchanged at 24.55%, and lowers DeepSeek-V3.1 BEq+@1 from 22.77% to 21.43%. The study does not exhaustively tune k, m, or prompt order, and its decomposer and formalizer are not jointly trained (Limitations, PDF p.11).

The oracle* baseline is only approximate: it supplies ground-truth dependencies that are “not necessarily optimal or exhaustive for formalization” (Section 4.2, PDF p.6). The authors hypothesize that illustrative theorems explain why DRIFT can exceed oracle* on ConNF (Section 5.2, PDF p.8; Appendix A.3.2, PDF pp.22–25). Table 2 reports percentages of problems with at least one successful generation among k attempts, for k=1 or k=10. BEq+ is an imperfect proxy: Appendix A.3.1 gives a false negative involving an equivalent formulation with local function definitions (PDF p.21).

Inference: applying this system requires trusting the retriever training data and labels, embedding model, candidate theorem corpus, Lean compiler and tactics, BEq+ implementation, prompt templates, and the mapping from informal statement to reference formalization. Inference: in VL, generated retrieval metadata and contract translations should be logged as assumptions; a Verus proof can certify a chosen contract while the contract still omits a required safety condition.

Inference: DRIFT could reduce wrong-lemma selection and provide examples of idiomatic Verus usage, especially for unfamiliar vstd APIs. Its Lean results do not establish Verus gains or eliminate specification errors. VL could evaluate decomposition and example selection on versioned Verus libraries; adaptive retrieval and compiler-feedback loops would be extensions.

## techniques for the catalog

- atomic decomposition — split an informal theorem into concept queries with natural and formal anchors
- dense dependency retrieval — embed sub-queries and declarations, then union top-1 dependencies
- greedy illustration — select up to three usage theorems by marginal premise coverage
- context assembly — provide declarations, examples, and the original statement to a formalizer
- adaptive retrieval (future work) — choose between zero-shot and retrieval; the paper measures only an oracle upper bound
- compiler feedback loop (future work) — revise attempts using compiler feedback; no implemented loop is evaluated
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We finetuned the BGE-M3 retriever model (Chen et al., 2024) on the Mathlib 4.7 dataset to specialize it for dependency retrieval in formal mathematics."): read the full paper including references and appendices; checked quotations, numerical results, method steps, section and page references, authorship tag and arXiv identifier; corrected page references, quotation wording, illustration selection details, pass@k interpretation, and the distinction between evaluated methods and proposed adaptive retrieval or compiler feedback; marked Verus proposals and trust assumptions as inferences; did not reproduce experiments, inspect released code or data, independently validate cited correlations, or test Verus adaptations.
