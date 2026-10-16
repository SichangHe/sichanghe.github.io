# A-ProS: Towards Reliable Autonomous Programming Through Multi-Model Feedback
(authored by agents unless marked 🧑)
Tag: `tabassum2026pros`, [paper](https://arxiv.org/abs/2605.18073)

## what the paper proves or measures

A-ProS is a four-attempt competitive-programming loop. GPT-4 or GPT-5 generates C++17; a separate critic (Codestral-2508, Llama-3.3-70B, or DeepSeek-R1) diagnoses a failed submission; the generator receives the diagnosis and produces the next submission; Codeforces supplies the verdict. The paper evaluates six generator–critic pairings on 167 ICPC World Finals problems and 200 recent Codeforces problems, 367 problems in total. Its central architectural claim is role separation plus retained conversation state, not formal proof of program properties. The authors describe the loop as follows: “This iterative process forms a closed feedback loop where reasoning, debugging, and optimization evolve autonomously, mirroring professional engineering practices.” (Section 1, p. 3.)

The measured object is an Accepted judge result. The paper does not verify a generated program against a formal specification, and its test oracle remains the Codeforces judge. Its abstract reports GPT-5 rising from 39 to 85–90 accepted ICPC solutions and GPT-4 from 15 to 31–38 after three refinements, while a 47-problem paired ablation reports stateful advantages of 8.5–10.6 percentage points and up to 3.5× less repeated failure. Those denominators and settings matter: ICPC counts are out of 167, the Codeforces table is out of 200, and the context ablation is paired on `n = 47`.

## technique 1: separate synthesis and specialized diagnosis

what it is: assign generation and failure analysis to different model roles. GPT-4/5 receives the problem and writes a candidate; the critic receives the candidate, verdict, and available failing-test details and returns concise, actionable diagnosis rather than a full replacement. The paper compares a code-specialized critic (Codestral), a general model (Llama), and a reasoning-focused model (DeepSeek-R1) under a 2 × 3 factorial design (§3, pp. 5–6; §4.2.6, p. 16).

when to use it: use this split when a generator can produce plausible code but needs a distinct analysis of wrong answers, runtime errors, timeouts, memory errors, or compilation errors. A critic can focus on algorithmic reasoning while leaving code synthesis to a model that is already being measured for generation quality.

how to do it:
1. Acquire and normalize a problem statement, input/output format, constraints, samples, tags, rating, and hidden judge tests (Table 1 description, §4.1, pp. 12–13).
2. Prompt the generator for a complete C++17 solution and submit it to the judge (Stages 1–3, §3.1–3.3, pp. 5–9).
3. If the verdict is not Accepted, give the critic the problem, current code, verdict, and test input/expected/given output when the platform exposes them (Prompt 2, §3.4, p. 9).
4. Ask the critic to identify logical errors, edge cases, or inefficiencies and to suggest fixes without rewriting the entire program (Prompt 2, §3.4, p. 9).
5. Pass the diagnosis to the generator, which returns a revised complete solution; repeat through `Itr3`, at most four total submissions (§3.5, pp. 10–11).

Verus form: Inference: make the generator propose Rust executable code plus fixed `requires` and `ensures`; make a critic classify Verus diagnostics and propose edits to proof code, invariants, or lemmas. Run `verus` after every repair and accept only code whose original contract still verifies. A `proof fn` and `spec fn` are proof artifacts, not runtime calls; the paper's C++ judge and model-role prompts do not transfer syntactically.

evidence and limits: On 167 ICPC problems, GPT-5 starts at 39/167 and reaches 85–90/167 at `Itr3`; GPT-4 starts at 15/167 and reaches 31–38/167 (Table 6, p. 17). On 200 Codeforces problems, GPT-5 workflows end at 73–82/200 and GPT-4 at 42–52/200 (Table 7, p. 19). DeepSeek gives 2–7 more solved problems than the other critics depending on generator, but paired critic differences at `n = 200` have Cohen's h < 0.13 and are individually nonsignificant after the paper's correction (§5.2, pp. 23–24). These are judge outcomes, not proofs of general correctness.

## technique 2: capture execution evidence and preserve failure artifacts

what it is: submit through authenticated browser automation, poll until a terminal verdict, and archive the verdict, runtime, memory, source, submission id, timestamps, and any exposed test diagnostics. The system uses asynchronous submission-detail interception with a rendered-verdict fallback, bounded waits, selector fallbacks, and periodic reloads (§3.3, pp. 7–9). The paper records, “On timeout or transient UI failure, the system preserves the partial artifact bundle rather than discarding the run, including submission ID, timestamps, verdict text, runtime, memory, and any captured test diagnostics.” (Section 3.3, p. 8.)

when to use it: use this evidence boundary when an online execution service is the oracle and transient transport or UI failures must not be confused with program failures. Retain enough context to replay analysis without resubmitting.

how to do it:
1. Open the authenticated submission page, select C++17, paste the extracted solution, submit, and poll until a terminal status (§3.3, p. 8).
2. Capture Accepted, Wrong Answer, Runtime Error, Time Limit Exceeded, Memory Limit Exceeded, or Compilation Error, plus runtime and memory (§3.3, p. 8).
3. If permitted, record failing input, expected output, actual output, and error text; otherwise record only the verdict and available test number (§3.3, p. 8).
4. Store prompts, generated code, verdict traces, and parsed failures in an attempt log; keep hidden tests under platform control (§3.3, p. 8).

Verus form: Inference: use a harness that stores the immutable Rust source, Verus diagnostics, solver settings, and each candidate diff. Re-run Verus locally and record the exact command output, compiler result, and any executable test result. A failed Verus run is evidence of an unsatisfied obligation, not a counterexample to the specification; if a concrete execution is used, preserve its input and observed state separately.

evidence and limits: archived artifacts support inspection without a new Codeforces submission, but ICPC/Gym reruns still require an authenticated account with rating at least 1900 (§3.3, p. 8). Hidden-test visibility differs between Gym and standard problemset runs. The platform remains a trusted oracle in the evaluation, and browser automation does not establish semantic coverage beyond the judge's tests.

## technique 3: maintain stateful, problem-specific context

what it is: maintain a `ChatContext` per provider and session. The context contains the system instruction, every prior problem/failure prompt, every critic hint, and every generated solution. Each later request receives the full ordered history. The stateless ablation clears provider contexts before every feedback round while retaining only the current verdict and hint in the current prompt (§3.5, p. 11; §5.3.1, pp. 24–25). The implementation description says, “This full sequence is passed to the API at every call, so the model has access to its complete interaction history for the current problem.” (Section 3.5, p. 11.)

when to use it: use persistent state when successive failures reveal different symptoms or when the repair must remember a previous approach, constraint, or rejected edge case. Compare to a stateless loop at the same model, temperature, problem set, judge, and submission budget so memory is the only intended variable.

how to do it:
1. Key a context by provider and problem session (§3.5, p. 11).
2. Append each user message (problem, verdict, diagnostics, critic hint) and assistant message (candidate or diagnosis) in order (§3.5, p. 11).
3. Pass the complete sequence to the next generator or critic call; stop after acceptance or four attempts (§3.5, p. 11).
4. For the ablation, clear all contexts before each `k ≥ 1` feedback iteration, but retain the latest verdict and hint in the new prompt (§5.3.1, p. 24).
5. Count repeated verdict categories between adjacent failed attempts and compare paired solve rates (§4.2.3, p. 14; §5.3.2, p. 25).

Verus form: Inference: keep a per-task repair record containing the original Rust file, verifier diagnostics, unchanged contracts, and every rejected candidate. Feed the record to an agent that may edit only proof blocks. A mechanical diff gate should enforce this edit boundary; the paper's context reset is an experimental flag, not a Verus feature.

evidence and limits: In the paired 47-problem ablation, GPT-5 + DeepSeek stateful refinement reaches 40.4% (19/47) at `Itr3`, compared with 29.8% (14/47) stateless, a 10.6-point gap; GPT-4 + DeepSeek reaches 25.5% (12/47) versus 17.0% (8/47), an 8.5-point gap (Table 12, p. 25). Repeated failure falls from 41.8% to 11.8% for GPT-5 (3.5×) and from 40.8% to 14.2% for GPT-4 (2.9×). The solve-rate evidence is underpowered: raw McNemar p-values are 0.063 and 0.125 and bootstrap 95% intervals are [0.00, +0.15] and [0.00, +0.11] (Table 12, p. 25). The paper therefore treats error repetition as the primary signal, not as proof that memory causes every acceptance gain.

## technique 4: measure cumulative progress, waste, and critic calibration

what it is: distinguish per-iteration new solves (`ΔItrk`) from cumulative acceptance (`Itrk`), and report average attempts, verification cost, abstention, verdict distributions, repeated-failure rate, and confidence calibration (§4.2, pp. 13–16). Verification cost is total submissions over all problems divided by total accepted solutions, so unsolved problems still contribute wasted judge calls (Eq. 3, p. 14). Each critic emits a 1–5 confidence score, normalized to [0.2, 1.0], and Expected Calibration Error (ECE) compares binned confidence to whether the next submission is accepted (§4.2.2, pp. 13–14).

how to do it:
1. Record whether each problem is first accepted at `Itr0`, `Itr1`, `Itr2`, or `Itr3`; sum the incremental counts to obtain cumulative rates (§4.2.1, p. 13).
2. Compute average attempt number only over solved problems, but compute verification cost over every problem (§4.2.1–4.2.2, pp. 13–14).
3. Classify each failed attempt as WA, RE, TLE, MLE, or CE and calculate the fraction whose category repeats the previous failed attempt (§4.2.3, p. 14).
4. Normalize each confidence integer by five, bin hints by confidence, and calculate the bin-weighted absolute confidence/next-acceptance gap (Eq. 2, §4.2.2, p. 13).
5. Use paired McNemar exact tests for matched binary outcomes, bootstrap 95% intervals with 10,000 resamples, and Holm–Bonferroni correction across pairwise comparisons (§4.2.5, pp. 15–16).

Verus form: Inference: define task-level metrics over a log of Verus attempts and classify diagnostics into entry-invariant, preservation, postcondition, syntax, or timeout categories. Keep denominator fields explicit: number of tasks, accepted proofs, attempts, and hints. Calibration can compare agent confidence with acceptance of the next Verus run, but confidence is not evidence of validity. The acceptance oracle remains the Verus verifier and compiler.

evidence and limits: For ICPC, GPT-5 verification cost ranges from 5.4 to 5.8 submissions per accepted solution and GPT-4 from 15.8 to 19.7 (Table 6, p. 17). For Codeforces, the range is 7.6–8.7 for GPT-5 and 13.5–17.1 for GPT-4 (Table 7, p. 19). On Codeforces, DeepSeek with GPT-5 has ECE 0.366 and 9.6% immediate post-hint acceptance over 425 hints; Codestral has ECE 0.499 and 7.1% over 436 hints. With GPT-4, the corresponding DeepSeek figures are ECE 0.398 and 6.5% over 504 hints, versus Codestral 0.530 and 4.6% over 518 hints (Table 18, p. 34). All ECE values exceed 0.35, so the ranking is relative and the absolute confidence scale is overconfident in this low-base-rate task.

## trusted boundary, contradictions, and scope

The Codeforces judge, problem statements and hidden tests, model endpoints, browser credentials, and experiment scripts are trusted or assumed. A-ProS does not prove C++ semantics, contract adequacy, or system behavior outside contest tests. Its external-validity warning is explicit: competitive programming differs from real software systems involving collaboration, maintenance, and open-ended requirements (§7, p. 32). The paper's claim that stateful gains are 2.2–2.3× larger than matched multi-round stateless gains uses the 47-problem Table 17 comparison; the 8.5–10.6-point gaps use Table 12. These statements are consistent only when their different denominators and baselines are kept separate. The abstract's “over 2× greater gains” is not a universal accuracy multiplier.

What VL should not redo: the paper already establishes a concrete multi-model generator–critic loop, persistent versus stateless context ablation, structured verdict capture, calibration metric, and denominator-aware cost reporting. Inference: VeruLaw should reuse the context and measurement design while replacing Codeforces acceptance with Verus verification and executable tests. The threat to agent-written verified Rust is high for workflow reliability but limited for the verifier itself: persistent context can reduce repeated repair mistakes, yet it cannot ensure that a weak `ensures` contract expresses the intended requirement. Inference: a VL deployment should freeze contracts, log every Verus run, reject trust escapes, and report verifier acceptance separately from specification review and runtime evidence.

## techniques for the catalog

- role-separated multi-model repair — use one model for candidate code and specialized critics for structured diagnosis before each repair
- execution-evidence capture — archive verdicts, diagnostics, code, and transport artifacts so feedback and failures are replayable
- persistent repair context — retain the complete per-problem conversation and compare it with a matched stateless reset
- denominator-aware feedback metrics — distinguish incremental and cumulative solves, total submission cost, repeated verdicts, and calibration
- paired context ablation — hold models, problems, temperature, judge, and attempt budget fixed while varying only history retention
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
