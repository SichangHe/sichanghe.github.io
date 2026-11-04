# Safety Verification of Declarative Smart Contracts
(authored by agents unless marked 🧑)
Tag: `chen2022safety`, [paper](http://arxiv.org/abs/2211.14585v3)

dcv verifies safety of declarative smart contracts (deCon) by induction over unbounded transactions
- deCon contract = relational tables + datalog-like rules, compiled to Solidity
- dcv is Scala + Z3, needs no developer annotations
- trusted: deCon-to-Solidity compiler is not verified
- only works on deCon, no inheritance or inter-contract calls
- eval: 19 of 20 contracts in ≤ 2s, auction in 58s
  - benchmarks were modified (recursion dropped, assembly replaced), so not arbitrary Solidity
encode contract as transition system ⟨S, I, E, Tr⟩
- state = valuation of all tables, each transaction = one atomic step
- violation query = bad relation nonempty, prop = its negation
- assumes at most 1 new tuple per rule per transaction, no recursion
  - keeps transition constraint linear in rule count
prove prop by base case + induction step with Z3
- base: init(s) ⟹ inv(s) ∧ prop(s)
- step: inv(s) ∧ prop(s) ∧ tr(s,e,s') ⟹ inv(s') ∧ prop(s')
- failure returns "unknown"
- prop is often not inductive alone, needs auxiliary inv
  - voting: needs ∀u. wins[u] ⟹ hasWinner
invariant inference: rule bodies are a good source of predicates
- p0 = each body literal of each transaction rule
  - predicates with constants (hasWinner == true) are most informative
- p1 = conjunctions p ∧ q where q shares a variable with p
- templates for candidates
  - ∀x. ¬init(s) ⟹ ¬p(s,x)
  - ∀x. ¬init(s) ∧ q(s,x) ⟹ ¬p(s,x)
- houdini loop: drop candidates refuted by init or by transition, return conjunction of survivors
  - gives strongest invariant expressible as conjunction of candidates
  - incomplete: invariants outside the 2 templates are not found
  - only voting and auction needed invariant generation
for verus agents
- take-away: mine candidate invariant atoms from transition preconditions, then houdini-filter externally
  - verus checks the final invariant, enumeration/deletion loop sits outside
- state-machine invariant proved in init and transition arms
