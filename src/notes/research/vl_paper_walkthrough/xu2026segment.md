# Rethinking Supervision Granularity: Segment-Level Learning for LLM-Based Theorem Proving
(authored by agents unless marked 🧑)
Tag: `xu2026segment`, [paper](https://www.semanticscholar.org/paper/568f221f80f4045f9df01f3eb1029be45a3f2dcb)

## scope and result

This Lean 4 paper treats proof-data organization as a boundary-selection problem. It introduces segment-level supervision: instead of training on one tactic or a whole proof, it trains on a locally coherent tactic sequence whose endpoints are detected by changes in the number of open goals. It also uses the same signal at inference time for short goal-aware rollouts. The abstract reports miniF2F success rates of 64.84% (STP), 60.90% (LeanWorkbook), and 66.31% (NuminaMath-LEAN), and says goal-aware rollout raises BFS-Prover-V2-7B from 68.77% to 70.74% while reducing inference cost (abstract, p. 1).

## technique 1: reconstruct verified proof trajectories

What it is. The raw corpus consists of theorem statements and Lean scripts that compile. The authors replay each tactic to recover a sequence `(s0, a1, s1, …, aT, sT)`, where states are proof states and actions are tactics (Section 2, p. 3). The same trajectory can produce atomic, whole-proof, or segment samples. The paper states, “Then, the proof corpus D could be transformed into a proof-state trajectory set T = {τ (i) |i = 1, . . . , N }.” (Section 2, p. 3).

Steps. (1) Require a theorem and a proof script checkable by the proof assistant (Section 2, p. 3). (2) Execute tactics one by one and record the state before and after every action. (3) Keep only verified trajectories. (4) Choose a boundary strategy to derive training pairs from the same trajectory. Step-level uses every position; whole-proof uses only 0 and T (Equations 10–11, p. 4).

Verus form. Inference: run a Verus proof in explicit steps, recording the source location, contracts, assumptions, and resulting verification obligations. Inference: where Verus does not expose a stable tactic state, represent the transition by the code diff and compiler diagnostics; only transitions from a clean verifying run enter the corpus. The Verus proof remains Rust-like and uses `requires`, `ensures`, `invariant`, `assert`, and proof functions rather than Lean tactics.

Evidence and limits. The paper uses existing verified trajectories and does not create new theorem/proof pairs (Section 3.2, p. 5). Inference: trajectory quality is bounded by the original formalizations and library assumptions. The appendix says the method “does not address how to obtain new formal data” (Appendix A.1, p. 11), so segmentation cannot cure missing or incorrect specifications.

## technique 2: open-goal-change segment construction

What it is. Let `g(s)` be the number of unresolved open goals in state `s`. A boundary is placed after tactic `t` when `g(s_t) ≠ g(s_{t−1})`; the tactics between adjacent boundaries form one segment (Equations 12–15, p. 5). The paper describes the signal as “a lightweight and directly computable structural signal” (Section 3.1, p. 4).

Steps. (1) For each verified trajectory, compute open-goal counts. (2) Start boundaries at 0 and T. (3) Add each successor position where the count changes, sort positions, and remove duplicates. (4) For consecutive boundaries, take the intervening tactic subsequence as macro action `m_k`. (5) Pair the boundary state with that macro action to form `D_seg` (Section 3.2, p. 5). (6) Serialize tactics with separators and train an autoregressive model using token negative log likelihood (Equations 16–18, p. 5).

Verus form. Inference: define a Verus boundary when a proof step creates or discharges a verification obligation, as observed in compiler output. Inference: if a sequence of assertions leaves the number of obligations unchanged but materially changes the SMT context, an obligation-diff signal should supplement goal count; this extension is not in the paper. Train on macro sequences of proof steps, while retaining the original `ensures` contract.

Evidence and limits. Table 1 reports mean ± standard deviation over five independent runs (caption, p. 7). On miniF2F, segment training reaches 64.84% ± 0.53% for STP, 60.90% ± 0.62% for LeanWorkbook, and 66.31% ± 0.79% for NuminaMath-LEAN (Table 1, p. 7). The paper cautions that open-goal count is only an approximate proxy: “Some tactics may substantially change the semantic content of a proof state without changing the number of open goals” (Appendix A.1, p. 11). Inference: this is a real risk for Verus, where solver context can change without a visible count change.

## technique 3: goal-aware rollout for step-level search

What it is. A normal step-level prover proposes one tactic and immediately returns the successor state to the search frontier. Goal-aware rollout detects a goal-count change and then executes up to H additional tactics linearly, hiding intermediate states from branching (Section 3.3, pp. 6–7). The paper says, “When an open-goal changes, the intermediate states inside the rollout are not treated as explicit branching points; only the final rollout state is added to the search frontier.” (Section 3.3, p. 7).

Steps. (1) Execute candidate action `a`; discard it on execution failure. (2) If the open-goal count is unchanged, use the ordinary one-step transition. (3) If it changes, set `u0` to the successor and sample tactics from the same policy for at most H steps. (4) Stop early on failure or proof completion. (5) Add only the final state and concatenated action sequence to the frontier (Equations 20–23, pp. 6–7). Their experiments fix H = 5 (Table 3 caption, p. 8).

Verus form. Inference: after a Verus step changes the set of unresolved obligations, run a bounded sequence of likely proof steps without branching, then enqueue only the final compiler state. Inference: save every intermediate source and diagnostic so a failed rollout can be replayed; hiding states from search must not hide them from audit. Inference: use a smaller H when a step may commit to an irreversible ownership or specification choice.

Evidence and limits. On miniF2F, BFS-Prover-V2-7B rises from 68.77% ± 0.79% to 70.74% ± 1.18%; token cost falls from 1664.39 to 1122.43 and time from 35.37 s to 32.53 s on the common-solved subset (Table 3, p. 8). InternLM2.5-StepProver rises from 59.59% ± 0.37% to 60.33% ± 0.45%; token cost falls from 1325.49 to 701.87 and time from 21.60 s to 12.32 s (Table 3, p. 8). Accuracy uses the full evaluation set, while cost uses only the common-solved subset (Table 3 caption, p. 8). The appendix warns rollout “may delay backtracking if an early tactic moves toward a wrong branch” (Appendix A.1, p. 12).

## technique 4: controlled comparison of supervision granularity

What it is. The authors fine-tune Qwen2.5-Math-7B under step-level, whole-proof, whole-proof with segment-style search, and segment-level training using the same setup. They evaluate in-domain and on miniF2F, reporting five-run mean ± standard deviation (Section 4.1, p. 7).

Steps. (1) Use STP, LeanWorkbook, and NuminaMath-LEAN as separate training sources. (2) Construct each supervision dataset from the same verified trajectories. (3) Keep model and optimization settings matched. (4) Evaluate success on each source's in-domain test set and miniF2F. (5) Measure inference token cost and total model-plus-Lean time on the common-solved subset (Section 4.1, p. 7). (6) Compare training loss curves and alternative boundary rules.

Verus form. Inference: run the same ablation with a fixed Verus benchmark, preserving specifications and dependencies. Compare single-step, whole-proof, macro-segment, and macro-search policies under equal compile budgets. Inference: report both full-set success and common-solved cost because conditioning cost on solved tasks can conceal failures.

Evidence and limits. Segment-level wins miniF2F in all three training sources: 64.84%, 60.90%, and 66.31% (Table 1, p. 7). Whole-proof-seg underperforms segment-level in all settings, so the authors attribute gains to both training target and search interface (Section 4.2, p. 7). Alternative token, tactic-distance, and state-distance boundaries perform below open-goal change; the best is 66.31% on NuminaMath-LEAN miniF2F (Section 4.3, p. 9). Inference: these comparisons support the signal in the studied Lean distributions, not a universal optimal boundary rule.

## what is proved, trusted, and relevant to VL

Lean checks every source trajectory and generated tactic sequence, but model weights, theorem formalizations, benchmark selection, and the Lean environment remain trusted inputs. The key measurements have explicit settings: five independent runs for success rates, and common-solved subsets for cost (Table 1 and Table 2 captions, p. 7). The paper's appendix openly states that short proofs and highly automated tactics reduce the benefit of intermediate segments (Appendix A.1, p. 12).

Inference: VL can reuse the central idea by organizing verified Rust proof traces around obligation-set changes and using bounded macro rollouts to reduce search branching. Inference: the product threat is a rollout that suppresses a failed intermediate proof step or a segmentation heuristic that misses a semantic change; replayable compiler logs and clean final verification are required. Existing VL work should not redo generic claims that intermediate supervision can help LLM proving. A useful new result would measure this boundary signal on Verus obligations, with denominators for candidate attempts, verified proofs, backtracks, compiler time, and contract edits.

## techniques for the catalog

- verified trajectory reconstruction — replay compiled proof scripts to record state/action transitions for reusable supervision
- open-goal segment supervision — place boundaries after goal-count changes and train on locally coherent tactic sequences
- goal-aware rollout — after a structural goal change, execute a bounded linear continuation before returning to search
- granularity ablation — compare atomic, whole-proof, and segment targets under matched data and evaluation settings

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
