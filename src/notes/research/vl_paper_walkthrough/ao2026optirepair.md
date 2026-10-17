# OptiRepair: Closed-Loop Diagnosis and Repair of Supply Chain Optimization Models with LLM Agents
(authored by agents unless marked 🧑)
Tag: `ao2026optirepair`, [paper](https://arxiv.org/abs/2602.19439)

## purpose and result
OptiRepair repairs an infeasible linear program (LP) and then checks whether its solution is operationally sensible. The paper states: “OptiRepair decomposes this task into two phases: a domain-agnostic feasibility phase that iteratively repairs any LP using IIS-guided diagnosis, and a domain-specific validation phase that enforces five rationality checks grounded in inventory theory.” (Abstract, p. 1). An IIS is an irreducible infeasible subsystem returned by Gurobi (§3.3.1, p. 7: “iis lists the constraints and variable bounds in the irreducible infeasible subsystem”). The benchmark, OptiRepair-SC, has 976 generated multi-echelon problems (692 train, 284 test; Table 12, p. 33); the held-out test set has 284 problems (Table 1 caption, p. 3; Table 5 caption, p. 13). Of the two trained 8B models, Qwen3-8B obtains 81.7% Rational Recovery Rate (RRR) and Llama-3.1-8B 80.3% (Table 5, p. 13); the best API models, GPT-5.2 and Gemini 2.5 Pro, tie at 42.2%, and the average of 22 API models is 21.3% (Abstract, p. 1; Table 1, p. 3; Table 4, p. 13). RRR is the fraction of problems where the solver returns Optimal and all applicable rationality checks pass (Eq. 7, §3.4, p. 10).

### what and when
For any infeasible LP, represent the current state as natural-language problem, model code, solver status, IIS, action history, and turn count. The paper defines this state as “s = (problemNL , code, status, iis, history, t)” (Eq. 4, §3.3.1, p. 7). Use this technique when a solver reports infeasibility and the conflicting constraints must be localized before changing the formulation. The paper calls Phase I domain-agnostic and applicable to any LP (§3.3, p. 7), but it evaluates it only on generated serial supply-chain LPs (§6.2, p. 18).

### procedure from the paper
1. Start from a valid LP (Gurobi solves every instance to optimality first), inject one controlled error, and verify that the sabotaged model is infeasible (or Optimal-but-irrational for ME-5), that the IIS is non-empty, and that a ground-truth fix restores both feasibility and rationality (§3.2, p. 6; Appendix G.1, p. 32). The generator uses 2–5 echelons, 12–24 periods, and typically 70–400 decision variables and 60–350 constraints (§3.1, p. 6).
2. Give the agent the infeasible model and a natural-language description of the intended model (§3.3.1, p. 7).
3. Let it choose diagnostic actions `GET IIS` or `CHECK SLACK` (query the solver without modifying the model), repair actions `RELAX CONSTRAINT`, `DROP CONSTRAINT`, `UPDATE OBJ`, `UPDATE BOUNDS`, or `UPDATE RHS`, and finally the meta action `SUBMIT` that ends the episode (§3.3.1, p. 7).
4. Execute each action in Gurobi, re-solve, and recompute the IIS if still infeasible. The transition is deterministic (§3.3.1, p. 8).
5. Phase I succeeds when the solver returns Optimal; exhausting the 20-step budget without restoring feasibility ends the episode as a Phase I failure (§3.3.1, p. 8).

The paper’s worked interaction (3 echelons, 16 periods, 142 constraints, 96 variables) computes an IIS containing `capacity_e1_t1`, `capacity_e1_t3`, `capacity_e1_t5`, `demand_e1_t1`, `demand_e1_t3`, and bounds `xe1,t1 ≤ 20`, `xe1,t3 ≤ 20`, `xe1,t5 ≤ 20`. The agent issues `RELAX_CONSTRAINT(capacity_e1, 50.0)`, and Gurobi returns “Status: Optimal ✓” (Figure 2, p. 8). The authors emphasize that “IIS computation (Chinneck, 2008) identifies which constraints conflict but not why” (§1, p. 1), so interpreting the IIS remains a reasoning step.

### Verus form
Inference: model the repaired Rust function with a `requires` clause for the initial well-formed LP and an `ensures` clause that the returned model satisfies feasibility predicates. Use ghost/spec functions to represent constraints and a proof function to establish that each permitted update preserves the intended invariant. Verus can prove arithmetic implications for a fixed update, but Gurobi’s IIS computation and LP optimization are external computations; they must be represented as trusted inputs or separately verified specifications. Do not treat a runtime solver call as a proof function.

### evidence and limits
Across 22 API models, average Phase I recovery (RR) is 27.6%; the trained models reach 97.2% (Abstract, p. 1; §5.2, p. 14; Table 5, p. 13). Per-error-type results are in Table 9 (Appendix E, p. 30). The paper marks ME-1, ME-2, ME-4, and ME-10 as “Hard” (Table 3, p. 6); Appendix B says these “generate misleading IIS signals that require multi-echelon causal reasoning” (p. 23). On ME-1 and ME-10, API models are “near zero” (0–7%) (§5.3, p. 15). A repair that merely relaxes a capacity constraint can be mathematically valid yet operationally meaningless, the paper argues (§1, p. 2), so feasibility alone is insufficient.

### what and when
After Phase I reaches `Optimal`, run a replaceable domain oracle. For supply chains it checks (1) base-stock structure, (2) bullwhip ratio, (3) inventory allocation, (4) cost consistency, and (5) order smoothing (§3.3.2, p. 8). Use it whenever a feasible model can still encode an operationally absurd policy.

### procedure from the paper
1. Enter Phase II only after Phase I reaches Optimal (§3.3.2, p. 8).
2. Apply the five checks, with an error-type-aware mapping that excludes checks whose violations reflect saboteur-injection artifacts rather than genuine irrationality (§3.3.2, p. 8). Table 8 (Appendix C.2, p. 26) shows that the bullwhip check is excluded for all ten error types; ME-1–ME-4, ME-9, and ME-10 use base-stock, inventory allocation, and cost consistency; ME-5, ME-7, and ME-8 use cost consistency only; ME-6 uses order smoothing only.
3. If an applicable check fails, return natural-language feedback identifying the violated property and let the agent re-enter the repair loop for up to three iterations (§3.3.2, p. 8).
4. Phase II succeeds when all applicable checks pass; it fails if iterations run out or a repair breaks feasibility (§3.3.2, p. 9).

The example reports a cost-consistency failure: the retailer (h = $8) holds 45.2 units while the warehouse (h = $3) holds 12.3. The agent executes `UPDATE_OBJ(hold_e1, 3.0)`, the solver returns Optimal, and the oracle then reports all checks passed (Figure 3, p. 9). The episode reward is +150 for optimal and all rationality checks pass, +75 for optimal but one or more checks fail, and −50 for infeasible (Eq. 5, §3.3.3, p. 9).

### Verus form
Inference: encode each domain check as a `spec fn` over the solution and a proof function showing that a repaired solution satisfies the selected predicates. Use `ensures` on the repair function to state preservation of feasibility plus the applicable rationality predicates. Keep the mapping from error type to checks explicit in a ghost value or specification; an unchecked mapping is a trusted assumption. The numerical thresholds in Appendix C (coefficient of variation 2.0, bullwhip ratio 3.0, inventory-allocation 0.25, order-smoothing 5.0; p. 25) must be included in the specification, because Verus will not infer inventory theory from prose.

### evidence and limits
The trained pipeline reaches 81.7% RRR on 284 held-out problems; ME-5 (a pure Phase II cost error) reaches 100% RRR (§4.3, p. 12; Table 5, p. 13). The 19 format-compliant API models average 86.7% P2Pass (Phase II pass rate among problems that reach Optimal), while Phase I recovery is low; the paper concludes “The bottleneck is finding a feasible repair, not judging its operational quality.” (§5.2, p. 14). The all-22-model average P2Pass is 76.3% (Table 4, p. 13); three models fall below 5% RRR “due to Phase 2 format compliance failures” (§5.2, p. 14). Inference: this suggests the two phases isolate distinct failure modes, though the paper’s own ablation (Table 6, p. 16) shows the trained Phase 2 model also beats API Phase 2 models by 9–13 pp RRR. The oracle encodes supply-chain assumptions; the paper says organizations with different priorities “would need to customize the checks” (§6.2, p. 18). Inference: reuse of the architecture with another domain oracle is proposed, not tested, in the paper.

### what and when
OptiSTaR trains separate Phase I and Phase II models using solver feedback rather than text similarity. The paper says: “Gurobi provides IIS feedback for beam search and outcome rewards for GRPO.” (Figure 5 caption, p. 11). Use this when supervised traces are scarce but deterministic solver outcomes can score trajectories.

### procedure from the paper
1. For Phase I, run an iterative STaR loop (three iterations, seeded with 696 successful trajectories from GPT-5.2, o4-mini, and DeepSeek-R1 teachers): beam search with K = 32 candidate trajectories per problem, keeping the shortest trajectory that restores Optimal with diagnosis accuracy DA ≥ 0.5; supervised distillation (SFT) on these trajectories; then GRPO refinement with G = 8 rollouts per problem (§4.2, pp. 11–12).
2. The GRPO composite reward is R = 0.5 · Routcome + 0.3 · Rdiagnosis + 0.2 · Refficiency (Eq. 8, p. 12), where Routcome = +100 if Optimal and −50 otherwise, Rdiagnosis = DA × 100 rewards “overlap between the model’s targeted constraints and the ground-truth IIS”, and Refficiency = −1 per repair step. A faithfulness penalty of −20 applies when the model targets constraints outside the IIS (§4.2, p. 12).
3. For hard error types (ME-2, ME-4), beam trajectories whose repairs fail rationality checks are replaced with upsampled ground-truth traces (§4.2, p. 12). Over the full loop, Phase I RR@5 rises from 44.4% to 75.7% and P1 RR reaches 97.2%; GRPO’s direct effect on greedy performance is marginal (+0.7 pp in RR@5), and its value is indirect, raising the beam search solve rate from 81.4% to 98.3% (§4.2, p. 12).
4. For Phase II, train independently on oracle-generated data (SFT) and refine with GRPO: “each rollout trajectory runs in Gurobi and the Rationality Oracle scores it”, with a binary pass/fail reward (§4.3, p. 12; Figure 5 caption, p. 11).
5. Evaluate with greedy decoding (temperature 0), allowing up to 20 Phase I steps and 3 Phase II iterations (§5.1, p. 13).

### Verus form
Inference: use the solver’s outcome (status, IIS) only as an input to an off-chain training pipeline. In verified Rust, prove the repair transition and oracle predicates; do not claim that a learned reward model proves them. A Verus harness can replay a trajectory and verify each state transition against a ghost model, while the model itself remains untrusted.

### evidence, trust, and threat
The paper reports identical 97.2% Phase I recovery for Qwen3-8B and Llama-3.1-8B and RRR within 1.4 percentage points (§4.4, p. 12; Table 5, p. 13). The authors conclude that “this consistency confirms that the gains stem from the training procedure and oracle specification rather than architecture-specific properties” (§4.4, p. 12); this rests on two architectures. Inference: trusted components remain Gurobi, the generated ground truth, the oracle thresholds, and the model code that applies edits. Inference: for agent-written verified Rust, the main product threat is specification gaming: an agent may weaken a postcondition or alter the checker unless the specification and checker are protected and independently reviewed. The paper’s own oracle addresses operationally absurd but solver-feasible repairs; it does not verify arbitrary Rust semantics.

## what is proved, measured, and missing
The measured claims are recovery (RR), conditional rationality pass rate (P2Pass), and end-to-end RRR on generated supply-chain LPs (§3.4, pp. 9–10). The paper says Gurobi supplies “feasibility status, objective value, and IIS certificates” (§2.3, p. 5); the oracle checks only its five encoded properties. I found no formal proof of the LLM’s diagnosis, no check of causal correctness of a repair beyond the oracle, and no evaluation beyond the generated distribution. The paper’s limitations: “The benchmark uses synthetic errors with serial topology and deterministic demand; real-world practice involves error combinations, network topologies, stochastic demand, and multi-product settings.” (§6.2, p. 18). The benchmark has 10 injected error types, 2–5 echelons, and 12–24 periods (§3.1–3.2, pp. 5–6).

## techniques for the catalog
- IIS-guided repair loop — query a solver IIS, edit a named constraint or bound, re-solve, and iterate until feasible or the turn budget ends
- domain rationality oracle — after feasibility, apply explicit domain predicates and feed failed checks back into a bounded repair loop
- solver-verified reward training — train with deterministic feasibility, IIS-overlap, and oracle pass/fail rewards instead of human textual judgments
