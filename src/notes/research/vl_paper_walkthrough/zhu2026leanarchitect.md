# LeanArchitect: Automating Blueprint Generation for Humans and AI
(authored by agents unless marked 🧑)
Tag: `zhu2026leanarchitect`, [paper](https://arxiv.org/abs/2601.22554)

lean 4 package syncing a formalization blueprint with lean declarations
- `@[blueprint]` attribute attaches label, statement, proof text to a declaration
- infers dependencies by traversing constants in type and value
- infers proof status by checking for `sorry`
- exports deterministic incremental latex fragments, `\inputleannode{label}`
  - `leanblueprint` still builds pdf, web, dependency graph
- lean stays authoritative, blueprint is project management not a checker
- limit: deeper build pipeline, more ci failure risk, informal-only nodes still manual
migration of hand-written blueprints
- `blueprintConvert` inserts tags and replaces manual nodes
- tested on 5 projects (Carleson, Brownian Motion, Infinity Cosmos, FLT, PrimeNumberTheoremAnd), lean v4.25.0
- graph exposed bugs: unused isolated node, missing dependency edge, `\leanok` only on statements
- PrimeNumberTheoremAnd conversion took ~1 day
  - graph exposed a wrong Erdos 392 statement whose ai proof used no surrounding lemmas
dependency graph as ai proof-work interface
- pipeline: GPT-5 Pro drafts lean outline with `sorry` lemmas, Aristotle fills sorries, GPT-5 Pro refines, human finishes
- case: multivariate Taylor theorem, Aristotle left 3 nodes after refinement
  - `deriv`/`derivWithin` statement errors fixed by hand
- asking the model to just refine did not reliably fix failures
  - prover diagnostics too weak, suggest counterexamples, missing-lemma hints, structured failure traces
- evidence is one case, no denominator
verus transfer (inference)
- planned subgoal = `proof fn` contract, executable fn `ensures` = graph sink
- sidecar manifest for labels and deps, no `sorry` in accepted code
- status from verus result not `sorry` search, `assume`/trusted body recorded as trusted
- graph exposes missing edges but cannot show the spec states the right requirement
