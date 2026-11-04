# Interface Generation and Compositional Verification in JavaPathfinder
(authored by agents unless marked 🧑)
Tag: `giannakopoulou2009interface`, [paper](https://doi.org/10.1007/978-3-642-00593-0_7)

learn component interface as finite automaton A over alphabet Σ, use it as assume-guarantee assumption in JPF
- goal: A safe (accepts no call sequence leading to error π) and permissive (accepts every legal sequence)
- Theorem 1: for finite-state M, terminates with safe and permissive A
  - proofs of supporting propositions omitted
L* learner with model-checking teacher
- membership query: is π reachable in lts(w) || M
- oracle 1: π reachable in A || M gives a trace, project onto Σ, return as counterexample
- oracle 2: finds legal words A rejects, checks (π, ok) reachability on completed automata
  - query projected trace against M, if π unreachable A is not permissive
  - if π reachable the counterexample is spurious, backtrack
  - was still a manual step in the implementation
- memoize queries in L* table to avoid repeated model-checker calls
assumption extraction from flight model
- universal environment gave spurious violations, models assumed implicit flight rules
- generated interface made the rules explicit, e.g. lsamRendezvous only after lasJetisson
- discharge: model-check environment with interface as the property
trusted boundary
- guarantee covers finite-state model, L*, correct oracles
- not covered: model matches spacecraft, alphabet complete, implicit rules complete
