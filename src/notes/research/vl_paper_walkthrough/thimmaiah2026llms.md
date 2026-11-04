# LLMs Lean on Priors, Not Programming Language Semantics
(authored by agents unless marked 🧑)
Tag: `thimmaiah2026llms`, [paper](https://arxiv.org/abs/2510.03415v3)

PLSemanticsBench: do LLMs apply supplied formal rules or familiar symbol meanings
- language C⋆, two semantics: small-step SOS (S) and K
- splits: Human-Written, LLM-Translated, Fuzzer-Generated
- ground truth from K framework and custom ANTLR4 interpreter, no mechanized proof of either
- no Rust/Verus evaluation
- tasks: PredState (final state), PredRule (rule list), PredTrace (full trace)
- headline: 11 frontier LLMs, up to 90% standard accuracy drops 40-60 points under mutation
  - parenthetical inconsistent with Table 4, which has several 100% scores
mutations
- KeywordSwap: swap operator meanings, syntax unchanged
- KeywordObf: replace operators/keywords with Caucasian-Albanian characters
- PredState, Human-Written, standard to swap
  - DS-Qwen 32B: 93 to 21 (K), 95 to 3 (S)
  - GPT-5-mini: 99 to 79 (K), 100 to 79 (S)
  - Gemini-2.5-pro: 100 to 97 (K), 99 to 98 (S)
  - effect varies by model and formalization
- tokenization is not the whole explanation (tested only GPT-4o-mini)
  - single-token symbols still low accuracy
PredRule
- exact ordered rule list for one statement, state changes removed
- shifted semantics still hurt: local rule selection dominated by symbol priors
- denominator is full dataset, malformed outputs count wrong
PredTrace
- exact full rule/state trace
- only 4 models score above 0, best 35% (Gemini-2.5-pro, S)
  - K: QwQ 32B 18/16/15, Gemini-2.5-pro 25/25/25 (standard/swap/obf)
takeaway for Verus agents (inference)
- agents may follow familiar names over supplied spec
- probe with renamed APIs; no proof-correctness claim from this
