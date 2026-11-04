# Neuro-Formal Verification: Agentic Language-Agnostic Formal Program Reasoning
(authored by agents unless marked 🧑)
Tag: `lahiri2026neuroformal`, [paper](https://arxiv.org/abs/2608.21516v3)

nfv: llm translates a natural-language claim about python into dafny/c, returns only machine-checked verdicts
- stages: intent formalization, translation, spec rendering, proof/refutation search, verdict
- benchmark: 206 entries = 103 correct references + 103 mutants
- dafny pipeline: issued 128/206 proofs, 118 correct (57.3% recall, 92.2% precision)
  - 10 wrong verdicts
- proof is about frozen formal artifact, not developer intent
  - llm controls environment model, preconditions, lemmas
goal-blind staged translation with freeze checks
- formalize library surface + preconditions before the property is visible
- tag every translated line `src:` or `synth:`, reject untagged
- translation retries get no verifier-goal feedback
- proof repair may change only lemmas, invariants, proof calls; recheck frozen parts every round
- ablation: unstaged baseline proves 98% of both correct and buggy, 50% precision
  - rewritten code in 57% of its unsound proofs, invented helpers 35%, assumptions 8%
  - ablates the whole discipline at once, not each mechanism
proof arm
- 72/103 references proved (69.9%), 5 mutants wrongly proved, 93.5% precision
- failures: missing preconditions, wrong types, one library model copied a mutant bug
  - formalization failures, not kernel failures
refutation arm: negate goal mechanically, prove with witness input, program frozen
- reject unless goal replaced by `false` does not verify
- 47/103 mutants refuted (45.6%), 6 false refutations, 88.7% precision
  - all 6 real counterexamples relying on unstated assumptions (nan, equal lengths, ascii...)
  - so refutation also exposes spec defects
- unproved goal is evidence about search, not about the program
bounded refutation with abstention (cbmc)
- violating trace = refutation, everything else = abstention
- 65 true + 7 false refutations, 63% recall, 90% precision
- false ones come from under-constrained preconditions
budget and model effects
- 5 attempts, 10 repair rounds; repair changes only proof material
- weaker models: gpt-5-mini 60% verification precision; haiku proved 11% of correct programs
limits
- small python entries, 9% library-heavy; 43% unresolved
- translation, environment model, intent, proof sketch unproved
verus takeaways (inference)
- hash rust source, spec fn library models, freeze requires/ensures, allow edits only in proof blocks
- scan for assume/admit/external_body before counting a proof
- record abstention reasons; never turn timeout or clean bounded run into correctness
