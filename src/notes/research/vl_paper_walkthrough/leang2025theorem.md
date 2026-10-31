# Theorem Prover as a Judge for Synthetic Data Generation
(authored by agents unless marked 🧑)
Tag: `leang2025theorem`, [paper](http://arxiv.org/abs/2502.13137v2)

## scope and contribution
The paper proposes a synthetic-math-data pipeline that formalises generated questions and uses Lean to verify intermediate answer steps. Its central claim is operational: "We introduce iterative autoformalisation, an approach that iteratively refines theorem prover formalisation to mitigate errors, thereby increasing the execution rate on the Lean prover from 60% to 87%." (abstract, p.1). The data recipe has three techniques: TP-as-a-Judge, iterative autoformalisation, and reinforcement learning from theorem-prover feedback (RLTPF).

## technique: four-phase question formalisation
What it is: a generated question is accepted only after symbolic conversion, formal checking, translation back to prose, and an alignment check. The paper says, "This serves as a consistency check, confirming the correctness of the autoformalisation process." (Section 2.2.1, p.3).

Inference: use this approach when a model creates synthetic specifications and malformed or ambiguous questions could contaminate answer training. The authors use reverse question-answering on GSM8K and MATH, covering problem solving, algebra, counting and probability, then filter questions before answer formalisation.

Steps from the paper:
1. Start with the original natural-language question s0 (Section 2.2.1).
2. Apply CoMAT to convert s0 to a symbolic representation s1 (Section 2.2.1).
3. Autoformalise s1 and send the formal statement to Lean for verification, producing s2 (Section 2.2.1).
4. Use gpt-4o to translate the formalised statement back to natural language, producing s3 (Section 2.2.1).
5. Run a second gpt-4o alignment check between s0 and s3; retain the final s4 only when aligned (Section 2.2.1).
6. Exclude questions that fail these checks before answer formalisation (Section 2.2.1).

Inference: for Verus, represent a generated Rust specification as a `spec fn` and state and prove relevant properties with a `proof fn` and `ensures`; run the verifier before asking the model to generate implementation proofs. CoMAT and Lean syntax do not carry over. Require an alignment check before admitting a question; that check remains fallible.

Evidence and limits: Section 4.2 describes a 2,000-sample analysis: “30% of these samples failed during the question formalisation stage” and “Among the remaining 70%, approximately 5% exhibited execution errors from the Lean prover during the answer formalisation stage”. Appendix G instead reports: “23.10% of total samples resulted in question formalisation error, 5.4% in answer formalisation error, while the remaining 71.50% were categorised as verified or false.” Table 11 splits question errors into 13.10% autoformalisation errors and 10.00% alignment errors. Inference: these reports disagree; the conditional percentage in Section 4.2 must not be treated as a percentage of all 2,000 samples. The paper notes the absence of definitive question-formalisation correctness metrics (Section 2.2.1) and possible ineffectiveness outside mathematics (Appendix A).

## technique: answer formalisation and typed outcomes
What it is: formalise a model's chain of thought one step at a time and classify the chain as verified, false, or an execution error. The paper defines the result as verified when all formal steps pass, false when any step is refuted, and error when formalisation fails to execute (Section 2.2.2, pp.3–4): "The verification process yields one of three outcomes for each answer, a(q): (i) Verified: if all steps are validated by the theorem prover. (ii) False: if any step is refuted by the theorem prover."

Steps: generate an answer for each retained question; formalise it as a sequence a′i(q); generate calculations or tactics for each step; run Lean on every step; label the chain; remove false chains or retain them as preference pairs; send errors to iterative repair (Section 2.2.2 and Table 1).

Inference: for Verus, each step could become a lemma or proof block checked by Verus. A failed proof obligation does not establish that a claim is false. Keep unproved claims separate from refuted claims and parsing errors when constructing labels.

Evidence: Section 4.2 reports 54 manually annotated, successfully executed cases. It reports F1 0.87 and recall 0.91 for TP-as-a-Judge, versus F1 0.72 and recall 0.78 for o1-mini. Table 4 lists false-positive counts of 5 versus 12. Inference: the paper's description of a “2x increase” is approximate. Its TP-as-a-Judge counts (32 true positives, 3 false negatives, 5 false positives, 14 true negatives) imply F1 about 0.89, rather than the reported 0.87. The actual-positive totals also differ between the two confusion matrices (35 versus 32), although both sum to 54. Treat these as reported results with internal inconsistencies.

## technique: iterative autoformalisation
What it is: feed Lean's error and the current formal proof back to the model for refinement. The paper states: “We propose iterative autoformalisation, an approach in which the model learns from its errors during the autoformalisation process (Algorithm 1).” (Section 2.2.3, p.4).

Steps from Algorithm 1: derive formal proof A(a); initialize retry count r=0 and maximum R=5; call verifier P on proof steps; transmit an execution error and A(a) to the model; increment r and refine using the error feedback. The pseudocode exits upon a verified or false result. Inference: its early exit on the first verified step conflicts with Section 2.2.2's requirement to validate every step. It also initializes result to unknown without explicitly assigning error on retry exhaustion, despite specifying error as an output. Preserve the all-steps requirement when implementing the intended method.

Evidence: Section 2.2.3 reports execution improving from 60% to 87% after up to five iterations. Section 4.3 analyzes 356 samples and reports approximately 40% requiring refinement; Appendix E instead says 50% of attempts require multiple iterations. Section 4.3 says most successful repairs finish by iteration three, while some cases fail even after seven attempts. Inference: seven attempts describe that analysis, not Algorithm 1's five-iteration limit. Table 6 reports average sequence lengths of 731.2, 869.1, 937.6, 1134.6, and 1343.0 tokens for iterations 1–5; it does not give the number of cases contributing to each average.

Inference: for Verus, compile each generated proof candidate with Verus, pass diagnostics and the candidate proof back to the model, and retry a bounded number of times. Use existing Verus proof constructs (`proof fn`, `assert`, `ensures`, `invariant` statements); do not use Lean tactics as if they were Verus syntax. Keep the code and diagnostic from each retry so a failed candidate cannot silently become training data.

## technique: RLTPF data allocation
What it is: replace human labels with theorem-prover labels and train verified pairs differently from contradictory pairs. Table 1 sends two verified answers to SFT, one verified and one false answer to DPO, and two false answers to disposal; formalisation errors go through iterative repair (Section 2.2.2, Table 1). The paper summarizes: "RLTPF replaces human evaluators with a theorem prover, which verifies each formalised reasoning step." (Section 2.3, p.4).

Steps: generate two model answers; formalise and verify both; put verified/verified examples in SFT; make verified/false pairs for DPO; discard false/false; run one SFT epoch then three DPO epochs (Appendix B). The SIMQA corpus has 3,508 samples: 1,876 from GSM8K and 1,632 from MATH (Section 3). Dataset allocation is 2,562 SFT samples and 473 DPO pairs (946 answers) (Appendix A, Table 8).

Inference: for Verus, use verifier outcomes to build a Rust-proof SFT set and preference pairs, with the accepted candidate as the preferred completion. This transfers the allocation logic; Lean-specific formalisation and DPO prompts do not.

Evidence, trust, and threat: Table 2 reports Pass@1 accuracy. Section 3 uses exact matching, numerical parsing when exact matching fails, and gpt-4o-mini answer-alignment judgments for MATH-500, AIME, and OlympiadBench. Section 3 says the judge receives the last two output sentences; Appendix D instead describes the final three sentences for OlympiadBench. For Llama-3.1-8B on GSM8K, CoT is 82.38% and RLTPF 83.75%; for Llama-2-7B on MultiArith, CoT 39.44% and RLTPF 59.44%. On Llama-3.2-3B, AIME 2024 rises from 10.00% CoT to 13.33% RLTPF. Section 3 limits GSM-Symbolic-p1 evaluation to the first 500 samples; Table 2 does not print benchmark sample counts. The training set is only 3,508 samples, whereas comparison systems use up to 14M pairs (Section 4.1). SFT on all instances reached 82.23% GSM8K, while SFT on verified-only reached 81.55%; verified-only SFT plus RLTPF reached 83.75% (Table 7, Llama-3.1-8B). The authors note computational limits above 8B parameters and high iterative cost (Limitations, p.9).

## techniques for the catalog
- four-phase question formalisation — convert, verify, translate back, and align generated specifications before answer training
- stepwise theorem-prover judging — classify every intermediate proof step as verified, false, or execution error
- iterative autoformalisation — feed verifier diagnostics to a model and retry bounded formalisation repairs
- RLTPF allocation — train on verified examples with SFT and verified-versus-false pairs with DPO
