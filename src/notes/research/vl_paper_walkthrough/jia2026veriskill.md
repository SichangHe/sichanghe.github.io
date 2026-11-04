# VeriSkill: A Self-Evolution Framework for Program Verification Skills
(authored by agents unless marked 🧑)
Tag: `jia2026veriskill`, [paper](http://arxiv.org/abs/2607.27733v1)

idea: loop that edits an agent's skill document (workflows, tool/error-handling instructions) for one verifier
- trusted: verifier (Dafny, Frama-C WP, VeriFast), check M that executable program is unchanged, human-verified reference solutions
- metric PASS = share of held-out tasks verified and M = 1
- caveat: PASS does not check contracts mean what the program should do
  - agent can raise PASS with weaker postconditions
- no Verus experiment
four-way failure attribution
- classes: task unsatisfiable, prover limitation, skill noncompliance, skill knowledge gap
- only the last two feed skill evolution
- needs a reference solution per training task
  - rarely available for agent-written Verus on new projects
- ablation (Dafny, Claude Code): treating all failures as skill deficiency 57.3 -> 44.3
failure signature, then cluster
- signature: where proof broke, which proof duty missing, what is wrong in skill text
  - Verus: error kind (precondition, postcondition, invariant init/preserve, overflow, decreases) + missing duty
- one lesson per cluster, never per failure
- take the duty from reference proofs, drop its route (invariant form, constants)
  - ablation: diffing against references instead 49.0
lesson format
- states applicability, concrete steps, inapplicable cases
- no task ids, file names, variable names, constants
- integrate by editing matching section, not appending
acceptance test
- split cluster into attribution cases and held-out transfer cases
- revise-test loop under a per-pattern budget
  - reject pass-to-fail regressions and executable changes
- then admit only if frozen validation rate strictly improves and M = 1 on all
  - totals compared, so +2 -1 is admitted; 1 task = 5 points on 20 tasks
- ablation w/o revise-test loop: 36.0 (-21.3, largest)
  - below Skill-Creator, AutoSkill, SkillOpt-Lite
- evolution memory logs accepted/rejected/skipped revisions; no ablation
results
- best in all 6 verifier-agent configs (Claude Code Opus 4.8, Codex GPT 5.6 Sol)
  - Dafny 57.3 / 66.0 vs No Skill 14.0 / 17.0
  - Frama-C 74.5 / 83.0 vs No Skill 56.9 / 57.5
  - VeriFast 84.0 / 93.0 vs No Skill 38.0 / 41.7
- caveats
  - benchmarks ~100 tasks (Frama-C ~51), 3 runs averaged, no spread
  - Frama-C gain over best baseline 9.1 points = under 5 tasks
  - EvoSkill below No Skill on Frama-C; Human Skill below No Skill on Dafny, VeriFast
  - cost about US$15K API
- Codex-evolved Dafny skill transfers to 5 other models: +15.3 to +43.7 pp, all below Codex 66.0
