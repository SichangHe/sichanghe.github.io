# Consistency Meets Verification: Enhancing Test Generation Quality in Large Language Models Without Ground-Truth Solutions
(authored by agents unless marked 🧑)
Tag: `taherkhani2026consistency`, [paper](https://doi.org/10.1145/3624032.3624035)

## what the paper does
ConVerTest generates tests and candidate solutions without relying on a pre-existing implementation as the sole oracle. It has a consistency-driven generation stage and a consensus verification stage. The authors identify the problem as “circularity of error” when tests are made to match current code, and report that Gemma3.3 produces only 35–51% valid tests on BigCodeBench while CodeQwen3 produces 54–73% on LBPP (Introduction, p.1). These ranges are model/dataset-specific percentages, not one pooled denominator.

## technique 1: two-stage self-consistency test generation
what it is: separate broad scenario discovery from assertion completion. The paper says: “The test generation pipeline produces M test cases through SC,” while the code pipeline produces Z candidates through CoVe (Section III, p.4).

how to apply:
1. sample M diverse test stubs containing setup, inputs and a function call but no expected values (Section III.A.1, pp.4–5)
2. for each stub, sample N completions with concrete outputs and assertions
3. parse each completion into an AST and group functionally identical tests, ignoring variable names and formatting
4. select the most frequent completion for each stub
5. retain one complete test per scenario

The paper’s example uses a `unittest` class with `setUp`, `subwords`, `whole_word`, and an `anagram_combos` call (Section III.A.1, p.5). Inference: for Verus, use the same split between scenario generation and contract/proof completion. A generated test can become a Rust harness calling verified code; expected properties should be checked with executable assertions or proof lemmas, never assumed from majority text.

## technique 2: chain-of-verification for candidate code
what it is: interrogate a baseline solution with targeted questions, then revise it. The paper gives the sequence: “(1) generates an initial draft, (2) creates verification questions to scrutinize its own claims and assumptions, (3) answers these questions (often independently to reduce bias) to detect and correct errors or ‘hallucinations,’ and (4) synthesizes the results into a revised, verified response.” (Section II, p.3).

how to apply:
1. generate a baseline implementation
2. create questions covering correctness, logic, edge cases, constraints and robustness (Section III.A.2, pp.5–6)
3. answer each question against the baseline and problem statement
4. if issues exist, regenerate using the original prompt, baseline, questions and answers
5. repeat Z times to obtain candidates

Inference: in Verus, replace the textual “verified response” with a candidate Rust function plus `requires`/`ensures`; run Verus and feed failed proof obligations into the next revision. CoVe reasoning is not a proof. The final acceptance criterion must be a successful verifier run under a reviewed specification.

## technique 3: dual execution agreement
what it is: cross-check multiple solutions against multiple generated tests. The paper states: “Each candidate solution is executed against each generated test; solution–test pairs that pass are ‘inliers.’” (Section III.B, p.6).

how to apply:
1. execute each of Z candidates on each of M tests
2. form agreement sets grouping solutions that pass exactly the same test subset
3. score a set as `sqrt(number of tests passed) × number of solutions in set`
4. select a representative from the highest-scoring set
5. label tests that pass the chosen solution valid and others invalid

Inference: this is useful as a pre-proof filter for agent-written Verus code, but passing tests is weaker than a proof and can share a common bug. Keep the agreement matrix and require formal contracts for the selected implementation.

## evidence and denominators
Table I reports percentages for BigCodeBench (BCB) and Less Basic Python Problems (LBPP), across CodeQwen3, Gemma3.3 and GPT-5-Mini. For example, BCB CodeQwen3 rises from holistic VR 62, LC 81, MS 57 over 1,808 tests to SCTG VR 76, LC 88, MS 67 over 2,187 tests (Table I, p.7). On LBPP Gemma3.3, VR rises from 38/100 to 53/100, LC from 60/100 to 76/100 and MS from 44/100 to 57/100; the table’s denominator is percentage metrics over generated suites, with test counts 1,595 and 2,938 respectively. Table II’s ConVerTest BCB CodeQwen3 row reports recall 91, precision/VR 91, F1 91, LC 87 and MS 67; the corresponding SC row has precision 76, LC 88 and MS 67 (Table II, p.8). The paper reports up to 39% precision gain, but this is the absolute percentage-point change 51→90 for Gemma3.3 on BCB or 53→84 on LBPP, not a relative percent.

## trusted boundary, limits and VL threat
The consensus proxy assumes independently generated candidates and tests; shared model errors can agree. Ground-truth implementations are still used for benchmark validity metrics, even though they are not required to generate the artifacts. The authors observe a small adequacy loss after filtering: BCB GPT-5-Mini LC 89→87 and MS 63→61 (Table II, p.8). Inference: use this pipeline to prioritize proof work and catch hallucinations, but never treat execution agreement as Verus soundness. Threat to agent-written verified Rust is high when test consensus becomes the only oracle; moderate when it gates generation before formal verification.

## techniques for the catalog
- two-stage self-consistency — generate diverse stubs, then majority-select assertion completions
- AST functional grouping — compare tests by behavior while ignoring formatting and names
- chain-of-verification — interrogate a baseline with correctness and edge-case questions, then revise
- dual execution agreement — cluster candidate solutions by pass/fail test signatures
- consensus scoring — rank clusters by passed-test coverage and number of agreeing solutions
- verification metrics — report validity, precision, recall, F1, line coverage and mutation score with dataset/model denominators
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
