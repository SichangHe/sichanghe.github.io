# Reinforcement Learning with Verifiable Physics: Post-training LLMs with Continuous Rewards
(authored by agents unless marked 🧑)
Tag: `cai2026rlvp`, [paper](https://arxiv.org/abs/2607.10474)

## method
RLVP post-trains a language model to generate numerical PDE solvers. The generated Rust/Python-like program is executed on hidden PDE instances; a hybrid verifier first checks execution and then scores the numerical field against a reference solution and PDE residual. The paper’s compact statement is: “Code is the action; physics is the verifier.” (Methodology, §3, p. 4.) This addresses a binary-RLVR weakness: a program can compile and return correctly shaped arrays while being unstable, diffusive, biased, or physically inconsistent.

The pipeline has two stages. Supervised fine-tuning (SFT) on a bank of executable teacher solvers gives the policy a prior over valid numerical programs. Group Relative Policy Optimization (GRPO) then updates the policy using verifier rewards on hidden instances. One policy is trained across eight PDE families: 1D advection, 1D Burgers, 1D reaction–diffusion, 1D diffusion–sorption, 2D reaction–diffusion, 2D Darcy flow, 2D incompressible Navier–Stokes, and 2D shallow water.

## technique 1: solver-bank warm start

when and why

Direct RL is inefficient because early samples often fail before producing meaningful physical feedback. Build a solver bank for each PDE family containing executable implementations of common numerical motifs: finite-difference stencils, conservative updates, CFL substepping, sparse linear solves, projection steps, and boundary-condition handling.

steps

1. Define a prompt with the PDE, inputs, and required solver interface.
2. Collect teacher implementations for each family and verify them with numerical self-convergence and method-of-manufactured-solutions checks.
3. SFT the base model on prompt–solver pairs using next-token loss.
4. During RL, sample hidden meshes, times, parameters, initial conditions, and boundary/forcing data so memorized outputs cannot solve the task.

The paper says: “SFT provides a solver prior: it places executable schemes within the policy support and raises execution success to the regime where verifier feedback becomes informative.” (§3.3, p. 4.)

Verus form

Inference: for VL, teacher examples could be verified Rust functions with explicit `requires`, `ensures`, and loop `invariant` clauses. SFT would teach syntax and common proof patterns, but only a Verus run can establish a candidate proof. Numerical floating-point PDE claims cannot be transferred directly; they require a discrete model and specifications for error bounds or invariants.

## technique 2: hybrid continuous verifier

For generated solver y on hidden case c, compute `vexec`, `vshape`, and `vfinite`; multiply them into a validity gate V. Invalid programs receive zero. For valid programs, calculate normalized trajectory error

Ltraj = ||u_hat − u*||_L2 / (||u*||_L2 + ε)

and, when available, a residual diagnostic comparing the generated residual to the reference residual. Instead of a brittle fixed threshold, sample tolerance εj from a distribution and use the expected binary pass probability Rj = P(εj ≥ Lj). With exponential tolerances, Rj = exp(−Lj/Tj). The final reward is multiplicative: `R = V · Rtraj · Rphys`.

The paper explains the purpose precisely: “RLVP closes this gap by gating continuous function-space feedback with binary execution checks, so invalid programs receive zero reward while valid programs are ranked by the physical field they return.” (§3.4, p. 5.)

Apply it as follows: sandbox-execute the candidate; reject runtime errors, wrong shapes, and non-finite values; run the reference solver and compute grid-weighted function-space error; compute the PDE residual when defined; convert diagnostics to soft pass probabilities; multiply the factors; use the scalar reward for GRPO. The residual factor is an attenuation term, not an additive reward for superficial code features.

Verus form

Inference: use a hard executable/specification boundary in which a Verus function must satisfy a postcondition and ghost proofs establish invariants. A continuous numerical score could guide training, but it is not a Verus proof. For a deterministic discrete solver, encode conservation or stability properties as `ensures` and loop `invariant`; keep empirical error metrics as external evaluation. Verus cannot certify arbitrary floating-point physical accuracy without a precise mathematical model.

## technique 3: verifier-grounded GRPO and hidden-instance transfer

Start from the SFT policy. For each prompt, sample G candidate programs, execute each, and normalize raw rewards within the group to obtain advantages. Assign the group advantage to each response token and optimize the clipped GRPO objective with a KL penalty to the frozen SFT reference. Training uses hidden instances varying meshes, times, parameters, initial conditions, and boundaries.

Evaluate k = 8 programs per prompt. Seen-PDE evaluation has 143 cases; held-out evaluation has 10 PDE prompts and 137 cases not used as SFT targets or RL prompts. Report valid execution rate, pass@1, combinatorial pass@8, and median best-of-8 nRMSE. The paper warns that held-out results test “selective numerical-methods transfer, rather than … arbitrary unseen PDEs.” (§4.3, p. 8.)

## evidence and limits

On seen tasks, RLVP raises pass@1 to 0.63–0.89 and pass@8 to 0.83–0.97 across 3B, 7B, and 14B models, with median-best nRMSE@8 about 6×10⁻⁴. The 7B RLVP model reaches pass@1/pass@8 0.68/0.83 and nRMSE@8 6.13×10⁻⁴, versus Claude Sonnet 4.5’s 0.24/0.50 and 1.15×10⁻² under the same direct-generation protocol. These denominators are the 143 seen cases with eight samples per prompt; pass@k means at least one accepted sample among k.

On held-out PDEs, 7B pass@8 rises from 0.28 after SFT to 0.57 after RLVP, while median-best nRMSE@8 falls from 1.45×10⁻¹ to 4.01×10⁻³ over 137 cases. Transfer is selective: heat and advection–reaction–diffusion improve strongly, while advection–diffusion, Darcy–reaction, and KdV remain difficult. Ablating continuous accuracy shows why it matters: on seen tasks, validity-only RL has pass@1 0.58 versus 0.71 with Rtraj, pass@8 0.76 versus 0.84, and nRMSE 1.0×10⁻³ versus 6.2×10⁻⁴; on unseen tasks, pass@8 is 0.21 versus 0.33. The paper’s setup uses one backbone family, fixed test cases, and no repeated-run uncertainty estimate.

The verifier trusts the reference solver, residual implementation, discretization, tolerances, sandbox, and hidden-case generator. A high reward means agreement with those references and metrics, not proof of physical truth. Complex geometries, adaptive meshes, stochastic PDEs, multiphysics, and richer boundary conditions are outside scope. Inference: for agent-written verified Rust, RLVP’s main lesson is to make feedback dense while retaining a hard proof gate. A model can learn robust solver idioms, but only Verus contracts can establish memory safety and specified functional properties; empirical scores cannot replace them.

## what is proved and what stays trusted

The study measures code execution, numerical error, residual consistency, and transfer; it does not prove the learned policy’s programs for all inputs. SFT, GRPO, reference solvers, hidden-instance sampling, and metric thresholds remain trusted. Existing work already uses prompting, debugging, self-refinement, and test-time scaling for scientific code; this paper adds parameter updates from continuous physical feedback. VL should reuse the hard-gate/graded-score separation and avoid claiming that continuous rewards are formal verification.

## techniques for the catalog

- solver-bank SFT: warm-start policy training with verified executable numerical schemes
- hybrid verifier: gate execution validity, then score function-space accuracy and PDE residuals continuously
- stochastic-tolerance reward: turn diagnostic losses into expected pass probabilities instead of fixed thresholds
- GRPO with hidden cases: update a policy from grouped verifier rewards on varied meshes, parameters, and boundaries
- selective transfer evaluation: test unseen PDE families with pass@k and best-of-k physical error while reporting failures

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
