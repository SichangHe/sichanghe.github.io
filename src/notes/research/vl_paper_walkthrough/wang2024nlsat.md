# Improving NLSAT for Nonlinear Real Arithmetic
(authored by agents unless marked 🧑)
Tag: `wang2024nlsat`, [paper](http://arxiv.org/abs/2406.02122v4)

clausesmt: improved nlsat (mcsat) for quantifier-free nonlinear real arithmetic, built on z3
- problem: literal decisions ignore how clauses constrain arithmetic variables, causing avoidable conflicts
feasible-set look-ahead
- feasible set = real intervals satisfying a univariate literal (root isolation); clause = union of literals; same-variable clauses = intersection
- nonempty intersection: pick one witness value, choose literals containing it
- empty intersection: fall back to nlsat clause processing + cad conflict analysis
- can increase conflicts; no separate soundness proof given
clause-level propagation
- clause becoming univariate narrows its variable's feasible set
- empty = blocked, singleton = fixed
- two watched variables per clause for eager updates
branching
- blocked first, then fixed, then vsids
- projection order = inverse of assignment order when all atoms are root atoms
evidence
- all 12,134 smt-lib qf_nra instances, 1200 s limit
- solved: clauseSMT 11,005, nlsat 10,732, z3 10,948, cvc5 11,284, yices2 10,984
  - best sat count (5,608); unsat 5,397 below cvc5 and yices2
- look-ahead alone: 10,778 vs 10,732 (lower-degree)
- propagation over vsids: 11,005 vs 10,920
- mixed by category (meti-tarski 6,974 -> 6,960)
code at github.com/yogurt-shadow/ClauseSMT_ASE2025
verus transfer (inference)
- possible heuristic for nonlinear obligations sent to z3
- untested: no verus integration
