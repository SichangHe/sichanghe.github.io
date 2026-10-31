# TheoremLlama: Transforming General-Purpose LLMs into Lean4 Experts
(authored by agents unless marked 🧑)
Tag: `wang2024theoremllama`, [paper](https://arxiv.org/abs/2407.03203)

source: Wang, Zhang, Jia, Pan, Diao, Pi and Zhang, arXiv:2407.03203v2 (4 Oct 2024), 22 pages with appendices A to K.

## the task, and what the paper claims for it

The model is given three things: a Lean 4 theorem statement, a natural-language (NL) statement of the same theorem, and a natural-language proof. It must write the complete Lean 4 proof in one pass. The paper's own definition: “Our task is to query LLM to generate the complete Lean4 proofs for the mathematical problems in MiniF2F based on their Lean4 statement and NL statement and proof together using no more than 16 in-context examples.” (Section 3.1.1, p.6). Inference: this is proof translation with a human proof in hand, which is easier than proof search and closer to how a Verus agent works when it has a design note or a comment explaining why the code is right.

The framework fine-tunes Llama3-8B-Instruct into such a translator. It has five parts worth separating: making NL text for a formal library (informalization with retrieved examples), weaving that text into the proofs as comments (the paper calls this NL-FL bootstrapping), two training tricks (block training, curriculum sorting), and one inference trick (reuse of verified proofs as examples). Lean checks each generated proof once, at the end. Lean's error messages are never fed back. The limitations section says so: “Secondly, due to the complexity of the Lean4 kernel, this paper does not explore the potential of RL methods for enabling LLMs to write formal proofs through online interaction with Lean, nor does it incorporate feedback from Lean to refine incorrect proofs.” (Limitations, p.9)

Headline (Table 1, p.6): 36.48% of the 244 MiniF2F-Valid problems and 33.61% of the 244 MiniF2F-Test problems, which are 89 and 82 problems. The LLM baselines in the same table get 128 generations per problem (the tree-search rows are pass@1): GPT-4-Turbo 25.41% and 22.95%, Gemini-1.5-pro 29.92% and 27.87%, untuned Llama3-Instruct 25.41% and 20.08%.

## technique 1: informalize a formal library, with examples chosen by a tuned retriever

what it is: start from proofs that already check (Mathlib4, about 100k theorems extracted through LeanDojo) and have an LLM write the natural-language statement and proof for each. The direction is formal to informal, so the formal side stays correct by construction.

when to use: when a body of verified code exists and has no prose, and the goal is a model that turns prose reasoning into proof.

steps (Sections 2.1.1 and 2.1.2, p.3 to 4):
1. extract theorems and proofs from the library
2. fine-tune a retriever: take the ByT5 encoder from LeanDojo's tactic generator and train it on the NL-annotated MiniF2F so that an NL statement and its Lean statement get similar encodings; a sentence encoding is the mean of its token encodings
3. the loss is one minus the cosine similarity of the aligned pair, plus half the sum of the cosine similarities of two mismatched pairs from the same batch. The reason for the second term: “To prevent the model from producing trivial results, we add in-batch negative sampling in the loss function.” (p.4)
4. encode every library statement, and the NL statements of a tiny NL-FL aligned example set (less than 100 theorem proofs, provided by Yang et al. 2024)
5. prompt: “We select a few examples with the highest similarity and use these as in-context examples to query Gemini-1.5 (Reid et al., 2024) to obtain informalized theorem statements and proofs for the theorems in Mathlib4.” (p.4)
6. quality check, light: remove repeated generation, overlong generation and other malformed output, and re-query the failures. The result is 106,852 aligned theorems.

evidence: for the retriever, only a histogram (Figure 2, p.8) with peaks at cosine similarity 1.0 and 0.0, read by the authors as the model being certain, plus a low test loss they mention without reporting it; there is no retrieval accuracy and no run without the retriever. For the text itself, a hand audit in Appendix I (p.13): “Among these, 29 are correct, 4 are partially correct, and 7 contain critical mistakes that render the proof mathematically incorrect.” That is 40 randomly sampled records of 106,852, so 72.5% correct and 17.5% with a critical mistake.

limits: about one in six sampled informal proofs has a critical mistake (7 of 40), on the paper's own sample. The paper's showcase record makes the point by accident: in Table 14 (p.21) the generated informal proof of the fundamental theorem of calculus ends by concluding that f(b) − f(a) = 0. The step-6 check filters format, not meaning. Why Gemini and not GPT-4 for this job is argued from one example (Appendix D, Table 13) and, indirectly, from Gemini's higher Table 1 scores: GPT-4's text reads like an explanation of the Lean code and Gemini's like mathematical wording.

Verus form. Inference: the library is a set of verified Verus crates. For each verified function the LLM writes (a) what the `requires` and `ensures` say in plain words and (b) why the body meets them, naming the role of each `invariant`, `decreases` and lemma call. Retrieval then matches a new function's signature and contract against the few hand-explained examples. The error rate above is the thing to plan for: the prose is produced by a model and nothing checks it, so it is training material and must not be shown to a user as the meaning of the contract.

## technique 2: put the informal proof inside the formal proof as comments, and check by stripping them

what it is: for each theorem, an LLM gets the informal proof and the Lean proof and rewrites the Lean proof with the informal steps placed as comments next to the lines they explain. The training target becomes this commented proof. This is the paper's main claim.

when to use: when a model fine-tuned on bare proofs drifts. The failure it addresses, as the paper puts it: “It is common for the LLMs to lose track of the proof and repeatedly generate the final Lean4 tactic.” (Section 2.1.3, p.4)

steps (Section 2.1.3, p.4):
1. give Gemini the NL and Lean versions of one theorem and ask it to document the NL proof in the Lean code through comments
2. verify the rewrite mechanically: “We ensure the correctness of the bootstrapped data by running a check algorithm that removes all comments in the generated code and makes sure it is the same as the original code.” (p.4)
3. store both forms; Appendix E lists the record fields, among them the original proof, the generated informal statement and proof, and the commented proof

The paper's example of what a trained model then writes (Section 3.7, p.8): for the inequality ab + (a − b) ≤ 1 under a² + b² = 1, the output has a comment line `-- We have that (a - b - 1)^2 ≥ 0.` followed by `have h1 : 0 ≤ (a - b - 1) ^ 2 := sq_nonneg _`, then a comment on expanding, then `linarith [h0, sub_add_cancel a b]`.

evidence (Table 2, p.7; first round only, 128 generations, percent of 244 problems on Valid and Test):
- full framework: 34.84% and 31.15%
- trained without bootstrapping: 26.23% and 26.23%
- trained without any NL in the training data, NL still given at test time: 24.18% and 17.21%

The last row is below untuned Llama3 (25.41% and 20.08%), and the paper draws the strong conclusion from it: “This indicates that merely more exposure to Lean4 proof code does not improve the ability of LLM in formal reasoning.” (Section 3.4, p.7). Placement matters as well. Appendix F tried putting all the NL reasoning as one comment block ahead of the formal proof: “The Head Bootstrapping method achieved a result of 25.46%, while our NL-FL Bootstrapping method reached 31.15%.” (p.13)

limits: each ablation is one training run and one evaluation. The comments inherit technique 1's error rate; the strip check proves the code is untouched and says nothing about whether a comment is true. Inference: 25.46% is not a whole number of problems out of 244 (62 would be 25.41%), so the head-bootstrapping figure was computed on something the paper does not state.

Verus form. Inference: this is the most direct transfer in the paper. Take a verified Verus function and have a model add a `//` comment ahead of each `invariant` line, each `assert`, each lemma call and each `proof { }` block, saying what fact it establishes and why the next step needs it. The check is the same and stronger: strip comments, require the token stream to equal the original, and the original already verified. At generation time the agent is then asked to write comment-then-annotation in the same interleaved order. The Appendix F result argues against the common prompt shape that asks for a full plan first and the proof after it; interleaving beat a plan up front by 5.7 points here. What does not carry over is the source of the prose: Lean proofs came with nothing, while Verus system code often has design comments already, which could replace the model-written informal proof.

## technique 3: block training

what it is: each training record is turned into a few-shot prompt by packing the records that precede it in the dataset into the context window, so the model is trained in the same shape it is used in.

steps (Section 2.2.1, p.4 to 5):
1. treat the tokenized dataset as a ring
2. the plain record i is an instruction (the NL of theorem i) and a target (its commented Lean proof)
3. the block record i has, as instruction, the NL and Lean of records i−k through i−1 followed by the NL of record i, and the same target; k is the number of earlier records that just fill the context length. The paper: “We take full advantage of the context length of LLM by filling it with examples of previous records.” (p.4)

evidence (Table 2, p.7, same setting as above): without block training 27.87% and 23.36%, against 34.84% and 31.15%. The authors' explanation is a mismatch between training and use: at test time the prompt has 10 to 16 examples, and a model trained on single records has never seen that.

Verus form. Inference: no language dependence. Verus functions with contracts are longer than MiniF2F theorems, so k will be small, and the neighbours should be functions from the same module, which is also what the agent will have in context when it works on a crate.

limits: Inference: block training and curriculum sorting may interact, since after sorting the preceding records are those of similar difficulty. The ablations remove one at a time and do not measure the interaction.

## technique 4: curriculum data sorting

what it is: order the training records from easy to hard before fine-tuning.

steps (Section 2.2.2, p.5): “We measure the difficulty of a Lean4 proof by the steps it takes to solve all goals and sort the training data records with easier data at the beginning and harder data at the end.” Then train in that order: Llama3-8B-Instruct, 1,000 warm-up steps, learning rate 1e-5, about 32 hours on a machine with 8 A6000 GPUs (Section 3.2, p.6 to 7).

evidence (Table 2, p.7): without sorting 29.51% and 25.83%, the smallest drop of the four ablations on Valid (5.33 points); on Test the no-bootstrapping row drops less (4.92 points against 5.32). The paper also says sorting stabilizes the training loss curve and shows no curve.

Verus form. Inference: Verus proofs have no tactic steps to count. Stand-ins are the number of proof annotations (`invariant`, `assert`, `decreases`, lemma calls) or the verifier's time on the function. Which stand-in tracks difficulty is untested.

## technique 5: iterative proof writing

what it is: run the prover over the whole target set, then run it again with its own verified proofs from that set as the in-context examples.

when to use: when the examples at hand come from a different source than the problems. The paper's argument is that generated training text and real problem text differ in distribution and same-set examples close the gap.

steps (Section 2.3, p.5; settings in Section 3.2, p.7):
1. round 1: prove as many theorems as possible, with initial examples taken from the list of theorems already proved by LeanDojo's prover, 10 to 16 per prompt depending on length, 128 generations per problem
2. “Then, use the Lean-verified correct proofs written by the current prover as additional examples for proof writing in the next iteration.” (p.5)
3. stop rule: “The iteration stops when the maximum number of steps is reached or no additional theorems can be proved with the given examples.” (p.5)
4. in the experiments: “We stop at the second round of iterative proof writing.” (p.7)

evidence (Table 3, p.8): round 1 gives 34.84% on Valid and 31.15% on Test; round 2 gives 36.48% and 33.61%, cumulative. That is 4 more problems on Valid and 6 more on Test.

limits: Inference: the cumulative figure probably spends 256 generations per problem (128 per round; the paper says only 128 per round and cumulative), and the paper has no arm that spends the same budget with the original examples. So the 4 and 6 problems cannot be attributed to the examples. Table 1 compares this cumulative two-round figure with baselines given 128 generations; its caption says so: “Each LLMs result takes 128 rounds of generation, TheoremLlama are cumulative results for multiple iterations of proofs”. Round 1 alone still beats every baseline in the table.

Verus form. Inference: within one crate, proofs that Verus has already accepted are the best examples for the functions still open, since they share the crate's `spec fn` vocabulary and lemma names. The loop is: attempt all open functions, add the newly verified ones to the example pool, repeat until a round verifies nothing new. To learn whether the examples matter, hold the sample budget fixed across the two arms, which the paper did not.

## a finding to reuse: stale syntax from pre-training

Appendix A (p.12) reports that general models asked for Lean 4 write Lean 3. “From these tables, we can observe that even with clear instructions to use Lean4 for writing proofs, the LLM still uses Lean3 syntax for all imports and proofs.” Tables 6 and 7 show GPT-4 answers with `begin` and `end` blocks and Lean 3 import paths. The paper's remedy is fine-tuning on extensive Lean 4 data (Appendix A); separately, it sets the header by hand (“All the imports are manually set to lighten the workload of LLM.”, Section 3.1.1, p.6).

Verus form. Inference: Verus has the same hazard in two forms, older Verus syntax and syntax borrowed from Dafny, such as the keywords `lemma` and `modifies`, which Verus does not have. The cheap mitigation transfers as is: the harness writes the imports and the `verus!` wrapper, and the model writes only inside.

## what is measured and what stays trusted

Measured: pass rates on MiniF2F in Lean 4, 244 Valid and 244 Test problems, with the NL proofs of Jiang et al. 2022 as input. Checked by Lean: each counted proof. Trusted: Lean and Mathlib; the Lean 4 port of MiniF2F-Test, which the authors made themselves; the human NL proofs; and the claim that MiniF2F-Test proofs are not in any model's training data.

Other results:
- dataset size (Appendix C, Table 4, p.12; MiniF2F-Test): trained on a random 1k subset 29.01%, on 10k 30.74%, on the full set 31.15%. A hundred times more data buys about two points. Inference: the gain comes from learning the output format (commented Lean 4, few-shot shape), which 1k records already teach, and the 106,852-theorem dataset is not what makes the method work.
- another base model (Appendix G, Table 5, p.13): DeepSeek-Math-7B goes from 25.80% and 24.60% to 38.52% and 35.66% with the generated dataset, curriculum sorting and block training, which is above the Llama3 headline; the paper does not say whether this is one round or cumulative.
- tree-search baselines are quoted at pass@1 from their papers (Expert Iteration 28.5% and 25.9%; ReProver 25.00% on Test), on the argument that this matches an inference cost of 1.5 A6000 GPU days.

## numbers that do not agree

- the abstract gives the GPT-4 baseline as 22.95% and 25.41% on Valid and Test; the introduction and Table 1 give 25.41% on Valid and 22.95% on Test.
- Section 3.5 calls the round-2 gain a 2% increment; Table 3 gives 1.64 points on Valid and 2.46 on Test.
- at least five reported percentages are not whole problem counts out of 244: 29.01% (Table 4; 71 problems would be 29.10%), 25.46% (Appendix F), 25.83% (Table 2; 63 problems is 25.82%), and in Table 1 Llemma's 21.03% and DeepSeek-Math's 25.80% (63 problems is 25.82%).
- Section 2.1.2 names the formal-to-informal step “formalization”; the rest of the paper calls it informalization.
- Section 3.2 argues the comparison with GPT-4-Turbo and Gemini is fair because both were released after Mathlib4 and so may have it in their training data. That speaks to their exposure to Mathlib; it does not address the unequal generation budget noted under technique 5.
- Appendix H sets a proof made without bootstrapping beside one made with it, and the two are proofs of different theorems, so the pair shows no contrast.

## techniques for the catalog

- informalize a verified library — have an LLM write natural-language statements and proofs for existing checked proofs, so the formal side of each training pair is correct by construction
- contrastive NL-to-formal retriever — fine-tune an encoder so matching informal and formal statements have high cosine similarity, with in-batch negatives, and use it to pick in-context examples
- comment-interleaved proofs (NL-FL bootstrapping) — train on proofs in which each informal reasoning step is a comment placed at the formal lines it explains; interleaving beat a single explanation block up front
- strip-comments equality check — accept an LLM-annotated proof only if deleting its comments gives back the original verified text
- block training — fill each training example's context with the preceding records as few-shot examples so training matches the few-shot shape used at inference
- curriculum data sorting — order training records from short proofs to long ones before fine-tuning
- iterative proof writing — rerun the prover on a problem set using its own verified proofs from that set as the in-context examples, until a round proves nothing new
- harness-fixed header — write imports and file preamble by hand outside the model's output to keep stale-version syntax out
