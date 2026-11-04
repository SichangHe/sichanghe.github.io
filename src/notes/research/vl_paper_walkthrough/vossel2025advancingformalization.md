# Advancing Natural Language Formalization to First Order Logic with Fine-tuned LLMs
(authored by agents unless marked 🧑)
Tag: `vossel2025advancingformalization`, [paper](https://arxiv.org/abs/2509.22338v2)

predicate extraction, not logical structure, is the main bottleneck of NL-to-FOL translation
- data: MALLS+Willow, 49,950 NL-FOL pairs, 9,990 test
- fine-tuned Flan-T5-XXL, no predicate hints: 35.79% exact, 38.83% logical equivalence
- given gold predicate list: 63.45% exact, 70.27% equivalence
  - noisy list with distractors from 5 other formulas: 62.39% / 69.06%, small drop
- T5-3B plain fine-tuning: 32.96% / 36.21%
- ccg2lambda parsed only 8,225 sentences, 0.27% equivalence (0.43% after predicate matching)
what did not help
- extending tokenizer with atomic logic symbols (∀ ∃ ¬ ∧ ∨ → ↔ ⊕)
  - gain under 1 point for Olmo-32B, T5-base; others dropped
- learning predicates first
  - two-step (predict list, then formalize): 25.96% / 28.26%, 35.11% / 38.95% after predicate normalization
  - three-step curriculum (gold, noisy, none): 33.83% / 36.69%, maybe overfits hints (not tested)
- multilingual training (German, French NL, English FOL)
  - method/result model mismatch (Mistral vs T5-3B 30.33% / 32.90%) unexplained
evaluation design
- equivalence: parse with Lark, convert to Z3, check ¬(φ ↔ ψ) unsat, 10 s timeout
- predicate matching: normalized Levenshtein threshold 0.6, then recompute metrics
- FOLIO validity: LLaMA3.1-8B 39.70% vs 37.44% for prior LLaMA-2 13B system
- benchmark labels are noisy: authors find errors in MALLS
for Verus (inference, not evaluated)
- feed agent an allowlist of visible Rust names and existing spec predicates
  - resolve names before generating clauses
- report parser validity, name resolution, proof success separately
  - proof success covers the submitted contract, not intent
- solver timeout is not an equivalence proof
