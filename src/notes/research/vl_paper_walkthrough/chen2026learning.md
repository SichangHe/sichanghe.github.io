# Learning to Generate Formally Verifiable Step-by-Step Logic Reasoning via Structured Formal Intermediaries
(authored by agents unless marked 🧑)
Tag: `chen2026learning`, [paper](http://arxiv.org/abs/2603.29500v1)
## problem and evaluation

The paper studies a gap between a correct final answer and a sound reasoning path. Outcome-only reinforcement learning can reward an answer even when intermediate deductions are invalid. The proposed Process Reward over Structured Formal Intermediates (PRoSFI) asks a model to emit natural-language reasoning plus small structured formal claims, then verifies those claims with a prover.

Experiments use ProverQA, a synthetic first-order-logic benchmark generated with Prover9. After removing “Uncertain” labels, the authors report 769 training instances; the out-of-distribution ProverQA-Extra set has 128 synthesized examples. The base model is Qwen2.5-7B-Instruct. Training uses GRPO with learning rate 3×10^-7, batch size 64, eight sampled responses per iteration, maximum sequence length 5120, KL coefficient 0.001, 960 iterations, and about 14 hours per run on eight Hopper GPUs (Section 5.1, pp. 5–6).

Table 2 reports percentages on ProverQA-Hard and ProverQA-Extra. PRoSFI reaches 92.97% and 91.94% Answer Correct Rate, and 76.07% and 56.10% GPT Soundness, respectively. The denominators are the examples in each test split; the table does not print their counts. Test-time figures average 16 responses per Extra instance (Section 5.1, p. 6). GPT Soundness is an LLM judge, not a proof theorem.

## technique 1: structured formal intermediates

What it is. PRoSFI inserts a JSON/YAML bridge between prose and a full formal proof. “PRoSFI … introduces a structured JSON/YAML based intermediate representation as a bridge between natural language reasoning paths and formal verification.” (Section 4.1, p. 5).

When to use it. Use this representation when direct generation of complete Lean proofs is too difficult or too slow for the training model, but individual logical steps can be translated and checked cheaply.

How to do it. (1) Prompt the model to output a sequence of atomic objects. (2) Give each object a unique `id`. (3) List its `dependencies`, consisting of premises or earlier step IDs. (4) Put the new `conclusion` in a formal language. (5) Record the applied `rule`. (6) Enforce fewer than five dependencies per step. (7) Require the final step's conclusion to equal the target proposition and its ID to be one of the answer candidates (Section 4.1, p. 5). (8) Keep natural-language reasoning and the structured sequence in one uninterrupted model response; verify only after generation.

Verus form (inference). A VL agent could emit a JSON list whose conclusions are Rust predicates or short Verus lemma statements. A translator would turn each item into a temporary `proof fn` goal, check it, and report the failing step. The dependency bound is an orchestration constraint, not a Verus construct. This is an inference because the paper uses first-order logic and Lean/Prover9/Z3, not Rust.

Evidence and limits. The paper reports that direct proof generation produced few compiling scripts and that compiled scripts often collapsed into opaque `simp` calls. PRoSFI makes the formal object smaller and decouples verification from token generation. However, extracted propositions may omit parts of the prose: “Reward Hit, i.e., all structured formal intermediates are verified, does not necessarily guarantee the Soundness of the entire reasoning path.” (Section 3, p. 4). The representation is therefore a scaffold, not complete proof-faithfulness.

## technique 2: asynchronous step-level formal verification and reward

What it is. Each structured step becomes a separately checked subproblem, and the outcome supplies a graded process reward. The paper's reward is 1.0 when the answer is correct and all steps verify, 0.3 when the answer is correct but some steps fail, 0.1 when formatting is correct but the answer is wrong, and 0.0 for malformed output or other failure (Section 4.1, p. 5).

How to do it. (1) After generation, parse the response and extract the summary and formal statements. (2) Parse each first-order formula. (3) Convert each statement to Lean 4, Prover9, or Z3 input. (4) Verify each proposition with tactics or an automated solver. (5) Determine whether the final step ID and conclusion match the ground truth. (6) Return the full, partial, format, or zero score. The appendix algorithm states: “If statements is None then return 0.0”; if the final ID mismatches, return a format score; if all FOL statements solve, return full score; otherwise return an optional score (Appendix H, p. 18).

The decoupling is central: “Formal verification is performed after generation, allowing it to be fully decoupled from the autoregressive process.” (Section 4.1, p. 5). Verification can therefore run asynchronously and in batches rather than interrupting GPU token generation.

Verus form (inference). Run Verus checks after the model emits all steps, in parallel where resources permit. Map each formal conclusion to a temporary Verus lemma and use compiler diagnostics to assign per-step reward. A final `ensures` check must still be run from a clean source tree. This requires a parser and translation layer that PRoSFI's paper does not define for Verus.

Evidence. On ProverQA-Hard, the direct-Lean baseline has 13.77% Reward Hit, whereas PRoSFI reaches substantially higher reasoning soundness; Table 2 reports GPT Soundness of 76.07% for PRoSFI versus 33.11% for direct Lean, over the same Hard split. On Extra, PRoSFI reaches 56.10% versus 10.45%. These are model-judged soundness percentages, not theorem-prover-certified end-to-end paths.

## technique 3: GRPO with process rewards

What it is. The paper uses GRPO to train on the graded step-level reward instead of only the final answer. Outcome-CoT raises Hard Answer Correct Rate from 46.0% for the base model to 91.31%, but GPT Soundness rises only from 9.0% to 21.97% (Section 5.2, p. 6). This demonstrates why a process signal is needed.

How to apply it. (1) For each problem, sample eight responses. (2) Run the post-generation verifier and assign each response one of the four PRoSFI scores. (3) Use GRPO's group-relative advantages rather than a learned critic. (4) Apply the clipped policy objective with the stated KL penalty and clip-higher stabilization. (5) Update only on model-generated tokens; verifier output conditions the policy but does not receive gradient. (6) Repeat for 960 iterations under the fixed dataset split and report both answer accuracy and soundness (Sections 3 and 5.1, pp. 4–6).

Verus form (inference). Replace the formal-step verifier with Verus and calculate group rewards from compiler-checked obligations. Preserve separate metrics for final answer, all-step verification, and trusted-code violations. Verus compile success must not be the sole reward because a generated `assume` can mask an invalid argument.

Evidence and limits. PRoSFI obtains 92.97% Hard and 91.94% Extra Answer Correct Rate, close to or above Outcome-CoT, while its GPT Soundness is 76.07% and 56.10%. The paper reports test-time scaling: sampling more PRoSFI paths and selecting by PRoSFI reward improves soundness on both splits (Section 5.5, pp. 7–8). The evaluation relies on GPT-OSS-120B as a judge; the authors manually checked 10 outputs from each of Outcome-CoT and PRoSFI and found the judge mostly correct but slightly strict (Appendix G, p. 18). That sample is too small to establish judge reliability for all outputs.

## technique 4: reward-based test-time selection

What it is. At inference, PRoSFI can sample several reasoning paths and select using the formal reward rather than majority vote over final answers. The paper's heatmaps compare PRoSFI selection with majority voting and show soundness increasing as the sample count grows (Section 5.5, Figure 2, p. 8).

How to do it. (1) Sample N complete responses. (2) Parse and verify their structured intermediates. (3) Discard malformed responses. (4) Rank remaining responses by PRoSFI reward and return the highest-scoring answer; optionally compare with majority vote. (5) Report answer correctness and soundness separately.

Verus form (inference). Sample N Rust/Verus proof plans, run the step verifier for each, and choose the plan with the highest verified-step score before asking the model to produce final Rust. This adds compile cost linearly with N unless checks are cached.

## what is proved, trusted, and left open

Prover9, Lean, Z3, or a delegated formal model checks extracted formulas. The final reasoning path remains partly trusted because the structured intermediates may not cover every natural-language inference. GPT Soundness is a measurement from an LLM judge. Dataset generation, parser correctness, translation to each prover, and the base model remain trusted. The authors explicitly say that rigorous whole-path assessment would require extensive human evaluation and that it is infeasible at scale (Section 3, p. 4).

Inference: For VL, PRoSFI's most useful lesson is to make the model emit small checkable obligations before writing a large Rust proof, then reward each accepted obligation asynchronously. Inference: this threatens products that reward only “Verus compiled” because it supplies denser feedback and test-time selection. Inference: it does not remove the need for specification coverage; unrepresented natural-language steps can still be unsound.

## techniques for the catalog

- structured formal intermediates — JSON/YAML atomic steps with dependencies, formal conclusions, and rules
- asynchronous step verification — parse, translate, and check each step after generation, then assign graded reward
- GRPO with process rewards — train on group-relative rewards that distinguish answer, format, and per-step soundness
- verifier-based test-time selection — sample multiple paths and choose by verified-step reward
Checked 2026-10-13: audit record chen2026learning; paper-study comparison complete; gate executed; experiments not rerun
