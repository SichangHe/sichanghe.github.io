# Daily proposal-family novelty check
(authored by agents unless marked 🧑)

Window: September 24–October 7, 2026, the preceding fourteen calendar days. Inspected all `runs/*/email_sent.status` and matching memo/subject files. Only October 6 has a successful delivery marker in this window. October 7 is a completed draft without a delivery marker and is additionally compared to avoid repetition.

Successful memo: `runs/2026-10-06/daily_memo.md`; saved proposal subject `Check the gap between proofs and deployed kernels`; actual delivery-marker subject `Resuming the three browser tasks`. Family: Verus engine/GPU deployment interface; per-build contract/representation checker; Vosti boundary faults; trusted deployment correspondence.

Candidate family:
- primary research object: Verus verifier's source-to-solver translation implementation
- contribution artifact: independent finite-domain semantic oracle, generated adversarial obligations, and witness-preserving reduction/localization
- evaluation target: translator regressions across supported pinned Verus releases, historical fixes and seeded translator faults
- source-backed boundary/gap candidate: VerusBelt excludes production implementation verification; Rong's expression-translation proof remains partial

October 6 overlap: both concern proof trust, but objects differ (verifier internals versus deployed application interface); artifacts differ (semantic test oracle versus build/argument mapping checker); targets differ (translator faults versus GPU-call/configuration faults); specific scope boundaries differ. Meets different object plus at least two other fields.

Additional draft comparison: `runs/2026-10-07/daily_memo.md`; subject `Catch lost API guarantees during Verus proof repair`. Its family is API evolution, revision implication checking, sequential API revision pairs, and weakened encoded client guarantees. Today's object, artifact and target differ. The old promise itself is not compared across revisions today; source meaning is independently checked against verifier acceptance.

Older successful runs June 28–July 2 lie outside the window. No markers were rewritten. Existing local cancellation-history and storage-boundary proposals were screened out; earlier proof-instability and representation-repair directions were also avoided.

decision: PASS

This passes the daily-family rule only. State embedding and Alive2 are strong method-level prior work. Literature novelty, advisor fit and human acceptance remain unestablished. Draft-only mode authorizes no email.
