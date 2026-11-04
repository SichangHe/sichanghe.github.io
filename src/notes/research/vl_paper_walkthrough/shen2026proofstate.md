# Keep the Proof State Live: Snapshotting for Efficient Tactic Search in Lean 4
(authored by agents unless marked 🧑)
Tag: `shen2026proofstate`, [paper](https://arxiv.org/abs/2605.25556)

Snapshot-DSP: avoid re-elaborating the lean proof state for each tactic branch
- observation: server already has elaborated state at each `sorry`, external branches rebuild it
- fallback cost: reload imports (~60 s) + re-elaborate (18–735 s), >99% of branch time
- 14× avg, 9.7× median speedup on 45 hand-crafted sketches; 5.6–50× overall on 48 miniF2F-v2 problems
- pure acceleration, proof results identical
capture and fork
- 3 json-rpc methods: ping, `dspSnapshotCapture`, `dspSnapshotBranch`
- immutable `Environment` (2–4 GB) shared by reference
- copy only `MetavarContext` (few kb) per branch
- branches run as parallel work-stealing tasks, one rpc per hole
- theorem closes when every hole has a successful tactic
- Verus form (inference): cache immutable crate/spec context, fork per-branch proof attempts
portfolio with transparent fallback
- 7 default tactics: aesop, norm_num, omega, ring, linarith, decide, simp
- no native support → per-branch `lake build`, same results at O(B) elaboration cost
- speedup grows with holes: 1 hole 7.9×, 3 holes 13.8×, 5 holes 29.8×
cost model
- native = Telab + H·C·Ttactic; fallback = H·C·(Tload + Ttactic)
- tactic cpu averages 45 ms vs 6.8 s native per branch: overhead dominates
- 42/56-branch projections (25.8×, 34.3×) are model estimates, not measurements
layered caching
- import cache (Kimina) between theorems + snapshots between branches, complementary
- persistent-server variant (~17 s per theorem) estimated, not implemented
limits
- one apple m-series laptop, 8 GB, lean v4.25.1, ~2 fallback workers
- trusts patched lean binary and server
