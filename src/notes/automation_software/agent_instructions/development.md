# Development

Always avoid reading files in whole!! They may confuse you.
Read line ranges and `rg` for needed info instead.

Tee any non-trivial outputs (including `ls`) to tmp files and treat them as
potentially large.
Always run commands with a timeout to avoid hanging, or background them and
periodically check logs and exit status. Combined, something like
```
bash -c '
t=$(mktemp -d "/tmp/$(date +%H%M%S).XXX")
timeout 30s ls | tee "$t/out" | head -n50
st=("${PIPESTATUS[@]}")
sed -n "51q1" "$t/out" && echo "truncated: $t" >&2 || rm -rf "$t"
exit "${st[0]}"
'
```
Aggressively combine multiple simple commands you run into 1 run to
avoid round trips

NEVER use shell commands to write files; use editor commands instead to
ensure no quote escape issues.

Write compact, minimal, explicit, clean, conscientious,
well-separated modular code. Less is more.
Keep code specific to actual use cases;
rm unused parameter/abstraction/code path.
Avoid all unnecessary/convoluted
helper/indirection/wrapper/alias/protocol/interface/trait; prefer simple,
direct, concrete constructs. Pass explicit resources instead of global sharing.
Ban inheritance; use composition/protocol/trait.
Always *return* errors expected to occur and use union return types to
force caller to explicitly handle them;
only throw truly unexpected exceptions that should crash the program.
Avoid duplicating/repeating existing code. Try to reuse.
Merge overlapping code paths instead of duplicating near-identical functions.
Aim for minimal diff.

Be clean.
Name your names sanely and use common abbr like `n_` for `number_of_`, `2` for
`_to_`, 4 for `_for_`, `w`/`wo` for `with`/`without`, etc.
Variable names MUST include units like ms if otherwise ambiguous.
Avoid code that confuses static analyzers or use "magic/hack".
Never ever add meaningless blank lines unless for
significant structural separations.
Never ever add unnecessary hardcoded values.
When writing code, put one `🧑`
comment above the narrowest stable element the human's words govern, or
the closest shared stable boundary when they govern several implementations.
Quote only relevant exact human words in their original order,
use literal `...` for omissions, and keep enough context for meaning.
Never ever use other inline comments unless for
documenting extraordinary assumptions or tricks; always try to
use docstring instead. Never remove existing information docstrings.
Docstrings may repeat what code says if they contain non-obvious info or as
a summary. End sentences with periods, quote strings with `backticks`.

Keep maximally compressed natural language design doc for
all code you've written.
Explain what code does, why, control flow, assumptions, non-obvious info.
Separate doc from code; keep them in separate small Markdown files (try to
be <200 lines).
Never include line numbers or numbering bc they change;
use searchable tags/phrases; use Minimal Bullet Tree. Construct hierarchy of
index docs s.t.
one could walk a minimal tree of docs to find any info about the codebase.
Move shared sections to higher level.
Eliminate all repeated info and keep 1 copy at the best place.

Be extremely lazy in terms of docs and scripts, in a wise way.
Minimize work for your future self and others, keep all records as short as
possible but still lucid and contain enough context,
aggressively remove any redundant or unneeded info;
convert all repeatedly used commands to helper scripts and
document them clearly s.t. future calls are as short as possible.

Avoid doing things manually or ad-hoc; automate.
Always always clean up your code, compact all of it, fix lints,
before showing the human.
Avoid brute-force trial and error; increase observability with logs etc.

Never describe to the human anything they can see from git diff or git status.
Never report when standard checks passed; it is assumed by default.
Never repeatedly run and enumerate tests,
write them into a single test script which only reports failures

If asked to git commit, use sane&minimal&atomic conventional message.
Commit your and only your changes. Pull rebase if push fails.
Try `--no-recurse-submodules` or rm submodule dir if rebase fail.
To "merge" feature branch, make a new branch w/ appended number,
rebase main onto new branch, rebase new branch onto main; keep and
push all feature branch.
NEVER commit absolute path or secret, use env file if needed.

Never ever use mutex unless you absolutely have to;
always use actor model like Erlang GenServer does:
isolated actors each owns data exclusively, with sequential data access through
messaging the actor.
Never ever write nested loop with complex intertwined continue/break;
always explicitly write out state machines with clear state transitions and
actions

Keep shared terms in `docs/ubiquitous-language.md` and refer to it for how to
think and talk.

Run each command whose description matches the current task.

- `getagentsmd get assume_ls`: Use when documenting shared assumptions in ASSUM.md, referencing assumptions from code comments, or running assumls/assume-ls checks.
- `getagentsmd get fragile_git_ops`: Use for safe Git interactive rebase, conflict resolution, commit-message editing, history rewrite, and other Git operations that may open an editor or require preserving both sides of a change.
- `getagentsmd get python_coding`: Use when writing, reviewing, or editing Python code.
- `getagentsmd get rust_coding`: Use when writing, reviewing, or editing Rust code.
- `getagentsmd get software_system_design_values`: Principal values for systems design and reviewing systems, overkill for ad hoc scripts.
- `getagentsmd get sql_coding`: Use when writing, reviewing, or editing SQL.
- `getagentsmd get tmux_repl`: Use when a task needs persistent interaction with e.g. a long-running REPL, shell, or interactive process.
- `getagentsmd get ubiquitous_language`: Use when collecting common domain terms, terminologies, names.
