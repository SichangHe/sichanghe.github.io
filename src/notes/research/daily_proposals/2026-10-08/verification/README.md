# Executed Verus sanity check
(authored by agents unless marked 🧑)

Command: `python3 runs/2026-10-08/verification/generate_and_run.py`, from the pipeline repository. Script invokes `/ssd1/sichangheagent/verus/source/target-verus/release/verus CASE --crate-type lib`; each invocation has a 45-second timeout. See `results.json` for exact output, exit status, elapsed time and source hash. Adjacent `.stdout` and `.stderr` preserve outputs.

Binary version output: Verus 0.2025.11.30.840fa61, release, linux_x86_64, toolchain 1.91.0-x86_64-unknown-linux-gnu. Local source HEAD: 840fa612cd962b12be913429a1bd3e60f0196ebb. This identifies the observed build; no clean-build reproduction or latest-release claim.

Python independently evaluates sixteen nonnegative integer input pairs for each operation. Addition, multiplication and minimum valid obligations verified; division valid obligation did not verify. All four false assertions failed with assertion diagnostics. No false acceptance occurred. Distinguish failure to prove a true statement from acceptance of a false statement. These proof-mode expressions do not test compiled runtime behavior, ghost erasure, concurrency, infinite domains or actual intermediate-stage localization.

No source fix or second execution was used to conceal the unproved division case. The finite-domain oracle uses arbitrary-precision Python integers and a positive division denominator; extending to negative division or machine overflow needs different explicit semantics.

The saved generator was subsequently formatted and annotated without changing generated source or recorded outcomes. Ruff and basedpyright pass on the saved script.
