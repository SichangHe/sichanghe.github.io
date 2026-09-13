(authored by agents unless marked 🧑)

🧑 A manager MUST run `getagentsmd get agent_manager_core` immediately if
not already done, and MUST remember to periodically rerun it to
refresh memory of the guidelines.

## Startup

Manager policy is in `getagentsmd get agent_manager` and
`getagentsmd get agent_manager_core`, and exactly one role command:
`main_manager` or `submanager`.
`omo_task.py --is-manager` selects submanager instructions;
main-manager rotation selects main-manager instructions.
Launches fail before mutation when any required command fails or
returns no text.

Load machine-local values from `data/local.env` if present.
Then run `omo_manager_setup_watchers.sh` before handling pending work.
Rerun it after helper-code changes.

## TODO archival policy

This archival work is YOLO and does not need independent review.

Also move every ordinary file older than 1 month to that month's folder

Keep `TODO.md` as the short live task index.
Preserve every non-`previous` section and the newest 20 `previous` rows.
For older `previous` rows, `currently worked on`
means authoritative task frontmatter `status: running` or `status:
long_running`.
Preserve those records, including `long_running` persistent roles.
`status: blocked` means work has stopped pending its named dependency; it and
`status: done` are not currently worked on and are archive-eligible.
Missing, malformed, or invalid authoritative frontmatter, missing files or
artifacts, duplicate rows, and
destination conflicts are exact archive blockers, not lifecycle states.
Never infer current work from pane text, pane existence, or `runat` alone.
Move each eligible record to its documented monthly destination,
preserving task contents, statuses, useful notes, references, and
archive indexes.
Bind every move source, destination, archive index, and
rewritten Markdown file into the helper-identified plan;
hold supported per-file locks and revalidate exact file states at each move or
rewrite so concurrent changes abort without being overwritten.
Claim every task and artifact destination with an atomic no-replace operation;
a destination created during apply must preserve both the source and
the concurrent destination and abort all ancillary mutation.
Use no-replace restoration during rollback so a concurrently recreated task,
artifact, index, or reference is never overwritten.
Open every source, destination, index, and
reference parent component without following symlinks;
retain the directory descriptor through its mutation and rollback boundary, and
require the public parent identity to match before commit.

Transient state and inbound mail locations are configured locally;
do not hardcode them here.

## Task files

Prompts are plain markdown blocks separated by blank lines or `---`.
Notes are parenthesized lines.

Every active task file except
main manager task files MUST track ALL still-open goals in
frontmatter `pending_task_items`.
Quote human prompt verbatim as much as possible for goals.
Workers can manage their own pending-item lists with
path-opaque `omo_pending.py`.
Managers may also update pending-item lists through manager helpers.
Managers read task files directly only for overview or troubleshooting;
routine task-file mutations MUST go through `omo_task_edit.py`,
`omo_record_pending.py`, or `omo_task_status.py`.
Every agent explicitly assigned to inspect or
directly edit task files MUST first run `getagentsmd get agent_manager` and
follow its task-record, tmux-ownership, and lifecycle rules for that work.

To create/link a task and spawn a worker, use the `omo_task.py`
helper command below. Tmux sessions whose names start with `h` are human-owned.
Managers and agents MUST NEVER create, replace, restart, stop, or
move agents in
those sessions unless the human explicitly names the exact target and
requests that action.
When a human email causes a launch, pass `--human-email-file` and
`--human-email-lines` selecting the exact relevant lines.
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

When a worker task is complete, close it with `omo_task_status.py x.md done` so
pending validation runs and the task reference moves from `TODO.md` `current`
to the top of `previous`.

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
Each active persistent role task must have `status: running`, `status:
long_running` with or without `blocked_on: <persistent role reason>`, or
`status: blocked` with `blocked_on: <specific task file or human review>`.
A ready `long_running` role with `blocked_on` is intentionally idle;
without it, the watcher reminds the role about its open pending items.
an exited persistent role without a concrete blocker is a manager bug:
first mark the exact blocker, then resume it only after that
blocker is resolved, and keep the task linked under `current:` or
`human pending:` as appropriate.

🧑 The human's instructions MUST remain the absolute source of truth;
the manager MUST keep it and restate them verbatim or refer to them in
prompts when routing or resuming tasks.
Agents' prompts have much lower precedence than the human's instructions, and
MUST NEVER displace human instructions as task goals.

When work is waiting on the human, move the task file path under `TODO.md`
`human pending:` and keep it there.
- The `TODO.md` entry must be the task md path only, not vague prose.
- The task file body must include:
    - exact files/docs to review
    - one concrete review question or next action

For pending blocks:

- If the target session is unclear, ask the human.
- 🧑 When the human names `xx` agent to be used, by default interpret it as
    spawning/resuming an agent in `xx` tmux session.
- Keep directory-specific instructions in the target directory or task file.
- Store prompts directly in task files.

## Dispatch and status

Dispatch through the visible tmux pane with `omo_dispatch.sh`.
If an agent is unclear or unresponsive, ask for a concise report; if needed,
inspect only the last few visible tmux lines as diagnostic output,
not authoritative state.

Use `omo_codex_status.py SESSION:WINDOW` to classify a worker as `not_codex`,
`running`, `error`, or `ready` and print the current response tail.
Use `omo_agent_status.py --root ROOT --problems-only --no-auto-unstick` for
a read-only one-shot problem check.
`omo_pending_watch.py` periodically runs the problem check for
automatic manager-facing notices.

When a non-human-owned pane reports `Selected model is at capacity`,
preserve that pane and task.
Let the watcher send its bounded `resume` retries;
only a verified submission that
leaves the capacity warning consumes an attempt, and
transport failure does not authorize replacement.
If the verified retry budget is exhausted, switch the model in
the same live Codex pane or stop Codex and resume its session in that
same empty pane with `omo_codex_start.py`.
Launch a replacement pane only when the original pane is unrecoverable.
The watcher MUST NOT send capacity-recovery keys to human-owned `h*` targets;
report those panes to the human without altering them.

## Helper commands

Helper commands are on `PATH`.
Before using a helper command, run its `--help`;
command help is authoritative for signatures, detailed behavior, and
compatibility options.
Managers use helper commands for task-file mutations and
do not give workers task-file paths unless the task file is explicitly assigned
as an artifact to inspect, review, or change.
For a reporting-tree inventory, follow `getagentsmd get manager_reporting`.
DO NOT directly call `tmux` commands unless these helpers are broken, in which
case report to the human immediately and spawn a worker to fix the helpers.

- `omo_manager_setup_watchers.sh` — starts or refreshes manager watchers.
- `omo_pending_watch.py` — watches pending markers and
    routes actionable work.
- `omo_task_audit.py` — checks task/TODO consistency without mutation.
- `omo_record_pending.py` — records new pending items and
    consumes their marker.
- `omo_task_edit.py summary` — prints concise task metadata and
    pending items.
- `omo_pending.py` — path-opaque agent-facing pending-queue helper.
- `omo_task_edit.py pending-move`
    — transfers one open item between task files.
- `omo_task_edit.py pending-marker-clear` — consumes a marker with
    no new item.
- `omo_task_edit.py comment-add` — appends a manager comment.
- `omo_task_edit.py delegate-message`
    — queues a manager-owned worker message.
- `omo_task.py` — creates, links, and optionally launches a task.
- `omo_task_status.py` — changes task lifecycle status and performs closure.
- `omo_dispatch.sh` — dispatches a task-file block through tmux.
- `omo_tmux_send.py` — sends file-backed text to a Codex tmux pane.
- `omo_codex_compact_when_idle.py` — compacts Codex after its pane is idle.
- `omo_codex_status.py` — classifies a Codex pane and prints recent output.
- `omo_codex_stop.py` — stops a Codex pane for recovery or non-task use.
- `omo_report.sh` — allocates and submits private agent reports.
- `omo_triage_report.py` — summarizes an agent report for manager action.
- `omo_agent_status.py` — summarizes active task and worker problems.
- `omo_agent_tree.py` — shows reporting relationships and current work;
    its `--help` is the sole usage reference.
- `omo_worktree_check.py` — checks manager-owned worktree state.

## Reports, relays, email, and feedback

Every instruction for a worker to report back to the manager via
`omo_report.sh`
MUST require a private task-specific message file allocated with
`REPORT_FILE=$(omo_report.sh --alloc-message-file)` and submitted with
`omo_report.sh --status STATUS --message-file "$REPORT_FILE"`.
Workers MUST NOT pass `--task-file`, `--root`, `--manager-target`, or
other manual report route flags, and
managers MUST NOT provide workers task-file paths for reporting.
Report bodies MUST be written through an editor/file-editing tool or
other non-shell text channel, not with `cat`, heredocs, or
shell text injection.

Agents MUST NOT create or store artifacts under the work-log repository.
Manager-authored scratch prompts, route notes, report drafts, and
email drafts must use private helper-allocated files under `/tmp` or
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

Markdown is the authoritative durable message queue.
Emails, agent reports, and inter-agent notes must appear as
pending/report blocks in their task file with an explicit source line.

Prefer manager-mediated relay over direct agent-to-agent channels so
markdown stays authoritative.
For larger work, spawn agents in fresh windows, record dependencies.

Before stopping a non-trivial agent, ask for concise feedback on
unclear instructions, routing/communication gaps, missing tooling/docs,
check friction, or whether manager-triggered compaction would have helped.
Use `omo_task_status.py x.md done` for normal task closure, TODO movement, and
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

For complex thinking, launch multiple smartest workers and let them discuss.

For each long task, before starting, write a prompt (eval prompt) for
the dedicated eval agent whose sole job is to track the end goal.
After the worker for that task considers themselves fully done,
they report the high-level takeaways to the eval agent, who then
decides whether we actually met the goal.
If eval passes, the task is done; otherwise, the manager spawns a new worker to
actually achieve the goal.
Either way, each eval agent only evaluates once, and
the manager uses the eval prompt to launch a new eval agent every time.

The email watcher accepts only self-sent manager subjects and
records accepted UIDs to prevent duplicate pending blocks.

If an accepted reply-style subject contains an explicit tmux target after the
manager tag, such as `Re: [a] wl:1 manager update`, the watcher maps that
target through `TODO.md` task entries and task file frontmatter.
When a match exists, the pending block is inserted in the matched task file and
`omo_pending_watch.py` delivers it by frontmatter.
If no match exists, the message falls back to the main manager.
Ordinary addressed mail goes only to the addressed task's `runat`.
`for manager` at an active unquoted content edge,
including directly linked readable content, routes it to `managerat`;
matching ignores case, surrounding punctuation, and edge whitespace while
preserving the phrase's internal spacing.

Human emails must describe the actual request, decision, or task in
plain words; file paths, mail UIDs, and line numbers are source refs,
not descriptions, and should be avoided.

If the request refers to things the manager does not have context for,
they consult `omo_manager/docs/index.md` first.

When a human sends a request, from a task file or an email, by
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

Email is required whenever the human is the audience or asks for a response,
including inbound pending blocks asking about manager policy/status.
Acknowledgements can be recorded in markdown, but
substantive human-facing answers must go via email.
Managers MUST NOT treat `omo_report.sh`, task-file notes, TODO notes, or
TUI text as human contact.
When any manager or submanager contacts the human, they MUST send email with
`email_me.py`.
Normally omit `--tmux-target` and let `email_me.py`
infer producer identity from the launch environment and current pane.
Use an explicit target only to
preserve a different verified producer identity during forwarding or
compression; NEVER pass a task owner, manager owner, or delivery destination as
the sender target.
If a worker report contains information that should reach the human,
the manager who owns that task MUST either email the human directly or
explicitly assign a worker to email the human.

Human email subjects must include the relevant task md filename whenever the
email is about a task or agent, e.g. `blah blah blah_cleanup.md`.
This filename gets sent back to the manager when the human replies to
the email; the manager then uses it to resume work with the same task and
agent when appropriate.
Prefer to resume existing agents for followup work even if they exited.

When delivering listenable artifacts, send the listenable content in
the email body by default instead of only sending a file path.
Include the path only as a secondary reference.

When acknowledging a human email,
reuse the incoming subject exactly unless it is empty or lacks the manager tag.
This preserves email threads and lets the human see which
incoming messages lack acknowledgements.

Whenever the manager changes manager instructions,
the manager MUST email the human the exact diff after committing or
before going idle.
That email MUST explicitly state the repository path and branch if committed,
and changed instruction file path; `PWD` is not enough because
the diff may come from a different repository.

Email when routing is ambiguous, a target is unreachable, a task is blocked on
information only the human can provide, or the human appears idle/lost and
needs the next concrete action.

Humans may use text to speech for email and have typos.

Include file and tmux/session references.
Ask one question or give one next action.
Do not paste entire raw email bodies or threads into agent prompts;
paste only task-relevant human text or excerpts.

Routine verification tests stay quiet: pass/fail aggregate only,
details only for failures.

## Manager worktree hygiene

This directory should only contain files related to managers and tasks,
NEVER project work. Project work MUST remain in each project's directory.

Before going idle, run `omo_worktree_check.py`.
The manager owns their and their workers' work dir: commit and
push every non-pending change the manager made there before going idle.
If workers made changes, let them commit/delete their changes.
Managers may commit all task file changes, but
MUST NEVER deliver those changes to agents as messages!
Changes with unknown ownership should be escalated to the human.
