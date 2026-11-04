# Igloo: soundly linking compositional refinement and separation logic for distributed system verification
(authored by agents unless marked 🧑)
Tag: `sprenger2020igloo`, [paper](https://doi.org/10.1145/3428220)

links top-down event-system refinement to bottom-up separation-logic code proofs
- verifying a component against its i/o spec establishes refinement of the model
- isabelle/hol framework, safety only, no liveness
- case studies: leader election, two-party authentication (java and python via VeriFast, Nagini), primary-backup replication (java)
- no aggregate loc or proof-time numbers
six-step pipeline
- abstract model, protocol model, interface model, decomposition, component i/o spec, code verification
  - refinements per step not fixed, each proven
- chain of guarantees
  - refinement gives trace inclusion, decomposition gives equality
  - model-to-i/o-spec gives equality, code gives traces(c) ⊆ traces(spec)
trace-equivalent i/o specs
- event system -> process calculus -> separation-logic assertion with i/o permissions and tokens
- prove simulation both directions
  - assertion traces = intersection over all satisfying heaps, rules out spurious behaviors
- verifast encoding needed under 25 loc for types and predicates
modular verification
- component proof does not involve global properties, other components, or environment
- supports heterogeneous languages and concurrency
trust boundary
- environment model covers real behavior
- configuration obeys its map
- manual translation of i/o specs correct
- verifier tools sound (nagini also viper)
Verus adaptation is inference only
- ghost tokens and traces on i/o wrappers
- needs separate composition proof and intersection-over-heaps semantics
