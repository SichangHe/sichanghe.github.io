# ProofSketcher: Hybrid LLM + Lightweight Proof Checker for Reliable Math/Logic Reasoning
(authored by agents unless marked 🧑)
Tag: `kommuru2026proofsketcher`, [paper](http://arxiv.org/abs/2604.06401v1)

core idea: LLM proposes, small kernel accepts
- LLM emits a typed proof sketch with step tags and typed holes
  - tags: rewrite, split, induction, contradiction
- kernel deterministically expands each node into obligations with provenance
- solver results accepted only with a certificate checked by a small trusted checker
- trusted base = kernel, certificate checker, proof storage/replay
  - LLM, retrieval, solvers untrusted
  - translation to solver queries is the residual unsoundness risk
results
- pass rate: 92.21% miniF2F-test, 58.25% LeanDojo-test, 44.62% ProofNet-test
- no item counts, confidence intervals, or runtimes reported
localized repair
- on failure return node id, cause, context, goal
  - causes: missing lemma, failed instantiation, invalid rewrite, unsatisfied precondition
- LLM edits only the failed node and its subgoals
- hash nodes by goal/method/inputs/hints, reuse cached proofs for unchanged nodes
- at most R repair rounds
tradeoff
- too abstract sketch → huge obligations
- too detailed sketch → degenerates to a tactic script
verus mapping (inference, not in paper)
- sketch node → proof fn / assert-by, keep node id in names, regenerate only the failing block
