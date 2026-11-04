# DuoAI: Fast, Automated Inference of Inductive Invariants for Verifying Distributed Protocols
(authored by agents unless marked 🧑)
Tag: `yao2022duoai`, [paper](https://www.usenix.org/conference/osdi22/presentation/yao)

infers inductive invariants incl. ∃ quantifiers for Ivy protocols, successor of DistAI
- runs top-down weakening and bottom-up strengthening in parallel, first to finish wins
- 26 of 27 protocols solved, vertical Paxos fails
  - Paxos 60.4s vs SWISS 16,665s
sampled states only propose candidates
- Ivy/Z3 checks inductiveness, sample-valid formula is never a proof
- check on full variable-length samples, avoids incomplete subsampling for ∃
minimum implication graph
- DAG over bounded prenex/DNF formulas, edge = immediate weaker formula
- every correct invariant in the bounded space is a candidate or has a stronger ancestor candidate
- failed candidate is weakened along successors, not discarded
bottom-up refinement
- prove universal core first, then try small noncore subsets
  - avoids feeding hundreds of alternating-quantifier formulas to Z3
limits
- fails if protocol not verifiable in the decidable fragment
Verus
- ∃ witnesses need explicit ghost witness objects, never `assume` existence
