# Integrating Rules and Semantics for LLM-Based C-to-Rust Translation
(authored by agents unless marked 🧑)
Tag: `luo2025integrating`, [paper](http://arxiv.org/abs/2508.06926v1)

## what the paper measures
IRENE is an LLM pipeline for translating C to Rust. Its abstract names “a rule-augmented retrieval module,” “a structured summarization module,” and “an error-driven translation module” (Abstract, PDF p. 1). The paper identifies itself as arXiv:2508.06926v1, dated 9 August 2025 (PDF p. 1), which supports the paper link above.

The evaluation uses 515 xCodeEval samples and 100 proprietary HW-Bench C functions (Section III-B, PDF pp. 4–5). Eight open-source LLMs are evaluated on xCodeEval; HW-Bench uses only Qwen2.5-Coder-7B, 14B, and 32B (Section III-D, PDF p. 5; Table V, PDF p. 8). The setup uses greedy decoding, temperature 0, top-p 1, Python 3.8.20, Rust 1.81.0, Ubuntu 20.04, and four NVIDIA A100 GPUs (Section III-D, PDF p. 5): “we configure all LLMs with greedy decoding (temperature = 0, top-p = 1)”.

## technique: rule extraction and intra-category retrieval
What it is. A static analyzer parses C into an abstract syntax tree (AST) and emits rule hints. Equation 1 gives each hint as a category and description; Algorithm 1 constructs the description from a C snippet and suggested Rust transformation (Section II-B, PDF p. 3). The paper calls the hint a triplet, although Equation 1 shows two fields. Table I gives representative pointer, I/O, mixed-integer, and array rules, including “Cast mixed-width integers to a common type like i64” (PDF p. 4).

How to apply it.
1. Parse the C source into an AST (Algorithm 1, line 2, PDF p. 3).
2. For pointer-related nodes, find the nearest enclosing declaration, extract the corresponding C snippet, infer a suggested Rust pointer type, and append a rule hint. Algorithm 1 shows the pointer case; the prose says “similar strategies are applied to other rule categories” (Section II-B, PDF p. 3).
3. Randomly sample 30,000 xCodeEval training instances. Apply an initial filter intended to prevent data leakage, generate Rust with Qwen2.5-Coder-32B, and filter by successful compilation. The resulting demonstration corpus contains 22,892 C–Rust pairs (Section II-B, PDF p. 4).
4. Annotate pairs with rule categories and use BM25 to retrieve within the matching category. Select the most similar example; the implementation sets “a BM25 threshold of 100” and reports coverage of 52.04% of queries. It does not specify whether equality passes the threshold (Sections II-B and III-D, PDF pp. 4–5).
5. Combine rule hints, the retrieved example, source C, and the structured summary as `⟨Rhint, Edemo, CODEc, Sc⟩`, then request Rust (Equation 4, PDF p. 4).

Evidence. Section IV-A reports “an average improvement of 8.06% and 12.74% on the CA and CSR metrics, respectively” over RAG (PDF p. 5). Inference: these are percentage-point differences between the eight-model means in Table II (PDF p. 6). The results do not establish superiority on every metric for every model: Deepseek-Coder-1.3B CSR is 70.10% for IRENE and 70.68% for RAG. The abstract reports average unsafe rate (UR) of 1.70%; the introduction and RQ1 answer report average Unsafe Loc Rate (ULR) of 0.26% (PDF pp. 1–2, 7).

Verus form. Inference: replace each rule hint with a specification obligation: pointer allocation becomes a constructor postcondition, index conversion gains a `requires` bound and a typed index, and arithmetic casts gain explicit range predicates. Inference: store rule categories and examples outside Verus; generated Rust would need `requires`/`ensures`, loop `invariant`s, and `proof fn` lemmas establishing the rule’s semantic conditions. Successful compilation does not establish these proofs. The paper does not evaluate Verus.

## technique: structured semantic summarization
What it is. Before translation, a model summarizes the C as `⟨Input, Output, Functionality⟩` (Equation 3, Section II-C, PDF p. 4). The introduction says the summary “describes its I/O types and overall functionality” (PDF p. 2). Figure 8 presents a circular movement example: the summary includes “in a circular manner,” and the IRENE translation preserves the loop rather than using the incorrect modulo simplification shown for instruction prompting (PDF p. 9).

How to apply it. Generate the input, output, and functionality summary and include it in the enhanced translation prompt (Equations 3–4, PDF p. 4). Evaluate output agreement on xCodeEval using computational accuracy (CA); HW-Bench has no CA measurement (Sections III-E and IV-C, PDF pp. 5, 8). Inference: in Verus, translate the summary into a candidate contract and prove the executable function against it with `ensures`; retain the summary for review because a model-generated description can be wrong.

## technique: compiler-error-driven refinement
What it is. After initial generation, IRENE compiles with rustc. If compilation fails, it feeds the erroneous Rust and compiler diagnostics to the LLM for correction. The paper says: “This module acts as a feedback cycle between the compiler and the LLM.” (Section II-D, PDF p. 4).

How to apply it. Compile; return errors and erroneous Rust to the model; request correction; repeat as configured. The implementation uses “one iteration of refinement” (Section III-D, PDF p. 5). Figure 1 illustrates reading all input with `read_to_string` plus `split_whitespace` and using `usize` array indices (PDF p. 2). Figure 9 illustrates explicit integer casts and `Vec::with_capacity` (PDF p. 10); these are translation examples, not a record of individual refinement iterations.

Verus form. Inference: substitute Verus diagnostics for rustc diagnostics and feed the failing obligation, relevant contract, and source span to the model. Use `proof fn` for proof code and `invariant` for loop facts. Inference: proving a generated contract establishes equivalence to the C only if that contract adequately captures the intended C behavior.

## techniques for the catalog
- rule-augmented retrieval — classify C AST fragments and retrieve category-matched C–Rust examples with BM25
- structured semantic summary — expose input, output, and functionality before code generation
- error-driven translation — compile generated Rust and iteratively repair from concrete diagnostics
- safety-aware translation rules — encode pointer, I/O, integer-width, and array-index conventions as reusable hints
