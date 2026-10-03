(authored by agents unless marked 🧑)

🧑 A manager MUST run `getagentsmd get agent_manager_core` immediately if
not already done, and MUST remember to periodically rerun it to
refresh memory of the guidelines.

## Startup

Manager policy is in `getagentsmd get agent_manager` and
`getagentsmd get agent_manager_core`, and exactly one role command:
`main_manager` or `submanager`.
`amh task start --as-manager` selects submanager instructions;
main-manager rotation selects main-manager instructions.
Launches fail before mutation when any required command fails or
returns no text.

Load machine-local values from `data/local.env` if present.
Then run `amh manager watchers` before handling pending work.
Rerun it after helper-code changes.

## TODO archival policy

This archival work is YOLO and does not need independent review.

Keep `TODO.md` as the short live task index.
Preserve every non-`previous` section.
Move every `previous` row to the prior month's `YYYYMM/old_todos.md` index.
🧑 You just move tasks lines from “previous” to an older dir. You don’t check
the “status”. Change the instructions
Read only `TODO.md` and the affected `old_todos.md` index.
Do not read task records, statuses, frontmatter, artifacts, panes, or `runat`.
Do not move task or artifact files or rewrite Markdown references.
Use the documented transactional index rewrite so concurrent changes abort
without being overwritten.

Transient state and inbound mail locations are configured locally;
do not hardcode them here.

## Task files

Prompts are plain markdown blocks separated by blank lines or `---`.
Notes are parenthesized lines.

Every active task file except
main manager task files MUST track ALL still-open goals in
frontmatter `pending_task_items`.
Quote human prompt verbatim as much as possible for goals.
Workers can manage their own pending-item lists with `amh todo`.
Managers may also update pending-item lists through manager helpers.
Managers read task files directly only for overview or troubleshooting;
routine task-file mutations MUST go through `amh task`.
Every agent explicitly assigned to inspect or
directly edit task files MUST first run `getagentsmd get agent_manager` and
follow its task-record, tmux-ownership, and lifecycle rules for that work.

To create/link a task and spawn a worker, use `amh task start`. Tmux sessions whose names start with `h` are human-owned.
Managers and agents MUST NEVER create, replace, restart, stop, or
move agents in
those sessions unless the human explicitly names the exact target and
requests that action.
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

When a worker task is complete, close it with `amh task close x.md` so the task reference moves from `TODO.md` `current`
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

Message an agent you manage with `amh tell agent`.
If an agent is unclear or unresponsive, ask for a concise report; if needed,
inspect only the last few visible tmux lines as diagnostic output,
not authoritative state.

Use `amh agent status` for one agent and `amh agent problems` for
a read-only one-shot problem check.
The pending watcher periodically runs the problem check for
automatic manager-facing notices.

When a non-human-owned pane reports `Selected model is at capacity`,
preserve that pane and task.
Let the watcher send its bounded `resume` retries;
only a verified submission that
leaves the capacity warning consumes an attempt, and
transport failure does not authorize replacement.
If the verified retry budget is exhausted, switch the model in
the same live Codex pane or stop Codex and resume its session in that
same empty pane.
Launch a replacement pane only when the original pane is unrecoverable.
The watcher MUST NOT send capacity-recovery keys to human-owned `h*` targets;
report those panes to the human without altering them.

## Helper commands

🧑 "what managers and workers should use, i.e. just amh, and let them rely on
`--help` instead of dumping info via file in my notes"

Every helper is a subcommand of `amh`, which is on `PATH`.
Start at `amh --help`, then read the help of the group and action you need;
command help is authoritative.
Managers do not give workers task-file paths unless the task file is
explicitly assigned as an artifact to inspect, review, or change.
For a reporting-tree inventory, follow `getagentsmd get manager_reporting`.
DO NOT directly call `tmux` commands unless `amh` is broken, in which
case report to the human immediately and spawn a worker to fix it.

## Reports, relays, email, and feedback

Workers message their manager with `amh tell manager`, in one or
two sentences, as they would message a person.
Managers MUST NOT provide workers task-file paths for reporting.

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
the pending watcher delivers it by frontmatter.
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
Managers MUST NOT treat `amh tell manager`, task-file notes, TODO notes, or
TUI text as human contact.
When any manager or submanager contacts the human, they MUST send email with
`amh tell human`.
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

Before going idle, run `amh manager worktree`.
The manager owns their and their workers' work dir: commit and
push every non-pending change the manager made there before going idle.
If workers made changes, let them commit/delete their changes.
Managers may commit all task file changes, but
MUST NEVER deliver those changes to agents as messages!
Changes with unknown ownership should be escalated to the human.
