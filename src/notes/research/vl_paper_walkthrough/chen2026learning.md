# Learning to Generate Formally Verifiable Step-by-Step Logic Reasoning via Structured Formal Intermediaries
(authored by agents unless marked 🧑)
Tag: `chen2026learning`, [paper](http://arxiv.org/abs/2603.29500v1)
## problem and evaluation

The paper studies a gap between a correct final answer and a sound reasoning path. Outcome-only reinforcement learning can reward an answer even when intermediate deductions are invalid. The proposed Process Reward over Structured Formal Intermediates (PRoSFI) asks a model to emit natural-language reasoning plus small structured formal claims, then verifies those claims with a prover.

Experiments use ProverQA, a synthetic first-order-logic benchmark generated with Prover9. After removing “Uncertain” labels, the authors report 769 training instances; the out-of-distribution ProverQA-Extra set has 128 synthesized examples. The base model is Qwen2.5-7B-Instruct. Training uses GRPO with learning rate 3×10^-7, batch size 64, eight sampled responses per prompt, maximum sequence length 5120, KL coefficient 0.001, 960 iterations, and about 14 hours per run on eight Hopper GPUs (Section 5.1, pp. 5–6).

Table 2 reports percentages on ProverQA-Hard and ProverQA-Extra. PRoSFI reaches 92.97% and 91.94% Answer Correct Rate, and 76.07% and 56.10% GPT Soundness, respectively. Appendix B.1 (p. 12) specifies 64 test instances per original difficulty level, including Hard; Extra has 128 instances. The authors sample 16 responses per test instance and average their results (Section 5.1, p. 6). GPT Soundness uses GPT-OSS-120B to approximate answer correctness together with reasoning-path validity (Section 3, p. 4).

## technique 1: structured formal intermediates

What it is. PRoSFI inserts a JSON/YAML bridge between prose and a full formal proof. “To overcome the challenges encountered in directly generating formal proofs, we propose a novel approach: Process Reward over Structured Formal Intermediates (PRoSFI), which introduces a structured JSON/YAML based intermediate representation as a bridge between natural language reasoning paths and formal verification.” (Section 4.1, p. 5).

Inference: Use this representation when direct generation of complete Lean proofs is too difficult or too slow for the training model, but individual logical steps can be translated and checked cheaply.

How to do it. (1) Prompt the model to output a sequence of atomic objects. (2) Give each object a unique `id`. (3) List its `dependencies`, consisting of premises or earlier step IDs. (4) Put the new `conclusion` in a formal language. (5) Record the applied `rule`. (6) Enforce fewer than five dependencies per step. (7) Require the final object's ID and conclusion to match one of the provided answer options (Appendix E.1, p. 15). (8) Keep natural-language reasoning and the structured sequence in one uninterrupted model response; verify only after generation.

Evidence and limits. The paper reports that direct proof generation produced few compiling scripts and that compiled scripts often collapsed into opaque `simp` calls. PRoSFI makes the formal object smaller and decouples verification from token generation. However, extracted propositions may omit parts of the prose: “Reward Hit, i.e., all structured formal intermediates are verified, does not necessarily guarantee the Soundness of the entire reasoning path.” (Section 3, p. 4). Inference: Verification of the extracted claims alone cannot establish that every prose step is valid.

## technique 2: asynchronous step-level formal verification and reward

What it is. Each structured step becomes a separately checked subproblem. The answer, format, and whether all steps verify determine one reward for the response. The paper's reward is 1.0 when the answer is correct and all steps verify, 0.3 when the answer is correct but some steps fail, 0.1 when formatting is correct but the answer is wrong, and 0.0 for malformed output or other failure (Section 4.1, p. 5).

How to do it. (1) After generation, extract the structured summary and parse its first-order formulas into step problems; return 0.0 if extraction fails. (2) Check the final step ID against the ground truth; if it differs, return the format score. (3) Translate the step problems into Lean 4, Prover9, or Z3 input. (4) Check each step using its dependencies, with tactics, an automated solver, or a formal theorem-proving model. (5) Return the full score if all steps verify; otherwise return the partial score. Appendix H states: “If no valid statements are extracted, return a score of 0.” (p. 18).

The decoupling is central: “Formal verification is performed after generation, allowing it to be fully decoupled from the autoregressive process.” (Section 4.1, p. 5). Verification can therefore run asynchronously and in batches rather than interrupting GPU token generation.

Inference: A possible Verus adaptation follows. Run Verus checks after the model emits all steps, in parallel where resources permit. Map each formal conclusion to a temporary Verus lemma and use the results to assign a response reward based on whether all obligations pass. A final Verus check could test the complete proof against its specification. This requires a parser and translation layer that PRoSFI's paper does not define for Verus.

Evidence. On ProverQA-Hard, the direct-Lean baseline has 13.77% Reward Hit (Section 5.3, p. 6), whereas PRoSFI reaches substantially higher reasoning soundness; Table 2 reports GPT Soundness of 76.07% for PRoSFI versus 33.11% for direct Lean, over the same Hard split. On Extra, PRoSFI reaches 56.10% versus 10.45%. These are model-judged soundness percentages, not theorem-prover-certified end-to-end paths.

## technique 3: GRPO with process rewards

What it is. The paper uses GRPO to train on the graded step-level reward instead of only the final answer. Outcome-CoT raises Hard Answer Correct Rate from 46.0% for the base model to 91.31%, but GPT Soundness rises only from 9.0% to 21.97% (Section 5.2, p. 6). Inference: These results motivate checking intermediate reasoning separately from final answers.

How to apply it. (1) For each problem, sample eight responses. (2) Run the post-generation verifier and assign each response one of the four PRoSFI scores. (3) Use GRPO's group-relative advantages rather than a learned critic. (4) Apply the clipped policy objective with the stated KL penalty and clip-higher stabilization. (5) Repeat for 960 iterations under the fixed dataset split and report both answer accuracy and soundness (Sections 3 and 5.1, pp. 4–6; Appendix C, p. 13).

Inference: A possible Verus adaptation follows. Replace the formal-step verifier with Verus and calculate group rewards from compiler-checked obligations. Preserve separate metrics for final answer, all-step verification, and trusted-code violations. Verus compile success must not be the sole reward because a generated `assume` can mask an invalid argument.

Evidence and limits. PRoSFI obtains 92.97% Hard and 91.94% Extra Answer Correct Rate, close to or above Outcome-CoT, while its GPT Soundness is 76.07% and 56.10%. The paper reports test-time scaling: sampling more PRoSFI paths and selecting a verified candidate, with majority voting as fallback, improves soundness on both splits (Section 5.5, p. 7). The evaluation relies on GPT-OSS-120B as a judge; the authors manually checked 10 outputs from each of Outcome-CoT and PRoSFI and found the judge mostly correct but slightly strict (Appendix G, p. 18). Inference: This small manual sample leaves uncertainty about judge reliability across all outputs.

## technique 4: reward-based test-time selection

What it is. At inference, PRoSFI can sample several reasoning paths and select using the formal reward rather than majority vote over final answers. Figure 2 compares PRoSFI selection with majority voting and shows soundness increasing as the sample count grows (Section 5.5, p. 7).

How to do it. (1) Sample N complete responses. (2) Parse and verify their structured intermediates. (3) If any candidates verify successfully, select one; otherwise use majority voting. The paper states: “If any candidates are successfully verified, one of them is selected; otherwise, the method defaults to majority voting.” (Section 5.5, p. 7).

Inference: A possible Verus adaptation follows. Sample N Rust/Verus proof plans, run the step verifier for each, and select a plan whose obligations all verify; fall back to majority voting if none do. The paper does not evaluate this adaptation or its cost.

## what is proved, trusted, and left open

The paper describes checking extracted formulas through Lean tactics, Prover9, Z3, or a formal theorem-proving model (Section 4.1, p. 5; Appendix H, p. 18). It does not identify which backend produced each experimental result. GPT Soundness is a measurement from an LLM judge. The authors state: “This is because the extracted formal propositions may not fully cover the entire reasoning path.” (Section 3, p. 4). Inference: End-to-end confidence also depends on the dataset formalizations, parser, translation, and correspondence between prose and extracted claims; checking formulas alone does not establish those properties.

## techniques for the catalog

- structured formal intermediates — JSON/YAML atomic steps with dependencies, formal conclusions, and rules
- asynchronous step verification — parse, translate, and check each step after generation, then assign graded reward
- GRPO with process rewards — train on group-relative rewards that distinguish answer, format, and per-step soundness
- verifier-based test-time selection — choose a verified candidate, or fall back to majority voting
