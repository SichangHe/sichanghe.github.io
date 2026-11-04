# Predicate Subtypes in VerCors
(authored by agents unless marked 🧑)
Tag: `dubbeling2026predicate`, [paper](https://doi.org/10.4204/eptcs.444.6)

predicate subtypes in VerCors: base type + boolean predicate, e.g. `NonZero`, `NonNull`, `Index(len)`
- rewritten to ordinary contracts before viper
  - input subtype -> precondition, result subtype -> postcondition
  - assignment -> assertion after the assignment (avoids evaluating side-effecting rhs twice)
  - cast -> assert target predicate
- claim: range/null specs generated automatically
  - no benchmark or pass rate, only encoding, examples, prototype
- predicates compose: conjunction (adjacent names), `|`, `==>`, `!`
- strict subtypes check every intermediate arithmetic subexpression
  - `(x-2)+2` in range 0..128 fails on `x-2`
  - `--strict-arithmetic` bounds java int to 32 bits; other widths unimplemented
- limits
  - prototype supports java and pvl, not c
  - predicates inlined, so error locations can lose the subtype annotation
for verus
- inference: `spec fn` predicates + `requires`/`ensures`/`assert`/loop invariants give the same effect
  - no automatic rewriting, needs a macro or ast pass
