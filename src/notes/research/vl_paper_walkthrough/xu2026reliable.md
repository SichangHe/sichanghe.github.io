# Reliable Use of Lemmas via Eligibility Reasoning and Section-Aware Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `xu2026reliable`, [paper](http://arxiv.org/abs/2602.00998v1)

## purpose and result

The paper presents RULES, a training and prompting method for deciding whether a candidate mathematical lemma is eligible and useful before applying it. Its central claim is that a model should expose two separate judgments: whether the lemma's preconditions hold, and whether its conclusion helps the current goal. The final usefulness label is the conjunction of these binary judgments. The authors train this format with Group Relative Policy Optimization (GRPO) and mask loss so that a wrong section receives the penalty.

The abstract states: “We formalize lemma-judging as a structured prediction task: given a statement and a candidate lemma, the model must output a precondition check and a conclusion-utility check, from which a usefulness decision is derived.” (Abstract, p. 1.) The introduction motivates this as protection against importing conclusions while ignoring assumptions. The method section says: “RULES has two components: 1 a two-section lemma-judging task that requires explicit eligibility checks before use, and 2 section-aware reinforcement learning that aligns credit assignment with these checks.” (§3, p. 2.)

## technique 1: staged eligibility judgment

what it is

Given lemma L and statement S, prompt the model to produce two ordered sections. Section 1 gives a free-form precondition rationale and binary label `l_pre`; section 2 gives a conclusion-utility rationale and binary label `l_con`. Compute `l_use = l_pre ∧ l_con`. The paper specifies: “Given an input x = (L, S) with lemma L and statement S, the model produces a structured output with two sections y = (r_pre, l_pre) ⊕ (r_con, l_con)” (§3.1, p. 2). It also requires labels `l_pre, l_con ∈ {0, 1}` and extracts the judgments from the sections.

when to use it

Use this gate whenever an LLM selects or applies a lemma, theorem, invariant, or library fact. It is especially useful when statements are minimally perturbed so that surface similarity remains high while an assumption becomes false.

how to do it

1. Provide the candidate lemma and target statement (§3.1)
2. Ask for “Step 1: Precondition Check”; require reasoning followed by a boxed Boolean (§Appendix A, p. 7)
3. Ask for “Step 2: Conclusion Check”; require reasoning followed by a boxed Boolean (§Appendix A, p. 7)
4. Parse the two labels and set the final decision to their conjunction (§3.1)
5. Permit lemma use only when the final decision is true (Inference: this last enforcement is the direct operational use of the paper's gate)

The paper's case study illustrates the failure it targets. A lemma requires a bi-invariant metric while the statement only gives a left-invariant metric; RULES identifies that mismatch and outputs false for the precondition (Appendix E, p. 9). The authors' prompt says: “First, analyze whether the lemma’s preconditions are satisfied in the given statement.” (Appendix A, p. 7.)

Verus form

Inference: In Verus, represent the precondition as a Boolean condition over the current proof state, then invoke a lemma only after proving that condition. A proof function can establish the condition with `requires` and expose the lemma's result with `ensures`; the generated Rust should keep the two checks as separate proof steps. Use Verus `assert`, `requires`, `ensures`, and lemma/proof functions documented in the local Verus reference. The model's free-form rationale is not evidence: Verus's verifier must discharge the actual precondition. The final conjunction can be an `assert(pre_ok && utility_ok)` before the lemma call. (Inference: the paper does not implement Verus.)

evidence and limits

RULES was evaluated with four models: DeepMath-1.5B, OLMo-2-1124-7B-Instruct, Qwen2.5-Math-7B-Instruct, and Llama-3.1-8B-Instruct (§4.1, p. 2). The authors report held-out NaturalProofs, NLPS, Isabelle premise-selection, and IMO-lemma tests, plus a DeepTheorem perturbation set and end-to-end benchmarks. Results use seven sampled outputs and majority voting (SC@7; §4.3, p. 3). In Table 1, Qwen RULES scores 88.2, 85.8, 81.3, and 92.7 on the four in-domain sets, versus its vanilla scores 63.9, 71.9, 55.5, and 55.8. On the perturbation test it scores 87.8 versus 71.9. These are percentages; the table does not give item denominators in its caption, while Appendix C gives test-set sizes of 1,002, 676, 256, and 342 for the four in-domain sets and 839 for the perturbation set (§Appendix C, p. 8). CounterMATH uses F1; the other metrics use exact-match accuracy (Table 1 caption, p. 3).

The method is not a proof checker. The paper's limitation says it focuses on lemma judging rather than full proof generation (Limitations, p. 5). Inference: it can prevent a known inapplicable lemma from entering a proof search, but cannot establish that a remaining proof is valid. The conclusion check is strategy-dependent; the authors therefore provide only precondition labels for perturbations (§4.2, p. 3). Inference: a Verus deployment should treat the gate as search control and still require verifier-checked specifications and proof obligations.

## technique 2: section-aware reinforcement learning

what it is

RULES modifies GRPO's token-level loss mask. If the precondition label is correct but the final label is wrong, only the conclusion section is marked incorrect; the precondition tokens receive no penalty. The paper states: “we will only keep the conclusion check section, i.e., setting the loss mask of (r_con, l_con) to be 1 and others as 0.” (§3.2, p. 2.) Correct sections therefore retain credit while the responsible section receives the negative reward.

how to do it

1. Generate a rollout in the two-section format (§3.2)
2. Compare each section label and the final conjunction with gold labels (§3.2)
3. Set token mask `m_ij` to one only for the section judged incorrect; set other section masks to zero (§3.2)
4. Apply the masked GRPO gradient to the rollout; malformed outputs receive the format penalty −2 (§4.2, p. 3)
5. Include perturbation examples whose minimal edits invalidate a lemma precondition (§4.2; Appendix B, p. 8)

The authors emphasize: “The computational overhead is restricted to negligible token-masking operations during the loss calculation, making RULES compatible with any LLM backbones.” (§3.2, p. 2.)

Verus form

Inference: Verus itself has no RL loss mask. The analogous engineering pattern is section-specific feedback: classify a failed generated proof as a precondition failure or conclusion-use failure, then regenerate only that proof fragment while preserving verified fragments. The final artifact must still compile and verify; no runtime proof function or model rationale is trusted.

evidence and limits

Table 2's Qwen ablation compares vanilla, GRPO, two-section-onetime, no perturbation data, de-noised perturbation data, and RULES. RULES reaches 87.8 on the perturbation test, while two-section-onetime reaches 73.1 and removing perturbation data reaches 19.1. The paper reports a 14.7-point RULES advantage over the data-equivalent two-section-onetime baseline on this test (§5.2, p. 4). Removing perturbation data preserves in-domain scores but collapses out-of-domain robustness; this supports the need for negative, applicability-breaking examples. The authors validated 100 sampled training perturbations with a 90% pass rate and 100 sampled evaluation perturbations with a 95% pass rate (Appendix D, p. 8). These denominators are the samples, not the complete datasets.

The end-to-end transfer is mixed: RULES is broadly on par with single-label GRPO, improves perturbation-aligned subsets, and sometimes regresses on competition and inequality tasks (§5.1, p. 4). Inference: strict eligibility gating may trade recall for safety. The paper also reports only four base models and lemma judging, so generalization to Verus code, Rust ownership, and concurrent invariants remains unmeasured.

## what is proved, measured, and trusted

The measured claims are model accuracy/F1 on the named datasets, robustness on constructed perturbations, and transfer scores under SC@7. No theorem about RL convergence or proof soundness is proved. Trusted components include the base LLM, training labels, perturbation construction and filtering, parser for the two-section schema, reward implementation, and the evaluation datasets. Inference: a product using this method should log each precondition and utility decision, but accept a lemma only after the Verus verifier checks the generated proof.

## contradictions, prior work, and product threat

The table caption says “at most 23 points” in the abstract, while the analysis says “23+ points at most”; the exact maximum should be read directly from the displayed rows rather than inferred. The paper reports percentages without table denominators, but Appendix C supplies the test counts listed above. Inference: VL should not redo the already demonstrated idea of splitting lemma eligibility into precondition and conclusion checks, masking RL credit by section, and training on applicability-breaking perturbations. It should instead test whether these controls improve verified Rust proof completion, where ownership and solver failures create additional feedback categories.

Inference: the threat to a product that lets agents write verified Rust is moderate. RULES can reduce invalid lemma selection and wasted proof search, but it does not verify Rust, check specification adequacy, or prevent an agent from omitting a needed invariant. Its strongest reusable component is a machine-readable precondition gate connected to actual verifier diagnostics.

## techniques for the catalog

- staged eligibility judgment — require separate precondition and conclusion-utility checks, and allow a lemma only when both labels are true
- section-aware reinforcement — mask GRPO loss to the section responsible for a wrong judgment
- applicability-breaking perturbations — minimally edit statements to invalidate lemma assumptions while preserving mathematical coherence
- staged proof-search feedback — use verifier or checker diagnostics to regenerate only the failed proof section (Inference: transfer to Verus)

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
