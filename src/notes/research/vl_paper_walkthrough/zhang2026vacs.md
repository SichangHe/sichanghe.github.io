# VACS: Value-Aligned Compositional Shielding for Multi-Agent Reasoning
(authored by agents unless marked 🧑)
Tag: `zhang2026vacs`, [paper](http://arxiv.org/abs/2609.26135v1)

## scope and status of the claims

VACS is a four-layer systems design for multi-agent reasoning: infer latent value weights, compile value constraints into runtime shields, resolve disagreement with cooperative optimization, and generate explanations tied to verifier records. The paper explicitly limits its formal claim: “Our contribution is primarily a unified systems design with formalized interfaces and operational guarantees at the verifier-constrained decision level, rather than a complete end-to-end formal proof of all language-model internals.” (abstract, p. 1)

## technique: infer value dimensions and agent profiles

VACS fixes five reward dimensions: logical completeness, conciseness, generalisability, logical soundness, and safety/constraint satisfaction. Each dimension has a reward function over a trajectory. For each dimension k, collect pairwise trajectory labels `(ξi, ξj, yij)` and fit a Bradley–Terry preference model. The model estimates `P(ξi ≻k ξj)` from exponentiated rewards, then maximizes the pairwise log-likelihood (equations 2–3, Section 4.1, p. 4). The reward is a neural network optimized by stochastic gradient descent.

Next, use deep maximum-entropy inverse reinforcement learning. Given learned reward functions and each agent's historical trajectories, optimize a weight vector `Wj` on the simplex with an L2 penalty (equation 4, p. 4). The gradient is empirical feature expectation minus model expectation minus regularization (equation 5, p. 4). For free-form text, the paper segments chain-of-thought into typed operators, summarizes context/working memory/unresolved questions/risk flags as states, vector-quantizes embeddings into a discrete abstraction, and runs dynamic programming. It then clusters inferred weight vectors with k-means to form value-type families (Section 4.1, p. 4; Appendix D, pp. 10–11).

The paper says: “Layer 1 learns value-dimension rewards from pairwise preferences using Bradley–Terry modeling and infers per-agent value weights via deep MaxEnt IRL.” (abstract, p. 1)

How to apply it:
1. Define dimension rubrics before labeling; the appendix gives completeness as the fraction of required subclaims addressed and safety as the proportion of steps satisfying domain constraints (Appendix A, p. 10).
2. Collect blinded pairwise labels per dimension, excluding ties from fitting but retaining them for audit (Appendix A, p. 10).
3. Fit each reward model, then fit each agent's simplex-constrained MaxEnt weight vector.
4. For text, map free-form traces to the finite operator/state abstraction before dynamic programming; use forward–backward occupancy and truncated/Monte Carlo approximations for long horizons (Appendix D, p. 11).

Verus form (Inference): value dimensions can be ghost predicates or scores over a verified trace, while a profile is an ordinary data structure used to select which constraints to enforce. Bradley–Terry and IRL are statistical estimation, not Verus proofs. Keep inferred weights outside the trusted safety proof; a proof should hold for every allowed profile or for a profile treated as an explicit assumption.

Evidence and limits: the controlled panel has four role-conditioned agents per task. MathInstruct-Subset has 200 tasks, NEJM-AI QA has 1,200+ questions, and CyberSec-Eval has 500 scenarios (Section 5.1, p. 7). The authors caution that engineered role heterogeneity makes Layer 1 a consistency test, not evidence that unmodified frontier models have those latent values (Section 5.1, p. 7; Section 6, p. 8). No denominator is supplied for the number of pairwise labels used to train reward models.

## technique: Lean-DSL constraints and compositional assume-guarantee shields

For each value dimension, encode a precondition/postcondition rule `φk ≡ ∀s,a: Ψk(s,a) ⇒ Ωk(s′)` (equation 1, Section 3, p. 3). For agent j, conjoin constraints whose inferred weight exceeds `θval`: `Φj = ∧k:Wkj>θval φjk` (equation 6, p. 4). The five canonical constraints require verified premises for proof steps, a state-dependent length bound, no case-specific assumptions, no contradictions with established facts, and no violation of hard task constraints (Section 4.2, p. 4).

Wrap each agent policy with a shield `σj`. If the proposed structured action satisfies `Φj`, execute it. Otherwise generate candidates, discard every verifier-failing candidate, score the remaining candidates by semantic similarity and factual support, execute the best, and abstain if none remain (equation 7 and Appendix B Algorithm 1, pp. 4, 10). The operational guarantee is narrow: “because only verifier-approved candidates in Cok can be executed, replacement cannot introduce a violation of Φj that was absent from the approved set; if no approved candidate exists, the shield abstains instead of forcing an unsafe rewrite.” (Section 4.2, p. 4)

The assume-guarantee interface has, for each agent, an assumption `Aj` about other agents' messages over a shared verifier-checked symbol layer and a guarantee `Gj` that every executed action satisfies `Φj` and preserves local invariant `Ij`. The proof obligations are (O1) each `Aj ⇒ Gj`, (O2) all guarantees imply all assumptions, and (O3) all guarantees imply a global invariant (equation 8, p. 5). They assume lock-step rounds with deterministic tie-breaking; asynchronous updates are outside the stated guarantee.

How to apply it:
1. Define a finite structured action type `(op,args,claim)` and a verifier predicate for each action/state pair.
2. Compile profile-selected constraints into `Φj`.
3. Implement the prune-and-rerank algorithm exactly: check, generate, filter, abstain or select.
4. Prove O1 locally, O2 by interface compatibility, and O3 by induction over synchronized rounds (Section 4.2, p. 5).

Verus form (Inference): represent `Φj` as `spec fn` predicates over a state and ghost action. Put the action checker in a proof function or verified executable function with `requires` for preconditions and `ensures` that the returned action satisfies `Φj`. Model abstention as an explicit enum case. Prove O1–O3 as lemmas over a round transition. Do not use `ensures` on a `spec fn`, and do not treat a verifier result as evidence that the generated text is semantically correct unless the structured action-to-text correspondence is itself specified.

Failure boundary: the paper states that the guarantee is conditional on the finite candidate set and “ensures no approved-set violation is executed, not that a correct action is present in the pool.” (Section 4.2, p. 4) Inference: a malicious or incomplete candidate generator can still cause abstention, omissions, or a formally safe but substantively wrong action.

## technique: value-weighted cooperative consensus

Compute each agent's alignment score `ρj = exp(−DKL(Wj || W̄)) · accj`, combining divergence from the panel mean profile with historical accuracy (equation 9, Section 4.3, p. 5). For every coalition C, define its value as the largest alignment-weighted support it can give one answer (equation 10). Compute the cooperative-game nucleolus to allocate stable credits `νj` among agents. Then select an answer by maximizing a Hamiltonian containing nucleolus credit, alignment score, and long-term value constraints `g(y)` (equation 11). Update co-state λ by a projected positive violation step (equation 12), repeatedly until constraints are satisfied. A sharpening exponent γ can increase or decrease the effect of accuracy (Section 4.3, p. 5).

Verus form (Inference): consensus can be verified as a finite arg-max over a supplied candidate list, with a lemma that the selected candidate satisfies every hard constraint. Nucleolus computation and gradient/co-state updates are numerical algorithms and require separately verified bounds if they influence a safety proof. If the candidate list is incomplete, the proof is only relative to that list.

## technique: critical-path explanations tied to proof records

After consensus, rank action steps by Hamiltonian sensitivity. For continuous embeddings use `∂H/∂e(ajt)`; for discrete text use a differentiable surrogate and finite-difference token-logit checks. Keep steps above sparsity threshold `θCP`, map each step to its DSL constraint and pre/postconditions, and emit a proof certificate tuple `(action, constraint, precondition, postcondition)` (equations 13–14, Section 4.4, p. 6). Generate either a template explanation or an LLM explanation conditioned on those tuples.

The paper explicitly disclaims a stronger result: “we do not claim formal minimal necessary-and-sufficient subsets (empirical validation in Section 5.4).” (Section 4.4, p. 6) Verus form (Inference): make the certificate a ghost record with a lemma that each tuple's pre/postcondition holds. Sensitivity ranking is not a proof of causal necessity; retain the ranking only as explanatory metadata.

## evidence, numbers, and inconsistencies

The main table reports four-agent panel results. VACS accuracy is 95.0 on MathInstruct-Subset (200 tasks), 85.4 on NEJM-AI QA (1,200+ questions), and 90.0 on CyberSec-Eval (500 scenarios), with logical inconsistency rate 0.0%; Shield-Only is 94.0, 78.5, and 82.0 with LIR 7.8% (Table 1, p. 7). The paper reports 10 random seeds for MathInstruct and CyberSec-Eval and 5 for NEJM-AI, with 10,000-resample bootstrap intervals and paired tests (Section 5.1, p. 7). It gives no per-seed table or raw count, so percentages cannot be independently checked against denominators.

The MathInstruct ablation has 200 tasks and shows removing Layer 2 raises LIR to 14.7 while retaining 95.0 accuracy; removing Layer 3 lowers accuracy to 90.5 and LIR to 2.0; removing Layer 4 sets faithfulness to 0.00 without changing accuracy (Table 2, p. 7). Explanation validation reports expert score 4.5/5, counterfactual drop 0.50, deletion AUC 0.41, and insertion AUC 0.59 for the hybrid (Table 3, p. 11). The paper says VACS rejects/remaps 96.8% of adversarial cases versus a 31.4% failure rate for unshielded voting baselines (Section 5.5, p. 8), but gives no adversarial-case denominator.

Inference: these are proof-of-concept measurements under engineered roles, finite candidates, fixed panels, and a verifier assumed correct. They do not establish end-to-end correctness of agent-written Rust, natural-language explanations, or neural model internals. The paper itself says: “VACS is a systems-design and proof-of-concept contribution; we state its limitations explicitly.” (Section 6, p. 8)

## techniques for the catalog

- Bradley–Terry plus MaxEnt IRL — infer per-dimension reward functions and per-agent value weights from pairwise preferences and trajectories
- DSL pre/post constraints — express each value requirement as a state/action precondition implying a next-state postcondition
- prune-and-rerank shielding — filter candidate actions through a verifier, select among approved candidates, and abstain when none pass
- assume-guarantee composition — prove local shields, interface compatibility, and a synchronized global invariant
- nucleolus/Hamiltonian consensus — allocate coalition-fair influence and optimize a constrained consensus with co-state updates
- verifier-grounded explanations — rank sensitive steps and render certificates containing each action's verified constraint and pre/postconditions
- finite-candidate evidence boundary — treat no-new-error as conditional on the generated candidate set and verifier assumptions
