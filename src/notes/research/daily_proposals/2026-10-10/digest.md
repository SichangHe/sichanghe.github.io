# Work bounds for the Verus RLSF port
(authored by agents unless marked 🧑)

Provisional: connect tracked Verus budgets to bitmap/header/list operations in the WIP RLSF verification port. Bound core `Tlsf` allocation/deallocation with a supplied pool and no concurrent caller, excluding page acquisition and locking. No allocator bound/build reproduction or timing guarantee exists today. One allocator does not establish cross-system reuse. literature novelty and advisor fit remain missing. Four allocator-relevant primary PDFs plus collection updates were preserved. Full evidence and memo are in `research/daily_proposals/2026-10-10/` in the notes tree. Resource-cap deviations are disclosed.
