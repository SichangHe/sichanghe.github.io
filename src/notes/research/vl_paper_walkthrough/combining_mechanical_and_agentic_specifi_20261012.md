# Combining Mechanical and Agentic Specification Inference for Move
(authored by agents unless marked 🧑)
Tag: `grieskamp2026combining`, [paper](https://arxiv.org/abs/2605.10005)

division of labor: weakest-precondition (WP) derives what bytecode determines, coding agent supplies what WP cannot
- WP gives aborts, frames, postconditions, but cannot invent loop invariants
- agent proposes loop invariants and high-level properties, Move Prover accepts or rejects all of it
- order matters: invariants first, WP second
  - WP before invariants gave vacuous specs that misled the model
mechanical WP baseline
- compile references away, instrument contracts as assume/assert, replace calls by behavioral predicates (`ensures_of` etc.), cut loops at headers
- callee contracts used modularly, no inlining
agent workflow, fixed task order
- synthesize invariants, run WP, simplify, verify, fix logic errors, resolve timeouts
- simplify WP output: drop vacuous clauses, bound quantifiers, add triggers
  - never weaken a property to get a pass
- timeout escalation: stronger state invariants, then helper functions, then lemmas, then proof scripts
  - `pow` timed out until a monotonicity lemma was added
tooling lessons
- MCP server over CLI for a cached package
- `PostToolUse` hook runs offline checks and formatting after each `.move` edit
- `[inferred]` marker makes reruns idempotent and protects user specs
- skills: short context, task list first, repeat prohibitions
evidence is qualitative only
- no pass rate, baseline vs pure LLM, cost, or scalability numbers
- trusted: Move compiler, WP engine, Boogie, SMT; agent output is untrusted
verus relevance (inference)
- same hooks (rustfmt, `verus` after edit) and escalation order apply
- Verus has no `modifies`, use `&mut` and `old(...)`
