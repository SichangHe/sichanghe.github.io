# CuDIP: Enhancing Theorem Proving in LLMs via Curriculum Learning-based Direct Preference Optimization
(authored by agents unless marked 🧑)
Tag: `shi2025cudip`, [paper](https://arxiv.org/abs/2502.18532)

## scope and result

CuDIP trains a Lean theorem prover with supervised fine-tuning (SFT), then repeatedly creates tactic preference pairs and applies Direct Preference Optimization (DPO) on progressively harder proof states. The paper's abstract says: “We then integrate this preference data construction method with curriculum learning to iteratively fine-tune the theorem proving model through DPO.” (Abstract, p. 1.) Its experiments use Mathlib4 for training and MiniF2F and ProofNet for evaluation. MiniF2F has 488 problems, with 244 each in validation and test; ProofNet has 371 source examples, of which 360 were translated to Lean 4 (Section 5.1, p. 8). The headline Mathstral prover plus Llama-3.1 score generator reaches 38.5% Pass@1 on both MiniF2F splits and 12.7% on ProofNet; the denominators are 244, 244, and 360 respectively (Table 1, p. 9). Those are proof-search success rates, not a proof that the training method is sound: Lean checks candidate proofs, while the learned data construction and search policy remain empirical components.

## technique: curriculum data from proof distance

Use this when a formal dataset contains complete proof traces and a prover should learn from easy states before hard states. The paper defines a state’s distance as the number of tactics to reach “no goals,” and defines difficulty as the distance from the state to the final proof goal (Section 4.2, p. 5). For every theorem trace, extract each state `s_i`, its next tactic `t_i`, and its distance `DIF_i`, forming `(s_i, t_i, DIF_i)`. Partition these triplets into `C_n` sets with equal distance and order the sets from low to high difficulty. The paper writes: “Then, divide the dataset Dtriplet into subsets in ascending order of DIFi.” (Section 4.2, p. 5.) SFT the base model on the entire ordered curriculum to obtain `P_0` before preference iterations.

Inference: in Verus, construct analogous records from verified Rust proof traces: a state can contain the current executable/specification context and unsatisfied proof obligation, while an action is a candidate `assert`, `requires` fact, lemma invocation, or invariant step. Store a ghost difficulty such as remaining obligations only if it is a measured search distance; Verus has no Lean proof-state API with this exact distance, so extracting it requires instrumentation. Train a tactic-generating model, but run every candidate through Verus before accepting it. The paper's ordering idea carries over; its Lean state representation and distance definition do not.

Evidence is the controlled comparison in Table 3: Mathstral without curriculum iteration scores 35.6%/36.4%/12.2% on MiniF2F-valid/test and ProofNet, while four curriculum iterations score 38.5%/38.5%/12.7% (Section 5.3, p. 10). Inference: this isolates an improvement in this setup, not a universal benefit. It assumes distance labels are available and that a single global ordering is useful; states with equal distance can still differ greatly in branching difficulty.

## technique: fine-grained preference scores from verified search

Use this to turn one expert proof trace plus model-generated alternatives into graded preference data without hand-labeling every pair. For each state in `C_n`, sample `k=32` candidate tactics from the current prover `P_{n-1}` (Implementation details, p. 8). Execute a candidate tactic, then run `n_attempt=10` subsequent proof searches with Monte Carlo Tree Search (MCTS). Score it as successful completions divided by attempts: `Score(t|s)=n_success/n_attempt` (Section 4.3, p. 6). The paper's method section states: “Execute each candidate tactic from s to reach a new proof state and perform nattempt subsequent proof search attempts using the current prover Pn−1 and Monte Carlo Tree Search (MCTS).” (Section 4.3, p. 6.) Because exhaustive scoring is expensive, randomly select 2,000 states per curriculum set for this search-based seed score data (Implementation details, p. 8). MCTS uses 1,000 simulations and depth 10; the search timeout is 60 seconds in round one and increases by 30 seconds per later round (Appendix B.3, p. 15).

Inference: the Verus analogue is to execute each generated proof action in a verifier sandbox, run bounded proof search or repeated verification attempts, and use the fraction that closes the obligation as its score. A Verus candidate must be checked with the actual compiler/verifier; a syntactically plausible `assert` is not evidence. Verus proof code is erased at runtime, so runtime execution cannot replace verification. This technique assumes repeatable search outcomes and treats a failed search within the timeout as a zero, which conflates “false tactic” with “not found in budget.”

## technique: learned score generator

Use this when MCTS scoring all states is too slow. SFT an existing language model `G_{n-1}` on the 2,000-state search-scored subset `SC'_n` to obtain `G_n`. Apply `G_n` to candidate tactics in the remaining states, producing `(state, tactic, score)` records. The paper explicitly describes this replacement: “For the remaining unscored data, language model-based scoring replaces the proof search scoring process, improving the efficiency of preference data construction.” (Section 4.3, p. 6.) The score prompt restricts output to a number from 0 to 1, where 0 means invalid/no progress and 1 means a completed proof (Appendix C.2, p. 17). Ten samples per candidate are averaged; score-generator temperature is 0.1 (Implementation details, p. 8).

Inference: for Verus, prompt a score model with the current Rust/Verus proof state and candidate proof code, but calibrate it only against verifier outcomes. Keep the score model outside the trusted base: Verus, its solver, and the checked specification decide acceptance. A Verus implementation can cache `(obligation, candidate, verifier result)` and periodically retrain the scorer. The paper does not establish calibration, robustness to distribution shift, or safety of model scores; it assumes the sampled subset represents the remaining curriculum data.

## technique: thresholded preference pairing

Use this to prevent ambiguous alternatives from becoming DPO labels. For each state, compare candidate scores and retain `(s,t_w,t_l)` only when `Score(t_w|s)>Score(t_l|s)` and the absolute difference exceeds threshold `Th` (Section 4.3, p. 7). Appendix B.4 instantiates `Th>0.5` and notes that nonzero-score tactics represent some successful continuations. The resulting set is `D_P`; in DPO, state `s` is prompt `x`, preferred tactic is `y_w`, and dispreferred tactic is `y_l` (Section 4.4, p. 8).

Inference: a Verus pair should contain two candidate proof fragments for the same obligation, with the winner required to verify and the loser either failing or having a lower measured completion rate. Do not label a fragment “bad” merely because a language model dislikes it. The threshold reduces noisy labels but discards close alternatives and depends on the score denominator of ten attempts.

## technique: curriculum DPO iteration

For each difficulty set `C_n`, sample tactics with `P_{n-1}`, create search and generated scores, filter pairs, and optimize DPO with `P_{n-1}` as the reference. Algorithm 1 gives the operational sequence: use `C_n`; sample `T`; score a subset; SFT `G_n`; score remaining data; filter/pair; set `Pref←P_{n-1}`; minimize the DPO loss to obtain `P_n` (Algorithm 1, p. 7). DPO uses triplets `(x,y_w,y_l)` and the paper's loss with β controlling divergence from the reference (Section 3.1, p. 3); experiments use β=0.1, LoRA SFT, learning rate `2.0×10^-5` for base training and `5.0×10^-6` for DPO, three SFT epochs and one DPO epoch (Appendix B, pp. 15–16).

The paper reports four-round trajectories. For Mathstral/Llama-3.1, MiniF2F-valid rises 36.0%, 36.4%, 37.7%, 38.5%, while ProofNet rises 11.6%, 12.5%, 12.7%, 12.7% (Table 4, p. 14). Inference: a Verus loop can retrain a proof-action model after each difficulty band, but each generated proof must still pass Verus; DPO changes model probabilities and does not itself prove code. Stop when a held-out verifier-checked metric stops improving, as the paper says to repeat “until no further performance improvement is observed” (Section 4.1, p. 5).

## prompts, evidence, and boundaries

The prover prompt serializes a Lean state as JSON and requires a Lean tactic string with no `sorry` (Appendix C.1, p. 16). The paper's example predicts `linarith` after substituting a hypothesis (Appendix D.1, p. 18). Inference: for Verus, require a structured JSON object containing Rust/Verus context and a proof fragment, then compile and verify it; prohibit placeholders such as `assume`, `admit`, or unchecked external bodies according to the project's policy.

The principal evidence is Table 1's Pass@1 results across three prover/score-generator groups, Table 2's FGPS ablation, Table 3's curriculum ablation, and Table 4's four iterations (pp. 9–14). Table 2 compares Mathstral with and without FGPS: MiniF2F-valid 35.2% versus 36.0%, test 35.6% versus 36.0%, and ProofNet 11.6% in both conditions (Table 2, p. 10). The paper itself claims: “The use of the score generator for fine-grained scoring significantly improved the model’s proof success rate.” (Section 5.3, p. 10.) That claim is stronger than the unchanged ProofNet percentage supports; the table shows gains only on the two MiniF2F columns.

What is proved: Lean accepts the counted candidate proofs under the stated 300-second best-first search evaluation limit (Section 5.1, p. 8). What remains trusted: Lean, Mathlib specifications, translation of 360 ProofNet proofs, the search implementation, MCTS, model code, data partitioning, and the correctness of the theorem statements. Inference: for VL, the threat is substantial but bounded: agent-written Verus proofs could be guided toward verifier-accepted obligations, yet learned scores can bias search, omit needed lemmas, or exploit an over-weak specification. Existing Verus automation, solver behavior, and contract quality remain the decisive product risks; CuDIP supplies a data and training loop rather than a new soundness argument.

## techniques for the catalog

- distance curriculum — partition proof-state/action traces by remaining proof distance and train from easy to hard
- MCTS tactic scoring — score each candidate by the fraction of bounded subsequent searches that complete the proof
- learned score generator — distill expensive verifier/search scores into a model for unscored states
- thresholded pairing — create DPO winner/loser pairs only when their measured scores differ by a threshold
- iterative DPO — apply preference optimization per curriculum band, using the prior prover as reference
- verifier-gated prompting — require structured proof actions and accept only artifacts checked by the formal verifier
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
