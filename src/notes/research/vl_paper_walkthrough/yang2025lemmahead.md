# LemmaHead: RAG Assisted Proof Generation Using Large Language Models
(authored by agents unless marked 🧑)
Tag: `yang2025lemmahead`, [paper](https://arxiv.org/abs/2501.15797)

## scope and measured setup

LemmaHead tests whether retrieved textbook context helps GPT-4 produce machine-checked Lean proofs. Section 1 states: “Our goal is to enable LLMs to generate formal proofs from mathematical problems while ensuring correctness through validation.” The control directly prompts GPT-4 for Lean proofs; three experimental pipelines add basic retrieval, enhanced query generation (EQG), or iterative proof augmentation (IPA). Section 4 says: “In the control group, we directly prompt GPT-4 to generate formal proofs in the Lean language, before running the generated code in Lean to verify its correctness.”

Section 4.1 describes MiniF2F as 488 informal problem statements from AIME, AMC, IMO, and high-school and undergraduate mathematics, divided equally into validation and test sets. Section 5 states: “We measure the Pass@1 rate of each model, which is the correctness rate of the generated formal Lean proof after only 1 attempt by the model.” Tables 1 and 2 report these percentages, respectively:

- validation: GPT-4 9.4%, basic RAG 2.3%, RAG+EQG 25.2%, RAG+IPA 40.0%, human-guided GPT-4 11.5%, GPT-f 23.9%
- test: GPT-4 9.0%, basic RAG 2.5%, RAG+EQG 27.6%, RAG+IPA 32.4%, human-guided GPT-4 8.6%, GPT-f 24.6%

Section 5 attributes the comparison models to references [6] and [7]. The tables give percentages without integer success counts. Inference: the paper does not provide enough counting detail to reconstruct how every percentage was calculated.

## technique 1: build a mathematical RAG corpus that preserves proof context

What it is. Section 4.2 describes a textbook corpus covering inequalities, number theory, algebra, and functional equations. Section 4.2.2 explains the chunking choice: “Rather than separating problems from their corresponding solutions—a fragmentation that could dilute the contextual integrity—we preserved these pairs within the same chunk.”

How to apply it, following §§4.2–4.2.3:

1. Select textbooks containing relevant problem statements, theoretical results, example solutions, and methodological insights
2. Segment PDFs into individual page images
3. Use GPT-based image recognition to transcribe the pages into LaTeX
4. Use system prompts for a GPT-based parser to split the text at thematic boundaries, retaining problem–solution pairs and coherent theoretical expositions
5. Embed the chunks with GPT-based embedding functions and store their vectors in CHROMA
6. Retrieve semantically relevant segments for a new problem and incorporate them into the prompt

Section 4.2.1 states: “Next, we utilized a GPT-based image recognition capability to read each page image and transcribe the content into a LaTeX-formatted text.” Section 4.2.3 states: “These embeddings, stored in the CHROMA database, serve as the backbone of our retrieval process.”

When to use it. Inference: this could help when relevant lemmas and worked solutions are available but the model does not recall them reliably. The experiment does not isolate the effect of preserving problem–solution pairs. Basic RAG performs worse than the GPT-4 control in both reported splits; the paper offers poor querying as a possible explanation, not an established cause.

Verus form. Inference: index Verus specifications, verified lemmas, API contracts, and worked proof patterns, retaining assumptions with each proof. Retrieve these chunks for an agent, then check the generated code with Verus. Retrieved text and ranking provide suggestions rather than proof of correctness. This adaptation is not evaluated in the paper.

Evidence and limits. Inference from the full paper: reproduction is limited by the absence of corpus size, textbook titles, retrieval precision, top-k, specific embedding models, and chunk-boundary ablations. Evaluation covers GPT-4 on MiniF2F.

## technique 2: enhanced query generation (EQG)

What it is. Section 4.3.1 states: “In the RAG pipeline with EQG, we first prompt GPT-4 to generate a list of keywords of mathematical concepts, theorems, lemmas, and propositions needed to solve the problem as described by the informal problem statement.” It then says: “Using these keywords, we produce an enhanced query to LemmaHead that targets mathematical knowledge relevant to the problem.”

Steps from §§4.3 and 4.3.1:

1. Supply the informal problem statement to GPT-4
2. Generate the keyword list and use it to form the retrieval query
3. Retrieve mathematical context from LemmaHead
4. Combine the original statement with the retrieved context
5. Ask GPT-4 for an informal proof, then ask it to convert that proof into Lean
6. Run the formal proof in Lean to check correctness

Tables 1 and 2 report 25.2% validation and 27.6% test Pass@1 for EQG, compared with 9.4% and 9.0% for GPT-4. Basic RAG obtains 2.3% and 2.5%. Section 5 explains: “This may be due to poor querying of LemmaHead resulting in unrelated context being extracted, demonstrating that RAG can actually be detrimental to the performance of LLM proof generators if context retrieval is not handled properly.”

Verus form. Inference: ask an agent for candidate API names and lemma concepts, retrieve matching contracts, and then generate code. Query terms could include types, preconditions, and postconditions. Verus must check the resulting proof; the paper does not evaluate this adaptation.

## technique 3: iterative proof augmentation (IPA)

What it is. Re-query using a draft proof as additional context. Section 4.3.2 states: “Each time after generating an informal proof, we perform EQG by prompting GPT-4 again to generate a list of keywords of mathematical concepts, theorems, lemmas, and propositions needed to solve the problem, with both the original informal problems statement and the newly generated informal proof as context.” It continues: “These keywords are then used to query LemmaHead to provide higher quality context, which is further used by the LLM to write an improved version of the informal proof.”

Steps from §4.3.2 and Figure 3:

1. Retrieve context and generate an informal proof
2. Give GPT-4 the original problem and the newly generated informal proof
3. Generate an enhanced keyword query and retrieve context
4. Use the retrieved context to improve the informal proof
5. Repeat the informal-proof refinement for σ iterations
6. Convert the informal proof into Lean and verify it

The authors state: “In our experiments, we arbitrarily set σ = 5 and observed significant improvements in the quality and correctness of both informal and formal generated proofs.” Tables 1 and 2 report 40.0% validation and 32.4% test Pass@1 for IPA. Section 6 says the rates seem to increase with more iterations; the paper supplies no per-iteration curve or cost table. Section 6 also states: “To address these limitations, we proposed IPA, but this technique multiplies the inference time of the model by the number of iterations.”

Verus form. Inference: use a fixed iteration budget to retrieve relevant contracts and revise a Verus proof attempt. Adding verifier diagnostics to retrieval queries would extend the paper's method, which uses the original problem and an informal proof. Measure time and token cost, and require final Verus verification.

## what is proved, trusted, and relevant to VL

The reported correctness check runs generated formal proofs in Lean (§§4 and 4.3). Section 5 says: “Thus, no model can try multiple times to generate a proof.” Inference: this restriction concerns the scored formal-proof attempt; IPA still includes repeated informal-proof refinement. Pass@1 therefore does not imply equal inference cost across pipelines.

Inference from the full paper: the experiments do not establish that every retrieved passage is relevant, that OCR preserves every formula, or that each informal proof is sound. They evaluate GPT-4 on MiniF2F and use five IPA iterations. The observed improvement does not by itself establish the same benefit for Verus.

Inference: VL could reuse context-preserving retrieval, keyword query generation, and iterative proof refinement while checking final candidates with Verus. Report final-proof attempts and refinement cost separately. Retrieval ablations and checks that retrieved lemmas exist in the current project would help assess this adaptation. These are proposed checks, not experiments in the paper.

## techniques for the catalog

- context-preserving RAG corpus — transcribe textbook pages into LaTeX, chunk complete problem–solution units, embed them, and retrieve semantic matches
- enhanced query generation — ask the model for mathematical concept and theorem keywords before retrieval
- iterative proof augmentation — regenerate retrieval queries using the problem and informal draft, refine the draft for a fixed iteration budget, then produce and verify a formal proof

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For each problem in the MiniF2F dataset, we obtain its informal problem statement (in LaTex) and use it to generate a query to LemmaHead."): checked all quotations, reported numbers, section and figure references, technique steps, and link against the full paper; replaced shortened quotations, restored uncertainty about basic RAG's failure, clarified Pass@1 versus informal refinement, changed the link to the paper's arXiv identifier, and marked adaptations and conclusions as inferences; did not reproduce experiments or inspect implementation code.
