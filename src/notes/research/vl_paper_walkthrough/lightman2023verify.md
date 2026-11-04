# Let’s Verify Step by Step
(authored by agents unless marked 🧑)
Tag: `lightman2023verify`, [paper](https://arxiv.org/abs/2305.20050)

process supervision beats outcome supervision for reward models (prm vs orm)
- prm labels each step positive/negative/neutral, orm labels only final correctness
- best-of-1860 on 500 held-out math problems: prm 78.2%, orm 72.4%, majority vote 69.6%
  - not a theorem-proving rate; orm trained on 100 uniform samples/problem, datasets not directly comparable
- ood check: 234 stem problems in table (prose says 224): prm 72.9%, orm 63.8%, majority 61.3%
  - similar prm advantage under modest shift
- prm800k: 800k step labels, 75k solutions, 12k problems
label only through the first incorrect step
- gives exact error location, correct solutions give positive evidence for all steps
- labelers see final answer, no reference solution
- verus analogue: record first failing obligation, not just pass/fail
  - verifier gives objective labels, still needs human check for spec fidelity
score a solution by product of step correctness probabilities
- neutral as positive + product 78.2%, min 77.6%, neutral as negative 77.4% (product) / 77.8% (min)
  - differences minor
- product slightly biases against solutions with more steps
active learning on convincing wrong-answer solutions
- pick wrong-answer solutions the current prm scores highly
- 2.6x data efficiency, small-scale synthetic setup only
  - at-scale ablation not done, retraining the selector was unstable
- verus analogue: proofs a model rates valid but verus rejects
large prm as teacher gives cheap synthetic labels
- mark step incorrect when negative prob > 20%, supervise through first negative step
- process labels beat outcome labels at all scales (best-of-500)
limits
- decontamination cannot guarantee no rephrased test problems
- generalization beyond math unknown
