# LLM-as-an-Improver: Turning Verification into Better Candidates
(authored by agents unless marked 🧑)
Tag: `tomihari2026improver`, [paper](http://arxiv.org/abs/2609.19515v1)

## problem and core method

The paper asks whether verification can improve the candidate set instead of only ranking a fixed set. It states: “However, existing methods typically treat verification only as a ranking step and discard its feedback once a fixed candidate pool has been evaluated.” (Abstract, p. 1). Its method is Verify–Repair–Reselect (VRR), which retains the initial winner, conditionally generates three alternatives, screens them, and reselects with the same criteria.

The key limitation is formalized by the initial-pool oracle. If `Cinit` is the generated set and `H0(x)` indicates whether any candidate is correct, a selector that only chooses from `Cinit` cannot exceed `E[H0(x)]` (Section 2.2, pp. 2–3). The paper states: “A stronger verifier can approach the ceiling, but only candidate generation can raise it.” (Section 2.2, p. 3). VRR instead has the verifier return ranking signal and diagnostic evidence, feeds the evidence to generation, screens new candidates, and verifies the expanded set again (Section 2.3, p. 3).

## technique 1: criterion-based verification with evidence graphs

When to use it: use this when candidates must be judged against multiple hard obligations and optional soft tie-breakers. The method derives `Γ(x) = Ohard(x) ∪ Osoft(x)` from the task; hard items are necessary conditions, while soft items break near ties (Section 3.1, p. 3).

How to do it:

1. Derive atomic hard and soft criteria from the problem before inspecting candidates (Section 3.1, p. 3).
2. Build an evidence graph for each candidate containing the problem, candidate artifact, public tests, compilation results, and source identifiers (Section 3.2, p. 4).
3. For each candidate-item pair, ask the verifier for a probability distribution over SAT, VIOL, and UNKNOWN plus a grounding flag (Equation 10, p. 4).
4. Weight grounded, low-entropy judgments and aggregate repeated judgments into a bounded criterion score using the log-odds update (Equations 11–13, p. 4).
5. Multiply hard-item scores to obtain a candidate score; use soft items only when hard scores are within `τsoft` (Section 3.2, p. 4).
6. Spend remaining verification budget on entries with the largest acquisition score `Aij = Iij H2(pij) Di / κij`, then compare the top two candidates in both presentation orders (Section 3.3, p. 5).

The paper warns that the ratio used in its log-odds update “is not an observed likelihood ratio” and that the aggregate is “an aggregation heuristic, not a probabilistic guarantee.” (Section 3.2, p. 4).

Verus form (Inference): make each hard item a Rust contract or a testable invariant, attach verifier output and counterexample traces to source locations, and classify each obligation as proven, violated, or unknown. Use Verus’s `requires`, `ensures`, `assert`, and loop `invariant` constructs for code obligations; use compilation and public tests for executable behavior. The paper’s evidence graph and SAT/VIOL/UNKNOWN labels are workflow ideas, not Verus constructs.

## technique 2: trigger repair from uncertainty or low score

When to use it: repair only when the initial pool appears unreliable. VRR computes two trigger conditions: every candidate’s score is below `τscore`, or at least `Kunk` hard judgments remain UNKNOWN (Equations 16–18, p. 5). If neither holds, it returns the initial winner (Algorithm 1, p. 6).

How to do it:

1. Record each candidate’s strengths, potential issues, unresolved items, aggregate score, uncertainty interval, and rank in a diagnostic ledger (Section 3.4, p. 5).
2. Check the low-pool-score and high-unknown-count predicates.
3. If either predicate holds, generate three alternatives; otherwise stop with the initial winner (Sections 3.4–3.5, pp. 5–6).

Verus form (Inference): trigger repair when no candidate satisfies all required proof obligations or when verifier diagnostics leave key invariants unresolved. Keep UNKNOWN distinct from a failed proof; an unresolved diagnostic should cause more checking or repair, not an assumption that the contract holds.

## technique 3: three complementary repairs

When to use it: use three roles to avoid repeatedly refining one trajectory. The paper lists selected-candidate repair, runner-up repair, and new-approach solution (Section 3.5, p. 6).

How to do it:

1. Give each repair prompt the task, source candidate, and evaluation summary, while withholding reference answers, private tests, and correctness labels (Section 3.5, p. 6).
2. For the selected candidate, re-examine potential issues and preserve sound parts where possible.
3. For the runner-up, independently repair a different starting point.
4. For the new-approach role, use the evaluation hypotheses to solve from scratch.
5. Treat reported issues as hypotheses and ignore unsupported feedback (Section 3.5, p. 6).

Verus form (Inference): ask one agent pass to repair a failing `ensures` or loop `invariant`, a second to repair the runner-up proof structure, and a third to re-prove the property from a different induction or state representation. Include exact Verus diagnostics and contracts, and require all candidates to pass Verus before reselection.

## technique 4: screen and reselect

When to use it: use screening before spending verifier budget on new candidates. For code, VRR retains a candidate only when a complete artifact can be extracted, it compiles, passes every designated public test, and has a distinct normalized code hash (Section 3.6, p. 6).

How to do it:

1. Reject incomplete, noncompiling, public-test-failing, truncated, or normalized-duplicate candidates (Section 3.6, p. 6).
2. Form `Creselect = {ci*} ∪ Rpass`, retaining the initial winner and all screened repairs; the active set has between two and four candidates (Equation 19, p. 6).
3. Rebuild evidence graphs for screened repairs.
4. Repeat batched judgments, adaptive judgments, and pairwise comparisons under the original criteria, then return the selected candidate (Section 3.7, p. 6; Algorithm 1, p. 6).

Screening establishes eligibility, not correctness. The paper says: “A program that passes public tests can still fail private tests, and a well-formed reasoning response can still be logically incorrect.” (Section 3.6, p. 6).

Verus form (Inference): require `verus` success, compilation, and distinct proof artifacts before reselection. A proof that passes a subset of tests but leaves `ensures` admitted or an `external_body` dependency unresolved should fail screening. Re-run Verus on the retained candidate with the exact crate configuration used for deployment.

## evidence, costs, and limitations

Experiments use Gemma 4 31B IT and Qwen3-32B on eight benchmarks, with five initial candidates per code problem and three per reasoning problem (Section 4, p. 7; Appendix A.1, p. 11). Table 1 reports accuracy on frozen pools. For Gemma, VRR versus LAV changes are +1.33 points on LiveCodeBench (88.91% versus 87.58%), −0.61 on HumanEval+ (95.12% versus 95.73%), and +1.32 on MBPP (83.07% versus 81.75%). For Qwen, gains include +4.04 on GPQA Diamond (57.07% versus 53.03%) and +2.50 on AMC (77.50% versus 75.00%), while MBPP falls 0.27 and MATH-500 falls 0.60 (Table 1, p. 7). Across 16 model-benchmark settings, VRR beats LAV in 9, ties in 4, and loses in 3 (Section 4.1, p. 7). The paper says these runs do not establish statistical significance or seed consistency.

On 1,055 LiveCodeBench problems, all-incorrect five-candidate pools number 117 for Gemma and 215 for Qwen. VRR recovers 18/117 = 15.38% and 7/215 = 3.26%, respectively (Section 4.2, p. 7). Gemma’s initial-pool oracle covers 938 problems and VRR returns 938 correct outputs, while Qwen’s oracle covers 840 and VRR returns 839 (Section 4.2, p. 8). Thus repair can recover outside the initial pool but can also regress on a previously covered problem.

Table 2 reports recorded method-specific runtime, excluding shared initial generation. VRR is lower than LAV in all eight model-dataset combinations, but the authors caution that batching, caching, and parallelization differ, so this is not a controlled efficiency comparison (Section 4.3, p. 8).

The verifier, public tests, and final benchmark labels determine acceptance; the LLM’s criteria, diagnostics, repairs, and reselection remain fallible. Inference: the threat to verified Rust is that a verifier diagnostic can be wrong or incomplete, causing a valid proof to be “repaired” into an invalid one or consuming time on irrelevant changes. Verus’s kernel check prevents accepting an invalid proof, but VRR’s selection layer can still choose a less useful or slower proof if criteria are poorly defined.

Inference: VL should reuse evidence-grounded diagnostics, explicit UNKNOWN handling, complementary repairs, duplicate screening, and final reselection under unchanged criteria. VL should not redo the paper’s generic fixed-pool comparison except when measuring Rust-specific recovery and regression rates.

## techniques for the catalog

- evidence-graph verification: organize task, candidate, tests, and source identifiers before criterion-level judgments
- uncertainty-triggered repair: generate alternatives when all candidate scores are low or hard obligations remain unknown
- three-role VRR generation: repair the winner, repair the runner-up, and solve from a new approach
- candidate screening: require complete, compiling, public-test-passing, nonduplicate artifacts before reselection
- verify-repair-reselect: reverify screened alternatives with the original criteria and choose from the expanded set

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
