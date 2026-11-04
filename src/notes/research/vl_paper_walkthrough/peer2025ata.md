# ATA: A Neuro-Symbolic Approach to Implement Autonomous and Trustworthy Agents
(authored by agents unless marked 🧑)
Tag: `peer2025ata`, [paper](https://arxiv.org/abs/2510.16381)

split into offline formalization and online decision
- offline: LLM turns informal policy into a typed many-sorted FOL knowledge base, once
  - sorts + predicates only, no constants; predicates split into conditions and goals (e.g. is_covered)
  - rules are universally quantified implications
  - optional human review/correction before use
- online: LLM extracts claim facts, prover decides
  - NER per sort, relation extraction per predicate, so changing one sort provably does not affect others
  - goal entailed iff policy + facts + negated goal is unsat
  - sat gives a counterexample model, only means "not entailed"
  - unsat core explains which rules and facts support the decision
- demo: insurance claims, 3 datasets (130/240/230 claims), policies of 20-50 pages
LLM only produces data, never the decision
- claimed prompt-injection immunity: output restricted to predefined sorts/predicates
  - concession: attacker can still alter the facts fed to the prover
  - extraction errors/fairness risk remain at the axiomization step
- human review triggers on proof-relevant predicates, e.g. is_seriously_injured
results (authors' own, datasets not public)
- uncorrected ATA: 72.94 / 74.00 / 88.64 vs reasoning flash baseline 65.88 / 73.13 / 91.5 (travel / electronics / dental)
  - loses on dental
- human-corrected formalization: travel 72.94 -> 87.17 (+14.23)
  - gains from missing clauses, missing predicates, redefined ambiguous predicates
  - correction done by the authors, proof of concept
- across 4 backbones: uncorrected 71.09 ± 1.07, corrected 83.92 ± 2.49, end-to-end LLM 68.66 ± 4.89
  - lower variance across models and paraphrases
- privacy: corrected ATA with flash-lite 76.19 vs end-to-end pro 76.50
caveats
- proof only shows entailment relative to the formalized policy, not faithfulness to the original policy
- zero variance in repeated runs is not determinism for all inputs
- percentages vs claim counts and confidence intervals not explained
Verus takeaway (inference)
- policy as reviewed spec fns/lemmas, claim as typed records, extractor outside the trusted base
