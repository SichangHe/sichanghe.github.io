# Scalable Synthesis of Formally Verified Neural Value Function for Hamilton-Jacobi Reachability Analysis
(authored by agents unless marked 🧑)
Tag: `yang2024scalable`, [paper](https://arxiv.org/abs/2407.20532v2)

## problem and framework
The paper synthesizes a neural Hamilton-Jacobi (HJ) reachability value function whose zero-sublevel set is a verified feasible region for a discrete-time deterministic system under a given policy. A feasible region must satisfy state-constraint satisfaction and forward invariance for an infinite horizon. Neural approximation alone can violate either property. The authors propose three stages: pre-training, adversarial training, and verification-guided training. They summarize: “Our framework consists of three stages: pre-training, adversarial training, and verification-guided training.” (section 4.1, page 12).

Pre-training minimizes the mean squared error of the discounted risky self-consistency condition plus activation pattern alignment (APA). Adversarial training searches batches of counterexamples and fine-tunes on constraint and invariance losses plus entering-state regularization (ESR). Verification-guided training encodes the remaining universal conditions as MILP counterexample searches. If both MILPs are infeasible, the value function is verified; otherwise the candidate counterexamples return to fine-tuning. Verification establishes a feasible zero-sublevel set, not an exact solution of the HJ equation (section 3.3, page 11).

## technique 1: MILP counterexample verification

what it is and when to use

For ReLU networks, piecewise-linear dynamics, policies, and constraints, reduce a universal safety claim to infeasibility of a MILP. Use when the state space is a hyperrectangle and all relevant functions can be represented with linear constraints and binary ReLU activation variables.

steps

1. Concatenate the value network with the constraint function (`M_con`) or with one-step value composition (`M_inv`).
2. Encode a constraint counterexample as `x ∈ X`, `y=M_con(x)`, `y1≤0`, `y2≥0`; encode an invariance counterexample analogously with `M_inv` (section 4.1, pages 13–14).
3. Encode each ReLU with linear bounds and a binary activation variable, using CROWN-derived preactivation bounds.
4. Solve the feasibility problem. In exact arithmetic, infeasibility proves the condition; feasibility returns a candidate counterexample that may be spurious because of the strictness relaxation.
5. Iterate fine-tuning until both problems are infeasible.

The paper explicitly relaxes the mathematically strict `y2>0` to `y2≥0` (section 4.1, page 15). Inference: a feasible point with `y2=0` need not violate the original condition. The authors also discuss numerical tolerances and describe the implementation as subject to floating-point-induced incompleteness (section 4.5, page 21).

Verus form

Inference: for a Rust controller model, encode the dynamics and value function as spec functions and prove universal conditions directly with `requires`, `ensures`, and loop `invariant`s. MILP is an external synthesis/checking engine, not a Verus construct; a Verus proof would need independently trusted lemmas for the network arithmetic and a finite abstraction of ReLU branches.

## technique 2: activation pattern alignment (APA)

MILP branch-and-bound cost grows with the number of ReLU activation patterns, hence with linear regions. APA adds Gaussian noise `x̃=x+ξ` to each pre-training sample and penalizes neurons whose preactivation signs differ between x and x̃. The regularizer excludes the output layer and is active only for opposite signs (section 4.2, pages 16–17). The paper states: “This regularization term encourages states that are close to each other to have similar activation patterns.” (section 4.2, page 16).

Apply it by adding `L_APA` to the HJ pre-training loss, choosing coefficient `α_APA` and noise scale σ, then apply it separately when training the dynamics and value networks. Their experiments use `α_APA=0.01` for dynamics, `10^-4` for value, and noise scale 0.1 (Table 2, page 28).

Evidence: on five nonlinear-task dynamics networks, APA reduced estimated linear segments about fivefold versus no regularization; on value networks it reduced segments about fourfold and preserved higher true-feasible-rate (TFR) than weight decay or signal-to-noise ratio (SNR) regularization (section 5.4.1, pages 33–34). Verification times with APA were 11.6 s for Unicycle, 1.4 s for Lane Keep, 2.9 s for Quadrotor, 171.5 s for Cart Pole, 48.2 s for Point Mass, 5.5 s for Robot Arm, and 311.9 s for Robot Dog (Table 4, page 36). The table defines “Timeout” as fine-tuning exceeding the two-hour limit; these are task-level measurements.

Verus form

Inference: APA is a training heuristic. In Verus, use it offline to choose a simpler model; its loss does not establish correctness. The resulting network still requires a contract and a proof of the safety predicate.

## technique 3: boundary-guided backtracking (BGB)

Counterexample optimization has a non-convex zero-sublevel constraint. Standard projected-gradient backtracking can get stuck near its boundary because the objective gradient points outward. BGB computes the unit objective-gradient vector `g_obj`, unit constraint-gradient vector `g_con`, and a normalized vector `b` coplanar with both, perpendicular to `g_obj`, and pointing toward decreasing constraint value. At backtracking index `s`, it tries `x_next = Π_X(x + η_l^s(η_a^s g_obj + (1−η_a^s)b))`, increasing `s` until the value is non-positive. Thus it both reduces step length and rotates the direction toward the boundary tangent (section 4.3, pages 17–19).

Use separate objective gradients for constraint and invariance counterexamples, batch the found states, and fine-tune on losses `L_con` and `L_inv`. Table 5 (page 36) shows BGB required 6.9k fine-tuning iterations/175.0 s on Unicycle, 5.9k/184.7 s on Lane Keep, 2.4k/83.3 s on Cart Pole, 8.6k/321.7 s on Point Mass, 25.2k/853.8 s on Robot Arm, and 6.3k/333.7 s on Robot Dog; projected boundary search (PBS) reached its 100k-iteration limit on Unicycle, Point Mass, Robot Arm, and Robot Dog. These are task-level measurements under the paper’s CPU and hyperparameters.

Inference: in Verus, BGB could generate candidate states for subsequent proof obligations, but no gradient search can replace the universal proof.

## technique 4: entering-state regularization (ESR)

The authors observed severe shrinkage of the zero-sublevel set when fine-tuning only on counterexamples (section 4.4, page 19). Theorem 4 assumes an existing feasible region and a state outside it. The authors explain: “Theorem 4 tells us that if a state outside the feasible region satisfies the state constraint and enters the feasible region in one step, it can be included in the feasible region.” (section 4.4, page 20). ESR samples states and keeps those satisfying `h(x)≤−δ`, current value `V(x)>0`, and next value `V(fπ(x))≤−δ`; it adds their values to the loss so they become negative and enter the region.

Table 6 (page 37) reports TFR for no regularization, random-state regularization, and ESR. ESR reached 0.962 Pendulum, 0.911 Unicycle, 0.750 Lane Keep, 0.906 Quadrotor, 0.404 Cart Pole, 0.594 Point Mass, 0.403 Robot Arm, and 0.872 Robot Dog. TFR is “the proportion of states identified as feasible in all feasible states” (section 5.2, page 29). Its empirical denominator is the sampled states classified as feasible by 100-step trajectories, rather than all sampled states. Inference: this estimates region coverage rather than measuring it exactly. ESR is still heuristic before final verification: “It is worth mentioning that the states filtered out by (29) are not necessarily feasible because the value network has not been verified yet.” (section 4.4, page 21). Later network updates can exclude an entering state’s successor.

## evidence, trust, and VL threat

Cersyve-9 contains nine tasks of state dimension 2–6. The framework synthesized verified functions on all nine. Table 3 gives TFR from 0.403 (Robot Arm) to 0.962 (Pendulum), with final verification times from 0.5 s to 311.9 s. The baseline without APA, BGB, and ESR failed on Cart Pole, Point Mass, Robot Dog, and produced an empty region on Robot Arm; the complete method was close to or over 10× faster than baseline on all but the two lowest-dimensional tasks, with about 100× acceleration on Quadrotor (section 5.4.4, pages 37–39). For the three tasks where Vanilla timed out, Figure 11 uses the two-hour limit for normalization.

Inference: the verification claim depends on the MILP encoding, solver behavior, and ReLU bounds, and applies to the modeled dynamics and constraints. Nonlinear dynamics and constraints are fitted by neural networks, introducing model mismatch; the authors explicitly leave exact nonlinear verification for future work (section 5.1.2, page 27). Inference: for VL, the transferable idea is a loop that alternates candidate generation, counterexample mining, and final universal checking. Inference: accepting agent-generated models after empirical counterexample search alone would omit the paper’s final universal check. Section 4.5 (pages 21–22) lists four possible synthesis failures: unstable adversarial training, unstable verification-guided training, inefficient verification, and convergence to an empty region.

## techniques for the catalog

- MILP counterexample encoding — turn universal ReLU safety conditions into infeasibility checks with binary activation variables
- activation pattern alignment — penalize sign changes on nearby training states to reduce linear regions and MILP branches
- boundary-guided backtracking — rotate gradient search toward the feasible-region boundary tangent
- entering-state regularization — penalize values of candidate entering states to resist feasible-region shrinkage
- verifier-in-the-loop synthesis — alternate batched search, fine-tuning, and final universal verification
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Although our framework successfully synthesizes verified value functions on various tasks in our experiments (See Section 5), such success is not guaranteed."): checked all study quotations, numbers, references, and technique steps against the full 42-page arXiv v2 paper; corrected the year and link, BGB update and vector description, separate network training, TFR denominator, verification caveat, and page references; did not reproduce experiments, inspect code, or check the proposed Verus adaptations.
