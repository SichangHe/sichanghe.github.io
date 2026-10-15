# DRIFT: Decompose, Retrieve, Illustrate, then Formalize Theorems
(authored by agents unless marked 🧑)
Tag: `zhang2025drift`, [paper](http://arxiv.org/abs/2510.10815v4)


## purpose and result

DRIFT is a four-stage retrieval-augmented autoformalization pipeline: decompose an informal theorem into concept queries, retrieve formal dependencies, illustrate their use with existing theorems, and formalize the original statement. The paper’s abstract says: “We introduce DRIFT, a novel framework that enables LLMs to decompose informal mathematical statements into smaller, more tractable ‘sub-components’.” It evaluates Lean 4 on ProofNet (374 theorems), MiniF2F-test (224 after removing 20 noncompiling or duplicate examples), and ConNF (961 research-level theorems). On ConNF, GPT-4.1 with DRIFT reaches BEq+@10 62.33%, versus 6.76% zero-shot and 20.08% DPR; DeepSeek-V3.1 reaches 54.21% versus 11.03% zero-shot (Table 2, PDF p.8).

Inference: For VL, this is a concrete design for selecting relevant vstd or crate lemmas before asking an agent to write Verus specifications. Lean numbers are evidence about retrieval and context assembly, not direct Verus performance.

## technique 1: atomic decomposition

What it is. A decomposer LLM converts an informal statement IF into a dynamically sized set Q={(qᵢ, l̂ᵢ)} of sub-queries. Each qᵢ describes one mathematical concept in natural language; l̂ᵢ predicts its formal representation. The paper explains that the formal anchor “probes the LLM’s parametric knowledge” and helps retrieval use both semantics and syntax (Section 3.1, PDF p.4).

How to apply it. (1) Give the decomposer the complete informal statement. (2) Ask for one query per atomic concept, such as primality, a type, an operation, or an order predicate. (3) For each query produce a natural-language description and a candidate formal name or type. (4) Let the decomposer choose the number of queries. (5) Preserve both fields for retrieval; do not replace the natural phrase with the guessed symbol. (6) Use five few-shot Putnam examples spanning number theory, algebra, analysis, and geometry; human experts verified those examples (Appendix A.1.1, PDF p.15).

The running example decomposes “a is a primitive root modulo p iff -a has order (p-1)/2” into queries for prime p, primitive root, negation in ZMod, order, and the biconditional (Figure 1, PDF p.2). Inference: a Verus decomposer should emit Rust type and predicate candidates such as `Seq<T>`, `Map`, or a vstd lemma name, while clearly marking guessed names as candidates.

Evidence. On ProofNet, no decomposition gives retrieval F1 13.77%; Claude-Opus-4, GPT-4.1, and DeepSeek-V3.1 decompositions give 27.68%, 26.64%, and 27.01% respectively (Table 1, PDF p.7). On ConNF, the corresponding values are 28.17%, 35.29%, 35.56%, and 36.88%. These F1 values compare retrieved premises with oracle* dependencies; they are not formalization success rates. Inference: decomposition helps when a statement contains multiple concepts, but its guessed formal anchors can also introduce errors.

Verus form. Inference: represent each sub-query as structured metadata stored alongside a proof task. Retrieval should search both prose and declarations, while a later compile check confirms whether the candidate Verus name exists. Verus has no built-in decomposition primitive; this stage is external generator logic.

## technique 2: dense dependency retrieval

What it is. DRIFT fine-tunes a BGE-M3 dense passage retriever on Mathlib informal statements aligned with formal declarations. It precomputes embeddings for every library object and, for each sub-query, selects the object maximizing cosine similarity. The final dependency set is the union of one top result per query with duplicates removed (Sections 3.2 and 4.3, PDF pp.5–7).

How to apply it. (1) Build a declaration corpus from the target formal library. (2) Extract ground-truth dependencies from source code with an AST parser where available. (3) Train contrastively: informal statement as anchor, dependency as positive, random objects as negatives (Appendix A.1.2, p.15). (4) Encode all declarations offline and index vectors. (5) Encode each decomposed query at runtime. (6) Select its top-1 declaration, union results, and deduplicate. (7) Keep the number of retrieved premises dynamic, at most the number of sub-queries.

The study trains on Mathlib 4.7, evaluates ProofNet and MiniF2F with Lean 4.18, and uses Lean 4.7 for ConNF’s pinned dependencies. It reports near-100% compilation of gold statements as evidence that the version disparity did not destabilize evaluation (Appendix A.1.2, p.15).

Verus form. Inference: index vstd specifications, verified crate APIs, and lemma signatures using embeddings that include names, types, `requires`, and `ensures`. Retrieval must be version keyed to the Verus commit and vstd revision. Inference: unlike Lean’s declarations, Verus proof facts can be module-private or tied to Rust generics, so visibility and type parameters must be retained in retrieved context.

## technique 3: greedy theorem illustration

What it is. Definitions alone show what an object means but not how to use it. DRIFT finds up to m=3 existing theorems that use retrieved premises. It builds candidates containing at least one retrieved premise, sorts by similarity to the original statement, then greedily selects the theorem covering the largest number of not-yet-covered premises. The paper states: “The Illustrate module is designed to bridge this gap by providing examples of formal object usage” (Section 3.3, PDF p.5).

How to apply it. (1) Gather all library theorems that mention at least one retrieved declaration. (2) Score each theorem by cosine similarity between its informal statement and the original IF. (3) Initialize selected set and covered-premise set empty. (4) Repeatedly choose the candidate with maximum marginal premise coverage. (5) Add its premises to the covered set. (6) Stop at m or when marginal gain is zero. (7) Provide each selected theorem as an informal/formal pair to the formalizer.

With m=3, the average premise coverage is 74.59±4.80% across decomposers and benchmarks (Results, PDF p.7). Removing Illustrate lowers GPT-4.1 BEq+@1 on ConNF from 54.84% to 35.90% and DeepSeek-V3.1 from 46.72% to 29.34% (Table 3, PDF p.9). Inference: examples can carry syntax and composition information that a declaration cannot.

Verus form. Inference: select existing verified functions or lemmas that exercise retrieved contracts, showing invocation syntax, generic instantiation, and invariant shape. These examples should be compile checked before indexing; copied proof text remains candidate guidance, not a trusted proof.

## technique 4: context assembly and formalization

What it is. The formalizer receives context C = instruction ⊕ retrieved premises ⊕ illustrative theorems ⊕ original informal statement, then emits the formal statement. Each premise includes full name, declaration, and source code; each illustration includes informal and formal statements (Section 3.4 and 4.3, PDF pp.5–7).

How to apply it. (1) Freeze an instruction template. (2) Append dependency declarations in retrieval order. (3) Append illustrative theorem pairs. (4) Append the original statement. (5) Generate one or more formal statements. (6) Compile/typecheck each candidate and apply a semantic equivalence test. DRIFT generates ten formalizations per problem for pass@10 (Section 4.3, p.7).

The semantic metric BEq+ uses deterministic tactics to prove bidirectional equivalence between prediction and reference; Typecheck measures compiler acceptance. The paper reports Pearson 0.974 and Kendall 0.872 correlation between BEq+ and human judgments (Section 4.4, PDF p.7). Inference: for Verus, replace BEq+ with a specification-equivalence harness appropriate to Rust types; mere compilation does not establish that the generated contract matches the intended one.

## technique 5: adaptive retrieval by dependency regime

The paper evaluates an in-distribution high-dependency set (ProofNet averages 3.39 dependencies from over 243,000 Mathlib objects), a low-dependency set (MiniF2F averages 0.43), and an OOD set (ConNF averages 3.92 premises from 1,348 objects) (Section 4.1, PDF p.6). Retrieval helps ConNF dramatically but can distract on MiniF2F. For GPT-4.1 MiniF2F BEq+@10 is 29.02% with DRIFT versus 28.12% zero-shot; for DeepSeek-V3.1 it is 24.55% versus 27.23% (Table 2, p.8). The authors report: “for the simpler, low-dependency problems in MiniF2F-test, adding more context can act as a distractor” (Section 5.3, PDF p.10).

How to apply it. (1) Estimate dependency need from statement complexity or retrieval confidence. (2) Use no retrieval for low-dependency tasks. (3) Use decomposition, retrieval, and illustration for knowledge-gap tasks. (4) Let compiler feedback trigger another retrieval round. (5) Compare candidate contexts and retain the one with verified semantic correctness.

Verus form. Inference: add a context utility classifier using retrieval scores, declaration count, and failed proof diagnostics. The classifier should be allowed to return “no context” and should not force irrelevant vstd lemmas into every prompt.

## ablations, evidence, and limits

Ablation supports all three stages but shows interactions. Removing all retrieval drops GPT-4.1 ConNF BEq+@1 from 54.84% to 4.47%; removing decomposition drops it to 46.72%; removing illustration drops it to 35.90% (Table 3, PDF p.9). On MiniF2F, removing illustration raises Typecheck but can lower BEq+, confirming syntax/semantic tradeoffs. The study does not exhaustively tune k, m, or prompt order, and its decomposer and formalizer are not jointly trained (Limitations, PDF p.10).

The oracle* baseline is only approximate: it supplies ground-truth dependencies that are “not necessarily optimal or exhaustive for formalization” (Section 4.2, PDF p.6). Therefore DRIFT exceeding oracle* is not paradoxical; the illustrations can provide usage context absent from the oracle set. Percentages in Table 2 are pass@1 or pass@10 over each benchmark’s stated fixed set; because pass@k counts at least one success among 10 generations, it must not be interpreted as ten times the number of solved problems.

What stays trusted includes the retriever training data and labels, embedding model, candidate theorem corpus, Lean compiler and tactics, BEq+ implementation, prompt templates, and the mapping from informal statement to reference formalization. Inference: in VL, generated retrieval metadata and contract translations should be logged as assumptions; a Verus proof can certify a chosen contract while the contract still omits a required safety condition.

Inference: threat to a product of agent-written verified Rust is medium. DRIFT could reduce wrong-lemma selection and expose idiomatic Verus usage, especially for unfamiliar vstd APIs. It does not solve semantic specification errors, and irrelevant context can harm low-dependency tasks. VL should not redo generic dense retrieval research; it should adapt dynamic retrieval, example selection, and compiler-feedback loops to versioned Verus libraries and measure contract equivalence.

## techniques for the catalog

- atomic decomposition — split an informal theorem into concept queries with natural and formal anchors
- dense dependency retrieval — embed sub-queries and declarations, then union top-1 dependencies
- greedy illustration — select up to three usage theorems by marginal premise coverage
- context assembly — provide declarations, examples, and the original statement to a formalizer
- adaptive retrieval — vary context size or skip retrieval when dependencies are unlikely to help
- compiler feedback loop — use failed type or semantic checks to trigger revised context and generation
Checked 2026-10-15 against paper zhang2025drift: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
