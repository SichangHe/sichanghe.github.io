# AutoDeduct: A Tool for Automated Deductive Verification of C Code
(authored by agents unless marked 🧑)
Tag: `amilon2025autodeduct`, [paper](http://arxiv.org/abs/2501.10889v1)

infer ACSL contracts for helper functions from an entry-point contract, then check with Frama-C WP
- input: C module whose entry point already has a contract; top-level requirement not inferred
- property-guided: contracts only need to verify the current entry point, may not generalize
  - e.g. saturate infers lim == 10 because that is the only call-site value
functional inference via TriCera
- encode C as Horn clauses, pre/post predicate per called function, extract a model as requires/ensures
- no floats, stack pointers, pointer arithmetic, nested pointers, local statics
- loops supported, loop invariants not inferred
auxiliary inference via Frama-C Eva
- derives value ranges, \valid pointers, assigns clauses
- supports a larger C subset than functional inference; no coverage number
staged pipeline
- -func, then -aux, then -wp, each inspectable
- trust base = WP only
  - verified ⇒ entry point meets its contract and helpers meet inferred ones
  - does not show the contract captures the real requirement
- no repair loop
evidence is one case
- 123-line automotive module (from ~1,400 lines, 2 person-months manual), 5 helpers, 5 requirements
- ~23 s: 18 s functional, 2 s auxiliary, 3 s WP
- no comparison to other tools; timing vs manual effort is not controlled
verus inference
- helper requires/ensures from an entry spec, check with verus
- review call-specific contracts before reuse
- weakest/strongest-condition inference is related work, not an AutoDeduct mode
