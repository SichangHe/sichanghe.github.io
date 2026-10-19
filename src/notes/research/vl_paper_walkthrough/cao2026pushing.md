# Pushing the Boundaries of Natural Reasoning: Interleaved Bonus from Formal-Logic Verification in Language Models
(authored by agents unless marked 🧑)
Tag: `cao2026pushing`, [paper](https://arxiv.org/abs/2601.22642v2)

## what the paper proves or measures

Cao et al. train Qwen2.5 7B and 14B models to interleave natural-language reasoning with executable formal logic and verifier feedback. The framework has supervised fine-tuning (FLV-SFT) followed by Group Relative Policy Optimization (FLV-RL). Its formal artifacts are symbolic constraints, SAT/SMT formulas, or executable code; a verifier returns satisfiability results, counterexamples, proof traces, execution outputs, or errors. The abstract describes the goal: “we introduce a formal logic verification-guided framework that dynamically interleaves formal symbolic verification with the natural language generation process, providing real-time feedback to detect and rectify errors as they occur.” (Abstract, p. 1)

The paper measures reasoning accuracy on six benchmarks, data filtering and proof-validation rates, tool-use distributions, and training overhead. The abstract claims “average margins of 10.4% and 14.2%, respectively.” (Abstract, p. 1) Table 1 reports FLV-RL averages of 51.9 (7B) and 58.6 (14B), versus RLPR’s 47.0 (7B) and General-Reasoner’s 51.3 (14B). Inference: these differences are 4.9 and 7.3 percentage points, or approximately 10.4% and 14.2% relative gains. The strongest listed 7B baseline overall is SimpleTIR at 49.4, giving a smaller 2.5-point gain (about 5.1% relative). These benchmark scores do not establish that every generated reasoning step is valid. The introduction reports that 39.3% of steps in chains with correct final answers and 52.4% in chains with incorrect answers were formally disproved (Section 1, p. 2); the denominators are generated reasoning steps, and the paper does not give their total count in that sentence.

## technique 1: interleave natural reasoning with executable formal checks

what it is: expand a chain of thought from `(s1, …, sn)` to `(s1, f1, v1, …, sn, fn, vn)`, where `si` is natural language, `fi` is a formal encoding, and `vi` is the verifier result. In the implemented loop, the model receives feedback after a selected tool call before continuing; Section 5.4 relaxes the formulation’s requirement to verify every step. The paper states: “During inference, the verification function V takes the formal reasoning as input and returns detailed feedback at each reasoning step.” (Section 3.2, p. 3)

when to use: Inference: use this for multi-step deduction and constraint reasoning where the generated formalization can be checked reliably. The paper cautions: “While conversion success rates are high in structured domains like mathematics and logic, ambiguous or commonsense-heavy descriptions may produce mapping errors that generate incorrect verification feedback, limiting generalizability to open-ended reasoning tasks and highlighting the need for more robust auto-formalization techniques.” (Limitations, p. 13)

how to do it:

1. generate a natural-language step `si` for the current problem (Section 3.2, p. 3)
2. emit a formal specification `fi`, such as symbolic constraints, SAT/SMT formulas, or executable code (Section 3.2, p. 3)
3. execute a formal interpreter and record `vi` (satisfiable/unsatisfiable, counterexample, proof trace, execution output, or error) (Section 3.2, p. 3)
4. condition subsequent reasoning on `vi`; continue until a final answer or the interpreter-call limit, allowing direct calculation and selective verification under the final flexible strategy (Figure 3, p. 5; Section 5.4, p. 8); the implementation limits verification to four iterative rounds (Section 5.1, p. 7)

Verus form. Inference: treat each Rust/Verus proof obligation as a formal action emitted beside an explanation: a `spec fn`, `assert`, `requires`/`ensures` contract, loop `invariant`, or `proof fn` lemma. Run Verus after each proposed proof fragment and feed diagnostics back into the next fragment. Inference: Verus's result is stricter than a model-based language verifier when the code and specification are in Verus's supported subset, but a failed proof is not itself a counterexample; the agent must distinguish solver failure from a falsified contract. Inference: retain the reviewed top-level contract while allowing only proof-side edits, because a model can otherwise “fix” a failure by weakening the specification.

evidence and limits: on 500 randomly sampled instances per domain, FLV-SFT achieved 291/500 logical, 243/500 mathematical, and 213/500 general correct answers, versus Natural-SFT's 219/500, 163/500, and 166/500 (Figure 2, p. 3). The paper's setting is three 500-instance samples, so the denominators are 500 per domain. The formal-check path can hurt: Appendix E describes a MATH-500 case where mandatory Z3 construction led to 81 instead of the correct 27, and discusses flexible verification as the remedy (Appendix E, pp. 16–17; Table 6, p. 21).

## technique 2: hierarchical SFT data synthesis with execution validation

what it is: construct training records in which every natural-language module is paired with a generated formal proof and an observed execution result. A teacher generates candidate chains; an LLM decomposes a selected chain into modules and synthesizes formal code; a sandbox executes that code; exact matching, semantic equivalence, or proof rewriting decides whether the record is retained.

how to do it:

1. use a teacher model to generate `K = 4` candidate chains and a judge to calculate final-answer pass rates (Section 4.1.1, p. 4)
2. select correct chains and decompose each into logical modules `{sk}`; synthesize a formal proof `fk` and expected output `vkexp` for each module (Section 4.1.1, p. 4)
3. execute `fk` in a sandbox to obtain `vkact` (Section 4.1.1, p. 4)
4. accept immediately when `vkact = vkexp` (Stage 1, Section 4.1.1, p. 4)
5. when outputs differ, ask a verification model whether they are semantically equivalent; accept equivalent outputs for rewriting (Stage 2, Section 4.1.1, p. 4)
6. for minor inconsistencies, regenerate the natural-language module conditioned on `vkact`; discard proofs that fail both exact and semantic checks (Stage 3, Section 4.1.1, p. 4)
7. train on the resulting `zaug` records with the SFT likelihood in equations (3)–(5) (Section 4.1.2, p. 4)

Verus form. Inference: use a Rust/Verus function body as `fk`, run Verus in an isolated workspace, and retain the module only when the checker succeeds and the executable test output agrees with the expected result. Represent the reviewed specification as `requires`/`ensures` and keep proof-only lemmas as `proof fn`; do not let rewriting alter the contract. Inference: Verus diagnostics replace a generic “verified execution output,” but semantic-equivalence adjudication remains an untrusted model step and must not override a failed Verus check. Inference: examples can be stored as small proof functions with concrete `ensures`, while runtime behavior is tested separately.

evidence: Appendix Table 4 gives 84,641 distilled chains, 19,543 after filtering (19,543/84,641 = 23.1%), and 14,117 after formalization, execution validation, and deduplication (14,117/19,543 = 72.2%). Appendix Table 5 analyzes 9,162 chains: 5,456/9,162 (59.55%) have exact 100% match; among the 3,706 non-exact cases, 2,306/3,706 (62.22%) are judged consistent and 1,400/3,706 (37.78%) inconsistent. The appendix claims approximately 85.7% overall retention using `59.55% + 40.45% × 62.22%` (Appendix B, p. 14; Table 5, p. 15). Inference: direct arithmetic gives about 84.7%, so the reported 85.7% is inconsistent with its displayed components.

limits: the formalization model can mistranslate natural language, especially outside structured math and logic (Limitations, p. 13). Inference: sandbox execution checks the generated formal artifact but cannot by itself establish that the artifact captures the natural-language meaning. Data selection also relies on the answer judge and semantic-equivalence model.

## technique 3: hierarchical reward and FLV-GRPO

what it is: optimize the interleaved policy with a reward that first rejects pathological output, then rejects malformed format, then combines structural and answer-correctness rewards. The paper states: “For responses that pass the format checks” the reward “is a composite of structural quality and logical correctness.” It defines `Rtotal(y) = Rstruct(y) + Rlogic(y)` for those outputs (Section 4.2.1, p. 5). GRPO samples groups of outputs and normalizes advantages within each group (Section 4.2.2, pp. 5–6).

how to do it:

1. classify token repetition, timeout, more than `2 × Nmax` tool calls, or multiple termination tags as fatal; assign `Rfatal = −γstruct − W` (Section 4.2.1, p. 5; Appendix Table 3, p. 13)
2. classify missing extraction, over-512-token solutions, missing closing tags, or calls satisfying `Nmax < Ncall ≤ 2 × Nmax` as invalid format; assign `Rinvalid = −βstruct − W` (Section 4.2.1, p. 5; Appendix A, Table 3, p. 13)
3. for valid outputs, compute `Rstruct = α − λtag·Nundef − λcall·max(Ncall−Nmax,0)` (equation 8, p. 5); Appendix A caps the tag count as `min(Nundef, τtag)` (Table 3, p. 13)
4. compute `Rlogic = W − λlen·Δlen` for a correct answer and `−W` otherwise (equation 9, p. 5); Appendix A defines the length penalty as `min(abs(len(â)−len(a∗)), δmax)` (Table 3, p. 13), and Appendix C identifies CompassVerifier-7B as the model-based verifier for answers beyond rule-based checking (p. 15)
5. sample `G` outputs per difficult prompt, normalize rewards into advantages, and apply the clipped GRPO objective with a KL penalty (equation 10, pp. 5–6)

Verus form. Inference: use Verus success as a hard component of `Rlogic`: a candidate that does not verify receives no proof-validity reward, while format and answer rewards remain separate. Inference: count tool calls, timeouts, and malformed proof blocks as structural penalties; keep the contract hash fixed across rollouts. Inference: the final accepted artifact still requires a clean Verus run outside the reward loop, because reward optimization can exploit a bug in the reward parser or a weak specification.

evidence: Appendix Table 3 fixes `W=3`, `γstruct=3.0`, `βstruct=1.0`, `α=1.0`, `λtag=0.005`, `τtag=200`, `λcall=0.5`, `Nmax=3`, `λlen=0.04`, and `δmax=10`. The pseudocode prints `−8.0` for fatal outputs and `−6.0` for invalid-format outputs (Appendix A, p. 13). Inference: those printed results contradict its formulas and parameters, which give `−3−3=−6` and `−1−3=−4`; the paper alone does not resolve which values were implemented. Training uses eight rollouts per prompt, temperature 1.0, batch size 1024, context length 16,384, 120 steps, 16 NVIDIA H800 GPUs, and at most four iterative verification rounds (Section 5.1, p. 7). Table 2’s 7B ablation reports FLV-SFT 49.8 average versus Natural-SFT 36.3, and FLV-RL 51.9 versus Natural-RL 37.0; each average is over the six named benchmarks, not a count of instances (Table 2, p. 8).

limits: the paper reports approximately doubled RL training time relative to tool-free General-Reasoner and cites 10.4%–14.2% improvement as part of its justification (Limitations, p. 13). Inference: rewarding final-answer correctness does not establish the validity of every natural-language step. The enforced-verification failure illustrates a reasoning error despite explicit negative tool feedback (Appendix E, pp. 16–17; Table 6, p. 21).

## technique 4: flexible verification and tool-role separation

what it is: let the model use direct calculation for arithmetic and use formal tools as post-hoc validators for logical steps, instead of forcing a formal checkpoint after every step. The paper says: “Logic as validation: formal verification serves as post-hoc validation for logical steps rather than a per-step constraint.” (Section 5.4, p. 8)

how to do it:

1. classify the current operation as calculation or logical validation (Section 5.4, p. 8)
2. use direct numerical tools without mandatory verification keywords; the construction prompt advises avoiding code for elementary arithmetic (Section 5.4, p. 8; Appendix L, p. 27)
3. use Z3/SMT or symbolic tools when the step needs constraints, equivalence, or counterexamples (Section 3.2, p. 3; Appendix L, p. 27)
4. run the verifier after a logical block and feed its result into later reasoning, without forcing a redundant proof script for every arithmetic line (Section 5.4, p. 8)

Verus form. Inference: let ordinary Rust compute concrete arithmetic while Verus proves the general relational property in a `spec fn` and `ensures` clause. Use `assert` or `proof fn` only where the arithmetic fact is needed by the proof; do not generate a solver call for a value that a direct computation already determines. Inference: this separation reduces proof noise but does not reduce the obligation to prove the final Rust function and its loop invariants.

evidence: Figure 9 reports symbolic/logic package use of 62.5% for FLV-RL versus 42.5% for SimpleTIR, while numerical/scientific use is 20.4% versus 21.8% (Appendix F, p. 17). Figure 9 labels these values “Percentage of Package Usage (%)”; the paper does not state a total invocation count there. The MATH-500 failure case illustrates a model rationalizing away a “DISPROVED” result (Appendix E, pp. 16–17; Table 6, p. 21).

## evidence, assumptions, and trust boundary

The reported gains are empirical benchmark scores under Qwen2.5 7B/14B, OpenCompass evaluation, greedy decoding except AIME24 avg@16, and the listed training data and baselines (Section 5.1, p. 6).

The paper's claims have scope limits. The limitations acknowledge “formalization challenges when translating natural language into verifiable formal representations.” (Limitations, p. 13)

## techniques for the catalog

- interleaved formal reasoning — emit selected formal artifacts during natural-language reasoning and condition subsequent reasoning on verifier feedback
- execution-validated SFT synthesis — generate, execute, compare, semantically check, and rewrite formal proof/data modules before fine-tuning
- hierarchical FLV-GRPO reward — reject fatal and malformed outputs before combining structural, answer, and tool-use rewards
- flexible verifier role assignment — use direct calculation for arithmetic and formal tools for logical validation rather than enforcing every checkpoint
