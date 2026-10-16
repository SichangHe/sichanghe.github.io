# Learning to Coordinate Symbolic Tools: LLM Agents for Verified Sum-of-Squares Certificates
(authored by agents unless marked 🧑)
Tag: `chen2026coordinate`, [paper](https://arxiv.org/abs/2608.00326)

## task and acceptance contract
The paper studies an LLM agent that searches for weighted sum-of-squares (SOS) certificates using exact symbolic tools. A certificate has the form f = Σ c_j p_j² with positive rational c_j. The final checker expands the candidate and compares coefficients exactly. Thus local tool calls are reliable, but selecting regroupings, retries, and a stopping point remains a sequential search problem. The authors emphasize: “Symbolic tools execute a proposed operation; they do not determine the global search path.” (Introduction, p. 1.)

A terminal candidate is accepted only if it parses as a finite weighted sum, every weight is an exact positive rational, every summand is a polynomial square, and `expand(f − Σ c_j p_j²) = 0`. The native environment exposes `expand_polynomial`, `collect_terms`, `reorder_polynomial`, and `factorize_polynomial`. The harness validates JSON, enforces call budgets, executes calls in SymPy, and appends exact observations. It allows at most ten calls, three decomposition attempts, five seconds per call, and 60 seconds per episode.

## technique 1: algebra-grounded curriculum and deployment boundary

use conditions

Train the model on nine synthetic tasks: four local operations (term ordering, collection, expansion, factorization), four structural tasks (Horner form, symmetric reduction, quotient/remainder, extended GCD), and composite weighted-SOS search. The local tasks teach tool-aligned operations; structural tasks teach representations not returned by one tool call; SOS combines them into search. Use this when exact symbolic state is available but a certificate requires strategic multi-step coordination.

how it is done

1. Generate 150,000 examples for each task, 1.35 million total; reserve 5% validation, leaving 1,282,500 training records.
2. For direct tasks, create exact target expressions from symbolic routines.
3. For SOS, sample m ∈ {1,…,5}, base polynomials qj, and integer weights cj ∈ {1,…,10}; expand and scramble the resulting polynomial while hiding the grouping.
4. Supervised-fine-tune Phi-4-reasoning-plus with four-bit QLoRA on direct answers and simulated symbolic traces. The traces contain Python-like snippets and observations, but no native function-call messages.
5. At deployment, expose native SymPy calls only for SOS. Keep direct tasks tool-free so checkpoint skill and tool-enabled search are measured separately.

The paper states: “The SFT corpus contains no native function-call messages. GRPO is defined by chat-template response optimization under symbolic rewards; native-call behavior is evaluated in the weighted-SOS deployment environment.” (Table 3, p. 3.)

Verus form

Inference: the same boundary maps to a Verus agent that trains on simulated Rust/Verus proof traces but is evaluated with actual Verus invocations. The final candidate should be a Rust function plus `requires`/`ensures`; the exact checker is Verus, not string similarity. Keep executable tool calls separate from proof-only `proof fn` code, and treat verifier diagnostics as observations. A successful parse or tool execution is intermediate evidence, not a proof.

evidence and limits

On 10,000 held-out instances per task, Full reached 93.35% macro accuracy across the eight supporting tasks, versus 78.08% for SFT and 42.01% for Base. On weighted SOS, Full achieved 78.96% verified success; SFT 51.82%, Base+Tools 44.73%, and Base 7.63%. These denominators are the custom synthetic test instances, and weighted-SOS success requires exact terminal acceptance. The paper cautions that the nine-task macro combines eight direct checkpoint evaluations with one tool-enabled system evaluation, so it is heterogeneous.

The suite shares generator families between train and test, uses one Phi-4 backbone and one run per stage, and does not evaluate natural inequality benchmarks or out-of-distribution polynomials. Inference: VL should treat these gains as evidence that curriculum plus tools improves a controlled search task, not evidence that the approach generalizes to arbitrary verified Rust.

## technique 2: verifier-grounded GRPO over exact symbolic rewards

Start from the SFT checkpoint. For each prompt, sample eight responses and optimize with Group Relative Policy Optimization (GRPO). Parse a required answer wrapper; return −1 if absent. Otherwise combine a format score with an exact task score `Rk(y) = 0.1 Ifmt(y) + 0.9 rk(y)`. The task score is computed from algebraic contracts, not string equality. For SOS, reward is gated on parseable weighted-square structure and coefficient residual. A trajectory-shaping term favors valid, nonrepeated calls, but terminal verification receives the largest increment. The authors state: “The exact task scores reward the state produced by a response rather than surface agreement with one reference string.” (Verifier-grounded GRPO, p. 4.)

Apply it step by step: sample candidate actions (text, schema-checked native call, or terminal object); execute each native call deterministically; append the symbolic observation; keep within call and time budgets; score the terminal object only with the exact verifier; use group-relative advantages and a KL anchor to the SFT policy. Training used batch 64, eight generations per prompt, 20,039 optimizer steps, and about 55 hours on four 80GB H100 GPUs. The paper does not isolate individual reward components or the causal effect of GRPO versus representation changes.

Inference: a Verus version would reward exact verifier progress such as discharged obligations or preserved invariants, but must avoid treating a proof assistant’s diagnostics as a scalar measure of semantic quality without a defined contract. Use `requires`, `ensures`, loop `invariant`, and `proof fn` lemmas found in the Verus documentation; proof code is erased and cannot be called at runtime.

## technique 3: terminal failure taxonomy

Separate premature completion/abstention, structurally invalid SOS, and a well-formed SOS whose expansion is the wrong polynomial. The backend may execute every call correctly while the agent still chooses an unhelpful operation, grouping, or stopping point. Full episodes used 3.8 native calls on average, under the ten-call limit. Exact verification prevents any of the three terminal failures from counting as a proof. Inference: VL evaluation should report parser success, tool execution, proof-check success, and final contract satisfaction as separate events.

## what is proved, trusted, and already done

The exact checker proves only positive rational weights, square structure, and coefficient identity. It does not formalize side assumptions or constrained Positivstellensatz arguments. Trusted components include SymPy, the generated polynomial family, prompt/interface schemas, the model, and the harness. The authors explicitly say the evaluation is a controlled certificate-search environment rather than state-of-the-art inequality proving. Existing systems already learn certificate bases or SOS supports; VL should reuse the separation between search and exact proof and avoid claiming that tool use alone guarantees correctness. Inference: agent-written verified Rust faces the same failure boundary—an agent may issue syntactically valid calls and still reach an unhelpful state—so acceptance must remain a final Verus check.

## techniques for the catalog

- algebra-grounded curriculum: train local operations, structural representations, and composite certificate search in one synthetic progression
- exact symbolic tool harness: execute schema-checked calls deterministically and append algebraic observations
- verifier-grounded GRPO: optimize sampled trajectories with exact contract rewards and a terminal-verification gate
- terminal failure taxonomy: distinguish abstention, malformed certificates, and wrong identities before reporting proof success

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
