# Integrating Rules and Semantics for LLM-Based C-to-Rust Translation
(authored by agents unless marked 🧑)
Tag: `luo2025integrating`, [paper](http://arxiv.org/abs/2508.06926v1)

## what the paper measures
IRENE is an LLM pipeline for translating C to Rust. Its abstract defines three modules: “a rule-augmented retrieval module,” “a structured summarization module,” and “an error-driven translation module” (Abstract, PDF p. 1). The evaluation uses xCodeEval (515 evaluation samples) and a proprietary HW-Bench (100 C functions), eight open-source LLMs, greedy decoding (temperature 0, top-p 1), Python 3.8.20, Rust 1.81.0, Ubuntu 20.04, and four NVIDIA A100 GPUs (Sections III-B, III-D, PDF pp. 3–4).

## technique: rule extraction and intra-category retrieval
What it is. A static analyzer parses C into an AST and emits rule hints. Each hint is a category plus a description containing the relevant C snippet and suggested Rust. Algorithm 1 walks the AST; when a node is pointer-related it finds the nearest enclosing declaration, extracts the snippet, infers a pointer type, and appends a hint (Section II-B, pp. 2–3). The paper gives the prompt-level rule shape: “Use Box<T> for malloc-allocated structs” and “Cast array indices to usize in Rust” (Table I, p. 3).

How to apply it.
1. Parse the input C source into an AST (Algorithm 1, line 1)
2. Recursively walk nodes; for each category, extract the smallest corresponding snippet and a suggested Rust transformation (Algorithm 1, lines 3–12)
3. Build a demonstration corpus by randomly sampling 30,000 xCodeEval training instances, filtering for compilable Qwen2.5-Coder-32B translations, and retaining 22,892 C–Rust pairs (Section II-B, p. 3)
4. Annotate each pair with rule categories and retrieve examples within the matching category with BM25; retain the top example when its score exceeds 100, which covers 52.04% of queries (Sections II-B and III-D, pp. 3–4)
5. Form the enhanced prompt as `⟨Rhint, Edemo, CODEc, Sc⟩` (Equation 4, p. 3), then ask the LLM for Rust

Evidence. On xCodeEval, compared with the strongest RAG baseline, IRENE improves average computational accuracy (CA) by 8.06 percentage points and compilation success rate (CSR) by 12.74 points; the abstract reports average unsafe rate (UR) of 1.70% and unsafe-location rate (ULR) of 0.26% (Abstract, p. 1). The denominator for CA/CSR is 515 evaluation programs per model; the retrieval corpus denominator is 22,892 retained pairs.

Verus form. Inference: replace each rule hint with a specification obligation: pointer allocation becomes a constructor postcondition, index conversion gains a `requires` bound and a typed index, and arithmetic casts gain explicit range predicates. Inference: store rule categories and examples outside Verus; generated Rust must then carry `requires`/`ensures`, loop `invariant`s, and `proof fn` lemmas that establish the rule’s semantic side conditions. A compiler-pass success is not a Verus proof.

## technique: structured semantic summarization
What it is. Before translation, a model summarizes the C as `⟨Input, Output, Functionality⟩` (Equation 3, Section II-C, p. 3). The summary exposes I/O types and behavior that syntax-only prompting misses. Figure 8 shows a circular movement function where a summary saying “moves … in a circular manner” prevents an incorrect modulo simplification and preserves the loop.

How to apply it. Generate parameter types and meaning, return type, and a concise functional description; include all three fields in the translation prompt; compare the resulting behavior against the C tests (Section II-C and Figure 8, pp. 3, 7). Inference: in Verus, translate the summary into a candidate contract, then prove the executable function against it with `ensures`; keep the summary as a review artifact because it is a model-generated hypothesis.

## technique: compiler-error-driven refinement
What it is. After initial generation, IRENE compiles with rustc, extracts diagnostics, and asks the LLM to revise only the faulty translation. The paper says: “This module acts as a feedback cycle between the compiler and the LLM” (Section II-D, p. 3).

How to apply it. Compile; if errors exist, send the erroneous Rust and exact diagnostics back to the model; request a targeted correction; repeat the configured refinement (IRENE uses one iteration in the implementation details, Section III-D, p. 4). The cases in Figure 1 show read-to-string plus `split_whitespace`, `usize` array indexing, explicit integer casts, and `Vec::with_capacity` replacing unsafe or semantically wrong direct translations.

Verus form. Inference: substitute Verus diagnostics for rustc diagnostics and feed the first failing obligation, relevant contract, and source span to the model. Keep proof-only `proof fn`s out of runtime code and represent loop facts with `invariant` declarations. Inference: a passing compile or proof obligation does not establish equivalence unless tests or a functional postcondition cover the C behavior.

## ablations, assumptions, and product threat
The paper’s ablation compares the full system with removal of retrieval, summarization, and error feedback (Section IV-B, pp. 5–6); the full combination is consistently strongest. Safety is measured by UR (unsafe samples / dataset samples) and ULR (unsafe lines / lines in each sample), while CA compares execution outputs (Section III-E, p. 4). HW-Bench is proprietary, so the 100-function denominator cannot be independently replayed. The authors list model selection, possible pretraining leakage, and dataset representativeness as threats (Section V-B, p. 7); they did not evaluate closed-source models.

Inference: what remains trusted includes the static analyzer’s category rules, BM25 retrieval quality, LLM summaries, rustc, test oracles, and the specification chosen for Verus. Inference: compilation success and low UR are weaker than formal functional proofs, and C undefined behavior may make “same output” an unstable target. Inference: for VL, the product risk is substantial at the contract boundary: IRENE provides useful prompt controls and diagnostics, yet a wrong rule or summary can produce safe-looking code with the wrong contract. VL should retain source snippets, retrieved pairs, summaries, compiler/Verus logs, and test denominators for audit.

What is already done. Rule-based C2Rust conversion, retrieval prompting, semantic summaries, and compiler feedback are all implemented and evaluated here; VL should not redo them as an undifferentiated translation loop. Inference: a novel VL contribution would need a measured gap such as proof-contract generation or Verus-specific diagnostic repair.

## techniques for the catalog
- rule-augmented retrieval — classify C AST fragments and retrieve category-matched C–Rust examples with BM25
- structured semantic summary — expose input, output, and functionality before code generation
- error-driven translation — compile generated Rust and iteratively repair from concrete diagnostics
- safety-aware translation rules — encode pointer, I/O, integer-width, and array-index conventions as reusable hints
Checked 2026-10-15 against paper luo2025integrating: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
