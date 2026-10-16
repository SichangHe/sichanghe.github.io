# Advancing Natural Language Formalization to First Order Logic with Fine-tuned LLMs
(authored by agents unless marked 🧑)
Tag: `vossel2025advancingformalization`, [paper](https://doi.org/10.3115/1220575.1220654)

## problem and result

Vossel, Mossakowski, and Gehrke evaluate fine-tuned language models for translating natural language (NL) into first-order logic (FOL). The unified MALLS+Willow corpus has 49,950 NL–FOL pairs: 35,964 training, 3,996 validation, and 9,990 test examples, with 62,981 unique predicates and mean formula depth 6.75 (Table 2, p. 5). The paper’s abstract states: “While structural logic translation proves robust, predicate extraction emerges as the main bottleneck.” (abstract, p. 1)

Their strongest setting gives the model an explicit list of predicates that must occur in the answer. Flan-T5-XXL then reaches 63.45% exact match and 70.27% logical equivalence on the test set (Section 4.2, p. 12); the abstract rounds the latter finding to “70% accuracy with predicate lists” (p. 1). Without a predicate list, the same model’s standard fine-tuning gives 35.79% exact and 38.83% equivalence (Table 5, p. 10). Predicate names, rather than logical structure, dominate failures.

## technique: train a seq2seq translator with an explicit formal target

Use this when the source is prose and the target is a fixed logical grammar. The authors compare encoder–decoder T5-base (220M), T5-3B, Flan-T5-XXL (11B), and decoder-only LLaMA3.1-8B, Mistral-24B, and Olmo-32B (Table 1, p. 4). Decoder-only models and Flan-T5 use LoRA with rank 16, scale 32, dropout 0.05; T5-base and T5-3B use full fine-tuning. All models use AdamW, at most 12 epochs, early stopping patience 4, warmup ratio 0.05, and weight decay 0.01 (Section 3.3, pp. 4–5).

Steps from the paper:

1. Merge MALLS and Willow records into JSON with `NL` and `FOL` fields; an example is `Not every student is hardworking.` paired with `¬∀x (Student(x) → Hardworking(x))` (Section 3.2, p. 4).
2. For decoder-only models, format each record as ChatML and instruct output to contain only FOL beginning with `Φ =`; for T5, prepend “translate English natural language statements into first-order logic (FOL):” (Section 3.4, pp. 6–7).
3. Replace logical symbols with textual forms for T5’s SentencePiece tokenizer in the baseline (Section 3.4, p. 6).
4. Fine-tune with the stated LoRA/full-training setup, save the model, and decode with sampling (decoder-only) or five-beam search (T5) (Section 3.4, p. 6).

Verus form (Inference): use the model only to propose a Rust/Verus contract skeleton. Parse the proposal, resolve names and types, and run Verus on the unchanged implementation. Map quantifiers and predicates to `spec fn`s and `requires`/`ensures`; use proof functions and `assert` to discharge logical consequences. The paper’s FOL grammar and tokenizer do not carry over, and generated text is not evidence until Verus checks it.

Evidence: standard fine-tuning gives Flan-T5-XXL 35.79% exact and 38.83% equivalence, while T5-3B gives 32.96% and 36.21% (Table 5, p. 10). These percentages use the 9,990-example test split (Table 2, p. 5). The authors compare against models evaluated without fine-tuning and note that ccg2lambda parsed only 8,225 NL sentences; its equivalence accuracy is 0.27% before predicate matching and 0.43% after (Table 4, p. 11). The dataset is generated/curated text, and correctness of its FOL labels remains a trusted assumption.

## technique: extend the vocabulary for logical symbols

Use this when tokenization fragments operators such as `∀`, `∃`, `¬`, `∧`, `∨`, `→`, `↔`, and `⊕`. Add each symbol as a dedicated tokenizer and embedding token, then train and evaluate exactly as in the baseline (Section 3.4, p. 6). This tests whether atomic symbolic encoding improves structural translation.

Verus form (Inference): use a parser with explicit tokens for `requires`, `ensures`, `invariant`, and `spec fn` syntax, then reject output that is not a valid AST. Token extension itself is an ML implementation detail; Verus’s parser and compiler are the acceptance checks. The experiment found no consistent gain: improvements for Olmo-32B and T5-base were below one percentage point, while other models declined slightly (Section 4.2, p. 12).

## technique: supply predicate lists and distractors

Use this when selecting the symbols that name entities or properties is harder than composing their logical structure. For every pair, provide an alphabetically sorted list of the predicates that must occur in the FOL result. Sorting prevents order from leaking the formula structure (Section 3.4, p. 7). In the noise condition, append randomly selected predicates from five other formulas, forcing the model to select a relevant subset (Section 3.4, p. 7).

The paper reports Flan-T5-XXL with a gold list at 63.45% exact and 70.27% equivalence, with predicate normalization changing exact to only 63.54%. With noisy lists, it reaches 62.39% exact and 69.06% equivalence (Table 7, p. 12). These scores use the same 9,990-example test denominator. The paper concludes that correct predicate structure, rather than robustness to distractors, supplies the main gain.

Verus form (Inference): provide an agent an allowlist of visible Rust names, fields, traits, and existing specification predicates. Require every generated clause to use only names in that allowlist, then run Verus. This resembles predicate conditioning but is stronger because unresolved names are compiler errors. A name allowlist does not establish that a predicate is semantically appropriate; the human contract still needs review.

## technique: learn predicates in a curriculum

The authors test two staged curricula. In two-step training, stage one predicts the relevant predicate list from NL; stage two feeds that predicted list into the fixed-list formalizer. In three-step training, the model is trained successively with gold lists, noisy lists, and finally no predicate hints (Section 3.4, pp. 7–8).

Steps: train each stage on the same train split; generate the intermediate list; feed it to the next stage; evaluate on the untouched test set. The two-step Flan-T5-XXL reaches only 25.96% exact and 28.26% equivalence before predicate normalization, or 35.11% and 38.95% after it. The three-step curriculum reaches 33.83% exact and 36.69% equivalence (Section 4.2, p. 12). The authors infer overfitting to supplied predicates and poor generalization when the model must discover names.

Verus form (Inference): split contract generation into name resolution and clause synthesis. First emit a candidate list of existing Rust/Verus symbols; resolve it against the module and reject missing or private names. Then generate clauses and verify them. The failed curriculum result warns that an agent may learn benchmark naming artifacts; measure name precision separately from proof success.

## technique: multilingual predicate abstraction

Translate all NL training statements into German and French while keeping FOL predicates in English; leave validation and test in English (Section 3.4, p. 8). This prevents direct word matching and tests whether the model abstracts predicate meaning. T5-3B reaches 30.33% exact and 32.90% equivalence under multilingual training, only modestly below its monolingual baseline (Section 4.2, p. 12).

Verus form (Inference): expose equivalent requirements in multiple natural languages but normalize them to one typed contract before proof. Translation diversity is useful for robustness tests; it cannot replace checking that each language maps to the same `ensures`.

## technique: evaluate syntax, semantics, and predicate identity separately

The paper uses whitespace-insensitive exact match, logical equivalence, and predicate matching. For equivalence, parse both formulas with a Lark grammar, convert syntax trees to Z3, and ask whether the negated bi-implication `¬(φ ↔ ψ)` is unsatisfiable within a 10-second timeout (Section 3.5, pp. 8–9). For predicate matching, map predicted names to gold names using normalized Levenshtein distance threshold 0.6, then recompute both metrics (Section 3.5, p. 9).

Verus form (Inference): use Verus compilation and proof obligations as the semantic metric, while separately reporting parser validity, contract-name resolution, and successful verification. A text similarity score should never count as a proof. A bounded solver timeout is analogous only to a failed verification run, not to acceptance.

On the out-of-domain FOLIO sanity check, the fine-tuned model obtains 39.70% valid conclusions versus 37.44% for LLaMA-2 13B, despite no FOLIO training (Section 4.3, p. 13). This denominator is the FOLIO evaluation subset, but the paper does not state its raw count in the cited paragraph. It measures argument validity, not exact formalization.

## trusted scope and threat to VL

The paper proves no theorem about model-generated FOL. Its trusted components include dataset labels, parser grammar, Z3 encoding, predicate matching threshold, model checkpoints, and the assumption that benchmark formulas represent intended meanings. CoT can degrade results because initially correct outputs may be overwritten (Conclusion, p. 13). The main limitation is predicate extraction: Flan-T5-XXL is reported as 55% without a predicate list and 70% with a noisy one (Conclusion, p. 13), while the detailed tables use 35.79%/38.83% for standard fine-tuning and 62.39%/69.06% with noisy lists (Tables 5 and 7, pp. 10, 12). These are different settings and metrics, not a contradiction; the rounded 55/70 statement refers to another comparison in the conclusion.

Inference: threat to agent-written verified Rust is high at symbol binding and specification intent. An agent can produce syntactically valid Verus clauses over the wrong field or predicate. VL can reuse predicate allowlists, staged name resolution, explicit semantic checks, and the distinction between structural and predicate errors. It must add AST/type checking, reject trust escapes, and require Verus to prove the actual body. What VL should not redo is generic predicate-list conditioning or the basic exact-versus-equivalence metric distinction; this paper already evaluates both. A remaining product experiment is whether a verified name-resolution stage reduces wrong-contract proofs on real Rust modules.

## techniques for the catalog

- fine-tuned NL-to-FOL translation — train sequence-to-sequence models on paired prose and formal strings
- logical-token vocabulary extension — represent quantifiers and connectives as atomic output tokens
- predicate-list conditioning — provide sorted relevant predicates, optionally with distractors
- staged predicate curriculum — predict names first or train gold-to-noisy-to-free-form stages
- multilingual predicate abstraction — vary source language while keeping formal predicates fixed
- semantic equivalence evaluation — parse formulas and prove negated bi-implication unsatisfiable with Z3
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
