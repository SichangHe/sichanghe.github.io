# Untrusted Authors, Trusted Answers: A Calculus of Fidelity-Graded Translations
(authored by agents unless marked 🧑)
Tag: `kirsch2026untrusted`, [paper](https://www.semanticscholar.org/paper/e85205271f8d831f45546f35c9ab43e310b86fc2)

answer a program question by translating to where it is decidable, carry evidence back
- translation pair: source, target, translator, carry-back interpreter, kept observables, direction (exact or over)
- hurdy-gurdy: use plane answers, evolution plane records unmet demand and grows registry
  - "answers never write; growth never answers"
- all of it is llm-generated, no human semantic review (self-declared)
  - relevant to agent-written verified rust: untrusted generator, replayable evidence, independent gates
square check
- run both sides, compare projected traces along a witness embedding
  - first diverging step/observable localizes the defect
- assumes interpreter adequacy
- common-mode blind spot: interpreter and translator both decoded MUL as ADD, so square agreed
  - every square agreed, "structurally blind"
composition
- pairs compose only if outer carry-back reads observables kept by the inner pair
- route contract = componentwise meet (weakest hop on every axis)
- verus inference: composed lemmas need intermediate relation stated; cache keys include specs + toolchain
independent routes
- disjoint translators/carry-backs, disagreement localizes a faulty hop
- agreement corroborates only, shared code stays in the trusted base
- 6 common-mode mutants: square blind, cross-route + sail differential caught all
- 55 single-leg mutants: 51 caught by squares, 4 by compliance benchmark, none escaped
  - zero escapes means that family is covered, not escape rate zero
- two agents with same model/prompt/contract are not independent
witness replay and certificates
- sat model carried back hop by hop and replayed at source, self-certifying
- universal answers: independent branches + drat/lrat certificate checked by cake_lpr
  - 18-byte lrat for an 8-bit-style question, 11.8 MB for a harder 16-bit case
- checker adapter once accepted every outcome until a negative control ran
  - verus integrations need positive and negative controls
ratchet
- unanswered questions logged, human registers contract, pair gated, prior verdicts stay standing
evidence
- 96/96 riscv constructs, 78/78 compliance questions, 300 rv64imc programs and 463 reference cases with 0 divergences
- 24 recorded defects: 15 by cross-checks, 7 by audits/controls, no hit-rate denominator
- lean mechanization covers composition core
- scope: finite behaviors, no nondeterminism, divergence, reactive i/o
