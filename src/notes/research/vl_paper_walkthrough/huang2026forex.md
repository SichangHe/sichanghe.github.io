# ForEx: A Formal Verification Framework for Explainable Reasoning in Logical Fallacy Detection and Annotation
(authored by agents unless marked 🧑)
Tag: `huang2026forex`, [paper](http://arxiv.org/abs/2606.21867v1)

## what the paper verifies

ForEx evaluates whether an LLM’s explanation can be translated into a Lean4 derivation from premises encoded by the reasoner. It does not verify the original natural-language argument. The abstract says: “We propose ForEx (Formal Verification for Explainable Reasoning), a framework that translates LLM-generated explanations into Lean4 and verifies whether the translated rationale is derivable under encoded premises, not the logical validity of the original natural language argument.” (Abstract, p. 1.) The paper repeats the trust boundary: “A successful Lean4 verification therefore certifies only that the translated conclusion is derivable from the encoded premises within the given formalization.” (Introduction, p. 2.)

## technique 1: candidate generation with an explicit formalization

What it is. A Reasoner receives a statement and produces at most (k) candidates. Each candidate (c_i=(f_i,a_i,s_i)) contains a predicted fallacy (f_i), a natural-language argument (a_i), and a Lean4 structure (s_i). A Modifier converts (s_i) into initial Lean4 code. (Section 3, Fig. 1, p. 2.) The paper’s example formalizes “Faulty Generalization” with predicates `is_vague`, `lacks_specificity`, `draws_broad_conclusion`, and `faulty_generalization`; an axiom says the first three premises imply the conclusion, and a theorem applies the axiom. (Section 3, Fig. 2, p. 3.)

When to use it. Use this technique when the output contains both a claim and an explanation that must be checked separately from the task label. Set (k) high enough for the desired alternative readings; in the experiment (k≤3), the maximum number of labels observed per instance. (Section 4, p. 4.)

How to apply it.

1. Ask the Reasoner for the label, natural-language rationale, and formal structure. (Section 3.)
2. Have the Modifier translate the formal structure into compilable Lean4. (Section 3.)
3. Encode only the premises and rule schema represented by the rationale. The example uses an axiom and a theorem application. (Section 3, Fig. 2.)
4. Interpret a successful proof as derivability under those premises, not as validation of the source text. (Section 3.)

Verus form. Inference: represent the candidate rationale as a `spec fn` relation or predicates, state the encoded premises in `requires`, and state the conclusion in `ensures`; prove the relation with a `proof fn` or lemma body using `assert` and existing proof lemmas. Inference: keep the natural-language-to-spec translation as an explicit artifact and review boundary. The paper is Lean4-specific, so these Verus constructs and the translation workflow are an adaptation, not reported results.

Evidence and limits. The paper supplies one small Lean4 example but no accuracy denominator for the example. Its formal result is conditional on the encoded predicates and axiom. Inference: an unsound or overly strong axiom can make a candidate pass while saying little about the underlying argument.

## technique 2: compiler-feedback repair with semantic-drift control

What it is. The second stage executes the generated Lean4. If compilation fails, an Executor receives the error message and the original explanation and revises the code. The paper says: “To reduce semantic drift, revisions are constrained to rely only on (a_i) and the Initial Lean4 Code; the Executor is not allowed to introduce new logical content or alter the underlying rationale provided by the Reasoner.” (Section 3, p. 3.)

How to apply it.

1. Compile the initial code. (Section 3.)
2. On failure, provide the compiler error, original rationale, and current code to the Executor. (Section 3.)
3. Repeat until Lean4 returns success or the repair budget is exhausted. The experiment uses a maximum of four repair iterations. (Section 4, p. 4.)
4. Pass the final candidate to the label-consistency checker. (Section 3.)

The paper’s Table II reports cumulative pass rates, with denominator equal to Modifier outputs for each listed Reasoner model. Across models, the average is 36.70% before repair, 91.11% after one iteration, 97.37% after two, 98.39% after three, and 98.65% after four. For example, GPT-5 (thinking) rises from 47.89% to 93.07%, 98.79%, 99.99%, and 99.99%; Claude Sonnet 4.5 (thinking) rises from 14.63% to 94.31%, 100.0%, 100.0%, and 100.0%. (Section 4, Table II, p. 4.)

Inference: the sharp first-round increase suggests compiler feedback fixes many surface errors, but the paper does not measure whether repaired proofs preserve the intended semantics beyond its no-new-content constraint. A Verus implementation would compile generated Rust/Verus, feed diagnostics back to the agent, and forbid adding unrequested specifications or `assume` statements. Inference: a review rule should reject `external_body` on the function being verified, because it would move the proof obligation into the trusted base; this trust rule is an adaptation, not a ForEx result.

## technique 3: LLM Argument Verification Matrix

What it is. ForEx records two independent axes: Lean4 verification (the translated chain compiles) and label consistency (the predicted fallacy matches the human annotation). The four cells are Compilable-Correct, Compilable-Alternative, Uncompilable-Correct, and Uncompilable-Incorrect. The paper states: “The matrix separates label consistency from formal verification status, allowing us to analyze whether a model’s predicted label is accompanied by a reasoning chain that can be formalized and verified under the encoded premises.” (Section 3, Table I, p. 3.)

How to use it. For each predicted label, classify the compiled proof and compare the label to the human annotation. Report CC+CA when asking whether a prediction has a compilable rationale, and CC when asking whether it also matches the annotation. In Table III, `Count` is the number of evaluated label-level predictions, not instances; the paper explicitly notes that models can output fewer than (k) labels. (Section 4, Table III, p. 4.)

Results. CC+CA ranges from 89.52% for Gemini 2.5 Flash (thinking) to 97.59% for GPT-5 (thinking), with each denominator the model’s Table III count (193–302 predictions). GPT-5 has Count 290: CC+CA 97.59%, CC 17.93%, CA 79.66%, UC 0.34%, and UI 2.07%. The average CC+CA is not the same as average CC: the table reports high compilability alongside much lower exact label agreement. (Section 4, Table III, p. 4.)

## technique 4: consensus-guided label augmentation

What it is. Each model becomes a 14-dimensional multi-hot vector over 13 fallacy classes and no-fallacy. The pipeline averages verified outputs per model, projects model signatures with PCA, removes models outside a 95% Mahalanobis confidence ellipse, computes pairwise Jaccard disagreement for each statement, retains statements at or below the first quartile, and adds a label only when at least 50% of retained models support it. (Section 3, pp. 3–4.)

How to apply it.

1. Build a multi-hot vector for every verified model output. (Section 3.)
2. Average vectors over statements to obtain each model’s behavioral signature. (Section 3.)
3. Use PCA for an interpretable two-dimensional view and exclude outliers beyond the 95% confidence ellipse. (Section 3.)
4. Compute pairwise Jaccard-distance disagreement for each statement and retain the lowest-disagreement quartile. (Section 3.)
5. Add a label only if at least half of retained models assign it under verification. (Section 3.)
6. Compare the augmented labels with the original human labels using recall over statement-label pairs. (Section 3.)

The evaluation uses 1,074 LOGIC-Climate instances, samples 107 (10%) while preserving category balance, and tests 15 Reasoner models. The first quartile is approximately 25% of the sampled dataset; 27 statements receive augmentation; recall against original human annotations is 0.77. (Section 4, pp. 4–5.) These denominators are separate: 1,074 is the source dataset, 107 the evaluation sample, 15 the model count, and 27 the augmented statements.

Inference: this method is useful for discovering candidate interpretations, not for silently rewriting a specification. The authors call the result “a demonstration of conservative, consensus-guided label expansion rather than evidence of annotation quality improvement.” (Section 4, p. 5.) In a Verus workflow, consensus could prioritize contracts for human review, but it cannot establish that a requirement is correct.

## evidence, assumptions, and failures

The paper’s headline “over 90%” formal-pass result depends on the repair setting and model-level output counts: Table II’s average reaches 91.11% after one repair and 98.65% after four. Label agreement is around 20% in the abstract, consistent with Table III CC values near 18–23% for many models, but “around 20%” is a summary rather than one common denominator. The paper reports a median Jaccard distance of 0.63 (Q1 0.56, Q3 0.71) across statements. (Section 4, pp. 4–5.)

What stays trusted is the natural-language formalization, generated Lean4 structure before checking, encoded premises and axioms, the human labels, and the Lean4 kernel/toolchain.

The authors identify several limitations. “Formal verification does not guarantee semantic alignment between the formalized reasoning and the original natural language.” (Section 4, p. 5.) Limited context can cause No-Fallacy predictions that disagree with broader human context; UC is generally below 2%, but this is a model-level table result, not a universal property. The 27 augmented statements and 0.77 recall show a small, conservative augmentation experiment, not improved annotation quality. Inference: threat to agent-written verified Rust is medium at the specification boundary and low as evidence that an agent can autonomously prove arbitrary Rust correct.

## techniques for the catalog

- candidate-to-Lean formalization: generate labels, explanations, and formal structures, then check derivability under explicit encoded premises
- semantic-drift-controlled repair: use bounded compiler-feedback iterations while forbidding new logical content
- argument verification matrix: report formal proof status independently from agreement with a reference label
- consensus-guided augmentation: filter verified model interpretations by confidence and Jaccard consensus before proposing new labels
