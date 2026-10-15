# Search, Verify and Feedback: Towards Next Generation Post-training Paradigm of Foundation Models via Verifier Engineering
(authored by agents unless marked 🧑)
Tag: `guan2024verifier`, [paper](https://doi.org/10.48550/arxiv.2411.11504)

## scope and central model

Guan et al. propose “verifier engineering” as a post-training framework for foundation models. It separates a closed loop into search, verify, and feedback. The abstract says: “The core of verifier engineering involves leveraging a suite of automated verifiers to perform verification tasks and deliver meaningful feedback to foundation models.” (Abstract, p. 1) Search generates candidate responses, verify evaluates them, and feedback changes either model parameters or inference-time choices. The authors formalize the loop as a goal-conditioned Markov decision process (GC-MDP) `(S, A, T, G, Rg, pg)`, where states include context and partial outputs, actions are token choices, and a goal-conditioned policy maximizes expected discounted reward. They write: “The objective for improving model capabilities can be defined as a goal-conditioned policy π : S × G × A → [0, 1] that maximizes the expectation of the cumulative return over the goal distribution.” (Section 2, p. 4)

The paper is a taxonomy and design discussion. It does not introduce a new verifier implementation or report a controlled benchmark with a denominator. Its evidence is the classification of prior methods in Table 2 and Table 3 and cited results from those methods. This matters for VL: the transferable contribution is a pipeline design vocabulary, not a measured claim that one configuration is best.

## technique 1: search over candidate proofs or programs

what it is

Search explores model actions to obtain candidates that can be checked. The paper distinguishes linear search, which follows one sequence token by token, from tree search, which keeps multiple possible continuations. It says: “Linear Search is a widely used search method where the model starts from an initial state and proceeds step by step, selecting one token at a time until reaching the terminal state.” (Section 3.1, p. 5) Tree search includes beam search, Monte Carlo tree search, and Tree of Thoughts. Sampling parameters such as temperature, top-k, and top-p adjust exploration.

when to use it

Use linear search when a cheap sequential attempt is adequate. Use tree search when an early wrong decision can make later repair difficult and the candidate space has branching structure. The paper explicitly notes the tradeoff: linear search is cheaper but can lock in an early suboptimal action, while tree search costs more but explores alternatives.

how to apply it

1. Define the goal `g`, state representation, and terminal condition (Section 2.1, p. 4).
2. For linear search, start with the prompt state and sample one action at each step until termination (Section 3.1, p. 5).
3. For tree search, expand several actions from each frontier state and retain branches using a verifier score or search policy (Section 3.1, pp. 5–6).
4. Tune temperature, top-k, or top-p to trade diversity against coherence (Section 3.2, p. 6).
5. Optionally intervene in the initial state with a structured prompt such as chain-of-thought or program-of-thought to expose intermediate reasoning (Section 3.2, p. 6).
6. Send candidates to the verify stage and retain the verifier result with the candidate; the paper's Figure 1 puts this after search.

Verus form (inference)

Inference: For agent-written Verus Rust, a linear search candidate is one generated implementation and proof attempt, while tree search is a beam of alternative Rust/specification edits. The terminal condition is successful `verus` checking. A program-based verifier supplies a binary compile/prove result; a diagnostic parser can add a score for remaining errors. Inference: retaining branches by proof success is safer than retaining them by a language-model score, but a timeout or unsupported construct must be represented as unknown and trigger another branch or full human review.

evidence and limits

The paper provides no new search experiment, percentages, or task denominator. Its claims about robustness and computational cost are qualitative comparisons in Section 3. Inference: search cannot establish correctness by itself; only the formal verifier result can establish the selected Verus contract, and the contract's adequacy remains outside the search loop.

## technique 2: verifier selection and composition

what it is

The verify stage maps each candidate and goal to feedback `F ← Rg(st−1, at)`. The authors classify verifiers along four dimensions: verification form (binary, score, ranking, or text), granularity (token, thought, or trajectory), source (program-based or model-based), and extra training (yes or no). Table 2 gives examples including code interpreters, rule systems, ORM/PRM models, tools, search engines, and knowledge graphs. They state: “The verifiers play a crucial role in search-verify-feedback pipeline, and the quality and robustness of the verifiers directly impact the performance of the downstream policy.” (Section 4, p. 6)

when to use it

Choose program-based, deterministic checks for explicit constraints, such as syntax, compilation, or a formal proof. Choose model-based checks for subjective properties, while recognizing their uncertainty. Use finer-grained checks when credit assignment matters, and trajectory checks when only a complete answer can be judged. Combine weak verifiers when no single check covers all goals; the paper invokes PAC-style aggregation as the rationale.

how to apply it

1. Write the goal dimensions and required output constraints (Section 2.1, p. 4; Section 4.2, p. 7).
2. Select a verifier form: binary pass/fail for hard constraints, score or ranking for optimization, and text feedback for repair (Section 4.1, p. 6).
3. Select granularity. Token checks score each next token, thought checks score a reasoning step, and trajectory checks score the completed response (Section 4.1, p. 6).
4. Select source. Use program-based checks for deterministic rules and model-based checks for context-sensitive judgments (Section 4.1, pp. 6–7).
5. Route each instruction to an appropriate combination, then resolve disagreement with weights or a synthesis rule (Section 6.2.2, pp. 11–12).
6. Keep verifier outputs and provenance so feedback can be audited.

Verus form (inference)

Inference: A Verus route should put the compiler and Verus checker first, with binary results for parsing, specification well-formedness, and proof success. Rust tests, clippy-like checks, or model critiques can be secondary evidence but cannot replace the proof. Inference: granularity maps naturally to a function proof, a loop invariant obligation, or an entire crate; the crate-level result should gate release. Inference: combining checks requires an explicit policy for contradictions, such as a policy where proof failure rejects and timeout is unknown, rather than averaging a formal result with a model score.

evidence and limits

Table 2 is a taxonomy, not a performance dataset. The paper reports no denominator for verifier accuracy and warns that existing verifier metrics may correlate weakly with downstream performance (Section 6.2.2, p. 11). Model-based verifiers need training and can be distribution-sensitive; program-based verifiers are interpretable but can miss complex or adversarial cases (Section 4.1, pp. 6–7). Inference: for VL, a model-based verifier should be treated as a search heuristic or repair aid unless its claims are independently formalized.

## technique 3: feedback to improve the generator

what it is

Feedback changes model behavior from verification results. Training-based feedback changes parameters using imitation learning, preference learning, or reinforcement learning. Inference-based feedback leaves parameters fixed and uses verifier-guided selection or verifier-aware interaction at generation time. The authors summarize: “Training-based feedback involves updating model parameters using data efficiently obtained through searching and verifying.” (Section 5, p. 8)

how to apply it

1. Generate candidates and verify them.
2. For imitation learning, keep verified high-quality responses and optimize cross-entropy or distillation loss (Section 5.1, p. 8).
3. For preference learning, form chosen/rejected pairs from verifier rankings and optimize DPO, KTO, IPO, or related pairwise losses (Section 5.1, p. 8).
4. For reinforcement learning, turn verifier results into rewards and update the policy with PPO-like methods (Section 5.1, p. 8).
5. For verifier-guided inference, use scores to choose among search branches without changing parameters (Section 5.2, p. 9).
6. For verifier-aware inference, expose feedback during generation so the model can revise its answer; examples include execution-guided debugging and Self-Refine (Section 5.2, pp. 9–10).
7. Re-evaluate on held-out queries. Section 6.2.3 warns that feedback must improve novel queries without harmful over-generalization.

Verus form (inference)

Inference: Fine-tune or preference-train a code model on verified Rust/proof pairs, but retain the exact Verus output as the release gate. Inference: a useful online loop is generate → run `verus` → parse diagnostics → ask for a patch; a useful offline loop stores successful proofs and minimal counterexamples for training. Inference: never convert a failed proof into a positive example merely because a language model says it is plausible. A proof result is a program-based verifier signal; natural-language critique is auxiliary.

evidence and limits

The paper is a review, so its feedback examples inherit the cited methods' evidence. It gives no aggregate pass rate, model size, training budget, or denominator for the framework itself. Section 6.2.3 identifies noise robustness, model capacity, query generalization, and online/offline cost as open design factors. It also says that online feedback can use on-policy responses but requires frequent sampling, whereas offline data is cheaper to reuse but less data-efficient (Section 6.3, p. 12).

## scope, trust, and VL risk

Proved: nothing about a particular Verus program; the GC-MDP equations define an optimization abstraction, and the taxonomy organizes prior techniques. Measured: no new controlled result in this paper. Trusted: every underlying verifier, cited method, reward model, training procedure, and the chosen goal definition. Inference: for agent-written verified Rust, the threat is reward misspecification and verifier routing. A model may optimize an easy proxy, such as compiling without proving the intended postcondition, or a model-based critique may reward an invalid proof. VL should use this paper's loop structure but make the formal checker a hard boundary and log verifier provenance.

The paper warns that verifier combinations need instruction coverage, automatic routing, and a result-integration strategy when checks disagree (Section 6.2.2, pp. 11–12). Inference: these are already engineering requirements for VL, so VL should not redo a generic “search, verify, feedback” proposal. A useful product experiment would measure proof pass rate, repair time, timeout rate, and regression rate under a fixed Verus version and held-out tasks.

## techniques for the catalog

- goal-conditioned verifier loop: model post-training as search, verification, and feedback under explicit goals
- linear and tree proof search: sample one path or maintain multiple branches, using verifier results to rank them
- verifier taxonomy and routing: choose form, granularity, source, and training regime per task
- verifier composition: combine program checks and learned checks with explicit conflict rules
- training-based feedback: turn verified responses, preferences, or rewards into parameter updates
- inference-based feedback: use verifier-guided selection or interactive repair without changing model parameters

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
