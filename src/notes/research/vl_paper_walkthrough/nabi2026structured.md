# When Does Structured Knowledge Help Neural Theorem Proving?
(authored by agents unless marked 🧑)
Tag: `nabi2026structured`, [paper](https://www.semanticscholar.org/paper/0358217c52496e7735508f2ed392d38e8b0c7259)

question: does a knowledge graph (KG) of formal math help Lean 4 provers
- MATH KG: 364 verified Mathlib declarations, 9,434 typed edges
  - 8,026 LLM-inferred edges (confidence ≥ 0.75) + 1,408 inverses
  - cross-domain-bridge + prerequisite = 72% of inferred edges
- MATH AGENT: Explorer retrieves, Prover loops with Lean errors
  - up to 32 sequential attempts, last 10 errors fed back
  - Conjecturer and Integrator not evaluated
main finding: augmentation helps only some models
- Lean specialization adds 33–38 points in every mode
- no augmentation mode adds more than 3 points in aggregate
- KG delta on miniF2F (488 problems)
  - Goedel-8B +14, Qwen3-8B +2
  - Goedel-32B −3, Sonnet −7, Qwen3-32B −14
  - Mathlib lexical retrieval: −6 to 0, within noise
- modes are complementary
  - per-problem oracle: Goedel-8B 205 → 241, Sonnet 365 → 388
- uncapped KG block overflowed Goedel-32B window, 10 to 28 problems counted as failures
retrieval design
- layer 1 semantic KG walk, layer 2 lexical Mathlib name match with signatures
- Lean kernel is the only trusted check, KG labels are proposal metadata
verus takeaways (inference, not tested in paper)
- retrieval must have a token budget and report denominator changes
- bounded verifier-feedback repair loop, log attempts to catch assume abuse
- measure context benefit per model, do not assume it transfers
