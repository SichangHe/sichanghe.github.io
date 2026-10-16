# DeepSeek-Prover-V1.5: Harnessing Proof Assistant Feedback for Reinforcement Learning and Monte-Carlo Tree Search
(authored by agents unless marked 🧑)
Tag: `xin2024deepseek`, [paper](http://arxiv.org/abs/2408.08152v1)

## what the paper establishes

DeepSeek-Prover-V1.5 is a 7-billion-parameter Lean 4 prover combining additional mathematical pre-training, supervised fine-tuning (SFT), reinforcement learning from proof-assistant feedback (RLPAF), and inference-time Monte-Carlo tree search (MCTS). The central engineering idea is to keep whole-proof generation, but expose the verifier's intermediate tactic state when a generated proof fails. The abstract states: “Further refinement is achieved through reinforcement learning from proof assistant feedback (RLPAF).” It also says: “Beyond the single-pass whole-proof generation approach of DeepSeek-Prover-V1, we propose RMaxTS, a variant of Monte-Carlo tree search that employs an intrinsic-reward-driven exploration strategy to generate diverse proof paths.” (Abstract, p. 1.)

The system proves Lean theorems only when Lean 4 accepts the generated code under the stated imports and 300-second timeout. It does not prove that the natural-language theorem expresses the intended mathematics, that Mathlib's specifications are correct, or that a Verus/Rust implementation has the same behavior. Inference: VL can borrow the verifier-in-the-loop control loop, but must replace Lean feedback with Verus diagnostics and Rust/Verus syntax and must write contracts for the target program.

## technique 1: whole-proof generation with compiler feedback

what it is and when to use it. Generate an entire proof from a theorem statement, submit it to the proof assistant, and use the result as an exact binary correctness signal. This is appropriate when a model can produce a complete proof cheaply and when a proof assistant can check each candidate. The paper contrasts proof-step generation, which “predicts each subsequent tactic and verifies it using the formal verifier to obtain updated information about the current tactic state,” with whole-proof generation, which produces all proof code in one pass (Introduction, p. 2).

how to do it. (1) Build a prompt containing the Lean theorem and imports. (2) Sample a complete proof. (3) Run Lean with Mathlib4 and Aesop; terminate verification after 300 seconds. (4) Accept only code that Lean verifies and that closes the theorem. (5) Repeat up to a sample budget and report pass@K, the fraction of benchmark problems for which at least one of K attempts verifies. Their concrete miniF2F test setup uses one A100-40G GPU, vLLM, temperature 1, top-p 0.95, maximum 2,048 generated tokens, Mathlib4 and Aesop (Section 2.4, p. 7).

The example theorem `amc12a_2002_p1` generates a proof that rewrites the polynomial, splits a product-zero equation into cases, proves the two roots, rewrites the finite sum, and calls `norm_num` (Figure 2, pp. 3 and 9). That example is useful because every accepted candidate is checked by Lean rather than judged by text similarity.

Verus form. Inference: put the executable Rust function and its `requires`/`ensures` contract in the prompt, ask the model for a complete Rust/Verus item, and run Verus. Keep proof-only lemmas in `proof fn` blocks and mathematical definitions in `spec fn`; do not call proof code at runtime. A generated candidate is accepted only when Verus verifies the item. The target-specific contract and any loop `invariant` must be supplied by the user or synthesized and then reviewed; Lean's theorem statement does not automatically become a Rust postcondition.

evidence and limits. DeepSeek-Prover-V1.5-RL reaches 60.2% on miniF2F-test with a 16 × 6400 single-pass budget and 22.6% on all ProofNet with 4 × 6400 (Tables 1–2, pp. 14–15). At 128 samples, RL CoT is 51.6% ± 0.5% on miniF2F-test and 18.2% ± 0.5% on ProofNet-test (Figure 3, p. 7). These are benchmark pass rates, not correctness rates for arbitrary software. The model can produce syntactically valid but incorrect proofs; Lean rejects them. The approach assumes the imported libraries and verifier are trusted and that a 2,048-token/300-second budget is sufficient.

## technique 2: expert iteration and thought-augmented SFT

what it is and when to use it. Make a code-completion corpus from verified proofs, repeatedly generate candidate proofs, retain verified data, retrain, and generate more. Add natural-language reasoning as comments before the proof and before individual tactics. This supplies a planning signal while preserving executable Lean code. The paper's exact procedure is: “This involves generating proofs using the language model, verifying the generated proof data, retraining the model with the verified data, and then using the optimized model to generate additional proof data.” (Section 2.2, p. 5.) The resulting dataset contains 9,645k sequences (Section 2.2, p. 5).

how to do it. (1) Collect theorems from Mathlib4, synthetic DeepSeek-Prover-V1 data, Lean Workbook, and benchmark validation sets. (2) Generate proofs with the current model. (3) Verify each proof and keep verified examples. (4) Ask DeepSeek-Coder V2 236B to insert either a complete natural-language solution at the start of a proof block or alternating explanations before corresponding Lean tactics. (5) Retrain by SFT. (6) Repeat expert iteration. For the tactic-state objective, enhance Lean's REPL with LeanDojo extraction, record each tactic's position and before/after states, and insert the verifier state as a comment `/- tactic state: ... -/`. Tokens after that marker are the supervised response; preceding code is prompt (Section 2.2, pp. 5–6). SFT runs for 9B tokens, batch size 2,048, constant learning rate 1e-4, 100 warm-up steps, and 4,096-token context (p. 6).

Verus form. Inference: build a corpus of Rust/Verus functions whose proofs have passed Verus, retaining the exact source and diagnostics. Add comments describing the intended mathematical step and, where available, the current Verus verification context. Train completion on executable code plus contracts and `proof fn` blocks. Unlike Lean tactic states, Verus diagnostics are not guaranteed to expose a stable, complete logical state; therefore the comment is guidance, not a proof fact. Keep generated specifications separate from executable code and manually audit assumptions.

evidence and limits. SFT alone raises miniF2F pass@128 from the base model's 29.7% ± 0.5% to 50.4% ± 0.4% and ProofNet-test from 9.7% ± 0.7% to 15.9% ± 0.6% (Figure 3, p. 7). The corpus is partly synthetic and partly generated by a much larger annotator; its quality depends on Lean acceptance and on the correctness of the theorem statements. Inference: acceptance filtering removes invalid proofs but cannot detect an underspecified theorem or an incorrect comment.

## technique 3: RL from proof-assistant feedback (GRPO)

what it is and when to use it. Use the proof assistant as a reward oracle instead of training a separate reward model. Select prompts for which the SFT model succeeds sometimes, sample a group of candidates, and optimize relative performance with Group Relative Policy Optimization (GRPO). The paper says: “each generated proof receives a reward of 1 if verified as correct, and 0 otherwise.” (Section 2.3, p. 6.)

how to do it. (1) Filter SFT theorems to moderate success rates, retaining approximately 4.5k unique statements. (2) Prefix each with CoT and non-CoT guidance. (3) For each theorem, sample 32 proofs, each up to 2,048 tokens. (4) Verify every proof in Lean and assign 1/0 reward. (5) Apply GRPO using the group-relative rewards; initialize and reference against SFT, with learning rate 5e-6 and KL coefficient 0.02; batch size 512 (Section 2.3, p. 6). The prompt filter is intended to ensure groups contain both correct and incorrect candidates, avoiding all-zero feedback.

Verus form. Inference: sample groups of candidate Rust/Verus proofs for a fixed contract, run Verus, and use 1 for a verified candidate and 0 otherwise. A Verus-specific reward may need to distinguish compile errors, failed postconditions, timeout, and trusted `external_body` assumptions; the paper's binary Lean reward does not justify those distinctions. Never reward a function merely because it compiles if its contract is absent or vacuous.

evidence and limits. At pass@128, RL CoT is 51.6% ± 0.5% on miniF2F-test and 18.2% ± 0.5% on ProofNet-test, versus SFT CoT 50.4% ± 0.4% and 15.9% ± 0.6% (Figure 3, p. 7). At 4 × 6400 on miniF2F-test, RL CoT is 58.4% ± 0.5% and SFT CoT 55.8% ± 0.7% (Table 3, p. 16). The reward is sparse and theorem difficulty filtering is essential. A zero reward does not explain which proof step failed; the paper explicitly leaves partial-proof value assessment as future work (Conclusion, pp. 18–19).

## technique 4: truncate-and-resume tactic-state tree search

what it is and when to use it. Convert a failed whole proof into a reusable prefix and search alternatives from intermediate states. This is useful for long proofs where restarting from the theorem wastes correct early tactics. The paper states: “If an error is detected, the code is truncated at the first error message, and any subsequent code is discarded.” (Introduction, p. 2.)

how to do it. (1) Generate a complete proof and submit it to Lean. (2) Find the earliest verification error. (3) Keep the successfully applied prefix and discard code after the error. (4) Parse the prefix into tactic-level edges with before/after states. (5) Store equivalent tactic codes that reach the same state. (6) Resume generation from a selected node by appending the chosen tactic and a comment containing the latest Lean state. (7) Verify the combined proof; if it fails, truncate again and add the valid segment as descendants. Figure 4's `amc12a_2002_p1` example shows an error at `cases'` and discards later code; Section 3.1 says each tactic is a tree edge and that a node can store several equivalent tactic codes (pp. 8–10).

Verus form. Inference: model a verified Rust prefix as a node containing source, function state, and the remaining postcondition. Resume at a verifier-reported failing statement by generating a replacement `proof fn`, lemma call, or invariant. Verus does not expose Lean tactic states; use the diagnostics and explicit assertions available from the current Verus toolchain. Rust ownership and mutable state mean that a textual prefix may change borrow obligations, so replay the entire item after each edit. Do not represent `invariant` as a function call; it is a loop annotation.

evidence and limits. RMaxTS with this abstraction reaches 63.5% on miniF2F-test at the `(32 × 6400)†` mixture budget and 25.3% on all ProofNet at `4 × 6400` (Tables 1–2, pp. 14–15). Removing tactic-state comments reduces the tree-search gain, especially at large budgets (Section 4.3, p. 17). The method assumes the verifier can identify a deterministic earliest failing point and that equivalent states are useful; generated comments can be stale if code changes.

## technique 5: RMaxTS selection, intrinsic reward, and parallel execution

what it is and when to use it. RMaxTS is MCTS with an intrinsic reward for discovering a new tactic-state node and discounted UCB for its non-stationary reward. Use it when completed-proof rewards are too sparse for ordinary UCT. The intrinsic reward is exactly “I [at least one new node is added to the search tree]” (Eq. 3, Section 3.3, p. 11). The paper selects the action maximizing `Q_UCB(s,a)`, where an imaginary child `⊘` permits expanding a non-leaf node (Eq. 1, Section 3.2, p. 10).

how to do it. (1) Start at the root and select a child or virtual expansion action by `Q + UCB`. (2) Expand by whole-proof generation from the node's prefix and state comment. (3) Verify and add the successful tactic path. (4) Assign intrinsic reward 1 if any new node was added, else 0; completed proofs additionally have extrinsic reward 1. (5) Backpropagate the trajectory reward. (6) Use discounted UCB with γ = 0.99 so recent discovery rewards outweigh old rewards (Eqs. 7–9, p. 12). (7) Repeat until success or sample budget exhaustion. Parallelize with 256 root runners, 32 tree-worker threads, asynchronous Lean processes, and virtual loss 0 for in-flight iterations (Section 3.4, p. 12).

Verus form. Inference: represent each node by a Rust/Verus proof prefix and a normalized verifier obligation. Reward a node only when the run adds a genuinely new obligation or closes the contract; hash canonicalized diagnostics and goal context to avoid rewarding textual duplicates. Use a normal MCTS implementation outside verified product code; the search orchestrator is trusted infrastructure, while every final Rust proof must pass Verus. Parallel verification must isolate compiler processes and pin toolchain/library versions.

evidence and limits. The ablation attributes performance to both components: at 16 × 6400 on miniF2F-test, RMaxTS is 62.7%, RMaxTS with UCB1 is 60.7%, and UCT without intrinsic reward is 61.1% (Figure 5, p. 17). The reported 63.5% mixture result uses half non-CoT and half CoT samples (Table 3, p. 16), so it is not directly comparable with a same-mode budget. Parallelism accelerates search but does not itself establish proof quality. The future-work section says exploitation and partial-proof critics remain unexplored (p. 19).

## what is proved, trusted, and missing

Lean proves only accepted formal statements under Mathlib4/Aesop and the stated environment. The model, data curation, GPU execution, vLLM, Lean REPL, Mathlib specifications, benchmark translations, and timeout policy remain trusted or operational assumptions. The benchmark denominators are 244 miniF2F test problems and 186 ProofNet test problems (Section 2.4, p. 7); percentages are pass@K over those sets, with ± values reported as standard deviations where shown. The paper reports ProofNet “all” values but does not give a separate all-set denominator in the table; it defines 185 validation and 186 test problems, so all is 371 by addition (inference from Section 2.4 and Table 2). The headline abstract says 25.3% ProofNet while Table 2 gives 25.3% for RMaxTS all at 4 × 6400; the 25.4% validation and 25.3% test values are separate columns.

Inference: for VL, the threat is moderate for proof-search productivity and high for unsound specification transfer. These techniques can increase candidate generation and repair, but a product of agent-written verified Rust still depends on non-vacuous contracts, trusted Verus/SMT components, library specifications, and review of unsafe or external code. Existing work already covers single-pass and tactic-level Lean search, expert iteration, RLPAF, and intrinsic-reward MCTS; VL should not redo those as novelty claims. A useful product experiment is a Verus-specific truncate-and-resume benchmark measuring accepted contracts, repair time, timeout rate, and failures caused by dependency changes.

## techniques for the catalog

- whole-proof verifier loop — sample complete proof code, run the proof assistant, and retain only verified candidates under a stated budget

- expert iteration with thought and state augmentation — retrain on verifier-accepted proofs annotated with natural-language plans and intermediate verifier states

- binary RL from proof-assistant feedback — optimize grouped candidate proofs with 1/0 rewards from formal verification

- truncate-and-resume search — preserve a valid prefix at the first error and resume generation from its verifier state

- RMaxTS intrinsic-reward MCTS — select tree nodes with UCB, reward newly discovered states, and use discounted UCB for non-stationary exploration

- parallel proof search — combine root runners, tree workers, asynchronous verifier processes, and virtual loss to raise search throughput
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
