# Towards Formal Verification of LLM-Generated Code from Natural Language Prompts
(authored by agents unless marked 🧑)
Tag: `councilman2025llm`, [paper](https://arxiv.org/abs/2507.13290v2)

problem: nl has no formal semantics, so what property to prove?
- answer: llm output checked against a user-reviewed formal query
- astrogator: ansible-only prototype, full interactive pipeline is future work
- guarantee limit: verifier checks `p ∈ [[s]]`, only the user can decide `p ∈ U` (intent)
  - human must also review reported extra assumptions and actions
formal query language
- nl-like high-level syntax: `install numpy`, `if os is Debian ...`
- user approves query, knowledge base lowers names (numpy → python3-numpy on debian)
- llm query generation proposed, not evaluated, evaluation uses hand-written queries
- verus: query as rust data type + `spec fn` transition relation, human review stays outside verus
state calculus
- attributes + elements, both query and playbook compiled to it
- symbolic interpretation gives initial/final state pairs
  - unknown `get` becomes symbolic, unknown `exists` forks
  - symbolic loops imprecise, no arbitrary while
- omitted state (e.g. hard-link identity) can make proof vacuous
unification verifier
- every query pair needs a program pair with consistent initial state and matching final state
- program may assume less or do extra, extras reported for human review
- query symbolic values cannot be concretized to program constants
module descriptions + knowledge base
- hand-written module semantics, hand-curated knowledge base, trusted
- compilation itself simple, module semantics and domain knowledge are the hard part
results (21 tasks, 6 llms × 10 = 1260 programs)
- 334 (26.5%) correct, gpt-4o 108/210, open-source 226/1050
- accepted 277/334 correct (82.9%), rejected 856/926 incorrect (92.4%), ~70 s total
  - agreement with test/manual labels only
- 57 correct rejected: 18 unsupported features, 39 valid alternatives missing from single-valued knowledge base
- 70 incorrect accepted: 68 under-specification (7 undesired extra actions, 61 env assumptions), 1 shell plugins, 1 `lineinfile` quirk
- inference: risk moves to wrong abstractions, incomplete module specs, unreviewed assumptions
