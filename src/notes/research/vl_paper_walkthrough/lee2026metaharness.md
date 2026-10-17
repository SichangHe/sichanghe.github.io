# Meta-Harness: End-to-End Optimization of Model Harnesses
(authored by agents unless marked 🧑)
Tag: `lee2026metaharness`, [paper](https://arxiv.org/abs/2603.28052)

## what the paper contributes
Meta-Harness searches over executable harness programs that wrap a frozen language model. A harness controls prompts, retrieval, memory, and tool orchestration. The outer proposer reads a filesystem of earlier harness code, scores, and raw execution traces, then proposes and evaluates new code. The abstract says: “We introduce Meta-Harness, an outer-loop system that searches over harness code for LLM applications.” (abstract, p.1)

Inference: For VL, the harness is the agent loop that edits Rust and invokes Verus. The proposed transfer is to search that loop using proof outcomes and full traces. Meta-Harness does not prove Rust properties; Verus must remain the final checker.

## technique 1: optimize executable harness code with a persistent filesystem

What it is. The paper defines a stateful harness H around model M and task distribution X, with reward r over rollout τ. Its objective is `H* = arg max E r(τ,x)` (Section 3, p.4). The authors write: “A harness is a stateful program that wraps a language model and determines what context the model sees at each step.” (Section 3, p.4)

How to apply it. (1) Freeze the base model and define task inputs and reward. (2) initialize a population of valid harnesses. (3) evaluate each harness and save source, scores, prompts, tool calls, outputs, and state updates. (4) let a coding-agent proposer inspect the filesystem with tools such as `grep` and `cat`. (5) propose one or more new harness programs. (6) reject candidates failing interface validation. (7) evaluate valid candidates and add their records. (8) after N iterations, return the Pareto frontier. These are Algorithm 1, lines 1–13 (p.5).

The proposer can inspect any prior harness; there is no fixed parent-selection rule, and it never sees test-set results (Section 3, p.4). The paper says: “a typical run evaluates roughly 60 harnesses over 20 iterations” (Section 3, p.5). Actual runs differ: text classification used 20 iterations with two candidates each, 40 harnesses (Section 4.1, p.6); math retrieval used 40 iterations and produced 109 candidates (Section 4.2, p.8); the TerminalBench-2 run in Appendix A had 10 iterations (p.15).

Verus form. Inference: define a harness interface that accepts a Rust task and emits agent actions, with a mandatory Verus command after proof edits. Save source, model prompts, compiler diagnostics, solver timings, and verification results in one directory per candidate. Interface validation should ensure the candidate cannot bypass Verus or alter the benchmark oracle; the paper's own validation is only a lightweight test that imports the module, instantiates the class and calls both methods on a few examples (Appendix D, p.25), and it scores candidates with a separate evaluation harness outside the proposer (Appendix D, p.25). Candidates are code reviewed and then re-run by Verus; harness reward is an engineering signal, not a proof.

Evidence and limits. The search is code-space search, so brittle conditionals and hard-coded mappings are inspectable (Section 5, p.10). The proposer is Claude Code with Opus-4.6, and the base model varies by domain but is frozen (Section 3, p.5). This single proposer limits conclusions about proposer-agent generality (Section 5, p.10).

## technique 2: use raw traces instead of compressed feedback

What it is. Each candidate contributes source code, scores, and execution traces. The proposer reads a large filesystem rather than a lossy summary. The paper states: “The filesystem is typically far larger than the proposer’s context window, so the proposer queries it through terminal tools such as grep and cat rather than ingesting it as a single prompt.” (Section 3, p.4)

How to apply it. (1) Store every prompt, tool call, model output, state update, score, and failure. (2) expose search and file-reading tools. (3) ask the proposer to diagnose likely failure modes before editing. (4) retain all history so it can compare non-adjacent candidates. Appendix A.1 reports, for the 10-iteration TerminalBench-2 run only, a median of 82 files read per iteration (range 69 to 99): 41% harness source, 40% execution traces, 6% score/summary files, and 13% other files (Appendix A.1, Table 8, p.15).

Verus form. Inference: store the exact Rust diff, Verus stdout/stderr, generated proof obligations, solver timeout, test output, and context shown to the model. Let the proposer search for recurring diagnostics and compare traces before changing the harness. Redaction must preserve diagnostics while preventing benchmark answers from leaking into candidate code.

Evidence. In online text classification, the ablation has three conditions. Scores-only reaches median 34.6 and best 41.3 accuracy; scores plus summaries reaches median 34.9 and best 38.7; full raw traces reaches median 50.0 and best 56.7 (Table 3, p.7). The table counts runs exceeding zero-shot as 26, 23, and 39 respectively. The authors write: “We interpret this as evidence that full access to execution traces is the most important component of the interface: summaries do not recover the missing signal, and may even hurt by compressing away diagnostically useful details.” (Section 4.1, p.7). The Table 3 caption does not say which split these are; Inference: they are search-set accuracies, because the Meta-Harness row (50.0 median, 56.7 best) equals the row that Table 4 labels “(search set)”. They are text-classification accuracies, not proof success rates, and come from one domain.

## technique 3: preserve Pareto trade-offs

What it is. When accuracy and context cost both matter, candidates are compared by Pareto dominance instead of one weighted scalar. The paper says: “When multiple objectives are relevant (e.g., accuracy and context cost), we evaluate candidates under Pareto dominance and report the resulting frontier.” (Section 3, p.4)

Steps. (1) define each objective and its direction. (2) evaluate every valid candidate on all objectives. (3) discard candidates dominated on every objective. (4) retain the non-dominated frontier. (5) choose an operating point only after seeing the trade-off. The paper's setup is that the proposer is given the current metrics and the desired trade-off and discovers harnesses across the frontier, giving “a smooth accuracy–context Pareto curve” (Section 4.1, p.7; Figure 3, p.6); the final test-set evaluation is done on the Pareto frontier (Section 3, p.4). The paper does not give a mechanical filter beyond Pareto dominance; steps (1) to (5) are the study's own reading. For text classification, Figure 3 plots test accuracy against additional context (the axis is labeled chars, while Table 2 gives tokens in thousands).

Verus form. Inference: use proof success or benchmark correctness, wall-clock time, token cost, number of Verus invocations, and human-review burden as separate objectives. Keep candidates that improve one dimension without worsening all others. Select a point according to deployment constraints, while rerunning the selected harness on held-out proof tasks.

Evidence. Meta-Harness reaches 48.6% average accuracy on three text datasets with 11.4K context tokens, compared with ACE’s 40.9% and 50.8K context tokens and MCE’s 40.0% and 28.5K (Table 2, p.6). In nine OOD datasets, it averages 73.1% versus ACE’s 70.2% (Table 5, p.8). These denominators are three search-domain datasets and nine held-out datasets respectively. The gain is uneven: on USPTO Meta-Harness scores 14.0 against ACE’s 16.0 (Table 2), and it is highest on 6 of the 9 OOD datasets (Section 4.1, p.7).

## technique 4: search retrieval and context policies in code

What it is. The same outer loop discovers retrieval policies rather than simply adding a fixed retriever. For 200 held-out IMO-level math problems, the discovered harness uses the existing BM25 lexical stack and averages pass@1 over three samples per problem (Section 4.2, p.8).

Steps. (1) build and deduplicate a retrieval corpus. (2) decontaminate it against search and evaluation sets. (3) search harnesses for 40 iterations over a 250-problem search set, yielding 109 candidates. (4) select one harness using search-set performance with GPT-OSS-20B (Section 4.2, p.8). (5) evaluate on 200 unseen IMO-level problems and five models. Four of the five models (GPT-5.4-nano, GPT-5.4-mini, Gemini-3.1-Flash-Lite, Gemini-3-Flash) were not seen during search; GPT-OSS-20B was the selection model (Section 4.2, p.8). The Table 6 caption reports: “The discovered Meta-Harness retrieval strategy improves reasoning on these IMO-level problems across all five held-out models, with a 4.7-point average gain over no retriever.” (Table 6, p.8). The averages are 38.8 for Meta-Harness, 34.1 for no retriever and 37.5 for BM25, a 1.3-point gain over BM25; Meta-Harness is not best on every model (for example, dense retrieval with k=5 scores 47.2 against 46.3 on Gemini-3-Flash). Appendix B.2 (p.19 to 21) describes the discovered harness as a four-route BM25 program with a lexical router over combinatorics, geometry, number theory and a default route.

Verus form. Inference: search whether to retrieve nearby verified lemmas, failed proof traces, counterexamples, or API documentation, and when to include each. Decontaminate held-out tasks from exact proof text. Measure verification success and cost, not only language-model confidence. Retrieval can suggest lemmas; Verus decides whether they type-check and satisfy the specification.

## technique 5: use regression history to isolate causal changes

What it is. Appendix A.2 shows a proposer reading regressions, identifying confounded edits, and shifting to safer modifications. The paper records: “Prior attempts: evo marker fix (58.9%, -5.6pp), evo single confirm (57.8%, -6.7pp) --- both regressed. Root cause of regressions: Prompt template changes (cleanup directives) caused the agent to delete necessary state before task completion.” (Appendix A.2, p.16)

Steps. (1) compare candidate scores and shared edits. (2) identify a common change across regressions. (3) revert that change while retaining the hypothesized structural fix. (4) evaluate the isolated candidate. (5) prefer additive changes after repeated control-flow regressions. In iteration 7, the proposer added an environment snapshot before the first call and changed no completion machinery; the paper describes this as “purely additive” (Appendix A.2, p.17). Iteration 8 composed that fix with marker stripping; the proposer's stated reason was that the two are “orthogonal fixes” addressing “independent failure modes” (Appendix A.2, p.17).

Verus form. Inference: log harness diffs and proof outcomes so a regression can be bisected to prompt, retrieval, loop, or tool changes. Require a candidate to preserve a baseline suite before composing two modifications. A failed Verus check is an objective regression signal, but a passing check can still hide a weakened specification.

Evidence. On TerminalBench-2’s 89-task benchmark, Meta-Harness reaches 76.4% with Claude Opus 4.6 versus Terminus-KIRA 74.7%, and 37.6% with Claude Haiku 4.5 versus Goose 35.5% (Table 7, p.9). On Opus 4.6 the paper ranks it #2, behind ForgeCode at 81.8%, whose result the authors could not reproduce from public code (Section 4.3, p.9); #1 is claimed only for Haiku 4.5. Appendix B.3 (p.21) says the discovered harness gains over Terminus-KIRA on 7 of 89 tasks, and its main change is an environment-snapshot bootstrap. This search and final evaluation use the same benchmark, so the paper explicitly checks overfitting by manual inspection and regex audits for task-specific leakage (Section 4.3, p.9). The same-setting evaluation is a limitation for generalization.

## what is trusted and what VL should learn

The framework trusts the candidate evaluator, benchmark tasks, model APIs, filesystem records, and proposer’s code edits. Its reported improvements are empirical; no theorem says the best harness is globally optimal. The paper notes that all three domains use one strong coding-agent proposer and that broader proposer studies remain future work (Section 5, p.10). TerminalBench-2’s same-benchmark search and evaluation increases overfitting risk despite audits.

Inference: existing VL should not duplicate generic prompt optimization. It should adapt the raw-trace filesystem, interface validation, Pareto selection, and regression isolation to Verus harness code. The threat to agent-written verified Rust is primarily operational: a harness may optimize benchmark pass rates by weakening specifications, suppressing failures, or selecting easier obligations. Require immutable specifications, independent held-out tasks, and a final Verus run outside the proposer’s control.

## techniques for the catalog

- executable harness search: evolve valid harness programs around a frozen model using a persistent code-and-trace filesystem
- raw-trace feedback: let the proposer inspect full prompts, tool calls, outputs, scores, and state updates
- Pareto selection: retain non-dominated candidates over quality and context or verification cost
- retrieval-policy search: evolve when and what evidence the harness retrieves
- regression isolation: compare shared edits across failed candidates, isolate confounds, then compose additive fixes
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "A search run completes in a few hours of wall-clock time, yet produces readable, transferable strategies that can be reused across models, including future, stronger ones."): read the whole paper text (main text and Appendices A to E) and checked every quotation, number, table and section/page reference and the Algorithm 1 steps; tag and arXiv link match the paper's arXiv stamp (2603.28052); changed the Figure 3 page (p.6, not p.7), the Table 6 caption attribution, the Appendix A.1 scope (TerminalBench-2 run only), the ablation interpretation quote and split caveat, the math model-seen caveat, the ForgeCode and 7-of-89 context, and the iteration 8 wording; added run sizes and validation details from Sections 4 and D. Not checked: the Pareto and Verus steps are the study's own inference and were not tested; external links and the released code; the figures beyond their numbers.
