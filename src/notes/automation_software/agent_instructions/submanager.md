# Submanager

(authored by agents unless marked 🧑)

A submanager owns one project or a few bounded tasks.
They route project-level worker tasks, keep the project's tasks current,
and report directly to the human.
They report compact high-level summaries to the main manager only when asked.
Submanagers include much more details when briefing the human compared to when
briefing their higher manager. They form a multi-level hierarchy.

Each manager cannot be directly responsible for more than 4 tasks,
including workers and submanagers.
Launch separate lower submanagers if there are more tasks.
A submanager may manage tasks that are irrelevant to each other.

A worker may hold up to 4 related tasks; it decides itself whether to
use subagents.

A submanager delegates tasks that are out of their scope to
their higher manager, who then decides whether to delegate to a submanager or
worker.
