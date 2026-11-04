# Passing Proofs That Prove Nothing: Deciding Postcondition Vacuity, Precondition Satisfiability, and Contract Completeness for Rust and Kani
(authored by agents unless marked 🧑)
Tag: `clouthier2026passing`, [paper](https://doi.org/10.5281/zenodo.21865170)

failure mode: proof passes but the contract constrains nothing
- example: kani contract `result.get() > 0` on `NonZero<u32>` holds for any value of the type
  - an implementation returning 1 for every input passes too
- reachability does not catch it, the assertion runs for every input
- tool `vacuity` for rust/kani, 20 lean 4 theorems (14 axiom-free, none use sorry)
  - math is prior work, contribution is mechanizing it plus artifacts
three checks
- postcondition vacuity by return-value havoc
  - assert clause on `kani::any::<ReturnType>()`, proved = vacuous
  - one arbitrary result decides the claim for all implementations (constant-function argument)
  - assumes generator is surjective on admissible results
    - over-covering generator misses vacuity, under-covering over-reports
  - control `result.get() == 1` fails, so green is not an inert harness
- precondition satisfiability by unreachable cover
  - havoc inputs, assume all `requires`, cover a later point
  - unreachable = no input satisfies, every postcondition passes for every implementation
- completeness by wrong-output cover
  - havoc a different output, cover the contract on it
  - satisfied = loose (wrong output passes), unsatisfiable = tight
  - e.g. `*r >= x` is loose for an add-one function
  - kani top line says success in both cases, so report cover status
  - exits non-zero on a finding, usable as ci gate
evidence
- std-lib verification: 124 return-value postconditions, 36 probeable, 88 skipped
- elicitation (4693 files): 946 postconditions, 4 covered, 942 skipped
  - 833 preconditions, 370 covered, 463 skipped
limits
- vacuity is not weakness, tool decides one precise question
- hand-written narrow generators can be wrong, macro-generated functions invisible to syn
- completeness assumes a deterministic contract
verus takeaways (inference)
- audit each `ensures` for implication from return-type invariant alone
- add witness lemma for each `requires`, and uniqueness lemma for tight contracts
- a successful function proof says nothing about whether `requires` is satisfiable
