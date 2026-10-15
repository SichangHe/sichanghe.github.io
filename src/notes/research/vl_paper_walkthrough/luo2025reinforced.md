# Reinforced Large Language Model is a formal theorem prover
(authored by agents unless marked 🧑)
Tag: `luo2025reinforced`, [paper](http://arxiv.org/abs/2502.08908v1)

## what is proved or measured

Luo presents a two-phase training framework for a language model that emits Lean tactics. The first phase supervised-fine-tunes a pretrained model on Lean proof traces augmented with GPT-4o-generated reasoning text. The second phase samples candidate completions and uses GRPO reinforcement learning to compare them with reference next tactics. During inference, LeanDojo runs tactics in a breadth-first queue-enhanced tree search. The paper compares the supervised model Lean-Qwen0.5B-sft with the reinforced Lean-Qwen0.5B-rl on 30 miniF2F samples and reports 11 versus 13 positive samples, 36% versus 43% miniF2F accuracy, and 49% versus 61% train-set accuracy.

The paper’s abstract says: “We propose a reinforcement learning framework to iteratively optimize the pretrained LLM by rolling out next tactics and comparing them with the expected ones.” (Abstract, p.1). The experiment uses Qwen2.5-0.5B, 25,000 Lean-workbook samples, four A100 GPUs for training, and a Macbook M2 Pro for inference (Section 3, p.3).

## technique 1: add reasoning supervision to proof-state data

what it is: turn each Lean-workbook proof step into three linked fields: a prompt containing the current state, a completion containing GPT-4o’s generated thought plus the reference tactic, and a ground-truth field containing exactly the next tactic. The GPT-4o prompt asks it to analyze the proposition and conditions and provide the next tactic while seeing the reference tactic.

when to use it: use this when a pretrained model has general language ability but weak understanding of Lean’s formal syntax and proof-state transitions.

how to do it:
1. collect Lean theorem states and reference next tactics from Lean-workbook (Section 2.1)
2. give current state and reference tactic to GPT-4o with the paper’s analysis prompt (Section 2.1)
3. store the generated reasoning paragraph and reference tactic as a completion (Section 2.1)
4. create an adaptation dataset of prompt/completion pairs (Section 2.1)
5. create a reinforce dataset of prompt/ground-truth pairs for reward comparison (Section 2.1)

The source specifies the system format as: “You need to complete the proof in Lean4. Please think carefully and provide the next step based on the current state.” (Section 2.1, p.2). Verus form (Inference): collect Verus error states, specifications, and verified next proof actions; optionally generate planning text, but keep the accepted target as a concrete Verus proof step. Store prompt/completion and prompt/reference fields, then require a fresh Verus check for every candidate.

evidence and limits: the source dataset contains 25k samples (Section 3, p.3), but the paper does not give a deduplicated count, theorem split, or GPT-4o annotation accuracy. Inference: reasoning text is supervision, not proof evidence; Lean verification remains necessary.

## technique 2: supervised adaptation followed by GRPO reinforcement

what it is: first train the pretrained Qwen model on the adaptation dataset to awaken chain-of-thought capability. Then iterate sampling and optimization: the policy model generates a group of completions, rewards compare each candidate to the ground truth, and a reward-weighted advantage loss updates model parameters. GRPO is the optimizer used in the experiment.

when to use it: use the two phases when direct supervised tactic imitation produces a useful baseline but candidate quality still needs optimization against tactic-level rewards.

how to do it:
1. initialize a pretrained model, Qwen2.5-0.5B (Section 2.2)
2. supervised-fine-tune it on prompt/completion adaptation records to obtain Lean-Qwen0.5B-sft (Section 2.2)
3. for each reinforcement iteration, sample a group of completions from the current policy model (Section 2.2)
4. calculate reward by comparing candidates with the ground-truth next tactic (Section 2.2)
5. compute reward-weighted advantage loss and parameter gradients (Section 2.2)
6. update the policy model with GRPO and repeat until the chosen iteration budget ends (Section 2.2)
7. call the resulting model Lean-Qwen0.5B-rl (Section 2.2)

The paper states: “In the sampling step, The LLM predict a group of completions as the candidates.” (Section 2.2, p.2). Verus form (Inference): use candidate Rust/Verus proof snippets as samples, score them by whether Verus accepts the intended obligation, and apply policy optimization outside the verified code. Reference-tactic similarity alone is weaker than Verus acceptance, so a Verus adaptation should use checker-grounded rewards.

evidence and limits: both adaptation and reinforcement training take one day on 4×A100 GPUs (Section 3, p.3). The paper reports only one small configuration and no variance across seeds. Inference: the reported gain does not establish that GRPO beats supervised training for larger models or Verus tasks.

## technique 3: queue-enhanced breadth-first tactic search

what it is: use LeanDojo’s theorem object and a queue to explore a proof tree. The model predicts a tactic, LeanDojo’s `run_tac` executes it, and the resulting state is classified as a finished proof, a novel state to enqueue, or a grammar error. The queue implements breadth-first search.

how to do it:
1. process the input theorem through LeanDojo as a `Theorem` object (Section 2.3)
2. initialize a search queue with the root proof state (Section 2.3)
3. ask the model for a next tactic and execute it with `run_tac` (Section 2.3)
4. if the state is proof finish, record success (Section 2.3)
5. if the state is novel, add it as a new search-tree node (Section 2.3)
6. if the tactic has a grammar error, reject that branch (Section 2.3)
7. continue breadth-first exploration until success or the configured search limit (Section 2.3)

The source says: “The queue is the breath-first search on the tree.” (Section 2.3, p.2; spelling preserved). Verus form (Inference): represent each Verus invocation and diagnostic as a search node, enqueue novel obligations, discard syntax/type failures, and accept only a Verus-verified terminal proof. Verus does not provide LeanDojo’s `Theorem` or `run_tac`, so an external runner must implement them.

evidence and limits: the entire inference run takes one hour on an Apple M2 Pro CPU setup (Section 3, p.3). The paper does not report node counts, branching factors, or timeout denominators, so search efficiency cannot be compared beyond the stated setup.

## technique 4: checker and format rewards during training

what it is: combine an accuracy reward with an additional output-format reward. The training records show adaptation loss approaching 0.1 and reinforcement format reward rising quickly; accuracy reward changes in steps at epoch boundaries.

when to use it: use a format reward when malformed model output would otherwise waste theorem-prover calls or break tactic parsing.

how to do it:
1. define the required `<think>...</think>` and `<answer>...</answer>` response structure (Section 2.1)
2. score whether a completion follows that structure (Section 3)
3. combine format and tactic-accuracy signals in reinforcement optimization (Section 3)
4. still execute the proposed tactic in Lean during inference (Section 2.3)

The paper reports: “We use an additional format reward like [4].” (Section 3, p.3). Inference: for Verus, syntax-format reward can reduce parser failures, but only Verus acceptance can establish that a proof obligation is discharged.

## measured effect, trusted boundary, and product implications

Table 2 evaluates 30 miniF2F samples. Lean-Qwen0.5B-sft has 11 positive samples and 36% accuracy on miniF2F, with 49% train-set accuracy; Lean-Qwen0.5B-rl has 13 positive samples, 43% miniF2F accuracy, and 61% train-set accuracy (Table 2, p.3). The paper concludes that reinforcement improves accuracy over direct supervised fine-tuning. The denominators are 30 miniF2F samples and the unspecified train-set size; the table does not give a train-set denominator.

Lean/LeanDojo execution is the correctness boundary for accepted proofs. Inference: GPT-4o reasoning annotations, supervised loss, GRPO rewards, model outputs, and breadth-first orchestration are untrusted search components until Lean accepts a tactic sequence. The paper does not test Verus, Rust, specifications, memory safety, or deployed code. Inference: VL can reuse the two-phase training pattern, checker-grounded search, and format filtering, but should train on Verus states and reward actual Verus verification rather than Lean reference-tactic similarity alone.

The paper’s 43% versus 36% claim is 13 versus 11 positives over 30 miniF2F samples, while the train-set figures (61% and 49%) have no denominator in the paper. Inference: the miniF2F comparison is small and should not be extrapolated to product reliability. The threat to agent-written verified Rust is medium: reinforcement may improve proof-step proposal throughput, but the semantic and engineering gap from Lean to Verus is unmeasured.

Inference: VL should not redo a generic supervised-versus-reinforced Lean comparison with the same tiny setup. A useful new experiment would replace the reward with Verus acceptance, measure proof repair cost and verifier time, and report denominators and variance.

## techniques for the catalog

- reasoning-augmented proof data — generate thought plus reference tactic records from proof states
- two-phase GRPO training — supervised adaptation followed by grouped sampling and reward-weighted updates
- verifier-backed BFS — execute candidate tactics, enqueue novel states, and discard grammar failures
- format-and-accuracy reward — optimize parseable output while retaining theorem-prover checks

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
