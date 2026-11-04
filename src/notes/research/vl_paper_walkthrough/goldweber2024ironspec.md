# IronSpec: Increasing the Reliability of Formal Specifications
(authored by agents unless marked 🧑)
Tag: `goldweber2024ironspec`, [paper](https://www.usenix.org/conference/osdi24/presentation/goldweber)

specs are trusted, so a passing proof can hide a wrong spec
- too weak: permits an undesired implementation, hides bugs behind a passing proof
- too strong: rules out desired behavior
- "proving the spec correct is ultimately impossible", developer is the final oracle
- ironspec is a Dafny prototype, 3 parts: asc, stps, mutation testing
- inference: verus contracts need testing independent of the rust implementation, guards against a generated proof of the wrong property
automatic sanity checker (asc) flags unconstrained input/output
- traverses the method ast, tracks which inputs/outputs postconditions touch
  - high: no output constrained or no input-dependent postcondition
  - med: output partly constrained
  - low: postconditions use only part of the input
- example: sort spec proving only ordering permits `return []`, fix adds `multiset(input) == multiset(output)`
- ~300 lines of C#
- 6 open-source verified systems: 5 bugs in 3 specs
  - 1 found by a high flag, 4 by stps from med flags, each in under an hour
- only detects under-constraint patterns, cannot show the rest matches intent
spec-testing proofs (stps) are small proofs on concrete values
- an stp is a proof, unlike a unit test
- 4 classes: usefulness, correctness, provability, counterexample
  - usefulness: intended-valid input satisfies the precondition
  - correctness: intended-invalid output fails the postcondition
  - provability: invalid inputs fail the precondition, valid pairs satisfy both
- failed stp is inconclusive
  - first prove the negation (counterexample stp)
  - only then add proof annotations, else it may be a missing proof step not a spec bug
- results
  - 70 stps on 5 contrived specs: all injected bugs found
  - 30% needed proof help, 1.7 added lines on average
  - 10 bugs overall in the 6 open-source systems
- cost: needs intended-behavior knowledge, hours to days for suites on large qbft/dvt specs
- inference: verus form is standalone `proof fn` lemmas with concrete `requires`/`ensures`
proof-guided mutation testing finds weak specs
- one syntactic mutation at a time, 9 operator kinds (arithmetic, logical, relational, constant, unary, negation, variable, set, heap)
- pipeline
  - drop mutations proved redundant (original ==> mutated for postconditions, reversed for preconditions)
  - vacuity check over the full caller path
  - rerun the full implementation proof, passing means the mutation is alive
  - dag by mutation strength, report only roots
  - build an stp from the difference S - S' of each alive mutation
- results
  - 61 alive mutations, 13 false positives (weakness was intended)
  - daisy-nfsd: 4.3-4.6 min runs, exposed a known weakness
  - qbft: 80-162 min per target
- needs a passing implementation proof, can miss bugs when no mutation survives
- inference: verus port needs a new mutation tool and vacuity analysis
