# Lemmanaid: Neuro-Symbolic Lemma Conjecturing
(authored by agents unless marked 🧑)
Tag: `alhessi2025lemmanaid`, [paper](https://arxiv.org/abs/2504.04942)

Isabelle/HOL lemma conjecturing: fine-tuned LLM emits templates, symbolic search fills holes
- template: replace theory-specific function symbols with indexed holes `?Hk`
  - same symbol, same hole, even if polymorphic
  - free vars `xk`, bound vars `yk`, types abstracted
  - example: `?H1 x1 (?H2 x2 x3) = ?H2 (?H1 x1 x2) (?H1 x1 x3)`
- hole filling is a CSP: holes are variables, supplied functions are values, types/arities constrain
  - forward checking prunes
- neural input is symbols with types and/or definitions
  - eval caveat: symbols come from the gold lemma, not a theory-wide search
  - types alone are succinct enough for well-typed templates
- backends: DeepSeek-coder 1.3B/6.7B, Llama-3.2-1B, greedy and beam 4
results
- Octonions (350 lemmas): QuickSpec 22.8%, best Lemmanaid 78.9%, ensemble 83.1%, plus direct neural 84.9%
  - QuickSpec emits thousands of lemmas at under 1% precision
- DeepSeek-6.7B, 5 predictions: HOL-test 50.2% (of 4740), AFP-test 27.9% (of 18975)
- 2026 AFP entries (139 tasks): Lemmanaid 41.7% vs Claude Opus 4.5 19.4% template / 34.5% direct, GPT-5.2 15.8% / 25.2%
  - prompts differ: about 1700 tokens vs about 325
  - leakage mitigated by dates, not excluded
evaluation of conjectures
- match gold lemma by internal term, stricter than logical equivalence
- classify rest: Sledgehammer proves, Nitpick/Quickcheck refutes, else unresolved
  - HOL-test greedy: 22.6% gold, 17.8% other true, 23.6% false, 36.0% unresolved
  - unresolved is not true
- usefulness for downstream tasks not evaluated
Verus transfer (inference)
- would need a restricted expression datatype, shared hole ids, and a Verus proof per conjecture
- paper has no Verus evidence
