# Code2Inv: A Deep Learning Framework for Program Verification
(authored by agents unless marked 🧑)
Tag: `si2020code2inv`, [paper](https://doi.org/10.1007/978-3-030-53291-8_9)

code2inv = neural policy that learns loop invariants by querying a proof checker (cegis)
- policy samples candidate from a grammar, checker accepts or returns counterexample
- reward = fraction of accumulated counterexamples satisfied
  - 0/1 reward too sparse, most candidates are insufficient
- policy-gradient update
policy design
- 2 gnns (task graph, grammar graph), gru for context, tree-lstm for partial invariant
- c task graph: ssa ast + control-flow + data-flow edges
- grammar placeholders (VAR, CONST, OP) bind to task nodes by attention
- changing grammar retargets domain, e.g. non-linear arithmetic
- checker is a black box, policy is untrusted
results
- 133 sygus c programs: fewer z3 queries than other solvers
- transfer: pretrained weights speed search on 100 perturbed variants per program (90/10 split)
  - synthetic only, no aggregate number
- chc: solves 94/120 vs spacer 112, lineararbitrary 118
- 7 non-linear chc: 5/7 vs 0/7 for both baselines
- solutions more natural, less overfit to constants
  - post-processing and naturalness regularizer proposed, not evaluated
limits
- 90% of solved instances take up to 2 h, rest up to 12 h
- slower than contemporaries
- no multiple loops, function calls, or recursion
takeaways for verus
- inference: score candidates by discharged obligations
- inference: seed search from transferred candidates, always recheck
- inference: timeout is never proof, give it negative reward
