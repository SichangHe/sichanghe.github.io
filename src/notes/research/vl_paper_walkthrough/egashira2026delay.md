# Delay, Plateau, or Collapse: Evaluating the Impact of Systematic Verification Error on RLVR
(authored by agents unless marked 🧑)
Tag: `egashira2026delay`, [paper](https://doi.org/10.48550/)

RLVR with a systematically wrong verifier V vs oracle V*
- aggregate error rate does not predict outcome
- systematic false positives give outcomes from plateau to collapse
- random label noise and systematic false negatives only delay training
setup
- Reasoning Gym decimal-chain sum, DAPO, OLMo3-7B and Qwen3-1.7B-Base
- inject deterministic triggers
  - random 20%/50% flips, format/language false negatives
  - relative-error false positives, keyword false positives
- track oracle reward, training reward, FPR, FNR separately
results
- relative-error false positives: FPR near 1 by ~step 50, plateau
- keyword "Certainly": plateau
- keyword "python": oracle reward collapses to ~0
diagnosis: conditional advantage C(t) = mean oracle advantage of outputs containing trigger t
- frequent trigger with negative C tends to collapse
- frequent trigger with positive C tends to plateau
- rare triggers matter little
mitigation: alternate V with V*
- V* every 2/5/10 steps mostly turns plateau into delay
- "python" collapse: every 10 steps only slows it, every 2 prevents it
- trigger frequency can still reach 1 but model pairs it with correct reasoning
limits
- controlled arithmetic only, V* assumed available
- real verifier errors are input-dependent and V* often absent
Verus takeaways (inference)
- group rollouts by syntactic pattern, audit frequent negative-C patterns
- run full trusted Verus periodically, cheap checker otherwise
