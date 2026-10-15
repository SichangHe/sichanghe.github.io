# Do AI models help produce verified bug fixes?
(authored by agents unless marked 🧑)
Tag: `huang2025verifiedbugfixes`, [paper](http://arxiv.org/abs/2507.15822v2)

## what the paper measures

Huang et al. study whether programmers using an LLM produce more verified bug fixes and how they use it. They randomly assign volunteers to an AI group or a no-AI group, give both the same nine buggy Eiffel classes, and require each attempted fix to pass AutoProof, an Eiffel verifier based on Hoare logic and Boogie-Z3. The AI group may use GPT-4o mini through duck.ai; the control group may use no LLM or other AI. The paper's acceptance condition is static verification against contracts, invariants, and postconditions: “no code is ever executed, no test cases are ever needed.” (Section 5, p. 3). It defines the distinction under test: “A fix is valid if it leads to a valid program (syntactically and type-wise correct, in other words able to be compiled and run) and removes the failure or failures that were observed.” (Section 2, p. 2). The study is an empirical design and workflow source for verified repair; transfer to Rust and Verus is an inference.

## technique 1: proof-tool-backed randomized repair study

what it is: define a Goal-Question-Metric (GQM) study before collecting results, randomize participants to AI and no-AI groups, and use a formal verifier for every submitted correction. The two goals are whether LLM use helps and how programmers use it. Queries cover solved-task counts, time, incorrect fixes, experience, prompt categories, and interaction patterns (Sections 2–3, pp. 2–3). The authors emphasize that their questions and metrics were fixed before running the experiment to avoid post-hoc confirmation bias (Section 3, p. 3).

how to apply it:
1. write goals, concrete questions, and numeric metrics before observing outcomes (Section 3, p. 3)
2. recruit participants with enough language and programming knowledge; randomly assign them to AI or no-AI (Section 6, p. 4)
3. provide identical buggy programs and a verifier-backed submission workflow (Sections 5–6, pp. 3–4)
4. log every attempt, verification result, elapsed time, participant experience, and prompt or tool interaction (Section 6, p. 4)
5. compare task counts and times by group while reporting the small-sample limitation (Section 7, p. 4)

Verus form: Inference: replace Eiffel contracts with Verus `requires`, `ensures`, and loop `invariant` clauses; compile each patch with Verus and record pass/fail, diagnostics, and time. Randomization and GQM transfer directly. Verus acceptance must include the exact Rust build and dependency versions. A passing proof establishes only the supplied specification, as the paper itself warns for contracts.

evidence and limits: 29 people volunteered; 25 participated: 10 AI-assisted and 15 non-AI-assisted, because all four no-shows were in the AI group (Section 6, p. 4). Each session lasted at most two hours and used nine tasks of increasing difficulty (Sections 6 and 8, pp. 4–5). The authors state the sample is too small for detailed statistical analysis or sweeping generalizations (Section 7, p. 4). Their figures suggest non-AI participants solved more tasks correctly overall, while LLM help helped some easy tasks and no AI participant solved Task 9; the chart does not provide a single tabulated denominator for each task, so these observations should not be converted into exact rates.

## technique 2: contract-based verified repair loop

what it is: present a pre-filled buggy class, let a participant edit it, and require clicking Verify after the initial bug and after every correction attempt. AutoProof first compiles Eiffel and then checks contracts and class invariants. A program passes only when constructors establish the invariant and every exported feature preserves its precondition, postcondition, and invariant (Section 5, p. 3).

how to apply it:
1. define a precise contract, including preconditions, postconditions, and class invariants (Section 5, p. 3)
2. seed a known bug in executable code while retaining the contract (Section 6, p. 4)
3. run the verifier on the buggy version to expose a failure (Section 6, p. 4)
4. edit the code or ask an LLM for a candidate, then submit the complete program to the verifier (Section 6, p. 4)
5. accept the patch only when compilation and proof succeed; retain failed diagnostics for the next repair step (Section 5, p. 3)

Verus form: Inference: model the same loop as candidate Rust plus Verus contracts; run `verus` after each edit and feed the diagnostic text back to the agent. Use `ensures` on executable functions and `invariant` declarations inside loops. Do not use `external_body` on the function under verification, because that removes the implementation from the proof obligation.

evidence and trusted boundary: the paper distinguishes a valid fix that removes observed failures from a correct fix that removes the underlying fault; tests can overfit, while a proof checks the stated contract (Section 2, p. 2). The verifier and its libraries remain trusted, and the contract itself may omit a real requirement. Inference: in VL, specification review and dependency assumptions remain outside the verifier's guarantee.

## technique 3: evidence-preserving LLM collaboration

what it is: use the model as a collaborator that sees the candidate code and verifier output, proposes a small diff, and explains or ranks alternatives. The paper's observations distinguish seven usage patterns: independent, prejudiced, searcher, copy-paster, follower, collaborator, and quitter (Section 9.2, pp. 6–7). The collaborator pattern supplies code and/or tool output, interprets suggestions, adapts generated code, and progressively enriches prompts; the authors report it as the most successful observed pattern. The taxonomy says: “The collaborator: Uses the AI tool as a form of pair debugger.” (Section 9.2, p. 7).

how to apply it:
1. provide the current candidate code and the complete verifier diagnostics (Section 9.3, p. 7)
2. ask for a diff rather than a wholesale rewrite (Section 9.3, p. 7)
3. inspect each proposed change and keep only changes that address the diagnostic (Section 9.3, p. 7)
4. rerun the verifier and include the new output in the next prompt (Section 9.3, p. 7)
5. stop and restart reasoning when repeated attempts follow an unverified hypothesis (Section 9.3, p. 7)

Verus form: Inference: give a VL agent the Rust diff and Verus error, ask it to modify only the relevant contract or proof, and preserve a machine-readable patch history. Require a fresh Verus run after every patch. Keep model advice separate from proof evidence; only Verus output is acceptance evidence.

evidence and limits: among observed prompts, 97.7% contained natural language, 48.3% code, and 43.7% AutoProof/EiffelStudio output (Section 8.2, p. 6); categories overlap, so they sum above 100%. Solved tasks used 2.8 prompts on average and unsolved tasks 3.6. Half of participants never copy-pasted an LLM answer; those who did copied less than once per task except one participant with 18 copy-pastes, and only one copied result became the final version (Section 8.2, p. 6). These figures describe 10 AI participants and are observational, not causal.

## technique 4: prompt and behavior taxonomy for repair risk

what it is: classify prompts and user behavior from full-session recordings to expose failure modes that final code alone hides. The authors identify a hallucination loop: the model gives a plausible but wrong fix, the programmer submits it, verification fails, and the programmer keeps trying variants without understanding the cause (Section 9.1, p. 6). They also identify noisy solutions, neutrality (unranked alternatives), and timidity (small unguided variations).

how to apply it:
1. record the complete repair session, including prompts, edits, verifier messages, and elapsed time (Section 6, p. 4)
2. label prompt contents and user actions by the seven usage patterns (Section 9.2, pp. 6–7)
3. mark loops of repeated failed verification and untested hypotheses (Section 9.1, p. 6)
4. measure copy-paste frequency, prompt counts, solved status, and time by task (Section 8.2, p. 6)
5. derive guidance from successful collaborator traces and test it in a new randomized study (Section 9.3, p. 7)

Verus form: Inference: instrument VL sessions with the candidate Rust, exact Verus command, diagnostics, proof status, and model messages. Detect repeated failures on the same obligation and trigger a restart or human review. This telemetry can reduce wasted repair loops but cannot prove the final Rust beyond the verifier result.

evidence and implications: the paper says collaborators had the highest observed success rate, approximately 91%, while copy-paster behavior appeared in 38% of observations and was approximately 33% helpful (Section 9.2, p. 7). The denominator for these percentages is the set of recorded participant behavior instances, not all tasks; the paper presents them as observations, not a controlled causal comparison. It also reports experienced programmers averaging 4.9 prompts (median 4) and non-experienced programmers 25 (median 23), with output-use averages 0.9 and 10.0 respectively (Section 8.2, p. 6). The small, language-specific sample limits transfer.

## trusted scope and what VL should not redo

The study's strongest reusable result is methodological: formal verification makes each accepted repair checkable against an explicit contract, while full-session evidence reveals how humans and models reach it. It already covers test-only repair and wholesale copy-paste as inadequate substitutes for specification-backed checking; VL should not redo a study that counts generated code without verifier outcomes. Inference: VL should preserve the collaborator loop—code plus diagnostics, small diff, fresh Verus run—and report task, participant/model, denominator, verifier version, and failure category. The remaining trusted pieces are the contract/specification, Verus implementation and solver, external bodies, compiler and dependencies, and human judgment that the repaired contract expresses the real requirement. The paper's conclusion is deliberately cautious: its participants and Eiffel setting cannot establish a universal LLM effect.

## techniques for the catalog

- GQM verified-repair experiment — preregister goals, questions, metrics, randomize AI access, and validate every fix with a prover
- contract-backed repair loop — seed a bug, submit each edit to the verifier, and accept only a compiled proof of the stated contracts
- collaborator prompting — provide code and diagnostics, request a focused diff, review it, and iterate with fresh verifier output
- behavior and hallucination taxonomy — record full sessions to detect copy-paste, unranked advice, and repeated failed repair loops
Checked 2026-10-15 against paper huang2025verifiedbugfixes: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
