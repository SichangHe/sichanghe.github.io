# DocPrompting: Generating Code by Retrieving the Docs
(authored by agents unless marked 🧑)
Tag: `zhou2022docprompting`, [paper](https://doi.org/10.5281/zenodo)

## scope and result
DocPrompting retrieves API documentation for a natural-language intent, then gives the intent and retrieved passages to a code generator. The authors’ central description is: “First, a document retriever uses the NL intent n to retrieve relevant code documentation { d1 , d2 , d3 } from a documentation pool D . Then, a code generator uses these docs in its prompt to generate the corresponding code c.” (Section 1, p. 2). The documentation pool can be updated without retraining. The paper evaluates Bash and Python generation with BM25, dense retrievers, T5, CodeT5, GPT-Neo, and Codex.

## technique 1: retrieve then generate from a documentation pool
What it is. For intent `n`, score every document `d_i` in pool `D`, select the top `k` documents `D_hat_n`, and condition generation on `(n, D_hat_n)`. Equation (1) gives a marginal model over all subsets; Equation (2) approximates it with the most probable subset. The authors state: “The documentation pool serves as an external data store that can be updated frequently with new contents (e.g., documentation of newly released libraries), without re-training any model component.” (Section 1, p. 2).

When to use it. Inference: use this when APIs change faster than model training or when target functions are absent from code-training data. It is useful for Verus because the retriever can surface current contracts, examples, and supported constructs before proof generation.

How to apply it. (1) Build a pool whose documents describe libraries, functions, arguments, or proof APIs (Section 2, pp. 2–3). (2) Compute a similarity score `s(d_i,n)` and select `top-k` documents (Section 2.2, p. 3). (3) Concatenate the intent and retrieved text, or encode each pair independently for a fusion-in-decoder model (Section 3.2, p. 4). (4) Generate the code conditioned on that prompt. Their running example retrieves Pygments, `PythonLexer`, and `HtmlFormatter` documentation before generating syntax-highlighting code (Figure 1, p. 2).

Verus form. Inference: index Verus language and project documentation as chunks keyed by construct, contract pattern, and diagnostics. Retrieve a small set for each Rust verification goal; place the goal, source context, and chunks in the model prompt. Keep the generated `requires`, `ensures`, `assert`, `proof fn`, and loop `invariant` code subject to Verus checking. Retrieval is guidance, not proof: the checker must accept the final Rust.

Evidence and limits. The paper’s test pools are static benchmark pools, not live dependency updates. Retrieval mistakes can inject an incompatible API or stale contract. The study does not test Verus or prove that documentation is complete.

## technique 2: sparse and dense retrievers with mixed supervision
What it is. The sparse implementation is Elasticsearch BM25. The dense implementation trains an encoder contrastively: an intent and each oracle document are positive pairs; non-oracle documents are negatives. The loss maximizes cosine similarity for positives against in-batch negatives (Equation 3, Section 3.1, p. 3). The authors also mix supervised pairs with weak supervision in which two dropout views of the same documentation sentence form a positive pair.

When to use it. Inference: use sparse retrieval when wording overlaps the documentation. Use a language-pretrained dense encoder when intents use different words from API descriptions. Mix weak supervision when the pool is large and labeled oracle pairs are limited.

How to apply it. (1) Define oracle documents for training examples. (2) Form positive `(n,d+)` and negative `(n,d-)` pairs. (3) Train with the contrastive loss and cosine similarity, using other examples’ positives as in-batch negatives (Section 3.1). (4) Add same-sentence dropout pairs from the whole pool, mixing both objectives in random batches. (5) Select the best retriever by validation recall@k, then freeze or jointly use it with the generator.

Verus form. Inference: use BM25 over exact Verus identifiers for a baseline, then train a dense encoder on `(goal, relevant-doc)` pairs mined from accepted proofs. Include negative documents from other modules and stale API versions. Measure recall@k before generation. The retrieval model can be untrusted orchestration; Verus remains the evidence boundary.

Evidence. On tldr development data, BM25 recall@10 is 59.86 and the best trained RoBERTa is 60.33; on CoNaLa, BM25 recall@10 is 9.73 while fine-tuned CodeT5 reaches 55.81 (Table 4, p. 8). Removing weak supervision lowers CoNaLa best recall@10 from 55.81 to 29.34 (Table 4). These are recall percentages on the stated dev sets, not proof success rates.

## technique 3: documentation-aware generator prompts
What it is. Long-context GPT-Neo and Codex prompts concatenate retrieved documents and the intent. T5 and CodeT5 use fusion-in-decoder because 512 input tokens may not fit multiple documents: each `(intent, document)` pair is encoded independently and the decoder attends to all encodings (Section 3.2, p. 4). Codex uses three few-shot examples, each containing documentation, intent, and reference code, followed by the test intent and its retrieved documents.

How to apply it. (1) Choose a generator that fits the context budget. (2) For short-context models, encode each retrieved chunk independently and fuse at decoding. (3) For few-shot models, select static examples showing the same documentation-to-code pattern. (4) Keep the baseline identical except for documentation so gains measure retrieval conditioning (Section 5, p. 5).

Verus form. Inference: use FiD-like separate encodings for long Verus modules or diagnostics, and reserve prompt space for the exact goal and current contracts. Include a few accepted proof examples only if their APIs match. Do not let the model copy a proof without rechecking names, ownership, and solver obligations.

## technique 4: benchmark unseen APIs and execution correctness
The tldr benchmark contains 1,879 disjoint Bash commands and 9,187 NL-to-Bash pairs; train, development, and test commands do not overlap (Section 4.1, p. 5). Its documentation pool has 400,000 paragraphs. CoNaLa is resplit into 2,135/201/543 train/development/test examples, with at least one test-time Python function unseen during training and no StackOverflow-post leakage (Section 4.2, p. 6). Metrics include exact match, token F1, BLEU, function recall, unseen-function recall, and execution pass@k.

Results and denominators. On tldr’s test set with BM25 top-10 documents, CodeT5 exact match rises from 2.18% to 9.15%; GPT-Neo-1.3B rises from 3.12% to 9.05%; Codex three-shot rises from 8.94% to 9.29% (Table 1, p. 6). With the oracle command name, Codex exact match rises from 22.44% to 32.43% (Table 1). On CoNaLa, CodeT5 BLEU rises from 34.57 to 36.22, and unseen-function recall rises from 9.03 to 18.30 (Table 3, p. 7). Execution evaluation uses 100 CoNaLa test examples, each averaging 2.03 tests; DocPrompting improves CodeT5 pass@1 by 2.85 percentage points, pass@5 by 4.45 points, and pass@200 by 8.38 points (Figure 3, p. 7). The abstract’s “4.39% in pass@10” is a separate reported result; the figure text reports pass@5 and pass@200, so those denominators must not be conflated.

Failure case. For an unseen `df.to_csv`, retrieval also returns `df.read_csv`; the generator copies `skiprows=1` instead of the correct `header=False` argument (Section 6.3, p. 8). This demonstrates that documentation can improve function selection while still introducing a wrong parameter.

Verus form. Inference: evaluate VL with disjoint APIs and project versions, report verifier acceptance over every generated candidate, and separately report retrieval recall and executable tests. A pass@k proof metric should state the number of goals and completions in its denominator. Add a negative test set where near-neighbor APIs have incompatible contracts.

## what is proved, measured, and trusted
The paper measures generation and retrieval, not formal correctness. The authors report: “Models that use DocPrompting consistently outperform their base models that generate code solely based on the NL intents.” (Section 1, p. 2) Its generators, datasets, oracle-document construction, unit tests, and documentation quality are trusted. Inference: for agent-written verified Rust, documentation retrieval threatens products through stale or neighboring contracts and through plausible but invalid proof code; Verus checking sharply reduces the latter only after the generated code reaches the verifier.

## what VL should reuse
Inference: reuse documentation pools, top-k retrieval, mixed supervised/weak contrastive training, and disjoint unseen-API evaluation. Do not redo generic retrieval-only work. Inference: VL’s product-specific contribution would be retrieval grounded in verifier diagnostics and accepted proof artifacts, plus measurements of proof success, repair effort, and dependency-version drift.

## techniques for the catalog
- retrieve then generate — select top-k API or proof documents for an intent and condition generation on them
- mixed sparse/dense retrieval — compare BM25 with contrastive language encoders and add weak sentence supervision
- fusion-aware prompting — encode long retrieved chunks separately when the generator context is short
- unseen-API evaluation — split by commands/functions and measure retrieval, surface quality, execution, and verifier acceptance separately
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
