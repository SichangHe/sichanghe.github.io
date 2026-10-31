# Learning to Coordinate Symbolic Tools: LLM Agents for Verified Sum-of-Squares Certificates
(authored by agents unless marked 🧑)
Tag: `chen2026coordinate`, [paper](https://arxiv.org/abs/2608.00326)

## task and acceptance contract
The paper studies an LLM agent that searches for weighted sum-of-squares (SOS) certificates using exact symbolic tools. A certificate has the form f = Σ c_j p_j² with positive rational c_j and rational-coefficient polynomials p_j. The final checker expands the candidate and compares coefficients exactly. Thus local tool calls are reliable, but selecting regroupings, retries, and a stopping point remains a sequential search problem. The authors emphasize: “Symbolic tools execute a proposed operation; they do not determine the global search path.” (Introduction, p. 1.)

A terminal candidate is accepted only if it parses as a finite weighted sum, every weight is an exact positive rational, every summand is a polynomial square, and `expand(f − Σ c_j p_j²) = 0`. The native environment exposes `expand_polynomial`, `collect_terms`, `reorder_polynomial`, and `factorize_polynomial`. The harness validates JSON, enforces call budgets, executes calls in SymPy, and appends exact observations. It allows at most ten calls, three decomposition attempts, five seconds per call, and 60 seconds per episode.

## technique 1: algebra-grounded curriculum and deployment boundary

use conditions

Train the model on nine synthetic tasks: four local operations (term ordering, collection, expansion, factorization), four structural tasks (Horner form, symmetric reduction, quotient/remainder, extended GCD), and composite weighted-SOS search. The local tasks teach tool-aligned operations; structural tasks teach representations not returned by one tool call; SOS combines them into search. Inference: use this when exact symbolic state is available but a certificate requires strategic multi-step coordination.

how it is done

1. Generate 150,000 examples for each task, 1.35 million total; reserve 5% validation, leaving 1,282,500 training records.
2. For direct tasks, create exact target expressions from symbolic routines.
3. For SOS, sample m ∈ {1,…,5}, base polynomials qj, and integer weights cj ∈ {1,…,10}; expand and scramble the resulting polynomial while hiding the grouping.
4. Supervised-fine-tune Phi-4-reasoning-plus with four-bit QLoRA on direct answers and simulated symbolic traces. The traces contain Python-like snippets and observations, but no native function-call messages. Train on assistant reasoning, snippets, and final answers; retain symbolic observations as context, not prediction targets.
5. Continue from SFT with verifier-grounded GRPO, as described in technique 2.
6. At deployment, expose native SymPy calls only for SOS. Keep direct tasks tool-free so checkpoint skill and tool-enabled search are measured separately.

The paper states: “The SFT corpus contains no native function-call messages. GRPO is defined by chat-template response optimization under symbolic rewards; native-call behavior is evaluated in the weighted-SOS deployment environment.” (Table 3, p. 5.)

Verus form

Inference: a Verus adaptation could train on simulated proof traces and evaluate with actual Verus invocations. Submit the candidate function and its `requires`/`ensures` contract to Verus, and treat diagnostics as observations. A successful parse or tool execution should remain distinct from verifier acceptance. This paper does not evaluate Verus.

evidence and limits

Full is the SFT→GRPO checkpoint with native tools on SOS; SFT and Base have no native tools. Base+Tools uses the base checkpoint with the same SOS interface and limits as Full (Table 4, p. 6). On 10,000 held-out instances per task, Full reached 93.35% macro accuracy across the eight supporting tasks, versus 78.08% for SFT and 42.01% for Base. On weighted SOS, Full achieved 78.96% verified success; SFT 51.82%, Base+Tools 44.73%, and Base 7.63%. These denominators are the custom synthetic test instances, and weighted-SOS success requires exact terminal acceptance. The paper cautions that the nine-task macro combines eight direct checkpoint evaluations with one tool-enabled system evaluation, so it is heterogeneous (Tables 5–6, p. 6; Results, p. 7). The authors write: “It is therefore a heterogeneous summary of complete systems rather than a uniform checkpoint-only metric.” (Results, p. 7.)

The suite shares generator families between train and test, uses one Phi-4 backbone and one run per stage, and does not evaluate natural inequality benchmarks or out-of-distribution polynomials. The authors state: “Because the evaluated configurations do not include SFT+Tools without GRPO or GRPO without tools, the results compare complete systems rather than causally isolating individual components.” (Introduction, p. 2.) Inference: these results support the complete system within this controlled task; they do not establish transfer to verified Rust.

## technique 2: verifier-grounded GRPO over exact symbolic rewards

Start from the SFT checkpoint. For each prompt, sample eight responses and optimize with Group Relative Policy Optimization (GRPO). Parse a required answer wrapper; return −1 if absent. Otherwise combine a format score with an exact task score `Rk(y) = 0.1 Ifmt(y) + 0.9 rk(y)`. The task score is computed from algebraic contracts, not string equality. For SOS, a positive task score requires valid positive-rational weighted-square structure; the score also measures the coefficient residual. A trajectory-shaping term favors valid, nonrepeated calls, but terminal verification receives the largest increment. The authors state: “The exact task scores reward the state produced by a response rather than surface agreement with one reference string.” (Reward interpretation, p. 5.)

Training samples chat-template responses from the SFT checkpoint and scores them with task-specific parsers and symbolic rewards. The paper does not establish native-call rollouts as the GRPO training interface. Native deployment instead permits text, a schema-checked call, or a terminal object; the harness executes valid calls, appends observations, and enforces budgets before terminal verification. The authors state: “We report this stage as checkpoint-level policy optimization under the symbolic objective above.” (Verifier-grounded GRPO, p. 5.) Training used a global prompt batch of 64, eight generations per prompt, 20,039 optimizer steps, and about 55 hours on four 80GB H100 GPUs (p. 5; Table A5, p. 15). The paper does not isolate individual reward components or the causal effect of GRPO versus representation changes.

Inference: a Verus adaptation would need a defined reward contract before using diagnostics as intermediate scores, while retaining final verifier acceptance as the success criterion. The paper supplies no Verus reward design or validation.

## technique 3: terminal failure taxonomy

Separate premature completion/abstention, structurally invalid SOS, and a well-formed SOS whose expansion is the wrong polynomial. The backend may execute every call correctly while the agent still chooses an unhelpful operation, grouping, or stopping point. Successful Full episodes used 3.8 native calls on average, under the ten-call limit. The appendix specifies: “Successful Full episodes use 3.8 native calls on average, measured over verifier-accepted weighted-SOS episodes.” (Tool-use summary, p. 15.) Exact verification prevents any of the three terminal failures from counting as a proof.

## what is proved, trusted, and already done

The exact checker proves only positive rational weights, square structure, and coefficient identity. It does not formalize side assumptions or constrained Positivstellensatz arguments. The harness executes SymPy operations, while the terminal verifier checks the submitted certificate independently (Table A3, p. 13).

## techniques for the catalog

- algebra-grounded curriculum: train local operations, structural representations, and composite certificate search in a joint synthetic curriculum
- exact symbolic tool harness: execute schema-checked calls deterministically and append algebraic observations
- verifier-grounded GRPO: optimize sampled chat-template responses with task-specific symbolic rewards; evaluate native-call search by exact terminal verification
- terminal failure taxonomy: distinguish abstention, malformed certificates, and wrong identities before reporting proof success
