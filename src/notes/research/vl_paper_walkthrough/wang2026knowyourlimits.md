# Know Your Limits : On the Faithfulness of LLMs as Solvers and Autoformalizers in Legal Reasoning
(authored by agents unless marked 🧑)
Tag: `wang2026knowyourlimits`, [paper](https://arxiv.org/abs/2606.16118)

## scope and result

This paper tests whether language-model reasoning that looks formal actually follows a solver. It compares pure LLM classification, LLM reasoning over formal logic, and LLM-generated Z3 code executed by an SMT solver. The data are real contracts from ContractNLI, re-annotated under strict entailment semantics. The central result is a gap between accuracy and faithfulness: a model can classify correctly while introducing assumptions, misreading formal constraints, or claiming a solver result it did not obtain.

The abstract identifies three failure modes: “scope laundering, where LLMs report solver-inconsistent classifications without executing the underlying formal reasoning, producing conclusions that appear logically grounded but are not; implicit constraint blindness, where LLMs overlook logical constraints present in formal representations; and program synthesis failures, where LLMs generate incorrect Z3 code despite structured prompting.” (Abstract, PDF p. 1). The authors conclude: “These results reveal a fundamental gap between benchmark accuracy and logical faithfulness.” (Abstract, p. 1). Inference: this is directly relevant to any system that asks an LLM to produce Verus specifications or proof code and treats a plausible answer as evidence of a checked proof.

## technique 1: re-annotate data with strict satisfiability semantics

What it is. The paper replaces interpretation-oriented ContractNLI labels with definitions that a solver can decide. For premise P and hypothesis H, Entailment means P ∧ ¬H is unsatisfiable; Contradiction means P ∧ H is unsatisfiable; every remaining case is Neutral. Neutral therefore includes both irrelevant hypotheses and hypotheses that need unstated assumptions.

When to use it. Use this labeling method when evaluating a formal-reasoning pipeline and you need to distinguish a logically forced result from a plausible interpretation. It exposes assumptions that ordinary benchmark labels may hide.

How to do it. (1) Start from authentic contract premise/hypothesis pairs. (2) Define the three labels by the two unsatisfiability checks. (3) Put cases with insufficient information into Neutral rather than adding background legal knowledge. (4) Manually re-annotate a sample and adjudicate disagreements. (5) Build minimal pairs by adding only the missing assumption or replacing a hypothesis with one directly supported by the premise. The paper re-annotated 400 examples and augmented the collection to 610 examples. Its formal definitions and examples are in Section 3.1 (pp. 3–5).

The paper reports 153 Entailment, 52 Contradiction, and 295 Neutral labels in Table 1, a total of 500 label counts across transitions (the table's “Total” row is a transition summary, while the text says 400 examples were manually re-annotated). The reported transition counts are Entailment→Neutral 71, Contradiction→Neutral 18, Neutral→Entailment 14, Neutral→Contradiction 4, Entailment→Contradiction 1, and Contradiction→Entailment 1 (Table 1, p. 4). Inference: because these counts sum to 109 rather than 400, they cannot be read as a complete partition of all re-annotated items; the paper does not explain the denominator for the transition table. Inter-annotator agreement is 81.0% with Cohen's κ = 0.627 for the two annotators (Table 2, p. 5), and a logician adjudicates disagreements.

Verus form. Inference: encode a property as a `spec fn` or proof precondition and ask whether `P && !H` is unsatisfiable through a lemma that supplies the relevant assumptions. A Verus proof can establish Entailment with `requires(P)` and `ensures(H)`, or establish a counterexample/Neutral case by constructing a model satisfying P and violating H. The paper's three-way classification is a meta-level harness around proofs; Verus does not provide an automatic Neutral label, so the harness must distinguish “proved H,” “proved not H,” and “not proved.”

Evidence and limits. The formal definitions are explicit, but annotation remains difficult. The authors state: “This indicates that the primary challenge lies not in logical inconsistency but in determining whether a hypothesis is sufficiently supported by the premise.” (Section 3.1, p. 5). The sample is from one public dataset and the authors list imbalance and subjective edge cases as limitations (Section 5.5, p. 9).

## technique 2: staged autoformalization

What it is. The neuro-symbolic pipeline separates translation from solving. An Autoformalizer translates legal text into first-order logic (FOL); a Solver runs satisfiability checks. The prompt is staged rather than asking for one unrestricted translation.

How to do it. (1) Identify only clauses relevant to the hypothesis, following an IRAC-style relevance step. (2) Normalize predicates so semantically equivalent expressions use the same symbols. (3) Translate both premise and hypothesis into FOL. (4) Encode legal-context assumptions explicitly as logical statements. (5) Add global constraints that prohibit degenerate solutions such as non-existence assumptions and encourage interpretable predicates. These are the four stages listed in Section 3.2.1 (pp. 5–6). Then run Z3 on the FOL representation: P ∧ ¬H determines Entailment, P ∧ H determines Contradiction, and otherwise the result is Neutral (Section 3.2.2, p. 6).

The authors emphasize the pipeline's separation: “This design separates language understanding from logical reasoning, allowing us to isolate where failures occur.” (Section 3.2, p. 5). They also compare Z3 output with a second run in which the same model reasons directly over the SMT representation, which distinguishes translation errors from reasoning errors (Section 3.2.2, p. 6).

Verus form. Inference: use a typed intermediate representation for each clause and require an explicit assumption list before generating Verus `requires` clauses. Predicate normalization corresponds to choosing one Rust/Verus spec symbol for each concept. A proof function should consume the assumptions as arguments or `requires` facts; silently adding an axiom is equivalent to changing the specification. A final Verus check must run on the generated code, because textual proof-like output does not establish that the verifier accepted it.

Evidence and limits. Autoformalization is the main bottleneck. The paper states: “Even with structured prompting and explicit instructions to surface assumptions, LLM-generated formalizations remain incomplete or incorrect.” (Section 5.3, p. 8). Its illustrative case has the generated FOL adding permissions, return obligations, and survival clauses absent from the premise (p. 8). Inference: the staged prompt reduces some ambiguity but cannot guarantee semantic preservation from legal prose to FOL.

## technique 3: compare LLM reasoning with executed Z3

What it is. The study holds the formal representation fixed and compares two consumers: an LLM prompted to classify from the SMT representation (LLM-FR) and Z3 executing the representation (Solver-FR). The comparison tests faithfulness independently of benchmark accuracy.

How to do it. Run the same premise/hypothesis formalization through both paths. Record the model's class and the solver's class. Count directional errors by true class: Neutral→Entailment, Entailment→Neutral, Neutral→Contradiction, Contradiction→Neutral, Contradiction→Entailment, and Entailment→Contradiction. Table 4 reports these per-model percentages; each cell is the percentage of samples misclassified in that direction (caption, p. 7).

Accuracy results (Table 3, p. 6) use the 610-example augmented dataset, with the table caption defining each method. Claude scores Simple 63.1%, Structured 53.2%, LLM-FR 83.0%, and Solver-FR 74.5%; DeepSeek 68.4%, 62.2%, 64.2%, and 45.3%; GPT 66.0%, 58.8%, 65.3%, and 60.3%; Qwen 65.1%, 61.5%, 69.1%, and 48.3%; and Llama 55.9%, 40.0%, 58.6%, and 42.1%. The majority-class baseline is 48% (Table 3 caption). Inference: these percentages should not be compared with the transition counts in Table 1 because the paper uses the augmented 610-example set for model evaluation but does not give per-class denominators for every percentage.

Verus form. Inference: treat solver execution as a required external check in a generation pipeline. Run `verus` on the generated Rust and reject a result unless the verifier returns success; retain the exact source and assumptions used. A model's natural-language assertion that a proof passed is not a Verus fact. To test faithfulness, compare a model-produced explanation with the actual Verus diagnostics or proof obligations, analogous to comparing LLM-FR with Z3.

Evidence and limits. Scope laundering appears in every model, from 15.3% for GPT to 52.5% for Qwen, or 28.6% for Qwen when invalid inputs are excluded (Section 5.4, p. 8). The paper does not give the denominator in that paragraph; it defines the values as rates over the analyzed model outputs. Inference: the missing denominator limits reproduction of the exact rates, although the direction and cross-model range are clear.

## technique 4: classify recurring failure modes

Scope laundering. The model reports Entailment or Contradiction as if it came from symbolic execution while the actual solver returns Neutral. The authors write: “In these cases, the model produces classifications such as Entailment or Contradiction, while actual solver execution yields Neutral.” (Section 5.4, p. 8). Detect it by replaying the formal input with Z3 and comparing the outputs; do not accept an explanation as proof of execution.

Implicit constraint blindness. The solver finds a non-neutral result, but the LLM misses constraints in the representation, especially universals encoded inside existential structures. The reported rate ranges from 0.7% for GPT to 4.4% for Claude (Section 5.4, p. 8). Inference: test generated proof prompts with quantified invariants and inspect whether the model uses each required constraint rather than merely repeating it.

Program synthesis failures. The model generates invalid Z3 Python: sort mismatches, malformed quantifiers, variable-scope errors, syntax errors, or confusion between SMT-LIB and Python. The paper runs a fixing loop for three iterations; code still failing after three is marked Invalid (Appendix A.1, p. 15). Table 5 reports error rate and invalid percentage: Claude 25.5% error and 0% invalid; DeepSeek 54.7% and 23.6%; GPT 39.7% and 6.1%; Qwen 51.7% and 15.6%; Llama 63.2% and 28.7%. The table caption calls this “SMT solver solving performance across models” (p. 15), and the text limits the claim to Z3 Python code in the specified format.

Verus form. Inference: classify analogous failures by (a) claims that disagree with the Verus result, (b) ignored quantified facts or invariants, and (c) Rust/Verus code that fails to parse or verify. A three-attempt repair loop can be useful operationally, but a repaired proof counts only if the final source is checked and the specification has not been weakened.

## what is proved, trusted, and still missing

The paper proves or measures classification behavior, not correctness of legal interpretation. Z3 is sound relative to the supplied FOL, but autoformalization and annotation determine whether that FOL represents the contract. The paper explicitly says: “The outputs of the SMT solver and the LLM-generated formalizations should be treated as decision-support tools, not as binding legal advice or autonomous compliance certifications.” (Ethics Statement, p. 11).

Trusted elements include Z3's solver result for its input, the manually written label definitions, and the corrected code accepted after the repair loop. Inference: the LLM-generated formalization, assumption list, code-fixing process, and human adjudication remain trusted inputs or judgments; no theorem proves that they preserve the original contract meaning. The paper also reports that some outputs still required manual correction after three iterations (Section 5.5, p. 9).

Threat to VL. Inference: high threat to agent-written verified Rust at the specification boundary and medium threat to the Verus checker itself. A successful Verus proof can be faithful to a generated but wrong `requires`/`ensures` contract, just as Z3 can be correct for an unfaithful FOL translation. Scope laundering is a direct operational risk if VL reports proof success without recording verifier output. The paper does not test Verus or Rust, so it does not measure failure rates for VL.

What VL should not redo. Inference: VL should not treat benchmark accuracy or a model explanation as a substitute for executing Verus. It should reuse the paper's separation of translation, explicit assumptions, solver replay, and directional error accounting. Any new VL evaluation should publish denominators, model and prompt settings, invalid-output handling, and the exact generated specification so that a passing proof can be audited.

## techniques for the catalog

- strict satisfiability labels — define entailment and contradiction with P ∧ ¬H and P ∧ H unsatisfiability, and reserve Neutral for unsupported or irrelevant cases
- minimal-pair augmentation — add only the missing assumption or a directly supported hypothesis to expose grounding gaps
- staged autoformalization — identify clauses, normalize predicates, translate to FOL, and encode assumptions and global constraints explicitly
- solver-versus-model replay — compare a model's classification with an executed Z3 result on the same formal input
- failure-mode auditing — detect scope laundering, implicit constraint blindness, and code-generation errors with directional comparisons
- bounded repair loop — retry invalid solver code for three iterations, then record it as Invalid rather than silently treating it as a result
Checked 2026-10-15 against paper wang2026knowyourlimits: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
