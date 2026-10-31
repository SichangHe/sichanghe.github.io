# Advancing Natural Language Formalization to First Order Logic with Fine-tuned LLMs
(authored by agents unless marked 🧑)
Tag: `vossel2025advancingformalization`, [paper](https://arxiv.org/abs/2509.22338v2)

## problem and result

Vossel, Mossakowski, and Gehrke evaluate fine-tuned language models for translating natural language (NL) into first-order logic (FOL). The unified MALLS+Willow corpus has 49,950 NL–FOL pairs: 35,964 training, 3,996 validation, and 9,990 test examples, with 62,981 unique predicates and mean formula depth 6.75 (Table 2, p. 5). The paper’s abstract states: “While structural logic translation proves robust, predicate extraction emerges as the main bottleneck.” (abstract, p. 1)

Their strongest setting gives the model an explicit list of predicates that must occur in the answer. Flan-T5-XXL then reaches 63.45% exact match and 70.27% logical equivalence on the test set (Section 4.2, p. 11); the abstract rounds the latter finding to “70% accuracy with predicate lists” (p. 1). Without a predicate list, the same model’s standard fine-tuning gives 35.79% exact and 38.83% equivalence (Table 5, p. 10). Inference: these comparisons support the authors’ claim that predicate identification is a major source of errors; they do not isolate all causes of failure.

## technique: train a seq2seq translator with an explicit formal target

Inference: use this when the source is prose and the target is a fixed logical grammar. The authors compare encoder–decoder T5-base (220M), T5-3B, Flan-T5-XXL (11B), and decoder-only LLaMA3.1-8B, Mistral-24B, and Olmo-32B (Table 1, p. 4). Decoder-only models use LoRA with rank 16, scale 32, dropout 0.05, targeting attention and feed-forward projection layers. Flan-T5-XXL also uses LoRA on attention and feed-forward layers; T5-base and T5-3B use full fine-tuning. All models use AdamW, at most 12 epochs, early stopping patience 4, warmup ratio 0.05, and weight decay 0.01 (Section 3.3, pp. 4–5).

Steps from the paper:

1. Merge MALLS and Willow records into JSON with `NL` and `FOL` fields; an example is `Not every student is hardworking.` paired with `¬∀x (Student(x) → Hardworking(x))` (Section 3.2, p. 4).
2. For decoder-only models, format each record as system, user, and assistant messages in a ChatML-style structure and instruct output to contain only FOL beginning with `Φ =`; for T5, prepend “translate English natural language statements into first-order logic (FOL):” followed by a space (Section 3.4, p. 6).
3. Replace logical symbols with textual forms for T5’s SentencePiece tokenizer in the baseline (Section 3.4, p. 6).
4. Fine-tune with the stated LoRA/full-training setup and save the model. Decode with sampling and at most 250 new tokens for decoder-only models. For T5, use five-beam search, maximum output length 256 tokens, length penalty 2.0, and no early stopping during generation (Section 3.4, p. 6).

Inference: for Verus, use the model to propose a Rust/Verus contract skeleton. Parse the proposal, resolve names and types, and run Verus on the unchanged implementation. Express predicates as `spec fn`s and conditions in `requires`/`ensures`; use proof functions and `assert` to discharge logical consequences. The paper does not evaluate this adaptation.

Evidence: standard fine-tuning gives Flan-T5-XXL 35.79% exact and 38.83% equivalence, while T5-3B gives 32.96% and 36.21% (Table 5, p. 10). These percentages use the 9,990-example test split (Table 2, p. 5). The authors compare against models evaluated without fine-tuning and note that ccg2lambda parsed only 8,225 NL sentences; its equivalence accuracy is 0.27% before predicate matching and 0.43% after (Table 4, p. 11). Inference: interpreting benchmark accuracy as translation quality depends on the FOL labels being correct; the conclusion identifies errors in MALLS (p. 13).

## technique: extend the vocabulary for logical symbols

The vocabulary-extension experiment adds dedicated tokens for `∀`, `∃`, `¬`, `∧`, `∨`, `→`, `↔`, and `⊕` to the tokenizer and embedding matrix, then trains and evaluates as in the baseline (Section 3.4, p. 6). This tests whether atomic symbolic encoding improves formalization accuracy.

The experiment found no consistent gain: improvements for Olmo-32B and T5-base were below one percentage point, while other models declined slightly (Section 4.2, p. 11).

Inference: for Verus, check generated text with its parser and compiler. Parser validation is distinct from extending an LLM tokenizer; this experiment provides no evidence that changing Verus tokenization would help.

## technique: supply predicate lists and distractors

For every pair, provide an alphabetically sorted list of the predicates that must occur in the FOL result. The authors explain the sorting: “The list is sorted to ensure that the order of predicates does not reveal information about the logical structure of the FOL expression.” (Section 3.4, p. 7). In the noise condition, augment the sorted list with randomly sampled predicates drawn from five other formulas, requiring selection of relevant predicates (Section 3.4, p. 7).

The paper reports Flan-T5-XXL with a gold list at 63.45% exact and 70.27% equivalence, with predicate normalization changing exact to only 63.54% (Section 4.2, p. 11). With noisy lists, it reaches 62.39% exact and 69.06% equivalence (Table 7, p. 12). These scores use the same 9,990-example test split. The authors interpret the small drop as evidence that access to correct predicates supplies the main gain (Section 4.2, pp. 11–12).

Inference: for Verus, provide an agent an allowlist of visible Rust names, fields, traits, and existing specification predicates. Check generated references against that list, then run Verus. Name resolution cannot establish that a predicate expresses the intended requirement; the contract still needs review.

## technique: learn predicates in a curriculum

The authors test a two-step pipeline and a three-step curriculum. In the two-step pipeline, train a model to predict the relevant predicate list from NL, then feed its predicted list into the fixed-list formalizer trained in Experiment 3. In the three-step curriculum, train successively with gold lists, noisy lists, and finally no predicate hints (Section 3.4, p. 7).

The two-step Flan-T5-XXL reaches only 25.96% exact and 28.26% equivalence before predicate normalization, or 35.11% and 38.95% after it. The three-step curriculum reaches 33.83% exact and 36.69% equivalence (Section 4.2, p. 12). The authors suggest that the three-step curriculum may overfit supplied predicates; they do not establish this mechanism experimentally.

Inference: for Verus, split contract generation into name resolution and clause synthesis. First emit a candidate list of existing Rust/Verus symbols; resolve it against the module and reject missing or inaccessible names. Then generate clauses and verify them. Measure name-selection accuracy separately from proof success; the paper’s staged methods did not improve its baseline.

## technique: multilingual predicate abstraction

Translate all NL training statements into German and French while keeping FOL predicates in English; train on English, German, and French pairs and leave validation and test in English (Section 3.4, p. 8). The stated aim is to encourage predicate understanding across languages. There is an unresolved model discrepancy: the methods say “Specifically, we use the Mistral model” (p. 8), while the results say “T5-3B achieves 30.33% on the exact match and 32.90% on the equivalence match” (Section 4.2, p. 12). The paper does not explain this difference.

Inference: for Verus, test equivalent requirements in multiple natural languages against the same intended contract. The paper does not establish that multilingual training improves contract generation.

## technique: evaluate syntax, semantics, and predicate identity separately

The paper uses whitespace-insensitive exact match, logical equivalence, and predicate matching. For equivalence, parse both formulas with a Lark grammar, convert syntax trees to Z3, and ask whether the negated bi-implication `¬(φ ↔ ψ)` is unsatisfiable within a 10-second timeout (Section 3.5, pp. 8–9). For predicate matching, map predicted names to gold names using normalized Levenshtein distance threshold 0.6, then recompute both metrics (Section 3.5, p. 9).

Inference: for Verus, report parser validity, contract-name resolution, and proof success separately. Proof success establishes obligations for the submitted contract; comparison with intended requirements is still needed. A solver timeout provides no equivalence proof.

On the FOLIO argument-validity check, the fine-tuned LLaMA3.1-8B obtains 39.70% valid conclusions versus 37.44% for LLaMA-2 13B with incremental fine-tuning and a predicate verifier, despite no FOLIO training for the authors’ model (Section 3.4, p. 8; Section 4.3, pp. 12–13). The paper uses the FOLIO evaluation subset but does not state its raw count. This check compares translated argument validity with known validity, rather than measuring exact formalization.

## techniques for the catalog

- fine-tuned NL-to-FOL translation — train sequence-to-sequence models on paired prose and formal strings
- logical-token vocabulary extension — represent quantifiers and connectives as atomic output tokens
- predicate-list conditioning — provide sorted relevant predicates, optionally with distractors
- staged predicate curriculum — predict names first or train gold-to-noisy-to-free-form stages
- multilingual predicate abstraction — vary source language while keeping formal predicates fixed
- semantic equivalence evaluation — parse formulas and prove negated bi-implication unsatisfiable with Z3
