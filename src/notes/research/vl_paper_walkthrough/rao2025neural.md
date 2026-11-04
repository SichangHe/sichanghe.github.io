# Neural Theorem Proving: Generating and Structuring Proofs for Formal Verification
(authored by agents unless marked 🧑)
Tag: `rao2025neural`, [paper](https://arxiv.org/abs/2504.17017v2)

ProofSeek: autoformalize, generate proof, checker-guided assembly, for Isabelle/HOL
- model: DeepSeek-Math-7B-rl, sft then grpo with proof-checker reward
- three parts: nl to formal statement, llm proof, heuristic proof builder
two-stage training
- sft on 25,054 FVELER pairs plus 1,981 nl triples teaches valid syntax
- grpo on 1,138 pisa-verified proofs, reward 1 if isabelle accepts else 0
- reward measures acceptance only, not spec quality
staged autoformalization
- nl, informal description, informal proof, datatypes/records/functions, theorem
- case: aws s3 policies, 25 curated, 243 generated
- no check that gpt-4o formal statements preserve policy intent
  - appendix example: `policy_allows` ignores the action param, still proves
  - proof checking cannot catch an inadequate contract
checker-guided proof construction
- loop: model proposes step, atp validates, recursive repair (erp), heuristic tactics, backtrack to innermost block
- verus analogue: run verus after every candidate, actions = add assert, strengthen invariant, call lemma
results
- miniF2F: 41.8% with erp, 40.1% without, below the deepseek baseline 42.2% / 41.8%
- generated policies: 66.6% vs 63.3% with erp, 69.1% vs 66.6% without
  - time 20:34 vs 26:52 with erp, about 23% less
  - intro claims 3% gain and 20% time cut, these are percentage points and rough
- authors admit behind sota on benchmarks
- baseline is base model, not rl model, so training effect is confounded
- inconsistent denominators: 245 vs 244 miniF2F problems
