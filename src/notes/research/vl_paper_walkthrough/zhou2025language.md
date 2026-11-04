# Towards Language Model Guided TLA+ Proof Automation
(authored by agents unless marked 🧑)
Tag: `zhou2025language`, [paper](https://arxiv.org/abs/2512.09758v2)

lmgpa: llm proposes decompositions, tlaps verifies them and proves simple leaves
- benchmark: 93 math theorems + 26 distributed-protocol inductiveness proofs
  - math theorems manually translated to tla+, leakage acknowledged
- protocols: 38.5-50.0% vs sapg 38.5%, direct llm 0-15.4%
- math: 53.8-59.1% vs sapg 49.5%, direct llm 0-29.0%
recursive hierarchical decomposition
- try symbolic auto proof first
- else llm gives normalized assumptions + one goal per subclaim
  - parser converts to `ASSUME-PROVE`, removing syntax errors
- tlaps checks children imply parent, then recurse on each child
  - up to 4 decomposition attempts per claim
  - any failed child fails the parent
- tlaps errors are fed back into the next attempt
- failures
  - redundant subclaims, e.g. contrapositive of the goal (trivially valid, no progress)
  - valid decomposition can still time out (45 s per obligation)
symbolic auto-proof first
- parse tree analysis emits `OBVIOUS` or `BY ... DEF ...` without llm
- sapg alone matches most of the gain on math (49.5% vs 53.8-59.1%)
syntax comparison is not success rate
- gpt-5 decomposition syntax valid 290/334 vs direct proof 66/411
- counts decompositions vs full proofs, different denominators
retrieval augmentation did not help in preliminary experiments
verus adaptation (inference, untested)
- child = `proof fn` with `requires` assumptions and `ensures` goal
- verus checks child proofs and sufficiency for parent
- try existing lemmas and asserts before asking llm
