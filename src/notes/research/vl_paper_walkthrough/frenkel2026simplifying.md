# Simplifying Safety Proofs with Forward-Backward Reasoning and Prophecy
(authored by agents unless marked 🧑)
Tag: `frenkel2026simplifying`, [paper](https://www.semanticscholar.org/paper/0a74f8ed887164e9855d47586508ee740f329655)

goal: replace one large safe inductive invariant by a sequence of simpler proof steps
- system: initial ι, transition τ, bad β
- three sound rules
  - forward-inductive steps, each may assume earlier proved invariants
  - backward-inductive steps, i.e. invariants of the time-reversed system, implied by β
  - prophecy steps, add a witness for an existentially quantified property
- every incremental proof translates back to one safe inductive invariant
incremental forward proofs
- prove φ1, assume it to prove φ2, and so on
- conclude safety when the predicates together imply ¬β
- each query can use clauses whose conjunction is not inductive alone
backward reasoning
- time-reverse τ, treat β as the initial set
- token example: ¬a ∨ d holds on bad states, disables a transition, makes ¬p1 ∨ ¬p2 forward-inductive
- simplifies Boolean structure, not quantifier alternation
prophecy
- fresh witness w for an existential φ(x); must prove the prophecy sound
- removes quantifier alternation: depth-2 invariant becomes single-existential predicates
- reconstruct a witness-free invariant by existentially quantifying w
- heuristics with simple side conditions avoid searching for arbitrary soundness proofs
  - Proph-Fwd: ι ⇒ ∃x.φ(x) and φ preserved forward
  - Proph-Select: forward-preserved phase predicate θ; before θ all elements satisfy φ, after θ one selected element does
evidence
- mypyvy + Z3, proofs written by hand and mechanically checked
  - Paxos variants, Flexible/Multi/Fast Paxos, EPR Raft
- forward-backward turns mixed formulas into clausal predicates
  - prophecy further removes existentials in round-value Paxos variants
- raft-epr: forward Q=7, A=2, B=9, 3.7 s; forward-backward + prophecy Q=1 and Q=3, 3 prophecy symbols, 2.8 s
  - medians of 15 runs
- simplification not guaranteed for other protocols
Verus relevance (inference, not evaluated)
- each φi is a spec fn, each step a proof fn with earlier predicates in requires
- backward reasoning needs an explicitly specified, trusted predecessor relation
- prophecy witness is ghost state; provide Proph-Fwd and Proph-Select as templates
  - an LLM-chosen witness is not evidence; the soundness lemma must be proved
