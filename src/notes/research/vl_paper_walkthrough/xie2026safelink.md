# SafeLink-Agent: Agentic Maintenance for Adaptive Bitrate Controllers over Dynamic Starlink Networks
(authored by agents unless marked 🧑)
Tag: `xie2026safelink`, [paper](https://arxiv.org/abs/2608.28194)

## what the paper establishes

SafeLink-Agent treats a deployed adaptive-bitrate controller as a versioned artifact that must be repaired when new Starlink profiles expose stalls. Its workflow mines replay evidence, asks an LLM proposer for a bounded structured patch, validates the patch schema, and commits only after replay on both the failing profile and regression memory. The paper states: “SafeLink-Agent mines Starlink profiles and ABR replay logs, summarizes newly exposed failure patterns, uses an agentic patch proposer to generate a candidate patch, and commits the patch only after target-profile replay and regression-memory replay confirm that it reduces severe-session risk without introducing unacceptable QoE regression.” (section I-A, p. 2).

The paper says: “The framework supports both rule-based controllers and learned controllers under the same maintenance workflow.” (abstract, p. 1) The experiments use 3,221 valid 600-second traces from 322 raw measurement runs, split into 2,255/484/482 train/calibration/test traces and 1,932,600 replay rows (Table II, p. 8). The paper's setting is 4K/8K-style streaming with bitrate ladder [3, 8, 15, 30, 60, 120] Mbps, 48 four-second chunks, and a 60-second maximum buffer (section V-A, p. 7), with rebuffering penalty 40 and smoothness penalty 1 (section V-A, p. 8). The LLM is DeepSeek-V4-Pro; the paper does not report independent human acceptance of generated patches.

## technique: profile and failure mining

what it is and when to use it

A profile is a set of measured replay sessions sharing a network condition, rather than one trace. Use profile mining when a deployed controller encounters repeated low-tail throughput, high volatility, high latency, or handover-heavy behavior. For profile D, the paper summarizes mean throughput, 5th-percentile throughput, volatility, mean latency, and handover intensity. It retains validated earlier profiles and representative sessions as regression memory.

how to do it

1. convert measured Starlink segments into replay traces and discard insufficient, missing, or invalid rows (section V-A, p. 8)
2. group traces into profile batches using region, time split, percentile throughput, volatility, latency, and satellite-change metadata (section V-A, p. 8)
3. replay the current controller on the new profile and compute QoE, cumulative rebuffering, severe-session ratio, and worst-tail rebuffering (sections III-B and III-D, pp. 4–5)
4. trigger maintenance when severe-session ratio exceeds 1% or worst-tail rebuffering exceeds 10 seconds (section V-A, p. 8)
5. extract severe sessions whose cumulative rebuffering exceeds 10 seconds and the worst 5% tail, then combine them with aggregate metrics and regression-memory behavior into the proposer context (section IV-A, pp. 5–6)

Verus form

Inference: encode profile metadata and replay summaries in Rust structs, with a `spec fn` that defines a valid summary and `requires` on aggregation functions for nonempty profile sets. Prove that selecting a tail subset preserves its size bound and that severe-session counts are bounded by the number of sessions. Replay simulation, measured network traces, and QoE definitions remain executable assumptions unless separately modeled.

evidence and limits

The method is evaluated on the paper's trace inventory and profile table, not on live deployment. Its trigger thresholds are chosen by the authors, and the paper does not establish that 1% and 10 seconds transfer to another video service.

## technique: bounded structured patch proposal and schema validation

what it is and when to use it

The proposer receives profile metadata, failure summaries, hard sessions, controller metadata, verifier constraints, and patch history. It returns a structured record naming the controller version, patch type, activation condition, operation, and bounded parameter values. The allowed patch operations are configuration selection, profile-conditioned rules, or a runtime auditor for a learned policy. Use this when free-form code changes would be difficult to constrain or review.

how to do it

1. construct context X from profile metadata, current behavior, severe and tail sessions, and memory summary (section IV-A, p. 6)
2. call the LLM proposer with X, patch history, controller metadata, and constraints (section IV-B, p. 6)
3. check controller type, operation, activation-condition fields, parameter ranges, and patch-complexity bound (section IV-C, p. 6)
4. record a schema violation in patch history and keep the old controller if validation fails (section IV-C, p. 6; Algorithm 1, p. 8)
5. send schema-valid patches to replay verification (section IV-C, p. 6)

The paper gives concrete settings: BOLA changes buffer thresholds from (10,30) to (15,45) seconds; RobustMPC changes horizon 5/6 and safety margin 1.00/0.85; learned controllers attach auditors with safe-capacity margin, low-buffer threshold, and buffer guard (Table I, p. 7).

Verus form

Inference: represent a patch as a Rust enum with bounded fields and prove a `spec fn` such as `valid_patch(p)` from controller identity, allowed operation, activation condition, parameter ranges, and complexity. A validator can `requires` a well-formed metadata record and `ensures` that success implies `valid_patch`. Verus can prove field bounds and state transitions; it cannot prove that the LLM's proposed rule is QoE-safe without a formal replay model.

evidence and limits

The structured schema makes rejection mechanically visible, but the paper reports no count of schema-invalid proposals. The proposer remains a source of untrusted input.

## technique: target replay plus regression-memory replay

what it is and when to use it

The paper states: “This formulation separates proposal generation from patch acceptance: the proposer may generate a candidate patch, but the patch is committed only if replay verification confirms that p satisfies Γ.” (section III-D, p. 5) A patch is accepted only if it repairs the target profile and preserves previously validated behavior. The target constraints require lower severe-session ratio and worst-tail rebuffering, bounded QoE loss, and, for learned auditors, bounded audit-rate change. Memory constraints limit severe-session increase and QoE loss on stable profiles; patch complexity is also bounded.

how to do it

1. run a lightweight probe only to screen clearly ineffective proposals; passing it does not certify a patch (section IV-D1, p. 7)
2. replay current and patched controllers on every target-profile session using identical measured traces (section IV-D1, p. 7)
3. check target constraints, including severe-session ratio at most 1%, at least one risk reduction, and target QoE loss at most 8% for rule-based patches (section V-A, p. 9)
4. replay the patch on regression memory and check severe-session ratio increase at most 0.5 percentage points, QoE loss within 2%, and worst-5% rebuffering increase within 1 second for rule-based patches (section V-A, p. 9); learned-controller auditor patches instead require no severe-session increase and only 0.1 s worst-5% tolerance (section V-A, p. 9)
5. commit only if schema, target, and memory checks all pass; otherwise preserve the old version and record the reason (sections IV-D3, pp. 7–8; Algorithm 1, p. 8; Eq. 20)

Verus form

Inference: model a controller version and patch application as a state transition. A proof function can establish that a committed transition preserves an abstract memory invariant when replay reports satisfy the declared bounds; use `requires` and `ensures` on the transition. The replay reports, QoE simulator, and empirical thresholds are trusted inputs unless their semantics are formalized.

evidence and limits

The ablation demonstrates why both checks matter. A RobustMPC candidate passed the probe on all four profiles but full replay rejected it on high-latency and low-tail profiles because severe-session ratios remained above the constraint (Table VII, p. 12). For BOLA, a target-only patch reduced severe sessions from 0.63% to 0.23% but caused 8.05% QoE loss in memory, whereas the memory-aware SafeLink-Agent patch reached 0.40% and 0.00% memory QoE loss (Table VIII, p. 13). The Table VIII rows repeat the Static default and Static conservative rows of Table V (the paper calls the latter the target-only safe patch here), and Table V values are over all non-regression profiles (initial, calibration, high-volatility, low-tail, high-latency, future-test) (section V-B, p. 10). Inference: Table III trace counts for those six profiles sum to 1,734, which matches the 521 + 1213 sessions in section V-E, so the denominator is probably 1,734 sessions; the paper does not state this directly for Table V.

## technique: verified runtime auditing for learned controllers

what it is and when to use it

For SABR, Pensieve, and Comyco, SafeLink-Agent leaves the learned policy as bitrate proposer and attaches a policy-agnostic auditor that changes requests violating a verified safety rule. The static auditor uses one rule; the adaptive auditor conditions its guard on failure context such as low buffer or high-risk link states (section V-C, pp. 10–11).

how to do it

1. collect safe-capacity, buffer, requested bitrate, and severe-session evidence (Table I, p. 7)
2. generate a bounded auditor patch and validate its schema (sections IV-B–C, p. 6)
3. replay no-auditor, static, and adaptive variants under the same profiles (section V-C, p. 10)
4. accept the auditor only within target and memory risk, QoE, and audit-rate constraints (section V-A, p. 9)

Evidence: with the 10-second severe-stall threshold, adaptive auditing reduces the learned-controller average severe-session ratio from 39.01% to 9.79% and worst-5% rebuffering from 91.71 to 20.10 seconds (Table X, p. 14). The 39.01% and 9.79% are the plain means of the three per-controller ratios in Table VI (38.47, 44.49, 34.07 and 11.01, 10.13, 8.22), at the 10-second threshold and 5% tail (Table VI, p. 11). On one hard session from a low-tail OSN profile, compared with the static auditor, the adaptive auditor increases intervention from 29.17% to 33.33%, reduces rebuffering from 13.26 to 4.19 seconds, and raises QoE from 1969.76 to 2224.30 (Table IX, p. 13; section V-G). The paper also notes that adaptive auditing can lower QoE and raise audit rate relative to the static auditor (for SABR, QoE 4311.30 to 4271.32; section V-C, p. 11).

Verus form

Inference: express an auditor as a pure policy function with a proof of a local safety predicate relating buffer, safe capacity, and requested bitrate. Use `requires` for valid state and `ensures` for the returned bitrate bound. The learned model itself, throughput predictor, and simulator remain trusted unless modeled.

## what is proved, trusted, and unresolved

The paper concludes: “This turns newly observed Starlink failures into verifiable maintenance actions that keep ABR controllers robust as the access environment changes.” (section VI, p. 14) The paper proves no formal theorem. It reports replay evidence on 3,221 valid traces, rolling maintenance, ablations, and sensitivity thresholds. The central results are RobustMPC severe-session ratio 2.60% to 0.40% and cumulative severe sessions 45 to 7, plus learned average ratio 39.01% to 9.79% (abstract and section VI, pp. 1, 14). The experiments support this implementation and trace corpus; they do not establish safety for arbitrary networks, controllers, LLMs, or live traffic.

## techniques for the catalog

- profile and failure mining: aggregate measured traces into condition profiles and summarize severe and tail failures for repair
- bounded structured patching: generate controller-specific records with allowed operations, activation conditions, and parameter ranges
- target and regression replay: require improvements on new failures and bounded changes on validated memory before commit
- verified runtime auditing: add a constrained safety layer around learned decisions and evaluate its QoE, risk, and intervention tradeoff
