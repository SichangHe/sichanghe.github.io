# Instruct, Not Answer: Using Instruction Privileges in On-Policy Context Distillation
(authored by agents unless marked 🧑)
Tag: `yu2026instruct`, [paper](http://arxiv.org/abs/2609.32201v2)

claim: short generic instructions as teacher privilege beat instance-specific gold answers out of domain
- task: autoformalize premises + question to FOL, Vampire returns TRUE/FALSE/UNKNOWN
- 7 of 8 experiments (ProverQA, ProofWriter, ProntoQA; Qwen3-Thinking, Olmo3-Thinking)
  - matched instruction beats gold OOD by 4 to 17 points
  - on par with gold in-domain
- not tested on Verus or Rust proofs, only FOL translation quality
on-policy context distillation (OPCD)
- student samples the trace, privileged teacher scores the same prefix
  - loss: tokenwise forward KL(teacher with context c || student) averaged over student-sampled tokens
  - privilege c only in teacher prompt
  - OPD = no privilege, OPSD = same-model special case
- setup: 1200 train / 300 eval per dataset, LoRA, H100, rollout temperature 0.7, 8 rollouts per problem
  - metrics: average@8, pass4
instructions as privilege
- one narrow rule per recurring error, no instance-specific formula
  - examples: keep explicit universal quantifier, XOR is ⊕ not ∨, fully parenthesize implication scope, one predicate name per concept
- putting the instruction directly in the prompt barely helps, often hurts
  - gain needs distillation through OPCD
- Qwen3-1.7B student, Qwen3-4B teacher, pass4 gain over no-privilege OPCD
  - ProverQA: coreference instruction +13.0, gold +8.8
  - ProofWriter: universal-drop instruction +17.1, gold +5.0
  - ProntoQA: gold wins, formatting errors rare and semantic errors dominate
error taxonomy first
- categories: unparseable, dropped ∀, XOR→OR, implication scope, coreference naming, semantic
- ProverQA training rollouts: 30.9% XOR→OR, 14.3% ∀ dropped, 12.5% unparseable
- gold can raise semantic errors (+3.7 ProverQA, +3.2 ProofWriter) and coreference errors (+12.6 ProverQA)
gold hurts transfer
- gold pass4 drops on ProverQA→ProntoQA: −5.5 (Qwen3-4B), −7.6 (Qwen3-8B)
- best matched instruction beats gold in 5 of 6 cross-dataset rows
for Verus (inference)
- derive narrow privileges from recurring verifier diagnostics
  - keep all preconditions, do not strengthen assumptions, state loop invariants explicitly
- evaluate on unseen modules and requirement domains
- verifier cannot detect weakened specs, still need independent spec review
