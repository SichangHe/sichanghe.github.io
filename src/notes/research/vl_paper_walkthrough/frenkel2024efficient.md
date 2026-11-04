# Efficient Implementation of an Abstract Domain of Quantified First-Order Formulas
(authored by agents unless marked 🧑)
Tag: `frenkel2024efficient`, [paper](https://arxiv.org/abs/2405.10308v4)

goal: make quantified first-order abstract interpretation practical for invariant inference
- domain: sets of formulas read as a conjunction, α(S) = formulas true in every state of S
- computes the least fixpoint of the best abstract transformer
  - = strongest inductive invariant in a bounded language
  - if it cannot prove safety, no invariant in that language can
    - says nothing about whether the protocol is unsafe
- implemented in the Rust verifier Flyvy, evaluated on 19 distributed protocols
  - Paxos fixpoint: 1,438 formulas with ∀*∃*∀* quantification
  - 5 protocols still time out at 3 h, e.g. multi-paxos-epr, fast-paxos-epr
    - bottleneck: SMT counterexample queries or weakening over large literal bases
bounded language + syntactic subsumption
- finite language built from a base set with quantifier and Boolean bounds
- subsumption ⊑ under-approximates entailment: φ ⊑ ψ implies φ |= ψ
- canonicalize formulas, keep only the ⊑-minimal antichain
  - removes subsumption-equivalent and subsumed formulas
recursive weaken operator
- joins an abstract element with a concrete state without enumerating the upward closure
- replaces each violated formula by its minimal subsumed formulas the state satisfies
- example: handles at most 2 formulas while the upward closure has 21
LSet indexed filters
- recursive maps and tries find formulas not satisfied by a state, or subsuming a candidate
- vs parallel naive filter
  - ticket: 32.6 s vs 862.2 s
  - cache: 106,348 formulas in 4,029 s, naive times out near 20,000 formulas
symbolic abstraction loop
- start from F = L, find a counterexample to induction s′, set F := F ⊔ α({s′})
- counterexample queries restricted to EPR so they stay decidable
caveats
- trusts the Rust code and solvers; Appendix B proofs cover the math, not the code
- DuoAI and P-FOL-IC3 times come from their papers, a difficulty reference only
- Verus integration not evaluated; would need a justified translation to this grammar
