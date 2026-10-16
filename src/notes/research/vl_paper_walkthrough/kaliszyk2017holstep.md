# HolStep: A Machine Learning Dataset for Higher-order Logic Theorem Proving
(authored by agents unless marked 🧑)
Tag: `kaliszyk2017holstep`, [paper](https://arxiv.org/abs/1703.00426)

## dataset and purpose

HolStep turns HOL Light proof traces into supervised data for choosing useful proof steps. The paper's abstract says, “Large computer-understandable proofs consist of millions of intermediate logical steps.” (Abstract, p. 1). It releases 2,013,046 training examples and 196,030 test examples from 11,400 proofs; each split has equal positive and negative examples (Section 1.1 and Table 1, pp. 2–3). The balanced classification denominator is therefore the examples in the relevant split, and random accuracy is 0.5 (Section 3.1, p. 4).

## technique: trace extraction and canonical encoding

Use this when building training data from an LCF prover. Patch common HOL Light proof functions, extract remaining theorems from the OCaml interpreter, record all kernel inferences with arguments, and process the trace offline to recover dependencies, proof boundaries, used/unused labels, and disjoint train/test conjectures (Section 2, p. 3). Keep both a fully parenthesized pretty print and a compact tokenization: eliminate top-level universal quantifiers, encode bound variables with de Bruijn indices, rename free variables canonically, and erase type information because Hindley–Milner inference can reconstruct useful types (Section 2, p. 3).

Inference: for Verus, record each checked assertion or proof-function obligation with its specification dependencies, normalize bound names and module paths, and split by conjecture or function so near-duplicate obligations do not cross train and test. Inference: erasing types is unsuitable for Rust ownership reasoning; retain type and lifetime information when the model ranks Verus proof candidates.

## technique: useful-step classification

Train a classifier to predict whether a candidate statement was used in proving a conjecture. The unconditioned task receives only the candidate statement; the conditioned task receives both candidate and target conjecture (Section 3.1, p. 4). Apply the prediction to prune proof search, rank premises, guide internal inference, or generate intermediate lemmas. The paper lists these applications: “Predicting whether a statement is useful in the proof of a given conjecture” and “Generating intermediate statements useful in the proof of a given conjecture.” (Section 3.1, p. 4).

Steps: (1) label used and unused intermediate statements from the kernel trace; (2) balance the two classes per proof; (3) encode statements as characters or tokens; (4) train a classifier; (5) rank or filter candidates before invoking the prover; (6) require the prover to check every selected step. Inference: for Verus, the candidate is a lemma call, assertion, trigger, or quantified fact, and the final acceptance test is Verus verification rather than the classifier.

## technique: baseline architectures

The paper benchmarks logistic regression on learned embeddings, a two-layer one-dimensional CNN with global max pooling, and a two-layer one-dimensional CNN with LSTM reduction for unconditioned classification (Section 4.1, p. 5). Conditioned models use two weight-sharing siamese branches, one for the step and one for the conjecture, concatenate their embeddings, and classify with a fully connected network (Section 4.2, p. 6). Character input maps 86 characters to 256-dimensional vectors; token input averages 60 tokens per training statement and has 1,993 unique tokens (Section 4.3, p. 6).

Evidence: unconditioned accuracy is 0.71 for logistic regression, 0.82 for CNN with characters, and 0.83 for CNN with tokens; CNN-LSTM is 0.83 with characters and 0.77 with tokens (Table 2, p. 6). Conditioned accuracy is 0.71, 0.81, and 0.83 for character logistic, siamese CNN, and siamese CNN-LSTM, and 0.71, 0.82, and 0.77 for token inputs (Table 3, p. 6). Each percentage is accuracy over the balanced test examples; the paper does not report confidence intervals. Conditioning did not improve these architectures (Section 5.3, p. 7).

Inference: a Verus prototype can begin with token embeddings plus a small CNN to rank candidate proof steps, then compare against a lexical baseline. Inference: the unchanged accuracy after conditioning warns that pattern matching may ignore logical entailment; do not treat ranking accuracy as proof evidence.

## technique: graph-search integration

HolStep's intended use is to blend learned ranking with explicit proof search. The conclusion says, “This shows the need to focus future efforts on different models that can do reasoning, or alternatively, on systems that blend explicit reasoning (e.g. graph search) with deep learning-based feature learning.” (Section 6, p. 7). Use the classifier to prioritize branches, but expand and verify branches with the theorem prover.

Inference: for Verus, represent each state by unresolved verification conditions and each edge by a candidate lemma or assertion; use the model only for ordering and let Verus accept or reject each edge. Inference: search-state hashing and a step budget are needed because the paper's classifier has no completeness guarantee.

## what is proved, trusted, and limited

The paper measures classification accuracy and dataset scale; it does not prove that a learned classifier is sound or complete. HOL Light's LCF kernel checks the recorded primitive inferences, while the extraction and labels are trusted data-processing code (Section 2, p. 3). The models learn token or character correlations: the authors state that they “are not doing any form of logical reasoning on their input statements; rather they are doing simple pattern matching at the level of n-grams of characters or tokens.” (Section 6, p. 7).

Inference: the threat to VL is wasted verification time or ranking bias, not direct unsoundness if every candidate is rechecked by Verus. Inference: the dataset's balanced labels and HOL Light syntax make its reported accuracies poor estimates of deployment precision on an imbalanced Rust proof corpus. Existing work already supplies premise selection, strategy selection, and internal guidance (Section 1.2, p. 2); VL should reuse those patterns rather than rebuild a generic classifier without a verifier-backed evaluation.

## techniques for the catalog

- LCF trace dataset extraction — record kernel inferences, dependencies, proof boundaries, and used/unused steps offline
- canonical proof-statement encoding — normalize binders and names and provide character and token views
- useful-step classification — rank candidate proof statements as useful or unused for a conjecture
- siamese conjecture conditioning — encode candidate and conjecture in shared branches before classification
- verifier-guided graph search — use learned scores for branch ordering while the prover checks every step
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
