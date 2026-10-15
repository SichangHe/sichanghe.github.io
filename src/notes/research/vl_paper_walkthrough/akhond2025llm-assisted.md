# LLM Assisted Coding with Metamorphic Specification Mutation Agent
(authored by agents unless marked 🧑)
Tag: `akhond2025llm-assisted`, [paper](https://www.semanticscholar.org/paper/b4c38f63b98db7ff2f8d7a156f1303b4b6ae25ab)

## scope and result

The paper introduces CodeMetaAgent (CMA), a four-module agent that uses metamorphic relations (MRs) to rewrite task descriptions and tests before LLM generation. “Our proposed framework uses MRs with LLMs to improve generation consistency and reduce variability caused by specifications, unlike the traditional use of MRs as post validations.” (Abstract, p. 1). The four modules are Mutator, Reviewer, Generator, and Evaluator (Section 3, p. 4). The experiments cover HumanEval-Pro, MBPP-Pro, and SWE-Bench-Lite with GPT-4o, Mistral Large, GPT-OSS, and Qwen3-Coder (Sections 5–6, pp. 9–18).

Inference: CMA is a specification and test diversification loop, not a formal verifier. Its evaluator runs oracle tests and coverage.py, so it can supply candidate evidence for a Verus workflow but cannot prove a Rust contract or rule out untested behavior.

## technique 1: MR-driven specification mutation for code and patch generation

What it is. CMA turns a task description into multiple semantically equivalent variants. “Instead of using a single static prompt, CMA uses metamorphic relations as a semantic operator that creates and evaluates mutations.” (Introduction, p. 2). The four description MRs are negation (MR1), translation (MR2), redefining in steps (MR3), and paraphrasing (MR4) (Section 4, p. 9).

How to do it. (1) Give the Mutator the original description `d`. (2) Apply MR1–MR4 to produce `{d1, d2, …, dm}`; the paper says these are “semantically equivalent variants.” (Section 3.1, p. 6). (3) Send variants to the Reviewer. (4) For each variant, compute BERT semantic similarity to the original; reject or regenerate any score below 0.8. (Section 3.2, p. 6). (5) Regenerate invalid variants for at most three iterations (Section 3.1, p. 6). (6) Prompt the Generator independently with each validated variant and with the original baseline. (Section 3.3, p. 7). (7) Run outputs through the same oracle tests and compare cross-variant behavior in the Evaluator (Section 3.4, p. 7).

The paper’s concrete example changes a vague list-filtering task into an explicit requirement to return a set of unique elements (Figure 4, p. 5). A second example changes “sum of the first 10 octagonal numbers” into six numbered steps, including checking numbers below one and aggregating the fixed ten values (Listings 1–2, p. 12).

Verus form. Inference: generate several candidate Rust/Verus specifications, but make the Reviewer check semantic equivalence against a canonical `spec fn` contract. Use `requires` and `ensures` for the canonical behavior, and reject a mutation unless it is proved equivalent by a `proof fn`. The LLM-generated implementation remains executable Rust; the final acceptance condition should be `verus!` proof success, with CMA tests as additional evidence. Inference: negation and translation can change meaning, so they require proof of equivalence rather than a similarity threshold.

Evidence and limits. Table 3 reports Pass@1 and Pass@5 percentages by model and dataset. GPT-OSS rises from 60% to 69% Pass@1 on HumanEval-Pro and from 53% to 70% on MBPP-Pro; Mistral rises from 68% to 85% and from 60% to 66%, respectively (Table 3, p. 12). SWE-Bench-Lite has 300 issues: baseline GPT-OSS generated 225 patches and resolved 69 (23%); CMA generated 233 patches and resolved 90 (30.3%) (Section 6.1.4, p. 13). Inference: the paper reports absolute percentages, but does not give confidence intervals, repeated-run variance, or per-task denominators for every Pass@1/Pass@5 cell, so the gains are empirical signals rather than formal guarantees.

## technique 2: MR-guided test-case augmentation

What it is. CMA transforms oracle tests into structurally varied tests using variable swapping (MR5), input permutation (MR6), algebraic/distributive transformation (MR7), domain-specific subset (MR8), and incremental data transformation (MR9) (Section 4, p. 9). “For test case generation, the relations encode expected behavioral properties over input–output transformations.” (Introduction, p. 2)

How to do it. (1) Start with the benchmark’s oracle tests. (2) Mutate each test into variants using MR5–MR9. (3) Execute each variant against the oracle implementation; the Reviewer filters variants whose outputs are inconsistent. (Section 3.2, p. 6). (4) Give validated tests to the Evaluator. (5) Run coverage.py and compare branch coverage with the original suite (Section 3.4, p. 7). The paper’s palindrome example starts with four tests at 85% branch coverage and produces 15 deduplicated variants at 97% coverage (Section 3.1, p. 6; Listings 5–7, p. 15).

Verus form. Inference: encode each MR as a `spec fn` over input and expected output, then prove that transformed inputs preserve the function’s contract. Use `proof fn`s for algebraic identities and permutation invariance; use executable tests only after the proof establishes expected results. Inference: a test that passes an oracle implementation is weaker than a Verus proof because the oracle can share the same bug.

Evidence. Table 4 gives coverage percentages for the whole MBPP-Pro and HumanEval-Pro datasets. For MBPP-Pro, oracle coverage is 99.36%; MR-guided coverage is 99.81% with GPT-4o, 99.54% with Mistral, 99.67% with GPT-OSS, and 99.73% with Qwen3-Coder. For HumanEval-Pro, oracle coverage is 99.43%; corresponding values are 99.75%, 99.52%, 99.74%, and 99.76% (Table 4, p. 14). Table 5 reports MR-test correctness on HumanEval-Pro/MBPP-Pro: Qwen3-Coder 85.01%/93.14%, GPT-4o 82.03%/88.15%, Mistral 75.51%/76.55%, and GPT-OSS 78.23%/87.35% (Table 5, p. 14). The paper does not state the number of generated tests in those table denominators; the percentages therefore cannot be independently reconstructed from the paper.

## technique 3: selective MR evaluation and reviewer feedback

What it is. The authors evaluate each description MR separately instead of treating CMA as one indivisible prompt. “We apply one MR at a time to the problem description and generate code using that single transformed variant.” (Section 6.3.2, p. 18). MR3, step-wise decomposition, is the strongest single transformation; MR1 negation can reduce performance, and MR2 translation gives modest gains (Section 6.3.3, pp. 18–19).

How to do it. (1) Hold model, dataset, and metric fixed. (2) Run baseline, MR1, MR2, MR3, MR4, and all-MR CMA separately. (3) Record Pass@1 and Pass@5. (4) Keep high-impact relations and disable relations that distort task semantics. The reported Qwen3 HumanEval-Pro result reaches 78% Pass@5 with MR3 and 84% with all-MR CMA (Section 6.3.3, p. 19).

Verus form. Inference: treat MR selection as a proof-preserving transformation-selection problem. Require each selected relation to produce a contract-equivalent specification; use a `proof fn` to establish equivalence before allowing it into an agent loop. Store the selected relation and proof as reviewable artifacts.

Evidence and limits. The paper’s figures report trends but do not provide full numeric tables for every model/MR pair. The conclusion says, “transformations like negation and translation didn’t achieve significant improvements, whereas step-wise decomposition and paraphrasing substantially boosted performance across all evaluated models.” (Conclusion, p. 22). Inference: this supports adaptive selection, but not a universal ranking across languages, prompts, or Verus code.

## costs, trust, and product implications

The CMA Mutator uses about 205 input and 287 output tokens per problem; the Generator uses about 258 input and 328 output tokens, while the oracle prompt uses 106 input and 91 output tokens (Section 7.1, p. 19). The authors conclude that CMA needs “roughly four times more input and five times more output tokens.” (Section 7.1, p. 19). They propose rule-based mutation, adaptive stopping, caching, and a low-cost model for mutation (Section 7.2, p. 19).

The measured claims rely on Python benchmarks, proprietary APIs, deterministic decoding settings, BERT threshold 0.8, benchmark oracles, and coverage.py. The paper states: “The current implementation employs only LLM-based mutation operators within the Mutator module, which may introduce linguistic or domain biases inherited from the underlying models.” (Section 7.4, p. 21). It also says evaluation focuses on functional correctness and coverage, leaving efficiency, maintainability, and semantic equivalence unexplored (Section 7.4, p. 21).

Inference: the paper’s main value for VL is an agent loop that proposes specification variants and edge-case tests, followed by a formal Verus gate. Already done that VL should not redo: MR mutation, semantic filtering, oracle execution, coverage measurement, and per-MR ablations are all demonstrated here. Inference: the threat to agent-written verified Rust is moderate to high if a mutation silently weakens a contract or if tests are treated as proof; it is lower when every mutation is checked against a canonical Verus specification. The paper leaves the strongest assurance questions, including compiler, library, hardware, and solver trust, outside scope.

## techniques for the catalog

- specification MR mutation: rewrite task descriptions into semantically equivalent variants before LLM generation, then filter and regenerate invalid variants
- MR-guided test augmentation: transform oracle tests through swapping, permutation, algebraic, subset, and incremental relations and measure coverage
- reviewer-gated generation: use similarity or oracle execution to accept only validated mutations before code or tests are generated
- selective MR control: measure each relation independently and retain relations that improve correctness without semantic distortion

Checked 2026-10-15 against the paper by a Codex agent for llm_assisted_coding_with_metamorphic_spe_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
