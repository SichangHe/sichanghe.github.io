# Seed-Prover 1.5: Mastering Undergraduate-Level Theorem Proving via Learning from Experience
(authored by agents unless marked 🧑)
Tag: `seed2025mastering`, [paper](http://arxiv.org/abs/2512.17260v1)

agentic Lean 4 prover that interacts via lemmas, not tactics or whole proofs
- results (Table 2): PutnamBench 580/660 (87.9%), FATE-H 80/100, FATE-X 33/100, CombiBench 48%
  - budget 10 H20-days/problem
  - Putnam 2025: 11/12 within 9 h, max 40 H20-days/problem
  - agentic prover alone, Pass@8×8: 359/660 Putnam, 57/100 FATE-H, 10/100 FATE-X
- caveats: CombiBench formalization issues, Erdős problems solved are simple, no frontier-math claim
- Verus transfer is the architecture, with explicit contracts and trusted base stated
cached incremental lemma proving
- agent calls `verify_lean` per lemma; compiled lemmas cached in context, never regenerated
  - budget 64K tokens, 28 tool calls
  - tools: Lean verify, Mathlib semantic search (pinned v4.22.0), Python
- Verus: cached lemma = verified `proof fn`; re-verify after edits, item context is cache key
- no ablation isolating caching
tool-integrated outcome RL
- trajectories interleave reasoning, tool calls, responses; start from Seed-Prover 1.0 + synthetic SFT
- reward +1 verified proof, −1 else; VAPO following ReTool
  - filter: drop statements proved >3 times or unproved under all prompts
  - failed-attempt summaries used as extra prompts
- training accuracy ~50% → ~90% over >1,000 steps
  - function calls ~15 → ~10, length ~28K → ~17K tokens
- Verus: reward only non-vacuous verified contracts; log timeout/parser/spec-weakness separately
semantic retrieval with adaptive tool use
- embedding search for declarations when name unknown
- searches/trajectory: <3 training, ~10 FATE-H, 1–2 Putnam; later checkpoints search less
- no isolated ablation; pin index to dependency versions
rubric-trained lemma sketch model
- NL proof + formal statement ⇒ Lean sketch with `sorry` helper lemmas
  - NL prover rejects sketch if any lemma invalid
  - reward +1 iff ≥3 lemmas, `SFL ≥ 0`, `SNL ≥ 0.7`
  - rubric: alignment, granularity, difficulty reduction, junk-value analysis
- appendix weights inconsistent (50/50 vs 0.4/0.6); 0–10 score → `SNL` mapping unexplained
- Verus: helper `proof fn` skeleton, each verified independently; no `external_body` on target
hierarchical recursive test-time scaling
- loop: NL prover → sketch model → agentic prover (Pass@3×3)
  - unsolved lemma ⇒ recurse; disproved lemma ⇒ refine sketch
  - depth 4, then restart with cached lemmas to depth 8
- PutnamBench scaling log-linear with compute
- Verus: restart carries only rechecked lemmas; parallelize subgoals only if ownership allows
