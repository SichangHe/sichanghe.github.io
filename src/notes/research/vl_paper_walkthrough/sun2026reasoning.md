# On Reasoning-Centric LLM-based Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `sun2026reasoning`, [paper](http://arxiv.org/abs/2604.19558v1)

ReCent-Prover: rocq proof agent with validation-with-reflection and retrieval-with-planning
- rocq checks hard acceptance, LLM gives strategic critique, structured records avoid repeating failures
- CoqStoq: 138/200 with o4-mini (69%), 114/222 vs CobbleStone 93/222 (+22.58%)
  - MiniMax-M2.5: 61/100 vs 52/100 for BM25 without reflection
  - Hammer-only 55/200
  - evidence is rocq only, no verus transfer measured
validation with reflection
- problem: LLM misapplies a tactic that rocq accepts, e.g. `induction l1` without generalizing, weakening the hypothesis
- ask LLM only after branching or irreversible tactics
  - ReflCat: assert/have/pose, apply/eapply, left/right, induction/destruct/case/elim
  - skip intros, simpl, rewrite
- reflection checks counterexample likelihood of new goals and induction variable/generalization
  - verdict PROVABLE / UNPROVABLE / UNCERTAIN, conservative when unsure
- misapplied: roll back to last good step, keep failure record
- gain: BM25 118 to 130 (+10.17%), planning 128 to 138 (+7.81%)
- risks: rejects good unusual tactics, extra LLM cost
- verus analogue: verify after each proof step, review only structural changes, version the category list
retrieval with planning
- LLM writes a natural-language proof plan, embed plan steps, retrieve lemmas by described intended use, not surface terms
  - motivation: similar subgoals do not necessarily share plans or lemmas
- index
  - only lemmas visible at the proof location, avoids leakage
  - LLM-written lemma descriptions embedded with text-embedding-3-large
  - existing proofs stored with embedded plans, nearest ones added as examples
  - 8 lemmas + 8 proofs per step
- gain: planning 128 vs BM25 118 without reflection (+8.47%), 138 vs 130 with it (+6.15%)
- risks: embedding quality, stale descriptions, prompt clipping hide a needed lemma
- verus analogue: retrieve `proof fn` by plan, show exact `requires/ensures` signatures, prose descriptions are not evidence
per-goal failure history: feed failed tactic sequence and reason into the next prompt
trust boundary
- rocq checks all kept tactics and proofs, LLM is not a checker
- does not fix spec mistakes, missing invariants, unsafe assumptions
