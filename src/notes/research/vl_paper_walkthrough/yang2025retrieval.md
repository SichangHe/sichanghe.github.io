# Retrieval-Augmented Language Models are Mimetic Theorem Provers
(authored by agents unless marked 🧑)
Tag: `yang2025retrieval`, [paper](https://doi.org/10.18653/v1/2025.findings-emnlp.1162)

The paper studies natural-language theorem proving from raw textbook and research documents. Its central claim is that retrieval should supply both statements and reusable proof methods: “they can follow proof techniques found in unstructured contexts and effectively apply them to construct correct proofs for new theorems” (§1, p.21302). The system, Dual RAG, rewrites both query and context before embedding, then retrieves and reranks chunks for a generator.

## techniques

### preserve theorem-proof units during chunking

What it is: chunk raw LaTeX while retaining each theorem (or proposition/lemma), its proof, and nearby examples or remarks as one retrievable unit. The authors explain that “we utilize an LLM-based chunking method” (§4, p.21303), and the appendix prompt requires: “Keep all theorem/proposition/lemma environments and their corresponding proofs intact within the same segment” (Appendix A, p.21311).

When to use it: use this when source material is unstructured and proof applicability depends on the statement together with its proof and explanatory context. Do not treat isolated statements as equivalent to a complete proof context; the paper’s problem setting explicitly includes “theorems, their proofs, along with examples and remarks” (§4, p.21303).

How to do it: pass source LaTeX to an LLM; ask it to create segments when one or two theorem-like environments appear; preserve all original text and insert only `[SEP]` markers. Keep theorem and corresponding proof in the same segment. The exact appendix instructions say: “Create segments whenever 1-2 theorems/propositions appear” and “Preserve all original content exactly - only insert '[SEP]' markers between segments” (Appendix A, p.21311).

Verus form (Inference): for Verus source, keep a function’s specification, proof lemmas, and nearby invariant explanation in one retrieval record. A record can contain Rust/Verus text verbatim; no chunking marker belongs in the compiled program. Retrieval can return `requires`, `ensures`, `invariant`, `assert`, and proof-function bodies together. This is an inference because the paper uses LaTeX and natural-language proofs, not Verus.

Evidence and limits: Dual RAG’s ablation on two books reports Coverage@4/8 of 68.00/80.67 for Probability and 68.00/76.00 for Real Analysis; removing chunking reduces these to 34.10/42.10 and 58.42/66.89 (Table 6, p.21308). These are mean coverage percentages for the two 25-exercise textbook subsets, 50 exercises in total, not formal proof soundness; the complete dataset has 100 exercises evenly sampled from four textbooks (§5.1, p.21305). Chunking can lose context if the source has no theorem environment or if an LLM segmentation error occurs (Inference).

### dual augmentation of query and context

What it is: use an LLM to analyze the target theorem’s difficulties and sketch possible strategies, and separately summarize each known theorem, suggest applications, and extract proof techniques. Embed the augmented texts so semantically different statements that share a method become close. The paper says the target side should “identify its challenges, and determine the potential theorems and proof techniques that might be required” (Appendix A, p.21311), while context augmentation asks for “Potential Applications” and “Proof Technique Analysis” (Appendix A, p.21312).

When to use it: use this when lexical or semantic similarity misses a useful proof pattern, especially for exercises requiring methodological insight rather than a directly matching theorem. The authors report larger gains on their “Technique” subset than on their “Theorem” subset (Table 5, p.21308).

How to do it: (1) provide the target theorem to the augmentation prompt; (2) ask for challenges, candidate theorems, and techniques without requiring a finished proof; (3) for each source theorem and proof, ask for a summary, possible applications, and proof-technique analysis; (4) embed augmented document chunks and store them in a vector database; (5) augment each target at inference time before similarity search (§4, p.21304). Inference: preserve original statements alongside generated analyses so readers can distinguish source claims from model suggestions; the paper does not specify an exact concatenation format. Figure 1 (§4, p.21304) illustrates an infinite-expectation example where the augmentation exposes the missing law-of-large-numbers issue and a useful application.

Verus form (Inference): generate a query analysis listing candidate Verus lemmas, loop invariants, and arithmetic/sequence facts; augment each library item with the `requires`/`ensures` it establishes and an explanation of when it applies; retrieve these records, then ask a model to draft Verus proof steps. The verifier, not the model, must check the resulting code.

Evidence and limits: on Exercise100 (100 problems, four textbooks), Dual RAG coverage exceeds Vanilla RAG by 10.62–34.19 percentage points depending on book and K=4 or 8 (Table 2, p.21306). Without augmentation, coverage falls to 53.23/60.21 (Probability) and 54.64/68.99 (Real Analysis), versus 68.00/80.67 and 68.00/76.00 with the full system (Table 6, p.21308). Augmentation is generated text and can hallucinate a technique; the paper does not establish that every generated analysis is correct (Inference).

### dense retrieval and zero-shot reranking

What it is: embed chunks and retrieve K candidates, then ask an LLM to rank them for usefulness to the target, avoiding passages that are merely semantically similar. The reranking prompt explicitly says to select passages “that are directly applicable to constructing the proof” (Appendix A, p.21312).

How to do it: retrieve candidates from the augmented corpus; provide the numbered passages and target theorem to the reranker; rank by direct proof usefulness; feed the ranked chunks to DeepSeek-R1 or OpenAI-o1. Coverage is `|GT ∩ (∪CT)| / |GT|`, averaged over targets (§5.1, p.21305), where GT is manually annotated relevant context. The framework uses DeepSeek-V3 for retrieval-stage processing (§5.1, p.21305), DeepSeek-R1 and OpenAI-o1 for the textbook generation experiment, and Gemini-2.5-Pro for the research example (Table 4, p.21307).

Verus form (Inference): use embeddings to select candidate verified lemmas and an LLM reranker to order them; include full specifications and proof bodies in the final context. A Verus compile/verification run is the acceptance test, not the ranker score.

Evidence: removing reranking lowers Probability coverage from 68.00/80.67 to 65.23/72.00 and Real Analysis from 68.00/76.00 to 64.00/72.00 (Table 6, p.21308). Retrieval is not proof validation: GT coverage and expert scores measure relevance or quality, while generated proofs remain subject to human review.

### retrieval-guided proof generation and mimetic transfer

The generator receives target plus retrieved chunks and is prompted for a rigorous, stepwise LaTeX proof. In Table 1 (p.21301), raw DeepSeek-R1 gives a wrong almost-sure-convergence argument, while retrieved context leads it to use a subsequence strategy from a known theorem; experts mark the RAG proof correct. The research-level case retrieves arXiv LaTeX and reproduces both a lemma and structural steps—conditioning on high-probability events and decomposing regret (§5.4, pp.21307–21308). Its target is a contextual bandit problem with unknown stochastic contexts, an oblivious adversary, strongly observable feedback graph, and cross-context feedback; Appendix B (pp.21312–21313) supplies the problem, parameter settings, algorithm, and claimed regret order. The full generated proof is supplementary data, not part of this PDF. Inference: this study does not independently establish that theorem or its novelty.

Verus form (Inference): ask the model to emit compilable Verus functions and proof blocks after retrieval. Preserve the paper’s separation: retrieval proposes methods, and Verus checks the generated specification and proof. Natural-language expert approval cannot replace the SMT-backed verifier or review of the modeled statement.

Evidence: on 100 exercises, DeepSeek-R1 scores 62/90/80/64 for the four books without RAG, 70/94/86/82 with Vanilla RAG, and 82/96/90/88 with Dual RAG; OpenAI-o1 scores 54/92/60/68, then 64/92/68/78, then 76/98/76/86 (Table 3, p.21306). Scores are normalized totals over each textbook, with four graduate-level annotators using 0, 0.5, or 1 per proof; they are not machine-checked proofs. The authors explicitly limit the method: “it shows no significant improvement on problems that require fundamentally novel proof strategies” (Limitations, p.21309).

## what is proved, measured, and trusted

The paper measures retrieval coverage and human ratings of generated natural-language proofs. It does not prove that generated proofs are logically valid by a proof assistant. Trusted components include the LLMs, their prompts, dense embeddings, reranker, manually annotated GT passages, four annotators, textbook/source correctness, and the expert judgment of the research-level example. Inference: a Verus deployment can reduce the final-proof trust base by requiring Verus verification, but still trusts the formal specification, imported libraries, compiler/SMT assumptions, and retrieval corpus.

The reported “up to 34.19%” is the largest Dual RAG minus Vanilla RAG coverage difference in Table 2 (Real Analysis, K=4: 68.00−33.81); it is not a proof-success percentage. Table 3’s improvements are generation score differences, not percentages of the 100 problems unless normalized as stated. The paper’s research example is one case and experts say minor adjustments are needed (§5.4, p.21307), so it is evidence of feasibility, not general research-level reliability.

The paper distinguishes prior premise selection over structured theorem libraries from its retrieval of proof techniques in raw documents (§§2–3, p.21303). Inference: that distinction matters for VL when retrieving explanations and proof patterns alongside verified lemmas. Inference: this threatens an agent-written Verus product mainly through plausible but unverified proof plans and specification hallucinations; mandatory Verus checking, provenance links, and human review of specifications address that risk. The reported limitation provides no evidence that it reliably discovers fundamentally new invariants absent from its model and retrieved material.

## techniques for the catalog

- theorem-proof chunking — segment LaTeX source so each theorem and proof stay together, preserving examples and remarks

- dual query/context augmentation — generate target challenges and source applications/techniques before embedding

- coverage retrieval — evaluate top-K chunks by intersection with manually annotated ground-truth context

- zero-shot reranking — order retrieved chunks by direct usefulness to the target proof

- mimetic generation — condition an LLM on retrieved proofs so it can transfer their structure to a new theorem

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The LLM generates a correct proof for a recently proposed open problem by retrieving and leveraging relevant results from the arXiv corpus."): read the entire supplied 13-page paper text, including references, prompts, and appendices B–E, and the entire study; compared quotations, all reported table values, evaluation denominators, page references, and pipeline steps; corrected source wording, table/prompt locations, ablation denominators, unsupported augmentation-format and novelty claims, and distinguished model roles and inference; did not run the system, inspect supplementary proofs, audit expert ratings, validate cited papers, or visually inspect PDF figures.
