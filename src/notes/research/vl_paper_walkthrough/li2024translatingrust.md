# Translating C To Rust: Lessons from a User Study
(authored by agents unless marked 🧑)
Tag: `li2024translatingrust`, [paper](http://arxiv.org/abs/2411.14174v2)

user study of human c-to-safe-rust translation, not a formal-verification evaluation
- 33 undergrad security students, 8 programs of 322-536 c lines, 20 days, any tools allowed
  - 31 compiled with no `unsafe`, 26 passed tests with >=85% line coverage on the c source
- evidence = compiler checks, tests, AFL++ differential fuzzing, perf runs, feedback
  - small sample, listed as a threat to validity
none of the 31 translations is equivalent to the c code
- 37-100% of fuzz tests differ per program, 68% average
  - 27/31 differ on more than half of new tests despite high-coverage participant tests
  - differences: i/o encoding, runtime safety aborts, logic
  - translations of the same program often fail the same tests
- known memory bugs (shoco CVE-2017-11367, urlparser) eliminated or caught at runtime
- takeaway: test suites and compilation leave a last-mile correctness gap, motivating specs/proofs
users lift semantics instead of mimicking c
- c pointers become `String`, `Vec`, `Box`, `Option`, arrays, enums
  - 10/17 participants changed their types between first and final version
  - `String` assumes utf-8, may change behavior
- aliasing conflicts resolved by elision (drop the pointer) or cloning
- globals: 19 moved to locals, 11 grouped in structs, 4 atomics, 3 dynamic or thread-local
- unions: byte-punning becomes `to_le_bytes`/`from_le_bytes`, tagged unions become enums
- 31 translations had 1261 reference-like variables, 49.2% owning, 50.8% borrowing
  - temporal safety static for 95.6% owning and 99.7% borrowing
  - 90.9% of borrowing refs may need runtime spatial checks
- perf: 5/8 benchmarks faster in rust, 6/8 under 10% overhead, ~13% average end-to-end
automatic tools fall short
- Laertes averages 95.3% unsafe data references, Crown under 3.1% safe references
- Flourine and Vert give idiomatic snippets but no runnable full benchmark
  - decomposition makes merging independently translated functions hard
for verus
- need explicit policy for which behavior must stay equivalent, including c undefined behavior
  - the paper says "there is no one-size-fits-all strategy to take"
- differential fuzzing finds counterexamples, a proof must establish the contract
