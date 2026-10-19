# CodeGrad: Integrating Multi-Step Verification with Gradient-Based LLM Refinement
(authored by agents unless marked 🧑)
Tag: `zhang2025codegrad`, [paper](https://arxiv.org/abs/2508.10059)

## what the paper proves or measures

CodeGrad is an iterative Python code-generation loop. A forward language model writes a candidate; a backward model reviews it for correctness, input/output format, efficiency, and completeness; the review becomes an ordered textual pseudo-gradient; and a proposed update is accepted only if the abstract `VERIFY` predicate accepts its accompanying proof and invariants. This describes the proposed method; the paper does not specify an implementation of `VERIFY`. The paper states: “CodeGrad introduces a principled framework that integrates rigorous verification techniques directly into an iterative LLM-based generation loop.” (Abstract, p. 1). Its objective combines functional correctness, expressed as `∀x ∈ D : P(x) = fT(x)`, with invariants for format, edge cases, complexity, and syntax (Section III-A, p. 2).

The experiments measure pass@1 on HumanEval (HE), HumanEval+ (HE+), and LiveCodeBench V6 (LCB V6). HE contains 164 problems; LCB V6 contains 175 questions released from January through May 2025 (Section III-C, p. 3). The paper does not explicitly state a problem count for HE+. All experiments use Qwen2.5Coder-3B as the forward model, Qwen3-1.7B or GPT4.1-mini as backward model, vLLM on an NVIDIA A6000 for open models, and at most two refinement iterations (Section III-C, p. 3).

## technique 1: textual pseudo-gradient refinement

what it is: CodeGrad treats a discrete program as a text variable and converts review feedback into an ordered list of edits. The paper gives the shape `g(t) = Parse F(t) → {(location, action)}j`, with an example action “replace O(n3) loop with linear scan” (Section III-B, p. 2). The gradient is textual rather than numeric: “Rather than a numeric vector, this gradient consists of specific, textual edits that steer the code toward an optimal state.” (Introduction, p. 1).

when to use: Inference: use this when a generated implementation is syntactically usable but has identifiable correctness, format, complexity, or completeness defects. The backward model's four fields are `Fcorr`, `Fio`, `Feff`, and `Fcomp` (Section III-B, p. 3).

how to do it:

1. Give the task description `T`, the previous candidate `P(t−1)`, and the previous gradient, when one exists, to the forward model; it emits `P(t) = LMfwd(T, P(t−1), ∇P(t−1))` (Section III-B, p. 3)
2. Ask the backward model to return structured feedback for correctness, I/O, efficiency, and completeness (Section III-B, p. 3)
3. Parse every comment, suggestion, or error into `(location, action)` edits that identify where to change the program and what change to make (Section III-B, pp. 2–3)
4. Feed the ordered edits to the forward model to generate the next candidate, subject to the acceptance check described below (Section III-B, p. 3)
5. Stop when all backward fields say `pass` or when the fixed iteration limit is reached (Section III-B, p. 3)

example: Figure 1 starts with an O(n3) triple-loop maximum-subarray solution. The critic identifies inefficiency and failure on all-negative inputs, and the optimizer produces an O(n) solution with a formal efficiency invariant (Figure 1, p. 2). The exact example is a paper claim about the figure, not a guarantee for arbitrary tasks.

Verus form: Inference: represent the generated Rust function with `requires` and `ensures`, then let an agent propose edits to the body, `assert` statements, loop `invariant` declarations, and supporting `proof fn` lemmas. A proposed Rust adaptation could use Verus for the prerequisite check represented by CodeGrad's abstract `VERIFY` predicate. The paper's Python text gradient and its unknown target function do not carry over as executable Verus constructs; the candidate still needs a precise Verus specification, and the final Rust program must be submitted to Verus.

evidence and limits: Table I reports pass@1 rates. Relative to the null forward-only model (Qwen2.5Coder-3B), GPT4.1-mini without code execution reaches 0.811 on HE, 0.756 on HE+, and 0.251 on LCB V6; with CodeGrad's `+Code` configuration it reaches 0.884, 0.817, and 0.201. Inference: HE's 0.884 versus 0.695 null is a 0.189 absolute gain, or 27.2% relative, over 164 tasks; LCB V6's 0.201 versus 0.143 null is a 40.6% relative increase for the 175-question benchmark with execution; the non-executing reviewer reaches 0.251, about 75.5% above null. These percentages are calculated from rounded table entries. The pass@1 entries are rates and the arrow labels show relative increases; Table I gives no successful-task numerators. Inference: the loop is a search heuristic, not a proof that textual edits descend toward a global optimum. The paper does not prove convergence or semantic equivalence between a critic's edit and the intended requirement.

## technique 2: invariant prerequisite check with a natural-language proof

what it is: after a proposed update, CodeGrad asks the forward model for a natural-language proof `Π(t+1)` that each invariant holds and accepts the update only when `VERIFY(P(t+1), Π(t+1), I) = true`. The paper emphasizes: “Crucially, it requires each revision to have a natural language “proof” of its correctness.” (Introduction, p. 1). The formal optimization is `min P∈S L(P;T)` subject to `∧ Ii(P) = true` (Section III-B, p. 3).

when to use: Inference: use it when requirements include properties that ordinary unit tests may miss: edge-case completeness, asymptotic efficiency, I/O format, or syntax. Figure 1 describes correcting both inefficiency and an all-negative-input defect, but explicitly names only a formal efficiency invariant (p. 2).

how to do it:

1. Declare the invariant set `I = {I1, ..., Ik}` for the task (Section III-A, p. 2)
2. Generate a candidate and its proof text from the current candidate, gradient, and `I` (Section III-B, p. 3)
3. Apply the abstract `VERIFY` acceptance condition to the candidate, proof, and invariant set; discard the update if it is false. The paper does not identify a proof language, verifier tool, or checking algorithm (Section III-B, p. 3)
4. Continue alternating soft textual updates and this prerequisite check until all feedback fields pass or the iteration bound is reached (Section III-B, p. 3)

Verus form: Inference: write each safety or functional requirement as a Verus `ensures` clause, use loop `invariant` declarations for preservation, and put mathematical helper arguments in `proof fn` lemmas with `assert` steps. Use natural-language explanations to guide edits and Verus acceptance of the Rust body and specification as the prerequisite check. These are proposed adaptations, not techniques evaluated in this Python paper.

evidence and limits: The benchmark results above are the paper's evidence for the combined loop, not an isolated ablation of the proof prerequisite check. Inference: because the invariants are supplied as predefined constraints, CodeGrad does not establish that the task description was formalized correctly or that the invariant set is complete. A vacuous or incorrect invariant can pass. The paper calls the accompanying text a natural-language “proof” but leaves `VERIFY` unspecified. Inference: the benchmark results therefore do not establish that an independent machine verifier checked those proofs.

## technique 3: execution-enabled backward criticism

what it is: a backward model may run sandboxed code probes while reviewing a draft. The experiment compares architecturally identical backward models with and without this capability; the `+Code` suffix denotes execution (Table I and Section IV-B, p. 3). The paper says: “Our approach builds upon the established principle of using partial execution for self-debugging” (Section IV-B, p. 3).

when to use: Inference: use probes for ordinary function-shaped tasks where concrete executions expose wrong outputs or simple runtime errors. The authors caution that LCB V6's stdin/stdout and strict efficiency constraints are difficult to reproduce with isolated snippets (Section IV-B, p. 4).

how to do it:

1. Hold the forward model and reviewer architecture constant (Section IV-B, p. 3)
2. Allow the `+Code` reviewer to run sandboxed code probes; the paper does not specify the probe count or selection procedure (Section IV-B, p. 3)
3. Inference: feed probe observations into the review fields and textual gradient. Sections III-B and IV-B describe the feedback pipeline and execution capability but do not specify their integration in detail (p. 3)
4. Compare pass@1 with the non-executing reviewer on the same benchmark and category (Section IV-B, p. 3)

Verus form: Inference: a Rust/Verus workflow can run bounded executable probes outside proof code, retain their inputs and outputs as diagnostic evidence, then propose `assert` or contract changes. Probes do not replace Verus's universal reasoning: they cover sampled executions, while `requires`, `ensures`, `invariant`, and `proof fn` obligations must still verify. Keep probes sandboxed and separate from proof-only functions.

evidence and limits: For GPT4.1-mini, execution changes HE from 0.811 to 0.884 and HE+ from 0.756 to 0.817, but changes LCB V6 from 0.251 to 0.201 (Table I, p. 3; HE has 164 tasks and LCB V6 has 175 questions). For Qwen3-1.7B, HE stays at 0.787 with and without execution, HE+ changes from 0.713 to 0.726, and LCB V6 changes from 0.166 to 0.160 (Table I, p. 3; HE+ denominator not stated). Table II gives category rates without denominators: GPT4.1-mini `+Code` is 0.167 for Math and 0.143 for Simulation, while its non-executing Base is 0.262 and 0.179; Qwen3-1.7B `+Code` is 0.167 for Math and 0.143 for Simulation, versus 0.214 and 0.107 Base. In these reported runs, execution reduces pass@1 for some model/benchmark combinations. Inference: probe feedback is a useful critic signal but is distribution-sensitive and can mislead when the probe environment omits protocol or resource constraints.

## technique 4: category and difficulty stratification

what it is: the paper evaluates the loop separately by LiveCodeBench algorithmic category and by Easy, Medium, and Hard difficulty, rather than reporting only one aggregate score (Section IV-C, p. 4).

how to do it:

1. Assign each LCB problem a LeetCode-derived category (Section IV-C, p. 4)
2. Partition the same runs by category and by predefined difficulty (Section IV-C, p. 4)
3. Report pass@1 for the null, Base, and `+Code` configurations in each stratum (Tables II–III, p. 4)
4. Inspect where the backward model changes the outcome; the paper highlights Dynamic Programming, Graph, Greedy, Simulation, Math, and Hash Map (Section IV-C, p. 4)

Verus form: Inference: apply the same stratification to a Rust/Verus benchmark: label obligations by loop, arithmetic, ownership, API/FFI, and concurrency pattern, and report both proof acceptance and task denominators per stratum. This is an evaluation method, not a Verus language feature.

evidence and limits: Table III reports GPT4.1-mini `+Code` at 0.628 Easy, 0.135 Medium, and 0.025 Hard; the null is 0.558, 0.019, and 0.000. The table supplies no stratum denominators, so relative increases such as 611% for Medium are paper-reported rates rather than independently checkable counts. Table II reports GPT4.1-mini Base at 0.262 Math and 0.179 Simulation, with `+Code` at 0.167 and 0.143; Section IV-C reports gains of 101% for Simulation and 40% for Math, matching the rounded GPT4.1-mini `+Code` comparisons with null, rather than the larger Base scores. Inference: stratification can reveal where a verification-guided agent helps, but small or unstated strata make large relative percentages unstable.

## trusted boundary, contradictions, and product threat

The paper measures benchmark pass@1, not a theorem that generated Python is correct for every input. Its formal objective states universal correctness, but the reported evidence is finite benchmark evaluation. Inference: in a VL product, Verus's checking of the submitted Rust/specification pair is the soundness boundary for proved properties; the LLM forward model, backward critique, textual gradient, invariant selection, natural-language proof, and executable probes are search or specification inputs and remain trusted only to the extent that their assumptions are independently reviewed.

The abstract claims an “absolute improvement of up to 27% on HumanEval” (p. 1). Inference: Table I instead supports an 18.9 percentage-point gain, or about 27.2% relative, from 0.695 to 0.884. Likewise, Section IV-A calls the change from 0.695 to 0.811 a “17% absolute increase on HumanEval” (p. 3); the table implies 11.6 percentage points, or about 16.7% relative. The abstract's 41% relative LiveCodeBench claim corresponds to GPT4.1-mini `+Code`, 0.201 versus 0.143, while Base scores higher at 0.251. The paper also reports the opposite comparison when enabling execution: GPT4.1-mini drops from 0.251 to 0.201 on LCB V6 and Qwen3-1.7B drops from 0.166 to 0.160. Section IV-B describes the execution-related LCB V6 drops as 5.0% and 0.6% (p. 4). Inference: the displayed differences are 5.0 and 0.6 percentage points; relative decreases computed from the rounded entries are about 19.9% and 3.6%. The paper reports no cost, latency, proof size, failed-verification count, or successful-task numerator.

Inference: VL could reuse the proposed separation between a flexible critic and an invariant prerequisite check, and evaluate results by task category and difficulty. For Verus, an actual verifier would need to implement that check; CodeGrad does not document such an implementation. VL should not redo the already demonstrated observation that textual feedback can improve benchmark pass@1; it should test whether the same loop improves Verus proof completion while preserving specifications and measuring verifier time. A risk in adapting this loop to verified Rust is specification drift: a candidate can satisfy a weak or incomplete contract, and sampled probes cannot establish universal behavior. Human review of contracts, trusted external interfaces, and coverage beyond benchmark examples remains necessary.

## techniques for the catalog

- textual pseudo-gradient refinement — convert structured correctness, I/O, efficiency, and completeness feedback into ordered source edits for the next candidate
- invariant prerequisite check — accept an update only when the abstract `VERIFY` predicate accepts its invariants and accompanying proof; the verifier implementation is unspecified
- execution-enabled criticism — let a sandboxed backward model probe code and feed observations into the textual gradient
- stratified code-generation evaluation — compare pass@1 by algorithmic category and difficulty, noting that the paper omits stratum denominators
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This baseline achieves a pass@1 score of 69.5% on HumanEval, 67.1% on HumanEval+, and 14.3% on the more challenging LiveCodeBench V6."): checked the entire paper, quotations, model and benchmark details, Tables I–III, equations, technique steps, page references, and the arXiv link; corrected execution attribution, percentage interpretation, page citations, unsupported verifier claims, and inference labels; did not inspect code, reproduce experiments, or independently validate the proposed Verus adaptations.
