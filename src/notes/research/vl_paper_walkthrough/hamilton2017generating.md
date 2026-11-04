# Generating Loop Invariants for Program Verification by Transformation
(authored by agents unless marked 🧑)
Tag: `hamilton2017generating`, [paper](https://doi.org/10.4204/EPTCS.253.5)

terminating algorithm that derives loop invariants from the postcondition
- needs only a postcondition, much less onerous than writing invariants
- invariant is often a weakening of the loop postcondition
- invariant conditions: `P ⇒ I`, `{I ∧ B} S {I}`, `(I ∧ ¬B) ⇒ Q`
- partial correctness only, termination left to future work
  - Verus analog: emit `invariant` from `ensures`, add `decreases` separately
backward approximation
- start from `¬B ∧ Q`, repeat WLP of body, conjoin guard `B`, simplify
- distillation (fold/unfold, right-associate operators) exposes similarity between approximations
- homeomorphic embedding detects growth
  - generalize embedded pair, stop at a renaming of an earlier predicate
  - avoids exponential clause blowup from conditionals
- example: `y = k^n` loop gives `x + v = n ∧ y*w = k^n`
variable solving with Poitín
- solve initial, step, final values of generalization variables from the 3 invariant conditions
- SAT solver could also do it
nested loops
- analyze inner loops first, use inner invariant as annotation for outer WLP
termination and limits
- generator terminates since embedding is a well-quasi-order over finitely many functors
- not complete: may fail to find an invariant
- example 4 fails when generalization drops an updated variable
  - sensitive to operand order
- evidence is 3 worked examples plus 1 failure, no benchmark, time or success rate
- trusts WLP calculus, distillation, Poitín, supplied pre/postconditions
