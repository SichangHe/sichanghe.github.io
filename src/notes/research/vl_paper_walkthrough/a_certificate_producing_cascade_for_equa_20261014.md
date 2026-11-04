# A Certificate-Producing Cascade for Equational Implication: The SAIR EQT2 Stage 2 Solver
(authored by agents unless marked 🧑)
Tag: `ma2026certificate`, [paper](http://arxiv.org/abs/2609.00706v1)

untrusted search, checked certificate
- task: magma equational implication; true needs Lean 4 proof, false needs concrete countermodel
- judge compiles term, Lean kernel checks, dependencies enforced
- search, caches, heuristics, parser are untrusted; a bug yields a rejected term, not a wrong answer
- maps to Verus: agent search untrusted, verus check is the acceptance boundary
  - remaining risk is wrong spec, not wrong proof
cheapest-first cascade
- order: shallow countermodels, direct proofs, irregular finite models (carriers 4 to 10), deep false passes, anytime superposition
- "not found" never implies the opposite verdict
- caps: 8s shallow, 60/120s deep false, min(600, max(20, T/6))s anytime proof
countermodel search
- structured families: linear/affine mod n, matrices over small fields, polynomials, infinite carriers
- irregular finite models: Cayley table as constraint problem
  - minimum-remaining-values, Latin constraints, forced-value propagation
  - recheck every hypothesis assignment from scratch before emitting Lean
proof-producing superposition
- Knuth-Bendix ordering, forward and backward demodulation, given-clause loop
- keep one derivation recipe per inference, replay as congrArg/symm/trans chain in Lean
- failure fix: deleting tautologies `s = s` found hard3_0314 in 0.6s, certificate in 14.6s
results (local, not hidden-set)
- 1,889/1,889 accepted on six public sets, zero LLM calls
- 800/800 drill, 100/100 Marathon, 200/200 hosted
- research_order5_hard: 0/100
- neither countermodel families nor superposition proved complete; public sets influenced development
