# Who Verifies the Verifiers? A Computer-Checked Implementation of the DPLL Algorithm in Dafny
(authored by agents unless marked 🧑)
Tag: `andrici2020verifies`, [paper](http://arxiv.org/abs/2007.10842v1)

verified DPLL SAT solver in Dafny: soundness, completeness, termination
- first assertional DPLL proof (claimed); unit propagation, fast data structures, MOMS heuristic
  - no back-jumping, clause learning, restarts
- trusted gap: DIMACS parser verified only for memory safety, no spec
- 3,088 lines Dafny: 600 code, 2,488 spec/proof, ~4:1 proof:code ratio
  - ~13 min whole-project verification, `solve` ~175 s
  - ~1.5 years part-time, first author learned Dafny meanwhile
ghost/runtime pairing
- runtime arrays plus ghost set `assignmentsTrace`, erased at runtime
- class predicate `valid` as pre/postcondition of every method
- Verus analog (inference): `Vec` plus ghost `Seq`/`Set`, `spec fn valid`
cached indexes proved against spec functions
- true/false literal counts and variable-to-clause reverse indexes equal `countTrueLiterals`
- each update proved to touch only clauses in the reverse index
small local contracts for state ops
- ops: increase decision level, set variable, set literal (unit propagation), revert layer
- `setLiteral` variant: unset-variable count decreases per recursion
- small contracts limit solver context, useful for LLM proof search (inference)
recursive branch proof
- `solve` postcondition: SAT iff current assignment extends to a model; state restored on exit
  - undo even on SAT to keep contracts short
- `step` split out of `solve` to cut verification time
- branch lemma: sat(tau[l:=true]) implies sat(tau)
machine integers only after bounds proofs
- Int32 ~10x faster than unbounded ints
  - compares two paper versions that differ in other ways
proof-engineering rules for solver scalability
- avoid nested loops
- factor nested quantifiers into named predicates
- use very small methods, minimal modifies/reads
- verify one method at a time during development
- Z3 axiom profiler does not scale to this size
