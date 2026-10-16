# LogicTrack: Auditing Reasoning Trajectories of Large Language Models with Formal Logic Solvers
(authored by agents unless marked 🧑)
Tag: `hu2026logictrack`, [paper](https://doi.org/10.48550/arxiv.2609.21492)

## scope and result

LogicTrack is a generation-time checker for natural-language chain-of-thought. It asks a reasoning model for one structured step, translates that step to SMT-LIB, checks the translation with Z3, scores premise fidelity and logical validity, and either appends the step or regenerates from the first failed position. The paper's abstract states: “LogicTrack introduces Solver-Based Backtracking Reward (SBR), a step-wise scoring mechanism that quantifies logical soundness and guides backtracking tree search at inference time.” (Abstract, p. 1) The paper evaluates eight benchmarks and seven models; its reported overall table averages each model over those eight benchmarks, while benchmark tables report individual dataset/model percentages.

## technique 1: decompose and auto-formalize every step

What it is. A response step is represented as context `C_i`, explanation `E_i`, and conclusion `q_i`; context consists of input premises and earlier verified conclusions, while explanation records unstated bridges such as “a father is a parent.” The paper says: “With both C_i and E_i stated explicitly, the conclusion q_i should follow by logical entailment alone.” (§2.1, p. 3) The formalizer maps `(C_i,E_i,q_i)` to `F_i=(Φ_i,q_i)`, where `Φ_i` is a conjunction of assertions. Verification asks whether `Φ_i |= q_i`.

When to use it. Use this decomposition when a generated proof mixes facts, assumptions, and a claimed result, so that each claim can be independently checked. It is especially useful when later steps must not consume an unsupported earlier claim.

How to apply it.

1. Prompt the generator to output the three fields for each step: premises/context, explanation, and derived fact (§2.1, p. 3).
2. Set `C_i` to a subset of original premises and the previously verified knowledge base `K_{i-1}`; exclude the query itself (§2.1, p. 3).
3. Have a formalization model emit executable SMT-LIB assertions for `C_i ∪ E_i` and a goal for `q_i` (§2.1, p. 3).
4. Reject malformed SMT-LIB and retry formalization up to `M` times (§2.1, p. 3).
5. Check entailment by asking whether `Φ_i ∪ {¬q_i}` is unsatisfiable; retain diagnostics for contradiction and undecidability (§2.1, p. 3).

The prompt template makes the operational contract concrete: “Each step in the response stage must follow the format below, which contains three sections: Premises, Assumptions, and Derived Fact.” (Appendix D, p. 15) Its answer extractor looks first for boxed output and then for tags or answer-declaration phrases (Appendix D, p. 15); this is an implementation detail, not a proof of correctness.

Verus form (Inference). Represent each accepted claim as a predicate over a state or sequence. Use `requires` for available context and `ensures` for the derived fact; use `assert` or a short `proof fn` to establish intermediate facts. A generated proof step can be accepted only when `verus` verifies it. The SMT-LIB translation and the LLM explanation do not carry over: Verus checks Rust/specification syntax directly, and an explanation must become a Rust assertion or proof body. A possible shape is `fn advance(s: State) -> (t: State) requires pre(s) ensures post(s,t) { ... }`, with a separate `proof fn` for arithmetic or sequence facts.

Evidence and limits. LogicTrack's solver backend was Z3 and its autoformalizer and fidelity judge were GPT-4o-mini (Appendix B.2, p. 11). Thus the solver check is deterministic only after a probabilistic translation and probabilistic consistency judge. The paper assigns undecidable steps partial credit rather than treating them as false (§2.2, p. 4), so “verified” can mean accepted with a discount in the search score. Inference: a Verus proof that compiles has a stronger kernel-facing check than a natural-language step whose formalization was judged faithful by another model, but it still proves only the supplied specification.

## technique 2: solver-based backtracking reward and search

What it is. SBR combines binary fidelity and verification rewards: `SBR(s_i)=λ R_fidelity(Φ_i;P)+(1−λ)R_verify(F_i)`. Fidelity checks that assertions are grounded in original premises, do not source from the query, use acceptable commonsense, and are jointly satisfiable. Verification is 1 for syntactically valid and entailed steps, 0 for malformed/refuted steps, and `α∈(0,1)` for undecided steps (§2.2, p. 4). The paper states: “When SBR of a step falls below a predefined threshold, the model triggers a backtrack and regenerates the reasoning from that step onward.” (§2, p. 2)

When to use it. Use SBR when logical validity and grounding are separate failure modes. A model may derive a valid-looking claim from an invented premise; fidelity catches that, while the solver reward catches a malformed or non-entailed formula.

How to apply it.

1. Start with an empty verified prefix and generate a candidate `s_t` conditioned on the original problem and prefix (§2.2, p. 4).
2. Compute `SBR(s_t)` and the running mean `SBR(t)=1/t Σ_i SBR(s_i)` (§2.2, p. 4).
3. Forward the candidate only if both the step and running mean clear `θ_step` and `θ_avg`; append its conclusion to `K_t` (§2.2, p. 4).
4. On failure, preserve the prefix through `t−1`, attach audit-log feedback, and regenerate from position `t` (§2.2, p. 4).
5. Repeat until a complete viable chain is found. In the default experiment, `θ_step=0.8`, `θ_avg=0.5`, there are two regeneration attempts per position, and the highest-SBR candidate is force-forwarded if both fail (Appendix A.1, p. 10).

The paper compares greedy backtracking with beam and MCTS. Beam expands up to two branches per frontier path, prunes nodes below 0.75, and keeps the top `B` path-average-SBR survivors; MCTS uses UCB selection, up to two completions at expansion, SBR-zero/complete/depth terminal tests, rollout, and path-average backpropagation (Appendix A.1, p. 10).

Evidence. On eight benchmarks and seven models, Table 4 reports model-average OA, VU, VWA, and UR. For GPT-4o-mini, BASE to LogicTrack OA is 0.7068 to 0.7849, VU 0.2151 to 0.4661, VWA 0.4578 to 0.6436, and UR 0.3727 to 0.1898 (Table 4, p. 9; denominator is all examples in the eight-benchmark average). For Llama-3.1-8B, the corresponding values are OA 0.5506 to 0.5681, VU 0.0924 to 0.3275, VWA 0.3212 to 0.4717, and UR 0.4171 to 0.1871. Table 2a's SARA ablation reports GPT-4o-mini SBR VWA 65.90 versus BASE and absolute ΔVWA 25.4, OA 73.16 with ΔOA 12.9, UR 10.81; the table is a SARA/model comparison, not an all-benchmark denominator (§3.3, p. 7). Greedy search beat beam and MCTS on GPT-4o-mini SARA VWA (65.90 versus 54.87 and 53.06) and UR (10.81 versus 23.79 and 26.84), while MCTS had higher OA than beam (72.06 versus 69.12) (Table 2b, p. 7).

## technique 3: backtracking traces as supervised fine-tuning

What it is. LogicTrack turns verified search traces into training examples. The positive path is `s+`; rejected steps are `s−`. A trajectory inserts a backtrack token between the rejected step and the corrected continuation. The paper gives the exact construction: “{s+_1 · · · s+_{k−1} s−_k <backtrack> s+_k · · · s+_n}.” (§2.3, p. 4) It trains with autoregressive negative log likelihood and adds `<backtrack>` to the vocabulary.

How to apply it.

1. Keep only traces with a correct final answer and steps passing syntactic and semantic verification (Appendix A.2, p. 10).
2. Extract the verified path and rejected steps; retain rejected steps only when their prefix matches the verified path through `k−1` (Appendix A.2, p. 10).
3. Build single-correction, multiple-correction, and clean-correct trajectory types (Appendix A.2, p. 10).
4. Add `<backtrack>` as a vocabulary item and train the model to emit it before the corrected path (§2.3, p. 4).
5. Fine-tune for two epochs with LoRA rank 32, scaling 64, learning rate `3×10^-5`, warmup ratio 0.05, gradient clipping 0.3, effective batch size 16, and about 6,000 samples (Appendix A.2, p. 10).

Verus form (Inference). The analogous dataset contains Rust proof attempts, the failing `verus` diagnostic, a `<backtrack>` marker, and a compiling corrected proof. The marker can be ordinary training text; it is not a Verus keyword. The corrected code still needs `requires`, `ensures`, `invariant`, `assert`, and proof functions that compile. Inference: training on compiler-accepted repairs may teach repair patterns, but it cannot replace compiling the final product because the paper's SFT model no longer has an external solver during inference.

Evidence and what remains trusted. Figure 4 and Table 4 show SFT can raise OA: on Llama-8B, inference-time LogicTrack OA 56.81% becomes 68.08% after LogicTrack-SFT (Figure 4a, p. 8); on Mistral-7B, 52.75% becomes 63.11%; on Qwen-7B, 70.60% becomes 71.16%. Figure 4b reports SFT VWA increases over base from 32.12% to 39.24% (Llama), 31.86% to 34.62% (Mistral), and 35.07% to 38.46% (Qwen) (p. 8). Table 6's Llama-3.1-8B comparison reports LogicReward/LogicTrack/LogicTrack-SFT OA averaged per dataset; for ESNLI they are 0.0155/0.2171/0.6047, while VWA is 0.0052/0.1907/0.3366 and UR is 0.2605/0.1118/0.4012 (Table 6, p. 13). The last UR increase shows that higher answer accuracy does not imply more verified steps.

The paper's trusted components include the autoformalizer, fidelity judge, prompt, Z3, benchmark labels, and the specification that defines acceptable commonsense. It does not prove that the natural-language decomposition preserves intended meaning.

## techniques for the catalog

- step decomposition and autoformalization: split each generated step into context, explanation, and conclusion, encode it as SMT-LIB, and check entailment by unsatisfiability
- solver-based backtracking reward: combine premise fidelity and solver validity, accept only above step and running-average thresholds, and regenerate at the first failure
- verified-prefix search: preserve the verified prefix while using greedy, beam, or MCTS exploration over candidate continuations
- backtracking SFT: train on verified paths with rejected steps followed by `<backtrack>` and corrected continuations
