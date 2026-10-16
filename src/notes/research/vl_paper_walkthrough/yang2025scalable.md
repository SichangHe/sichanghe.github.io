# Scalable Synthesis of Formally Verified Neural Value Function for Hamilton-Jacobi Reachability Analysis
(authored by agents unless marked 🧑)
Tag: `yang2025scalable`, [paper](https://doi.org/10.1613/jair.1.16946)

## problem and framework
The paper synthesizes a neural Hamilton-Jacobi (HJ) reachability value function whose zero-sublevel set is a verified feasible region for a controlled dynamical system. A feasible region must satisfy state-constraint satisfaction and forward invariance for an infinite horizon. Neural approximation alone can violate either property. The authors propose three stages: pre-training, adversarial training, and verification-guided training. They summarize: “Our framework consists of three stages: pre-training, adversarial training, and verification-guided training” (section 4.1, page 12).

Pre-training minimizes an HJ residual loss plus activation-pattern alignment (APA). Adversarial training searches batches of counterexamples and fine-tunes on constraint and invariance losses plus entering-state regularization (ESR). Verification-guided training encodes the remaining universal conditions as MILP counterexample searches. If both MILPs are infeasible, the value function is verified; otherwise the counterexamples return to fine-tuning.

## technique 1: MILP counterexample verification

what it is and when to use

For ReLU networks, piecewise-linear dynamics, policies, and constraints, reduce a universal safety claim to infeasibility of a MILP. Use when the state space is a hyperrectangle and all relevant functions can be represented with linear constraints and binary ReLU activation variables.

steps

1. Concatenate the value network with the constraint function (`M_con`) or with one-step value composition (`M_inv`).
2. Encode a constraint counterexample as `x ∈ X`, `y=M_con(x)`, `y1≤0`, `y2≥0`; encode an invariance counterexample analogously with `M_inv` (section 4.1, pages 13–14).
3. Encode each ReLU with linear bounds and a binary activation variable, using CROWN-derived preactivation bounds.
4. Solve the feasibility problem. Feasible means a counterexample exists; infeasible means the condition holds, except for the strictness relaxation.
5. Iterate fine-tuning until both problems are infeasible.

The paper explicitly relaxes the mathematically strict `y2>0` to `y2≥0`; equality at both boundaries can therefore produce a spurious counterexample and floating-point tolerances can affect completeness (section 4.1, page 14).

Verus form (Inference:)

For a Rust controller model, encode the dynamics and value function as spec functions and prove universal conditions directly with `requires`, `ensures`, and loop `invariant`s. MILP is an external synthesis/checking engine, not a Verus construct; a Verus proof would need independently trusted lemmas for the network arithmetic and a finite abstraction of ReLU branches.

## technique 2: activation pattern alignment (APA)

MILP branch-and-bound cost grows with the number of ReLU activation patterns, hence with linear regions. APA adds Gaussian noise `x̃=x+ξ` to each pre-training sample and penalizes neurons whose preactivation signs differ between x and x̃. The regularizer excludes the output layer and is active only for opposite signs (section 4.2, pages 15–16). The paper states: “This regularization term encourages states that are close to each other to have similar activation patterns.”

Apply it by adding `L_APA` to the HJ pre-training loss, choosing coefficient `α_APA` and noise scale σ, then train dynamics and value networks jointly with this regularization. Their experiments use `α_APA=0.01` for dynamics, `10^-4` for value, and noise scale 0.1 (Table 2, page 28).

Evidence: on five nonlinear-task dynamics networks, APA reduced estimated linear segments about fivefold versus no regularization; on value networks it reduced segments about fourfold and preserved higher true-feasible-rate (TFR) than weight decay or SNR (section 5.4.1, pages 33–34). Verification times with APA were 11.6 s for Unicycle, 1.4 s for Lane Keep, 2.9 s for Quadrotor, 171.5 s for Cart Pole, 48.2 s for Point Mass, 5.5 s for Robot Arm, and 311.9 s for Robot Dog (Table 4, page 35). Comparisons marked “Timeout” exceeded two hours; these are per-task runs, not averages.

Verus form (Inference:)

APA is a training heuristic. In Verus, use it only offline to choose a simpler verified model; its loss does not establish correctness. The resulting network still requires a contract and a proof of the safety predicate.

## technique 3: boundary-guided backtracking (BGB)

Counterexample optimization has a non-convex zero-sublevel constraint. Standard projected-gradient backtracking can get stuck near its boundary because the objective gradient points outward. BGB computes the objective gradient `g_obj`, constraint gradient `g_con`, and a normalized tangent-direction vector `b` coplanar with both, perpendicular to `g_obj`, and pointing toward decreasing constraint value. It updates with a weighted direction `η_a g_obj +(1−η_a)b`, projects into the state box, and backtracks step length until the value remains non-positive (section 4.3, pages 17–18).

Use separate objective gradients for constraint and invariance counterexamples, batch the found states, and fine-tune on losses `L_con` and `L_inv`. Table 5 shows BGB required 6.9k fine-tuning iterations/175.0 s on Unicycle, 5.9k/184.7 s on Lane Keep, 2.4k/83.3 s on Cart Pole, 8.6k/321.7 s on Point Mass, 25.2k/853.8 s on Robot Arm, and 6.3k/333.7 s on Robot Dog; PBS reached its MaxIter on most high-dimensional tasks. These are task-level measurements under the paper’s CPU and hyperparameters.

Inference: in Verus, BGB could generate candidate states for subsequent proof obligations, but no gradient search can replace the universal proof.

## technique 4: entering-state regularization (ESR)

Fine-tuning only on counterexamples shrinks the zero-sublevel set. The paper proves an expansion theorem: “if h(x) ≤ 0 and fπ (x) ∈ Xπ , Xπ ∪ {x} is also a feasible region of π” (section 4.4, page 20). ESR samples states and keeps those satisfying `h(x)≤−δ`, current value `V(x)>0`, and next value `V(fπ(x))≤−δ`; it adds their values to the loss so they become negative and enter the region.

Table 6 reports TFR for no regularization, random-state regularization, and ESR. ESR reached 0.962 Pendulum, 0.911 Unicycle, 0.750 Lane Keep, 0.906 Quadrotor, 0.404 Cart Pole, 0.594 Point Mass, 0.403 Robot Arm, and 0.872 Robot Dog. The denominator is the sampled states used for approximate TFR, with 100-step trajectories (section 5.2, page 29); TFR is therefore empirical, not an exact region measure. ESR is still heuristic before final verification: the authors note that later network updates can invalidate an assumed entering state.

## evidence, trust, and VL threat

Cersyve-9 contains nine tasks of state dimension 2–6. The framework synthesized verified functions on all nine. Table 3 gives TFR from 0.403 (Robot Arm) to 0.962 (Pendulum), with final verification times from 0.5 s to 311.9 s. The baseline without APA, BGB, and ESR failed on Cart Pole, Point Mass, Robot Dog, and produced an empty region on Robot Arm; the complete method was close to or over 10× faster than baseline on all but the two lowest-dimensional tasks, with about 100× acceleration on Quadrotor (section 5.4.4, pages 37–38).

The proof claim trusts the MILP encoding, floating-point solver behavior, ReLU bounds, and piecewise-linear approximations. Nonlinear dynamics and constraints are fitted by neural networks, introducing model mismatch; the authors explicitly leave exact nonlinear verification for future work (section 5.1.2, page 27). Inference: for VL, the transferable idea is a verifier-in-the-loop loop that alternates candidate generation, counterexample mining, and final universal checking. It threatens a product only if agent-generated models are accepted from empirical counterexample search without a sound final proof; this paper itself identifies four failure modes, including unstable adversarial training, inefficient MILP verification, and convergence to an empty region.

## techniques for the catalog

- MILP counterexample encoding — turn universal ReLU safety conditions into infeasibility checks with binary activation variables
- activation pattern alignment — penalize sign changes on nearby training states to reduce linear regions and MILP branches
- boundary-guided backtracking — rotate gradient search toward the feasible-region boundary tangent
- entering-state regularization — add safe one-step predecessor states to resist feasible-region shrinkage
- verifier-in-the-loop synthesis — alternate batched search, fine-tuning, and final universal verification
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
