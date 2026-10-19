# SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering
(authored by agents unless marked 🧑)
Tag: `yang2024sweagent`, [paper](https://arxiv.org/abs/2405.15793)

## scope
SWE-agent studies an agent-computer interface (ACI): commands and feedback designed for language-model agents editing repositories. The interface supplies search/navigation, a bounded file viewer, a range editor with linting, and context management. The paper evaluates GPT-4 Turbo and Claude 3 Opus on SWE-bench, and GPT-4 Turbo on HumanEvalFix (Tables 1–2, p. 6).

## technique: compact search and navigation
What it is: expose `find_file`, `search_file`, and `search_dir` with summarized results rather than raw shell output. The paper says: “The search commands return at most 50 results for each search query; if a search exceeds this number, we do not report the results and instead suggest that the agent write a more specific query.” (section 3, pp. 3–4)

Use it when an agent must locate definitions or references in a repository. Steps from section 3: issue a filename or string query; return a bounded result summary; if too many matches, ask for a narrower query; open the located file. Inference: for Verus, add searches for `requires`, `ensures`, `invariant`, `proof fn`, and failed-obligation source spans, with result caps that prevent context flooding.

Evidence: on SWE-bench Lite, the summarized search scored 18.0% resolved, while iterative search scored 12.0% and no search 15.7% (Table 3, 300-instance Lite setting, section 5.1, p. 6). The denominator is the 300-instance Lite split described in section 4. Inference: the result supports bounded summaries in this benchmark, not a universal optimum.

## technique: bounded file viewer
What it is: `open` presents a window of at most 100 lines, with path, total length, omitted-line counts, and line numbers; `scroll_down`, `scroll_up`, and `goto` move the window (section 3, p. 4). Use it to localize code without loading full files. Inference: a Verus viewer should show nearby specification clauses, source spans, and the current verifier diagnostic together, while preserving exact line numbers for edits.

The ablation compares 30 lines (14.3% resolved), 100 lines (18.0%), and the full file (12.7%) on the 300-instance Lite split (Table 3). These are percentages of 300 tasks, as the experimental setup defines SWE-bench Lite.

## technique: guarded range editing
What it is: one `edit` command replaces a contiguous line range and immediately refreshes the view. For Python files, selected lint errors cause the edit to be reverted and the agent to be asked to retry (Table 4, p. 17; appendix A.1, p. 19). The paper states: “Invalid edits are discarded, and the agent is asked to try editing the file again.” (section 3, p. 4)

Steps: open a file; choose inclusive start and end lines; send replacement text terminated by `end_of_edit`; apply the edit and check for selected lint errors; revert and retry if the check reports an error; otherwise keep the edit and show updated content. Appendix A.1 (p. 19) specifies `flake8 --isolated --select=F821,F822,F831,E111,E112,E113,E999,E902`, including undefined names, duplicate arguments, indentation, syntax, and source-read errors. This can constrain edit order: removing an argument may require first removing its uses (appendix A.1, p. 20). Inference: use a similar check around Rust/Verus edits, then run formatting and `cargo verus`; lint success alone does not establish verification success. Preserve `requires`, `ensures`, `assert`, and `invariant` clauses as code rather than translating them into comments.

Evidence: on SWE-bench Lite, editing with linting scored 18.0%, the unlinted edit action 15.0%, and no edit 10.3% (Table 3, 300 tasks). Main SWE-agent GPT-4 Turbo performance was 286/2,294 = 12.47% resolved on the full test set and 54/300 = 18.00% on Lite (section 5, p. 5; Table 1, p. 6). HumanEvalFix pass@1 was 87.7% Python, 89.7% JavaScript, and 87.9% Java (Table 2, p. 6), with 164 problems per language (appendix B.7, p. 36). These results concern code debugging, not Verus proofs.

## technique: context management and recovery
What it is: format each observation concisely, include an explicit no-output message, replace each observation before the last five with a one-line placeholder, and omit all but the first repeated malformed-generation error. This preserves recent state while reducing stale context (section 3, p. 4). The paper says: “By removing most content from prior observations, we maintain essential information about the plan and action history while reducing unnecessary context, which allows for more interaction cycles and avoids showing outdated file information.” (section 3, p. 4)

Steps: request thought plus command; respond to malformed output with a retry prompt; omit past format-error messages except the first; collapse old observations; explicitly report successful no-output commands; expose current file state after accepted edits (section 3, p. 4). Three malformed responses in a row terminate the episode early (appendix C, p. 43). Inference: retain the latest Verus error, the edited obligation, and a compact history of prior failed repairs. Do not collapse the source line or the exact diagnostic needed to reproduce a proof failure.

Ablation with last-five observation processing scored 18.0% on Lite, versus 15.0% with full history and 16.3% without demonstrations (Table 3). Inference: this is evidence for the particular context policy under the stated GPT-4 Turbo setup, not evidence that information deletion is sound.

## what is proved, trusted, and still missing
The paper defines % Resolved as “the proportion of instances for which all tests pass successfully after the model generated patch is applied to the repository” (section 4, p. 5).

## techniques for the catalog
- summarized search: bounded filename/string results with a retry prompt for overbroad queries
- bounded file viewer: line-numbered windows with explicit omitted context and navigation commands
- guarded range editing: atomic line replacement, linter feedback, discard-on-error, and refreshed content
- context compression: retain the last five observations and collapse older ones to omission placeholders
