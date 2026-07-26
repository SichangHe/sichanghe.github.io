# 🤖 Agave verification sizing and pilot scope

This records the July 2026 public-source sizing study. It is planning evidence,
not a security finding, audit, defect hunt, or whole-validator verification
estimate

## takeaways

- Agave is too large and mixed to price as one verification job
  - pinned Rust total: 531,500 code lines
  - path-classified production: 450,054 lines
  - inline tests make test-free production conservatively
    69,606–450,054 lines
- a useful first Agave target is the compute-budget instruction sanitizer
  - exact pre-test boundary: 349 production lines
  - exact goal: equivalence to an independent left-to-right model for malformed
    and duplicate errors, defaults, validation, and clamps
- the best related-project pilot is Address Lookup Table state views
  - exact pre-test boundary: 119 production lines
  - exact goal: immutable and mutable indexed views agree for every
    0–256-address well-formed buffer and every `u8` index
- both are better first targets than end-to-end consensus or networking
  - they are synchronous, bounded, and have explicit observable results
  - they avoid distributed liveness, adversarial timing, transport, and
    cryptographic implementation in the proof boundary

## pinned basis and count

- repository: <https://github.com/anza-xyz/agave>
- default branch: `master`
- commit:
  [`88345aa0e6c3ef985d59f9e7a4e7350cf1b48b93`](https://github.com/anza-xyz/agave/commit/88345aa0e6c3ef985d59f9e7a4e7350cf1b48b93)
- retrieval completed: `2026-07-26T14:09:01Z`
- counter: Tokei 13.0.0 over paths from `git ls-files -z`
  - code lines exclude blanks and comments
  - dependencies, build output, untracked files, and macro expansion are
    excluded
- Cargo root workspace: 125 members
  - repository total: 199 tracked manifests, 197 package manifests

Rust inventory:

- production-classified: 1,060 files, 450,054 code lines
- tests and dedicated test support: 92 files, 70,091 lines
- benchmarks and examples: 59 files, 9,387 lines
- generated or vendor: 4 files, 1,968 lines
- total: 1,215 files, 531,500 lines
- non-Rust Tokei code: 40,047 lines
  - configuration and data are included
  - a narrower implementation/protocol subset is 16,357 lines

## production/test uncertainty

- mixed source files remain in their path category
  - 533 production-classified files contain exact `#[cfg(test)]`
  - 546 contain a detected test gate or test attribute
  - those mixed files contain 380,448 code lines
- the production number is therefore a ceiling
  - possible inline-test contamination: 0–380,448 lines
  - possible test-free production: 69,606–450,054 lines
- the bound is deliberately loose
  - it avoids pretending that a path classifier is an AST-level split
  - the per-file ledger supports alternate classification rules

## bounded effort tiers

Assumption: experienced Rust verification engineers, a selected verifier that
supports the pinned source, and part-time Agave domain review. The ranges exclude
fixing findings, proving dependencies, and upstream review delay

- arithmetic fee leaf: 9 production lines, 1–2 engineer-weeks
  - proof/harness: 0.5–1 week
  - integration/tests: 0.5–1 week
- compute-budget instruction sanitizer: 349 lines, 5–8 weeks
  - proof/harness: 3–5 weeks
  - integration/tests: 2–3 weeks
- complete compute-budget conversion: 582 lines, 9–15 weeks
  - proof/harness: 6–10 weeks
  - integration/tests: 3–5 weeks
- compute budget plus cost tracker: 1,440 lines, 18–30 weeks
  - proof/harness: 12–20 weeks
  - integration/tests: 6–10 weeks

These bands do not extrapolate to consensus, replay, scheduling, transport, or
the whole validator

## smaller related candidates

- Solana SDK
  - pinned total Rust: 48,208 lines
  - production-classified: 45,375 lines; root workspace: 112 members
  - the project calls itself the “Rust SDK for the Solana blockchain, used by
    on-chain programs and the Agave validator.”
  - broad unsafe-memory, signature/hash, serialization, and feature surfaces
    make a repository-wide pilot unattractive
  - sources: [README](https://github.com/anza-xyz/solana-sdk/blob/7e47b43ea08dc3b3db03766c165d725a05e1819a/README.md),
    [security policy](https://github.com/anza-xyz/solana-sdk/blob/7e47b43ea08dc3b3db03766c165d725a05e1819a/SECURITY.md)
- SPL Token
  - pinned total Rust: 15,423 lines
  - production-classified: 5,360 lines; tests: 10,063 lines
  - the program is compact but has stateful authority/balance transitions and
    explicit unsafe memory operations
  - its policy places `spl-token` in bounty scope
  - sources: [repository](https://github.com/solana-program/token/tree/cd5cdc8d35a854c3dde4b673fabd7570b20aab0d),
    [security policy](https://github.com/solana-program/token/blob/cd5cdc8d35a854c3dde4b673fabd7570b20aab0d/SECURITY.md)
- Address Lookup Table
  - pinned total Rust: 3,541 lines
  - production-classified: 898 lines; generated/vendor: 1,618 lines
  - the hand-written program has no observed unsafe, async, network, or
    cryptographic implementation
  - its policy places the on-chain program in bounty scope
  - sources: [state code](https://github.com/solana-program/address-lookup-table/blob/463f638742e707930a57ad6e1309caba8a8f4135/program/src/state.rs),
    [security policy](https://github.com/solana-program/address-lookup-table/blob/463f638742e707930a57ad6e1309caba8a8f4135/SECURITY.md)

All maintenance claims are limited to the recorded repository activity. They do
not infer company ownership or policy beyond the linked first-party text

## recommended proof boundaries

Agave:

- source: the 349-line pre-test compute-budget instruction sanitizer ranges
- dependency contracts: Borsh decoding, program-ID tables, feature membership,
  and caller-sanitized instruction indexes
- excluded: execution, cost model, bank, consensus, async runtime,
  cryptography, and networking
- completion: prove model equivalence for every list of length 0–255, every
  instruction value, all four request variants, and feature configurations;
  run differential tests through real dependencies

Address Lookup Table:

- source: `program/src/state.rs` before its test module, 119 code lines
- dependency contracts: `bincode` serialization and `bytemuck` alignment/cast
- excluded: lifecycle processor, authority checks, PDA derivation, slot hashes,
  generated clients, validator integration, consensus, and networking
- completion: prove view/suffix equivalence for every address count, index, and
  byte value under the contracts; test real dependencies and malformed layouts

## durable evidence

The following are local durable links outside the notes repository and are not
part of the deployed site:

- [concise analysis](../../../../sichangheagent/vl_experiments/agave_verification_scope_20260726/analysis.md)
- [Agave machine summary](../../../../sichangheagent/vl_experiments/agave_verification_scope_20260726/evidence/raw/agave-inventory/summary.json)
- [Agave per-file ledger](../../../../sichangheagent/vl_experiments/agave_verification_scope_20260726/evidence/raw/agave-inventory/per-file.csv)
- [pilot source ranges](../../../../sichangheagent/vl_experiments/agave_verification_scope_20260726/evidence/raw/pilot-source-ranges.json)
- [pilot range counts](../../../../sichangheagent/vl_experiments/agave_verification_scope_20260726/evidence/raw/pilot-source-range-counts.json)
- [repository pins](../../../../sichangheagent/vl_experiments/agave_verification_scope_20260726/evidence/raw/repository-pins.json)
- [first-party source record](../../../../sichangheagent/vl_experiments/agave_verification_scope_20260726/evidence/sources.md)
- [consistency result](../../../../sichangheagent/vl_experiments/agave_verification_scope_20260726/evidence/consistency-check.txt)

## unknowns

- the verification tool and dependency-model strategy are not selected
- intended semantics need independent domain review; mirroring implementation
  behavior is not an adequate specification
- tool support for pinned Rust 1.97.1 may change the effort ranges
- repository activity after the recorded commits is outside this study
