# HERMES: Towards Efficient and Verifiable Mathematical Reasoning in LLMs
(authored by agents unless marked 🧑)
Tag: `ospanov2025hermes`, [paper](http://arxiv.org/abs/2511.18760v2)

## system and trust boundary

Hermes is a modular agent that interleaves natural-language reasoning with Lean4 checks. Its abstract describes “intermediate formal checking to prevent reasoning drift and a memory module for proof continuity across multi-step reasoning chains” (Abstract, p. 1). The modules are a reasoning LLM, a formalizer translating an informal step into Lean, a prover attempting the formal goal or its negation, a memory database, and a feedback controller. The Lean4 REPL/compiler supplies a Boolean or three-way verification signal. Inference: Lean's kernel/compiler, mathlib declarations, and the supplied formal statement are the trusted semantic boundary; the LLM, autoformalizer, prover model, embedding retrieval, and feedback policy are search components. A successful check proves the formalized statement, not necessarily equivalence to the natural-language intention.

The paper evaluates MATH500, AIME'25, CollegeMath, and HardMath2. Hermes reports @1 accuracy, meaning one attempt per problem; reward-model baselines use five sampled traces unless stated otherwise (Section 5.1, p. 6). With DeepSeek-V3.2, the paper reports that Hermes improves average accuracy over zero-shot CoT and reward baselines, while the exact per-benchmark percentages are in Table 1 (p. 7). The 100-step human audit reports CoT coverage 87% (MATH) and 76% (AIME), and translation accuracy 86% and 80%, respectively (Table 4, p. 8); these denominators are 50 successful and 50 failed sampled steps per the audit protocol, not all benchmark steps.

## technique: intermediate formalization and counter-proof checking

what it is: turn a critical informal reasoning step into Lean code, compile the statement, back-translate it to natural language, and have the LLM judge semantic equivalence before asking a prover to prove it. The formalizer may try up to `Kf` candidates. The paper states: “First, the formalized statement must successfully compile in Lean.” (Section 4.1, p. 4.) The prover then attempts both the goal and `¬goal`; this can produce a proof, a counter-proof, or inconclusive failure (Section 4.2, p. 4).

steps:
1. pause the reasoning model at a critical step and include variables, domains, assumptions, and prior facts in the English tool call (Appendix A prompt, p. 15)
2. generate a Lean theorem statement with a `sorry` placeholder, retrying up to `Kf` (Section 4.1)
3. compile the statement; discard malformed code
4. back-formalize the Lean statement into English and compare it with the original step; forward only an equivalent statement (Section 4.1)
5. run prover attempts on the goal and its negation up to `Kp`; return proof succeeded, counter-proof found, or verification failed (Section 4.2)
6. feed the status to the reasoning model: revise on a counter-proof, continue a verified line, or try an alternative after failure (Section 4.4, p. 5)

Verus form (Inference): represent a critical Rust claim as a candidate `assert` or `proof fn` statement with explicit `requires` context, run Verus, and reject candidates that do not verify. A counter-proof analogue can be a Verus failure or a separately checked negated specification where the model supports it; Verus does not generally provide Lean's automatic proof-of-negation workflow. `ensures` belongs on executable functions, while `spec fn` defines mathematical values and is not a runtime proof call. These are mappings inferred from the paper's Lean design.

evidence and limits: Table 3 varies `Kf` 1, 4, 8 and `Kp` 1, 4, 8, 16 on HARDMath2 with DeepSeek-V3.1. Increasing `Kf` from 1 to 4 gives an 82.2% relative accuracy boost in that experiment; increasing `Kp` to 4 gives a 22.3% boost (Table 3, p. 8). The paper selects `Kf=4`, `Kp=4` as a cost/accuracy balance. Translation can be semantically wrong despite compiling; the 80–86% audit accuracy demonstrates residual failure. Inference: a Verus product must preserve the original requirement and review the generated contract rather than treating compilation as semantic equivalence.

## technique: proof memory with similarity retrieval

what it is: store every validated Lean proof step with an embedding, retrieve the top three similar steps for the next step, and insert them as preliminary hypotheses. The paper says the memory block uses “embedding-based top-k retrieval of” validated context (Section 4.1–4.3, pp. 4–5). Retrieval maintains continuity across branching chains and reduces repeated rediscovery.

steps:
1. after a proof step is validated, store its formal statement and vector representation in a structured database (Section 4.3, p. 5)
2. embed the currently evaluated step and retrieve the top-k memories; experiments use top three (Section 5.1, p. 6)
3. pass retrieved steps to the formalizer as preliminary hypotheses, preserving logical context across steps (Section 4.3)
4. continue formalization and verification with the augmented context; discard unverified steps from memory

Verus form (Inference): index verified `proof fn` lemmas and contract fragments by embeddings plus crate/module metadata; retrieve compatible lemmas and add them as explicit `requires` facts or `assert` calls. Check every use with Verus and prevent retrieval from silently importing an incompatible type or dependency version. The paper does not study Rust or Verus.

Evidence: removing the memory buffer lowers DeepSeek-V3.1 accuracy from 66.7% to 60.0% on AIME and from 97.4% to 97.0% on MATH when the prover is retained (Table 2, p. 8). These denominators are the benchmark problem sets used by the authors; the table reports percentages only. Inference: memory helps longer, harder chains more than short arithmetic ones, but retrieval quality and stale library assumptions are failure modes.

## technique: modular prover and parallel verification

what it is: separate autoformalization from proof search so either model can be replaced, and use Lean's verification scheduler to run independent attempts in parallel. Hermes's stated complexity is `O(N² + KTN²)` for `N` reasoning tokens, `T` checked steps, and `K` attempts (Theorem 4.1, p. 5). The experiment uses a 60-second Lean timeout, Goedel-Autoformalizer-8B, Goedel-Prover-V2-8B, Qwen3-Embedding-0.6B, and Lean v4.9.0 (Section 5.1, p. 6).

Verus form (Inference): expose a verifier service that accepts isolated Rust candidates, runs Verus concurrently under a fixed timeout, and returns diagnostics plus a Boolean. Keep model, formalizer, and proof-search components replaceable; cache only results keyed by source, toolchain, dependencies, and specification. Parallelism changes throughput, not proof semantics.

## implications and limits for VL

Already done: checker-in-the-loop intermediate validation, goal/negation prover attempts, proof-step memory, modular formalizer/prover interfaces, and ablations of memory and prover modules. Inference: VL should measure Verus-specific contract equivalence, retrieval contamination, compiler/SMT cost, and repair success on unseen crates rather than repeat Lean benchmark claims. Inference: threat to agent-written verified Rust is high for requirement translation and context continuity but lower for the final checked obligation. A passing Verus proof can still satisfy an incomplete or vacuous contract, and external libraries remain assumptions.

## techniques for the catalog

- intermediate formalization — translate each critical informal step into Lean, compile it, and back-check semantic equivalence before proof search
- goal and counter-proof search — attempt both a formal goal and its negation and feed proof, counter-proof, or failure status back to the model
- verified proof memory — embed validated steps, retrieve top-k context, and reuse it as explicit hypotheses
- modular verifier pipeline — keep formalizer, prover, checker, scheduler, and feedback modules replaceable while retaining checker acceptance
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
