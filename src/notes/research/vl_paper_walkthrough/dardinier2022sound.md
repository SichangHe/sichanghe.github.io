# Sound Automation of Magic Wands
(authored by agents unless marked 🧑)
Tag: `dardinier2022sound`, [paper](https://doi.org/10.1007/978-3-031-13188-2_7)

problem: packaging a magic wand `A -* B` needs a footprint, a state that combined with any compatible `A` state gives `B`
- VerCors asks the user for the footprint
- Viper's prior algorithm (FIA) infers it unsoundly
  - it can pick a different footprint per case split
- wands matter for borrowed structures, e.g. the remainder of a data structure after taking a borrowed reference
package logic: parameterized, proved sound and complete in Isabelle/HOL
- parameters: separation algebra, assertion language, allowed footprints
- state is a witness set of pairs `(sigma_A, sigma_B)`
  - `sigma_A` is the still-available part of an `A` state
  - `sigma_B` is the part assembled toward `B`
- 4 reduction rules: Implication, Star, Atom, Extract
  - Atom moves part of `sigma_A` into `sigma_B`
  - Extract moves a stable state from the outer state into every `sigma_A`
  - footprint = everything extracted from the outer state
- classical SL additionally needs all permissions consumed; intuitionistic SL does not
standard-wand algorithm: sound, same annotation overhead as FIA
- walk `B1 * ... * Bn` left to right
  - all witnesses satisfy `Bi`: Atom
  - otherwise fail if outer state is insufficient for some witness, else Extract then Atom
combinable wand `A -*c B`: for fractional permissions
- standard wands do not recombine under scaling
  - example `acc(x.f, 1/2) -* acc(x.g)`: half permission to both fields is not a valid footprint
- footprint must be scalable: compatible with all scalings or none
- `A -*c B` entails `A -* B`, and equals it when `A` is binary
evidence on Viper tests: 85 files with package, 29 removed for unsupported features, 56 left
- expected results: FIA 55 (1 unsound), S-Alg 51 (5 spurious errors), C-Alg 48 (8 spurious errors)
- S-Alg 21% slower than FIA on average, C-Alg 10% slower than S-Alg
- soundness rests on the Isabelle proof, not on the benchmark
- spurious errors are mostly missing implementation features
boundaries
- theorems assume a well-formed (self-framing) `B`
- Viper, Boogie, SMT solver not proved correct
- Verus has no wand or fractional permissions
  - a Verus analogue needs ghost permission tokens and explicit split/recombine lemmas
