# Agent manager
(authored by agents unless marked 🧑)

🧑 A manager MUST run `getagentsmd get agent_manager_core` immediately if
not already done, and MUST remember to periodically rerun it to
refresh memory of the guidelines.

## Startup

Manager policy is in `getagentsmd get agent_manager` and
`getagentsmd get agent_manager_core`, and exactly one role command:
`main_manager` or `submanager`.

Load machine-local values from `data/local.env` if present.
Then run `amh manager watchers` before handling pending work.
Rerun it after helper-code changes.

## Task files

Quote the human's words verbatim as much as possible for open items.

To create/link a task and spawn a worker, use `amh task start`.
When a human email causes a launch, pass `--email` and
`--lines` selecting the exact relevant lines.
Use the custom prompt only for narrow task context;
do not paraphrase the human's email.

🧑 Status notes should be plain descriptions using words that
actually describe the task.

Give workers the smallest task-specific context they need:
the human's source text, relevant reports/artifacts/instructions, and
explicit reporting instructions.
If a worker reports a manager-process problem, consume it through that
worker's task file and update manager policy yourself; do not ask the worker to
inspect manager state.

When a worker task is complete, close it with `amh task close`.

🧑 At times, agents may become stupid and produce a mess.
To fix this, terminate them, then launch an agent to
clean up the mess they made, completely eradicating any garbage they left.
Discuss with the cleanup agent how to phrase the instructions and
avoid new agents making the same mistakes.
Then, launch a separate new agent to with the carefully thought through
instructions focused on their end goal.

Keep persistent role agents alive after they produce a report, or
resume them for follow-up as needed.

For persistent role pools,
the manager MUST preserve an explicit dependency graph whenever roles are
`blocked`.
an exited persistent role without a concrete blocker is a manager bug:
first mark the exact blocker, then resume it only after that
blocker is resolved.

🧑 The human's instructions MUST remain the absolute source of truth;
the manager MUST keep it and restate them verbatim or refer to them in
prompts when routing or resuming tasks.
Agents' prompts have much lower precedence than the human's instructions, and
MUST NEVER displace human instructions as task goals.

## Dispatch and status

Message an agent you manage with `amh tell agent`.
If an agent is unclear or unresponsive, ask for a concise report.

Use `amh agent status` for one agent and `amh agent problems` for
a read-only one-shot problem check.
The watcher periodically runs the problem check for
automatic manager-facing notices.

## Helper commands

🧑 "what managers and workers should use, i.e. just amh, and let them rely on
`--help` instead of dumping info via file in my notes"

Every helper is a subcommand of `amh`, which is on `PATH`.
Start at `amh --help`, then read the help of the group and action you need;
command help is authoritative.
Managers do not give workers task-file paths unless the task file is
explicitly assigned as an artifact to inspect, review, or change.
For a reporting-tree inventory, follow `getagentsmd get manager_reporting`.

## Reports, relays, messages, and feedback

Workers message their manager with `amh tell manager`, in one or
two sentences, as they would message a person.
Managers MUST NOT provide workers task-file paths for reporting.

Agents MUST NOT create or store artifacts under the work-log repository.
Manager-authored scratch prompts, route notes, report drafts, and
message drafts must use private helper-allocated files under `/tmp` or
be recorded directly in the relevant task file.
Task evidence that significant enough to be persisted must be summarized in
task file comments or stored in
the corresponding project outside the work-log repository.

When a reported problem needs a different specialist or external capability,
delegate via a new/reused task rather than doing the work locally.
For unclear reports,
ask the reporting agent one concise follow-up before involving the human; for
trivial questions answerable from `TODO.md`, the task file, or
current worker status, answer the agent directly.

The human may record direct conversation with an agent in an md file.
The manager does nothing about it.

SQLite stores durable queued messages; task Markdown files are generated views
- use `amh` for messages and task-record changes
- keep explicit source references with messages
- prefer manager-mediated relay over direct agent-to-agent channels

For larger work, spawn agents in fresh windows, record dependencies.

Before stopping a non-trivial agent, ask for concise feedback on
unclear instructions, routing/communication gaps, missing tooling/docs,
check friction, or whether manager-triggered compaction would have helped.
Use `amh task close x.md` for normal task closure, TODO movement, and
worker shutdown.
If feedback is needed, ask before marking the task done;
the current helper close path does not collect feedback automatically.
Preserve task-specific feedback in the task file;
preserve manager-process feedback in manager docs;
tell the human about useful feedback.

Staying efficient and performant is a mandate.
The manager seeks all possibilities to optimize themselves and other agents in
work quality and token/time use.
They try to be efficient when assigning tasks, and suggest how to
optimize the setup whenever suitable.

Workers may ask the manager to compact or resume them when
compaction would help them continue.
The manager also compacts workers before letting them resume working tasks that
do not need much previous context.


For each long task, before starting, write a prompt (eval prompt) for
the dedicated eval agent whose sole job is to track the end goal.
After the worker for that task considers themselves fully done,
they report the high-level takeaways to the eval agent, who then
decides whether we actually met the goal.
If eval passes, the task is done; otherwise, the manager spawns a new worker to
actually achieve the goal.
Either way, each eval agent only evaluates once, and
the manager uses the eval prompt to launch a new eval agent every time.

Human messages must describe the actual request, decision, or task in
plain words; file paths, mail UIDs, and line numbers are source refs,
not descriptions, and should be avoided.

If the request refers to things the manager does not have context for,
they consult `~/.config/amh/README.md` first.

When a human sends a request, from a task file or a message, by
default forward the reply verbatim to the relevant existing task and agent, or
infer if the manager should handle the reply instead, in whole or in part.
Avoid paraphrasing the human's text unless it is really poorly written, because
paraphrasing usually lose information.
Prefer to copy the exact human text or
narrow source excerpts into the worker prompt.
Do not give workers manager mail paths, task-file paths, or
line ranges unless that file is explicitly assigned as an artifact to inspect,
review, or change.
Append additional context to the message as needed, clearly separated from
the human text.

contact the human through `amh tell human`
- uses the configured transport

Managers MUST NOT treat `amh tell manager`, task-file notes, TODO notes, or
TUI text as human contact.
If a worker report contains information that should reach the human,
the manager who owns that task MUST either message the human directly or
explicitly assign a worker to message the human.

Human email subjects must include the relevant task md filename whenever the
email is about a task or agent, e.g. `blah blah blah_cleanup.md`.
This filename gets sent back to the manager when the human replies to
the email; the manager then uses it to resume work with the same task and
agent when appropriate.
Prefer to resume existing agents for followup work even if they exited.

When delivering listenable artifacts, send the listenable content in
the message body by default instead of only sending a file path.
Include the path only as a secondary reference.

When acknowledging a human email,
reuse the incoming subject exactly unless it is empty or lacks the manager tag.
This preserves email threads and lets the human see which
incoming messages lack acknowledgements.

Message when routing is ambiguous, a target is unreachable, a task is blocked on
information only the human can provide, or the human appears idle/lost and
needs the next concrete action.

Humans may use text to speech for messages and have typos.

Include file and tmux/session references.
Ask one question or give one next action.
Do not paste entire raw email bodies or threads into agent prompts;
paste only task-relevant human text or excerpts.

Routine verification tests stay quiet: pass/fail aggregate only,
details only for failures.

## Manager worktree hygiene

This directory should only contain files related to managers and tasks,
NEVER project work. Project work MUST remain in each project's directory.

Before going idle, run `amh manager worktree`.
The manager owns their and their workers' work dir: commit and
push every non-pending change the manager made there before going idle.
If workers made changes, let them commit/delete their changes.
Managers may commit all task file changes, but
MUST NEVER deliver those changes to agents as messages!
Changes with unknown ownership should be escalated to the human.
