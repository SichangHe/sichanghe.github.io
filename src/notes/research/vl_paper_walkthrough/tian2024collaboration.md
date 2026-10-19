# Collaboration Dynamics and Reliability Challenges of Multi-Agent LLM Systems in Finite Element Analysis
(authored by agents unless marked 🧑)
Tag: `tian2024collaboration`, [paper](https://doi.org/10.1016/j.intcom.2010.07.003) (link from the fetch record; this DOI identifies the cited Baxter and Sommerville article, not this paper; the supplied paper text gives no DOI, arXiv identifier, or publisher URL for itself)

## scope and central result

The paper studies role composition and dialogue order in LLM-generated finite-element-analysis (FEA) programs. Its setting is AutoGen v0.7.5, GPT-3.5-Turbo, Python 3, Google Colab CPU, temperature 0, seed 42, max_tokens 2048, and OpenAI Python SDK v2.0.1 (§2.1, PDF p. 5). The four linear-elastic tasks concern displacement, shear displacement, a plate with a hole, and stress σxy (§2.1, PDF p. 4). The authors state: “After each trial, we cleared conversation memory to prevent cross-run contamination and to preserve independence across the 7×4×40=1,120 runs.” (§2.2, PDF p. 6.)

The abstract claims that “collaboration effectiveness depends more on functional complementarity than team size” (PDF p. 1). However, its description of Coder–Executor–Critic as producing physically correct solutions conflicts with §3.4: “Among all combinations, only Combo 3 (Coder + Executor + Critic) produced any visually successful cases in Tasks 3 and 4 (two per task, resembling Figure 1c and d), but these did not pass physical validation.” (PDF p. 14.) The study therefore distinguishes visual success from physical correctness rather than accepting the abstract's stronger claim.

## technique 1: controlled role-composition experiment

What it is. Compare execution feedback, duplicate review, and adversarial review under a fixed conversation budget. The paper states: “The combinations in Table 1 were designed to systematically vary: (1) presence/absence of Executor, (2) redundant vs. adversarial reviewers, and (3) team size from 2 to 4 agents.” (§2.1, PDF p. 5.)

Inference: Use this design to test whether another agent adds a distinct capability or merely duplicates review.

How to do it, from the paper.

1. Define tasks and reference outputs. Figure 1 supplies expected visualizations for the four FEA tasks (§2.1, PDF pp. 4–5).
2. Define Coder, Executor, Critic, Rebuttal, and Critic_Add. Critic_Add is identical to Critic. Table 1 compares Coder+Critic; Coder+Executor; Coder+Executor+Critic; Coder+Critic+Critic_Add; Coder+Critic+Rebuttal; Coder+Executor+Critic+Critic_Add; and Coder+Executor+Critic+Rebuttal (§2.1, PDF p. 5). Appendix A gives the role prompts (PDF p. 20).
3. Hold the model and decoding settings above fixed (§2.1, PDF p. 5).
4. Begin with Coder. The authors state: “At the start of each trial, we randomized and then fixed the agent turn order for 12 conversational turns, ensuring comparable interaction depth across runs.” They report at least three exchanges per agent (§2.2, PDF p. 6).
5. Run 40 repetitions per combination–task. Without an Executor, execute the final twelfth-round code after the dialogue, so those agents receive no execution feedback during conversation. Clear conversation memory between trials (§2.2, PDF p. 6).
6. Apply the three-level evaluation: execution, visual/specification compliance, and physical correctness for Tasks 3–4 (Appendix B, PDF p. 21).

Evidence and limits. For Task 2, the authors report: “This is starkly illustrated in Task 2, where Combo 2 achieved 100% code execution yet 0% task success (Figure 4).” (§3.1, PDF p. 8.) In the same passage, 14/40 (35%) Combo 2 runs in Task 3 and 20/40 (50%) in Task 4 produced blank images or only the circular geometry. It adds: “An additional 11.25% (9/80) of cases showed boundary condition errors.” Inference: in context, these 80 cases are Combo 2 across Tasks 3–4, rather than all Executor-inclusive trials. The separate comparison across Executor-inclusive configurations concerns error-type distributions (p = 0.031, Cramér’s V = 0.22; §3.1, PDF p. 8).

For Executor versus non-Executor code success, the paper reports “Task 1: p = 0.64; Task 2: p = 0.84” and “Tasks 3–4 (p < 0.001 in both)” (§3.1, PDF p. 7). These comparisons concern execution, not physical correctness.

The limitations include four linear-elastic tasks, 12 turns, a homogeneous base model, different execution-feedback pathways, and exploratory statistics: “p-values are reported without multiplicity adjustment.” (§4, PDF pp. 15–16.) Inference: these results motivate bounded-workflow experiments, rather than establishing that three agents are generally optimal.

Inference: For Verus, compare distinct generation, proof checking, contract review, and domain review stages. Remove one stage or replace it with duplicate review while keeping tasks, budgets, repetitions, and outcome definitions fixed. This is a proposed transfer; the paper evaluates Python/FEniCS workflows, not Verus.

## technique 2: multi-level validation instead of execution-only checking

What it is. Check execution, task compliance, and physics separately. The authors write: “These discrepancies expose a misalignment between verification (execution success) and validation (specification or physical correctness), i.e., code that runs can still be wrong.” (§3.1, PDF p. 9.)

Inference: Use separate checks whenever executable output can violate an intended requirement or mathematical model.

How to do it, from the paper.

1. Execute the generated program and record code success (§2.2, PDF p. 6; Appendix B, PDF p. 21).
2. Compare output against Figure 1 for visual/specification compliance (§2.3, PDF p. 6; Appendix B, PDF p. 21).
3. For Tasks 3–4, inspect constitutive equations and material parameters (§3.4, PDF p. 14; §4, PDF p. 16).
4. Report these outcomes separately. Appendix B states: “We report code success rate, task success rate, physical-validation pass/fail, and token usage per run.” (PDF p. 21.)

Evidence. No combination passed physical validation in Tasks 3–4; Combo 3's two visually successful cases per task failed this check (§3.4, PDF p. 14). The paper quotes the generated stress expression as “Sigma (u) = 2*E*nu/(1-nu**2)*epsilon(u) + E/(1+nu)*tr(epsilon(u))*Identity(2)” and labels the following expression the correct 2D plane-stress formulation: “Sigma (u) = (E/(1 - nu**2))*((1 - nu)*epsilon(u) + nu*tr(epsilon(u))*Identity(2))” (§3.4, PDF p. 14). Its diagnosis is that the generated expression “matched neither standard, indicating a failure to represent the underlying physical relations.” This study records the authors' equation comparison; it does not independently derive the reference equation.

What remains trusted. The paper specifies that physical validation “does not include comparison to experimental data” (§4, PDF p. 16). Inference: For Verus, report proof-check success separately from whether `requires` and `ensures` express the intended contract and whether the mathematical model is appropriate. A successful proof of an encoded statement alone does not establish that its assumptions describe the intended application. Review those assumptions and any trusted `external_body` declarations separately. This transfer was not tested in the paper.

## technique 3: measure affirmation and reviewer redundancy

What it is. Label agreement without substantive reasoning and compare duplicate-review conditions. The paper defines affirmation as Rebuttal endorsing the Critic “without adding new reasoning or proposing alternatives”; it excludes brief agreement followed by substantive reasoning (§2.3, PDF p. 7).

How to do it, from the paper.

1. Log the conversation (§2.2, PDF p. 6).
2. Label Rebuttal endorsements using the criterion above. Label a Critic diagnosis incorrect when manual checking shows that the original code executes and its visualization matches Figure 1. This criterion concerns execution and visual/specification compliance, not physical validity (§2.3, PDF pp. 6–7).
3. Compare affirmation with incorrect diagnoses (§3.2, PDF pp. 9–10).
4. Compare duplicate Critic_Add conditions with their corresponding configurations under the same turn budget, recording tokens and task outcomes (§3.3, PDF pp. 12–13).
5. Inspect the order of error reports and substantive suggestions. The observed sequence was “Coder → Executor (error) → Rebuttal → Critic.” (§3.2, PDF p. 11.) This was an observed pattern under randomized turn order, not a separately tested intervention that dynamically scheduled adversarial turns.

Evidence. The authors report: “Across 43 Rebuttal interventions in Task 1, affirmation occurred 39 times (90.7%), including 12 of 13 (92.3%) in Combo 5 (Coder + Critic + Reb) and 27 of 30 cases (90%) in Combo 7 (Coder + Executor + Cri + Reb)” (§3.2, PDF p. 9). The following page states: “Despite this difference, Rebuttal agents affirmed 14 of the 16 (87.5%) incorrect diagnoses without challenge.” These are intervention/diagnosis counts, not denominators of 1,120 trials. The analysis concerns failed Task 1 cases, as indicated by the surrounding text and Figure 6 caption (§3.2, PDF pp. 9–10).

For Task 2, all five substantive Rebuttal suggestions in Combo 7 followed Executor error reports. The authors say these “coincided with Combo 7’s superior performance in Task 2 (25% task success, the highest across all combinations; Figure 4).” (§3.2, PDF p. 11.) Inference: the association does not establish that enforcing that sequence would cause higher success.

In Task 2, Combo 4 matched Combo 1's code and task success rates while using more tokens. The reported token ANOVA is F = 30.44, p < 0.001, η² = 0.37; the paper explicitly notes that these ANOVA statistics concern token usage (§3.3, PDF p. 12). Combo 6 achieved 10% task success versus Combo 3's 15%. Its 36 failures were boundary-condition errors, without execution failures (§3.3, PDF pp. 12–13). The authors describe a recurring sequence (§3.3, PDF p. 13):

> A recurring sequence: Executor: “code runs”; Critic: “looks good”; Critic_Add: “looks good”, created a triple-layer validation loop that accelerated premature consensus.

Inference: For Verus, ask a contract reviewer to identify a counterexample or missing precondition, and add a second reviewer when it checks a different obligation. Test review triggered by failed proof checking or a changed contract, and measure duplicate-review costs. These are proposed policies; the paper does not test their effects on Verus proof success.

## what is proved, measured, and trusted

The evaluation is empirical. Appendix B states: “We applied a three-level evaluation protocol: (i) code execution (verification); (ii) specification/visual compliance (match to Figure 1 references); and (iii) physical correctness (validation) for Tasks 3–4.” (PDF p. 21.) Inference: the reported statistics and dialogue observations do not constitute a formal proof of the orchestration protocol. Physical checks audit equations and parameters rather than experimental accuracy (§4, PDF p. 16).

## techniques for the catalog

- complementary role ablation — compare distinct generation, execution, and review capabilities under equal tasks, turns, and repetitions
- multi-level validation — measure execution, specification compliance, and physical correctness separately; inference: use analogous separate outcomes for proof checking and contract/model review
- affirmation instrumentation — label agreement without new reasoning and compare it against incorrect diagnoses
- redundancy measurement — compare duplicate-review token cost and task outcomes; inference: test caps or error-triggered review as proposed interventions
