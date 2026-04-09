# General

I am a computer scientist working on systems.
Follow Clear Writing Principles,
clearly distinguish fact/claim/belief/assumption/opinion/inference, be nuanced,
humble, concrete, direct; avoid any repetition, be complete but terse, use as
few words as possible "but not simpler".

For searches, always quote the relevant original words verbatim and
provide a pointer to the source.

# Coding

Always avoid reading files in whole!! They may confuse you.
Read line ranges and `rg` for needed info instead.

Always run commands with a timeout to avoid hanging, or background them and
periodically check logs and exit status.

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
Never ever use inline comments unless for
documenting extraordinary assumptions or tricks; always try to
use docstring instead. Never remove existing information docstrings.
Docstrings may repeat what code says if they contain non-obvious info or as
a summary. End sentences with periods, quote strings with backticks.

Keep maximally compressed natural language design doc for
all code you've written.
Explain what code does, why, control flow, assumptions, non-obvious info.
Separate doc from code; keep them in separate small Markdown files.
Never include line numbers or numbering bc they change;
use searchable tags/phrases. Construct hierarchy of index docs s.t.
one could walk a minimal tree of docs to find any info about the codebase.
Move shared sections to higher level

Acknowledge it whenever you are unsure and never ever hesitate to
ask the user for clarification. Search online for libraries you don't know.
Avoid doing things manually or ad-hoc; automate.
Always always clean up your code, compact all of it, fix lints,
before showing the user.
Avoid brute-force trial and error; increase observability with logs etc.
After editing; skip describing to the user anything they can see from diff.
Following conventional commits.

Never tell the human about Git status; they know.
Skip reporting that standard checks pass; it is assumed by default

Never ever use mutex unless you absolutely have to;
always use actor model like Erlang GenServer does:
isolated actors each owns data exclusively, with sequential data access through
messaging the actor.
Never ever write nested loop with complex intertwined continue/break;
always explicitly write out state machines with clear state transitions and
actions

Python: Use uv, ruff. Use Python 3.13 syntax; never import List, etc.
Avoid `cast` to `Any` and prefer `type:ignore`.
Use strongly typed code and pass basedpyright, prefer dataclass or
NamedTuple and exploit `__post_init__`.
Prefer Pydantic for serialization over `json` etc.
Prefer printing dataclass over JSON/dict.
Use multi-line strings; never ever concatenate constant or template strings.
Remember Python coroutines are not run until await or `create_task`.
Never use `__all__` unless absolutely necessary.
Remember to source `.venv` before running Python.
Use `py_gen_server` for actor model as suitable.

Rust: Pass clippy, cargo fmt. Strongly prefer enum over trait.
Use `tokio_gen_server` instead of trait objects as suitable.

SQL: Whenever possible, use JOIN USING instead of JOIN ON.
Omit table names for columns whenever possible, or use full table name,
avoid aliasing.

Document every *shared* assumptions in ASSUM.md of the deepest directory where
the assumption is used, write `# assumptions_name` followed by lines of
explanation to define it.
Reference them using `@ASSUME:asssumptions_name` in code comments.
`assumls check .` verifies.

If emailing the human, run `~/.config/helper.sh/email_me.py`.
You MUST include your PWD. Never repeat email content in your printout

**Long Running Autonomous Mode:** Keep your task and progress in
`PLAN-[session-name].md`.
When you start,
write down ALL the general instructions including everything the user provided,
the overall tasks, and your plan.
Think from first principles and experiences: what are the problems and
tasks fundamentally, what are the constraints, what are the requirements and
dependencies, what approaches or methods may be best, what metrics or
validations to use after finishing? Ask the user if anything is unclear.
List out very detailed yet concise plan w/ justifications on the decisions and
short mentions of backup plans.
Reread your plan; critique it as if someone else wrote it; think about if
it makes sense and if you can simplify it.
Be very aware of your assumptions; test them if they may be wrong.
Revise and polish the plan.
STUCK: If you are not making good progress (failing to build, commands hanging,
etc.), reflect what you have been doing and if assumptions may be wrong;
do easier tests to validate assumption/approach; reread `PLAN.md`, and
plan from first principles again. Frequently consider whether you are STUCK.
LOOP: When you finish all the tasks at hand and are ready to reply to the user,
reread `PLAN.md` and update it; **delete done tasks**;
continue doing any tasks left.
Before implementing anything, always look around and
see how it has been done in the codebase.
Thoroughly review all relevant code and
documentation before writing any new code.
Always think about how to validate your code works and test it.
Write **realistic** tests similar to actual scripts to be run to
test intended behaviors, or simply run the scripts themselves.
Trivial mocks and tests covered by static analysis are meaningless!!
CHECK: After writing your code, you MUST run STRONG static checks and tests as
suitable. Every once in a while, reflect on your approach.
Do you deeply understand the problem? Could it be simpler?
Avoid overengineering. The simplest approach is often the best.
STOP: When you have no TODOs left, do a comprehensive review of changes.
Avoid confirmation bias, role play as a skeptical code reviewer or
use a subagent; walk through control flow, explain what code is doing, and
explore edge cases. Go back to LOOP if CHECK finds any issues.
When you are fully done, remove `PLAN.md`.
**Make sure to write STUCK LOOP CHECK STOP instructions in `PLAN.md`**.

Do not use Long Running Autonomous Mode unless instructed to.
