# Can LLMs Reason About Program Semantics? A Comprehensive Evaluation of LLMs on Formal Specification Inference
(authored by agents unless marked 🧑)
Tag: `lecong2025can`, [paper](https://arxiv.org/abs/2503.04779)
## scope and measured object

Le-Cong, Le, and Murray evaluate whether language models can infer complete, consistent formal specifications from ordinary Java programs paired with natural-language descriptions. They release FormalBench: 700 manually validated Java programs plus 6,219 semantically transformed variants (Section 3.1, p. 3). Specifications are written in JML and checked by OpenJML. The abstract reports that models “perform well with simple control flows but struggle with more complex structures, especially loops, even with advanced prompting” (Abstract, p. 1).

The paper separates consistency (the generated specification is well-formed and true for the implementation) from completeness (the specification covers the program's properties), and treats unknown verifier results as a third outcome rather than as failures (Section 2 and Section 3.2, pp. 2–4). Inference: for VeruLaw, this is evidence about specification inference and evaluation design, not proof-generation ability. JML/Java syntax and OpenJML behavior do not directly establish performance on Rust or Verus.

## technique 1: manually validated benchmark construction

What it is: build a specification-inference benchmark whose programs are checked against natural-language intent before evaluating models. The authors begin with 966 MBXP-generated Java programs, retain 824 passing the MBJP tests, then manually inspect each candidate, add adversarial inputs, and validate behavior against its intent, producing 700 FormalBench-Base programs (Section 3.1, p. 3).

How to apply:

1. Start with executable programs paired with natural-language descriptions (Section 3.1, p. 3)
2. Run the available test suite and discard candidates that fail it (Section 3.1, p. 3)
3. Manually inspect each remaining implementation, add adversarial inputs, and compare behavior with the stated intent (Section 3.1, p. 3)
4. Keep the validated programs and cover sequential, branching, single-path loop, multi-path loop, and nested loop structures (Section 3.1, p. 3)

Verus form: Inference: construct VL benchmark items from ordinary Rust, tests, examples, callers, and project documentation, then have a human or trusted reference proof validate the intended contract before exposing it to an agent. Include ownership, borrowing, collections, state machines, and unsafe boundaries in the control-flow and feature taxonomy. A passing Rust test suite is only a filter; the Verus specification and proof are the consistency oracle.

Evidence and limits: The paper states, “The result is FormalBench-Base, a rigorously validated dataset of 700 programs with provably correct implementations.” (Section 3.1, p. 3). The 700-item base is manually validated, but the paper calls the MBJP suite “generally weak” and therefore adds adversarial review (Section 3.1, p. 3). The benchmark covers Java/JML because that ecosystem has mature mutation and verification tooling; the authors explicitly limit generality beyond Java (Section 7, p. 10).

## technique 2: semantic-preserving diversity for robustness

What it is: apply 18 transformations that preserve program behavior but change syntax, naming, expressions, or statements. The transformations expand FormalBench-Base into 6,219 FormalBench-Diverse variants (Section 3.1, p. 3). The robustness subset FormalBench-Diverse-N contains 1,794 natural transformations used for the main comparison (Section 4.3, p. 7).

How to apply:

1. Start with the validated FormalBench-Base programs (Section 3.1, p. 3)
2. Apply transformations at naming, expression, and statement levels, such as variable renaming, equivalent-expression changes, or switch-to-if conversion (Section 3.1, p. 3; Appendix A, p. 14)
3. For the natural subset, rank transformations by relative cross-entropy change, select 50% by naturalness, and retain programs with at least three transformations (Appendix E, p. 15)
4. Evaluate generated specifications on the original and transformed programs, normalizing metrics over applicable transformations for each reference program (Section 3.2, p. 4; Appendix B.3, p. 15)
5. For original programs whose generated specifications verify, compute the fraction of transformed programs whose newly generated specifications do not verify, including unknown results (Appendix B.3, p. 15)

Verus form: Inference: create equivalent Rust refactorings—renamed variables, reordered equivalent expressions, desugared control flow, and API-preserving wrappers—while checking semantic equivalence with Verus or a trusted reference. Freeze specifications where possible so the test measures reasoning robustness rather than a changed contract. Exclude transformations that alter ownership or observable behavior unless equivalence is independently proved.

Evidence: Table 2 evaluates three models on the base and transformed sets. DeepSeek-V3 has 9.3% success and 62.1% failure on the base versus 7.8% and 65.0% on FormalBench-Diverse-N, with a 27.2% flip rate; Claude-3.5-Sonnet has 10.0%/64.1% versus 8.3%/64.3% and a 39.2% flip rate; GPT-4o has 11.9%/60.1% versus 10.9%/64.1% and 29.2% flip rate (Table 2, p. 8). Appendix B.3 (p. 15) defines each transformed-program metric as the average over applicable transformations for a reference program; flip rate is conditional on verification success for the original program.

## technique 3: consistency, completeness, and unknown metrics

What it is: evaluate generated specifications along separate dimensions. OpenJML produces Verification Success, Verification Failure, or Unknown (Section 3.2, p. 4). Success Rate is the proportion that verify; Failure Rate is the proportion that fail. The prose describes Completeness Rate as the fraction of mutants that fail to satisfy the specification (Section 3.2, p. 4). The formal definition counts every mutant whose verification result is not `ok`, including unknown results (Appendix B.2, p. 15). Equivalent-mutant suppression reduces, but does not eliminate, equivalent mutants (Section 7, p. 10).

How to apply:

1. Insert the model's JML annotations into the original program (Sections 2–3, pp. 2–4)
2. Run OpenJML and classify each result as success, failure, or unknown; retain unknown separately because it may indicate insufficient specification or tool limits (Section 3.2, p. 4)
3. Generate mutants with Major 3.0.1 and apply EMS to suppress equivalent mutants (Appendix B.2, p. 15)
4. Compute completeness as mutants with a verification result other than `ok` divided by all retained mutants (Appendix B.2, p. 15)
5. Compare the metric with human judgments on a sample; the paper reports a 0.72 Cohen's kappa and means `0.91 ± 0.08` for complete versus `0.77 ± 0.19` for incomplete specifications (Section 3.2, p. 4)

Verus form: Inference: report at least three outcomes for VL: Verus pass, Verus failure, and unknown/timeout or unsupported feature. Measure completeness with behavior-changing Rust mutants whose incorrectness is independently established, then report detected mutants over non-equivalent mutants. A Verus pass proves only the generated contract, so a separate intent and mutation oracle is required.

Evidence and limits: The paper defines the method directly: “Mutation analysis generates non-equivalent mutant variants of input programs by introducing artificial faults.” (Section 2, p. 3). Mutation analysis is a proxy, not a proof of semantic completeness. The authors report that equivalent mutants can evade detection and manually inspect 20 programs containing 232 mutants; three (1.3%) were equivalent after suppression (Section 7, p. 10). The paper explicitly says, “Consequently, we classify “unknown” as a distinct outcome category in our study.” (Section 3.2, p. 4). The authors qualify their assessment: “Manual inspection suggests that these cases are generally associated with higher-quality specifications compared to those with verification failures; yet, they introduce ambiguity due to inherent limitations in deductive verification tools.” (Section 7, p. 10).

## technique 4: prompt-controlled specification inference

What it is: compare performance under zero-shot, few-shot, chain-of-thought (CoT), and least-to-most (LTM) prompts. Few-shot prompts add JML syntax guidance and two demonstrations; LTM supplies human-instructed decomposition (Section 4.1, pp. 5–6; Appendix I, pp. 21–22).

How to apply:

1. Use a system instruction requiring JML annotations compatible with OpenJML, including preconditions, postconditions, loop invariants, assertions, and assumptions (Appendix I, p. 21)
2. For few-shot evaluation, add two demonstration examples and explicit JML comment syntax rules (Section 4.1, p. 5; Appendix I, p. 21)
3. For CoT, request step-by-step reasoning while keeping the output specification in the required format (Appendix I, p. 21)
4. For LTM, ask for weakest preconditions, including nullness and arithmetic bounds; strongest postconditions; and the loop invariants, assertions, assumptions, and ranking functions needed to prove those postconditions (Appendix I, p. 22)
5. Use the reported temperature of 0.7 and open-source generation limit of 2,048 tokens (Section 4, p. 4)
6. Compare success, failure, and completeness (Table 1, p. 5). Treat cost estimates separately: the authors tracked costs retrospectively, only for models with available statistics, using API pricing and token usage (Section 4.1, p. 6, footnote 1)

Verus form: Inference: prompt a VL agent to output `requires`, `ensures`, loop `invariant`, and proof code while forbidding unsupported trust escapes. Few-shot examples should use valid Verus syntax from the pinned toolchain. LTM can decompose intent into state model, preconditions, postconditions, loop facts, and proof obligations, but every generated claim still requires Verus and intent validation. CoT text is process evidence, not proof evidence.

Evidence: Table 1 reports DeepSeek-V3 success rising from 15.5% with few-shot to 16.6% with LTM, completeness from 85.2% to 89.6%, and failure near 56–57% (Table 1, p. 5). GPT-4o rises from 13.4% few-shot to 15.0% LTM, while Claude-3.5-Sonnet rises from 14.7% to 15.4% (Table 1, p. 5). CoT is mixed: it raises DeepSeek-V3 from 15.5% to 16.2% but raises GPT-4o's failure from 56.4% to 61.5% and Claude's from 53.1% to 59.1% (Section 4.2, p. 7).

## technique 5: failure taxonomy and verifier-guided self-repair

What it is: classify verifier failures, then feed the category, guidance, and examples back to the model. The authors identify 32 failure categories and focus on syntax errors, unsupported quantifiers, postcondition failures, loop-invariant failures, arithmetic ranges, null dereferences, divide-by-zero, and array-index errors (Section 4.4.1, pp. 7–8; Appendix H, pp. 17–21).

How to apply:

1. Separate failures at multiple locations into atomic errors, manually identify recurring diagnostic patterns, and build a pattern-matching classifier (Appendix H, p. 17)
2. Provide the current annotated code, diagnostic, category, guidance, and examples in a follow-up prompt (Section 4.4.2, p. 8; Appendix J, pp. 22–24)
3. Request: “Please refine the specifications so that they can pass verification.” (Appendix J, p. 22)
4. Evaluate self-repair with feedback over successive iterations; the paper reports declining repair rates and saturation, without specifying a stopping rule here (Section 4.4.2, pp. 8–9; Figure 5, p. 9)
5. Optionally apply SpecGen's mutation-based repair for verification failures; the authors recommend using it sparingly, ideally as a final step, because of frequent verifier calls (Section 4.4.2, pp. 8–9)

The paper says zero-shot models produce about 25% invalid responses, falling to 5% with few-shot and 1% with LTM (Section 4.4.1, p. 8). For repair, custom prompts improve success from 16% to 20% and reduce failure from over 50% to under 30%; first-iteration repair fixes 53.7% of syntax errors, 79% of loop-invariant failures, and 65% of postcondition failures (Section 4.4.2, p. 8).

Verus form: Inference: classify Verus diagnostics such as failed `ensures`, loop-invariant preservation, arithmetic overflow, missing permission, and unsupported specification code. Feed the exact diagnostic and a local repair suggestion to an agent, then rerun Verus. Enforce a policy that forbids changing the contract to a weaker claim without a separate intent check, and reject `external_body` or runtime proof calls according to VL's trusted-base policy.

Evidence and limits: Repair rates decline and saturate across iterations; mutation-based repair cannot address every category, including arithmetic-range errors, and requires frequent verifier calls (Section 4.4.2, p. 9). The paper evaluates repair on only the top three models, not all models in Table 1 (Section 4.4.2, p. 8).

## what is proved, measured, and trusted

The paper measures model-generated JML consistency with OpenJML, completeness through Major mutants, robustness under 1,794 semantics-preserving transformations, and self-repair over repeated verifier feedback. Inference: a complete mutant-detection score does not establish complete natural-language intent. This evaluation relies on manual benchmark validation, the correctness of the mutation operators and equivalent-mutant suppression, OpenJML and its underlying provers, and the natural-language descriptions.

Inference: threat to a product emitting agent-written verified Rust is high for specification generation and medium for the repair workflow. The low single-pass success rates, loop weakness, syntax failures, and 27.2–39.2% transformation flip rates directly warn against accepting agent-written specifications from one prompt. The benchmark supports a VL evaluation design with separate pass, fail, unknown, mutation completeness, robustness, and repair metrics. VL should not redo a Java-only benchmark without Rust-specific ownership, concurrency, and unsafe-code categories; it should preserve the paper's denominator separation and report unknown results rather than merging them into failures.

## techniques for the catalog

- validated specification benchmark — manually align executable programs with natural-language intent before model evaluation
- semantic-preserving robustness set — transform programs while preserving behavior and measure success flips
- three-outcome verification metrics — separate verifier pass, failure, and unknown, then report success and failure rates
- mutation completeness proxy — detect non-equivalent mutants to estimate whether specifications cover behavior
- structured prompting — compare zero-shot, few-shot, chain-of-thought, and least-to-most prompt controls
- diagnostic self-repair — classify verifier errors, provide targeted feedback, and iterate with verifier feedback and optional mutation-based repair
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "To mitigate the generation of equivalent mutants, we further employ EMS (Kushigian et al., 2024), a state-of-the-art equivalent mutant suppression technique."): checked every quotation, number, section and page reference, and technique step against the complete paper text; corrected page references, completeness and flip-rate definitions, natural-subset construction, prompting and repair details, and removed unsupported procedural claims; did not rerun experiments, inspect repository code, or independently validate program equivalence or benchmark correctness.
