# SAFE: An LLM-as-Verifier Framework for Evidence-Grounded Multi-Hop Reasoning
(authored by agents unless marked 🧑)
Tag: `kwon2026safe`, [paper](https://arxiv.org/abs/2604.01993)

## scope and claims
SAFE treats multi-hop question answering as process verification. The paper’s central claim is that checking each intermediate, evidence-grounded step prevents errors before they propagate. It reports an average +8.8 percentage-point accuracy gain over the strongest baseline on three verified benchmarks. The paper says, “Rather than judging only the final answer after generation, SAFE verifies reasoning during generation.” (Abstract, p. 1.)

## technique 1: atomic KG-grounded step verification
Use this when a generated reasoning chain must be tied to supplied passages. Represent every step as one knowledge-graph triple `(entity_head, relation, entity_tail)`. A step is valid only when both entities and the relation are explicitly supported by the passages. Check the current step before permitting generation of the next step. Classify failures in the paper’s fixed order: Procedural (loops, disconnected paths), Attribution (unsupported entity or relation), Logical (wrong relation), and Final Answer (locally valid path that does not answer the question). Return a diagnosis and correction guidance, then have the generator revise the step and continue from the corrected prefix. The paper states, “A step is considered valid only when its entities and relation are explicitly supported by the provided passages.” (Section 3.1, p. 3.)

Inference: In Verus, a Rust representation can use a `struct Step` and a specification predicate for evidence support, with `requires` on a verifier proof function and `ensures` that accepted steps satisfy the predicate. A loop over steps can carry an `invariant` saying all earlier steps are supported; the LLM itself remains outside the proof boundary. Verus proves the contract over the checker, not semantic truth of a model’s text.

Evidence: the reported evaluation samples 1,000 instances per benchmark from 2WikiMultiHopQA, HotpotQA, and MuSiQue, 3,000 total, each with ten passages. Across all five main generators, total averages are 61.5 EM, 74.3 F1, and 85.6 accuracy for SAFE, versus 52.4 EM, 64.8 F1, and 75.2 accuracy for self-verification; the accuracy denominator is the 3,000-question verified evaluation pool. Table 2 reports the +8.8-point difference. MuSiQue rises from 63.9% without verification to 75.6% with SAFE.

## technique 2: verify and repair benchmark supervision
Use this before training a verifier when dataset reasoning paths may be incomplete or ambiguous. The paper’s pipeline is: (1) prompt an LLM to extract atomic triples from gold passages; (2) run up to two additional gleaning rounds to recover missed triples; (3) resolve synonymous/coreferential entities into a normalized local KG; (4) search for a continuous evidence-grounded path to the gold answer; (5) remove the item if no valid path exists. The paper says, “If no valid reasoning path can be found under this protocol, the data is marked as unverifiable and removed from the verified set.” (Section 3.3, p. 4.)

SAFE flags 7,452 of 167,454 2Wiki train items (4.45%), 901 of 12,576 validation items (7.16%), 2,376 of 90,447 Hotpot train (2.63%), 227 of 7,345 validation (3.09%), 2,149 of 19,902 MuSiQue train (10.80%), and 342 of 2,412 validation (14.18%). These denominators and percentages are Table 1’s dataset-specific counts.

It then constructs 3.9k ideal trajectories, injects 7.6k controlled negative examples, and adds 848 hard cases through a train–analyze–augment cycle, yielding 11.5k verifier instances.

## technique 3: externally trained verifier with structured feedback
Train a separate verifier rather than asking the generator to critique itself. For trajectory prefix `s1:t`, the verifier predicts validity/error category `y`, diagnosis `d`, and guidance `g`; valid steps are accepted, invalid steps are revised. The implementation fine-tunes Qwen3-8B with QLoRA for two epochs, learning rate 1×10^-4, effective batch size 64, on four A6000 GPUs; inference is greedy (temperature 0), with at most three retries and ten steps. In the feedback-format ablation, guidance-only feedback is much better than diagnosis-only, and full feedback is best or tied overall. For Gemma-3-12B the three-dataset averages are 85.5 (guidance only), 81.9 (diagnosis only), and 86.2 (full); Llama-3.1-8B gives 85.4, 77.9, 85.4 and Qwen3-8B gives 85.9, 84.3, 86.3 (Table 3, p. 7; the table's "Avg" column over 2Wiki, HotpotQA, MuSiQue). Removing the Procedural category lowers Gemma’s average score from 86.2 to 85.2; removing Attribution lowers it to 84.4 (Table 4). Training the verifier on synthetic errors only gives an average of 82.7 versus 85.6 with the added 848 hard cases (+2.9, Appendix Table 17).

Inference: a Verus analogue can prove that a repair transition preserves a well-formed prefix using `requires`, `ensures`, `assert`, and loop `invariant`; model-generated diagnosis and guidance are untrusted inputs checked by executable Rust predicates.

## technique 4: missing-evidence detection and retrieval
Train a Missing Evidence category that emits a search query when the current context lacks support. In the experiment, one gold passage is removed from the initial context; the verifier-generated search queries retrieve the top 3 passages from the full corpus with BM25, and the paper compares answering with that retrieval against answering with the incomplete context. On 100 examples per benchmark, with Gemma 3 12B, Qwen 3 8B, and Llama 3.1 8B, retrieval raises average accuracy from 44.9% without retrieval to 85.8% with retrieval, a +40.9-point gain (Table 8; the denominator is 100 examples for each of three datasets, averaged). The paper says, “While this experiment does not aim to solve full open-domain retrieval, it demonstrates that SAFE can identify missing-evidence failures and use them to guide retrieval.” (Section 5, Finding 5, p. 8.)

## what is proved, trusted, and limited
The paper measures answer EM, token F1, and LLM-as-judge accuracy; it does not provide a formal proof that the verifier’s classifications are sound.

## techniques for the catalog
- atomic KG step checking — represent each step as one evidence-supported triple and classify procedural, attribution, logical, or final-answer errors
- verified supervision filtering — extract, glean, resolve, search, and discard examples without a grounded path
- external diagnosis and repair — train a separate verifier to return validity, diagnosis, and actionable guidance
- missing-evidence retrieval — emit a query for unsupported context, retrieve passages, and continue verification
