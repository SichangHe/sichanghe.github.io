# Counterexample-Guided Prophecy for Model Checking Modulo the Theory of Arrays
(authored by agents unless marked 🧑)
Tag: `mann2022counterexample`, [paper](https://doi.org/10.46298/LMCS-18%283:26%292022)

goal: turn quantified array invariants into quantifier-free ones during CEGAR
- adds history + frozen prophecy variables to the transition system
- tool prophic3 uses ic3ia, MathSAT, custom array-axiom checker
- soundness rests on proof sketches (Thm 4.1, 4.2) + model checker + SMT solver
delayed universal prophecy
- frozen var p_t stands for universally quantified value of term t
- delay n > 0 adds history vars h1..hn passing t forward
- property becomes p_t = t implies P(X)
- example: ∀i. read(a,i)<200 becomes read(a,p_ir)<200
  - invariant keeps the original form, universal quantifier replaced by frozen variable
- may not terminate if no finite set of prophecy vars captures all relevant indices (Sec 5.2)
lazy array abstraction refinement
- start with arrays as uninterpreted sorts, read/write as uninterpreted functions
- run BMC at bound k, instantiate violated array axioms only at indices in the counterexample
  - read-over-write, extensionality, constant-array axioms
- nonconsecutive axiom instances call prophecize with delay k−n_i
- consecutive axioms are lifted into init/transition relation
- loop until unsat (holds to bound) or axiom-free counterexample (real bug)
- assumes infinite index sort so a fresh λ index exists
refinement heuristics
- weak abstraction (equality uninterpreted) is default, gives more prophecy targets
- consecutive axioms first, unsat cores to prune nonconsecutive ones
- keep predicates over prophecy vars when IC3IA mines interpolants
- assume the property in the pre-state when checking first violation
verus relevance (inference)
- ghost index p kept immutable + ghost snapshot ≈ prophecy + history
- helps prove one relevant index, not automatic quantifier elimination
- verus proofs are source-level contracts, so an external invariant synthesizer would emit the ghost lemmas
- final proof must use real Map/Seq axioms
