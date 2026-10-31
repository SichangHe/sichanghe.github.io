# MiniF2F in Rocq: Automatic Translation Between Proof Assistants — A Case Study
(authored by agents unless marked 🧑)
Tag: `viennot2025minif2f`, [paper](https://arxiv.org/abs/2503.04763v2)

## scope and result

This paper translates MiniF2F theorem statements into Rocq using natural-language descriptions and existing Lean and Isabelle formalizations. It reports 478 successful translations out of 488, not automatic translation of all 488: “we successfully translated 478 out of 488 theorems (98%) from MiniF2F to Rocq.” (Abstract, p.1) The task excludes proofs: “We deliberately focus only on theorem statements, ignoring proofs to isolate the translation challenge from proof generation complexity.” (§2, p.2)

The methodology checks generated statements with Petanque/pytanque for syntax and typing, then uses human semantic review: “Then, valid translations are reviewed by a human to ensure their semantic correctness with regards to the three input sources.” (§2, p.2) A separate expert audit of 150 randomly sampled successful translations found 3 Error, 32 Perfectible, and 115 Valid statements. (Table 1, p.3) Thus 478/488 measures translation coverage; 3/150 is the sampled semantic-error count.

Inference: this suggests a pattern for moving proof obligations into Verus, but supplies no evidence of Verus translation or proof correctness. A type-correct proposition can omit part of the requirement. The paper gives a maximum example: “For example, when expressing that m is the maximum of a function f, formalizing only that f is bounded above by m is insufficient, the statement must also ensure that this bound is attained.” (§4.3, p.5; mathematical typography normalized in this quotation)

## technique 1: cascading translation with verifier feedback

What it is. The paper uses increasingly expensive translation stages on remaining failures: “each stage only processes theorems that remained untranslated in previous stages.” (§2, p.2) Stage 1 evaluates GPT-4o mini, Claude-3.5-Sonnet, o1-mini, and o1 with one-shot prompts. Stage 2 uses Claude-3.5-Sonnet and o1-mini with error feedback. Stage 3 uses Claude-3.5-Sonnet with refined prompts and larger attempt limits. (§2, p.2)

When to use it. Inference: use this when a checker supplies useful syntax/type errors and model calls are costly. Report both cumulative counts and each stage's remaining input set to expose where effort was spent.

Steps from the paper.
1. Provide the natural-language description and existing Lean and Isabelle formalizations; request a Rocq theorem statement. (§2, p.2)
2. Check the candidate with Petanque/pytanque for syntactic and type-theoretic correctness. (§2, p.2)
3. On Stage 1 failures, use an interactive conversation allowing up to three translations per theorem; subsequent attempts include errors from previous attempts. The paper says “models can attempt up to three translations per theorem.” (§2, p.2)
4. For the hardest remaining statements, refine prompts using earlier error analysis and increase the maximum number of attempts from six to 24. (§2, p.2; Figure 1, p.3)
5. Review valid translations against the three input sources for semantic correctness. (§2, p.2)

Verus form. Inference: let the model emit a function signature, `requires`, `ensures`, and supporting `spec fn`s. Feed applicable compiler/verifier diagnostics into later attempts. A schematic translation target is:

```rust
fn translated(x: Input) -> (y: Output)
    requires source_hypothesis(x)
    ensures source_conclusion(x, y)
{ /* body or proof stub */ }
```

Inference: specification checking and proving an implementation need separate outcomes. An unfinished proof stub need not verify. Diagnostics cannot establish that `source_conclusion` captures the original requirement; retain the source and translated propositions for review.

Evidence and limits. Stage 1 reached up to 68% translation coverage. For Stage 2, the paper specifically reports that “claude successfully translated 31% of the theorems remaining after Stage 1”. (§3, pp.2–3) Figure 1 gives cumulative counts of 193, 273, 287, and 332 during Stage 1; 380 and 394 during Stage 2; and 465 and 478 during Stage 3. (Figure 1, p.3) Inference: these results show increasing cumulative coverage, but do not isolate the effect of prompt refinement from the additional attempts or establish a cost-normalized advantage over another retry policy.

## technique 2: checker acceptance followed by semantic audit

What it is. The authors distinguish Rocq acceptance from semantic correctness. Petanque ensures “that our translations are both syntactically and type-theoretically correct within the Rocq system.” (§2, p.2) Human review follows. Separately, experts audit a random sample: “Each expert reviewed a batch of 25 translations, comparing them against the natural language description as well as the Lean and Isabelle formalizations.” (§3, p.3)

When to use it. Inference: use a separate semantic prerequisite check when the source is natural language or a formalization that may omit requirements. A Verus proof establishes the contract supplied to the verifier, so a reviewer must also assess that contract.

Steps from the paper.
1. Randomly sample 150 successful translations, described as approximately 30% of successful translations. (§3, p.3)
2. Have experts compare batches of 25 against natural language, Lean, and Isabelle. (§3, p.3)
3. Classify Error when the translation does not correspond to the original problem, Perfectible when correct but improvable, and Valid when no modification is needed. (§3, p.3)
4. In the separate faithfulness analysis, investigate mismatches in the source formalizations as well as the generated translations. (§4.3, p.5)

Verus form. Inference: retain the requirement, source formal statement, and Verus contract. Have a reviewer check quantifiers, extrema, assumptions, and boundary cases. Then prove the implementation satisfies the contract. Human review supplies evidence outside the verifier; an `external_body` declaration would not establish semantic correspondence.

Evidence and limits. Table 1 reports 3 Error, 32 Perfectible, and 115 Valid statements out of 150. (p.3) The text calls these “The low error rate (2%) and high rate of perfect translations (77%)”. (§3, p.3) Appendix A.1 shows an erroneous use of Rocq's `Q` type without the required relatively prime numerator and denominator; its correction introduces explicit numerator and denominator variables and a greatest-common-divisor hypothesis. (p.7) Inference: the audit does not establish an error rate for the other 328 successful translations, and human review remains a trusted component.

## technique 3: source triangulation and faithfulness testing

What it is. The ablation uses o1-mini on the same 100 theorems as the model comparison, varying which input sources it receives. (§§4.1–4.2, p.4) The faithfulness analysis distinguishes source errors from translation errors: “When both Lean and Isabelle formalizations were provided, mismatches originated from these reference versions (e.g., the maximum example above; see also Appendix A.3) in all but one case.” (§4.3, p.5)

When to use it. Inference: compare multiple source representations when porting contracts across proof systems. Differences can reveal an omission in a source formalization, but additional input can also give a model conflicting guidance.

Steps from the paper.
1. Test informal-only, Lean-only, Lean plus Isabelle, and all-three prompt variants using o1-mini. (§4.2, p.4)
2. Measure pass@1 and pass@3 on the fixed 100-theorem subset, with human semantic review. (§§4.1–4.2, p.4)
3. Compare the informal-only and all-three strategies for faithfulness to the natural-language problem. (§4.3, p.5)
4. Examine mismatches and whether source formalizations already contain them. (§4.3, p.5; Appendix A.3, pp.7–8)

Verus form. Inference: encode the original requirement and reference predicate separately, then prove their equivalence before relying on a translated contract. If only one implication is established, state that direction and leave the other explicit.

Evidence and limits. Table 2 reports pass@1/pass@3 of 43%/65% for informal-only, 35%/62% for all three inputs, 41%/62% for Lean plus Isabelle, and 40%/56% for Lean-only. (p.4) These percentages concern the 100-theorem experiment, not the 488-theorem cascade. The faithfulness analysis says informal-only prompting “produces more Rocq-accepted theorems but exhibits a higher overall error rate compared to including both Lean and Isabelle formalizations.” (§4.3, p.5) It also reports a larger proportion of faithfulness errors among total errors when formal versions are provided. (§4.3, p.5) Inference: more accepted statements need not mean better semantic accuracy, and source formalizations need independent scrutiny.

## technique 4: limits of LLM semantic judging

What it is. DeepSeek R1 judges translations from the RQ1 and RQ2 experiments against human assessments. The paper reports: “DeepSeek R1 and human reviewers agreed on 95.2% of translations.” It adds: “However, the model demonstrated limited accuracy in error detection: it failed to recognize 41.7% of errors identified by human reviewers.” (§4.4, p.5)

When to use it. Inference: an LLM judge may help prioritize review or suggest explanations, but these results do not support replacing human semantic review.

Evaluation procedure from the paper.
1. Compare DeepSeek R1 judgments with human evaluations from the model-comparison and input-ablation experiments. (§4.4, p.5)
2. Report overall agreement and the fraction of human-identified errors the model missed. (§4.4, p.5)
3. Interpret faithfulness labels carefully: Appendix A.4 says “F classifications by humans are considered valid for DeepSeek R1, as they align with the Lean and Isabelle formalizations in most cases”. (p.9)

Verus form. Inference: a judge may propose contract checks or counterexamples. Require a checked proof of the contract and an independent review of its correspondence to the requirement. A model judgment alone supplies neither.

Evidence and limits. The 95.2% agreement and 41.7% missed-error figures concern the RQ1/RQ2 translations, not the separate 150-theorem audit. (§4.4, p.5) Appendix A.4 lists three attempts for each experimental configuration, distinguishes type-check failures from semantic labels, and shows human and DeepSeek R1 assessments. (pp.9–11) Inference: overall agreement can conceal poor error detection; the convention treating human faithfulness errors as valid for the judge also limits what agreement says about natural-language fidelity.

## what is proved, measured, and trusted

The work checks statement syntax and typing, measures translation coverage, and evaluates semantic quality through human review and model comparisons. Its scope is explicit: “We deliberately focus only on theorem statements, ignoring proofs to isolate the translation challenge from proof generation complexity.” (§2, p.2) It supplies no proofs of the translated statements. The 150-theorem audit reports sampled errors rather than a proof of semantic equivalence for the full translated dataset. (§3, p.3)

Inference: applying this method to verified Rust would require trusting the verifier, its model of the program, the source requirement, and the reviewers' interpretation. Proving a weak contract does not recover an omitted requirement. Translation acceptance, proof success, and requirement fidelity therefore need separate evidence.

## techniques for the catalog

These are inferred adaptations of the paper's methods, not evaluated Verus techniques.

- cascading verifier-feedback translation — increase attempts on remaining failures and supply checker errors to later attempts
- machine acceptance plus semantic audit — check syntax and typing, then compare the proposition with the intended requirement
- source comparison and ablation — vary formal and informal inputs and investigate source omissions
- LLM semantic-judge evaluation — measure agreement and missed errors against human review before assigning the judge a role
