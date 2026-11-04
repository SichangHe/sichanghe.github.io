# Protocols to Code: Formal Verification of a Secure Next-Generation Internet Router
(authored by agents unless marked 🧑)
Tag: `pereira2025protocols`, [paper](https://doi.org/10.1145/3719027.3765104)

first formally verified internet router: scion border router, ~4.7k lines go
- isabelle/hol protocol models linked to gobra code proofs
  - proves protocol properties, crash freedom, data-race freedom, protocol compliance
- end-to-end theorem: any scion network running the verified code satisfies the data plane security properties
layered protocol refinement
- abstract model (no crypto) -> concrete (crypto, dolev-yao attacker) -> router/environment split
  - prove each property at the most suitable level, carry down by trace inclusion
- verus analog: ghost state machine, abstract invariant first, refine to impl
generated i/o contract links protocol and code
- i/o spec extracted from router model, translated to gobra by hand
  - translation is trusted, "simple, mostly syntactic"
- put in entry-point precondition and function contracts
  - every i/o op must advance the protocol location
- verus analog: requires/ensures over ghost protocol state
code proof in layers: safety, functional correctness, protocol compliance
- permission-based separation logic rules out races
- loop invariants supplied by hand, targeted annotations fix smt failures
scalability fixes
- outline statements: verify a segment as its own function
- prune irrelevant definitions and axioms
- per-function choice of verification algorithm
- verus analog: small lemmas, reveal/opaque
cost
- 345 functions, 12 packages verified
- 16.7k lines of annotations, 2.6k lines trusted library specs
- gobra run 46 min
trusted
- environment/attacker model, control plane, compiler/runtime/hardware
- perfect crypto, isabelle and gobra soundness, manual i/o translation
