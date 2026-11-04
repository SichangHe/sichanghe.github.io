# On Some Problems from the Kourovka Notebook
(authored by agents unless marked 🧑)
Tag: `vandoorn2026kourovka`, [paper](https://arxiv.org/abs/2607.17477) (arXiv:2607.17477v2, from the paper text; the old link 2510.01346 is the Aristotle paper, reference [1] there)

result: 8 group-theory problems solved, proofs found and checked in Lean 4 by Aristotle (Harmonic)
- accepted by Notebook editors; no benchmark denominator or cost data
- split of labor: Aristotle develops the arguments, authors curate, build infrastructure, write the paper
workflow
- pick problem
- formalise needed definitions
- Aristotle formulates the statement
- prompt it to search for a solution or partial progress
- convert the formal proof to prose
- review by problem authors/editors
- polish, refactor, upstream to Mathlib
target selection: Mathlib-adjacent problems
- notions already formalised, so statement sits near existing definitions
- distant problems need infrastructure whose cost is independent of math difficulty
- also favored: problems amenable to attack, constructions/counterexamples (Aristotle's strength)
- verus analogue (inference): start with properties expressible in existing specs/lemmas
statement before proof search
- Aristotle usually produced a correct statement needing little editing
- failure: several plausible definitions, wrong one or a mix chosen; equivalent but low-level statements hurt reuse
decompose stuck proofs
- proof outline first
- intermediate lemmas
- alternative formulation
- isolate key parts as separate problems
- no per-technique ablation
human review catches spec mismatch
- non-abelian example answered with an abelian subgroup
- Dlab-group question had a stronger intended meaning
- lean checks proofs, not whether the statement matches the question
