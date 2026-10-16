# Theorem Prover as a Judge for Synthetic Data Generation
(authored by agents unless marked 🧑)
Tag: `leang2025theorem`, [paper](http://arxiv.org/abs/2502.13137v2)

## scope and contribution
The paper builds a synthetic-math-data pipeline in which Lean checks generated questions and every intermediate answer step. Its central claim is operational: "We introduce iterative autoformalisation, an approach that iteratively refines theorem prover formalisation to mitigate errors, thereby increasing the execution rate on the Lean prover from 60% to 87%." (abstract, p.1). The data recipe has three techniques: TP-as-a-Judge, iterative autoformalisation, and reinforcement learning from theorem-prover feedback (RLTPF).

## technique: four-phase question formalisation
What it is: a generated question is accepted only after symbolic conversion, formal checking, translation back to prose, and an alignment check. The paper says, "This process follows a four-phase approach, starting with the original question (s0)." (Section 2.2.1, p.3).

When to use it: use it when a model creates synthetic specifications and a malformed or ambiguous question could contaminate answer training. The authors use reverse question-answering on GSM8K and MATH, covering problem solving, algebra, counting and probability, then filter questions before answer formalisation.

Steps from the paper:
1. Start with the original natural-language question s0 (Section 2.2.1).
2. Apply CoMAT to convert s0 to a symbolic representation s1 (Section 2.2.1).
3. Autofomalise s1 and send the formal statement to Lean for verification, producing s2 (Section 2.2.1).
4. Use gpt-4o to translate the formalised statement back to natural language, producing s3 (Section 2.2.1).
5. Run a second gpt-4o alignment check between s0 and s3; retain the final s4 only when aligned (Section 2.2.1).
6. Exclude questions for which the four-phase function does not reach s4 (Section 2.2.1).

Verus form (Inference): represent a generated Rust specification as a `spec fn` and prove its well-formedness with a `proof fn` and `ensures`; run the verifier before asking the model to generate implementation proofs. CoMAT and Lean syntax do not carry over. The invariant is the same: a question enters the dataset only after the formal statement and prose agree.

Evidence and limits: in an analysis of 2,000 SIMQA samples, 30% failed during question formalisation and, among the rest, about 5% had Lean execution errors during answer formalisation (Section 4.2, Figure 4). These percentages are fractions of the 2,000-sample analysis, not benchmark accuracy. The paper warns that question autoformalisation has no definitive correctness metric and that iterative formalisation can be ineffective outside mathematics (Section 2.2.1; Appendix B).

## technique: answer formalisation and typed outcomes
What it is: formalise a model's chain of thought one step at a time and classify the chain as verified, false, or an execution error. The paper defines the result as verified when all formal steps pass, false when any step is refuted, and error when formalisation fails to execute (Section 2.2.2, p.4): "The verification process yields one of three outcomes for each answer, a(q): (i) Verified: if all steps are validated by the theorem prover. (ii) False: if any step is refuted by the theorem prover."

Steps: generate an answer for each retained question; formalise it as a sequence a′i(q); generate calculations or tactics for each step; run Lean on every step; label the chain; remove false chains or retain them as preference pairs; send errors to iterative repair (Section 2.2.2 and Table 1).

Verus form (Inference): each step becomes a lemma or proof block checked by Verus. A failed `assert` or unsatisfied `ensures` is the false outcome; parser or unsupported-specification failures are errors requiring regeneration. Runtime Rust code must not be treated as proof evidence; the verifier's checked proof is the evidence.

Evidence: Table 4 evaluates 54 manually annotated executed cases. TP-as-a-Judge has F1 0.87 and recall 0.91 for verified/false reasoning-step decisions; the o1-mini LLM judge has F1 0.72 and recall 0.78, with two times as many false positives (Section 4.2, Table 4). The denominator is the 54-case manually annotated sample, not all SIMQA.

## technique: iterative autoformalisation
What it is: feed Lean's error and the current formal proof back to the model and retry individual steps. Algorithm 1 sets maximum retries R=5, checks each step, returns verified or false immediately when determined, otherwise refines the proof from the error (Section 2.2.3, Algorithm 1). The paper states: "We propose iterative autoformalisation, an approach in which the model learns from its errors during the autoformalisation process" (Section 2.2.3, p.4).

How to apply: derive formal proof A(a); initialize retry count zero; for each step Ti call verifier P(Ti); on verified or false stop that chain; on an error transmit the error and A(a) to the model; increment r and refine; stop after five retries and return error if unresolved (Algorithm 1). The method improves Lean execution from 60% to 87% after up to five iterations (Section 2.2.3). In 356 analyzed samples, about 40% required iterative refinement; most successful repairs finished by iteration three, while some still failed after seven attempts (Section 4.3). Average sequence length rose from 731.2 tokens at iteration 1 to 1,343.0 at iteration 5 (Table 6; denominator is the analyzed samples reaching each iteration).

Verus form (Inference): compile each generated proof candidate with Verus, pass diagnostics and the candidate proof back to the model, and retry a bounded number of times. Use existing Verus proof constructs (`proof fn`, `assert`, `ensures`, `invariant` statements); do not use Lean tactics as if they were Verus syntax. Keep the code and diagnostic from each retry so a failed candidate cannot silently become training data.

## technique: RLTPF data allocation
What it is: replace human labels with theorem-prover labels and train verified pairs differently from contradictory pairs. Table 1 sends two verified answers to SFT, one verified and one false answer to DPO, and two false answers to disposal; formalisation errors go through iterative repair (Section 2.2.2, Table 1). The paper summarizes: "RLTPF replaces human evaluators with a theorem prover, which verifies each formalised reasoning step" (Section 2.3, p.5).

Steps: generate two model answers; formalise and verify both; put verified/verified examples in SFT; make verified/false pairs for DPO; discard false/false; run one SFT epoch then three DPO epochs (Appendix B). The SIMQA corpus has 3,508 samples: 1,876 from GSM8K and 1,632 from MATH (Section 3). Dataset allocation is 2,562 SFT samples and 473 DPO pairs (946 answers) (Appendix A, Table 8).

Verus form (Inference): use verifier outcomes to build a Rust-proof SFT set and preference pairs, with the accepted candidate as the preferred completion. This transfers the allocation logic; Lean-specific formalisation and DPO prompts do not.

Evidence, trust, and threat: Table 2 reports Pass@1 exact-match accuracy. For Llama-3.1-8B on GSM8K, CoT is 82.38% and RLTPF 83.75%; for Llama-2-7B on MultiArith, CoT 39.44% and RLTPF 59.44%. On Llama-3.2-3B, AIME 2024 rises from 10.00% CoT to 13.33% RLTPF. Denominators are each benchmark's full reported evaluation set (the paper does not print counts in Table 2). The training set is only 3,508 samples, whereas comparison systems use up to 14M pairs (Section 4.1). SFT on all instances reached 82.23% GSM8K, while SFT on verified-only reached 81.55%; verified-only SFT plus RLTPF reached 83.75% (Table 7, Llama-3.1-8B). The authors note computational limits above 8B parameters and high iterative cost (Conclusion).

What is proved: Lean proves the formalised intermediate statements; benchmark accuracy measures model answers. What remains trusted: the LLM's translation, CoMAT output, alignment judge, Lean libraries and kernel, benchmark labels, and the assumption that the formal statement captures the intended word problem. Inference: for VL, this poses a medium threat to agent-written verified Rust: a checker-in-the-loop dataset can reduce invalid proof suggestions, but it does not prove semantic adequacy of the specification or safe behavior outside proved contracts. Existing work already covers checker feedback, bounded retries, and preference training; VL should reuse these patterns rather than redo their generic orchestration.

## techniques for the catalog
- four-phase question formalisation — convert, verify, translate back, and align generated specifications before answer training
- stepwise theorem-prover judging — classify every intermediate proof step as verified, false, or execution error
- iterative autoformalisation — feed verifier diagnostics to a model and retry bounded formalisation repairs
- RLTPF allocation — train on verified examples with SFT and verified-versus-false pairs with DPO

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
