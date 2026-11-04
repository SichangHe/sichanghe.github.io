# nl2spec: Interactively Translating Unstructured Natural Language to Temporal Logics with Large Language Models
(authored by agents unless marked 🧑)
Tag: `cosler2023nl2spec`, [paper](https://doi.org/10.1007/978-3-031-37703-7_18)

idea: decompose nl-to-LTL translation into user-editable sub-translations
- sub-translation = pair of (nl fragment, formula fragment)
- user can add, edit, delete, or pick alternatives before accepting the formula
- fixes ambiguity at the smallest fragment instead of rewriting the whole formula
loop (Algorithm 1)
- prompt = spec-language description + few-shot examples + sentence + given translations
- query LLM several times (3 runs, temperature 0.2)
  - confidence of a sub-translation = its vote count
  - top vote is default, others shown in a drop-down
- user edits feed back as "Given translations", repeat until approved
prompt design
- few-shot examples have step-by-step explanation, explanation dictionary, final formula, stop token `FINISH`
- examples contain no given translations
example fixes
- "a holds until b holds or always a holds": tool gave `(a U (b | G(a)))`, expert wanted `(a U b) | G a`
  - editing the fragment to `(a U b)` fixed it
benchmark
- 36 expert-written sentences, 5 atomic propositions a-e, chosen to be hard
- correct only if it matches the expert's intended meaning, no alternative reading accepted
- at least 9 are ambiguous
results
- Codex: 16/36 initial, 21/36 with 4 extra examples, 31/36 interactive
  - avg 1.4 loops over the 31 solved
  - 5 remaining needed hand translation
- GPT-3.5-Turbo: 12/36, 17/36, 21/36
- baselines: nl2ltl Rasa 1/36, fine-tuned T5 2/36, Bloom initial 5/36
- teacher-student: Codex sub-translations let Bloom solve 4 of 11 Codex-only cases
  - shows transfer of fragments, not accuracy over all 36
limits
- trusts LLM, parser, and human acceptance; no machine-checked correspondence
- needs inference-time compute; quality may depend on logic/code in pretraining
Verus takeaway (inference)
- use for nl to `requires`/`ensures`/invariant fragments with human review
- LTL operators must become state predicates, ghost state, or transition invariants
- wrong nl interpretation yields a plausible but wrong `ensures`, the main risk
