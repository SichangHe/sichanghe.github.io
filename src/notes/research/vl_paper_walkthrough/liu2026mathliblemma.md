# MathlibLemma: Folklore Lemma Generation and Benchmark for Formal Mathematics
(authored by agents unless marked 🧑)
Tag: `liu2026mathliblemma`, [paper](https://doi.org/10.48550/arxiv.2602.02561)

mathlibLemma: discover, formalize, prove missing "folklore" lemmas for mathlib (library expansion, not solving a given theorem)
- factorized pipeline separates failure sources
  - discovery emits lean statements with sorry, judge rejects false claims before kernel work
  - formalizer repairs syntax via kimina lean server, prover writes proof with up to 2 compiler-feedback repair rounds
  - rationale: end-to-end synthesis entangles hallucination, syntax errors, proof search failure
  - verus analogue: spec fn / proof fn candidates, compile contracts before proof search
- proof-bypass screen on generated code
  - reject sorry, admit, sorryAx, model-introduced axiom, constant, opaque
  - kernel check alone allows imported axioms and placeholders
- closed-book benchmark, no retrieval or browsing
  - 4,028 type-checked statements, 1,506 proved and screened
  - success@2: gpt 15.69%, gpt-reasoning 19.39%, goedel 17.70%, kimina 10.70%
  - union of all models 37.39%, so failures are complementary
- residual human audit of unsolved statements
  - 79/94 (84.0%) proved by experts, dominant failure is missing hypotheses
- upstreaming pilot 3/6 merged into mathlib, 1 redundant
- cost ~$700 total, $0.46 per released proof
  - excludes curation and maintainer review
trust
- lean kernel, mathlib, semantic judge, repaired statement matching informal intent
- syntactic novelty filter leaves semantic restatements
