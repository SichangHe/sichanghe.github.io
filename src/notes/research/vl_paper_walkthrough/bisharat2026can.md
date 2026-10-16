# Can LLMs Write Correct TLA+ Specifications? Evaluating Natural-Language-to-TLA+ Generation
(authored by agents unless marked 🧑)
Tag: `bisharat2026can`, [paper](https://arxiv.org/abs/2606.05792)
## what is evaluated

This paper evaluates natural-language-to-TLA+ synthesis rather than code generation. Its benchmark contains 205 TLA+ specifications from 98 projects, paired with comments and (when available) TLC configurations. The split is 143 training, 31 validation, and 26 usable test specifications; five original test items lacked comments or configurations and were excluded (Section 3, pp. 3–4). The core experiment runs 25 open-weight models, 26 test specifications, and four prompting strategies: 650 runs per strategy and 2,600 runs total. Five proprietary models receive few-shot prompting only, adding 130 runs (Sections 1 and 3, pp. 1, 4).

The paper validates each generated artifact in two stages. SANY parses syntax with a 30-second timeout and accepts “Parsing completed.” SANY-passing outputs are submitted to TLC with the generated or supplied configuration for model checking (Section 3, p. 5). SANY validity is therefore a syntactic measure; TLC pass is the paper's semantic measure. The authors state: “LLMs achieve up to 26.6% syntactic correctness but only 8.6% semantic correctness, with successes exclusive to progressive prompting” (Abstract, p. 1).

The TLA+ background matters for applying the result. `Init` defines valid start states, `Next` the state transition relation, and `Init ∧ □[Next]_v` the core behavior; invariants are safety properties and liveness describes eventual behavior (Section 2, p. 2). TLC explores every reachable state of a finite instance, while TLAPS supports deductive reasoning for infinite-state specifications (Section 2, p. 2). The paper's TLC percentages consequently describe finite configured models, not a proof for all parameters.

## technique 1: progressive prompting for structured specification synthesis

What it is: Progressive prompting decomposes one full TLA+ generation into staged messages. It uses three few-shot examples, then guides the model through module declaration, state variables, operators, and temporal properties (Section 3, p. 5). The paper's method description says: “Each message focuses on a different aspect: module declaration, state variables, operators, and temporal properties.”

How to apply it:
1. Select three training examples pairing comments with complete TLA+ modules (Section 3, p. 5).
2. Prompt for the module declaration and structure before asking for details (Section 3, p. 5).
3. Prompt for state-variable declarations, then operator definitions, then temporal properties, carrying prior output as context (Section 3, p. 5).
4. Assemble the pieces into one module and validate with SANY, then TLC using the configuration (Section 3, p. 5).
5. Treat a SANY pass as a prerequisite only; inspect TLC results because syntax can be valid while behavior is wrong (Sections 3–4.1, pp. 5–6).

Progressive was the only strategy with TLC passes: 56/650 = 8.6% (Table 3, p. 5). Its SANY rate was 162/650 = 24.9%, compared with few-shot 173/650 = 26.6%, half-completion 80/650 = 12.2%, and fill-in-middle 92/650 = 14.2% (Table 3). The 56 TLC passes include 14/26 for DeepSeek r1:8b, 12/26 for Qwen3:235b, 10/26 for Qwen3:30b, six for GPT-OSS-20b, and four for Phi-4-mini (Section 4.1, p. 6). The authors warn that progressive decomposition introduces missing terminators, duplicate headers, and similar structural errors, so they recommend a global consistency check (Section 5, p. 9).

Inference: In Verus, use the same staged generation for module skeleton, executable state, specifications, and proof lemmas, but run `cargo verus` after each stage. Preserve a compiling Rust skeleton and stable function signatures while adding `requires`, `ensures`, loop `invariant` clauses, and proof functions. Progressive prompting does not itself prove a Verus contract; the verifier must reject each incomplete or semantically wrong candidate. A final whole-module proof is the analogue of TLC's global consistency check.

## technique 2: completion prompting as a controlled baseline

The paper compares two context-preserving strategies. Half-completion supplies comments, configuration, and the first 50% of the target as a prefix; the model generates the rest. Fill-in-middle supplies the first 30%, a `<FILL>` marker for the middle 40%, and the final 30% suffix; no few-shot examples are used (Section 3, p. 5). These methods test whether valid surrounding syntax helps generation without asking the model to invent a module header.

Apply them by selecting the exact prefix/suffix proportions, requesting only the missing region, splicing it into the ground truth context, and running SANY and TLC. The paper reports no TLC passes for either strategy: 0/650 for half-completion and 0/650 for fill-in-middle (Table 3, p. 5). Textual similarity was also low: half-completion mean BLEU 0.062 ± 0.11 and ROUGE-L 0.189 ± 0.19; fill-in-middle BLEU 0.077 ± 0.13 and ROUGE-L 0.213 ± 0.20, with exact matches 0/650 and 1/650 respectively (Table 3, p. 5). These are completion-target metrics, not semantic correctness.

Inference: For Verus, completion can constrain a generated proof body between known Rust/specification boundaries, but it cannot ensure that the surrounding contract expresses the intended property. Use it as a baseline or local repair mode, followed by the same Verus proof and review gates as full generation.

## technique 3: formal validation and failure decomposition

The paper's reusable evaluation pipeline is: generate an artifact; run SANY with a 30-second timeout; for SANY passes, run TLC with its configuration; classify failures before aggregating percentages (Section 3, p. 5). Table 4 separates infrastructure failures from semantic failures. For progressive, 12 of 122 TLC failures (9.8%) were Module Not Found infrastructure failures and 110 (90.2%) were genuine configuration exceptions; the other strategies had 97.2–99.2% infrastructure-failure proportions because unresolved `EXTENDS` paths dominated (Table 4, p. 6). The paper explicitly says that “The 56 passes are concentrated in just three model families” (Section 4.1, p. 6), so pass counts should not be interpreted as broad model capability.

Inference: A Verus analogue should classify parser/compiler failures, solver timeouts, specification/proof failures, and environment or dependency failures separately. Record denominator, model, prompt strategy, Verus version, and dependency revision for each run. A passing compile is analogous to SANY; a completed proof is the stronger semantic gate. Environment failures must not be counted as proof failures, but neither should they be silently discarded.

## technique 4: hallucination taxonomy and deterministic repair

The study identifies five recurring failure categories. Unicode operator substitution replaces required ASCII forms such as `\/`, `/\`, `\in`, and `->` with Unicode or LaTeX forms; SANY rejects them. Cross-language syntax injection adds semicolons, backticks, Pascal/SQL `END`, or other mainstream-language tokens. Reasoning/formatting leakage inserts `<think>` blocks, Markdown fences, or natural-language prose. Length miscalibration produces outputs far longer or shorter than the target. Structural errors omit the `====` terminator, duplicate `MODULE`, or omit the module header (Section 4.4, pp. 8–9).

The paper quantifies these against exact denominators. Semicolon contamination appears in 82/650 progressive files (12.6%), 49/650 few-shot files (7.5%), 23/650 half-completion files (3.5%), and 22/650 fill-in-middle files (3.4%) (Table 11, p. 9). QwQ inserts `<think>` blocks in 26/26 half-completion and 26/26 fill-in-middle files; over 243 progressive files lack the required terminator (Section 4.4, p. 9). Average target-length ratios are 3.46× for half-completion and 2.24× for fill-in-middle, with extrema up to 9.84× (Section 4.4, p. 9).

The proposed mitigations are grammar-constrained decoding, deterministic post-processing (Unicode normalization, semicolon stripping, fence removal), and retrieval over verified TLA+ specifications (Section 5, p. 10). These mitigate lexical and formatting errors but cannot establish semantic faithfulness; the syntax–semantics gap remains.

Inference: In Verus, deterministic cleanup can remove Markdown or normalize formatting before invoking the verifier, but never silently rewrite Rust expressions, specifications, or proof terms in a way that changes meaning. A grammar-aware generator can restrict syntax; Verus then checks contracts, loop invariants, and lemmas. Retrieval should use verified Rust/Verus examples with compatible APIs, while dependency assumptions remain explicit.

## model selection findings

The paper finds that model size is not predictive. DeepSeek r1:8b has 14/26 progressive TLC passes (53.8%), while r1:70b has none; Qwen3:30b leads few-shot SANY with 23/26 versus 22/26 for Qwen3:235b (Tables 5 and 6, pp. 6–7). Code-specialized models underperform general-purpose models, which the authors attribute to negative transfer from C, Java, and Python syntax (Section 4.3, p. 8). Proprietary GPT-5 reaches 26/26 SANY and 7/26 TLC (26.9%) under few-shot; Claude Sonnet 4.5 reaches 24/26 SANY and 3/26 TLC (11.5%) (Table 6, p. 7).

Inference: VL should select models by proof-pass rate on its own Verus tasks, not parameter count or code-specialization labels. The paper's 26 test specifications and one run per model-specification-strategy pair do not establish production reliability. Its strongest direct lesson is to measure semantic proof outcomes with exact denominators and to preserve failed artifacts for diagnosis.

## what is proved, trusted, and still missing

The paper measures parser and finite model-checker outcomes; it does not prove that natural-language requirements were faithfully translated. TLC configurations, finite bounds, dataset comments, model APIs, SANY, TLC, and the interpretation of failures are trusted inputs or tools. Each pair is run once per strategy, so stochastic variation is not fully captured (Section 5, p. 10). The benchmark is community-published TLA+ and may not represent proprietary industrial specifications; results may not transfer directly to other formal languages (Section 5, p. 10).

Inference: The threat to agent-written verified Rust is requirement omission. A Verus proof can certify the written postcondition while the postcondition omits a safety property, models an external dependency incorrectly, or trusts an `external_body` boundary. The paper therefore supports a generation-and-proof pipeline with human requirement review, rather than autonomous specification writing. Existing Verus work already provides contracts, loop invariants, proof functions, and state-machine abstractions; VL should apply this study's staged prompting and denominator-aware evaluation to those constructs instead of redoing TLA+ syntax experiments.

## techniques for the catalog

- progressive specification prompting — generate module structure, state, operators, and temporal properties in staged messages, then validate globally
- two-stage formal validation — run a parser gate first and a semantic checker second, separating infrastructure failures from genuine semantic failures
- completion baselines — compare half-completion and fill-in-middle with exact context proportions and textual metrics
- hallucination taxonomy and repair — classify lexical, cross-language, reasoning-leakage, length, and structural errors, then apply grammar constraints and deterministic cleanup
- model-selection by proof outcome — compare model families and sizes using per-strategy semantic pass denominators rather than parameter count
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
