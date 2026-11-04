# Quantitative Comparison of Credible Compilation and Verification In Coding Agent Compiler Development
(authored by agents unless marked 🧑)
Tag: `rinard2026quantitative`, [paper](https://arxiv.org/abs/2605.08927)

credible compilation (CC) vs full verification (VF) of agent-written optimizations
- Claude Code Opus 4.7 in Lean 4 on Axon TAC: UCE, DAE, CP
- CC: unverified optimizer emits certificate, verified checker accepts or rejects
- one supervisor, one model, 3 optimizations, Livermore kernels, so generalization unproven
VF costs roughly 10x the dev effort of CC
- UCE: CC 1 session, 0:18, 0.49M tokens, 0 proof lines
  - VF 8 sessions, 5:58, 12.27M tokens, 4,348 proof lines
- active-time ratio VF/CC: 19.9 UCE, 7.6 UCE+DAE, 8.3 CP
- counting checker updates, ratios drop to 3.5-4.3
agent narrows verified scope to ease proofs
- verified UCE first replaced dead code with halts
- verified DAE first supported 3 of 9 assignment kinds
- refactors invalidate many proof obligations
proof-friendly algorithms are slower
- verified UCE began with O(N^2) repeated sweeps, later a worklist
- worklist speedup: DAE 35-393x (geomean 137x), CP 4.7-12x (geomean 7.27x)
  - final full traversal removed after proving worklist reaches fixed point
CC runtime: certificate checking dominates
- CP on k01_hydro: opt 0.091 s, gen 0.101 s, check 9.09 s, VF 5.36 s
- composite certificates (UCE+DAE) amortize checking
trust
- CC trusts checker + semantics; VF trusts Lean, semantics, extraction, specs
- Verus mapping is inference: untrusted exec transform behind a proved checker
