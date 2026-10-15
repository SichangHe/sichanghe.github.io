# B-Coder: Value-Based Deep Reinforcement Learning for Program Synthesis
(authored by agents unless marked 🧑)
Tag: `yu2023bcoder`, [paper](https://arxiv.org/abs/2310.03173)

## scope and result

B-Coder treats token generation as a Markov decision process and trains a value based reinforcement-learning agent against executable unit-test outcomes. The paper's central claim is that value methods can reuse off-policy human and historical programs, while policy-gradient methods are less sample efficient. The abstract states: “The application of RL focuses on directly optimizing for functional correctness, offering an advantage over conventional supervised methods.” (Abstract, p. 1.) The method has three parts: task-structure-aware dueling values, initialization from a pretrained language model, and a conservative Bellman backup. It also uses the learned value function as a reward model for candidate ranking.

The paper evaluates CodeRL-initialized T5 models on APPS (5,000 training and 5,000 test problems, split into introductory, interview, and competition levels; §5, p. 8). The main B-Coder model has at most 770M trainable parameters per stage and reports APPS test pass@1 of 2.30 overall, pass@5 of 3.80, and pass@1000 of 18.12 (Table 1, p. 8; denominators are the APPS test problems and the sampled-program protocol for each pass@k). The paper reports APPS results with nucleus sampling temperature 0.6, m=256 candidates for k=1,5 and m=2500 for k=1000 (§5, p. 9). These numbers are percentages, not counts.

## technique 1: encode program synthesis as token-level value learning

What it is. A state is the prompt plus the generated prefix, an action is the next vocabulary token, and transitions concatenate that token. Only the completed program receives a terminal reward: +1.0 when all unit tests pass, −0.3 when any test fails, −0.6 on an execution error, and −1.0 when compilation fails (Eq. 2, §3.1, p. 3). The discount is γ=0.999, which slightly favors concise solutions (§3.1, p. 3). The authors explain the motivation: “This allows for directly optimizing execution outcomes through reinforcement learning (RL), by formulating test outcomes as reward signals.” (Introduction, p. 2.)

How to apply it.

1. Build each state as `(generated_prefix, problem_description)` and each action as one vocabulary token (§3.1, p. 3)
2. Generate until an end token or maximum length T (§3, p. 3)
3. Compile and execute the completed program on the available tests (§3.1, p. 3)
4. Assign the terminal reward from Eq. 2 and zero reward at all earlier steps (§3.1, p. 3)
5. Learn Q and V with temporal-difference targets (§3.1, Eqs. 3–6, p. 3)

Verus form. Inference: use the natural-language specification as the state input and generate Rust tokens, but make the terminal checker run `verus` and treat a successful verification result as the +1 outcome. Inference: a practical state should include the generated Rust prefix and diagnostics from the previous Verus run; Verus proof obligations are richer than unit-test pass/fail, so the reward should preserve distinct compile, verifier, runtime, and counterexample outcomes. Verus constructs belong in generated code and proof blocks, not in the RL equations.

Evidence and limits. APPS is a code-generation benchmark with hidden tests; the reward is therefore executable evidence of behavior, not a proof of all inputs. The method assumes the checker is available and that a scalar terminal reward is useful despite sparse feedback. The paper notes that large action and state spaces make value training difficult (§4, p. 4), and the APPS result uses only the benchmark's 5,000 training problems and 5,000 test problems (§5, p. 8).

## technique 2: enforce a dueling advantage structure from correct programs

What it is. Because ground-truth programs are assumed correct, their actions should have the highest Q-value at each prefix. B-Coder writes Q as `Q(s,a)=A(s,a)+V(s)` with `A(s,a)=g(s,a)-max_a g(s,a)`, which guarantees non-positive advantages. It then minimizes the absolute advantage along every ground-truth trajectory: `Ladv = E[Σ_t |A(s*_t,a*_t)|]` (Eqs. 7–8, §4.1, p. 5). The paper's exact rationale is: “As a result, these solutions should attain the highest Q-values, even if the correct solutions might not be unique.” (§4.1, p. 5.)

How to apply it.

1. For each training solution, record every prefix state and its demonstrated next token (§4.1, p. 5)
2. Compute logits g for all vocabulary actions and subtract the maximum logit to form A (§4.1, Eq. 7, p. 5)
3. Add a state value V to obtain Q (§4.1, Eq. 7, p. 5)
4. Minimize the sum of absolute demonstrated advantages with Ladv (§4.1, Eq. 8, p. 5)
5. Cap Q at Rmax=1, the maximum total reward (§4.1, p. 5; Appendix G.1, p. 19)

Verus form. Inference: use demonstrations containing verified Rust programs, and train the next-token scorer so the demonstrated token has maximal advantage. Inference: this teaches a generator to imitate proof scripts but does not establish that generated code verifies. A Verus-oriented implementation can generate ordinary Rust plus `requires`, `ensures`, `invariant`, `assert`, `assume`, and `proof fn` syntax, while a separate Verus invocation supplies the terminal evidence.

Evidence and limits. This structure depends on the assumption that every ground-truth program in the training set is correct (§4.1, p. 5). It does not handle multiple valid continuations beyond allowing ties through the highest-value condition. Inference: mislabeled or unverifiable demonstrations can directly shape the learned ordering, so proof-corpus curation is a product risk.

## technique 3: initialize Q from a pretrained language model and pretrain V

What it is. The pretrained LM supplies logits ℓ. B-Coder sets the initial advantage to `Aθckpt(s,a)=α[ℓθckpt(s,a)−max_a ℓθckpt(s,a)]`, then defines `Qϕ=Aθckpt+Vϕ` (§4.2, Eq. 11, pp. 5–6). Because softmax is translation invariant, the resulting policy is exactly the checkpoint policy: “this Qϕ-function produces a policy πϕ identical to the output distribution pθckpt of LMθckpt” (§4.2, p. 6). The value head is not left arbitrary: freeze A, train Vϕ on the temporal-difference loss in Eq. 12 until convergence (§4.2, p. 6).

How to apply it.

1. Load a pretrained encoder-decoder checkpoint θckpt (§4.2, p. 5)
2. Compute its logits and subtract the per-state maximum to form A (§4.2, Eq. 11, p. 6)
3. Attach a state-value head Vϕ and define Qϕ=A+Vϕ (§4.2, p. 6)
4. Freeze A, sample `(s,a,r,s')`, and minimize the semi-gradient TD loss LV in Eq. 12 (§4.2, Eq. 12, p. 6)
5. Continue until Vϕ has low TD error, then use Qϕ to initialize fine-tuning (§4.2, p. 6)

Verus form. Inference: initialize a Rust-and-Verus generator from a code model, but retain its policy only as a starting distribution. The Vϕ pretraining target can use verifier outcomes from cached proof attempts. Inference: the checkpoint itself is trusted only as a proposal mechanism; the Verus checker remains the evidence source for each terminal reward.

Evidence and limits. Figure 1 (§4, p. 4) shows that removing initialization causes training to degrade on APPS train data, while initialization and the conservative operator stabilize it. The paper does not give a separate numerical ablation table for initialization; the evidence is the plotted training curve. The approach adds a value head and relies on a sizable pretrained model.

## technique 4: conservative Bellman backup around a fixed policy

What it is. Standard Q-learning backs up the action with maximum current Q. B-Coder instead fixes a policy q and backs up the action with maximum q probability: `(B^qQ)(s,a)=r+γQ(s',argmax_a q(a|s'))` (§4.3, Eq. 14, p. 7). With q set to the checkpoint distribution pθckpt, the operator evaluates the greedy version of the checkpoint policy. The authors state: “The concept behind conservative Bellman operators is to ‘aim low’.” (§4.3, p. 7.) Proposition 4.1 proves Bq is a γ-contraction, so it has a unique fixed point (§4.3, p. 7; Appendix J.1, p. 22).

How to apply it.

1. Freeze q, here pθckpt (§4.3, p. 7)
2. For each transition, select the next action `argmax_a q(a|s')` (§4.3, Eq. 14, p. 7)
3. Compute the squared TD loss LQ using that action and a stop-gradient target (§4.3, Eq. 15, p. 7)
4. Parameterize `Qθ=α(ℓθ−max ℓθ)+Vθr+Vϕ` and freeze ϕ while training the residual value head (§4.3, pp. 6–7)
5. Optimize LQ together with Ladv and cross-entropy: `Lft=LQ+βadv Ladv+βce Lce` (§4.4, Eq. 17, p. 7)

Verus form. Inference: q can be a baseline Rust/Verus model, and the backup action can be its highest-probability next token. The analogous Verus training loop must still invoke the verifier to produce r. Verus code should use actual supported constructs, such as `requires`, `ensures`, `invariant`, `assert`, `assume`, and `proof fn`; the Bellman operator itself is ordinary host-side training code.

Evidence and limits. The contraction proof establishes mathematical stability for a fixed q, not correctness of generated programs. The paper says the optimality operator needs broad state-action coverage, which program synthesis lacks (§4.3, p. 6). B-Coder therefore aims to improve a pretrained policy rather than find a globally optimal policy. Inference: a weak or systematically wrong baseline q can constrain exploration and preserve its blind spots.

## technique 5: recover a reward model and rank candidates without hidden tests

What it is. The inverse conservative operator `TqQ=Q−γQ(next greedy action)` is bijective (Proposition 4.2, §4.5, p. 7), so B-Coder estimates a reward `r̃θ(s,a)≈Qθ(s,a)−γVθ(s')` without training another model (§4.5, Eq. 19, p. 7). For each problem, generate m candidates, sum `r̃θ` over tokens, and select the top k for pass@k evaluation (§4.5, p. 8).

How to apply it.

1. Generate m programs with the trained model (§4.5, p. 8)
2. For every token transition, estimate r̃ from Q and the next state value (§4.5, Eq. 19, p. 7)
3. Sum the estimates over each candidate (§4.5, p. 8)
4. Sort candidates and retain the k highest for pass@k (§4.5, p. 8)

Verus form. Inference: rank candidate Rust proofs by the learned cumulative score before invoking Verus, then run Verus on the selected candidates. This can reduce verifier calls, but the score cannot replace a successful Verus check.

Evidence. On APPS without example-test outcomes, B-Coder reaches overall pass@1 2.30 and pass@5 3.80 (Table 1, p. 8). On the same setting, CodeRL has 2.20 and 3.10, and RLTF has 1.45 and 3.78; each is the overall APPS test percentage for that model and k. With example tests filtered, B-Coder reports overall pass@1 8.04 and pass@5 11.30, while CodeRL with critic sampling plus filtering reports 7.83 and 11.61 (Table 2, p. 9; denominator is the filtered candidate protocol, not all test problems). On CodeRL-generated off-policy programs, ranking gives overall pass@1 2.12 at temperature 0.4 and 2.04 at 0.6, compared with unranked 0.68 and 0.75 (Table 3, p. 9; APPS test percentages). On MBPP's 500-problem test split, ranking improves pass@1 from 13.52 to 20.13 at temperature 0.7 and from 11.90 to 18.89 at 0.8 (Table 4, p. 9; each denominator is 500 test problems). Table 9 shows a ceiling from hidden-test filtering: its All row displays 11.06 in the single `r-filtered` column, while the `r̃-ranked` columns display pass@1=2.30 and pass@5=3.80 (Appendix K, p. 21). The table does not print a separate filtered pass@5 column, so no filtered pass@5 value can be inferred.

Limits and product implications. The authors report mixed raw performance without ranking: B-Coder pass@5 is 2.88 versus CodeRL 3.28 in Table 8 (Appendix K, p. 21), and they identify additional frozen parameters as a limitation. Hidden tests remain necessary for the APPS metric. Inference: for VeruLaw, this approach is useful as a verifier-call scheduler and proposal ranker, but a model-written proof remains a threat if the training corpus, score, or verifier invocation is faulty; only a successful Verus check should be accepted.

## what is proved, measured, and trusted

The paper proves the contraction of Bq and bijectivity of Tq (§4.3–4.5, pp. 7–8). It measures pass@k on APPS and MBPP under the stated model sizes, temperatures, candidate budgets, and splits (Tables 1–4, pp. 8–9). It trusts the pretrained CodeRL checkpoint, the unit-test harness, dataset labels, compiler, and test suites. It does not prove semantic correctness for all inputs, and it does not evaluate Verus. Inference: adapting it to VL requires treating Verus's verifier and its configuration as trusted infrastructure and recording the exact verification outcome and assumptions for every accepted artifact.

The paper's own comparison shows work VL should not redo: a value-function training recipe already combines checkpoint initialization, conservative backups, advantage shaping, and learned-score ranking. The open work is domain transfer from unit tests to proof verification, richer diagnostic rewards, and protection against baseline-policy blind spots. Inference: B-Coder could make proof search cheaper for an agent-written verified-Rust product, but its score cannot certify a candidate; Verus must still accept the final artifact.

## techniques for the catalog

- terminal checker reward: map compile, execution, test, and verification outcomes to scalar terminal rewards and learn token-level values
- demonstrated-program advantage shaping: subtract the per-state maximum logit and minimize demonstrated-token advantage loss
- checkpoint-to-Q initialization: convert pretrained LM logits into a dueling Q function and pretrain its state value with TD loss
- conservative Bellman operator: back up with the greedy action of a fixed baseline policy to stabilize limited-data learning
- inverse-Q reward ranking: recover a reward estimate from Q and rank generated candidates before expensive checking
Checked 2026-10-15 against paper yu2023bcoder: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
