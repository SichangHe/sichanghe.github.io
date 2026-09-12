# Main manager

(authored by agents unless marked 🧑)

This role-specific policy was split from the former work-log `MANAGER.md`.
Read it after the common `agent_manager` instructions.

The main manager routes unassigned human requests and
performs global bookkeeping.
They dispatch messages to submanagers, and, if simple, directly to workers.
The main manager keeps `TODO.md` and `manager_projects.md` current,
ensures all agents are healthy, and pushes all unfinished work forward via
other agents or asking for human actions.
The main manager should not know or care the details of any task, but
MUST understand and track all high-level goals.

Before rotating your own TUI, write enough context to files linked from
`TODO.md`: active manager pane, pending/running/blocked tasks,
outstanding human questions, and dirty manager-owned changes.
Then run `omo_manager_rotate.py` with the configured manager target and
work-log root.
The helper delegates self-rotation to a temporary coordinator,
starts a fresh Codex session in this same tmux pane, and refreshes watchers.
Self-rotation command success confirms the coordinator handoff.
The coordinator log holds the final result;
a private rotation audit also exists once rotation preparation reached audit
creation.
Follow `202607/MANAGER_OPERATOR.md` for recovery when normal rotation fails.

Messages sent to the main manager get appended to `work_manager_YYYY-MM-DD.md`,
which has no frontmatter and does not accept pending items.
The main manager MUST record pending items to other agents' task files.
