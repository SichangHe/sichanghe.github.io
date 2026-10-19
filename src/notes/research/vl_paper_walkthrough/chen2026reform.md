# ReForm: Reflective Autoformalization with Prospective Bounded Sequence Optimization
(authored by agents unless marked 🧑)
Tag: `chen2026reform`, [paper](http://arxiv.org/abs/2510.24592v3)

## method

ReForm turns autoformalization into an iterative generate–critique–repair loop. Given question Q and history Ht of prior statements and critiques, iteration t generates statement St, then critique Ct. The paper says: “an iterative refinement process that interweaves formal statement generation with semantic self-validation.” (§3.1, p. 4). A final statement is emitted when the critique indicates adequate fidelity. The implementation serializes statement and critique generation in one autoregressive sequence, so the model can internalize what would otherwise require separate calls.

Inference: use this technique when compilation alone does not establish that the formal statement means the natural-language problem.

At iteration 1 generate `S1 = π(Q)`. At later iterations generate `St = π(Q,Ht)` using all prior attempts and critiques. Then generate `Ct = π(Q,Ht,St)`, explicitly identifying semantic discrepancies (§3.1, p. 4). In the paper's example, the first Lean statement asserts that the value at 7 is minimal. Its self-critique says: “The theorem only asserts the inequality, not the existence of the minimizer or its uniqueness.” (Appendix C, p. 20). The next round adds a function definition and a uniqueness condition; the final statement ends in `by sorry` (Appendix C, pp. 21–22). Inference: this is an illustration of the authors' critique and revision process, not a completed proof or independent confirmation that the critique was necessary.

## technique: heterogeneous rewards

ReForm separates final correctness from critique quality. The task reward is 1 only when the answer passes Lean compilation and an LLM consistency judge: `PassesLean(Ans) ∧ IsConsistent(Q,Ans)`; otherwise it is 0 (§3.2.1, p. 5). Each critique receives an auxiliary reward of 1 when it faithfully diagnoses the relation between Q and St, and 0 otherwise, penalizing false positives, false negatives, and premature termination (§3.2.1, p. 5). Footnote 1 assigns `IsConsistent` to CriticLean-14B and `IsFaithfulCritique` to Qwen3-235B-A22B. The authors explain the need: “optimizing solely for final task success provides no explicit signal for the critique quality, potentially causing the self-validation mechanism to degenerate into trivial or hallucinated assessments.” (§3.2, p. 5).

Inference: in Verus, use the verifier as the syntactic/proof signal and a separate semantic checker for whether generated `requires` and `ensures` preserve the intended behavior. Keep those rewards distinct. A compiling Rust function with a vacuous postcondition must not receive the same reward as a faithful contract.

## technique: prospective bounded sequence optimization

For trajectory rewards `[r_aux^1,...,r_aux^T,r_task]`, compute returns backward with `G_t = clip(r_t + γ G_{t+1}, r_min, r_max)`, where `γ ∈ (0,1]` (Eq. 3, §3.2.2, p. 6). Clipping keeps values inside the reward range. The paper describes each return as capturing the “value of the remaining sequence from that point forward.” (§3.2.2, p. 5). Normalize all returns jointly across N sampled trajectories: `A_j^t = (G_j^t - mean(G)) / std(G)`. All tokens in iteration t receive its advantage; update the policy using GRPO (§3.2.3, p. 6). The authors write: “Each Gt serves as the composite reward signal for the entire t-th iteration—encompassing both the statement generation St and its critique Ct —capturing how this complete reflective step contributes to the trajectory’s overall success.” (§3.2.2, p. 6). The printed boundary is `G_{T+1}=0`, while §3.2.3 includes returns through `T_j+1`. Inference: this terminal indexing needs clarification before implementing the recurrence.

The training pipeline first builds SFT trajectories: initial Lean generation, compiler check, semantic check, reflective correction, and repeat up to three rounds (Appendix A.1, pp. 15–16). It reports 447,508 trajectories: 371,679 one-iteration, 65,734 two-iteration, and 10,095 three-iteration (Appendix A.1, p. 15). For RL data selection, the SFT model samples eight candidates per problem; compiler and semantic checks determine pass rates used to select 2,048 problems across different difficulties (Appendix A.1, pp. 15–16). RL training itself uses a group size of 16 per question (Table 6, p. 15).

## evidence and Verus form

The main table evaluates miniF2F (244 test problems), ProofNet (186), PutnamBench (644), and AIME2025 (30) (§4.1, p. 6). ReForm-8B semantic consistency is 87.7%, 65.6%, 57.3%, and 46.7%; ReForm-32B is 91.4%, 70.4%, 62.3%, and 66.7% respectively (Table 1, p. 7). These denominators are benchmark problem counts, and the metric is LLM-judged semantic consistency jointly requiring syntactic validity. Ablations show the 8B scores fall from 87.7 to 84.0 on miniF2F and 46.7 to 26.7 on AIME25 without clipping; removing auxiliary rewards gives 52.1 and 40.0 on Putnam and AIME25 (Table 2, p. 8). Human checks classify 86.1% of miniF2F and 69.4% of ProofNet ReForm-8B statements as correct (§4.5, p. 9).

Inference: a Verus implementation can represent each candidate contract as a Rust item, run `cargo verus` as the proof check, and ask a critic to identify missing preconditions, quantifier mistakes, or vacuous postconditions. A repair iteration should retain the failed statement and structured critique. Such an adaptation would need its own training data and semantic evaluation for Verus contracts.

The paper's default semantic evaluation model is Qwen3-235B-A22B (§4.1, p. 6). ConsistencyCheck contains 859 expert-annotated items; classification accuracy is 85.8% for Gemini-2.5-Pro, 82.9% for Qwen3-235B-A22B, and 79.1% for CriticLean-14B (Table 3, p. 9). The paper also reports semantic errors in 16.4% of miniF2F and 38.5% of ProofNet human-written formal statements (§4.5, p. 9), Inference: these human-written references should not automatically be treated as ground truth.

Inference: threat to agent-written verified Rust is substantial at semantic alignment and reward-design boundaries. The verifier can establish the generated code's stated contract, while ReForm's loop tries to establish that the contract is the intended one; neither alone proves product intent.

## techniques for the catalog

- reflective generate–critique loop: condition each new formal statement on earlier semantic critiques
- heterogeneous rewards: score final verifier-plus-semantics correctness separately from critique faithfulness
- prospective bounded returns: propagate clipped future rewards backward and assign position-specific advantages
- stratified iterative data: build compiler-checked correction trajectories and RL problems covering different pass rates
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "All annotators were fairly compensated for their expertise and time according to prevailing standards for skilled technical work."): checked all quotations, numbers, references, method steps, title, author/year tag, and arXiv link against all 26 pages; corrected the AIME25 ablation starting score and return-equation page, clarified the example, reward judges, RL data selection, and terminal indexing, and marked adaptation judgments as inferences; did not reproduce experiments, inspect code or released datasets, or validate the Verus adaptation.
