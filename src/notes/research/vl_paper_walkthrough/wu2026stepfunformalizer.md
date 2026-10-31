# StepFun-Formalizer: Unlocking the Autoformalization Potential of LLMs Through Knowledge-Reasoning Fusion
(authored by agents unless marked 🧑)
Tag: `wu2026stepfunformalizer`, [paper](https://doi.org/10.1609/aaai.v40i40.40691)

## scope and result

StepFun-Formalizer targets Lean 4 autoformalization: translating an informal mathematical problem into a formal statement that is equivalent to a human reference. The paper's premise is that two abilities are needed: formal-language knowledge and reasoning that aligns informal meaning with formal objects. Its ThinkingF pipeline constructs a selected knowledge dataset, a template-guided reasoning dataset, two supervised fine-tuning stages, and reinforcement learning with a proof-assistant equivalence reward. The output is a model, not a verified Rust program; Lean checking supplies evidence for statement equivalence, while data selection, prompts, model training, and the specification of equivalence remain trusted.

## technique 1: select a formal-knowledge dataset with Lean checking and equivalence voting

What it is. Start with informal problems, generate multiple Lean candidates, filter syntax, group candidates by bidirectional extended definitional equivalence (BEq), choose from the largest equivalent class, then remove invalid or contradictory statements with a separate model. The paper first filters NuminaMath-1.5 to approximately 256K problems. For each problem it generates 16 candidates and applies three tiers: Lean4 REPL syntax checking, BEq majority voting, and DeepSeek-V3 validity assessment. The final set is approximately 183K informal–formal pairs.

When to use it. Use this pipeline when reference formalizations are scarce and a specialized formalizer can produce many noisy candidates. It uses the proof assistant to reject code that does not parse and to identify semantically equivalent alternatives before training.

How to apply it.

1. Filter informal inputs by manual rules; the paper's resulting pool is about 256K items (Section 4.1, p. 5).
2. Prompt Kimina-Autoformalizer to generate 16 formal statements for each problem (Section 4.1, p. 5).
3. Run every candidate through the Lean4 REPL and retain syntactically correct statements (Section 4.1, p. 5).
4. Partition retained candidates into BEq equivalence classes, select one statement randomly from the largest class, and call it the optimal formalization (Section 4.1, p. 5).
5. Ask DeepSeek-V3 to remove oversimplified statements and those with inherently contradictory conditions, leaving about 183K pairs (Section 4.1, p. 5).

The paper explains the selection rationale: “Specifically, for the syntactically correct formal statements … we use BEq verification to partition the formal statements into multiple equivalence classes.” (Section 4.1, p. 5). Its majority-vote table reports Kimina-Autoformalizer-7B BEq@1/ Maj@16 of 35.1/45.9 on FormalMATH-Lite, 13.3/17.2 on ProverBench, and 2.6/3.0 on CombiBench (Table 1, p. 5; each percentage is over that benchmark's samples, with 16 attempts for Maj@16).

Verus form (Inference). Generate several candidate Rust specifications, run `verus` on each, and cluster only candidates whose proofs compile and establish the same intended postcondition. Verus has no BEq primitive in the cited Verus reference; equivalence clustering would therefore be an orchestration procedure over verified lemmas or normalized specifications. Use `requires`, `ensures`, `assert`, and `proof fn` where needed; Lean REPL syntax checks and `exact?` do not carry over. Inference: a model-based contradiction filter may help triage but cannot replace Verus or human review of the specification.

Evidence and limits. Lean checking is a strong executable check of syntax and BEq equivalence, but the generated statements can still formalize the wrong natural-language meaning. DeepSeek-V3 validity assessment is an LLM filter, and the largest-class choice assumes the majority of candidates are correct. The paper does not report human correctness for all 183K pairs.

## technique 2: template-guided informal-to-formal reasoning synthesis

What it is. ThinkingF uses human-annotated informal/formal pairs and asks Claude 3.7 Sonnet to produce a reasoning trajectory constrained by a fixed template. The template requires restatement, high-level logical structure, concept analysis, object definitions, header/import analysis, tricky Lean issues, mapping to Lean objects, and a final code review. The paper says: “Before delving into the details of formal languages, the model needs to deeply understand the natural language problem, including rephrasing the original question, analyzing its high-level logical structure with the decomposition of the mathematical concepts and corresponding objects involved.” (Section 4.2, p. 6).

When to use it. Use the template when direct distillation from a general reasoning model causes it to solve the informal problem instead of explaining how to formalize it. The structured intermediate representation makes natural-language interpretation and Lean mapping explicit.

How to apply it.

1. Assemble human-annotated pairs `(x̂_i,ŷ_i)` from theorem-proving datasets (Section 4.2, p. 6).
2. Prompt the teacher with the eight required reasoning parts in the template (Figure 4, p. 6).
3. In the understanding part, restate the problem and decompose its logical structure and concepts (Figure 4, p. 6).
4. In the informal-to-formal analysis, anticipate coercions and other Lean issues, map each concept/object to Lean syntax, and review the complete statement (Figure 4, p. 6).
5. Save the trajectory between `<think>` and `</think>` plus the human formal statement; the paper synthesizes 5.8K instances (Section 4.2, p. 6).

The example maps the set of numbers from 1 to n to ``Finset.Icc 1 n`` (Figure 4, p. 6). This is an example of a concrete code shape, not a claim that every problem has this representation. Direct distillation is weaker: on ProverBench, the template gets BEq@1/16 25.1/37.9 versus direct distillation 21.8/33.3; on CombiBench it gets 5.2/11.0 versus 4.8/10.0 (Table 5, p. 8; denominators are each benchmark's evaluation samples).

Verus form (Inference). Use an analogous prompt that separates informal requirement restatement, state/type identification, invariant and postcondition candidates, ownership/borrowing hazards, and a final Rust review. Translate the last stage into Rust with `requires`, `ensures`, loop `invariant`, `assert`, and `proof fn`; `<think>` is a training delimiter, not Verus syntax. Verus does not provide Lean's `Finset.Icc`; the corresponding Rust sequence/set representation must be chosen and proved. Inference: requiring an explicit mapping plan can reduce hallucinated APIs, but only compilation and review establish that the requirement was captured.

## technique 3: two-stage supervised fine-tuning to fuse knowledge and reasoning

What it is. The model starts from DeepSeek-R1-Distill-Qwen-7B or 32B. Stage one trains on the selected `(x_i,y_i)` knowledge pairs with `<think></think>` tokens; stage two trains on `(x̂_i,ĉ_i,ŷ_i)` reasoning trajectories. The paper states: “In SFT, we train the models for 2 epochs with a learning rate of 2.0 × 10−5 and a batch size of 128 in the first stage, and 8 in the second stage.” (Section 5.1, p. 8). This order first teaches formal objects and then teaches the alignment process.

How to apply it.

1. Fine-tune the base model for two epochs on knowledge pairs, inserting the reasoning delimiters before the formal output (Section 4.3, p. 7).
2. Fine-tune the resulting model on the 5.8K template-guided trajectories, enclosing the reasoning in `<think>…</think>` (Section 4.3, p. 7).
3. Keep training/evaluation partitions separate: MiniF2F, ProofNet, PutnamBench, Compfiles, and FormalMATH-Train train; FormalMATH-Lite, ProverBench, and CombiBench evaluate (Table 2, p. 8).
4. Apply 13-gram decontamination and remove name overlaps (Section 5.1, p. 8).

Verus form (Inference). Stage one can train on verified Rust examples and their specifications; stage two can train on traces that explain a requirement, identify invariants, and end in compiling Verus code. The delimiter and learning rates are model-training choices. A Rust proof generated after SFT still must be passed to `verus`; SFT does not carry a proof certificate.

Evidence. Table 3 reports StepFun-Formalizer-7B BEq@1/16 of 38.3/61.2 on FormalMATH-Lite, 25.1/37.9 on ProverBench, and 5.2/11.0 on CombiBench. The 32B model reports 40.5/59.3, 26.7/38.5, and 6.9/14.0 respectively (Table 3, p. 8; percentages are per-benchmark portions of samples equivalent at least once in 1 or 16 attempts). Ablation shows reasoning data matters most: removing it changes ProverBench BEq@1/16 from 25.1/37.9 to 21.8/25.3, while removing knowledge changes it to 24.5/37.4 (Table 4, p. 9). The paper cautions that the 32B model may need more data and that CombiBench remains difficult.

## technique 4: reinforcement learning with BEq verifiable reward

What it is. Continue training the SFT model on the same 5.8K reasoning problems. Reward is one when the generated statement is BEq to the human ground truth and zero otherwise. The authors use GRPO, dynamic sampling, and token-level loss; equivalence is checked by the Kimina Lean Server with a 60-second limit.

How to apply it.

1. For each rollout, generate a Lean statement from the informal problem and reference context (Section 4.4, p. 7).
2. Run BEq equivalence against the human annotation; assign reward 1 for equivalent and 0 otherwise (Section 4.4, p. 7).
3. Estimate group-relative advantages with GRPO, using dynamic sampling and token-level loss (Section 4.4, p. 7).
4. Train 450 steps for 7B and 350 for 32B at batch size 128 and learning rate 1.0×10−6 (Section 5.1, p. 8).
5. Evaluate BEq@1 and BEq@16 at temperature 0.6 (Section 5.1, p. 8).

The metric is `BEq@k = (1/N) Σ_i max_j 1(y_{i,j} ~ ŷ_i)`, so BEq@1 is single-shot and BEq@16 is the chance of at least one equivalent answer in 16 attempts (Section 5.1, p. 8). During RL, reward rises from 0.232 to 0.347 and average BEq@1 from 0.258 to 0.303 after 450 steps (Section 5.5, p. 9; average over the three benchmarks).

Verus form (Inference). Use compilation and proof-check outcomes as binary or graded rewards for generated Rust. A candidate receives reward only when Verus verifies the intended postcondition; orchestration may group candidates, but Verus itself does not expose a GRPO API. The reward remains conditional on the supplied specification and imported axioms. Inference: add negative examples for compiling but semantically wrong specifications, because BEq to a flawed reference would reinforce the flaw.

## techniques for the catalog

- Lean-filtered knowledge distillation: generate 16 formal candidates, syntax-check them, BEq-cluster them, and filter contradictions
- template-guided formalization reasoning: require explicit restatement, concept/object mapping, Lean issue analysis, and final code review
- two-stage SFT fusion: train first on formal pairs and then on structured informal-to-formal trajectories
- BEq-reward RL: use proof-assistant equivalence as a binary reward with GRPO and multiple rollouts
