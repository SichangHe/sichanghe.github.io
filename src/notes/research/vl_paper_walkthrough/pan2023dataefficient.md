# Data-Efficient Learning of Natural Language to Linear Temporal Logic Translators for Robot Task Specification
(authored by agents unless marked 🧑)
Tag: `pan2023dataefficient`, [paper](https://arxiv.org/abs/2303.08006)

## method and purpose

Pan, Chou, and Berenson translate natural-language robot commands into linear temporal logic (LTL) with little human-labeled data. The abstract says, “we can translate natural language commands at 75% accuracy” (Abstract, PDF p. 1). The pipeline enumerates LTL formulas, converts them to structured English, paraphrases that English with GPT-3, fine-tunes BART, and applies constrained decoding at evaluation time. The paper assumes “a predefined set of possible LTL formulas and atomic propositions” as given (Section I, PDF p. 1). It also shows plans for a 12D quadrotor that satisfy translated formulas (Section V-A.5, PDF p. 5).

Inference: for Verus, this is a syntax-safe contract-generation pattern. It can propose temporal requirements, but Verus requires those requirements to be expressed as state predicates, loop invariants, or transition-system properties and then proved.

## technique 1: formula-to-English synthetic data

What it is: enumerate LTL structures and atomic-proposition (AP) combinations, render each formula into structured English, and use GPT-3 to produce natural paraphrases. The paper says, “Given the set of possible LTL structures and the set of APs relevant for the set of possible tasks, we can obtain all possible LTL formula outputs by simply filling each LTL structure with combinations of APs.” (Section IV-A, PDF p. 3).

Steps:
1. Start from the given LTL structures and AP vocabulary, each AP with a natural-language description (Sections III-C and IV-A).
2. Fill structures with AP combinations to obtain formulas (Section IV-A).
3. Back-translate: produce one structured-English description per formula, using a rule-based LTL-to-English translator when the LTL is sufficiently structured, or templates written by human experts when it is not (Section IV-A.1).
4. Prompt GPT-3 for ten different paraphrases of every structured-English sentence (Section IV-A.2).
5. The paraphrases form the synthetic training corpus (Section IV-A.2); Inference: each paraphrase is paired with the LTL formula (raw or canonical) it came from.

The paper's example prompt is: “Rephrase the source sentence in 10 different ways. Make the outputs as diverse as possible.” (Section IV-A.2, PDF p. 3).

Verus form: Inference: enumerate combinations of predicates and temporal state-machine patterns, render each as a contract template, and ask an LLM for paraphrases. A Verus implementation must replace LTL with explicit `spec fn` state relations and `ensures`/invariant clauses; generated text is not evidence.

Evidence and limits: The authors generate 5900 synthetic drone data points, 594 Cleanup World points, and 55 pick-and-place points (Section V-A.3, V-B.3, V-C.3, PDF pp. 5–6). The drone dataset was rule-translated. For Cleanup World the authors say the dataset “lacks documentation for some APs” and is “highly noisy”, so they manually inspected it and reduced 39 formula annotations to 10 (six AP descriptions plus four LTL-structure descriptions). For pick-and-place the parse tree has depth 5, so building an LTL-to-English translator “would require extensive engineering” and they gave 5 manual canonical-form/natural-language annotations (Section V-C.2). The paper attributes the lower low-resource accuracy on drone to “distribution shift between the two datasets” (Section V-A.4).

## technique 2: canonical LTL representation

Raw strings such as `F B` are unlike natural language. The authors build a parse tree, replace elements of the LTL grammar with English phrases, and transcribe the tree from the root, “with parentheses and commas to encompass and separate an operator’s input arguments” (Section IV-B.2, PDF p. 4). Their concrete example is: “finally ( or ( go to the blue room , go to the red room ) )”. (Section IV-B.2, PDF p. 4).

Steps: build the parse tree; replace grammar elements with English phrases; transcribe from the root with parentheses and commas; train BART on either raw or canonical labels; compare both variants. The paper names two drawbacks: it “increases the transcription length, which can hurt accuracy”, and for simple tasks the inductive bias may not help (Section IV-B.2).

Verus form: Inference: canonicalize a proposed contract into a stable AST-like representation before emitting Verus code. Verus itself does not provide this LTL canonicalizer; the AST-to-contract mapping must be implemented and reviewed.

Evidence: On the low-resource rows (synthetic training, full golden test set), canonical and raw BART reach 68.99% and 69.39% on Drone, 77.90% and 78.00% on Cleanup, and 78.23% and 81.45% on Pick (Table I, PDF p. 6). In the regular data regime the two are also close (for example 97.81 vs 97.84 on Cleanup). The authors report that raw LTL consistently outperformed canonical, “in contrast to established results”, and believe the most likely reason is that the datasets “are not complex enough to benefit from canonicalization” (Section V-C.3). The paper evaluates exact matching, so semantically equivalent reordered formulas count as wrong (Section V-A.3).

## technique 3: constrained decoding

At inference, the decoder considers only next tokens consistent with a given set of possible outputs. The paper defines it: “Given a pre-defined set of possible outputs, the system will constrain the LM by only considering the next-token prediction that is in the output sets.” (Section IV-B.3, PDF p. 4). It reuses the constrained-decoding implementation of [35] and supplies the set of possible LTL formulas in the task obtained in IV-A.

Steps: obtain the set of possible LTL formulas for the task (Section IV-A); at each decoding step keep only next tokens inside that output set (Section IV-B.3). Inference: this means the output is always one of the listed formulas, which guarantees well-formed syntax, not semantic truth; the paper says the technique guarantees “that the output will be well-formed”.

Verus form: Inference: constrain generation to a parser-accepted Verus subset (for example, known operators, identifiers, and contract forms), then invoke Verus. A grammar mask cannot guarantee that a proof exists or that APs denote the intended state.

Evidence: Removing constrained decoding lowers low-resource accuracy: Drone raw 69.39 to 68.23, Cleanup raw 78.00 to 76.26, and Pick raw 81.45 to 81.05 (Table I, PDF p. 6; denominators are the full golden test sets). The effect is larger for canonical Cleanup (77.90 to 72.06) and canonical Pick (78.23 to 69.49).

## technique 4: BART fine-tuning and ablations

The authors fine-tune BART-large (406M parameters, chosen because it “is efficient to finetune on a single GPU”) on synthetic raw or canonical pairs, then decode with constrained decoding. They state, “we select the pre-trained BART-large language model as our translation model, finetune it on the task-specific corpus (using either raw LTL or a canonicalization of LTL for training labels), and at inference time perform LTL grammarconstrained decoding.” (Section IV-B, PDF p. 4; “grammarconstrained” is the paper's text-extraction spelling of a hyphenated word). They use the hyper-parameters from [35] for finetuning (Section IV-B.1).

Regular data regime (Table I, PDF p. 6): training on 4/5 of the golden data and testing on the held-out 1/5 (five-fold cross-validation for Drone, Section V-A.3), BART-FT-Raw scores 90.78, 97.84, and 95.97 on Drone, Cleanup, and Pick, exact-match percentages. Baselines trained the same way: RNN 87.18, 95.51, 93.78; CopyNet 88.97, 95.47, 93.14. Low-resource baselines (synthetic training) are far lower: RNN 22.41, 52.54, 32.39 and CopyNet 36.41, 53.40, 40.36. The "no augmentation" ablation (training on structured English without paraphrasing) gives raw 29.43, 52.51, 80.38 and canonical 39.21, 53.16, 67.88. Inference: for VL, the comparable ablation is to remove synthetic augmentation, canonicalization, or syntax masking one at a time and measure proof compilation and semantic failures separately.

## what is proved, measured, and trusted

Measured: exact translation accuracy on three datasets, with synthetic-only and golden-data regimes, plus ablations; and a quadrotor planning demonstration (Section V-A.5). Nothing is proved formally. The conclusion lists limitations: “Our work has limitations that are interesting directions for future work.” (Section VI, PDF p. 6). These include exploiting language-model uncertainty (the top k best formulas) by grounding them in the environment, assuming “a natural language command maps to one LTL formula”, and assuming all possible LTL structures are known.

Inference: the technique relies on GPT-3 paraphrases, the rule-based or human-written back-translation, AP meanings, BART, and the one-command-one-formula assumption being correct; none is verified by the paper.

Inference: the threat to agent-written verified Rust is medium. Constrained decoding can eliminate malformed contracts, but it cannot prevent a valid contract from omitting a requirement. VL should reuse the paper's grammar and data-synthesis ideas while adding proof obligations and intent checks.

## techniques for the catalog
- synthetic formula-to-English augmentation — enumerate LTL structures, verbalize them, and paraphrase with GPT-3
- canonical formula rendering — serialize an LTL parse tree into operator phrases for pretrained language models
- constrained decoding — keep only next tokens inside the finite set of possible formulas
- low-resource BART fine-tuning — train raw or canonical labels and compare augmentation and decoding ablations
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "Constrained decoding [35] is a common technique used together with LLMs in low-resource semantic parsing to guarantee that the output will be well-formed."): read the whole paper (all 8 PDF pages incl. Table I and references) and checked every quotation, number, section and PDF page reference, and technique step against it; changed the link (the old DOI was reference [19], not this paper; the new link is the arXiv ID printed on the paper, 2303.08006), corrected page numbers (IV-A and prompt on p. 3, IV-B on p. 4, Table I and conclusion on p. 6), fixed the earlier claim about golden training structures (it is 4/5 of the golden data, five-fold cross-validation, not held-out structures), fixed the dataset-limits statement (Cleanup lacked AP documentation, pick-and-place needed manual annotation because the parse tree has depth 5), made the constrained-decoding steps follow the paper, added the full BART quote and extra Table I numbers, and marked own conclusions as Inference; did not check the cited references, the code repository, the figures beyond their captions, or rerun any experiment.
