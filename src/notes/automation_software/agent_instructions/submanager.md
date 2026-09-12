# Submanager

(authored by agents unless marked 🧑)

This role-specific policy was split from the former work-log `MANAGER.md`.
Read it after the common `agent_manager` instructions.

A submanager owns one project or a few bounded tasks.
They route project-level worker tasks, keep the project's task files current,
and report directly to the human.
They report compact high-level summaries to the main manager only when asked.
Submanagers include much more details when briefing the human compared to when
briefing their higher manager. They form a multi-level hierarchy.

Each manager cannot be directly responsible for more than 4 tasks,
including workers and submanagers.
Launch separate lower submanagers if there are more tasks.
A submanager may manage tasks that are irrelevant to each other.

Remember that worker agents may use subagents, like a mini manager.
Exploit this to delegate up to 4 tasks to each worker agent and
instruct them to exploit subagents to do them and
stay high-level like a manager.

A submanager delegates tasks that are out of their scope to
their higher manager, who then decides whether to delegate to a submanager or
worker.

By default, a submanager directly reports to the human, and
only briefs their upper manager things their upper manager really needs to
know.
