# First Experiments with Neural Translation of Informal to Formal Mathematics
(authored by agents unless marked 🧑)
Tag: `wang2018experiments`, [paper](https://arxiv.org/abs/1805.06502)

## scope and contribution

The paper studies neural translation from informalized mathematical LaTeX to formal Mizar statements. It reports: "We report on our experiments to train deep neural networks that automatically translate informalized LATEX-written Mizar texts into the formal Mizar language." (Abstract, PDF p. 1). The target is a formal, verifiable language, but the experiments measure exact string agreement rather than proof-checking. The authors describe the result as "our best performing model configurations are able to generate correct Mizar statements on 65.73% of the inference data, with the union of all models covering 79.17%." (Abstract, PDF p. 1).

## technique 1: create aligned informal/formal training data by controlled informalization

The problem is the lack of naturally aligned informal and formal statements. The paper starts from the formal Mizar corpus and uses its established Mizar-to-LaTeX translation. It says: "Our requirement is that the informalization should be nontrivial, i.e., it should target a reasonably rich subset of LATEX and the transformations should go beyond simple symbol replacements." (Section 3, PDF p. 6). The process is:

1. take the formal Mizar corpus as the source of formal sentences (Section 3, PDF p. 6)
2. translate Mizar objects such as functors, predicates, adjectives, modes, and structures into LaTeX using the Mizar translation patterns (Section 3, PDF p. 6)
3. modify the experimental XSL stylesheets so proof statements, not only abstracts, are emitted (Section 3, PDF p. 6)
4. record each proof-internal formula's starting line and column in the Mizar article and mark the generated LaTeX with that position (Section 3, PDF pp. 6-7)
5. extract each tagged LaTeX formula, align it with the Mizar formula beginning at the same position, and apply preprocessing (Section 3, PDF p. 7)

This yields about one million aligned LaTeX/Mizar sentence pairs (Section 3, PDF p. 7). The examples include a chained subset theorem and a convergence theorem, showing that the transformation includes regrouping, brackets, and natural-language wording (Tables 1 and 2, PDF p. 7).

Inference: A Verus implementation could generate informal prompts from existing verified Rust functions and their specifications, preserving an identifier linking each prompt to its source function. This is synthetic data, so it should be used to bootstrap a model and then supplemented with human-authored specifications; the paper does not test that extension.

## technique 2: tokenization and vocabulary preparation for formal translation

The paper requires both sides to be tokenized and requires separate vocabulary files: "To adapt our data to NMT, the LATEX sentences and their corresponding Mizar sentences must be properly tokenized (Table 1 and 2)." (Section 4.1, PDF p. 7). The procedure is:

1. split concatenated Mizar tokens (for example, `n<m`) using each article's symbol and identifier files from the Mizar accommodator and parser (Section 4.1, PDF p. 7)
2. tokenize LaTeX dollar signs, brackets, parentheses, carets, and underscores as separate tokens (Section 4.1, PDF pp. 7-8)
3. keep backslash-starting tags and font information, while removing cross-referencing tags, itemization styles, and other typesetting information (Section 4.1, PDF p. 8)
4. write distinct token vocabularies for source and target languages (Section 4.1, PDF p. 7; token counts of 7,820 for LaTeX and 16,793 for Mizar in Section 4.2, PDF p. 8)

Inference: In Verus, tokenization should keep punctuation and operators that affect Rust parsing, including `requires`, `ensures`, quantifier syntax, arithmetic operators, and identifiers. Removing comments or formatting is analogous to the paper's removal of typesetting metadata; removing specification tokens would change semantics and is therefore unsafe.

## technique 3: train a seq2seq translator and decode formal statements

The model is Luong et al.'s sequence-to-sequence neural machine translation architecture. An encoder consumes source words and a decoder consumes the corresponding target sentence during training; a loss compares generated and target words (Section 2.1, PDF p. 3). At inference, only the source sentence is supplied and the decoder emits a target sentence word by word using greedy evaluation (Section 2.1, PDF p. 3). The paper states: "When the training is complete, the neural network can be used to generate translations by inferring from (translating of) unseen source sentences." (Section 2.1, PDF p. 3).

The encoder and decoder use recurrent neural-network layers with LSTM or GRU memory cells (Section 2.2, PDF pp. 3–4). Attention layers score source positions so decoding can emphasize the parts relevant to each target word (Section 2.3, PDF pp. 4-5). The experiment progressively fixes choices: compare memory cells and attention, keep the best, then vary optimizer, residual layers, encoding direction, depth, and units (Sections 5 to 5.3, PDF pp. 9-11).

Inference: A Verus pipeline can use an encoder-decoder model to propose a complete Rust function specification or proof block, then invoke Verus as the acceptance oracle. Greedy decoding can be replaced by verifier-guided beam search, but that is not in the paper. A failed Verus check must reject the candidate even when its text resembles a training target.

## technique 4: progressive hyperparameter selection and verifier-relevant evaluation

The corpus has 1,056,478 pairs: 947,231 training, 2,000 development, 2,000 test, and 105,247 inference pairs (Section 4.2, PDF p. 8). The inference set contains 57,145 lines also present in training and 48,102 non-overlapping lines (Section 4.2, PDF p. 8). Evaluation reports perplexity, BLEU, exact identical statements over all 105,247 inference sentences, and exact identical statements over the 48,102 non-overlapping sentences (Section 5, PDF p. 9).

The selected defaults include 12,000 training steps, dropout 0.2, batch size 128, and greedy decoding (Table 3, PDF p. 8). The tested dimensions include LSTM/GRU/layer-normalized LSTM, no attention or Bahdanau/Luong variants, 2–6 layers, residual layers, SGD or Adam, unidirectional or bidirectional encoding, and 128–2048 units (Table 4, PDF p. 9).

LSTM without attention gives 40,121 exact statements (38.12% of 105,247) and 6,458 (13.43% of 48,102); scaled Luong attention gives 60,703 (57.68%) and 18,105 (37.64%), respectively (Tables 5–6, PDF p. 10). The best 1024-unit result gives 69,179 (65.73% of 105,247) and 22,978 (47.77% of 48,102), after 11 hours of CPU training (Section 5.3, PDF p. 11; Table 8, PDF p. 12). A union of all 39 models covers 83,321 (79.17% of 105,247) and 32,083 (66.70% of 48,102) exact statements (Table 9, PDF p. 13). The table's 1024-unit row reports 61.6 BLEU while the prose calls the 65.73% exact-match result the best result; these are different metrics, not interchangeable percentages.

Inference: Verus evaluation should retain the paper's disjoint split and denominator discipline, but add Verus compilation and proof success as primary metrics. Report exact specification match, verifier acceptance, and semantic equivalence separately; the paper itself leaves semantic equivalence for future ATP checking.

## technique 5: ensemble coverage and edit-distance triage

The authors rank models greedily: each next model is selected for the maximum increase in correct translations over the preceding list (Section 5.4, PDF p. 11). They also measure word-level minimum editing distance (Levenshtein distance), counting outputs within 0, 1, 2, or 3 edits of the reference (Section 5.4, PDF p. 13; Table 9, PDF p. 13). The top-10 cover reaches 80,922 exact statements (76.89% of 105,247) and 30,426 (63.25% of 48,102) (Table 9, PDF p. 13).

Inference: For Verus, an ensemble can propose multiple specifications, and edit distance can prioritize near-miss candidates for repair. Textual closeness is only triage: a one-token change can alter a quantifier or bound and must be checked by Verus. A useful adaptation is to rank by verifier errors and proof obligations rather than Levenshtein distance alone.

## technique 6: semantic checking beyond exact strings

The paper warns that exact mismatch can still mean semantic correctness because Mizar permits synonymous formulations. It proposes translating generated Mizar to MPTP/TPTP and calling automated theorem provers to establish equivalence with the aligned formula (Section 5.3, PDF p. 11; Section 7, PDF p. 15). The paper explicitly says: "This is left as future work." (Section 5.3, PDF p. 11).

Inference: The Verus analogue is to compile both the generated and reference functions, compare their stated postconditions, and prove refinement or equivalence with Verus lemmas where possible. This requires a trusted specification of the equivalence relation; passing syntax or type checking alone is insufficient.

## what is proved, measured, and trusted

The paper measures neural translation quality on a synthetic, randomly partitioned corpus. It does not prove that generated statements are mathematically equivalent when strings differ, and it does not report Mizar checker or ATP acceptance rates for the generated outputs. Inference: the Mizar-to-LaTeX translation, alignment tags, tokenizer, NMT implementation, and evaluation scripts are trusted components of the experiment, since the paper reports no independent check of them. Inference: A Verus product must keep the Verus verifier, Rust compiler assumptions, and any external-body code in its trusted base; generated text is untrusted until Verus checks it.

## techniques for the catalog

- synthetic informalization: generate aligned informal/formal pairs from a formal corpus with nontrivial syntax transformations and position tags
- structure-aware tokenization: split formal operators and preserve specification-significant tokens while removing presentation metadata
- seq2seq autoformalization: train an encoder-decoder with recurrent cells and attention, then greedily decode formal statements
- progressive ablation: select memory, attention, optimizer, depth, encoding, residual, and width settings in stages
- checker-oriented evaluation: report exact matches on overlap and non-overlap splits with explicit denominators and separate quality metrics
- greedy ensemble coverage: add models that maximize new correct outputs and measure edit-distance near misses
- semantic post-checking: use theorem proving or verifier-based equivalence checks instead of treating string identity as correctness
