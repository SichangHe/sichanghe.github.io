# PropProof: Free Model-Checking Harnesses from PBT
(authored by agents unless marked 🧑)
Tag: `takashima2023propproof`, [paper](https://doi.org/10.1145/3611643.3613863)

propproof turns Rust proptest harnesses into Kani model-checking harnesses with no code or annotation changes
- fork proptest, keep its API
  - random sources become Kani symbolic values
  - ValueTree mutation loop removed
- result: 42 harnesses from 10 crates (each >= 1M downloads)
  - 2 defects found in AWS PROST, despite fuzzing + PBT in CI
    - timestamp conversion negated `i64::MIN` (overflow), one value in 2^64, so random testing misses it
    - negative nanoseconds with 0 seconds gave invalid `std::Duration`; patch merged
  - same harness re-verified the patch
  - CI deployment: 0 library changes, 20 lines of CI script
  - 2 `metered` harnesses timed out at 1200 s (symbolic loop limit up to 4090)

strategy translation rules keep soundness
- `Union`: symbolic index per strategy, drop zero-probability ones
- `prop_filter`: `kani::assume` of the condition replaces the retry loop
- composite strategies (`prop_compose!`): only inputs need to be symbolic

data-structure models must avoid symbolic loops
- naive `Vec`/`BTreeSet` models make unrolled states blow up
- fixes
  - one init loop with symbolic iteration count
  - pre-allocate to max size
  - BTreeSet: require next element bigger than current, build once
- without them, 2 of 3 tested harnesses ran out of memory at 230 GB
  - third: 232.6 s / 18.9 GB vs 14.4 s / 4.1 GB optimized

limits
- a pass only covers inputs the strategies allow, within the unroll bound
- Kani poison on exceeded bounds refuses verification
- large TCB: library, Kani, CBMC, CProver
- unsupported: async, hash-based structures, arbitrary strings, regex

relevance to Verus (inference, paper has no Verus)
- no symbolic execution API, so `requires`/`ensures` must carry the bounds and property
- avoid loops only to enumerate sizes; spec with seq/set, prove loops with `invariant`
- existing tests are a cheap source of properties to convert into specs
