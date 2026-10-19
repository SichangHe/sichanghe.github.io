# Do AI models help produce verified bug fixes?
(authored by agents unless marked 🧑)
Tag: `huang2025verifiedbugfixes`, [paper](https://arxiv.org/abs/2507.15822v2)

## what the paper measures

Huang et al. study whether LLM access helps programmers produce verified bug fixes and how programmers use that access. Volunteers were randomly assigned to AI and no-AI groups and attempted nine buggy Eiffel classes using AutoProof. The AI group used GPT-4o mini through duck.ai. The authors state: “All participants in the LLM group used only one LLM, GPT-4o mini from Open AI, through the duck.ai interface.” (Section 7, PDF p. 6). Both groups used static verification: “no code is ever executed, no test cases are ever needed.” (Section 5, PDF p. 4).

The correctness claim is relative to contracts and proof tools. The paper explicitly qualifies it: “it only expresses that the program is correct with respect to the given contracts, ignoring any other aspects; and it is dependent on the correctness of the proof tools themselves.” (Section 2, PDF p. 2). Inference: this is a methodological source for a Rust/Verus repair study, not evidence that its outcomes transfer to those tools.

## technique 1: proof-tool-backed randomized repair study

what it is: define goals, queries, and metrics before running the experiment; randomly assign LLM access; assess corrections with a formal verifier. The paper uses the GQM method and asks whether LLM use helps and how programmers use it. Its queries cover solved tasks, time, incorrect submissions, participant experience, prompts, and output use (Section 3, PDF pp. 2–3). The authors state that their research questions “were defined as we were setting up the experiments, but before running them, and we did not modify them in any way afterwards” (Section 3, PDF p. 3). This describes advance definition, not a claim of public preregistration.

how to apply it, following the experiment:
1. define goals, concrete queries, and numerical metrics before running sessions (Section 3, PDF pp. 2–3)
2. recruit volunteers with programming experience and at least basic Eiffel knowledge; assign groups randomly (Section 6, PDF pp. 4–5)
3. provide buggy programs, AutoProof access, and group-specific instructions about AI access (Sections 5–6, PDF pp. 4–5)
4. collect questionnaires, submitted programs, and screen-sharing recordings to reconstruct attempts and interactions (Section 6, PDF p. 5)
5. compare outcomes by group while preserving the study's small-sample limitation (Sections 7–8, PDF pp. 5–8)

Verus form: Inference: replace Eiffel contracts with Verus specifications, run Verus on candidate patches, and record outcomes, diagnostics, and elapsed time. Reuse the random assignment and advance definition of metrics. Record the Verus version and build environment so results can be reproduced. These are proposed adaptations, not steps evaluated in the paper.

evidence and limits: “In all we have 10 exploitable AI-assisted results and 15 non-AI-assisted (including the one without video).” (Section 6, PDF p. 5). Of 29 volunteers, 25 participated; all four no-shows belonged to the AI group. Sessions lasted at most two hours, and one no-AI participant did not share a screen (Section 6, PDF p. 5). The paper therefore analyzes 24 recordings (Section 9, PDF p. 9). The authors state: “This article consequently refrains from any detailed statistical analysis (which the numbers do not justify) and from drawing sweeping general conclusions.” (Section 7, PDF p. 5).

The overall comparison favors the no-AI group: “Non-AI-assisted programmers solve more tasks correctly and fewer tasks incorrectly!” (Section 8.1, PDF p. 7). For time on successful fixes, the authors call the evidence inconclusive, suggest some help on easier tasks and Task 8, and report that no AI-assisted participant finished Task 9 (Section 8.1, PDF p. 7). Inference: these observations do not establish a general causal effect across models, languages, or populations.

## technique 2: contract-based verified repair loop

what it is: start with a pre-filled buggy class, run Verify, edit, and verify again. AutoProof first uses the EiffelStudio compiler; only successful compilation proceeds to verification through Boogie and Z3 (Section 5, PDF p. 4). The program's constructors must establish the class invariant. Exported features are checked assuming their preconditions and the invariant, and must terminate satisfying their postconditions and the invariant. Preconditions are assumptions at entry, not properties that the feature must preserve.

how to apply it, following the experiment:
1. provide a buggy Eiffel class with contracts; the tasks include bugs in code and in specifications (Sections 5 and 8, PDF pp. 4 and 6)
2. click Verify on the initial version to obtain the failure messages (Section 6, PDF p. 5)
3. attempt a correction and click Verify after each attempt (Section 6, PDF p. 5)
4. use the compilation and verification results to assess that candidate (Section 5, PDF p. 4)
5. submit the task's final solution even if it does not work (Section 6, PDF p. 5)

The task instructions say: “After each task, send your solution (working or not)” (Section 6, PDF p. 5). Submission therefore does not mean successful repair. Nor does the paper require all contracts to remain unchanged: Task 5's bug is that “the precondition of the routine set_hour incorrectly allows hour to take the value 24” (Section 8, PDF p. 6).

Verus form: Inference: use candidate Rust plus Verus specifications, invoke Verus after each correction, and retain failed diagnostics for the next attempt. Review whether a proposed specification change expresses the intended behavior. A successful proof alone cannot justify weakening that behavior. Record separately whether a candidate was submitted, compiled, or verified.

evidence and trusted boundary: the paper distinguishes a valid fix, which removes observed failures, from a correct fix, which removes the fault (Section 2, PDF p. 2). Its proof-based assessment still depends on the given contracts and proof-tool correctness, as quoted above. Inference: Verus specifications and trusted assumptions need review separately from proof success.

## technique 3: LLM collaboration using code and verifier output

what it is: treat the LLM as a pair debugger whose suggestions the programmer interprets and adapts. The taxonomy says: “The collaborator: Uses the AI tool as a form of pair debugger.” (Section 9.2, PDF p. 9). The authors describe collaborators as supplying code and/or tool output, deciding whether to apply suggestions, adapting generated code, and progressively enriching prompts. Their proposed strategy is based on this observed pattern, not on a separate experiment testing that strategy.

how to apply it, following the proposed strategy:
1. “Provide both the candidate code and the verifier’s output.” (Section 9.3, PDF p. 10)
2. “Ask not just for a proposed solution but for the “diff” (list of individual differences) with the previous version.” (Section 9.3, PDF p. 10)
3. “Review the proposed fix.” (Section 9.3, PDF p. 10)
4. rank suggestions rather than treating all alternatives as equally useful (Section 9.3, PDF p. 9)
5. stop pursuing an unverified answer when further variations lack a sound basis; consider starting afresh (Section 9.3, PDF p. 10)

Verus form: Inference: provide a VL agent with candidate Rust and Verus diagnostics, request a diff, review the proposed changes, and run Verus again. Keep patch history and proof outcomes distinct from model explanations. This adapts the paper's advice; it does not establish its effectiveness for VL.

evidence and limits: the paper reports that 97.7% of prompts contained natural language, 48.3% code, and 43.7% tool output (Section 8.2, PDF p. 8). It explains: “The total is more than 100% since a prompt can contain elements of several kinds.” Solved tasks used 2.8 prompts on average, compared with 3.6 for unsolved tasks. Half of participants did not copy-paste from LLM answers; others did so less than once per task except one participant with 18 copy-pastes. The precise final-code observation is: “Only once was the copy-pasted result part of the final version.” (Section 8.2, PDF p. 8). This does not say that an entire copied answer became the final solution.

## technique 4: prompt and behavior taxonomy for repair risk

what it is: inspect full-session recordings to identify behavior that final programs alone would hide. Section 9.1 describes a hallucination loop: “The AI tool makes an incorrect guess about how to correct a bug; the programmer tries it, the result does not verify, the programmer tries to fix it, and gets into a fruitless try-verify-fail loop.” (PDF p. 9). It also describes noisy solutions containing useful and irrelevant changes, neutrality among alternatives of unequal value, and timidity in trying small variations without logical reasoning (Section 9.1, PDF p. 9).

how to apply it, following the analysis:
1. record full screen-sharing sessions and collect their submitted programs (Section 6, PDF p. 5)
2. classify prompt contents and interactions, including code, natural language, tool output, and copy-paste (Section 8.2, PDF p. 8)
3. examine repeated failed attempts for hallucination loops and the other observed antipatterns (Section 9.1, PDF p. 9)
4. distinguish the listed personalities: independent, prejudiced, searcher, copy-paster, follower, and collaborator (Section 9.2, PDF p. 9)
5. also note transitions into a quitter, which the text discusses without a separate definition in that list (Section 9.2, PDF pp. 9–10)

The abstract claims seven categories; Section 9.2 lists six personalities and additionally discusses becoming a quitter. Inference: a reused coding scheme would need an explicit definition of that seventh category rather than assuming the paper provides one.

Verus form: Inference: retain Rust candidates, Verus invocations and diagnostics, proof outcomes, and model messages. Use repeated failures as a reason to reconsider the repair hypothesis. Such records can expose wasted attempts; this paper does not measure whether an automated intervention reduces them.

evidence and implications: Section 9.2 reports approximately 91% success for collaborators, copy-paster behavior at 38%, and approximately 33% helpfulness for that behavior (PDF pp. 9–10). The paper does not clearly define these percentages' denominators; they should not be presented as task-level or participant-level rates. Section 8.2 reports average prompt counts of 4.9 for experienced programmers (median 4) and 25 for non-experienced programmers (median 23), and output-use averages of 0.9 (median 0) and 10.0 (median 7), respectively (PDF p. 8). These are observations in this small sample, not experimentally isolated effects of experience.

## trusted scope and what VL should not redo

Inference: the reusable contribution for VL is the combination of explicit specifications, verifier outcomes, and session evidence. This makes it possible to distinguish proof success from a plausible model answer and to examine how a repair was reached. Reusing that method still requires evaluation in Rust/Verus; the paper supplies no direct evidence about VL. Its conclusion states the boundary as correctness “in the specific sense of satisfying the stated specification, and within the limitation of proof tools” (Section 10, PDF p. 10).

Inference: VL should record specification changes, trusted assumptions, tool versions, attempted patches, and proof results. The paper does not establish that testing is useless, that copy-paste always fails, or that one prompting strategy has a universal advantage. Its own single-model limitation is explicit: “The study does not provide insights into how participants would have fared with another LLM.” (Section 7, PDF p. 6).

## techniques for the catalog

- GQM verified-repair experiment — define goals, queries, and metrics before sessions, randomize AI access, and assess fixes with a prover
- contract-based repair loop — verify each candidate and distinguish submission from compilation and proof success
- collaborator prompting — provide code and verifier output, request a diff, review it, and reconsider unproductive attempts
- behavior and hallucination taxonomy — inspect recordings for prompt contents, copy-paste, unranked advice, and repeated failed repairs

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The metrics should be interpreted with caution given the small size of the samples, but we believe that they do identify relevant trends."): checked all study quotations, numbers, section and PDF page references, and technique steps against the full paper; corrected page references, verifier semantics, specification-bug handling, submission criteria, taxonomy coverage, and unsupported percentage denominators; marked proposed VL adaptations as inferences; did not reproduce the experiment, inspect supplementary artifacts, or validate Verus behavior.
