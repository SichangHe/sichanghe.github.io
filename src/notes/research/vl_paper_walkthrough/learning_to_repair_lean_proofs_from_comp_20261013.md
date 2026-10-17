# Learning to Repair Lean Proofs from Compiler Feedback
(authored by agents unless marked 🧑)
Tag: `wang2026learning`, [paper](https://arxiv.org/abs/2602.02990)

source: Wang, Chess, Lee, Ge, Mallavarapu, Alper, Ilin (University of Washington), arXiv:2602.02990v2, 13 Mar 2026; 18 pages with appendices A–E. Appendix E stops in the middle of a sentence on p.18 (“By instructing the model to produce accurate code,”), so the expanded description of line and multi-line mutation is missing from the PDF itself.

The paper is about Lean 4, not Verus. Each Verus form below is an inference.

## what is measured, and what stays trusted

The paper builds APRIL, a dataset of broken Lean proofs paired with the compiler's output and a fixed proof, fine-tunes three small models on it, and measures one thing: given one broken proof and its diagnostics, does the model's single answer compile. The task as stated: “We study Lean proof repair as a supervised learning problem: given an erroneous proof and compiler feedback, predict both a corrected proof and a natural-language diagnosis grounded in the same feedback.” (Abstract, p.1)

The success criterion is one sentence: “A repair is considered successful if the model’s output compiles under Lean 4.22.0-rc4.” (§5, p.8)

Trusted or unchecked:

- the Lean compiler in one fixed version
- Inference: the criterion as written does not say that the theorem statement in the output must equal the one in the input, nor that an output using `sorry` is rejected. The paper is silent on both. A reader reusing the metric must add the two checks.
- the explanations are written by DeepSeek-V3-0324 with the answer in view and the paper reports no check of them (§3.1, pp.4–5)
- no result is on errors made by people or by a prover during real work; all errors are synthetic

## technique 1: build repair data backward by mutating verified proofs

what it is: start from a proof that checks, break it in a controlled way, keep the break only if the compiler rejects it, and record what the compiler said. The correct proof is the repair target for free.

when to use: when correct proofs are plentiful and logs of failed attempts are not. The paper's reason: “Because large-scale corpora of human-generated Lean errors are scarce while correct proofs are widely available, we construct APRIL backward: beginning with a correct proof and systematically introducing errors into it.” (§3.1, p.4)

how it is done (§3.1, pp.4–5; Figure 1, p.2):

1. collect correct proofs from Herald, Lean Workbook and NuminaMath-Lean; keep only those that compile under Lean 4.22.0-rc4. 56,090 raw became 39,492 (Table 1, p.6).
2. apply one of four mutation operators (techniques 2–5).
3. compile each mutant through Lean-Interact and the Lean REPL; “keep only mutated proofs that trigger compiler errors”, because “some changes still lead to correct proofs”. Remove duplicates.
4. store the compiler's error message, the error line and the local goal state.
5. have a separate LLM write an explanation and a fix suggestion (technique 6).
6. split by original theorem (technique 7).

Each record has five fields: “(i) an erroneous Lean proof that fails to compile, (ii) a corresponding fixed proof that is syntactically similar but compiles successfully, (iii) the compiler error messages and proof state, (iv) a natural-language explanation of the errors, and (v) a natural-language fix suggestion describing how to transform the erroneous proof into the corrected one.” (§3.1, p.4)

Verus form (inference):

- step 3 becomes: run `verus` on the mutant and keep it only if it reports an error; also discard mutants that fail in `rustc` type checking if the aim is proof repair and not syntax repair
- step 4: Verus has no tactic goal state. What can be stored is the error kind (precondition not satisfied, postcondition not satisfied, loop `invariant` not preserved, assertion failed, resource limit exceeded) and the source spans the verifier prints. The paper's input field “State” has no direct counterpart
- what does not change: the correct proof as target, the compile-and-keep filter, the split by original function

evidence: 260,125 erroneous proofs from 39,492 theorems (§4.1, p.6), about 6.6 per theorem (computed here). By source (Figure 3, p.7): Herald 126,367, Numina Human 69,385, Lean Workbook 43,751, Numina Auto 20,622; these sum to 260,125.

where it fails or what it assumes: realism of the errors is asserted, not measured. The paper's wording is “plausible failures produced by controlled mutations” (§1, p.3). No experiment tests a model trained on APRIL on errors from a real proving session.

## technique 2: theorem (lemma) substitution

what it is: replace one cited library theorem with a semantically close one whose hypotheses or conclusion differ slightly.

when to use: to produce errors where a lemma almost applies. “Theorem mutation is designed to imitate errors that arise from subtle semantic mismatches, where a theorem is almost applicable but differs in its required premises or conclusion.” (§3.1, p.4)

how it is done (§3.1, p.4; Appendix E, pp.17–18):

1. extract the theorems used in each compiling proof; each (proof, theorem) pair is one mutation candidate
2. for the selected occurrence, retrieve up to 5 nearest neighbours from the LeanExplore semantic search engine
3. filter out the original theorem and “declarations that differ only in the namespace”
4. sample one remaining candidate at random and replace exactly one occurrence of the identifier, “leaving the rest of the proof unchanged”
5. compile; keep on failure
6. store contrastive metadata: “the names and formal statements of both the intended (correct) theorem and the substituted (incorrect) theorem” (§3.1, p.5)

paper's example (Figure 2a, p.5): in a Lean Workbook proof about `sin 80 = 2 * sin 40 * cos 40`, `Real.cos_pi_div_two_sub` in an `rw` is replaced by the search result `Real.cos_pi_div_two`.

Verus form (inference): in a Verus proof the cited theorems are calls to a `proof fn` (from `vstd` or the project) inside a proof block. Replace one such call by a call to a similarly named lemma with the same argument types. The verifier then fails either at the call (the substituted lemma's `requires` does not hold) or later (its `ensures` does not give the needed fact). The second case is the one the paper values: the error “may surface later in the proof, far from the mutation site”. Retrieval needs a search index over lemma signatures, which the paper gets from LeanExplore and Verus does not have ready-made.

evidence: this operator produced 154,870 of 260,125 errors, 59.5% (Table 4, p.13). After fine-tuning, repair accuracy on the 1,093 test errors of this kind: Goedel-8B 12.7% to 36.8%, Kimina-8B 7.9% to 34.1%, Qwen3-4B 0.5% to 26.8% (Table 2, p.8).

where it fails: the mutation is a one-identifier swap, and the theorem-mutation fix suggestion is forced to start with a replacement instruction (Appendix C.2, p.15). Inference: a model can learn to undo a single wrong identifier, which is narrower than choosing a lemma from nothing.

## technique 3: tactic swap inside an equivalence class

what it is: replace a tactic by another of the same role that is likely to fail here.

how it is done (§3.1, p.4; Appendix E, p.18):

1. fix classes by role: arithmetic solvers (`linarith`, `nlinarith`, `norm_num`, `ring`), rewriting (`rw`, `simp`, `simp_rw`), structural (`intro`, `intros`, `rintro`), proof construction (`apply`, `refine`, `exact`, `assumption`)
2. in each compiling proof find every swappable occurrence and pick one to three at random
3. swap each within its class only: “Substitutions are only performed within the same class to ensure syntactic validity and plausibility.”
4. record the original line, the substituted line and the line number
5. keep unique mutants that fail to compile

Verus form (inference): Verus proofs have few tactic-like choices, so the class table is short. The nearest counterparts are the solver hints on an assertion: swapping `by(nonlinear_arith)` and `by(bit_vector)`, or dropping the hint. Most of this operator does not carry over, because a Verus proof is mostly assertions and lemma calls, not tactic steps.

evidence: 62,150 errors (Table 4, p.13). This is the easiest class for every model but untuned Qwen3-4B (1.8% on tactic, 2.5% on line). On the 398 test errors, fine-tuned models reach 38.9% to 41.7% from untuned bases of 1.8% to 19.6% (Table 2, p.8).

where it fails: with up to three swaps, the compiler may report only the first. The explanation prompt has to say so: “The compiler error may only reflect the first encountered failure.” (Appendix C.3, p.15)

## technique 4: line redaction refilled by an LLM

what it is: hide one proof line, ask an LLM to write it, and keep the result when the LLM gets it wrong. The error is then one an LLM really makes.

how it is done (§3.1, p.4; prompt in Appendix C.1, p.14):

1. pick at random one line after the main `by` and replace it with `REDACTED`, keeping indentation
2. send it to DeepSeek-V3-0324 with the instruction to supply the correct line: “Please complete the proof by providing the correct contents of the redacted line.” The answer is constrained: “Your answer should be exactly one line long and should contain no semicolons.”
3. reinsert the completion and compile; “only mutated proofs that fail to compile are retained and duplicates are removed”

Verus form (inference): redact one line of a proof block or one loop `invariant` clause of a verified function, ask a model to fill it, keep it if `verus` then fails. This carries over unchanged and needs no Verus-specific tooling.

evidence: 18,319 errors, the smallest class (Table 4, p.13). Fine-tuning helps less here than on theorem and tactic errors. On the 200 test errors: Goedel-8B goes from 20.0% to 18.5% (a loss), Kimina-8B from 14.5% to 18.5%, Qwen3-4B from 2.5% to 16.0%; the untuned Goedel-32B has 28.5% (Table 2, p.8).

## technique 5: multi-line redaction of the proof's tail

what it is: as technique 4, but everything after a chosen line is removed and the model writes as many lines as it wants.

how it is done (§3.1, p.4): “To ensure the erroneous proof resembles the correct proof, no more than half of the proof is redacted.” Only the tail is redacted. The reason is in Appendix D (p.17): redacting a block in the middle “was unsuccessful because the models would fail to take the Lean code that followed their section into account”, which gave errors of the kind where no goals remain, and indentation problems.

Verus form (inference): remove the last proof steps of a `proof fn` body, or all assertions after a chosen point in an exec function, and let a model complete them. Middle redaction should be less harmful in Verus than in Lean, because Verus assertions are not threaded through a goal stack; this is untested.

evidence: 24,786 errors (Table 4, p.13). On the 144 test errors: fine-tuned Goedel-8B 20.8% (from 19.4%), fine-tuned Kimina-8B 14.6% (from 13.9%), fine-tuned Qwen3-4B 13.2% (from 0.0%); untuned Goedel-32B 32.6% (Table 2, p.8).

## technique 6: explanation and fix labels written with the answer in view

what it is: for each kept error, an LLM writes one to three sentences on why it fails and one sentence on the fix, as JSON with exactly two fields.

how it is done (§3.1, p.5; Appendix C, pp.14–16):

1. prompt the LLM “with the original proof, the mutated proof, the Lean compiler error message, and any available mutation metadata”
2. for theorem mutations, give a cheatsheet of the intended and substituted theorem and require the fix to start with a replacement instruction
3. for tactic mutations, require the explanation to reason about the goal “without directly mentioning the replacement tactic”, and the fix to name the full incorrect and intended tactic and the line
4. for line mutations, tell the labeller to write as if it saw only the failing side: “Assume you ONLY see the incorrect proof text, the infoview state near the failure, and Lean's error message.” (Appendix C.1, p.14)

The training example then asks for explanation, fix and corrected proof in that order (Figure 4, p.13). The input is described so: “The input consists of a system message and a user message concatenating the prover error, local proof state, and failing proof.” (§3.2, p.5) Figure 4 also lists a field for the line at which the error occurred.

Verus form (inference): the same labelling works for Verus mutants. The cheatsheet for a lemma swap is the two lemmas' `requires` and `ensures` clauses.

evidence, in two directions:

- explanations lower the model's own repair rate. Trained with explanations versus without, on the 1,835-error test set: Goedel-8B 34.6% versus 36.7%; Kimina-8B 31.9% versus 36.9% (Table 3, p.9). For Qwen3-4B the text gives 27.4% versus 31.2% (§5.3, p.9).
- explanations help another model: “DeepSeek succeeds with a rate of 4% when aided by base Qwen’s explanations and 29% when aided by the trained model’s explanations, performing better than either model individually.” (§5.3, p.9) No sample size is given for these two rates, and no rate for DeepSeek without any explanation.

where it fails: the labels are unverified LLM text. Inference: step 4 conflicts with step 1 for line mutations: the Appendix C.1 instruction says to explain “using only the incorrect proof, infoview state, and error”, while §3.1 says the prompt contains the original proof. The paper does not say which holds for line mutations.

## technique 7: leakage-safe split and anonymized names

how it is done (§4.2, p.7):

1. split by original theorem: “All mutated variants derived from the same original theorem are assigned to the same split.”
2. rename every theorem to one identifier, `lean_problem`
3. stratify by source dataset and proof length, and keep mutation-type proportions equal across splits

Result (Tables 4 and 5, p.13): train 38,292 theorems and 249,027 errors; validation 1,000 and 9,263; test 200 and 1,835.

Verus form (inference): split by original function, and rename the function under proof. A Verus benchmark needs one more precaution the paper does not need: helper lemmas shared between a training and a test function leak the proof idea, so the split should be by module where lemmas are shared.

where it fails: Inference: the test set comes from only 200 theorems, so the 1,835 test errors are not independent. Numina Auto is 7.5% of test theorems but 15.0% of the whole (Table 6, p.13), so the stratification by source looks loose.

## technique 8: LoRA fine-tuning on diagnostic-conditioned repair

how it is done (§3.2, pp.5–6; Table 7, p.14):

1. base models: Qwen3-4B-Instruct-2507, Kimina-Prover-Distill-8B, Goedel-Prover-V2-8B, one pipeline for all
2. LoRA rank 32, scaling 64, dropout 0.1, on attention and MLP projections
3. AdamW, learning rate 1e-4, cosine decay, warmup ratio 0.1, effective batch size 8, sequence length 2048, at most 15,000 steps
4. evaluate every 250 steps; stop after 5 evaluations without improvement; the kept checkpoint is the one whose validation loss is lowest

evidence: Table 2 (p.8), single-shot repair accuracy on the 1,835-error test set, trained jointly on repair and explanation. Columns: full, tactic (398), line (200), theorem (1,093), multi-line (144).

- Goedel-Prover-V2-8B, untuned: 15.5%, 19.6%, 20.0%, 12.7%, 19.4%
- Goedel-Prover-V2-32B, untuned: 26.8%, 34.2%, 28.5%, 23.0%, 32.6%
- Kimina-Prover-8B, untuned: 11.1%, 17.3%, 14.5%, 7.9%, 13.9%
- Qwen3-4B-Instruct-2507, untuned: 1.1%, 1.8%, 2.5%, 0.5%, 0.0%
- fine-tuned Goedel-8B: 34.6%, 41.7%, 18.5%, 36.8%, 20.8%
- fine-tuned Kimina-8B: 31.9%, 38.9%, 18.5%, 34.1%, 14.6%
- fine-tuned Qwen3-4B: 27.4%, 39.7%, 16.0%, 26.8%, 13.2%

The per-type columns reproduce the full column when weighted by the test counts (checked here for fine-tuned Goedel-8B, fine-tuned Qwen3-4B and Goedel-32B).

Inference from the table: the headline gain is carried by the two template-like operators. Theorem and tactic mutations are 1,491 of the 1,835 test errors. On the two LLM-generated classes, which are the nearest to errors a prover makes, every fine-tuned model is below the untuned Goedel-32B, and fine-tuned Goedel-8B is below its own untuned line score.

where it fails or what it assumes: the paper limits its own comparison: “Because Goedel is typically deployed with search/iteration, this comparison should be interpreted as an ablation of compiler-feedback-conditioned repair rather than end-to-end proving performance.” (§1, p.3) And: “All results are single-shot repairs from a failing attempt, not theorem-level success under multi-sample search or exploration.” (§5.1, p.8)

## technique 9: what did not work for generating errors

Appendix D (pp.16–17) lists seven discarded generators. They matter for anyone building the same data for Verus.

- asking an LLM for an interesting error: “this strategy exhibited very low diversity: even when increasing sampling temperature, the model tended to produce the same small set of superficial modifications”
- translating one line to natural language and back: errors unrealistic without the theorem's context
- translating the whole proof to natural language and back: output “too dissimilar from the original proof to be considered useful for error correction”
- round trip through Rocq or Lean 3: Rocq gave proofs too dissimilar; with Lean 3 “the proof would often compile even after the translation”
- prompting for a named pitfall: “The model frequently ignored the specified pitfall, instead modifying unrelated parts of the proof, altering the theorem statement itself, or introducing multiple cascading errors rather than a single localized failure.”
- random multi-line redaction in the middle (see technique 5)
- taking a small prover's failed proofs and a bigger prover's fixes: “Goedel-Prover typically rewrote the proof from scratch, substantially altering the proof structure and reasoning.”

## numbers that do not add up

- §5.2 (p.8) says tactic mutations have “top performance reaching 42.5%”. Table 2 on the same page has 41.7% as the highest tactic value, and Table 3 (p.9) has 46.5% to 49.7%. No table contains 42.5%.
- §5.2 says line mutations are the hardest, “with maximum accuracy of 13.5%”. In Table 2 the highest line value is 28.5% (Goedel-32B), the highest fine-tuned one 18.5%, and 13.5% is the untuned Kimina-1.7B. For two of three fine-tuned models multi-line is lower than line (Kimina 14.6% versus 18.5%, Qwen 13.2% versus 16.0%), so line is not the hardest class in the table.
- Table 2's caption says “Parenthesized values denote models finetuned separately on a single error type and evaluated on that same type.” The table has no parenthesized values. Table 3's per-type rows (for example Goedel-8B tactic 46.5% with explanations, against 41.7% in Table 2) look like those missing values, since its caption says the error types match the training regime; this reading is an inference.
- §5.3 says of Qwen that joint training costs “an only slight reduction in error correction accuracy” (3.8 points of 31.2); for Kimina-8B the cost is 5.0 points of 36.9 (Table 3).
- The running head says “VerifAI - ICLR 2025”; the arXiv stamp is March 2026 and the references include work accessed in January 2026.
- All dataset totals hold: Table 4 rows and columns, Table 1 sums, Figure 3 against Table 4, and 154,870/260,125 = 59.5%. The 25× for Qwen is 27.4/1.1 = 24.9.

## techniques for the catalog

- backward repair-data construction — mutate a verified proof, keep the mutant only if the checker rejects it, and use the original as the repair target
- lemma substitution by semantic search — swap one cited lemma for a near neighbour so the proof fails on a subtle premise or conclusion mismatch
- same-class tactic swap — replace a solver or rewriting tactic by another of the same role, one to three per proof
- LLM-refilled line redaction — hide one proof line, let a model fill it, and keep the cases where its completion fails to check
- tail-only multi-line redaction — redact at most the last half of a proof, never a middle block, so the refill has no following code to contradict
- answer-informed diagnosis labels — generate explanation and fix text from the correct and broken proof plus metadata, phrased as if only the broken side were visible
- diagnose-then-repair target format — train the output as explanation, fix suggestion, then corrected proof, given error, state, error line and failing proof
- split by original theorem with anonymized names — keep all mutants of one proof in one split and rename the theorem to a fixed identifier
- explanation handoff — pass a fine-tuned small model's diagnosis to a stronger general model as extra repair context
