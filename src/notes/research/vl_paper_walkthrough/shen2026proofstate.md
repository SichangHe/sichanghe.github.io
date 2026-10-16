# Keep the Proof State Live: Snapshotting for Efficient Tactic Search in Lean 4
(authored by agents unless marked 🧑)
Tag: `shen2026proofstate`, [paper](https://arxiv.org/abs/2605.25556)

This paper removes repeated Lean elaboration from parallel tactic search. Its observation is that the Lean server already has an elaborated proof state at each source position, but external proof-search branches rebuild it. Snapshot-DSP exposes that state through three JSON-RPC methods, forks only mutable metavariable context, and runs tactic alternatives in parallel. The abstract reports 5.6–50× speedups on 48 miniF2F-v2 problems, with average 14× and median 9.7× over 45 hand-crafted benchmarks (Abstract, p.1).

## technique 1: capture and fork elaborated proof states

What it is. A snapshot stores the immutable `Environment` (Mathlib constants and instances), mutable `MetavarContext` (open goals), and `LocalContext` (local bindings) (§3.1, p.4). `dspSnapshotCapture` captures at a `sorry` position; `dspSnapshotBranch` accepts tactic configurations, copies the metavariable context per branch, and shares the environment by reference (§3.1, p.5). The paper states, “Forking therefore costs only a MetavarContext copy” (§3.1, p.5).

How to apply it.

1. Ping the server with `$/lean/dspSnapshotPing`; use fallback if unsupported (§3, p.4)
2. Parse all `sorry` positions from the generated sketch (§3, p.4)
3. Call `dspSnapshotCapture` for each position and retain its `snapshotId` (§3.1, p.5)
4. Send all tactic strings for that hole in one `dspSnapshotBranch` request (§3.1, p.5)
5. Run branches as `IO.asTask` work-stealing tasks, each with an independent metavariable copy (§3.1, p.5)
6. Close a theorem when every hole has at least one successful tactic (§3, p.4)

Inference: Verus does not expose an equivalent elaboration server API, but the same architecture can cache parsed/specification context and fork independent proof attempts. A Verus orchestrator could keep immutable crate and function specifications resident, clone per-branch proof state, and dispatch `verus` invocations or solver goals in parallel. This is an engineering inference, not a facility claimed by the paper.

The paper states, “Speedup increases with the number of proof branches” (Abstract, p.1). Evidence. The fallback reloads imports (about 60 seconds) and re-elaborates theorem bodies (estimated 18–735 seconds), together over 99% of branch wall time (§1, p.2). Snapshotting shares an approximately 2–4 GB environment and copies only a few-kilobyte metavariable context (§1, p.2). In the measured setup, a seven-tactic branch dispatch took about 0.58 seconds versus 1.43 seconds sequentially (§3.1, p.5).

## technique 2: integrate snapshots into a DSP portfolio with transparent fallback

The Prove phase is a five-step orchestration pipeline: capability ping, `sorry` discovery, snapshot capture, batched tactic branching, and result collection (§3, p.4). The default seven tactics are `aesop`, `norm_num`, `omega`, `ring`, `linarith`, `decide`, and `simp` (§3.2, p.6). A sketch LLM receives the informal draft and theorem statement; post-processing restores the exact theorem header to prevent Unicode identifier corruption (§3.2, p.6). If snapshot support is absent, each branch is built separately with `lake build` (§3.2, p.6).

Inference: a Verus agent can use a fixed portfolio of proof macros, solver settings, and lemma candidates, dispatching each against a captured contract context. The fallback should run ordinary per-branch verification so that acceleration does not change proof results. The paper says, “The fallback produces identical results at O(B) elaboration cost rather than O(1)” (§3.2, p.6). Verus proof branches must remain independent because shared mutable ghost state would invalidate comparison.

Evidence. The evaluation uses 48 miniF2F-v2 problems: 45 hand-crafted prove-phase sketches with 1–5 holes and 3 end-to-end DSP runs (§4.1, p.6). Four of 49 initial hand-crafted sketches were excluded because they failed before reaching a hole; both native and fallback failed identically on them (§4.1, p.6). Across the valid 45, average native time was 140 seconds and fallback 1,995 seconds, a 14.0× speedup (Table 1, p.7). By hole count, the measured average speedups were 7.9× (1 hole, 5 problems), 9.4× (2 holes, 19), 13.8× (3 holes, 11), 24.6× (4 holes, 7), and 29.8× (5 holes, 3) (Table 1, p.7).

## technique 3: model speed and separate elaboration from tactic cost

The paper models native time as `Telab + H·C·Ttactic` and fallback as `H·C·(Tload + Ttactic)`, where `H` is holes and `C` tactic configurations (§4.4, p.8). Snapshot cost is approximately O(1) in branch count for elaboration, while fallback is O(H·C). The cost breakdown measures tactic CPU from the server’s `cpuSeconds` and computes overhead as `(Tfallback − Ttactic CPU)/Tfallback` (§4.3, p.7).

Use it by recording per-branch tactic CPU, one-time capture/elaboration cost, branch count, hole count, worker count, and memory. Do not compare speedups without the hardware and concurrency setting: the paper uses an Apple M-series MacBook Pro with 8 GB RAM, about two fallback workers, and Lean `v4.25.1` (§4.1, p.6).

Evidence. Representative cases report 99.9% or 100% overhead in fallback; across 16 listed cases average tactic CPU was 45 ms and native per-branch time 6.8 seconds (Table 2, p.7). For three end-to-end runs, native/fallback times were 132.8/2,641.4 seconds (19.9×), 116.2/1,572.4 (13.5×), and 119.9/1,579.6 (13.2×) (Table 1, p.7). The projected 25.8× and 34.3× values at 42 and 56 branches are model projections, not measurements (Table 4, p.8).

Inference: Verus evaluation should separate solver CPU from Rust parsing, crate analysis, and SMT setup. A speedup measured only on proof search can hide costs in contract extraction or process startup. The paper's model can guide a Verus service, but Verus's solver contexts and ownership checks differ from Lean's `MetavarContext`.

## technique 4: combine branch snapshots with import-level caching

Import caching (Kimina) saves post-import state between theorems, whereas snapshotting saves post-theorem-body state between branches; the paper calls them complementary (§2, p.3). The current implementation starts a fresh LSP server per theorem, so imports are paid once per theorem. A persistent server could amortize imports over a batch. For one hard example with 35 branches, measured Level 0 was 2,641 s and Level 2 snapshot 133 s; estimated Level 1 import cache was about 330 s and Level 1+2 persistent snapshot about 17 s per theorem, but the last value is an estimate and “not yet implemented” (Table 3, p.8).

Inference: a Verus proof service should cache immutable crate analysis across functions while snapshotting branch-local solver/proof state. It must invalidate caches when dependencies, compiler flags, specifications, or toolchain versions change; this cache-invalidation rule is an engineering requirement inferred from soundness, not discussed in the paper.

## what is proved, measured, and trusted

The paper proves no new theorem about proof correctness; it measures equivalent tactic results and wall time. It states that Snapshot-DSP is “a pure acceleration architecture” and does not change proof accuracy (§5, p.9). Trust includes the patched Lean binary, Lean server implementation, LSP orchestration, tactic behavior, and the correctness of the unchanged theorem statement. The experiments cover 48 miniF2F-v2 problems on one laptop; behavior on larger or different hardware is uncharacterized (§5, p.9).

## techniques for the catalog

- proof-state snapshot capture — expose an elaborated state once at each proof hole
- immutable-environment sharing — share large read-only context and copy only branch-local metavariables
- batched parallel branching — dispatch a tactic portfolio in one RPC using independent tasks
- transparent fallback — use ordinary per-branch builds when native snapshot support is unavailable
- elaboration cost model — separate one-time elaboration from branch tactic CPU and report denominators
- layered caching — combine inter-theorem import caching with intra-theorem proof-state snapshots
