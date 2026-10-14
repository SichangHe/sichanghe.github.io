# Scaling Self-Play with Self-Guidance
(authored by agents unless marked 🧑)
Tag: `bailey2026scaling`, [paper](https://arxiv.org/abs/2604.20209)
## problem and algorithm

Self-Guided Self-Play (SGS) addresses reward hacking in long-running asymmetric self-play. A Conjecturer creates intermediate problems for a Solver; a Guide scores relevance and quality. The paper's core claim is: “a synthetic problem that is superficially related to a target but is messy, overly complex, or inelegant, is downweighted by the Guide.” (Section 1) The target set D is fixed and each target has a verifiable solution; in this work Lean4 compilation supplies verification.

Each iteration samples a batch B, splits it into solved and unsolved targets, generates one synthetic problem for each unsolved target, rolls out k Solver attempts on originals and synthetic problems, verifies every proof, and updates Solver and Conjecturer (Algorithm 1, Sections 3–3.2). The Guide is initialized from the same base model but is frozen after a small supervised fine-tuning stage.

## technique 1: guide-gated synthetic curriculum

Use this to generate proof-training tasks without allowing a generator to maximize an easy-to-game solve-rate reward.

1. Keep a fixed target set and mark every problem solved or unsolved (Algorithm 1)
2. For each unsolved x, sample a related, simpler synthetic x̃ from Conjecturer gϕ(·|x); generate none for solved x (Section 3.1)
3. Ask Solver πθ for k solutions to every original and synthetic problem, and verify each v(y)∈{0,1} with Lean (Section 3.1)
4. Compute synthetic solve rate s(x̃)=1/k Σv(y); set Rsolve=0 for zero solve rate or the top 30% of batch rates, otherwise Rsolve=1−s(x̃) (Section 3.2)
5. Ask frozen Guide ρ to score relation to x and formulation quality; Rguide=ρ(x,x̃)∈[0,1] (Section 3.2)
6. Multiply Rsynth=Rsolve·Rguide, normalize within the batch to [0,1], and update Conjecturer with reinforcement learning (Section 3.2)
7. Update Solver with REINFORCE1/2 on original and synthetic rollouts whose target solve rate is ≤0.5 (Section 3.2)

The Guide rubric rewards “(1) related to the unsolved problem, and (2) were formulated clearly by having a simple conclusion and no redundant premises.” (Section 3.2) Without this filter, synthetic conclusions become long disjunctions: at 4M generations No Guide approaches 100% disjunctive conclusions and nearly ten times the D3k conclusion length (Section 4.4, Figure 2).

Inference: For VL, replace Lean's binary verifier with Verus on generated Rust proof tasks. Keep the target specification fixed, generate stepping-stone lemmas or small obligations, run Verus on every candidate, and use a frozen quality judge to penalize irrelevant, redundant, or brittle obligations. The Guide score remains heuristic; only Verus acceptance should determine correctness.

## technique 2: entropy-safe Solver objective

Use a Solver objective that leaves a spread of intermediate solve rates. The authors compare CISPO, Expert Iteration, and REINFORCE1/2, selecting REINFORCE1/2 by cumulative solve rate. CISPO rapidly collapses Solver entropy, concentrating synthetic solve rates at 0 or 1; both receive zero Conjecturer reward, starving learning (Section 4.5, Figure 7). REINFORCE1/2 keeps entropy stable and preserves intermediate rewards.

The implementation adds a length penalty: rollouts using 80–100% of context receive a linear reward from 0 to −1, and any Solver proof using `try` gets zero reward because it can loop indefinitely (Section 4.1). The base DeepSeek-Prover-V2-7B Guide initially formats correctly only 54.7% of the time; 2,048 GPT-4.1-mini examples raise formatted Guide outputs above 99% through SFT (Section 4.1).

Inference: A Verus adaptation should penalize oversized proof attempts, timeouts, and unsafe escape hatches while preserving a useful distribution of partial proof difficulty. Track entropy or an equivalent diversity statistic; a verifier-only reward can still collapse if every candidate is trivially rejected or accepted.

## evidence and scaling measurement

The main dataset begins with 5,000 Goedel-Pset-V1 problems; GPT-5 mini filtering removes formalization errors, leaving D3k=3,323 problems (Section 4.1). Every run uses the full 3,323-problem batch and eight proof rollouts per problem. The run produces over 6 billion tokens, epochs targets over 230 times, and uses Lean 4.15 with a 200-second verification timeout; system errors stay below 1% (Appendix B). The sigmoidal scaling fit models cumulative solve rate RC against generations C with asymptote A; fits omit data below 100,000 generations and random 50% dropping changes A by 1.1% (Section 4.2, Appendix A).

SGS has a fitted asymptotic solve rate of 67.1%, versus 60.3% for the REINFORCE1/2 RL baseline, a 7 percentage-point difference (Figure 4 and Section 4.3). At 6.3M generations, the 7B model exceeds pass@4 of DeepSeek-Prover-V2-671B; on 1,346 targets never solved by the RL baseline, SGS solves almost 10% after 8M generations while RL remains at 0% after 4M (Section 4.3). No Guide reaches 65.5% fitted asymptote, Frozen Conjecturer is below SGS, and No Problem Conditioning does not beat RL (Figure 6, Section 4.4). The authors explicitly caution: “Since true asymptotic solve rates are unobservable, we use fitted scaling laws as a useful additional metric rather than a substitute for long-run empirical performance.” (Section 4.2)

## assumptions, limitations, and threat

Lean verification establishes candidate proof validity, but the quality Guide, prompts, RL implementation, filtered dataset, and scaling fit remain trusted or empirical. The Guide is frozen; the authors expect it may need to learn for harder problems (Section 5). Formal math simplifies self-play because the Conjecturer emits a statement rather than a whole environment, reward function, and simulator; transfer to systems code is therefore an inference. The paper says: “Our experiments focus on scaling along the compute axis but hold model size fixed.” (Section 5)

Inference: The threat to agent-written verified Rust is moderate. SGS is a useful data-generation and curriculum controller, but its central quality signal is an imperfect model judgment. VL should make Verus acceptance a hard gate, keep generated obligations tied to an immutable target, measure distribution collapse, and compare fitted curves with held-out, long-run proof outcomes. What VL should not redo is the basic observation that generator-only solve-rate rewards degenerate into syntactically complex tasks; this paper already ablates it on 3,323 Lean targets.

## techniques for the catalog

- guide-gated self-play — generate tasks for unsolved targets and multiply intermediate-difficulty reward by a relevance/clarity Guide score
- verifier-backed curriculum — use Lean or Verus to accept each generated solution and derive solve-rate rewards from checked outcomes
- entropy-safe Solver training — choose an objective such as REINFORCE1/2 that preserves intermediate solve rates and avoids reward starvation
- collapse diagnostics — monitor disjunction frequency, conclusion length, entropy, and solve-rate histograms to detect generator or Solver collapse
- scaling-law audit — fit cumulative solve-rate curves, stress-test fits by data removal/dropout, and treat asymptotes as estimates rather than proof
Checked 2026-10-13: audit record bailey2026scaling; paper-study comparison complete; gate executed; experiments not rerun
