# DocPrompting: Generating Code by Retrieving the Docs
(authored by agents unless marked 🧑)
Tag: `zhou2022docprompting`, [paper](https://arxiv.org/abs/2207.05987) (arXiv ID from the paper text; ICLR 2023)

## scope and result
DocPrompting retrieves API documentation for a natural-language intent, then gives the intent and retrieved passages to a code generator. The authors’ central description is: “First, a document retriever uses the NL intent n to retrieve relevant code documentation { d1 , d2 , d3 } from a documentation pool D . Then, a code generator uses these docs in its prompt to generate the corresponding code c .” (Section 1, p. 2). The documentation pool can be updated without retraining. The paper evaluates Bash and Python generation with BM25, dense retrievers, T5, CodeT5, GPT-Neo, and Codex.

## technique 1: retrieve then generate from a documentation pool
What it is. For intent `n`, score every document `d_i` in pool `D`, select the top `k` documents `D_hat_n`, and condition generation on `(n, D_hat_n)`. Equation (1) gives a marginal model over all subsets; Equation (2) approximates it with the most probable subset. The authors state: “The documentation pool serves as an external data store that can be updated frequently with new contents (e.g., documentation of newly released libraries), without re-training any model component.” (Section 1, p. 2).

When to use it. Inference: use this when APIs change faster than model training or when target functions are absent from code-training data. It is useful for Verus because the retriever can surface current contracts, examples, and supported constructs before proof generation.

How to apply it. (1) Build a pool whose documents describe libraries, functions, or arguments (Section 2, pp. 2–3); Inference: for Verus, proof APIs. (2) Compute a similarity score `s(d_i,n)` and select `top-k` documents (Section 2.2, p. 3). (3) Concatenate the intent and retrieved text, or encode each pair independently for a fusion-in-decoder model (Section 3.2, p. 4). (4) Generate the code conditioned on that prompt. Their running example retrieves Pygments, `PythonLexer`, and `HtmlFormatter` documentation before generating syntax-highlighting code (Figure 1, p. 2).

Verus form. Inference: index Verus language and project documentation as chunks keyed by construct, contract pattern, and diagnostics. Retrieve a small set for each Rust verification goal; place the goal, source context, and chunks in the model prompt. Keep the generated `requires`, `ensures`, `assert`, `proof fn`, and loop `invariant` code subject to Verus checking. Retrieval is guidance, not proof: the checker must accept the final Rust.

Evidence and limits. Inference: the paper’s test pools are static benchmark pools (tldr man pages from manned.org, DevDocs for CoNaLa; Appendices A and B), and the paper reports no experiment with live dependency updates. Inference: retrieval mistakes can inject an incompatible API or stale contract. The paper does not test Verus. On CoNaLa the authors write that their pool “is not comprehensive to cover all Python libraries and functions” (Appendix B, p. 14).

## technique 2: sparse and dense retrievers with mixed supervision
What it is. The sparse implementation is Elasticsearch BM25. The dense implementation trains an encoder contrastively: an intent and each oracle document are positive pairs; non-oracle documents are negatives. The loss maximizes cosine similarity for positives against in-batch negatives (Equation 3, Section 3.1, p. 3). The authors also mix supervised pairs with weak supervision in which two dropout views of the same documentation sentence form a positive pair.

When to use it. Inference: use sparse retrieval when wording overlaps the documentation. Use a language-pretrained dense encoder when intents use different words from API descriptions. Mix weak supervision when the pool is large and labeled oracle pairs are limited.

How to apply it. (1) Define oracle documents for training examples. (2) Form positive `(n,d+)` and negative `(n,d-)` pairs. (3) Train with the contrastive loss and cosine similarity, using other examples’ positives as in-batch negatives (Section 3.1). (4) Add same-sentence dropout pairs from the whole pool, mixing both objectives in random batches. (5) Compare retrievers by dev-set recall@n (Table 4, p. 8). The paper trains retriever and generator separately; the conclusion lists joint training as future work (Section 8, p. 9).

Verus form. Inference: use BM25 over exact Verus identifiers for a baseline, then train a dense encoder on `(goal, relevant-doc)` pairs mined from accepted proofs. Include negative documents from other modules and stale API versions. Measure recall@k before generation. The retrieval model can be untrusted orchestration; Verus remains the evidence boundary.

Evidence. On tldr development data, BM25 recall@10 is 59.86 and the best trained RoBERTa is 60.33; on CoNaLa, BM25 recall@10 is 9.73 while fine-tuned CodeT5 reaches 55.81 (Table 4, p. 8). Removing weak supervision lowers CoNaLa best recall@10 from 55.81 to 29.34 (Table 4). These are recall percentages on the stated dev sets, not proof success rates.

## technique 3: documentation-aware generator prompts
What it is. Long-context GPT-Neo and Codex prompts concatenate retrieved documents and the intent. T5 and CodeT5 use fusion-in-decoder because 512 input tokens may not fit multiple documents: each `(intent, document)` pair is encoded independently and the decoder attends to all encodings (Section 3.2, p. 4). Codex uses three few-shot examples, each containing documentation, intent, and reference code, followed by the test intent and its retrieved documents.

How to apply it. (1) Choose a generator that fits the context budget. (2) For short-context models, encode each retrieved chunk independently and fuse at decoding. (3) For few-shot models, select static examples showing the same documentation-to-code pattern. (4) Keep the baseline identical except for documentation so gains measure retrieval conditioning (Section 5, p. 5).

Verus form. Inference: use FiD-like separate encodings for long Verus modules or diagnostics, and reserve prompt space for the exact goal and current contracts. Include a few accepted proof examples only if their APIs match. Do not let the model copy a proof without rechecking names, ownership, and solver obligations.

## technique 4: benchmark unseen APIs and execution correctness
The tldr benchmark contains 1,879 disjoint Bash commands and 9,187 NL-to-Bash pairs; train, development, and test commands do not overlap (Section 4.1, p. 4). Its documentation pool has about 400k paragraphs from 1,879 manuals. CoNaLa is resplit into 2,135/201/543 train/development/test examples, with at least one test-time Python function unseen during training and examples from the same StackOverflow post kept in the same set (Section 4.2, p. 5). Metrics include command-name accuracy, exact match, token F1, charBLEU, BLEU-4, function recall, unseen-function recall, and pass@k on unit tests.

Results and denominators. On tldr’s test set with BM25 top-10 documents, CodeT5 exact match rises from 2.18% to 9.15%; GPT-Neo-1.3B rises from 3.12% to 9.05%; Codex three-shot rises from 8.94% to 9.29% (Table 1, p. 6). With the oracle command name, Codex exact match rises from 22.44% to 32.43% (Table 1). On CoNaLa, CodeT5 BLEU rises from 34.57 to 36.22, and unseen-function recall rises from 9.03 to 18.30 (Table 3, p. 7). Execution evaluation uses 100 CoNaLa test examples, each averaging 2.03 tests; the text of Section 5.2 (p. 7) reports a 2.85% improvement in pass@1, 4.45% in pass@5, and 8.38% at k = 200; Figure 3 (p. 7) plots k = 1, 10, 50, 100, 200 (pass@1 5.41 to 8.26, pass@10 14.31 to 18.70, pass@200 27.08 to 35.46). The abstract’s 4.39% in pass@10 matches the Figure 3 values; Figure 3 has no pass@5 point, so Inference: the 4.45% pass@5 figure cannot be checked against the figure. All gains are absolute points on only 100 examples. With code-davinci-001 the Codex gain on CoNaLa is small (BLEU 43.16 to 43.47, Table 3); with code-davinci-002 the non-oracle Codex results did not improve (Table 9, Appendix H, p. 18), which the authors attribute possibly to test-set leakage.

Failure case. For an unseen `df.to_csv`, retrieval also returns `df.read_csv`; the generator copies `skiprows=1` instead of the correct `header=False` argument (Section 6.3, p. 8). Inference: this single example shows that documentation can help function selection while still introducing a wrong parameter.

Verus form.

## what is proved, measured, and trusted
The paper measures generation and retrieval, not formal correctness. The authors report: “Models that use DocPrompting consistently outperform their base models that generate code solely based on the NL intents.” (Section 1, p. 2) Inference: the results rest on trust in the generators, datasets, oracle-document construction (string-matching heuristics, Appendices A and B), unit tests (written by two of the authors, one annotator per example, Appendix B), and documentation quality. Inference: for agent-written verified Rust, documentation retrieval threatens products through stale or neighboring contracts and through plausible but invalid proof code; Verus checking sharply reduces the latter only after the generated code reaches the verifier.

## techniques for the catalog
- retrieve then generate — select top-k API or proof documents for an intent and condition generation on them
- mixed sparse/dense retrieval — compare BM25 with contrastive language encoders and add weak sentence supervision
- fusion-aware prompting — encode long retrieved chunks separately when the generator context is short
- unseen-API evaluation — split by commands/functions and measure retrieval, surface quality, execution, and verifier acceptance separately
