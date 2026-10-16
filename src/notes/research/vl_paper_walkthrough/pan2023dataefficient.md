# Data-Efficient Learning of Natural Language to Linear Temporal Logic Translators for Robot Task Specification
(authored by agents unless marked 🧑)
Tag: `pan2023dataefficient`, [paper](https://doi.org/10.1007/s10514-021-10004-x)

## method and purpose

Pan, Chou, and Berenson translate natural-language robot commands into linear temporal logic (LTL) with little labeled data. The abstract says, “we can translate natural language commands at 75% accuracy” (Abstract, PDF p. 1). The pipeline synthesizes formulas, converts them to structured English, paraphrases that English with GPT-3, fine-tunes BART, and applies grammar-constrained decoding.

Inference: for Verus, this is a syntax-safe contract-generation pattern. It can propose temporal requirements, but Verus requires those requirements to be expressed as state predicates, loop invariants, or transition-system properties and then proved.

## technique 1: formula-to-English synthetic data

What it is: enumerate LTL structures and atomic-proposition (AP) combinations, render each formula into structured English, and use GPT-3 to produce natural paraphrases. The paper says, “Given the set of possible LTL structures and the set of APs relevant for the set of possible tasks, we can obtain all possible LTL formula outputs by simply filling each LTL structure with combinations of APs.” (Section IV-A, PDF p. 4).

Steps:
1. Define the grammar, possible structures, and AP vocabulary (Section IV-A).
2. Fill structures with AP combinations to obtain formulas.
3. Convert formulas to structured English through the rule-based translator (Section IV-A.1).
4. Prompt GPT-3 for ten diverse paraphrases per sentence (Section IV-A.2).
5. Pair each paraphrase with its source LTL and use the pairs for training.

The paper's example prompt is: “Rephrase the source sentence in 10 different ways. Make the outputs as diverse as possible.” (Section IV-A.2, PDF p. 5).

Verus form: Inference: enumerate combinations of predicates and temporal state-machine patterns, render each as a contract template, and ask an LLM for paraphrases. A Verus implementation must replace LTL with explicit `spec fn` state relations and `ensures`/invariant clauses; generated text is not evidence.

Evidence and limits: The authors generate 5,900 synthetic drone points, 594 Cleanup World points, and 55 pick-and-place points (Section V, PDF pp. 6–8). Synthetic data has distribution shift and depends on AP documentation; the pick-and-place experiment required manual descriptions because the formula-to-English translator needed structure-specific annotations.

## technique 2: canonical LTL representation

Raw strings such as `F B` are unlike natural language. The authors build a parse tree, map each operator to an English phrase, and transcribe the tree with parentheses and commas. Their concrete example is: “finally ( or ( go to the blue room , go to the red room ) )”. (Section IV-B.2, PDF p. 5).

Steps: parse the formula; recursively verbalize each operator and AP; preserve argument boundaries; train BART on either raw or canonical labels; compare both variants. Canonicalization reduces distribution shift but lengthens outputs, so the paper evaluates both.

Verus form: Inference: canonicalize a proposed contract into a stable AST-like representation before emitting Verus code. Verus itself does not provide this LTL canonicalizer; the AST-to-contract mapping must be implemented and reviewed.

Evidence: On the low-resource table, canonical and raw BART reach 68.99% and 69.39% on Drone, 77.90% and 78.00% on Cleanup, and 78.23% and 81.45% on Pick (full golden test sets; Table I, PDF p. 7). The paper evaluates exact string matching, so semantically equivalent reordered formulas count as wrong.

## technique 3: grammar-constrained decoding

At inference, the decoder is restricted to tokens that can extend one of the finite valid LTL formulas. The paper defines it precisely: “Given a pre-defined set of possible outputs, the system will constrain the LM by only considering the next-token prediction that is in the output sets.” (Section IV-B.3, PDF p. 6).

Steps: construct the valid output set from task APs and grammar; at each decoder step mask tokens that cannot prefix a valid formula; continue until an accepted formula is complete. This guarantees well-formed syntax, not semantic truth.

Verus form: Inference: constrain generation to a parser-accepted Verus subset (for example, known operators, identifiers, and contract forms), then invoke Verus. A grammar mask cannot guarantee that a proof exists or that APs denote the intended state.

Evidence: Removing constrained decoding lowers low-resource accuracy: Drone raw 69.39→68.23, Cleanup 78.00→76.26, and Pick 81.45→81.05 (Table I, PDF p. 7; denominators are the full golden test sets). The effect is larger for canonical Pick (78.23→69.49).

## technique 4: BART fine-tuning and ablations

The authors fine-tune BART-large (406M parameters) on synthetic raw or canonical pairs, then decode with the grammar. They state, “we select the pre-trained BART-large language model as our translation model, finetune it on the task-specific corpus ... and at inference time perform LTL grammar-constrained decoding.” (Section IV-B, PDF p. 5).

With four-of-five golden training structures, BART-FT-Raw scores 90.78, 97.84, and 95.97 on Drone, Cleanup, and Pick; these are exact-match percentages on the held-out structures (Table I). Inference: for VL, the comparable ablation is to remove synthetic augmentation, canonicalization, or syntax masking one at a time and measure proof compilation and semantic failures separately.

## what is proved, measured, and trusted

Measured: exact translation accuracy on three datasets, with synthetic-only and golden-data regimes, plus ablations. Trusted: GPT-3 paraphrases, rule-based LTL translator, AP meanings, BART, and the assumption that one command maps to one formula. The conclusion explicitly says, “Our work has limitations that are interesting directions for future work.” (Section VI, PDF p. 8), including exploiting uncertainty and grounding candidates in the environment.

Inference: the threat to agent-written verified Rust is medium. Constrained decoding can eliminate malformed contracts, but it cannot prevent a valid contract from omitting a requirement. VL should reuse the paper's grammar and data-synthesis ideas while adding proof obligations and intent checks.

## techniques for the catalog
- synthetic formula-to-English augmentation — enumerate LTL structures, verbalize them, and paraphrase with GPT-3
- canonical formula rendering — serialize an LTL parse tree into operator phrases for pretrained language models
- constrained decoding — mask decoder tokens to keep outputs in the finite grammar-valid formula set
- low-resource BART fine-tuning — train raw or canonical labels and compare augmentation and decoding ablations
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
