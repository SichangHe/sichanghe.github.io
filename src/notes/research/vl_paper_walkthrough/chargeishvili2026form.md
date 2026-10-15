# LLM-Based FORM Code Generation with Verification-Driven Fine-Tuning
(authored by agents unless marked 🧑)
Tag: `chargeishvili2026form`, [paper](https://www.semanticscholar.org/paper/dcf79c4eaa4cfbcec5039cfc6141ed31a9f6db43)

## problem and contribution
The paper studies code generation for Form, a symbolic-algebra DSL used for very large particle-physics expressions. It reports that “contemporary large language models (LLMs), including frontier models with hundreds of billions of parameters, achieve a zero-percent execution pass rate on our instruction-following and tutorial-style Form tasks without documentation in a single attempt” (Abstract, p.1). Its central technique is to make the Form executable itself an oracle for producing training data, then fine-tune a small model. The paper says the pipeline “uses the Form binary itself as an execution oracle to produce and validate a corpus of 4,633 training examples” (Abstract, p.1).

Inference: the transferable design for VL is verifier-filtered data generation: generate candidate Rust/Verus artifacts, execute the trusted checker, retain only candidates that satisfy mechanically checked conditions, and train or select from that corpus. Form's deterministic interpreter is not equivalent to Verus's proof checker, so the oracle boundary must be stated explicitly.

## technique: feature-stratified verified data generation
The method first defines “a taxonomy of 16 Form features, each with three complexity levels (basic, intermediate, advanced), yielding 48 feature-complexity cells” (Section 3.1, p.5). Features include wildcard matching, tensor and gamma traces, preprocessor loops, expression manipulation, and polynomial operations. For every cell, DeepSeek-V4 Flash (304B parameters, temperature 0.8) receives a plain-English instruction specifying symbols, expressions, and operations. The generation stage produces approximately 10,000 candidate programs (Section 3.1, p.5).

Each candidate passes four stated filters. (1) “Deterministic-word check: The instruction is scanned for non-deterministic words (“think”, “appropriate”, “suitable”) that could lead to variable outputs” (Section 3.1, p.5). (2) “Form binary syntax validation: The program is executed through the Form binary (FORM 5.0, April 2025)” (Section 3.1, p.5); failures are rejected and Form's stdout error is fed to repair. (3) “Non-trivial output check: Programs that produce empty or trivially simple output (e.g., 0 or 1) are rejected” (Section 3.1, p.5). (4) “LLM consistency audit: An independent LLM (GLM-5.2, 756B parameters [15], temperature 0.1) evaluates whether the generated program is semantically consistent with the instruction” (Section 3.1, p.5). The auditor gets a curated Form factsheet. Exact-match and normalized-text deduplication follow the checks.

The resulting counts are 2,465 verified deterministic examples, 1,050 open-ended examples (63 of 1,113 held out for validation), 43 tutorial programs, and 1,075 knowledge Q&A examples, for 4,633 examples and a 314-example validation split (Section 3.1, pp.5–6). The paper says test sets were generated before training “to prevent data leakage” (Section 3.1, p.6).

Inference: in Verus, the executable oracle would be `verus` verification plus any separately justified runtime tests. A candidate should carry a specification (`requires`/`ensures`), loop `invariant`s, and proof code; the pipeline must reject verification failures before training. A Form output check does not establish a Rust memory or specification property. The deterministic-word filter transfers as a prompt/data-quality rule, while the independent semantic audit remains an inference-layer check and must not be treated as proof.

## technique: parameter-efficient specialization
The authors fine-tune Qwen3-8B with QLoRA: the base model is quantized to 4-bit precision, frozen, and trained with low-rank adapters. They write that this “reduces the number of trainable parameters by ∼99% while preserving performance comparable to full fine-tuning” (Section 2.3, p.4). The specialist is evaluated against seven open-weight baselines on four benchmarks: B1 has 664 fully specified deterministic tasks; B2 has 100 open-ended tasks; B3 has 44 tutorial tasks; B4 has 32 complex multi-step tasks (Section 4.1, pp.8–9).

The principal results are denominator-specific. FORM-8B obtains 97.7% exact-output match on all 664 B1 tasks and 83.0% execution on all 100 B2 tasks (Abstract, p.1; Section 5.2, p.14). On the 89 B2 tasks with uniquely determined outputs, strict Form-verified output match is 18.0% for FORM-8B versus 5.6% for the best frontier model (Section 5.3, p.16). On small B3/B4 sets the paper reports that differences are statistically unresolved; its conclusion gives p ≥ 0.375 there (Section 7, p.20). General capability changes by −2.6 percentage points on MMLU and −1.5 points on GSM8K (Abstract, p.1).

Inference: the analogous VL experiment would tune adapters on verifier-passing Verus examples, while retaining a held-out project split and reporting proof-pass and specification-match rates with denominators. QLoRA itself does not carry over as a Verus construct; it is a model-training choice.

## technique: execution versus semantic success
The paper separates “runs” from solutions with strict output matching. Its B2 strict subset is limited to 89/100 because many instructions underspecify the computation; B3 has 41 adjudicable tasks and B4 22, with confidence-interval half-widths up to ±20 percentage points (Section 6.3, p.19). The authors explicitly caution that these are suggestive. The study has no human evaluation, uses one author-constructed benchmark, and measures correctness rather than runtime (Section 6.3, pp.19–20).

Inference: VL should similarly report at least (a) verifier success, (b) whether the proved contract is the intended requirement, and (c) trusted components such as solver, Verus translation, compiler, libraries, and environment. Passing Verus proves the written specification, not that the specification captures product intent.

## what is proved, measured, and trusted
Measured: candidate execution, exact output, strict output matching, bootstrap 95% intervals, paired McNemar tests, and capability preservation. The Form binary is trusted as syntax/output oracle; GLM-5.2's semantic audit is an additional model judgment. The paper's own limitations state that no physicist user study was done and that the benchmark/model were author-constructed (Section 6.3, pp.19–20).

Inference: a VL deployment should treat the verifier and solver as trusted infrastructure and keep model audits subordinate to proof results. The reported 4,633 examples include generated and tutorial material, so corpus size is not a count of independently human-authored specifications.

## threat to VeruLaw
Inference: the threat is material for agent-written verified Rust if a model can cheaply generate many verifier-passing candidates, but this paper does not demonstrate Verus, Rust ownership, concurrency, or product-scale requirements. Its strongest lesson is pipeline architecture: use a deterministic checker to curate data, separate runnable from semantically correct outputs, and report denominators. It does not show that an LLM can replace Verus proofs or requirement review.

## techniques for the catalog
- verifier-oracle data curation — generate domain-code candidates and retain only programs passing syntax, execution, non-trivial-output, and independent consistency checks
- feature-complexity stratification — cover a DSL by feature × difficulty cells before generation
- execution-versus-output evaluation — report both runnable rate and strict expected-output match on adjudicable tasks
- parameter-efficient specialization — adapt a quantized frozen model with low-rank adapters while measuring held-out domain and general capability

Checked 2026-10-15 against the paper by a Codex agent for llm_based_form_code_generation_with_veri_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
