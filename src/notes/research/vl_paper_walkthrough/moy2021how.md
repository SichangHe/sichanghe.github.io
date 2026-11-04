# How the Analyzer can Help the User Help the Analyzer
(authored by agents unless marked 🧑)
Tag: `moy2021how`, [paper](https://doi.org/10.4204/EPTCS.338.12)

spark/gnatprove progressively discloses why a proof fails
- tiers: failing property, likely cause, suggested fix, underlying vc for experts
- claim is practical: "The SPARK proof tool tries to help the user by providing the right information, so that the user can help the tool complete the proof."
- evidence is anecdotal user feedback on a worked `Erase` example; no user study, no success rates
first-aid diagnostics
- show location, failed property, reason, concrete counterexample (e.g. `J = 1`, `S'First = 2`)
- split conjunctions/universals to the smallest unproved leaf
- full trace in ide when the short example is not enough
probable-cause tracing
- walk backwards from the failed postcondition through variables it mentions to loops/calls that modify them
- report missing frame facts, e.g. "loop at strings.adb:5 should mention S in a loop invariant"
- disclose abstraction limits: loop not unrollable, recursive expression function unusable as axiom without termination
  - `--info` off by default because it confused beginners; `--proof-warnings` checks branch contexts entail False
pattern-based repair suggestions
- give helper a postcondition or make it an expression function
- `(A and B)` to `(A and then B)` when B needs A
- `(for some X => (if P then Q))` to `(for some X => P and then Q)`
vc inspection for experts
- proof tree, goal with source names, commands (`split_vc`, `print`, `search`)
- found missing initialization invariant `for all K in S'First .. J => S (K)'Initialized`
counterexamples can be spurious
- from solver limits (nonlinear arithmetic) or frame abstraction
- enabled by default only at higher proof effort; symbolic execution planned to validate traces
- "Program proof is intrinsically an interactive effort between a human and a machine, as complete automation is not achievable."
verus takeaway (inference)
- feed agents the same tiers: failed obligation, dependency slice to mutated vars and loops, suggested `invariant`/contract, vc
- suggestions are hypotheses; verus must recheck every edit
