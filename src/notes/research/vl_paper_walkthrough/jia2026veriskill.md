# VeriSkill: A Self-Evolution Framework for Program Verification Skills
(authored by agents unless marked 🧑)
Tag: `jia2026veriskill`, [paper](http://arxiv.org/abs/2607.27733v1)

source: Changguo Jia, Tianqi Zhao, Zhiyou Xiao, Weiming Zhang, Minghui Zhou (Peking University, Zhongguancun Laboratory, Shanghai Jiao Tong University), arXiv:2607.27733v1, 30 Jul 2026; 9 pages, of which pages 8 and 9 are references; no appendix

earlier notes: research/veriskill_20260803.md is a full competitive assessment of this paper against AutoVerus and Midas Lex. It already holds: the three stages in outline, the dataset splits, the headline gains, the ablation deltas, the cross-model range, the limits (reference solutions as supervision, weak semantic check, reuse of the validation set, no released artifact, no variance), and a proposed promotion loop for VL's own guidance. This study adds what that note lacks: each stage as steps with the paper's wording and page, Algorithm 1 line by line, the three acceptance formulas, every cell of Table 1 with its arithmetic, a likely size for the Frama-C benchmark, a Verus form per technique, and the list of parameters the paper does not give.

## what is measured, and what is trusted

A skill here is a text document of workflows, tool instructions and error-handling procedures that a coding agent reads before a task. VeriSkill is a loop that edits such a document for one verifier. Nothing is proved about the loop. What is measured is PASS: the share of held-out benchmark tasks on which an agent using the final skill produces an artifact the verifier accepts and which also passes a check that the executable program was not changed (Section 5 "Metrics", p.5).

The paper's formal objective is the expected verifier success of a skill over tasks and agent samples, under the constraint M(x, a) = 1, where M says the candidate solution did not modify the original executable program (Section 3, Equations 1 to 3, p.2 to 3).

Trusted: the verifier (Dafny, Frama-C with WP, VeriFast); the check M; the human-verified reference solutions used during evolution; the judgement of whatever performs attribution and abstraction. Inference: the paper never says which model or agent performs the attribution, clustering and lesson writing, so the quality of those judgements cannot be assessed from the text.

What a PASS does not show, as the earlier note also concluded: “The semantic-preservation check rejects artifacts that edit executable behavior or introduce verification-bypass constructs.” (Section 5, p.5) It does not check that a generated contract says what the program is meant to do. Inference: an agent can raise PASS by writing weaker postconditions, and a skill that teaches this would be admitted.

## technique 1: attribute each failure before learning from it

what it is: a four-way classification of every failed attempt, of which only two classes may change the skill.

why: the paper's starting observation is “A failed verification attempt does not necessarily indicate a skill deficiency, making it difficult to determine whether the skill should be revised.” (Section 1, p.1)

when to use: whenever failures of a verification agent are mined to improve its standing instructions.

how it is done (Section 4.1, p.3; Algorithm 1 lines 3 to 8, p.4):
1. run the agent with the current skill on every training task and collect the outcomes (line 3)
2. for each failure, gather the evidence: “Given a failed task, VeriSkill performs responsibility attribution by jointly considering the generated result, verifier output, skill, human-verified reference solution, and evolution memory.” (Section 4.1, p.3)
3. assign one of four classes, in the paper's words (Section 4.1, p.3):
   - “Task unsatisfiability: The source program and annotations do not support the verification objective.”
   - “Prover limitation: The proof obligation is reasonable, but the current prover lacks the capability to discharge it.”
   - “Skill noncompliance: The skill provides relevant guidance, but the agent fails to follow it.”
   - “Skill knowledge gap: The skill lacks the reusable procedural knowledge required for the verification task.”
4. filter: “The first two categories are excluded from skill evolution, whereas the latter two are retained as skill-related failures.” (Section 4.1, p.3)
5. consult the record of earlier rounds: “Records identifying similar failures as task unsatisfiability, prover limitation, or outcomes of invalid revisions help prevent repeated misattribution.” (Section 4.1, p.3)
6. if nothing is left after filtering, the loop ends (lines 6 to 8)

Verus form (Inference: the paper evaluates Dafny, Frama-C and VeriFast and has no Verus experiment). The four classes map onto Verus failures as follows. Task unsatisfiability: the given `ensures` is false for the given code, or the `requires` is too weak for it; no proof exists. Prover limitation: the obligation is true but the solver times out or needs nonlinear arithmetic or a quantifier instantiation it does not find; the right response is a proof technique such as `assert(...) by (nonlinear_arith)` or an explicit `#[trigger]`, and whether that counts as a prover limit or a knowledge gap is the judgement call. Noncompliance: the guidance says, for instance, to state loop bounds in the `invariant`, and the agent did not. Knowledge gap: the guidance is silent. What changes: the paper's attribution leans on a human-verified reference solution for every training task; for agent-written Verus code on new projects there is usually none, so class 1 and class 2 are much harder to tell from class 4.

evidence: Table 2 (p.6), Dafny track, Claude Code with Opus 4.8, 100 benchmark tasks, mean of three runs: full system 57.3%; with every failure treated as a skill deficiency, 44.3%, a drop of 13.0 points.

where it fails or what it assumes: a reference solution per training task; an attributor that is right. The paper reports no accuracy of the attribution and no count of failures per class.

## technique 2: a three-part diagnostic signature, clustered

what it is: each retained failure is described by where the proof broke, which proof duty was missing, and what was wrong with the skill text. Failures with matching descriptions are grouped, and the group, not the single failure, is the unit that produces a lesson.

why: “Moreover, outputs from verification tools report failed verification conditions, which are not directly reusable procedural knowledge.” (Section 1, p.1)

how it is done (Section 4.2, p.3 to 4; Algorithm 1 lines 10 to 17):
1. extract the signature's three parts, in the paper's words (Section 4.2, p.4):
   - “Proof-obligation localization: Identify where the proof fails, such as invariant initialization, invariant preservation, memory safety, or termination.”
   - “Verification-responsibility abstraction: Identify the reusable proof responsibility missing from the candidate solution, such as establishing entry facts, preserving an invariant, or supplying an intermediate lemma.”
   - “A skill failure mechanism: Identifies how the skill text causes the failure, such as missing, unclear, overly abstract, or difficult-to-locate guidance.”
2. group failures whose signatures share structure into failure-pattern clusters, and state the common duty of each cluster (Section 4.2, p.4). The stated benefit: “Reasoning over a cluster allows VeriSkill to capture semantically equivalent proof responsibilities across syntactically different solutions and avoids overfitting a revision to a single example.” (Section 4.2, p.4)
3. select one cluster for this round (Algorithm 1 line 11). The selection rule is not given.
4. split the cluster's cases into attribution cases, used to write the lesson, and transfer cases, held back (line 12). The proportion is not given.
5. read the reference solutions of the attribution cases for the duty they discharge, not for their text. A reference holds reusable duties and one example's particular route (a specific invariant form, assertion location, lemma expression or constant): “VeriSkill retains only the former and removes the latter, thereby avoiding the hard-coding of example-level outputs into the skill.” (Section 4.2, p.4)
6. retrieve earlier records for this pattern from memory: “Accepted revisions provide reusable procedural knowledge as guidance, whereas rejected or skipped revisions prevent repeated ineffective or unsafe updates.” (Section 4.2, p.4)
7. if no common duty can be abstracted, record the cluster as skipped and start the next round (lines 14 to 17)

Verus form (Inference). Part one of the signature can be read off Verus's error kind without a model: precondition not satisfied at a call, postcondition not satisfied, invariant not satisfied before the loop, invariant not satisfied at the end of the loop body, assertion failed, possible arithmetic overflow, `decreases` not satisfied. These correspond to the paper's examples of initialization, preservation and termination; its memory-safety location has no Verus counterpart in safe code. Part two uses the same vocabulary in Verus: establish entry facts before a loop, strengthen the `invariant` so the body preserves it, supply a `proof fn` lemma, `reveal` an `opaque` definition. Part three concerns the guidance document and carries over unchanged. Clustering key for a Verus agent: the pair of error kind and missing duty.

evidence: Table 2 (p.6), same setting as above: deriving guidance from direct differences between generated and reference artifacts instead of abstracting gives 49.0%, a drop of 8.3 points from 57.3%.

where it fails: the paper gives no number of clusters found, no cluster sizes and no example of a signature. Small clusters cannot be split into attribution and transfer cases; what happens then is not said.

## technique 3: the lesson as a scoped, example-free unit

what it is: the text added to the skill has a fixed shape and a ban list.

how it is done (Section 4.2 to 4.3, p.4; Algorithm 1 lines 20 to 21):
1. write the lesson to this requirement: “A candidate lesson must specify its applicability conditions, concrete proof steps, and inapplicable cases, while avoiding task IDs, file names, concrete variable names, or constants.” (Section 4.2, p.4)
2. integrate it into the skill by editing, not appending: “This is a controlled revision rather than a textual append.” (Section 4.3, p.4) The lesson goes into the part of the skill that matches its scope and revision type
3. the kinds of edit named: “For example, the candidate may rewrite an unclear process, add conditional guidance for an uncovered case, or turn an abstract principle into explicit execution steps, while preserving unrelated sections and the original task contract.” (Section 4.3, p.4)

the paper's one concrete lesson, Table 3 (Section 7, p.7): the C source contains a null check that aborts, `if (ptr == NULL) { abort(); }`. EvoSkill's update reads: preserve failure-guard branches. VeriSkill's reads: do not fabricate branches for untranslatable failure guards. The explanation: “The same C fragment can lead to opposite skill updates: EvoSkill interpretation preserves the null-check branch to match source control flow, whereas VeriSkill recognizes that the branch is a host-level executability guard and should not be fabricated in Dafny when it carries no verified data-state behavior.” (Section 7, p.7) The Dafny PASS printed with the two updates, 32.3% and 57.3%, are the two methods' whole-benchmark scores from Table 1 (Claude Code, Opus 4.8), not the effect of this one lesson.

Inference: the example sits uneasily with the paper's own check. The lesson tells the agent to omit a branch of the source, while the Dafny-track check is described so: “For C-to-Dafny, the check compares aligned callables, control flow, state updates, returns, and assertions across the source and generated artifacts.” (Section 5, p.6) How a dropped guard passes a control-flow comparison is not explained.

Verus form (Inference). A lesson for a Verus guidance file would have the same three fields: when it applies (for example, a loop over a `Vec` whose postcondition quantifies over all indices), the steps (state the bound on the index, state the quantified fact for the processed prefix, add the `decreases` measure), and when it does not apply. The ban list carries over. The null-check lesson has a Rust-specific reading: C guards against null or invalid input mostly disappear in Rust types, and where they remain as a panic path Verus requires proving the path unreachable or stating a `requires`; a skill for C-to-Rust translation would need its own lesson here, not this one.

evidence: only the ablation of technique 2 and this single case.

## technique 4: test a candidate on its own failure pattern first, then on a frozen validation set

what it is: a two-level acceptance test for each candidate skill, with a repair loop at the first level.

how it is done (Section 4.3, p.4 to 5; Algorithm 1 lines 19 to 33):
1. build the candidate skill S′ from the current skill, the lesson and memory (Equation 4, p.4; lines 20 to 21)
2. rerun agent and verifier with S′ on two sets: “Let Ac denote the attribution cases used to analyze the failure pattern and construct the lesson, and let Tc denote same-pattern disjoint transfer cases that were not involved in lesson construction.” (Section 4.3, p.4)
3. compute two local effects, each the mean over the set of the verifier outcome under S′ minus the outcome under the current skill (Equation 5, p.5). The first asks whether the motivating failures are repaired, the second whether the repair carries to unseen cases of the same pattern
4. also reject at this level: “Local testing also rejects pass-to-fail regressions or modifications to the original executable code.” (Section 4.3, p.5)
5. on a local failure, use the repair and regression evidence to rewrite the lesson and try again: “This revise–test loop continues until a candidate passes both local tests or the failure-pattern budget is exhausted.” (Section 4.3, p.5) Each attempt's outcome is written to memory (line 23). If the budget runs out, go to the next round without touching the skill (lines 25 to 27)
6. a locally valid candidate is run on the whole validation set; its score is the fraction of validation tasks verified (Equation 6, p.5)
7. admission rule (Equation 7, p.5): “Specifically, VeriSkill requires the candidate skill to strictly improve the validation-set success rate while preserving the integrity of all validation tasks” (Section 4.3, p.5). If the validation score rises and M = 1 on every validation task, S′ replaces the skill; otherwise the skill is kept
8. record the outcome, accepted or rejected, with its pattern, attribution, lesson, validation result and applicability conditions (lines 30 and 32), and start the next round

Not in the paper: the threshold that makes a local test pass (any positive effect, or full repair), the size of the per-pattern budget, the number of rounds run, the starting skill, and how run-to-run variation of the agent is handled when a single rerun decides admission on 17 or 20 validation tasks.

Inference: the admission rule compares totals, so a candidate that gains two validation tasks and loses one is admitted; only the local level forbids a pass turning into a fail. On a 20-task validation set one task is 5 points, so strict improvement can be noise.

Verus form (Inference). The procedure is independent of the verifier; only the check M needs a Verus definition. For annotation-only tracks the paper requires the executable C to match the input once annotations, comments and whitespace are erased (Section 5, p.5 to 6). The Verus equivalent: erase all ghost code (`spec fn`, `proof fn`, `proof { ... }` blocks, `requires`, `ensures`, `invariant`, `decreases`, `Ghost` and `Tracked` values) and require the remaining executable Rust to equal the input. The paper's second clause, no verification-bypass constructs, becomes: no `admit()`, no assume statements, no new `#[verifier::external_body]`, no new `assume_specification`. A third clause the paper lacks and VL needs: where the task supplies the `requires` and `ensures`, they must be unchanged.

evidence: Table 2 (p.6): the variant defined as “w/o Executable Validation: candidate skills skip the revise–test loop on attribution and transfer cases, proceeding directly to validation.” (Section 6.2, p.6) scores 36.0%, a drop of 21.3 points from 57.3%, the largest of the three ablations. Inference: 36.0% is below three of the generic baselines in the same row of Table 1 (Skill-Creator 39.3, AutoSkill 41.0, SkillOpt-Lite 42.3), so the local loop, not attribution or abstraction, is what puts VeriSkill ahead of them on this track.

where it fails: cost and data. The loop reruns the agent and the verifier many times per candidate: “Because each experiment requires repeated LLM-agent execution and formal verification over multiple evolution iterations, the complete evaluation incurred approximately US$15K in API costs.” (Section 6, p.6) It also needs enough failures of one pattern to fill both an attribution set and a transfer set.

## technique 5: evolution memory

what it is: a log of every attempted revision, read back in all three stages.

how it is done: one record per candidate, whether accepted, rejected or skipped, holding its failure pattern, attribution, lesson, validation outcome and applicability conditions (Section 4.3, p.5). It is read in stage 1 to avoid repeating a wrong attribution, in stage 2 to supply lessons that worked and block ones that did not, and in stage 3 when building the candidate (Algorithm 1 lines 4, 5, 10, 11, 13, 20, 21).

Verus form (Inference). Nothing verifier-specific; for VL it is a table keyed by error kind and missing duty.

evidence: none. No ablation removes the memory.

## the experiment in full

setup (Section 5, p.5). Three tracks, each with its own data:
- Dafny: “Because DafnyBench comprises a large set of Dafny programs and is not inherently intended as a benchmark for C-to-Dafny translation, we sample 200 tasks, manually construct plain-C inputs paired with hidden Dafny references, and split them 4:1:5 into training, validation, and benchmark.” (Section 5, p.5) That is 80, 20 and 100 tasks
- Frama-C: function-level examples from four GitHub repositories, ACSL stripped, checked by two experts; 85 tasks split 68 and 17 for training and validation; the benchmark is the separate Frama-C-Problems repository, whose size is not stated
- VeriFast: 200 tasks from two sources, split 4:1:5

Agents: Claude Code with Opus 4.8, and Codex with GPT 5.6 Sol. Seven baselines. Repetition: “For every evaluation setting, we run each method three times and report the average as the final result.” (Section 5, p.6) No spread is reported.

Table 1 (p.6), PASS in percent, in the order No Skill, LLM Skill, Human Skill, Skill-Creator, EvoSkill, AutoSkill, SkillOpt-Lite, VeriSkill:
- Claude Code, Dafny: 14.0, 21.3, 7.7, 39.3, 32.3, 41.0, 42.3, 57.3
- Claude Code, Frama-C: 56.9, 47.1, 58.2, 58.2, 54.2, 60.8, 65.4, 74.5
- Claude Code, VeriFast: 38.0, 32.0, 24.3, 58.3, 53.0, 62.7, 78.3, 84.0
- Codex, Dafny: 17.0, 27.3, 12.3, 21.7, 30.3, 35.7, 62.7, 66.0
- Codex, Frama-C: 57.5, 38.6, 59.5, 56.2, 55.6, 60.1, 66.7, 83.0
- Codex, VeriFast: 41.7, 44.0, 35.0, 63.0, 58.0, 67.7, 76.0, 93.0

The paper's summary holds against these cells: “VeriSkill achieves the best score in all six verifier–agent configurations.” (Section 6.1, p.6) Its gains over No Skill (43.3, 17.6, 46.0; 49.0, 25.5, 51.3) and over the best baseline, SkillOpt-Lite in every row (15.0, 9.1, 5.7; 3.3, 16.3, 17.0), all match the cells.

Inference from the cells:
- every Frama-C figure is a whole number of 153rds (for example 74.5% = 114/153, 56.9% = 87/153, 83.0% = 127/153), which fits a benchmark of 51 tasks run three times; the Dafny and VeriFast figures are whole numbers of 300ths, fitting 100 tasks
- with 51 tasks, the Frama-C gain over SkillOpt-Lite under Claude Code, 9.1 points, is under five tasks per run
- generic evolution is not reliably better than nothing on Frama-C: EvoSkill is below No Skill with both agents (54.2 against 56.9; 55.6 against 57.5), and Skill-Creator is below No Skill with Codex (56.2 against 57.5). The paper says only that evolution methods usually give larger gains
- the expert-validated Human Skill is below No Skill on Dafny and VeriFast with both agents (7.7 against 14.0 and 24.3 against 38.0 under Claude Code)
- the Frama-C No Skill baseline is already 56.9% and 57.5%, so that benchmark is much easier for these agents than the other two

Cross-model test (Section 6.3 and Figure 2, p.7): the skill evolved with Codex on Dafny is given unchanged to five other models in the Terminus agent wrapper, each compared with its own No Skill run on the same Dafny benchmark. “The Codex-evolved skill improves every Terminus-backed LLM, with gains ranging from +15.3 to +43.7 pp, even though no model-specific evolution is performed.” (Section 6.3, p.7) The five pairs printed in the figure, No Skill then with skill: 12.0 and 55.7; 10.3 and 51.7; 7.7 and 44.3; 6.0 and 41.0; 2.0 and 17.3. Each difference matches its printed gain. The models are GLM-5.2, Kimi-K2.7, Qwen3.7-Max, DeepSeek-V4-Pro and Qwen3-Coder; which bar belongs to which model cannot be told from the extracted text. All five with-skill scores are below the 66.0% of Codex itself.

## what was already done, and threat

Already done, so not a novelty VL can claim: mining verifier failures into a persistent guidance document with attribution, clustering, and validation-gated admission. The paper positions this against per-artifact repair systems, AutoVerus included: “The resulting procedural knowledge is not externalized as a persistent skill reusable across tasks, verifiers, and model backbones.” (Section 2.2, p.2)

Inference: threat to a product of agent-written verified Rust is medium, unchanged from the earlier note's judgement. The method is verifier-agnostic and would run on Verus given training tasks with reference proofs; nothing in it is hard to reimplement, and the paper releases no code. Its weak point is the one VL's product depends on: the acceptance test counts verifier acceptance with unchanged code, so it rewards whatever makes proofs pass, including weaker specifications. A VL loop with the same three stages but an admission rule that also fixes the specification and forbids any per-task regression would be the same technique with a stricter gate.

## techniques for the catalog

- four-way failure attribution: classify each failed attempt as unsatisfiable task, prover limitation, guidance not followed, or guidance missing, and learn only from the last two
- three-part diagnostic signature: describe a failure by where the proof broke, which proof duty was missing, and what was wrong with the guidance text
- pattern-level clustering: group failures with matching signatures and write one lesson per group, never per failure
- duty-not-route reading of reference proofs: take from a reference solution the kind of proof duty it discharges and discard its particular invariant, assertion site, lemma text and constants
- scoped lesson format: every lesson states when it applies, the concrete proof steps, and when it does not apply, and contains no task identifiers, file names, variable names or constants
- controlled revision: integrate a lesson by editing the matching part of the guidance instead of appending to it
- attribution and transfer split: hold back some failures of the same pattern and require the revised guidance to fix them too
- revise and test loop with a per-pattern budget: on a local failure, rewrite the lesson from the new evidence and retest until it passes or the budget ends
- strict-improvement admission on a frozen validation set: admit a candidate only if its validation pass rate rises and no validation artifact changes executable code
- executable-projection check: accept an annotated artifact only if erasing annotations, comments and whitespace gives back the input program and no bypass construct was added
- evolution memory: log every accepted, rejected and skipped revision with its pattern and outcome, and consult the log before attributing or writing again
- unchanged-skill transfer test: give the final guidance to other models without further tuning to check that it is knowledge and not a model-specific prompt
Checked 2026-10-13: audit record jia2026veriskill; paper-study comparison complete; gate executed; experiments not rerun
