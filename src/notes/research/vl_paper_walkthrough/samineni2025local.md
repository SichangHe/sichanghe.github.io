# Local Coherence or Global Validity? Investigating RLVR Traces in Math Domains
(authored by agents unless marked 🧑)
Tag: `samineni2025local`, [paper](http://arxiv.org/abs/2510.18176v1)


## what the paper measures

This paper tests whether Reinforcement Learning with Verifiable Rewards (RLVR) improves intermediate mathematical reasoning, rather than only final answers. It trains Qwen-2.5-0.5B with GRPO on GSM8K, then asks GPT-4o to translate responses into first-order logic (FOL) and tag errors. The central distinction is explicit: “We distinguish between trace validity and trace coherence, noting that the former implies logical soundness while the latter measures local coherence via lack of errors.” (Abstract, p. 1). Trace validity means the full derivation is logically sound; trace coherence is a proxy that records whether detected local errors occur. The authors warn that “RL enhances local coherence without necessarily producing valid or correct solutions” (Abstract, p. 1).

GSM8K contains 8.5K grade-school problems: 7.5K training and 1K test (Section 4, p. 3). The paper's evaluation is therefore a proxy study, not a formal proof checker. Its human-annotated evaluator set has 25 responses for each error type and 100 responses with no errors (Section 4, p. 3). GPT-4o's tagging accuracy on that set is 57.8%, with low recall for Format Error because of FOL conversion (Section 5, p. 3). Inference: this evaluator accuracy limits confidence in the reported coherence results.

## technique 1: FOL-grounded mutually exclusive error taxonomy

what it is: represent each word problem as assumptions/facts, a target expression, and intermediate quantities; classify trace failures into four categories designed to be mutually exclusive: False Premise, False Rule, Calculator Error, and Format Error (Section 3.1, pp. 2–3; Table 2, p. 3). False Premise includes conceptual misunderstanding, semantic error, false assumption, units misinterpretation, and an incorrect derivation step from the problem description (Table 2). False Rule includes type/operand mismatch, inference violation, operation misapplication, quantifier misuse, and missing necessary steps. Calculator Error is a simple arithmetic mistake; Format Error is an improperly formatted final answer.

when to use: Inference: use this when full proof validation is infeasible but traces contain stepwise claims that can be translated into a logical representation. The taxonomy is intended to avoid overlapping natural-language error labels that cannot support a clean coherence metric.

how to do it:
1. decompose each GSM8K problem into premises, a formula, and intermediate steps (Section 3.1, p. 2)
2. prompt GPT-4o to convert the response into FOL with Signature, Formalization, Derivation, and Check sections (Section 3.2, p. 3; Appendix A, p. 7)
3. compare the FOL representation with problem requirements and assign every applicable error tag from the allowed set (Appendix A, pp. 6–8)
4. emit a JSON object containing `First-Order Logic`, `error_tags`, and `rationale`, following the output example; the opening instruction inconsistently calls the second key `error tags` (Appendix A, pp. 6–8)
5. use an empty tag list for an error-free response; do not output `None` as a tag (Appendix A, p. 8)

Verus form: Inference: encode the problem state and each arithmetic step as `spec fn` predicates, then use proof functions and `assert` statements to prove premises and transitions. A Rust verifier can distinguish premise, rule, arithmetic, and formatting predicates in a result enum, but GPT-4o's classification remains an untrusted annotation layer. Inference: a Verus proof of the actual arithmetic and transition relation is stronger than this paper's LLM judgment and should replace the proxy whenever the domain is formalizable.

evidence: the paper's evaluator set is 25 responses per error type plus 100 error-free responses (Section 4, p. 3), and measured accuracy is 57.8% (Section 5, p. 3). The taxonomy's examples include “5 × 6 = 10 instead of 30” for Calculator Error and inferring “all black things are cats” from “some cats are black” for Inference Violation (Appendix B, pp. 8–9).

limits and assumptions: FOL conversion can lose formatting information, and the paper reports low Format Error recall. The taxonomy is described as mutually exclusive, but the evaluation prompt says “Output ALL applicable error_tags from the allowed set, only if there are errors.” (Appendix A, p. 8). Its final critical rules list only False Premise, False Rule, and Calculator Error, although the earlier taxonomy includes Format Error. Inference: these prompt inconsistencies complicate interpretation of the error labels; an error-free judgment does not prove the full derivation valid.

## technique 2: Pass@K trace-coherence metric

what it is: extend Pass@K final-answer accuracy with a conditional coherence metric. For k sampled responses, Pass@K accuracy is true if any response is correct and false if all are incorrect. Among the c correct responses, coherence is true if at least one is error-free and false otherwise (Section 3.2, p. 3).

how to do it:
1. sample k responses for each problem at k = 1, 4, and 16 (Appendix C, p. 9)
2. determine which responses have correct final answers
3. if none are correct, mark Pass@K accuracy false; the paper calls coherence invalid in such cases (Section 3.2, p. 3; Section 5, p. 4)
4. for the c correct responses, run FOL error tagging
5. mark the group coherent when at least one correct response has no error tags (Section 3.2, p. 3)

Verus form: Inference: for verified Rust, replace the LLM final-answer test with a Verus postcondition and replace error-free tagging with a proof that every step's invariant and arithmetic lemma holds. A Pass@K harness can still measure how many generated candidates contain a fully verified proof, but the metric must count verifier-accepted candidates rather than GPT labels.

evidence: the authors partition examples by base/RL correctness: Pattern 00 (both wrong), Pattern 01 (base wrong, RL correct), Pattern 11 (both correct), and Pattern 10 (base correct, RL wrong) (Section 5, pp. 3–4). Pattern 01 reaches approximately 85% coherence for RL across Pass@K compared with 0% for the base model; Pattern 11 reaches up to 96% for RL compared with the base model (Section 5, p. 4). These are the approximate pattern-level percentages reported in Section 5; that prose does not give the number of questions in each pattern.

limits and assumptions: coherence is conditioned on final-answer correctness and therefore excludes incorrect traces from the positive coherence set. Inference: a model can increase this metric by making local steps cleaner while still producing an invalid global derivation; the metric cannot establish proof soundness.

## technique 3: RLVR trace comparison by correctness pattern

what it is: compare base and RL models separately in the four correctness patterns, then inspect Pass@1, Pass@4, and Pass@16 confusion matrices (Section 5, p. 3; Appendix D, pp. 9–10). Inference: this separates trace comparisons by whether RL changes final-answer correctness.

how to do it:
1. evaluate base and RL outputs on the same GSM8K test questions
2. assign each question to Pattern 00, 01, 10, or 11 according to final-answer correctness (Section 5, pp. 3–4)
3. compute FOL error tags and coherence at each Pass@K
4. compare confusion matrices for each pattern and K; Appendix D supplies Pass@4 and Pass@16 plots (Appendix D, pp. 9–10)
5. interpret coherence jointly with final correctness, not as a substitute for validity (Section 6, p. 4)

Verus form: Inference: apply the same stratification to candidate Rust proofs: base and RL-generated code belong to a pattern only after independent Verus verification of the target postcondition. Track both proof acceptance and intermediate lemma obligations; do not call a proof coherent merely because its comments or local assertions look consistent.

evidence: the abstract reports the most significant gains where the base model fails and the RL model succeeds (Pattern 01). Section 5 also reports improvement in Pattern 11, where both answers are correct; Pattern 10 is rare and has invalid RL coherence because all RL answers are incorrect across passes (Section 5, p. 4). The conclusion states that “Improvements in trace coherence reflect local consistency but should not be mistaken for improved correctness unless validated through systematic and formal evaluation” (Section 6, p. 4).

limits and assumptions: the base model is Qwen-2.5-0.5B fine-tuned with VERL; training uses batch size 64, mini-batch size 8, five sampled responses per prompt, learning rate 1e-6, KL coefficient β = 1e-3, 145 global steps/5 epochs, and one A100 80GB GPU (Appendix C, p. 9). Inference: results may depend on this small model, training run, sampler (temperature 1.0 and top-p 0.95 at evaluation), and GPT-4o judge; they do not establish that RLVR generally improves formal proof quality.

## trusted boundary and implications for VL

The paper's measured object is an LLM-judged proxy. Inference: interpreting it requires trusting the GSM8K labels, FOL translation, GPT-4o classification, and final-answer correctness test; the proxy does not establish full trace validity. The paper explicitly says “while RLVR improves trace coherence, it does not amount to trace validity or overall correctness in mathematical reasoning problems” (Conclusion, p. 4). Inference: for agent-written verified Rust, this is a warning against using local consistency scores, successful compilations of fragments, or natural-language proof explanations as evidence that a complete Verus contract holds.

Inference: VL need not recreate the paper's existing methods. The paper defines a FOL error taxonomy, a conditional Pass@K coherence metric, and a four-pattern analysis for separating local trace quality from final correctness. Inference: VL should instead connect generated proof traces to Verus's executable proof result and report denominators, model, verifier version, and specification coverage; the product threat is proxy inflation when local reasoning improves without a globally checked contract.

## techniques for the catalog

- FOL error taxonomy — translate reasoning steps to first-order logic and classify premise, rule, arithmetic, and format errors; the intended mutually exclusive taxonomy has a prompt allowing multiple tags
- conditional Pass@K coherence — among correct sampled answers, count a group coherent when at least one trace is error-free
- correctness-pattern stratification — compare base and RL traces in four joint correctness patterns across Pass@1, Pass@4, and Pass@16
- Inference: proxy-versus-validity audit — require independent formal checking before interpreting local coherence as proof quality
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Improvements in trace coherence reflect local consistency but should not be mistaken for improved correctness unless validated through systematic and formal evaluation."): checked every quotation, number, page and section reference, and technique step against the full text, including appendices; corrected the abstract quotation, taxonomy details, prompt inconsistencies, pattern references, and inference labels; did not reproduce experiments, independently validate GPT-4o judgments, or extract numerical cells from figure images.
