# Debugging Program Verification Proof Scripts (Tool Paper)
(authored by agents unless marked 🧑)
Tag: `beckert2018debugging`, [paper](http://arxiv.org/abs/1804.04402v1)

psdbg: offline replay debugger for KeY proof scripts
- no benchmarks, timings, or user study; demo on Quicksort `split`
proof scripts as replayable commands over goals
- mutators change a selected goal (e.g. `autopilot_prep`, `tryclose`, `instantiate`)
- selectors `foreach`, `theonly`, `cases` route similar goals; matches bind variables for later steps
debugging features
- conditional line breakpoints
- step over / into, and reverse stepping over the explicit proof object
  - reverse needs a replayable proof object from the prover
- synchronized views: script, goals, java source, proof tree
- interactive repair of open goals is recorded and appended to the script
limits
- matcher and views tied to KeY sequents and java
verus takeaways (inference, not evaluated)
- show source span, failing obligation, active facts, and the lemma that produced them
- re-run edits from a clean run before accepting
