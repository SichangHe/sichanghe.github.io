# HERMES: Towards Efficient and Verifiable Mathematical Reasoning in LLMs
(authored by agents unless marked 🧑)
Tag: `ospanov2025hermes`, [paper](http://arxiv.org/abs/2511.18760v2)

## system and trust boundary

Hermes is a modular agent that interleaves natural-language reasoning with Lean4 checks. Its abstract describes “intermediate formal checking to prevent reasoning drift and a memory module for proof continuity across multi-step reasoning chains” (Abstract, p. 1). The modules are a reasoning LLM, a formalizer translating an informal step into Lean, a prover attempting the formal goal or its negation, a memory database, and a feedback controller. The Lean4 REPL supplies proof-checking results; the agent returns a three-way verification status. Inference: Lean's kernel/compiler, mathlib declarations, and the supplied formal statement are the trusted semantic boundary; the LLM, autoformalizer, prover model, embedding retrieval, and feedback policy are search components. A successful check proves the formalized statement, not necessarily equivalence to the natural-language intention.

The paper evaluates MATH500, AIME'25, CollegeMath, and HARDMath2. For the main comparison, it states: “All Hermes accuracy reports are @1, i.e., the reasoning models were given only one attempt per problem.” Reward-model baselines select among five sampled traces unless stated otherwise; separate Hermes@5 results also appear in Table 1 (Section 5.1, pp. 5–6; Table 1, p. 6). For DeepSeek-V3.2, Hermes@1 versus CoT@1 accuracy is 98.4% versus 95.8% on MATH, 70.0% versus 50.0% on AIME, 83.3% versus 79.8% on CollegeMath, and 33.6% versus 25.6% on HARDMath2 (Table 1).

Table 4 reports CoT coverage of 87% (MATH) and 76% (AIME), and translation accuracy of 86% and 80%, respectively (Section 5.7, p. 9). The authors define coverage as the proportion of formalized steps for which the prover found a proof, and translation accuracy as human-judged semantic faithfulness. Their audit description says “we manually labeled 100 steps: 50 randomly selected successful attempts (Table 5) and 50 steps where the prover failed to find a proof (Table 6).” However, each dataset column in Tables 5 and 6 sums to 50. Inference: the audit description and topic counts leave the sampling denominators ambiguous; the 50/50 split should not be asserted as the denominator of every Table 4 metric.

## technique: intermediate formalization and counter-proof checking

what it is: turn a critical informal reasoning step into Lean code, compile the statement, back-translate it to natural language, and have the LLM judge semantic equivalence before asking a prover to prove it. The formalizer may try up to `Kf` candidates. The paper states: “First, the formalized statement must successfully compile in Lean.” (Section 4.1, p. 4.) The prover then attempts both the goal and `¬goal`; this can produce a proof, a counter-proof, or inconclusive failure (Section 4.2, p. 4).

steps:
1. pause the reasoning model at a critical step and include variables, domains, assumptions, and prior facts in the English tool call (Appendix A prompt, p. 15)
2. generate a Lean theorem statement with a `sorry` placeholder, retrying up to `Kf` (Section 4.1)
3. compile the statement; discard malformed code
4. back-formalize the Lean statement into English and compare it with the original step; forward only a statement the LLM judges equivalent; return verification failure if no candidate passes within the budget (Section 4.1; Appendix F, p. 22)
5. run prover attempts on the goal and its negation up to `Kp`; return proof succeeded, counter-proof found, or verification failed (Section 4.2)
6. feed the status to the reasoning model: revise on a counter-proof, continue a verified line, or treat failure as inconclusive and choose further exploration or self-verification (Section 4.4, pp. 4–5; Appendix A, p. 15)

Inference: a possible Verus adaptation would represent a critical Rust claim as an assertion or proof-function obligation with explicit assumptions and ask Verus to check it. A separately verified negated specification could serve as a counter-proof. Failure to verify must remain inconclusive. These are proposed mappings from the Lean design, not results evaluated in this paper.

evidence and limits: Table 3 varies `Kf` over 1, 4, 8 and `Kp` over 1, 4, 8, 16 on HARDMath2 with DeepSeek-V3.1 (p. 8). At `Kp=4`, increasing `Kf` from 1 to 4 changes accuracy from 16.6% to 30.3%. At `Kf=4`, increasing `Kp` from 1 to 4 changes accuracy from 23.7% to 30.3%. The paper selects `Kf=4`, `Kp=4` as a cost/accuracy balance (Sections 5.1 and 5.6). Inference: the 80–86% translation accuracy in Table 4 shows that compilation and back-translation do not establish semantic faithfulness for every step; a Verus adaptation would still need to check that the generated contract expresses the original requirement.

## technique: proof memory with similarity retrieval

what it is: store validated proof steps with embeddings, retrieve relevant steps, and insert them as preliminary hypotheses. The paper states: “Each proof step is stored alongside its vector representation to enable fast, similarity-based retrieval.” It describes this mechanism as maintaining continuity across branching reasoning paths (Section 4.3, p. 4). Experiments retrieve the top three recorded steps (Section 5.1, p. 5).

steps:
1. after a proof step is validated, store the step and its vector representation in a structured database (Section 4.3, p. 4; Appendix F, p. 22)
2. embed the currently evaluated step and retrieve the top-k memories by cosine similarity; experiments use top three (Appendix F, p. 22; Section 5.1, p. 5)
3. pass retrieved steps to the formalizer as preliminary hypotheses, preserving logical context across steps (Section 4.3)
4. continue formalization and verification with the augmented context; add the current step to memory only if its goal is proved (Appendix F)

Inference: a possible Verus adaptation would index verified `proof fn` lemmas and contract fragments by embeddings plus crate/module metadata; retrieve compatible lemmas and add them as explicit `requires` facts or `assert` calls. Check every use with Verus and prevent retrieval from silently importing an incompatible type or dependency version. The paper does not study Rust or Verus.

Evidence: removing the memory buffer lowers DeepSeek-V3.1 accuracy from 66.7% to 60.0% on AIME and from 97.4% to 97.0% on MATH when the prover is retained (Table 2, p. 8). Inference: this ablation supports a larger memory benefit on AIME than MATH for this setup; it does not isolate chain length as the cause. Retrieval quality and stale library assumptions would need testing in a Verus adaptation.

## technique: modular prover and parallel verification

what it is: separate autoformalization from proof search so either model can be replaced. The authors also state: “We also employ the verification scheduler, which parallelizes Lean code verification for faster inference.” (Section 4, p. 3.) Hermes's stated complexity is `O(N² + KTN²)` for `N` reasoning tokens, `T` checked steps, and `K` attempts (Theorem 4.1, p. 5). The experiment uses a 60-second Lean timeout, Goedel-Autoformalizer-8B, Goedel-Prover-V2-8B, Qwen3-Embedding-0.6B, and Lean v4.9.0 (Section 5.1, pp. 5–6).

Inference: a possible Verus adaptation would expose a verifier service that accepts isolated Rust candidates, runs Verus concurrently under a fixed timeout, and returns diagnostics plus a Boolean. Keep model, formalizer, and proof-search components replaceable; cache only results keyed by source, toolchain, dependencies, and specification. Parallelism changes throughput, not proof semantics.

## implications and limits for VL

Demonstrated in the paper: checker-in-the-loop intermediate validation, goal/negation prover attempts, proof-step memory, modular formalizer/prover interfaces, and ablations of memory and prover modules. Inference: VL should measure Verus-specific contract equivalence, retrieval contamination, compiler/SMT cost, and repair success on unseen crates rather than repeat Lean benchmark claims. Inference: the translation audit and memory ablation motivate checking requirement translation and context continuity in agent-written Rust. They do not measure a threat level for Verus. A proof of a generated contract would still leave open whether that contract captures the intended requirement.

## techniques for the catalog

- intermediate formalization — translate each critical informal step into Lean, compile it, and back-check semantic equivalence before proof search
- goal and counter-proof search — attempt both a formal goal and its negation and feed proof, counter-proof, or failure status back to the model
- verified proof memory — embed validated steps, retrieve top-k context, and reuse it as explicit hypotheses
- modular verifier pipeline — allow replacement of formalizer and prover models while retaining Lean checking and feedback
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We also measured the density of tool calls to understand how Hermes is utilized across different difficulty levels."): checked all paper text, quotations, numbers, page and section references, and technique steps; corrected page references, audit-denominator claims, sampling-budget comparisons, memory contents, feedback semantics, and unsupported Verus assertions; did not reproduce experiments, inspect implementation, or validate proposed Verus adaptations.
