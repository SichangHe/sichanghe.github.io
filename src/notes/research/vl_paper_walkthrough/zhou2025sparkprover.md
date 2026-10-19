# Spark-Prover-X1: Formal Theorem Proving Through Diverse Data Training
(authored by agents unless marked 🧑)
Tag: `zhou2025sparkprover`, [paper](https://arxiv.org/abs/2511.13043v3)

## scope and result

Spark-Prover-X1-7B is a Lean whole-proof generator trained in three phases: continuous pre-training and supervised fine-tuning (SFT), both inside expert iteration, followed by one targeted GRPO round. The abstract describes the purpose as “a 7B parameter model trained via an three-stage framework designed to unlock the reasoning potential of more accessible and moderately-sized LLMs.” (abstract, p. 1). It reports pass@32 results across eight prover benchmarks, an average of 37.0% (Table 2, p. 11), and 27 solved PutnamBench problems at pass@32 (Table 3, p. 11). Formalizer results use pass@8 and require both compilation and semantic consistency (Section 4.3, p. 10).

## technique 1: diverse multi-task continuous pre-training

What it is. The base model is exposed to formal and informal mathematics tasks to develop syntax, theorem-statement, proof-generation, tactic, translation, and decomposition capabilities together. The paper lists “statement auto-formalization, in-formalization, formal proof generation, informal proof generation, tactic prediction, next state prediction, formal code file, translation of the proof, subgoal decomposition, tutorial of tactics/Mathlib, and informal mathematics problem solving” (Section 1, p. 2).

Steps. (1) Collect open-source datasets for auto-formalization, unformalization, stepwise tactics, whole proofs, formal-language code files from GitHub, Mathlib4 and tactic tutorials, and natural-language proofs (Section 3.1.1, p. 4). (2) Add more than 100 generalized prompts for each data type to aggregate formal reasoning with the model (Section 3.1.1, p. 4). (3) Add synthetic natural/formal statement pairs and formal proofs with detailed thought processes (Section 3.1.3, pp. 5–6). (4) Filter generated formal statements by proof-assistant syntax and by an LLM semantic-consistency check (Section 3.1.3, p. 6). (5) Train the base model with this mixture before specialization. Each expert iteration repeats pre-training from the initial mathematical base model using the updated dataset (Section 4.2, p. 9).

Verus form. Inference: build a corpus of Rust/Verus functions paired with specifications, proof scripts, compiler diagnostics, and natural-language intent. Use Verus compilation as the syntax and proof-validity filter; retain natural-language explanations only as auxiliary data. Inference: Rust ownership, `requires`, `ensures`, `invariant`, `assert`, and proof functions should be represented directly, because Lean tactic syntax does not transfer.

Evidence and limits. The paper reports 512 Ascend 910b NPUs for pre-training, learning rate 4×10−5, and maximum length 32,768 (Section 4.2, p. 9). It does not isolate the causal contribution of each corpus task. Inference: a VL study would need ablations by task family and a denominator for retained, compiler-checked examples; the paper's aggregate results do not show which data prevents a particular Verus failure.

## technique 2: CoT-augmented state prediction

What it is. A proof assistant traces every tactic and its before/after state, then an LLM predicts the next state while writing natural-language reasoning. The paper says, “These state information details, feedback from proof assistant, are not visible in the original proof code, which can help the LLM model better understand the formal proof reasoning process.” (Section 3.1.2, p. 4). This exposes intermediate proof states that are absent from a compact proof script.

Steps. (1) For each formal statement/proof pair, execute the proof assistant and extract triples `(s_before, tactic, s_after)` (Section 3.1.2, p. 4). (2) Give the model `s_before` and the current tactic. (3) Prompt it to explain what the tactic solves and predict `s_after` (Section 3.1.2, p. 5). (4) Compare the prediction with the assistant's ground-truth state. (5) Filter inconsistent predictions and retain only correctly predicted triples as CoT-augmented state-prediction data (Section 3.1.2, p. 5). The paper states, “Those inconsistent results are filtered, and the correctly predicted data should be reserved as the fine-grained Cot-augmented data for the state prediction task during pre-training.” (Section 3.1.2, p. 5).

Verus form. Inference: instrument each Verus proof step or split a proof into explicit `assert`/lemma steps, record the verification context before and after each step, and ask the model to predict the resulting obligation. Filter using a fresh Verus run. Inference: Verus's SMT context may not expose exactly the same stable state representation as Lean; a practical trace should include source location, assumptions, and diagnostic obligations rather than assuming tactic-state equivalence.

Evidence and limits. The paper describes filtering predicted states and reports final benchmark results, but gives no count of extracted triples, retention rate, state-prediction accuracy, or ablation isolating this task. Inference: matching the predicted state does not independently verify the accompanying natural-language reasoning. Inference: without those denominators, it is impossible to know whether gains come from CoT augmentation or simply more tokens and more proofs.

## technique 3: verified subgoal decomposition for unsolved theorems

What it is. More than four million formal statements were synthesized, but only half were solved by prover models (Section 3.1.4, p. 6). For each failure, an LLM writes a natural-language proof plan and decomposes the theorem into `have` subgoals whose conjunction should imply the original goal. The generated code intentionally uses `:= by sorry` placeholders while the subgoals are being prepared (Section 3.1.4, p. 6).

Steps. (1) Detect a theorem that existing provers cannot solve. (2) Ask an LLM for main proof steps, strategies, intermediate lemmas, and proof structure (Section 3.1.4, p. 6). (3) Generate sub-statements beginning with `have`, each ending in a placeholder, and append a final placeholder for the main goal. (4) Check decomposition logic and strategy, code consistency with the informal plan, and formal syntax with the proof assistant (Section 3.1.4, p. 6). (5) Add the checked decompositions to pre-training to help later models solve the challenging problems. Inference: the placeholders remain unproved at this stage; syntax approval does not establish the subgoals or their sufficiency.

Verus form. Inference: turn a failed Verus postcondition into explicit lemma statements and `proof fn`s, preserving the original `ensures`. Temporary holes may be used in a generation workspace, but final VL acceptance must reject `admit`, `assume`, `external_body`, or equivalent unproved bodies. Inference: each lemma needs a contract that is strong enough to imply the caller's obligation; conjunction alone is not sufficient if framing or ownership conditions are omitted.

Evidence and limits. The paper reports only the “more than 4 million” and “half” synthesis figures, with no exact denominator or per-decomposition acceptance rate (Section 3.1.4, p. 6). Inference: the method can teach useful intermediate structure, but its quality assurance does not demonstrate that every accepted decomposition is useful for proof search.

## technique 4: expert iteration for formalizer and prover

What it is. SFT trains a formalizer and prover, then those models generate new data for the next round. The paper says, “As illustrated in Figure 3, our pre-trained model also participates in this iterative loop.” (Section 3.2, p. 6).

Steps. (1) Deduplicate natural-language problems internally at cosine similarity above 90% and externally against test data (Section 3.2.1, p. 7). (2) Initially use Goedel-Formalizer-V2-8B to produce statements with reasoning; check syntax with a proof assistant and semantic consistency with Qwen3-8B (Section 3.2.1, p. 7). (3) Filter incorrect and simple theorems, deduplicate internally and against test data, and initially use DeepSeek-Prover-V2-7B and Goedel-Prover-V2-8B to generate proofs with reasoning; require proof-assistant verification, compilation, and quality inspection (Section 3.2.2, p. 7). (4) From the second round, include Spark models in data synthesis. Update the pre-training dataset, repeat pre-training from the initial base model, and train both specialized models from that round’s shared pre-trained checkpoint (Sections 3.2 and 4.2, pp. 6–7, 9). (5) Repeat until the SFT models stabilize, then run RL only once.

Verus form. Inference: generate Rust/Verus specifications and proofs, compile every candidate in a clean dependency environment, and add only proofs that verify without weakened contracts. Inference: external deduplication must compare against held-out Verus tasks and near-duplicate implementations to avoid leakage. Inference: the paper's 90% embedding threshold does not establish semantic equivalence.

Evidence and limits. Formalizer pass@8 requires one of eight candidates to compile and pass CriticLeanGPT semantic validation (Section 4.3, p. 10). Spark-Formalizer averages 68.57% across five benchmarks; ProofNet-test is 78.85% ± 0.62%, and ExamFormal-Bench is 97.68% ± 0.63% (Table 1, p. 10). The table does not state the trial denominator for the ± values. These rates count a problem as successful when at least one of eight candidates passes both checks. Inference: they do not guarantee success on unseen Verus APIs.

## technique 5: compiler-rewarded GRPO on hard problems

What it is. After SFT, the authors screen for difficult problems and run one GRPO round. The reward is 1 if the proof assistant verifies the rollout completely and 0 otherwise, with a soft length penalty; rollouts over the token limit are excluded (Section 3.3, p. 8). The paper states, “During training, rollouts that exceed the maximum token length are excluded from both advantage computation and subsequent gradient updates.” (Section 3.3, p. 8).

Steps. (1) Use an LLM to select the hardest subset. (2) Initialize from the SFT checkpoint. (3) At each RL iteration, sample 16 rollouts for each of 2,560 queries. Normalize rewards within groups to compute advantages, retain KL regularization against the SFT reference, and use DAPO’s clip-higher variant. Normalize each rollout’s token contribution by the group’s maximum sequence length, rather than its own length (Section 3.3, p. 8; Section 4.2, p. 10). (4) Exclude over-length outputs from advantage and gradient updates. (5) Early-stop at the best checkpoint.

Verus form. Inference: use a clean Verus invocation as the binary reward and retain compiler logs; add a length penalty only as an optimization preference. Inference: do not reward a proof that passes after changing the theorem or removing a contract. Inference: protect the specification and check diffs to detect such changes.

Evidence and limits. Spark-Prover-X1 averages 37.0% pass@32 over eight datasets (Table 2, p. 11); Section 4.1 states benchmark sizes including 100 CombiBench problems and 402 ExamFormal-Bench problems. PutnamBench has 658 problems overall, and Table 3 reports 27 solved at pass@32 and 55 at pass@512 (p. 11). The paper reports rewards from a proof assistant adapted from Kimina Lean Server (Section 4.2, p. 10). These are Lean results, not Verus results. Table 2 lists 4.7% for PutnamBench at pass@32, whereas Table 3 and the abstract report 27 solved. Inference: 27 of the stated 658 problems is about 4.1%, so these reported figures are inconsistent; the paper does not explain the denominator difference.

## what is proved, trusted, and relevant to VL

The formal proof assistant checks the generated Lean proofs. Inference: this does not independently validate the paper's semantic-consistency LLM, benchmark formalizations, data filters, or correspondence between theorem statements and intended problems. The prover results use pass@32; formalizer results use pass@8 and add an LLM semantic check. Inference: neither measures the success rate of a single deterministic attempt. Inference: VL can reuse the staged curriculum, state traces, decomposition, expert iteration, and compiler-rewarded RL, but must substitute Verus compilation and Rust-specific diagnostics at every acceptance point. Inference: the threat to agent-written verified Rust is contract drift—an agent may make a theorem easier by weakening `ensures`, alter a type or dependency assumption, or leave a hidden unproved helper. The paper does not measure these failure modes.

The work reports Lean whole-proof results from combining broad data, expert iteration, and compiler rewards, without ablations separating their contributions. Inference: VL should not redo that generic demonstration. A useful new experiment is a comparison reporting task counts and rates of Verus proof success, repair time, and specification changes with and without state traces and decomposition, while retaining the original contract byte-for-byte.

## techniques for the catalog

- diverse multi-task pre-training — mix formal, informal, tactic, state, translation, and decomposition data before specialization
- CoT-augmented state prediction — extract assistant states around each tactic, predict the next state with reasoning, and filter against ground truth
- verified subgoal decomposition — turn unsolved theorems into checked intermediate statements and train on the resulting bridges
- expert iteration — use checked formalizer and prover outputs to update pre-training and SFT datasets, repeating both stages
- compiler-rewarded GRPO — train on hard problems with binary proof-assistant rewards, KL control, and length filtering

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "During training, rollouts that exceed the maximum token length are excluded from both advantage computation and subsequent gradient updates."): read the full paper and study; checked quotations, numbers, section/page references, technique steps, and the paper identifier; corrected page references, pre-training restarts and expert-iteration details, GRPO normalization, and problem-level success-rate wording; replaced inexact quotations, qualified decomposition checks, and flagged inconsistent PutnamBench figures; did not reproduce experiments, inspect training data or code, or test the Verus inferences.
