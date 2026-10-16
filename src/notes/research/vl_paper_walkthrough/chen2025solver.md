# Solver-Informed RL: Grounding Large Language Models for Authentic Optimization Modeling
(authored by agents unless marked 🧑)
Tag: `chen2025solver`, [paper](http://arxiv.org/abs/2505.11792v3)

## what is verified

This paper trains language models to generate optimization models and executable solver code. It is not a proof assistant paper: its “verification” means executing generated code with a classical optimization solver, checking syntax/execution, feasibility, objective value, and selected structure in the emitted `.lp` file. The abstract states: “SIRL automatically assesses the executable code and the instance-level mathematical model represented by the associated .lp files.” (Abstract, PDF p. 1.) The resulting signals are used as rewards for reinforcement learning with verifiable reward (RLVR).

The paper contributes three relevant techniques: instance-enhanced self-consistency for data selection; solver-informed RL with a Partial-KL surrogate; and a two-stage, rule-based reward curriculum. These techniques can teach an agent to produce executable, solver-checkable artifacts, but they do not establish a formal theorem about arbitrary Rust code, memory safety, or a user requirement. The optimization solver, generated code, model extraction, ground-truth values, and benchmark labels remain the trust boundary.

## technique: solver-backed data synthesis and instance-enhanced self-consistency

What it is. Starting from curated seed problems, the pipeline samples and augments natural-language questions, uses an LLM judge for relevance and consistency, generates a mathematical model and executable code, executes the code with a solver, and keeps the objective value, feasibility result, and `.lp` model. The paper says: “This code is then executed to produce the objective value, feasibility status and the instance-level mathematical models represented by .lp files.” (Section 3.1, PDF p. 4.) Ten LLM roles independently produce trajectories for each problem.

The self-consistency score uses four features from each role's `.lp` instance: objective value (O_r), optimization direction (D_r), number of binary variables (N_{bin,r}), and number of general integer variables (N_{int,r}). For each feature, ψ counts how many roles have the same value. The score is (S(r)=w_1ψ(O_r)+w_2ψ(D_r)+w_3ψ(N_{bin,r})+w_4ψ(N_{int,r})), with all weights set to 1 in the implementation (Section 3.1, PDF p. 5). The response with maximum score supplies the definitive objective answer.

How to apply it.

1. Curate seed natural-language optimization problems and sample contextual scenarios (Section 3.1, p. 4).
2. Generate structurally similar questions, then augment semantic, modeling, and solution complexity (Section 3.1, p. 4).
3. Ask an LLM judge to filter for practical relevance and semantic consistency (Section 3.1, p. 4).
4. Generate the mathematical formulation and solver code; execute it and save the objective, status, and `.lp` file (Section 3.1, p. 4).
5. Generate ten role-specific answers, extract (O,D,N_{bin},N_{int}), compute each consensus count, and select the maximum-scoring response (Section 3.1, PDF pp. 4–5).
6. Filter out a question when the baseline Qwen-32B-Instruct model obtains an 80% pass rate, 8 of 10 attempts, at matching the optimal value; the authors call these instances too elementary (Section 3.1, PDF p. 5).

The paper reports an ablation with Qwen2.5 7B-Instruct and 32B-Instruct. On the five benchmark columns, instance self-consistency at 5 samples averages 45.0% (7B) and 51.2% (32B), versus value-only self-consistency averages 42.2% and 49.1%; at 10 samples the averages are 46.3% and 53.5% versus 44.4% and 51.9% (Table 2, PDF p. 9). The table does not state benchmark item counts in its caption, so each percentage's denominator is the corresponding benchmark's test set under the paper's pass@1 protocol, but the exact denominator is not supplied there.

Verus form. Inference: represent a generated candidate as a Rust struct containing a parsed model, code result, objective, and structural statistics. Use executable parsers and solver wrappers for filtering, then a Verus `proof fn` to prove a deterministic relation between a trusted model representation and a result. Use `spec fn` predicates for schema and objective consistency and `requires`/`ensures` for accepted candidates. The paper's `.lp` file consensus is runtime evidence, not a Verus proof; a proof cannot establish that ten stochastic roles are independent or that majority agreement means semantic correctness.

Limits. The scoring features can agree on the same wrong model, especially when objective value and variable counts coincide. The LLM judge and baseline difficulty filter are not formal verification. The 80% threshold is a data-curation heuristic, not a theorem.

## technique: SIRL and Partial KL

What it is. The policy generates a sequence of thoughts (z=(z_1,…,z_m)): reasoning segments (z_1,…,z_{m-2}), a concise mathematical model (z_{m-1}), and executable code (z_m). The final value is deterministically obtained by extracting and running the code, (y=g(x,z)) (Section 3.2, PDF p. 6). The paper uses REINFORCE++ with a clipped surrogate and token-level advantages. The reward is assigned at the end-of-sequence token, with a KL penalty against the old policy.

Partial KL applies that penalty only to model and code segments. The paper states: “This novel design selectively applies the KL penalty to the mathematical formulation (z_{m-1}) and solver code (z_m) segments.” (Section 3.2, PDF p. 7.) Reasoning tokens receive no KL penalty to encourage exploration; model/code tokens are regularized to preserve parseable, solver-compatible structure.

How to apply it.

1. Define a system prompt that marks reasoning, model, and code segments and makes code execution deterministic (Section 3.2, p. 6).
2. For each training problem, sample (K) complete trajectories from the current policy (Section 3.2, p. 7).
3. Execute each code segment with the optimization solver to obtain (y), then calculate the verifiable reward against (y^*) (Section 3.2, pp. 6–7).
4. Compute the token probability ratio and clipped REINFORCE++ objective (Section 3.2, p. 7).
5. Assign the terminal reward only at `[EOS]`, normalize token advantages across the minibatch, and subtract β times the KL estimator (Equation 4, PDF p. 7).
6. Set the KL term to ρ−logρ−1 for tokens in (z_{m-1}) and (z_m), and zero for earlier reasoning tokens (Equation 5, PDF p. 7).

Verus form. Inference: the closest VL analogue is a generate→compile→verify loop in which the model proposes Rust and Verus contracts, an executable process runs Verus, and only a verified candidate receives reward. A wrapper can store verifier output as data, while a `proof fn` can establish only deterministic properties of the candidate. Verus has no differentiable policy-gradient or KL primitive; Partial KL is a training-system inference, not a Verus construct. Keep proof code separate from runtime code and never treat a proof function as a runtime repair call.

Evidence and limits. Table 3 compares Partial KL, full KL, and no KL on MAMO Complex, IndustryOR, and OptMATH. Partial KL pass@1 is 51.7%, 33.0%, and 30.5%, with execution rates 98.1%, 96.0%, and 92.2%, respectively (Table 3, PDF p. 10). Full KL gives 48.3%, 30.0%, 28.3%; no KL gives 47.3%, 29.0%, 29.5%, with lower execution rates of 95.6%, 87.0%, and 80.1%. The denominators are benchmark instances under pass@1 and generated samples under execution rate; the paper does not state raw counts in the table. This is an ablation, not formal soundness evidence. It supports a training tradeoff: unconstrained reasoning improves exploration but can damage executable syntax.

## technique: staged solver reward

What it is. The reward is a rule-based curriculum. Stage 1 combines format, execution, and objective accuracy. Stage 2 adds a bonus when a correct solution uses advanced structures detectable in the `.lp` file, such as Big-M, binary variables, or nonlinear formulations. The paper states: “The success of our SIRL framework hinges on its verifiable reward function, implemented as a staged, rule-based system.” (Section 3.3, PDF p. 8.)

How to apply it.

1. Give a format reward when the output contains the required `<think>`, `<model>`, and `<python>` tags in order (Appendix Section 10, PDF p. 27).
2. Give an execution reward when the extracted code runs successfully (Appendix Section 10, p. 27).
3. Give an accuracy reward when the executed objective is within the specified tolerance of the ground truth (Appendix Section 10, p. 27).
4. In Stage 2, inspect the `.lp` artifact for advanced modeling features and add the bonus only when both correctness and the feature condition hold (Section 3.3 and Appendix Section 10, PDF pp. 8, 27).
5. Train with Stage 1 first, then Stage 2, so basic execution precedes advanced modeling (Section 3.3, p. 8).

There is a material specification discrepancy. The main experiment says a valid answer has relative error below (10^{-6}) (Section 4.1, PDF p. 8), while the reward-design appendix defines correctness as |y−y*| ≤ 0.01 (Appendix Section 10, PDF p. 27). The paper does not reconcile these criteria. Inference: VL should record both tolerances explicitly rather than silently inherit either one.

Table 4 compares two-stage rewards with one-stage alternatives. Two-stage pass@1 is 96.3%, 91.7%, 51.7%, 33.0%, and 30.5% across NL4OPT, MAMO Easy, MAMO Complex, IndustryOR, and OptMATH. Stage-1-only is 96.7%, 88.8%, 46.8%, 27.0%, and 28.9%; Stage-2-only is 92.2%, 89.6%, 49.3%, 28.0%, and 33.1% (Table 4, PDF p. 10). The paper says the integrated reward wins on most datasets except OptMATH. Again, raw test-set denominators are not reported in the table.

Verus form. Inference: split acceptance into executable checks and proof checks. A parser can check tags and syntax; Verus can check a frozen `requires`/`ensures` contract; a solver can provide optimization evidence. Store the tolerance, solver version, instance, and objective in a ghost audit record, and prove only the deterministic consistency relation. A reward bonus for “advanced technique” is a product policy and must not weaken the formal contract.

## results and threat to VL

Table 1 evaluates SIRL-Qwen2.5-7B and SIRL-Qwen2.5-32B on NL4OPT, MAMO Easy, MAMO Complex, IndustryOR, and OptMATH using pass@1 and the relative-error criterion (<10^{-6}) (Section 4.1, PDF p. 8). The 7B model scores 96.3%, 91.7%, 51.7%, 33.0%, and 30.5%, with a listed macro average of 60.6%. The 32B model scores 98.0%, 94.6%, 61.1%, 42.0%, and 45.8%, with macro average 68.3%. These percentages are per benchmark test set; the table gives no raw denominators. Training used eight 80GB H100 GPUs, approximately 24 wall-clock hours per stage, 384 GPU-hours total (Appendix Section 11, PDF p. 27).

The paper's measured object is generated optimization performance, not a formal proof guarantee. The solver checks one generated instance and one objective, and `.lp` statistics provide process-aware signals. It does not prove the natural-language problem was modeled faithfully, that the solver itself is correct, or that code is memory-safe outside the executed instance. The ground-truth objective, benchmark corrections, solver, parser, LLM judge, and reward implementation are trusted.

Inference: for VL, this creates a medium product threat to agent-authored verified Rust. The useful transfer is the closed-loop pattern: generate an artifact, run an independent checker, feed precise diagnostics back into training, and preserve structural evidence rather than rewarding only a final scalar. The optimization solver is not a formal verifier for Rust; Verus must still check the Rust contract. VL should not redo this paper's RL ablations, but should adapt solver-style staged rewards for syntax, compilation, Verus verification, and differential tests. Inference: the largest product risks are weak or inconsistent contracts, unsound external specifications, and reward hacking through a candidate that verifies a vacuous property. A Verus pass proves the stated contract, not the natural-language intent.

## techniques for the catalog

- solver-backed artifact checking: execute generated code and inspect solver status, objective, feasibility, and `.lp` structure
- instance-enhanced self-consistency: vote across objective and model-structure features instead of objective value alone
- Partial-KL RLVR: leave reasoning exploratory while regularizing mathematical-model and code tokens
- staged verifiable rewards: train first on format/execution/accuracy, then reward advanced modeling features only after correctness
- verifier-loop training: use independent execution or proof results as deterministic feedback for generated artifacts
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
