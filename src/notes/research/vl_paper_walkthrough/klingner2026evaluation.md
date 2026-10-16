# Evaluation of LLMs for Mathematical Formalization in Lean
(authored by agents unless marked 🧑)
Tag: `klingner2026evaluation`, [paper](http://arxiv.org/abs/2606.05632v1)
## scope and measured object

The paper evaluates automated Lean 4 proof generation. It fixes n=50 problems from each of miniF2F and miniCTX, and compares 14 general-purpose, open-weight, and Lean-specialized models using independent sampling (pass@k) and verifier-feedback repair (refine@k). The authors state: “We utilize both pass@k and refine@k metrics as the benchmark for our comparison and evaluate on subsets of both miniF2F and miniCTX datasets.” (Abstract, p. 1). The claimed headline results are Gemini 3.1 Pro at 92% on miniF2F refine@32 and Claude Opus 4.7 at 86% on miniCTX refine@32; these denominators are the 50-problem subsets and the k=32 protocol (Abstract, p. 1).

Inference: For VeruLaw, the useful lesson is an evaluation design that measures executable proofs rather than text plausibility, but the reported percentages are Lean-specific and cannot be treated as Verus accuracy without a new benchmark.

## technique 1: representative, stratified benchmark sampling

What it is: reduce evaluation cost while preserving dataset composition. miniF2F is sampled with proportional strata (IMO, AMC12, AIME, algebra, induction, number theory); miniCTX is sampled uniformly because its domains are described as homogeneous. The method says: “For miniF2F, we utilize proportional stratified sampling.” and “for miniCTX the problem domain is generally homogeneous and lacks explicit categorical distinctions, so we take a simple random sample across the total dataset.” (Section 2.1, p. 2).

How to apply:
1. Define the full benchmark and its categories (Section 2.1).
2. For miniF2F-like heterogeneous data, compute each category's frequency and sample n=50 in exact proportion (Section 2.1).
3. For homogeneous data, draw a simple random sample of n=50 (Section 2.1).
4. Record the chosen instances; the paper lists every selected problem in Appendix B (pp. 14–15).

Verus form: Inference: create a fixed corpus of Rust/Verus tasks, stratify by API/domain or proof shape, and publish the sampled identifiers. No Verus construct implements sampling; this is harness code and data management outside verified functions.

Evidence and limits: The paper calls the subsets “statistically representative snapshots” (Section 2.1, p. 2), but Section 4.2.2 concedes that particularly difficult or easy problems may still be over- or under-included. Inference: a VL score from only 50 tasks should therefore be reported with the exact task list and sampling rule, not as broad product reliability.

## technique 2: standardized zero-shot prompting

What it is: hold prompts constant across models to compare intrinsic capability. The protocol uses a zero-shot instruction to output a proof in a designated Markdown block with Mathlib pre-imported, and deliberately omits model-specific few-shot engineering. The paper states: “our framework uses a standardized zero-shot prompting paradigm” and “We deliberately avoid model-specific prompt engineering or complex few-shot scaffolding.” (Section 2.3, p. 2).

How to apply:
1. Give every model the same theorem statement and output format (Section 2.3).
2. Assume dependencies are pre-imported (Section 2.3).
3. Use temperature 0.5, except Opus 4.7 whose API rejected that setting, and a reasoning-token budget of 16,384 (Section 2.3, p. 2).
4. Preserve the exact prompts; the paper provides them in Figures A.5 and A.6 (Appendix A.5, p. 13).

Verus form: Inference: use a fixed prompt requesting a Rust function plus Verus specifications, with the same imports and tool instructions for every model. The prompt is external to Verus; the generated artifact must still compile under Verus. The paper's standardized prompt is unsuitable as a direct Verus prompt because Lean syntax, Mathlib names, and Markdown extraction differ.

Evidence and limits: The authors say standardization “better represents a model’s capabilities when integrated into an agentic workflow” (Section 4.2.3, p. 7), while also noting it may understate models designed for specialized prompts. Inference: VL should publish both a controlled baseline and a production-agent setting; conflating them would hide prompt/tooling effects.

## technique 3: verifier-safe proof extraction and acceptance

What it is: compile only the intended proof body against the benchmark theorem, while rejecting bypasses. The paper's procedure “sanitizes responses before compilation” by filtering `sorry`, `admit`, and omitted macros, then structurally combines the extracted proof body with the dataset statement. A pass is defined as compilation without errors or bypass statements (Section 2.4, p. 2).

How to apply:
1. Parse the model response for the requested final block; if absent, fall back to generic Lean tags and then theorem/lemma keywords (Section 2.3, p. 2).
2. Reject outputs containing `sorry`, `admit`, or omitted macros (Section 2.4, p. 2).
3. Isolate the proof body and combine it with the original theorem statement, preventing premise edits (Section 2.4, p. 2).
4. Compile through LeanInteract and the Lean kernel; label Pass only on clean compilation (Section 2.4, p. 2).

Verus form: Inference: extract only the Rust function body or proof blocks, splice them into an immutable benchmark harness, reject `external_body` and other trust escapes, and run `verus` to check the resulting program. Verus specifications belong on the benchmark's fixed function declaration; generated code must use supported constructs such as `requires`, `ensures`, `invariant`, and proof functions as documented in VL's Verus notes. The extraction and policy checks are untrusted harness code; the Verus verifier and compiler are the trusted checking boundary.

Evidence and limits: The paper's acceptance criterion is machine-checkable Lean compilation, not semantic equivalence beyond the stated theorem. Inference: a Verus harness needs an explicit trust inventory because compilation alone does not guarantee that unsafe or externally trusted bodies were excluded.

## technique 4: pass@k independent generation

What it is: generate k independent proofs and estimate the chance that at least one verifies. The paper defines pass@k from n=32 generations and c correct samples: “The pass@k metric estimates the probability that at least one out of k independent samples successfully verified in the Lean environment.” (Section 2.5, p. 2). It uses temperature 0.5 and evaluates k up to 32 (Sections 2.3 and 2.5, p. 2).

How to apply:
1. For each theorem, sample n=32 independent responses (Section 2.5).
2. Verify each response using the sanitization and extraction protocol (Section 2.4).
3. Count c correct responses and calculate the paper's combinatorial estimator, averaging over problems (Section 2.5, p. 2).
4. Plot pass@k for 1≤k≤32 (Figure 3.1 caption, p. 3).

Verus form: Inference: run 32 independent Rust/Verus generations per task, count verifier-clean proofs, and apply the same estimator. Independence is an experimental assumption; retries sharing context or cached repairs would violate it.

Evidence: The study uses 50 tasks per dataset, so every aggregate accuracy denominator is 50 tasks. It reports that Gemini 3.1 Pro and Opus 4.7 lead at high k, while GPT-OSS is nearly as good as the leaders on miniCTX for k∈{1,2} (Section 3.1, p. 4). Inference: low-k results better approximate a single VL agent's budget than pass@32 alone.

## technique 5: refine@k compiler-feedback loop

What it is: iteratively repair one proof using exact verifier feedback. The protocol sends the formal theorem statement and, after a failure, the previous response plus compiler feedback; it iterates to k turns. The paper defines: “If an initial generation fails, the exact trace from the Lean verifier is extracted.” (Section 2.5, p. 2) and defines refine@k as “the percentage of theorems that are correct after k iterations, normalized to [0,1].” (Section 2.5, p. 2).

How to apply:
1. Generate an initial proof from the theorem statement (Section 2.5).
2. If it fails, append the exact verifier trace and previous proof to the next prompt (Section 2.5).
3. Repeat for at most 32 turns, stopping early on a clean proof (Section 2.5).
4. Divide the number of theorems correct after turn k by the 50-task subset size (Section 2.5 and Section 2.1).

Verus form: Inference: feed `verus` diagnostics, the unchanged Rust specification, and the prior body into each repair turn. Keep the theorem statement immutable and cap turns. Do not treat a proof function as runtime code; the verifier feedback loop is orchestration outside the verified program.

Evidence and failure: Across all models the paper reports an average refine-minus-pass improvement of +3.14%; miniF2F's average Δ32 is +7.7%, while miniCTX's is −1.4% (Section 3.4, p. 6; Table 3.1, p. 7). The authors explain that smaller-context models lose information from verbose Lean errors and that refine@k is not statistical (Sections 3.4 and 4.2.4, pp. 6–7). Inference: VL should log every diagnostic and context truncation, and should not assume feedback repair always beats independent sampling.

## what is proved, trusted, and left open

The measured claim is conditional: a model's generated Lean proof compiles in Lean 4 after policy filtering. LeanInteract, the extraction code, model APIs, benchmark statements, and pricing assumptions remain outside the theorem proof. Inference: the appendix gives 32,559 miniCTX failures and 23,884 miniF2F failures, with category percentages; these are failure-entry denominators, not task denominators (Tables A.3–A.5, p. 11). For example, miniCTX syntax errors are 6,074/32,559 = 18.7%, while miniF2F unsolved goals are 4,312/23,884 = 18.1% (Tables A.4–A.5, p. 11). Inference: these percentages diagnose failure modes, not probability that a random task fails.

Inference: the abstract says Gemini 3.1 Pro reaches 92% miniF2F refine@32 and Opus 4.7 reaches 86% miniCTX refine@32, while Section 4.1 reports the same headline models without restating denominators. Preserve the abstract's 50-task denominator and label all table values by dataset, metric, k, and task count when importing this method into VL.

Inference: threat to a product that emits agent-written verified Rust is medium. The verifier-in-the-loop design, structural statement protection, and error taxonomy transfer directly; Lean's ecosystem, benchmark difficulty, and model rankings do not. The study does not measure adversarial Rust, unsafe code, specification weakness, or Verus's trusted base, so product risk remains unquantified.

## techniques for the catalog

- stratified benchmark sampling — sample heterogeneous tasks proportionally and homogeneous tasks randomly, publishing the fixed task list
- standardized zero-shot prompting — hold prompt, format, temperature, and token budget constant for controlled model comparison
- verifier-safe extraction — reject bypass tokens and compile an extracted body against an immutable theorem statement
- pass@k — estimate at least one verifier-clean proof among k independent generations
- refine@k — iteratively repair a failed proof using exact verifier diagnostics, with a fixed turn cap
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
