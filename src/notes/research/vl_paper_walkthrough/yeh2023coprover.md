# CoProver: A Recommender System for Proof Construction
(authored by agents unless marked 🧑)
Tag: `yeh2023coprover`, [paper](https://arxiv.org/abs/2304.10486)
## scope and relation to earlier notes

CoProver is a human-facing recommender for the Prototype Verification System (PVS). It learns from polished proof traces and recommends either the next proof command or a relevant lemma. Unlike systems intended to automate every proof, it is designed to keep a human in the loop. Earlier notes on learned proof search cover autonomous tactic generation; this study focuses on CoProver's sequent featurization, transformer command ranking, Siamese lemma retrieval, top-N interaction, deployment boundary, and exact PVS measurements.

The paper's abstract says: “CoProver employs a neurally learnt sequence-based encoding of sequents, capturing long distance relationships between terms and hidden cues therein.” It evaluates recommendation, not end-to-end proof completion. Its conclusion reports: “the top 3 − 5 commands” capture “50% − 70% of the original prediction correctly on the validation set.”

## technique 1: normalize PVS proof states into transformer token streams

What it is. CoProver turns a structured sequent, selected proof history, and a lemma into compact token sequences for RoBERTa. Function and operator symbols remain; variable and constant names are replaced by placeholders or types so the model does not memorize project-specific names.

When to use it. Inference: use this representation when formulas are too long for a raw structured encoding and symbol renaming should preserve the useful proof pattern.

How the paper does it.

1. Keep function and operator symbols as written: "all symbol names for functions and operators are copied over as-is" (Section 3.2, p. 5).
2. Replace constant and variable names with a generic placeholder for command prediction; for lemma retrieval, replace them with type names so argument types can match (Section 3.2, p. 5).
3. Retain integer values and omit syntactic constructs such as parentheses; the paper says the ordering of the remaining tokens "can roughly capture the syntactic arrangement of the original form" (Section 3.2, p. 5).
4. Add `<ANT>`, `<CONS>`, and `<HID>` to mark antecedent, consequent, and hidden formulas (Section 3.2, p. 5).
5. Prefix command-prediction sequences with `cmd1`; append the previous three commands when history is enabled (Section 3.2, p. 5).
6. Train a domain-specific Byte Pair Encoding vocabulary, then train RoBERTa for 1,100,000 steps over the dataset with its default self-supervised tasks; masked language modeling is the example the paper describes (Section 3.2, p. 6).

The paper notes: “As Transformer models have fixed width input, a more parsimonious encoding that strips away boilerplate while retaining the original semantics will allow longer formulas to work without truncating them.” (Section 3.2, p. 4)

Verus form. Inference: serialize a Verus goal with `requires`, `ensures`, loop `invariant`s, visible hypotheses, and recent proof actions. Keep Rust/Verus keywords and predicate names; normalize local variable names only where identity is irrelevant. Include types and ownership-relevant markers for lemma retrieval. Run any suggested action through Verus, because token equivalence does not establish type, borrow, or trigger correctness.

Evidence and limits. The authors use 20,000 proof steps for command prediction and 20,221 lemma pairs for retrieval, drawn from PVSLib. They explicitly assume the current state is enough for prediction, then add three previous commands as a limited non-Markovian signal. In the lemma-retrieval setup, higher-order and custom PVS types are represented by placeholders, and matching on them is reserved for future work (Section 3.2, p. 5).

## technique 2: transformer next-command recommendation

What it is. A RoBERTa encoding of the featurized state is the input to a model, trained with the T5 sequence-to-sequence framework, that outputs the next command an expert used (Section 4, p. 6). Section 2 (p. 3) instead calls this a "multinomial classifier"; the paper does not reconcile the two descriptions. The system emits a top-N window, so a user can inspect several recommendations.

When to use it. Inference: use command recommendation to help a human navigate a large command vocabulary or to let an agent try several likely actions in a background branch.

How the paper does it.

1. Featurize the sequent and optional command history (Section 3.2, p. 5).
2. Encode the token stream repeatedly with RoBERTa self-attention (Section 4, pp. 6–7).
3. Use T5/Huggingface training to map the encoding to the command in the expert trace (Section 4, p. 6).
4. Emit the top-N highest-confidence commands instead of only the first prediction (Section 4, p. 7).
5. Present commands to the user or run them speculatively and show the resulting proof states; this look-ahead use is proposed in the conclusion (Section 9, pp. 14–15).

Verus form. Inference: train a classifier on Verus proof traces with the current diagnostic and recent proof actions as input. Recommend `assert`, `reveal`, `broadcast proof`, a helper lemma call, or an invariant edit. For an agent, run each top-N candidate in an isolated branch and retain only branches that Verus accepts; for a human, show diagnostics and preserve the original file until selection.

Evidence and limits. Command prediction uses a random 90/10 split of 20,000 proof-step pairs and ten training epochs on four RTX 3090 GPUs (Section 6.1, p. 8). With sequent plus command history, CoProver's test accuracy is 0.48 ± 7.3×10−3, versus 0.30 ± 1.1×10−2 for Linear SVC and 0.28 ± 1.0×10−2 for k-NN (Table 1, p. 9). The text calls k-NN "the next-best baseline", although Table 1 lists Linear SVC (0.30) and SVM RBF history-only (0.30) at or above it. Footnote 2 (p. 8) says larger samples showed no performance difference. The paper says the correct command is in the top-7 response over 70% of the time (Section 6.1, p. 10, Figure 5), and the conclusion says top 3–5 windows capture 50%–70%. Accuracy is recommendation accuracy, not a verified proof rate.

## technique 3: supervised Siamese lemma retrieval

What it is. CoProver treats the current sequent as a query and a library lemma as a document. Two RoBERTa encoders (Figure 4, p. 7; the paper does not say whether weights are shared, which a Siamese design usually implies) produce token representations, average pooling creates one vector per input, and cosine similarity ranks candidate lemmas. Positive pairs are user-selected imports; randomly sampled pairs are negative examples.

When to use it. Inference: use this when a library contains thousands of lemmas and users may not know a useful theory or lemma name.

How the paper does it.

1. Collect explicit lemma-import events from completed PVSLib proofs and record the sequent plus imported lemma (Section 6.2, pp. 10–11).
2. Encode the sequent and lemma token streams with the RoBERTa-based Siamese architecture (Section 5, pp. 7–8).
3. Average token vectors into one sequent vector and one lemma vector (Section 5, p. 8).
4. Label observed pairs 1 and sample an equal number of random pairs labeled 0 (Section 6.2, p. 11).
5. Score every candidate lemma with cosine similarity and rank the library (Section 5, p. 8; Section 6.2, p. 11).
6. Evaluate the ground-truth lemma's rank with mean reciprocal rank (MRR) (Section 6.2, p. 11).

Verus form. Inference: index Verus `spec fn`s, lemmas, and proof `ensures` by tokenized contracts and definitions. Encode the current unsatisfied obligation and each candidate helper lemma, retrieve a ranked list, then invoke only candidates whose `requires` can be established. Cosine ranking is a suggestion; Verus must check the call and its postcondition. Store library versions and module paths so retrieval cannot silently select a changed lemma.

Evidence and limits. The retrieval test has 12,132 training pairs and 8,089 test pairs from 20,221 explicit lemma pairs, against 9,468 lemmas in 747 theories (Section 6.2, p. 11). MRR is 0.51 for CoProver, 0.043 for TF-IDF, 0.0030 for count, and 0.0015 for the baseline (unnumbered table, p. 11); the paper does not describe how the Count and Baseline methods are built. The authors say MRR 0.51 corresponds to average mean rank 1.98, approximately position 2. The paper states that only the user-selected lemmas are treated as relevant, which "disregards the possibility that another lemma may be just as useful" (Section 9, p. 15).

## technique 4: use history and structural information rather than bag-of-words

What it is. CoProver combines the current sequent with the previous three commands. Baselines use TF-IDF symbol counts, with an additional n-gram experiment testing whether local sequence structure helps.

When to use it. Inference: use short command history when the same proof state can invite different actions depending on what was just tried. Inference: use n-grams as a cheap baseline, but preserve longer-range transformer context when formulas have nonlocal relationships.

How the paper evaluates it. CoProver is tested with command history plus sequent, sequent only, and history only. Table 1 shows 0.48 ± 0.0073, 0.28 ± 0.0098, and 0.21 ± 0.0093 respectively (p. 9); the paper says the ± values are variances estimated by bootstrap resampling. For the baselines, the paper says that "With the exception of the SVM using the polynomial kernel (SVM Poly), every method benefits from increasing structural information" (Table 2, p. 9). Table 2 values are not monotone for Linear SVC (0.30, 0.37, 0.30 for n=1,2,3), and the paper does not say whether command history is included in Table 2. The best Table 2 value is 0.37, below CoProver's 0.48 in Table 1, though the setups may differ. The paper's conclusion cautions that the models "may more likely be learning complex structural cues" rather than deep reasoning (Section 9, p. 14).

Verus form. Inference: include the last few failed and successful proof actions, plus a normalized diagnostic, in the VL state. A history window can prevent repeating a failed `assert` or can suggest a follow-up `reveal`. Keep this as a ranker feature and never as a proof assumption.

## technique 5: deploy recommendations behind a proof-assistant service

What it is. The command prediction and lemma retrieval models are wrapped as Flask web services. PVS sends the current sequent as a JSON message; hypotheses are returned as JSON objects that PVS presents directly (Section 7, p. 12).

When to use it. Inference: use a service boundary when the recommender is optional and must not alter the trusted prover or proof artifact.

How the paper does it. Convert the current sequent to JSON, call the command or lemma endpoint, return hypotheses as JSON, and display them in PVS (Section 7, p. 12). The authors report internal developers found top-five command suggestions generally useful, while a larger user study was still being prepared. The paper says the code and data "will be available at https://github.com/coproof"; availability was not checked.

Verus form. Inference: expose a local service that receives a serialized Verus obligation and returns ranked suggestions. The client should apply a suggestion only as source text in a branch and run Verus locally. Keep network/model outputs outside the trusted computing base, and attach source hashes and tool versions to each recommendation.

## what is proved, measured, and trusted

The paper measures recommendation quality, not theorem validity. Command data: 20,000 sampled proof steps, 90/10 train/test, Table 1 accuracies, bootstrap variance estimates, and a two-sample t-test at α=0.001. Lemma data: 12,132 train and 8,089 test pairs from 20,221 explicit imports, 9,468 candidate lemmas in 747 theories, and MRR values above. The 184,335 total PVSLib proof steps are the source corpus, while the 20,000 and 20,221 subsets are different denominators.

Trusted or assumed are PVS, PVSLib and Prelude traces, the featurization rules, RoBERTa/T5/SBERT implementations, labels that user-selected imports are relevant, and cosine ranking. The authors explicitly warn that neural mechanisms may learn structural cues rather than deep reasoning; a cursory examination of attention heads found the weightings "did not consistently align with experienced users' intuitions" (Section 9, p. 14). No result proves that a top-ranked command will advance a proof.

Threat to a product of agent-written verified Rust. Inference: medium productivity benefit and low direct soundness risk if the service remains advisory. The featurization, top-N look-ahead, supervised lemma retrieval, and service boundary map well to VL. Rust/Verus contracts need richer type and ownership features, and a retrieved lemma can fail its `requires`. Soundness risk rises if an agent treats recommendation confidence as proof or lets a remote service alter specifications without local re-verification.

## techniques for the catalog

- normalized proof-state tokens — preserve logical symbols, normalize names and types, mark sequent regions, and encode recent commands
- transformer command recommender — fine-tune RoBERTa/T5 on proof traces and return a top-N next-command window
- Siamese lemma retrieval — encode sequents and library lemmas separately, train positive/negative pairs, and rank by cosine similarity
- short-history conditioning — append recent proof actions so recommendations reflect what has already been tried
- structural baseline comparison — test n-grams and TF-IDF to measure the value of sequence structure over symbol counts
- advisory prover service — return JSON suggestions through a web endpoint while leaving proof checking in the local assistant
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "We find that the combination of sequent and command history information gives consistently higher accuracy than using either alone, while all methods outperform the baseline."): I read the full paper text (pp. 1-15 and the reference list) and compared every quotation, number, table value, section and page reference, and technique step in the study; the tag and the arXiv link (arXiv:2304.10486) agree with the paper's first page. Changed: page references for steps 1-3 of technique 1 (p. 5, not p. 4), the description of the T5 versus classifier wording, the Table 2 claim (not monotone for Linear SVC; the paper says k-NN is next-best although Table 1 shows Linear SVC higher), the Siamese weight-sharing remark, the baseline-definition gap, the bootstrap-variance reading of the ± values, and labelled the author's "when to use" advice as Inference. Not checked: the cited prior work, the GitHub repository, the claims about earlier notes in this collection, and the Verus-form suggestions (Inference by the study author).
