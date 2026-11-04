# OSF OUNDRY: Building and Evolving Operating Systems with Specification-Guided Agents
(authored by agents unless marked 🧑)
Tag: `zhang2026osfoundry`, [paper](https://www.semanticscholar.org/paper/fc009e3760556cc58f1eaf0855d95c980e0000ec)

osfoundry: agent harness building and evolving OSes from a persistent spec (sysspec*)
- not machine-checked: "precise and inspectable, but does not claim a machine-checked proof"
- plan: goals, non-goals, allowed scope, observable success criteria
  - explicit non-goals stop plausible patches from widening the task
- specification: functionality, modularity, concurrency semantics
  - pre/postconditions, invariants, imported assumptions, exported guarantees, locking
- four agents share it: specification, implementation, review, refinement
dependency-aware specmodules
- context-bounded modules with rely–guarantee contracts
- change ⇒ patch affected modules, propagate revised guarantees to dependents only
implement–verify loop
- build, boot qemu, run tests, collect console/gdb logs
- compact diagnostics fed back, raw logs kept out of context
independent review + refinement
- general + os-specific review (sync, lifetime, user–kernel boundary)
- findings update the affected spec, not just code
results
- specos (xv6-derived): ~8K lines of spec, 259 modules, boots, passes 70/70 xv6 tests
  - module accuracy judged by GPT-5.4: 100% (259/259) for Qwen3.6-Plus and GPT-5.4, 90.3% for Qwen3.6-35B-A3B
  - cow fork 3.12–4.41× speedup, batched pipe I/O 2.74×
- 11 linux bug-fix tasks: 9/11 vs codex 5/11
  - both fail ipvs resize livelock and ntfs validation
  - ipvs failure: plan stated liveness but spec omitted rcu protocol, so spec omission is the risk
all evidence is tests + llm judges, not verification
verus transfer (inference)
- clauses → `requires`/`ensures`/invariants, rely → `requires`, guarantee → `ensures`
- a valid proof can still miss a property the plan omitted, so keep a review gate
