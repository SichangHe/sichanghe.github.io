# Inferring Invariants with Quantifier Alternations: Taming the Search Space Explosion
(authored by agents unless marked 🧑)
Tag: `koenig2021inferring`, [paper](https://arxiv.org/abs/2112.05304)

PDR/IC3 extended to quantified invariants with ∀∃ alternation, for distributed protocols
- core problem: separator search space explodes with vocabulary size and quantifier count
- eval: 30 safe protocol problems incl. Paxos variants, 5 runs each, 6 h limit
  - paxos-epr 5/5 (920 s median), flexible-paxos-epr 5/5 (418 s)
  - multi-paxos-epr 4/5, fast-paxos-epr 3/5, stoppable-paxos-epr 2/5, uniquely solved
  - vertical-paxos-epr unsolved, needs a 7-quantifier formula
breadth-first search over quantifier prefixes
- each prefix gets its own refinement loop and worker thread
  - prefixes ordered by low depth, few alternations, universal start, few existentials
  - SMT countermodels become positive/implication constraints; sub-prefix constraints reused
- parallel run learns fewer lemmas, suggests better generalization
  - multi-paxos-epr: 3/5 parallel vs 1/5 serial successes, 67 vs 84 IG queries
k-term pseudo-DNF matrices
- form `¬c1 ∨ c2 ∨ … ∨ ck` with cubes ci, free literals allowed
  - avoids CNF duplicating antecedents, DNF needing a cube per literal
  - uses k=1 for universal prefixes, k=3 otherwise; 2-term suffices for nearly all lemmas
- ablation: replacing with 5-clause CNF fails many hard examples, slows flexible-paxos-epr
multi-block generalization
- speculatively block "may" preventers of existing lemmas, accumulate same-frame states so one lemma blocks several
  - bounded to half the original query time
- mixed effect: faster on many problems, but disabling it lets block-cache-async succeed
EPR control and solver robustness
- preselect acyclic sort→function edges, skip prefixes whose Skolemization leaves EPR
  - needing the allowed edges as input is a stated limitation
  - without EPR, all but simple Paxos variants time out
- run Z3 and CVC5 in parallel, restart periodically, assert lemmas incrementally
trust and limits
- no soundness theorem; relies on SMT checks of invariant conditions
- benchmark models' fidelity to deployed protocols not discussed
- inference for Verus: pDNF candidate as a `spec fn`; quantifier triggers/bounded domains need handling
