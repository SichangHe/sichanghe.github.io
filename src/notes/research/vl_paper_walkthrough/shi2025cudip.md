# CuDIP: Enhancing Theorem Proving in LLMs via Curriculum Learning-based Direct Preference Optimization
(authored by agents unless marked 🧑)
Tag: `shi2025cudip`, [paper](https://arxiv.org/abs/2502.18532)

## scope and result

CuDIP trains a Lean theorem prover with supervised fine-tuning (SFT), then repeatedly creates tactic preference pairs and applies Direct Preference Optimization (DPO) on progressively harder proof states. The paper's abstract says: “We then integrate this preference data construction method with curriculum learning to iteratively fine-tune the theorem proving model through DPO.” (Abstract, p. 1.) Its experiments use Mathlib4 for training and MiniF2F and ProofNet for evaluation. MiniF2F has 488 problems, with 244 each in validation and test; ProofNet has 371 source examples, of which 360 were translated to Lean 4 (Section 5.1, p. 8). The headline Mathstral prover plus Llama-3.1 score generator reaches 38.5% Pass@1 on both MiniF2F splits and 12.7% on ProofNet (Table 1, p. 9). Inference: these empirical search results do not establish a soundness theorem for the training method. The paper identifier is arXiv:2502.18532v1, dated 25 February 2025 (p. 1), supporting the linked arXiv page and the tag's author and year.

## technique: curriculum data from proof distance

The paper defines a state’s distance as the number of tactics to reach the completed proof, and defines difficulty as that distance in the given proof tree (Section 4.2, p. 5). For every theorem trace, extract each state `s_i`, its next tactic `t_i`, and its distance `DIF_i`, forming `(s_i, t_i, DIF_i)`. Partition these triplets into `C_n` sets with equal distance and order the sets from low to high difficulty. The paper writes: “Then, divide the dataset Dtriplet into subsets in ascending order of DIFi.” (Section 4.2, p. 6.) SFT the base model on the entire curriculum dataset to obtain `P_0` before preference iterations; the paper does not specify that this initial SFT follows the difficulty order.

Inference: a Verus adaptation could record the current proof context, an unsatisfied obligation, and a candidate assertion, lemma invocation, or invariant. It would need a way to measure remaining proof distance before applying this curriculum. The paper supplies neither a Verus state representation nor a Verus distance measure.

Table 3 reports Mathstral without curriculum iteration at 35.6%/36.4%/12.2% on MiniF2F-valid/test and ProofNet, versus 38.5%/38.5%/12.7% with four curriculum iterations (p. 11). The comparison combines the first four curriculum sets for one training round in the condition without curriculum iteration (Section 5.3, p. 10). Inference: this compares training schedules that differ in both ordering and iteration count, so it does not isolate ordering alone. Remaining proof distance also need not capture search difficulty.

## technique: fine-grained preference scores from verified search

For each state in `C_n`, sample `k=32` candidate tactics from the current prover `P_{n-1}`, at temperature 1.0 (Implementation details, p. 9). Execute a candidate tactic, then run `n_attempt=10` subsequent proof searches with Monte Carlo Tree Search (MCTS). Score it as successful completions divided by attempts: `Score(t|s)=n_success/n_attempt` (Section 4.3, p. 6). The paper's method section states: “Execute each candidate tactic from s to reach a new proof state and perform nattempt subsequent proof search attempts using the current prover Pn−1 and Monte Carlo Tree Search (MCTS).” (Section 4.3, p. 6.) Because exhaustive scoring is expensive, randomly select 2,000 data points per curriculum set for this search-based seed score data (Implementation details, p. 9). MCTS uses 1,000 simulations and depth 10; the search timeout is 60 seconds in round one and increases by 30 seconds per later round (Appendix B.3, pp. 15–16).

Inference: a Verus adaptation could apply each generated proof action, sample subsequent proof actions under a fixed search budget, and score the fraction of searches that produce a verifier-accepted completion. Repeating verification of an unchanged fragment would not reproduce CuDIP's continuation search. A zero search score cannot distinguish an unusable tactic from a valid continuation missed within the budget.

## technique: learned score generator

SFT an existing language model `G_{n-1}` on the search-scored subset `SC'_n` to obtain `G_n`. Apply `G_n` to candidate tactics in the remaining states, producing `(state, tactic, score)` records. The paper explicitly describes this replacement: “For the remaining unscored data, language model-based scoring replaces the proof search scoring process, improving the efficiency of preference data construction.” (Section 4.3, p. 6.) The score prompt restricts output to a number from 0 to 1, where 0 means invalid/no progress and 1 means a completed proof (Appendix C.2, p. 17). Ten samples per candidate are averaged; score-generator temperature is 0.1 (Implementation details, p. 9).

Inference: a Verus adaptation could train a score model on verifier-checked continuation outcomes and use its predictions to rank further search. Predictions should not substitute for verification of the completed proof. The paper does not evaluate score calibration or robustness when the scoring model encounters different data.

## technique: thresholded preference pairing

For each state, compare candidate scores and retain `(s,t_w,t_l)` only when `Score(t_w|s)>Score(t_l|s)` and the absolute difference exceeds threshold `Th` (Section 4.3, p. 7). Appendix B.4 sets `Th=0.5`: “We use a pair of tactics with a score difference of more than 0.5 as positive and counterexample in a dpo training data set.” (p. 16.) The resulting set is `D_P`; in DPO, state `s` is prompt `x`, preferred tactic is `y_w`, and dispreferred tactic is `y_l` (Section 4.4, p. 8).

Inference: a Verus adaptation could compare two candidate actions for the same obligation by estimated continuation success. A preferred action need not complete the proof on its own. The threshold discards close alternatives; whether it reduces label errors depends on the accuracy of both search scores and learned scores.

## technique: curriculum DPO iteration

For each difficulty set `C_n`, sample tactics with `P_{n-1}`, create search and generated scores, filter pairs, and optimize DPO with `P_{n-1}` as the reference. Algorithm 1 gives the operational sequence: use `C_n`; sample `T`; score a subset; SFT `G_n`; score remaining data; filter/pair; set `Pref←P_{n-1}`; minimize the DPO loss to obtain `P_n` (Algorithm 1, p. 8). DPO uses triplets `(x,y_w,y_l)` and the paper's loss with β controlling divergence from the reference (Section 3.1, p. 3); experiments use β=0.1, LoRA for base SFT, learning rate `2.0×10^-5` for base training and `5.0×10^-6` for DPO, three base SFT epochs and one DPO epoch (Appendix B, pp. 15–16).

The paper reports four-round trajectories. For Mathstral/Llama-3.1, MiniF2F-valid rises 36.0%, 36.4%, 37.7%, 38.5%, while ProofNet rises 11.6%, 12.5%, 12.7%, 12.7% (Table 4, p. 15). Section 4.1 says to repeat “until no further performance improvement is observed” (p. 5). Inference: a Verus loop could retrain a proof-action model after each difficulty band and stop when success on held-out, verifier-checked tasks stops improving. The paper does not specify a held-out stopping rule.

## prompts, evidence, and boundaries

The prover prompt serializes a Lean state as JSON and requires a Lean tactic string with no `sorry` (Appendix C.1, p. 16). The paper's example predicts `linarith` after substituting a hypothesis (Appendix D.1, p. 18). Inference: for Verus, require a structured JSON object containing Rust/Verus context and a proof fragment, then compile and verify it; prohibit placeholders such as `assume`, `admit`, or unchecked external bodies according to the project's policy.

The principal evidence is Table 1's Pass@1 results across three prover/score-generator groups, Table 2's FGPS ablation, Table 3's curriculum ablation, and Table 4's four iterations (pp. 9–11, 15). Table 2 compares Mathstral without and with FGPS: MiniF2F-valid 35.2% versus 36.0%, test 35.6% versus 36.0%, and ProofNet 11.6% in both conditions (Table 2, p. 10). The paper itself claims: “The use of the score generator for fine-grained scoring significantly improved the model’s proof success rate, thereby demonstrating the effectiveness of the proposed fine-grained preference scoring process.” (Section 5.3, p. 10.) Inference: the table supports gains on the two MiniF2F columns, with no ProofNet gain; it does not establish statistical significance.

The paper reports Lean 4 evaluation with a 300-second limit per theorem and best-first search: “In the evaluation phase, we limit the search time for each theorem to 300 seconds and employ standard best-first search algorithm to find proofs” (Section 5.1, p. 9; citation markers omitted). Inference: these reported success rates depend on the theorem statements, Lean checks, dataset translation, and experimental implementation. For VL, CuDIP suggests a training loop for generating proof actions; it supplies no Verus experiment or new verifier soundness argument. Learned scores could direct search poorly, and a verified result would still establish only the specified obligation.

## techniques for the catalog

- distance curriculum — partition proof-state/action traces by remaining proof distance and train from easy to hard
- MCTS tactic scoring — score each candidate by the fraction of bounded subsequent searches that complete the proof
- learned score generator — distill expensive verifier/search scores into a model for unscored states
- thresholded pairing — create DPO winner/loser pairs only when search-derived or model-predicted scores differ by more than 0.5
- iterative DPO — apply preference optimization per curriculum band, using the prior prover as reference
- structured tactic prompting — serialize the proof state as JSON and request a tactic string without `sorry`

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In order to validate the effect of different iteration counts using the CuDIP method, we performed four rounds of DPO iteration on three sets of models."): checked the complete paper, quotations, numbers, section and printed-page references, technique steps, tag, and paper link; corrected page references, the pairing threshold, a truncated quotation, initial SFT ordering, and unsupported interpretations; marked adaptations and conclusions as Inference; did not reproduce experiments, inspect implementation code, or independently validate Lean proofs or Verus proposals.
