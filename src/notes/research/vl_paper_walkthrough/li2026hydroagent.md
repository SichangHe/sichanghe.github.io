# HydroAgent: Closing the Gap Between Frontier LLMs and Human Experts in Hydrologic Model Calibration via Simulator-Grounded RL
(authored by agents unless marked 🧑)
Tag: `li2026hydroagent`, [paper](https://arxiv.org/abs/2605.17792)

## scope and evidence
The paper studies LLM agents that calibrate the non-differentiable CREST/EF5 rainfall-runoff simulator. It benchmarks nine frontier models on four held-out gauges and trains HydroAgent-4B (Qwen3-4B) with supervised fine-tuning (SFT) followed by simulator-feedback GRPO. The simulator is the verifier: the reward is computed from NSE and diagnostic hydrologic metrics, with no learned reward model. The abstract states: “We then propose H YDROAGENT, a recipe that fine-tunes the open-weight Qwen3-4B model with supervised fine-tuning on 2,576 expert calibration trajectories and Group-Relative Policy Optimization using NSE as a verifiable reward sourced from online CREST simulations—reinforcement learning with simulation feedback (RLSF).” (Abstract, p.1)

Inference: this is a direct analogue of proof-generation training in which Verus compilation and verification replace EF5 simulation and NSE. The paper does not claim formal software verification; the transfer below is therefore an inference.

## technique 1: simulator-grounded tool environment
What it is: an agent edits 13 bounded scalar multipliers, invokes EF5, and receives simulated and observed discharge plus peak error, timing, volume ratio, recession slope, time-to-peak, baseflow, event count, NSE, KGE components, RMSE, bias, and a running best score. The method says each episode exposes “set_parameters,” “run_simulation,” “evaluate,” and “parse_failure” tools (Methods §2.2, pp.3–4).

When to use: use this closed loop when correctness can be checked by an executable domain simulator and the task needs iterative diagnosis. The paper explicitly says: “The simulator is the verifier: there is no learned reward model.” (Figure 1 caption, p.4)

Steps from the paper: (1) provide basin description, data directories, control-file template, and evaluation window (§2.2); (2) set bounded parameters; (3) run EF5 and parse the time series; (4) evaluate NSE and auxiliary metrics; (5) diagnose the physical mismatch and repeat for up to 50 multi-turn iterations, stopping at target, five non-improving rounds, or timeout (§2.2). The paper’s example links a low peak with balanced volume to routing velocity and a volume surplus with balanced peak to evapotranspiration or impervious fraction (§2.2).

Verus form: Inference: expose a Rust function whose postcondition is the desired state relation and call a Verus proof checker after each candidate. Use `requires` for parameter bounds, `ensures` for the calibrated invariant, and a `while` loop with a loop invariant for repeated refinement. A checker result is a Boolean or proof obligation outcome, rather than an NSE scalar; Verus cannot carry over the hydrologic metrics or external EF5 unless modeled or placed behind a trusted boundary.

Evidence and limits: four held-out gauges range from 329 to 40,792 km², and frontier agents receive a 20-round budget of up to 200 simulations per gauge (Methods §3.1). Inference: the verifier is only as sound as the simulator and parser; the paper itself warns that relying on an AI calibration agent can propagate mis-specified parameters into operational forecasts (Related Work, p.8).

## technique 2: trajectory SFT that preserves tool interaction
What it is: distill 2,576 trajectories from GPT-5 over 73 calibration runs and preserve the full hypothesise–simulate–diagnose–adjust sequence. Drop trajectories whose final NSE is ≤0.6 and quality-weight survivors by final-NSE percentile (Methods §2.3, p.4).

Steps: collect expert tool-call episodes; reorganize iterative episodes into one long-horizon trajectory in original order; filter; quality-weight; fine-tune Qwen3-4B-Instruct with full BF16 FSDP and no LoRA (§2.3). SFT teaches tool-call grammar, bounds, and reasoning such as “recession limb is too steep ⇒ increase wm or leaki.” (Methods §2.3, p.4)

Verus form: Inference: construct training pairs from verified Rust attempts, retaining the sequence of candidate code, compiler diagnostics, repairs, and successful proof. SFT can teach syntax and common proof idioms but cannot establish correctness; every generated function still needs `verus` checking.

Evidence: Table 1 evaluates the same four gauges and 50-turn cap. SFT-only has 1–4 simulations per episode and four parse failures on each gauge; on gauge 02338660 its NSE falls from baseline 0.65 to −17.53 (Table 1, p.15). The authors explain: “As an isolated post-training stage, SFT distills for- mat and style at the cost of long-horizon engagement.” (Appendix C, p.15) Inference: imitation can teach a converged surface response while deleting the search behavior needed for hard proofs.

## technique 3: GRPO with verifiable, shaped simulator reward
What it is: draw K=8 rollouts per prompt, each up to 50 tool calls, and use critic-free group-relative advantages. Per-turn rewards are +0.02 for valid `set_parameters`, +0.05 for valid simulation, ΔNSE for valid evaluation, and −0.5 for parse failure. Terminal reward is clipped best NSE plus target, evaluation, improvement, and empty-episode terms (Methods §2.4, p.4).

Steps: initialize from SFT; sample eight episodes; execute tools; compute per-turn and terminal rewards; normalize advantages within the group; update with learning rate 1×10⁻⁶, KL coefficient 0.2, entropy 0.01, temperature 1.0, top-p .95, 30 epochs, and 4×H100 (§2.4 and Appendix A/Table 3). A 32-way semaphore limits concurrent EF5 calls (p.4).

Verus form: Inference: sample K candidate proof attempts, run Verus on each, assign reward 1 for verified and 0 for rejected (optionally shaped by compile time or obligation count), normalize rewards within each prompt, and update with GRPO. Keep the verifier outside the model and treat accepted proofs as the only correctness evidence. Verus proof functions and `lemma` constructs must remain in proof code; generated code is never trusted merely because its reward is high.

Evidence: HydroAgent raises best NSE relative to SFT-only on 02338660 from −17.53 to +0.61, 06279500 from −2.27 to −0.84, and 07144100 from .07 to .65; it consumes 12–17 simulations, all 50 turns, and has zero parse failures (Appendix C, p.16). Relative to the untuned base, panel-mean NSE rises from −0.14 to +0.20 and the median from +0.09 to +0.50 (Appendix C, p.16). The one regression is 01403060, .58 to .40. Inference: binary Verus acceptance may be sparser than NSE, so auxiliary rewards should never be treated as proof validity.

## what is proved, trusted, and threatened
The paper measures simulator scores, tool-use behavior, and ablations; it does not prove that a generated calibration is physically correct beyond the simulator’s modeled assumptions. Trusted components include CREST/EF5, the parser, gauge observations, reward code, and the training/evaluation harness. The paper reports a contradiction-like trade-off: peak-ratio error on 02338660 degrades by 163% while other metrics improve (p.7), and SFT alone sharply harms three gauges despite teaching syntax (Appendix C, p.15). Inference: VL should reuse the separation between syntax training and executable checking, but should not redo SFT-only recipes or assume reward improvement implies a proof. Threat to a product of agent-written verified Rust: Inference: simulator-grounded RL could increase proof search persistence and checker-aware repair, but reward hacking, malformed proof syntax, and trusted external interfaces remain product risks.

## techniques for the catalog
- simulator-grounded verifier loop: expose bounded edits, executable checking, diagnostics, and iterative repair
- trajectory SFT: preserve complete tool-call and repair trajectories, then filter and quality-weight them
- GRPO with checker reward: group-normalize multiple attempts using executable outcomes and shaped interaction signals
Checked 2026-10-15 against paper li2026hydroagent: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
