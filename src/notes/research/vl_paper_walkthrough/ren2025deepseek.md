# DeepSeek-Prover-V2: Advancing Formal Mathematical Reasoning via Reinforcement Learning for Subgoal Decomposition
(authored by agents unless marked 🧑)
Tag: `ren2025deepseek`, [paper](http://arxiv.org/abs/2504.21801v2)

## result and setting
DeepSeek-Prover-V2 is a Lean 4 theorem-proving model trained by combining informal proof sketches, recursively solved formal subgoals, supervised fine-tuning, expert iteration, and reinforcement learning. The abstract reports 88.9% pass ratio on MiniF2F-test, 47 solved problems out of 658 in PutnamBench, and a 325-problem ProverBench evaluation. Section 3.2 (p. 10) clarifies that only 649 PutnamBench problems were compatible with the evaluation environment. The paper's central construction is explicit: “The cold-start training procedure begins by prompting DeepSeek-V3 to decompose complex problems into a series of subgoals.” (Abstract, p. 1.)

## technique 1: recursive subgoal decomposition

use
Decompose a complex theorem into smaller lemmas when a prover struggles with a whole-proof search. The method uses DeepSeek-V3 to reason in natural language and produce a Lean theorem whose intermediate `have` statements describe subgoals.

steps from the method
1. Given a formal theorem statement, prompt DeepSeek-V3 to analyze the mathematical problem in natural language and translate each proof step into a Lean statement.
2. Ask for a high-level sketch, not complete proof terms; each `have` ends in `sorry` (Method §2.1, p. 4).
3. Extract each subgoal expression from a `have` statement and replace the original goal with that subgoal (Fig. 3a, p. 4).
4. For later subgoals, add preceding subgoals as premises, producing a localized lemma (Fig. 3b).
5. Give the resulting lemmas to a smaller 7B prover recursively. Compose the verified subgoal proofs into a proof of the original theorem.

The worked example decomposes `imo_1974_p5` into positivity and upper/lower-bound lemmas. The authors explain: “We extract subgoal expressions from have statements to substitute them for the original goals in the given problems (see Figure 3(a)), and then incorporate the preceding subgoals as premises (see Figure 3(b)).” (§2.1, p. 4.)

Verus form
Inference: In Verus, express each decomposed fact as a `lemma` or `proof fn` with `requires` and `ensures`, then call it from a parent proof. Intermediate facts can be introduced with `assert` and used by later assertions. A Rust function's executable body remains separate from proof-only lemmas. The Lean `have ... := by sorry` sketch cannot be copied: Verus requires actual proof bodies and uses Rust types and contracts.

evidence and boundary
The method composes a complete proof after all decomposed steps are solved (§2.1, p. 4). Inference: smaller lemma statements can localize proof search, but solving them establishes the original theorem only if their composition verifies. The paper gives no independent ablation isolating decomposition quality from the stronger model and training pipeline.

## technique 2: subgoal-generated curriculum and expert iteration

The authors create denser training signals from two theorem variants: one with preceding subgoals as premises and one without. These variants enter expert iteration so the prover sees progressively harder, related tasks. The method section says: “We generate two types of subgoal theorems, one incorporating preceding subgoals as premises and one without.” (§2.1, p. 5.)

To apply it, start with a curated difficult theorem; generate both variants; run the current prover; retain successful Lean-checked proofs; add them to the supervised dataset; and repeat on unsolved problems. Each iteration distills verified traces from the current best policy. Inference: generated statements supply tasks; only successful checker-verified proof attempts supply positive training examples.

Verus form
Inference: Build a curriculum of Rust/Verus lemmas by generating parent goals and variants with earlier facts included as preconditions. Keep only proofs that Verus checks. Expert iteration can then fine-tune or select an agent policy from successful proof traces; Verus itself is the checker, not the learner.

## technique 3: synthetic cold-start chain of thought

The two-model pipeline uses DeepSeek-V3 for decomposition and a 7B model for formal subgoal proofs. Select challenging problems that the 7B model cannot solve end to end but whose decomposed subgoals it can all solve. Compose those subproofs into the full proof, append it to V3's chain of thought, and use the resulting paired informal/formal trace as cold-start data. The paper states: “By composing the proofs of all subgoals, we construct a complete formal proof for the original problem.” (§2.2, p. 5.)

Inference: the paired data connects informal reasoning to formal syntax, but the prose itself supplies no formal proof evidence; validation concerns the formal proof.

Verus form
Inference: Generate a structured explanation plus Verus lemma skeleton, solve each lemma, and retain only traces whose final Rust/Verus file verifies. Store the explanation as training context, while treating Verus's checked proof obligations as the reward-bearing artifact. The transfer assumes the agent can learn Rust/Verus syntax; Lean chain-of-thought tokens do not execute in Verus.

## technique 4: consistency-reward reinforcement learning

After supervised fine-tuning on cold-start traces, the authors apply reasoning-oriented RL. A binary reward is 1 when Lean verifies the proof and 0 otherwise. Early training adds a consistency reward that penalizes proofs whose structure omits the decomposed `have` lemmas. The paper reports: “To address this issue, we incorporate a consistency reward in the early steps of training, which penalizes the structural misalignment, explicitly enforcing the inclusion of all decomposed have-structured lemmas in the final proof.” (§2.2, p. 5.)

Their GRPO implementation samples 256 distinct problems per iteration and 32 candidate proofs per theorem, with maximum sequence length 32,768 tokens. GRPO removes a separate critic and optimizes relative rewards within each candidate group (§2.3, p. 7). Training prompts are restricted to problems sufficiently difficult yet solvable by the supervised model.

Verus form
Inference: Define reward 1 only when Verus checks the complete candidate under the intended dependency lock; define structural consistency by requiring named intermediate lemmas or assertions from the decomposition to appear in the candidate. Group-relative sampling can compare candidate proof outcomes without a critic. A reward is an engineering signal, not a Verus theorem, and must not replace final verification.

## technique 5: two generation modes and distillation

The model has a fast non-chain-of-thought mode for concise Lean code and a high-precision chain-of-thought mode for intermediate reasoning. Stage one uses expert iteration and subgoal curricula for non-CoT proofs; stage two fine-tunes on cold-start CoT traces and applies RL. The paper calls these “two complementary proof generation modes” (§2.3, p. 6). DeepSeek-Prover-V1.5-Base-7B is extended from 4,096 to 32,768 tokens and fine-tuned on rollout data from the 671B model, together with non-CoT proof data from expert iteration. The 7B model then receives the same reinforcement learning stage as the 671B model (distillation, §2.3, p. 7).

Verus form
Inference: Use a fast mode for routine contract completion and a reasoning mode for difficult lemmas, then distill checked traces into a smaller model. Keep mode-specific prompts and validate every distilled candidate with Verus. The product trade-off is latency versus proof search context, not a change in the trusted proof checker.

## evidence and numbers

Evaluation uses Lean 4.9.0-rc2 (§3, p. 7). MiniF2F contains 488 statements split equally between validation and test, with 244 each. For the 671B CoT model, Table 1 (p. 8) reports 82.4% ± 0.6% at 32 samples and 88.9% at 8192 samples. ProofNet-test contains 186 problems; Table 4 (p. 10) reports 37.1% at 1024 samples. PutnamBench contains 658 problems, but only 649 were compatible with the Lean version. An initial run solved 49 at 1024 samples per problem; two misformulated statements were excluded, leaving 47 (§3.2, p. 10). ProverBench contains 325 problems, including 15 AIME 2024–25 problems; Table 7 (p. 12) reports 59.1% overall and 6/15 on that subset at 512 samples. The informal comparison uses DeepSeek-V3-0324 majority voting over 16 responses, solving 8/15, whereas the formal prover receives the correct answers (§3.5, pp. 12–13).

The paper also corrects an initial claim that the 7B model solved 13 PutnamBench problems missed by the 671B model. The authors identify the cause: “Specifically, the apply? tactic fails to emit sorry declarations under certain corner cases.” (§3.2, p. 10.) Appendix B (pp. 33–34) shows examples using `Cardinal.toNat` and `Cardinal.natCast_inj`.

The conclusion summarizes the data construction: “Our data construction process is grounded in a recursive theorem-proving framework, wherein DeepSeek-V3 serves as a unified model for both subgoal decomposition and lemma formalization within the Lean 4 proof assistant.” (§4, p. 13.) Inference: these are results on the listed Lean benchmarks; they do not establish Verus performance, correctness of informal decompositions, or performance outside the benchmark distributions.

Inference: For VerusLaw, subgoal decomposition is a plausible way to turn long agent obligations into local lemmas, but the paper's numbers do not measure Rust, Verus, ownership, concurrency, or systems code. The product threat is that an agent may produce a convincing decomposition whose intermediate contracts are too weak or mismatched; only Verus checking of the final executable and contracts addresses that risk. What VL should reuse is the recursive data pipeline, checker-verified examples, and explicit separation of fast and reasoning modes. It should not redo Lean benchmark training as if it directly measured verified Rust.

## trusted and unproved parts

Inference: successful formal checking depends on the checker and libraries, the benchmark statements, and the validation procedure. The paper's reported `apply?` bug and excluded misformulations show two distinct limits: an apparent success can hide an incomplete proof, and a formal statement can differ from the intended problem. The paper does not establish that natural-language translations preserve intended meaning or that its benchmark results predict production success in Verus.

## techniques for the catalog

- recursive subgoal decomposition — prompt an LLM for Lean `have` sketches, turn each into a lemma, add earlier facts as premises, and solve recursively
- subgoal curriculum — train on lemma variants with and without preceding premises to densify verified learning signals
- cold-start proof synthesis — compose checked subproofs and append them to informal reasoning traces for supervised initialization
- consistency-reward RL — reward kernel-verified proofs and temporarily penalize omission of decomposed intermediate lemmas
- expert iteration and distillation — retain successful checker-verified attempts, train a stronger model, and distill long-context rollouts into a smaller prover
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The plan should highlight key ideas, intermediate lemmas, and proof structures that will guide the construction of the final formal proof."): checked the full text including appendices, quotations, numbers, section and page references, and technique steps; corrected MiniF2F split sizes, PutnamBench reporting, the consistency-reward quotation, the conclusion page, and distillation details, added sample budgets and evaluation limits, and marked interpretations as inferences; did not rerun training, benchmarks, or Lean proofs, or test the proposed Verus adaptations.
