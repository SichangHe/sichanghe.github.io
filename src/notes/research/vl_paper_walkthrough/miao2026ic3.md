# IC3-Evolve: Proof-/Witness-Gated Offline LLM-Driven Heuristic Evolution for IC3 Hardware Model Checking
(authored by agents unless marked 🧑)
Tag: `miao2026ic3`, [paper](https://arxiv.org/abs/2604.03232)

llm evolves a verifier offline, promotion gated by independent proofs
- llm proposes small patches to IC3 hardware model checker, each confined to one named heuristic slot
  - slots: proof obligations, inductive generalization, predecessor generalization, clause push, cross-slot
  - patch limit: 80 added lines, 3 files
- deployed checker has no model or runtime inference
- champion loop: build challenger, hard-check, benchmark, promote only if better, else revert
  - 200 offline iterations: 100 one-slot sweep, then 100 Compass&Jump
  - Compass&Jump ranks moves by conf − risk − cost, jumps to 2-3 slots more when stagnating
  - search policy affects scope only, not correctness
correctness comes only from independent certificates
- every solved instance needs an artifact checked outside the evolved solver
  - SAFE: inductive invariant checked by CERTIFAIGER
  - UNSAFE: counterexample trace replayed by AIGSIM
  - missing artifact, failed check, or inconsistent return code rejects the challenger
- gate caught a real unsound patch (rounds r093-r094)
  - clause-cleaning patch gave +9 solved instances, failed witness validation
  - 1 case: shows performance-only promotion can ship unsound code, not that all rejects are unsound
- not covered by the gate: llm, knowledge packs, evaluator diagnosis, slot definitions, promotion threshold
  - trusted: SAT, IC3 certificate logic, AIGSIM, CERTIFAIGER, benchmark labels
results (HWMCC, 1800s timeout, PAR2 = timeout counted as 2x)
- Set A (100 public, used for evolution): 92/100 solved vs rIC3-CaDiCaL 86/100
- Set B (100 unseen): 94/100, PAR2 464.56 vs 89/100, 524.35
- industry (302): 225/302, PAR2 1044.26 vs 182/302, 1449.78
- ablation on Set B: single slot 75-84/100, naive-compose 85/100, full 94/100
- push-clauses case: instrument progress, skip stalled frames, adaptive budget
  - 3 accepted edits: PAR2 1050.61 to 943.07, timeouts 25 to 21
for verus
- inference: export verifier proof results plus replayable witnesses as the gate
  - checker must be independent of evolving code, rerunning the same path is not independent
