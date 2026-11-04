# Theory-Scale Auto-Formalization of Logics for Computer Science
(authored by agents unless marked 🧑)
Tag: `zhang2026theoryscale`, [paper](https://www.semanticscholar.org/paper/91d8c13af9d7c0bdb4bde12bef4a2eaf5dd95bf0)

LCS-Bench: textbook "Logics for Computer Science" as a stand-alone Lean development
- 327 benchmark items from 341 formalized, 4,076 declarations, 85K lines (28K proof lines)
- 1,271 instances over 5 tracks: item/subsection auto-formalization, with distractors, declaration/item-level proving
- 55% of theorem/lemma items proved, rest expert-reviewed
- best item-level auto-formalization pass 20.1%, Claude Opus 4.6 agentic, 14 models
  - pass fraction on IAF track only, not overall proving rate
plan before coding with a 2-layer blueprint
- concept graph: IS-A, HAS-A, RELIES-ON, DEFINED-BY edges
- signature graph: each concept to Lean kind, constructors, fields, embedding level
  - deep syntax as inductive types, semantics as `Prop`, meta-theorems link them
  - wrong embedding choice makes later meta-theorems impossible
- Verus analog: schema mapping concepts to enums/structs, `spec fn`s, proof fns; graph consistency is an external check
implement in dependency order, 3 rounds
- 1 types/structures, 2 functions/semantic predicates, 3 theorem statements with `sorry`
- `lake build` after each round, plus review script for vacuous statements, missing cases, identity stubs
- Verus analog: no leftover `assume` or unreviewed `external_body` in the final artifact
faithfulness is the main failure, not proof difficulty
- signature drift toward loose statements makes downstream lemmas trivially provable but unfaithful
- failed proof may mean false statement: try negation or counterexample search, then fix earliest bad declaration
- cost: 6 person-months, 600+ issues, ~30% of major definitions/assumptions/core theorems rewritten by humans
  - e.g. missing eigenvariable side condition broke many downstream proofs
- Verus lesson: verification passing does not imply the spec is faithful; review specs
definitional-equivalence checker for evaluation
- handles definitions, theorems, inductives, constructors, not only logical equivalence
- also checks no `sorry`, no new axioms
