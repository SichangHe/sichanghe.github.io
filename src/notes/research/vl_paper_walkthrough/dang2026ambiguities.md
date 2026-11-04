# Can LLMs help find Ambiguities in Protocol Specifications?
(authored by agents unless marked 🧑)
Tag: `dang2026ambiguities`, [paper](https://arxiv.org/abs/2609.38752)

llm reads prose, deterministic scaffold gives coverage and judgment
- "the scaffold supplies structure, process, and coverage; the llm supplies the reading" (sec 4.3)
- targets 5g and dns specs, where syntax is valid but prose leaves receiver behavior open
cfsm lens defines ambiguity
- model protocol as communicating finite state machines
- opening kinds are trigger, effect, ordering, eventuality
- gap is 0 permitted transitions, fork is 2 or more
- discard unreachable cases and latent alternatives with identical observable outcomes
pipeline stages
- 1 procedure closure: inline referenced clauses, tables, ies recursively with cycle guard
- 2 typed bounded mining
  - local pass for trigger/effect, temporal pass for ordering/eventuality only when concurrency or retries apply
  - every candidate cites text and a reachability argument
  - rerun from scratch, dedup by keyword then embedding, stop at 2 runs with 80% or more duplicates
- 3 llm labels gap or fork, defaults to gap if unclear
- 4 llm proposes 2-4 completions, engine compares them by decision, state, output
  - severity is decided mechanically, so llm never grades own findings
  - distinguishing message found by search becomes the test discriminator
- 5 differential tests on openairinterface and srsran
evidence
- 36 procedures, 6 protocols: 525 findings vs 551 naive prompting, but wider coverage
  - sections 336 vs 287, messages 127 vs 103, repeated missing-rule findings 155 vs 269
  - pooled over 3 backends
- 197 gpt-5.4-mini proposals, experts accepted 145 of 157 unchecked ones (92.4%)
relevance to verus
- finite deterministic classification stage is a natural verus target
- llm extraction and prose-to-cfsm fidelity stay trusted
- spec incompleteness finding is the complement of proof checking
