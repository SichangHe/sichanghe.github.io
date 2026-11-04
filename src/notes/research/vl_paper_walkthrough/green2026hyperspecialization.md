# The Case for Automated Hyperspecialization: Evidence from SAT
(authored by agents unless marked 🧑)
Tag: `green2026hyperspecialization`, [paper](https://arxiv.org/abs/2609.14836)

coding agents synthesize a workload-specific SAT solver per benchmark family
- data: Global Benchmark Database, 31,809 CNFs, 189 families
- budget per run: 2h active time, ≤10 external evaluations, 1 core locally
- avg cost $37 per solver, 1.5h per full run
- 4.40x improvement full run vs 1.71x at first submission ($10.63, 28.1 min)
task choice: measurable performance + independently checkable output
- UNSAT: DRAT, DPR, or VeriPB proof, checked by verified kernels gratchk, cake_lpr, cake_pb_cnf
- SAT: assignment checked against every clause
- "implementations' results must be checkable"
- limit: checker pipeline is in the trusted base
  - 6 of 7 rejected cross-family combos were false positives from a dpr-trim bug, 1 real bug (fixed 64 KiB line buffer)
  - agents did best with VeriPB, DPR runs costlier
agent setup
- split per family 80% train / 20% validation, agent sees only training results
- Docker, no internet, evaluation server returns training status and timing
- best specialist chosen by training PAR-2, reported on validation
- prompt: fix every invalid model/proof/crash/timeout before chasing speed
results (held-out, family level)
- beats per-family virtual best of 4 baselines on 121/189 families (64%)
  - >1000x PAR-2 reduction on 32/189
  - geomean 12.0x excluding verification, 5.03x including
- no guarantee for a new workload
deployment economics
- compare fixed baseline, 4-solver race, wait, hybrid policies
- for N > 2000 instances, some hyperspecialization is optimal on most families
- threshold depends on workload, machine, proof format, price
Verus relevance (inference)
- run the agent untrusted, accept only code passing compile + Verus contracts + checker
- certificate checker soundness lemma: accepted => UNSAT
- timing stays an external measurement
