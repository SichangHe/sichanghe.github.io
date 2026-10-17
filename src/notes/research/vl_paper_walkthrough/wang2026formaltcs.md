# FormalTCS: Benchmarking End-to-End Frontier Formal Theoretical Computer Science Research of Large Language Models
(authored by agents unless marked 🧑)
Tag: `wang2026formaltcs`, [paper](https://arxiv.org/abs/2608.20153)


## benchmark and formalization pipeline

FormalTCS is a benchmark of 143 instances from 143 STOC, FOCS, SODA, and COLT papers accepted in 2025–2026. Each instance contains a core claim, a natural-language theorem and proof sketch, a Lean theorem, and a complete Lean proof. The paper reports expert-validated proofs averaging 22.0 statements, 29.6 nodes, and 1888.1 proof lines (Section 2.1, p.2). It explicitly says: “every instance is accompanied by a rigorous Lean proof that has been manually verified by experts.” (Section 2.2, p.3)

The annotation pipeline (Section 3, Figure 2) has seven steps. Five human experts take part, with GPT-5.6-SOL through Codex as an assistant (Section 3).

1. Automated scripts scan accepted papers; human experts inspect candidates for TCS relevance, a central result, and a rigorous proof; the source LaTeX is downloaded from arXiv (Section 3.1, pp.3–4).
2. Two experts independently write a core claim in fewer than 36 words, avoiding unnecessary mathematical notation; a third expert compares the two and selects the stronger formulation (Section 3.2, p.4).
3. Experts collect definitions needed by the selected theorem and rewrite its conclusion into a self-contained natural-language theorem (Section 3.3, pp.4–5). The paper deliberately does not supply standard domain notions that the source paper leaves undefined, such as the multivariate theta transform or the matrix Chernoff bound.
4. An LLM drafts a proof-blueprint directed acyclic graph (DAG) from the source paper. Human experts check each node's statement and its correspondence to the original proof (Section 3.4, p.5).
5. The LLM proves DAG nodes in dependency order. After each node, a human checks rigor, faithfulness, and absence of proof bypasses such as `sorry` or extra axioms; a second expert independently reviews the completed proof (Section 3.4, p.5).
6. From the verified proof, the formal theorem is extracted together with the definitions needed to state it, and the proof body is replaced with `sorry`; this is the proof-generation task (Section 3.4, p.5).
7. A natural-language proof sketch is drafted from the verified formal proof and source paper, then a human checks it for faithfulness and completeness and removes low-level detail (Section 3.5, p.5). Appendix E (Table 22) reports that experts substantively modified 24% of LLM-drafted blueprints, 31% of formal theorems, 15% of formal proofs and 13% of natural-language proofs.

Inference: For Verus, the same pipeline would select a Rust/Verus theorem, decompose it into a dependency DAG of lemmas, have a model draft `requires`/`ensures` and proof functions, and require human review of each node before accepting the final verified crate. Lean syntax, Mathlib definitions, and `sorry` checks do not carry over; Verus's accepted constructs must be used instead. Inference: the crucial transferable artifact is the dependency-ordered blueprint with a separately audited specification, not the particular assistant.

## technique 1: stage-wise evaluation with independent inputs

FormalTCS separates four tasks: theorem elicitation (CC2NT), autoformalization (NT2FT), proof elicitation (T2NP), and theorem proving (FT2FP). “To evaluate each stage independently, we provide human-annotated inputs for every task rather than using predictions from the preceding stage as inputs.” (Section 4.1, p.6) This prevents early errors from contaminating later measurements.

The metrics are matched to task type. CC2NT and T2NP use a rubric with logical validity, completeness, correctness, and clarity weighted 0.4, 0.3, 0.2, and 0.1. NT2FT uses BEq+, which accepts a candidate only after Lean proves both reference ⇒ candidate and candidate ⇒ reference. FT2FP uses Pass@k: an instance passes if at least one of k sampled proofs compiles. For NT2FT and FT2FP the paper samples 8 outputs per instance; CC2NT and T2NP use one deterministic generation (Section 4.1, p.6). The environment enables `warningAsError` and an axiom whitelist via a custom linter or `#print axioms`, ruling out `sorry` and custom axioms (Section 4.1, p.6).

The strongest model, Claude Opus-5, scores 66.9 on CC2NT, 11.2 on NT2FT, 68.7 on T2NP, and 28.7 Pass@8 on FT2FP (Table 4, p.7). GPT-5.6-SOL scores 67.4, 10.5, 67.9, and 26.6 respectively, so it beats Claude Opus-5 on CC2NT; the paper says Opus-5 is best "on most tasks" (Section 4.2, p.6). The paper's Finding 3 reads: “Autoformalization is the Primary Bottleneck for LLM-Based TCS Research.” (Finding 3, Section 4.2, p.7). Inference: the scores come from different metrics (BEq+, Pass@8, an LLM rubric), so the comparison of 11.2 with 28.7 is suggestive, not like for like.

Inference: In Verus evaluation, use independently supplied human contracts for each stage, and mechanically compile and verify generated proof functions. A bidirectional equivalence check can be approximated by proving each contract implies the other when the specifications are expressible, but this is an inference and not a Verus feature claimed by the paper.

## technique 2: compiler-guided end-to-end research loop

The paper builds a planner–formalizer–judger loop for generating candidate research claims. The planner proposes or revises objectives, definitions, assumptions, and proof directions. The formalizer translates each objective to Lean and may query the compiler for at most three rounds; uncompiled claims are discarded and failure information returns to the planner. The judger translates compiling statements back to a concise natural-language claim and filters claims judged insufficiently novel. Human experts then remove claims already known and independently assess novelty and value before final theorem and proof verification (Section 5.1, p.8).

How to apply it: seed the workspace with benchmark examples; let the planner propose one claim; run at most three compiler-feedback repairs; have a judge summarize and filter; send survivors to two human experts; and run the stage-wise theorem/proof pipeline. Each run samples 16 FormalTCS instances, uses temperature 0.6 and top-p 0.9, and generates one claim (Section 5.1.1, p.8).

Evidence: 64 claims were generated; 39 failed novelty, 17 failed value, and 8 remained after human review. Of those 8, 6 had proofs and 2 had no proof, so 6 survived all stages (Figure 4 and Section 5.2, p.9). The denominator is 64 generated cases, then 8 human-approved cases.

Inference: A Verus loop can use `cargo verus` diagnostics as compiler feedback, with a formalizer editing contracts and proof functions and a judge checking whether a candidate property matters to the product. Compilation proves only the encoded statement; human review remains necessary for novelty, scope, and whether the statement matches the intended system behavior.

## what is proved, measured, and trusted

The paper's verified artifacts are Lean proofs checked with Lean 4.32.2 and the matching Mathlib (Section 2.1, p.2), with human checks of semantic faithfulness and absence of `sorry` and extra axioms (Section 3.4, p.5). Measurements are task scores and pass rates, not proofs about LLM research ability. Inference: trusted elements include source-paper selection, human annotations, expert review, Lean and Mathlib, the rubric evaluator, and the novelty/value judgments. The rubric evaluator is Qwen3.8-Max; on 16 sampled instances it scored 3.17% to 6.57% (CC2NT) and 6.77% to 10.67% (T2NP) above human experts, with the same model ranking (Appendix F, p.20). The black-box contamination audit reports aggregate completion similarity below 9.6% for both GPT-5.6-SOL and Claude Opus-5, measured by ROUGE-L/LCS lexical similarity (Section 3.1, p.4; Appendix G, p.21). The paper itself treats it as "evidence of relatively low contamination risk rather than proof of non-exposure" (Appendix G, p.22).

Inference: for agent-written verified Rust, the risk is high in specification translation and research-claim selection: FormalTCS's best autoformalization score of 11.2 suggests that producing a compiling proof does not solve the modeling problem. The blueprint, independent stage tests, bidirectional statement checking, and axiom whitelist look directly useful as controls for VL. What VL should not redo is a benchmark that measures Lean-specific proof syntax without mapping to Verus's contracts and executable Rust semantics.

## techniques for the catalog

- expert-audited theorem pipeline: derive self-contained statements, dependency DAGs, and proofs from research papers with independent human checks
- independent stage evaluation: measure claim, formalization, proof sketch, and proof generation separately with task-specific metrics
- compiler-guided research loop: iterate planner, formalizer, and judge with bounded compiler feedback before expert filtering
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The explanation is that these claims are generated by the LLMs themselves, making it easier for the LLMs to construct proofs for claims that align with their own reasoning trajectories."): read the whole paper including appendices; checked every quotation, number, section and page reference, the seven annotation steps, metrics, generation settings, the agent-loop description and the 64/39/17/8/6/2 counts; changed page references (Table 4 is on p.7, Section 5.1 is on p.8, Section 3.1 spans pp.3–4), removed the unsupported claim that scores are over 143 instances and the unsupported "reproducible" claim, added the CC2NT exception (GPT-5.6-SOL scores higher), the sampling settings, Appendix E/F/G details, the link (from the paper's arXiv id) and Inference labels; did not check the cited external works, the Lean artifacts or the GitHub repository, and the Verus transfer sections are my inference, not the paper's.
