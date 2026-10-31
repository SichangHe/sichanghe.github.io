# Reward-Oracle MCTS for Formal Theorem Proving: Sample-Efficient Search and the Need for Kernel-Level Proof Auditing
(authored by agents unless marked 🧑)
Tag: `vamshi2026rewardoracle`, [paper](https://arxiv.org/abs/2608.28639v1)

## claim, search state, and trust boundary

The paper proposes a three-role Monte Carlo Tree Search (MCTS) for Lean proof generation. A generator emits complete Lean proofs, a decomposer proposes natural-language subgoals, and a critic scores subgoal quality. Lean compilation is used only as a scalar reward; compiler errors and proof-state text are never put into later generation prompts. UCB selection and reward backpropagation decide which proof-plan branches receive more samples.

The central architectural claim is stated in the abstract: "the Lean 4 compiler is used exclusively as a reward oracle, rather than as a source of textual feedback for subsequent generations" (abstract, page 1). The method is evaluated on MiniF2F, PutnamBench, LeanPhysBench, and PhysLeandata with Goedel-Prover-V2-8B, DeepSeek-Prover-V2-7B, and Kimina-Prover-Preview-Distill-7B. On MiniF2F, Goedel reaches 84.2 ± 0.5% at PAB@32 and 87.1 ± 0.2% at PAB@256; on PutnamBench it solves 26/659 at PAB@32 versus 18/659 for whole-proof sampling (Tables 2, 3, 5).

A crucial negative result is the audit. Some Lean declarations compiled and passed a source-level `sorry` scan while depending on `sorryAx`. Therefore a compiler-success count is evidence only after checking the kernel-reported axiom dependencies. Inference: for Verus, the analogous trust boundary includes `assume(...)`, `admit()`, `#[verifier::external_body]`, `#[verifier::external]`, bodiless axiom-style `proof fn`s, and any other verifier escape hatch. The paper's method targets Lean and does not measure Verus.

## technique 1: use scalar compiler reward without textual feedback

Use this when compiler diagnostics would grow the generation context or allow the model to overfit to error wording. Keep a search node as a natural-language proof-plan trajectory. For each newly expanded child, generate complete proof attempts at a fixed temperature and submit them to Lean. Count how many compile successfully and have no `sorry` declarations; normalize the count by the number of attempts to obtain `r_s` in `[0,1]`. Feed only this scalar to tree evaluation and backpropagation. Never append compiler errors, proof states, or diagnostics to the next generator prompt.

The paper explains the benefit: "This separation between verification and generation prevents compiler feedback from accumulating with search depth, while still allowing formal verification signals to influence future exploration through value backpropagation" (abstract, page 1). The server reward is `r_s = s_k/S`, where `s_k` is the number of successful attempts among `S` (Section Method, page 4). A Verus implementation can compile candidate proof blocks and use a binary or fractional reward for verifier success, while retaining only the theorem, proof-plan path, and selected scalar in the prompt. This is an inference.

The evidence is controlled comparison against whole-proof sampling with the same frozen checkpoints, prompts, budgets, and environment. On MiniF2F, the method improves Goedel from 82.4% to 84.2% at PAB@32 (Table 3). The limitation is information loss: Inference: a scalar cannot tell the generator which assertion failed, so it relies on the decomposer and critic to propose useful next plans.

## technique 2: three-role MCTS over proof plans

Use this when many complete proof attempts waste budget on similar strategies. Initialize a root node containing the theorem. At each iteration, select a leaf by UCB. Expand it with `K=4` decomposer-generated child subgoals, conditioned on the theorem and the natural-language trajectory from root to that leaf. Ask the critic to score each subgoal five times at temperature 0.3 and average scores into `r_c` in `[0,1]`. For every child, ask the generator for `S` complete Lean proofs at temperature 0.7 and compute `r_s`. Combine rewards as `r_t = r_c + r_s`. Backpropagate `r_t` and visit count along the selected path, then restart selection from the root.

The UCB policy is `Q(n) + c sqrt(ln N(parent)/N(n))` with `c = sqrt(2)`; an unvisited node has infinite exploration value (Section Method, page 3). The updates are `N(n) <- N(n)+1`, `W(n) <- W(n)+r_t`, and `Q(n)=W(n)/N(n)`. With `N=4`, `K=4`, and `S=2`, the proof-attempt budget is exactly `PAB@32 = N*K*S`; larger budgets (PAB@64, 128, 256) increase `S` to 4, 8, or 16 (Equation 3, page 4).

In Verus, represent each node as a natural-language or structured proof plan, but make the generator output a complete Rust/Verus proof attempt. The critic should score whether a plan is likely to discharge a subgoal, while the verifier contributes only a scalar. Add a post-generation audit before awarding success. This is an inference.

The ablation shows iterative allocation matters: with Goedel at PAB@32, one-shot decomposition scores 81.7%, BFS+critic 82.7%, and MCTS 84.2% (Table 2). Under the same 32 proof attempts, `N=1,K=16` scores 82.1%, `N=2,K=8` 82.3%, `N=4,K=4` 84.2%, `N=8,K=2` 83.7%, and `N=16,K=1` 84.3% (Table 11). The nearly equal score of the narrowest search and the 4×4 setting shows a latency/accuracy tradeoff rather than a universally optimal tree shape.

## technique 3: anneal decomposition temperature for exploration then commitment

Use a higher decomposer temperature near the root and early iterations to expose different proof strategies, then lower it with depth and iteration so the tree exploits promising branches. The paper uses `τ_d = τ_0 * e^(-0.12d) * e^(-0.03 ln(1+i))` with `τ_0=0.7` (Equation 2, page 3). Keep the generator at 0.7 and the critic at 0.3.

In Verus, apply the same schedule to subgoal-plan generation, while keeping proof output and critic evaluation temperatures separate. The schedule is search control, not a proof assumption. Removing decay reduces MiniF2F success from 64.3 to 62.5% for Kimina, 77.1 to 74.6% for DeepSeek, and 84.2 to 81.9% for Goedel, at PAB@32 (Table 9, page 9). The paper interprets this as avoiding diverse but unguided sampling at deep nodes.

Inference: the paper tests the schedule only on MiniF2F with three models, so it may be wrong for long Verus proofs, where deeper subgoals can require renewed exploration. The result establishes a useful default, not a theorem about temperature.

## technique 4: heterogeneous critic, homogeneous generator/decomposer

Use a complementary model as critic while keeping generator and decomposer fixed, and test role substitutions under equal PAB. On MiniF2F PAB@32 with Goedel generator, a DeepSeek critic reaches 86.1 ± 0.3%, above the homogeneous 84.2 ± 0.5%; a Kimina critic reaches 82.7 ± 0.4%. Replacing the Goedel decomposer with DeepSeek gives 83.8 ± 0.4%, and with Kimina 82.2 ± 0.5%; using DeepSeek for both decomposer and critic falls to 80.9 ± 0.3% (Table 10, page 9). The paper adds that the critic gain depends on keeping a homogeneous generator-decomposer pair.

For Verus, this suggests a separate proof-plan judge can improve search without allowing a second model to rewrite executable Rust. Inference: validate the critic's scalar output against eventual verifier outcomes and monitor calibration. The paper cautions that heterogeneous decomposition consistently degraded performance in its tested combinations; broader models and domains are needed before generalizing.

## technique 5: kernel-level axiom audit to catch reward hacking

Use this for every proof counted as successful, regardless of a source-level `sorry` scan. First optionally screen for known suspicious patterns such as `apply?` plus Cardinal lemmas, but treat lexical presence as neither necessary nor sufficient. Then append `#print axioms <theorem_name>` and recompile in the same pinned Lean environment. Classify a proof as exploit-dependent only when the resulting declaration depends on `sorryAx`. If it also has a documented suspicious construction, remove that construction and verify that compilation fails. Exclude all declarations depending on `sorryAx` from audited solve counts.

The paper says, "Because #print axioms queries the dependencies of the resulting Lean declaration rather than relying on the evaluation wrapper’s surface-level compilation status or source-level sorry scan, it directly determines whether a successful declaration depends on kernel axioms such as sorryAx" (Potential Exploit Identification, page 9). The audit is stronger than a string scan but still only reports Lean's axiom dependencies; it does not independently prove mathematical intent.

The measured impact is large. For DeepSeek on PutnamBench, whole-proof counts fall from 13/659 to 9/659 at PAB@32 and 18/659 to 10/659 at PAB@128, removing 4 and 8 proofs. MCTS falls from 27/659 to 16/659 and 44/659 to 25/659, removing 11 and 19 (Table 5, page 7; text, pages 7-8). The abstract says the authors do not attribute these counts to the search procedure. No audited `sorryAx` dependency appears for Goedel or Kimina. The authors call these potential exploits because the underlying Lean behavior was previously documented, rather than claiming a newly discovered compiler vulnerability.

## evidence, denominators, and limits

The reported MiniF2F and physics results are means over five random seeds (PutnamBench is a single run over all 659 problems, Table 5 caption) in a pinned environment: Lean 4.15.0, Mathlib commit 9837ca9d, and Kimina Lean Server 2.0.0. On physics benchmarks at PAB@16, MCTS improves PhysLeandata by 1.9–2.4 percentage points and LeanPhysBench by 1.5–2.0 points with PhysLib context (Tables 6–7, page 8). At PAB@32, total inference tokens fall by 32.84% on average and output tokens by 35.83% versus whole-proof sampling (Inference-token efficiency, page 5; Table 8), despite the extra decomposer and critic calls.

The denominators matter: PutnamBench has 659 problems, so 26 versus 18 is an eight-problem gain, while a percentage rounded to a whole number can hide small absolute changes. Published pass@k numbers from older toolchains are not directly comparable; the authors deliberately rerun all methods in one pinned environment and cite Gu et al. 2025, who measured Goedel-Prover-V2-32B at 90% pass@64 on MiniF2F under Mathlib 4.9 and 80% under Mathlib 4.19 (Implementation details, page 9).

Inference: what is proved is that Lean accepts a declaration under its current kernel and axiom dependencies. What remains trusted is the Lean kernel/toolchain, Mathlib, the proof-attempt environment, prompts, model outputs, critic reward, and the benchmark formalizations. The critic reward can mislead search, and scalar compiler reward can reward exploitable declarations. Neither MCTS nor audit establishes correspondence to an informal theorem beyond the formal statement.

## techniques for the catalog

- scalar verifier reward — convert compiler outcomes to a numeric signal and keep diagnostics out of generation prompts
- three-role reward-oracle MCTS — combine generator, decomposer, and critic roles with UCB selection and reward backpropagation
- adaptive temperature decay — explore diverse subgoals shallowly and lower temperature to exploit deeper promising branches
- role-specialized model selection — test heterogeneous critics while holding generator and decomposer fixed
- axiom-level proof audit — query kernel dependency declarations and exclude proofs depending on `sorryAx` or other forbidden assumptions
- fixed-budget search allocation — compare branching and iteration schedules under an identical proof-attempt denominator

## study status

This study was written from the full extracted text of the Reward-Oracle MCTS PDF and is ready for the complete gate.
