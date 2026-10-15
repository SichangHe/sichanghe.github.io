# SpecMind: Cognitively Inspired, Interactive Multi-Turn Framework for Postcondition Inference
(authored by agents unless marked 🧑)
Tag: `le2026specmind`, [paper](https://www.semanticscholar.org/paper/c46c8b1a2de32f1da11018119cdd30cc961b74ad)

## what the paper proves or measures

SpecMind infers program postconditions with an interactive loop rather than one-shot generation. It separates exploratory assertions from submitted candidates, keeps structured history, tracks the best submitted postcondition, and lets the model stop when a completeness threshold is met or progress stalls. The abstract says: “SpecMind employs feedback-driven multi-turn prompting approaches, enabling the model to iteratively refine candidate postconditions by incorporating implicit and explicit correctness feedback, while autonomously deciding when to stop.” (Abstract, p.1). The paper studies Python functions, so a Verus adaptation is an inference.

A postcondition must hold for every correct input/output pair. The paper evaluates correctness on a finite test suite and completeness by the fraction of mutants rejected. EvalPlus has 164 Python problems, with roughly 775 tests per problem (Section 6, p.5). Under Llama 4 Scout, the strict configuration `τ=90, μ=12` reaches 99.4% correctness and 89.6% completeness, averaging 7.2 attempts and 1.7 submissions per task (Table 1, p.6). These percentages are across the 164-task EvalPlus dataset; they are test- and mutant-based proxies, not formal proofs for all inputs.

## technique 1: exploration–submission decoupling

what it is: let the LLM issue `<assert>` probes that receive feedback without replacing the current answer, and `<solution>` submissions that are scored and eligible to become the final answer. Exploration can test partial hypotheses before commitment.

when to use: use it when one-shot postconditions are syntactically plausible but incomplete, especially when several behavioral clauses must be combined. It is useful when feedback can distinguish a sound but weak assertion from a stronger one.

how to do it:
1. supply the function code, documentation, test suite, and mutant set
2. ask the model to reason, then choose either `<assert>` or `<solution>`
3. evaluate submitted assertions for test correctness and mutant catching
4. append every exploration and submission, with feedback, to the history
5. update the best-so-far record only when a submitted score improves it
6. return the best record when the model stops or the budget is exhausted

The paper’s formal loop calls `LLM.generate(prompt)` and returns `ϕbest` when `LLM.decidesToStop(H,sbest)` is true (Algorithm, p.4). It states: “Only submission attempts update the best-so-far candidate, while exploratory turns gather semantic evidence.” (Section 2, p.3). In the `search` example, exploratory turns first add return-value and frequency constraints, then recover the missing maximality/no-solution clause after a failed assertion (Figure 1, pp.2–3).

Verus form (Inference): map `<solution>` to a candidate `ensures` clause and `<assert>` to a ghost assertion or temporary proof obligation. Compile and verify only submitted candidates, while retaining exploratory text as search history. Use Verus’s `requires`, loop `invariant`, and `ensures`; an exploratory assertion does not become a runtime check and cannot certify the contract.

evidence and limits: at `τ=90, μ=12`, Exploratory reaches 99.4% correctness and 89.6% completeness, versus single-pass nl2postcond at 73.3% and 36.0% (Table 1, p.6). The result depends on the finite tests and mutants. Inference: a Verus deployment can replace those proxies with proof success and counterexample obligations, but the paper does not measure that setting.

## technique 2: structured history-aware prompting

what it is: synthesize each prompt from the original function and a buffer of prior postconditions, action types, observations, and scores. This lets the model explicitly revisit earlier mistakes instead of receiving an isolated retry.

how to do it:
1. initialize `H=[]` and a best score of zero
2. construct `PromptTemplate(f,H)` before every generation
3. append `(ϕ,type)` for every exploration or submission
4. annotate submitted entries with correctness feedback and a normalized completeness score
5. include uncaught mutants as feedback when a threshold is not reached
6. continue until stopping or the attempt budget

The paper defines `H_t=[(ϕ1,feedback1),…,(ϕ_{t−1},feedback_{t−1})]` and `Prompt_t=PromptTemplate(f,H_t)` (Section 5, p.5). It says the history “enables explicit reflection on prior mistakes and behavior gaps during historical exploration” (Section 4, p.4). In the illustrated `search` task, the fourth exploratory attempt fails because its universal condition is wrong; the fifth turn uses that observation to formulate a complete maximality condition (Figure 1, p.2).

Verus form (Inference): keep a revision log containing source revision, Verus diagnostics, failed assertions, and counterexamples; inject a bounded, structured summary into the next prompt. Preserve raw diagnostics so summarization cannot erase a proof obligation. Re-run Verus after every submitted contract.

evidence and limits: the authors analyze 1,026 reasoning instances from 159 EvalPlus cases, averaging 6.5 instances per case (Section 6.2, p.7). Their category counts include 419 refinement and 270 function-behavior verification reasonings (Table 2, p.7). The paper does not show that each category causes the performance gain; they are labeled observations.

## technique 3: completeness feedback from tests and mutants

what it is: score correctness as passing every known correct execution and completeness as the percentage of mutants rejected by the candidate. Feedback can be binary or can name an uncaught mutant.

how to do it:
1. run the candidate on all test inputs and reject it if any correct execution fails
2. execute the candidate against each mutant
3. compute `Comp(ϕ)=|mutants rejected by ϕ|/|M|`
4. return pass/fail and the score to the model
5. when the score is below threshold, provide an uncaught mutant for refinement

The paper defines completeness as “the percentage of mutants that can be distinguished (i.e., rejected) by the postcondition when used with the test suite.” (Section 2, p.3). Correctness is not enough: the paper notes that a trivial `True` postcondition passes tests but has no bug-detection power (Section 2, p.3).

Verus form (Inference): use Verus verification success for semantic correctness and generate targeted counterexamples or mutated implementations to test discriminative strength. A candidate `ensures` that verifies but is vacuous should be rejected by a separate requirement or mutation campaign. Verus itself does not provide the paper’s percentage metric; the harness must do so.

evidence and limits: on FixEval, the authors filtered 243,000 Python buggy/correct pairs to 157,355 after runtime-error removal and randomly selected 384 bugs for a 95% statistical-significance target (Section 6.5, p.9). With `μ=10`, Exploratory distinguishes 39.58% of buggy versions and passes 95.57% of correctness tests; the corresponding random-sampling baseline distinguishes 27.86% and passes 86.20% (Table 3, p.9). Completeness depends on mutant quality and test coverage, as the paper’s limitations state; these are not formal coverage guarantees.

## technique 4: autonomous stopping and best-so-far control

what it is: choose a threshold `τ` and attempt budget `μ`; after each submission, stop when the model decides the threshold is met, returns diminish, or the budget is exhausted. Return the highest-scoring submitted candidate, not the last candidate.

how to do it:
1. set `τ` and `μ`
2. after each submitted candidate, compare its score with `sbest`
3. update `ϕbest` only when the score improves
4. call `LLM.decidesToStop(H,sbest)` after each turn
5. return `ϕbest` on a stop decision or at `μ`

The paper identifies four design ideas: “explicit exploration-submission decoupling, 2) structured history-aware reasoning, 3) best-so-far tracking, and 4) autonomous stopping” (Section 2, p.3). It reports that raising `τ` improves final completeness but reduces efficiency (Section 6.1, p.6).

Verus form (Inference): use a bounded repair budget and retain the strongest candidate according to a verified score, such as the number of obligations discharged or counterexamples eliminated. Stopping must never accept a candidate that Verus has not checked. A model-controlled stop can end search early, but it cannot weaken the required proof.

evidence and limits: under `τ=90, μ=12`, Exploratory averages 1.7 submissions, while token usage averages 8,299 per instance (range 1,313–29,956) and cost is 0.25 cents per instance (Section 6.4, p.8). The stopping policy is model-dependent and can stop on a mistaken confidence signal.

## technique 5: enhanced feedback for hard cases

what it is: when binary feedback fails on a hard case, provide a randomly selected uncaught mutant and allow four extra attempts. This gives the model a concrete behavioral gap instead of only pass/fail.

how to do it:
1. run the standard `τ=90, μ=12` loop
2. identify cases that exhaust the budget without reaching completeness
3. return one uncaught mutant and request a refinement
4. extend the budget to `μ=16`
5. score correctness and completeness again

The strict run produced 23 hard cases out of 159: one had no correct postcondition and 22 had completeness below 90, averaging 56.2% (Section 6.3, p.7). Enhanced feedback raised correct postconditions to 22/23 and average completeness to 85.1%; applying enhanced feedback only to the remaining hard cases produced 99.7% correctness and 92.0% completeness (Section 6.3, p.7). The denominator is 23 hard cases for the first figure and the 22 correct cases for the threshold-reaching count (14/22).

Verus form (Inference): after a failed Verus proof, feed a concrete counterexample or minimized failing state back to the model, then allow a bounded repair extension. Verify each repair and report both proof success and remaining counterexamples. This is analogous to counterexample-guided repair, but the paper’s mutants are Python test artifacts.

## trusted boundary, contradictions, and product relevance

The paper’s measurements establish performance on EvalPlus and FixEval under Llama 4 Scout, selected thresholds, finite tests, and finite mutants. They do not establish correctness for arbitrary inputs, complete bug detection, or generalization to Rust; the limitations explicitly say generalization to larger systems, languages, and specifications is not guaranteed (Section 6, p.10). Inference: for VL, Verus checking of the final `ensures` and proof obligations is the hard boundary; LLM exploration, feedback summaries, stopping, tests, and mutation scores are untrusted search signals. The strongest reusable idea is to separate exploration from commitment and to use concrete verifier feedback, while treating vacuous specifications and incomplete mutant sets as product risks.

## techniques for the catalog

- exploration–submission decoupling — probe assertions with feedback while updating the final candidate only on submitted postconditions
- structured history prompting — carry prior candidates, diagnostics, and scores into each new generation
- test/mutant completeness feedback — measure correctness on known executions and discriminative power on mutated implementations
- autonomous best-so-far stopping — stop at a threshold or budget and return the strongest submitted candidate
- enhanced hard-case feedback — provide an uncaught mutant and extra attempts when binary feedback stalls

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
