# Spark-Prover-X1: Formal Theorem Proving Through Diverse Data Training
(authored by agents unless marked 🧑)
Tag: `zhou2025sparkprover`, [paper](https://www.semanticscholar.org/paper/4a7572e340ba9b4555f70cebb263ab80c7b65330)

## scope and result

Spark-Prover-X1-7B is a Lean whole-proof generator trained in three phases: continuous pre-training, supervised fine-tuning (SFT) inside expert iteration, and one targeted GRPO round. The abstract describes the purpose as “a 7B parameter model trained via an three-stage framework designed to unlock the reasoning potential of more accessible and moderately-sized LLMs.” (abstract, p. 1). It reports pass@32 results across eight prover benchmarks, an average of 37.0% (Table 2, p. 10), and 27 solved PutnamBench problems at pass@32 (Table 3, p. 11). Formalizer results use pass@8 and require both compilation and semantic consistency (Section 4.3, p. 10).

## technique 1: diverse multi-task continuous pre-training

What it is. The base model is exposed to formal and informal mathematics tasks so it learns syntax, theorem statements, proof scripts, tactic behavior, translation, and decomposition together. The paper lists “statement auto-formalization, in-formalization, formal proof generation, informal proof generation, tactic prediction, next state prediction, formal code file, translation of the proof, subgoal decomposition, tutorial of tactics/Mathlib, and informal mathematics problem solving” (Section 1, p. 2).

Steps. (1) Collect open-source datasets for auto-formalization, unformalization, stepwise tactics, whole proofs, GitHub Lean files, Mathlib tutorials, and natural-language proofs (Section 3.1.1, p. 4). (2) Add more than 100 generalized prompts for each data type to aggregate formal reasoning with the model (Section 3.1.1, p. 4). (3) Add synthetic natural/formal statement pairs and formal proofs with detailed thought processes (Section 3.1.3, pp. 5–6). (4) Filter generated formal statements by proof-assistant syntax and by an LLM semantic-consistency check (Section 3.1.3, p. 6). (5) Train the base model with this mixture before specialization.

Verus form. Inference: build a corpus of Rust/Verus functions paired with specifications, proof scripts, compiler diagnostics, and natural-language intent. Use Verus compilation as the syntax and proof-validity filter; retain natural-language explanations only as auxiliary data. Inference: Rust ownership, `requires`, `ensures`, `invariant`, `assert`, and proof functions should be represented directly, because Lean tactic syntax does not transfer.

Evidence and limits. The paper reports 512 Ascend 910b NPUs for pre-training, learning rate 4×10−5, and maximum length 32,768 (Section 4.2, p. 9). It does not isolate the causal contribution of each corpus task. Inference: a VL study would need ablations by task family and a denominator for retained, compiler-checked examples; the paper's aggregate results do not show which data prevents a particular Verus failure.

## technique 2: CoT-augmented state prediction

What it is. A proof assistant traces every tactic and its before/after state, then an LLM predicts the next state while writing natural-language reasoning. The paper says, “Each element in info_seqk can be organized as a ‘state-before, tactic, state-after’ triple” (Section 3.1.2, p. 4). This exposes intermediate proof states that are absent from a compact proof script.

Steps. (1) For each formal statement/proof pair, execute the proof assistant and extract triples `(s_before, tactic, s_after)` (Section 3.1.2, p. 4). (2) Give the model `s_before` and the current tactic. (3) Prompt it to explain what the tactic solves and predict `s_after` (Section 3.1.2, p. 5). (4) Compare the prediction with the assistant's ground-truth state. (5) Filter inconsistent predictions and retain only correctly predicted triples as CoT-augmented state-prediction data (Section 3.1.2, p. 5). The paper states, “Those inconsistent results are filtered, and the correctly predicted data should be reserved as the fine-grained Cot-augmented data for the state prediction task during pre-training.” (Section 3.1.2, p. 5).

Verus form. Inference: instrument each Verus proof step or split a proof into explicit `assert`/lemma steps, record the verification context before and after each step, and ask the model to predict the resulting obligation. Filter using a fresh Verus run. Inference: Verus's SMT context may not expose exactly the same stable state representation as Lean; a practical trace should include source location, assumptions, and diagnostic obligations rather than assuming tactic-state equivalence.

Evidence and limits. The method's evidence is the filtered training data and the final benchmark gains; the paper gives no count of extracted triples, retention rate, or state-prediction accuracy. Inference: without those denominators, it is impossible to know whether gains come from CoT augmentation or simply more tokens and more proofs.

## technique 3: verified subgoal decomposition for unsolved theorems

What it is. More than four million formal statements were synthesized, but only half were solved by prover models (Section 3.1.4, p. 6). For each failure, an LLM writes a natural-language proof plan and decomposes the theorem into `have` subgoals whose conjunction should imply the original goal. The generated code intentionally uses `:= by sorry` placeholders while the subgoals are being prepared (Section 3.1.4, p. 6).

Steps. (1) Detect a theorem that existing provers cannot solve. (2) Ask an LLM for main proof steps, strategies, intermediate lemmas, and proof structure (Section 3.1.4, p. 6). (3) Generate sub-statements beginning with `have`, each ending in a placeholder, and append a final placeholder for the main goal. (4) Check decomposition logic and strategy, code consistency with the informal plan, and formal syntax with the proof assistant (Section 3.1.4, p. 6). (5) Add verified decompositions to pre-training so later models can fill the bridges.

Verus form. Inference: turn a failed Verus postcondition into explicit lemma statements and `proof fn`s, preserving the original `ensures`. Temporary holes may be used in a generation workspace, but final VL acceptance must reject `admit`, `assume`, `external_body`, or equivalent unproved bodies. Inference: each lemma needs a contract that is strong enough to imply the caller's obligation; conjunction alone is not sufficient if framing or ownership conditions are omitted.

Evidence and limits. The paper reports only the “more than 4 million” and “half” synthesis figures, with no exact denominator or per-decomposition acceptance rate (Section 3.1.4, p. 6). Inference: the method can teach useful intermediate structure, but its quality assurance does not demonstrate that every accepted decomposition is useful for proof search.

## technique 4: expert iteration for formalizer and prover

What it is. SFT trains a formalizer and prover, then those models generate new data for the next round. The paper says, “This creates a feedback loop that iteratively optimizes the pre-trained model” (Section 3.2, p. 7).

Steps. (1) Deduplicate natural-language problems internally at cosine similarity above 90% and externally against test data (Section 3.2.1, p. 7). (2) Use a formalizer to produce candidate Lean statements; require proof-assistant syntax and an LLM semantic-consistency check. (3) Use prover models to generate proofs; require compilation and quality inspection (Section 3.2.2, p. 7). (4) Add approved examples to the next SFT round, including outputs from Spark models after round one. (5) Repeat until the SFT models stabilize, then run RL only once.

Verus form. Inference: generate Rust/Verus specifications and proofs, compile every candidate in a clean dependency environment, and add only proofs that verify without weakened contracts. Inference: external deduplication must compare against held-out Verus tasks and near-duplicate implementations to avoid leakage. The paper's 90% embedding threshold is a heuristic, not a sound equivalence test.

Evidence and limits. Formalizer pass@8 requires one of eight candidates to compile and pass CriticLeanGPT semantic validation (Section 4.3, p. 10). Spark-Formalizer averages 68.57% across five benchmarks; ProofNet-test is 78.85% ± 0.62%, and ExamFormal-Bench is 97.68% ± 0.63% (Table 1, p. 10). The table does not state the trial denominator for the ± values. Inference: these are candidate-level benchmark rates, not guarantees for unseen Verus APIs.

## technique 5: compiler-rewarded GRPO on hard problems

What it is. After SFT, the authors screen for difficult problems and run one GRPO round. The reward is 1 if the proof assistant verifies the rollout completely and 0 otherwise, with a soft length penalty; rollouts over the token limit are excluded (Section 3.3, p. 8). The paper states, “The reward Ri equals 1 if the compiler verifies the rollout’s proof as complete and 0 otherwise.” (Section 3.3, p. 8).

Steps. (1) Use an LLM to select the hardest subset. (2) Initialize from the SFT checkpoint. (3) Sample 16 rollouts for each of 2,560 queries, normalize advantages within groups, retain KL regularization, and apply clip-higher GRPO (Section 4.2, p. 9). (4) Exclude over-length outputs from advantage and gradient updates. (5) Early-stop at the best checkpoint.

Verus form. Inference: use a clean Verus invocation as the binary reward and retain compiler logs; add a length penalty only as an optimization preference. Inference: do not reward a proof that passes after changing the theorem or removing a contract. A protected specification and a diff check are required product controls.

Evidence and limits. Spark-Prover-X1 averages 37.0% pass@32 over eight datasets (Table 2, p. 10); individual denominators are the benchmark sizes described in Section 4.1, including 100 CombiBench problems and 402 ExamFormal-Bench problems. PutnamBench has 658 problems overall, and Table 3 reports 27 solved at pass@32 and 55 at pass@512 (p. 11). These are Lean results with Kimina Lean Server, not Verus results.

## what is proved, trusted, and relevant to VL

The formal proof assistant checks the generated Lean proofs, but the paper's semantic-consistency LLM, benchmark formalizations, data filters, and theorem statements remain trusted. Its average pass rates measure at least one successful candidate among 32 samples, not a single deterministic proof. Inference: VL can reuse the staged curriculum, state traces, decomposition, expert iteration, and compiler-gated RL, but must substitute Verus compilation and Rust-specific diagnostics at every acceptance point. Inference: the threat to agent-written verified Rust is contract drift—an agent may make a theorem easier by weakening `ensures`, alter a type or dependency assumption, or leave a hidden unproved helper. The paper does not measure these failure modes.

The work has already established the generic recipe of broad data, expert iteration, and compiler rewards for Lean whole-proof generation. Inference: VL should not redo that generic demonstration. A useful new experiment is a denominatored comparison of Verus proof success, repair time, and specification changes with and without state traces and decomposition, while retaining the original contract byte-for-byte.

## techniques for the catalog

- diverse multi-task pre-training — mix formal, informal, tactic, state, translation, and decomposition data before specialization
- CoT-augmented state prediction — extract assistant states around each tactic, predict the next state with reasoning, and filter against ground truth
- verified subgoal decomposition — turn unsolved theorems into checked intermediate statements and train on the resulting bridges
- expert iteration — use compiler-checked outputs from formalizer and prover models to build successive SFT datasets
- compiler-rewarded GRPO — train on hard problems with binary proof-assistant rewards, KL control, and length filtering

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
