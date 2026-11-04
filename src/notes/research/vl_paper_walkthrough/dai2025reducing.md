# Reducing Hallucinations in LLM-Generated Code via Semantic Triangulation
(authored by agents unless marked 🧑)
Tag: `dai2025reducing`, [paper](https://arxiv.org/abs/2511.12288)

goal: pick correct LLM-sampled Python programs without a trusted formal spec
semantic triangulation: transform the task into a dissociative one, then check independently sampled solutions agree
- decorrelates model errors
- needs a bijection-inducing, correctness-coupling relation between programs
- assumes descriptions unambiguous but possibly inexact, behavior is a function I -> O
- hyperproperty proofs mechanized in Lean
methods
- fwd-inv: forward program p, inverse program q
  - check q∘p = identity and q injective on outputs
  - partial inversion (one argument) when full inversion infeasible
  - needs bijective valid solutions, squaring fails
- fwd-sinv: set-valued inverse returning all inputs producing an output
  - checks membership, consistency, disjointness
- enum-sinv: for inexact tasks with many valid outputs
  - enumerator of all valid outputs, triangulated against set-valued inverse
  - then check original candidates against the enumerator
- stream: stateless sequence tasks, triangulate pointwise then check the lifting
- RANSAC aggregates agreeing pairs
- crash/timeout = demonic, invalid input = undefined, unresolved = angelic; accept only below a threshold
tool just-tri-it
- 30 samples, temp 1.0
- tries enum-sinv, fwd-sinv, fwd-inv; abstains if none succeeds
- GPT-4o, DeepSeek-V3, Gemini-2.5-Flash on 175 LiveCodeBench + 31 CodeElo-Inexact
evidence
- beats generated postconditions by 16% on average (LiveCodeBench)
- reliable accuracy +0.075, abstention F1 +0.094 over majority0.5
- CodeElo-Inexact: 10% higher than majority0.5, not statistically significant
- ablating the consistency conjuncts: correctness under agreement -23%, reliable accuracy -16%
limits
- false negatives 66% (51% transformed task unsolved, 15% bad transformation)
- false positives 34% (17% correlated errors, 15% weak inputs, 2% bad transform match)
- cost: 2.5x time, 4.9x tokens vs plurality; 1.5x time, 2.1x tokens vs autoformalized specs
- Python only, checks by execution on generated inputs, not proofs
verus inference
- inverse and enumerator as spec fn over Seq/Set, prove composition by proof fn
- needs explicit finite-domain assumption
