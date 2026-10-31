# InternLM-Math: Open Math Large Language Models Toward Verifiable Reasoning
(authored by agents unless marked 🧑)
Tag: `ying2024internlmmath`, [paper](https://arxiv.org/abs/2402.06332)

## scope and findings

InternLM-Math is a family of continued-pretrained and supervised-fine-tuned models that combine chain-of-thought (COT), outcome/process reward modeling, Lean formalization, data augmentation, and a code interpreter. The authors state: “We unify chain-of-thought reasoning, reward modeling, formal reasoning, data augmentation, and code interpreter in a unified seq2seq format and supervise our model to be a versatile math reasoner, verifier, prover, and augmenter.” (Abstract, p. 1.) Continued pretraining uses 125 billion tokens for the main run, with the 20B model stopped at 80 billion tokens (Section 3.3, pp. 4–5). SFT mixes human-written, rule-generated, and LLM-generated examples (Section 4, p. 5).

The formal SFT data uses Lean 3; the base-model MiniF2F evaluation uses Lean 4 (Section 4, p. 6; Table 4, p. 9). The paper reports 6,705 distilled Lean samples from the GSM8K training set, split between solver and verifier training. MathLib-train supplies prover examples. On GSM8K, the 7B and 20B models score 70.4% and 73.9% using Lean, against 78.1% and 82.6% COT; Table 8 does not state test-set counts (Section 6.2.3, p. 12). Inference: this Lean execution path lowers answer accuracy relative to COT in these experiments; it does not measure general proof coverage.

## technique: multi-task formal SFT

The formal SFT tasks include: (1) solving GSM8K in Lean, (2) translating between COT and Lean, (3) generating tactics from a Lean state, and (4) translating between informal and formal statements. The paper says: “We split half into the format of generating LEAN based on the problem used for training a solver and another half into the format of translating between LEAN and COT used for training a verifier.” (Section 4, p. 6.) These tasks share one seq2seq model (Figure 2, p. 5).

The generated Lean response can define quantities and evaluate executable expressions. The paper's example defines blue and white fiber quantities and ends with `#eval total_fiber_per_robe -- This will evaluate to 3 bolts in total` (Section 6.2.3, p. 12). It evaluates statement translation with BLEU-4: InternLM2-Math-7B scores 15.0 for formalization and 9.4 for informalization; the 20B scores 15.7 and 10.2 (Table 7, p. 11). Inference: these translation scores do not establish proof validity.

Inference: for Verus, a similar training mixture could pair natural-language requirements with specifications and proof states with candidate assertions or lemma calls. The transferable idea is the multi-task arrangement. Check generated candidates independently with Verus; the paper does not evaluate this transfer.

## technique: outcome and process reward reranking

The model reranks sampled COT candidates using outcome reward modeling (ORM) or process reward modeling (PRM). The authors state: “We use the same SFT model for inference and reward model reranking.” (Section 6.2.2, p. 10.) ORM checks an answer; PRM labels individual steps (Appendix D, p. 23). Table 6 (pp. 10–11) lists greedy scores of 34.6% and 37.7% for the 7B and 20B models and PRM K=100 scores of 47.0% and 50.0% on MATH(500), a 500-problem subset. GPT-4-MathMix reaches 74.5% with PRM at K=100 and 78.2% at K=1860. Inference: these are comparison results across different models and training setups, not a controlled model-size experiment.

Lean can serve as a reward model (LRM): translate COT into Lean code, execute it, and mark the COT correct when the Lean code and COT obtain the same results. The authors caution: “Notice that using LEAN as a reward model for tasks like GSM8K can only check the calculation processes but not the logic processes.” (Section 6.2.2, p. 10.) Table 19 (p. 26) gives GSM8K K=100 scores: 7B LRM 85.8%, versus majority voting 83.5%; 20B LRM 89.0%, versus majority voting 88.2%. Figure 4 (p. 11) plots the curves.

Inference: for Verus, learned rewards could rank candidates, while Verus checks their proof obligations. A checked proof establishes the encoded contract; specification review remains necessary to connect it to the intended behavior. The paper's calculation-only LRM does not establish this connection.

## technique: reasoning interleaved with code execution (RICO)

In each tool-calling round, the model generates symbolic reasoning and a program, observes execution results, and continues toward a final answer. The paper names the design “reasoning interleaved with coding (RICO)” and states: “The model will continue such rounds until it fully answers the problem after summarizing the results.” (Section 5, p. 7.) Training data is updated iteratively: the previous model generates responses on the GSM8K and MATH training sets; GPT-4-turbo generates responses on the remaining examples once; correct responses from both sources train the next model. Converted ToRA-70B responses supply the initial training data (Section 5, p. 8).

Inference: a Verus agent could use a similar loop to submit candidate proofs, inspect verifier diagnostics, and revise them. Iterative training could retain newly successful proofs for previously unsolved obligations. The paper tests code-assisted math answers, not this proof-repair workflow.

## technique: calculation-path rewriting and algorithmic COT

The authors match and rewrite equations inside COT into intermediate calculations. Their example expands (12 + 17)³ through 29³, 841 × 29, and a decomposed sum to 24389 (Section 4, pp. 5–6; superscripts restored from the text extraction). Their synthesis principle is: “The next token prediction must be determined by generated tokens and not dependent on future tokens.” (Section 4, p. 6.) The unnumbered triangle example on p. 6 checks `3 + 4 > 5`, computes squares, identifies a right triangle, then computes area. Its “Bad Response” identifies a right triangle before showing the check. Inference: these traces aim to put evidence before conclusions; they do not demonstrate that the model always follows that order.

Inference: in Verus, generate proof traces that introduce facts in dependency order, then encode each checked fact as an assertion or lemma precondition. This is a training-data discipline, not a Verus feature. It does not replace solver lemmas for nonlinear arithmetic or establish that the chosen specification captures the intended algorithm.

## technique: formal Lean execution as a unified answer interface

The paper defines quantities in Lean 3, evaluates them with `#eval`, and uses the output as the answer (Section 6.2.3, pp. 11–12). The authors attribute its lower accuracy than COT to natural-number subtraction returning zero when the subtrahend is larger, and natural-number division truncating the quotient. Inference: Table 8's Lean scores measure answer accuracy through executable formalization, not general theorem-proving correctness.

Inference: a Verus adaptation could pair executable arithmetic with proved postconditions, taking account of integer bounds, casts, and division semantics. An observed runtime result alone would not establish the postcondition for every allowed input.

## techniques for the catalog

- multi-task formal SFT — train one model on informal/formal translation, Lean proof states, solver outputs, and verifier labels
- verifier reward reranking — sample many solutions and rank them with outcome/process models or executable Lean checks
- RICO tool loop — alternate model reasoning, code execution, observed results, and final synthesis
- iterative hard-example mining — regenerate unsolved training responses and retain correct responses for later rounds
- calculation-path supervision — rewrite arithmetic into dependency-ordered intermediate steps to reduce hallucinated equations
- executable formal interface — encode a word problem as Lean definitions and evaluate it, while tracking type-semantic limits
- process-audit sampling — manually inspect correct answers for invalid intermediate reasoning and report process fractions
