# Cooperative Verification via Collective Invariant Generation
(authored by agents unless marked 🧑)
Tag: `haltermann2020cooperative`, [paper](http://arxiv.org/abs/2008.04551v1)

CoVerCIG: master verifier delegates loop-invariant generation to unchanged black-box helpers
- helpers run in parallel without cooperating
- exchange format is the correctness witness
  - adapter converts helper output to witness; mapper rewrites the property encoding
  - SeaHorn returns only a Boolean, so an adapter maps LLVM-IR invariants and blocks back to C variables and locations
- master runs alone first, requests help after timer `timerM` (50 s best), helpers get 300 s
- injected invariants only help prove safe tasks, cannot refute
  - k-induction master: validate witness before adding invariants
  - predicate abstraction master: split conjunctions into predicates
- Verus analog
  - agents propose `invariant` clauses, Verus validates, only validated facts feed the next attempt
  - C witness format and adapters do not transfer directly
results on 342 SV-COMP 2020 tasks
- k-induction master: 146 alone, 148 / 158 / 163 with SeaHorn / UltimateAutomizer / VeriAbs
- predicate abstraction master: 116 alone, 122 / 132 / 125
- no extra false results
- best single helper gives +12% (k-induction) and +14% (predicate abstraction)
- two helpers help predicate abstraction only: UA + VeriAbs 136 (+17%)
- all three helpers together do worse (154, 129) because they share CPU
- waiting for all helpers generally does not pay off
limits
- empirical on a sample, may not carry to real-world programs
- trusts masters, helpers, adapters, MathSAT5, benchmark labels
- tools may be tuned to SV-COMP
