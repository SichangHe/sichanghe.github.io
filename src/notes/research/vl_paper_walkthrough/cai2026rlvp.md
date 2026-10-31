# Reinforcement Learning with Verifiable Physics: Post-training LLMs with Continuous Rewards
(authored by agents unless marked 🧑)
Tag: `cai2026rlvp`, [paper](https://arxiv.org/abs/2607.10474)

## method

RLVP post-trains a language model to generate Python numerical PDE solvers using NumPy and/or SciPy (Appendix I, pp. 41–42). The program runs on hidden PDE instances; a hybrid verifier checks execution validity and scores the returned numerical field against a reference solution and PDE residual. The paper states: “Code is the action; physics is the verifier.” (§3, p. 4.) The distinction from a neural PDE surrogate is explicit: “It post-trains a language model to write conventional numerical-methods code, using reference-solution error and PDE residuals as execution-grounded verifier rewards on the generated program.” (§2, p. 4.)

The pipeline combines solver-bank supervised fine-tuning (SFT) with Group-Relative Policy Optimization (GRPO). One policy learns eight PDE families: 1D advection, 1D Burgers, 1D reaction–diffusion, 1D diffusion–sorption, 2D reaction–diffusion, 2D Darcy flow, 2D incompressible Navier–Stokes, and 2D shallow water (§4.1, p. 6). The bank covers 71 schemes (§1, p. 2; Table 3, p. 19).

## technique 1: solver-bank warm start

when and why

The paper motivates SFT as follows: “Direct RL from a base language model is inefficient because most early generations fail before producing meaningful physical feedback.” (§3.3, p. 4.) The bank includes finite-difference stencils, conservative updates, CFL substepping, sparse linear solves, projection steps, and boundary-condition handling (§3.3, pp. 4–5).

steps

1. Define prompts specifying the PDE, inputs, and required solver interface, without prescribing a numerical method (§3.2, p. 4).
2. Collect executable teacher implementations for each family. The paper checks the bank through self-convergence, manufactured solutions where available, and comparisons with published PDEBench reference trajectories (Appendix B.3, pp. 20–22).
3. SFT the model on prompt–solver pairs using next-token loss (§3.3, p. 5).
4. Continue with RL on hidden instances. These vary grid resolutions, output times, parameters, and initial conditions; boundary treatments differ across PDE problems (§3.2, p. 4).

The paper says: “SFT provides a solver prior: it places executable schemes within the policy support and raises execution success to the regime where verifier feedback becomes informative.” (§3.3, p. 5.) In the experiments, SFT uses one epoch over 2048 teacher examples with LoRA rank 32; GRPO uses 512 training instances for 50 epochs, also with rank 32 (Appendix A.1, p. 17).

Verus form

## technique 2: hybrid continuous verifier

For generated solver y on hidden instance c, multiply indicators of error-free execution, correct output shape, and finite values into V. The paper states: “Invalid programs receive zero reward.” (§3.5, p. 5.) For valid programs, Equation (1) defines the normalized function-space trajectory error:

Ltraj = ||u_hat − u*||_L2 / (||u*||_L2 + ε)

The norm integrates over space and time, omits time for steady fields, and includes solution channels for vector-valued systems. The implementation approximates the integral on each evaluation mesh (§3.4, pp. 5–6). Appendix A.1 instead identifies the implemented Ltraj as rollout nRMSE (p. 17); Appendix D defines evaluation nRMSE as RMSE divided by the reference range, falling back to reference RMS magnitude, then 1, when needed (pp. 24–25). These normalizations should not be treated as identical.

For each nonnegative diagnostic loss Lj, define a tolerance distribution and use the expected pass probability Rj = P(εj ≥ Lj). Exponential tolerances give Rj = exp(−Lj/Tj) (§3.5, p. 5; Appendix C, p. 24). This is an analytic expectation; the formula does not require drawing a tolerance for each score. The paper explains: “This shows that a dense reward can be interpreted as the expected pass probability of a binary verifier under uncertainty over the acceptance tolerance.” (Appendix C, p. 24.)

When a residual operator is available, compute ρ(u) as its L2 norm and use Lphys = |ρ(u_hat) − ρ(u*)| / (ρ(u*) + ε). The complete reward is `R = V · Rtraj · Rphys`; set Rphys = 1 if the residual diagnostic is unused (§3.5, p. 6). The experimental temperatures are Ttraj = 0.05 and Tphys = 2.0 (Appendix A.1, p. 17).

Apply it by executing the candidate in the sandbox, checking validity, comparing its field to the hidden reference, calculating residual consistency when available, converting losses to exponential scores, and multiplying the factors. The residual factor penalizes disagreement with the reference residual rather than simply rewarding the smallest possible residual: “Comparing to ρ(u⋆) absorbs the discretization error of the reference solution and avoids rewarding residuals smaller than the numerical reference itself.” (§3.5, p. 6; mathematical spacing normalized.)

Verus form

Inference: require a Verus proof for the specified discrete properties, then use graded diagnostics to guide training among candidates. Conservation or stability might be expressed through postconditions and loop invariants after defining an appropriate mathematical model. An empirical numerical score alone would not establish those specifications.

## technique 3: verifier-grounded GRPO and hidden-instance transfer

Start from the SFT policy. For each prompt, sample G programs, execute them, and normalize raw verifier rewards within the group to obtain advantages. Assign each program's advantage to its valid response tokens. Optimize the clipped GRPO objective with a separate per-token KL penalty to the frozen SFT reference; KL does not enter the reward normalization (§3.6, p. 6). Experiments use eight rollouts per prompt, KL coefficient 0.001, learning rate 2×10⁻⁶, and sampling temperature 0.7 (Appendix A.1, p. 17).

Evaluation generates eight programs per PDE prompt and executes each across fixed cases. There are 143 cases for eight seen PDE families, and 137 cases for ten held-out PDE prompts. The paper says of the latter: “These held-out PDEs are not used as SFT solver-bank targets or as RL prompts.” (§4.1, p. 7.) Report validity, combinatorial pass@k, and median best-of-8 nRMSE. Success requires validity and nRMSE ≤ 0.01; invalid or missing samples receive error 1, and valid finite errors are capped at 1 for the best-of-8 metric. Pass metrics are averaged over PDE prompts; aggregate nRMSE@8 is the median of per-PDE medians (Appendix D, pp. 24–25).

The paper limits its transfer claim: “This setting should be interpreted as a test of selective numerical-methods transfer, rather than as evidence that the model can solve arbitrary unseen PDEs.” (§4.3, p. 8.)

## evidence and limits

On seen tasks, RLVP reaches pass@1 0.63–0.89 and pass@8 0.83–0.97 across the 3B, 7B, and 14B Qwen2.5-Coder-Instruct models, with median best-of-8 nRMSE about 6×10⁻⁴. The 7B model reaches 0.68/0.83 and 6.13×10⁻⁴, versus Claude Sonnet 4.5's 0.24/0.50 and 1.15×10⁻² under the same direct-generation protocol (Table 1, p. 8). These are aggregates over PDE prompts, not pooled proportions over 143 cases. Pass@1 estimates one sample's success probability; pass@8 records whether any of eight samples succeeds per case (Appendix D, p. 25).

On held-out PDEs, 7B pass@8 rises from SFT 0.28 to RLVP 0.57, and nRMSE@8 falls from 1.45×10⁻¹ to 4.01×10⁻³. Transfer does not improve every metric at every size: for 14B, pass@1 rises from 0.14 to 0.21, but pass@8 falls from 0.60 to 0.50 and nRMSE@8 worsens from 1.32×10⁻³ to 1.49×10⁻² (Table 15, p. 29). For 7B, heat and advection–reaction–diffusion each improve from pass@8 0 to 1, while advection–diffusion, Darcy–reaction, and KdV have RLVP pass@8 0 (Table 16, p. 29).

The 7B ablation compares validity-only reward V with V·Rtraj, rather than isolating the residual term. On seen tasks, adding Rtraj raises pass@1 from 0.58 to 0.71 and pass@8 from 0.76 to 0.84. Section 4.4 reports nRMSE improving from 1.0×10⁻³ to 6.2×10⁻⁴ (p. 9), whereas Figure 8's caption gives the validity-only value as 1.1×10⁻³ (p. 26). On unseen tasks, pass@8 improves from 0.21 to 0.33 (Figure 9, p. 26). Inference: this ablation supports the accuracy term's contribution, but does not separately establish the residual term's benefit.

The authors describe the scope directly: “Our study covers eight structured PDE families, leaving broader scientific settings such as complex geometries, richer boundary conditions, adaptive meshes, stochastic PDEs, and multiphysics systems to future work.” (§5, p. 10.)

## techniques for the catalog

- solver-bank SFT: warm-start training with executable schemes checked by numerical diagnostics
- hybrid verifier: require execution validity, then score field accuracy and residual consistency
- stochastic-tolerance reward: interpret continuous diagnostic scores as expected binary pass probabilities
- GRPO with hidden cases: update from grouped verifier rewards across varied numerical instances
- selective transfer evaluation: test held-out PDE families and report improvements and regressions
