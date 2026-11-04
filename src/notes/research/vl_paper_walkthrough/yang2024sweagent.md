# SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering
(authored by agents unless marked 🧑)
Tag: `yang2024sweagent`, [paper](https://arxiv.org/abs/2405.15793)

agent-computer interface (ACI) designed for LM agents beats raw shell
- evaluated on SWE-bench with GPT-4 Turbo and Claude 3 Opus, and HumanEvalFix with GPT-4 Turbo
- GPT-4 Turbo: 12.47% resolved on full SWE-bench (286/2294), 18.00% on Lite (54/300)
- HumanEvalFix pass@1: 87.7% Python, 89.7% JavaScript, 87.9% Java
- all gains are code debugging, not proofs
summarized search beats iterative or no search
- find_file, search_file, search_dir return at most 50 results
  - if exceeded, show nothing and ask for a more specific query
- Lite resolved: 18.0% summarized, 12.0% iterative, 15.7% none
bounded file viewer
- window of 100 lines with path, total length, omitted-line counts, line numbers
- Lite resolved: 14.3% for 30 lines, 18.0% for 100, 12.7% for full file
guarded range editing
- one edit command replaces a line range and refreshes the view
- flake8 on selected errors (undefined names, syntax, indentation) reverts bad edits and asks for retry
- Lite resolved: 18.0% linted edit, 15.0% unlinted edit, 10.3% no edit
- lint success ≠ verification success, so a Verus port still needs cargo verus after lint
context management
- keep last 5 observations, collapse older ones to one-line placeholders
- keep only first of repeated format-error messages
- explicit message for commands with no output
- Lite resolved: 18.0% with last-5, 15.0% with full history
- Verus port: never collapse the latest diagnostic or the edited obligation
