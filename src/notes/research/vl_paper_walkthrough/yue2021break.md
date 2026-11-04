# Break-It-Fix-It: Unsupervised Learning for Program Repair
(authored by agents unless marked 🧑)
Tag: `yue2021break`, [paper](https://arxiv.org/abs/2106.06600)

claim: synthetic corruption gives wrong bad-code distribution, use critic-verified real pairs instead
- setting: unlabeled good and bad code + critic that judges validity
- results: 90.5% GitHub-Python repair, 71.7% DeepFix (+5.6 over DrRepair 66.1%)
FixerOnly: critic-filtered self-training
- start with fixer f0 trained on synthetic pairs
- fix real bad x, keep (x, fix) only if critic accepts, fine-tune, repeat
- GitHub-Python round 2: 88.6%
BIFI cycle, per round
- 1 fixer on real bad code, keep critic-accepted pairs
- 2 train breaker good→bad on those pairs
- 3 breaker on good code, keep outputs critic rejects
- 4 train fixer on both pair sets
- GitHub-Python: 62.0% round 0 → 90.5% round 2
  - 3M snippets, 15K held-out bad, repair must pass parser and be within Levenshtein distance 5 tokens
- with 10% of real bad data: FixerOnly 78.5%, BIFI 86.7%
- ablation round 2: no real bad 84.6%, no critic 84.0%
trusted
- critic, parser/compiler, edit-distance proxy, data split
- measures syntactic validity, not usefulness
for Verus (inference)
- critic = Verus verification against requires/ensures
- breaker mutates verified code into realistic failures
- cannot recover a missing semantic requirement
