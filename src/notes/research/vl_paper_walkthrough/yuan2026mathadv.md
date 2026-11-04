# MathAdv: What Theorem Provers Know, Reason, Formalize, and Generalize
(authored by agents unless marked 🧑)
Tag: `yuan2026mathadv`, [paper](https://www.semanticscholar.org/paper/7430309ce5f9a0f2fd4bac2ae004cf9702787140)

claim: component-wise scores expose failures hidden by aggregate proving accuracy
- 321 problems, 13 undergrad/grad domains, 298 with Lean 4 statements
  - 23 auxiliary-only, Mathlib support inadequate
- variants per problem
  - direct answer without Lean: informal math
  - multiple choice on theorem/strategy: 293 problems
  - Lean proof of original statement
  - expert-transformed presentation: 30 problems
- every problem has expert curation plus second independent expert review
proving results
- Goedel-Prover-V2 21.88%, DeepSeek-Prover-V1.5 RL+RMaxTS 16.56%, GPT-5.4 10.62%
  - DeepSeek-Prover-V1.5: 1.25% base → 11.25% RL → 16.56% with search
- all models 0% on topology
- transformed tasks measure robustness to curated rewrites, not arbitrary paraphrase
- one denominator in the note is inconsistent (Table 1 vs 298 in §3.1), treat percentages with care
verifier-in-the-loop autoformalization
- 1 LLM drafts Lean from informal statement and proof
- 2 compile, feed parser/type errors back, iterate
- 3 independent LLM + human expert check semantic fidelity
- 4 second expert final review
- "we place the Lean verifier in the loop" rather than trusting LLMs as syntax judges
- problems needing missing Mathlib definitions deferred, searched via docs, LeanSearch, Loggle
for Verus (inference)
- same four stages with Verus compile feedback
- compile success is not semantic fidelity
