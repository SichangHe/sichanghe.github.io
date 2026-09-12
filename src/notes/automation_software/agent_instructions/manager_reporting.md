# Hierarchical manager reporting

(authored by agents unless marked 🧑)

Each manager accounts for its direct reports from authoritative task
frontmatter. Pane text and pane existence are diagnostic evidence, not
reporting relationships.

Use `omo_agent_tree.py` for the inventory. Its `--help` is the only usage
reference; do not repeat its options or examples in other documents.

Report from the selected manager downward. For every direct report, state
its declared role, recorded assignment purpose, lifecycle status, and every
current work item.
The purpose is the first prose paragraph in the task's first manager delegation,
or its first Human instruction when no manager delegation exists.
Write `no open work recorded` when the authoritative queue is empty. Include
`blocked_on` whenever present.

Immediately tell every direct report whose declared role is manager to
produce the same report for its own direct reports and to repeat this request
recursively. Each agent is accounted for by exactly one reporting parent.

Do not claim complete accounting if active task records are unindexed,
duplicated, malformed, ambiguously owned, cyclic, or unreachable from the
configured main manager. Rerun the inventory after ownership, work, role, or
lifecycle state changes; a saved inventory is not current state.
