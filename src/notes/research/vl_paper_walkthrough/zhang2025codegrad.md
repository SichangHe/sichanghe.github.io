# CodeGrad: Integrating Multi-Step Verification with Gradient-Based LLM Refinement
(authored by agents unless marked 🧑)
Tag: `zhang2025codegrad`, [paper](https://arxiv.org/abs/2508.10059)

## what the paper proves or measures

CodeGrad is an iterative Python code-generation loop. A forward language model writes a candidate; a backward model reviews it for correctness, input/output format, efficiency, and completeness; the review becomes an ordered textual pseudo-gradient; and a second forward update is accepted only when a proof of the declared invariants verifies. The paper states: “CodeGrad introduces a principled framework that integrates rigorous verification techniques directly into an iterative LLM-based generation loop.” (Abstract, p. 1). Its objective combines functional correctness, expressed as `∀x ∈ D : P(x) = fT(x)`, with invariants for format, edge cases, complexity, and syntax (Section III-A, p. 2).

The experiments measure pass@1 on HumanEval (HE), HumanEval+ (HE+), and LiveCodeBench V6 (LCB V6). HE contains 164 problems; LCB V6 contains 175 questions released from January through May 2025 (Section III-C, p. 3). The paper does not state a denominator for HE+ in the extracted text. All experiments use Qwen2.5Coder-3B as the forward model, Qwen3-1.7B or GPT4.1-mini as backward model, vLLM on an NVIDIA A6000 for open models, and at most two refinement iterations (Section III-C, p. 3).

## technique 1: textual pseudo-gradient refinement

what it is: CodeGrad treats a discrete program as a text variable and converts review feedback into an ordered list of edits. The paper gives the shape `g(t) = Parse F(t) → {(location, action)}j`, with an example action “replace O(n3) loop with linear scan” (Section III-B, p. 2). The gradient is textual rather than numeric: “Rather than a numeric vector, this gradient consists of specific, textual edits that steer the code toward an optimal state.” (Introduction, p. 1).

when to use: use this when a generated implementation is syntactically usable but has identifiable correctness, format, complexity, or completeness defects. The backward model's four fields are `Fcorr`, `Fio`, `Feff`, and `Fcomp` (Section III, p. 2).

how to do it:

1. Give the task description `T`, the previous candidate `P(t−1)`, and the previous gradient, when one exists, to the forward model; it emits `P(t) = LMfwd(T, P(t−1), ∇P(t−1))` (Section III-B, p. 2)
2. Ask the backward model to return structured feedback for correctness, I/O, efficiency, and completeness (Section III-B, p. 2)
3. Parse every comment, suggestion, or error into `(location, action)` edits that identify where to change the program and what change to make (Section III-B, p. 2)
4. Feed the ordered edits to the forward model to generate the next candidate (Section III-B, p. 2)
5. Stop when all backward fields say `pass` or when the fixed iteration limit is reached; the paper says, “The loop terminates when LMbwd detects no violations (∀i : Fi = “pass”) or after N iterations.” (Section III-B, p. 2)

example: Figure 1 starts with an O(n3) triple-loop maximum-subarray solution. The critic identifies inefficiency and failure on all-negative inputs, and the optimizer produces an O(n) solution with a formal efficiency invariant (Figure 1, p. 2). The exact example is a paper claim about the figure, not a guarantee for arbitrary tasks.

Verus form: Inference: represent the generated Rust function with `requires` and `ensures`, then let an agent propose edits to the body, `assert` statements, loop `invariant` declarations, and supporting `proof fn` lemmas. A Verus checker can replace CodeGrad's abstract `VERIFY` gate for Rust properties. The paper's Python text gradient and its unknown target function do not carry over as executable Verus constructs; the candidate still needs a precise Verus specification, and the final Rust program must be submitted to Verus.

evidence and limits: Table I reports pass@1 rates. Relative to the null forward-only model (Qwen2.5Coder-3B), GPT4.1-mini without code execution reaches 0.811 on HE, 0.756 on HE+, and 0.251 on LCB V6; with CodeGrad's `+Code` configuration it reaches 0.884, 0.817, and 0.201. HE's 0.884 versus 0.695 null is a 0.189 absolute gain, or 27.2% relative, over 164 tasks; LCB V6's 0.201 versus 0.143 null is a 40.6% relative increase for the 175-question benchmark only without execution, while execution lowers it from 0.251. The table's percentages are rates; it gives no successful-task numerators. Inference: the loop is a search heuristic, not a proof that textual edits descend toward a global optimum. The paper does not prove convergence or semantic equivalence between a critic's edit and the intended requirement.

## technique 2: hard invariant gate with a natural-language proof

what it is: after a proposed update, CodeGrad asks the forward model for a natural-language proof `Π(t+1)` that each invariant holds and accepts the update only when `VERIFY(P(t+1), Π(t+1), I) = true`. The paper emphasizes: “Crucially, it requires each revision to have a natural language “proof” of its correctness.” (Introduction, p. 1). The formal optimization is `min P∈S L(P;T)` subject to `∧ Ii(P) = true` (Section III-B, p. 3).

when to use: use it when requirements include properties that ordinary unit tests may miss: edge-case completeness, asymptotic efficiency, I/O format, or syntax. In the maximum-subarray figure, the invariant encodes O(n) efficiency and the all-negative case (Figure 1, p. 2).

how to do it:

1. Declare the invariant set `I = {I1, ..., Ik}` for the task (Section III-A, p. 2)
2. Generate a candidate and its proof text from the current candidate, gradient, and `I` (Section III-B, p. 2)
3. Invoke the formal verifier on the candidate, proof, and invariant set; discard the update if verification is false (Section III-B, p. 3)
4. Continue alternating soft textual updates and this hard gate until all feedback fields pass or the iteration bound is reached (Section III-B, p. 3)

Verus form: Inference: write each safety or functional requirement as a Verus `ensures` clause, use loop `invariant` declarations for preservation, and put mathematical helper arguments in `proof fn` lemmas with `assert` steps. A natural-language explanation may guide an agent but is not evidence; only Verus acceptance of the Rust body and specification should be treated as the gate. Do not put `ensures` on a `spec fn`, call a proof function at runtime, or model `invariant` as a function call.

evidence and limits: The benchmark results above are the paper's evidence for the combined loop, not an isolated ablation of the proof gate. Inference: because the invariants are supplied as predefined constraints, CodeGrad does not establish that the task description was formalized correctly or that the invariant set is complete. A vacuous or incorrect invariant can pass. The paper also uses a natural-language “proof,” whose relationship to the machine check is unspecified; the machine verifier is the relevant acceptance mechanism.

## technique 3: execution-enabled backward criticism

what it is: a backward model may run sandboxed code probes while reviewing a draft. The experiment compares architecturally identical backward models with and without this capability; the `+Code` suffix denotes execution (Section III-C, p. 3). The paper says: “Our approach builds upon the established principle of using partial execution for self-debugging” (Section IV-B, p. 3).

when to use: use probes for ordinary function-shaped tasks where concrete executions expose wrong outputs or simple runtime errors. The authors caution that LCB V6's stdin/stdout and strict efficiency constraints are difficult to reproduce with isolated snippets (Section IV-B, p. 4).

how to do it:

1. Hold the forward model and reviewer architecture constant (Section IV-B, p. 3)
2. Allow the `+Code` reviewer to run a minimal sandboxed probe on the candidate (Section IV-B, p. 3)
3. Include observed behavior in the review fields and convert it to the same textual gradient (Sections III-B and IV-B, pp. 2–3)
4. Compare pass@1 with the non-executing reviewer on the same benchmark and category (Section IV-B, p. 3)

Verus form: Inference: a Rust/Verus workflow can run bounded executable probes outside proof code, retain their inputs and outputs as diagnostic evidence, then propose `assert` or contract changes. Probes do not replace Verus's universal reasoning: they cover sampled executions, while `requires`, `ensures`, `invariant`, and `proof fn` obligations must still verify. Keep probes sandboxed and separate from proof-only functions.

evidence and limits: For GPT4.1-mini, execution changes HE from 0.811 to 0.884 and HE+ from 0.756 to 0.817, but changes LCB V6 from 0.251 to 0.201 (Table I, p. 3; HE has 164 tasks and LCB V6 has 175 questions). For Qwen3-1.7B, HE stays at 0.787 with and without execution, HE+ changes from 0.713 to 0.726, and LCB V6 changes from 0.166 to 0.160 (Table I, p. 3; HE+ denominator not stated). Table II gives category rates without denominators: GPT4.1-mini `+Code` is 0.167 for Math and 0.143 for Simulation, while its non-executing Base is 0.262 and 0.179; Qwen3-1.7B `+Code` is 0.167 for Math and 0.143 for Simulation, versus 0.214 and 0.107 Base. The paper itself therefore shows that execution can harm performance. Inference: probe feedback is a useful critic signal but is distribution-sensitive and can mislead when the probe environment omits protocol or resource constraints.

## technique 4: category and difficulty stratification

what it is: the paper evaluates the loop separately by LiveCodeBench algorithmic category and by Easy, Medium, and Hard difficulty, rather than reporting only one aggregate score (Section IV-C, p. 4).

how to do it:

1. Assign each LCB problem a LeetCode-derived category (Section IV-C, p. 4)
2. Partition the same runs by category and by predefined difficulty (Section IV-C, p. 4)
3. Report pass@1 for the null, Base, and `+Code` configurations in each stratum (Tables II–III, p. 4)
4. Inspect where the backward model changes the outcome; the paper highlights Dynamic Programming, Graph, Greedy, Simulation, Math, and Hash Map (Section IV-C, p. 4)

Verus form: Inference: apply the same stratification to a Rust/Verus benchmark: label obligations by loop, arithmetic, ownership, API/FFI, and concurrency pattern, and report both proof acceptance and task denominators per stratum. This is an evaluation method, not a Verus language feature.

evidence and limits: Table III reports GPT4.1-mini `+Code` at 0.628 Easy, 0.135 Medium, and 0.025 Hard; the null is 0.558, 0.019, and 0.000. The table supplies no stratum denominators, so relative increases such as 611% for Medium are paper-reported rates rather than independently checkable counts. Table II reports GPT4.1-mini Base at 0.262 Math and 0.179 Simulation, with `+Code` at 0.167 and 0.143; the paper's prose calls the resulting gains in some categories “+101%” and “+40%,” but the displayed values and labels must be read together because categories and configurations differ. Inference: stratification can reveal where a verification-guided agent helps, but small or unstated strata make large relative percentages unstable.

## trusted boundary, contradictions, and product threat

The paper measures benchmark pass@1, not a theorem that generated Python is correct for every input. Its formal objective states universal correctness, but the reported evidence is finite benchmark evaluation. Inference: in a VL product, Verus's checking of the submitted Rust/specification pair is the soundness boundary for proved properties; the LLM forward model, backward critique, textual gradient, invariant selection, natural-language proof, and executable probes are search or specification inputs and remain trusted only to the extent that their assumptions are independently reviewed.

The central numerical claims are consistent with Table I: 0.884 versus 0.695 is a 27.2% relative increase, and 0.201 versus 0.143 is a 40.6% relative increase. The paper also reports the opposite comparison when enabling execution: GPT4.1-mini drops from 0.251 to 0.201 on LCB V6 and Qwen3-1.7B drops from 0.166 to 0.160. The manuscript sometimes says “percentage” where the comparison is a percentage-point change; those are different quantities. No cost, latency, proof-size, failed-verification count, or successful-task numerator is reported in the extracted paper.

Inference: VL should reuse the paper's separation between a flexible critic and a hard checker, plus its failure-aware evaluation by task category and difficulty. VL should not redo the already demonstrated observation that textual feedback can improve benchmark pass@1; it should test whether the same loop improves Verus proof completion while preserving specifications and measuring verifier time. The threat to agent-written verified Rust is moderate for search efficiency and high for specification drift: a candidate can satisfy a weak or incomplete contract, and sampled probes cannot establish universal behavior. Human review of contracts, trusted external interfaces, and coverage beyond benchmark examples remains necessary.

## techniques for the catalog

- textual pseudo-gradient refinement — convert structured correctness, I/O, efficiency, and completeness feedback into ordered source edits for the next candidate
- hard invariant gate — accept an update only when its declared invariants and accompanying proof pass a formal verifier
- execution-enabled criticism — let a sandboxed backward model probe code and feed observations into the textual gradient
- stratified verification evaluation — compare verified-generation outcomes by algorithmic category and difficulty, with explicit denominators
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
