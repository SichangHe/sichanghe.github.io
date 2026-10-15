# LemmaHead: RAG Assisted Proof Generation Using Large Language Models
(authored by agents unless marked 🧑)
Tag: `yang2025lemmahead`, [paper](https://doi.org/10.32388/rfa8le)

## scope and measured setup

LemmaHead tests whether retrieved textbook context helps GPT-4 produce machine-checked Lean proofs. The authors define the goal as “enable LLMs to generate formal proofs from mathematical problems while ensuring correctness through validation.” Their control directly prompts GPT-4 for Lean; three experimental pipelines add a retrieval-augmented generation (RAG) knowledge base: basic retrieval, enhanced query generation (EQG), and iterative proof augmentation (IPA). Every generated proof is run in Lean, and the headline metric is single-attempt correctness (Pass@1).

The benchmark is MiniF2F’s 488 informal statements from AIME, AMC, IMO, high-school, and undergraduate mathematics, split equally into validation and test sets. The paper reports the following percentages, each over the corresponding full validation or test set: validation—GPT-4 9.4%, basic RAG 2.3%, RAG+EQG 25.2%, RAG+IPA 40.0%, human-guided GPT-4 11.5%, and GPT-f 23.9%; test—GPT-4 9.0%, basic RAG 2.5%, RAG+EQG 27.6%, RAG+IPA 32.4%, human-guided GPT-4 8.6%, and GPT-f 24.6%. The tables do not print the integer denominators, only the MiniF2F split definition; the percentages therefore cannot be independently checked for rounding from the paper alone.

## technique 1: build a mathematical RAG corpus that preserves proof context

What it is. Populate a vector database with authoritative textbook material on inequalities, number theory, algebra, and functional equations. The distinctive engineering choice is to keep each problem with its solution instead of splitting them. Section 4.2.2 says: “Rather than separating problems from their corresponding solutions—a fragmentation that could dilute the contextual integrity—we preserved these pairs within the same chunk.”

How to apply it.

1. Select textbooks containing definitions, results, examples, and solutions relevant to the target domain (paper §4.2)
2. Render each PDF page as an image so diagrams, equations, and notation survive extraction (§4.2.1)
3. Use GPT-based image recognition to transcribe each page into LaTeX (§4.2.1)
4. Prompt a parser to split the LaTeX into logically distinct, self-contained chunks while preserving problem–solution pairs (§4.2.2)
5. Embed each chunk with GPT-based embedding functions and store vectors in CHROMA (§4.2.3)
6. At inference, retrieve the top semantically similar chunks for the new problem and place them in the model prompt (§4.2.3)

The paper’s extraction method is explicit: “First, we segmented the PDFs into individual page images... Next, we utilized a GPT-based image recognition capability to read each page image and transcribe the content into a LaTeX-formatted text.”

When to use it. Use this when the model lacks access to stable domain lemmas or repeatedly loses the relationship between a problem and its worked proof. Do not assume retrieval helps by default: in the reported experiment, unenhanced RAG is worse than no RAG because irrelevant context can distract the model.

Verus form. Inference: index Verus specifications, verified lemmas, API contracts, and worked proof patterns as chunks, retaining each lemma with its assumptions and proof sketch. A Rust service can retrieve chunks and inject them into an agent prompt; Verus then checks all generated `requires`, `ensures`, loop invariants, and proof blocks. The retrieval database is trusted only as a suggestion source: its text, embeddings, and ranking do not establish a theorem, and `external_body` should not be used to bypass verification.

Evidence and limits. The paper uses GPT-based OCR and embeddings, but it does not report corpus size, retrieval precision, top-k, embedding model details, or ablations for chunk boundaries. Its vector database can therefore be difficult to reproduce exactly. The proposed benefit is measured only on MiniF2F and GPT-4.

## technique 2: enhanced query generation (EQG)

What it is. Ask GPT-4 to turn the problem into a retrieval query containing mathematical concepts, theorems, lemmas, and propositions. Section 4.3.1 states: “we first prompt GPT-4 to generate a list of keywords of mathematical concepts, theorems, lemmas, and propositions needed to solve the problem as described by the informal problem statement.” Those keywords are then used to query LemmaHead rather than querying directly with the raw problem.

Steps from the paper are: (1) supply the informal MiniF2F statement to GPT-4; (2) generate the keyword list; (3) query the CHROMA database with those keywords; (4) combine the original statement and retrieved context; (5) ask GPT-4 for an informal proof, then ask it to convert that proof into Lean; and (6) run Lean verification (§4.3 and §4.3.1). The validation Pass@1 rises from 9.4% for GPT-4 to 25.2% with EQG; test rises from 9.0% to 27.6%. These are the table percentages over the respective MiniF2F split denominators.

Verus form. Inference: have an agent first produce a structured list of candidate Rust/Verus API names and lemma concepts, retrieve matching contracts, and then generate code. Keep retrieval and code generation separate so the verifier can reject nonexistent names. Query terms should include types, preconditions, postconditions, and resource protocols; this is a product adaptation, not a technique evaluated in the paper.

Failure mode. Basic RAG gives 2.3% validation and 2.5% test, below the 9.4% and 9.0% GPT-4 controls. The authors explain: “This may be due to poor querying of LemmaHead resulting in unrelated context being extracted, demonstrating that RAG can actually be detrimental to the performance of LLM proof generators if context retrieval is not handled properly.”

## technique 3: iterative proof augmentation (IPA)

What it is. Re-query after seeing a draft proof, so retrieval reflects the model’s attempted reasoning. The paper says: “Each time after generating an informal proof, we perform EQG by prompting GPT-4 again to generate a list of keywords ... with both the original informal problems statement and the newly generated informal proof as context.” The retrieved context is used to write an improved informal proof, and the cycle repeats for σ iterations.

Steps are: (1) retrieve context and generate an initial informal proof; (2) provide the original problem plus that proof to GPT-4; (3) generate an enhanced keyword query; (4) retrieve new textbook chunks; (5) generate an improved informal proof; (6) after the chosen number of cycles, convert the final informal proof to Lean; and (7) run Lean’s verifier (paper §4.3.2 and Figure 3). The experiment sets σ = 5 “arbitrarily” and reports 40.0% validation and 32.4% test Pass@1. The paper says the rates seem to increase with more iterations but does not provide a per-iteration curve or cost table.

Verus form. Inference: iterate a Verus agent over a fixed budget, feeding verifier diagnostics and the current proof attempt into each new retrieval query. Keep the final candidate subject to ordinary Verus verification; iteration cannot turn an unproved claim into evidence. Measure wall-clock and token cost because the paper explicitly notes that IPA multiplies inference time by the number of iterations.

## what is proved, trusted, and relevant to VL

Lean compilation is the correctness gate for each reported proof, and Pass@1 prevents retry selection from inflating the score. The authors do not prove that retrieved textbook passages are relevant, that OCR preserved every formula, or that GPT-4’s informal proof is mathematically sound before Lean checks the final script. They also tested only GPT-4, one small benchmark, and five IPA iterations. The conclusion acknowledges that “IPA ... multiplies the inference time of the model by the number of iterations.”

Inference: the threat to a Verus-writing product is moderate and operational: retrieval can improve access to contracts but can also inject irrelevant or stale APIs, while iterative repair can consume disproportionate inference time. VL should retain the paper’s verifier-gated Pass@1 discipline and add denominator-explicit reporting, retrieval-ablation tests, and checks that every retrieved Verus lemma compiles in the project revision. What is already done here is the basic RAG, query expansion, and iterative proof-retrieval pattern; VL should not present those as new ideas.

## techniques for the catalog

- context-preserving RAG corpus — OCR authoritative sources, chunk complete problem–solution units, embed them, and retrieve top semantic matches
- enhanced query generation — ask the model for theorem and lemma keywords before vector retrieval
- iterative proof augmentation — regenerate queries and proofs from the current draft for a fixed iteration budget, then verify once
Checked 2026-10-15 against paper yang2025lemmahead: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
