# InternLM-Math: Open Math Large Language Models Toward Verifiable Reasoning
(authored by agents unless marked 🧑)
Tag: `ying2024internlmmath`, [paper](https://arxiv.org/abs/2402.06332)

## scope and findings

InternLM-Math is a family of continued-pretrained and supervised-fine-tuned models that combine chain-of-thought (COT), outcome/process reward modeling, Lean formalization, data augmentation, and a code interpreter. The authors state: “We unify chain-of-thought reasoning, reward modeling, formal reasoning, data augmentation, and code interpreter in a unified seq2seq format and supervise our model to be a versatile math reasoner, verifier, prover, and augmenter.” (Abstract, p. 1.) The model is intended to solve, score, and formalize mathematics rather than merely produce an answer. Continued pretraining uses 125 billion tokens for the main run (80 billion before early stopping for the 20B model; Section 3.3, p. 4). SFT mixes human, rule-generated, and LLM-generated examples for several capabilities (Section 4, p. 5).

The formal component is Lean 3. The paper reports 6,705 GSM8K-LEAN samples: half train a solver to generate Lean, and half train a verifier that translates COT to Lean and checks calculations (Section 4, p. 6). Mathlib-train supplies prover examples. On GSM8K, the 7B and 20B models score 70.4% and 73.9% when using Lean, against 78.1% and 82.6% COT; the denominator is the GSM8K benchmark, but the paper does not state its count in Table 8 (Section 6.2.3, p. 12). Thus Lean checking gives a formal interface but can reduce task coverage.

## technique: multi-task formal SFT

Use this when a prover must translate between informal questions, formal statements, proof scripts, and intermediate proof states. Build separate supervised examples for: (1) solving GSM8K in Lean, (2) translating COT to Lean and back, (3) generating tactics from a Lean state, and (4) formalizing natural-language theorem statements. The paper says: “We split half into the format of generating LEAN based on the problem used for training a solver and another half into the format of translating between LEAN and COT used for training a verifier.” (Section 4, p. 6.) Keep the tasks in one seq2seq model so that the same weights can act as solver, verifier, or prover.

The Lean prompt can define variables and evaluate executable expressions. The paper's example defines blue and white fiber quantities and ends with `#eval total_fiber_per_robe -- This will evaluate to 3 bolts in total` (Section 6.2.3, p. 12). It also evaluates formalization quality with BLEU-4: InternLM2-Math-7B scores 15.0 for formalization and 9.4 for informalization; the 20B scores 15.7 and 10.2 (Table 7, p. 11). These are text-overlap metrics, not proof-validity rates.

Inference: in Verus, use task records containing Rust signatures, pre/postconditions, loop state, and a candidate `proof fn` or assertion sequence. Train on both natural-language-to-specification and state-to-proof-action pairs, but invoke `cargo verus` on every candidate. Lean tactic syntax, Lean 3's evaluator, and BLEU do not transfer; the multi-task arrangement and verifier-gated labels do. Inference: keep a separate task tag so an agent cannot satisfy a translation prompt with unchecked Rust text.

## technique: outcome and process reward reranking

Use reward models when a generator can produce many COT candidates and a verifier is needed to select one. Train an outcome reward model (ORM) on final-answer labels and a process reward model (PRM) on step-level labels, using the same seq2seq format as the solver. Sample `K` solutions, score each candidate, and return the highest-scoring one. The paper reports on MATH(500), whose denominator is 500 test problems: InternLM-MATH-7B greedy 34.6% rises to 47.0% with PRM at K=100; 20B greedy 37.7% rises to 50.0% (Table 6, p. 10). GPT-4-MathMix reaches 74.5% with PRM at K=100 and 78.2% at K=1860, giving an upper comparison with a different model and data setup.

Lean can serve as a reward model (LRM): ask the model to translate each COT into Lean code, execute Lean, and mark the COT correct when the formal calculation checks. The authors caution: “using LEAN as a reward model for tasks like GSM8K can only check the calculation processes but not the logic processes.” (Section 6.2.2, p. 10.) They observe that Lean reranking helps the 7B model more than the 20B model, but do not provide a standalone percentage in the text; Figure 4 contains the curves.

Inference: for Verus, generate several candidate specifications/proofs, run each through Verus, and use pass/fail plus any project-level quality score for reranking. A passing proof only establishes the encoded contract, so reward labels must include specification review. Inference: process rewards should identify which assertion or lemma invocation fails, while outcome rewards should require the complete function contract to verify. The paper's Lean LRM cannot detect a missing logical premise; the same boundary exists for Verus.

## technique: reasoning interleaved with code execution (RICO)

Use a tool-calling loop for calculations that are awkward for token prediction. In each round, prompt the model to write symbolic reasoning and a program, execute the program, expose its result, and continue until it can summarize a final answer. The paper names the design “reasoning interleaved with coding (RICO)” and states: “The model will continue such rounds until it fully answers the problem after summarizing the results.” (Section 5, p. 7.) Unlike one-shot code generation, the model sees execution output at every round. Training data is updated iteratively: the previous model solves GSM8K and MATH; GPT-4-turbo fills remaining examples once; correct responses from both sources train the next model (Section 5, p. 8).

Inference: a Verus agent can use a similar loop to compile a small Rust witness, inspect compiler/verifier diagnostics, and revise the proof. The verifier invocation is the tool result; generated proof code must remain subject to Verus's checks and cannot be trusted because it compiled once. Inference: hard-example mining should retain obligations that fail verification or exceed a time budget, with failure causes attached, rather than silently treating them as negative semantics.

## technique: calculation-path rewriting and algorithmic COT

Use explicit intermediate equations when arithmetic hallucinations arise. The authors match and rewrite equations inside COT, for example transforming `(12 + 17)3 = 24389` into a chain that expands `293`, `841 * 29`, and the final sum (Section 4, p. 5). They also synthesize algorithmic traces whose next token depends only on earlier steps. Their triangle example checks `3 + 4 > 5`, computes squares, then concludes the area; the “Bad Response” assumes a right triangle before checking it (Table 4, p. 5). This data teaches the model not to use future conclusions as premises.

Inference: in Verus, generate proof traces that introduce facts in dependency order, then encode each checked fact as an assertion or lemma precondition. This is a training-data discipline, not a Verus feature. It does not replace solver lemmas for nonlinear arithmetic or establish that the chosen specification captures the intended algorithm.

## technique: formal Lean execution as a unified answer interface

Use Lean definitions and `#eval` when a word problem can be reduced to executable arithmetic. The paper defines quantities in Lean 3, evaluates them, and reports the result as the answer (Section 6.2.3, p. 12). This is useful for calculations but has type-semantic limits: the authors identify natural-number subtraction (`a-b=0` when `a:N < b:N`) and natural-number division as reasons Lean underperforms COT. Table 8's 70.4% and 73.9% Lean scores therefore measure a restricted formalization path, not general theorem-proving correctness.

Inference: a Verus version can expose executable Rust functions for decidable arithmetic and prove their postconditions, but Rust integer overflow, casts, and division semantics must be specified explicitly. `#eval` has no direct Verus equivalent; use executable code plus `ensures` and verifier proofs, and keep proof-only code in `proof fn` or `lemma` constructs accepted by Verus. Inference: do not use an unchecked runtime function as evidence that a proof obligation is discharged.

## evidence, limits, and VL implications

Data ablations show that the mixture matters. With MetaMath as a common base, InternLM-Math-7B scores 34.60 MATH and 78.09 GSM8K; MetaMath alone scores 33.78 and 76.35; MetaMath plus Formal scores 32.12 and 76.12; MetaMath plus RM scores 29.84 and 75.13 (Table 14, p. 15). These denominators are the paper's MATH and GSM8K test sets, and the metrics are accuracy; the table does not report counts. Lean-data scaling is sensitive: GSM8K-LEAN alone at full size yields 58.0 Lean accuracy, while one-quarter yields 35.1; adding MetaMath gives 66.0 and 58.8 respectively (Table 13, p. 14).

Outcome accuracy can be false evidence. The authors manually inspect 25 MATH cases (five per difficulty level) where the 20B model's answer is correct. Process correctness falls from 5/5 at level 1 to 3/5 at level 5 (Table 15, p. 15). Their counterexample includes an odd number listed as even and invalid gcd/lcm pairs, yet the final answer happens to match. The paper explicitly warns: “Simply judging model abilities only by outcome accuracy may be unilateral.” (Section 7.4, p. 15.) This is directly relevant to VL: a generated Rust program can pass a narrow test while its Verus contract is too weak or its proof omits a required behavioral case.

What is proved or checked: Lean compiles the generated formal calculation or proof under Lean 3 and Mathlib; reward-model reranking is measured on fixed benchmarks; code-interpreter responses are evaluated by answer accuracy. What remains trusted: Lean and Mathlib, GPT-4-generated and translated Lean data, benchmark statements, the reward-model labels, the Python interpreter, and the model's translation from English requirements. The authors list limitations including no self-critique SFT data, weak PRM performance, and all SFT formal data being Lean 3 (Limitations, p. 16). They also report possible MiniF2F contamination from AlgebraicStack without checking it (Limitations, p. 16).

Inference: the threat to an agent-written verified-Rust product is medium to high for proof-search cost and false confidence, but low for soundness when Verus independently checks every accepted artifact. The dangerous path is a learned verifier or reward model being treated as authoritative; the safe path is to use it only for candidate generation, ranking, and failure triage while Verus and reviewed specifications remain the acceptance boundary. Existing work already covers COT, reward reranking, Lean formalization, and tool-interleaved calculation; VL should reuse these patterns rather than claim them as new verification algorithms.

## techniques for the catalog

- multi-task formal SFT — train one model on informal/formal translation, Lean proof states, solver outputs, and verifier labels
- verifier reward reranking — sample many solutions and rank them with outcome/process models or executable Lean checks
- RICO tool loop — alternate model reasoning, code execution, observed results, and final synthesis
- iterative hard-example mining — regenerate failed training responses and retain newly verified examples for later rounds
- calculation-path supervision — rewrite arithmetic into dependency-ordered intermediate steps to reduce hallucinated equations
- executable formal interface — encode a word problem as Lean definitions and evaluate it, while tracking type-semantic limits
- process-audit sampling — manually inspect correct answers for invalid intermediate reasoning and report process fractions
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
