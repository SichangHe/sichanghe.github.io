# FormalProofBench: Can Models Write Graduate Level Math Proofs That Are Formally Verified?
(authored by agents unless marked 🧑)
Tag: `ravi2026formalproofbench`, [paper](https://doi.org/10.48550/arxiv.2603.26996)

FormalProofBench tests whether a model can produce a Lean 4 proof for advanced undergraduate and graduate mathematics when given both the informal problem and its formal statement. Each submission is accepted only if it passes the Lean kernel. The benchmark has 200 private problems across analysis, probability, algebra, algebraic geometry, number theory, and logic (Sections 1 and 3, PDF pp. 2–4). The paper states: “Unlike informal mathematics benchmarks, FormalProofBench provides a binary and fully automated correctness signal: a proof either compiles or it does not.” (Section 1, p. 2)

## curate and quality-check formal tasks

What it is and when to use it. Six experienced Lean formalizers select problems beyond Olympiad level, formalizable with current Mathlib, challenging for late-2025 models, and diverse in domain (Section 3.1, p. 3). A second reviewer checks the informal statement, natural-language proof, and formal statement through ordinary code review. Use this process when building a product evaluation set: the kernel can check a proof of the wrong theorem, so statement fidelity needs a separate review.

How to do it. (1) Select a source problem meeting the four criteria. (2) Write its Lean4 statement with required imports and context. (3) Have another experienced Lean user review the source mathematics and formal statement. (4) Revise misformalizations or omitted side conditions. (5) Keep only problems whose intended proof is possible in the current Mathlib. The paper notes: “In other words, it is not guaranteed whether the formal statement faithfully expresses the intent of the informal statement.” (Section 3.1, p. 4)

Inference: For Verus, review the natural-language requirement and the Rust function contract separately, including ownership, error, and concurrency assumptions. A reviewer must check that `requires` and `ensures` encode the requirement before accepting a proof. This is process guidance, not a Verus theorem.

Evidence and limits. The benchmark distribution is 56 real-analysis, 34 probability/stochastic-analysis, 26 functional-analysis, 23 number-theory, 21 logic/model-theory, 18 algebra, 15 algebraic-geometry, and 7 linear-algebra problems (Table 1, p. 4; denominator 200). The private set improves contamination resistance but prevents independent reproduction of individual tasks.

## agentic Lean proof loop

What it is and when to use it. The evaluation harness gives each model the natural-language problem, Lean formalization, headers, and two tools: `lean_loogle` for Mathlib search and `lean_run_code` for compiling code and returning errors, goals, warnings, and missing definitions. The model has up to 40 turns per problem; it submits a final proof with `submit_proof`, beginning with `by` (Section 4, p. 5).

How to do it. (1) Read both the informal and formal statements, paying attention to formal nuances. (2) Search Mathlib for relevant definitions and lemmas with `lean_loogle`. (3) Write a candidate proof. (4) Run it with `lean_run_code` and inspect type mismatches, unsolved goals, syntax errors, or warnings. (5) Iterate within the 40-turn budget. (6) Call `submit_proof`; accept only when Lean v4.25.2 and Mathlib commit `c98ae54af00eaefe79c51b2b278361ca94e59bfb` compile it. The harness rejects `axiom` and `local_instance` attempts (Section 4, p. 5).

The paper's system prompt explicitly says: “You will have access to a set of tools to help you prove the theorem.” (Figure 2, p. 6) The tool-use analysis says stronger models tend to execute code early, then search when a gap remains (Section 5.1, p. 7).

Inference: In Verus, provide a verifier invocation tool that returns diagnostics, and let the agent iterate on contracts, assertions, loop invariants, and lemmas. Keep final submission separate from exploratory proof functions and reject unsupported escape hatches. Verus syntax and supported Rust differ from Lean; the loop shape transfers, not the tactics.

Evidence and limits. The “valid” label is deterministic for the exact toolchain, but it proves only the supplied Lean statement. Search and execution behavior is observational; the paper does not prove that early execution causes success.

## tool-use scheduling

The authors observe a positive but modest relationship between the number of code-execution calls and accuracy (Figure 5, p. 8). Repeated search can be counterproductive: “models sometimes spiral into repeated lean_loogle tool calls while attempting to find non-existent lemmas.” (Section 5.1, p. 7) The practical method is to execute a small candidate early, use the error to constrain the next search, and then rerun the corrected code. This is a heuristic derived from aggregate correlations; it has no reported causal intervention.

Inference: A VL agent should similarly run Verus after a small contract or proof fragment, use the exact diagnostic to guide lemma search, and avoid unbounded documentation search. Measure success against a fixed turn, wall-clock, and token budget so tool scheduling is comparable.

## benchmark results and what they establish

Claude Opus 4.5 (Thinking) ranks first at 33.50% accuracy, cost $1.34 per test, and 4,036.78 seconds per test across 200 problems (Table 2, p. 7). Gemini 3 Pro obtains 18.50% at $1.26 and 9,966.43 seconds; GPT-5 obtains 17.00% at $0.89 and 5,017.28 seconds. The denominator for every accuracy is 200 tasks. The paper reports that average evaluation can take minutes to hours and costs range from about ten cents to over a dollar (Section 5.2, p. 8).

The result measures end-to-end agent success under the given tools and 40-turn cap. It does not measure correctness of informal reasoning independent of formalization, nor does it show that one model is universally better outside this benchmark. The private task set and provider-default sampling settings limit direct replication (Sections 3.1–3.2, pp. 4–5).

## what is proved, trusted, and risky for VL

The Lean kernel proves accepted proof terms for the 200 formal statements. The benchmark trusts the formalizers' translations, secondary review, Lean kernel and Mathlib, tool implementations, model-provider outputs, and the decision to reject `axiom`/`local_instance`. It does not prove that the informal problem and Lean statement have identical intent; the authors explicitly identify misformalization as a known problem (Section 3.1, p. 4).

Inference: The threat to agent-written verified Rust is concentrated at requirement translation and trusted library contracts. Passing Verus proves the selected specification, while a wrong or incomplete specification can pass. VL should reuse the benchmark's deterministic kernel gate, iterative compiler feedback, private contamination-resistant evaluations, and explicit cost/latency accounting. It still needs Rust-specific review of unsafe boundaries, external dependencies, and concurrency models.

## techniques for the catalog

- dual informal/formal task curation: select advanced problems and have an independent Lean expert review statement fidelity
- bounded agentic proof loop: combine theorem search, code execution, diagnostic feedback, and a fixed 40-turn submission budget
- kernel-only acceptance: accept a proof only when the exact Lean kernel compiles it and reject escape-hatch declarations
- execution-guided search: run candidate code early and use concrete diagnostics to focus subsequent lemma searches
- contamination-resistant private benchmark: keep formalizations private while reporting deterministic kernel-checked accuracy, cost, and latency
Checked 2026-10-15 against paper ravi2026formalproofbench: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
