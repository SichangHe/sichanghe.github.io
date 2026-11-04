# FaithSieve: Fine-Grained Evaluation of Math Proofs with Faithful Formal Evidence
(authored by agents unless marked 🧑)
Tag: `wang2026faithsieve`, [paper](https://doi.org/10.48550/arxiv.2608.26310)

locates first unreliable step of a natural-language proof using local Lean evidence
- Lean output counts only if the checked statement is local to the step and semantically faithful
- GPT-5.4 exact first-error accuracy vs direct judging
  - ProofLoc-Olympiad (350): 81.43% vs 72.29%
  - ProofLoc-University (200): 84.50% vs 75.00%
- no confidence intervals reported
pipeline
- proof-state tree: node = (assumptions, goal), edge = local transition (EdgeUnit)
  - types: fact derivation, rewrite, goal reduction, case split, lemma introduction
  - removing EdgeUnits: 81.43% to 60.86% exact
- suspicion search: cheap per-edge risk score, threshold 0.6
  - validate earliest suspicious edge plus short prefix window
  - no standalone precision/recall reported
- typed obligations: one template per transition type
  - fact plus goal reduction split in two, so unvalidated fact is never a premise
- faithfulness gate: Sfaith = Sprem * Sconc * Shol
  - compares formal premises/conclusion with source claim, revises on drift
  - removing gate: 81.43% to 70.86% exact
  - Lean success reliable only if statement stays aligned
- formal eval returns passed / refuted / inconclusive
  - SymPy for pure numerics, Lean otherwise
  - verify claim for likely-correct edges, its negation for likely-wrong edges
  - timeout, drift, or compile failure is inconclusive
  - fuse to original step, return earliest step with reliable negative evidence
takeaway for Verus
- check generated `requires`/`ensures` against the natural-language requirement before trusting a pass
  - a verified but weaker postcondition is evidence of the wrong contract
- tree and risk model are external orchestration, not Verus features
