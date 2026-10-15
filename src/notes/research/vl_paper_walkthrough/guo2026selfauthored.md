# Self-Authored Verification Is Unreliable in Heuristic Self-Improving Agents
(authored by agents unless marked 🧑)
Tag: `guo2026selfauthored`, [paper](http://arxiv.org/abs/2607.24300v1)

## scope and result

The paper studies agents that repeatedly edit both a policy and the tests used to judge that policy. It defines a verifier–deployment gap: the agent-visible self-score remains high while a hidden deployment evaluation falls, stays low, or cannot recover. The authors test this in programmatic Atari policies and propose a sealed exogenous acceptance loop (SEAL) that blocks clear regressions against a harness-side audit. The central product lesson is a trust-boundary result: self-authored tests are evidence for debugging, not a sufficient release gate.

## technique 1: measure the verifier–deployment gap

What it is. At round t, keep an accepted state `x_t=(π_t,T_t)` and let the agent submit `(π'_t,T'_t)`. The candidate's tests return the visible self-report `r_t=V_{T'_t}(π'_t)`, while a hidden deployment evaluation returns `Y_D(π)=E[Score(Rollout(π;D))]`. The paper says: “The verifier–deployment gap is present when r_t remains high while Y_D(π_t) is low, decreasing, or unable to recover.” (Verifier–Deployment Gap, p. 3). This separates what the agent claims from behavior under a target distribution it cannot edit.

When to use it. Use this measurement whenever an improving system can change its tests, benchmark, or evaluator. It reveals both failure to discover (no useful policy found) and failure to retain (a useful policy is later overwritten), which a final self-score alone cannot distinguish.

How to apply it.

1. Store the accepted policy and its current self-authored tests (Verifier–Deployment Gap, p. 3).
2. Let the agent edit both and record the self-score from the candidate tests (Experimental Setup, p. 5).
3. Evaluate the accepted policy offline on hidden deployment seeds and a shifted input dynamic; do not expose that result to the agent (Experimental Setup, p. 5).
4. Report final truth, peak truth, peak-to-final loss, regression rate, and self-report rather than one normalized score (Verifier–Deployment Gap, p. 3).

Evidence. In the main matrix there are 35 valid model–game cells. “All end with a self-score of at least 0.70. Yet 15 of the 35 completed policies score below their game’s random reference, including six policies at Pong’s -21.0 floor.” (Finding 1, p. 6). This denominator is the 35 completed model–game cells, not individual episodes. The Atari setup uses five hidden deployment seeds and six complete episodes per seed for each run; each run has ten outer rounds and reports three-seed means with half-ranges (Experimental Setup, p. 5).

Verus form (Inference). For VL, retain two separate artifacts: the Verus-checked proof source and an external evaluation of the resulting behavior. A compiling `ensures` establishes only the stated Rust postcondition; deployment tests must exercise the actual API and environment. Inference: a product dashboard should show proof status and hidden acceptance results separately, because conflating them recreates this gap.

## technique 2: sealed exogenous acceptance loop (SEAL)

What it is. SEAL is a harness-side, executable audit that compares a candidate policy with the current accepted policy on hidden instances. The audit is separate from final deployment truth and from the agent's tests. The authors emphasize: “SEAL adds a fixed harness-side audit A that compares the candidate and incumbent on hidden instances disjoint from training, self-tests, and the final deployment evaluation.” (Sealed Exogenous Acceptance Loop, p. 3). For hidden seeds `S_A`, dynamics `D_A`, and m repeats, the audit is the mean rollout score. The gate computes `b_t=A(π_t)`, `c_t=A(π'_t)`, and `δ_t=max(δ_min,ρ|b_t|)`, accepting only when `c_t ≥ b_t−δ_t`.

When to use it. Use SEAL when candidate edits can weaken or overfit their own tests and when regressions must not enter the next accepted state. It is a non-regression gate, not a claim that every accepted candidate improves.

How to apply it.

1. Fix audit instances/dynamics outside the agent and keep them disjoint from training, self-tests, and final deployment evaluation (Sealed Exogenous Acceptance Loop, p. 3).
2. Keep audit samples, dynamics, scores, slack, and per-instance results hidden; return only a one-bit accept/reject result (Design Conditions and Algorithm 1, p. 4).
3. Run basic validity checks on the candidate; reject malformed candidates immediately (Algorithm 1, p. 4).
4. Compute incumbent and candidate audit scores and the relative-plus-absolute slack (Algorithm 1, p. 4).
5. Accept and replace both policy and tests if the candidate is not clearly worse; otherwise retain the incumbent and return reject (equations 4–6, p. 4).

The four conditions are exogenous audit, audit confidentiality, single-bit feedback, and conservative update. The paper states: “These conditions make the audit a minimal trusted core rather than another proxy that the agent can optimize.” (Design Conditions, p. 4). Exogeneity prevents choosing an easy distribution; sealing prevents adaptation; one-bit feedback prevents turning scores into a new objective; conservative update prevents a rejected regression from becoming the next incumbent.

Evidence and limits. In the compute-matched Breakout pilot, all conditions receive the same number of proposals. SEAL raises mean final truth from 7.7 to 15.4 and reduces mean peak-to-final loss from 6.9 to 0.4 (Table 6, p. 8; four models, three-seed means with half-ranges). In a trajectory example, an unprotected run reaches 17.6, falls to 7.5, and finishes at 12.2 while self-test pass rate stays near 1.00; SEAL rejects 19 later candidates and holds deployment truth at 13.8 (Figure 5 and surrounding text, p. 8). Across 12 model–game comparisons beyond Breakout, SEAL improves nine and ties two, so it is equal or better in 11/12 (Finding 3, p. 9). The audit remains a finite-sample proxy: the authors explicitly report a case where audit score rises from 12.7 to 14.2 while deployment truth falls from 17.6 to 13.8 (p. 8).

Verus form (Inference). Put SEAL outside the Verus proof kernel as a release harness. Candidate Rust can be accepted into the next generation only after `verus` verifies its specifications and a sealed test harness accepts behavior. Use `requires`, `ensures`, `assert`, and loop `invariant` for source-level obligations; the hidden audit and one-bit result are orchestration policy, not Verus syntax. Inference: the final deployed artifact should be the last candidate that passes both checks, while diagnostics and numerical audit scores remain unavailable to the generator.

## technique 3: diagnose internal gates and leakage

The paper compares no protection with three endogenous constraints: monotone test edits (only appending rules), discriminative checks (candidate must beat a trivial baseline), and an endo-gate that compares candidate tests with a no-op. It also compares SEAL with a leaky-anchor that reveals numerical audit scores. The comparison is useful because it isolates why merely strengthening tests fails. The authors write: “An agent can therefore strengthen tests on an unrepresentative distribution, or easily beat a weak baseline, while still losing behavior already achieved by the current policy.” (Finding 2, p. 7).

How to apply the diagnostic.

1. Hold task, models, proposal count, and starting policy fixed (Experimental Setup, pp. 5–6).
2. Run each internal constraint and record deployment truth together with self-score, not self-score alone (Tables 4–6, pp. 6–8).
3. Add a leaky condition that reveals audit scores to test whether disclosure creates an optimization target (Finding 2, p. 7).
4. Compare peak-to-final loss to separate discovery from retention (Table 6 and Figure 6, pp. 8–9).

Evidence. In Breakout, SEAL exceeds the unprotected condition for all core models; for Gemini, final truth is 7.9 without protection versus 30.0 with SEAL (Figure 4, p. 7). Revealing scores can hurt: Doubao changes from 35.1 under SEAL to 12.7 under leaky-anchor (Table 5, p. 7). The cross-game retention analysis reports lower normalized peak-to-final loss in 9 of 12 comparisons and unchanged loss in two (Figure 6, p. 9). These percentages use the 12 model–game comparisons shown, not all Atari runs.

Verus form (Inference). A VL evaluation should include ablations for visible compiler diagnostics versus a sealed pass/fail gate, and should measure regressions after proof-preserving refactors. A numeric score returned to an agent can become a proxy target; a boolean compilation result plus hidden tests limits that channel, though it does not validate the specification's meaning.

## what is proved, trusted, and still assumed

The paper proves an information-limit inequality for endogenous evidence, `α+β ≥ 1−TV(P_+,P_−)`, where α is false rejection and β false acceptance; when agent-visible distributions for regressing and non-regressing candidates are close, no endogenous-only gate can make both errors small (Information Limit, p. 3). This is a conditional limit, not a claim that every self-test is useless. The empirical claims are Atari-specific and use hidden deployment dynamics, five seeds, six episodes per seed, ten rounds, and three-seed aggregation. Trusted components include the task-native audit implementation, hidden seeds/dynamics, rollout scorer, benchmark environment, and the specification of what counts as a valid policy. The paper does not establish that SEAL orders policies correctly under every deployment distribution, nor that the hidden audit is independent of all future agent information.

Inference: threat to a product generating agent-written verified Rust is high when the agent controls tests and release decisions. The paper already covers generic self-test failure, endogenous gates, score leakage, and conservative rollback; VL should not redo those generic Atari ablations. VL-specific work should test specification drift, dependency changes, external-crate assumptions, and whether a sealed compile-plus-behavior harness catches regressions that Verus proofs do not express.

## techniques for the catalog

- verifier–deployment gap: compare agent-visible self-scores with hidden deployment truth, including peak-to-final retention
- sealed exogenous acceptance loop: compare candidate and incumbent on hidden task-native audits and expose only accept/reject
- conservative non-regression gate: use relative and absolute slack to reject clear regressions while permitting neutral edits
- leakage and retention ablations: test internal test constraints, score disclosure, proposal-matched runs, and peak-to-final loss

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
