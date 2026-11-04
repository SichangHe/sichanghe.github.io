# Borrowable Fractional Ownership Types for Verification
(authored by agents unless marked 🧑)
Tag: `nakayama2023borrowable`, [paper](https://doi.org/10.1007/978-3-031-50521-8_11)

goal: reduce verification of imperative programs with references to reference-free functional verification
- combines ConSORT fractional permissions with RustHorn borrow lifetimes
- accepts programs both ancestors reject (`minmax`/`rand_choose`: dynamic alias borrows half ownership)
- all Verus mappings are inference
borrowable fractional types
- `int ref^α,r_B`: lifetime α, ownership r∈[0,1], loan B=(β,s) or none
- r=1 permits write, r>0 permits read
- lender/borrower lifetimes ordered (β<α); cyclic borrows would make ownership sum 2
- rules
  - A-Share: split among same-lifetime aliases
  - A-Borrow: give fraction to a shorter lifetime
  - T-Assign needs Own=1
  - endlft returns the fraction to the lender
- Theorem 1: ownership sum per address ≤ 1
- limits: integer refs only (no nested refs), lifetime inference left as future work, alias annotations needed
- Verus analog: ghost permission tokens with fraction + lifetime; library encoding, not native
prophecy-pair translation
- each ref -> pair `<current, prophecy>`; prophecy = value at end of borrow
- deref: `fst` if r>0, nondeterministic if r=0
- assign updates `fst`, keeps `snd`
- lifetime end inserts `assume(fst x = snd x)`
- invariants
  - TXZ: r>0 ⇒ `fst` holds the current value
  - PFZ: r=0 ⇒ pair holds a prophesied value of a borrower
- alias translation moves current/future values by ownership change
  - soundness via a prophecy chain: each alias's current value = next alias's prophecy; only the last has r>0
- translates all refs; RustHorn only mutably borrowing ones
- Verus analog: ghost struct `{current, prophecy}`; prefer native borrows when they suffice
soundness and evidence
- target safe ⇒ source safe (one direction; not complete)
- hand-translated, checked with MoCHi (Z3, HorSat2)
  - 1.79-4.06x size growth, <0.1-2.7 s
  - small demo set, not a benchmark
- trusted: semantics, annotations, translation, assume encoding, backend solvers
