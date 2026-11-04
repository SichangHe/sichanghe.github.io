# Formal Semantics and Formally Verified Validation for Temporal Planning
(authored by agents unless marked 🧑)
Tag: `abdulaziz2022formal`, [paper](https://arxiv.org/abs/2203.13604)

verified plan validator for temporal PDDL 2.1, in Isabelle/HOL
- main theorem: `check-plan` returns valid iff the plan is valid per the declarative semantics (Def. 6)
  - validator checks plans, does not find them
declarative reference semantics, not an algorithm
- Fox and Long's validity definition is too close to an operational algorithm, so hard to formalize
- validity over states, preconditions, add/delete effects, invariants, pairwise non-interference
  - plan valid if a state sequence from init is valid and ends in goal
- invariant snap actions may sit anywhere between consecutive happenings, more general than exact midpoint
stepwise refinement to executable code
- 2 steps: abstract specs to algorithms on sets (Algorithm 1), then sets to balanced trees
  - 2nd step automated by Isabelle Containers Framework
- `simplify-plan` builds the induced happening sequence: start, end, invariant snaps
- lemmas 1-3 plus theorems 1-2 bridge algorithm to semantics
  - lemmas 2 and 3 are one-line proofs from definitions
evidence
- agrees with VAL on all IPC 2014 test cases (plans from ITSAT, Temporal Fast Downward)
- slower than VAL but under 1 s per plan
trusted base, stated or inferred
- parser is trusted, no proof it recognizes the grammar
- inferred: Isabelle kernel, code generator, SML parser library, grounding of PDDL
- no fixed minimum separation epsilon between interfering actions, rational arithmetic
takeaway for Verus
- inference: spec fn for declarative validity, executable checker with ensures tying result to spec
  - an equivalence theorem cannot repair a wrong semantic definition
