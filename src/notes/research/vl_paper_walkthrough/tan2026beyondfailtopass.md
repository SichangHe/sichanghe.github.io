# Beyond Fail-to-Pass: Iterative Hardening of Co-Generated Bug Reproduction Tests and Fixes
(authored by agents unless marked 🧑)
Tag: `tan2026beyondfailtopass`, [paper](https://doi.org/10.1109/ICSE48619.2023)

claim: fail-to-pass (F→P) is too weak a gate for generated bug-reproduction tests (BRTs)
- a test can fail on buggy code, pass on the golden fix, and still accept wrong fixes
- mutation patch evaluation (MPE) classifies BRTs
  - mutate golden fix with 5 operators: vanilla, symptom suppression, incomplete fix, input-specific shortcut, behavior substitution
  - rigorous: mutant fails generated test, passes golden test
  - lax: passes both
  - misaligned: passes generated test, fails golden test
- effect on fix agent resolve rate when given the BRT
  - rigorous (552): 67.3% to 75.8%
  - lax (552): 69.5% to 69.5%
  - misaligned (474): 44.5% to 40.9%
- limit: mutant pool approximates an unbounded incorrect-fix space

CoHarden loop
- lax-init: agent writes only a reproduction test t0 from the issue, no source edits
  - observable failure only, no internal hooks
- each round jointly emits (test, fix), mutates fix, scores against current and previous test
  - temporal matrix: alpha both pass, beta current passes but reference fails, gamma reverse, delta both fail
  - laxity = beta / admissible mutants; accept if <= tau=0.2, else revert to t0 and feed back survivors
  - 4 operators x 3 samples = 12 mutants per round
- results (433 SWE-bench Verified ∩ SWT-bench Verified, GPT-5-mini)
  - 69.4% resolved, 78.9% F→P, $0.84/instance
  - baseline OpenHands+COGEN 61.4%, 72.7%, $0.56
  - GPT-5.4 76.2%, Claude Opus 4.5 78.7% resolved
- ablation (resolved/F→P)
  - full 69.4/78.9
  - no lax-init 62.4/70.2
  - no hardening 61.0/82.6
  - neither 61.4/72.7
- F→P falls over rounds (83.3% to 78.9%) while resolved rises (61.0% to 69.4%)

verus transfer (inference)
- score tests against mutant implementations using `ensures` as oracle
- report operator coverage and mutant counts, never claim completeness
