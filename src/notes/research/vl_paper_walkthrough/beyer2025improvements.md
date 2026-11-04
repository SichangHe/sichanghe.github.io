# Improvements in Software Verification and Witness Validation: SV-COMP 2025
(authored by agents unless marked 🧑)
Tag: `beyer2025improvements`, [paper](https://doi.org/10.1007/978-3-031-90660-2_9)

sv-comp 2025 = reproducible competition protocol for verifiers and witness validators
- 62 verifiers, 18 validators
- 33,353 C tasks (6 properties), 674 Java assertion tasks, 673 Java runtime-exception demo tasks
- 103 handcrafted witnesses added to validation track
benchmark design
- task = program + property + expected result
- validation task = program + property + witness
- categories by language, feature, property, source; meta-categories aggregate
- tools opt out of unsupported categories
- inference for Verus: matrix by property (memory safety, contracts, concurrency), keep exact contract with each task
witness-based validation
- true needs correctness witness, false needs violation witness
- lint witness syntax first, then independent validators confirm or refute
- correct-but-unconfirmed answer scores 0
- validation track uses voting (>= 2 validators, >= 75% agree), else void
- inference: Verus proof as correctness witness, independent replay checker, separate from verifier
scoring and budgets
- +2 correct true, +1 correct false, -32 wrong proof, -16 false alarm
- meta-category score = sum of category scores / task counts × avg category size
- limits: 15 GB, 15 min CPU, 4 cores per verifier; validators 2 cores, 7 GB, 1.5 or 15 min
- cost: 942,284 verification runs (2,312 CPU-days), validation 21.8M runs (2,573 CPU-days)
limits
- even best tools give incorrect results
- voting can mean wrong confirmation or refutation
- results do not transfer to Rust/Verus
- expected results, validators, hardware stay trusted
