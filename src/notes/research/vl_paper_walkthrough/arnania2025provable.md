# From Provable Correctness to Probabilistic Generation: A Comparative Review of Program Synthesis Paradigms
(authored by agents unless marked 🧑)
Tag: `arnania2025provable`, [paper](https://arxiv.org/abs/2508.00013)

2025 thesis surveying 5 synthesis paradigms
- deductive, inductive, sketch/schema, llm, neuro-symbolic
- trade-offs: correctness vs specification burden, search cost vs expressiveness
- no new implementation or benchmark
  - cited numbers come from different systems with no common setup
deductive synthesis: program extracted from a constructive proof of the spec
- needs complete spec; guarantee relative to spec and proof assistant
- examples: KIDS, Coq extraction, Theorema
- verus does not synthesize from proofs, it only checks written contracts
inductive synthesis (PBE)
- dsl restriction (FlashFill), enumeration with observational equivalence, version space algebra
- examples underdetermine the program, generalization "by definition unsound"
CEGIS
- loop: synthesize from examples, verify against full spec, add counterexample
- guarantee only as strong as the verifier
- verus analog: external generator, verus as verifier, failing obligation or test as counterexample
  - verus gives no universal counterexample
PROSE witness functions
- inverse operator semantics push desired outputs down to subproblems
sketch, schema, SyGuS
- holes or grammar plus assertions, solver fills them
- schemas apply only when applicability conditions hold
llm generation
- output is a statistically likely hypothesis, not a proof
- accept only compiled, tested, or verified candidates
- paper flags the correctness impasse, security risks, reasoning deficits
neuro-symbolic
- learned scores reorder symbolic search (DeepCoder)
- library learning via wake/sleep (DreamCoder)
- constrained decoding masks invalid tokens, generate-and-verify with beam search
  - learned guidance changes efficiency, not correctness
implication for verified rust agents
- combine neural proposal, constrained search, tests, verus proofs
- record spec and external-library assumptions (inference, not a finding)
