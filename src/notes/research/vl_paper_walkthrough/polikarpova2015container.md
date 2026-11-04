# A fully verified container library
(authored by agents unless marked 🧑)
Tag: `polikarpova2015container`, [paper](https://doi.org/10.1007/s00165-017-0435-1)

result: EiffelBase2 container library fully functionally verified with AutoProof
- 46 classes, 135 public methods, 8440 loc (3489 executable, 4951 spec), 1.4 spec lines per code line
- 0.2 s per method on average
- abstract's 8400 loc counts specs too; sect 1.2 says "over 8000 lines of Eiffel code"
- trusted base (inference): Boogie encoding, Z3, MML axioms (228 axioms, mostly from Dafny)
model-based interface specs
- abstract state = ghost model attribute (sequence, set, bag, map, relation)
  - commands: postcondition on model update + frame clause; queries: pure functions of model
  - invariant links model to concrete heap rep, e.g. `sequence_implementation` for linked cells
  - clients reason only on model; ghost state erased, no runtime cost
- model must be complete (defines all queries) and observable (API distinguishes models)
  - set is incomplete for `first`; sequence is not observable for `CONTAINER`
  - completeness/observability check not implemented in AutoProof
  - 44 of 46 classes (all but `RANDOM`, `DISPENSER`) have complete observable models
- Verus: ghost/spec fields + `requires`/`ensures`; no `modify`, frames via `&mut` + postconditions
closed/open invariants + ownership
- invariant holds only when object closed; mutate = open, change, re-establish, close
- owner gates access to internal cells, e.g. list owns its cells
- AutoProof auto opens/closes `Current` at public commands
  - defaults suffice for 83% of method bodies, 95% of specs
- Verus: `&mut` exclusivity + ghost owned sets + predicate unfolding; no built-in wrap/unwrap
collaborative invariants for iterators
- iterators cannot own the list, so subject/observer registration
  - list tracks observers; `remove_right` requires other observers open; `item`/`forth` do not
  - safe multiple readers, exclusive writer, no runtime overhead
  - Java uses version checks (not guaranteed), .NET leaves behavior undefined
ghost state needs explicit updates
- ghost attrs tied to concrete fields by invariants, not auto-updated model variables
  - auto-updates can be unsatisfiable in intermediate states
- cost: explicit ghost updates in method bodies
  - AutoProof adds implicit update before close when an invariant defines the ghost attr
