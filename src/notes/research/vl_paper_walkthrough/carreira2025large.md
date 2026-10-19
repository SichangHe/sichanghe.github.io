# Can Large Language Models Help Students Prove Software Correctness? An Experimental Study with Dafny
(authored by agents unless marked 🧑)
Tag: `carreira2025large`, [paper](https://arxiv.org/abs/2506.22370)

## study question and design

Carreira, Silva, Abreu, and Mendes study how master’s students use ChatGPT while solving Dafny verification exercises. The paper asks whether ChatGPT improves performance, how students interact with it, which strategies distinguish successful students, and how students trust responses (Section 1, p. 2). Dafny combines executable code with contracts, invariants, and ghost updates that are checked automatically. The authors report: “Our findings show that students perform significantly better when using ChatGPT; however, performance gains are tied to prompt quality.” (Abstract, p. 1)

Fourteen students each solved a Queue and a Tree problem, one with access to a custom ChatGPT interface and one without. Problem order and ChatGPT access were randomized with bucketed balancing; each problem had a 30-minute limit (Section 3.1, pp. 5–6). The interface used gpt-4_1-2025-04-14 with default parameters and logged all 103 student prompts and 103 model responses (Sections 3.1 and 5, pp. 5, 10). The problems were a circular-buffer queue and binary-search tree. Each had one implementation subproblem with contracts supplied and one subproblem requiring specification and implementation from natural language (Section 3.1, p. 5).

Inference: for VL, this is evidence about human-agent interaction around formal proof, not evidence that ChatGPT or any other model can replace a verifier. The outcome measure is researcher-assigned grades for student work, including partial credit; a high grade does not necessarily mean the solution verified (Sections 3.2 and 4, pp. 7–10).

## technique: controlled paired evaluation with decomposed correctness grading

What it is. Every participant serves as their own comparison between assisted and unaided work. The authors divided each subproblem into expected tasks, weighted tasks by effort and difficulty, allowed at most a one-point penalty for harmful extra steps, classified each code line by task, and assigned a 0–20 grade (Section 3.2, pp. 7–8). They separated specification work from implementation work because Dafny's contracts, invariants, and ghost updates define expected behavior while implementation provides functionality (Section 3.2, p. 8).

When to use it. Inference: use paired evaluation when a small cohort makes between-person comparison noisy and when a formal task has distinct specification and implementation components.

How to apply it. The following steps summarize the study design and analysis.

1. Give each participant two comparable tasks and randomize which task receives assistance (Section 3.1, pp. 5–6).
2. Pilot the tasks and procedure; the authors ran five pilots until no new suggestions or usability issues emerged and excluded pilot data (Section 3.1, p. 7).
3. Decompose each solution into task-level specification and implementation units, assign weights, and score each unit on the same scale (Section 3.2, pp. 7–8).
4. Use a paired-sample t-test after a Shapiro–Wilk normality check for assisted versus unaided grades (Section 3.2, p. 8).

Verus form. Inference: define separate Rust tasks for contract writing, executable implementation, and proof lemmas. Inference: score only code accepted by Verus, and retain task-level evidence such as which `requires`, `ensures`, `invariant`, or `proof fn` discharged each obligation. Inference: unlike the paper's educational grade, a product acceptance rule should not award partial credit for an implementation whose final contract is false.

Evidence. Assisted grades averaged 17.39 versus 9.36 unaided; all 14 students passed with ChatGPT, while 5/14 passed without it. The paired test gave p = 0.0002, effect size d = 1.55, and 95% CI [4.59, 11.47] (Section 4, p. 9). The paper also says, “On average, participants scored 5.04 points higher” (Section 4, p. 9). Inference: this conflicts with its reported means, whose difference is 8.03 points; the paper does not resolve the discrepancy. For the mixed specification-and-implementation subproblem, assisted scores were 15.26 versus 8.82 unaided; the specification portion was 2.92 points lower than implementation, p = 0.003, d = 0.54, 95% CI [−4.64, −1.19], after one outlier was removed and Shapiro–Wilk gave W = 0.895, p = 0.116 (Section 4, p. 9). Pass counts and the assisted/unaided comparison use 14 participants; the specification-versus-implementation test excludes one participant as an outlier.

Limits. The sample is 14 volunteers from one master’s course, and the authors caution that task sequence and Dafny familiarity may affect results (Section 7.2, p. 16). One model and one custom interface were tested, so the result does not establish a universal model effect.

## technique: error-driven prompt refinement

What it is. Students iteratively add verifier feedback and problematic code to prompts. The paper's interaction analysis groups prompts into characteristics, retry/repair strategies, and overall reliance (Section 3.2, p. 8).

When to use it and how. Inference: after a Dafny error, include the exact diagnostic and relevant failing code, ask for one focused repair, and rerun verification. In the study, adding error messages was used by 12 students in 43 prompts; adding problematic lines was used by 12 students in 26 prompts; redirecting the model toward a specified approach was used by 7 students in 8 prompts (Section 5.1, pp. 10–11). The authors report that only 7/14 students obtained fully verified solutions to subproblem 1 and 2/14 to subproblem 2 without significant manual intervention (Section 5.1, p. 11).

Verus form. Inference: feed the exact Verus diagnostic, failed postcondition, or invariant obligation to an assistant, but keep the verifier as the acceptance authority. Inference: prefer a prompt that asks for a single lemma or invariant and then rerun `verus`; do not treat a plausible proof snippet as evidence until it verifies.

Evidence and example. One student redirected the model by asking which variable could replace the problematic variable in a ghost-variable separation issue. The model suggested `buffer.Length` instead of `capacity`; the student applied that change manually and obtained a correct solution (Section 5.2, pp. 12–13). The study also records a counterexample: repeated requests for more lemmas produced unnecessary complexity and left the model stuck (Section 5.2, p. 12).

## technique: context-complete, single-subproblem prompts

What it is. Successful students supplied the surrounding class definition early, constrained the request to one subproblem, and edited the model's output. The paper states: “High-performing students were more likely to: (i) include class context early, (ii) reduce the prompt to ask only a single subproblem, (iii) avoid overcomplicating the LLM’s task through redirection, and (iv) contribute with their own partial implementations.” (Section 5.2, p. 13)

When to use it. Inference: use this prompt shape when the verifier depends on class invariants, ghost state, helper methods, or existing contracts that a short function-only prompt omits.

How to apply it. Inference: the following is a recommended workflow based on the observed interaction patterns, not an experimentally tested sequence.

1. Include the full relevant class and its existing contracts early in the interaction (Section 5.2, pp. 11, 13).
2. Ask for one method or one proof obligation, rather than the entire assignment (Section 5.2, p. 13).
3. Keep a partial implementation or manually edited code under human control and ask the model to complete a bounded missing part (Section 5.2, p. 13).
4. Apply and verify changes yourself; modify the response rather than copying it blindly (Section 5.2, p. 13).

Evidence. All 5/5 top performers (G1) copied class definitions, compared with 3/4 in G2 and 4/5 in G3 (Section 5.2, p. 11). The paper's groups are G1 = top five scores 19–20, G2 = next four scores 17–18, and G3 = remaining five scores 10–16 (Section 5.2, p. 11). Three G1 participants used the one-subproblem strategy, compared with one in each of G2 and G3 (Section 5.2, p. 13). Inference: these are descriptive counts, not randomized causal effects.

Verus form. Inference: include the Rust module, data-structure invariants, and relevant specifications in the model context; ask for one missing proof obligation. Inference: make each generated edit compile and verify before requesting the next one. Inference: Verus syntax differs from Dafny, so Dafny-specific annotations cannot be copied; the transferable method is context completeness, small scope, and verifier feedback.

## technique: trust calibration through independent verification

What it is. The study asks students whether they trust ChatGPT and codes reasons from free-text answers. Seven of 14 trusted it and seven distrusted it (Section 6, p. 13). Two students said Dafny's built-in verifier let them independently check suggestions. Four distrustful students cited syntax errors; two cited overconfidence when wrong; one cited hallucinated features (Section 6, p. 14).

When to use it. Inference: use an independent checker whenever an assistant produces proof or code, and collect both objective verification and user confidence. The paper reports that P5 remained unconfident despite a grade of 19/20; their solution did not verify (Section 4, pp. 9–10).

How to apply it. Inference: keep the assistant interface and verifier logs separate; record the original prompt, response, applied edit, diagnostic, and final verification result. Ask users what they trust and why, then compare those reports with verified artifacts.

Verus form. Inference: record Verus's solver result and the exact specification used, and expose proof failures rather than asking users to judge plausibility. Inference: a successful proof still depends on the specification's adequacy, so review the contract separately.

Evidence and limits. The paper describes a student who scored zero unaided and 19 with ChatGPT but remained unconfident; the authors suggest that failure to verify may have contributed (Section 4, pp. 9–10). Conversely, another student strongly trusted ChatGPT because it produced code quickly (Section 6, p. 14). The authors conclude: “LLMs can be valuable assistants for proving software correctness, not as solvers but as collaborators whose utility depends on how students use them.” (Conclusion, p. 16)

## what is proved, measured, and trusted

The paper measures grades, task-level specification versus implementation performance, prompt counts and categories, qualitative interaction patterns, trust reasons, and statistical differences under a paired design. Dafny checks code against formal specifications (Section 2, p. 2), while the study grades also credit partially correct work (Section 3.2, pp. 7–8). Inference: the study does not prove that ChatGPT understands the programs, that students learned the underlying logic, or that its findings generalize beyond 14 students, one course, one model, and two tasks. The corresponding VL trust boundary includes the Verus verifier and solver, the Rust compiler, external libraries, and the correctness and completeness of the user specification.

The paper's numbers use several denominators that must stay attached: 14 participants for pass counts and trust counts; 103 prompts and 103 responses for interaction logs; 5/5, 3/4, and 4/5 for group comparisons; and 7/14 and 2/14 for fully verified solutions without significant manual intervention (Sections 5.1–5.2, pp. 11–12). Inference: mixing these denominators would turn descriptive evidence into a false defect rate.

## implications for VL

Inference: VL should adopt error-driven proof interaction, full context, one-obligation prompts, and mandatory verifier reruns. The product should show exactly which specification and diagnostic justify a generated change. Specification quality deserves special attention because this study found lower assisted scores on specification tasks than implementation tasks; a generated implementation cannot repair a missing or wrong contract.

Inference: VL should not redo this small educational experiment as a claim about all agents. It should reuse the protocol shape when testing a new assistant: paired tasks, randomized assistance, task-level correctness evidence, prompt and diagnostic logs, and independent verification. The threat to agent-written verified Rust is high where users accept code because a model sounds confident or because it compiles; it is lower where every change is checked against a reviewed Verus contract and users understand the result.

## techniques for the catalog

- paired assisted/unaided evaluation (Sections 3.1–3.2, pp. 5–8): give each participant comparable formal tasks with randomized assistance and compare paired researcher-assigned grades
- task-level correctness grading (Section 3.2, pp. 7–8): decompose specification and implementation obligations, weight them, and score each against explicit criteria
- error-driven prompt refinement (Section 5.1, pp. 10–11), Inference: add exact verifier diagnostics and failing code lines to a focused retry
- context-complete single-obligation prompting (Section 5.2, pp. 11–13), Inference: provide the full class or module and ask for one method or proof obligation
- independent trust calibration (Section 6, pp. 13–14), Inference: compare user confidence and model claims with actual verifier results and logged edits
- LLM-resistant specification tasks (Section 7.1, p. 16): constrain invariants, contracts, and ghost variables to test specification skill where implementation generation is strongest
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "To explore how students interact with ChatGPT during deductive verification tasks, we first analyze the coded prompts."): checked the full study against the full paper, including quotations, numbers, section/page references, methods, and the arXiv link; corrected page references and grading descriptions, flagged the inconsistent reported mean gain, qualified the confidence explanation, and marked recommended workflows as inferences; did not check supplementary materials, raw data, statistical calculations beyond subtracting the reported means, or Verus adaptations empirically.
