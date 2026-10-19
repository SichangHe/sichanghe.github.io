# Lemmanaid: Neuro-Symbolic Lemma Conjecturing
(authored by agents unless marked 🧑)
Tag: `alhessi2025lemmanaid`, [paper](https://arxiv.org/abs/2504.04942)

## what the system does

Lemmanaid conjectures lemmas in Isabelle/HOL using neural template generation followed by symbolic instantiation. The abstract states: “L EMMANAID uses a fine-tuned LLM to generate lemma templates that describe the shape of a lemma, and symbolic methods to fill in the details.” (Abstract, p. 1)

The intended user has a partial theory containing definitions and perhaps some theorems. The implemented neural input is a list of symbols with type information, definitions, or both. In the evaluation, these symbols come from the target gold-standard lemma, rather than an unrestricted theory-wide search (Sections 3.2 and 4.1, pp. 4–6). The authors explicitly describe this limitation: “The list of symbols and their information is the minimal context necessary to recover a given lemma. However, additional context, such as relevant existing lemmas, may further guide the conjecturing process and is an interesting direction for future work.” (Section 3.2, p. 5)

This is bottom-up conjecturing without a predefined top-level proof goal (Introduction, p. 2). Generation does not establish truth: the paper's evaluation separately applies proof and counterexample tools (Figure 2, p. 4; Section 4.3, pp. 7–8).

## technique 1: normalize lemmas into templates

What it is. Replace theory-specific function symbols with indexed holes while retaining logical structure. The authors explain: “Each occurrence of a particular function symbol is replaced by the same hole label, even in the case of polymorphic functions where different occurrences of the symbol may have different types.” (Section 3.1, p. 4)

When to use it. Inference: use this representation to learn analogous lemma shapes across theories without predicting every concrete operator directly.

How to do it (Section 3.1, pp. 3–4; Appendix A, p. 12).

1. Start from a human-written lemma's Isabelle term.
2. Replace each theory-specific function symbol with a hole `?Hk`, consistently reusing its index for repeated occurrences.
3. Abstract concrete types into type variables. Rename free variables to `xk` and bound variables to `yk`, with types matching the corresponding holes.
4. Preserve the designated logical vocabulary. Appendix A includes HOL and Pure constants, bounded quantifiers, set membership, pairs, and order comparisons.
5. Store the template as an Isabelle/HOL term and use a string representation as the neural training output.

The octonion distributivity example becomes `?H1 x1 (?H2 x2 x3) = ?H2 (?H1 x1 x2) (?H1 x1 x3)` (Section 3.1, p. 4, template 2). Instantiation replaces holes with supplied function symbols; ordinary variables remain fixed. The associativity example produces true instances for addition and list concatenation, but false ones for subtraction and exponentiation (Section 3.1, p. 4).

Verus form. Inference: a Verus adaptation could define a restricted expression datatype with shared hole identifiers and a specification for valid substitution. Consistent substitution and well-formedness would be separate proof obligations from the truth of an instantiated conjecture. The paper implements this in Isabelle, so it provides no evidence that such a Verus representation works.

## technique 2: symbolic constraint-based hole filling

What it is. Treat template holes as constraint satisfaction problem (CSP) variables, supplied functions as their possible values, and types and arities as constraints. The paper states: “We use standard forward checking (Haralick and Elliott, 1980) to efficiently prune the search space.” (Section 3.1, p. 4)

When to use it. Inference: use it when the desired lemma shape is available and a finite list of relevant functions can supply its concrete operators.

How to do it (Section 3.1, p. 4).

1. Supply a template and a list of function names.
2. Assign one supplied function symbol to each indexed hole, consistently across all occurrences.
3. Enforce function type signatures and hole arities.
4. Use forward checking to prune incompatible assignments.
5. Produce well-typed candidate lemmas. Proof or counterexample checks can then assess them, as in the paper's evaluation.

Verus form. Inference: encode a finite list of permitted symbols and specify which assignments produce well-formed expressions. An enumerator could search these assignments, while Verus separately checks any proposed mathematical lemma. This would require a new implementation and evaluation.

Evidence and limits. Table 1 (p. 7) reports 22.8% discovery for QuickSpec on the 350-lemma Octonions benchmark. With DeepSeek-coder-6.7B trained on HOL+AFP, the best individual Lemmanaid configuration reaches 78.9%, its ensemble across prompting strategies reaches 83.1%, and the ensemble also including direct neural conjecturing reaches 84.9%. These compare complete systems, rather than isolating the effect of forward checking. The authors report that QuickSpec generates several thousand lemmas with precision below 1% (Section 4.2, p. 7); Appendix H (p. 17) describes output close to 10,000 lemmas and examples the authors judge uninteresting.

## technique 3: neural template generation with structured context

What it is. Fine-tune a model to predict a template from symbols and associated context. The paper motivates type information as follows: “Although definitions provide more complete descriptions of symbols, types are more succinct and they often provide sufficient information to form well-typed templates and lemmas.” (Section 3.2, p. 5)

When to use it. Inference: use this split when analogous structures recur and symbolic instantiation can handle the concrete symbol choices.

How to do it (Section 3.2, pp. 4–5; Section 4.1, pp. 5–6).

1. Retrieve human lemmas through Isabelle/Isar using low-level ML code and Isabelle-client.
2. Recursively traverse term applications to collect constants and their associated types and known definitions.
3. Construct input/output pairs: a symbol list with types, definitions, or both as input, and the lemma's normalized template as output.
4. Fine-tune a model on these pairs. The evaluated backends are DeepSeek-coder-1.3B, DeepSeek-coder-6.7B, and Llama-3.2-1B.
5. Generate templates using greedy decoding and beam search with beam size four, then pass them to symbolic instantiation.

Verus form. Inference: collect Rust/Verus symbols and specification context, train or prompt a model to emit a restricted conjecture template, and instantiate it with known symbols. Each resulting claim would require its own Verus proof. The paper supplies no Verus training data or measured transfer results.

Evidence. Under HOL+AFP training, types plus definitions, and five predictions, DeepSeek-coder-6.7B Lemmanaid discovers 50.2% of HOL-test and 27.9% of AFP-test gold lemmas (Table 1, p. 7). Types alone reaches 28.6% on AFP-test. Combining Lemmanaid's prompting strategies reaches 55.1% and 34.8%; adding direct neural models reaches 58.6% and 42.7%. These are percentages of 4,740 HOL-test and 18,975 AFP-test tasks (Section 4.1, p. 6). Definitions alone performed worse in initial DeepSeek-1.3B experiments and were not explored for the other models (Section 4.2, p. 6).

Section 5 and Table 2 (p. 8) add a commercial-model comparison on Octonions and 139 tasks from two 2026 AFP entries (Appendix G.1, p. 16). On AFP-2026, types+definitions Lemmanaid with DeepSeek-6.7B reaches 41.7%, versus Claude Opus 4.5's 19.4% for template generation and 34.5% for direct lemma objects, and GPT-5.2's 15.8% and 25.2%. Commercial prompts use five selected examples and approximately 1,700 input tokens versus about 325 for fine-tuned template models. The authors acknowledge differences in training, compute, cost, and prompt sizes (Limitations, p. 9).

## technique 4: evaluate matches and classify conjectures

What it is. Compare predictions with human gold lemmas and separately classify generated statements using Sledgehammer, Nitpick, and Quickcheck. This is the reported evaluation procedure, not a demonstrated general novelty filter. The paper cautions: “The metric is therefore stricter than proving equivalence: predictions that are merely logically equivalent after rewriting or other reasoning can still be counted as misses.” (Section 4.1, p. 6)

When to use it. Inference: use the matching metric to measure recovery of existing expert statements, and the classification to distinguish proved candidates, refuted candidates, and unresolved ones.

How to do it (Section 4.1, p. 6; Section 4.3, pp. 7–8).

1. For each task, check whether the suggested set contains the gold-standard lemma, comparing Isabelle internal term representations in the source theory context. This accepts alpha-renamed variables and eta-contracted forms. Template predictions are compared through their term representations too.
2. Count gold-standard lemmas as true; classify additional conjectures proved by Sledgehammer as other true statements.
3. Classify conjectures with counterexamples from Nitpick or Quickcheck as false.
4. Leave conjectures unresolved when automated proof and counterexample attempts fail.

Verus form. Inference: generate a proof harness for each conjecture and run Verus. Testing could refute suitable concrete instances, but passing tests would leave the universal claim unproved. Matching an existing lemma and proving a new candidate should remain separate measurements.

Evidence. Under greedy decoding with DeepSeek-6.7B and HOL+AFP training, the HOL-test analysis reports 7,628 conjectures: 1,721 gold-standard (22.6%), 1,356 other true (17.8%), 1,802 false (23.6%), and 2,749 unresolved (36.0%) (Table 3, p. 8). Appendix F (pp. 15–16) gives examples, including a false totient-monotonicity conjecture that the automated counterexample tools leave unresolved. Thus unresolved does not mean true.

## scope, trust, and threat

The extracted datasets contain 62,816 HOL and 210,898 AFP datapoints; some AFP theories could not be processed because of import problems (Section 3.4 and footnote 6, p. 5). HOL training contains 57,576 tasks; adding pre-2024 AFP projects yields 249,098. AFP-test uses 2024 projects, and Octonions is excluded from all training sets (Section 4.1, p. 6). Neural baselines and Lemmanaid receive the same neural inference budget and prompt; Lemmanaid additionally receives up to 60 seconds of symbolic CPU search per task (Section 4.1, p. 6).

The authors explicitly limit the usefulness claim: “Evaluating whether the conjectures are actually useful for other, yet unknown, downstream tasks was not the goal of the evaluation, nor the question we aimed to answer in this paper.” (Limitations, p. 9) Proof attempts use only Sledgehammer; specialized or interactive proofs and human-usefulness studies remain future work. Pretraining leakage is mitigated by dataset dates, not ruled out, especially for development versions of the 2026 formalizations (Section 5, p. 8, footnote 8).

Inference: for VL, the transferable idea is neural proposal followed by typed symbolic instantiation and independent proof checking. A generated candidate remains untrusted until proved; the LLM and enumerator need not be trusted to establish its truth. Isabelle discovery rates do not establish Verus proof completion, contract correctness, or usefulness to Rust developers. A Verus adaptation would need to measure those outcomes directly. This paper does not establish how strongly Lemmanaid competes with a system for agent-written verified Rust.

## techniques for the catalog

- template normalization — replace theory-specific symbols with shared typed holes while preserving the designated logical vocabulary
- CSP hole filling — instantiate holes from supplied functions using type and arity constraints with forward checking
- structured neural proposal — train a model to predict templates from symbols, types, and definitions
- conjecture evaluation — compare internal terms with gold lemmas and classify other candidates using proofs and counterexamples

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Evaluating whether the conjectures are actually useful for other, yet unknown, downstream tasks was not the goal of the evaluation, nor the question we aimed to answer in this paper."): checked the entire paper, quotations, technique steps, numbers, section and page references, and paper link; corrected ensemble attribution, evaluation-versus-generation claims, input scope, and citations, and marked Verus transfers as inferences; did not reproduce experiments, inspect implementation code, or test a Verus adaptation.
