# MiniF2F in Rocq: Automatic Translation Between Proof Assistants — A Case Study
(authored by agents unless marked 🧑)
Tag: `viennot2025minif2f`, [paper](https://www.semanticscholar.org/paper/5742fd3bd01f1dc8d770fd653c5f3fcdacae79d2)

## scope and result

This paper ports all 488 MiniF2F theorem statements from Lean and Isabelle to Rocq. It deliberately translates statements, not proofs, so that language and type-system translation is separated from proof generation. The three-stage cascade starts with one-shot prompting, retries failures with Rocq error feedback, and then uses refined prompts with 6–24 attempts for the hardest cases. The abstract reports: “we successfully translated 478 out of 488 theorems (98%) from MiniF2F to Rocq.” (Abstract, p.1)

Every generated statement is checked by Petanque/pytanque for Rocq syntax and typing, then reviewed by a human against the natural-language problem and both source formalizations. (§2, p.2) Expert audit of a random 150 successful translations found 115 valid, 32 perfectible, and 3 errors. (Table 1, p.3) Those denominators matter: 478/488 is automatic translation success; 3/150 is the sampled semantic-error count, not an error rate over all 488.

Inference: this is a directly reusable pattern for moving proof obligations into Verus, but it does not establish proof correctness. A Rocq type check only establishes that the translated proposition is well-formed; a semantically weakened proposition can still pass. The paper itself gives a maximum example in which asserting only that a function is bounded above by `m` omits the requirement that the bound is attained. (§4.3, p.5)

## technique 1: cascading translation with verifier feedback

What it is. The cascade spends cheap attempts on easy statements, then applies interactive correction and more attempts only to failures. Stage 1 uses one prompt containing natural-language, Lean, and Isabelle inputs. Stage 2 allows up to three attempts per remaining theorem and includes Petanque errors in the next prompt. Stage 3 uses Claude, targeted prompts based on prior error analysis, and 6–24 attempts. (§2, pp.2–3)

When to use it. Use this when a checker gives precise syntax/type errors and model calls are costly. Keep each stage's denominator as the remaining set, because cumulative percentages can hide where effort was spent.

Steps from the paper.
1. For each theorem, present the natural-language description and existing formal statements; ask for a Rocq statement. (§2, p.2)
2. Run the candidate through Petanque; retain only syntactically and type-theoretically valid outputs. (§2, p.2)
3. For each failure, make up to three new attempts containing the previous Rocq error message. (§2, p.2)
4. For the hardest remaining statements, refine the prompt from observed failures and increase attempts from six to 24. (§2, p.2)
5. Human-review valid outputs for semantic correspondence before accepting the dataset. (§2, p.2)

Verus form. Inference: use a Rust/Verus parser-and-verifier loop in which the model emits a function signature, `requires`, `ensures`, and supporting `spec fn`s. Feed compiler/verifier diagnostics back into the next attempt. A minimal statement-translation target is:

```rust
fn translated(x: Input) -> (y: Output)
    requires source_hypothesis(x)
    ensures source_conclusion(x, y)
{ /* body or proof stub */ }
```

Inference: Verus diagnostics can reject ill-typed specifications and failed proofs, but they cannot decide whether `source_conclusion` captures natural-language intent. Keep the source proposition and generated Verus proposition as separate artifacts for review.

Evidence and limits. Stage 1 reached rates up to 68%; Stage 2 translated 31% of the theorems remaining after Stage 1; Stage 3 left ten untranslated and finished at 478/488. (§3, pp.3–4) Inference: the stages improve cumulative coverage, but the paper does not give a cost-normalized comparison against spending the same attempts in one stage. A Verus pipeline inherits failures from diagnostics that are incomplete or misunderstood, and repeated retries can converge to a type-correct but weakened contract.

## technique 2: checker acceptance followed by semantic audit

What it is. The authors separate machine validity from faithfulness. Petanque ensures “that our translations are both syntactically and type-theoretically correct within the Rocq system.” (§2, p.2) A human then compares each valid statement with all three input sources. The audit categories are Error, Perfectible, and Valid. (§3, p.3)

When to use it. Use a second semantic gate whenever the source is natural language or another formalization with possible omissions. This is essential for VL because Verus can prove the exact contract supplied to it, including an accidentally weak one.

Steps from the paper.
1. Sample 150 successful statements, approximately 30% of successful translations. (§3, p.3)
2. Have experts compare each with natural language, Lean, and Isabelle. (§3, p.3)
3. Label an Error when it does not correspond, Perfectible when correct but stylistically improvable, and Valid when no modification is needed. (§3, p.3)
4. Inspect mismatches for source-formalization defects as well as model errors. (§4.3, pp.5–6)

Verus form. Inference: retain a natural-language requirement, a source formal statement, and a Verus contract; require a reviewer to check quantifiers, extrema, ownership assumptions, and boundary cases. Then run Verus to prove the contract. Do not encode the human review as an `external_body` function or as a run-time proof call: it is evidence outside the verifier.

Evidence and limits. The audit found 3 errors, 32 perfectible statements, and 115 valid statements out of 150. (Table 1, p.3) The paper reports a 2% sampled error rate and 77% perfect translations (115/150). (§3, p.3) It also found that an LLM can accept a proposition that is formally valid but semantically incomplete: a maximum requires both an upper bound and attainment. (§4.3, p.5) Inference: 3/150 is a confidence signal, not a guarantee about the unsampled 328 successful statements. Human review remains a trusted component.

## technique 3: source triangulation and faithfulness testing

What it is. The generator receives three views: natural language, Lean, and Isabelle. The authors ablate these inputs on the same 100 theorems using o1 mini and compare pass@1 and pass@3. (§4.2, p.4) They also test faithfulness because formal source versions can disagree with the natural-language problem.

When to use it. Use multiple source representations when porting contracts or APIs across proof systems. Triangulation can expose a source's own bug; it can also confuse a model if contradictory definitions are included.

Steps from the paper.
1. Run prompt variants: informal only, Lean only, Lean plus Isabelle, and all three. (§4.2, p.4)
2. Measure pass@1 and pass@3 on a fixed 100-theorem subset. (§4.1–4.2, pp.4–5)
3. Compare accepted statements with the informal problem to identify faithfulness errors. (§4.3, p.5)
4. Trace each mismatch to a source formalization or generated translation. (§4.3, pp.5–6)

Verus form. Inference: use the original requirement and an independently encoded reference predicate as separate `spec fn`s, then prove an equivalence lemma before using the translated contract. If full equivalence is unavailable, record the direction proved and keep the unproved direction explicit.

Evidence and limits. On the 100-theorem comparison, informal-only prompting achieved pass@1 43% and pass@3 65%; all inputs achieved 35% and 62%; Lean-only achieved 40% and 56%. (Table 2, p.4) These are percentages over 100 theorems and are not the 478/488 cumulative results. The paper observes that informal-only prompts accepted more statements but had a higher overall error rate, while formal inputs increased the share of faithfulness errors. (§4.3, p.5) Inference: more source text is not automatically safer; a VL translator should detect contradictions instead of blindly concatenating references.

## technique 4: limits of LLM semantic judging

What it is. The authors compare DeepSeek R1's semantic judgments with human evaluations. Agreement was 95.2%, but the model failed to recognize 41.7% of errors identified by humans. (§4.4, p.6) The paper concludes: “human review remains necessary for this task.” (§4.4, p.6)

When to use it. Use an LLM judge for triage, prioritization, or explanations, not as the sole semantic gate. Pair it with source comparison, adversarial examples, and a verifier.

Steps from the paper.
1. Give the judge the same translations assessed by humans. (§4.4, p.6)
2. Compare model and human labels and compute agreement and missed-error rates. (§4.4, p.6)
3. Treat missed semantic errors as blocking evidence against replacing human review. (§4.4, p.6)

Verus form. Inference: an LLM judge may propose contract checks or counterexamples, but the final gate should be Verus proof plus an independent requirement review. A judge's output cannot satisfy an `ensures` clause unless converted into checked proof obligations.

Evidence and limits. The 95.2% agreement and 41.7% missed-error rate use the paper's human-labeled sample; no denominator beyond that evaluation set is supplied in the main text. Inference: high agreement can coexist with unacceptable false negatives when the target is semantic safety. This is a direct threat to agent-written verified Rust if the judge approves a weakened `ensures` clause.

## what is proved, measured, and trusted

The paper proves machine-checked Rocq well-formedness of 478 generated statements and measures cumulative translation counts, pass@1/pass@3, input ablations, expert labels, and LLM-human agreement. It does not prove the statements' intended mathematical meaning automatically, translate proofs, or show that all 478 have faithful semantics. Trusted elements are Petanque/Rocq, source formalizations, natural-language interpretation, human audit, and the model prompts.

Inference: Verus adds a stronger executable-code contract gate but leaves the same specification problem. A proof can establish an omitted or overly weak requirement. The paper's example and its 3/150 errors show that type checking and proof checking are necessary but insufficient for VL's product claims.

## what VL should reuse and avoid repeating

Inference: reuse cascading retries, precise verifier feedback, source triangulation, separate type/proof validity from semantic faithfulness, and denominator-specific audits. Inference: do not redo a benchmark port merely to count translated statements; the missing VL work is a Rust/Verus corpus with independent requirement checks, proof success, semantic defects, and repair cost reported separately.

## techniques for the catalog

- cascading verifier-feedback translation — spend increasing attempts on failures and feed exact checker diagnostics into later prompts
- machine gate plus semantic audit — require syntax/type/proof acceptance, then compare the result with the intended requirement
- source triangulation and ablation — use multiple formal and informal references, test their effect, and detect contradictory source contracts
- LLM judge as triage — measure agreement and missed errors against human review, and keep semantic acceptance independent

Checked 2026-10-15 against the paper by a Codex agent for minif2f_in_rocq_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
