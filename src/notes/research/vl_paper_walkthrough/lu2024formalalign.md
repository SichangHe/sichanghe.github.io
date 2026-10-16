# FormalAlign: Automated Alignment Evaluation for Autoformalization
(authored by agents unless marked 🧑)
Tag: `lu2024formalalign`, [paper](https://doi.org/10)

## purpose and result

Lu, Wan, Huang, Xiong, Liu, and Guo propose FormalAlign, an evaluator for whether an informal mathematical statement and a formal Lean statement mean the same thing. The problem is that a formal compiler checks syntax and logical provability, not semantic correspondence. Their motivating example omits the variable “ligs”: Lean accepts `80 * c = 63`, although the intended conclusion is `63 * a = 80 * c` (Fig. 1, p. 2). The paper says, “Current methods can only verify the surface-form integrity of the autoformalized sequence via BLEU or by passing it to a formal language compiler.” (Sec. 1, p. 2)

FormalAlign jointly trains autoformalization and pair-alignment representations. On four datasets, the fine-tuned Mistral-7B model reaches alignment-selection scores of 99.21% (FormL4-Basic), 85.85% (FormL4-Random), 66.39% (MiniF2F-Valid), and 64.61% (MiniF2F-Test), with the dataset-specific precision and recall shown in Table 3 (Sec. 4.3, pp. 6–8). These are selection/evaluation results, not proofs that any generated Lean theorem states the intended requirement.

## technique: joint generation and contrastive alignment training

What it is: train one autoregressive model with cross-entropy for formal-sequence generation and an in-batch contrastive loss for matching informal and formal hidden states. For paired input `NL_i` and formal output `FL_i`, the paper defines `L = L_CE + L_CL` (Eq. 2, p. 4). `L_CL` increases cosine similarity for the paired embedding and decreases it for other formal outputs in the batch (Eq. 1, p. 4). The authors write, “This dual loss framework mutually enhances autoformalization and alignment.” (Sec. 3, p. 3)

How to apply it:
1. Build aligned informal/formal pairs from FormL4 and MMA training sets. (Sec. 4.1, p. 5)
2. For each batch, compute token-level cross-entropy over the formal output conditioned on the informal input. (Sec. 3.2, p. 4)
3. Take the final hidden state of each informal input and its paired formal output, and use other batch outputs as negatives in the contrastive denominator. (Sec. 3.2, p. 4)
4. Minimize the sum of the two losses; the paper fine-tunes full parameters for one epoch. (Sec. 3.2, p. 4; Appendix C.1, p. 18)
5. At inference, score a candidate formalization and threshold or rank it. (Sec. 3.3, p. 5)

Verus form: Inference: this is a training/evaluation method, not a Verus proof construct. A VL model could train on pairs of natural-language requirements and Verus contracts, using token loss plus a contrastive loss on requirement/contract embeddings. The final acceptance still needs `verus` to check the contract and a human or independently audited alignment oracle to check meaning. Embedding similarity cannot replace `requires`/`ensures` semantics.

Evidence and limits: Appendix F reports autoformalization accuracy on FormL4-Basic/Random of 40.92%/35.88% for a cross-entropy-only baseline and 43.14%/36.02% for the combined model (Table 10, p. 20). The gains are small, so the paper's stronger claim concerns alignment evaluation, not generation quality. Training uses 8 NVIDIA A100 40GB GPUs, but Appendix C.1 contains an internal inconsistency: prose says batch size 512 and learning rate `2e−6`, while Table 7 lists global batch 128 and learning rate `5e−6` (p. 18). Both settings cannot describe one run; replication must resolve this.

## technique: combine certainty and semantic similarity at inference

What it is: compute certainty `V_cer` as the exponential mean token probability, similarity `V_sim` as cosine similarity of the final informal/formal hidden states, and `V_align = (V_cer + V_sim)/2` (Eqs. 3–5, p. 5). The paper says, “This combined score reflects both the accuracy of the translation from informal to formal expressions and the alignment of the internal representations of the sequences.” (Sec. 3.3, p. 5) The certainty component measures whether the model can generate the formal sequence; the similarity component measures representation-level correspondence.

How to apply it:
1. Run the candidate formal statement through the model conditioned on the informal statement. (Sec. 3.3, p. 5)
2. Compute the mean log probability of its `n` formal tokens and exponentiate it for `V_cer`. (Eq. 3, p. 5)
3. Compute cosine similarity between the final hidden state of the informal input and the conditioned formal output for `V_sim`. (Eq. 4, p. 5)
4. Average the two values to obtain `V_align`; select the highest-scoring candidate or compare it to threshold `θ`. (Eq. 5; Sec. 4.2, pp. 5–6)

Verus form: Inference: use this score to prioritize candidate contracts for Verus checking. Treat the score as a heuristic ranking signal; only successful verification plus semantic review supports acceptance. A contract can be highly probable and still omit a safety condition.

Evidence: the authors set `θ = 0.7` to balance precision and recall (Sec. 4.3, p. 7). Ablations show the complete score beats certainty-only and similarity-only on all four datasets: on MiniF2F-Test, 66.70% versus 55.55% and 21.81% (Table 6, p. 10). The paper reports FormalAlign's MiniF2F-Test precision 66.70% and recall 63.37% (Table 3, p. 7); these are percentages over the paper's test examples, whose item count is not stated in the table.

## technique: generate controlled misalignment negatives

What it is: augment each positive pair with 21 negative formal statements produced by six transformations: constant modification, exponent modification, introducing a variable, changing a variable type, switching equality/inequality, and random pairing (Table 2, p. 7). These negatives test semantic alignment while many remain syntactically valid.

How to apply it:
1. Start with an aligned natural/formal pair. (Sec. 4.1, pp. 5–6)
2. Apply one mutation, such as changing `b = 30` to `b = 31`, replacing an exponent, adding an unused variable, changing `ℝ` to `ℚ`, replacing `=` with `≠`, or pairing with another theorem. (Table 2, p. 7)
3. Keep the informal input unchanged and label the pair misaligned. (Sec. 4.1, p. 6)
4. Evaluate selection, detection, precision, and recall on balanced positive/negative pools. (Secs. 4.2–4.3, pp. 6–8)

Verus form: Inference: mutate candidate Rust/Verus contracts in the same six ways—alter a bound, exponent, variable/type, equality, condition, or pair—and check whether the evaluator rejects them. Then run Verus to separate syntactic/proof failures from semantically wrong but provable weakened contracts. Include realistic aliasing, overflow, panic, and concurrency omissions, which are outside the paper's math-only mutations.

Evidence and limits: the paper's four test sets are FormL4-Basic, FormL4-Random, MiniF2F-Valid, and MiniF2F-Test; MiniF2F contains 488 manually formalized competition statements (Sec. 4.1, p. 5). The 21 negatives per positive are a fixed augmentation, not naturally occurring errors; performance may overestimate real-world robustness. The case study reports all five shown misaligned statements pass the Lean compiler, while FormalAlign scores each below 0.7 (Table 12, p. 22), illustrating why compilation alone is insufficient.

## technique: evaluate alignment with selection and detection metrics

What it is: Alignment Selection (AS) chooses the aligned formal output from a candidate pool using the largest `V_align`; alignment detection labels a pair aligned when `V_align > θ`; precision and recall measure binary detection (Sec. 4.2, pp. 6–7).

How to apply it:
1. For each informal input, make a pool containing one aligned and its negative candidates. (Sec. 4.3, p. 7)
2. Score every candidate and record whether the highest score is the aligned one. (Sec. 4.2, p. 6)
3. Threshold each score, count true/false positives and negatives, and report precision and recall with their denominators. (Sec. 4.2, p. 6)
4. Compare against GPT baselines and human reviewers on a held-out sample. (Sec. 4.3–4.4, pp. 7–8; Appendix G, pp. 21–22)

Evidence: Table 3 reports GPT-4 versus FormalAlign AS on FormL4-Basic as 88.91% versus 99.21%, and on MiniF2F-Valid as 64.34% versus 66.39% (p. 7). Appendix G samples 80 MiniF2F-Test items, balanced between aligned and misaligned labels, and reports GPT-4o 47.50%, FormalAlign 65.00%, and human-expert average 79.58% correct (Table 11, p. 22). Four experts' individual ratios are 83.75%, 77.50%, 77.50%, and the table's average 79.58%; Fleiss' K is 0.49. The 80-item denominator makes these ratios auditable.

Verus form: Inference: report AS for candidate contract selection and precision/recall for semantic rejection, but report Verus proof success separately. A model may select the best candidate among bad contracts; AS does not imply that any selected contract is correct.

## what is proved, trusted, and threat to VL

FormalAlign proves no theorem about semantic equivalence. Its evidence is model training, controlled mutations, benchmark scores, and a small expert comparison. The Lean compiler remains trusted for formal validity; dataset labels, mutation correctness, model implementation, threshold, pretrained data, and human alignment judgments remain trusted. Appendix G itself shows humans average 79.58% rather than 100%, so “ground truth” depends on how labels were constructed.

Inference: the threat to agent-written verified Rust is a provable but incomplete contract accepted because an alignment model confuses syntactic plausibility with intended behavior. VL should reuse controlled negative mutations, two-part scoring, explicit held-out denominators, and expert-audited calibration. It should not use FormalAlign score as a proof or replace Verus checking with an LLM judge. The paper's own Appendix G result (65.00% on 80 items) sets a concrete ceiling for trusting the evaluator without review.

## techniques for the catalog

- dual-loss alignment training: combine formal-sequence cross-entropy with in-batch contrastive representation loss
- certainty/similarity score: average token confidence and hidden-state cosine similarity for candidate ranking
- controlled misalignment generation: mutate constants, exponents, variables, types, equality, and pairings
- alignment selection: choose the highest-scoring formal candidate from a pool
- threshold detection: classify pairs with a calibrated `V_align` threshold and report precision/recall
- expert calibration: compare automated labels with a fixed, balanced human sample and publish denominators
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
