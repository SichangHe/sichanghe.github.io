# VeriCoder: Enhancing LLM-Based RTL Code Generation through Functional Correctness Validation
(authored by agents unless marked 🧑)
Tag: `wei2025vericoder`, [paper](https://arxiv.org/abs/2504.15659v2)

## scope and result

Wei et al. build a functionally validated RTL training set by having a teacher LLM generate tests, simulate the design, and iteratively revise the design or test after failures. The dataset contains 125,777 specification/design/test triples; fine-tuning Qwen2.5-14B-Instruct uses their specification–solution pairs (Section IV-A, p. 6). The paper's central claim is about data quality: “While several RTL datasets have been introduced, most focus on syntactic validity rather than functional validation with tests, leading to training examples that compile but may not implement the intended behavior.” (Abstract, p. 1) VeriCoder improves over its Qwen base model on both benchmarks (Table III, p. 7). The authors caution, “Synthetic test cases may fail to capture all possible edge cases.” (Section VI, p. 8)

The paper's concrete pipeline has an original natural-language specification `s`, an initial RTL implementation `d`, and a maximum of five attempts (Section III, pp. 4–6). The teacher model is GPT-4o-mini. On the first attempt it generates a unit test and may revise the implementation (Figure 4a, p. 5); on later attempts it receives the specification, failed design and test, and simulator error, then edits either or both. A triple is retained only when compilation and simulation pass. “This process continues until the design passes simulation or a retry limit is reached.” (Introduction, p. 2)

## technique: feedback-directed test generation and refinement

What it is: turn a syntax-filtered dataset into a simulation-validated dataset with a bounded teacher-model loop (Algorithm 1, p. 5).

How to apply it:

1. For each specification/design pair, prompt the teacher with the natural-language requirement and initial RTL (Section III-C, p. 6)
2. Ask for a self-checking unit test using `$fatal(1, "msg")` to flag incorrect behavior; allow the teacher to revise the design if needed (Figure 4a, p. 5)
3. Compile and run the design/test with standard Verilog tooling (Algorithm 1, line 10, p. 5)
4. On timeout, wrong output, or runtime error, send the error and current artifacts to the refinement prompt (Figure 4b, p. 5)
5. Repeat until success or `T = 5` total attempts; add `(s,d,t)` only on success (Algorithm 1, lines 4–13, p. 5; Section III-C, p. 6)

In the motivating AND example, the authors report that the original design compiles but times out on the generated test. Their repair replaces three non-blocking assignments with `y = a & b & c;` (Figures 2–3, pp. 3–4; Section III-B, p. 5). The paper's exact conclusion is, “Syntax checks alone cannot catch subtle but critical semantic errors.” (Section III-B, p. 5)

Verus form: Inference: treat the generated test as a candidate executable witness and compile the RTL-like task into a Rust function with a Verus contract. Replace simulation-only acceptance with `requires`/`ensures` properties over all inputs where feasible, and use `proof fn` lemmas for algebraic behavior. A bounded unit test can remain a cheap prefilter, but Verus must prove the universal property; a passing test does not become a proof. The teacher and simulator stay outside the trusted kernel, so the accepted artifact should carry a rechecked Verus contract.

Evidence: the augmented set contains 125,777 examples; specifications average 247 words, designs 35 RTL lines, and tests 55 lines (Table II, p. 6). Manual review of 100 random examples found 92% of generated RTL matched its natural-language description (footnote 1, p. 2; Section III-C, p. 6). VeriCoder's Table III reports RTLLM functional Pass@5 of 48.3%, versus 37.9% for OriGen and 41.4% for the Qwen base model; VerilogEval Eval-Machine Pass@1/5/10 is 55.7/62.9/64.3% and Eval-Human is 38.3/49.2/51.9% (Table III, p. 7). Pass@k estimates the probability that at least one of k sampled programs passes all benchmark tests; the paper uses `n = 10` generated programs per task (Section IV-C, p. 6). Inference: the 92/100 manual review does not establish correctness of all 125,777 examples.

## technique: validation-aware fine-tuning and ablation

What it is: fine-tune the same base model on specification–solution pairs from the validated dataset, then compare against fine-tuning on unvalidated OriGen data. The authors hold dataset size, fine-tuning hyperparameters, training procedures, and evaluation settings constant (Sections IV-A–IV-B, p. 6; Section V-B, p. 8).

How to apply it:

1. Keep only triples that pass the compiler and generated test; store specification, design, and test together (Section IV-A, p. 6)
2. Fine-tune Qwen2.5-14B-Instruct with LoRA rank 16, scale 32, three epochs, batch size 40, and learning rate `1 × 10^-5` (Section IV-B, p. 6)
3. Evaluate with fixed prompts and post-processing on VerilogEval V1.0 and RTLLM V1.1 (Section IV-D, pp. 6–7; Table III, p. 7)
4. Train a control model from non-validated data and compare functional correctness, syntax/VCS validity, and Pass@k (Section V-B, p. 8)

Table IV (p. 8) reports VerilogEval Pass@5 of 53.5% with unvalidated data and 55.8% with validated data, RTLLM syntax Pass@5 of 75.9% and 79.3%, and RTLLM functional Pass@5 of 44.8% and 48.3%, respectively. Inference: for VL, this supports filtering generated Verus Rust by compiling and running proof checks before using it as training data; the direct transfer is an engineering hypothesis because RTL simulation and Verus proof checking have different failure semantics. Inference: the data-generation loop does not establish that the natural-language specification itself is correct. The paper explicitly says, “While functional correctness under all possible inputs cannot be guaranteed, the inclusion of unit tests makes our augmented dataset substantially more robust than prior approaches that rely solely on syntactic checking.” (Section III-C, p. 6)

## what is proved, trusted, and already done

Inference: the evidence supports test-based validation rather than a universal correctness proof. Its reliability depends on the teacher model's test/specification interpretation, Verilog simulator and compiler, manual benchmark tests, and the manual reviewers’ judgments. Inference: for a verified Rust product, use test-guided repair followed by a separate Verus proof prerequisite check. Adapting the loop to proof obligations and counterexamples is a proposed extension, not a result established by this paper.

## techniques for the catalog

- teacher-generated tests — ask an LLM to produce self-checking tests from a natural-language specification and initial code
- feedback-directed refinement — feed simulator errors back to an LLM that edits code, tests, or both
- bounded acceptance loop — retain a triple only after successful compile and simulation within a fixed attempt budget
- validation-aware fine-tuning — train on specification/implementation pairs selected by test passing and compare with non-validated controls
- functional-quality audit — manually sample generated artifacts and report the denominator separately from benchmark pass rates

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This prompt is then passed to the teacher model, which attempts to fix the issue by making edits to the design, the test, or both."): checked the full paper, quotations, numbers, references, technique steps, tag, and arXiv link; corrected the training inputs, ablation control, attempt budget, metric explanation, references, and unsupported risk rating; did not reproduce experiments or inspect code, data, or cited papers.
