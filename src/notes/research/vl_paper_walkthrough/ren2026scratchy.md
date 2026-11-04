# Scratchy: Visual-Scratchpad Multimodal Reasoning for Cryptographic Proof Generation in EasyCrypt
(authored by agents unless marked 🧑)
Tag: `ren2026scratchy`, [paper](https://doi.org/10.48550/arxiv.2609.06226)

claim: proof relations drawn as a typed graph image make multimodal llms write more accepted EasyCrypt proofs
- setup: 64 proof-hole tasks x 4 models (Claude Opus 5, Gemini 3.7 Flash, GPT-5.6-Sol, Kimi K3), single-shot
- accepted: full graph (PG) 54/256, shuffled-edge graph (SG) 24/256, generic diagram (GD) 19/256, best text (CR) 11/256
  - PG vs SG: +11.7 pts, 95% ci [3.5, 19.8]; PG vs CR: +16.8 pts, ci [8.8, 24.6]
  - 36 of 54 PG successes not reproduced by any ablation for the same model and task
- main caveat: graph is compiled from a hand-written sketch that already names the tactic route
  - sketch fields reproduce the official tactic order, so PG measures completion from a near-complete plan, not proof discovery
  - ablation cannot separate image from the route information inside it
  - no condition gives the full sketch as plain text
  - paper reports no contamination control; official files are public
pipeline
- 6-field structured sketch (SNPS): threat model, program facts, proof obligations, proof rules, security goal, relations
  - identifiers and formulas copied verbatim from corpus
- deterministic compiler to typed graph, no inference of relations absent from sketch
  - edges point from justification to supported claim
- renderer keeps roles, labels, edge directions, path to goal readable
  - relational proofs: left/right games side by side; game hops ordered with bounds
- llm returns only the proof body; harness splices it in, EasyCrypt accepts or rejects
  - repair loop on reject is future work; all reported numbers single-shot
benchmark design worth copying
- Scratchy-eval: 114 tasks (64 generation, 50 multiple choice) from 26 source groups, 37 official files
- blank one proof body, keep imports and dependency prefix
- compile all 164 fixtures (64 hidden reference proofs + 4 options x 25 static-validity tasks) before any model call
- score by acceptance not exact match: only 10 of 54 compiling PG outputs match the official fragment
- bootstrap over source groups, not tasks, since tasks share dependencies
- multiple-choice half does not discriminate: 194-199/200 in every condition
decisive step: synchronized-state loop invariant
- accepted PG proof states `while (={j} /\ ={PIR.s})`; rejected CR proof calls `auto` immediately
- lesson: model must state what stays equal across iterations before calling automation
failures and inconsistencies
- failed PG units 202: parse errors 30, rewrite finds nothing 30, incomplete proofs 19, `by` cannot close goal 11
  - paper: remaining bottleneck is local instantiation of the route in exact syntax
- ehoare targets: 0/8 under every condition
- SG (24) beats GD (19); for Claude Opus 5 both image controls score 1/64, below coarse text 5/64
- preliminary study (10 tasks): PG 25/40, SG 20/40, text best is no-relation; order reverses on full benchmark, rate drops 62.5% to 21.1%
- Claude Opus 5: best in preliminary study (7/10), worst on benchmark (9/64)
- contribution list names a verification loop, none evaluated
verus relevance (inference)
- not about Verus; weak competitor, 21.1% even with a plan supplied
- supports one design choice: make the route from available facts to the goal explicit before writing proof text
  - verus source already gives typed nodes: `spec fn`, `proof fn`, `requires`, `ensures`, `invariant`, call graph
  - only the route (which lemma for which obligation) needs an author
- harness-side splicing keeps signature, `requires`, `ensures` unchanged
- blank-one-proof benchmark: confirm original verifies and blanked file fails
