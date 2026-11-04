# Specification Grounding Drives Test Effectiveness for LLM Code
(authored by agents unless marked 🧑)
Tag: `haeri2026specification`, [paper](https://arxiv.org/abs/2607.06636)

claim: grounding tests in an enumerated spec beats more tests or "test the edges" prompts
- only change: tester prompt gets spec as checklist, one test per rule (SPEC) vs ticket-only + edge nudge (FREE+)
  - fixed Sonnet 4.6 tester/repairer, one-shot code from Haiku 4.5/Sonnet 4.6, hidden gold oracle
- 48 core instances, 30 buggy drafts
  - SPEC: 100% final correct, detects 30/30
  - FREE+: 60% final correct, detects 18/30
- gain SPEC−FREE+: +38 pts across 3 Claude tiers, +36 held-out, +28 GPT-5.3-codex, +19 Gemini 3.5 Flash
  - different denominators, not one pooled estimate
ablation: content is the lever, enumeration adds a little
- detection of 30 buggy drafts: FREE 0, DECOMP (plan without spec) 2, PROSE (spec paragraph) 27, SPEC 30
- enumeration does not guarantee a triggering input
  - rule `size ≥ 1` produced size=0, missed size=−1 bug
two-sided quality matters
- property-based testing detects 28/30 but invents out-of-spec assertions
  - 2/15 batteries wrongly reject valid `roman_to_int("IIII")`
- SPEC: 0/37 wrong expectations, 0% false alarms; FREE+: 3/36 wrong, 33% false rejections
spec quality bounds the method
- dropping rules: detection 30/30 → 6/30, remaining tests still accurate
- adding a wrong rule: detection stays 30/30, tester accuracy drops to 82.8%
- "The method is only as good as the spec it is given"
scope limits
- small Python functions, spec-completeness bugs only
  - 0 natural bugs in 45 valid logic-task submissions
- well-specified tasks (HumanEval+) show no grounding gap
- no repository-scale or Verus evaluation
Verus takeaways (inference)
- passing proof checks only the written contract, so an incomplete `ensures` passes silently
  - audit contracts with independent oracle and negative cases
- agent-edited tests/proofs can be rewritten to fit buggy code, so keep oracle hidden and independent
