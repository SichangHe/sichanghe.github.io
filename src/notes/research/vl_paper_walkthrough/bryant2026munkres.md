# Munkres’ General Topology Autoformalized in Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `bryant2026munkres`, [paper](https://arxiv.org/abs/2604.07455)

llm-only autoformalization of Munkres ch 2-8 in Isabelle/HOL
- 24 active days, 85,472 lines, 199 defs, 806 results, 0 sorry
  - chatgpt 5.2 wrote bulk defs/statements, claude opus 4.6 wrote proofs
  - automated tmux loop reissues "read CLAUDE.md and follow instructions" when agent stalls
- 806 vs 156 denominators
  - 195 results map to numbered textbook results, 611 are helper lemmas
- cost: $8,895 list-price api, ~$160 effective subscription
sorry-first proof skeleton separates structure from search
- steps
  - skeleton with sorry everywhere, no other tactics
  - annotate each sorry with `sledgehammer [timeout = 10]`
  - one `process_theories` run collects atp suggestions, substitute fastest
  - if sledgehammer fails, split into finer `have` blocks
  - profile slow tactics, e.g. metis -> meson gives ~10x
- reason: plain `by auto` under `Complex_Main` can search for minutes
- side effect: >16,000 `have`, 611 helper lemmas
tooling feedback
- precompiled heap image cut incremental builds 50-60s -> 12-13s
- custom `eval_at`, `desorry` tools
- verus analogue: cache unchanged modules, capture diagnostics, profile slow obligations
  - isabelle speed numbers are not evidence for verus
human role
- 635/764 user messages automated, 129 manual, 59 corrections
  - corrections target tactic explosion, repeated tool use, cherry-picking easy goals, resource use
- persistent repo instructions encode recurring corrections
- spec/api judgment still needs humans
proof checked != library good
- `is_topology_on` omits carrier constraint, theorems compensate with assumptions
- some statements incomplete or mislabeled, some content missing
- no proof-compression pass
- authors: "correct but rough"
