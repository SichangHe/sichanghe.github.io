# Sound State Encodings in Translational Separation Logic Verifiers
(authored by agents unless marked 🧑)
Tag: `ling2026sound`, [paper](https://www.semanticscholar.org/paper/af8cceb2084817ddf8a4c4fd51c36dd78f686754)

first framework proving soundness of translational separation logic verifiers with non-trivial state encodings
- mechanized in Isabelle/HOL, Viper-style IVL semantics
- instantiated for 3 encodings: rational permissions as reals, lazy fields, immutable heaps as positive fractions
- violated requirements explain previously reported bugs in Prusti, Nagini, VerCors
- trusts: Isabelle/HOL, IVL back-end soundness, each front-end's primitive rules
- no benchmarks, evidence = proofs + counterexamples
state encoding is a relation, not just a function
- source state ~ IVL state, since one source resource can have many valid IVL representations
  - e.g. duplicable immutable resource maps to any positive fraction
requirement 1: encoding must be homomorphic
- `J w1 + w2 K = J w1 K + J w2 K`
- counterexample: counting permission `k*eps` encoded as `1 - 1/2^k`
  - two halves compose to full permission, IVL rejects 3 aliased args that source allows
  - so IVL verifies an incorrect program
requirement 2: backward satisfiability, prevents spurious splitting
- every IVL state satisfying a translated assertion needs a source witness with no larger encoding
- spurious split: IVL splits a state in ways no source state can
  - binary permission as arbitrary fractions: full permission splits into two halves
  - 3 magic wands satisfiable fractionally, not with binary permissions
  - rational amounts encoded as reals can pick irrationals
- points-to and pure assertions satisfy it, general magic wands do not
Verus takeaway (inference)
- abstraction `spec fn` + lemma that abstraction commutes with composition
- reject ghost states without a concrete witness
