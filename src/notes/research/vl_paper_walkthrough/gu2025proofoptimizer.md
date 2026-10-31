# ProofOptimizer: Training Language Models to Simplify Proofs without Human Demonstrations
(authored by agents unless marked 🧑)
Tag: `gu2025proofoptimizer`, [paper](http://arxiv.org/abs/2510.15700v1)
## scope and contribution
ProofOptimizer treats simplification as a verified optimization problem. For a valid Lean statement s and proof p, it seeks an alternative proof p* minimizing a deterministic, automatically computed complexity L. The paper uses Lean-token count, with comments and line breaks ignored, while noting that the method is metric agnostic. It states: “Our method is agnostic to the choice of complexity measure L, provided that it is deterministic and can be automatically computed from the proof.” (section 2, p. 6). The target is an existing proof, so correctness is preserved by Lean compilation rather than by a human label.

The abstract reports that “ProofOptimizer is trained via expert iteration and reinforcement learning, using Lean to verify simplifications and provide training signal.” (abstract, p. 1) The system has three concrete components: a symbolic Lean linter, a 7B model fine-tuned for simplification, and iterative inference. The linter removes tactics that do not change proof state. The model proposes alternatives; Lean accepts only valid candidates. The loop repeatedly retains the shortest valid candidate. The paper also says “Proof simplification is therefore a critical bottleneck.” (abstract, p. 1) The motivating failure mode is a correct but bloated RL-generated proof: the paper gives Seed-Prover's IMO 2025 P1 proof as 4,357 lines, 16 times its informal counterpart by character count (introduction, p. 4).

## technique: build simplification data from proof sketches
Inference: use this when aligned original/simplified proof pairs are scarce. The paper's four-stage recipe is:

1. collect Goedel-Pset theorem-proving problems, filtering simple computational problems (section 3.1, p. 6)
2. train a model to turn each natural-language solution into a high-level Lean proof sketch with usually 2–10 high-level steps represented by `have` statements and `sorry` placeholders (section 3.1, p. 6; appendix A.2, p. 21)
3. extract every `sorry` goal as a separate theorem with `extract goal`; 518K extracted theorems are filtered by an AUTO tactic, leaving 307K (section 3.1, p. 6; appendix A.2, p. 22)
4. ask Goedel-Prover-V2-32B for four proof attempts per remaining theorem; 145K proved theorems become simplification targets (section 3.1, p. 7; appendix A.2, p. 22)

The paper's example splits a sequence-sum proof into lemmas for the arithmetic sequence, closed forms for a_n and b_n, and the final sum, then extracts a theorem such as `a n = 2 * n - 1` from a `sorry` goal (appendix A.2, Listings 1–2, p. 21). AUTO repeatedly tries tactics including `rfl`, `tauto`, `assumption`, `norm_num`, `linarith`, and `aesop` to discard trivial goals (appendix A.2, Listing 3, p. 22).

Inference: for Verus, the analogous data builder would generate a high-level Rust/Verus proof skeleton with `ensures` and intermediate `assert`/`assert forall` obligations, split each unresolved obligation into a lemma target, discard obligations solved by the verifier's routine automation, then retain only verifier-checked proofs. Lean's `sorry` is a data-generation placeholder and must not be carried into product code.

## technique: expert iteration (ExpIt)
Inference: use this when a verifier can cheaply check candidate rewrites and the model should learn from its own successful simplifications. Starting from model π0 and proof set P0, each iteration samples four simplifications for every proof x, uses Lean to choose the shortest correct y from the original and candidates, retains training pairs only if `len(y) ≤ 0.8 · len(x)`, and fine-tunes πi on those pairs. The shortest correct proofs become the next seed set (section 3.1.1, p. 7). For later rounds, the original proof x′ is also paired with the shorter y so the model learns a valid larger-to-smaller transformation.

Inference: in Verus, compile each candidate with `verus`, compare a deterministic metric such as token count or assertion count, and fine-tune on `(old_fn, shorter_fn)` pairs only after verification. A Rust function's executable behavior and specifications must remain identical; Lean tactic syntax and proof-state annotations do not transfer.

## technique: online and test-time reinforcement learning
Inference: use online RL when reward can be computed from verifier acceptance and a measurable reduction. The paper defines `R(x,y)=(|y|-|x|)/|x|` only when y is valid and no longer than x, otherwise zero (the sign is as printed). It uses asynchronous GRPO with eight-sample mean-reward baseline, no standard-deviation normalization, no KL regularization, and drops zero-advantage sequences (section 3.1.2, p. 7). Test-time RL applies the same recipe jointly to evaluation sets while keeping each input proof fixed, changing only model parameters (section 3.2, p. 7).

Inference: the printed reward is nonpositive for shorter proofs and conflicts with the stated shortening objective if maximized; the paper alone does not establish the implemented sign. For Verus, a candidate objective is a positive normalized decrease in token count or verification cost, conditional on verifier acceptance. Measure verification cost directly when that is the objective.

## technique: linter, repair, and iterative shortening
The linter invokes Lean's `linter.unusedTactic`, which reports tactics that do not change proof state (section 3.2, p. 7). Repair samples 64 simplifications, sends failed ones and execution errors to Goedel-Prover-V2-32B, then lints successful repairs (section 4.2, p. 9). Iterative shortening samples k candidates, keeps the shortest correct proof, and repeats from that proof (section 3.2, p. 8). Repair is weaker here: only 4.8% of miniF2F and 1.8% of PutnamBench post-linted repairs beat the best direct simplification (table 2, p. 10).

Inference: a Verus repair loop should pass verifier diagnostics back to the generator, but accept a repaired function only after a fresh full verification and specification-equivalence check. Verus has no Lean `unusedTactic` linter; an implementation needs a Rust/Verus-specific dead-assertion or no-state-change analysis.

## evidence, limits, and trust
The evaluation uses 194 miniF2F proofs (mean 334 tokens) and 75 PutnamBench proofs (mean 1,468) (section 4, p. 8). With ProofOptimizer-ExpIt, iterative shortening uses 64 samples per iteration for six iterations, then 1,024 for iterations seven and eight. It reduces mean lengths 334→75 and 1,468→811; the separately averaged per-proof reductions are 87.9% and 57.2% (section 4.3, pp. 10–11; appendix C.1, table 5, p. 27). Four Seed-Prover IMO proofs shrink by 43.8%, 51.7%, 50.1%, and 53.8% (table 3, p. 11). Their experiment uses approximately 15–20 iterations, 64–4,096 samples per iteration, and 3,000 H100 GPU hours per problem, without fixing budgets across problems (appendix C.3, p. 29). The introduction reports: “Training our base model on shortened proofs leads to 2% better performance on miniF2F relative to training on unshortened proofs (Sec. 5.1).” (p. 5) Section 5.1 describes this as slightly higher evaluation accuracy, with results plotted in Fig. 5 (pp. 11–12). Execution profiling finds PutnamBench 50/75 with >10% speedup and 22/75 with >50%; miniF2F is 114/194 and 56/194 (section 5.2, p. 12). Optimizing Lean heartbeats instead yields 138/194 and 81/194 above those thresholds (section 5.2.1, p. 13).

The paper explicitly reports failure: repaired proofs are often longer, and a shorter proof can be slower when it replaces a fast algorithm with brute-force interval cases (section 5.2, p. 12). Longer proofs remain harder to simplify (section 4.3, pp. 10–11). For the IMO experiment, the authors state: “Finally, to ensure the correctness of our simplified proofs, we use SafeVerify to confirm that all four simplified proofs match the specification of the original proof without any environmental manipulation.” (appendix C.3, p. 29) They retain all original sub-theorem statements and simplify only their proofs, excluding structural simplifications and statement length from the metric (appendix C.3, p. 29). Inference: applying this approach to verified Rust requires preserving specifications and executable behavior; verifier acceptance alone cannot repair an incorrect specification. The paper provides no Verus evaluation or direct human-readability measurement.

## techniques for the catalog
- proof simplification with verifier acceptance — generate alternatives and retain only those compiled by the proof assistant
- proof-sketch obligation extraction — split high-level sketches at unresolved subgoals to create scalable theorem data
- expert iteration — train on verified candidates that beat a fixed reduction threshold
- verifier-rewarded online RL — reward valid reductions with a normalized metric and verifier feedback
- iterative shortest-candidate search — repeatedly sample, verify, and continue from the shortest candidate
- cost-aware simplification — optimize heartbeat or execution cost when token length is not the product objective
