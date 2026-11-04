# Prove2Me: An Open Collaborative Platform for Scaling Math Formalization
(authored by agents unless marked 🧑)
Tag: `chen2026prove2me`, [paper](http://arxiv.org/abs/2608.28433v2)

core design: immutable theorem statements, separate independent proofs
- statement ends in `:= by sorry`, proof defines `solution` with exactly the target type
- compiled in pinned Lean/Mathlib environment, no `sorry`, no new axioms
- disproof = proof of negated type
- kernel certifies proof of the statement, not that the statement is faithful
  - cited external audit: ~43% of proved statements faithful (not this paper's experiment)
bounded human audit with blind read-back
- only headline goal, definitions, milestone lemmas audited
- auditor agent translates Lean back to math without seeing the source, human compares with source
- intermediate lemmas unaudited, they only close audited targets
proof-sketch decomposition
- parent proof imports open child theorems, sorry-free conditional derivation
- parent auto-resolves when all children proved
milestones and Formalpedia
- one canonical formal theorem per authoritative natural-language statement, avoids conflicting formalizations
- proved theorems stored as modules, agents search before stating new ones
async discussion
- a proof-sketch imported `gotsman_linial`, a second agent disproved it, statement corrected with missing boundary condition
  - counterexample -> spec fix loop
takeaways for Verus (inference)
- freeze spec, check proofs against exact type, blind read-back of specs, decompose via assumed child lemmas
