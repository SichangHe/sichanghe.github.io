# Towards Reliable C-to-Rust Translation with Rule-Guided Reasoning and Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `luo2026travel`, [paper](http://arxiv.org/abs/2607.19966v1)

## TRAVEL's objective and evidence

Luo et al. introduce TRAVEL, which combines rule-guided Monte Carlo tree search (MCTS) with dual-reward reinforcement learning (RL). The abstract states: “The second module introduces reinforcement learning that couples execution feedback with reasoning-quality signals, encouraging the model to construct reasoning paths that accurately capture program semantics, thereby ensuring that the generated Rust code preserves the intended behavior of the original C program.” (Abstract, p. 1). The second module trains a reward model and applies GRPO using reasoning quality and executable test feedback. The system targets C-to-Rust semantic fidelity, compilability, and reduction of unsafe code.

The training set is built from the xCodeEval training split and has 16,639 samples (C code, MCTS reasoning path, validated Rust translation), split 9:1 into training and validation. Evaluation uses 515 xCodeEval samples, 100 C functions randomly sampled from proprietary Huawei projects (HW-Bench), and 107 Linux-kernel C functions (OS-Bench) (Section 3.2, p. 5). The paper uses computational accuracy (CA), compilation success rate (CSR), unsafe rate (UR), and unsafe-line rate (ULR) (Section 3.5, p. 6). For HW-Bench and OS-Bench, “no test cases are available”, so CA is not computed and only CSR, UR, and ULR are reported (Section 4.3, p. 8). The paper's validation is test-based, not formal equivalence: “Nevertheless, our evaluation reflects test-based semantic verification rather than full formal equivalence.” (Section 5.2, p. 10).

## technique 1: Verifiable Components

Use this when source functions lack existing executable tests. For each C function, the paper prompts Qwen2.5-Coder-32B-Instruct to generate 5 test inputs, executes them on the original C program, and collects the outputs. These input-output pairs are the Verifiable Components (Section 2.2.1, p. 2). They are used in both MCTS evaluation and RL execution rewards (Section 2.2.1, p. 2).

The procedure is:

1. Prompt the model to generate 5 test inputs for the function (Section 2.2.1, p. 2).
2. Execute the inputs on the original C implementation and record the outputs (Section 2.2.1, p. 2).
3. To verify a Rust translation, execute it on the same inputs and compare with the reference outputs; it counts as correct if all outputs match (Section 2.2.1, p. 2).

Inference: In Verus, each pair can become a concrete test plus a specification witness, but five examples do not prove a universal postcondition. A Verus `ensures` clause should express the intended relation for all valid inputs, while the generated tests remain counterexample search. The original C execution, test harness, and assumed input validity stay trusted.

## technique 2: rule-guided MCTS reasoning paths

Use this to make a translation model reason about C semantics before selecting Rust constructs. In TRAVEL's MCTS, each node is the accumulated natural-language reasoning trace and each action generates the next reasoning step (Section 2.2.2, p. 2). The exemplars elicit a two-stage path: first analyze the C function's semantics, then decide how to realize it in Rust using a Rust-specific translation rule library (Section 2.2.2, p. 3). The paper caps each search episode at 5 reasoning steps (Section 3.4, p. 6).

1. Start at the root and repeatedly select the child with the highest PUCT score, which combines the estimated action value, the LLM's prior over actions, visit counts, and an exploration weight, until an unexpanded node is reached (Equation 1, Section 2.2.2, p. 3). The LLM prior is biased toward idiomatic Rust implicitly through rule-augmented prompts and few-shot examples (p. 3).
2. At an unexpanded leaf, prompt the LLM to sample `K` candidate next-step actions; exemplars instruct it to wrap each reasoning step in `<step>` and `</step>`, and generation is truncated at the first closing tag (Section 2.2.2, p. 3).
3. When a node contains a complete Rust translation, evaluate it on the Verifiable Components: +1 if all test cases pass, −1 if any fails (Equation 2, Section 2.2.2, p. 3).
4. Backpropagate the terminal reward along the selected path, incrementing visit counts and setting each action value to the average of propagated rewards (Equation 3, Section 2.2.2, pp. 3–4).
5. Score each reasoning path by the mean of node value estimates along it (Section 2.2.2, p. 4).
6. After search, each explored path yields a triplet `(C, P, R)`: C is the C code, P the reasoning path with its estimated value, R the Rust translation (Section 2.2.2, p. 4); Module II's data set is `{(C, P, R, v)}` with `v` the MCTS path value (Equation 4, Section 2.3, p. 4).

The rule library includes replacing `malloc` with `Box`/`Vec`, relying on ownership and `drop` instead of `free`, converting NULL returns to `Option`/`Result`, and preferring references when borrowing allows (Table 1, p. 4; the paper says it summarizes and extends rules from prior work [12], Section 2.2.2, p. 3). Inference: A Verus implementation can use these ordinary Rust constructs and then prove their contracts. MCTS scores are evidence for candidate selection, not proof; a Verus proof must establish ownership, bounds, and functional postconditions independently of model probabilities.

## technique 3: dual-reward training with GRPO

Apply this after collecting MCTS paths. The paper trains a reward model by supervised fine-tuning to generate the path value `v` from `(C, P, R)`, using a standard language-modeling loss (Section 2.3.1, Equation 5, p. 4), then cold-starts a policy by supervised fine-tuning on the search data (Section 2.3.2, Equation 6, p. 4). It optimizes with GRPO over groups of `G = 8` sampled outputs (Section 3.4, p. 6), using a clipped objective and a KL penalty to the SFT-tuned reference policy, with advantages normalized within the group (Equations 7–9, Section 2.3.3, pp. 4–5).

The execution reward first checks compilation. A compile failure receives −1. Otherwise it computes `PassRate = n_pass / n_total`; zero passes receives −1 and otherwise the reward is the pass rate (Equations 10–11, Section 2.3.3, p. 5). The reasoning reward is the learned reward model `f_phi(C,P,R)`; the final reward is `λ_exec · r_exec + λ_reason · r_reason`, with both coefficients set to 0.5 (Equations 12–13, Section 2.3.3, p. 5; Section 3.4, p. 6).

Inference: Verus proof success could replace or supplement the execution reward, with a binary or graded signal for discharged specifications. The paper does not do this. Its reward model trusts generated tests and the original C oracle, and GRPO can optimize a test-passing shortcut instead of a universal property.

## technique 4: training and evaluation metrics

The paper defines CA as the proportion of the N evaluated samples whose generated Rust program gives the same execution outputs as the reference (Equations 14–15), CSR as the percentage of translated programs that compile without errors, UR as the proportion of unsafe samples in the dataset, and ULR as the ratio of unsafe lines of code within each sample (Section 3.5, p. 6). On xCodeEval, TRAVEL has higher CA than every prompting baseline and than SFT on all three backbones (Table 3, p. 7). Its CSR is slightly lower than SFT on the two Qwen backbones (Qwen2.5-Coder-7B: 87.38% vs 87.77%; 3B: 75.15% vs 77.48%), which the authors attribute to the reward optimizing semantic correctness rather than CSR alone (Section 4.1, p. 8). In Table 4 (p. 9), for Qwen2.5-Coder-7B-Instruct, TRAVEL reaches 71.07% CA and 87.38% CSR; removing RL gives 68.35% CA and 87.77% CSR, while removing both RL and MCTS paths gives 67.18% CA and 83.30% CSR. For Qwen2.5-Coder-3B-Instruct, TRAVEL reaches 59.03% CA and 75.15% CSR; removing the execution reward gives 55.92% CA and 71.65% CSR (Table 4, p. 9). The paper does not state the denominators beyond N evaluated samples per benchmark (515 for xCodeEval).

On HW-Bench and OS-Bench, TRAVEL improves CSR on average by 18.28% and 16.51% respectively and reduces UR by 13.06% and 13.08% (abstract, p. 1). The RQ3 summary states “an average absolute improvement of 17.40% in CSR, together with average reductions of 13.07% in UR and 5.50% in ULR over baselines” across the two benchmarks and three LLMs (Section 4.3, p. 9). The abstract also reports, on xCodeEval, CA and CSR gains of 26.22% and 18.77% over the strongest prompting baseline IRENE (p. 1); the paper does not say how these are computed.

## what is proved, trusted, and left undone

TRAVEL's rule library guides the prompts, MCTS checks candidates on five generated tests, and RL optimizes those signals. There is no formal proof of C/Rust equivalence. The paper identifies dependence on the backbone LLM, imperfect LLM-generated tests, and possible data leakage as threats (Section 5.2, p. 10). It warns: “While this enables scalable semantic verification, such tests may not fully cover corner cases, so translated programs may pass tests yet deviate from the original C code on unseen inputs.” (Section 5.2, p. 10). The authors cite prior work [53] showing that even a 7B model can achieve 87.20% line coverage with five generated tests, and “expect comparable or better coverage” from their stronger model; they do not report coverage for their own corpus (Section 5.2, p. 10).

The paper already reports rule-guided search, dual rewards, generated test oracles, and ablations.

## techniques for the catalog

- verifiable components — generate five inputs per C function and execute the C oracle to obtain reference outputs
- rule-guided MCTS — search semantics-first reasoning paths under Rust-specific ownership and API rules
- dual-reward GRPO — optimize a policy with execution pass rate and learned reasoning quality
- proof-aware evaluation gap — distinguish test-based CA/CSR/UR/ULR from universal formal equivalence
