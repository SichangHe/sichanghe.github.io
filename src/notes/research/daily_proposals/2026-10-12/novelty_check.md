Daily proposal-family comparison
(authored by agents unless marked 🧑)

- window: September 28–October 11, 2026
- all delivery markers inspected
  - only runs/2026-10-06/email_sent.status lies in the window
  - metadata retained in recent_successful_runs.json
- candidate family
  - primary object: unfinished durable recovery work
  - artifact: Verus journal admission and checkpoint interface preserving a recovery-work budget
  - evaluation target: accepted transaction histories with crashes during checkpoint and replay
  - gap hypothesis: composing admission decisions with a bound on complete recovery work
    - source-backed scope boundaries motivate investigation; no liveness gap is claimed
    - absence from prior literature remains unsupported
- successful runs/2026-10-06/daily_memo.md
  - saved subject: Check the gap between proofs and deployed kernels
  - actual marker subject: Resuming the three browser tasks
  - family: GPU deployment correspondence, per-build contract checker, Vosti boundary faults, trusted deployment mapping
  - today's object, artifact and target differ
- additional draft comparisons
  - October 7: Catch lost API guarantees during Verus proof repair
    - object is API evolution, artifact is implication checking, target is paired revisions
    - all three differ from durable recovery work and admission
  - October 8: Test Verus translations against concrete meanings
    - object is verifier implementation, artifact is semantic oracle, target is translator faults
    - all three differ
  - October 10: Work bounds for the Verus RLSF port
    - resource-bound technique overlaps
    - primary object differs: allocator execution versus unfinished durable recovery
    - artifact differs: allocator tracked budgets versus journal admission and durable checkpoint protocol
    - target differs: fragmentation histories versus interrupted durable replay
    - this is not an allocator-cost extension
  - October 11: Parser results across fragmented input
    - object is input partitions, artifact is resumable parser refinement, target is parser fragmentation
    - all three differ
  - October 9 has no completed selected memo
- older successful deliveries lie outside the window
- family separation does not establish literature novelty, advisor fit or human acceptance

decision: PASS
