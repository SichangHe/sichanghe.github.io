# Automated Repair of Declarative Software Specifications in the Era of Large Language Models
(authored by agents unless marked 🧑)
Tag: `hasan2023automated`, [paper](https://doi.org/10.48550/arxiv.2310.12425)
## scope and method
This empirical paper evaluates ChatGPT as a repair assistant for faulty Alloy specifications and compares it with ARepair, BeAFix, ATR, and ICEBAR. Alloy specifications are translated to propositional formulas and checked by SAT solving within a finite scope. The paper’s abstract says: “Our study revealed that while ChatGPT falls short in comparison to existing techniques, it was able to successfully repair bugs that no other technique could address.” The study uses 1,974 human-written faulty specifications: 1,936 from Alloy4Fun and 38 from ARepair (Section IV-C, pp. 5–6). Five prompt scenarios vary bug-location information, fix comments, and whether passing assertions is requested (Table I, p. 5).

Inference: For Verus, the paper supports an LLM-in-the-loop workflow that proposes proof/specification repairs, runs the actual verifier, and rejects candidates that do not compile or prove. It does not show that ChatGPT can repair Verus proofs, and Alloy’s bounded SAT semantics differs from Verus’s Rust/SMT verification.

## technique 1: counterexample-oracle repair loop

What it is. Alloy’s `check` command searches for a counterexample to `M ∧ ¬p`; `run` searches for a satisfying instance of `M ∧ p` (Section II-A, pp. 2–3). A repair system edits the specification, then reruns the Analyzer and uses assertion success as the correctness oracle. BeAFix exhaustively enumerates candidate mutations up to a bound; ARepair uses AUnit tests and fault localization; ICEBAR uses property-based oracles and counterexamples to prune partial fixes (Related Work, pp. 3–4).

How to apply it.
1. Identify a faulty Alloy specification and its assertion
2. Obtain a counterexample with `check` at a chosen scope (Section II-A, pp. 2–3)
3. Give the model, counterexample, and optional bug location/fix hint to the repair generator
4. Generate a candidate edit (mutation, template, exhaustive candidate, or LLM response)
5. Re-run Alloy Analyzer; retain only candidates whose assertion check succeeds
6. Compare retained candidates against the known correct specification when evaluating a benchmark (Section IV-C, p. 6)

Verus form (Inference). Replace Alloy Analyzer with `cargo verus` and use compiler/verifier diagnostics as the oracle. Ask an LLM to propose a changed `requires`, `ensures`, invariant, lemma, or implementation expression; apply it in a clean working tree; rerun Verus; and accept only a candidate that compiles and verifies the intended tests. A passing proof is not sufficient if the specification was weakened, so preserve independent behavioral tests and review the diff.

Evidence. The authors evaluated five scenarios and compared correct repaired specifications across the same benchmark suites as prior tools. In Repair Scenario 2, ChatGPT repaired 517/1974 specifications (26%); in Alloy4Fun it repaired 497/1936 (26%), while in ARepair it repaired 29/38 (76%) in Scenario 1 (Table II and Section V, pp. 6–8). The denominator is the full 1,974-specification combined suite or the named benchmark subset; percentages are rounded from the displayed fractions.

Limits. Alloy is bounded-exhaustive: a successful check covers only instances within the selected scope (Section II-A, p. 3). ARepair can overfit tests; BeAFix’s exhaustive search can be time-consuming (Related Work, pp. 3–4). Inference: Verus’s unbounded mathematical obligations remove this particular scope limitation but introduce solver incompleteness and specification-strength risks.

## technique 2: prompt-factorized LLM repair

What it is. The study treats prompt content as experimental factors: bug location indicator, fix comment, and assertion instruction. Scenario 1 supplies both location and fix comment; Scenario 2 supplies location only; Scenario 3 supplies neither but asks to pass assertions; Scenario 4 supplies neither and does not ask to pass; Scenario 5 supplies location and asks to pass (Section IV-A, pp. 4–5).

How to apply it.
1. Prepare the faulty specification and select whether to include a location marker
2. Optionally include a natural-language fix comment
3. Optionally instruct the model to make the assertions pass
4. Send the prompt in a fresh session and save the complete response
5. Extract the proposed specification and validate it with Alloy Analyzer
6. Repeat under alternative factor combinations and compare repair counts and errors (Sections IV-D–E, pp. 6–7)

Verus form (Inference). Use prompts that include the exact Verus diagnostic, relevant function/lemma text, intended property, and a precise edit location. Test variants with and without a suggested fix, but always run Verus and independent regression tests. Prompt factors should be logged as metadata so repair rates are not confused with model changes.

Evidence. The study reports that “Specific instruction on how to fix the bug as part of the prompt has the most significant impact on ChatGPT’s performance.” (Observation 4, p. 10). Scenario 4, with the least guidance, performed worst across the reported comparisons (Section V, p. 10). The paper reports no causal isolation beyond its factorized scenarios, so this is an empirical association within the benchmark.

Limits. The paper used gpt-3.5-turbo, default temperature after exploring values from 0.05 to 1 in increments of 0.05, and approximately 10,000 requests (Section IV-D, p. 6). Results may change with newer models, temperatures, context windows, or conversational feedback.

## technique 3: repeated-run consistency testing

What it is. To measure nondeterminism, the authors sent the exact same prompt for each of ten faulty specifications ten times, in new sessions, then measured BLEU, ROUGE-L, METEOR, and BERT-based semantic similarity (Section V, pp. 8–9).

How to apply it.
1. Select a fixed set of faulty specifications and a fixed prompt
2. Run the repair request repeatedly in independent sessions
3. Compute text and semantic similarity across outputs
4. Verify every output with the formal analyzer
5. Compare factor conditions statistically; the paper uses Welch’s t-test and Bonferroni-adjusted p=0.005 (Section V, p. 8)

Evidence. With assertion instruction, the ten-prompt average was BLEU 0.765, ROUGE-L 0.378, METEOR 0.244, and BERTSim 0.764; without it, averages were 0.033, 0.0562, 0.202, and 0.402 (Table III, p. 7). The denominator is ten generated repairs per prompt, across ten prompts. The authors report Welch tests with p-value < 6.660e-05 for all paired comparisons after Bonferroni correction (p. 8), then conclude: “ChatGPT shows inconsistency by generating different repairs for the same input on different executions.” (Observation 2, p. 8).

Verus form (Inference). Run each proposed Verus repair multiple times under fixed model and repository state, then cluster by normalized diff and verify every member. A single successful run is insufficient evidence of reproducibility.

## technique 4: typed and semantic error taxonomy

What it is. Two authors independently inspected unsuccessful repairs and open-coded error categories. They analyzed 6,559 mistakes across scenarios (Section IV-E, p. 6). Categories are wrong operator, wrong type, misuse of higher-order logic, relational-arity mismatch, and hallucinated identifiers (Section V, pp. 8–10).

Evidence. Table IV uses 1,974 as denominator for each scenario row. Wrong-type errors were 450/1974 (23%), 246/1974 (12%), 424/1974 (21%), 1125/1974 (57%), and 637/1974 (32%) for Scenarios 1–5 respectively; the displayed percentages are rounded. The paper states that its manual labeling had Cohen’s kappa 0.95 (Threats to Validity, p. 10). These fractions count categorized mistakes against all benchmark specifications, not against the 6,559 total mistakes, so they must not be summed as mutually exclusive rates.

Verus form (Inference). Build a validator that classifies failed agent patches into parser/type errors, unsupported proof constructs, failed assertions, timeout, and specification weakening. Store the original diagnostic and patch so categories remain auditable. Verus’s Rust type checker can catch some errors before SMT verification.

Limits. Categories are manual and may carry labeling bias; the authors used independent labeling and consensus. Generalization beyond the two Alloy suites is explicitly limited (Threats to Validity, p. 10).

## proved, trusted, and product threat
The paper measures repair outcomes, similarity, and error categories; it does not prove semantic correctness beyond Alloy Analyzer checks at bounded scopes. Trusted components include the Alloy Analyzer/SAT backend, benchmark assertions as oracles, model/API behavior, and the authors’ manual labels. The authors recommend human validation: “incorporating a human-in-the-loop validation step in the repair process with ChatGPT may be able to enhance the reliability of the repaired specifications.” (Section VI, p. 10).

Inference: Threat to a product that lets agents write verified Rust is high if LLM patches are accepted from text alone: this study reports frequent wrong types, operators, arities, hallucinated names, and nondeterministic outputs. Threat is lower when every candidate is checked by Verus, strengthened by regression tests, and reviewed for weakened specifications. VL should not redo Alloy APR baselines; it should adapt the counterexample/diagnostic loop and measure Verus-specific repair soundness.

## techniques for the catalog
- analyzer-oracle repair loop: generate edits, rerun the formal checker, and retain only candidates that satisfy the assertion oracle
- prompt-factorized repair: vary bug locations, fix hints, and assertion instructions as explicit repair factors
- repeated-run consistency testing: repeat identical prompts in fresh sessions, compare outputs, and verify every candidate
- typed repair-error taxonomy: classify wrong operators, types, arities, unsupported logic, and hallucinated identifiers from verifier failures
Checked 2026-10-13: audit record hasan2023automated; paper-study comparison complete; gate executed; experiments not rerun
